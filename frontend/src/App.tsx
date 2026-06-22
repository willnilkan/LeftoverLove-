import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AddFood from "./pages/AddFood";
import EditFood from "./pages/EditFood";
import FoodMap from "./pages/FoodMap";
import Profile from "./pages/Profile";
import BrowseFoods from "./pages/BrowseFoods";
import MyFoods from "./pages/MyFoods";
import MyRequests from "./pages/MyRequests";
import DonorRequests from "./pages/DonorRequests";
import Admin from "./pages/Admin";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/add-food" element={<AddFood />} />
            <Route path="/edit-food/:id" element={<EditFood />} />
            <Route path="/food-map" element={<FoodMap />} />
            <Route path="/foods" element={<BrowseFoods />} />
            <Route path="/my-foods" element={<MyFoods />} />
            <Route path="/my-requests" element={<MyRequests />} />
            <Route path="/donor-requests" element={<DonorRequests />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
