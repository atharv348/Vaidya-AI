import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.tsx";
import AICoach from "./pages/AICoach.tsx";
import Diagnosis from "./pages/Diagnosis.tsx";
import MealPlan from "./pages/MealPlan.tsx";
import WorkoutPlan from "./pages/WorkoutPlan.tsx";
import Achievements from "./pages/Achievements.tsx";
import FindHospital from "./pages/FindHospital.tsx";
import ActivityLog from "./pages/ActivityLog.tsx";
import Settings from "./pages/Settings.tsx";
import SahayakAI from "./pages/SahayakAI.tsx";
import ManasMitra from "./pages/ManasMitra.tsx";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col">
                      <div className="lg:hidden flex items-center p-2 border-b border-border">
                        <SidebarTrigger />
                      </div>
                      <div className="flex-1 overflow-auto bg-muted/20">
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/dashboard" element={<Navigate to="/" replace />} />
                          <Route path="/coach" element={<AICoach />} />
                          <Route path="/diagnosis" element={<Diagnosis />} />
                          <Route path="/meals" element={<MealPlan />} />
                          <Route path="/workouts" element={<WorkoutPlan />} />
                          <Route path="/achievements" element={<Achievements />} />
                          <Route path="/hospitals" element={<FindHospital />} />
                          <Route path="/activity" element={<ActivityLog />} />
                          <Route path="/sahayak" element={<SahayakAI />} />
                          <Route path="/manasmitra" element={<ManasMitra />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </div>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
