-- Tabla de Configuraciones del Sistema (clave-valor JSONB)
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

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
