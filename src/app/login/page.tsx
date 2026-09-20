"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import BrandLogo from "@/components/brand-logo";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Acceso denegado.");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050507] flex items-center justify-center px-4 py-16 text-zinc-100 antialiased selection:bg-sky-500/30 relative overflow-hidden">
      {/* Apple Pro Ambient Backlight */}
      <div 
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-sky-500/10 via-sky-500/0 to-transparent blur-3xl opacity-60"
        aria-hidden="true"
      />

      <div className="w-full max-w-sm space-y-7 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.12] text-sky-400 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]">
            <BrandLogo className="w-7 h-7 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Campus Michael Sahlmann
            </h1>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              Panel Administrativo & Matrículas
            </p>
          </div>
        </div>

        {/* Login Container — Apple Glass Card */}
        <div className="apple-card rounded-3xl p-7 sm:p-8 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span>Autenticación Pro</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password-input"
                className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-2"
              >
                Contraseña Maestra
              </label>
              <div className="relative">
                <input
                  id="admin-password-input"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 pr-11 apple-input rounded-xl text-white placeholder-zinc-600 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition cursor-pointer p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-lg"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <div
                className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-100 active:scale-[0.99] text-zinc-950 font-semibold text-xs tracking-wide uppercase transition-all shadow-[0_4px_20px_rgba(255,255,255,0.12)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {loading ? "Verificando..." : "Ingresar al Panel"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-zinc-600 font-medium">
          Sesión cifrada de alta seguridad · Campus Virtual
        </p>
      </div>
    </main>
  );
}
