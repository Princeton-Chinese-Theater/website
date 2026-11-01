ALTER TABLE `admin_accounts` ADD `session_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD `account_version` integer DEFAULT 0 NOT NULL;