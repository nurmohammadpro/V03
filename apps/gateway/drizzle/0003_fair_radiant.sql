CREATE TABLE IF NOT EXISTS "ai_provider_secrets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL REFERENCES "ai_providers"("id") ON DELETE CASCADE,
  "api_key_enc" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "ai_provider_secrets_provider_unique" ON "ai_provider_secrets" ("provider_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_provider_secrets_provider_id_idx" ON "ai_provider_secrets" ("provider_id");--> statement-breakpoint
