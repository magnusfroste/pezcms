-- Create role enum
CREATE TYPE public.app_role AS ENUM ('writer', 'approver', 'admin');

-- Create page status enum
CREATE TYPE public.page_status AS ENUM ('draft', 'reviewing', 'published', 'archived');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'writer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pages table
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status page_status NOT NULL DEFAULT 'draft',
  content_json JSONB DEFAULT '[]'::jsonb,
  meta_json JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create page_versions table for version history
CREATE TABLE public.page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content_json JSONB NOT NULL,
  meta_json JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table for GDPR compliance
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = _user_id 
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'approver' THEN 2 
      WHEN 'writer' THEN 3 
    END
  LIMIT 1
$$;

-- Profile policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- User roles policies (admin only for management)
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Pages policies
CREATE POLICY "All authenticated users can view pages"
  ON public.pages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Writers can create pages"
  ON public.pages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'writer') OR 
    public.has_role(auth.uid(), 'approver') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Writers can update own draft pages"
  ON public.pages FOR UPDATE
  TO authenticated
  USING (
    (created_by = auth.uid() AND status = 'draft') OR
    public.has_role(auth.uid(), 'approver') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete pages"
  ON public.pages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Page versions policies
CREATE POLICY "All authenticated can view versions"
  ON public.page_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create versions"
  ON public.page_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'approver') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Audit logs policies (read-only for users, insert for all authenticated)
CREATE POLICY "Users can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can create audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  
  -- Assign default writer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'writer');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for pages (for live notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.pages;