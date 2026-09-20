-- Run once in the Supabase SQL Editor before deploying this change.
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.admin_users, public.orders TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_users' AND policyname = 'Admins can read their role') THEN
    CREATE POLICY "Admins can read their role" ON public.admin_users FOR SELECT TO authenticated USING (id = (select auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Admins can receive order alerts') THEN
    CREATE POLICY "Admins can receive order alerts" ON public.orders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = (select auth.uid())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

INSERT INTO public.admin_users (id)
VALUES ('b37cc5e5-1a3e-415b-94ca-3aa423bdf0c1')
ON CONFLICT (id) DO NOTHING;
