-- ========================================================
-- Schema de Supabase para Campus Enrollment & Checkout
-- ========================================================

-- 1. Tabla de Cursos (Mapeo con LearnHouse UUIDs)
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    course_uuid TEXT NOT NULL UNIQUE,
    description TEXT,
    price_pyg NUMERIC DEFAULT 0,
    price_usd NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Alumnos
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    learnhouse_user_id INTEGER,
    learnhouse_user_uuid TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de Matrículas / Pagos
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    payment_status TEXT NOT NULL DEFAULT 'paid', -- 'paid', 'pending', 'free', 'refunded'
    payment_method TEXT NOT NULL DEFAULT 'manual', -- 'manual_transfer', 'stripe', 'mercadopago', 'pos'
    amount_paid NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'PYG',
    learnhouse_status TEXT NOT NULL DEFAULT 'enrolled', -- 'enrolled', 'failed'
    magic_link TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_courses_uuid ON public.courses(course_uuid);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);

-- Cursos Iniciales de LearnHouse
INSERT INTO public.courses (name, course_uuid, description, price_pyg, price_usd, is_active)
VALUES 
(
    'Curso de Bolsa de Valores en Paraguay: De Cero a tu Primera Inversión',
    'course_8bbc2b81-c213-4c9d-86f2-ce613dc6cdac',
    'Guía práctica y completa para invertir en la Bolsa de Valores de Asunción (BVA).',
    1500000,
    200,
    true
),
(
    'Prueba de Video',
    'course_6ec57be0-3fbf-459c-b735-af6f672ac0cd',
    'Curso de pruebas técnicas y streaming con Nginx Video Vault.',
    0,
    0,
    true
)
ON CONFLICT (course_uuid) DO NOTHING;
