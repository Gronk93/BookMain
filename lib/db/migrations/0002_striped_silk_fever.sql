ALTER TABLE "book_pages" ALTER COLUMN "ocr_confidence" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "page_type" varchar(30) DEFAULT 'digital' NOT NULL;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "raw_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "normalized_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "text_source" varchar(30) DEFAULT 'native' NOT NULL;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "character_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "word_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "ocr_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "ocr_status" varchar(30) DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "quality_score" real DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "width" real;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "height" real;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "rotation" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "preview_path" text;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "text_blocks" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "parser_version" varchar(50);--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "ocr_version" varchar(50);--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "processed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD COLUMN "attempt" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD COLUMN "processed_pages" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD COLUMN "total_pages" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD COLUMN "error_code" varchar(50);--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD COLUMN "error_message_safe" text;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD COLUMN "summary" jsonb;--> statement-breakpoint
CREATE INDEX "book_pages_book_id_idx" ON "book_pages" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "book_pages_page_type_idx" ON "book_pages" USING btree ("page_type");--> statement-breakpoint
CREATE INDEX "processing_jobs_book_id_idx" ON "processing_jobs" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "processing_jobs_status_idx" ON "processing_jobs" USING btree ("status");--> statement-breakpoint
ALTER TABLE "book_pages" ADD CONSTRAINT "book_pages_book_id_page_number_unique" UNIQUE("book_id","page_number");