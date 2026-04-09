import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import Forecasting from "./pages/Forecasting";
import Predictions from "./pages/Predictions";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/forecasting" element={<Forecasting />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
