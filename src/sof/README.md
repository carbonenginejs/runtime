# SOF catalog readiness

`EveSOF` assembles CPU graphs from `EveSOFDataMgr` projections. With a configured
monolithic `dataPath`, asynchronous builds await its installation before reading
the manager. Successful initialization is reused; `LoadData` and `LoadDataAsync`
return promises and explicitly reload; builds join a reload already in flight.
A failed load remains retryable. Replacing either the configured object source
or the manager's loader invalidates readiness and prevents superseded reads
from publishing into the manager.

`CjsSofLibraryBuilder` acquires a partial catalog from individual files. Its
generic readiness includes the generic record's referenced wreck materials.
Named fetches and concurrent builds wait for that complete operation, even
after the generic record itself has reached the manager. Dependency failure
allows retry without discarding successfully acquired records. Replacing the
catalog rejects publication from older reads. Concurrent forced
refreshes share an operation; a later forced refresh starts a new one.

DNA dependency discovery still owns hull, faction, race, material, pattern and
nested layout acquisition. Missing optional layout records retain their own
resource errors while available siblings continue. Once dependencies are ready,
assembly runs synchronously with per-call resolver results. SOF imports no
Trinity classes and starts no rendering or device work.

All public `EveSOF` methods return promises, including `Register`, `Create`,
configuration setters, builds, DNA inspection, data lookups and turret material
updates. Await configuration before calling the configured factory. The `Async`
suffixed build names remain aliases; callers no longer select a separate
synchronous public build path. Data lookups normalize catalog names and await
acquisition before returning the manager's projection. Direct turret updates
load materials from the exact supplied faction projection, including edits.

```js
const sof = await new EveSOF().Register({ lazyData: { source: readSofFile } });
const values = await sof.BuildValuesFromDNA(dna);
```

Carbon's private prepared assembly methods retain their native names, carry
`@internal`, and are not exposed as Blue methods. They run synchronously inside
the public acquisition boundary; temporary per-call resource resolvers are
restored before any await. The values representation is unchanged.

`CreateModularObject`, `AddHull` and `AddChild` are asynchronous. Edits serialize
per owner across modifier sessions, allocate tags after preceding edits finish,
and recover after rejection. Transforms are captured when the call is made;
owner records are read from the live graph because another session's composition
may replace nested identities. Synchronous part getters and edits also refresh
those references.
