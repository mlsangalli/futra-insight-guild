import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
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
import HowItWorks from "./pages/HowItWorks";
import CreateMarket from "./pages/CreateMarket";
import Watchlist from "./pages/Watchlist";
import SearchResults from "./pages/SearchResults";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/category/:category" element={<Category />} />
            <Route path="/market/:id" element={<MarketDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/create-market" element={<CreateMarket />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
