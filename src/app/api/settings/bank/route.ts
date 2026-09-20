import { NextRequest, NextResponse } from "next/server";
import { getBankSettings, saveBankSettings, BankSettings } from "@/lib/settings";

export async function GET() {
  const settings = await getBankSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<BankSettings>;
    const current = await getBankSettings();

    const updated: BankSettings = {
      alias: (body.alias ?? current.alias).trim(),
      titular: (body.titular ?? current.titular).trim(),
      banco: (body.banco ?? current.banco).trim(),
      cuenta: (body.cuenta ?? current.cuenta).trim(),
      ci_ruc: (body.ci_ruc ?? current.ci_ruc).trim(),
    };

    const ok = await saveBankSettings(updated);
    if (!ok) {
      return NextResponse.json({ error: "No se pudieron guardar los datos bancarios." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, settings: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error inesperado al actualizar datos bancarios." },
      { status: 500 }
    );
  }
}
