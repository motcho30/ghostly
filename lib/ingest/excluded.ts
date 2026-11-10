import fs from "node:fs";
import path from "node:path";

import { AGENCY_NAME } from "@/lib/ingest/workable";

let cache: Set<string> | null = null;

function names(): Set<string> {
  if (!cache) {
    const file = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "data", "excluded-employers.json"),
        "utf8",
      ),
    ) as { names: string[] };
    cache = new Set(file.names.map((n) => n.trim().toLowerCase()));
  }
  return cache;
}

/** True for anyone who isn't an employer hiring for themselves. */
export function isExcludedEmployer(name: string, slug?: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    AGENCY_NAME.test(name) ||
    names().has(n) ||
    Boolean(slug && names().has(slug.toLowerCase()))
  );
}
