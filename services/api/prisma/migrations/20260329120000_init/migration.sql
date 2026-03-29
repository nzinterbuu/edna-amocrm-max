-- CreateTable
CREATE TABLE "installations" (
    "id" UUID NOT NULL,
    "amocrm_account_id" VARCHAR(64) NOT NULL,
    "amocrm_subdomain" VARCHAR(255) NOT NULL,
    "referer" VARCHAR(512),
    "oauth_access_token" TEXT NOT NULL,
    "oauth_refresh_token" TEXT NOT NULL,
    "oauth_expires_at" TIMESTAMPTZ NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edna_tenants" (
    "id" UUID NOT NULL,
    "installation_id" UUID NOT NULL,
    "edna_tenant_external_id" VARCHAR(128) NOT NULL,
    "auth_state" VARCHAR(32) NOT NULL DEFAULT 'connected',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "edna_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_connections" (
    "id" UUID NOT NULL,
    "installation_id" UUID NOT NULL,
    "edna_tenant_id" UUID NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "max_bot_id" VARCHAR(128) NOT NULL,
    "channel_id" VARCHAR(128) NOT NULL,
    "scope_id" VARCHAR(255) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "connected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnected_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "channel_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_mappings" (
    "id" UUID NOT NULL,
    "channel_connection_id" UUID NOT NULL,
    "max_chat_id" VARCHAR(255) NOT NULL,
    "max_user_id" VARCHAR(255) NOT NULL,
    "amocrm_conversation_id" VARCHAR(255) NOT NULL,
    "amocrm_contact_id" BIGINT,
    "amocrm_lead_id" BIGINT,
    "first_message_at" TIMESTAMPTZ,
    "last_message_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "conversation_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_mappings" (
    "id" UUID NOT NULL,
    "channel_connection_id" UUID NOT NULL,
    "conversation_mapping_id" UUID,
    "direction" VARCHAR(16) NOT NULL,
    "source_system" VARCHAR(16) NOT NULL,
    "source_message_id" VARCHAR(255) NOT NULL,
    "target_message_id" VARCHAR(255),
    "amo_msgid" VARCHAR(255),
    "payload" JSONB NOT NULL,
    "delivery_status" VARCHAR(32) NOT NULL DEFAULT 'accepted',
    "error_code" VARCHAR(64),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "message_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" UUID NOT NULL,
    "channel_connection_id" UUID,
    "source" VARCHAR(32) NOT NULL,
    "request_headers" JSONB,
    "request_body" JSONB,
    "response_status" INTEGER,
    "response_body" JSONB,
    "processing_status" VARCHAR(32) NOT NULL DEFAULT 'accepted',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_errors" (
    "id" UUID NOT NULL,
    "channel_connection_id" UUID,
    "installation_id" UUID,
    "scope" VARCHAR(64) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "integration_errors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "installations_amocrm_account_id_key" ON "installations"("amocrm_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "edna_tenants_installation_id_edna_tenant_external_id_key" ON "edna_tenants"("installation_id", "edna_tenant_external_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_connections_scope_id_key" ON "channel_connections"("scope_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_connections_installation_id_max_bot_id_key" ON "channel_connections"("installation_id", "max_bot_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_mappings_channel_connection_id_max_chat_id_key" ON "conversation_mappings"("channel_connection_id", "max_chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_mappings_channel_connection_id_amocrm_conversation_key" ON "conversation_mappings"("channel_connection_id", "amocrm_conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_mappings_channel_connection_id_source_system_source_m_key" ON "message_mappings"("channel_connection_id", "source_system", "source_message_id");

-- AddForeignKey
ALTER TABLE "edna_tenants" ADD CONSTRAINT "edna_tenants_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_connections" ADD CONSTRAINT "channel_connections_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_connections" ADD CONSTRAINT "channel_connections_edna_tenant_id_fkey" FOREIGN KEY ("edna_tenant_id") REFERENCES "edna_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_mappings" ADD CONSTRAINT "conversation_mappings_channel_connection_id_fkey" FOREIGN KEY ("channel_connection_id") REFERENCES "channel_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_mappings" ADD CONSTRAINT "message_mappings_channel_connection_id_fkey" FOREIGN KEY ("channel_connection_id") REFERENCES "channel_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_mappings" ADD CONSTRAINT "message_mappings_conversation_mapping_id_fkey" FOREIGN KEY ("conversation_mapping_id") REFERENCES "conversation_mappings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_channel_connection_id_fkey" FOREIGN KEY ("channel_connection_id") REFERENCES "channel_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_errors" ADD CONSTRAINT "integration_errors_channel_connection_id_fkey" FOREIGN KEY ("channel_connection_id") REFERENCES "channel_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_errors" ADD CONSTRAINT "integration_errors_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
