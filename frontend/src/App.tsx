import { BrowserRouter, Routes, Route } from "react-router-dom";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
} from "@clerk/clerk-react";
import DashboardPage from "./pages/DashboardPage";
import AnalyzePage from "./pages/AnalyzePage";
import ReportPage from "./pages/ReportPage";
import ChattingPage from "./pages/ChattingPage";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/analyze" element={<Protected><AnalyzePage /></Protected>} />
          <Route path="/report" element={<Protected><ReportPage /></Protected>} />
          <Route path="/chat" element={<Protected><ChattingPage /></Protected>} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}
