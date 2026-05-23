ALTER TABLE "projects" ADD COLUMN "framework_kind" text DEFAULT 'nextjs' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "runtime_kind" text DEFAULT 'node' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "template_key" text DEFAULT 'nextjs-app-router' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "template_version" text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "install_command" text DEFAULT 'npm ci' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "build_command" text DEFAULT 'npm run build' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "start_command" text DEFAULT 'npm start' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "dev_command" text DEFAULT 'npm run dev' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "default_port" integer DEFAULT 3000 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "healthcheck_path" text DEFAULT '/' NOT NULL;