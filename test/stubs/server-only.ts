// Empty stub for the `server-only` package.
//
// The data layer (`lib/data/db/*` and `app/(pro)/pro/queries.ts`) imports
// `server-only` at the top of each file. In a real Next.js build that import
// throws if the module is pulled into a Client Component bundle — it is a
// guard, nothing more. Under Vitest there is no bundler boundary to enforce,
// so we alias `server-only` to this empty module (see vitest.config.ts) to
// neutralize the import-time throw and let the pure query code run in Node.
export {};
