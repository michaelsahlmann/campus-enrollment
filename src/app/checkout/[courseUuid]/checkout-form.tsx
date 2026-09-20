"use client";

import React, { FormEvent, useState, useRef } from "react";
import {
  CheckCircle2,
  Copy,
  Check,
  UploadCloud,
  FileText,
  Sparkles,
  ArrowRight,
  Building2,
  Banknote,
  Phone,
  Mail,
  User,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Lock,
  ShieldCheck,
} from "lucide-react";
import BrandLogo from "@/components/brand-logo";
import { BankSettings, DEFAULT_BANK_SETTINGS } from "@/lib/settings";

type Course = {
  name: string;
  course_uuid: string;
  description: string | null;
  price_pyg: number;
};

export default function CheckoutForm({
  course,
  checkoutSlug,
  bankSettings = DEFAULT_BANK_SETTINGS,
}: {
  course: Course;
  checkoutSlug: string;
  bankSettings?: BankSettings;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"transfer" | "cash">("transfer");
  const [hasProof, setHasProof] = useState<"yes" | "no">("yes");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // Cupón de descuento
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<{
    name: string;
    code: string;
    discount: number;
    amountDue: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const finalPrice = coupon ? coupon.amountDue : course.price_pyg;

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBankField(fieldId);
      setTimeout(() => setCopiedBankField(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setFileError("El comprobante debe ser formato JPG, PNG o PDF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("El archivo no debe superar los 5 MB.");
      return;
    }

    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/checkout/coupons?code=${encodeURIComponent(
          couponCode.trim()
        )}&course_uuid=${encodeURIComponent(
          course.course_uuid
        )}&checkout_slug=${encodeURIComponent(checkoutSlug)}`
      );
      const data = await response.json();
      if (!response.ok) {
        setCoupon(null);
        setCouponError(data.error || "Cupón no válido.");
        return;
      }
      setCoupon({
        name: data.coupon.name,
        code: data.coupon.code,
        discount: Number(data.discount),
        amountDue: Number(data.amountDue),
      });
    } catch (cause: unknown) {
      setCouponError(cause instanceof Error ? cause.message : "Error al validar el cupón.");
    } finally {
      setCouponLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setError("Los correos electrónicos no coinciden. Verifícalos antes de continuar.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("course_uuid", course.course_uuid);
      formData.set("checkout_slug", checkoutSlug);
      formData.set("name", name.trim());
      formData.set("email", email.trim().toLowerCase());
      formData.set("phone", phone.trim());
      formData.set("payment_method", method);

      if (coupon) {
        formData.set("coupon_code", coupon.code);
      }
      if (selectedFile && method === "transfer" && hasProof === "yes") {
        formData.set("payment_proof", selectedFile);
      }

      const response = await fetch("/api/checkout/orders", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo registrar la solicitud.");
      }
      setReference(data.reference);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar la solicitud.");
    } finally {
      setSending(false);
    }
  }

  // PANTALLA DE CONFIRMACION / SOLICITUD ENVIADA (Apple Pro High-Ticket Certificate)
  if (reference) {
    const whatsappNotification = `Hola Equipo de Soporte, acabo de registrar mi pago para el curso "${course.name}".
Referencia: #${reference}
Alumno: ${name}
Correo: ${email}
${phone ? `Teléfono: ${phone}\n` : ""}${method === "transfer" ? (selectedFile && hasProof === "yes" ? "Adjunto mi comprobante de transferencia bancaria." : "Realicé la transferencia bancaria.") : "El pago fue coordinado previamente."}`;

    return (
      <main className="min-h-screen bg-[#050507] text-zinc-100 py-16 px-4 sm:px-6 flex flex-col items-center justify-center antialiased relative overflow-hidden">
        {/* Ambient Backlight */}
        <div 
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-emerald-500/10 via-emerald-500/0 to-transparent blur-3xl opacity-60" 
          aria-hidden="true" 
        />

        <div className="max-w-lg w-full apple-card-elevated rounded-3xl p-7 sm:p-10 space-y-7 relative z-10">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.25)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 inline-block mb-2">
                Registro Completado
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Solicitud de Matrícula Recibida
              </h1>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Tu acceso para <strong className="text-zinc-200 font-semibold">{course.name}</strong> está en proceso de verificación prioritaria.
              </p>
            </div>
          </div>

          {/* Código de Referencia — Recibo Oficial Titanium */}
          <div className="rounded-2xl bg-black/50 border border-white/[0.08] p-5 space-y-4 shadow-inner">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-medium text-[11px] uppercase tracking-wider">Código de Referencia</span>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(reference);
                  setCopiedRef(true);
                  setTimeout(() => setCopiedRef(false), 2000);
                }}
                aria-label="Copiar código de referencia de pago"
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 active:scale-95 font-semibold cursor-pointer px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
              >
                {copiedRef ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRef ? "¡Copiado!" : "Copiar"}</span>
              </button>
            </div>

            <div className="font-mono tabular-nums text-2xl font-bold text-white tracking-wider">
              #{reference}
            </div>

            <div className="pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Alumno</span>
                <span className="text-zinc-200 font-medium truncate block mt-0.5">{name}</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Estado</span>
                <span className="inline-flex items-center gap-1 text-amber-400 font-medium mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Verificación en curso
                </span>
              </div>
            </div>
          </div>

          {/* Próximos pasos */}
          <div className="space-y-2.5 text-xs text-zinc-300 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] leading-relaxed">
            <h3 className="font-semibold text-zinc-200 text-xs">Instrucciones de Activación:</h3>
            <p className="text-zinc-400 text-[11px]">
              1. El equipo de soporte coteja tu comprobante o transferencia bancaria en tiempo real.
            </p>
            <p className="text-zinc-400 text-[11px]">
              2. Tu cuenta quedará habilitada en <code className="text-sky-400 font-mono">campus.michaelsahlmann.com</code> y recibirás el enlace mágico directo a tu email (<span className="text-zinc-200 font-mono">{email}</span>) y WhatsApp.
            </p>
          </div>

          {/* Botones de acción Apple */}
          <div className="space-y-3 pt-1">
            <a
              href={`https://wa.me/595981000000?text=${encodeURIComponent(whatsappNotification)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(37,211,102,0.25)] hover:shadow-[0_0_35px_rgba(37,211,102,0.35)] transition-all cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>Notificar al Soporte por WhatsApp</span>
            </a>

            <a
              href="https://campus.michaelsahlmann.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-zinc-400 hover:text-white transition py-2 font-medium"
            >
              Ir al Campus Virtual &rarr;
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-zinc-100 antialiased selection:bg-sky-500/30 relative overflow-hidden">
      {/* Apple Pro Ambient Backlight */}
      <div 
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-b from-sky-500/[0.08] via-sky-500/0 to-transparent blur-3xl opacity-60" 
        aria-hidden="true" 
      />

      {/* BARRA SUPERIOR — Apple Glass Navbar */}
      <header className="border-b border-white/[0.07] bg-[#050507]/80 backdrop-blur-2xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center text-sky-400 shadow-[0_2px_10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]">
              <BrandLogo className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight block leading-tight">
                Campus Michael Sahlmann
              </span>
              <span className="text-[10px] text-zinc-400 font-medium tracking-wide flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                Inscripción Oficial · Alta Inmediata
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-400 font-medium">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Cifrado SSL 256-bit</span>
            </div>

            <a
              href="https://campus.michaelsahlmann.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-white transition font-medium"
            >
              campus.michaelsahlmann.com &rarr;
            </a>
          </div>
        </div>
      </header>

      {/* RESUMEN MOVIL COLAPSABLE */}
      <div className="lg:hidden border-b border-white/[0.07] bg-[#0c0d12]/90 backdrop-blur-xl px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
          aria-expanded={mobileSummaryOpen}
          aria-controls="mobile-summary-details"
          aria-label="Alternar desglose del curso"
          className="w-full flex items-center justify-between text-xs font-semibold text-zinc-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-lg p-1"
        >
          <span className="flex items-center gap-2 truncate pr-2">
            <span className="text-zinc-400">Curso:</span>
            <span className="text-white truncate font-medium">{course.name}</span>
            {mobileSummaryOpen ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          </span>
          <span className="text-sm font-bold text-emerald-400 font-mono tabular-nums shrink-0">
            {finalPrice.toLocaleString("es-PY")} PYG
          </span>
        </button>

        {mobileSummaryOpen ? (
          <div id="mobile-summary-details" className="mt-3 pt-3 border-t border-white/[0.06] text-xs space-y-2 animate-fade-in">
            {course.description ? <p className="text-zinc-400 text-xs leading-relaxed">{course.description}</p> : null}
            {coupon ? (
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>Cupón ({coupon.name}):</span>
                <span className="font-mono tabular-nums">-{coupon.discount.toLocaleString("es-PY")} PYG</span>
              </div>
            ) : null}
            <div className="flex justify-between text-white font-bold text-xs pt-2 border-t border-white/[0.06]">
              <span>Total a Pagar:</span>
              <span className="text-emerald-400 font-mono tabular-nums">{finalPrice.toLocaleString("es-PY")} PYG</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* CONTENIDO PRINCIPAL EN 2 COLUMNAS */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* COLUMNA IZQUIERDA: FORMULARIO DIRECTO (7 COLUMNAS) */}
          <div className="lg:col-span-7 space-y-7">
            <form onSubmit={submit} className="space-y-7">
              {/* PASO 1: DATOS DEL ALUMNO */}
              <section className="apple-card rounded-3xl p-6 sm:p-8 space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
                  <span className="w-7 h-7 rounded-xl bg-white/[0.06] text-white font-bold text-xs flex items-center justify-center border border-white/[0.12] shadow-sm">
                    1
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Datos del Alumno
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Datos oficiales para habilitación de cuenta y matrícula
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Nombre y Apellido */}
                  <div>
                    <label htmlFor="student-name-input" className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                      Nombre y Apellido <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        id="student-name-input"
                        type="text"
                        required
                        placeholder="Ej. Carlos Benítez"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full apple-input rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 text-sm"
                      />
                    </div>
                  </div>

                  {/* Correo Electrónico */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="student-email-input" className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                        Correo Electrónico <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-zinc-500 font-medium">Login del Campus</span>
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        id="student-email-input"
                        type="email"
                        required
                        placeholder="tu-correo@ejemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full apple-input rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 text-sm"
                      />
                    </div>
                  </div>

                  {/* Confirmar Correo */}
                  <div>
                    <label htmlFor="student-confirm-email-input" className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                      Confirmar Correo Electrónico <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <CheckCircle2
                        className={`w-4 h-4 absolute left-3.5 top-3.5 pointer-events-none transition-colors ${
                          confirmEmail && confirmEmail.toLowerCase() === email.toLowerCase()
                            ? "text-emerald-400"
                            : "text-zinc-500"
                        }`}
                      />
                      <input
                        id="student-confirm-email-input"
                        type="email"
                        required
                        placeholder="Repite tu correo para verificar"
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        aria-invalid={Boolean(confirmEmail && confirmEmail.toLowerCase() !== email.toLowerCase())}
                        className={`w-full rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 text-sm transition apple-input ${
                          confirmEmail && confirmEmail.toLowerCase() !== email.toLowerCase()
                            ? "!border-rose-500/80 focus:!ring-rose-500/20"
                            : ""
                        }`}
                      />
                    </div>
                    {confirmEmail && confirmEmail.toLowerCase() !== email.toLowerCase() ? (
                      <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1 font-medium" role="alert">
                        <AlertCircle className="w-3.5 h-3.5" /> Los correos no coinciden.
                      </p>
                    ) : null}
                  </div>

                  {/* Teléfono / WhatsApp */}
                  <div>
                    <label htmlFor="student-phone-input" className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                      Número de WhatsApp / Teléfono <span className="text-zinc-500 font-normal">(opcional)</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center gap-1 text-xs text-zinc-400 pointer-events-none">
                        <span>🇵🇾</span>
                        <span className="font-mono">+595</span>
                      </div>
                      <input
                        id="student-phone-input"
                        type="tel"
                        placeholder="981 123 456"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full apple-input rounded-xl pl-20 pr-4 py-3 text-white placeholder-zinc-600 text-sm"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1.5 block font-medium">
                      Para enviarte el enlace directo y asistencia del equipo de soporte.
                    </span>
                  </div>
                </div>
              </section>

              {/* PASO 2: FORMA DE PAGO */}
              <section className="apple-card rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
                  <span className="w-7 h-7 rounded-xl bg-white/[0.06] text-white font-bold text-xs flex items-center justify-center border border-white/[0.12] shadow-sm">
                    2
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Forma de Pago
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Selecciona cómo realizaste o realizarás el abono
                    </p>
                  </div>
                </div>

                {/* SELECTOR DE 2 OPCIONES REALES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Opción 1: Transferencia bancaria */}
                  <button
                    type="button"
                    onClick={() => {
                      setMethod("transfer");
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                      method === "transfer"
                        ? "bg-white/[0.05] border-sky-400/80 shadow-[0_0_20px_rgba(56,189,248,0.12)] ring-1 ring-sky-400/30"
                        : "bg-white/[0.02] border-white/[0.08] hover:border-white/[0.16]"
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${method === "transfer" ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "bg-white/[0.04] text-zinc-400"}`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-white block">Transferencia bancaria</span>
                      <span className="text-[11px] text-zinc-400 block mt-0.5 font-medium">
                        SIPAP y comprobante
                      </span>
                    </div>
                  </button>

                  {/* Opción 2: Ya pagué (Coordinado) */}
                  <button
                    type="button"
                    onClick={() => {
                      setMethod("cash");
                      setSelectedFile(null);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                      method === "cash"
                        ? "bg-white/[0.05] border-sky-400/80 shadow-[0_0_20px_rgba(56,189,248,0.12)] ring-1 ring-sky-400/30"
                        : "bg-white/[0.02] border-white/[0.08] hover:border-white/[0.16]"
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${method === "cash" ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "bg-white/[0.04] text-zinc-400"}`}>
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-white">Ya pagué</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-white/[0.08] text-zinc-300 px-1.5 py-0.5 rounded">
                          Coordinado
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 block mt-0.5 font-medium">
                        Efectivo o previo
                      </span>
                    </div>
                  </button>
                </div>

                {/* SI SELECCIONA TRANSFERENCIA BANCARIA */}
                {method === "transfer" ? (
                  <div className="space-y-5 pt-1 animate-fade-in">
                    {/* VIP Banking Card Slip */}
                    <div className="apple-card-elevated rounded-2xl overflow-hidden border border-white/[0.12] shadow-2xl">
                      {/* Top Slip Header */}
                      <div className="px-4 py-3 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-sky-400" />
                          <span>Coordenadas Oficiales (SIPAP)</span>
                        </span>
                        <span className="text-xs font-mono tabular-nums font-bold text-white">
                          Total: {finalPrice.toLocaleString("es-PY")} PYG
                        </span>
                      </div>

                      {/* 1. Fila de Alias de transferencia Destacada */}
                      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-500/15 via-emerald-500/8 to-transparent border-b border-emerald-500/20 flex items-center justify-between gap-3">
                        <div className="min-w-0 pr-1">
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                            1. Alias de transferencia (SIPAP directo)
                          </span>
                          <span className="font-mono text-base sm:text-lg text-emerald-300 font-extrabold tracking-wide break-all block mt-0.5">
                            {bankSettings.alias}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bankSettings.alias, "alias")}
                          aria-label="Copiar alias de transferencia bancaria"
                          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 active:scale-95 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 cursor-pointer shrink-0 transition-all shadow-sm"
                          title="Copiar Alias"
                        >
                          {copiedBankField === "alias" ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedBankField === "alias" ? "¡Copiado!" : "Copiar"}</span>
                        </button>
                      </div>

                      {/* Filas Secundarias */}
                      <div className="divide-y divide-white/[0.05] text-xs">
                        {/* 2. Titular */}
                        <div className="p-3 px-4 flex items-center justify-between gap-3">
                          <div className="min-w-0 pr-1">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Titular de la cuenta</span>
                            <span className="font-semibold text-zinc-200 truncate block mt-0.5">
                              {bankSettings.titular}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(bankSettings.titular, "titular")}
                            aria-label="Copiar titular de la cuenta"
                            className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white active:scale-95 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition cursor-pointer shrink-0"
                            title="Copiar Titular"
                          >
                            {copiedBankField === "titular" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedBankField === "titular" ? "¡Copiado!" : "Copiar"}</span>
                          </button>
                        </div>

                        {/* 3. Banco */}
                        <div className="p-3 px-4 flex items-center justify-between gap-3">
                          <div className="min-w-0 pr-1">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Entidad Bancaria</span>
                            <span className="font-semibold text-zinc-200 truncate block mt-0.5">
                              {bankSettings.banco}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(bankSettings.banco, "banco")}
                            aria-label="Copiar entidad bancaria"
                            className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white active:scale-95 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition cursor-pointer shrink-0"
                            title="Copiar Banco"
                          >
                            {copiedBankField === "banco" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedBankField === "banco" ? "¡Copiado!" : "Copiar"}</span>
                          </button>
                        </div>

                        {/* 4. N° de Cuenta */}
                        <div className="p-3 px-4 flex items-center justify-between gap-3">
                          <div className="min-w-0 pr-1">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">N° de Cuenta</span>
                            <span className="font-mono tabular-nums font-bold text-white text-sm block mt-0.5">
                              {bankSettings.cuenta}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(bankSettings.cuenta, "cuenta")}
                            aria-label="Copiar número de cuenta bancaria"
                            className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white active:scale-95 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition cursor-pointer shrink-0"
                            title="Copiar N° de Cuenta"
                          >
                            {copiedBankField === "cuenta" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedBankField === "cuenta" ? "¡Copiado!" : "Copiar"}</span>
                          </button>
                        </div>

                        {/* 5. Cédula de Identidad / RUC */}
                        <div className="p-3 px-4 flex items-center justify-between gap-3">
                          <div className="min-w-0 pr-1">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Cédula de Identidad / RUC</span>
                            <span className="font-mono tabular-nums font-bold text-white text-sm block mt-0.5">
                              {bankSettings.ci_ruc}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(bankSettings.ci_ruc, "ci_ruc")}
                            aria-label="Copiar cédula de identidad o RUC"
                            className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white active:scale-95 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition cursor-pointer shrink-0"
                            title="Copiar CI / RUC"
                          >
                            {copiedBankField === "ci_ruc" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedBankField === "ci_ruc" ? "¡Copiado!" : "Copiar"}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* PREGUNTA: ¿Tenés comprobante de pago? */}
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-200">
                          ¿Tenés comprobante de pago?
                        </label>
                        <div className="inline-flex rounded-xl bg-black/40 p-1 border border-white/[0.08]">
                          <button
                            type="button"
                            onClick={() => setHasProof("yes")}
                            className={`px-3.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95 ${
                              hasProof === "yes"
                                ? "bg-white text-zinc-950 shadow-sm"
                                : "text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setHasProof("no");
                              setSelectedFile(null);
                            }}
                            className={`px-3.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95 ${
                              hasProof === "no"
                                ? "bg-white/[0.12] text-white shadow-sm"
                                : "text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            No tengo ahora
                          </button>
                        </div>
                      </div>

                      {/* Dropzone solo si eligió "Sí" */}
                      {hasProof === "yes" ? (
                        <div className="space-y-2 pt-1 animate-fade-in">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                            id="proof-upload"
                          />

                          {!selectedFile ? (
                            <label
                              htmlFor="proof-upload"
                              className="border-2 border-dashed border-white/[0.14] hover:border-sky-400/60 bg-white/[0.01] hover:bg-sky-500/[0.03] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center"
                            >
                              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400">
                                <UploadCloud className="w-5 h-5 text-sky-400" />
                              </div>
                              <span className="text-xs font-semibold text-white">
                                Arrastra tu comprobante o haz clic para subir
                              </span>
                              <span className="text-[10px] text-zinc-500 font-medium">
                                Formatos admitidos: JPG, PNG o PDF (máximo 5 MB)
                              </span>
                            </label>
                          ) : (
                            <div className="bg-white/[0.03] rounded-2xl border border-emerald-500/30 p-3.5 flex items-center justify-between">
                              <div className="flex items-center gap-3 truncate pr-2">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-medium text-white truncate">
                                    {selectedFile.name}
                                  </p>
                                  <p className="text-[10px] text-zinc-400 font-mono tabular-nums">
                                    {(selectedFile.size / 1024).toFixed(0)} KB · Listo para enviar
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={removeFile}
                                aria-label="Eliminar comprobante adjunto"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition cursor-pointer"
                                title="Eliminar archivo"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {fileError ? (
                            <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium" role="alert">
                              <AlertCircle className="w-3.5 h-3.5" /> {fileError}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.06] text-[11px] text-zinc-400 leading-relaxed animate-fade-in font-medium">
                          No te preocupes. Al confirmar la solicitud, el equipo de soporte cotejará tu transferencia en el extracto bancario con tus datos.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* SI SELECCIONA YA PAGUE */
                  <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-5 space-y-2 animate-fade-in text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <p className="font-bold text-white">
                        Pago coordinado previamente
                      </p>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-[11px] font-medium">
                      Al enviar esta solicitud, tu matrícula quedará registrada en el sistema de gestión. El equipo de soporte validará la recepción para emitir tu enlace de acceso sin demora.
                    </p>
                  </div>
                )}
              </section>

              {/* CUPON DE DESCUENTO */}
              <section className="apple-card rounded-3xl p-5 sm:p-6 space-y-3.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="coupon-code-field" className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Código Promocional / Cupón</span>
                  </label>
                  {coupon ? (
                    <span className="text-[11px] font-mono tabular-nums font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      -{coupon.discount.toLocaleString("es-PY")} PYG
                    </span>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <input
                    id="coupon-code-field"
                    type="text"
                    placeholder="Ej. BECA50"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="min-w-0 flex-1 apple-input rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 text-xs font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => void applyCoupon()}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2.5 bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition cursor-pointer border border-white/[0.08]"
                  >
                    {couponLoading ? "..." : "Aplicar"}
                  </button>
                </div>

                {coupon ? (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Cupón aplicado: {coupon.name} (-<span className="font-mono tabular-nums">{coupon.discount.toLocaleString("es-PY")}</span> PYG)
                  </p>
                ) : null}

                {couponError ? (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1.5 font-medium" role="alert">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {couponError}
                  </p>
                ) : null}
              </section>

              {/* ERRORES GENERALES */}
              {error ? (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3" role="alert">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              ) : null}

              {/* BOTON DE ENVIO PRIMARIO — Apple Pro High Ticket CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-4 px-6 rounded-2xl bg-sky-500 hover:bg-sky-400 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-base tracking-tight shadow-[0_0_30px_rgba(56,189,248,0.25)] hover:shadow-[0_0_40px_rgba(56,189,248,0.4)] transition-all flex items-center justify-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  {sending ? (
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Procesando solicitud...</span>
                    </div>
                  ) : (
                    <>
                      <span>Confirmar y Liberar Matrícula</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-zinc-500 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verificación directa y emisión de Magic Link sin contraseña</span>
                </div>
              </div>
            </form>
          </div>

          {/* COLUMNA DERECHA: RESUMEN DEL CURSO (5 COLUMNAS) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
            <div className="apple-card rounded-3xl p-6 sm:p-7 space-y-6">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  Programa Oficial
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-white mt-3 leading-snug tracking-tight">
                  {course.name}
                </h1>
                {course.description ? (
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    {course.description}
                  </p>
                ) : null}
              </div>

              {/* BENEFICIOS HIGH-TICKET */}
              <div className="space-y-2.5 pt-2 border-t border-white/[0.06] text-xs">
                <div className="flex items-center gap-2.5 text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Acceso oficial al Campus Virtual</span>
                </div>
                <div className="flex items-center gap-2.5 text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Materiales y actualizaciones continuas</span>
                </div>
                <div className="flex items-center gap-2.5 text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Verificación y soporte humano directo</span>
                </div>
              </div>

              {/* DESGLOSE DE PRECIOS */}
              <div className="pt-4 border-t border-white/[0.06] space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Precio del programa:</span>
                  <span className="font-mono tabular-nums text-white font-medium">{course.price_pyg.toLocaleString("es-PY")} PYG</span>
                </div>

                {coupon ? (
                  <div className="flex justify-between items-center text-emerald-400 font-medium">
                    <span>Descuento ({coupon.name}):</span>
                    <span className="font-mono tabular-nums">-{coupon.discount.toLocaleString("es-PY")} PYG</span>
                  </div>
                ) : null}

                <div className="pt-3 border-t border-white/[0.08] flex justify-between items-baseline">
                  <span className="font-semibold text-zinc-300">Total Oficial:</span>
                  <span className="text-2xl sm:text-3xl font-mono tabular-nums font-black text-white tracking-tight">
                    {finalPrice.toLocaleString("es-PY")} <span className="text-xs font-semibold text-zinc-400 uppercase font-sans">PYG</span>
                  </span>
                </div>
              </div>

              {/* ASISTENCIA DIRECTA WHATSAPP */}
              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-zinc-500 text-[11px] font-medium">¿Dudas con tu pago?</span>
                <a
                  href={`https://wa.me/595981000000?text=${encodeURIComponent(
                    `Hola Equipo de Soporte, tengo una consulta sobre el curso "${course.name}".`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Soporte por WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
