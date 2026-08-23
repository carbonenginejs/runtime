# Runtime SOF documentation

Status: Evolving
Scope: `@carbonenginejs/runtime-sof`
Audience: Users and maintainers building Space Object Factory values
Summary: Explains the package boundary for SOF catalogs, DNA selection, deterministic graph assembly, and plain model-values output.

## Purpose

runtime-sof turns a decoded SOF catalog and a DNA selection into a deterministic,
GPU-free model-values graph. It owns the SOF data models, catalog lookups, DNA
parsing and validation, layout planning, and the declared values emitted for the
selected space object.

## Use this package when

Use runtime-sof when a caller already has SOF `data.black` bytes or decoded
catalog data and needs JSON-compatible values for a ship, station, mobile,
swarm, or extension selection. Use the asynchronous values methods when selected
child, controller, curve, or resource-existence inputs must be resolved through
caller-provided adapters.

Do not use runtime-sof to fetch game data, realize GPU resources, construct an
audio backend, or choose a renderer. Consumers that need typed runtime objects
may construct them from the returned values after loading the required class
families.

## Where it fits

runtime-sof consumes model/schema utilities and the Black data reader. Resource
acquisition remains with a resource or tooling layer.

The supported output is plain model values. Optional consumers include
headless runtime graph classes, tools that inspect values, and applications
that later realize rendering or audio behavior.

The implementation still uses a deprecated `carbon.document` compatibility
intermediate for graph assembly and fragment import. That node-table form is not
a supported external output contract for new consumers.

## Start here

```js
import { EveSOF } from "@carbonenginejs/runtime-sof";

const sof = EveSOF.Create({
  black: decodedSofData,
  resFileIndex
});

const values = sof.BuildValuesFromDNA("rifter:minmatar:minmatar");
```

## Documentation map

- [Architecture and boundaries](architecture.md)
- [Class catalog](reference/classes/README.md)
- [Package README](../README.md)
