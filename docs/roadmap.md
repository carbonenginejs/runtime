# Runtime-core roadmap

Status: Evolving
Scope: Planned `@carbonenginejs/runtime-core` composition work
Audience: Runtime integrators and maintainers
Summary: Separates the available composition root from approved browser-runtime lifecycle, policy, provider, and convenience work.

## Current baseline

The current package provides:

- a GPU-free `CjsLibrary` composition root;
- structural resource, SOF, audio, device, and input service slots;
- a synchronous capability registry;
- resource defaults and named request behaviors;
- immediate and promise-facing resource and SOF facades;
- basic initialization plus optional SOF data loading;
- audio-manager disable/detach during shutdown without service disposal; and
- privacy-filtered browser screen and WebGPU adapter snapshots that do not
  create a `GPUDevice`.

See [architecture](architecture.md), the
[API reference](reference/api.md), and
[platform reference](reference/platform.md) for the available surface.

The package does not currently export a service installer graph, immutable
application configuration, preference store, preload groups, retention
scopes, provider facade, renderer-selection policy, managed runner, or
easy-entry viewer preset.

## Approved composition direction

Runtime-core remains a browser-safe composition and policy layer. It may
coordinate package-owned services, but it does not absorb their implementation:

- runtime-resource retains loading, cache, preparation, and retention
  mechanics;
- domain packages retain graph and media meaning;
- engines retain device creation, capability proof, GPU realization,
  presentation, and loss handling; and
- applications retain product UI, authentication, and deployment choices.

One library instance selects one active renderer backend. A simultaneous
second backend uses a second library instance and a separate resource manager.
Switching a live backend is shutdown and reinitialization, not mutation of an
active session.

The composition layer must not become a global singleton, a universal event
bus, a second resource manager, a renderer, an acquisition service, or a
hidden frame-loop owner.

## Planned state model

Future work keeps five concerns distinct:

| Concern | Meaning |
|---|---|
| Configuration | Application and deployment intent supplied for one instance |
| Capability | Observed facts reported by a provider or engine |
| Preference | A user's requested choice |
| Policy | The effective choice derived from configuration, capabilities, and preferences |
| Runtime state | Ephemeral readiness, failure, connection, or loss state |

Capability discovery must not overwrite a preference. Requested and effective
values remain separately inspectable so a temporarily unavailable preference
can become effective again when capabilities change.

## Planned lifecycle and installers

The next lifecycle layer will add small structural installers with explicit
dependencies. It will:

1. install services without side effects;
2. validate configuration and dependencies before initialization;
3. initialize services in deterministic order;
4. unwind only the services that completed when initialization fails; and
5. stop or detach completed services in reverse order.

The design should remain a small service map and dependency list, not a general
dependency-injection framework. Cleanup must be idempotent, and two library
instances must remain independent.

## Planned preload and retention policy

Runtime-core will own preload intent and retention lifetime because it knows
what must be ready for an application profile. Runtime-resource continues to
own actual loading, cache identity, locks, payloads, and eviction.

The planned descriptor distinguishes:

- required from optional work;
- ready-blocking from background work; and
- warm, explicitly scoped, and runtime-lifetime retention.

Paths continue through ordinary request-policy resolution. A partial failure
must release every acquired scope exactly once, and initialization must not
implicitly pin every resource it touches.

This work requires a reviewed handle or scope contract from the resource
manager; runtime-core must not infer private cache or lock internals.

## Planned capability proof and selection

The current platform surface reports browser-visible WebGPU facts. It does not
prove that a concrete renderer can satisfy an application's minimum contract.

The planned selection flow separates:

1. cheap support reports;
2. an engine-owned asynchronous proof of the required device or context;
3. application policy that ranks proven candidates; and
4. commitment of one selected backend.

Runtime-core records and applies the result. It does not create a GPU device,
test format-specific bytes, or implement WebGL/WebGPU realization itself.
Format and resource reports remain CPU-side evidence; the selected engine owns
device-route proof.

WebGL capability reporting, minimum required limits, device-loss refresh, and
long-lived capability refresh remain design gates rather than current APIs.

## Planned preferences and configuration

The first configuration contract will be JSON-compatible for values while
service instances, functions, credentials, and browser host objects remain
programmatic inputs.

Configuration layering will be explicit and shallow:

```text
package defaults
    < optional preset
    < application configuration
    < per-instance configuration
```

Each namespace owns its merge or replacement rules. Unknown keys fail closed.
Preferences are not another configuration layer, and secrets never enter
exported configuration or preference storage.

The first preference surface will provide validation, requested and effective
values, batching, an in-memory persistence adapter, and package-owned apply
hooks. Browser storage follows only after namespace and version behavior is
tested.

## Planned providers and convenience surface

Runtime-core may expose named browser data providers for generated or deployed
documents. Providers retain provenance, validate their inputs, and are
replaceable. Structured application data remains separate from
runtime-resource byte and lifecycle ownership.

A later easy-entry preset may install the supported browser stack and an
optional managed runner. It must use the same public service and policy
contracts available to low-level consumers. Static deployments must work
without a Node process or credentials; live tooling services remain optional
providers rather than runtime dependencies.

The convenience surface is accepted only when one ordinary static demo can:

- select one proven renderer or report a useful unsupported result;
- load configured static data providers;
- choose a compatible resource preparation route;
- preload and release a bounded bootstrap set;
- expose selected policy and provenance for inspection; and
- shut down without leaked scopes, listeners, or global state.

Exact factory names and export layout remain open until the package dependency
graph and first real consumer prove them.

## Browser gate

Every published runtime-core subpath must import in a modern browser without
Node globals or polyfills. Browser APIs remain lazy or injected so data-only
surfaces can load in workers and headless environments.

The package will add a real-browser import gate before a public convenience
preset. Node may continue to run tests and development tooling; it is not a
runtime dependency.

## Milestone order

1. Add the browser import gate and document main-thread, worker-safe, and
   capability-dependent surfaces.
2. Add deterministic installers, lifecycle cleanup, configuration snapshots,
   and synthetic two-instance tests.
3. Add preload groups and balanced retention scopes through a reviewed
   runtime-resource contract.
4. Add capability proofs, requested/effective preferences, and renderer
   selection policy.
5. Add replaceable static/HTTP data providers and one static easy-entry demo.
6. Add realtime invalidation only after an offline configuration remains fully
   functional.
7. Expand domain integrations only from measured consumer needs.

Each milestone must land as a usable vertical slice. Unproven method names,
binary bundles, cache sharing, live backend switching, and universal provider
or dependency frameworks remain out of scope.
