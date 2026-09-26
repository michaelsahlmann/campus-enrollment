-- ==============================================================================
-- MIGRACIÓN DELTA: Soporte de Trials, Expiración y Cron Autónomo
-- Ejecutar en Supabase SQL Editor para tu proyecto existente: roeucrqkzvzxniwajaqq
-- ==============================================================================

-- 1. Habilitar extensiones pg_cron y pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Agregar columnas de control temporal a 'enrollments'
ALTER TABLE public.enrollments 
    ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Agregar columna 'trial_days' a 'checkout_links' (para crear checkouts de 7, 15, 30 días)
ALTER TABLE public.checkout_links 
    ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT NULL;

-- 4. Índice parcial de alta velocidad para buscar expirados
CREATE INDEX IF NOT EXISTS idx_enrollments_expires 
    ON public.enrollments(expires_at) 
    WHERE is_revoked IS FALSE;

-- 5. Función que da de baja en LearnHouse con net.http_delete y actualiza la fila
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
        -- Invocar API de desmatriculación en LearnHouse
        PERFORM net.http_delete(
            url := rtrim(p_learnhouse_url, '/') || '/api/v1/admin/default/enrollments/' || rec.learnhouse_user_id || '/' || rec.course_uuid,
            headers := jsonb_build_object(
                'X-API-Token', p_learnhouse_token,
                'Content-Type', 'application/json'
            ),
            timeout_milliseconds := 5000
        );

        -- Actualizar estado en Supabase
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

-- 6. Programar la ejecución en pg_cron cada 6 horas
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
