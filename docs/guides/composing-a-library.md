# Composing a library

Status: Evolving
Scope: `@carbonenginejs/runtime-core` library setup
Audience: Runtime integrators
Summary: Shows service injection, registration forwarding, capability setup, initialization, and fetch workflows.

## Supply services

```js
import CjsLibrary, {
    CjsServiceKey
} from "@carbonenginejs/runtime-core";

const library = new CjsLibrary({
    resourceManager,
    spaceObjectFactory,
    services: {
        [CjsServiceKey.DEVICE]: device,
        [CjsServiceKey.AUDIO_SYSTEM]: audioSystem,
        [CjsServiceKey.INPUT_MANAGER]: inputManager
    }
});
```

Services are structural objects. Runtime-core does not require them to inherit
from a common base class.

## Register capabilities and service topics

```js
library.Register({
    capabilities: {
        webgpu: true,
        compute: true
    },
    resourceDefaults: {
        emit: "json"
    },
    resMan: resourceOptions,
    sof: sofOptions
});
```

`resMan` and `sof` values are forwarded to the corresponding service's
`Register()` method. A missing service or method fails explicitly.

## Initialize and request

```js
await library.InitializeAsync({
    dataPath: "res:/sof/data.black"
});

const handle = library.GetResource("res:/model/ship.gr2");
const object = await library.FetchObject("res:/model/ship.gr2");
const document = await library.FetchDNA("rifter:minmatar:minmatar");
```

`GetResource()` and `GetObject()` are immediate service facades. The
`FetchResource()`, `FetchObject()`, `FetchDNA()`, and `Fetch()` methods return
promises or normalize service results to promises.

## Inspect the composition

Use `GetValues()`, `GetCapabilities()`, `GetResourceDefaults()`, and
`GetResourceBehaviors()` for snapshots of the current library configuration.
The returned capability and request-policy snapshots do not transfer
ownership of the registered services.
