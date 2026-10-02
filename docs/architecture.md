# Runtime architecture

Status: Experimental
Scope: `@carbonenginejs/runtime`
Audience: Runtime authors, engine authors, and maintainers
Summary: Defines the accepted dependency direction and ownership boundaries for the combined runtime.

## Purpose

The combined runtime keeps the donor packages' useful dependency barriers
inside one package. [`layers.json`](../layers.json) is the executable rule set:
every internal source layer has an exhaustive import allow-list, and aggregate
entry points have separately constrained surfaces.

## Layers

The package holds `global`, `resource`, `trinityal` (the abstraction layer and
its headless stub), `trinity`, `sof`, `audio`, `character`, `input`,
`trinityal/webgpu`, `core` and `tools`. `trinityal/webgpu` and `tools` are
subpaths outside the aggregate root; the demo suite is `@carbonenginejs/demos`.

## Dependency direction

```text
global  (utils, math, consts, imageio, compose, schema, model, interfaces, blue)
   |
   +-- resource
   |      |
   |      +-- sof, audio
   |
   +-- trinityal (AL + stub)
   |      |
   |      +-- trinity  (global, resource, trinityal)
   |             |
   |             +-- character
   |             +-- trinityal/webgpu  (global, resource, trinity, trinityal)
   |
   +-- input
   |
   +-- core  (may import every layer above)

tools  (global/utils only)
```

`layers.json` is authoritative for each permitted edge; the diagram is a
guide. `sof` does not import `trinity`: its output names runtime identities
that a consumer resolves. `trinity` renders through `trinityal`, which runs
headless on the stub until a backend such as `trinityal/webgpu` is installed.

## Contracts and engines

`global/interfaces` owns dependency-floor base classes for organization-owned
execution interfaces. It imports only schema metadata so a required root method
can carry abstract implementation metadata and throw until a subclass overrides
it. Owned consumers call required methods directly; optional chaining and
structural method probes are not substitutes for a required organization-owned
method.

Renderer engines are sibling implementations, not subclasses of a shared
WebGL-shaped device or RHI. An engine may extend the canonical base classes and
import resource and Trinity identities. It never imports `core`, browser tools,
or a sibling engine, and live GPU objects remain engine-owned.

WebGPU is exposed through `@carbonenginejs/runtime/trinityal/webgpu`.
No WebGL export or placeholder is added before a maintained implementation exists.

`@carbonenginejs/runtime/core` may import every layer, but holds no service
composition today (`CjsLibrary` is empty on purpose; its head comment says
why). It carries the browser platform and adapter snapshots, also at
`/core/platform`; importing it probes no browser globals.

## Native interface exposure

Native base composition and Blue interface exposure are separate declarations.
`meta.blue.inherit` supplies the base relationships used by dynamic casts.
`meta.blue.interfaceTable({ interfaces, chainTo })` describes a concrete
class's complete interface table: `chainTo: null` ends exposure, while a class
constructor chains only that class's table. Listing a concrete class in
`interfaces` adds its identity; it does not traverse that class's table.

The declaration can be a class decorator or be applied to the constructor after
its definition. It replaces earlier interface mappings on that class. Later
`meta.blue.mapInterface` calls add local entries without changing the explicit
chain. Classes not migrated to an explicit table retain the legacy mapping
behavior.

Copier and declared readers use the resolved table to select initialization or
member notifications. Declaring a table does not initialize objects, change
JavaScript inheritance, or change stored-member and property inheritance.

## Values editing notifications

SetValues compares writes, deduplicates canonical changed member names and calls
OnModified once for the changed NOTIFY members: a string for one, an array for
several. Equal values do not notify. IsMatch accepts either argument shape.
Explicit edits can call NotifyModified(target, names, options) from the Blue
export. There is no pending-name queue, settle loop or reentrancy guard; nested
calls run immediately. skipUpdate leaves dirty state without retaining names.
Reader initialization and declaration-based notification selection are unchanged.

## Trinity to WebGPU draw path

Trinity renders through an abstraction-layer (AL) context installed with
`Tr2RenderContext.SetRenderContextAL`; without one it uses the headless stub.
The WebGPU implementation, `CjsWebgpuRenderContextAL`, is internal and reached
through the private build entry, not the package root. The public
`trinityal/webgpu` descriptor API is a separate surface, not a way to install
the AL.

1. Trinity's `RenderBatchesInOrder` walks the finalized accumulator, applies
   standard states, per-object constants, shader pass state and material data,
   then calls `SubmitGeometry`. The AL receives binding and draw calls, not
   batches to resolve later. A mesh batch's geometry descriptor is realized
   into suballocated buffers at its first submit through that context.
2. AL setters retain the bound program, render state, declaration, streams and
   resources. Each draw's `EmitRenderPipelineState` resolves the accumulated
   description and reuses a cached pipeline or creates one synchronously. A
   draw whose state cannot be honoured is refused, so this path does not by
   itself show that every Carbon rendering feature is implemented.
3. `CjsWebgpuResourceSetAL` resolves stage/register bindings for the linked
   program at draw time. Constant buffers keep CPU shadows; the frame's
   constant arena supplies upload regions and dynamic offsets. Texture views
   are made on first bind; a slot with no created texture binds a dummy.
4. `BeginScene` opens the command encoder, resets the constant arena and the
   bound render targets. The work queue opens passes lazily and applies
   render-pass hints; the canvas view is acquired at the first pass and shared
   by the frame's later passes.
5. `EndScene` closes the last pass, clears the bound program, resource set and
   vertex layout, then finishes and submits the command encoder. It is
   synchronous; the browser presents the canvas after that submission.

Source owners: `src/trinity/core/context/Tr2RenderContext.js`,
`src/trinityal/webgpu/CjsWebgpuRenderContextAL.js`,
`src/trinityal/webgpu/CjsWebgpuResourceSetAL.js` and
`src/trinityal/webgpu/core/CjsWebgpuWorkQueue.js`.

The scene background pass draws the seeded `EveStarfield` after the nebula with
additive states. The starfield owns its packed sprite buffer and uses the shared
quad index allocation. Notified generation settings mark it dirty; the scene
update recreates its buffer and retries failed creation. Seeded integer random
draws match Carbon; JavaScript trigonometry is rounded to float32 for positions.
The final owner calls `Destroy` to release storage and device registration.

Editable cloud volumes snapshot their control balls and curve samples before
rasterization. Portable CPU work yields in short event-loop slices; it is not
parallel worker execution. `Update` publishes completed snapshots into the owned
host bitmap and texture, retaining Carbon's repeated DataReady publication.
Explicit `Rasterize` drains the current job synchronously and returns that result;
a dirty successor is scheduled separately. Debug geometry remains unimplemented.

Curve-line sets own an AL vertex buffer and submit non-indexed triangles through
the same batch walk. Width-factor notifications refill their tessellated stream;
the context caches the inverse-projected frustum corner radius for depth sorting.
Device recreation rebuilds the buffer from retained line records. Final owners
call `Destroy` to unregister and release storage. The headless AL exercises the
same upload and submission path; it does not establish shader pixel parity.
Circle and Bézier paths also provide packed instance transforms. Their buffer
contract advances a shared byte cursor through nested path containers; hidden
paths keep their record slots and write zero-scale transforms. Instance records
contain the local transform, with the owning child's world transform supplied
separately. Billboards read camera state from the supplied render context.
The owning `EveChildLineSet` coordinates path updates, visibility and edit
notifications with line tessellation and object instancing. It supplies persistent
VS/PS constants, realizes shared geometry before binding its instance stream,
and emits current/previous transform aliases at TEXCOORD8..13. Both render modes
use the same native update gate. Its final `Destroy` releases its instance buffer
and created default line sets; an explicitly assigned line set remains borrowed.
Replaced defaults are retained until that final ownership decision so sharing
cannot turn a later reinitialization into premature destruction.

Sphere pins share a CPU triangle index per decoded geometry resource. The
resource layer supplies positions and indices; Trinity selects the subset and
combines its own AL index buffer with the shared vertex allocation. The ordinary
batch path uploads one pin payload to the distinct vertex and pixel registers.
Scene retirement accounts for pin buffers and effects, including replaced
constructor defaults and effects retained by another live graph. Headless tests
exercise selection, edits, draw submission and lifetime; shader pixels remain
outside that evidence.

## Tools, demos, and generated source

`src/tools` holds the browser-safe file-index readers, off the default
surface. Engine-specific GPU harnesses stay with their engine layer.

`@carbonenginejs/tools-core` owns source generators, acquisition-aware artifact
builders, schemas, catalogs, caches, and Node.js/native dependencies.
Browser-safe deterministic value builders may stay with their runtime format
or domain, as audio's optional library builder does. Reviewed runtime-generated
source lives under its owning `src/**/generated`; build inputs are not runtime dependencies.

## Instanced geometry and final ownership

`Tr2InstancedMesh` accepts particle, runtime-row and `TriGeometryRes` instance
providers. An authored instance resource path takes precedence over the assigned
provider. SOF CPU attachments set only the base geometry path and bind their
`Tr2RuntimeInstanceData` directly.

Runtime instance rows retain their CPU bytes and publish them to the existing
shared geometry allocator. The provider returns a registered vertex declaration
and an AL buffer with its physical byte offset. Its transform layout uses
TEXCOORD0..6; the instanced mesh adds eight when merging stream 1, so the shader
receives TEXCOORD8..14. CPU publication before device creation does not imply
render readiness; device preparation allocates and uploads the retained rows.

Carbon prepares geometry at resource load; the resource layer here cannot import
Trinity, so the instanced mesh prepares loaded and assigned geometry providers
through the existing LOD allocation helper at first use. The selected instance
LOD supplies its buffer, byte offset, aligned stride and vertex count. An already
prepared declaration does not require allocating an unrelated full-detail LOD.

`Tr2ParticleSystem`, `Tr2InstancedMesh` and runtime/direct instance providers
register with `TriDevice`. Device
`ReleaseResources` retains their owned lifetime; the final owner explicitly calls
`Destroy` to release CPU storage or mesh subscriptions and unregister. Mesh
destruction detaches its provider without destroying that shared object.

The WebGPU demo snapshots device identities only around synchronous ship
hydration. A failed hydration destroys newly registered particle systems,
instanced meshes, instance providers, child/curve-line sets and behavior systems. Successful replacement, cancellation and disposal retire those
same named resources through model traversal, preserving objects reachable from
other live or pending ships. Transition overlays are detached before this walk
because their bindings reference both ships. This policy belongs to the demo;
the runtime provides no generic graph-destruction policy. Child-line destruction
accepts the line sets managed by that walk so shared defaults survive and each
curve set is destroyed once.

The optional `ELECTRICITY_CORPUS_DIR` regression in
`test/trinity/instanced-particle-mesh.test.js` separates warp, kill-counter and
baseline scenarios for the authored angde1 and angbc2 Crisis child graphs. All
six electricity owners on each hull emit and submit instanced stub draws across
15 repeated warp cycles; kill-counter lightning uses a separate controller state.
This tests CPU simulation and submission, not rendered pixel visibility.

## Secondary lighting frame updates

When a displayed scene has an SH lighting manager, the frame driver refreshes
its directional light and registered source data before publishing data textures.
It supplies the CPU sun direction and unit white, matching Carbon. After batch
collection, it dispatches SH updates to registered receiver interfaces among the
scene objects and camera attachment parent. Planets and flattened renderables
are not additional receivers in this pass.

Effect roots, hulls and planets register a getter for their source radius. Each
source refresh observes the current radius after animation or scale changes;
registration order does not freeze the initial value. A missing manager and a
hidden scene perform no SH refresh. This wiring does not create a manager for
scenes that have none.


## Abstraction-layer resource ownership

Texture and buffer factories return public Tr2TextureAL and Tr2BufferAL values.
Each value owns a share of one backend implementation. Plain JavaScript
assignment aliases the same value; explicit copy construction retains another
share. Destroy resets only that value. The final share destroys the backend
and unregisters it. There are no GC finalizers governing this lifetime.

Pool-handle Get and provider getters borrow their stored value. Retain a value
past handle Free or provider replacement with new Tr2TextureAL({ copy: value })
or new Tr2BufferAL({ copy: value }), and call Destroy when that copy is no longer
needed. Resource-set descriptions, bound resource sets, target stacks and managed
geometry bindings retain their own values. Backend-only operations use the
borrowed TrinityALImpl_GetObject implementation.

TriTextureRes.SetTexture borrows its caller's value; deferred realization owns
its separate value. Tr2TextureReference.SetTexture and
Tr2RuntimeGpuBuffer.SetGpuBuffer retain copies. Effects release adapters they
create internally while preserving providers supplied by the caller.

After rendering stops, scene-driver Destroy releases its local pool and values.
Device final shutdown releases global pools and static publishers. Context
shutdown releases only its backend's shared geometry allocator. WebGPU defers
platform storage destruction until the open command encoder has been submitted,
or until it has been abandoned during final teardown.

Tr2RenderTarget.Destroy and Detach retain their native operational semantics,
including the attached texture value. Its final owner calls Dispose to release
both owned and attached values. GPU buffer owners and effects expose explicit
Destroy methods for final release. Every device tick retires pool membership
aged three recording frames across temporary and persistent textures and buffers.
Outstanding handles and explicit value copies survive retirement. Every debug-mode
setter call clears membership, and device release clears it only for the exact
all-storage flag. Pool destruction unregisters its device and sweep membership.

## Resource-address declarations

Resource addresses use `meta.type.path`; graph member lookups and relative
soundbank fragments remain strings. The class generator selects reviewed
owner/member pairs rather than guessing from a field's name. This metadata
preserves authored defaults, Blue exposure and native string storage. Black
routes path declarations through its shared configured path handler; without a
handler the authored string is retained. Resource resolution and failed-read
repair policy remain the resource manager's responsibility.
## Declared types and Black binary blocks

Decorator namespaces follow ownership: meta.blue is Carbon exposure, meta.ui is
presentation, meta.type is shared type declarations, meta.struct is binary struct
layout, and the flat meta namespace contains our registration and installers.
Meaning types resolve to ordinary storage: rgb and translation use vector3;
rgba, linear and mixed use vector4; rotation uses quaternion; local and world
use matrix4. Scale uses vector3 with a unit default. Components supplies labels
for packed channels. Formats dispatch the resolved data type, not these meanings.
Flags stores uint32 and carries enum/FLAGS metadata. Named meta.requires installs
throwing methods for missing class requirements and preserves implementations.

Black reads uint32Array as Carbon BINARYBLOCK: signed byte length followed by
little-endian words. The member name does not select a codec. Opaque blocks use
meta.type.custom(name); Black opts into Tr2ActionPython.state as Uint8Array.
Other names require a customTypes map or own-property object of handlers in the
reader options. A handler receives (bytes, descriptor); an unknown name fails.
These handlers belong to Black and do not register handlers in other formats.