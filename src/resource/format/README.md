# Decoded table interchange

`CjsTableData` is the in-process builder for our `cjstables` interchange, exposed
alone through `@carbonenginejs/runtime/resource/format/tables`. It is shared
format infrastructure; it is not a database engine or an engine object graph.

JSONL, SQLite and modern schema-backed FSD support `emit: "cjstables"`. They
return a plain structured-cloneable document in both main-thread and worker
execution. Existing output selectors retain their meanings. Wrap a received
document with `CjsTableData.from(document)` when builder methods are useful.

```js
{
    format: "cjstables", version: 1, metadata: { build: 123 },
    tables: [{
        name: "graphics", keyPath: "graphicID", columns: ["graphicID"],
        entries: [[42, { graphicID: 42 }]]
    }]
}
```

Keys are strings, safe integers or BigInts; numeric and string identities differ.
Nested records, Maps, typed bytes and wide integers retain their native values.
The builder borrows row values; use structuredClone for an owned copy. Producers
must supply data, not live engine instances or functions. A null `keyPath` means
the key is separate from its row; a non-null path is a literal field, not a dotted
property expression. There is no inferred ID spelling or field renaming.

`Batches(size)` bounds row count, not bytes: one large row can still exceed a storage budget. It emits plain documents. `Append` validates all incoming
entries before changing the builder and rejects duplicate keys and conflicting
table metadata. Batches concatenate in arrival order. Source metadata is supplied
by the caller; appending does not merge or reinterpret that provenance.

JSONL `iterate(chunks)` accepts an async iterable of text or UTF-8 byte chunks and
yields `[value, physicalLineNumber]`; one stream cannot mix text and bytes.
`readBatches(chunks, {name, keyPath, batchSize, metadata})` emits table documents.
Without a keyPath it uses zero-based record ordinals, excluding blank lines.
SQLite `readBatches(bytes, {tables, keyPaths, batchSize, metadata})` uses rowid by
default; keyPaths explicitly selects another identity column for each table.
FSD `readBatches(bytes, {schema, batchSize, metadata})` uses the root map's keys;
a root object is one record keyed by zero. Worker options carry an inert schema
from a reader's `getFsdSchema()`, not a reader instance. Legacy FSD32 decoding is
still unsupported. FSD batches retain the root offset index and duplicate-key
set, but do not retain previously decoded rows. SQLite and FSD still require the
source container bytes in memory.

`CjsJsonlFormat.writeTables(document, {table})` writes one selected table. JSONL
cannot hold table metadata or external keys, so keep the table name/keyPath in
the consumer's profile; unrepresentable external keys and non-JSON native values
are rejected. Native graph values use the existing graph codecs. No SQLite SQL
engine or browser SQLite writer has been added.

Persistence composes with the independent `CjsStorage` interface. For example,
write each plain batch to a versioned `table-batches` collection with an ordinal
key and `kind: "cache"`, then read and append only the batches a consumer needs.
The same calls work with IndexedDB, memory or the tools-core SQLite adapter.
Inspect `persisted` for durability. Separate batches are separate commits; an
application publishing a complete dataset should publish its generation/index
only after every required batch is durable. Cache eviction can still remove an earlier batch, including during later writes. A reader must treat missing batches as an incomplete cache generation and refetch; use protected saved records when retention is required. The stored value retains all table
metadata and native row identities, including BigInts inside the document.

Dataset projection remains a separate policy. tools-core's existing explicit
SDE projections own casing, `typeID`/`graphicID`, localization and field selection;
the shared parser and storage never guess those decisions.


## Column headers and positional interchange

CjsTableData.defineTable validates owned table/column descriptors using existing
CARBON_TYPE values. Optional description strings on tables and columns carry
documentation only. TnyDatabase registers these same headers before reading data.
writeRows(header, records, metadata) emits positional cjstables version 2;
readRows(document, tableName) reads that revision. Missing projected columns
become explicit null; undefined cells reject. These methods project the named
columns, preserve structured-cloneable cell values and create owned copies.
Version-one key/value reader output remains distinct and is not silently
reinterpreted. Its existing Append/from/JSONL export contract is unchanged.
