import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { api } from "../../services/api";
import type { CalEvent, CalEventBody, CalOptions } from "../../services/api";
import { Field, Notice, OutlineButton, PrimaryButton, controlClass, textareaClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import SchoolLayout from "./SchoolLayout";
import { isoDay, parseDay } from "./SchoolUi";

type View = "Month" | "Week" | "Day" | "Agenda";
const VIEWS: View[] = ["Month", "Week", "Day", "Agenda"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TONE: Record<string, string> = {
  EXAM: "bg-emerald-100 text-emerald-800", PARENT_MEETING: "bg-sky-100 text-sky-800", PTM: "bg-violet-100 text-violet-800",
  STAFF_MEETING: "bg-amber-100 text-amber-800", SCHOOL_EVENT: "bg-rose-100 text-rose-800", HOLIDAY: "bg-orange-100 text-orange-800", OTHER: "bg-slate-100 text-slate-700",
};
const fieldErrs = (e: unknown) => { const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors; return fe && Object.keys(fe).length ? fe : null; };
const ERR = (errs: Record<string, string>, k: string) => (errs[k] ? <p className="mt-1 text-[10px] text-rose-600">{errs[k]}</p> : null);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const monday = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
const t12 = (t: string | null) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const longDay = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeText = (e: CalEvent) => (e.allDay ? "All day" : `${t12(e.startTime)} – ${t12(e.endTime)}`);

/** Events touching a given day (multi-day events show on every day they cover). */
const onDay = (events: CalEvent[], iso: string) => events.filter((e) => e.startDate <= iso && e.endDate >= iso);

function range(view: View, cur: Date): [Date, Date] {
  if (view === "Month") { const first = new Date(cur.getFullYear(), cur.getMonth(), 1); const s = monday(first); return [s, addDays(s, 41)]; }
  if (view === "Week") { const s = monday(cur); return [s, addDays(s, 6)]; }
  if (view === "Day") return [cur, cur];
  const s = new Date(cur.getFullYear(), cur.getMonth(), 1); return [s, new Date(cur.getFullYear(), cur.getMonth() + 1, 0)];
}

const blank = (date: string): CalEventBody => ({ title: "", type: "", allDay: false, startDate: date, startTime: "09:00", endDate: date, endTime: "10:00", audience: "EVERYONE", classId: null, sectionId: null, location: "", description: "", reminder: "NONE" });

function EventPanel({ opts, event, initial, onClose, onSaved, onError }: { opts: CalOptions; event: CalEvent | null; initial: CalEventBody; onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const [f, setF] = useState<CalEventBody>(initial);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const secs = opts.sections.filter((s) => s.classId === f.classId);
  const set = (p: Partial<CalEventBody>) => setF((x) => ({ ...x, ...p }));
  const save = async () => {
    setBusy(true); setErrs({});
    try { if (event) await api.schoolCalendar.update(event.id, f); else await api.schoolCalendar.add(f); onSaved(event ? "Event updated." : "Event added."); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  const remove = async () => { if (!event || !window.confirm(`Delete "${event.title}"?`)) return; try { await api.schoolCalendar.remove(event.id); onSaved("Event deleted."); } catch (e) { onError(errText(e)); } };
  return (
    <aside className="space-y-3 rounded-xl border border-[#d8e9fb] bg-white p-5">
      <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-[20px] font-extrabold text-[#101b69]"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><CalendarDays size={18} /></span>{event ? "Edit Event" : "Add Event"}</h2>
        {event && <button type="button" aria-label="Delete event" onClick={() => void remove()} className="rounded p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button>}</div>
      <Field label="Event Title" required><input value={f.title} maxLength={150} onChange={(e) => set({ title: e.target.value })} placeholder="Enter event title" className={controlClass} />{ERR(errs, "title")}</Field>
      <div className="flex items-end gap-3">
        <Field label="Event Type" required className="flex-1"><select value={f.type} onChange={(e) => set({ type: e.target.value })} className={controlClass}><option value="">Select event type</option>{opts.types.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}</select>{ERR(errs, "type")}</Field>
        <label className="flex items-center gap-2 pb-1.5 text-[12px] font-bold text-[#17245e]">All-day<input type="checkbox" role="switch" checked={f.allDay} onChange={(e) => set({ allDay: e.target.checked })} className="h-4 w-4" /></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date" required><input type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value, endDate: f.endDate < e.target.value ? e.target.value : f.endDate })} className={controlClass} />{ERR(errs, "startDate")}</Field>
        <Field label="Start Time" required={!f.allDay}><input type="time" value={f.startTime} disabled={f.allDay} onChange={(e) => set({ startTime: e.target.value })} className={controlClass} />{ERR(errs, "startTime")}</Field>
        <Field label="End Date" required><input type="date" value={f.endDate} min={f.startDate} onChange={(e) => set({ endDate: e.target.value })} className={controlClass} />{ERR(errs, "endDate")}</Field>
        <Field label="End Time" required={!f.allDay}><input type="time" value={f.endTime} disabled={f.allDay} onChange={(e) => set({ endTime: e.target.value })} className={controlClass} />{ERR(errs, "endTime")}</Field>
        <Field label="Audience" required><select value={f.audience} onChange={(e) => set({ audience: e.target.value, classId: null, sectionId: null })} className={controlClass}>{opts.audiences.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}</select>{ERR(errs, "audience")}</Field>
        <Field label="Grade / Section" required={f.audience === "CLASS"}>
          <div className="flex gap-1.5"><select value={f.classId ?? ""} disabled={f.audience !== "CLASS"} onChange={(e) => set({ classId: e.target.value ? Number(e.target.value) : null, sectionId: null })} className={controlClass}><option value="">Grade</option>{opts.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select value={f.sectionId ?? ""} disabled={f.audience !== "CLASS" || f.classId === null} onChange={(e) => set({ sectionId: e.target.value ? Number(e.target.value) : null })} className={controlClass}><option value="">All</option>{secs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          {ERR(errs, "classId")}{ERR(errs, "sectionId")}</Field>
      </div>
      <Field label="Location" optional><input value={f.location} maxLength={150} onChange={(e) => set({ location: e.target.value })} placeholder="Enter location" className={controlClass} /></Field>
      <Field label="Description" optional><textarea value={f.description} maxLength={2000} onChange={(e) => set({ description: e.target.value })} placeholder="Enter description" className={textareaClass} /></Field>
      <Field label="Reminder" optional><select value={f.reminder} onChange={(e) => set({ reminder: e.target.value })} className={controlClass}>{opts.reminders.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}</select>
        {f.reminder !== "NONE" && <p className="mt-1 text-[10px] text-slate-500">The reminder choice is saved with the event. Reminders aren't sent yet.</p>}</Field>
      <div className="flex justify-end gap-2 pt-1"><OutlineButton type="button" onClick={onClose}>Cancel</OutlineButton><PrimaryButton type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save Event"}</PrimaryButton></div>
    </aside>
  );
}

export default function Calendar() {
  const [view, setView] = useState<View>("Month");
  const [cur, setCur] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); });
  const [type, setType] = useState("");
  const [audience, setAudience] = useState("");
  const [opts, setOpts] = useState<CalOptions | null>(null);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [panel, setPanel] = useState<{ event: CalEvent | null; initial: CalEventBody } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadedKey, setLoadedKey] = useState("");

  const [from, to] = useMemo(() => range(view, cur), [view, cur]);
  const key = `${isoDay(from)}|${isoDay(to)}|${type}|${audience}`;
  useEffect(() => { api.schoolCalendar.options().then(setOpts).catch((e) => setError(errText(e))); }, []);
  const load = useCallback(() => {
    api.schoolCalendar.events(isoDay(from), isoDay(to), type, audience).then((r) => { setEvents(r); setLoadedKey(key); }).catch((e) => setError(errText(e)));
  }, [from, to, type, audience, key]);
  useEffect(load, [load]);

  const flash = (m: string) => { setNotice(m); setError(""); setTimeout(() => setNotice(""), 6000); };
  const step = (n: number) => setCur((c) => (view === "Month" || view === "Agenda" ? new Date(c.getFullYear(), c.getMonth() + n, 1) : addDays(c, n * (view === "Week" ? 7 : 1))));
  const today = isoDay(new Date());
  const title = view === "Month" || view === "Agenda" ? cur.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : view === "Week" ? `${from.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${to.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : longDay(cur);
  const openNew = (date: string) => setPanel({ event: null, initial: blank(date) });
  const openEdit = (e: CalEvent) => setPanel({ event: e, initial: { title: e.title, type: e.type, allDay: e.allDay, startDate: e.startDate, startTime: e.startTime ?? "09:00", endDate: e.endDate, endTime: e.endTime ?? "10:00", audience: e.audience, classId: e.classId, sectionId: e.sectionId, location: e.location ?? "", description: e.description ?? "", reminder: e.reminder } });
  const typeLabel = (c: string) => opts?.types.find((t) => t.code === c)?.label ?? c;
  const pill = (e: CalEvent, wide = false) => (
    <button key={e.id} type="button" title={`${e.title} · ${timeText(e)} · ${e.audienceLabel}`} onClick={(ev) => { ev.stopPropagation(); openEdit(e); }} className={`block w-full truncate rounded-md px-2 py-1 text-left text-[11px] font-semibold ${TONE[e.type] ?? TONE.OTHER} ${wide ? "py-1.5 text-[12px]" : ""}`}>{!e.allDay && e.startTime && wide ? `${t12(e.startTime)} ` : ""}{e.title}</button>
  );
  const days = view === "Month" ? Array.from({ length: 42 }, (_, i) => addDays(from, i)) : view === "Week" ? Array.from({ length: 7 }, (_, i) => addDays(from, i)) : [cur];
  const ready = loadedKey === key;

  return (
    <SchoolLayout>
      <div className={`grid items-start gap-4 ${panel ? "xl:grid-cols-[minmax(0,1fr)_400px]" : ""}`}>
        <section className="space-y-4 rounded-xl border border-[#d8e9fb] bg-white p-5">
          <h1 className="flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.5px] text-[#101b69]"><span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600"><CalendarDays size={20} /></span>Classzy Calendar</h1>
          <div className="flex flex-wrap items-center gap-2">
            <OutlineButton type="button" onClick={() => { const n = new Date(); setCur(new Date(n.getFullYear(), n.getMonth(), n.getDate())); }}>Today</OutlineButton>
            <button type="button" aria-label="Previous" onClick={() => step(-1)} className="rounded-md border border-blue-200 p-2 hover:bg-blue-50"><ChevronLeft size={15} /></button>
            <button type="button" aria-label="Next" onClick={() => step(1)} className="rounded-md border border-blue-200 p-2 hover:bg-blue-50"><ChevronRight size={15} /></button>
            <span className="min-w-[170px] px-2 text-[16px] font-extrabold text-[#101b69]">{title}</span>
            <div className="ml-auto flex overflow-hidden rounded-md border border-blue-200">{VIEWS.map((v) => <button key={v} type="button" onClick={() => setView(v)} className={`px-3.5 py-2 text-[12px] font-semibold ${view === v ? "bg-[#0875fb] text-white" : "hover:bg-blue-50"}`}>{v}</button>)}</div>
            <PrimaryButton type="button" onClick={() => openNew(today)}><Plus size={14} />Add Event</PrimaryButton>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Event Type"><select value={type} onChange={(e) => setType(e.target.value)} className={controlClass}><option value="">All Event Types</option>{opts?.types.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}</select></Field>
            <Field label="Audience"><select value={audience} onChange={(e) => setAudience(e.target.value)} className={controlClass}><option value="">All Audiences</option>{opts?.audiences.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}</select></Field>
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          {notice && <Notice tone="info">{notice}</Notice>}

          {view === "Month" && (
            <div className="overflow-x-auto"><div className="min-w-[640px] overflow-hidden rounded-lg border border-[#cfe0f6]">
              <div className="grid grid-cols-7 bg-[#e8f1fd] text-center text-[13px] font-bold text-[#13205f]">{DOW.map((d) => <div key={d} className="py-2.5">{d}</div>)}</div>
              <div className="grid grid-cols-7">{days.map((d) => { const iso = isoDay(d); const ev = onDay(events, iso); const out = d.getMonth() !== cur.getMonth();
                return (
                  <div key={iso} onClick={() => openNew(iso)} className={`min-h-[96px] cursor-pointer space-y-1 border-b border-r border-[#e3eefc] p-1.5 hover:bg-[#f8fbff] ${out ? "bg-slate-50/70 text-slate-400" : ""}`}>
                    <div className={`text-[13px] font-bold ${iso === today ? "grid h-6 w-6 place-items-center rounded-full bg-[#0875fb] text-white" : ""}`}>{d.getDate()}</div>
                    {ev.slice(0, 3).map((e) => pill(e))}
                    {ev.length > 3 && <button type="button" onClick={(x) => { x.stopPropagation(); setCur(d); setView("Day"); }} className="text-[10px] font-semibold text-blue-600 hover:underline">+{ev.length - 3} more</button>}
                  </div>); })}</div>
            </div></div>
          )}

          {(view === "Week" || view === "Day") && (
            <div className={`grid gap-2 ${view === "Week" ? "md:grid-cols-7" : ""}`}>
              {days.map((d) => { const iso = isoDay(d); const ev = onDay(events, iso); return (
                <div key={iso} className="min-h-[200px] space-y-1.5 rounded-lg border border-[#cfe0f6] p-2">
                  <div className="flex items-center justify-between"><span className={`text-[12px] font-bold ${iso === today ? "text-blue-600" : "text-[#13205f]"}`}>{view === "Week" ? d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }) : "Schedule"}</span>
                    <button type="button" aria-label={`Add event on ${iso}`} onClick={() => openNew(iso)} className="rounded p-1 text-blue-600 hover:bg-blue-50"><Plus size={13} /></button></div>
                  {ev.length === 0 && <p className="text-[11px] text-slate-400">Nothing scheduled.</p>}
                  {ev.map((e) => view === "Day" ? (
                    <button key={e.id} type="button" onClick={() => openEdit(e)} className={`block w-full rounded-lg px-3 py-2 text-left ${TONE[e.type] ?? TONE.OTHER}`}><span className="block text-[13px] font-bold">{e.title}</span><span className="block text-[11px]">{timeText(e)}{e.location ? ` · ${e.location}` : ""} · {e.audienceLabel}</span></button>
                  ) : pill(e, true))}
                </div>); })}
            </div>
          )}

          {view === "Agenda" && (
            <ul className="divide-y divide-[#e3eefc] rounded-lg border border-[#cfe0f6]">
              {ready && events.length === 0 && <li className="px-4 py-10 text-center text-[12px] text-slate-500">No events this month.</li>}
              {events.map((e) => (
                <li key={e.id}><button type="button" onClick={() => openEdit(e)} className="flex w-full items-start gap-4 px-4 py-3 text-left hover:bg-blue-50">
                  <span className="w-[120px] shrink-0 text-[12px] font-bold text-[#101b69]">{parseDay(e.startDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}{e.endDate !== e.startDate && <span className="block font-normal text-slate-500">to {parseDay(e.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold text-[#17245e]">{e.title}</span><span className="block text-[11px] text-slate-500">{timeText(e)}{e.location ? ` · ${e.location}` : ""} · {e.audienceLabel}</span></span>
                  <span className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold ${TONE[e.type] ?? TONE.OTHER}`}>{typeLabel(e.type)}</span>
                </button></li>))}
            </ul>
          )}
          <p className="text-[11px] text-slate-500">Events are kept here for the school's records. They aren't sent to parents or staff, and reminders aren't sent yet.</p>
        </section>
        {panel && opts && <div key={panel.event?.id ?? `new-${panel.initial.startDate}`}><EventPanel opts={opts} event={panel.event} initial={panel.initial} onClose={() => setPanel(null)} onError={(m) => setError(m)} onSaved={(m) => { setPanel(null); flash(m); load(); }} /></div>}
      </div>
    </SchoolLayout>
  );
}
