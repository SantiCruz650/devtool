import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./app/DashboardLayout";
import LandingPage from "./landing/LandingPage";
import PrivacidadPage from "./legal/PrivacidadPage";
import TerminosPage from "./legal/TerminosPage";

function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<DashboardLayout />} />
      <Route path="/privacidad" element={<PrivacidadPage />} />
      <Route path="/terminos" element={<TerminosPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
