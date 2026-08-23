# Runtime Trinity API

Status: Evolving
Scope: `@carbonenginejs/runtime/trinity`
Audience: Runtime authors, engine authors, and integrators
Summary: Lists the current public subpaths and their owned source families.

## Contract

All public entries are ECMAScript modules. Importing them creates no graphics
device or backend context. The root entry aggregates the complete runtime;
focused subpaths allow consumers to state a narrower dependency.

The root entry also contains the maintained `sprite2d` family. There is no
focused `./sprite2d` package export in the current manifest.

## Current subpaths

| Import | Purpose |
| --- | --- |
| `@carbonenginejs/runtime/trinity` | Complete public Trinity and Eve runtime surface. |
| `@carbonenginejs/runtime/trinity/controllers` | Controller actions, variables, state machines, and expression behavior. |
| `@carbonenginejs/runtime/trinity/curves` | Scalar, vector, quaternion, event, sequencer, and animation curve families. |
| `@carbonenginejs/runtime/trinity/eve` | Maintained Eve cameras, scenes, objects, attachments, effects, behaviors, and UI graph classes. |
| `@carbonenginejs/runtime/trinity/generated` | Aggregate generated schema-intake classes that have not been promoted. |
| `@carbonenginejs/runtime/trinity/generated/*` | Generated family barrel selected by package export pattern. |
| `@carbonenginejs/runtime/trinity/generated/*.js` | Exact generated module selected by package export pattern. |
| `@carbonenginejs/runtime/trinity/particle` | Maintained CPU particle data, emitters, forces, constraints, and systems. |
| `@carbonenginejs/runtime/trinity/perframe` | Canonical per-frame constant-data layouts and layout lookup. |
| `@carbonenginejs/runtime/trinity/perobject` | Canonical per-object constant-data layouts and layout lookup. |
| `@carbonenginejs/runtime/trinity/postProcess` | Device-free post-process graph and attribute models. |
| `@carbonenginejs/runtime/trinity/renderJob` | Ordered render-job and render-step graph classes. |
| `@carbonenginejs/runtime/trinity/shader` | Mutable effect/material facade, parameters, options, sampler overrides, shader buffers, and identity-preserving compatibility reexports of resource-owned reflection classes. |
| `@carbonenginejs/runtime/trinity/core` | Core Trinity resources, batches, views, projections, bindings, and graph records. |
| `@carbonenginejs/runtime/trinity/ui` | Maintained Trinity UI graph classes. |
| `@carbonenginejs/runtime/trinity/utilities` | Package-specific portable runtime helpers. |

Promoted classes are exported through their maintained family and no longer
remain under `generated`. For example:

```js
import { EveCamera } from "@carbonenginejs/runtime/trinity/eve";
import {
    Tr2DynamicBinding,
    TriValueBinding
} from "@carbonenginejs/runtime/trinity/core";
```

## Schema and enum metadata

Runtime classes use `@type.define` for Carbon class identity and field
decorators from `@carbonenginejs/runtime/schema`. Enum-backed integer
fields use `@schema.enum` so metadata consumers can present the maintained enum
vocabulary. Class-associated enums normally live as named frozen statics on
their canonical class. Ownerless single-package vocabulary remains with its
family; only genuinely shared cross-package vocabulary belongs in
`@carbonenginejs/runtime/global`.

Public methods that implement Carbon exposure use `@carbon.method`. The parity
audit checks promoted classes for omitted and present-but-unexposed methods.

`@carbon.contextual([...])` marks a method that consumes explicit context in
place of Carbon renderer or process globals. The context argument comes first.
The marker does not belong on the owner that constructs or stamps that context;
for example, `EveSpaceScene.Update(realTime, simTime)` owns the scene context
and is not contextual.

When a JavaScript adaptation uses caller-owned output storage, the output
argument stays last. The method's JSDoc and signature decide whether it is
required or defaults to newly allocated storage; `@impl.adapted` does not make
output buffers universally optional.

## Constraints

- Generated wildcard subpaths are intake surfaces and can change when a class
  is promoted to its maintained family.
- A graph class describing a device or buffer does not expose a live backend
  object.
- Resource and engine capabilities are supplied by their owning packages.
- Explicit implementation gaps remain visible rather than receiving guessed
  behavior.

## Related documentation

- [Architecture and ownership boundaries](../architecture.md)
- [Main semantic extraction](main-semantic-extraction.md)
- [Eve runtime behavior](../concepts/eve-runtime-behavior.md)
- [Generated-class lifecycle](../concepts/generated-class-lifecycle.md)
- [Implementation status and audits](implementation-status.md)
