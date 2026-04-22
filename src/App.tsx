import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { parseSupabaseError } from "@/lib/api-error";
import { QUERY_STALE, QUERY_GC } from "@/lib/query-config";
import Index from "./pages/Index";
import Browse from "./pages/Browse";
import Category from "./pages/Category";
import MarketDetail from "./pages/MarketDetail";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import HowItWorks from "./pages/HowItWorks";
import CreateMarket from "./pages/CreateMarket";
import Watchlist from "./pages/Watchlist";
import SearchResults from "./pages/SearchResults";
import Notifications from "./pages/Notifications";
import Missions from "./pages/Missions";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMarkets from "./pages/admin/AdminMarkets";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminContent from "./pages/admin/AdminContent";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminLogs from "./pages/admin/AdminLogs";
import Forbidden from "./pages/admin/Forbidden";
import HealthCheck from "./pages/HealthCheck";
import BracketIndex from "./pages/bracket/BracketIndex";
import BracketPage from "./pages/bracket/BracketPage";
import Flow from "./pages/Flow";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const message = (query.meta?.errorMessage as string) || parseSupabaseError(error);
      logger.error('Query error', { queryKey: JSON.stringify(query.queryKey), error: message });
      if (query.state.data !== undefined) {
        toast.error(message);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const message = parseSupabaseError(error);
      logger.error('Mutation error', { error: message });
      toast.error(message);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE.short,
      gcTime: QUERY_GC.medium,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/browse" element={<Browse />} />
                    <Route path="/category/:category" element={<Category />} />
                    <Route path="/market/:id" element={<MarketDetail />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/profile/:username" element={<Profile />} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/how-it-works" element={<HowItWorks />} />
                    <Route path="/create-market" element={<ProtectedRoute><CreateMarket /></ProtectedRoute>} />
                    <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
                    <Route path="/search" element={<SearchResults />} />
                    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                    <Route path="/missions" element={<ProtectedRoute><Missions /></ProtectedRoute>} />
                    <Route path="/about" element={<About />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/bracket" element={<BracketIndex />} />
                    <Route path="/bracket/:slug" element={<BracketPage />} />
                    <Route path="/flow" element={<ProtectedRoute><Flow /></ProtectedRoute>} />
                    <Route path="/forbidden" element={<Forbidden />} />
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/admin/markets" element={<AdminRoute><AdminMarkets /></AdminRoute>} />
                    <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
                    <Route path="/admin/content" element={<AdminRoute><AdminContent /></AdminRoute>} />
                    <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                    <Route path="/admin/logs" element={<AdminRoute><AdminLogs /></AdminRoute>} />
                    <Route path="/health" element={<AdminRoute><HealthCheck /></AdminRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </HelmetProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
