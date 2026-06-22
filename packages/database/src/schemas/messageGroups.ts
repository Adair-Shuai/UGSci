import { index, jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { idGenerator } from '../utils/idGenerator';
import { timestamps, varchar255 } from './_helpers';
import { topics } from './topic';
import { users } from './user';
import { workspaces } from './workspace';

/**
 * Message groups table for multi-models parallel conversations.
 *
 * FK constraints (defined in migration SQL, not in schema, to avoid
 * circular type-level references between messageGroups ↔ messages):
 *   - parent_message_id → messages.id (cascade)
 *
 * The back-reference FK (messages.message_group_id → message_groups.id)
 * is declared in message.ts where the import order is clean.
 */
export const messageGroups = pgTable(
  'message_groups',
  {
    id: varchar255('id')
      .primaryKey()
      .$defaultFn(() => idGenerator('messageGroups'))
      .notNull(),

    // Association - only needs topic level
    topicId: text('topic_id').references(() => topics.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),

    // Support nested structure — self-reference, safe in this file
    parentGroupId: varchar255('parent_group_id').references(() => messageGroups.id, {
      onDelete: 'cascade',
    }),

    /**
     * FK to messages.id — declared as plain text here to avoid circular
     * module imports. The FK constraint exists in migration SQL (0000_init.sql).
     */
    parentMessageId: text('parent_message_id'),

    // Metadata
    title: varchar255('title'),
    description: text('description'),

    // Compression fields
    type: text('type', { enum: ['parallel', 'compression'] }),
    content: text('content'), // compression summary (plain text)
    editorData: jsonb('editor_data'), // rich text editor data (future extension)
    metadata: jsonb('metadata'), // UI state (expanded, etc.)

    clientId: varchar255('client_id'),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('message_groups_client_id_user_id_unique').on(t.clientId, t.userId),
    index('message_groups_user_id_idx').on(t.userId),
    index('message_groups_topic_id_idx').on(t.topicId),
    index('message_groups_type_idx').on(t.type),
    index('message_groups_parent_group_id_idx').on(t.parentGroupId),
    index('message_groups_parent_message_id_idx').on(t.parentMessageId),
    index('message_groups_workspace_id_idx').on(t.workspaceId),
  ],
);

export const insertMessageGroupSchema = createInsertSchema(messageGroups);

export type NewMessageGroup = typeof messageGroups.$inferInsert;
export type MessageGroupItem = typeof messageGroups.$inferSelect;
