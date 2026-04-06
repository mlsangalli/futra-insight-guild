import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
const NotFound = React.lazy(() => import("./pages/NotFound"));
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const AdminMarkets = React.lazy(() => import("./pages/admin/AdminMarkets"));
const AdminCategories = React.lazy(() => import("./pages/admin/AdminCategories"));
const AdminContent = React.lazy(() => import("./pages/admin/AdminContent"));
const AdminUsers = React.lazy(() => import("./pages/admin/AdminUsers"));
const AdminLogs = React.lazy(() => import("./pages/admin/AdminLogs"));
const Forbidden = React.lazy(() => import("./pages/admin/Forbidden"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
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
                    <Route path="/forbidden" element={<Forbidden />} />
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/admin/markets" element={<AdminRoute><AdminMarkets /></AdminRoute>} />
                    <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
                    <Route path="/admin/content" element={<AdminRoute><AdminContent /></AdminRoute>} />
                    <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                    <Route path="/admin/logs" element={<AdminRoute><AdminLogs /></AdminRoute>} />
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

export default App;
