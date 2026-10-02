# Graph formats

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/graph` and `graphbinary`, v1
Audience: Users and integrators
Summary: Encoding, identity, selection and failure rules for the graph formats.

`CjsGraphFormat` stores declared object graphs as UTF-8 JSON. `CjsGraphBinaryFormat`
stores the same graph grammar with a JSON section and owned binary typed payloads.
Both implement `CjsFormat`; importing either registers nothing. Neither claims
any file extension in v1, including `.json`.

```js
import { CjsGraphFormat } from "@carbonenginejs/runtime/resource/formats/graph";
import { CjsGraphBinaryFormat } from "@carbonenginejs/runtime/resource/formats/graphbinary";

const authored = {
    _type: "ExampleScene",
    _id: 1,
    name: "Demo",
    child: { _type: "ExampleNode", parent: { _ref: 1 } }
};
const bytes = CjsGraphFormat.write(authored, { input: "values" });
const { root, reports } = CjsGraphFormat.read(bytes);
```

The text envelope is `{ "format": "cjs.graph", "version": 1, "root": ... }`.
The binary wire identifier is `cjs.graph.binary`. These identifiers are independent
of facade names. Versions describe file grammar, never class revisions.

## Choosing a format

Call `CjsGraphFormat` or `CjsGraphBinaryFormat` directly. If the format is unknown,
check the header with each facade's `is(bytes)` before calling `read(bytes)`:

```js
const Format = CjsGraphFormat.is(bytes) ? CjsGraphFormat
    : CjsGraphBinaryFormat.is(bytes) ? CjsGraphBinaryFormat : null;
if (Format) {
    const result = Format.read(bytes);
}
```

ResMan registration is deferred until there is a real caller and will use
ResMan's existing registration mechanism. These formats do not install services,
fetch resources or register domain classes.

## Values and runtime instances

`read(input, { emit: "values" })` is the default. It returns `{ root, reports }`,
preserving graph markers as records. It needs no registered domain classes and
validates graph grammar, not unavailable class declarations. Binary values contain
owned typed arrays. It does not construct objects or run lifecycle methods.

`read(input, { emit: "runtime" })` uses canonical schema registrations and factories,
validates members against declarations, resolves identity and then calls mapped
`Initialize` once on each reachable new object. `initialize: false` suppresses
that final step. Embedded members populate existing storage. Struct collection
items use replacement value storage so failed collections retain their defaults.
Plain native struct records use their explicitly declared class layout; an
arbitrary plain object is not treated as a registered runtime instance.

`write(root)` defaults to runtime input. Only declared persistent stored members
are saved; runtime-only members and derived properties are excluded. It never
walks arbitrary runtime state or evaluates stored-member/map accessors.
`write(root, { input: "values" })` packages already-authored records. Both writers
return `Uint8Array`; text readers also accept strings. Instance `Read` and `Write`
methods merge per-call options with constructor options.

`_type` identifies a registered class. Positive integer `_id` definitions and
`{ "_ref": id }` preserve sharing and cycles; duplicate definitions are fatal.
Embedded storage has no identity markers. Weak references require a target in the
accepted strong graph. Maps have string keys; schema-known map keys are data even
when named `_id` or `_ref`. Without a class declaration, producers must avoid
ambiguous graph-marker keys in untyped records.

Handlers dispatch on data types. Meaning tags select underlying storage without
colour conversion, path resolution, matrix transposition or other semantic work.
Enums and flags are integers, including unnamed values within storage bounds.
64-bit integer values use decimal strings in JSON. Text typed arrays use arrays;
binary typed arrays use views and preserve payload bits. Non-finite scalar/math
values are rejected in both formats.

Custom types require an explicit handler pair in each operation/profile:

```js
import { opaqueBytes } from "@carbonenginejs/runtime/resource/formats/graph";
const options = { customHandlers: { state: opaqueBytes("state") } };
const saved = CjsGraphFormat.write(instance, options);
const loaded = CjsGraphFormat.read(saved, { ...options, emit: "runtime" });
```

`instance` must declare the member as `custom("state")`. The helper is also
exported by the binary subpath. Text opaque values use `_custom` plus `base64`;
binary values use `_custom` plus a view. Class-free decoded binary opaque values
are `{ _custom, bytes: Uint8Array }`, which can be repackaged directly.

## Failures and binary framing

Read reports contain `{ path, message }`, with JSON Pointer member paths. Failed
members retain defaults and siblings continue. Failed object-list items are omitted;
other invalid collections are rejected together. Native IList population uses its
mapped API, restoring previous contents after rejection. If that native API also
refuses restoration, the report explicitly says so; arbitrary native side effects
cannot be undone by the codec. Rejected children are not initialized.

Malformed framing, unsupported versions and duplicate IDs throw before population.
Writers throw on member failures and return no successful bytes; the thrown error
contains `reports` when member processing produced them.

Binary v1 starts with 16 bytes: ASCII `CJSB`, followed by little-endian uint32
version, JSON byte length and BIN byte length. JSON follows, then zero padding to
an 8-byte file boundary, then BIN. Each view declares `byteOffset`, `byteLength`,
`type` and `count`; offsets are relative to BIN and aligned to 8 bytes. Ranges,
counts and declared types are checked before copying. Each section is below 4 GiB.
V1 requires a little-endian host and always returns independently owned payload
storage. There is no borrowing, compression or external-buffer mechanism.

The source suites cover graph identity, declaration filtering, numeric bounds,
custom handlers, member failures, lifecycle, binary corruption and independent
payload ownership. Real Black/Red asset qualification and comparative performance
measurements are separate acceptance work; synthetic payload tests are not those
measurements.
