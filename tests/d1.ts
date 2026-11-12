import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

interface Statement {
  text: string;
  values: SQLInputValue[];
}

/** Just enough of D1 to run batches, on an in-memory SQLite with every migration applied */
export function memoryD1() {
  const db = new DatabaseSync(':memory:');
  const migrations = new URL('../migrations/', import.meta.url);
  for (const file of readdirSync(migrations).sort()) {
    db.exec(readFileSync(new URL(file, migrations), 'utf8'));
  }
  const run = ({ text, values }: Statement) => ({
    results: db.prepare(text).all(...values),
    meta: { rows_read: 0, rows_written: 0 }
  });
  return {
    db,
    prepare: (text: string) => ({
      bind: (...values: SQLInputValue[]) => ({
        text,
        values,
        all: async () => run({ text, values })
      })
    }),
    async batch(statements: Statement[]) {
      db.exec('BEGIN');
      try {
        const results = statements.map(run);
        db.exec('COMMIT');
        return results;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
  };
}
