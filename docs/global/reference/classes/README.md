# Runtime global foundation class reference

Status: Evolving
Scope: `@carbonenginejs/runtime` class exports
Audience: Runtime authors and integrators
Summary: Catalogs maintained named classes in the consolidated runtime foundation.

<!-- class:CjsBackendCandidate -->
## `CjsBackendCandidate`

Dependency-free participant in runtime backend selection.

- Export: `@carbonenginejs/runtime/contracts`
- Source: `src/global/contracts/CjsBackendCandidate.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsConstantPayload -->
## `CjsConstantPayload`

Terminal constant-buffer bytes with an explicit upload dirty lifecycle.

- Export: `@carbonenginejs/runtime/contracts`
- Source: `src/global/contracts/CjsConstantPayload.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITr2BoundingBox -->
## `ITr2BoundingBox`

Dependency-free abstract contract for objects that publish ready world-space axis-aligned bounds, with a mixin for providers that already inherit a model base.

- Export: `@carbonenginejs/runtime/contracts`
- Source: `src/global/contracts/ITr2BoundingBox.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITr2RenderNode -->
## `ITr2RenderNode`

Dependency-free contract for one node in a Trinity render graph.

- Export: `@carbonenginejs/runtime/contracts`
- Source: `src/global/contracts/ITr2RenderNode.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IBlueResMan -->
## `IBlueResMan`

The resource manager as its consumers see it: the eighteen verbs Carbon publishes, behind which any implementation may sit.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBlueResMan.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:IBlueResManNotifications -->
## `IBlueResManNotifications`

Optional per-call notice of whether a resource request was answered from the cache or newly created, with doing nothing as the declared default.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBlueResManNotifications.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:INotify -->
## `INotify`

Carbon's single-method hook, called when something outside the object edits a member the class flagged for notification. One implementor per class; it is not the event emitter, and a reader calls it or `IInitialize` but never both.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/INotify.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:IBlueDynamicResourceConstructor -->
## `IBlueDynamicResourceConstructor`

The factory a subsystem registers with the manager so a `dynamic:/<name>` path can be built without the manager knowing what it builds.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBlueDynamicResourceConstructor.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:CjsBluePaths -->
## `CjsBluePaths`

The paths service a browser can answer: res-file-index existence, with the verbs needing a real file system still refused.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/CjsBluePaths.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:IBluePaths -->
## `IBluePaths`

Search paths, resolution, directory contents, existence and streams, kept a separate service from the resource manager as Carbon keeps them.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBluePaths.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:CjsScriptCallback -->
## `CjsScriptCallback`

A stored script callback that can be invoked later.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/CjsScriptCallback.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsError -->
## `CjsError`

Represents one structured operational failure with a stable CarbonEngineJS code.

- Export: `@carbonenginejs/runtime/utils/errors`
- Source: `src/global/utils/errors/CjsError.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCancellationError -->
## `CjsCancellationError`

Represents one cancelled operation using Web-compatible abort identity.

- Export: `@carbonenginejs/runtime/utils/errors`
- Source: `src/global/utils/errors/CjsCancellationError.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCarbonDocument -->
## `CjsCarbonDocument`

Represents one neutral Carbon document graph for hydration and dehydration.

- Export: `@carbonenginejs/runtime/model/document`
- Source: `src/global/model/document/CjsCarbonDocument.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsClassRegistry -->
## `CjsClassRegistry`

Maps serialized Carbon class names to explicit runtime constructors.

- Export: `@carbonenginejs/runtime/model/document`
- Source: `src/global/model/document/CjsClassRegistry.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsDocumentDehydrator -->
## `CjsDocumentDehydrator`

Converts runtime object graphs into neutral Carbon documents.

- Export: `@carbonenginejs/runtime/model/document`
- Source: `src/global/model/document/CjsDocumentDehydrator.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsDocumentHydrator -->
## `CjsDocumentHydrator`

Constructs runtime object graphs from neutral Carbon documents.

- Export: `@carbonenginejs/runtime/model/document`
- Source: `src/global/model/document/CjsDocumentHydrator.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsStructRegistry -->
## `CjsStructRegistry`

Maps serialized Carbon struct names to explicit constructors and layouts.

- Export: `@carbonenginejs/runtime/model/document`
- Source: `src/global/model/document/CjsStructRegistry.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsLifecycleState -->
## `CjsLifecycleState`

Inspectable lifecycle state shared by participating runtime objects.

- Export: `@carbonenginejs/runtime/model/lifecycle`
- Source: `src/global/model/lifecycle/CjsLifecycleState.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsEventEmitter -->
## `CjsEventEmitter`

Minimal event emitter with lowercase exact-name dispatch.

- Export: `@carbonenginejs/runtime/model`
- Source: `src/global/model/CjsEventEmitter.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsModel -->
## `CjsModel`

Shared base for schema-backed CarbonEngineJS runtime classes.

- Export: `@carbonenginejs/runtime/model`
- Source: `src/global/model/CjsModel.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsPendingReference -->
## `CjsPendingReference`

Represents one unresolved model reference during a single import operation.

- Source: `src/global/model/CjsModel.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsModelState -->
## `CjsModelState`

Per-model runtime state.

- Export: `@carbonenginejs/runtime/model`
- Source: `src/global/model/CjsModelState.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsSchema -->
## `CjsSchema`

Reusable schema/decorator metadata surface.

- Export: `@carbonenginejs/runtime/schema`
- Source: `src/global/schema/CjsSchema.js`
- Visibility: Public
- Kind: CarbonEngineJS
