# Host services and storage

This is our orchestration extension, independent of Blue and rendering. Import
`Tny` and `TnyService` from `@carbonenginejs/runtime/services`. Each constructed
owner has one `storage` manager and one `services` registry. Nothing starts on
import; there is no process-global singleton or automatic database selection.

```js
const tny = new Tny({ storage: { namespace: "my-app", backend } });

class Preferences extends TnyService
{
    static storagePolicy = {};
    #storage = null;

    constructor(storage)
    {
        super();
        this.#storage = storage;
    }

    Read(key) { return this.#storage.Read(key); }
    Write(key, value) { return this.#storage.Write(key, value); }
}

tny.services.Register("preferences", Preferences);
const preferences = tny.services.Get("preferences");
const result = await preferences.Write("theme", "dark");
// result.persisted acknowledges persistence; result.stored may mean memory only.
await tny.Close();
```

The base's `static storagePolicy = null` requests no store. An empty plain object
requests a scoped store using the host configuration. Other policy fields are
rejected until there is a concrete requirement and a supported meaning. There is
no persistence flag, migration language, or table schema policy yet. Registration
validates the declaration and snapshots the opt-in; later mutation does not
reconfigure an existing registration.

`Get` constructs a service once on first request and injects `(store, options)`;
the store is null for services that opt out. Unknown service names return null.
Names are explicit and stable, never inferred from constructor names. Constructor
failure is retryable, and recursive construction throws. Services extend
`TnyService` or implement its `Close` lifecycle themselves.

Store names are collections within the host namespace, not separate databases.
`storage.CreateStore(name)` also works independently of registered services, and
returns the same handle for the same name. Handles expose Read, Write, WriteBatch,
Delete and List. Storage remains accessible to the manager, but handles cannot
close other stores or purge the backend. These are convenience boundaries, not
security isolation. Backend and codec configuration follow CjsStorage's contract.

`storage.Purge()` removes cache records across the owner's namespace, including
stores not requested this session and expired records. Existing saved records
are protected; `Purge({ includeSaved: true })` explicitly includes them. Other
namespaces are untouched. Purging is serialized against writes through this
owner but is not an atomic backend transaction or coordinated across owners.
An error rejects and may follow partial deletion; it never reports full success.

Close rejects new service acquisition, closes constructed services in reverse
registration order while their stores remain usable, then closes storage once.
All services are given a shutdown attempt even if another fails. Hosts must stop
new application requests before shutdown. Store handles reject use after closure.

Workers construct their own owner or receive a host bridge implementing the
storage backend contract; class instances are not posted between workers.
Node/Electron can inject their own backend, including tools-core's SQLite adapter.
This entry point imports no browser globals, engine, Blue registry or rendering.

Carbon equivalents were reviewed for the underlying storage extension:
RemoteFileCache stores downloaded resources; db/StringStore interns database
strings and bytes; TriSettings owns live engine settings. This host application
store does not replace those mechanisms. The Tny providers described below
compose decoded-data acquisition with this application storage.

Storage I/O methods return promises, including validation and closed-handle
failures. List resolves an identity array. Complete operations share one queue
per owner; read cache fills cannot race writes/deletes or shutdown. Synchronous
service registration and CreateStore only obtain configuration/handles; they do
not perform storage I/O. See the storage README for cross-owner and rollback
limits.

## Database

Tny owns an inert database registry. Register(definition, routing) uses the same
column header validator as CjsTableData.defineTable: name, optional description,
and columns carrying name, an existing CARBON_TYPE value, optional primaryKey
and description. Routing names a registered service, source, explicit build and
representation revision. Describe and registration do not acquire records.

Describe, List, GetByID and Find return promises. GetByID requires exactly one
primary key and returns an owned record or null. Find accepts limit (1–1000),
cursor (null or opaque string), and AND filters {field, operator, value}. Results
contain entries, nextCursor and source/build identity. FSD supports eq, ne, lt,
lte, gt, gte and in. The tools-core API supports one scalar eq predicate; other
requests reject explicitly. There is no implicit full-table download fallback.

TnyServiceFSD receives {read, sourceID, tables}; read(path, identity) returns
{bytes, build}. Table configuration supplies the inert binary schema and key
field. It checks the returned build before decoding. Cold queries scan FSD
records from the source container; a bounded response is not a bounded byte
download. The decoder needs the container bytes. No raw-byte persistence is
added. Hosts can inject local Node/Electron sources, HTTP, or worker bridges.

TnyServiceAPI receives {url, target, fetcher, tables} and implements tools-core's
SDE endpoint contract. Each table explicitly names its ID field. The actual
response build must match the registered build; an older prepared fallback is
never silently stored under the requested build. Cursor identity includes the
source, build, table and filters. An exact full page may require one empty final
request to establish exhaustion.

TnyServiceDatabase shares decoded-query caching and coalesces identical pending
requests. Cache keys include provider configuration, table, build, representation
revision and query. Descriptions are not part of cache identity. Source failures
are not cached; unavailable reconstructible caches are misses. Writes use the
existing cache kind, preserving saved application documents. Close drains
provider requests before the shared store closes. Independent browser tabs
still have the existing storage backend's coordination limits.

Headers are shared with positional cjstables version 2 through writeRows and
readRows. Existing raw reader outputs retain version-one key/value semantics;
these two revisions are explicit and must not be reinterpreted as each other.

Source: operator-approved Tny database work. The donor boundaries are the
shared-storage search above; this host orchestration does not replace Carbon's
db/StringStore or resource caches. Graphene and headless tools
need one schema-described acquisition API across those source mechanisms.

Focused tests: runtime/test/services covers routing, lazy loading, typed table
headers, filters, pagination, source-build mismatch, persistent API cache reuse,
request coalescing and shutdown. Existing format tests also exercise JSONL,
SQLite and FSD through the production worker.
