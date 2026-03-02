-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STRATEGIST',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "industry_type" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_value" REAL NOT NULL,
    "tolerance_pct" INTEGER NOT NULL DEFAULT 15,
    "evaluation_window_days" INTEGER NOT NULL DEFAULT 7,
    "profit_margin_pct" REAL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slack_webhook_url" TEXT
);

-- CreateTable
CREATE TABLE "client_invites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    CONSTRAINT "client_invites_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "data_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "category" TEXT NOT NULL DEFAULT 'DATA_SOURCE',
    "external_id" TEXT NOT NULL,
    "config" JSONB,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "linked_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" DATETIME,
    "connector_id" TEXT,
    "sync_interval" INTEGER NOT NULL DEFAULT 1440,
    "lookback_days" INTEGER NOT NULL DEFAULT 30,
    "sync_status" TEXT NOT NULL DEFAULT 'NONE',
    "sync_error" TEXT,
    CONSTRAINT "data_sources_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "data_sources_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connector_definitions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "uptime_checks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data_source_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "response_time" INTEGER NOT NULL,
    "status_code" INTEGER,
    "checked_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uptime_checks_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaign_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "campaign_name" TEXT NOT NULL,
    "campaign_type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "spend" REAL NOT NULL,
    "conversions" REAL NOT NULL,
    "conversion_value" REAL NOT NULL,
    "clicks" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "serving_status" TEXT NOT NULL,
    "data_source_id" TEXT,
    CONSTRAINT "campaign_metrics_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "campaign_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "merchant_center_health" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "total_items" INTEGER NOT NULL,
    "disapproved_items" INTEGER NOT NULL,
    "disapproved_pct" REAL NOT NULL,
    "top_reasons" JSONB NOT NULL,
    "account_issues" JSONB NOT NULL,
    CONSTRAINT "merchant_center_health_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analyst_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "health_score" INTEGER NOT NULL,
    "health_score_breakdown" JSONB NOT NULL,
    "deviation_pct" REAL NOT NULL,
    "trend_direction" TEXT NOT NULL,
    "report_json" JSONB NOT NULL,
    "input_json" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analyst_reports_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "advisor_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analyst_report_id" TEXT NOT NULL,
    "advice_json" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reviewed_by_id" TEXT,
    "reviewed_at" DATETIME,
    "executed_at" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "advisor_reports_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "advisor_reports_analyst_report_id_fkey" FOREIGN KEY ("analyst_report_id") REFERENCES "analyst_reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "prompt_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "input_json" JSONB NOT NULL,
    "output_json" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "token_count" INTEGER,
    "latency_ms" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "global_settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "linked_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data_source_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "kind" TEXT NOT NULL DEFAULT 'USER',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "linked_accounts_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "role_mapping" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "status_code" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "monitored_pages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data_source_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_status" INTEGER,
    "last_checked_at" DATETIME,
    CONSTRAINT "monitored_pages_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "data_source_id" TEXT,
    "title" TEXT NOT NULL,
    "cause" TEXT NOT NULL,
    "cause_code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "checked_url" TEXT,
    "http_method" TEXT NOT NULL DEFAULT 'GET',
    "status_code" INTEGER,
    "response_time" REAL,
    "resolved_ip" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" DATETIME,
    "acknowledged_by" TEXT,
    "resolved_at" DATETIME,
    "resolved_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "incidents_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "incidents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "incident_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incident_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "user_id" TEXT,
    "user_name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "incident_events_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "connector_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "auth_type" TEXT NOT NULL,
    "oauth_scopes" TEXT,
    "api_base_url" TEXT,
    "icon_url" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config_schema" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "data_source_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data_source_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Amsterdam',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "data_source_accounts_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dimension_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connector_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "canonical_name" TEXT,
    "level" TEXT,
    "data_type" TEXT NOT NULL DEFAULT 'STRING',
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dimension_definitions_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connector_definitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "metric_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connector_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "canonical_name" TEXT,
    "level" TEXT,
    "data_type" TEXT NOT NULL DEFAULT 'NUMBER',
    "aggregation_type" TEXT NOT NULL DEFAULT 'SUM',
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "metric_definitions_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connector_definitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "datasets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "datasets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dataset_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dataset_id" TEXT NOT NULL,
    "data_source_id" TEXT NOT NULL,
    "level" TEXT,
    "dimension_mapping" JSONB,
    "metric_mapping" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dataset_sources_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "derived_metric_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connector_id" TEXT,
    "client_id" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "input_metrics" JSONB NOT NULL,
    "output_type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "derived_metric_definitions_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connector_definitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data_source_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "level" TEXT,
    "date_from" DATETIME,
    "date_to" DATETIME,
    "records_fetched" INTEGER,
    "records_stored" INTEGER,
    "error_message" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sync_jobs_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sync_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "sync_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ClientAccess" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ClientAccess_A_fkey" FOREIGN KEY ("A") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ClientAccess_B_fkey" FOREIGN KEY ("B") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_NotificationUsers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_NotificationUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_NotificationUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_key" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verification_tokens_email_idx" ON "email_verification_tokens"("email");

-- CreateIndex
CREATE INDEX "email_verification_tokens_token_idx" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "client_invites_token_key" ON "client_invites"("token");

-- CreateIndex
CREATE INDEX "client_invites_client_id_idx" ON "client_invites"("client_id");

-- CreateIndex
CREATE INDEX "client_invites_token_idx" ON "client_invites"("token");

-- CreateIndex
CREATE INDEX "client_invites_email_idx" ON "client_invites"("email");

-- CreateIndex
CREATE INDEX "data_sources_client_id_type_idx" ON "data_sources"("client_id", "type");

-- CreateIndex
CREATE INDEX "data_sources_connector_id_idx" ON "data_sources"("connector_id");

-- CreateIndex
CREATE INDEX "data_sources_sync_status_idx" ON "data_sources"("sync_status");

-- CreateIndex
CREATE INDEX "uptime_checks_data_source_id_checked_at_idx" ON "uptime_checks"("data_source_id", "checked_at");

-- CreateIndex
CREATE INDEX "campaign_metrics_client_id_date_idx" ON "campaign_metrics"("client_id", "date");

-- CreateIndex
CREATE INDEX "campaign_metrics_campaign_id_date_idx" ON "campaign_metrics"("campaign_id", "date");

-- CreateIndex
CREATE INDEX "campaign_metrics_data_source_id_idx" ON "campaign_metrics"("data_source_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_metrics_campaign_id_date_key" ON "campaign_metrics"("campaign_id", "date");

-- CreateIndex
CREATE INDEX "merchant_center_health_client_id_date_idx" ON "merchant_center_health"("client_id", "date");

-- CreateIndex
CREATE INDEX "analyst_reports_client_id_created_at_idx" ON "analyst_reports"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "analyst_reports_client_id_period_end_idx" ON "analyst_reports"("client_id", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "advisor_reports_analyst_report_id_key" ON "advisor_reports"("analyst_report_id");

-- CreateIndex
CREATE INDEX "advisor_reports_status_idx" ON "advisor_reports"("status");

-- CreateIndex
CREATE INDEX "prompt_logs_client_id_created_at_idx" ON "prompt_logs"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "prompt_logs_type_idx" ON "prompt_logs"("type");

-- CreateIndex
CREATE INDEX "linked_accounts_email_idx" ON "linked_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "linked_accounts_data_source_id_email_key" ON "linked_accounts"("data_source_id", "email");

-- CreateIndex
CREATE INDEX "notifications_client_id_read_created_at_idx" ON "notifications"("client_id", "read", "created_at");

-- CreateIndex
CREATE INDEX "notifications_client_id_url_status_code_read_idx" ON "notifications"("client_id", "url", "status_code", "read");

-- CreateIndex
CREATE INDEX "monitored_pages_data_source_id_idx" ON "monitored_pages"("data_source_id");

-- CreateIndex
CREATE INDEX "incidents_client_id_status_idx" ON "incidents"("client_id", "status");

-- CreateIndex
CREATE INDEX "incidents_data_source_id_idx" ON "incidents"("data_source_id");

-- CreateIndex
CREATE INDEX "incidents_started_at_idx" ON "incidents"("started_at");

-- CreateIndex
CREATE INDEX "incident_events_incident_id_created_at_idx" ON "incident_events"("incident_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "connector_definitions_slug_key" ON "connector_definitions"("slug");

-- CreateIndex
CREATE INDEX "connector_definitions_category_idx" ON "connector_definitions"("category");

-- CreateIndex
CREATE INDEX "data_source_accounts_data_source_id_idx" ON "data_source_accounts"("data_source_id");

-- CreateIndex
CREATE UNIQUE INDEX "data_source_accounts_data_source_id_external_id_key" ON "data_source_accounts"("data_source_id", "external_id");

-- CreateIndex
CREATE INDEX "dimension_definitions_connector_id_idx" ON "dimension_definitions"("connector_id");

-- CreateIndex
CREATE INDEX "dimension_definitions_canonical_name_idx" ON "dimension_definitions"("canonical_name");

-- CreateIndex
CREATE UNIQUE INDEX "dimension_definitions_connector_id_slug_level_key" ON "dimension_definitions"("connector_id", "slug", "level");

-- CreateIndex
CREATE INDEX "metric_definitions_connector_id_idx" ON "metric_definitions"("connector_id");

-- CreateIndex
CREATE INDEX "metric_definitions_canonical_name_idx" ON "metric_definitions"("canonical_name");

-- CreateIndex
CREATE UNIQUE INDEX "metric_definitions_connector_id_slug_level_key" ON "metric_definitions"("connector_id", "slug", "level");

-- CreateIndex
CREATE INDEX "datasets_client_id_idx" ON "datasets"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "datasets_client_id_slug_key" ON "datasets"("client_id", "slug");

-- CreateIndex
CREATE INDEX "dataset_sources_dataset_id_idx" ON "dataset_sources"("dataset_id");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_sources_dataset_id_data_source_id_level_key" ON "dataset_sources"("dataset_id", "data_source_id", "level");

-- CreateIndex
CREATE INDEX "derived_metric_definitions_connector_id_idx" ON "derived_metric_definitions"("connector_id");

-- CreateIndex
CREATE INDEX "derived_metric_definitions_client_id_idx" ON "derived_metric_definitions"("client_id");

-- CreateIndex
CREATE INDEX "sync_jobs_data_source_id_status_idx" ON "sync_jobs"("data_source_id", "status");

-- CreateIndex
CREATE INDEX "sync_jobs_created_at_idx" ON "sync_jobs"("created_at");

-- CreateIndex
CREATE INDEX "sync_logs_job_id_created_at_idx" ON "sync_logs"("job_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "_ClientAccess_AB_unique" ON "_ClientAccess"("A", "B");

-- CreateIndex
CREATE INDEX "_ClientAccess_B_index" ON "_ClientAccess"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_NotificationUsers_AB_unique" ON "_NotificationUsers"("A", "B");

-- CreateIndex
CREATE INDEX "_NotificationUsers_B_index" ON "_NotificationUsers"("B");
