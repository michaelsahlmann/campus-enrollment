-- ==============================================================================
-- MASTER SCHEMA VARKENTIS: Supabase Database, Storage, RLS & Cron Autónomo
-- Instituto Varkentis - Campus Virtual & Pasarelas de Matriculación
-- ==============================================================================

-- 0. Habilitar extensiones nativas requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ------------------------------------------------------------------------------
-- 1. TABLA: courses (Cursos mapeados con LearnHouse LMS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    course_uuid TEXT NOT NULL UNIQUE,
    description TEXT,
    price_pyg NUMERIC NOT NULL DEFAULT 0,
    price_usd NUMERIC DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. TABLA: students (Alumnos registrados y vinculados con LearnHouse)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    learnhouse_user_id INTEGER,
    learnhouse_user_uuid TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. TABLA: checkout_links (Links de Checkout independientes y editables)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkout_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    price_pyg NUMERIC NOT NULL CHECK (price_pyg >= 0),
    trial_days INTEGER DEFAULT NULL, -- NULL = permanente; 7, 15, 30 = temporal
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. TABLA: coupons (Cupones de descuento y becas 100%)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_uses INTEGER DEFAULT NULL,
    used_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. TABLA: enrollments (Matrículas, vigencia de trials y control de expiración)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'free', 'refunded', 'trial')),
    payment_method TEXT NOT NULL DEFAULT 'manual', -- 'transfer', 'free_grant', 'manual'
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'PYG',
    learnhouse_status TEXT NOT NULL DEFAULT 'enrolled', -- 'enrolled', 'trial_expired', 'failed'
    magic_link TEXT,
    trial_days INTEGER DEFAULT NULL,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Restricción única: un alumno no duplica matrícula del mismo curso
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_student_course ON public.enrollments(student_id, course_id);

-- ------------------------------------------------------------------------------
-- 6. TABLA: orders (Órdenes de compra generadas desde checkouts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT NOT NULL UNIQUE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    checkout_link_id UUID REFERENCES public.checkout_links(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('transfer', 'cash', 'free_grant')),
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'paid', 'rejected', 'cancelled')),
    payment_proof_path TEXT,
    payment_claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 7. TABLA: settings (Configuraciones generales de SIPAP / Bancos en JSONB)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Datos bancarios por defecto si no existen
INSERT INTO public.settings (key, value)
VALUES (
    'bank_settings',
    jsonb_build_object(
        'titular', 'Michael Sahlmann Diaz',
        'banco', 'Banco Familiar',
        'cuenta', '000001',
        'ci_ruc', '3711578',
        'alias', '3711578'
    )
)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 8. STORAGE BUCKET: payment-proofs (Comprobantes de transferencia privados)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-proofs',
    'payment-proofs',
    false,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880;

-- ------------------------------------------------------------------------------
-- 9. ÍNDICES DE RENDIMIENTO
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_courses_uuid ON public.courses(course_uuid);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_expires ON public.enrollments(expires_at) WHERE is_revoked IS FALSE;
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_checkout_links_slug ON public.checkout_links(slug);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code) WHERE is_active IS TRUE;

-- ------------------------------------------------------------------------------
-- 10. SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Lectura pública para elementos visibles del frontend
CREATE POLICY "Public read active courses" ON public.courses FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Public read active checkouts" ON public.checkout_links FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Public read active coupons" ON public.coupons FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Public read bank settings" ON public.settings FOR SELECT TO anon, authenticated USING (key = 'bank_settings');

-- Control total para el backend seguro (service_role)
CREATE POLICY "Service role full access courses" ON public.courses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access students" ON public.students FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access checkouts" ON public.checkout_links FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access coupons" ON public.coupons FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access enrollments" ON public.enrollments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access settings" ON public.settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 11. AUTOMATIZACIÓN 100% AUTÓNOMA: pg_cron + pg_net (Revocación de Trials)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_and_revoke_expired_trials(
    p_learnhouse_url TEXT DEFAULT 'https://campus.michaelsahlmann.com',
    p_learnhouse_token TEXT DEFAULT 'lh_token_production'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
    v_revoked_count INTEGER := 0;
    v_details JSONB := '[]'::jsonb;
BEGIN
    FOR rec IN
        SELECT 
            e.id AS enrollment_id,
            s.name AS student_name,
            s.email AS student_email,
            s.learnhouse_user_id,
            c.course_uuid,
            c.name AS course_name,
            e.expires_at
        FROM public.enrollments e
        JOIN public.students s ON e.student_id = s.id
        JOIN public.courses c ON e.course_id = c.id
        WHERE e.expires_at IS NOT NULL 
          AND e.expires_at <= NOW()
          AND (e.is_revoked IS FALSE OR e.is_revoked IS NULL)
          AND s.learnhouse_user_id IS NOT NULL
          AND c.course_uuid IS NOT NULL
    LOOP
        -- 1. Petición HTTP DELETE asíncrona a la API de LearnHouse LMS
        PERFORM net.http_delete(
            url := rtrim(p_learnhouse_url, '/') || '/api/v1/admin/default/enrollments/' || rec.learnhouse_user_id || '/' || rec.course_uuid,
            headers := jsonb_build_object(
                'X-API-Token', p_learnhouse_token,
                'Content-Type', 'application/json'
            ),
            timeout_milliseconds := 5000
        );

        -- 2. Marcar como revocado en la base de datos
        UPDATE public.enrollments
        SET 
            is_revoked = TRUE,
            learnhouse_status = 'trial_expired',
            notes = COALESCE(notes || ' | ', '') || 'Trial revocado automáticamente por pg_cron el ' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
            updated_at = NOW()
        WHERE id = rec.enrollment_id;

        v_revoked_count := v_revoked_count + 1;
        v_details := v_details || jsonb_build_object(
            'enrollment_id', rec.enrollment_id,
            'student', rec.student_email,
            'course', rec.course_name,
            'expired_at', rec.expires_at
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'revoked_count', v_revoked_count,
        'executed_at', NOW(),
        'revoked_items', v_details
    );
END;
$$;

-- Programar ejecución cada 6 horas en pg_cron (o ajustar según necesidad)
-- Se desprograma primero si ya existía para evitar duplicados
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'revoke-expired-trials-job') THEN
        PERFORM cron.unschedule('revoke-expired-trials-job');
    END IF;
    
    PERFORM cron.schedule(
        'revoke-expired-trials-job',
        '0 */6 * * *',
        $cron$ SELECT public.audit_and_revoke_expired_trials(); $cron$
    );
END $$;
