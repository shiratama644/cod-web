import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const loadouts = sqliteTable('loadouts', {
  id: integer('id').primaryKey(),
  data: text('data', { mode: 'json' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
})
