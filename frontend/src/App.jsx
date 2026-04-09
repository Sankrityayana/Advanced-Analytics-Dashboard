import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";

const Analytics = lazy(() => import("./pages/Analytics"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Forecasting = lazy(() => import("./pages/Forecasting"));
const Predictions = lazy(() => import("./pages/Predictions"));

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<p className="text-sm text-slate-300">Loading page...</p>}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/forecasting" element={<Forecasting />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
