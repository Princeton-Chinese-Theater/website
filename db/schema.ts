import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const productions = sqliteTable('productions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  data: text('data').notNull(),
  publicationStatus: text('publication_status').notNull().default('draft'),
  version: integer('version').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const siteAdmin = sqliteTable('site_admin', {
  id: integer('id').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: text('created_at').notNull(),
});

export const adminAccounts = sqliteTable('admin_accounts', {
  email: text('email').primaryKey(),
  sessionVersion: integer('session_version').notNull().default(0),
  passwordHash: text('password_hash'),
  status: text('status').notNull().default('invited'),
  invitationHash: text('invitation_hash').unique(),
  invitationExpiresAt: integer('invitation_expires_at'),
  invitedBy: text('invited_by').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const adminSessions = sqliteTable('admin_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  accountVersion: integer('account_version').notNull().default(0),
  email: text('email').notNull(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
});

export const authRateLimits = sqliteTable('auth_rate_limits', {
  bucket: text('bucket').primaryKey(),
  startedAt: integer('started_at').notNull(),
  hits: integer('hits').notNull(),
});
