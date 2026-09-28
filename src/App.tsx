import { Navigate, Route, Routes } from "react-router-dom";
import { RoleSelectorPage } from "./app/appShared";
import { DashboardPage, BenchmarkPage } from "./app/dashboardPages";
import { CasesPage, HistoricalMemoryPage } from "./app/historyPages";
import { NewCasePage } from "./app/newCasePage";
import { CaseDetailPage } from "./app/caseDetailPage";
import { MaintainersPage } from "./app/lettersMaintainersPages";
import { ManualPage } from "./app/manualPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleSelectorPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/casos" element={<CasesPage />} />
      <Route path="/historial" element={<HistoricalMemoryPage />} />
      <Route path="/casos/nuevo" element={<NewCasePage />} />
      <Route path="/casos/:id" element={<CaseDetailPage />} />
      <Route path="/benchmark" element={<BenchmarkPage />} />
      <Route path="/mantenedores" element={<MaintainersPage />} />
      <Route path="/manual" element={<ManualPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
