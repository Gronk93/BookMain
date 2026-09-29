ALTER TABLE "book_files" ADD COLUMN "original_filename" text DEFAULT 'document.pdf' NOT NULL;--> statement-breakpoint
ALTER TABLE "book_files" ADD COLUMN "storage_provider" varchar(50) DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "book_files" ADD COLUMN "upload_status" varchar(30) DEFAULT 'uploaded' NOT NULL;--> statement-breakpoint
ALTER TABLE "book_files" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD COLUMN "stage" varchar(50) DEFAULT 'pending' NOT NULL;