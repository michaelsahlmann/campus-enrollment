"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

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
    <main className="min-h-screen bg-[#06080D] flex items-center justify-center px-4 py-12 text-slate-100 antialiased selection:bg-sky-500/30">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            Campus Michael Sahlmann
          </h1>
          <p className="text-xs text-slate-400">
            Panel Administrativo & Matrículas
          </p>
        </div>

        {/* Login Container */}
        <div className="bg-[#0B0F17] border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Acceso Restringido
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Contraseña de Administrador
              </label>
              <div className="relative">
                <input
                  id="admin-password-input"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 bg-[#111827] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500 text-sm transition"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition cursor-pointer p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <div
                className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.99] text-white font-semibold text-xs shadow-md transition disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              {loading ? "Verificando..." : "Ingresar al Panel"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-500">
          Sesión de administrador protegida
        </p>
      </div>
    </main>
  );
}
