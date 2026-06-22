
-- App role enum
CREATE TYPE public.app_role AS ENUM ('donor', 'receiver', 'volunteer', 'admin');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile and role on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name) VALUES (NEW.id, NEW.raw_user_meta_data ->> 'name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, (NEW.raw_user_meta_data ->> 'role')::app_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Food status type
CREATE TYPE public.food_status AS ENUM ('Available', 'Reserved', 'Collected', 'Expired');

-- Foods table
CREATE TABLE public.foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  quantity TEXT,
  expiry_time TIMESTAMPTZ,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status food_status NOT NULL DEFAULT 'Available',
  donor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read available foods" ON public.foods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Donors can insert own foods" ON public.foods FOR INSERT TO authenticated WITH CHECK (auth.uid() = donor_id);
CREATE POLICY "Donors can update own foods" ON public.foods FOR UPDATE TO authenticated USING (auth.uid() = donor_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Donors can delete own foods" ON public.foods FOR DELETE TO authenticated USING (auth.uid() = donor_id OR public.has_role(auth.uid(), 'admin'));

-- Request status type
CREATE TYPE public.request_status AS ENUM ('Pending', 'Accepted', 'Rejected', 'Completed');

-- Requests table
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receivers can view own requests" ON public.requests FOR SELECT TO authenticated USING (
  auth.uid() = receiver_id
  OR EXISTS (SELECT 1 FROM public.foods WHERE foods.id = food_id AND foods.donor_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Receivers can insert requests" ON public.requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = receiver_id);
CREATE POLICY "Donors and admins can update requests" ON public.requests FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.foods WHERE foods.id = food_id AND foods.donor_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Delivery status type
CREATE TYPE public.delivery_status AS ENUM ('Assigned', 'PickedUp', 'Delivered', 'Cancelled');

-- Deliveries table
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_status delivery_status NOT NULL DEFAULT 'Assigned',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers can view own deliveries" ON public.deliveries FOR SELECT TO authenticated USING (
  auth.uid() = volunteer_id OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Volunteers can insert deliveries" ON public.deliveries FOR INSERT TO authenticated WITH CHECK (auth.uid() = volunteer_id);
CREATE POLICY "Volunteers can update own deliveries" ON public.deliveries FOR UPDATE TO authenticated USING (
  auth.uid() = volunteer_id OR public.has_role(auth.uid(), 'admin')
);
