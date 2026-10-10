# Shared storage

`CjsStorage` is an optional host-neutral service for plain records and bytes.
It has no engine, demo, DOM, network, or filesystem dependencies. A host injects
a backend; a browser or worker can use `CjsIndexedDBStorage`. Without persistence,
the bounded memory store continues working. Importing the module opens nothing.

The service is a deliberate application/derived-artifact extension, separate
from the engine's remote resource cache and live settings registry.

```js
const storage = new CjsStorage({
    namespace: "editor",
    backend: new CjsIndexedDBStorage(),
    memory: { maxBytes: 64 * 1024 * 1024, maxEntries: 2048 }
});
const result = await storage.Write("preferences", "theme", { name: "dark" });
// result.persisted is the durability acknowledgement; result.stored alone is not.
const record = await storage.Read("preferences", "theme");
if (record.found) applyTheme(record.value);
```

Addresses are `{ namespace, collection, key }`. Keys are strings or safe integers;
numeric and string keys remain distinct. Schema/source changes belong in the
entry's `version` (a string or integer), and reads require that same version.
Cache entries use `kind: "cache"`, optionally `ttlMs`; saved entries never expire.
Engine settings retain their existing names, defaulting and application rules.

Writes return `{ stored, persisted, cached, error }`. Persistence failure can still
leave a usable memory copy, but never returns `persisted: true`. Unsaved user
records in memory are protected from eviction; cache entries and memory copies of
durable records are evictable. Memory budgets estimate record data size, not
actual VM heap or database overhead. The memory counter is `estimatedSize`;
`maxBytes` is a budget against that estimate. Oversized entries may persist without being
cached. Reads return `{ found, value, version, persisted, updatedAt }`, or an
explicit missing/version/expired/unavailable result. Decode errors throw.

Backends implement asynchronous `Read(address)`, `WriteBatch(records)`,
`Delete(address)`, `List({ namespace, collection? })` (async iterable), and `Close()`.
`Read` returns an owned envelope or null. Envelopes carry address, version, kind,
codec, codecVersion, encoded value, `estimatedSize` (a heuristic in bytes), updatedAt and expiresAt.
Stored envelopes are re-estimated when pruning cache data, so older estimates
that included guessed overheads do not carry forward.
Capabilities declare `persistent`, `atomicBatch`, and `binary`. A successful
persistent WriteBatch must mean the backend committed it. The service queues each
complete Read, Write/WriteBatch, Delete, List and Purge operation, including codec
work and memory updates. All return promises; validation errors reject them.
Failed operations do not poison the queue. Write inputs are cloned at invocation.

Service List now returns a promise for an array of identity records: use
`for (const row of await storage.List(collection))`. The array is captured before
later queued operations run, so consumer iteration holds no lock. It costs memory
proportional to the number of identities. Backend List remains a paginated async
iterable. Other owners can change later backend pages; there is no cross-owner
snapshot, cache invalidation or global transaction.

Close stops accepting work immediately, drains accepted operations, then attempts
both adapter closes once. Repeated Close returns the same promise, including any
shutdown error. A read cannot repopulate memory after closure.

Ordering does not add rollback: backend batches retain their advertised atomicity,
memory and persistence commit separately, and cache pruning and Purge can partially
delete before a failure. Separate Read then Write calls are not an atomic update.
Native records must be structured-cloneable; export live engine objects first.

Codecs are injected `{ id, version, Encode, Decode }` objects. The format adapter
uses existing format readers/writers; graph codecs unwrap `{ root, reports }`
and reject reported errors. Register exact previous codec identities to read old
entries. Compression is distinct from graph grammar. Raw shader bytes need no
graph wrapper. Derived shader identities must include source hash, compiler
revision, backend, tier and compilation options. Never store GPU objects.

Workers can own a service directly. To use a host-owned backend through a bridge,
send plain addresses/envelopes/results, never class instances, codecs, functions,
or iterators. Electron disk/database access belongs in the privileged host;
its bridge implements the same narrow backend methods. There is no implicit
global service, browser quota, localStorage fallback, or automatic scene restore.

Persistent cache data has its own configurable `maxPersistentCacheBytes` budget
(default 256 MiB per service namespace, Infinity for an explicitly unbounded
host policy). Oldest-written cache records are removed before a cache import;
expired records are removed too. Saved records and other namespaces are excluded.
The budget sums `estimatedSize` for encoded values; it does not measure
SQLite/IndexedDB quota usage, actual heap use, or GPU allocations. The helper
`estimateStorageSize` counts data only, with no guessed allocation, pointer or
container overhead. Buffers and views use their own `byteLength`; blobs use `size`.
Structured data uses the scalar conventions documented on the helper, so the
result remains an estimate. It never reads resfileindex sizes. Cache
pruning is best-effort across separate service instances; hosts should designate
one owner for a namespace when an exact shared budget is required.

## Browser localStorage

`CjsLocalStorage` is an optional small-data backend, configured explicitly:

```js
const backend = new CjsLocalStorage({ storage: window.localStorage, name: "my-app.storage" });
const tny = new Tny({ storage: { namespace: "my-app", backend } });
```

The adapter owns one browser key. Inside it, identities remain namespace,
collection and scalar key; punctuation has no special meaning. Unrelated browser
keys are never cleared. Each backend batch prepares a complete replacement and
uses one setItem, so quota/encoding failures retain the previous item. This reads
and rewrites the entire owned document, making it a small-data option, not the
preferred backend for SDE/FSD datasets. No fixed quota is assumed.

Plain JSON values are accepted only when JSON preserves them. Top-level Uint8Array
and ArrayBuffer payloads use base64 framing, preserving view spans and buffer
kind. Other values (including nested binary values, BigInt, Maps, Dates, cycles,
nonfinite numbers and undefined) require an appropriate existing format codec;
they are never silently coerced. Graph markers in plain JSON remain literal.
The framing is an internal versioned backend document, not a new graph format.

No automatic IndexedDB-to-localStorage fallback is enabled: switching stores
without migration would hide existing data. Backend failures flow through the
usual stored/persisted/cached result. Corrupt or unsupported documents fail and
are never replaced as if empty. This backend has no connection to close.

Use one writer owner per browser key. Separate tabs can overwrite concurrent
read-modify-write operations, and managers do not invalidate each other's caches.
Workers use a host bridge; the browser localStorage API itself is not worker
storage. Injected Storage-like implementations must honor getItem/setItem behavior,
including leaving the prior value intact when setItem fails.
