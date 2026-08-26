# Runtime SOF documentation

Status: Evolving
Scope: `@carbonenginejs/runtime/sof`
Audience: Users and maintainers building Space Object Factory values
Summary: Explains the package boundary for SOF catalogs, DNA selection, deterministic graph assembly, and plain model-values output.

## Purpose

The SOF layer turns a decoded SOF catalog and a DNA selection into a deterministic,
GPU-free model-values graph. It owns the SOF data models, catalog lookups, DNA
parsing and validation, layout planning, and the declared values emitted for the
selected space object.

## Use this package when

Use `@carbonenginejs/runtime/sof` when a caller already has SOF `data.black` bytes or decoded
catalog data and needs JSON-compatible values for a ship, station, mobile,
swarm, or extension selection. Use the asynchronous values methods when selected
child, controller, curve, or resource-existence inputs must be resolved through
caller-provided adapters.

Do not use this layer to fetch game data, realize GPU resources, construct an
audio backend, or choose a renderer. Consumers that need typed runtime objects
may construct them from the returned values after loading the required class
families.

## Where it fits

SOF consumes the combined runtime's model/schema foundation and Black data reader. Resource
acquisition remains with a resource or tooling layer.

The supported output is plain model values. Optional consumers include
headless runtime graph classes, tools that inspect values, and applications
that later realize rendering or audio behavior.

The implementation still uses a deprecated `carbon.document` compatibility
intermediate for graph assembly and fragment import. That node-table form is not
a supported external output contract for new consumers.

## Start here

```js
import { EveSOF } from "@carbonenginejs/runtime/sof";

const sof = EveSOF.Create({
  black: decodedSofData,
  resFileIndex
});

const values = sof.BuildValuesFromDNA("rifter:minmatar:minmatar");
```

For a partial lazy catalog, provide the ordinary decoded-object resource seam
and enable `lazyData`:

```js
const sof = new EveSOF().Register({
  resources: {
    getObject: (path, context) => library.FetchObject(path, context)
  },
  lazyData: true
});

await sof.InitializeAsync(); // generic.black only
const values = await sof.BuildValuesFromDNAAsync(
  "rifter:minmatar:minmatar"
); // named hull/faction/race and their dependency closure
```

Individual records can also be requested or replaced explicitly through
`sof.GetSofLibraryBuilder().FetchHull()`, `FetchFaction()`, `FetchRace()`,
`FetchMaterial()`, `FetchPattern()`, and `FetchLayout()`.

Sparse output is canonical. Offline consumers that need explicit class defaults
may import the graph class families they consume and opt into the final
plain-data overlay:

```js
import "@carbonenginejs/runtime/trinity";
import "@carbonenginejs/runtime/audio/trinity";

const expanded = sof.BuildValuesFromDNA("rifter:minmatar:minmatar", {
  populateDefaults: true
});
```

This does not hydrate or initialize the graph. An unknown `_type` fails instead
of being guessed, so resolver-provided extension classes must also be imported
before requesting expanded output.

## Documentation map

- [Architecture and boundaries](architecture.md)
- [Class catalog](reference/classes/README.md)
- [Package README](../../README.md)
