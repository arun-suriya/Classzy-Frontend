import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import AddInstitution from "./pages/super-admin/AddInstitution";
import AcademicYear from "./pages/super-admin/AcademicYear";
import TermsGrading from "./pages/super-admin/TermsGrading";
import Subjects from "./pages/super-admin/Subjects";
import ClassesSections from "./pages/super-admin/ClassesSections";
import PromotionProgression from "./pages/super-admin/PromotionProgression";
import ProtectedRoute from "../src/routes/ProtectedRoute";
import AllInstitutions from "./pages/super-admin/AllInstitutions";
import Subscriptions from "./pages/super-admin/Subscriptions";
import ActivityLogs from "./pages/super-admin/ActivityLogs";
import PlatformUsers from "./pages/super-admin/PlatformUsers";
import InstitutionTypes from "./pages/super-admin/InstitutionTypes";
import Branches from "./pages/super-admin/Branches";
import GeneralSettings from "./pages/super-admin/GeneralSettings";
import AttendanceSettings from "./pages/super-admin/AttendanceSettings";
import ExamGradingSettings from "./pages/super-admin/ExamGradingSettings";
import PeriodConfiguration from "./pages/super-admin/PeriodConfiguration";
import TimetableRules from "./pages/super-admin/TimetableRules";
import BreakRules from "./pages/super-admin/BreakRules";
import { Navigate } from "react-router-dom";
import EmailSettings from "./pages/super-admin/EmailSettings";
import SmsSettings from "./pages/super-admin/SmsSettings";
import PushSettings from "./pages/super-admin/PushSettings";
import MessageTemplates from "./pages/super-admin/MessageTemplates";
import ComingSoon from "./pages/super-admin/ComingSoon";
import TransportSettings from "./pages/super-admin/TransportSettings";
import LibrarySettings from "./pages/super-admin/LibrarySettings";
import SecurityAccess from "./pages/super-admin/SecurityAccess";
import IntegrationsSettings from "./pages/super-admin/IntegrationsSettings";
import BrandingSettings from "./pages/super-admin/BrandingSettings";
import Users from "./pages/super-admin/Users";
import AddUser from "./pages/super-admin/AddUser";
import SubscriptionBilling from "./pages/super-admin/SubscriptionBilling";
import ModulesFeatures from "./pages/super-admin/ModulesFeatures";
import Communications from "./pages/super-admin/Communications";
import ReportsAnalytics from "./pages/super-admin/ReportsAnalytics";
import SupportTickets from "./pages/super-admin/SupportTickets";
import SystemManagement from "./pages/super-admin/SystemManagement";
import PlatformSettings from "./pages/super-admin/PlatformSettings";
import AuditLogs from "./pages/super-admin/AuditLogs";

// Keep your existing imports for Dashboard and Schools.

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Keep your existing dashboard routes here. */}
        {/* Example: */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/institutions/new" element={<AddInstitution />} />
          <Route path="/institutions/settings/academic/year" element={<AcademicYear />} />
          <Route path="/institutions/settings/academic/terms" element={<TermsGrading />} />
          <Route path="/institutions/settings/academic/subjects" element={<Subjects />} />
          <Route path="/institutions/settings/academic/classes" element={<ClassesSections />} />
          <Route path="/institutions/settings/academic/promotion" element={<PromotionProgression />} />
          <Route path="/institutions/:id/edit" element={<AddInstitution />} />
          <Route path="/schools" element={<AllInstitutions />} />
          <Route path="/institutions/archive" element={<AllInstitutions archivedView />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/institutions/types" element={<InstitutionTypes />} />
          <Route path="/institutions/branches" element={<Branches />} />
          <Route path="/institutions/settings/general" element={<GeneralSettings />} />
          <Route path="/institutions/settings/attendance" element={<AttendanceSettings />} />
          <Route path="/institutions/settings/exam-grading" element={<ExamGradingSettings />} />
          <Route path="/institutions/settings/timetable/periods" element={<PeriodConfiguration />} />
          <Route path="/institutions/settings/timetable/rules" element={<TimetableRules />} />
          <Route path="/institutions/settings/timetable/breaks" element={<BreakRules />} />
          <Route path="/institutions/settings/timetable" element={<Navigate to="/institutions/settings/timetable/periods" replace />} />
          <Route path="/institutions/settings/timetable" element={<Navigate to="/institutions/settings/timetable/periods" replace />} />
          <Route path="/institutions/settings/timetable/periods" element={<PeriodConfiguration />} />
          <Route path="/institutions/settings/timetable/rules" element={<TimetableRules />} />
          <Route path="/institutions/settings/timetable/breaks" element={<BreakRules />} />
          <Route path="/institutions/settings/timetable/class-allocation" element={<ComingSoon title="Class Allocation" />} />
          <Route path="/institutions/settings/timetable/teacher-allocation" element={<ComingSoon title="Teacher Allocation" />} />
          <Route path="/institutions/settings/timetable/room-resources" element={<ComingSoon title="Room & Resource Allocation" />} />

          <Route path="/institutions/settings/communication" element={<Navigate to="/institutions/settings/communication/email" replace />} />
          <Route path="/institutions/settings/communication/email" element={<EmailSettings />} />
          <Route path="/institutions/settings/communication/sms" element={<SmsSettings />} />
          <Route path="/institutions/settings/communication/push" element={<PushSettings />} />
          <Route path="/institutions/settings/communication/templates" element={<MessageTemplates />} />
          <Route path="/institutions/settings/transport" element={<TransportSettings />} />
          <Route path="/institutions/settings/library" element={<LibrarySettings />} />
          <Route path="/institutions/settings/security" element={<SecurityAccess />} />
          <Route path="/institutions/settings/integrations" element={<IntegrationsSettings />} />
          <Route path="/institutions/settings/branding" element={<BrandingSettings />} />
          <Route path="/users" element={<Users />} />
          <Route path="/users/new" element={<AddUser />} />
          <Route path="/users/:id/edit" element={<AddUser />} />
          <Route path="/subscriptions" element={<SubscriptionBilling />} />
          <Route path="/modules" element={<ModulesFeatures />} />
          <Route path="/communications" element={<Communications />} />
          <Route path="/reports" element={<ReportsAnalytics />} />
          <Route path="/support" element={<SupportTickets />} />
          <Route path="/system" element={<SystemManagement />} />
          <Route path="/settings" element={<PlatformSettings />} />

          <Route path="/institutions/approvals" element={<ComingSoon title="Approval Requests" />} />
          <Route path="/content" element={<ComingSoon title="Content Library" />} />
          {/* <Route path="/institutions/settings/library" element={<ComingSoon title="Library Settings" />} />
          <Route path="/institutions/settings/security" element={<ComingSoon title="Security & Access" />} />
          <Route path="/institutions/settings/integrations" element={<ComingSoon title="Integrations" />} />
          <Route path="/institutions/settings/branding" element={<ComingSoon title="Branding & Customization" />} /> */}
          {/* <Route path="/schools" element={<SchoolsPage />} /> */}
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;