import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const connectionStatus = pgEnum("connection_status", [
  "connected",
  "requires_reconnect",
  "disconnected",
]);

export const postStatus = pgEnum("post_status", [
  "draft",
  "scheduled",
  "publishing",
  "posted",
  "failed",
  "requires_reconnect",
  "cancelled",
]);

export const attemptOutcome = pgEnum("post_attempt_outcome", [
  "succeeded",
  "retryable_failure",
  "permanent_failure",
  "requires_reconnect",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

/**
 * Kept per user because the supplied environment configuration does not include
 * application-owned LinkedIn credentials. Never select clientSecretEnc for UI.
 */
export const linkedinApps = pgTable(
  "linkedin_apps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    clientSecretEnc: text("client_secret_enc").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("linkedin_apps_user_id_unique").on(table.userId)],
);

export const linkedinConnections = pgTable(
  "linkedin_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    linkedinAppId: uuid("linkedin_app_id")
      .notNull()
      .references(() => linkedinApps.id, { onDelete: "cascade" }),
    personUrn: text("person_urn").notNull(),
    accessTokenEnc: text("access_token_enc").notNull(),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }).notNull(),
    status: connectionStatus("status").notNull().default("connected"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("linkedin_connections_user_id_unique").on(table.userId),
    uniqueIndex("linkedin_connections_person_urn_unique").on(table.personUrn),
  ],
);

export const oauthStates = pgTable(
  "oauth_states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stateHash: text("state_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("oauth_states_state_hash_unique").on(table.stateHash),
    index("oauth_states_expires_at_idx").on(table.expiresAt),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    imagePublicId: text("image_public_id"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    timezone: text("timezone"),
    status: postStatus("status").notNull().default("draft"),
    claimToken: uuid("claim_token"),
    claimExpiresAt: timestamp("claim_expires_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    linkedinPostUrn: text("linkedin_post_urn"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("posts_status_scheduled_at_idx").on(table.status, table.scheduledAt),
    index("posts_user_id_scheduled_at_idx").on(table.userId, table.scheduledAt),
  ],
);

export const postAttempts = pgTable(
  "post_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    outcome: attemptOutcome("outcome"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    providerMetadata: jsonb("provider_metadata").$type<Record<string, unknown>>(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
  },
  (table) => [
    uniqueIndex("post_attempts_post_id_attempt_number_unique").on(table.postId, table.attemptNumber),
    index("post_attempts_post_id_idx").on(table.postId),
  ],
);
