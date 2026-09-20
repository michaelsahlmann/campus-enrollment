-- Tabla de Configuraciones del Sistema (clave-valor JSONB)
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security) per Supabase Best Practices
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of settings"
    ON public.settings
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow service_role full access to settings"
    ON public.settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Inserción inicial de datos bancarios para transferencias
INSERT INTO public.settings (key, value)
VALUES (
    'bank_details',
    '{
        "alias": "pagos@michaelsahlmann.com",
        "titular": "Michael Sahlmann",
        "banco": "Banco Itaú",
        "cuenta": "720000000",
        "ci_ruc": "4567890-1"
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
