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
    audioManager,
    services: {
        [CjsServiceKey.DEVICE]: device,
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
    sof: sofOptions,
    audio: completeAudioLibraryDocument
});
```

`resMan` and `sof` values are forwarded to the corresponding service's
`Register()` method. `audio` is passed unchanged to the audio manager's
`InstallLibrary()` method. Runtime-core never downloads or builds that
document. A missing service or method fails explicitly.

## Initialize and request

```js
await library.InitializeAsync({
    dataPath: "res:/sof/data.black"
});

const handle = library.GetResource("res:/model/ship.gr2");
const object = await library.FetchObject("res:/model/ship.gr2");
const values = await library.FetchDNA("rifter:minmatar:minmatar");
```

`GetResource()` and `GetObject()` are immediate service facades. The
`FetchResource()`, `FetchObject()`, `FetchDNA()`, and `Fetch()` methods return
promises or normalize service results to promises. `FetchDNA()` returns the
plain CjsModel-shaped values produced by `BuildValuesFromDNA*`; it does not
return a `carbon.document` node table.

## Inspect the composition

Use `GetValues()`, `GetCapabilities()`, `GetResourceDefaults()`, and
`GetResourceBehaviors()` for snapshots of the current library configuration.
The returned capability and request-policy snapshots do not transfer
ownership of the registered services.

`Shutdown()` disables and detaches the audio manager but does not dispose it;
the caller retains ownership of its context, provider, and final disposal.
