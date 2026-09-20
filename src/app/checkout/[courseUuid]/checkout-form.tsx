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
  GraduationCap,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Course = {
  name: string;
  course_uuid: string;
  description: string | null;
  price_pyg: number;
};

export default function CheckoutForm({
  course,
  checkoutSlug,
}: {
  course: Course;
  checkoutSlug: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"transfer" | "cash">("transfer");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [noProofDeclared, setNoProofDeclared] = useState(false);
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
    setNoProofDeclared(false);
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
      if (selectedFile && method === "transfer") {
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

  // PANTALLA DE CONFIRMACION / SOLICITUD ENVIADA
  if (reference) {
    const whatsappNotification = `Hola Michael, acabo de registrar mi pago para el curso "${course.name}".
Referencia: #${reference}
Alumno: ${name}
Correo: ${email}
${method === "transfer" ? (selectedFile ? "Adjunto mi comprobante de transferencia." : "Realicé la transferencia.") : "El pago fue realizado en efectivo / coordinado previamente."}`;

    return (
      <main className="min-h-screen bg-[#0B0F17] text-slate-100 py-12 px-4 sm:px-6 flex flex-col items-center justify-center">
        <div className="max-w-lg w-full bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Solicitud de Matrícula Registrada
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Tu solicitud para <strong className="text-slate-200">{course.name}</strong> ha sido enviada al administrador.
            </p>
          </div>

          {/* Código de Referencia */}
          <div className="bg-[#0B0F17] rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Código de Referencia:</span>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(reference);
                  setCopiedRef(true);
                  setTimeout(() => setCopiedRef(false), 2000);
                }}
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
              >
                {copiedRef ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedRef ? "Copiado" : "Copiar"}
              </button>
            </div>
            <div className="font-mono text-base sm:text-lg font-bold text-white tracking-wider">
              #{reference}
            </div>
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Alumno:</span>
                <span className="text-slate-300 font-medium truncate block">{name}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px]">Estado:</span>
                <span className="text-amber-400 font-medium">Pendiente de liberación</span>
              </div>
            </div>
          </div>

          {/* Cómo se activa */}
          <div className="space-y-2 text-xs text-slate-300 bg-[#0B0F17]/50 p-4 rounded-xl border border-slate-800/60">
            <h3 className="font-semibold text-slate-200">Próximos pasos:</h3>
            <p>
              1. Michael revisará tu solicitud en el panel de control.
            </p>
            <p>
              2. Al confirmarla, se creará tu usuario en <code className="text-sky-400">campus.michaelsahlmann.com</code> y recibirás el enlace de acceso directo a tu correo (<span className="text-slate-200 font-mono">{email}</span>) y WhatsApp.
            </p>
          </div>

          {/* Botón de aviso por WhatsApp */}
          <div className="pt-2 space-y-2.5">
            <a
              href={`https://wa.me/595981000000?text=${encodeURIComponent(whatsappNotification)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              Avisar a Michael por WhatsApp
            </a>

            <a
              href="https://campus.michaelsahlmann.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-slate-400 hover:text-slate-200 transition py-1"
            >
              Ir al Campus Virtual &rarr;
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-white">
      {/* BARRA SUPERIOR SOBRIA */}
      <header className="border-b border-slate-800/80 bg-[#111827]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-sm text-white tracking-tight block leading-tight">
                Campus Michael Sahlmann
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                Registro de Matrícula
              </span>
            </div>
          </div>

          <a
            href="https://campus.michaelsahlmann.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
          >
            campus.michaelsahlmann.com
          </a>
        </div>
      </header>

      {/* RESUMEN MOVIL COLAPSABLE */}
      <div className="lg:hidden border-b border-slate-800 bg-[#111827] px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-200 cursor-pointer"
        >
          <span className="flex items-center gap-2 truncate pr-2">
            <span className="text-slate-400">Curso:</span>
            <span className="text-white truncate font-medium">{course.name}</span>
            {mobileSummaryOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          </span>
          <span className="text-sm font-bold text-emerald-400 font-mono shrink-0">
            {finalPrice.toLocaleString("es-PY")} PYG
          </span>
        </button>

        {mobileSummaryOpen && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-2 animate-fade-in">
            {course.description && <p className="text-slate-400 text-xs">{course.description}</p>}
            {coupon && (
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>Cupón ({coupon.name}):</span>
                <span>-{coupon.discount.toLocaleString("es-PY")} PYG</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold text-xs pt-1 border-t border-slate-800/60">
              <span>Total a Pagar:</span>
              <span className="text-emerald-400">{finalPrice.toLocaleString("es-PY")} PYG</span>
            </div>
          </div>
        )}
      </div>

      {/* CONTENIDO PRINCIPAL EN 2 COLUMNAS */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA IZQUIERDA: FORMULARIO DIRECTO (7 COLUMNAS) */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={submit} className="space-y-6">
              {/* PASO 1: DATOS DEL ALUMNO */}
              <section className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/20">
                    1
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white">
                      Datos del Alumno
                    </h2>
                    <p className="text-xs text-slate-400">
                      Datos de la persona que cursará el programa
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* Nombre y Apellido */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nombre y Apellido <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Carlos Benítez"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm transition"
                      />
                    </div>
                  </div>

                  {/* Correo Electrónico */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Correo Electrónico <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">Login para el Campus</span>
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="tu-correo@ejemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm transition"
                      />
                    </div>
                  </div>

                  {/* Confirmar Correo */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirmar Correo Electrónico <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <CheckCircle2
                        className={`w-4 h-4 absolute left-3 top-3 ${
                          confirmEmail && confirmEmail.toLowerCase() === email.toLowerCase()
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }`}
                      />
                      <input
                        type="email"
                        required
                        placeholder="Repite tu correo para verificar"
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        className={`w-full bg-[#0B0F17] border rounded-xl pl-9 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none text-xs sm:text-sm transition ${
                          confirmEmail && confirmEmail.toLowerCase() !== email.toLowerCase()
                            ? "border-rose-500/80 focus:border-rose-500"
                            : "border-slate-700/80 focus:border-emerald-500"
                        }`}
                      />
                    </div>
                    {confirmEmail && confirmEmail.toLowerCase() !== email.toLowerCase() && (
                      <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Los correos no coinciden.
                      </p>
                    )}
                  </div>

                  {/* Teléfono / WhatsApp */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Número de WhatsApp / Teléfono <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 flex items-center gap-1 text-xs text-slate-400 pointer-events-none">
                        <span>🇵🇾</span>
                        <span className="font-mono">+595</span>
                      </div>
                      <input
                        type="tel"
                        placeholder="981 123 456"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-xl pl-20 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm transition"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Para enviarte el enlace de acceso directo por WhatsApp.
                    </span>
                  </div>
                </div>
              </section>

              {/* PASO 2: FORMA DE PAGO REAL */}
              <section className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/20">
                    2
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white">
                      Forma de Pago
                    </h2>
                    <p className="text-xs text-slate-400">
                      Selecciona cómo realizaste o realizarás el pago
                    </p>
                  </div>
                </div>

                {/* SELECTOR DE 2 OPCIONES REALES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opción 1: Transferencia Bancaria */}
                  <button
                    type="button"
                    onClick={() => {
                      setMethod("transfer");
                    }}
                    className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                      method === "transfer"
                        ? "bg-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/30"
                        : "bg-[#0B0F17] border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className={`p-2 rounded-lg mt-0.5 ${method === "transfer" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs sm:text-sm text-white">Transferencia SIPAP</span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Transferir y/o subir comprobante
                      </span>
                    </div>
                  </button>

                  {/* Opción 2: Ya pagué (Efectivo presencial o coordinado) */}
                  <button
                    type="button"
                    onClick={() => {
                      setMethod("cash");
                      setSelectedFile(null);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                      method === "cash"
                        ? "bg-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/30"
                        : "bg-[#0B0F17] border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className={`p-2 rounded-lg mt-0.5 ${method === "cash" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs sm:text-sm text-white">Ya pagué</span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Efectivo presencial o coordinado
                      </span>
                    </div>
                  </button>
                </div>

                {/* SI SELECCIONA TRANSFERENCIA BANCARIA */}
                {method === "transfer" && (
                  <div className="space-y-4 pt-1 animate-fade-in">
                    {/* Tarjeta de Datos Bancarios de Michael */}
                    <div className="bg-[#0B0F17] rounded-xl border border-slate-800 p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          Datos para Transferir (SIPAP)
                        </span>
                        <span className="text-xs font-mono font-bold text-white">
                          {finalPrice.toLocaleString("es-PY")} PYG
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-[#111827] p-2.5 rounded-lg border border-slate-800/60">
                          <span className="text-[10px] text-slate-500 block">Banco:</span>
                          <span className="font-semibold text-slate-200">Banco Itaú / SIPAP</span>
                        </div>

                        <div className="bg-[#111827] p-2.5 rounded-lg border border-slate-800/60">
                          <span className="text-[10px] text-slate-500 block">Titular:</span>
                          <span className="font-semibold text-slate-200">Michael Sahlmann</span>
                        </div>

                        {/* N° de Cuenta con Copiado */}
                        <div className="bg-[#111827] p-2.5 rounded-lg border border-slate-800/60 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-500 block">N° de Cuenta (Caja de Ahorro):</span>
                            <span className="font-mono font-bold text-white">720000000</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard("720000000", "acc")}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                            title="Copiar N° de cuenta"
                          >
                            {copiedBankField === "acc" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* CI / RUC con Copiado */}
                        <div className="bg-[#111827] p-2.5 rounded-lg border border-slate-800/60 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-500 block">CI / RUC:</span>
                            <span className="font-mono font-bold text-white">4567890-1</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard("4567890-1", "ruc")}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                            title="Copiar RUC"
                          >
                            {copiedBankField === "ruc" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Alias SIPAP */}
                      <div className="bg-[#111827] p-2.5 rounded-lg border border-slate-800/60 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Alias SIPAP / Email de Transferencia:</span>
                          <span className="font-mono text-emerald-400 font-semibold">pagos@michaelsahlmann.com</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard("pagos@michaelsahlmann.com", "alias")}
                          className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-500/10 cursor-pointer"
                        >
                          {copiedBankField === "alias" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedBankField === "alias" ? "Copiado" : "Copiar"}
                        </button>
                      </div>
                    </div>

                    {/* Subida de Comprobante o Declarar Pago */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300">
                          Comprobante de Transferencia
                        </label>
                        <span className="text-[10px] text-slate-400">JPG, PNG o PDF</span>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        id="proof-upload"
                      />

                      {!selectedFile ? (
                        <div className="space-y-2">
                          <label
                            htmlFor="proof-upload"
                            className="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 bg-[#0B0F17] rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-center"
                          >
                            <UploadCloud className="w-5 h-5 text-slate-400" />
                            <span className="text-xs font-medium text-slate-200">
                              Adjuntar foto o PDF del comprobante
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Haz clic para seleccionar el archivo
                            </span>
                          </label>

                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="checkbox"
                              id="no-proof"
                              checked={noProofDeclared}
                              onChange={(e) => setNoProofDeclared(e.target.checked)}
                              className="rounded bg-[#0B0F17] border-slate-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <label htmlFor="no-proof" className="text-xs text-slate-400 cursor-pointer select-none">
                              Ya realicé la transferencia pero no tengo el comprobante ahora
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#0B0F17] rounded-xl border border-emerald-500/30 p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 truncate pr-2">
                            <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-medium text-white truncate">
                                {selectedFile.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {(selectedFile.size / 1024).toFixed(0)} KB · Adjuntado
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={removeFile}
                            className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
                            title="Eliminar archivo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {fileError && (
                        <p className="text-[11px] text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {fileError}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* SI SELECCIONA YA PAGUE (EFECTIVO PRESENCIAL) */}
                {method === "cash" && (
                  <div className="bg-[#0B0F17] rounded-xl border border-slate-800 p-4 space-y-2 animate-fade-in text-xs text-slate-300">
                    <p className="font-medium text-white">
                      Pago presencial o previamente acordado
                    </p>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      Al enviar esta solicitud, tu registro quedará marcado como <strong className="text-slate-200">declaró pago en efectivo</strong>. Michael confirmará el cobro directamente en su panel administrativo para habilitar tu acceso al curso.
                    </p>
                  </div>
                )}
              </section>

              {/* CUPON DE DESCUENTO (OPCIONAL) */}
              <section className="bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Cupón de descuento
                  </label>
                  {coupon && (
                    <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      -{coupon.discount.toLocaleString("es-PY")} PYG
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Código de cupón (opcional)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="min-w-0 flex-1 bg-[#0B0F17] border border-slate-700/80 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => void applyCoupon()}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium rounded-lg text-xs transition cursor-pointer"
                  >
                    {couponLoading ? "..." : "Aplicar"}
                  </button>
                </div>

                {coupon && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Cupón aplicado: {coupon.name} (-{coupon.discount.toLocaleString("es-PY")} PYG)
                  </p>
                )}

                {couponError && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {couponError}
                  </p>
                )}
              </section>

              {/* ERRORES GENERALES */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* BOTON DE ENVIO */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                >
                  {sending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Registrando tu solicitud...</span>
                    </div>
                  ) : (
                    <>
                      <span>
                        {method === "cash" || noProofDeclared
                          ? "Registrar Pago y Solicitar Acceso"
                          : selectedFile
                          ? "Enviar Comprobante y Solicitar Acceso"
                          : "Enviar Solicitud de Matrícula"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  Al enviar, el administrador revisa tu solicitud y libera tu acceso directo al Campus.
                </p>
              </div>
            </form>
          </div>

          {/* COLUMNA DERECHA: RESUMEN REAL DEL CURSO (5 COLUMNAS) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Curso Seleccionado
                </span>
                <h1 className="text-base sm:text-lg font-bold text-white mt-2 leading-snug">
                  {course.name}
                </h1>
                {course.description && (
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {course.description}
                  </p>
                )}
              </div>

              {/* DESGLOSE REAL */}
              <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Precio del curso:</span>
                  <span className="font-mono text-white">{course.price_pyg.toLocaleString("es-PY")} PYG</span>
                </div>

                {coupon && (
                  <div className="flex justify-between items-center text-emerald-400 font-medium">
                    <span>Descuento ({coupon.name}):</span>
                    <span className="font-mono">-{coupon.discount.toLocaleString("es-PY")} PYG</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="font-semibold text-slate-200">Total a Pagar:</span>
                  <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">
                    {finalPrice.toLocaleString("es-PY")} PYG
                  </span>
                </div>
              </div>

              {/* EXPLICACION DEL PROCESO */}
              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <p className="font-semibold text-slate-300">¿Cómo funciona?</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Completas el formulario con tus datos.</li>
                  <li>Michael verifica el pago en su panel de administración.</li>
                  <li>Recibes tu enlace Magic Link para ingresar al Campus sin contraseña.</li>
                </ol>
              </div>

              {/* CONTACTO DE CONSULTAS */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">¿Tienes dudas?</span>
                <a
                  href={`https://wa.me/595981000000?text=${encodeURIComponent(
                    `Hola Michael, tengo una consulta sobre el curso "${course.name}".`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Phone className="w-3 h-3" />
                  Escribir a Michael
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
