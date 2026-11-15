/**
 * Classzy API client  ->  put this file at  src/services/api.ts
 *
 * One small wrapper around fetch(). It:
 *   - adds the JWT  (Authorization: Bearer ...)
 *   - adds X-Institution-Id (needed when you are signed in as Super Admin)
 *   - turns every error into a normal JS Error whose .message is the text to show in the UI
 *
 * Base URL: set VITE_API_URL in a .env file in the React project (default http://localhost:8080/api).
 */

const BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

const TOKEN_KEY = "classzy.token";
const USER_KEY = "classzy.user";
const INSTITUTION_KEY = "classzy.institutionId";

/* ------------------------------------------------------------------ types (mirror the Java DTOs) */

export type Role = "SUPER_ADMIN" | "INSTITUTION_ADMIN" | "TEACHER";
export type ProgressionStatus = "ELIGIBLE" | "REVIEW" | "RETAIN";
export type CriteriaType = "PERCENTAGE" | "GRADE_POINT" | "PASS_ALL";
export type SubjectScope = "ALL_SUBJECTS" | "CORE_SUBJECTS" | "ANY_SUBJECT";

export type UserInfo = { id: number; email: string; fullName: string; role: Role; institutionId: number | null };
export type LoginResponse = { accessToken: string; tokenType: string; expiresInSeconds: number; user: UserInfo };

/** Code of an institution type (SCHOOL, COLLEGE, ... or one you add under Institution Types). */
export type InstitutionType = string;
export type InstitutionStatus = "DRAFT" | "ACTIVE" | "TRIAL" | "EXPIRING_SOON" | "EXPIRED" | "ARCHIVED";
export type GradingSystemType = "PERCENTAGE" | "GRADE" | "CGPA" | "CUSTOM";
export type PlanType = "TRIAL" | "BASIC" | "STANDARD" | "PREMIUM" | "PROFESSIONAL" | "ENTERPRISE";
export type Weekday = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
export type ModuleCode =
  | "STUDENT_INFORMATION" | "ACADEMICS" | "ATTENDANCE" | "ASSIGNMENTS" | "EXAMS_RESULTS" | "FEES_PAYMENTS"
  | "LEAVE_MANAGEMENT" | "CLUBS_ACTIVITIES" | "COMMUNICATIONS" | "TRANSPORT" | "LIBRARY" | "HOSTEL"
  | "INVENTORY" | "ALUMNI";

/** One row of the institutions list (also what the Super Admin's institution picker uses). */
export type Institution = {
  id: number; name: string; institutionType: InstitutionType; status: InstitutionStatus;
  contactName: string | null; email: string | null; city: string | null; state: string | null;
  planType: PlanType | null; subscriptionEnd: string | null;
  studentCount: number; teacherCount: number; hasLogo: boolean; createdAt: string; updatedAt: string;
};

/** Body for create / update. draft=true lets you save with only the name filled in. */
export type InstitutionInput = {
  name: string; institutionType: InstitutionType | null; affiliation: string | null; establishmentYear: number | null;
  description: string | null; contactName: string | null; designation: string | null; email: string | null;
  phoneCode: string | null; phone: string | null; altContactName: string | null; altDesignation: string | null;
  altEmail: string | null; altPhoneCode: string | null; altPhone: string | null; address: string | null;
  country: string | null; state: string | null; city: string | null; pinCode: string | null;
  academicStartMonth: number | null; dateFormat: string | null; timeZone: string | null; language: string | null;
  gradingSystem: GradingSystemType | null; currency: string | null; workingDays: Weekday[];
  startTime: string | null; endTime: string | null; planType: PlanType | null;
  subscriptionStart: string | null; subscriptionEnd: string | null;
  expectedStudents: number | null; expectedTeachers: number | null; modules: ModuleCode[]; draft: boolean;
};

export type InstitutionDetail = Omit<InstitutionInput, "draft"> & {
  id: number; status: InstitutionStatus; lifecycle: "DRAFT" | "ACTIVE" | "ARCHIVED";
  academicStartMonth: number; hasLogo: boolean; hasBanner: boolean;
  studentCount: number; teacherCount: number; createdAt: string; updatedAt: string;
};
export type InstitutionFilters = { search?: string; type?: InstitutionType; status?: InstitutionStatus | "ALL" };

/* ---- institution types and branches ---- */
export type InstitutionTypeRow = {
  id: number; code: string; name: string; description: string | null; active: boolean; systemType: boolean; institutionCount: number;
};
export type InstitutionTypeInput = { name: string; description?: string | null; active?: boolean };

export type BranchKind = "CAMPUS" | "BRANCH";
export type BranchStatus = "ACTIVE" | "INACTIVE";
export type Branch = {
  id: number; institutionId: number; institutionName: string; name: string; code: string | null; branchType: BranchKind;
  main: boolean; status: BranchStatus; headName: string | null; phone: string | null; email: string | null;
  address: string | null; city: string | null; state: string | null; pinCode: string | null;
  establishmentYear: number | null; notes: string | null; updatedAt: string;
};
export type BranchInput = {
  institutionId?: number; name: string; code: string | null; branchType: BranchKind; main: boolean; status: BranchStatus;
  headName: string | null; phone: string | null; email: string | null; address: string | null; city: string | null;
  state: string | null; pinCode: string | null; establishmentYear: number | null; notes: string | null;
};

/* ---- dashboard, activity, health, billing, users ---- */
export type ActivityEntry = {
  id: number; createdAt: string; actorEmail: string | null; actorRole: string | null; action: string;
  entityType: string | null; entityId: number | null; institutionId: number | null; description: string;
};
export type Paged<T> = { items: T[]; total: number; page: number; size: number };
export type HealthStatus = "OPERATIONAL" | "DEGRADED" | "DOWN" | "NOT_CONFIGURED";
export type HealthCheck = { name: string; status: HealthStatus; detail: string };
export type HealthSnapshot = {
  overall: HealthStatus; checkedAt: string; uptimeSeconds: number; memoryUsedPct: number; diskFreePct: number; checks: HealthCheck[];
};
export type HealthLogRow = {
  id: number; checkedAt: string; overall: HealthStatus; applicationOk: boolean; databaseOk: boolean;
  databaseMs: number | null; storageOk: boolean; memoryUsedPct: number | null; diskFreePct: number | null; detail: string | null;
};
export type RevenueMonth = { month: string; label: string; revenue: number; cumulative: number };
export type RevenueSummary = { annualRevenue: number; financialYear: string; thisMonth: number; paymentCount: number; months: RevenueMonth[] };
export type Payment = {
  id: number; institutionId: number; institutionName: string; amount: number; paidOn: string;
  planType: PlanType | null; method: string; reference: string | null; note: string | null;
};
export type PaymentInput = {
  institutionId: number; amount: number; paidOn: string; planType?: PlanType | null; method?: string; reference?: string | null; note?: string | null;
};
export type SuperAdminDashboard = {
  users: { students: number; teachers: number; parents: number | null; staff: number };
  revenue: RevenueSummary; activity: ActivityEntry[]; health: HealthSnapshot;
};
export type PlatformUser = {
  id: number; type: "STUDENT" | "TEACHER" | "STAFF"; name: string; email: string | null; detail: string | null;
  institutionId: number | null; institutionName: string | null; active: boolean;
};

export type AcademicYear = {
  id: number; name: string; shortName: string | null; startDate: string; endDate: string;
  current: boolean; active: boolean; description: string | null;
};
export type AcademicYearInput = Omit<AcademicYear, "id">;

export type Term = {
  id: number; academicYearId: number; name: string; startDate: string; endDate: string;
  weightage: number; active: boolean; description: string | null;
};
export type TermInput = Omit<Term, "id">;

export type Grade = { id: number; grade: string; marksFrom: number; marksTo: number; gradePoint: number; description: string | null };
export type GradeInput = Omit<Grade, "id">;
export type GradeKind = "GRADE_POINT" | "PERCENTAGE" | "CGPA";
export type GradingSystem = {
  id: number; name: string; description: string | null; active: boolean; gradeType: GradeKind; totalMarks: number;
  classFrom: number | null; classTo: number | null; passPercentage: number; grades: Grade[];
};
export type GradingSystemInput = {
  name: string; description: string | null; active: boolean;
  gradeType?: GradeKind; totalMarks?: number; classFrom?: number | null; classTo?: number | null; passPercentage?: number;
};

export type Subject = {
  id: number; academicYearId: number; name: string; code: string; category: string;
  classLevels: number[]; active: boolean; description: string | null;
};
export type SubjectInput = Omit<Subject, "id">;

export type SchoolClass = {
  id: number; academicYearId: number; name: string; gradeLevel: number | null; active: boolean;
  description: string | null; studentCount: number; sectionCount: number;
};
export type SchoolClassInput = { academicYearId: number; name: string; gradeLevel: number | null; active: boolean; description: string | null };

export type Section = {
  id: number; schoolClassId: number; className: string; name: string; teacherId: number | null;
  teacherName: string | null; room: string | null; maxStudents: number | null; active: boolean;
  description: string | null; studentCount: number;
};
export type SectionInput = {
  schoolClassId: number; name: string; teacherId: number | null; room: string | null;
  maxStudents: number | null; active: boolean; description: string | null;
};

export type PromotionRule = {
  id: number; academicYearId: number; name: string; fromClass: string; toClass: string;
  criteriaType: CriteriaType; minValue: number | null; subjectScope: SubjectScope;
  criteria: string; additionalConditions: string | null; active: boolean;
};
export type PromotionRuleInput = Omit<PromotionRule, "id" | "criteria"> & { criteria?: string | null };
export type PreviewRow = {
  studentId: number; admissionNo: string; studentName: string; currentClass: string | null;
  nextClass: string | null; status: ProgressionStatus; remarks: string | null;
};
export type ProgressionOverride = {
  academicYearId: number; studentId: number; status: ProgressionStatus; nextClass: string | null; remarks: string | null;
};

export type Teacher = { id: number; fullName: string; email: string | null; phone: string | null; active: boolean };
export type TeacherInput = Omit<Teacher, "id">;

export type Student = {
  id: number; admissionNo: string; fullName: string; schoolClassId: number | null; className: string | null;
  sectionId: number | null; sectionName: string | null; active: boolean;
};
export type StudentInput = { admissionNo: string; fullName: string; schoolClassId: number | null; sectionId: number | null; active: boolean };


/* ---- attendance settings ---- */
export type AttendanceSettings = {
  attendanceMode: "DAILY" | "PERIOD_WISE" | "BOTH"; defaultMethod: "MANUAL" | "BIOMETRIC" | "RFID" | "MOBILE_APP"; defaultMark: "PRESENT" | "ABSENT";
  lateAfterMinutes: number; halfDayMinutes: number;
  biometric: boolean; rfid: boolean; mobileApp: boolean; gps: boolean; offlineMode: boolean; autoSync: boolean;
  parentView: boolean; studentView: boolean; remarksEnabled: boolean; adjustmentEnabled: boolean;
  minAttendancePct: number; countPresent: boolean; countLate: boolean; countHalfDay: boolean;
  countOnLeave: boolean; countSickLeave: boolean; countExcused: boolean;
  excludeHolidays: boolean; excludeWeekOffs: boolean; gracePeriodMinutes: number; autoAbsentTime: string;
  workingDays: Weekday[]; startTime: string; endTime: string;
};
export type AttendanceCategory = "REGULAR" | "LEAVE" | "NON_WORKING" | "SPECIAL";
export type AttendanceCountsAs = "PRESENT" | "ABSENT" | "PRESENT_LATE" | "PRESENT_HALF" | "LEAVE" | "NON_WORKING" | "EXCUSED";
export type AttendanceTypeBody = {
  name: string; code: string; category: AttendanceCategory; countsAs: AttendanceCountsAs; color: string;
  defaultType: boolean; active: boolean; description: string | null;
};
export type AttendanceType = AttendanceTypeBody & { id: number };
export type AttendanceRuleBody = {
  name: string; description: string | null; appliesTo: "ALL_STUDENTS" | "ALL_STAFF" | "ALL"; priority: number; active: boolean;
  conditionField: string; conditionOperator: string; conditionValue: string; actionTypeCode: string;
  notifyParent: boolean; includeInReports: boolean;
};
export type AttendanceRule = AttendanceRuleBody & { id: number };
export type AttendanceTemplateBody = { name: string; body: string; active: boolean };
export type AttendanceTemplate = AttendanceTemplateBody & { id: number };
export type AttendanceEventBody = {
  name: string; triggerCode: string; recipients: string[]; channels: string[];
  templateId: number | null; customMessage: string | null; active: boolean;
};
export type AttendanceEvent = AttendanceEventBody & { id: number };

/* ---- general settings (stored on the institution profile) ---- */
export type GeneralSettings = {
  name: string; institutionType: string; affiliation: string | null; establishmentYear: number | null; description: string | null;
  email: string | null; phoneCode: string | null; phone: string | null; address: string | null; country: string | null;
  state: string | null; city: string | null; pinCode: string | null;
  dateFormat: string; timeZone: string; language: string; currency: string; academicStartMonth: number;
  workingDays: Weekday[]; startTime: string; endTime: string; gradingSystem: GradingSystemType | null;
};


/* ---- exam & grading settings ---- */
export type ExamCategory = "INTERNAL" | "EXTERNAL" | "PRACTICAL";
export type ExamTypeBody = {
  academicYearId: number; name: string; code: string; description: string | null; classFrom: number | null; classTo: number | null;
  weightage: number; category: ExamCategory; active: boolean;
};
export type ExamType = ExamTypeBody & { id: number };
export type ReportKind = "TERM_WISE" | "ANNUAL" | "PERIODIC" | "CERTIFICATE";
export type ReportTemplateBody = {
  academicYearId: number; name: string; reportType: ReportKind; classFrom: number | null; classTo: number | null; sections: string[]; active: boolean;
};
export type ReportTemplate = ReportTemplateBody & { id: number };
export type ResultTemplateBody = {
  academicYearId: number; name: string; calculationType: "WEIGHTED" | "SUBJECT_BASED" | "BOARD_PATTERN"; classFrom: number | null; classTo: number | null;
  examTypeIds: number[]; roundingRule: string; displayFormat: string; active: boolean;
};
export type ResultTemplate = ResultTemplateBody & { id: number };
export type ExamSettings = {
  publicationMethod: "MANUAL" | "AUTO" | "SCHEDULED"; showSubjectRank: boolean; allowReevaluation: boolean; defaultGradingId: number | null;
  maxMarksPerSubject: number; considerAttendance: boolean;
  teachersEnterMarks: boolean; reviewApproval: boolean; editBeforePublish: boolean; notifyOnPublish: boolean; reevaluationProcess: boolean;
  approvalLevels: string[]; workflowRemarks: string | null;
  showGradeAndMarks: boolean; parentAccess: boolean; showTeacherComments: boolean; autoGeneratePdf: boolean;
  showAttendanceSummary: boolean; pdfTemplate: "DEFAULT" | "DETAILED" | "COMPACT"; includeSchoolLogo: boolean;
};


/* ---- timetable settings ---- */
export type TimetableGeneral = {
  configName: string; academicYearId: number | null; description: string | null; timeFormat: "H12" | "H24"; periodNaming: "PERIOD_N" | "P_N" | "NUMBER";
  defaultDuration: number; allowVariableDuration: boolean; allowZeroPeriod: boolean; allowExtraPeriod: boolean; enableBreaks: boolean;
  enableLunchBreak: boolean; showPeriodNumber: boolean; halfDayEnabled: boolean; halfDayEndTime: string;
  workingDays: Weekday[]; startTime: string; endTime: string;
};
export type SlotType = "TEACHING" | "BREAK" | "LUNCH" | "OTHER";
export type TimetableSlotBody = { name: string; slotType: SlotType; startTime: string; endTime: string; active: boolean };
export type TimetableSlot = TimetableSlotBody & { id: number; durationMinutes: number };
export type HolidayType = "NATIONAL" | "FESTIVAL" | "VACATION" | "SCHOOL_EVENT" | "OTHER";
export type HolidayBody = { name: string; holidayType: HolidayType; startDate: string; endDate: string; active: boolean };
export type Holiday = HolidayBody & { id: number };
export type TimetableRules = {
  maxPeriodsPerDay: number; maxConsecutiveTeacher: number; minBreakBetween: number; maxConsecutiveSubject: number;
  allowDoublePeriods: boolean; allowFreePeriods: boolean; preferMorningCore: boolean;
  genAvoidTeacherConflicts: boolean; genAvoidRoomConflicts: boolean; genDistributeEvenly: boolean; genWeeklyFrequency: boolean;
  genWorkingHours: boolean; genPreferredSlots: boolean; genManualAdjust: boolean; genAvoidConsecutive: boolean;
  genDailyDiversity: boolean; genTeacherWorkload: boolean; genAiSuggestions: boolean; rulesDescription: string | null;
  onTeacherConflict: string; onRoomConflict: string; onSubjectConflict: string; onLimitExceeded: string;
  conflictOrder: string[]; advAutoResolve: boolean; advReport: boolean; advHighlight: boolean; advManualOverride: boolean;
};
export type RulePriority = { id: number; code: string; name: string; position: number; enabled: boolean };
export type BreakTypeBody = { name: string; code: string; defaultDuration: number; color: string; applicableFor: string[]; active: boolean; description: string | null };
export type BreakTypeRow = BreakTypeBody & { id: number };
export type BreakRuleBody = {
  name: string; breakTypeId: number | null; appliesTo: "ALL_CLASSES" | "GRADE_RANGE"; classFrom: number | null; classTo: number | null;
  startTime: string; durationMinutes: number; frequency: "DAILY" | "SELECTED_DAYS"; days: Weekday[]; active: boolean; description: string | null;
};
export type BreakRuleRow = BreakRuleBody & { id: number; breakTypeName: string | null };

/* ---- communication settings */
export type CommSettings = Record<string, string>;
export type CommChannel = "EMAIL" | "SMS" | "PUSH";
export type SenderIdBody = { senderId: string; senderType: "ALPHANUMERIC" | "NUMERIC"; status: "APPROVED" | "PENDING" | "REJECTED"; defaultSender: boolean };
export type SenderIdRow = SenderIdBody & { id: number };
export type CommTemplateBody = { channel: CommChannel; name: string; category: string; title: string | null; body: string; active: boolean };
export type CommTemplateRow = CommTemplateBody & { id: number; updatedAt: string };
export type PushCategoryBody = { name: string; description: string | null; active: boolean; mobile: boolean; web: boolean };
export type PushCategoryRow = PushCategoryBody & { id: number };
export type CommVariable = { name: string; description: string };
export type ConnectionTest = { ok: boolean; message: string };

/* ---- transport */
export type TransportStatus = "ACTIVE" | "INACTIVE";
export type TransportRouteBody = { name: string; code: string; startLocation: string; endLocation: string; distanceKm: number | null; durationMinutes: number | null; status: TransportStatus; description: string | null };
export type TransportRouteRow = TransportRouteBody & { id: number; stopCount: number; vehicleCount: number };
export type StopType = "PICKUP_DROP" | "PICKUP" | "DROP";
export type TransportStopBody = {
  routeId: number; name: string; code: string | null; sequenceNo: number | null; latitude: number | null; longitude: number | null; address: string | null;
  arrivalTime: string | null; departureTime: string | null; radiusMeters: number; stopType: StopType; status: TransportStatus;
};
export type TransportStopRow = TransportStopBody & { id: number; sequenceNo: number };
export type VehicleType = "BUS" | "VAN" | "CAR" | "OTHER";
export type FuelType = "DIESEL" | "PETROL" | "CNG" | "ELECTRIC" | "OTHER";
export type VehicleStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";
export type TransportVehicleBody = {
  vehicleNo: string; registrationNo: string; vehicleType: VehicleType; make: string; model: string; manufactureYear: number | null; seatingCapacity: number | null;
  standingCapacity: number | null; fuelType: FuelType; insuranceExpiry: string | null; pucExpiry: string | null; status: VehicleStatus; routeId: number | null; driverId: number | null; remarks: string | null;
};
export type TransportVehicleRow = TransportVehicleBody & { id: number; seatingCapacity: number; routeName: string | null; driverName: string | null };
export type DriverStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";
export type LicenseType = "LMV" | "HMV" | "HGMV" | "HPMV";
export type TransportDriverBody = {
  code: string | null; name: string; mobile: string; dateOfBirth: string | null; gender: "MALE" | "FEMALE" | "OTHER" | null; address: string | null; licenseNo: string; licenseExpiry: string;
  licenseType: LicenseType; experienceYears: number | null; emergencyName: string | null; emergencyPhone: string | null; status: DriverStatus; remarks: string | null;
};
export type TransportDriverRow = TransportDriverBody & { id: number; code: string; assignedVehicleNo: string | null; assignedRouteName: string | null };

/* ------------------------------------------------------------------ session helpers */

// "Remember me" ticked  -> localStorage   (stays signed in after the browser closes)
// "Remember me" cleared -> sessionStorage (signed out when the browser/tab closes)
function stores(): Storage[] {
  try { return [sessionStorage, localStorage]; } catch { return []; }
}
function read(key: string): string | null {
  for (const s of stores()) {
    try { const v = s.getItem(key); if (v !== null) return v; } catch { /* storage unavailable */ }
  }
  return null;
}
function remove(key: string) {
  for (const s of stores()) {
    try { s.removeItem(key); } catch { /* storage unavailable */ }
  }
}
function tokenIsInSession(): boolean {
  try { return sessionStorage.getItem(TOKEN_KEY) !== null; } catch { return false; }
}
/** `remember` decides where to store; when omitted, follows wherever the token already lives. */
function write(key: string, value: string | null, remember?: boolean) {
  remove(key);
  if (value === null) return;
  const useSession = remember === undefined ? tokenIsInSession() : !remember;
  try { (useSession ? sessionStorage : localStorage).setItem(key, value); } catch { /* storage unavailable */ }
}

export const session = {
  token: () => read(TOKEN_KEY),
  user: (): UserInfo | null => {
    const raw = read(USER_KEY);
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  },
  /** The institution being managed. Institution Admins use their own; a Super Admin picks one. */
  institutionId: (): number | null => {
    const stored = read(INSTITUTION_KEY);
    return stored ? Number(stored) : (session.user()?.institutionId ?? null);
  },
  setInstitution: (id: number | null) => write(INSTITUTION_KEY, id === null ? null : String(id)),
  isSignedIn: () => Boolean(read(TOKEN_KEY)),
  clear: () => { remove(TOKEN_KEY); remove(USER_KEY); remove(INSTITUTION_KEY); },
};

/* ------------------------------------------------------------------ core request */

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;
  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";   // the browser sets multipart boundaries itself
  const token = session.token();
  if (token) headers.Authorization = `Bearer ${token}`;
  const institutionId = session.institutionId();
  if (institutionId !== null) headers["X-Institution-Id"] = String(institutionId);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method, headers, body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body) });
  } catch {
    throw new ApiError("Can't reach the server. Check that the backend is running.", 0);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token) session.clear();            // token expired -> sign in again
    const message =
      data?.message ??
      (res.status === 401 ? "Your session has expired. Please sign in again."
        : res.status === 403 ? "You don't have permission to do that."
        : `Request failed (${res.status}).`);
    throw new ApiError(message, res.status, data?.errors ?? {});
  }
  return data as T;
}

const qs = (params: Record<string, string | number | null | undefined>) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== null && v !== undefined) q.set(k, String(v)); });
  const s = q.toString();
  return s ? `?${s}` : "";
};

/** create / update / remove for a plain REST resource */
function crud<T, Input>(base: string) {
  return {
    create: (body: Input) => request<T>("POST", base, body),
    update: (id: number, body: Input) => request<T>("PUT", `${base}/${id}`, body),
    remove: (id: number) => request<void>("DELETE", `${base}/${id}`),
  };
}

/* ------------------------------------------------------------------ the API */

/* ---- catalog (library lists, custom fields, integrations) */
export type CatalogKind = "LIB_CATEGORY" | "LIB_STATUS" | "LIB_ISSUE_RULE" | "LIB_FINE_RULE" | "CUSTOM_FIELD" | "INTEGRATION";
export interface CatalogBody { name: string; code: string | null; active: boolean; attrs: Record<string, string>; }
export interface CatalogItem { id: number; name: string; code: string | null; active: boolean; position: number; attrs: Record<string, string>; }

/* ---- user management */
export type UserType = "STUDENT" | "TEACHER" | "PARENT" | "STAFF" | "ADMINISTRATOR";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export interface UserBody {
  userType: UserType; firstName: string; lastName: string; email: string; phoneCode: string; phone: string; dateOfBirth: string | null; gender: string | null;
  status: UserStatus; validFrom: string | null; validTo: string | null; notes: string | null;
  passwordMode: "AUTO" | "CUSTOM"; password: string | null; mustChangePassword: boolean; twoFactor: boolean; resetAfterDays: number | null;
  roles: string[]; institutionId: number | null; dataScope: string; academicYearId: number | null;
  employeeId: string | null; department: string | null; designation: string | null; joinedOn: string | null; altEmail: string | null; emergencyContact: string | null;
  address1: string | null; address2: string | null; city: string | null; state: string | null; pinCode: string | null;
  notifyEvents: string[]; language: string; timezone: string; notifyVia: string[];
}
export interface UserRow { id: number; fullName: string; email: string; userType: UserType; roles: string[]; institutionId: number | null; institutionName: string | null; status: UserStatus; lastLogin: string | null; }
export interface UserPage { items: UserRow[]; total: number; page: number; size: number; }
export interface UserDetail extends Omit<UserBody, "passwordMode" | "password" | "institutionId"> {
  id: number; userCode: string; fullName: string; institutionId: number | null; institutionName: string | null; institutionCode: string | null; institutionType: string | null;
  academicYearName: string | null; createdAt: string; lastLogin: string | null;
}
export interface UserSummary { total: number; byType: Record<string, number>; newThisMonth: Record<string, number>; active: number; inactive: number; suspended: number; }
export interface UserRoleView { code: string; name: string; description: string; permissions: { module: string; level: "VIEW" | "MANAGE" }[]; }
export interface UserActivity { at: string; actor: string | null; action: string; description: string; }

/* ---- system management */
export interface SysCard { status: string; label: string; detail: string }
export interface SysBackup { id: number; type: "FULL" | "DATABASE" | "CONFIGURATION"; trigger: string; status: "SUCCESS" | "FAILED"; sizeBytes: number; tables: number; rows: number; note: string | null; createdBy: string | null; createdAt: string }
export interface SysInstance { id: number; name: string; institutionId: number | null; institution: string | null; kind: string; environment: string; version: string | null; status: string; lastRefresh: string | null; notes: string | null }
export interface SysInstanceBody { name: string; institutionId: number | null; kind: string; environment: string; version: string; status: string; notes: string }
export interface SysIntegration { id: number; name: string; type: string; source: string | null; target: string | null; endpoint: string | null; status: string; lastRun: string | null; lastMs: number | null; message: string | null }
export interface SysIntegrationBody { name: string; type: string; source: string; target: string; endpoint: string }
export interface SysDataRow { code: string; name: string; total: number; lastUpdated: string | null; status: string }
export interface SysSecurityRow { key: string; label: string; enabled: boolean; summary: string; updatedAt: string | null; values: Record<string, string> }
export interface SysService { name: string; status: string; uptime: number | null; responseMs: number | null; lastChecked: string | null; detail: string }
export interface AuditCard { total: number; changePct: number | null }
export interface AuditSummary { total: AuditCard; userActivities: AuditCard; systemChanges: AuditCard; securityEvents: AuditCard; loginActivities: AuditCard }
export interface AuditRow { id: number; eventId: string; at: string; actorEmail: string | null; actorName: string | null; actorRole: string | null; event: string; action: string; module: string; details: string; ip: string | null; status: string }
export interface AuditPage { items: AuditRow[]; total: number; page: number; size: number }
export interface AuditDetail { row: AuditRow; device: string | null; location: string | null; oldValue: string | null; newValue: string | null; extra: Record<string, string> }
export interface AuditOption { value: string; label: string }
export interface AuditOptions { events: AuditOption[]; modules: string[]; users: AuditOption[]; statuses: AuditOption[]; ranges: AuditOption[] }
export interface AuditFilters { q?: string; range?: string; from?: string; to?: string; event?: string; module?: string; user?: string; status?: string; sort?: string }
export interface PlatformAsset { present: boolean; fileName: string | null; size: number; updatedAt: string | null }
export interface PlatformSettings { values: Record<string, string>; logo: PlatformAsset; favicon: PlatformAsset; options: Record<string, string[]>; updatedAt: string | null }
export interface SysOverview {
  header: { health: SysCard; instances: number; instancesNew: number; storageUsed: number; capacityGb: number; storagePercent: number; security: SysCard; issues: string[]; lastBackup: SysBackup | null };
  instances: SysInstance[]; integrations: SysIntegration[]; data: SysDataRow[]; security: SysSecurityRow[]; monitoring: SysService[]; backups: SysBackup[]; config: Record<string, string>;
}

/* ---- support & tickets */
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "AWAITING_CUSTOMER" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export interface SupportTicket { id: number; ticketNo: string; subject: string; category: string; priority: TicketPriority; status: TicketStatus; institutionId: number | null; institution: string | null; requester: string | null; assignedTo: number | null; assignedName: string | null; escalated: boolean; createdBy: string | null; createdAt: string; updatedAt: string }
export interface SupportDetail { ticket: SupportTicket; description: string | null; messages: number; attachments: number }
export interface SupportPage { items: SupportTicket[]; total: number; page: number; size: number }
export interface SupportMetric { value: number; change: number | null }
export interface SupportSummary { total: SupportMetric; open: SupportMetric; inProgress: SupportMetric; awaiting: SupportMetric; resolved: SupportMetric }
export interface SupportOptions { categories: CommOption[]; agents: CommOption[]; institutions: CommOption[] }
export interface TicketMessage { id: number; author: string | null; body: string; internal: boolean; createdAt: string }
export interface TicketEvent { actor: string | null; text: string; createdAt: string }
export interface TicketAttachment { id: number; fileName: string; contentType: string | null; size: number; uploadedBy: string | null; createdAt: string }
export interface KbArticle { id: number; title: string; category: string; body: string; published: boolean; createdBy: string | null; updatedAt: string }
export interface TicketCreateBody { subject: string; description: string; category: string; priority: string; institutionId: number | null; requester: string; assigneeId: number | null }

/* ---- reports & analytics */
export type ReportFormat = "PDF" | "EXCEL" | "CSV";
export type ReportFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
export interface ReportMetric { value: number | null; change: number | null }
export interface ReportOverview {
  stats: { institutions: ReportMetric; users: ReportMetric; students: ReportMetric; attendance: ReportMetric; revenue: ReportMetric };
  enrollment: { month: string; fresh: number; total: number }[];
  modules: { name: string; value: number; percent: number }[];
  moduleTotal: number;
  top: { id: number; name: string; activeUsers: number }[];
}
export interface ReportTemplateDef { code: string; name: string; category: string; description: string; icon: string; available: boolean; note: string | null }
export interface GeneratedReport { id: number; name: string; template: string; category: string; format: ReportFormat; status: string; rowCount: number; institution: string | null; generatedBy: string | null; generatedAt: string }
export interface ReportSchedule { id: number; name: string; template: string; category: string; format: ReportFormat; frequency: ReportFrequency; rangeDays: number; institutionId: number | null; institution: string | null; recipients: string | null; status: "ACTIVE" | "PAUSED"; nextRun: string; lastRun: string | null }
export interface ReportScheduleBody { name: string; template: string; format: string; frequency: string; days: number | null; institutionId: number | null; recipients: string }
export interface ReportGenerateBody { template: string; format: string; days: number; institutionId: number | null; schedule: { frequency: string; recipients: string } | null }
export interface ReportGenerated { report: GeneratedReport; csv: string; schedule: ReportSchedule | null }

/* ---- platform communications */
export type CommType = "ANNOUNCEMENT" | "EMAIL" | "IN_APP" | "SMS" | "PUSH";
export type CommStatus = "DRAFT" | "SCHEDULED" | "SENT";
export type AudienceKind = "ALL_USERS" | "USER_GROUPS" | "INSTITUTIONS" | "CLASSES";
export interface CommRow { id: number; title: string; description: string | null; type: CommType; priority: string; audienceKind: AudienceKind; targets: string[]; audienceLabel: string; subject: string | null; body: string | null; status: CommStatus; scheduledAt: string | null; sentAt: string | null; recipients: number | null; createdAt: string }
export interface CommPage { items: CommRow[]; total: number; page: number; size: number }
export interface CommSummary { total: number; createdThisMonth: number; sent: number; drafts: number; scheduled: number; audienceReached: number }
export interface CommOption { code: string; label: string }
export interface CommOptions { groups: CommOption[]; institutions: CommOption[]; sections: CommOption[] }
export interface CommBody { title: string; description: string; type: string; priority: string; audienceKind: string; targets: string[]; subject: string; body: string; action: "DRAFT" | "SEND" | "SCHEDULE"; scheduledAt: string | null }

/* ---- modules & features */
export interface ModuleRow { code: string; name: string; category: string; description: string; icon: string; enabled: boolean; featuresEnabled: number; featuresTotal: number; institutions: number }
export interface ModulesStats { modules: number; modulesEnabled: number; features: number; featuresEnabled: number; institutionsUsing: number; institutionsNewThisMonth: number; customConfigs: number; updatedThisMonth: number }
export interface ModulesOverview { stats: ModulesStats; modules: ModuleRow[] }
export interface ModuleFeature { code: string; name: string; description: string; enabled: boolean; defaultEnabled: boolean }
export interface ModuleDetail { module: ModuleRow; recordNoun: string; features: ModuleFeature[]; settings: Record<string, string> }
export interface ModuleAccessRow { institutionId: number; institutionName: string; enabled: boolean }
export interface ModuleUsage { institutions: number; totalInstitutions: number; featuresEnabled: number; featuresTotal: number; lastChanged: string | null }
export interface ModuleAuditItem { at: string; actor: string | null; description: string }

/* ---- subscription & billing overview */
export interface BillingStats { institutions: number; newThisMonth: number; annualRevenue: number; financialYear: string; growthPct: number | null; paymentsThisYear: number; active: number; trial: number; expiring: number; expired: number; subscribed: number; }
export interface BillingCount { key: string; count: number; }
export interface BillingSubRow { institutionId: number; institutionName: string; plan: string; startDate: string | null; endDate: string | null; status: string; cycle: string; amount: number; }
export interface BillingRenewalRow { institutionId: number; institutionName: string; plan: string | null; renewalDate: string; daysLeft: number; amount: number | null; }
export interface InvoiceRow { id: number; invoiceNo: string; institutionId: number; institutionName: string; issueDate: string; dueDate: string; subtotal: number; taxAmount: number; amount: number; description: string | null; status: "PAID" | "PENDING" | "OVERDUE"; paidOn: string | null; }
export interface InvoiceBody { institutionId: number | null; subtotal: number | null; issueDate: string | null; dueDate: string | null; description: string | null; }
export interface PaymentMethodRow { id: number; brand: string; last4: string; expiryMonth: number; expiryYear: number; isDefault: boolean; expired: boolean; }
export interface PaymentMethodBody { brand: string; last4: string; expiryMonth: number | null; expiryYear: number | null; makeDefault: boolean; }
export interface InvoiceDetail { invoice: InvoiceRow; billTo: string; institutionEmail: string; taxName: string; taxRate: string; template: string; paymentTerms: string; }
export interface BillingOverview { stats: BillingStats; revenue: RevenueSummary; statuses: BillingCount[]; plans: BillingCount[]; subscriptions: BillingSubRow[]; renewals: BillingRenewalRow[]; invoices: InvoiceRow[]; methods: PaymentMethodRow[]; settings: Record<string, string>; }

export const api = {
  auth: {
    async login(email: string, password: string, remember = true): Promise<UserInfo> {
      session.clear();                                        // never mix an old session with a new one
      const res = await request<LoginResponse>("POST", "/auth/login", { email, password });
      write(TOKEN_KEY, res.accessToken, remember);
      write(USER_KEY, JSON.stringify(res.user), remember);
      // A Super Admin has no institution of their own: default to the first one so the pages have data.
      if (res.user.role === "SUPER_ADMIN") {
        try {
          const list = await request<Institution[]>("GET", "/institutions");
          if (list.length > 0) session.setInstitution(list[0].id);
        } catch (e) {
          session.clear();                                    // don't leave a half signed-in state
          throw e;
        }
      }
      return res.user;
    },
    me: () => request<UserInfo>("GET", "/auth/me"),
    logout: () => session.clear(),
  },

  institutions: {
    list: (filters: InstitutionFilters = {}) =>
      request<Institution[]>("GET", `/institutions${qs({ search: filters.search, type: filters.type, status: filters.status })}`),
    get: (id: number) => request<InstitutionDetail>("GET", `/institutions/${id}`),
    create: (body: InstitutionInput) => request<InstitutionDetail>("POST", "/institutions", body),
    update: (id: number, body: InstitutionInput) => request<InstitutionDetail>("PUT", `/institutions/${id}`, body),
    /** "Delete" in the UI: archives the institution. Reversible with restore(). */
    archive: (id: number) => request<InstitutionDetail>("DELETE", `/institutions/${id}`),
    restore: (id: number) => request<InstitutionDetail>("POST", `/institutions/${id}/restore`),
    /** Irreversible. Only for archived institutions with no dependent data. */
    deletePermanently: (id: number) => request<void>("DELETE", `/institutions/${id}/permanent`),
    uploadImage: (id: number, kind: "logo" | "banner", file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<void>("PUT", `/institutions/${id}/${kind}`, form);
    },
    removeImage: (id: number, kind: "logo" | "banner") => request<void>("DELETE", `/institutions/${id}/${kind}`),
    /** Public URL for <img src>. Pass updatedAt so a replaced image is not served from cache. */
    imageUrl: (id: number, kind: "logo" | "banner", version?: string) =>
      `${BASE_URL}/public/institutions/${id}/${kind}${version ? `?v=${encodeURIComponent(version)}` : ""}`,
  },

  institutionTypes: {
    list: () => request<InstitutionTypeRow[]>("GET", "/institution-types"),
    create: (body: InstitutionTypeInput) => request<InstitutionTypeRow>("POST", "/institution-types", body),
    update: (id: number, body: InstitutionTypeInput) => request<InstitutionTypeRow>("PUT", `/institution-types/${id}`, body),
    remove: (id: number) => request<void>("DELETE", `/institution-types/${id}`),
  },

  branches: {
    list: (f: { institutionId?: number; search?: string; status?: BranchStatus; type?: BranchKind } = {}) =>
      request<Branch[]>("GET", `/branches${qs({ institutionId: f.institutionId, search: f.search, status: f.status, type: f.type })}`),
    get: (id: number) => request<Branch>("GET", `/branches/${id}`),
    create: (body: BranchInput) => request<Branch>("POST", "/branches", body),
    update: (id: number, body: BranchInput) => request<Branch>("PUT", `/branches/${id}`, body),
    remove: (id: number) => request<void>("DELETE", `/branches/${id}`),
  },

  dashboard: {
    superAdmin: () => request<SuperAdminDashboard>("GET", "/dashboard/super-admin"),
  },

  activity: {
    list: (p: { page?: number; size?: number; action?: string } = {}) =>
      request<Paged<ActivityEntry>>("GET", `/audit-logs${qs({ page: p.page, size: p.size, action: p.action })}`),
  },

  system: {
    runHealthCheck: () => request<HealthSnapshot>("POST", "/system/health/run"),
    healthLogs: (p: { page?: number; size?: number } = {}) =>
      request<Paged<HealthLogRow>>("GET", `/system/health/logs${qs({ page: p.page, size: p.size })}`),
  },

  payments: {
    list: (institutionId?: number) => request<Payment[]>("GET", `/payments${qs({ institutionId })}`),
    summary: () => request<RevenueSummary>("GET", "/payments/summary"),
    record: (body: PaymentInput) => request<Payment>("POST", "/payments", body),
    remove: (id: number) => request<void>("DELETE", `/payments/${id}`),
  },

  platformUsers: {
    list: (p: { type: "STUDENT" | "TEACHER" | "STAFF"; search?: string; institutionId?: number; page?: number; size?: number }) =>
      request<Paged<PlatformUser>>("GET", `/platform/users${qs({ type: p.type, search: p.search, institutionId: p.institutionId, page: p.page, size: p.size })}`),
  },

  years: {
    list: () => request<AcademicYear[]>("GET", "/academic-years"),
    ...crud<AcademicYear, AcademicYearInput>("/academic-years"),
  },

  terms: {
    list: (academicYearId: number) => request<Term[]>("GET", `/terms${qs({ academicYearId })}`),
    ...crud<Term, TermInput>("/terms"),
  },

  grading: {
    list: () => request<GradingSystem[]>("GET", "/grading-systems"),
    createSystem: (body: GradingSystemInput) => request<GradingSystem>("POST", "/grading-systems", body),
    updateSystem: (id: number, body: GradingSystemInput) => request<GradingSystem>("PUT", `/grading-systems/${id}`, body),
    removeSystem: (id: number) => request<void>("DELETE", `/grading-systems/${id}`),
    addGrade: (systemId: number, body: GradeInput) => request<Grade>("POST", `/grading-systems/${systemId}/grades`, body),
    updateGrade: (systemId: number, gradeId: number, body: GradeInput) =>
      request<Grade>("PUT", `/grading-systems/${systemId}/grades/${gradeId}`, body),
    removeGrade: (systemId: number, gradeId: number) => request<void>("DELETE", `/grading-systems/${systemId}/grades/${gradeId}`),
  },

  subjects: {
    list: (academicYearId: number) => request<Subject[]>("GET", `/subjects${qs({ academicYearId })}`),
    ...crud<Subject, SubjectInput>("/subjects"),
  },

  classes: {
    list: (academicYearId: number) => request<SchoolClass[]>("GET", `/classes${qs({ academicYearId })}`),
    ...crud<SchoolClass, SchoolClassInput>("/classes"),
  },

  sections: {
    list: (classId: number) => request<Section[]>("GET", `/sections${qs({ classId })}`),
    ...crud<Section, SectionInput>("/sections"),
  },

  promotion: {
    listRules: (academicYearId: number) => request<PromotionRule[]>("GET", `/promotion/rules${qs({ academicYearId })}`),
    createRule: (body: PromotionRuleInput) => request<PromotionRule>("POST", "/promotion/rules", body),
    updateRule: (id: number, body: PromotionRuleInput) => request<PromotionRule>("PUT", `/promotion/rules/${id}`, body),
    removeRule: (id: number) => request<void>("DELETE", `/promotion/rules/${id}`),
    preview: (academicYearId: number) => request<PreviewRow[]>("GET", `/promotion/preview${qs({ academicYearId })}`),
    override: (body: ProgressionOverride) => request<PreviewRow>("PUT", "/promotion/progressions", body),
  },

  teachers: {
    list: () => request<Teacher[]>("GET", "/teachers"),
    ...crud<Teacher, TeacherInput>("/teachers"),
  },

  students: {
    list: (filter: { classId?: number; sectionId?: number } = {}) =>
      request<Student[]>("GET", `/students${qs(filter)}`),
    ...crud<Student, StudentInput>("/students"),
  },

  attendance: {
    settings: () => request<AttendanceSettings>("GET", "/attendance/settings"),
    saveSettings: (body: AttendanceSettings) => request<AttendanceSettings>("PUT", "/attendance/settings", body),
    types: { list: () => request<AttendanceType[]>("GET", "/attendance/types"), ...crud<AttendanceType, AttendanceTypeBody>("/attendance/types") },
    rules: { list: () => request<AttendanceRule[]>("GET", "/attendance/rules"), ...crud<AttendanceRule, AttendanceRuleBody>("/attendance/rules") },
    templates: { list: () => request<AttendanceTemplate[]>("GET", "/attendance/notification-templates"), ...crud<AttendanceTemplate, AttendanceTemplateBody>("/attendance/notification-templates") },
    events: { list: () => request<AttendanceEvent[]>("GET", "/attendance/notification-events"), ...crud<AttendanceEvent, AttendanceEventBody>("/attendance/notification-events") },
  },

  exam: {
    types: { list: (academicYearId: number) => request<ExamType[]>("GET", `/exam/types${qs({ academicYearId })}`), ...crud<ExamType, ExamTypeBody>("/exam/types") },
    reports: { list: (academicYearId: number) => request<ReportTemplate[]>("GET", `/exam/report-templates${qs({ academicYearId })}`), ...crud<ReportTemplate, ReportTemplateBody>("/exam/report-templates") },
    results: { list: (academicYearId: number) => request<ResultTemplate[]>("GET", `/exam/result-templates${qs({ academicYearId })}`), ...crud<ResultTemplate, ResultTemplateBody>("/exam/result-templates") },
    settings: () => request<ExamSettings>("GET", "/exam/settings"),
    saveSettings: (body: ExamSettings) => request<ExamSettings>("PUT", "/exam/settings", body),
  },

  timetable: {
    settings: () => request<TimetableGeneral>("GET", "/timetable/settings"),
    saveSettings: (body: TimetableGeneral) => request<TimetableGeneral>("PUT", "/timetable/settings", body),
    slots: { list: () => request<TimetableSlot[]>("GET", "/timetable/slots"), ...crud<TimetableSlot, TimetableSlotBody>("/timetable/slots") },
    holidays: { list: () => request<Holiday[]>("GET", "/timetable/holidays"), ...crud<Holiday, HolidayBody>("/timetable/holidays") },
    rules: () => request<TimetableRules>("GET", "/timetable/rules"),
    saveRules: (body: TimetableRules) => request<TimetableRules>("PUT", "/timetable/rules", body),
    priorities: () => request<RulePriority[]>("GET", "/timetable/rule-priorities"),
    savePriorities: (body: { code: string; enabled: boolean }[]) => request<RulePriority[]>("PUT", "/timetable/rule-priorities", body),
    breakTypes: { list: () => request<BreakTypeRow[]>("GET", "/timetable/break-types"), ...crud<BreakTypeRow, BreakTypeBody>("/timetable/break-types") },
    breakRules: { list: () => request<BreakRuleRow[]>("GET", "/timetable/break-rules"), ...crud<BreakRuleRow, BreakRuleBody>("/timetable/break-rules") },
  },

  communication: {
    settings: (section: string) => request<CommSettings>("GET", `/communication/settings/${section}`),
    saveSettings: (section: string, body: CommSettings) => request<CommSettings>("PUT", `/communication/settings/${section}`, body),
    testConnection: (kind: "smtp" | "sms-provider") => request<ConnectionTest>("POST", `/communication/test-connection/${kind}`),
    senderIds: { list: () => request<SenderIdRow[]>("GET", "/communication/sms-sender-ids"), ...crud<SenderIdRow, SenderIdBody>("/communication/sms-sender-ids") },
    templates: { list: (channel?: CommChannel) => request<CommTemplateRow[]>("GET", `/communication/templates${qs({ channel })}`), ...crud<CommTemplateRow, CommTemplateBody>("/communication/templates") },
    variables: () => request<CommVariable[]>("GET", "/communication/template-variables"),
    pushCategories: { list: () => request<PushCategoryRow[]>("GET", "/communication/push-categories"), ...crud<PushCategoryRow, PushCategoryBody>("/communication/push-categories") },
  },

  userAdmin: {
    summary: (institutionId?: number | null) => request<UserSummary>("GET", `/users/summary${qs({ institutionId: institutionId ?? undefined })}`),
    list: (p: { type?: string; institutionId?: number | null; status?: string; role?: string; q?: string; page?: number; size?: number }) =>
      request<UserPage>("GET", `/users${qs({ type: p.type, institutionId: p.institutionId ?? undefined, status: p.status, role: p.role, q: p.q, page: p.page, size: p.size })}`),
    get: (id: number) => request<UserDetail>("GET", `/users/${id}`),
    activity: (id: number, kind: "ACTIVITY" | "AUDIT") => request<UserActivity[]>("GET", `/users/${id}/activity${qs({ kind })}`),
    roles: () => request<UserRoleView[]>("GET", "/users/roles"),
    modules: () => request<string[]>("GET", "/users/modules"),
    years: (institutionId?: number | null) => request<{ id: number; name: string }[]>("GET", `/users/academic-years${qs({ institutionId: institutionId ?? undefined })}`),
    create: (body: UserBody) => request<{ user: UserDetail; temporaryPassword: string | null }>("POST", "/users", body),
    update: (id: number, body: UserBody) => request<UserDetail>("PUT", `/users/${id}`, body),
    setStatus: (id: number, status: UserStatus) => request<UserDetail>("POST", `/users/${id}/status`, { status }),
    resetPassword: (id: number, password?: string) => request<{ temporaryPassword: string | null }>("POST", `/users/${id}/reset-password`, { password: password ?? null }),
  },
  sysmgmt: {
    overview: () => request<SysOverview>("GET", "/sysmgmt/overview"),
    runChecks: () => request<SysService[]>("POST", "/sysmgmt/monitoring/run", {}),
    createInstance: (b: SysInstanceBody) => request<SysInstance>("POST", "/sysmgmt/instances", b),
    updateInstance: (id: number, b: SysInstanceBody) => request<SysInstance>("PUT", `/sysmgmt/instances/${id}`, b),
    refreshInstance: (id: number) => request<SysInstance>("POST", `/sysmgmt/instances/${id}/refresh`, {}),
    removeInstance: (id: number) => request<void>("DELETE", `/sysmgmt/instances/${id}`),
    createIntegration: (b: SysIntegrationBody) => request<SysIntegration>("POST", "/sysmgmt/integrations", b),
    updateIntegration: (id: number, b: SysIntegrationBody) => request<SysIntegration>("PUT", `/sysmgmt/integrations/${id}`, b),
    toggleIntegration: (id: number) => request<SysIntegration>("POST", `/sysmgmt/integrations/${id}/toggle`, {}),
    testIntegration: (id: number) => request<SysIntegration>("POST", `/sysmgmt/integrations/${id}/test`, {}),
    removeIntegration: (id: number) => request<void>("DELETE", `/sysmgmt/integrations/${id}`),
    saveSecurity: (values: Record<string, string>) => request<Record<string, string>>("PUT", "/sysmgmt/settings/security", { values }),
    saveConfig: (values: Record<string, string>) => request<Record<string, string>>("PUT", "/sysmgmt/settings/config", { values }),
    runBackup: (type: string) => request<SysBackup>("POST", "/sysmgmt/backups", { type }),
    removeBackup: (id: number) => request<void>("DELETE", `/sysmgmt/backups/${id}`),
    /** Files need the sign-in token, so they are fetched here and saved by the caller. */
    file: async (path: string): Promise<Blob> => {
      const token = session.token();
      let res: Response;
      try { res = await fetch(`${BASE_URL}/sysmgmt${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); }
      catch { throw new ApiError("Can't reach the server. Check that the backend is running.", 0); }
      if (!res.ok) { const d = await res.json().catch(() => null); throw new ApiError(d?.message ?? `Download failed (${res.status}).`, res.status); }
      return res.blob();
    },
  },
  auditLogs: {
    summary: () => request<AuditSummary>("GET", "/audit-logs/summary"),
    options: () => request<AuditOptions>("GET", "/audit-logs/options"),
    search: (f: AuditFilters, page: number, size = 10) => request<AuditPage>("GET", `/audit-logs/search${qs({ ...f, page, size })}`),
    detail: (id: number) => request<AuditDetail>("GET", `/audit-logs/entries/${id}`),
    /** The export needs the sign-in token, so it is fetched here and saved by the caller. */
    exportCsv: async (f: AuditFilters): Promise<Blob> => {
      const token = session.token();
      let res: Response;
      try { res = await fetch(`${BASE_URL}/audit-logs/export${qs({ ...f })}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); }
      catch { throw new ApiError("Can't reach the server. Check that the backend is running.", 0); }
      if (!res.ok) { const d = await res.json().catch(() => null); throw new ApiError(d?.message ?? `Export failed (${res.status}).`, res.status); }
      return res.blob();
    },
  },
  platform: {
    get: () => request<PlatformSettings>("GET", "/platform-settings"),
    save: (b: Record<string, string>) => request<PlatformSettings>("PUT", "/platform-settings", b),
    upload: (kind: "logo" | "favicon", file: File) => { const f = new FormData(); f.append("file", file); return request<PlatformAsset>("POST", `/platform-settings/assets/${kind}`, f); },
    removeAsset: (kind: "logo" | "favicon") => request<void>("DELETE", `/platform-settings/assets/${kind}`),
    /** Images need the sign-in token, so they are fetched as a Blob and shown through an object URL. */
    asset: async (kind: "logo" | "favicon"): Promise<Blob> => {
      const token = session.token();
      let res: Response;
      try { res = await fetch(`${BASE_URL}/platform-settings/assets/${kind}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); }
      catch { throw new ApiError("Can't reach the server. Check that the backend is running.", 0); }
      if (!res.ok) throw new ApiError(`Image not available (${res.status}).`, res.status);
      return res.blob();
    },
  },
  support: {
    list: (p: { tab?: string; status?: string; priority?: string; category?: string; institutionId?: number | null; q?: string; from?: string; to?: string; page?: number; size?: number } = {}) =>
      request<SupportPage>("GET", `/support/tickets${qs({ tab: p.tab, status: p.status, priority: p.priority, category: p.category, institutionId: p.institutionId ?? undefined, q: p.q, from: p.from, to: p.to, page: p.page, size: p.size })}`),
    summary: () => request<SupportSummary>("GET", "/support/summary"),
    options: () => request<SupportOptions>("GET", "/support/options"),
    create: (body: TicketCreateBody) => request<SupportDetail>("POST", "/support/tickets", body),
    detail: (id: number) => request<SupportDetail>("GET", `/support/tickets/${id}`),
    update: (id: number, body: { status?: string; priority?: string; category?: string; assigneeId: number | null }) => request<SupportDetail>("PUT", `/support/tickets/${id}`, body),
    escalate: (id: number) => request<SupportDetail>("POST", `/support/tickets/${id}/escalate`, {}),
    remove: (id: number) => request<void>("DELETE", `/support/tickets/${id}`),
    messages: (id: number) => request<TicketMessage[]>("GET", `/support/tickets/${id}/messages`),
    addMessage: (id: number, body: string, internal: boolean) => request<TicketMessage>("POST", `/support/tickets/${id}/messages`, { body, internal }),
    events: (id: number) => request<TicketEvent[]>("GET", `/support/tickets/${id}/events`),
    attachments: (id: number) => request<TicketAttachment[]>("GET", `/support/tickets/${id}/attachments`),
    upload: (id: number, file: File) => { const f = new FormData(); f.append("file", file); return request<TicketAttachment>("POST", `/support/tickets/${id}/attachments`, f); },
    removeAttachment: (attachmentId: number) => request<void>("DELETE", `/support/attachments/${attachmentId}`),
    /** Fetches the file with the sign-in token (a plain link can't carry it) so the caller can save it. */
    download: async (attachmentId: number): Promise<Blob> => {
      const token = session.token();
      let res: Response;
      try { res = await fetch(`${BASE_URL}/support/attachments/${attachmentId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); }
      catch { throw new ApiError("Can't reach the server. Check that the backend is running.", 0); }
      if (!res.ok) throw new ApiError(`Download failed (${res.status}).`, res.status);
      return res.blob();
    },
    articles: (q?: string) => request<KbArticle[]>("GET", `/support/articles${qs({ q })}`),
    createArticle: (body: { title: string; category: string; body: string; published: boolean }) => request<KbArticle>("POST", "/support/articles", body),
    updateArticle: (id: number, body: { title: string; category: string; body: string; published: boolean }) => request<KbArticle>("PUT", `/support/articles/${id}`, body),
    removeArticle: (id: number) => request<void>("DELETE", `/support/articles/${id}`),
  },
  reports: {
    overview: (p: { months: number; topDays: number; institutionId?: number | null; module?: string }) => request<ReportOverview>("GET", `/reports/overview${qs({ months: p.months, topDays: p.topDays, institutionId: p.institutionId ?? undefined, module: p.module || undefined })}`),
    templates: () => request<ReportTemplateDef[]>("GET", "/reports/templates"),
    generate: (body: ReportGenerateBody) => request<ReportGenerated>("POST", "/reports/generate", body),
    recent: (p: { category?: string; limit?: number } = {}) => request<GeneratedReport[]>("GET", `/reports/generated${qs({ category: p.category, limit: p.limit })}`),
    content: (id: number) => request<{ name: string; format: ReportFormat; csv: string }>("GET", `/reports/generated/${id}/content`),
    removeGenerated: (id: number) => request<void>("DELETE", `/reports/generated/${id}`),
    schedules: (category?: string) => request<ReportSchedule[]>("GET", `/reports/schedules${qs({ category })}`),
    createSchedule: (body: ReportScheduleBody) => request<ReportSchedule>("POST", "/reports/schedules", body),
    updateSchedule: (id: number, body: ReportScheduleBody) => request<ReportSchedule>("PUT", `/reports/schedules/${id}`, body),
    toggleSchedule: (id: number) => request<ReportSchedule>("POST", `/reports/schedules/${id}/toggle`, {}),
    runSchedule: (id: number) => request<ReportGenerated>("POST", `/reports/schedules/${id}/run`, {}),
    removeSchedule: (id: number) => request<void>("DELETE", `/reports/schedules/${id}`),
  },
  comms: {
    list: (p: { type?: string; status?: string; audience?: string; q?: string; from?: string; to?: string; page?: number; size?: number } = {}) => request<CommPage>("GET", `/communications${qs({ type: p.type, status: p.status, audience: p.audience, q: p.q, from: p.from, to: p.to, page: p.page, size: p.size })}`),
    summary: () => request<CommSummary>("GET", "/communications/summary"),
    options: () => request<CommOptions>("GET", "/communications/options"),
    resolve: (audienceKind: string, targets: string[]) => request<{ count: number; label: string }>("POST", "/communications/resolve", { audienceKind, targets }),
    create: (body: CommBody) => request<CommRow>("POST", "/communications", body),
    update: (id: number, body: CommBody) => request<CommRow>("PUT", `/communications/${id}`, body),
    send: (id: number) => request<CommRow>("POST", `/communications/${id}/send`, {}),
    duplicate: (id: number) => request<CommRow>("POST", `/communications/${id}/duplicate`, {}),
    remove: (id: number) => request<void>("DELETE", `/communications/${id}`),
  },
  modules: {
    overview: () => request<ModulesOverview>("GET", "/modules"),
    detail: (code: string) => request<ModuleDetail>("GET", `/modules/${code}`),
    setStatus: (code: string, enabled: boolean) => request<ModuleRow>("PUT", `/modules/${code}/status`, { enabled }),
    bulk: (states: Record<string, boolean>) => request<ModulesOverview>("PUT", "/modules/status", { states }),
    save: (code: string, body: { features: Record<string, boolean>; settings: Record<string, string> }) => request<ModuleDetail>("PUT", `/modules/${code}/configuration`, body),
    meta: (code: string, body: { name: string; category: string; description: string }) => request<ModuleDetail>("PUT", `/modules/${code}`, body),
    reset: (code: string) => request<ModuleDetail>("POST", `/modules/${code}/reset`, {}),
    access: (code: string) => request<ModuleAccessRow[]>("GET", `/modules/${code}/access`),
    setAccess: (code: string, institutionId: number, enabled: boolean) => request<ModuleAccessRow>("PUT", `/modules/${code}/access/${institutionId}`, { enabled }),
    usage: (code: string) => request<ModuleUsage>("GET", `/modules/${code}/usage`),
    audit: (code: string) => request<ModuleAuditItem[]>("GET", `/modules/${code}/audit`),
  },
  billing: {
    overview: (months: 6 | 12 = 6) => request<BillingOverview>("GET", `/billing/overview${qs({ months })}`),
    settings: () => request<Record<string, string>>("GET", "/billing/settings"),
    saveSettings: (body: Record<string, string>) => request<Record<string, string>>("PUT", "/billing/settings", body),
    invoices: (p: { status?: string; limit?: number } = {}) => request<InvoiceRow[]>("GET", `/billing/invoices${qs({ status: p.status, limit: p.limit })}`),
    createInvoice: (body: InvoiceBody) => request<InvoiceRow>("POST", "/billing/invoices", body),
    markInvoicePaid: (id: number, body: { paidOn?: string; method?: string; reference?: string } = {}) => request<InvoiceRow>("POST", `/billing/invoices/${id}/mark-paid`, body),
    invoice: (id: number) => request<InvoiceDetail>("GET", `/billing/invoices/${id}`),
    addMethod: (body: PaymentMethodBody) => request<PaymentMethodRow>("POST", "/billing/payment-methods", body),
    setDefaultMethod: (id: number) => request<PaymentMethodRow[]>("POST", `/billing/payment-methods/${id}/default`, {}),
    deleteMethod: (id: number) => request<void>("DELETE", `/billing/payment-methods/${id}`),
    deleteInvoice: (id: number) => request<void>("DELETE", `/billing/invoices/${id}`),
  },
  catalog: {
    list: (kind: CatalogKind) => request<CatalogItem[]>("GET", `/catalog/${kind}`),
    create: (kind: CatalogKind, body: CatalogBody) => request<CatalogItem>("POST", `/catalog/${kind}`, body),
    update: (kind: CatalogKind, id: number, body: CatalogBody) => request<CatalogItem>("PUT", `/catalog/${kind}/${id}`, body),
    remove: (kind: CatalogKind, id: number) => request<void>("DELETE", `/catalog/${kind}/${id}`),
    testIntegration: (id: number) => request<CatalogItem>("POST", `/catalog/INTEGRATION/${id}/test`),
  },
  transport: {
    routes: { list: () => request<TransportRouteRow[]>("GET", "/transport/routes"), ...crud<TransportRouteRow, TransportRouteBody>("/transport/routes") },
    stops: { list: (routeId: number) => request<TransportStopRow[]>("GET", `/transport/stops${qs({ routeId })}`), ...crud<TransportStopRow, TransportStopBody>("/transport/stops") },
    vehicles: { list: () => request<TransportVehicleRow[]>("GET", "/transport/vehicles"), ...crud<TransportVehicleRow, TransportVehicleBody>("/transport/vehicles") },
    drivers: { list: () => request<TransportDriverRow[]>("GET", "/transport/drivers"), ...crud<TransportDriverRow, TransportDriverBody>("/transport/drivers") },
  },

  generalSettings: {
    get: () => request<GeneralSettings>("GET", "/settings/general"),
    save: (body: GeneralSettings) => request<GeneralSettings>("PUT", "/settings/general", body),
  },
};
