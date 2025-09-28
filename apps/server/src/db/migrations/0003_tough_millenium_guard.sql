CREATE TABLE "technical_library_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"file_key" text NOT NULL,
	"category" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"remarks" text,
	"organization_id" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
