CREATE TABLE "flashcard_decks" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"book_id" varchar(36) NOT NULL,
	"title" varchar(255) NOT NULL,
	"scope_type" varchar(32) NOT NULL,
	"scope_data" jsonb NOT NULL,
	"generation_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "flashcard_reviews" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"flashcard_id" varchar(36) NOT NULL,
	"rating" varchar(16) NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"previous_interval_days" integer DEFAULT 0 NOT NULL,
	"next_interval_days" integer DEFAULT 1 NOT NULL,
	"due_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"book_id" varchar(36) NOT NULL,
	"card_type" varchar(32) NOT NULL,
	"origin" varchar(32) DEFAULT 'manual' NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"explanation" text,
	"source_page" integer,
	"source_anchor_data" jsonb,
	"content_hash" varchar(64) NOT NULL,
	"source_hash" varchar(64),
	"difficulty" varchar(32) DEFAULT 'medium' NOT NULL,
	"status" varchar(32) DEFAULT 'ready' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "study_summaries" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"book_id" varchar(36) NOT NULL,
	"scope_type" varchar(32) NOT NULL,
	"scope_data" jsonb NOT NULL,
	"summary_type" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"language" varchar(16) DEFAULT 'es-MX' NOT NULL,
	"is_personal" boolean DEFAULT false NOT NULL,
	"include_highlights" boolean DEFAULT false NOT NULL,
	"include_notes" boolean DEFAULT false NOT NULL,
	"generation_version" integer DEFAULT 1 NOT NULL,
	"prompt_version" varchar(32) DEFAULT '1.0' NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'ready' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "study_summary_sources" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"summary_id" varchar(36) NOT NULL,
	"chunk_id" varchar(36),
	"book_id" varchar(36) NOT NULL,
	"page_number" integer NOT NULL,
	"quote" text NOT NULL,
	"start_block_id" varchar(64),
	"start_offset" integer,
	"end_block_id" varchar(64),
	"end_offset" integer,
	"rank" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_concepts" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"book_id" varchar(36) NOT NULL,
	"scope_type" varchar(32) NOT NULL,
	"scope_data" jsonb NOT NULL,
	"term" varchar(255) NOT NULL,
	"definition" text NOT NULL,
	"simple_explanation" text,
	"importance" varchar(32) DEFAULT 'high' NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'ready' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "study_concept_sources" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concept_id" varchar(36) NOT NULL,
	"chunk_id" varchar(36),
	"book_id" varchar(36) NOT NULL,
	"page_number" integer NOT NULL,
	"quote" text NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"book_id" varchar(36) NOT NULL,
	"deck_id" varchar(36),
	"session_type" varchar(32) DEFAULT 'flashcard_review' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"cards_seen" integer DEFAULT 0 NOT NULL,
	"cards_again" integer DEFAULT 0 NOT NULL,
	"cards_hard" integer DEFAULT 0 NOT NULL,
	"cards_good" integer DEFAULT 0 NOT NULL,
	"cards_easy" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flashcard_decks" ADD CONSTRAINT "flashcard_decks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_decks" ADD CONSTRAINT "flashcard_decks_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_flashcard_id_flashcards_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_deck_id_flashcard_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."flashcard_decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_summaries" ADD CONSTRAINT "study_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_summaries" ADD CONSTRAINT "study_summaries_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_summary_sources" ADD CONSTRAINT "study_summary_sources_summary_id_study_summaries_id_fk" FOREIGN KEY ("summary_id") REFERENCES "public"."study_summaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_summary_sources" ADD CONSTRAINT "study_summary_sources_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_concepts" ADD CONSTRAINT "study_concepts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_concepts" ADD CONSTRAINT "study_concepts_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_concept_sources" ADD CONSTRAINT "study_concept_sources_concept_id_study_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."study_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_concept_sources" ADD CONSTRAINT "study_concept_sources_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_deck_id_flashcard_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."flashcard_decks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flashcard_decks_user_book_idx" ON "flashcard_decks" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "flashcard_decks_book_idx" ON "flashcard_decks" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "flashcard_reviews_user_card_idx" ON "flashcard_reviews" USING btree ("user_id","flashcard_id");--> statement-breakpoint
CREATE INDEX "flashcard_reviews_due_idx" ON "flashcard_reviews" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "flashcards_deck_idx" ON "flashcards" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "flashcards_user_book_idx" ON "flashcards" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "study_summaries_user_book_idx" ON "study_summaries" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "study_summaries_book_idx" ON "study_summaries" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "study_summary_sources_summary_idx" ON "study_summary_sources" USING btree ("summary_id");--> statement-breakpoint
CREATE INDEX "study_concepts_user_book_idx" ON "study_concepts" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "study_concepts_book_idx" ON "study_concepts" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "study_concept_sources_concept_idx" ON "study_concept_sources" USING btree ("concept_id");--> statement-breakpoint
CREATE INDEX "study_sessions_user_book_idx" ON "study_sessions" USING btree ("user_id","book_id");