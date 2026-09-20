"use client";

import React, { FormEvent, useState, useRef } from "react";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  Copy,
  Check,
  UploadCloud,
  FileText,
  Sparkles,
  Star,
  ArrowRight,
  CreditCard,
  Building2,
  Banknote,
  Phone,
  Mail,
  User,
  Award,
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
  const [method, setMethod] = useState<"transfer" | "card" | "cash">("transfer");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // Coupon state
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
  const regularPrice = Math.round(course.price_pyg * 1.35);
  const usdReference = Math.max(1, Math.round(finalPrice / 7500));

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
      setFileError("El formato debe ser JPG, PNG o PDF.");
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
        setCouponError(data.error || "Cupón inválido o expirado.");
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
      setError("Los correos electrónicos ingresados no coinciden. Por favor verifícalos.");
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
      formData.set("payment_method", method === "cash" ? "cash" : "transfer");
      if (coupon) {
        formData.set("coupon_code", coupon.code);
      }
      if (selectedFile) {
        formData.set("payment_proof", selectedFile);
      }

      const response = await fetch("/api/checkout/orders", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo registrar tu solicitud.");
      }
      setReference(data.reference);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar tu solicitud.");
    } finally {
      setSending(false);
    }
  }

  // PANTALLA DE AGRADECIMIENTO / CONFIRMACION (ESTILO HOTMART)
  if (reference) {
    const whatsappProofMessage = `¡Hola! Acabo de registrar mi inscripción al curso "${course.name}".
Mi código de referencia es: #${reference}
Titular: ${name}
Correo: ${email}
Adjunto mi comprobante para activar mi acceso al Campus.`;

    return (
      <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 flex flex-col items-center justify-center">
        <div className="max-w-xl w-full bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-fade-in">
          {/* Header de Éxito */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ¡Inscripción Registrada!
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Tu solicitud está en proceso
            </h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Hemos reservado tu lugar en <span className="text-white font-semibold">{course.name}</span>.
            </p>
          </div>

          {/* Tarjeta de Referencia */}
          <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Código de Referencia:</span>
              <span className="text-emerald-400 font-semibold">Guardar este código</span>
            </div>
            <div className="flex items-center justify-between bg-slate-900 px-4 py-3 rounded-xl border border-slate-800">
              <span className="font-mono text-lg font-bold text-white tracking-wider">
                #{reference}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(reference);
                  setCopiedRef(true);
                  setTimeout(() => setCopiedRef(false), 2000);
                }}
                className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-800/60 cursor-pointer"
              >
                {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedRef ? "Copiado" : "Copiar"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-slate-500 block">Alumno:</span>
                <span className="text-slate-200 font-medium truncate block">{name}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Total a Confirmar:</span>
                <span className="text-emerald-400 font-bold">{finalPrice.toLocaleString("es-PY")} PYG</span>
              </div>
            </div>
          </div>

          {/* Próximos Pasos (Inspirado en Hotmart) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              ¿Qué sucederá ahora?
            </h3>
            <ol className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-white block">Revisión del Pago</strong>
                  Verificamos tu transferencia y comprobante. Suele demorar solo unos minutos en horario hábil.
                </div>
              </li>
              <li className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-white block">Envío de tu Acceso Inmediato</strong>
                  Recibirás en <span className="text-sky-400 font-mono">{email}</span> tu Magic Link para ingresar al Campus Virtual sin contraseña.
                </div>
              </li>
              <li className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-white block">¡Empiezas a estudiar!</strong>
                  Acceso 100% vitalicio e ilimitado a todas las lecciones y recursos del programa.
                </div>
              </li>
            </ol>
          </div>

          {/* Botón de WhatsApp para acelerar activación */}
          <div className="pt-2 space-y-3">
            <a
              href={`https://wa.me/595981000000?text=${encodeURIComponent(whatsappProofMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              Acelerar Activación por WhatsApp &rarr;
            </a>

            <a
              href="https://campus.michaelsahlmann.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-slate-400 hover:text-slate-200 transition py-2"
            >
              Ir a la portada del Campus Virtual &rarr;
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white antialiased">
      {/* HEADER SUPERIOR DE SEGURIDAD (ESTILO HOTMART) */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                Campus Michael Sahlmann
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">
                Checkout Seguro Oficial
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="hidden sm:flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-[11px]">Ambiente Seguro</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px]">Cifrado SSL 256-bit</span>
            </div>
          </div>
        </div>
      </header>

      {/* BANNER DE GARANTIA Y ACCESO */}
      <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-950 border-b border-slate-800/60 py-2.5 px-4 text-center">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-6 text-xs text-slate-300 overflow-x-auto whitespace-nowrap py-0.5">
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
            <Award className="w-3.5 h-3.5" />
            Garantía Incondicional de Satisfacción
          </span>
          <span className="text-slate-600">·</span>
          <span className="inline-flex items-center gap-1.5 text-sky-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Acceso Inmediato al Campus Virtual
          </span>
          <span className="text-slate-600">·</span>
          <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Certificado Oficial Incluido
          </span>
        </div>
      </div>

      {/* MOBILE ORDER SUMMARY TOGGLE */}
      <div className="lg:hidden border-b border-slate-800 bg-slate-900/90 px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-200 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>Ver resumen de compra ({course.name.slice(0, 24)}...)</span>
            {mobileSummaryOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </span>
          <span className="text-sm font-bold text-emerald-400">
            {finalPrice.toLocaleString("es-PY")} PYG
          </span>
        </button>

        {mobileSummaryOpen && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-2 animate-fade-in">
            <p className="text-white font-bold">{course.name}</p>
            {course.description && <p className="text-slate-400 text-[11px]">{course.description}</p>}
            <div className="flex justify-between text-slate-400 pt-1">
              <span>Precio normal:</span>
              <span className="line-through">{regularPrice.toLocaleString("es-PY")} PYG</span>
            </div>
            {coupon && (
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>Cupón ({coupon.name}):</span>
                <span>-{coupon.discount.toLocaleString("es-PY")} PYG</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-800">
              <span>Total:</span>
              <span className="text-emerald-400">{finalPrice.toLocaleString("es-PY")} PYG</span>
            </div>
          </div>
        )}
      </div>

      {/* CUERPO PRINCIPAL DEL CHECKOUT: 2 COLUMNAS RESPONSIVAS */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* COLUMNA IZQUIERDA: FORMULARIO Y PASOS (7 COLUMNAS) */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={submit} className="space-y-6">
              {/* PASO 1: DATOS PERSONALES */}
              <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                  <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center border border-emerald-500/30">
                    1
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      Tus Datos Personales
                    </h2>
                    <p className="text-xs text-slate-400">
                      Ingresa los datos del alumno que cursará el programa
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Nombre Completo */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Nombre y Apellido Completo <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Carlos Benítez"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm transition"
                      />
                    </div>
                  </div>

                  {/* Correo Electrónico Principal */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Correo Electrónico <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">Donde recibirás el acceso</span>
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        placeholder="tu-correo@ejemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm font-medium transition"
                      />
                    </div>
                  </div>

                  {/* Confirmar Correo Electrónico (Clásico de Hotmart para evitar errores) */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Confirmar Correo Electrónico <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <CheckCircle2
                        className={`w-4 h-4 absolute left-3.5 top-3.5 ${
                          confirmEmail && confirmEmail.toLowerCase() === email.toLowerCase()
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }`}
                      />
                      <input
                        type="email"
                        required
                        placeholder="Repite tu correo electrónico"
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm font-medium transition ${
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

                  {/* WhatsApp */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Número de Teléfono / WhatsApp
                      </label>
                      <span className="text-[10px] text-slate-400">Recomendado para soporte</span>
                    </div>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400 pointer-events-none">
                        <span>🇵🇾</span>
                        <span>+595</span>
                      </div>
                      <input
                        type="tel"
                        placeholder="981 123 456"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-20 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm transition"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Te enviaremos también por WhatsApp tu enlace de ingreso directo sin contraseña.
                    </p>
                  </div>
                </div>
              </section>

              {/* PASO 2: FORMA DE PAGO */}
              <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                  <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center border border-emerald-500/30">
                    2
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      Forma de Pago
                    </h2>
                    <p className="text-xs text-slate-400">
                      Selecciona la opción más conveniente para ti
                    </p>
                  </div>
                </div>

                {/* SELECTOR DE METODOS (TABS MODERNOS) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Opción 1: Transferencia SIPAP */}
                  <button
                    type="button"
                    onClick={() => setMethod("transfer")}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      method === "transfer"
                        ? "bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-500/10"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Building2
                        className={`w-5 h-5 ${
                          method === "transfer" ? "text-emerald-400" : "text-slate-400"
                        }`}
                      />
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        Recomendado
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">Transferencia SIPAP</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Bancos de Paraguay / QR</p>
                    </div>
                  </button>

                  {/* Opción 2: Tarjeta */}
                  <button
                    type="button"
                    onClick={() => setMethod("card")}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      method === "card"
                        ? "bg-sky-950/40 border-sky-500/80 shadow-lg shadow-sky-500/10"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <CreditCard
                        className={`w-5 h-5 ${
                          method === "card" ? "text-sky-400" : "text-slate-400"
                        }`}
                      />
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400">
                        Online
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">Tarjeta de Débito/Crédito</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Visa / Mastercard / Stripe</p>
                    </div>
                  </button>

                  {/* Opción 3: Efectivo */}
                  <button
                    type="button"
                    onClick={() => setMethod("cash")}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      method === "cash"
                        ? "bg-amber-950/40 border-amber-500/80 shadow-lg shadow-amber-500/10"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Banknote
                        className={`w-5 h-5 ${
                          method === "cash" ? "text-amber-400" : "text-slate-400"
                        }`}
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">Efectivo / Cobranzas</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Pago Express / Giros</p>
                    </div>
                  </button>
                </div>

                {/* DETALLE SEGUN METODO SELECCIONADO */}
                {method === "transfer" && (
                  <div className="space-y-4 pt-2">
                    {/* Tarjeta VIP de Datos Bancarios con Copiado en 1 clic */}
                    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-emerald-500/30 p-5 shadow-inner space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-xs uppercase tracking-wider text-emerald-400">
                            Datos para Transferencia Bancaria (SIPAP)
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Monto: <strong className="text-white">{finalPrice.toLocaleString("es-PY")} PYG</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Banco */}
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-400 text-[11px] block">Banco:</span>
                          <span className="font-bold text-white">Banco Itaú / SIPAP</span>
                        </div>

                        {/* Titular */}
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-400 text-[11px] block">Titular:</span>
                          <span className="font-bold text-white">Michael Sahlmann</span>
                        </div>

                        {/* N° de Cuenta con Copiado */}
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-slate-400 text-[11px] block">N° de Cuenta (Caja de Ahorro):</span>
                            <span className="font-mono font-bold text-white">720000000</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard("720000000", "acc")}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Copiar N° de Cuenta"
                          >
                            {copiedBankField === "acc" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* CI / RUC con Copiado */}
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-slate-400 text-[11px] block">CI / RUC:</span>
                            <span className="font-mono font-bold text-white">4567890-1</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard("4567890-1", "ruc")}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Copiar RUC"
                          >
                            {copiedBankField === "ruc" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Alias SIPAP */}
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-emerald-500/20 flex items-center justify-between">
                        <div className="text-xs">
                          <span className="text-slate-400 text-[11px] block">Alias SIPAP / Email de Transferencia:</span>
                          <span className="font-mono font-bold text-emerald-400">pagos@michaelsahlmann.com</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard("pagos@michaelsahlmann.com", "alias")}
                          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 cursor-pointer"
                        >
                          {copiedBankField === "alias" ? (
                            <>
                              <Check className="w-3 h-3" /> Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copiar Alias
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* DROPZONE DE COMPROBANTE DE PAGO */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Comprobante de Pago
                        </label>
                        <span className="text-[10px] text-slate-400">Opcional pero acelera tu alta</span>
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
                        <label
                          htmlFor="proof-upload"
                          className="border-2 border-dashed border-slate-700 hover:border-emerald-500/80 bg-slate-950/60 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition group text-center"
                        >
                          <div className="w-10 h-10 rounded-full bg-slate-900 group-hover:bg-emerald-500/10 text-slate-400 group-hover:text-emerald-400 flex items-center justify-center transition">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition block">
                              Haz clic aquí para adjuntar tu comprobante de pago
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              Formatos aceptados: JPG, PNG o PDF (hasta 5 MB)
                            </span>
                          </div>
                        </label>
                      ) : (
                        <div className="bg-slate-950 rounded-2xl border border-emerald-500/40 p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white truncate max-w-[220px] sm:max-w-xs">
                                {selectedFile.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {(selectedFile.size / 1024).toFixed(0)} KB · Listo para enviar
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={removeFile}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="Remover archivo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {fileError && (
                        <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {fileError}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {method === "card" && (
                  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-sky-400" />
                      <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                        Pago con Tarjeta de Débito o Crédito
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Aceptamos tarjetas de débito y crédito internacionales y locales a través de pasarela segura. Al presionar el botón de confirmación, te contactaremos de inmediato con el link de pago cifrado o podrás coordinarlo directamente por WhatsApp.
                    </p>
                    <div className="flex items-center gap-3 text-slate-500 text-xs pt-1">
                      <span className="font-bold text-slate-400">VISA</span>
                      <span>·</span>
                      <span className="font-bold text-slate-400">Mastercard</span>
                      <span>·</span>
                      <span className="font-bold text-slate-400">American Express</span>
                      <span>·</span>
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Cifrado 256-bit
                      </span>
                    </div>
                  </div>
                )}

                {method === "cash" && (
                  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-amber-400" />
                      <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                        Pago en Efectivo o Bocas de Cobranza
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Puedes abonar en cualquier boca de Aquí Pago, Pago Express, Tigo Money o depósito bancario por ventanilla. Envía tu solicitud y recibirás las instrucciones detalladas con tu código de cliente.
                    </p>
                  </div>
                )}
              </section>

              {/* CUPON DE DESCUENTO */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    ¿Tienes un cupón de descuento?
                  </label>
                  {coupon && (
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      -{coupon.discount.toLocaleString("es-PY")} PYG
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ingresa tu cupón"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="min-w-0 flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs uppercase font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => void applyCoupon()}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    {couponLoading ? "Validando..." : "Aplicar"}
                  </button>
                </div>

                {coupon && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ¡Cupón aplicado con éxito! Descuento: {coupon.name} (-{coupon.discount.toLocaleString("es-PY")} PYG)
                  </p>
                )}

                {couponError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {couponError}
                  </p>
                )}
              </section>

              {/* ERRORES GENERALES */}
              {error && (
                <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Atención:</strong>
                    {error}
                  </div>
                </div>
              )}

              {/* BOTON CTA DE COMPRA GIGANTE (ESTILO HOTMART) */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:via-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition cursor-pointer transform active:scale-[0.99]"
                >
                  {sending ? (
                    <div className="flex items-center gap-2 text-white">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Procesando tu solicitud...</span>
                    </div>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 text-white/90" />
                      <span>COMPRAR AHORA Y OBTENER ACCESO</span>
                      <ArrowRight className="w-5 h-5 ml-1" />
                    </>
                  )}
                </button>

                <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400 pt-2">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Compra 100% Protegida
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Privacidad Resguardada
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    Acceso en Minutos
                  </span>
                </div>
              </div>
            </form>
          </div>

          {/* COLUMNA DERECHA: RESUMEN DEL PEDIDO (STICKY SIDEBAR) (5 COLUMNAS) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            {/* TARJETA DE RESUMEN DEL CURSO */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
              <div className="space-y-3 pb-5 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Acceso Vitalicio
                  </span>
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>4.9 / 5.0</span>
                    <span className="text-slate-500 text-[10px]">(+500 alumnos)</span>
                  </div>
                </div>

                <h1 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                  {course.name}
                </h1>

                {course.description && (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {course.description}
                  </p>
                )}
              </div>

              {/* LISTA DE BENEFICIOS INCLUIDOS */}
              <div className="space-y-2.5">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                  Tu inscripción incluye:
                </span>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Acceso ilimitado 24/7 a las lecciones en el Campus</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Clases en alta definición y recursos descargables</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Certificado digital oficial al completar el programa</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Canal de resolución de dudas con el instructor</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Acceso multiplataforma: computadora, tablet y celular</span>
                  </li>
                </ul>
              </div>

              {/* DESGLOSE DE PRECIOS */}
              <div className="pt-4 border-t border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Precio habitual:</span>
                  <span className="line-through">{regularPrice.toLocaleString("es-PY")} PYG</span>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>Precio promocional:</span>
                  <span className="font-semibold text-white">{course.price_pyg.toLocaleString("es-PY")} PYG</span>
                </div>

                {coupon && (
                  <div className="flex justify-between items-center text-xs text-emerald-400 font-semibold">
                    <span>Descuento cupón ({coupon.name}):</span>
                    <span>-{coupon.discount.toLocaleString("es-PY")} PYG</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800/80 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-slate-300 block">
                      Total a Pagar:
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Pago único · Sin costos mensuales
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                      {finalPrice.toLocaleString("es-PY")} PYG
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      (Aprox. ~${usdReference} USD)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SELLO DE GARANTIA INCONDICIONAL */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-5 shadow-lg flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                <Award className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-white">Garantía Incondicional de 7 Días</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Prueba el curso sin ningún riesgo. Si no cumple tus expectativas, te devolvemos el 100% de tu dinero sin preguntas ni complicaciones.
                </p>
              </div>
            </div>

            {/* ASISTENCIA POR WHATSAPP */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-white block">¿Dudas antes de comprar?</span>
                <span className="text-slate-400 text-[11px] block">
                  Chatea directamente con nuestro asesor académico
                </span>
              </div>
              <a
                href={`https://wa.me/595981000000?text=${encodeURIComponent(
                  `Hola, tengo una consulta sobre el curso "${course.name}" antes de inscribirme.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
