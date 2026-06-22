-- ULTRA PRO FEATURES: multi-image gallery, notifications, receiver cancel, analytics helpers
-- This migration is idempotent where practical.

-- 1) Extend request_status enum with optional values (keep old values for backward compatibility)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    BEGIN
      ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'Cancelled';
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END $$;

-- 2) Add columns to foods for primary image path (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='foods' AND column_name='primary_image_path'
  ) THEN
    ALTER TABLE public.foods ADD COLUMN primary_image_path text;
  END IF;
END $$;

-- 3) Food images table (multi-image gallery)
CREATE TABLE IF NOT EXISTS public.food_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id uuid NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.food_images ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read images for foods
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='food_images' AND policyname='Food images read'
  ) THEN
    CREATE POLICY "Food images read" ON public.food_images
    FOR SELECT TO authenticated
    USING (true);
  END IF;
END $$;

-- Only owner/admin can insert/delete images (owner = foods.donor_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='food_images' AND policyname='Food images write'
  ) THEN
    CREATE POLICY "Food images write" ON public.food_images
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.foods f WHERE f.id = food_id AND (f.donor_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='food_images' AND policyname='Food images delete'
  ) THEN
    CREATE POLICY "Food images delete" ON public.food_images
    FOR DELETE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.foods f WHERE f.id = food_id AND (f.donor_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_food_images_food_id ON public.food_images(food_id);

-- 4) Receiver can cancel (delete) own pending requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='requests' AND policyname='Receiver can delete own pending'
  ) THEN
    CREATE POLICY "Receiver can delete own pending" ON public.requests
    FOR DELETE TO authenticated
    USING (auth.uid() = receiver_id AND status = 'Pending');
  END IF;
END $$;

-- 5) Notifications table + policies
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users read own notifications'
  ) THEN
    CREATE POLICY "Users read own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users update own notifications'
  ) THEN
    CREATE POLICY "Users update own notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- 6) Triggers: create notifications on request insert/status change
CREATE OR REPLACE FUNCTION public.notify_on_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  donor uuid;
  food_title text;
BEGIN
  SELECT f.donor_id, f.title INTO donor, food_title
  FROM public.foods f WHERE f.id = NEW.food_id;

  -- Notify donor
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (
    donor,
    'request_created',
    'New food request',
    'Someone requested: ' || COALESCE(food_title,'your food'),
    jsonb_build_object('request_id', NEW.id, 'food_id', NEW.food_id, 'receiver_id', NEW.receiver_id)
  );

  -- Notify receiver (optional confirmation)
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (
    NEW.receiver_id,
    'request_sent',
    'Request sent',
    'Your request is pending.',
    jsonb_build_object('request_id', NEW.id, 'food_id', NEW.food_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_request_insert ON public.requests;
CREATE TRIGGER trg_notify_request_insert
AFTER INSERT ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_request_insert();

CREATE OR REPLACE FUNCTION public.notify_on_request_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  food_title text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT title INTO food_title FROM public.foods WHERE id = NEW.food_id;

    INSERT INTO public.notifications(user_id, type, title, body, data)
    VALUES (
      NEW.receiver_id,
      'request_status',
      'Request updated',
      'Status changed to ' || NEW.status || ' for: ' || COALESCE(food_title,'food'),
      jsonb_build_object('request_id', NEW.id, 'food_id', NEW.food_id, 'status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_request_update ON public.requests;
CREATE TRIGGER trg_notify_request_update
AFTER UPDATE ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_request_update();

-- 7) Storage bucket guidance (cannot always be created via SQL depending on project settings)
-- Create bucket "food-images" in Supabase Dashboard > Storage if it doesn't exist.
