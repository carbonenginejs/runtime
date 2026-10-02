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

The deprecated `carbon.document` intermediate supports assembly and fragment
import, not a new consumer-facing node-table output contract.

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

## Documentation map

- [Package README](../../README.md)
