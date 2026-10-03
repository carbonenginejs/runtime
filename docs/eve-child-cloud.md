# Legacy cloud rendering

Status: Experimental
Scope: EveChildCloud in the Trinity runtime
Audience: Runtime maintainers and render-backend integrators
Summary: Geometry, LOD, constant data, lifecycle, validation and explicit remaining gaps.

`EveChildCloud` renders the legacy cloud material on a tessellated screen grid.
It is separate from the raymarched `EveChildCloud2` implementation.

The child owns its vertex buffer, LOD index buffers and declaration through the
Trinity abstraction layer. Construction registers the device-resource lifetime;
`Initialize` and notified `preTesselationLevel` changes recreate geometry.
`Destroy` releases ownership and unregisters the resource. Importing the module
creates no device resources.

After updating the child and its visibility, `GetRenderables` includes it only
when geometry is ready. `GetPerObjectData` leases a 76-float payload from the
accumulator's registered `TriPoolAllocator`, reads camera state from the ambient
render context and selects a grid LOD. `GetBatches` emits transparent indexed
triangles using that payload and the authored material. Constant uploads follow
the runtime's shared technique-mask convention.

The port retains the native staggered grid, alternating triangle winding,
16-bit index storage and LOD loop that stops above dimension 16. A tessellation
level of 16 or less therefore produces no drawable index buffers. Both screen
axes use back-buffer width when selecting LOD, including for nonsquare targets,
as the donor does. Matrix compositions reverse Carbon's row-vector operand
order, and RawData transposes each matrix once for upload.

If every cube point is clipped by the helper's near plane, the port writes a
zero-area screen rectangle. This explicitly replaces the native helper's
uninitialized `points[0]` read. It does not change the ordinary clipped bounds.

## Validation and remaining gaps

`test/trinity/eve-child-cloud.test.js` checks geometry bytes, notification and
resource lifecycle, creation failure, transformed bounds, visibility, sort
distance, per-object layout and matrix packing, clipping, LOD, and direct batch
submission through the stub abstraction layer. The catalog test independently
checks the 76-float footprint.

Debug geometry remains explicitly unimplemented: `RenderDebugInfo` requires the
`ITr2DebugRenderer2` drawing API, also missing from the editable-volume path.
Indirect constant submission requires `Tr2IndirectDrawBufferWriter` and remains
explicitly unimplemented on `EveChildCloudPerObjectData`.

These tests establish the CPU and direct AL submission path. They do not establish
pixel parity for a production cloud asset or qualify a translated cloud shader.

The donor is `trinity/trinity/Eve/SpaceObject/Children/EveChildCloud.h`,
`EveChildCloud.cpp`, and `EveChildCloud_Blue.cpp`.
