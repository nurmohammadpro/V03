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
import { PublicLayout } from "./components/public/PublicLayout";
import Home from "./pages/Home";
import LoaderDemo from "./pages/LoaderDemo";

const queryClient = new QueryClient();

/** Wrap a page component so it inherits the public gradient background */
function publicPage(Component: React.ComponentType) {
  const Wrapped = () => (
    <PublicLayout>
      <Component />
    </PublicLayout>
  );
  Wrapped.displayName = `publicPage(${Component.displayName || Component.name || "Component"})`;
  return Wrapped;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={publicPage(Home)} />
      <Route path={"/pricing"} component={publicPage(Pricing)} />
      <Route path={"/terms"} component={publicPage(Terms)} />
      <Route path={"/privacy"} component={publicPage(Privacy)} />
      <Route path={"/refund"} component={publicPage(Refund)} />
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
      <Route path={"/loader-demo"} component={publicPage(LoaderDemo)} />
      <Route path={"/404"} component={publicPage(NotFound)} />
      <Route component={publicPage(NotFound)} />
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
