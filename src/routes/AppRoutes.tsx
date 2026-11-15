
import { Routes, Route, Navigate } from "react-router-dom";
import SuperAdminDashboard from "../pages/super-admin/SuperAdminDashboard";
import SchoolsPage from "../pages/super-admin/SchoolsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/dashboard" element={<SuperAdminDashboard />} />
      <Route path="/schools" element={<SchoolsPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}