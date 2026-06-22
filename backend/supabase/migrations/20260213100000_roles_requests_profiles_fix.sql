-- Ensure every new user gets BOTH donor and receiver roles by default,
-- while still supporting an optional extra role in metadata (volunteer/admin).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_role text;
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'name')
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.profiles.name);

  -- Always grant donor + receiver
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'donor'::public.app_role)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'receiver'::public.app_role)
  ON CONFLICT DO NOTHING;

  -- Optional extra role via metadata: { role: "volunteer" | "admin" }
  meta_role := NEW.raw_user_meta_data ->> 'role';
  IF meta_role IS NOT NULL AND meta_role <> '' THEN
    BEGIN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, (meta_role)::public.app_role)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN
      -- ignore invalid role values
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill donor + receiver roles for existing users (idempotent)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'donor'::public.app_role FROM auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'receiver'::public.app_role FROM auth.users
ON CONFLICT DO NOTHING;

-- Prevent the same receiver from spamming multiple requests for the same food
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'requests_food_receiver_unique'
  ) THEN
    ALTER TABLE public.requests
      ADD CONSTRAINT requests_food_receiver_unique UNIQUE (food_id, receiver_id);
  END IF;
END $$;

-- Allow donors to see the profile (name) of people who requested THEIR food.
-- (Needed for donor dashboard/request list)
CREATE POLICY IF NOT EXISTS "Donors can view requesters profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.requests r
    JOIN public.foods f ON f.id = r.food_id
    WHERE f.donor_id = auth.uid()
      AND r.receiver_id = profiles.id
  )
);
