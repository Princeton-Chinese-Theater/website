CREATE TABLE `productions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`data` text NOT NULL,
	`publication_status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_admin` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL
);
