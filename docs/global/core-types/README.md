# @carbonenginejs/runtime

Status: Evolving
Scope: `@carbonenginejs/runtime` Carbon type and model families
Audience: Runtime authors and integrators
Summary: Explains Carbon type descriptors, schemas, models, lifecycle state, documents, and hydration.

Shared CarbonEngineJS type, schema, document, hydration, and runtime model
helpers.

This package is the common contract for packages that read, write, or generate
CarbonEngineJS data. Format packages can stop at plain JSON or a neutral
`CjsCarbonDocument`; runtime packages can opt into registered classes and
`CjsModel` when they want live objects.

## Availability

Source consolidation is complete, but the combined package remains private
while consumer and registry cutover is prepared. Use the local workspace
package; no published installation command is supported yet.

## What it owns

- `document`: neutral `CjsCarbonDocument`, class/struct registries, hydration,
  and dehydration.
- `hydration`: adapter seam for construction, value application, and finalize
  behavior.
- `schema`: decorators, class/field/method metadata, the direct
  name-to-constructor map, an enum facade backed by Blue, Carbon-method provenance, and
  component metadata helpers.
- `types`: Carbon type descriptors, defaults, coercion, cloning, and export
  helpers.
- `model`: `CjsModel`, `CjsEventEmitter`, model dirty state, traversal helpers,
  and source-record utilities.

Generated enums and generated class catalogs should live in schema or generated
runtime packages, not in this foundational package.

## Invalidation audit metadata

`@impl.invalidates(...members)` records the actual state members that a field
or method invalidates. It is descriptive metadata only: it does not set dirty
flags, wrap methods, rebuild objects, schedule work, or emit events. The owning
class implements those behaviors and their timing.

```js
import { impl } from "@carbonenginejs/runtime/schema";

class Example
{
  @impl.invalidates("boundsDirty")
  position = [0, 0, 0];

  boundsDirty = false;
}
```

The names are available as `CjsSchema.getField(Example, "position").impl.invalidates`;
method annotations are available through `CjsSchema.getMethod`. Use variadic
member names, not an array plus an immediate/deferred flag. This annotation
does not replace the mutation code responsible for invalidating those members.

## Blue edit flags

Named enum registration and qualified `type.enum` lookup are documented in
[Blue enum registry](../blue-enums.md). Short-name class-static lookup remains
available during migration.

The `edit` namespace describes Blue's access, persistence and editor flags.
Flags combine independently; persistence does not imply script access.

| Blue flag | Value | Decorator |
|---|---:|---|
| NONE | `0x000` | `edit.none` |
| READ | `0x001` | `edit.read` |
| WRITE | `0x002` | `edit.write` |
| READWRITE | `0x003` | `edit.readwrite` |
| NOTIFY | `0x004` | `edit.notify` |
| HIDDEN | `0x008` | `edit.hidden` |
| PERSIST | `0x010` | `edit.persist` |
| RPERSIST | `0x020` | `edit.rpersist` |
| FLAGS | `0x100` | `edit.flags` |
| ENUM | `0x200` | `edit.enum` |
| PERSISTONLY | `0x018` | `edit.persistOnly` |

`type.enum(...)` retains chooser metadata and exposes `edit.enum: true` in the
resolved schema, so existing enum declarations need no duplicate annotation.
`edit.flags` describes a bitmask; it does not supply a chooser or an editor.
Blue's MODMASK, SERMASK and EDMASK are masks over these bits, and EDIT_FORCELONG
is an enum-width sentinel; they are not decorators applied to fields.

Values import accepts WRITE, PERSIST or RPERSIST even when READ is present.
RPERSIST follows the declared load-only flag contract; some native reader
implementations do not honor it, so this is an explicit JS transport choice.
Persisted output (`GetValues({ persistOnly: true })`) selects PERSIST, including
PERSISTONLY. RPERSIST alone is omitted; PERSIST combined with RPERSIST still
exports. The existing unfiltered values view retains all declared fields.

These services perform values interchange, not BluePyWrap property access.
Unflagged declared fields remain supported, and the unfiltered values view does
not enforce script READ permissions. Direct JS field access is not intercepted.

## Member notifications

`@edit.notify` requests `OnModified(propertyName)` after an accepted values write,
including an equal write, matching Blue's mapped-member write behavior. Equality
only controls the changed-value result. `notify: false` and `markDirty: false`
suppress transport notifications; `skipUpdate: true` defers and coalesces them.

There is no `edit.always` or `impl.notifyOnEqual`. Implementation annotations
are not switches for values transport. Class setters retain their own native
responsibilities; caller-specific binding gates remain separate from this rule.

## Hydration contract

Hydration runs `construct`, `applyValues`, then post-graph `finalize`.
`CjsDocumentHydrator` constructs through the supplied registry or
`CjsSchema.GetConstructor(name)` unless a custom construction hook supplies
the target.

By default, population calls `SetValues(values, options)` when available,
otherwise `Object.assign`. Finalization calls `Initialize()` with no arguments
when available, after every node has been populated.

Override individual hooks through `options.adapter`. To suppress initialization,
provide a no-op `finalize` hook. `createLifecycleAdapter` has been removed;
`resolveHydrationAdapter` is exported from `@carbonenginejs/runtime/schema/hydration`,
with `@carbonenginejs/runtime/model/hydration` retained as a compatibility subpath.

## Usage

### Hydrate a neutral document into runtime classes

```js
import {
  CjsCarbonDocument,
  CjsClassRegistry,
  CjsDocumentHydrator
} from "@carbonenginejs/runtime/model/document";
import { CjsModel } from "@carbonenginejs/runtime/model";
import { CjsSchema } from "@carbonenginejs/runtime/schema";

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

const adapter = {
  finalize()
  {
    // This example deliberately skips initialization.
  }
};
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

`CjsSchema.define` also accepts name-keyed `fields` and `methods` objects. Key
order is declaration order and therefore drives `GetValues()` export order.
Each member value may be one decorator, a namespace object, or an array mixing
both forms, so imperative definitions reuse the same vocabulary instead of
inventing a parallel metadata spelling:

```js
CjsSchema.define(DemoNode, {
  className: "DemoNode",
  family: "example",
  fields: {
    count: type.uint32
  },
  methods: {
    GetCount: [carbon.method, impl.implemented]
  }
});
```

The older array-of-`{ name, ... }` records remain supported. Decorator syntax
is still the ordinary source convention; the object form is useful for bounded
declaration-only modules that must load without a decorator transform.

### Expand class defaults without hydrating a graph

`CjsSchema.getDefaults(ConstructorOrName)` returns a fresh, self-describing
plain-values template for one registered class. Stage-3 field decorators retain
their initializer value before the constructor body can replace it with
instance state. If no instance has exposed those initializers yet, the schema
constructs the class once with zero arguments, caches a private template,
and returns a copy. JavaScript still runs that constructor body; the operation
does not call `CjsModel.from`, `SetValues`, `Initialize`, `UpdateValues`, or any
other model lifecycle hook.

`CjsSchema.applyDefaults(values)` applies those templates to a sparse
self-describing values graph. Authored fields win, authored collections replace
default collections, plain structs merge recursively, and `_id`/`_ref` topology
is preserved. An unknown `_type` is an error. This is intended for deterministic
JSON consumers that need the declared class shape without constructing the
authored graph as live runtime objects.

```js
const shipDefaults = CjsSchema.getDefaults("EveShip2");
const expandedShipValues = CjsSchema.applyDefaults(sparseShipValues);
```

Known limitation: exported method metadata is not inheritance-aware. Fields
resolve through the class lineage, while `getSchema(Constructor).methods`
currently reads only that class's stored method list. Stage-3 method
initializers can also register a base declaration on an instance's concrete
constructor, making decorated method ownership construction-order dependent.
No current runtime consumer reads exported `.methods`; tools-core derives its
method catalog from source. Fixing this requires a scoped schema change because
it changes exported metadata for every decorated class.

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

Named child methods, the static collection helpers, hydration, list
notifications, tokens, events and removal are documented in the JSDoc of
`CjsModel` (`src/global/model/CjsModel.js`).

### Enum-backed fields

Qualified enum names resolve through Blue's registry. Legacy short names resolve
lazily from the model constructor's PascalCase static, including inherited
statics. Both paths expose the same member object used by values transport.

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

A missing qualified registration throws; failed resolution is not cached, so
registration can occur before retrying. A missing legacy enum static still passes
through without enum validation.

### Hide inherited schema fields

Carbon Blue surfaces are defined per class, so a real JavaScript subclass may
persist fewer fields than its parent. Use the class-level
`schema.hideInherited()` decorator to remove named inherited fields from only
that class's schema surface:

```js
import { schema, type } from "@carbonenginejs/runtime/schema";

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

`__state`, settlement, initialization, traversal and resources are documented
in the JSDoc of `CjsModel` and `CjsModelState` (`src/global/model/`).

## Subpaths

```js
import { CjsCarbonDocument, CjsDocumentHydrator } from "@carbonenginejs/runtime/model/document";
import { resolveHydrationAdapter } from "@carbonenginejs/runtime/schema/hydration";
import { CjsLifecycleState } from "@carbonenginejs/runtime/model/lifecycle";
import { CjsSchema, type, io, jessica, carbon, components } from "@carbonenginejs/runtime/schema";
import { CjsModel, CjsEventEmitter, CjsModelState } from "@carbonenginejs/runtime/model";
import { CARBON_TYPE, normalizeCarbonValue } from "@carbonenginejs/runtime/schema/types";
```
