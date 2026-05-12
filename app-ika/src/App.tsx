import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import CreateVault from "./pages/CreateVault";
import Dashboard from "./pages/Dashboard";
import Claim from "./pages/Claim";
import Withdraw from "./pages/Withdraw";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<CreateVault />} />
        <Route path="/claim" element={<Claim />} />
        <Route path="/withdraw" element={<Withdraw />} />
      </Routes>
    </ErrorBoundary>
  );
}
