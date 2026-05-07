import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import AdminOverview from "@/pages/AdminOverview";
import AdminUsers from "@/pages/AdminUsers";
import AdminBilling from "@/pages/AdminBilling";
import AdminSystem from "@/pages/AdminSystem";
import AdminActivity from "@/pages/AdminActivity";
import AdminServices from "@/pages/AdminServices";
import Workspace from "@/pages/Workspace";
import Pricing from "@/pages/Pricing";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Refund from "@/pages/Refund";
import AuthCallback from "@/pages/AuthCallback";
import ResetPassword from "@/pages/ResetPassword";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/pricing"} component={Pricing} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/refund"} component={Refund} />
      <Route path={"/auth/callback"} component={AuthCallback} />
      <Route path={"/auth/reset-password"} component={ResetPassword} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/admin/overview"} component={AdminOverview} />
      <Route path={"/admin/users"} component={AdminUsers} />
      <Route path={"/admin/subscriptions"} component={AdminBilling} />
      <Route path={"/admin/billing"} component={AdminBilling} />
      <Route path={"/admin/ai-management"} component={AdminSystem} />
      <Route path={"/admin/system"} component={AdminSystem} />
      <Route path={"/admin/activity"} component={AdminActivity} />
      <Route path={"/admin/services"} component={AdminServices} />
      <Route path={"/workspace/:projectId"} component={Workspace} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
