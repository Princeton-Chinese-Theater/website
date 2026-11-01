CREATE TABLE `admin_accounts` (
	`email` text PRIMARY KEY NOT NULL,
	`password_hash` text,
	`status` text DEFAULT 'invited' NOT NULL,
	`invitation_hash` text,
	`invitation_expires_at` integer,
	`invited_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_accounts_invitation_hash_unique` ON `admin_accounts` (`invitation_hash`);--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_rate_limits` (
	`bucket` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`hits` integer NOT NULL
);
