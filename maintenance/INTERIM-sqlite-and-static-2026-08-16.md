# Interim: CjsSqliteFormat, and what CjsStaticFormat stopped doing

**Agent-only. Committed so it is findable, never published** — the npm artifact
is built by `scripts/build_npm.js`, which copies `docs/` and a named list of root
files. This folder is in neither, so it does not ship. Delete it when the work
below lands.

Written 2026-08-16. Everything here is interim and was agreed as interim.

## What changed

- **`CjsSqliteFormat`** is new, at `src/formats/sqlite/`. It reads a SQLite
  container as data — tables and rows, no SQL, no query engine.
- **`CjsStaticFormat.read()` is gone.** It dispatched to `CjsPickleFormat` and
  (briefly) `CjsSqliteFormat`, and required an injected `options.sqlite` driver
  for the SQLite family. That format identifies now and decodes nothing.
- **`tools-netease`** reads `.static` through
  `src/static/readStaticContainer.js`: ask `CjsStaticFormat.resolveType()`, read
  `preferred`, call `CjsSqliteFormat`.
- **`tools-fsd/src/CjsFsdStaticStore.js`** is now unused and should be deleted.
  It still exists at the time of writing.

## What the next agent must do — and this is the part to not skip

**Find the uses before changing any of it.** Each item below has callers, and
three separate mistakes were made today by assuming otherwise.

1. **`CjsSqliteFormat` and `CjsSchemaBoundFormat` omit `inspect`, and 28 of the
   31 format classes define it** — including `CjsStaticFormat`, which sits next
   to both of them in the same `.static` routing. Note the third omitter is
   `CjsPickleFormat`, which defines no capability method at all, so "everything
   else has it" is not quite the shape of the problem.
   That was decided from `docs/internal/decisions/format-capability-surface.md`,
   whose own *What is not proposed* section says not to change things on its
   strength alone. It is recorded there as the second instance of a new format
   guessing at the surface. **Decide it, do not inherit it:** either the alias
   goes back for consistency until the redesign lands, or its absence is the
   first piece of the redesign and the siblings follow.

2. **`options.sqlite` is gone, not deprecated.** A caller still passing it is
   ignored silently. Search for `options.sqlite` and `CJS_STATIC_DRIVER_REQUIRED`
   before assuming nobody did.

3. **`CjsStaticFormat.read` was removed outright.** At the time, its only callers
   were its own tests — verified across the org and the ccpwgl and skindr
   checkouts. Re-check rather than trusting that, because `npm/dist` still
   carries a built copy with the old shape until the next build.

4. **`CjsFsdStaticStore` deletion needs the same sweep.** `tools-netease` no
   longer imports it. Nothing else did when checked. Check again.

5. **A dependency range was widened to make this resolve.** `tools-core`
   depended on `@carbonenginejs/runtime-resource@^0.16.0`, and below 1.0.0 a
   caret pins the minor, so the local 0.18.0 could not satisfy it: npm installed
   the registry 0.16.0 instead and the `./formats/sqlite` subpath did not exist.
   `tools-core/package.json` now says `^0.18.0`, and `tools-netease`'s
   `package-lock.json` had to be deleted because it still pinned the registry
   copy. **This is committed but not published, and other packages carry the same
   `^0.16.0` range.** That is the org-wide version problem, not this change's.

## What is proven, and what is not

Proven: 80,765 rows across the fourteen SQLite `.static` containers decode
identically to `node:sqlite`, and eleven manufactured containers cover overflow
chains, multi-level b-tree ordering, rowid aliasing, every serial type, awkward
column names, and nine-byte varints.

Also proven, added the same day: `CjsSchemaBoundFormat` reads all six containers
of the schema-bound family, and every field the published export carries from
them matches exactly — 114 regions, 1,184 constellations and 8,490 systems, plus
6,989 jumps cross-checked against an entirely separate container.

**Superseded the same day.** The prefixed-pickle family is read: the prefix is a
schema length, the pickle behind it is a schema, and its one global
(`collections.OrderedDict`) is now rebuilt. Every `.static` family has a reader.

Also worth knowing: `resolveType()` and `RegisterExtension`'s `Identify`/`Target`
route are both implemented, contracted and tested, and — as far as could be
found — called by no production code anywhere in the organization. The
`tools-netease` change above is the first real consumer of `resolveType()`.
