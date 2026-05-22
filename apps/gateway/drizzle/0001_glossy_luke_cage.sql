CREATE TABLE "build_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"mode" text DEFAULT 'build' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"runner_ref" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"logs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_blobs" (
	"sha256" text PRIMARY KEY NOT NULL,
	"size_bytes" integer NOT NULL,
	"is_binary" boolean DEFAULT false NOT NULL,
	"text_content" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_file_ops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"op" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"intent" text DEFAULT 'component' NOT NULL,
	"target_path" text,
	"framework" text,
	"apply_mode" text DEFAULT 'propose' NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"prompt" text NOT NULL,
	"provider_id" uuid,
	"model_key" text,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preview_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'starting' NOT NULL,
	"url" text,
	"ports" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"runner_ref" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "project_file_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_file_id" uuid NOT NULL,
	"blob_sha256" text NOT NULL,
	"actor_user_id" uuid,
	"source" text DEFAULT 'manual' NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"path" text NOT NULL,
	"file_type" text DEFAULT 'file' NOT NULL,
	"parent_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "build_runs" ADD CONSTRAINT "build_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_runs" ADD CONSTRAINT "build_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_events" ADD CONSTRAINT "generation_events_run_id_generation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."generation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_file_ops" ADD CONSTRAINT "generation_file_ops_run_id_generation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."generation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_provider_id_ai_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preview_instances" ADD CONSTRAINT "preview_instances_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preview_instances" ADD CONSTRAINT "preview_instances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_file_versions" ADD CONSTRAINT "project_file_versions_project_file_id_project_files_id_fk" FOREIGN KEY ("project_file_id") REFERENCES "public"."project_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_file_versions" ADD CONSTRAINT "project_file_versions_blob_sha256_file_blobs_sha256_fk" FOREIGN KEY ("blob_sha256") REFERENCES "public"."file_blobs"("sha256") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_file_versions" ADD CONSTRAINT "project_file_versions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "build_runs_project_id_idx" ON "build_runs" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_events_run_seq_unique" ON "generation_events" USING btree ("run_id","seq");--> statement-breakpoint
CREATE INDEX "generation_events_run_id_idx" ON "generation_events" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_file_ops_run_seq_unique" ON "generation_file_ops" USING btree ("run_id","seq");--> statement-breakpoint
CREATE INDEX "generation_file_ops_run_id_idx" ON "generation_file_ops" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "generation_runs_project_id_idx" ON "generation_runs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "generation_runs_user_id_idx" ON "generation_runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "preview_instances_project_id_idx" ON "preview_instances" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_file_versions_file_id_idx" ON "project_file_versions" USING btree ("project_file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_files_project_path_unique" ON "project_files" USING btree ("project_id","path");--> statement-breakpoint
CREATE INDEX "project_files_project_id_idx" ON "project_files" USING btree ("project_id");