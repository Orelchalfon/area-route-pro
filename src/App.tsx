import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AppLayout } from "./components/AppLayout";
import { RequireAuth } from "./components/RequireAuth";
import { RequireAdmin } from "./components/RequireAdmin";
import { AuthProvider } from "./contexts/AuthContext";
import { JobsProvider } from "./contexts/JobsContext";
import LoginPage from "./pages/LoginPage";

// Heavy routes (maps, drag-drop, calendars, charts) are split to keep the
// initial mobile bundle small.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const JobCategoryPage = lazy(() => import("./pages/JobCategoryPage"));
const TechnicianPage = lazy(() => import("./pages/TechnicianPage"));
const ServiceCyclePage = lazy(() => import("./pages/ServiceCyclePage"));
const CustomerConfirmation = lazy(() => import("./pages/CustomerConfirmation"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DailyRoutePage = lazy(() => import("./pages/DailyRoutePage"));
const WorkSchedulePage = lazy(() => import("./pages/WorkSchedulePage"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex items-center justify-center py-20" dir="rtl">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

const App = () => ( 
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes (no auth, no app shell) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/confirm" element={<Suspense fallback={<RouteFallback />}><CustomerConfirmation /></Suspense>} />

            {/* Authenticated app */}
            <Route
              path="*"
              element={
                <RequireAuth>
                  <JobsProvider>
                    <AppLayout>
                      <Suspense fallback={<RouteFallback />}>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/daily-route" element={<DailyRoutePage />} />
                        <Route path="/malfunctions" element={<RequireAdmin><JobCategoryPage category="malfunctions" /></RequireAdmin>} />
                        <Route path="/installations" element={<RequireAdmin><JobCategoryPage category="installations" /></RequireAdmin>} />
                        <Route path="/service" element={<RequireAdmin><ServiceCyclePage /></RequireAdmin>} />
                        <Route path="/work-schedule" element={<RequireAdmin><WorkSchedulePage /></RequireAdmin>} />
                        <Route path="/technician" element={<TechnicianPage />} />
                        <Route path="/customers" element={<RequireAdmin><CustomersPage /></RequireAdmin>} />
                        <Route path="/users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                      </Suspense>
                    </AppLayout>
                  </JobsProvider>
                </RequireAuth>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
