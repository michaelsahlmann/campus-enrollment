"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Users,
  BookOpen,
  Settings,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { DEFAULT_COURSES, CourseItem } from "@/lib/courses";

interface StudentEnrollmentItem {
  id: string;
  payment_status: string;
  payment_method: string;
  amount_paid: number;
  currency: string;
  magic_link: string;
  created_at: string;
  courses?: {
    id: string;
    name: string;
    course_uuid: string;
  };
}

interface StudentItem {
  id: string;
  email: string;
  name: string;
  phone?: string;
  learnhouse_user_id?: number;
  created_at: string;
  enrollments?: StudentEnrollmentItem[];
}

export default function CampusPortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"form" | "students" | "courses" | "config">("form");

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [courses, setCourses] = useState<CourseItem[]>(DEFAULT_COURSES);
  const [selectedCourseUuid, setSelectedCourseUuid] = useState(DEFAULT_COURSES[0].course_uuid);
  const [paymentMethod, setPaymentMethod] = useState("manual_transfer");
  const [amountPaid, setAmountPaid] = useState<number>(1500000);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success Modal State
  const [successData, setSuccessData] = useState<{
    student: { id: number; name: string; email: string; isNewUser: boolean };
    course: { uuid: string; name: string };
    magicLink: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  // Data lists
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSyncingCourses, setIsSyncingCourses] = useState(false);
  const [coursesMessage, setCoursesMessage] = useState<string | null>(null);

  // Load students
  const fetchStudents = async () => {
    setIsLoadingStudents(true);
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      if (data.students) {
        setStudents(data.students);
      }
      setSupabaseConfigured(data.configured ?? true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const fetchCourses = async () => {
    setIsLoadingCourses(true);
    try {
      const res = await fetch("/api/courses");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar el catálogo.");
      if (Array.isArray(data.courses)) {
        setCourses(data.courses.map((course: Partial<CourseItem>) => ({
          id: course.id || course.course_uuid || "",
          name: course.name || "Curso sin nombre",
          course_uuid: course.course_uuid || "",
          description: course.description || "Sin descripción.",
          price_pyg: Number(course.price_pyg || 0),
          price_usd: Number(course.price_usd || 0),
          badge: course.badge,
        })));
      }
    } catch (error: unknown) {
      setCoursesMessage(error instanceof Error ? error.message : "No se pudo cargar el catálogo.");
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const syncCourses = async () => {
    setIsSyncingCourses(true);
    setCoursesMessage(null);
    try {
      const res = await fetch("/api/courses", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo sincronizar el catálogo.");
      const deactivated = Number(data.deactivated || 0);
      setCoursesMessage(
        `${data.synced} curso(s) sincronizado(s) desde LearnHouse.${
          deactivated > 0 ? ` ${deactivated} curso(s) eliminado(s) del Campus fueron desactivados.` : ""
        }`
      );
      await fetchCourses();
    } catch (error: unknown) {
      setCoursesMessage(error instanceof Error ? error.message : "No se pudo sincronizar el catálogo.");
    } finally {
      setIsSyncingCourses(false);
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          course_uuid: selectedCourseUuid,
          payment_method: paymentMethod,
          amount_paid: amountPaid,
          notes,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error al procesar la matrícula");
      }

      setSuccessData(json.data);
      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setNotes("");
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappMessage = successData
    ? `¡Hola ${successData.student.name}! Ya tienes acceso habilitado a tu curso "${successData.course.name}" en el Campus.
Podés ingresar directamente haciendo clic aquí:
${successData.magicLink}`
    : "";

  const copyToClipboard = (text: string, type: "link" | "msg") => {
    navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === "msg") {
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Top Banner / Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Campus Portal
                <span className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-mono font-medium">
                  Vercel + Supabase
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Matriculación de Alumnos y Checkout para LearnHouse LMS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://campus.michaelsahlmann.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              Ver Campus
            </a>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
              }}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-red-400 hover:border-red-800 transition"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 -mb-px">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === "form"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Matricular Alumno
          </button>
          <button
            onClick={() => {
              setActiveTab("students");
              void fetchStudents();
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === "students"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            Alumnos & Matrículas
          </button>
          <button
            onClick={() => {
              setActiveTab("courses");
              void fetchCourses();
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === "courses"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Cursos & Mapeo
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === "config"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings className="w-4 h-4" />
            Configuración
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* TAB 1: FORMULARIO DE MATRICULACION */}
        {activeTab === "form" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-sky-400" />
                    Dar de Alta y Matricular Alumno
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Crea la cuenta del alumno en LearnHouse, lo matricula en el curso y genera un
                    enlace de acceso directo inmediato (Magic Link).
                  </p>
                </div>

                {submitError && (
                  <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Error al matricular:</strong>
                      {submitError}
                    </div>
                  </div>
                )}

                <form onSubmit={handleEnrollSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Nombre y Apellido del Alumno
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Correo Electrónico (Login del Alumno)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="alumno@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Teléfono o WhatsApp (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="+595 981 123456"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Curso a Habilitar
                    </label>
                    <select
                      value={selectedCourseUuid}
                      onChange={(e) => {
                        setSelectedCourseUuid(e.target.value);
                        const c = courses.find((item) => item.course_uuid === e.target.value);
                        if (c) setAmountPaid(c.price_pyg);
                      }}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500 transition"
                    >
                      {courses.map((course) => (
                        <option key={course.course_uuid} value={course.course_uuid}>
                          {course.name} ({course.price_pyg.toLocaleString()} PYG)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Método de Pago
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500 transition"
                      >
                        <option value="manual_transfer">Transferencia Bancaria (SIPAP)</option>
                        <option value="cash_pos">Efectivo / POS / Cobro directo</option>
                        <option value="stripe">Stripe</option>
                        <option value="mercadopago">MercadoPago</option>
                        <option value="courtesy">Cortesía / Beca 100%</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Monto Pagado (PYG)
                      </label>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Notas Internas (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Comprobante SIPAP #123456"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50 transition cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Conectando con LearnHouse...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Habilitar Alumno en el Campus
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Columna Derecha: Vista Previa y Resultado */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card de Éxito / Resultado */}
              {successData ? (
                <div className="bg-emerald-950/40 border border-emerald-600/40 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-emerald-400 text-base">
                        ¡Matrícula Confirmada con Éxito!
                      </h3>
                      <p className="text-xs text-slate-300">
                        {successData.student.isNewUser
                          ? "Cuenta creada y verificada en LearnHouse"
                          : "Alumno existente vinculado al curso"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Alumno:</span>
                      <span className="font-semibold text-white">{successData.student.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-mono text-sky-400">{successData.student.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ID en Campus:</span>
                      <span className="font-mono text-emerald-400">#{successData.student.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Curso:</span>
                      <span className="text-white truncate max-w-[200px] text-right">
                        {successData.course.name}
                      </span>
                    </div>
                  </div>

                  {/* Magic Link */}
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Magic Link de Acceso Inmediato:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={successData.magicLink}
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg font-mono text-slate-300"
                      />
                      <button
                        onClick={() => copyToClipboard(successData.magicLink, "link")}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedLink ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Box */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        Mensaje para WhatsApp:
                      </span>
                      <button
                        onClick={() => copyToClipboard(whatsappMessage, "msg")}
                        className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedMsg ? "¡Copiado!" : "Copiar Texto"}
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono whitespace-pre-wrap leading-relaxed">
                      {whatsappMessage}
                    </p>
                  </div>

                  <a
                    href={successData.magicLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    Probar Acceso Directo del Alumno &rarr;
                  </a>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-sm text-slate-400 space-y-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-sky-400" />
                    Cómo funciona la integración
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
                    <li>
                      Al presionar <strong>&quot;Habilitar Alumno&quot;</strong>, el servidor llama directamente a la API de tu contenedor LearnHouse en <code>campus.michaelsahlmann.com</code>.
                    </li>
                    <li>
                      Verifica si el alumno ya tiene usuario en tu organización <code>default</code>. Si no, lo crea con correo pre-verificado.
                    </li>
                    <li>
                      Lo matricula en el curso seleccionado y genera un <strong>Magic Link de inicio de sesión de 1 clic</strong> válido por 15 minutos para enviarlo de inmediato.
                    </li>
                    <li>
                      Si tienes Supabase conectado, guarda el registro del pago, método y estado para tus reportes contables.
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ALUMNOS MATRICULADOS */}
        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-400" />
                  Alumnos Registrados en Supabase
                </h2>
                <p className="text-xs text-slate-400">
                  Historial de alumnos habilitados y sus matrículas en el campus.
                </p>
              </div>
              <button
                onClick={fetchStudents}
                disabled={isLoadingStudents}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStudents ? "animate-spin" : ""}`} />
                Actualizar
              </button>
            </div>

            {!supabaseConfigured && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <strong>Supabase aún no está conectado:</strong> Los alumnos se están matriculando en vivo en LearnHouse, pero para ver la lista histórica persistida aquí, configura las variables <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code> en tu panel de Vercel.
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4">Alumno</th>
                      <th className="py-3 px-4">Correo</th>
                      <th className="py-3 px-4">ID LearnHouse</th>
                      <th className="py-3 px-4">Cursos Matriculados</th>
                      <th className="py-3 px-4">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {students.length > 0 ? (
                      students.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-semibold text-white">{st.name}</td>
                          <td className="py-3 px-4 font-mono text-sky-400">{st.email}</td>
                          <td className="py-3 px-4 font-mono text-emerald-400">
                            #{st.learnhouse_user_id || "—"}
                          </td>
                          <td className="py-3 px-4">
                            {st.enrollments && st.enrollments.length > 0 ? (
                              <div className="space-y-1">
                                {st.enrollments.map((en) => (
                                  <span
                                    key={en.id}
                                    className="inline-block bg-slate-800 text-slate-200 px-2 py-0.5 rounded text-[11px] mr-1"
                                  >
                                    {en.courses?.name || "Curso"}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500">Sin cursos</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(st.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          {isLoadingStudents
                            ? "Cargando alumnos desde Supabase..."
                            : "No se encontraron alumnos registrados en la base de datos todavía."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CURSOS & MAPEO */}
        {activeTab === "courses" && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-sky-400" />
                  Catálogo de Cursos & Mapeo con LearnHouse
                </h2>
                <p className="text-xs text-slate-400">
                  Cada curso en esta lista está vinculado por su <code>course_uuid</code> al campus de producción.
                </p>
              </div>
              <button
                onClick={() => void syncCourses()}
                disabled={isSyncingCourses || isLoadingCourses}
                className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCourses ? "animate-spin" : ""}`} />
                {isSyncingCourses ? "Sincronizando..." : "Sincronizar cursos"}
              </button>
            </div>

            {coursesMessage && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs">
                {coursesMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => (
                <div
                  key={course.course_uuid}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-medium">
                        {course.badge || "Activo"}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {course.price_pyg > 0
                          ? `${course.price_pyg.toLocaleString()} PYG`
                          : "Gratis / Demo"}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-white mb-2">{course.name}</h3>
                    <p className="text-xs text-slate-400 mb-4">{course.description}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <div>
                      <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                        UUID en LearnHouse:
                      </span>
                      <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
                        <span className="truncate mr-2">{course.course_uuid}</span>
                        <button
                          onClick={() => copyToClipboard(course.course_uuid, "link")}
                          className="text-sky-400 hover:text-sky-300 text-xs"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>

                    <a
                      href={`https://campus.michaelsahlmann.com/courses/${course.course_uuid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver curso en el Campus
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CONFIGURACION & VERCEL */}
        {activeTab === "config" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-400" />
                Configuración de Vercel & Supabase
              </h2>
              <p className="text-xs text-slate-400">
                Variables de entorno y script SQL para inicializar tu base de datos en Supabase.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Variables de Entorno */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="font-bold text-white text-sm mb-3">
                  Variables de Entorno para Vercel
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Configura estas variables en tu proyecto de Vercel (Settings &rarr; Environment Variables):
                </p>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 space-y-2">
                  <div># Conexión LearnHouse LMS (Ya configurado)</div>
                  <div>LEARNHOUSE_API_URL=https://campus.michaelsahlmann.com</div>
                  <div>LEARNHOUSE_ORG_SLUG=default</div>
                  <div>LEARNHOUSE_API_TOKEN=lh_*****************************</div>
                  <div className="pt-2"># Conexión Supabase</div>
                  <div>NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co</div>
                  <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key</div>
                  <div>SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key</div>
                </div>
              </div>

              {/* Endpoint de Webhook */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="font-bold text-white text-sm">
                  Webhook para Pasarelas (Stripe / MercadoPago)
                </h3>
                <p className="text-xs text-slate-400">
                  Tu aplicación expone un endpoint listo para recibir notificaciones automáticas de pago:
                </p>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-sky-400">
                  https://&lt;tu-dominio-vercel&gt;.vercel.app/api/webhook/stripe
                </div>

                <p className="text-xs text-slate-400">
                  Al recibir un evento <code>checkout.session.completed</code>, el sistema automáticamente:
                </p>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                  <li>Crea al usuario en LearnHouse con su email de compra.</li>
                  <li>Lo matricula en el curso vinculado.</li>
                  <li>Guarda el registro contable en Supabase.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
