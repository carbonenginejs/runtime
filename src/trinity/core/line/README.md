# Primitive rendering

Tr2PrimitiveSet supplies native transform, bounds, sort and per-object data to
its concrete debug-geometry subclasses. It dispatches opaque and picking passes;
each subclass owns its geometry submission. The base remains abstract at
GetBatchesImpl. Tr2LineSet and Tr2SolidSet still need their upload/draw closures.

Tr2GrannyPrimitiveSet acquires geometry after reader population, builds its CPU
cache on completion, and uploads through the existing TrinityAL buffer API.
Its persistent resource subscriptions support reload and reject old handles;
the draw entry renews manager activity before testing GPU storage. Owners must
call Destroy to detach subscriptions and unregister its device lifetime. The
demo retirement and failed-hydration paths perform that cleanup.

Both native primitive constant buffers contain only WorldMat, so the existing
EvePerObjectVSData and EvePerObjectPSData layouts supply their exact byte shape.
RawData performs the single upload transpose.

The typed geometry route replaces Carbon's raw Granny SDK resource. Binary CMF
retains the complete index stream. The existing shared Granny projection retains
material-group faces but discards original index offsets and orphaned indices;
that format-boundary limitation remains explicit in CreatePrimitiveFromGranny.
This closure does not modify readers or serialization. The nominal ITr2Pickable
interface is also still absent, although native picking methods are supplied.
