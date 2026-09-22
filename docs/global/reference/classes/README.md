# Runtime global foundation class reference

Status: Evolving
Scope: `@carbonenginejs/runtime` class exports
Audience: Runtime authors and integrators
Summary: Catalogs maintained named classes in the consolidated runtime foundation.

<!-- class:CjsBlueEnumRegistry -->
## `CjsBlueEnumRegistry`

Combines Carbon enum registration and BlueEnum lookup in a dependency-free registry.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/enums/CjsBlueEnumRegistry.js`
- Visibility: Public
- Kind: Adapted Carbon port

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

<!-- class:IInitialize -->
## `IInitialize`

Carbon's once-per-object hook, called after a read has written every member. A class implementing it is asking to be told once at the end instead of once per member, and readers suppress `INotify` for it entirely.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IInitialize.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:IListNotify -->
## `IListNotify`

The single observer a Blue list notifies, and the owner of the `BLUELISTEVENT` vocabulary. Every event fires after the mutation, and load and unload OR a flag on top, so mask before comparing.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IListNotify.js`
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

<!-- class:BlueClasses -->
## `BlueClasses`

The class registry `blue.classes` holds: registration and creation by class name over the same constructor table the schema fills, so one layer can build a class another owns without importing it.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/BlueClasses.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:IBlueClasses -->
## `IBlueClasses`

Class registration, lookup and creation by name, as consumers see Carbon's class registry.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBlueClasses.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:IBluePaths -->
## `IBluePaths`

Search paths, resolution, directory contents, existence and streams, kept a separate service from the resource manager as Carbon keeps them.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBluePaths.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:IBlueOS -->
## `IBlueOS`

The operating system as its consumers see it: the root clock, the pump that ticks every registrant, error reporting and process control. The error, startup-argument and process-control verbs are declared and refused.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBlueOS.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:CjsBlueOS -->
## `CjsBlueOS`

The half of `BeOS` a browser can answer honestly: the clock, the frame-time cache and the tick registry that drives `TriDevice.OnTick`.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/CjsBlueOS.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CcpDateTime -->
## `CcpDateTime`

A Blue timestamp broken into UTC calendar fields, laid out as Win32 SYSTEMTIME so that `dayOfWeek` sits between `month` and `day` and is output only.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/CcpDateTime.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:BeInfo -->
## `BeInfo`

Blue's clocks, framerate state and pump counters in one record, as `GetInfo` returns it. Only the time and pump fields are filled here.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/BeInfo.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:IBlueEvents -->
## `IBlueEvents`

The fixed-rate tick callback. A class implements `OnTick` and hands itself to `RegisterForTicks`; Carbon maps this on nothing, so it is an implementation base and never a cast.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBlueEvents.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:IVariableTicker -->
## `IVariableTicker`

The variable-rate tick callback, told how much time passed rather than what time it is.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IVariableTicker.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:ICatchupTicks -->
## `ICatchupTicks`

A variable-rate ticker that is also told when every tick for its system in this frame has completed.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/ICatchupTicks.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:ISimTimeRebaseNotify -->
## `ISimTimeRebaseNotify`

Told when the simulation clock is MOVED rather than slowed, so anything holding a simulation timestamp can rebase it.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/ISimTimeRebaseNotify.js`
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
