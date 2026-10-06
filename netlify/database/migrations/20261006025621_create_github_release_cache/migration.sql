CREATE TABLE "github_release" (
	"repository" text PRIMARY KEY,
	"release" jsonb NOT NULL,
	"etag" text,
	"checked_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone NOT NULL
);
