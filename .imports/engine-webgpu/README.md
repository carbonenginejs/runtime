# @carbonenginejs/engine-webgpu

`@carbonenginejs/engine-webgpu` consumes already-selected Carbon WebGPU package data
and realizes explicit WebGPU pipeline, resource, binding, and draw requests.

Use this experimental package when the caller already owns effect selection,
packed geometry, texture pixels, sampler state, uniform values, and render
policy. It owns WebGPU objects and uploads without a production or source
dependency on runtime-core, runtime-resource, or runtime-trinity; the latter two
are development dependencies used by the harness and integration tests.

## Install

Registry publication is not current. Install dependencies from a source
checkout:

```sh
git clone https://github.com/carbonenginejs/engine-webgpu.git
cd engine-webgpu
npm install
```

## Quick start

In a browser with WebGPU, prepare an already-decoded Carbon WebGPU package and its
selected pipeline:

```js
import {
  CjsWebgpuDevice,
  CjsWebgpuPackage
} from "@carbonenginejs/engine-webgpu";

const pkg = CjsWebgpuPackage.from(packageData);
const pipeline = pkg.GetPipeline("Main", 0);
const webgpu = await CjsWebgpuDevice.Request({
  gpu: navigator.gpu,
  shaderStage: GPUShaderStage
});
try {
  const prepared = await webgpu.PreparePipeline(pipeline, {
    warningsAsErrors: true
  });
} finally {
  webgpu.Destroy();
}
```

Pipeline state, packed resources, binding values, draw encoding, and cleanup
remain explicit caller inputs. Per-object bytes arrive as `runtime-trinity`
`RawData`, which already stores every matrix in Carbon cbuffer register-row
order, and reach the GPU through `CollectPerObjectUploads`. Material constant
layouts come from `MaterialLayoutFromShader`, which reads the pass's stage
inputs; this package has no path that reads reflection from a format record.

The standalone harness prepares selected and all-body packages and proves that
the body set and the selected views resolve to equivalent descriptors. Its
browser gates draw selected
packages for static and skinned QuadV5 families, decals, array textures, and
compiler-emitted detail-map resource transforms. They validate transform
declarations against their post-transform layouts and draw the ordered two- and
three-layer arrays for both medium and High detail packages.

These are synthetic conformance gates. They do not load SOF, production
geometry, textures, defaults, or a Trinity graph. A separate GPU-free test uses
real runtime-trinity effect, batch, accumulator, and batch-map types, but still
assigns the effect resource manually because no production loader owns that
write yet. The internal dispatcher is not a public renderer-composition API.

See the [WebGPU harness guide](docs/guides/webgpu-harness.md) for pinned build
measurements, exact package axes, fixture provenance, and reproduction commands.

## Documentation

- [Package documentation](docs/README.md)
- [Architecture and boundaries](docs/architecture.md)
- [Public API reference](docs/reference/api.md)
- [WebGPU harness](docs/guides/webgpu-harness.md)
- [Class-purpose catalog](docs/reference/classes/README.md)

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE). CarbonEngine and Fenris
Creations (CCP Games) are named for interoperability and provenance context.
This project contains CarbonEngineJS original code unless `NOTICE` states
otherwise and is not affiliated with or endorsed by CCP Games.
