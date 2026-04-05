import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { JobsProvider } from "./contexts/JobsContext";
import Dashboard from "./pages/Dashboard";
import JobCategoryPage from "./pages/JobCategoryPage";
import TechnicianPage from "./pages/TechnicianPage";
import ServiceCyclePage from "./pages/ServiceCyclePage";
import CustomerConfirmation from "./pages/CustomerConfirmation";
import CustomersPage from "./pages/CustomersPage";
import NotFound from "./pages/NotFound";
import DailyRoutePage from "./pages/DailyRoutePage";
import WorkSchedulePage from "./pages/WorkSchedulePage";

const queryClient = new QueryClient();

const App = () => ( 
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <JobsProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/daily-route" element={<DailyRoutePage />} />
              <Route path="/malfunctions" element={<JobCategoryPage category="malfunctions" />} />
              <Route path="/installations" element={<JobCategoryPage category="installations" />} />
              <Route path="/service" element={<ServiceCyclePage />} />
              <Route path="/work-schedule" element={<WorkSchedulePage />} />
              <Route path="/technician" element={<TechnicianPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/confirm" element={<CustomerConfirmation />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </JobsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
