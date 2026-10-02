CREATE TABLE "ai_chunks" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" varchar(36) NOT NULL,
	"page_number" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"text_hash" varchar(64) NOT NULL,
	"start_block_id" varchar(64) NOT NULL,
	"start_offset" integer NOT NULL,
	"end_block_id" varchar(64) NOT NULL,
	"end_offset" integer NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"quality_score" integer,
	"text_source" varchar(32) DEFAULT 'extracted' NOT NULL,
	"embedding" jsonb,
	"embedding_model" varchar(64) DEFAULT 'mock-embedding-v1' NOT NULL,
	"embedding_version" varchar(32) DEFAULT '1.0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"book_id" varchar(36) NOT NULL,
	"title" text NOT NULL,
	"scope_type" varchar(32) DEFAULT 'book' NOT NULL,
	"scope_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_message_sources" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar(36) NOT NULL,
	"chunk_id" varchar(36),
	"book_id" varchar(36) NOT NULL,
	"page_number" integer NOT NULL,
	"quote" text NOT NULL,
	"start_block_id" varchar(64),
	"start_offset" integer,
	"end_block_id" varchar(64),
	"end_offset" integer,
	"retrieval_score" real,
	"rank" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar(36) NOT NULL,
	"role" varchar(32) NOT NULL,
	"content" text NOT NULL,
	"model" varchar(64),
	"provider" varchar(32),
	"input_tokens" integer,
	"output_tokens" integer,
	"prompt_version" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"book_id" varchar(36),
	"operation" varchar(32) NOT NULL,
	"provider" varchar(32) DEFAULT 'mock' NOT NULL,
	"model" varchar(64) NOT NULL,
	"input_units" integer DEFAULT 0 NOT NULL,
	"output_units" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"estimated_cost" varchar(32) DEFAULT '0.0000' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_ai_indexes" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" varchar(36) NOT NULL,
	"status" varchar(32) DEFAULT 'not_indexed' NOT NULL,
	"index_version" varchar(32) DEFAULT 'bm-rag-v1' NOT NULL,
	"embedding_model" varchar(64) DEFAULT 'mock-embedding-v1' NOT NULL,
	"embedding_version" varchar(32) DEFAULT '1.0' NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"indexed_page_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_chunks" ADD CONSTRAINT "ai_chunks_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_message_sources" ADD CONSTRAINT "ai_message_sources_message_id_ai_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_ai_indexes" ADD CONSTRAINT "book_ai_indexes_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_chunks_book_page_idx" ON "ai_chunks" USING btree ("book_id","page_number");--> statement-breakpoint
CREATE INDEX "ai_chunks_book_idx" ON "ai_chunks" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_user_book_idx" ON "ai_conversations" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "ai_message_sources_message_idx" ON "ai_message_sources" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "ai_message_sources_book_page_idx" ON "ai_message_sources" USING btree ("book_id","page_number");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_idx" ON "ai_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ai_usage_user_idx" ON "ai_usage" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_book_idx" ON "ai_usage" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "book_ai_indexes_book_idx" ON "book_ai_indexes" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "book_ai_indexes_status_idx" ON "book_ai_indexes" USING btree ("status");