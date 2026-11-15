import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, session } from "../../services/api";
import type { AcademicYear, Institution } from "../../services/api";
import { Notice, controlClass } from "./AcademicShared";

const YEAR_KEY = "classzy.academicYearId";

/** Turns anything thrown by the api client into text for a Notice. Field errors are appended. */
export function errText(e: unknown): string {
  if (e instanceof ApiError) {
    const details = Object.values(e.fieldErrors);
    return details.length ? `${e.message} ${details.join(" ")}` : e.message;
  }
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}

/**
 * Which institution is being managed.
 * Institution Admins always use their own. A Super Admin picks one (kept in the session, sent as X-Institution-Id).
 */
export function useActiveInstitution() {
  const isSuper = session.user()?.role === "SUPER_ADMIN";
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionId, setId] = useState<number | null>(session.institutionId());

  useEffect(() => {
    if (!isSuper) return;
    let live = true;
    api.institutions.list({ status: "ALL" })
      .then((list) => {
        if (!live) return;
        const usable = list.filter((i) => i.status !== "ARCHIVED");
        setInstitutions(usable);
        const stored = session.institutionId();
        if (!usable.some((i) => i.id === stored)) {
          const next = usable[0]?.id ?? null;
          session.setInstitution(next);
          setId(next);
        }
      })
      .catch(() => { /* the page itself shows its own load error */ });
    return () => { live = false; };
  }, [isSuper]);

  const change = useCallback((id: number) => { session.setInstitution(id); setId(id); }, []);
  return { isSuper, institutions, institutionId, change };
}
export type ActiveInstitution = ReturnType<typeof useActiveInstitution>;

/** Academic years of the active institution + the one currently selected on the page. */
export function useAcademicYears(institutionId: number | null) {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearId, setYearId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (institutionId === null) { setYears([]); setYearId(null); setLoading(false); return; }
    let live = true;
    setLoading(true);
    api.years.list()
      .then((list) => {
        if (!live) return;
        setYears(list);
        setError("");
        setYearId((prev) => {
          let stored = 0;
          try { stored = Number(sessionStorage.getItem(YEAR_KEY)); } catch { /* storage unavailable */ }
          const keep = [prev, stored].find((v) => v !== null && v > 0 && list.some((y) => y.id === v));
          return keep ?? list.find((y) => y.current)?.id ?? list[0]?.id ?? null;
        });
      })
      .catch((e) => { if (live) setError(errText(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [institutionId, tick]);

  const choose = useCallback((id: number) => {
    setYearId(id);
    try { sessionStorage.setItem(YEAR_KEY, String(id)); } catch { /* storage unavailable */ }
  }, []);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const year = years.find((y) => y.id === yearId) ?? null;
  return { years, yearId, year, choose, loading, error, reload };
}
export type AcademicYears = ReturnType<typeof useAcademicYears>;

/** Institution picker (Super Admin only) and, optionally, the academic-year picker. Goes in the page header. */
export function ContextBar({ inst, years }: { inst: ActiveInstitution; years?: AcademicYears }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {inst.isSuper && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#17245e]">Institution</span>
          <select
            className={`${controlClass} !w-[200px]`}
            value={inst.institutionId ?? ""}
            onChange={(e) => inst.change(Number(e.target.value))}
            aria-label="Institution"
          >
            {inst.institutions.length === 0 && <option value="">No institutions</option>}
            {inst.institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
      )}
      {years && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#17245e]">Academic Year</span>
          <select
            className={`${controlClass} !w-[140px]`}
            value={years.yearId ?? ""}
            onChange={(e) => years.choose(Number(e.target.value))}
            disabled={years.years.length === 0}
            aria-label="Academic year"
          >
            {years.years.length === 0 && <option value="">No years yet</option>}
            {years.years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.current ? " (current)" : ""}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

/** Shown on pages that need an academic year when the institution has none yet. */
export function NoYearNotice({ years, inst }: { years: AcademicYears; inst: ActiveInstitution }) {
  if (years.loading || years.error || years.years.length > 0) return null;
  if (inst.institutionId === null) {
    return <Notice tone="info">{inst.isSuper ? "Create an institution first, then choose it above." : "Your account isn't linked to an institution."}</Notice>;
  }
  return (
    <Notice tone="info">
      This institution has no academic year yet. <Link to="/institutions/settings/academic/year" className="font-bold underline">Create an academic year</Link> first.
    </Notice>
  );
}
