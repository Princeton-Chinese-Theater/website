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
