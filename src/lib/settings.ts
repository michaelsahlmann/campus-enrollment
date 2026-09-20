import { getAdminSupabase } from "./supabase";

export interface BankSettings {
  alias: string;
  titular: string;
  banco: string;
  cuenta: string;
  ci_ruc: string;
}

export const DEFAULT_BANK_SETTINGS: BankSettings = {
  alias: "pagos@michaelsahlmann.com",
  titular: "Michael Sahlmann",
  banco: "Banco Itaú",
  cuenta: "720000000",
  ci_ruc: "4567890-1",
};

export async function getBankSettings(): Promise<BankSettings> {
  const supabase = getAdminSupabase();
  if (!supabase) return DEFAULT_BANK_SETTINGS;

  try {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "bank_details")
      .maybeSingle();

    if (error || !data?.value) {
      return DEFAULT_BANK_SETTINGS;
    }

    const val = data.value as Partial<BankSettings>;
    return {
      alias: val.alias || DEFAULT_BANK_SETTINGS.alias,
      titular: val.titular || DEFAULT_BANK_SETTINGS.titular,
      banco: val.banco || DEFAULT_BANK_SETTINGS.banco,
      cuenta: val.cuenta || DEFAULT_BANK_SETTINGS.cuenta,
      ci_ruc: val.ci_ruc || DEFAULT_BANK_SETTINGS.ci_ruc,
    };
  } catch {
    return DEFAULT_BANK_SETTINGS;
  }
}

export async function saveBankSettings(settings: BankSettings): Promise<boolean> {
  const supabase = getAdminSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("settings")
      .upsert({
        key: "bank_details",
        value: settings,
        updated_at: new Date().toISOString(),
      });

    return !error;
  } catch {
    return false;
  }
}
