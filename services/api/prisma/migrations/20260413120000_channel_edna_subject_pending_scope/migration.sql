-- Allow pending channel rows before amoCRM scope_id is known
ALTER TABLE "channel_connections" ALTER COLUMN "scope_id" DROP NOT NULL;

-- edna Pulse channel subjectId from GET /api/channel-profile
ALTER TABLE "channel_connections" ADD COLUMN "edna_subject_id" VARCHAR(128);
