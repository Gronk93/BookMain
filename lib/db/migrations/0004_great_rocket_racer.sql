CREATE TABLE "highlights" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"book_id" varchar(36) NOT NULL,
	"page_number" integer NOT NULL,
	"anchor_version" integer DEFAULT 1 NOT NULL,
	"start_block_id" varchar(64) NOT NULL,
	"start_offset" integer NOT NULL,
	"end_block_id" varchar(64) NOT NULL,
	"end_offset" integer NOT NULL,
	"exact_text" text NOT NULL,
	"prefix_text" text,
	"suffix_text" text,
	"text_hash" varchar(64) NOT NULL,
	"color" varchar(32) DEFAULT 'yellow' NOT NULL,
	"category" varchar(64),
	"anchor_status" varchar(32) DEFAULT 'resolved' NOT NULL,
	"bounding_boxes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "separators" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"book_id" varchar(36) NOT NULL,
	"title" varchar(255) NOT NULL,
	"start_page" integer NOT NULL,
	"end_page" integer NOT NULL,
	"color" varchar(32) DEFAULT 'indigo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "book_pages" ADD COLUMN "content_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "highlight_id" varchar(36);--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "selected_text" text;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "anchor_data" jsonb;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "separators" ADD CONSTRAINT "separators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "separators" ADD CONSTRAINT "separators_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "highlights_user_book_idx" ON "highlights" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "highlights_book_page_idx" ON "highlights" USING btree ("book_id","page_number");--> statement-breakpoint
CREATE INDEX "separators_user_book_idx" ON "separators" USING btree ("user_id","book_id");--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_highlight_id_highlights_id_fk" FOREIGN KEY ("highlight_id") REFERENCES "public"."highlights"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_user_book_idx" ON "notes" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "notes_book_page_idx" ON "notes" USING btree ("book_id","page_number");