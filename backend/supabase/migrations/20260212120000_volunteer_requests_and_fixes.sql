-- Allow volunteers and admins to view accepted requests (for claiming deliveries)
CREATE POLICY "Volunteers and admins can view accepted requests"
ON public.requests FOR SELECT TO authenticated
USING (
  status = 'Accepted' AND (
    public.has_role(auth.uid(), 'volunteer') OR public.has_role(auth.uid(), 'admin')
  )
);

-- Allow volunteers and admins to view all deliveries (to know which requests are already claimed)
CREATE POLICY "Volunteers and admins can view all deliveries"
ON public.deliveries FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'volunteer') OR public.has_role(auth.uid(), 'admin')
);

-- Prevent duplicate deliveries for the same request (drop if exists for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deliveries_request_id_unique'
  ) THEN
    ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_request_id_unique UNIQUE (request_id);
  END IF;
END $$;

-- Fix handle_new_user: default to 'receiver' if role is missing or invalid
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  BEGIN
    user_role := COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::app_role,
      'receiver'
    );
  EXCEPTION WHEN OTHERS THEN
    user_role := 'receiver';
  END;

  INSERT INTO public.profiles (id, name) 
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'name');
  
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;
