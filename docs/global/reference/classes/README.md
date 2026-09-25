# Runtime global foundation class reference

Status: Evolving
Scope: `@carbonenginejs/runtime` class exports
Audience: Runtime authors and integrators
Summary: Catalogs maintained named classes in the consolidated runtime foundation.

<!-- class:BeInfo -->
## `BeInfo`

`BeInfo` - Blue's clocks, framerate state and pump counters, per blue/include/IBlueOS.h:55.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/BeInfo.js`
- Visibility: Public
- Kind: Carbon

<!-- class:BlueClasses -->
## `BlueClasses`

`BlueClasses` - the class registry `blue.classes` holds, per blueexposure/BlueClasses.cpp.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/BlueClasses.js`
- Visibility: Public
- Kind: Carbon

<!-- class:CcpDateTime -->
## `CcpDateTime`

`CcpDateTime` - a UTC calendar breakdown, all fields `uint16_t` in the donor.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/CcpDateTime.js`
- Visibility: Public
- Kind: Carbon

<!-- class:CjsBlueOS -->
## `CjsBlueOS`

Carbon's `BeOS`, as much of it as is honest: the clock and the pump.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/CjsBlueOS.js`
- Visibility: Public
- Kind: Carbon

<!-- class:CjsBluePaths -->
## `CjsBluePaths`

Browser paths service: res-file-index existence, with the file-system verbs still refused.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/CjsBluePaths.js`
- Visibility: Public
- Kind: Carbon

<!-- class:CjsScriptCallback -->
## `CjsScriptCallback`

A stored script callback that can be invoked later.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/CjsScriptCallback.js`
- Visibility: Public
- Kind: Carbon

<!-- class:CjsBlueEnumRegistry -->
## `CjsBlueEnumRegistry`

Combines Carbon enum registration and BlueEnum lookup in a dependency-free registry.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/enums/CjsBlueEnumRegistry.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IBlueClasses -->
## `IBlueClasses`

`IBlueClasses` - class registration and creation by name, per blueexposure/include/IBlueClasses.h.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBlueClasses.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IBlueDynamicResourceConstructor -->
## `IBlueDynamicResourceConstructor`

`IBlueDynamicResourceConstructor` - builds a resource for a `dynamic:/<name>` path.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBlueDynamicResourceConstructor.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IBlueEvents -->
## `IBlueEvents`

`IBlueEvents` - the fixed-rate tick callback, per blue/include/IBlueOS.h:229.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBlueEvents.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IBlueOS -->
## `IBlueOS`

`IBlueOS` - the clock, the pump, error reporting and process control, per blue/include/IBlueOS.h.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBlueOS.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IBluePaths -->
## `IBluePaths`

`IBluePaths` - search paths, resolution, existence and streams, per blue/include/IBluePaths.h.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBluePaths.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IBlueResMan -->
## `IBlueResMan`

`IBlueResMan` - the resource manager a consumer sees, per blue/include/IBlueResMan.h.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBlueResMan.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IBlueResManNotifications -->
## `IBlueResManNotifications`

`IBlueResManNotifications` - optional per-call notice of how GetResource answered.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IBlueResManNotifications.js`
- Visibility: Public
- Kind: Carbon

<!-- class:ICatchupTicks -->
## `ICatchupTicks`

`ICatchupTicks` - a variable-rate ticker told when the frame ends, per blue/include/IBlueOS.h:256.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/ICatchupTicks.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IInitialize -->
## `IInitialize`

`IInitialize` - everything has been written; link it up.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IInitialize.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IListNotify -->
## `IListNotify`

`IListNotify` - the single observer a Blue list notifies.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IListNotify.js`
- Visibility: Public
- Kind: Carbon

<!-- class:INotify -->
## `INotify`

`INotify` - a mapped member of this instance was modified from outside.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/INotify.js`
- Visibility: Public
- Kind: Carbon

<!-- class:ISimTimeRebaseNotify -->
## `ISimTimeRebaseNotify`

`ISimTimeRebaseNotify` - told when the simulation clock is moved, per blue/include/IBlueOS.h:267.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/ISimTimeRebaseNotify.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IVariableTicker -->
## `IVariableTicker`

`IVariableTicker` - the variable-rate tick callback, per blue/include/IBlueOS.h:246.

- Export: `@carbonenginejs/runtime/blue`
- Source: `src/global/blue/IVariableTicker.js`
- Visibility: Public
- Kind: Carbon

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

Dependency-free contract for objects that publish a ready world-space axis-aligned bounding box.

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
- Kind: Carbon

<!-- class:BitmapDimensions -->
## `BitmapDimensions`

The dimensions, format and mip layout of a texture.

- Export: `@carbonenginejs/runtime/imageio`
- Source: `src/global/imageio/BitmapDimensions.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Cutout -->
## `Cutout`

`ImageIO::Cutout` - the normalized sub-rectangle a PNG can declare.

- Export: `@carbonenginejs/runtime/imageio`
- Source: `src/global/imageio/Cutout.js`
- Visibility: Public
- Kind: Carbon

<!-- class:HostBitmap -->
## `HostBitmap`

`ImageIO::HostBitmap` - a texture description and its CPU bytes.

- Export: `@carbonenginejs/runtime/imageio`
- Source: `src/global/imageio/HostBitmap.js`
- Visibility: Public
- Kind: Carbon

<!-- class:ImageIOResult -->
## `ImageIOResult`

`ImageIO::Result` - an image operation's outcome.

- Export: `@carbonenginejs/runtime/imageio`
- Source: `src/global/imageio/ImageIOResult.js`
- Visibility: Public
- Kind: Carbon

<!-- class:ImageUtility -->
## `ImageUtility`

Carbon's `ImageUtility` namespace (imageio/ImageUtility.cpp).

- Export: `@carbonenginejs/runtime/imageio`
- Source: `src/global/imageio/ImageUtility.js`
- Visibility: Public
- Kind: Carbon

<!-- class:LoadParameters -->
## `LoadParameters`

`ImageIO::LoadParameters` - the parameters of one image read.

- Export: `@carbonenginejs/runtime/imageio`
- Source: `src/global/imageio/LoadParameters.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Metadata -->
## `Metadata`

`ImageIO::Metadata` - what an image file carries besides its pixels.

- Export: `@carbonenginejs/runtime/imageio`
- Source: `src/global/imageio/Metadata.js`
- Visibility: Public
- Kind: Carbon

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

<!-- class:CjsSchema -->
## `CjsSchema`

Reusable schema/decorator metadata surface.

- Export: `@carbonenginejs/runtime/schema`
- Source: `src/global/schema/CjsSchema.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCancellationError -->
## `CjsCancellationError`

Represents one cancelled operation using Web-compatible abort identity.

- Export: `@carbonenginejs/runtime/utils/errors`
- Source: `src/global/utils/errors/CjsCancellationError.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsError -->
## `CjsError`

Represents one structured operational failure with a stable CarbonEngineJS code.

- Export: `@carbonenginejs/runtime/utils/errors`
- Source: `src/global/utils/errors/CjsError.js`
- Visibility: Public
- Kind: CarbonEngineJS
