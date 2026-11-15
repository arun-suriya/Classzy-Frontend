import { Link } from "react-router-dom";

/** The timetable sections. Pages that are not built yet are simply not listed. */
export const timetableSections = [
  { key: "periods", label: "Period Configuration", path: "/institutions/settings/timetable/periods" },
  { key: "rules", label: "Timetable Rules", path: "/institutions/settings/timetable/rules" },
  { key: "breaks", label: "Break Rules", path: "/institutions/settings/timetable/breaks" },
] as const;
export type TimetableSectionKey = (typeof timetableSections)[number]["key"];

/** Small pill row that moves between the Timetable Settings pages. */
export function TimetableNav({ active }: { active: TimetableSectionKey }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#53658f]">Timetable Settings</span>
      {timetableSections.map((s) => (
        <Link key={s.key} to={s.path} aria-current={active === s.key ? "page" : undefined}
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition ${active === s.key ? "border-blue-600 bg-blue-600 text-white" : "border-[#cfe0f5] bg-white text-[#34467a] hover:border-blue-300 hover:bg-blue-50"}`}>
          {s.label}
        </Link>
      ))}
    </div>
  );
}

export const weekdays = [
  { key: "MONDAY", label: "Monday", short: "Mon" }, { key: "TUESDAY", label: "Tuesday", short: "Tue" }, { key: "WEDNESDAY", label: "Wednesday", short: "Wed" },
  { key: "THURSDAY", label: "Thursday", short: "Thu" }, { key: "FRIDAY", label: "Friday", short: "Fri" }, { key: "SATURDAY", label: "Saturday", short: "Sat" },
  { key: "SUNDAY", label: "Sunday", short: "Sun" },
] as const;

/** "13:05" -> "01:05 PM" (or unchanged for 24 hour format). */
export function fmtTime(hhmm: string | null | undefined, format: "H12" | "H24" = "H12"): string {
  if (!hhmm) return "—";
  if (format === "H24") return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

/** "08:00" + 45 -> "08:45" (stops at 23:59). */
export function addMinutes(hhmm: string, minutes: number): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export const fmtDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} hr${h > 1 ? "s" : ""}${m ? ` ${m} mins` : ""}` : `${m} mins`;
};
