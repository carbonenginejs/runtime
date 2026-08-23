# @carbonenginejs/runtime-core

GPU-free CarbonEngineJS composition root and runtime service registry.

Use this package to compose resource, SOF, device, audio, and input services;
register capability reports; and resolve resource-request behavior. It does
not load source bytes, decode formats, create GPU devices, or own backend
lifecycle.

## Install

```sh
npm install @carbonenginejs/runtime-core
```

## Quick start

```js
import CjsLibrary, {
    CjsServiceKey
} from "@carbonenginejs/runtime-core";

const library = new CjsLibrary({
    resourceManager,
    spaceObjectFactory,
    services: {
        [CjsServiceKey.INPUT_MANAGER]: inputManager
    },
    capabilities: {
        webgpu: true
    }
});

library.Register({
    resourceDefaults: { emit: "json" },
    resMan: resourceOptions,
    sof: sofOptions
});

await library.InitializeAsync({ dataPath: "res:/sof/data.black" });
const resource = library.GetResource("res:/model/ship.gr2");
```

Browser platform information is available from the explicit subpath:

```js
import { Tr2PlatformInfo } from "@carbonenginejs/runtime-core/platform";

const platform = await Tr2PlatformInfo.Detect();
platform.RegisterCapabilities(library);
```

## Documentation

- [Package documentation](docs/README.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Composing a library](docs/guides/composing-a-library.md)
- [API reference](docs/reference/api.md)
- [Resource request policy](docs/reference/resource-request-policy.md)
- [Browser platform capabilities](docs/reference/platform.md)
- [Class catalog](docs/reference/classes/README.md)

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
