import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageLoader } from "@/components/PageLoader";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { parseSupabaseError } from "@/lib/api-error";
import { QUERY_STALE, QUERY_GC } from "@/lib/query-config";

const Index = React.lazy(() => import("./pages/Index"));
const Browse = React.lazy(() => import("./pages/Browse"));
const Category = React.lazy(() => import("./pages/Category"));
const MarketDetail = React.lazy(() => import("./pages/MarketDetail"));
const Leaderboard = React.lazy(() => import("./pages/Leaderboard"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Login = React.lazy(() => import("./pages/Login"));
const Signup = React.lazy(() => import("./pages/Signup"));
const Onboarding = React.lazy(() => import("./pages/Onboarding"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = React.lazy(() => import("./pages/VerifyEmail"));
const HowItWorks = React.lazy(() => import("./pages/HowItWorks"));
const CreateMarket = React.lazy(() => import("./pages/CreateMarket"));
const Watchlist = React.lazy(() => import("./pages/Watchlist"));
const SearchResults = React.lazy(() => import("./pages/SearchResults"));
const Notifications = React.lazy(() => import("./pages/Notifications"));
const Missions = React.lazy(() => import("./pages/Missions"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const About = React.lazy(() => import("./pages/About"));
const Terms = React.lazy(() => import("./pages/Terms"));
const Privacy = React.lazy(() => import("./pages/Privacy"));
const Contact = React.lazy(() => import("./pages/Contact"));
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const AdminMarkets = React.lazy(() => import("./pages/admin/AdminMarkets"));
const AdminCategories = React.lazy(() => import("./pages/admin/AdminCategories"));
const AdminContent = React.lazy(() => import("./pages/admin/AdminContent"));
const AdminUsers = React.lazy(() => import("./pages/admin/AdminUsers"));
const AdminLogs = React.lazy(() => import("./pages/admin/AdminLogs"));
const Forbidden = React.lazy(() => import("./pages/admin/Forbidden"));
const HealthCheck = React.lazy(() => import("./pages/HealthCheck"));
const BracketIndex = React.lazy(() => import("./pages/bracket/BracketIndex"));
const BracketPage = React.lazy(() => import("./pages/bracket/BracketPage"));

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
  // Prefetch das rotas mais acessadas após 2 segundos
  React.useEffect(() => {
    const timer = setTimeout(() => {
      import('./pages/Browse');
      import('./pages/MarketDetail');
      import('./pages/Leaderboard');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
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
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </HelmetProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
