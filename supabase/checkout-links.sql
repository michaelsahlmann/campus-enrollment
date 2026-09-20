-- Checkouts independientes y editables. Ejecutar después de checkout.sql.
CREATE TABLE IF NOT EXISTS public.checkout_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  price_pyg NUMERIC NOT NULL CHECK (price_pyg >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_link_id UUID REFERENCES public.checkout_links(id) ON DELETE SET NULL;

-- Índices de búsqueda y Foreign Keys
CREATE INDEX IF NOT EXISTS idx_checkout_links_active ON public.checkout_links(is_active);
CREATE INDEX IF NOT EXISTS idx_checkout_links_course_id ON public.checkout_links(course_id);
CREATE INDEX IF NOT EXISTS idx_orders_checkout_link_id ON public.orders(checkout_link_id);

-- RLS en Checkout Links
ALTER TABLE public.checkout_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of active checkout links"
    ON public.checkout_links
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

CREATE POLICY "Allow service_role full access on checkout_links"
    ON public.checkout_links
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
