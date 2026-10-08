# Runtime SOF documentation

Status: Evolving
Scope: `@carbonenginejs/runtime/sof`
Audience: Users and maintainers building Space Object Factory values
Summary: Explains the package boundary for SOF catalogs, DNA selection, deterministic graph assembly, and plain model-values output.

## Purpose

SOF turns a decoded catalog and DNA selection into a deterministic, GPU-free
model-values graph. It owns data models, catalog lookups, DNA parsing and
validation, layout planning, and the selected object's declared values.

## Use this package when

Use `@carbonenginejs/runtime/sof` for JSON-compatible ship, station, mobile,
swarm, or extension values from SOF `data.black` bytes or decoded catalogs.
Asynchronous methods resolve selected child, controller, curve, and
resource-existence inputs through caller adapters; lazy catalogs likewise use
an injected source.

SOF does not own resource providers, GPU realization, audio backends, or renderer
selection. Callers may construct typed objects from its values after loading
the required class families.

## Where it fits

SOF uses the model/schema foundation and Black reader; callers supply resource
acquisition. Its supported output is plain model values for headless graphs,
inspection tools, or later rendering/audio realization.

## Start here

```js
import { EveSOF } from "@carbonenginejs/runtime/sof";

const sof = await EveSOF.Create({
  black: decodedSofData,
  resFileIndex
});

const values = await sof.BuildValuesFromDNA("rifter:minmatar:minmatar");
```

For a partial lazy catalog, provide the ordinary decoded-object resource seam
and enable `lazyData`:

```js
const sof = await new EveSOF().Register({
  resources: {
    getObject: (path, context) => library.FetchObject(path, context)
  },
  lazyData: true
});

await sof.InitializeAsync(); // generic.black and its referenced wreck materials
const values = await sof.BuildValuesFromDNAAsync(
  "rifter:minmatar:minmatar"
); // named hull/faction/race and their dependency closure
```

All public factory methods return promises. Await configuration, builds, queries
and turret updates; the `Async` build names remain aliases. Internal prepared
assembly stays synchronous. Data lookups such as `await sof.GetHullData(name)`
acquire their required records before returning a normalized projection.

Individual records can also be requested or replaced explicitly through
`(await sof.GetSofLibraryBuilder()).FetchHull()`, `FetchFaction()`, `FetchRace()`,
`FetchMaterial()`, `FetchPattern()`, and `FetchLayout()`.

Sparse output is canonical. Offline consumers that need explicit class defaults
may import the graph class families they consume and opt into the final
plain-data overlay:

```js
import "@carbonenginejs/runtime/trinity";
import "@carbonenginejs/runtime/audio/trinity";

const expanded = await sof.BuildValuesFromDNA("rifter:minmatar:minmatar", {
  populateDefaults: true
});
```

This does not hydrate or initialize the graph. An unknown `_type` fails instead
of being guessed, so resolver-provided extension classes must also be imported
before requesting expanded output.

## Incremental DNA updates

`CjsSOFUpdater` borrows the same configured `EveSOF` that built a live object:

```js
import { CjsSOFUpdater } from "@carbonenginejs/runtime/sof";

const updater = new CjsSOFUpdater(sof);
const changes = await updater.UpdateFromDNA(object, newDna, buildOptions, () => selected === object);
if (changes === null) {
  // The caller chooses how to replace the object with a full build.
}
```

The implementation supports respathinsert, mesh-material edits (`material?`
and its `mesh?` spelling), and compatible `pattern?` / pattern-material edits.
Ordinary hull material and insert changes use targeted calculations: material
edits resolve shader constants through `EveSOFDNA.GetMeshAreaParameter`, while
insert edits resolve only authored mesh textures and inherited decal textures.
An unchanged pattern's material slots use the same constant path without querying
projections. These operations do not build a desired object graph, hydrate objects,
or traverse unrelated controllers, boosters and attachments. Target areas and
parameters are validated before writes; async texture queries revalidate them
after acquisition. Existing objects, lists and unrelated live state are retained.

Layouts, hull-authored instanced meshes, extension roots and pattern-name changes
still use the earlier full-values comparison path. That fallback builds fresh
values and validates types, names, list lengths and shared references throughout
the supplied structure before applying leaf changes. Targeted layout matching
requires additional source associations and is not implemented yet.
Texture paths exposed through the root's external parameters remain host-owned;
updates preserve those paths without clearing or reloading banner images.

`EveSOF.ModifyTextureResPaths(dnaString, authoredPaths, options)` exposes the
factory's existing insertion rules as an async batch query. It returns paths in
input order, using the configured synchronous or asynchronous existence service,
without acquiring child objects or building a graph. Invalid DNA returns null.
Ordinary, instanced and shared layout children are traversed; named instance
rows are compared in their stored layout order without repacking them.
Booster-owned glow sprites are generated by initialization; their empty authored
list does not constrain the live sprite count. Ordinary sprite lists still do.

Material constants use the effect's named `constParameters` setter, preserving
existing records and vec4 storage while refreshing each changed effect once.
Comparisons use float32 values so equal replay does not repeatedly refresh.
Constants match by unique name, retaining their live order even when a fresh
build emits defaults and explicit materials in a different order. Changed names,
duplicate names or list lengths request a full rebuild.

Compatible pattern edits update changed texture paths, sampler wrapping, shader
options, mask projections/targets and pattern material constants. Packed sampler
and option changes use the owning effect's existing methods, batched with other
effect changes for one cache refresh. A caller's open batch remains open. Mask
fields use schema-normalized values while retaining their vector buffers.
Adding/removing/reordering layers, resources, samplers, options or masks remains
a full-rebuild fallback, detected before any writes. Duplicate packed names are
accepted unchanged but cannot be edited through the unique-name setters.

The opt-in CPU test `test/sof/runtime-sof/updater-live.test.js` reads real data
through tools HTTP when `CJS_SOF_UPDATER_RESOURCE_BASE` names an exact EVE build.
It checks graph identity, texture notifications and fresh-build equivalence.
Its resource manager loads no GPU data. Booster randomness is fixed for comparison;
process-allocated audio emitter IDs are compared separately from authored values.
Declared structure lists are compared per packed slot, allowing referenced
records to occupy distinct by-value slots. Ordinary object references still
require shared identity. The real-data suite also checks the Deathless hangar's
authored identities, requested texture paths, shader options and notifications
using a bounded traversal that does not follow renderer/resource caches.

Results are an array of changed values records (`{ _type, ...changedFields }`),
`false` for no changes or superseded work, or `null` for an unsupported edit or
structural mismatch. Records do not yet encode source identity or form a replay
format. Each requested component resolves current catalog values. Equal DNA on
the targeted path rechecks mesh constants and inserts; it does not propagate
edits to unrelated SOF definitions. Equal live values cause no
notifications or resource acquisition; a different DNA spelling may update only
provenance. The caller must preserve the factory configuration and original build
options (including layout seed and build time).

Only differing fields reach the values service. Resource reload notifications
belong to that service and the receiving parameter. Validation and acquisition
finish before writes; acquisition errors reject without mutation. Exceptions
from application or consumer notification callbacks propagate and cannot undo
arbitrary side effects already performed. Use one updater per factory/consumer
scope so overlapping requests for the same root supersede older requests.
The optional fourth argument checks the host's current selection/lifetime before
acquisition and after asynchronous work, before any live writes. Returning false
cancels the update; throwing (for example, from an abort signal) rejects it.

Notifications from source catalog edits and general list reconciliation remain
later work. The updater does not import a
renderer or start resource services; the host owns live parameter resource loading.

## Documentation map

- [Package README](../../README.md)
