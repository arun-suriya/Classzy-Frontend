import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import AddInstitution from "./pages/super-admin/AddInstitution";

// Keep your existing imports for Dashboard and Schools.

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Keep your existing dashboard routes here. */}
        {/* Example: */}
        <Route path="/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/institutions/new" element={<AddInstitution />}/>
        {/* <Route path="/schools" element={<SchoolsPage />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;