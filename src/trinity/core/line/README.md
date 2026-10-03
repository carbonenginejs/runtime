# Primitive rendering

Tr2PrimitiveSet supplies native transform, bounds, sort and per-object data to
its concrete debug-geometry subclasses. It dispatches opaque and picking passes;
each subclass owns its geometry submission. The base remains abstract at
GetBatchesImpl. Tr2LineSet uploads colored endpoints plus separate picking
triangles; Tr2SolidSet uploads position, normal and color for each triangle
vertex. Both use TrinityAL mapped buffers and nonindexed draw batches. Call
SubmitChanges after editing geometry and Destroy when its owner retires it.
ReleaseResources permits later device preparation; Destroy unregisters the
owner and prevents further uploads.

GetID and GetPickingBatches are exposed on the primitive classes through
Tr2PrimitiveSet. Picking uses their GPU batches and requires no additional CPU
mirror or resource payload retention. No ITr2Pickable declaration is added.
This does not implement the still-unfinished scene picking/readback entry points.

Native quirks are retained: line picking requires a valid visible-line buffer;
line submission always recreates storage; solid submission keeps the old draw
count when its triangle list shrinks until storage is released. Bounds retain
their previous value when no geometry is uploaded.

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
retains the complete index stream. The shared Granny projection now retains
one complete typed indexBuffer, with material faces as views and authored
triangle offsets preserved. Upload packing, primitives, decals and Granny
writing use that full stream, including triangles outside material groups.
This changes no CPU residency or ray-query policy. The nominal ITr2Pickable
interface is still absent, although native picking methods are supplied.
