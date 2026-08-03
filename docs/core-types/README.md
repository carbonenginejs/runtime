# @carbonenginejs/runtime-utils

Status: Evolving
Scope: `@carbonenginejs/runtime-utils` Carbon type and model families
Audience: Runtime authors and integrators
Summary: Explains Carbon type descriptors, schemas, models, lifecycle state, documents, and hydration.

Shared CarbonEngineJS type, schema, document, hydration, and runtime model
helpers.

This package is the common contract for packages that read, write, or generate
CarbonEngineJS data. Format packages can stop at plain JSON or a neutral
`CjsCarbonDocument`; runtime packages can opt into registered classes and
`CjsModel` when they want live objects.

## Install

```sh
npm install @carbonenginejs/runtime-utils
```

## What It Owns

- `document`: neutral `CjsCarbonDocument`, class/struct registries, hydration,
  and dehydration.
- `hydration`: adapter seam for construction, value application, and finalize
  behavior.
- `schema`: decorators, class/field/method metadata, the direct
  name-to-constructor map, enum registration, Carbon-method provenance, and
  component metadata helpers.
- `types`: Carbon type descriptors, defaults, coercion, cloning, and export
  helpers.
- `model`: `CjsModel`, `CjsEventEmitter`, model dirty state, traversal helpers,
  and source-record utilities.

Generated enums and generated class catalogs should live in schema or generated
runtime packages, not in this foundational package.

## Hydration Contract

`runtime-utils` does not impose a runtime lifecycle on callers. The hydrator only
guarantees ordering:

1. `construct`
2. `applyValues`
3. `finalize`

The default behavior is intentionally minimal: construction through
`CjsSchema.GetConstructor(name)`, `Object.assign` for values, and no finalize
step. Callers opt into stricter population rules by supplying an adapter.

Use `createLifecycleAdapter()` when your runtime classes follow a
`SetValues`-style contract. `Initialize` is optional; disable it explicitly
when a project only wants `SetValues`.

## Usage

### Hydrate a neutral document into runtime classes

```js
import {
  CjsCarbonDocument,
  CjsClassRegistry,
  CjsDocumentHydrator
} from "@carbonenginejs/runtime-utils/document";
import { createLifecycleAdapter } from "@carbonenginejs/runtime-utils/hydration";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";

class DemoNode extends CjsModel
{
  position = [0, 0, 0];
}

CjsSchema.define(DemoNode, {
  className: "DemoNode",
  alias: "LegacyDemoNode",
  fields: [{
    name: "position",
    type: { kind: "vec3" },
    io: {
      read: true,
      write: true,
      persist: true,
      notify: true
    }
  }]
});

const document = CjsCarbonDocument.create({
  format: "example",
  roots: [{ ref: { $ref: 1 } }],
  nodes: [{
    id: 1,
    kind: "DemoNode",
    fields: { position: [1, 2, 3] }
  }]
});

const registry = CjsClassRegistry.fromMaps({
  constructors: { DemoNode }
});

const adapter = createLifecycleAdapter({ initialize: false });
const { root } = CjsDocumentHydrator.hydrate(document, { registry, adapter });
```

`CjsSchema` stores constructors in one direct name-to-constructor map.
`CjsSchema.define` registers the explicit `className` and each alias as keys;
manual code can use `CjsSchema.SetConstructor(name, Constructor)`. A supplied
scoped registry replaces the default constructor lookup and must implement
`GetConstructor(name)`.

### Decorators and imperative schema registration

The decorator namespaces and imperative methods write the same metadata.
Generated code and other tools may register a complete class with
`CjsSchema.define`, then add individual entries with `defineField`,
`defineMethod`, or `defineEnum`. They may instead apply the public decorators
through `decorateField` and `decorateMethod`; those helpers do not require
decorator syntax.

`defineEnum(values, definition)` registers a stable enum name and optional
member, source, family, and line metadata. Registration works for frozen enum
objects through the schema registry; extensible objects also receive the
exported `CJS_ENUM_NAME` symbol. A field decorated with `CjsSchema.enum(values)`
or an enum name resolves that registered identity lazily.

Jessica metadata is editor-facing presentation metadata:

- `jessica.group(name)` groups a field in a compatible editor;
- `jessica.hidden` asks an editor not to present the field;
- `jessica.readOnly` asks an editor not to offer writes; and
- `jessica.widget(name)` suggests one editor control.

These declarations do not change runtime persistence, validation, or mutation.
In particular, `jessica.hidden` is not `schema.hideInherited`, and
`jessica.readOnly` does not block `SetValues`. A runtime restriction must be
implemented by the owning runtime contract rather than inferred from Jessica
metadata.

### Model references, value structs, and raw inline values

Use `type.model("ClassName")` for reference-shaped fields that hydrate through
the registered `CjsModel` constructor map. Legacy `type.objectRef` remains
supported while runtime packages migrate.

Use `type.struct("ClassName")` for a registered model with value semantics. If
the owner constructor installs a struct instance, `SetValues` populates that
instance in place instead of storing the incoming model by reference. This
keeps constructor-owned identity and mutable math buffers stable.

Opaque native payloads must not trigger model construction. Use
`type.rawStruct("NativeType")`; it records the canonical `rawStruct`
descriptor and keeps plain object values non-constructing.

### Work with schema-backed runtime models directly

```js
const node = DemoNode.from({ position: [1, 2, 3] });

node.OnEvent("modified", (_target, payload) => {
  console.log(payload.source);
});

const changed = node.SetValues({ position: [4, 5, 6] });
console.log([...changed]);
node.Merge([{ position: [7, 8, 9] }, { position: [10, 11, 12] }]);

const copy = new DemoNode();
CjsModel.copy(copy, node, { markDirty: false });
const plain = node.GetValues();
```

`CjsModel` is evented, tracks dirty/update state explicitly, and uses schema
metadata as its field contract. Every model class requires an explicit, stable
`CjsSchema` `className`; runtime type identity never falls back to
`Constructor.name`, which is not stable under minification.

The ordinary settled `modified` event contains `{ source }`. The changed field
names are returned by `SetValues`. A `properties` event field is reserved for
the direct `markDirty: false` notification path.

`Merge`/`merge` accept an ordered array of raw value bags or model instances,
deep-merge them, and apply the final bag through one `CjsModel.set` update cycle.
They return the same changed-set, boolean, or `false` result as `SetValues`.
`Copy`/`copy` instead require an instantiated
`CjsModel` source and forward the supplied `SetValues` options.

Schema-backed containers expose domain-named child methods and delegate their
ordinary `array` or `list` mutations to the programmatic static
`CjsModel.createChild(owner, ...)`, `addChild`, `removeChild`, `deleteChild`, and
`clearChildren` helpers. Instances expose only child methods explicitly defined
by their domain class. The static helpers hydrate declared item types, preserve
Carbon `OnListModified` notifications, and apply the collection field's normal
flag/rebuild tokens. They do not manage typed arrays or interpret tokens owned
by a child; the active domain context remains responsible for consuming child
work requests.
See [Model lifecycle](../concepts/model-lifecycle.md#schema-backed-child-collections)
for removal, deletion, event, and nested-context rules.

### Enum-backed fields

Enum metadata resolves lazily from the concrete model constructor's PascalCase
static. Normal inherited-static lookup is supported.

Imports accept:

- declared member names;
- declared numeric values; and
- identity tuples.

The importer prevalidates the complete update before mutating the target.
Exports select one of:

- `enumFormat: "values"` for numeric values;
- `enumFormat: "names"` for member names; or
- `enumFormat: "identity"` for identity tuples.

When multiple names share one numeric value, name export uses the first
declared key. Schema export includes resolved enum identity and members.

A missing or unresolved enum static passes through without enum validation;
strict missing-static enforcement is not provided by this version.

### Hide inherited schema fields

Carbon Blue surfaces are defined per class, so a real JavaScript subclass may
persist fewer fields than its parent. Use the class-level
`schema.hideInherited()` decorator to remove named inherited fields from only
that class's schema surface:

```js
import { schema, type } from "@carbonenginejs/runtime-utils/schema";

@type.define({ className: "ExampleBucket", family: "example" })
@schema.hideInherited(["distribution", "descriptor", "offset"])
export class ExampleBucket extends ExamplePlacement
{
}
```

Hidden fields are omitted from schema introspection, `GetValues`, document
dehydration, and every export option. `SetValues` and document hydration
silently ignore them, matching `SetValues`' existing unknown-field behavior.
The JavaScript properties, accessors, inheritance, and `instanceof` behavior
are unchanged.

Hides pass to descendants and may be extended by another
`schema.hideInherited()` decorator. There is deliberately no unhide operation.
Naming a field that the parent schema does not expose throws during class
registration.

Each model owns one non-enumerable `__state` object. Model-owned
`__state.dirty` is the generic settle marker; `__state.flags` contains
consumer-cleared lazy invalidations; `__state.rebuild` is a separate
consumer-cleared `Set` of deferred work; and
`__state.updating` plus `__state.suppressEvents` coordinate update processing.
The event emitter adds `__state.events` only while listeners exist. A lifecycle
manager may install `__state.lifecycle` with `initializeLifecycleState()`;
without it, the object remains ordinarily alive and unmanaged. Dirty
consumption and clearing do not modify rebuild or lifecycle state.

See [Model lifecycle](../concepts/model-lifecycle.md) for settlement,
initialization, traversal, resource, and optional lifecycle-state details.

## Subpaths

```js
import { CjsCarbonDocument, CjsDocumentHydrator } from "@carbonenginejs/runtime-utils/document";
import { createLifecycleAdapter } from "@carbonenginejs/runtime-utils/hydration";
import { CjsLifecycleState } from "@carbonenginejs/runtime-utils/lifecycle";
import { CjsSchema, type, io, jessica, carbon, components } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel, CjsEventEmitter, CjsModelState } from "@carbonenginejs/runtime-utils/model";
import { CARBON_TYPE, normalizeCarbonValue } from "@carbonenginejs/runtime-utils/types";
```
