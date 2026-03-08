import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import NowPlayingBar from "./components/NowPlayingBar";
import BottomNav from "./components/BottomNav";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import StreakPage from "./pages/StreakPage";
import MusicPage from "./pages/MusicPage";
import ProfilePage from "./pages/ProfilePage";
import CameraPage from "./pages/CameraPage";
import ActivityPage from "./pages/ActivityPage";
import HealthReportPage from "./pages/HealthReportPage";
import JaxAIPage from "./pages/JaxAIPage";
import RunningPage from "./pages/RunningPage";
import PremiumPage from "./pages/PremiumPage";
import NutritionPage from "./pages/NutritionPage";
import HabitTrackerPage from "./pages/HabitTrackerPage";
import MentalWellnessPage from "./pages/MentalWellnessPage";
import WorkoutPlannerPage from "./pages/WorkoutPlannerPage";
import ProgressPage from "./pages/ProgressPage";
import BattleArenaPage from "./pages/BattleArenaPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-md mx-auto relative">
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/streak" element={<ProtectedRoute><StreakPage /></ProtectedRoute>} />
        <Route path="/music" element={<ProtectedRoute><MusicPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/camera" element={<ProtectedRoute><CameraPage /></ProtectedRoute>} />
        <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><HealthReportPage /></ProtectedRoute>} />
        <Route path="/jax" element={<ProtectedRoute><JaxAIPage /></ProtectedRoute>} />
        <Route path="/running" element={<ProtectedRoute><RunningPage /></ProtectedRoute>} />
        <Route path="/premium" element={<ProtectedRoute><PremiumPage /></ProtectedRoute>} />
        <Route path="/nutrition" element={<ProtectedRoute><NutritionPage /></ProtectedRoute>} />
        <Route path="/habits" element={<ProtectedRoute><HabitTrackerPage /></ProtectedRoute>} />
        <Route path="/wellness" element={<ProtectedRoute><MentalWellnessPage /></ProtectedRoute>} />
        <Route path="/planner" element={<ProtectedRoute><WorkoutPlannerPage /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
        <Route path="/battles" element={<ProtectedRoute><BattleArenaPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {user && <NowPlayingBar />}
      {user && <BottomNav />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AudioPlayerProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AudioPlayerProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
