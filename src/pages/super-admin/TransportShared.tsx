import type { ReactNode } from "react";

/** "12.5" -> 12.5, "" -> null */
export const num = (v: string): number | null => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));
export const str = (v: number | null | undefined): string => (v === null || v === undefined ? "" : String(v));

export function Err({ errors, k }: { errors: Record<string, string>; k: string }) {
  return errors[k] ? <div className="mt-0.5 text-[9px] font-semibold text-rose-600">{errors[k]}</div> : null;
}

const tones = {
  green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", red: "bg-rose-50 text-rose-700", blue: "bg-blue-50 text-blue-700", gray: "bg-slate-100 text-slate-600",
} as const;
export function Pill({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${tones[tone]}`}>{children}</span>;
}
export const statusTone = (s: string): keyof typeof tones => (s === "ACTIVE" ? "green" : s === "INACTIVE" ? "red" : "amber");
export const statusLabel = (s: string) => s.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");

/** expired / due within 30 days / fine / no date */
export function expiryState(date: string | null | undefined): "expired" | "soon" | "ok" | null {
  if (!date) return null;
  const days = (new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86_400_000;
  return days < 0 ? "expired" : days <= 30 ? "soon" : "ok";
}
export function ExpiryPill({ date }: { date: string | null | undefined }) {
  const s = expiryState(date);
  if (s === "expired") return <Pill tone="red">Expired</Pill>;
  if (s === "soon") return <Pill tone="amber">Expiring soon</Pill>;
  return null;
}

export function StatCard({ label, value, tone = "blue" }: { label: string; value: ReactNode; tone?: "blue" | "green" | "amber" | "red" }) {
  const color = { blue: "text-blue-700", green: "text-emerald-600", amber: "text-amber-600", red: "text-rose-600" }[tone];
  return (
    <div className="rounded-lg border border-[#e1ecfa] bg-white px-3 py-2.5">
      <div className="text-[10px] font-semibold text-slate-500">{label}</div>
      <div className={`text-[20px] font-extrabold ${color}`}>{value}</div>
    </div>
  );
}
