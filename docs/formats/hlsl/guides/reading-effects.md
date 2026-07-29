# Reading effects

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/hlsl` read workflows
Audience: Users and integrators
Summary: Shows browser-neutral byte reads, permutation selection, inspection, and Node file workflows.

## Read caller-provided bytes

```js
import CjsHlslFormat from "@carbonenginejs/runtime-resource/formats/hlsl";

const response = await fetch("/shaders/effect.sm_hi");
const bytes = new Uint8Array(await response.arrayBuffer());
const effect = CjsHlslFormat.read(bytes);
```

Use `inspect` when only header and technique summary information is needed:

```js
const summary = CjsHlslFormat.inspect(bytes, {
    source: "effect.sm_hi"
});
```

## Select a permutation

Without a `permutation` option, the reader applies the container's default
selection rules. Override individual axes by name and value:

```js
const effect = CjsHlslFormat.read(bytes, {
    permutation: [
        { name: "BLEND_MODE", value: "TRANSPARENT" }
    ]
});
```

A `Map` of names to values is also accepted. Unknown axes or invalid values
are rejected rather than silently ignored.

## Read compact metadata

```js
const metadata = CjsHlslFormat.read(bytes, {
    emit: CjsHlslFormat.OUTPUT_METADATA
});
```

Metadata output omits embedded bytecode and constant-value bytes. It retains
the selected options, techniques, passes, stage resources, signatures, and
render-state records needed for inspection and pipeline planning.

## Read a file in Node

```js
const effect = await CjsHlslFormat.readFile("effect.sm_hi");
```

The CLI provides the same metadata workflow:

```sh
format-hlsl metadata effect.sm_hi effect.json
```
