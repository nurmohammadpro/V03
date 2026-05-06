import {
  Activity,
  Bot,
  Blocks,
  CreditCard,
  FolderKanban,
  Gauge,
  HardDrive,
  Layers3,
  Settings2,
  Users,
} from "lucide-react";

export const WORKSPACE_NAV_SECTIONS = [
  {
    title: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <FolderKanban className="w-4 h-4" />,
        description: "Projects, drafts, and usage",
      },
      {
        label: "Workspace",
        href: "/workspace/new",
        icon: <Blocks className="w-4 h-4" />,
        description: "Prompt, code, and preview",
      },
    ],
  },
] as const;

export const ADMIN_NAV_SECTIONS = [
  {
    title: "Admin",
    items: [
      {
        label: "Overview",
        href: "/admin/overview",
        icon: <Gauge className="w-4 h-4" />,
        description: "Platform health and usage",
      },
      {
        label: "Users",
        href: "/admin/users",
        icon: <Users className="w-4 h-4" />,
        description: "Accounts, roles, and status",
      },
      {
        label: "Subscriptions",
        href: "/admin/subscriptions",
        icon: <CreditCard className="w-4 h-4" />,
        description: "Plans, revenue, and payment signals",
      },
      {
        label: "AI Management",
        href: "/admin/ai-management",
        icon: <Bot className="w-4 h-4" />,
        description: "Providers, usage, and generation load",
      },
      {
        label: "Other Services",
        href: "/admin/services",
        icon: <Layers3 className="w-4 h-4" />,
        description: "Storage, runtime, and service surfaces",
      },
    ],
  },
  {
    title: "Monitoring",
    items: [
      {
        label: "System",
        href: "/admin/system",
        icon: <Settings2 className="w-4 h-4" />,
        description: "Queue, errors, and stability",
      },
      {
        label: "Activity",
        href: "/admin/activity",
        icon: <Activity className="w-4 h-4" />,
        description: "Recent platform events",
      },
      {
        label: "Storage",
        href: "/admin/services",
        icon: <HardDrive className="w-4 h-4" />,
        description: "Capacity and runtime surfaces",
      },
    ],
  },
] as const;
