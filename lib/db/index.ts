import path from "node:path";
import {
  drizzle as drizzlePglite,
  type PgliteDatabase,
} from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import {
  drizzle as drizzlePostgres,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";

import * as schema from "./schema";

/**
 * Both drivers expose the same query builder, so the app types against one.
 * Only `db.execute` results differ: PGlite gives { rows }, postgres-js an array.
 */
export type Db = PgliteDatabase<typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

type Holder = { db?: Promise<Db> };
// On globalThis so dev hot reloads reuse the open database instead of opening it twice.
const g = globalThis as unknown as { __ghostlessDb?: Holder };
if (!g.__ghostlessDb) g.__ghostlessDb = {};
const holder: Holder = g.__ghostlessDb;

async function open(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const db: PostgresJsDatabase<typeof schema> = drizzlePostgres(
      postgres(url, { max: 5, prepare: false }),
      { schema },
    );
    await migratePostgres(db, { migrationsFolder: MIGRATIONS });
    return db as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir =
    process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pglite");
  (await import("node:fs")).mkdirSync(dataDir, { recursive: true });
  await takeLock(dataDir);
  const db = drizzlePglite(await PGlite.create({ dataDir }), { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  return db;
}

/**
 * PGlite corrupts its files if two processes open them at once, and it doesn't
 * stop that itself. This lock file does: a second process gets a clear error.
 */
async function takeLock(dataDir: string) {
  const fs = await import("node:fs");
  const lock = `${dataDir}.lock`;
  try {
    const pid = Number(fs.readFileSync(lock, "utf8"));
    if (pid && pid !== process.pid) {
      let alive = false;
      try {
        process.kill(pid, 0);
        alive = true;
      } catch {
        // That process is gone: the lock is stale.
      }
      if (alive) {
        throw new Error(
          `The local database is open in another process (pid ${pid}), usually the dev server. Use "pnpm job <name>" while it runs, or stop it first.`,
        );
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  fs.writeFileSync(lock, String(process.pid));
  process.once("exit", () => {
    try {
      if (fs.readFileSync(lock, "utf8") === String(process.pid))
        fs.unlinkSync(lock);
    } catch {
      // Nothing to clean up.
    }
  });
}

/**
 * The one database handle for this process. Locally it is PGlite in
 * .data/pglite, which only one process may open, so the CLI scripts call the
 * running dev server instead of opening it themselves. Set DATABASE_URL to use
 * any hosted Postgres.
 */
export function getDb(): Promise<Db> {
  if (!holder.db) {
    holder.db = open().catch((error) => {
      holder.db = undefined;
      throw error;
    });
  }
  return holder.db;
}

export { schema };
