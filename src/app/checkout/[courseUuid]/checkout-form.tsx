"use client";

import { FormEvent, useState } from "react";

type Course = { name: string; course_uuid: string; description: string | null; price_pyg: number };

export default function CheckoutForm({ course }: { course: Course }) {
  const [method, setMethod] = useState("transfer");
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{ name: string; discount: number; amountDue: number } | null>(null);

  async function applyCoupon() {
    setError(null);
    const response = await fetch(`/api/checkout/coupons?code=${encodeURIComponent(couponCode)}&course_uuid=${encodeURIComponent(course.course_uuid)}`);
    const data = await response.json();
    if (!response.ok) { setCoupon(null); setError(data.error || "Cupón inválido."); return; }
    setCoupon({ name: data.coupon.name, discount: Number(data.discount), amountDue: Number(data.amountDue) });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("course_uuid", course.course_uuid);
      const response = await fetch("/api/checkout/orders", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo registrar tu solicitud.");
      setReference(data.reference);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar tu solicitud.");
    } finally { setSending(false); }
  }

  if (reference) return <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6"><section className="max-w-lg w-full bg-slate-900 border border-emerald-700 rounded-2xl p-8 space-y-4"><h1 className="text-2xl font-bold text-emerald-400">Solicitud recibida</h1><p>Tu referencia es <strong className="font-mono">{reference}</strong>.</p><p className="text-slate-300">Revisaremos el pago y, al aprobarlo, habilitaremos tu acceso al curso.</p></section></main>;

  return <main className="min-h-screen bg-slate-950 text-white py-10 px-4"><form onSubmit={submit} className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5"><header><p className="text-sky-400 text-sm font-semibold">Inscripción</p><h1 className="text-2xl font-bold">{course.name}</h1><p className="text-slate-400 text-sm mt-2">{course.description}</p><p className="text-xl font-bold mt-4">{(coupon?.amountDue ?? course.price_pyg).toLocaleString("es-PY")} PYG</p>{coupon && <p className="text-emerald-400 text-sm">Descuento {coupon.name}: -{coupon.discount.toLocaleString("es-PY")} PYG</p>}</header><input type="hidden" name="course_uuid" value={course.course_uuid} /><input type="hidden" name="coupon_code" value={coupon ? couponCode : ""} /><div><label className="block text-sm">Cupón de descuento</label><div className="flex gap-2 mt-1"><input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} className="min-w-0 flex-1 rounded-lg bg-slate-950 border border-slate-700 p-3" placeholder="CÓDIGO" /><button type="button" onClick={() => void applyCoupon()} className="px-4 bg-slate-700 rounded-lg text-sm">Aplicar</button></div></div><label className="block text-sm">Nombre y apellido<input required name="name" className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 p-3" /></label><label className="block text-sm">Correo electrónico<input required type="email" name="email" className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 p-3" /></label><label className="block text-sm">WhatsApp (opcional)<input name="phone" className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 p-3" /></label><fieldset className="space-y-2"><legend className="text-sm mb-2">Método de pago</legend><label className="block"><input type="radio" name="payment_method" value="transfer" checked={method === "transfer"} onChange={() => setMethod("transfer")} /> Transferencia</label><label className="block"><input type="radio" name="payment_method" value="cash" checked={method === "cash"} onChange={() => setMethod("cash")} /> Efectivo</label></fieldset>{method === "transfer" && <div className="rounded-lg bg-slate-950 border border-slate-700 p-4 text-sm text-slate-300">Realizá la transferencia a los datos que te compartió el instituto. Luego podés subir el comprobante o continuar con “Ya pagué”.</div>}<label className="block text-sm">Comprobante (opcional, JPG, PNG o PDF hasta 5 MB)<input name="payment_proof" type="file" accept="image/jpeg,image/png,application/pdf" className="mt-1 block text-sm" /></label>{error && <p className="text-red-400 text-sm">{error}</p>}<button disabled={sending} className="w-full bg-sky-600 disabled:opacity-50 rounded-lg py-3 font-semibold">{sending ? "Enviando..." : "Ya pagué — enviar para revisión"}</button><p className="text-xs text-slate-500 text-center">Tu acceso se habilita cuando el pago sea confirmado.</p></form></main>;
}
