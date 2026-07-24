# API reference

Status: Evolving
Scope: `@carbonenginejs/runtime-core` package-root exports
Audience: Runtime integrators
Summary: Documents the composition library, service keys, lifecycle, registries, and resource facades.

## Imports

```js
import CjsLibrary, {
    CjsLibrary as NamedLibrary,
    CjsServiceKey
} from "@carbonenginejs/runtime-core";
```

The browser platform classes are also exported from the root, with
`@carbonenginejs/runtime-core/platform` provided as the focused entry point.

## `CjsServiceKey`

The frozen key map contains:

- `RESOURCE_MANAGER`
- `SPACE_OBJECT_FACTORY`
- `DEVICE`
- `AUDIO_SYSTEM`
- `INPUT_MANAGER`

Keys resolve to string names and do not construct their corresponding
services.

## Construction and values

`new CjsLibrary(options)` accepts `services`, `resourceManager`,
`spaceObjectFactory`, `capabilities`, `resourceDefaults`, and `behaviors`.

- `SetValues(options)` applies those fields.
- `GetValues()` returns the current composition snapshot.
- `Register(options)` additionally accepts `resMan` and `sof` forwarding
  topics.

Unknown option and topic names throw.

## Lifecycle

- `Initialize(options)` applies values and marks the library initialized.
- `InitializeAsync(options)` also loads `dataPath` through the SOF service.
- `Shutdown()` clears the initialized flag.
- `IsInitialized()` reports that flag.

## Service registry

- `SetService(key, service)`, `GetService(key)`, `HasService(key)`, and
  `RemoveService(key)` manage general service entries.
- `SetResourceManager(value)` and `GetResourceManager()` manage the dedicated
  resource slot.
- `SetSpaceObjectFactory(value)` and `GetSpaceObjectFactory()` manage the
  dedicated SOF slot.

Setting a dedicated service through its conventional key keeps both views in
sync.

## Capability registry

- `RegisterCapabilities(object)` adds capability values.
- `SetCapability(key, value)`, `GetCapability(key)`, `HasCapability(key)`, and
  `RemoveCapability(key)` manage individual values.
- `GetCapabilities()` returns a frozen plain snapshot.

## Resource policy

- `SetResourceDefaults(options)` and `GetResourceDefaults()` manage base
  request options.
- `RegisterResourceBehavior(name, behavior, options)` adds a named behavior.
- `GetResourceBehavior(name)`, `HasResourceBehavior(name)`,
  `RemoveResourceBehavior(name)`, and `GetResourceBehaviors()` inspect or
  update the behavior registry.
- `ResolveResourceRequest(path, options)` returns the selected path, final
  options, behavior name, and behavior.

See [resource-request-policy.md](resource-request-policy.md) for precedence and
failure behavior.

## Resource and SOF facades

- `GetResource(path, options)` and `GetObject(path, options)` call the
  configured resource manager.
- `FetchResource(path, options)` and `FetchObject(path, options)` return
  promise-facing results.
- `FetchDNA(dna, options)` calls the configured SOF service.
- `Fetch(value, options)` selects DNA or resource behavior from the request.

Missing required services or methods fail with errors carrying a
`CJS_LIBRARY_*` code where the implementation defines one.

## Related documentation

- [Composing a library](../guides/composing-a-library.md)
- [Resource request policy](resource-request-policy.md)
- [Browser platform capabilities](platform.md)
- [Class catalog](classes/README.md)
