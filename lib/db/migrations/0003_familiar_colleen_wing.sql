ALTER TABLE "user_preferences" ADD COLUMN "reader_view_mode" varchar(20) DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "reader_layout" varchar(20) DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "reader_theme" varchar(20) DEFAULT 'paper' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "reader_font_family" varchar(20) DEFAULT 'serif' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "reader_font_size" integer DEFAULT 18 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "reader_line_height" varchar(20) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "reader_margin" varchar(20) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "reader_page_animation" varchar(20) DEFAULT 'page' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "reader_zoom" integer DEFAULT 100 NOT NULL;