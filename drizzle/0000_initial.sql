CREATE TYPE "public"."connection_status" AS ENUM('connected', 'requires_reconnect', 'disconnected');
CREATE TYPE "public"."post_status" AS ENUM('draft', 'scheduled', 'publishing', 'posted', 'failed', 'requires_reconnect', 'cancelled');
CREATE TYPE "public"."post_attempt_outcome" AS ENUM('succeeded', 'retryable_failure', 'permanent_failure', 'requires_reconnect');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text,
  "email" text NOT NULL,
  "password_hash" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "linkedin_apps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "client_id" text NOT NULL,
  "client_secret_enc" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "linkedin_apps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);

CREATE TABLE "linkedin_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "linkedin_app_id" uuid NOT NULL,
  "person_urn" text NOT NULL,
  "access_token_enc" text NOT NULL,
  "access_token_expires_at" timestamp with time zone NOT NULL,
  "status" "connection_status" DEFAULT 'connected' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "linkedin_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade,
  CONSTRAINT "linkedin_connections_linkedin_app_id_linkedin_apps_id_fk" FOREIGN KEY ("linkedin_app_id") REFERENCES "public"."linkedin_apps"("id") ON DELETE cascade
);

CREATE TABLE "oauth_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "state_hash" text NOT NULL,
  "user_id" uuid NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "oauth_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);

CREATE TABLE "posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "content" text NOT NULL,
  "image_url" text,
  "image_public_id" text,
  "scheduled_at" timestamp with time zone,
  "timezone" text,
  "status" "post_status" DEFAULT 'draft' NOT NULL,
  "claim_token" uuid,
  "claim_expires_at" timestamp with time zone,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "linkedin_post_urn" text,
  "error_code" text,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);

CREATE TABLE "post_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "attempt_number" integer NOT NULL,
  "outcome" "post_attempt_outcome",
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "provider_metadata" jsonb,
  "error_code" text,
  "error_message" text,
  CONSTRAINT "post_attempts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade
);

CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");
CREATE UNIQUE INDEX "linkedin_apps_user_id_unique" ON "linkedin_apps" USING btree ("user_id");
CREATE UNIQUE INDEX "linkedin_connections_user_id_unique" ON "linkedin_connections" USING btree ("user_id");
CREATE UNIQUE INDEX "linkedin_connections_person_urn_unique" ON "linkedin_connections" USING btree ("person_urn");
CREATE UNIQUE INDEX "oauth_states_state_hash_unique" ON "oauth_states" USING btree ("state_hash");
CREATE INDEX "oauth_states_expires_at_idx" ON "oauth_states" USING btree ("expires_at");
CREATE INDEX "posts_status_scheduled_at_idx" ON "posts" USING btree ("status", "scheduled_at");
CREATE INDEX "posts_user_id_scheduled_at_idx" ON "posts" USING btree ("user_id", "scheduled_at");
CREATE UNIQUE INDEX "post_attempts_post_id_attempt_number_unique" ON "post_attempts" USING btree ("post_id", "attempt_number");
CREATE INDEX "post_attempts_post_id_idx" ON "post_attempts" USING btree ("post_id");
