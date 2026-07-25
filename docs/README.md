# Runtime Trinity documentation

Status: Evolving
Scope: `@carbonenginejs/runtime-trinity`
Audience: Runtime authors, engine authors, integrators, and maintainers
Summary: Explains the GPU-free Trinity graph, its public entry points, and its ownership boundaries.

## Purpose

`@carbonenginejs/runtime-trinity` owns serializable Carbon Trinity and Eve
object graphs together with portable CPU-side behavior. Applications can
hydrate, inspect, update, and collect renderer-neutral work from those graphs
without creating a canvas, graphics context, or GPU device.

The source contains generated schema intake and maintained implementations.
Classes leave `src/generated` before their first substantive manual source
change and move into readable source-area directories. A promoted class may
remain explicitly incomplete while its bounded portable behavior is reviewed.
The parity audit can expose additional inherited or interface obligations
after promotion; current exceptions remain explicit in the
implementation-status reference.

## Use this package when

Use `@carbonenginejs/runtime-trinity` when code needs to:

- hydrate or serialize Trinity and Eve graph objects;
- update curves, controllers, cameras, scene objects, or effects on the CPU;
- collect render batches and render-job intents for an engine to realize;
- inspect schema-decorated fields and enum choices; or
- build a headless tool that must not depend on WebGL or WebGPU.

Use an engine package when code needs device creation, shader realization,
resource uploads, draw submission, presentation, or device-loss recovery.

## Where it fits

```text
@carbonenginejs/tools-core -- reviewed source --> @carbonenginejs/runtime-trinity
@carbonenginejs/runtime-trinity -- depends on --> @carbonenginejs/runtime-utils

@carbonenginejs/runtime-resource -- decoded values --> application composition
@carbonenginejs/runtime-trinity -- graph and intents --> application composition
application composition --> @carbonenginejs/engine-webgpu or host engine
```

`@carbonenginejs/runtime-utils` provides the shared model, schema, constants,
and math foundation. `@carbonenginejs/tools-core` is a build-time producer of
schema and generated-class input, not a runtime dependency.
`@carbonenginejs/runtime-resource` owns decoded geometry, texture, effect, and
related resource values. Engine packages own live backend objects and realize
Trinity's renderer-neutral graph.

Character GState behavior belongs to `@carbonenginejs/runtime-character`.
Applications or `@carbonenginejs/runtime-core` compose these domains.

## Start here

```js
import { EveCamera } from "@carbonenginejs/runtime-trinity/eve";

const camera = new EveCamera();
camera.translationFromParent = 100;
camera.Update(0, 16 / 9);

const view = camera.GetViewMatrix();
```

Import a focused public subpath when the consumer only needs one source
family. The root entry aggregates the complete public runtime.

## Documentation map

- [Architecture and ownership boundaries](architecture.md)
- [Current API](reference/api.md)
- [Main semantic extraction](reference/main-semantic-extraction.md)
- [Eve runtime behavior](concepts/eve-runtime-behavior.md)
- [Generated-class lifecycle](concepts/generated-class-lifecycle.md)
- [Implementation status and audits](reference/implementation-status.md)

A complete class-purpose catalog is planned after generated classes carry
reviewed descriptor metadata and the shared documentation checker supports the
package's deliberate dropped-class quarantine.
