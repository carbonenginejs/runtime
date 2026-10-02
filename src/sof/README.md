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
