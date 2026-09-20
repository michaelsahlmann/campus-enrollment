"use client";

import React, { useState, useEffect } from "react";
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
  CreditCard,
  Link2,
  X,
  Eye,
  Trash2,
  Pencil,
  AlertTriangle,
  Tag,
  Menu,
  LogOut,
  Building2,
} from "lucide-react";
import { DEFAULT_COURSES, CourseItem } from "@/lib/courses";
import { BankSettings, DEFAULT_BANK_SETTINGS } from "@/lib/settings";

function formatPygInput(val: string | number): string {
  if (val === "" || val === null || val === undefined) return "";
  const clean = String(val).replace(/\D/g, "");
  if (!clean) return "";
  return Number(clean).toLocaleString("es-PY");
}

function parsePygInput(val: string): number {
  const clean = val.replace(/\D/g, "");
  return clean ? parseInt(clean, 10) : 0;
}

interface CouponItem {
  id: string;
  code: string;
  name: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  is_active: boolean;
  created_at?: string;
}

interface CheckoutItem {
  id: string;
  slug: string;
  title: string;
  price_pyg: number;
  is_active: boolean;
  created_at?: string;
  courses?: {
    name: string;
    course_uuid?: string;
  };
}

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

interface OrderItem {
  id: string;
  reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  payment_method: string;
  status: string;
  payment_proof_path?: string | null;
  proof_url?: string | null;
  created_at: string;
  courses?: { name: string; course_uuid: string };
}

const TAB_MAP: Record<string, "form" | "students" | "courses" | "checkouts" | "orders" | "coupons" | "config"> = {
  "matricular": "form",
  "matricular-alumno": "form",
  "alumnos": "students",
  "cursos": "courses",
  "checkouts": "checkouts",
  "orders": "orders",
  "pagos-pendientes": "orders",
  "cupones": "coupons",
  "config": "config",
  "configuracion": "config",
};

const TAB_REVERSE_MAP: Record<string, string> = {
  form: "matricular-alumno",
  students: "alumnos",
  courses: "cursos",
  checkouts: "checkouts",
  orders: "pagos-pendientes",
  coupons: "cupones",
  config: "configuracion",
};

export default function CampusPortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"form" | "students" | "courses" | "checkouts" | "orders" | "coupons" | "config">(() => {
    if (typeof window !== "undefined") {
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam && TAB_MAP[tabParam]) {
        return TAB_MAP[tabParam];
      }
    }
    return "form";
  });

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
    student: { id: number; name: string; email: string; phone?: string; isNewUser: boolean };
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
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [couponName, setCouponName] = useState("");
  const [couponType, setCouponType] = useState("percentage");
  const [couponValue, setCouponValue] = useState(10);
  const [couponLength, setCouponLength] = useState(6);
  const [couponCustomCode, setCouponCustomCode] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);
  const [isUpdatingCoupon, setIsUpdatingCoupon] = useState(false);

  // Checkouts State
  const [checkouts, setCheckouts] = useState<CheckoutItem[]>([]);
  const [isLoadingCheckouts, setIsLoadingCheckouts] = useState(false);
  const [checkoutTitle, setCheckoutTitle] = useState("");
  const [checkoutCourseId, setCheckoutCourseId] = useState("");
  const [checkoutPrice, setCheckoutPrice] = useState<number>(1500000);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [previewCheckoutSlug, setPreviewCheckoutSlug] = useState<string | null>(null);

  // Datos Bancarios State (CRUD para Checkouts)
  const [bankSettings, setBankSettings] = useState<BankSettings>(DEFAULT_BANK_SETTINGS);
  const [isLoadingBankSettings, setIsLoadingBankSettings] = useState(false);
  const [isSavingBankSettings, setIsSavingBankSettings] = useState(false);
  const [bankSettingsMessage, setBankSettingsMessage] = useState<string | null>(null);

  // Mobile navigation state
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Modal en Rojo de Eliminación Definitiva (Ciclo de borrado)
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    type: "checkout" | "coupon" | "all_coupons" | "course";
    id?: string;
    title: string;
    description: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const response = await fetch("/api/orders");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar las órdenes.");
      setOrders(data.orders || []);
    } catch (cause: unknown) {
      setOrderMessage(cause instanceof Error ? cause.message : "No se pudieron cargar las órdenes.");
    } finally { setIsLoadingOrders(false); }
  };

  const confirmOrder = async (orderId: string) => {
    setOrderMessage(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/confirm`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo confirmar la orden.");
      setOrderMessage(data.alreadyConfirmed ? "Esta orden ya estaba confirmada." : "Pago confirmado y acceso liberado.");
      await fetchOrders();
    } catch (cause: unknown) {
      setOrderMessage(cause instanceof Error ? cause.message : "No se pudo confirmar la orden.");
    }
  };

  const fetchCoupons = async () => {
    setIsLoadingCoupons(true);
    try {
      const res = await fetch("/api/coupons");
      const data = await res.json();
      if (data.coupons) {
        setCoupons(data.coupons);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  const createCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    setCouponMessage(null);
    try {
      const response = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: couponName,
          code: couponCustomCode.trim() || undefined,
          discountType: couponType,
          discountValue: couponValue,
          length: couponLength,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo crear el cupón.");
      setCouponMessage(`¡Cupón creado con éxito! Código: ${data.coupon.code}`);
      setCouponName("");
      setCouponCustomCode("");
      await fetchCoupons();
    } catch (cause: unknown) {
      setCouponMessage(cause instanceof Error ? cause.message : "No se pudo crear el cupón.");
    }
  };

  const toggleCouponActive = async (item: CouponItem) => {
    try {
      const res = await fetch(`/api/coupons/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !item.is_active,
        }),
      });
      if (res.ok) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === item.id ? { ...c, is_active: !c.is_active } : c))
        );
      }
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;
    setIsUpdatingCoupon(true);
    try {
      const res = await fetch(`/api/coupons/${editingCoupon.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editingCoupon.code,
          name: editingCoupon.name,
          discountType: editingCoupon.discount_type,
          discountValue: editingCoupon.discount_value,
          isActive: editingCoupon.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar cupón.");
      setEditingCoupon(null);
      await fetchCoupons();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al actualizar cupón.");
    } finally {
      setIsUpdatingCoupon(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDeleteModal) return;
    setIsDeleting(true);
    try {
      if (confirmDeleteModal.type === "checkout" && confirmDeleteModal.id) {
        const res = await fetch(`/api/checkouts/${confirmDeleteModal.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al eliminar checkout.");
        setCheckouts((prev) => prev.filter((c) => c.id !== confirmDeleteModal.id));
        setCheckoutMessage("Link de checkout eliminado correctamente.");
      } else if (confirmDeleteModal.type === "coupon" && confirmDeleteModal.id) {
        const res = await fetch(`/api/coupons/${confirmDeleteModal.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al eliminar cupón.");
        setCoupons((prev) => prev.filter((c) => c.id !== confirmDeleteModal.id));
        setCouponMessage("Cupón eliminado correctamente.");
      } else if (confirmDeleteModal.type === "all_coupons") {
        const res = await fetch(`/api/coupons`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al eliminar cupones.");
        setCoupons([]);
        setCouponMessage("Todos los cupones fueron eliminados correctamente.");
      } else if (confirmDeleteModal.type === "course" && confirmDeleteModal.id) {
        const res = await fetch(`/api/courses?uuid=${encodeURIComponent(confirmDeleteModal.id)}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo eliminar el curso.");
        setCourses((prev) => prev.filter((c) => c.course_uuid !== confirmDeleteModal.id));
        setCoursesMessage("Curso eliminado correctamente del catálogo.");
      }
      setConfirmDeleteModal(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al procesar eliminación.");
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchCheckouts = async () => {
    setIsLoadingCheckouts(true);
    try {
      const res = await fetch("/api/checkouts");
      const data = await res.json();
      if (data.checkouts) {
        setCheckouts(data.checkouts);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoadingCheckouts(false);
    }
  };

  const createCheckoutLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutMessage(null);
    try {
      const targetCourse = courses.find((c) => c.id === checkoutCourseId || c.course_uuid === checkoutCourseId) || courses[0];
      const res = await fetch("/api/checkouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: checkoutTitle,
          courseId: targetCourse?.course_uuid || targetCourse?.id || "",
          pricePyg: checkoutPrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el checkout.");
      setCheckoutMessage(`Checkout creado con éxito: /checkout/${data.checkout.slug}`);
      setCheckoutTitle("");
      await fetchCheckouts();
    } catch (err: unknown) {
      setCheckoutMessage(err instanceof Error ? err.message : "Error al crear checkout.");
    }
  };

  const toggleCheckoutActive = async (item: CheckoutItem) => {
    try {
      const res = await fetch(`/api/checkouts/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          pricePyg: item.price_pyg,
          isActive: !item.is_active,
        }),
      });
      if (res.ok) {
        setCheckouts((prev) =>
          prev.map((c) => (c.id === item.id ? { ...c, is_active: !c.is_active } : c))
        );
      }
    } catch (err: unknown) {
      console.error(err);
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

  const copyCheckoutLink = (courseUuid: string) => {
    copyToClipboard(`${window.location.origin}/checkout/${courseUuid}`, "link");
  };

  const handleGenerateStudentMagicLink = async (st: StudentItem, courseUuid: string) => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: st.name,
          email: st.email,
          phone: st.phone || "",
          course_uuid: courseUuid,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo generar el enlace");
      setSuccessData(json.data);
      switchTab("form");
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Error al generar enlace");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchBankSettings = async () => {
    setIsLoadingBankSettings(true);
    try {
      const res = await fetch("/api/settings/bank");
      if (res.ok) {
        const data = await res.json();
        setBankSettings(data);
      }
    } catch (err) {
      console.error("Error al cargar datos bancarios:", err);
    } finally {
      setIsLoadingBankSettings(false);
    }
  };

  const saveBankSettingsHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBankSettings(true);
    setBankSettingsMessage(null);
    try {
      const res = await fetch("/api/settings/bank", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankSettings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setBankSettingsMessage("¡Datos bancarios actualizados correctamente! Se reflejan de inmediato en todos los checkouts.");
      setTimeout(() => setBankSettingsMessage(null), 4000);
    } catch (err: unknown) {
      setBankSettingsMessage(err instanceof Error ? err.message : "Error al guardar datos bancarios.");
    } finally {
      setIsSavingBankSettings(false);
    }
  };

  const switchTab = (tab: "form" | "students" | "courses" | "checkouts" | "orders" | "coupons" | "config") => {
    setActiveTab(tab);
    setMobileNavOpen(false);
    const slug = TAB_REVERSE_MAP[tab] || tab;
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", slug);
      window.history.pushState({}, "", url.toString());
    }

    if (tab === "students") void fetchStudents();
    if (tab === "courses") void fetchCourses();
    if (tab === "checkouts") void fetchCheckouts();
    if (tab === "orders") void fetchOrders();
    if (tab === "coupons") void fetchCoupons();
    if (tab === "config") void fetchBankSettings();
  };

  useEffect(() => {
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const initialTab = tabParam && TAB_MAP[tabParam] ? TAB_MAP[tabParam] : "form";
      if (initialTab === "students") void fetchStudents();
      if (initialTab === "courses") void fetchCourses();
      if (initialTab === "checkouts") void fetchCheckouts();
      if (initialTab === "orders") void fetchOrders();
      if (initialTab === "coupons") void fetchCoupons();
      if (initialTab === "config") void fetchBankSettings();
      void fetchOrders();
      void fetchBankSettings();
    });
  }, []);

  const pendingOrdersCount = orders.filter((o) => o.status === "pending_review").length;

  const navItems = [
    { id: "form" as const, label: "Matricular Alumno", icon: UserPlus },
    { id: "students" as const, label: "Alumnos & Matrículas", icon: Users },
    { id: "courses" as const, label: "Cursos & Mapeo", icon: BookOpen },
    { id: "orders" as const, label: "Pagos pendientes", icon: CheckCircle2, badge: pendingOrdersCount },
    { id: "coupons" as const, label: "Cupones", icon: Sparkles },
    { id: "checkouts" as const, label: "Links de Checkout", icon: CreditCard },
    { id: "config" as const, label: "Configuración", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#06080D] text-slate-100 font-sans antialiased flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden border-b border-slate-800 bg-[#0B0F17] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm text-white leading-none block">Campus Portal</span>
            <span className="text-[10px] text-slate-400 leading-none block mt-0.5">Admin & Checkouts</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
          aria-label="Abrir menú"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-x-0 top-14 bg-[#0B0F17] border-b border-slate-800 p-4 z-30 space-y-1.5 shadow-2xl animate-fade-in">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => switchTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === item.id
                  ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          <div className="pt-3 mt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <a
              href="https://campus.michaelsahlmann.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              Ver Campus
            </a>
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-red-400 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </div>
        </div>
      )}

      {/* Left Sidebar for Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0B0F17] border-r border-slate-800/80 z-30">
        {/* Sidebar Brand */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sm text-white tracking-tight block truncate leading-tight">
              Campus Portal
            </span>
            <span className="text-[10px] text-slate-400 block truncate leading-tight mt-0.5">
              Admin & Checkouts
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => switchTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === item.id
                  ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <item.icon className={`w-4 h-4 ${activeTab === item.id ? "text-sky-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/30 space-y-1 text-xs">
          <a
            href="https://campus.michaelsahlmann.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
            <span>Ir a LearnHouse LMS</span>
          </a>

          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-900 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="lg:pl-64 flex-1 flex flex-col min-h-screen bg-[#06080D]">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1">
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Nombre y Apellido del Alumno
                      </label>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        OBLIGATORIO
                      </span>
                    </div>
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Correo Electrónico (Login del Alumno)
                      </label>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        OBLIGATORIO
                      </span>
                    </div>
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Teléfono o WhatsApp
                      </label>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        OPCIONAL · ACTIVA ENVÍO DE WHATSAPP
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="+595 981 123456"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Curso a Habilitar
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          OBLIGATORIO
                        </span>
                        <button
                          type="button"
                          onClick={() => void syncCourses()}
                          disabled={isSyncingCourses}
                          className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                          title="Sincronizar cursos desde LearnHouse"
                        >
                          <RefreshCw className={`w-3 h-3 ${isSyncingCourses ? "animate-spin" : ""}`} />
                          Sincronizar
                        </button>
                      </div>
                    </div>
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
                        <option value="manual_transfer">Transferencia bancaria</option>
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
                        type="text"
                        inputMode="numeric"
                        value={formatPygInput(amountPaid)}
                        onChange={(e) => setAmountPaid(parsePygInput(e.target.value))}
                        placeholder="1.500.000"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-sky-500 transition"
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
                      <div className="flex items-center gap-2">
                        {successData.student.phone && (
                          <a
                            href={`https://wa.me/${successData.student.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappMessage)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Enviar por WhatsApp
                          </a>
                        )}
                        <button
                          onClick={() => copyToClipboard(whatsappMessage, "msg")}
                          className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedMsg ? "¡Copiado!" : "Copiar Texto"}
                        </button>
                      </div>
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
                <div className="space-y-4">
                  {/* Tarjeta de Previsualización en Vivo */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <h3 className="text-white font-bold text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-sky-400" />
                        Previsualización del Alta en LearnHouse
                      </h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        En vivo
                      </span>
                    </div>

                    <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 text-xs space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Alumno:</span>
                        <span className="font-semibold text-white truncate max-w-[200px]">
                          {name.trim() || <span className="text-slate-600 italic">Escribe el nombre...</span>}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Email:</span>
                        <span className="font-mono text-sky-400 truncate max-w-[200px]">
                          {email.trim() || <span className="text-slate-600 italic">Escribe el correo...</span>}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Usuario LearnHouse:</span>
                        <span className="font-mono text-slate-300 truncate max-w-[200px]">
                          {email.trim() ? (
                            `${email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "alumno"}_...`
                          ) : (
                            <span className="text-slate-600 italic">Automático</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Rol asignado:</span>
                        <span className="text-emerald-400 font-semibold">Estudiante (Rol 4)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Estado de cuenta:</span>
                        <span className="text-emerald-400 font-semibold">Verificada inmediatamente</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Curso:</span>
                        <span className="text-white font-medium text-right truncate max-w-[200px]">
                          {courses.find((c) => c.course_uuid === selectedCourseUuid)?.name || "Seleccionar..."}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Invitación:</span>
                        <span className="text-sky-400 font-medium">Magic Link + WhatsApp directo</span>
                      </div>
                    </div>
                  </div>

                  {/* Cómo funciona */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-sm text-slate-400 space-y-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-sky-400" />
                      Cómo funciona la integración
                    </h3>
                    <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
                      <li>
                        Al presionar <strong>&quot;Habilitar Alumno&quot;</strong>, el servidor llama directamente a la API de LearnHouse en <code>campus.michaelsahlmann.com</code>.
                      </li>
                      <li>
                        Verifica si el alumno ya existe en tu organización <code>default</code>. Si no, lo crea con correo pre-verificado.
                      </li>
                      <li>
                        Lo matricula en el curso y genera un <strong>Magic Link de acceso de 1 clic</strong> listo para enviar por WhatsApp.
                      </li>
                      <li>
                        Si tienes Supabase conectado, guarda el registro del alumno y el pago en tu base de datos.
                      </li>
                    </ol>
                  </div>
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
                      <th className="py-3 px-4">Acceso / Invitación</th>
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
                          <td className="py-3 px-4">
                            {st.enrollments && st.enrollments.length > 0 ? (
                              <div className="space-y-1">
                                {st.enrollments.map((en) => (
                                  <button
                                    key={en.id}
                                    onClick={() =>
                                      void handleGenerateStudentMagicLink(
                                        st,
                                        en.courses?.course_uuid || selectedCourseUuid
                                      )
                                    }
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium px-2 py-1 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 rounded cursor-pointer disabled:opacity-50 transition"
                                  >
                                    <Sparkles className="w-3 h-3 text-sky-400" />
                                    Generar Magic Link
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(st.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
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
                    <div>
                      <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                        Acciones & Checkout:
                      </span>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewCheckoutSlug(course.course_uuid)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Previsualizar
                          </button>
                          <span className="text-slate-600">·</span>
                          <button
                            type="button"
                            onClick={() => copyCheckoutLink(course.course_uuid)}
                            className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                          >
                            {copiedLink ? "¡Copiado!" : "Copiar link"}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteModal({
                              type: "course",
                              id: course.course_uuid,
                              title: `¿Eliminar "${course.name}"?`,
                              description: `Esta acción eliminará el curso "${course.name}" de la base de datos y del catálogo del portal. Si tiene alumnos matriculados, Supabase prevendrá la eliminación por integridad referencial.`,
                            });
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 cursor-pointer px-2 py-1 rounded hover:bg-rose-950/50 transition"
                          title="Eliminar curso del catálogo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: CHECKOUTS INTEGRADOS */}
        {activeTab === "checkouts" && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  Links de Checkout para Alumnos
                </h2>
                <p className="text-xs text-slate-400">
                  Crea y gestiona páginas de pago simples para tus cursos. Puedes previsualizarlas directamente sin salir del panel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchCheckouts()}
                disabled={isLoadingCheckouts}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCheckouts ? "animate-spin" : ""}`} />
                {isLoadingCheckouts ? "Cargando..." : "Actualizar"}
              </button>
            </div>

            {checkoutMessage && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs">
                {checkoutMessage}
              </div>
            )}

            {/* Crear nuevo checkout */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-emerald-400" />
                Crear Nuevo Link de Checkout
              </h3>
              <form onSubmit={createCheckoutLink} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Título / Referencia
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Promoción Lanzamiento"
                      value={checkoutTitle}
                      onChange={(e) => setCheckoutTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Curso Asociado
                    </label>
                    <select
                      value={checkoutCourseId || (courses[0]?.id || courses[0]?.course_uuid || "")}
                      onChange={(e) => setCheckoutCourseId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm cursor-pointer"
                    >
                      {courses.map((course) => (
                        <option key={course.course_uuid} value={course.id || course.course_uuid}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Precio (PYG)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="1.500.000"
                      value={formatPygInput(checkoutPrice)}
                      onChange={(e) => setCheckoutPrice(parsePygInput(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Generar Link de Checkout
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de Checkouts Existentes */}
            <div className="space-y-3">
              <h3 className="font-bold text-white text-sm">Links Activos</h3>
              {isLoadingCheckouts ? (
                <div className="text-slate-400 text-xs py-4 text-center">Cargando checkouts...</div>
              ) : checkouts.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
                  Aún no has generado checkouts personalizados. También puedes previsualizar los checkouts directos por curso en la pestaña &quot;Cursos & Mapeo&quot;.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {checkouts.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.is_active ? "bg-emerald-400" : "bg-slate-600"
                              }`}
                            />
                            <h4 className="font-bold text-white text-sm">{item.title}</h4>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {item.courses?.name || "Curso asociado"}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                          {item.price_pyg.toLocaleString()} PYG
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewCheckoutSlug(item.slug)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 font-medium flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Previsualizar aquí
                          </button>
                          <button
                            type="button"
                            onClick={() => copyCheckoutLink(item.slug)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copiar link
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void toggleCheckoutActive(item)}
                            className={`text-[11px] font-semibold transition cursor-pointer px-2.5 py-1 rounded ${
                              item.is_active
                                ? "bg-slate-800 text-slate-400 hover:text-amber-400"
                                : "bg-emerald-950/50 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20"
                            }`}
                          >
                            {item.is_active ? "Desactivar" : "Activar"}
                          </button>

                          {!item.is_active && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteModal({
                                  type: "checkout",
                                  id: item.id,
                                  title: `Eliminar Link "${item.title}"`,
                                  description: `¿Estás seguro de que deseas eliminar definitivamente este link de checkout? Esta acción es irreversible y eliminará el enlace público /checkout/${item.slug}.`,
                                });
                              }}
                              className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 px-2 py-1 rounded transition cursor-pointer flex items-center gap-1"
                              title="Eliminar checkout definitivamente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Pagos Pendientes de Verificación
                </h2>
                <p className="text-xs text-slate-400">
                  Revisa los pagos registrados por los alumnos y confirma para liberar automáticamente su usuario y matrícula en LearnHouse.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchOrders()}
                disabled={isLoadingOrders}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? "animate-spin" : ""}`} />
                {isLoadingOrders ? "Actualizando..." : "Actualizar"}
              </button>
            </div>

            {orderMessage && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{orderMessage}</span>
              </div>
            )}

            <div className="space-y-3">
              {orders
                .filter((order) => order.status === "pending_review")
                .map((order) => (
                  <div
                    key={order.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">
                          {order.customer_name}
                        </span>
                        <span className="text-sky-400 font-mono text-xs bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 font-semibold">
                          #{order.reference}
                        </span>
                        {order.customer_phone && (
                          <a
                            href={`https://wa.me/${order.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hola ${order.customer_name}, te escribo del equipo de soporte de Campus Michael Sahlmann respecto a tu pago #${order.reference}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 transition cursor-pointer"
                            title="Contactar al alumno por WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WhatsApp ({order.customer_phone})</span>
                          </a>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 truncate">
                        <span className="text-slate-400">{order.customer_email}</span>
                        <span className="mx-1.5 text-slate-600">·</span>
                        <span className="text-white font-medium">{order.courses?.name || "Curso"}</span>
                      </p>

                      <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                        <span className="text-slate-400">
                          Método:{" "}
                          <strong className="text-slate-200">
                            {order.payment_method === "transfer" ? "Transferencia bancaria" : "Pago coordinado"}
                          </strong>
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className={order.payment_proof_path ? "text-emerald-400" : "text-amber-400"}>
                          {order.payment_proof_path ? "Con comprobante adjunto" : "Declaró pago"}
                        </span>
                        {order.proof_url && (
                          <>
                            <span className="text-slate-600">·</span>
                            <a
                              href={order.proof_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium underline underline-offset-2"
                            >
                              <Eye className="w-3 h-3" />
                              Ver comprobante
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void confirmOrder(order.id)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar y liberar acceso
                    </button>
                  </div>
                ))}

              {!isLoadingOrders && orders.filter((order) => order.status === "pending_review").length === 0 && (
                <div className="p-8 text-center bg-slate-900/50 border border-slate-800/80 rounded-2xl">
                  <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-300 font-medium text-sm">No hay pagos pendientes de revisión</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cuando un alumno complete el checkout, aparecerá aquí para su liberación.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: GESTION COMPLETA DE CUPONES */}
        {activeTab === "coupons" && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Gestión de Cupones de Descuento
                </h2>
                <p className="text-xs text-slate-400">
                  Crea, edita y administra códigos promocionales aplicables en el checkout de tus cursos.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchCoupons()}
                  disabled={isLoadingCoupons}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCoupons ? "animate-spin" : ""}`} />
                  {isLoadingCoupons ? "Cargando..." : "Actualizar"}
                </button>

                {coupons.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteModal({
                        type: "all_coupons",
                        title: "Eliminar Todos los Cupones",
                        description: `¿Estás seguro de que deseas eliminar definitivamente TODOS los ${coupons.length} cupones existentes? Esta acción es irreversible.`,
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    Borrar todos los cupones
                  </button>
                )}
              </div>
            </div>

            {couponMessage && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{couponMessage}</span>
              </div>
            )}

            {/* Formulario de Creación de Cupón */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                Crear Nuevo Cupón
              </h3>

              <form onSubmit={createCoupon} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Nombre Interno */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Nombre Interno
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ej. Beca Lanzamiento"
                      value={couponName}
                      onChange={(e) => setCouponName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
                    />
                  </div>

                  {/* Código Personalizado (Opcional) */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Código Personalizado <span className="text-slate-500 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. BECA50 (o dejar vacío)"
                      value={couponCustomCode}
                      onChange={(e) => setCouponCustomCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm font-mono uppercase"
                    />
                  </div>

                  {/* Tipo de Descuento */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Tipo de Descuento
                    </label>
                    <select
                      value={couponType}
                      onChange={(e) => setCouponType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs sm:text-sm cursor-pointer"
                    >
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Monto Fijo (PYG)</option>
                    </select>
                  </div>

                  {/* Valor del Descuento */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Valor ({couponType === "percentage" ? "%" : "PYG"})
                    </label>
                    <input
                      required
                      min={1}
                      max={couponType === "percentage" ? 100 : undefined}
                      type={couponType === "percentage" ? "number" : "text"}
                      inputMode={couponType === "percentage" ? "numeric" : "numeric"}
                      placeholder={couponType === "percentage" ? "10" : "150.000"}
                      value={couponType === "percentage" ? couponValue : formatPygInput(couponValue)}
                      onChange={(e) =>
                        setCouponValue(
                          couponType === "percentage"
                            ? Number(e.target.value)
                            : parsePygInput(e.target.value)
                        )
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {!couponCustomCode && (
                  <div className="flex items-center gap-3 pt-1 text-xs text-slate-400">
                    <span>Longitud del código aleatorio:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="couponLength"
                        checked={couponLength === 4}
                        onChange={() => setCouponLength(4)}
                        className="text-emerald-500"
                      />
                      <span>4 caracteres</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="couponLength"
                        checked={couponLength === 6}
                        onChange={() => setCouponLength(6)}
                        className="text-emerald-500"
                      />
                      <span>6 caracteres</span>
                    </label>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generar Cupón
                  </button>
                </div>
              </form>
            </div>

            {/* Listado de Todos los Cupones */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">
                  Cupones Registrados ({coupons.length})
                </h3>
              </div>

              {isLoadingCoupons ? (
                <div className="text-slate-400 text-xs py-6 text-center">Cargando cupones...</div>
              ) : coupons.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
                  No hay cupones creados aún. Genera tu primer cupón arriba.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coupons.map((c) => (
                    <div
                      key={c.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                c.is_active ? "bg-emerald-400" : "bg-slate-600"
                              }`}
                            />
                            <span className="font-mono text-base font-bold text-white tracking-wider">
                              {c.code}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(c.code, "link")}
                            className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
                            title="Copiar código"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-xs text-slate-300 font-medium">{c.name}</p>

                        <div className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          {c.discount_type === "percentage"
                            ? `${c.discount_value}% OFF`
                            : `-${Number(c.discount_value).toLocaleString()} PYG`}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                        <button
                          type="button"
                          onClick={() => setEditingCoupon(c)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 text-sky-400" />
                          Editar
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void toggleCouponActive(c)}
                            className={`text-[11px] font-semibold transition cursor-pointer px-2 py-1 rounded ${
                              c.is_active
                                ? "bg-slate-800 text-slate-400 hover:text-amber-400"
                                : "bg-emerald-950/50 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20"
                            }`}
                          >
                            {c.is_active ? "Desactivar" : "Activar"}
                          </button>

                          {!c.is_active && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteModal({
                                  type: "coupon",
                                  id: c.id,
                                  title: `Eliminar Cupón "${c.code}"`,
                                  description: `¿Estás seguro de que deseas eliminar definitivamente el cupón ${c.code} (${c.name})? Esta acción es irreversible.`,
                                });
                              }}
                              className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 px-2 py-1 rounded transition cursor-pointer flex items-center gap-1"
                              title="Eliminar cupón definitivamente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

            {/* Tarjeta de Datos Bancarios para Checkout (CRUD) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-white text-base">Datos Bancarios para Checkouts</h3>
                    <p className="text-xs text-slate-400">
                      Información bancaria visible para los alumnos que elijan pagar por transferencia bancaria.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchBankSettings()}
                  disabled={isLoadingBankSettings}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title="Recargar datos bancarios"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingBankSettings ? "animate-spin" : ""}`} />
                </button>
              </div>

              {bankSettingsMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{bankSettingsMessage}</span>
                </div>
              )}

              <form onSubmit={saveBankSettingsHandler} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      1. Alias de transferencia <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bankSettings.alias}
                      onChange={(e) => setBankSettings({ ...bankSettings, alias: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
                      placeholder="pagos@michaelsahlmann.com"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Es el campo principal y el primero que ven los alumnos.
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      2. Titular de la cuenta <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bankSettings.titular}
                      onChange={(e) => setBankSettings({ ...bankSettings, titular: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
                      placeholder="Michael Sahlmann"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      3. Entidad Bancaria <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bankSettings.banco}
                      onChange={(e) => setBankSettings({ ...bankSettings, banco: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
                      placeholder="Banco Itaú"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      4. N° de Cuenta <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bankSettings.cuenta}
                      onChange={(e) => setBankSettings({ ...bankSettings, cuenta: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
                      placeholder="720000000"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-300 mb-1">
                      5. Cédula de Identidad / RUC <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bankSettings.ci_ruc}
                      onChange={(e) => setBankSettings({ ...bankSettings, ci_ruc: e.target.value })}
                      className="w-full sm:w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
                      placeholder="4567890-1"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={isSavingBankSettings}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    {isSavingBankSettings ? "Guardando datos..." : "Guardar Datos Bancarios"}
                  </button>
                </div>
              </form>
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

        {/* MODAL DE PREVISUALIZACION DE CHECKOUT EMBEBIDO */}
        {previewCheckoutSlug && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <CreditCard className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-white text-base">Vista Previa del Checkout</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      /checkout/{previewCheckoutSlug}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyCheckoutLink(previewCheckoutSlug)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedLink ? "¡Copiado!" : "Copiar link público"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewCheckoutSlug(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Cerrar vista previa"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 bg-slate-950 overflow-hidden flex flex-col">
                <iframe
                  src={`/checkout/${previewCheckoutSlug}`}
                  title="Checkout Preview"
                  className="w-full h-[650px] rounded-xl border border-slate-800 bg-slate-950"
                />
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE EDICIÓN DE CUPÓN */}
        {editingCoupon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-sky-400" />
                  <h3 className="font-bold text-white text-base">
                    Editar Cupón: <span className="font-mono text-emerald-400">{editingCoupon.code}</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCoupon(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateCoupon} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Código / ID del Cupón
                    </label>
                    <input
                      required
                      type="text"
                      value={editingCoupon.code}
                      onChange={(e) =>
                        setEditingCoupon({
                          ...editingCoupon,
                          code: e.target.value.toUpperCase().replace(/\s/g, ""),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono uppercase text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Nombre Interno
                    </label>
                    <input
                      required
                      type="text"
                      value={editingCoupon.name}
                      onChange={(e) => setEditingCoupon({ ...editingCoupon, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Tipo de Descuento
                    </label>
                    <select
                      value={editingCoupon.discount_type}
                      onChange={(e) =>
                        setEditingCoupon({
                          ...editingCoupon,
                          discount_type: e.target.value as "percentage" | "fixed",
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm cursor-pointer"
                    >
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Monto Fijo (PYG)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Valor ({editingCoupon.discount_type === "percentage" ? "%" : "PYG"})
                    </label>
                    <input
                      required
                      min={1}
                      max={editingCoupon.discount_type === "percentage" ? 100 : undefined}
                      type={editingCoupon.discount_type === "percentage" ? "number" : "text"}
                      inputMode="numeric"
                      value={
                        editingCoupon.discount_type === "percentage"
                          ? editingCoupon.discount_value
                          : formatPygInput(editingCoupon.discount_value)
                      }
                      onChange={(e) =>
                        setEditingCoupon({
                          ...editingCoupon,
                          discount_value:
                            editingCoupon.discount_type === "percentage"
                              ? Number(e.target.value)
                              : parsePygInput(e.target.value),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="edit-is-active"
                    checked={editingCoupon.is_active}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, is_active: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700 cursor-pointer"
                  />
                  <label htmlFor="edit-is-active" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Cupón Activo (permite aplicarse en el checkout)
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingCoupon(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingCoupon}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isUpdatingCoupon ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL EN ROJO DE CONFIRMACION DE ELIMINACION DEFINITIVA */}
        {confirmDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-red-500/60 rounded-2xl w-full max-w-md shadow-2xl shadow-red-950/60 overflow-hidden p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/40">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {confirmDeleteModal.title}
                  </h3>
                  <p className="text-xs text-rose-400 font-medium">
                    Confirmación de Eliminación Definitiva
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {confirmDeleteModal.description}
              </p>

              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Aviso:</strong> Esta acción no se puede deshacer. Una vez eliminado, los enlaces o códigos dejarán de funcionar permanentemente.
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteModal(null)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void executeDelete()}
                  disabled={isDeleting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? "Eliminando..." : "Sí, eliminar definitivamente"}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
