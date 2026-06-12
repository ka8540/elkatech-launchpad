import { Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import PortalShell from "@/components/PortalShell";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import SolventPrintersPage from "@/components/SolventPrinters";
import UVPrintersPage from "@/components/UVPrinters";
import LaserCuttingMachinesPage from "@/components/LaserCuttingMachines";
import LaminationMachinesPage from "@/components/LaminationMachines";
import DesktopUVPrinterPage from "@/components/DesktopUVPrinter";
import InkjetPrintersPage from "@/components/InkjetPrinters";
import UVFlatbedPrinterPage from "@/components/UVFlatbedPrinter";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import RequestsPage from "@/pages/RequestsPage";
import RequestNewPage from "@/pages/RequestNewPage";
import CompleteProfilePage from "@/pages/CompleteProfilePage";
import RequestDetailPage from "@/pages/RequestDetailPage";
import QueuePage from "@/pages/QueuePage";
import UsersPage from "@/pages/UsersPage";
import MachinesPage from "@/pages/MachinesPage";
import CustomerMachineProfilePage from "@/pages/CustomerMachineProfilePage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import CustomerActivityPage from "@/pages/CustomerActivityPage";
import SupportDashboardPage from "@/pages/SupportDashboardPage";
import AccountPage from "@/pages/AccountPage";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="elkatech-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/solvent-printers" element={<SolventPrintersPage />} />
            <Route path="/uv-printers" element={<UVPrintersPage />} />
            <Route path="/laser-cutting-machines" element={<LaserCuttingMachinesPage />} />
            <Route path="/lamination-machines" element={<LaminationMachinesPage />} />
            <Route path="/desktop-uv-printer" element={<DesktopUVPrinterPage />} />
            <Route path="/inkjet-printer" element={<InkjetPrintersPage />} />
            <Route path="/inject-printer" element={<Navigate to="/inkjet-printer" replace />} />
            <Route path="/flatbed-uv-printer" element={<UVFlatbedPrinterPage />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Onboarding lives outside the portal shell so customers with an
                incomplete profile aren't shown nav they can't yet use. */}
            <Route
              path="/app/complete-profile"
              element={
                <ProtectedRoute allowIncompleteProfile>
                  <CompleteProfilePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <PortalShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="requests" replace />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="requests/new" element={<RequestNewPage />} />
              <Route path="requests/:requestId" element={<RequestDetailPage />} />
              <Route
                path="queue"
                element={
                  <ProtectedRoute roles={["engineer", "support", "owner", "admin"]}>
                    <QueuePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="support"
                element={
                  <ProtectedRoute roles={["support", "owner", "admin"]}>
                    <SupportDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="customer-activity"
                element={
                  <ProtectedRoute roles={["support", "owner", "admin"]}>
                    <CustomerActivityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="customer-activity/:customerId"
                element={
                  <ProtectedRoute roles={["support", "owner", "admin"]}>
                    <CustomerActivityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin"
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute roles={["owner", "admin"]}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="machines"
                element={
                  <ProtectedRoute roles={["owner", "admin"]}>
                    <MachinesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="machines/:customerId"
                element={
                  <ProtectedRoute roles={["owner", "admin"]}>
                    <CustomerMachineProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route path="account" element={<AccountPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
