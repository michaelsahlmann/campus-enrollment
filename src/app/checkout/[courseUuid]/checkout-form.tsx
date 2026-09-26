"use client";

import React, { FormEvent, useState, useRef, useEffect } from "react";
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
  ExternalLink,
} from "lucide-react";
import BrandLogo from "@/components/brand-logo";
import BackgroundPaths from "@/components/background-paths";
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
  checkoutTitle,
  bankSettings = DEFAULT_BANK_SETTINGS,
  initialCoupon,
}: {
  course: Course;
  checkoutSlug: string;
  checkoutTitle?: string;
  bankSettings?: BankSettings;
  initialCoupon?: string;
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
  const [autoEnrolledData, setAutoEnrolledData] = useState<{
    magicLink: string;
    tempPassword?: string;
    isNewUser: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // Cupón de descuento
  const [couponCode, setCouponCode] = useState(
    initialCoupon ? initialCoupon.trim().toUpperCase() : ""
  );
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<{
    name: string;
    code: string;
    discount: number;
    amountDue: number;
  } | null>(null);

  // Auto-aplicar cupón si vino en URL (?coupon=... o ?c=...)
  useEffect(() => {
    if (initialCoupon && initialCoupon.trim()) {
      const codeToApply = initialCoupon.trim().toUpperCase();
      setCouponLoading(true);
      setCouponError(null);
      fetch(
        `/api/checkout/coupons?code=${encodeURIComponent(
          codeToApply
        )}&course_uuid=${encodeURIComponent(
          course.course_uuid
        )}&checkout_slug=${encodeURIComponent(checkoutSlug)}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data?.coupon) {
            setCoupon({
              name: data.coupon.name,
              code: data.coupon.code,
              discount: Number(data.discount),
              amountDue: Number(data.amountDue),
            });
          } else {
            setCouponError(data?.error || "Cupón no válido para este curso o link.");
          }
        })
        .catch((err) => {
          setCouponError(err instanceof Error ? err.message : "Error al validar el cupón.");
        })
        .finally(() => {
          setCouponLoading(false);
        });
    }
  }, [initialCoupon, course.course_uuid, checkoutSlug]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const finalPrice = coupon ? coupon.amountDue : course.price_pyg;
  const isFreeGrant = finalPrice === 0;

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
      formData.set("payment_method", isFreeGrant ? "coupon_100" : method);

      if (coupon) {
        formData.set("coupon_code", coupon.code);
      }
      if (!isFreeGrant && selectedFile && method === "transfer" && hasProof === "yes") {
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

      // Si el cupón era 100% o acceso gratuito, recibimos autoEnrolled con Magic Link y Contraseña
      if (data.autoEnrolled) {
        setAutoEnrolledData({
          magicLink: data.magicLink,
          tempPassword: data.tempPassword,
          isNewUser: Boolean(data.isNewUser),
        });
      }
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar la solicitud.");
    } finally {
      setSending(false);
    }
  }

  // 1. PANTALLA DE ALTA INMEDIATA (CUPON 100% / ACCESO BONIFICADO)
  if (autoEnrolledData && reference) {
    const whatsappText = `¡Hola! Acabo de activar mi acceso a Instituto Varkentis para el programa "${course.name}".
Referencia de Matrícula: #${reference}
Alumno: ${name}
Correo: ${email}${autoEnrolledData.tempPassword ? `\nContraseña generada: ${autoEnrolledData.tempPassword}` : ""}`;

    return (
      <main className="min-h-screen bg-[#050505] text-[#d6d6dc] py-16 px-4 sm:px-6 flex flex-col items-center justify-center antialiased relative overflow-hidden">
        <BackgroundPaths />

        <div className="max-w-xl w-full varkentis-card-elevated p-8 sm:p-12 space-y-7 relative z-10 border-emerald-500/30">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.35)]">
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <span className="font-mono-system text-[10px] font-bold tracking-[0.2em] text-emerald-400 uppercase bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/30 inline-block mb-3">
                ¡Acceso Oficial Concedido · 100% Bonificado!
              </span>
              <h1 className="text-3xl sm:text-4xl font-heading text-white tracking-tight">
                ¡Bienvenido a Instituto Varkentis!
              </h1>
              <p className="text-xs sm:text-sm text-[#D9E8F5]/80 mt-2 max-w-md mx-auto font-body">
                Tu matrícula para el programa <strong className="text-white font-semibold">{course.name}</strong> ha sido liberada y ya está activa en el Campus Virtual.
              </p>
              {checkoutTitle && checkoutTitle !== course.name ? (
                <div className="mt-2">
                  <span className="font-mono text-[10px] text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full inline-block">
                    Modalidad / Promoción: {checkoutTitle}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Banner Principal en Verde Esmeralda */}
          <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/35 p-4 sm:p-5 flex items-start gap-3.5 text-left shadow-[0_0_30px_rgba(16,185,129,0.12)]">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-emerald-300 font-heading">
                Vas a recibir un correo electrónico con tus accesos
              </h2>
              <p className="text-xs text-emerald-200/80 leading-relaxed font-body">
                También enviamos tus datos de acceso oficiales a <strong className="text-white font-mono break-all">{email}</strong>{phone ? <> y a tu WhatsApp <strong className="text-white font-mono">{phone}</strong></> : null}.
              </p>
            </div>
          </div>

          {/* Tarjeta de Credenciales */}
          <div className="rounded-2xl bg-[#050505]/80 border border-white/10 p-6 space-y-4 shadow-inner">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
              <span className="font-mono-system text-[11px] uppercase tracking-wider text-[#D9E8F5]/60">Código de Matrícula</span>
              <span className="font-mono tabular-nums font-bold text-white tracking-wider">#{reference}</span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase tracking-widest">Usuario de Acceso</span>
                <span className="text-white font-semibold text-sm break-all">{email}</span>
              </div>

              {autoEnrolledData.tempPassword ? (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Contraseña Inicial</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(autoEnrolledData.tempPassword || "");
                        setCopiedPass(true);
                        setTimeout(() => setCopiedPass(false), 2000);
                      }}
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedPass ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPass ? "¡Copiada!" : "Copiar"}</span>
                    </button>
                  </div>
                  <span className="text-[#D9E8F5] bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg inline-block text-sm font-bold tracking-wider mt-1">
                    {autoEnrolledData.tempPassword}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Botón de Acceso Instantáneo en 1 Clic */}
          <div className="space-y-3 pt-2">
            <a
              href={autoEnrolledData.magicLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-heading text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 transition shadow-[0_0_35px_rgba(16,185,129,0.4)] cursor-pointer active:scale-[0.98]"
            >
              <span>Ingresar al Campus Virtual en 1 Clic</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(autoEnrolledData.magicLink);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="varkentis-btn-ghost w-full py-3 text-xs"
            >
              {copiedLink ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              <span>{copiedLink ? "¡Enlace Directo Copiado!" : "Copiar Enlace Mágico de Ingreso"}</span>
            </button>

            <a
              href={`https://wa.me/595981000000?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-[#D9E8F5]/60 hover:text-white transition py-2 font-mono-system"
            >
              ¿Necesitas soporte? Contactar por WhatsApp &rarr;
            </a>
          </div>
        </div>
      </main>
    );
  }

  // 2. PANTALLA DE SOLICITUD ENVIADA (TRANSFERENCIA BANCARIA CON COMPROBANTE)
  if (reference) {
    const whatsappNotification = `¡Hola Equipo de Admisiones! Acabo de completar mi inscripción para "${course.name}".
Referencia de Matrícula: #${reference}
Alumno: ${name}
Correo: ${email}
${phone ? `WhatsApp: ${phone}\n` : ""}${method === "transfer" ? (selectedFile && hasProof === "yes" ? "Adjunto mi comprobante de transferencia bancaria." : "Realicé la transferencia bancaria.") : "El pago fue coordinado previamente."}`;

    return (
      <main className="min-h-screen bg-[#050505] text-[#d6d6dc] py-16 px-4 sm:px-6 flex flex-col items-center justify-center antialiased relative overflow-hidden">
        <BackgroundPaths />

        <div className="max-w-lg w-full varkentis-card-elevated p-8 sm:p-10 space-y-7 relative z-10 border-emerald-500/30">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.35)]">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <span className="font-mono-system text-[10px] font-bold tracking-[0.2em] text-emerald-400 uppercase bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/30 inline-block mb-2">
                ¡Solicitud Confirmada con Éxito!
              </span>
              <h1 className="text-2xl sm:text-3xl font-heading text-white tracking-tight">
                ¡Inscripción Recibida con Éxito!
              </h1>
              <p className="text-xs sm:text-sm text-[#D9E8F5]/80 mt-1 max-w-sm mx-auto font-body">
                Tu solicitud para el programa <strong className="text-white font-semibold">{course.name}</strong> fue registrada y procesada correctamente.
              </p>
              {checkoutTitle && checkoutTitle !== course.name ? (
                <div className="mt-2">
                  <span className="font-mono text-[10px] text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full inline-block">
                    Modalidad / Promoción: {checkoutTitle}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Tarjeta de Notificación Principal en Verde Esmeralda */}
          <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/35 p-4 sm:p-5 flex items-start gap-3.5 text-left shadow-[0_0_30px_rgba(16,185,129,0.12)]">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-emerald-300 font-heading">
                Vas a recibir un correo electrónico y un WhatsApp
              </h2>
              <p className="text-xs text-emerald-200/80 leading-relaxed font-body">
                Te enviaremos tus datos de acceso oficiales y el enlace directo al Campus Virtual a <strong className="text-white font-mono break-all">{email}</strong>{phone ? <> y a tu WhatsApp <strong className="text-white font-mono">{phone}</strong></> : null}.
              </p>
            </div>
          </div>

          {/* Código de Referencia */}
          <div className="rounded-2xl bg-[#050505]/70 border border-white/10 p-5 space-y-4 shadow-inner">
            <div className="flex items-center justify-between text-xs text-zinc-400 pb-3 border-b border-white/[0.08]">
              <span className="font-mono-system text-[11px] uppercase tracking-wider text-[#D9E8F5]/60">Código de Matrícula</span>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(reference);
                  setCopiedRef(true);
                  setTimeout(() => setCopiedRef(false), 2000);
                }}
                aria-label="Copiar código de referencia de pago"
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 active:scale-95 font-semibold cursor-pointer px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all font-mono"
              >
                {copiedRef ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRef ? "¡Copiado!" : "Copiar"}</span>
              </button>
            </div>

            <div className="font-mono tabular-nums text-2xl font-bold text-white tracking-wider">
              #{reference}
            </div>

            <div className="pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Alumno</span>
                <span className="text-white font-medium truncate block mt-0.5">{name}</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Estado</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                  Registrado con éxito
                </span>
              </div>
            </div>
          </div>

          {/* Próximos pasos claros para el Alumno */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3.5 text-xs text-left font-body">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="font-mono-system text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                ¿Qué debes hacer ahora?
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Tu lugar está asegurado
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 font-mono text-[11px] font-bold">
                  1
                </div>
                <div>
                  <span className="font-semibold text-white block">Atento a tu Correo Electrónico</span>
                  <p className="text-[11px] text-[#D9E8F5]/80 mt-0.5 leading-relaxed">
                    Revisa tu bandeja de entrada en <strong className="text-white font-mono break-all">{email}</strong> (y carpeta spam por si acaso). Te enviaremos tu Magic Link oficial para ingresar en 1 clic.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 font-mono text-[11px] font-bold">
                  2
                </div>
                <div>
                  <span className="font-semibold text-white block">Atento a tu WhatsApp</span>
                  <p className="text-[11px] text-[#D9E8F5]/80 mt-0.5 leading-relaxed">
                    {phone ? (
                      <>Te escribiremos al <strong className="text-white font-mono">{phone}</strong> para confirmarte que tu aula virtual ya está 100% activa.</>
                    ) : (
                      <>Nuestro equipo de admisiones te contactará para confirmar tu habilitación y acompañarte en tus primeros pasos.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3 pt-1">
            <a
              href={`https://wa.me/595981000000?text=${encodeURIComponent(whatsappNotification)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-heading text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 transition shadow-[0_0_25px_rgba(16,185,129,0.35)] cursor-pointer active:scale-[0.98]"
            >
              <Phone className="w-4 h-4" />
              <span>Notificar al Soporte por WhatsApp</span>
            </a>

            <a
              href="https://campus.michaelsahlmann.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-[#D9E8F5]/60 hover:text-white transition py-2 font-mono-system"
            >
              Ir al Campus Virtual &rarr;
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#d6d6dc] antialiased selection:bg-[#F26101]/30 selection:text-white relative overflow-hidden">
      <BackgroundPaths />

      {/* BARRA SUPERIOR — Varkentis Header */}
      <header className="border-b border-white/10 bg-[#050505]/85 backdrop-blur-2xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.12] flex items-center justify-center text-white shadow-sm shrink-0">
              <BrandLogo className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-heading text-base text-white tracking-tight block leading-tight">
                Instituto Varkentis
              </span>
              <span className="text-[10px] text-[#D9E8F5]/60 font-mono-system tracking-wider flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F26101] shadow-[0_0_6px_rgba(242,97,1,0.8)]" />
                Campus Virtual · Alta Oficial
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-[#D9E8F5]/70 font-mono">
              <Lock className="w-3 h-3 text-[#F26101]" />
              <span>Cifrado SSL 256-bit</span>
            </div>

            <a
              href="https://campus.michaelsahlmann.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#D9E8F5]/70 hover:text-white transition font-mono-system flex items-center gap-1"
            >
              <span>Campus Virtual</span>
              <ExternalLink className="w-3 h-3 text-[#F26101]" />
            </a>
          </div>
        </div>
      </header>

      {/* RESUMEN MOVIL COLAPSABLE */}
      <div className="lg:hidden border-b border-white/10 bg-[#0A0E17]/95 backdrop-blur-xl px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
          aria-expanded={mobileSummaryOpen}
          aria-controls="mobile-summary-details"
          aria-label="Alternar desglose del curso"
          className="w-full flex items-center justify-between text-xs font-semibold text-zinc-200 cursor-pointer p-1"
        >
          <span className="flex items-center gap-2 truncate pr-2">
            <span className="text-zinc-500 uppercase text-[10px] font-mono">Programa:</span>
            <span className="text-white truncate font-heading">{course.name}</span>
            {mobileSummaryOpen ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          </span>
          <span className="text-sm font-bold text-[#F26101] font-mono tabular-nums shrink-0">
            {finalPrice.toLocaleString("es-PY")} PYG
          </span>
        </button>

        {mobileSummaryOpen ? (
          <div id="mobile-summary-details" className="mt-3 pt-3 border-t border-white/[0.06] text-xs space-y-2 animate-fade-in font-body">
            {course.description ? <p className="text-[#D9E8F5]/70 text-xs leading-relaxed">{course.description}</p> : null}
            {coupon ? (
              <div className="flex justify-between text-[#F26101] font-mono">
                <span>Cupón ({coupon.name}):</span>
                <span className="tabular-nums">-{coupon.discount.toLocaleString("es-PY")} PYG</span>
              </div>
            ) : null}
            <div className="flex justify-between text-white font-bold text-xs pt-2 border-t border-white/[0.06] font-mono">
              <span>Total a Pagar:</span>
              <span className="text-[#F26101] tabular-nums">{finalPrice.toLocaleString("es-PY")} PYG</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* CONTENIDO PRINCIPAL EN 2 COLUMNAS */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* COLUMNA IZQUIERDA: FORMULARIO DIRECTO */}
          <div className="lg:col-span-7 space-y-7">
            <form onSubmit={submit} className="space-y-7">
              {/* PASO 1: DATOS DEL ALUMNO */}
              <section className="varkentis-card p-6 sm:p-8 space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
                  <span className="w-7 h-7 rounded-full bg-white/10 text-white font-mono text-xs flex items-center justify-center border border-white/20">
                    1
                  </span>
                  <div>
                    <h2 className="text-lg font-heading text-white tracking-tight">
                      Datos del Alumno
                    </h2>
                    <p className="text-xs text-[#D9E8F5]/60 mt-0.5 font-body">
                      Información para habilitación de cuenta y emisión de credenciales
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Nombre y Apellido */}
                  <div>
                    <label htmlFor="student-name-input" className="block text-[11px] font-medium uppercase tracking-wider text-[#D9E8F5]/70 mb-1.5">
                      Nombre y Apellido <span className="text-[#F26101]">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-500 absolute left-4 top-3.5 pointer-events-none" />
                      <input
                        id="student-name-input"
                        type="text"
                        name="name"
                        autoComplete="name"
                        required
                        placeholder="Ej. Carlos Benítez"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full varkentis-input pl-11 pr-4 py-3 text-white placeholder-zinc-600 text-sm"
                      />
                    </div>
                  </div>

                  {/* Correo Electrónico */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="student-email-input" className="text-[11px] font-medium uppercase tracking-wider text-[#D9E8F5]/70">
                        Correo Electrónico <span className="text-[#F26101]">*</span>
                      </label>
                      <span className="text-[10px] text-zinc-500">Usuario del Campus</span>
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-4 top-3.5 pointer-events-none" />
                      <input
                        id="student-email-input"
                        type="email"
                        name="email"
                        autoComplete="email"
                        required
                        placeholder="tu-correo@ejemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full varkentis-input pl-11 pr-4 py-3 text-white placeholder-zinc-600 text-sm"
                      />
                    </div>
                  </div>

                  {/* Confirmar Correo */}
                  <div>
                    <label htmlFor="student-confirm-email-input" className="block text-[11px] font-medium uppercase tracking-wider text-[#D9E8F5]/70 mb-1.5">
                      Confirmar Correo Electrónico <span className="text-[#F26101]">*</span>
                    </label>
                    <div className="relative">
                      <CheckCircle2
                        className={`w-4 h-4 absolute left-4 top-3.5 pointer-events-none transition-colors ${
                          confirmEmail && confirmEmail.toLowerCase() === email.toLowerCase()
                            ? "text-[#F26101]"
                            : "text-zinc-600"
                        }`}
                      />
                      <input
                        id="student-confirm-email-input"
                        type="email"
                        name="confirm-email"
                        autoComplete="email"
                        required
                        placeholder="Repite tu correo para verificar"
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        className={`w-full varkentis-input pl-11 pr-4 py-3 text-white placeholder-zinc-600 text-sm ${
                          confirmEmail && confirmEmail.toLowerCase() !== email.toLowerCase()
                            ? "!border-rose-500 focus:!ring-rose-500/20"
                            : ""
                        }`}
                      />
                    </div>
                    {confirmEmail && confirmEmail.toLowerCase() !== email.toLowerCase() ? (
                      <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1 font-sans" role="alert">
                        <AlertCircle className="w-3.5 h-3.5" /> Los correos no coinciden.
                      </p>
                    ) : null}
                  </div>

                  {/* Teléfono / WhatsApp */}
                  <div>
                    <label htmlFor="student-phone-input" className="block text-[11px] font-medium uppercase tracking-wider text-[#D9E8F5]/70 mb-1.5">
                      Número de WhatsApp / Teléfono <span className="text-zinc-500 lowercase">(opcional)</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 flex items-center gap-1 text-xs text-zinc-400 pointer-events-none">
                        <span>🇵🇾</span>
                        <span>+595</span>
                      </div>
                      <input
                        id="student-phone-input"
                        type="tel"
                        name="tel"
                        autoComplete="tel"
                        placeholder="981 123 456"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full varkentis-input pl-20 pr-4 py-3 text-white placeholder-zinc-600 text-sm"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1.5 block">
                      Para emitirte acceso prioritario y soporte humano directo.
                    </span>
                  </div>
                </div>
              </section>

              {/* PASO 2: FORMA DE PAGO O ACCESO BONIFICADO */}
              {isFreeGrant ? (
                /* SECCION DE BENEFICIO 100% ACTIVA */
                <section className="varkentis-card-elevated p-6 sm:p-8 space-y-4 border-[#F26101]/40 bg-[#0F1520]/95 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-[#F26101]/15 text-[#F26101] border border-[#F26101]/30 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-heading text-white tracking-tight">
                        Beneficio 100% Bonificado
                      </h2>
                      <span className="font-mono-system text-[10px] text-[#F26101] uppercase tracking-wider">
                        Beca de Acceso Gratuito Activa
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#D9E8F5]/80 font-body leading-relaxed pt-1">
                    Tu inversión total es de <strong className="text-white font-mono">0 PYG</strong>. No necesitas realizar transferencia ni adjuntar comprobantes. Tu cuenta y matrícula se darán de alta automáticamente en el Campus Virtual.
                  </p>
                </section>
              ) : (
                /* SELECCION DE PAGO NORMAL */
                <section className="varkentis-card p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
                    <span className="w-7 h-7 rounded-full bg-white/10 text-white font-mono text-xs flex items-center justify-center border border-white/20">
                      2
                    </span>
                    <div>
                      <h2 className="text-lg font-heading text-white tracking-tight">
                        Forma de Pago
                      </h2>
                      <p className="text-xs text-[#D9E8F5]/60 mt-0.5 font-body">
                        Selecciona cómo realizaste o realizarás el abono bancario
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Opción 1: Transferencia bancaria */}
                    <button
                      type="button"
                      onClick={() => setMethod("transfer")}
                      className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer active:scale-[0.99] ${
                        method === "transfer"
                          ? "bg-[#0A0E17] border-[#F26101] shadow-[0_0_20px_rgba(242,97,1,0.15)] ring-1 ring-[#F26101]/40"
                          : "bg-white/[0.02] border-white/[0.08] hover:border-white/[0.16]"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${method === "transfer" ? "bg-[#F26101]/20 text-[#F26101]" : "bg-white/5 text-zinc-400"}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-heading text-sm text-white block">Transferencia bancaria</span>
                        <span className="text-[11px] text-[#D9E8F5]/60 block mt-0.5 font-mono">
                          SIPAP y comprobante
                        </span>
                      </div>
                    </button>

                    {/* Opción 2: Ya pagué */}
                    <button
                      type="button"
                      onClick={() => {
                        setMethod("cash");
                        setSelectedFile(null);
                      }}
                      className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer active:scale-[0.99] ${
                        method === "cash"
                          ? "bg-[#0A0E17] border-[#F26101] shadow-[0_0_20px_rgba(242,97,1,0.15)] ring-1 ring-[#F26101]/40"
                          : "bg-white/[0.02] border-white/[0.08] hover:border-white/[0.16]"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${method === "cash" ? "bg-[#F26101]/20 text-[#F26101]" : "bg-white/5 text-zinc-400"}`}>
                        <Banknote className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-heading text-sm text-white">Ya pagué</span>
                          <span className="text-[9px] font-mono font-bold uppercase bg-white/10 text-white px-1.5 py-0.5 rounded-full">
                            Coordinado
                          </span>
                        </div>
                        <span className="text-[11px] text-[#D9E8F5]/60 block mt-0.5 font-mono">
                          Efectivo o previo
                        </span>
                      </div>
                    </button>
                  </div>

                  {method === "transfer" ? (
                    <div className="space-y-5 pt-1 animate-fade-in">
                      {/* Slip de Coordenadas Bancarias Varkentis */}
                      <div className="varkentis-card-elevated rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                        <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                          <span className="text-xs font-mono-system text-[#D9E8F5] flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-[#F26101]" />
                            <span>Coordenadas Oficiales (SIPAP)</span>
                          </span>
                          <span className="text-xs font-mono tabular-nums font-bold text-white">
                            Total: {finalPrice.toLocaleString("es-PY")} PYG
                          </span>
                        </div>

                        {/* Alias Principal */}
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#F26101]/15 via-[#F26101]/5 to-transparent border-b border-[#F26101]/20 flex items-center justify-between gap-3">
                          <div className="min-w-0 pr-1">
                            <span className="text-[10px] text-[#F26101] font-mono-system font-bold uppercase tracking-wider block">
                              1. Alias de transferencia (SIPAP directo)
                            </span>
                            <span className="font-mono text-base sm:text-lg text-white font-extrabold tracking-wide break-all block mt-0.5">
                              {bankSettings.alias}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(bankSettings.alias, "alias")}
                            aria-label="Copiar alias de transferencia bancaria"
                            className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-full bg-[#F26101] hover:bg-[#ff741a] cursor-pointer shrink-0 transition-all font-mono"
                          >
                            {copiedBankField === "alias" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedBankField === "alias" ? "¡Copiado!" : "Copiar"}</span>
                          </button>
                        </div>

                        {/* Detalles adicionales */}
                        <div className="divide-y divide-white/5 text-xs font-mono">
                          <div className="p-3 px-4 flex items-center justify-between gap-3">
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase block">Titular de la cuenta</span>
                              <span className="font-semibold text-white truncate block mt-0.5">{bankSettings.titular}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(bankSettings.titular, "titular")}
                              className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer"
                            >
                              {copiedBankField === "titular" ? <Check className="w-3 h-3 text-[#F26101]" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>

                          <div className="p-3 px-4 flex items-center justify-between gap-3">
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase block">Entidad Bancaria</span>
                              <span className="font-semibold text-white truncate block mt-0.5">{bankSettings.banco}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(bankSettings.banco, "banco")}
                              className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer"
                            >
                              {copiedBankField === "banco" ? <Check className="w-3 h-3 text-[#F26101]" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>

                          <div className="p-3 px-4 flex items-center justify-between gap-3">
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase block">N° de Cuenta</span>
                              <span className="font-mono tabular-nums font-bold text-white text-sm block mt-0.5">{bankSettings.cuenta}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(bankSettings.cuenta, "cuenta")}
                              className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer"
                            >
                              {copiedBankField === "cuenta" ? <Check className="w-3 h-3 text-[#F26101]" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>

                          <div className="p-3 px-4 flex items-center justify-between gap-3">
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase block">Cédula / RUC</span>
                              <span className="font-mono tabular-nums font-bold text-white text-sm block mt-0.5">{bankSettings.ci_ruc}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(bankSettings.ci_ruc, "ci_ruc")}
                              className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer"
                            >
                              {copiedBankField === "ci_ruc" ? <Check className="w-3 h-3 text-[#F26101]" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Adjuntar comprobante */}
                      <div className="pt-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-[#D9E8F5]">
                            ¿Tenés comprobante de pago?
                          </label>
                          <div className="inline-flex rounded-full bg-black/50 p-1 border border-white/10">
                            <button
                              type="button"
                              onClick={() => setHasProof("yes")}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                                hasProof === "yes" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
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
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                                hasProof === "no" ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              No tengo ahora
                            </button>
                          </div>
                        </div>

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
                                className="border border-dashed border-white/20 hover:border-[#F26101]/60 bg-white/[0.01] hover:bg-[#F26101]/[0.02] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center"
                              >
                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
                                  <UploadCloud className="w-5 h-5 text-[#F26101]" />
                                </div>
                                <span className="text-xs font-semibold text-white font-heading">
                                  Arrastra tu comprobante o haz clic para subir
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  Formatos admitidos: JPG, PNG o PDF (máximo 5 MB)
                                </span>
                              </label>
                            ) : (
                              <div className="bg-white/[0.03] rounded-xl border border-[#F26101]/40 p-3.5 flex items-center justify-between">
                                <div className="flex items-center gap-3 truncate pr-2">
                                  <div className="w-8 h-8 rounded-full bg-[#F26101]/20 flex items-center justify-center text-[#F26101] shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="truncate">
                                    <p className="text-xs font-medium text-white truncate">{selectedFile.name}</p>
                                    <p className="text-[10px] text-zinc-400 font-mono tabular-nums">
                                      {(selectedFile.size / 1024).toFixed(0)} KB · Adjunto
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={removeFile}
                                  className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            {fileError ? (
                              <p className="text-[11px] text-rose-400 flex items-center gap-1 font-mono" role="alert">
                                <AlertCircle className="w-3.5 h-3.5" /> {fileError}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/10 text-[11px] text-[#D9E8F5]/70 leading-relaxed font-body">
                            No te preocupes. Al confirmar la solicitud, el equipo de soporte cotejará tu transferencia en el extracto bancario con tus datos.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/[0.02] rounded-xl border border-white/10 p-5 space-y-2 animate-fade-in text-xs font-body">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#F26101]" />
                        <p className="font-heading text-sm text-white">Pago coordinado previamente</p>
                      </div>
                      <p className="text-[#D9E8F5]/70 leading-relaxed text-[11px]">
                        Tu matrícula quedará registrada en el sistema. El equipo de soporte validará la recepción para emitirte el enlace de acceso sin demora.
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* CUPON DE DESCUENTO */}
              <section className="varkentis-card p-5 sm:p-6 space-y-3.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="coupon-code-field" className="text-xs font-mono-system text-[#D9E8F5] flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#F26101]" />
                    <span>Código Promocional / Cupón</span>
                  </label>
                  {coupon ? (
                    <span className="text-[11px] font-mono tabular-nums font-bold text-[#F26101] bg-[#F26101]/10 px-2.5 py-0.5 rounded-full border border-[#F26101]/30">
                      -{coupon.discount.toLocaleString("es-PY")} PYG
                    </span>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <input
                    id="coupon-code-field"
                    type="text"
                    placeholder="Ej. BECA100"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="min-w-0 flex-1 varkentis-input px-4 py-2.5 text-white placeholder-zinc-600 text-xs font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => void applyCoupon()}
                    disabled={couponLoading || !couponCode.trim()}
                    className="varkentis-btn-ghost px-5 py-2.5 text-[10px]"
                  >
                    {couponLoading ? "Validando…" : "Aplicar"}
                  </button>
                </div>

                {coupon ? (
                  <p className="text-[11px] text-[#F26101] flex items-center gap-1.5 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Cupón aplicado: {coupon.name} (-<span className="tabular-nums">{coupon.discount.toLocaleString("es-PY")}</span> PYG)
                  </p>
                ) : null}

                {couponError ? (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1.5 font-mono" role="alert">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {couponError}
                  </p>
                ) : null}
              </section>

              {/* ERRORES GENERALES */}
              {error ? (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 font-mono" role="alert">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              ) : null}

              {/* BOTON DE ENVIO PRIMARIO (CÁPSULA VARKENTIS) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sending}
                  className={`w-full py-4 px-6 text-xs sm:text-sm font-black transition-all ${
                    isFreeGrant ? "varkentis-btn-action shadow-[0_0_35px_rgba(242,97,1,0.4)]" : "varkentis-btn-primary"
                  }`}
                >
                  {sending ? (
                    <div className="flex items-center justify-center gap-2.5">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Procesando solicitud...</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>{isFreeGrant ? "Activar Mi Acceso Inmediato" : "Confirmar y Liberar Matrícula"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
                <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-zinc-500 font-mono-system">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F26101]" />
                  <span>{isFreeGrant ? "Aprobación automática en 1 clic" : "Emisión oficial de Magic Link directo"}</span>
                </div>
              </div>
            </form>
          </div>

          {/* COLUMNA DERECHA: RESUMEN DEL PROGRAMA */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
            <div className="varkentis-card p-6 sm:p-7 space-y-6">
              <div>
                <span className="font-mono-system text-[10px] uppercase font-bold tracking-widest text-[#F26101] bg-[#F26101]/10 px-3 py-1 rounded-full border border-[#F26101]/25 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F26101] animate-pulse" />
                  Programa Oficial Varkentis
                </span>
                <h1 className="text-xl sm:text-2xl font-heading text-white mt-3 leading-snug tracking-tight">
                  {course.name}
                </h1>
                {course.description ? (
                  <p className="text-xs text-[#D9E8F5]/70 mt-2 leading-relaxed font-body">
                    {course.description}
                  </p>
                ) : null}
              </div>

              {/* BENEFICIOS OFICIALES */}
              <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs font-body">
                <div className="flex items-center gap-2.5 text-[#d6d6dc]">
                  <CheckCircle2 className="w-4 h-4 text-[#F26101] shrink-0" />
                  <span className="font-medium">Acceso prioritario a la plataforma LearnHouse</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#d6d6dc]">
                  <CheckCircle2 className="w-4 h-4 text-[#F26101] shrink-0" />
                  <span className="font-medium">Materiales y lecciones en alta definición</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#d6d6dc]">
                  <CheckCircle2 className="w-4 h-4 text-[#F26101] shrink-0" />
                  <span className="font-medium">Asistencia y resolución de dudas directas</span>
                </div>
              </div>

              {/* DESGLOSE DE PRECIOS */}
              <div className="pt-4 border-t border-white/10 space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Precio del programa:</span>
                  <span className="tabular-nums text-white font-medium">{course.price_pyg.toLocaleString("es-PY")} PYG</span>
                </div>

                {coupon ? (
                  <div className="flex justify-between items-center text-[#F26101] font-medium">
                    <span>Descuento ({coupon.name}):</span>
                    <span className="tabular-nums">-{coupon.discount.toLocaleString("es-PY")} PYG</span>
                  </div>
                ) : null}

                <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
                  <span className="font-semibold text-zinc-300">Inversión Final:</span>
                  <span className="text-2xl sm:text-3xl tabular-nums font-black text-white tracking-tight">
                    {finalPrice.toLocaleString("es-PY")} <span className="text-xs font-semibold text-[#F26101] uppercase font-mono">PYG</span>
                  </span>
                </div>
              </div>

              {/* SOPORTE DIRECTO WHATSAPP */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500 text-[11px]">¿Dudas con tu matrícula?</span>
                <a
                  href={`https://wa.me/595981000000?text=${encodeURIComponent(
                    `Hola Equipo de Soporte de Instituto Varkentis, tengo una consulta sobre el programa "${course.name}".`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F26101] hover:text-[#ff741a] font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>WhatsApp Oficial</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
