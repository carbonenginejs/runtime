# @carbonenginejs/runtime-trinity

GPU-free CarbonEngine Trinity and Eve scene-graph classes for serialization,
inspection, simulation, and renderer-neutral runtime behavior.

Use this package when an application needs the portable Trinity object graph
without creating a graphics device. It builds on
`@carbonenginejs/runtime-utils`; resource loading belongs to
`@carbonenginejs/runtime-resource`, and WebGL or WebGPU realization belongs to
an engine.

## Install

```sh
npm install @carbonenginejs/runtime-trinity
```

## Quick start

`EveCamera` maintains Carbon-compatible CPU-side view and projection state:

```js
import { EveCamera } from "@carbonenginejs/runtime-trinity/eve";

const camera = new EveCamera();
camera.translationFromParent = 100;
camera.SetOrbit(0, 0);
camera.Update(0, 16 / 9);

const view = camera.GetViewMatrix();
const projection = camera.GetProjection();
```

No canvas, graphics context, or GPU device is created by this package.

## Documentation

- [Package documentation](docs/README.md)
- [Architecture and ownership boundaries](docs/architecture.md)
- [Current API](docs/reference/api.md)
- [Main semantic extraction](docs/reference/main-semantic-extraction.md)
- [Eve runtime behavior](docs/concepts/eve-runtime-behavior.md)
- [Generated-class lifecycle](docs/concepts/generated-class-lifecycle.md)
- [Implementation status and audits](docs/reference/implementation-status.md)

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

CarbonEngine and Fenris Creations (CCP Games) are named for interoperability
and provenance. CarbonEngineJS is not affiliated with or endorsed by CCP
Games.
