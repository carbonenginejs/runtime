// Ports of Carbon's two Blue libraries, which live side by side here because
// every subsystem uses both:
//
//   - blueexposure (blueexposure/): the class-exposure and object-model layer.
//     CjsBlueClasses / IBlueClasses, Copier / ICopier /
//     ICopierCustomAssignment, BlueList, ICustomPersist, IInitialize, IList,
//     IListNotify and INotify.
//   - blue (blue/): the runtime services. The OS and clock interfaces
//     (IBlueOS, CjsBlueOS, BeInfo, IBlueEvents, ICatchupTicks, IVariableTicker,
//     ISimTimeRebaseNotify), paths, the resource manager and file systems
//     (IBlueResMan, CjsBlueResMan, CjsMotherLode, ICacheable, IBlueResFileSystem,
//     BlueResFileSystemRemote, BlueResFileSystemLocal, CjsBlueResFileSystemFetch,
//     CjsBlueResFileSystemCallback,
//     BlueFileUtil, RemoteFileCache), object metadata, placement
//     observers, the lazy object holder (BlueObjectProxy, IBlueObjectProxy,
//     IBlueObjectBuilder, IUnloadable), the ITri* curve/function interfaces,
//     ICurveSetDriver, and the
//     red/black readers and writers (IRootReader*, IRootWriter, DictReader,
//     YamlWriter).
//
// CcpTime and CcpDateTime port core/include/CcpTime.h. Files with no Carbon
// header of the same name (CjsResource, CjsScriptCallback, CjsResManWorkQueue,
// CjsFormatStore, CjsLoadingObject, the lowercase helper modules) state their
// donor, or that they have none, in their own headers.
//
// NO DECORATOR SYNTAX IN THIS FOLDER. package.json maps BOTH `#blue` and the
// public `./blue` export to this file in `src`, not to the build, so
// `@carbonenginejs/runtime/blue` is raw source - and the tests that import it
// that way cannot parse an `@`. A decorator here fails as
// `SyntaxError: Invalid or unexpected token` in a test that looks unrelated.
// Use `CjsSchema.define` and `CjsSchema.decorateMethod` at the foot of the
// file, as every class here does. This is a packaging constraint, not a
// preference, and it does not contradict the decorator direction elsewhere.

/**
 * Resource lifecycle across CjsResource, CjsBlueResMan and CjsMotherLode.
 *
 * States (`CjsResource.State`): EMPTY -> REQUESTED (waiting on a queued or
 * shared source load) -> LOADING (bytes in hand, reader running) -> PREPARED
 * when CjsBlueResMan publishes the reader outcome; FAILED when reading,
 * conversion, validation or publication fails. LOADED and PREPARING serve
 * resources that prepare in a separate phase. PURGED marks a policy eviction;
 * a purged handle reloads itself on its next KeepAlive()/IsGood().
 *
 * Retention has three independent axes: identity (path, state, lightweight
 * metadata), CPU payload, and adapter payload (backend objects in opaque
 * adapter slots, destroyed by their engine adapters). The CPU payload and the
 * adapter payload are released independently while the identity stays
 * resident.
 *
 * Liveness is per handle: `IsGood()` renews only the handle it is called on
 * and never walks child fields, so an aggregate that owns child resources
 * must query or retain them itself.
 */

export * from "./CjsScriptCallback.js";
export * from "./IBlueDynamicResourceConstructor.js";
export * from "./BeInfo.js";
export * from "./IBlueEvents.js";
export * from "./IBlueEventListener.js";
export * from "./IBluePlacementObserver.js";
export * from "./PositionDescription.js";
export * from "./IBlueMultiPlacementObserver.js";
export * from "./IVariableTicker.js";
export * from "./ICatchupTicks.js";
export * from "./ISimTimeRebaseNotify.js";
export * from "./IBlueOS.js";
export * from "./CjsBlueOS.js";
export * from "./CcpDateTime.js";
export * from "./CcpTime.js";
export * from "./IBlueResMan.js";
export * from "./IBlueResManNotifications.js";
export * from "./ICacheable.js";
export * from "./IRoot.js";
export * from "./IInitialize.js";
export * from "./IUnloadable.js";
export * from "./IBlueObjectBuilder.js";
export * from "./IBlueObjectProxy.js";
export * from "./BlueObjectProxy.js";
export * from "./ICurveSetDriver.js";
export * from "./ITriFunction.js";
export * from "./ITriScalarFunction.js";
export * from "./ITriVectorFunction.js";
export * from "./ITriQuaternionFunction.js";
export * from "./ITriColorFunction.js";
export * from "./ITriCurveLength.js";
export * from "./IList.js";
export * from "./BlueList.js";
export * from "./IListNotify.js";
export * from "./INotify.js";
export { NotifyModified } from "../compose/values.js";
export * from "./IBlueResFileSystem.js";
export * from "./RemoteFileCache.js";
export * from "./BlueResFileSystemRemote.js";
export * from "./BlueResFileSystemLocal.js";
export * from "./CjsBlueResFileSystemFetch.js";
export * from "./CjsBlueResFileSystemCallback.js";
export * from "./BlueFileUtil.js";
export * from "./CjsBluePaths.js";
export * from "./IBlueCallbackMan.js";
export * from "./BlueCallbackMan.js";
export * from "./worker/BlueCallbackManWorker.js";
// The resource manager core: Carbon's BlueResMan, BlueAsyncRes and MotherLode
// live in Blue, and so does ours. Formats and concrete resources stay in
// resource and register with it.
export * from "../consts/resourceHandlerMode.js";
export * from "../consts/resourceRequirement.js";
export * from "./CjsFormatStore.js";
export * from "./CjsResource.js";
export * from "./CjsLoadingObject.js";
export * from "./CjsMotherLode.js";
export * from "./worker/CjsResManMainThreadLoader.js";
export * from "./worker/CjsResManWorkerLoader.js";
export { CjsResManQueue } from "./CjsResManWorkQueue.js";
export * from "./CjsBlueResMan.js";
export * from "./IBluePaths.js";
export * from "./IBlueClasses.js";
export * from "./CjsBlueClasses.js";
export * from "./ICopier.js";
export * from "./ICopierCustomAssignment.js";
export * from "./ICustomPersist.js";
export * from "./Copier.js";
export { CjsBlue } from "./CjsBlue.js";
export { blue } from "./blue.js";
export { CjsBlueEnumRegistry, EnumRegistrationType } from "./enums/CjsBlueEnumRegistry.js";
// The values engine: Blue's dictionary reader and a writer modelled on YamlWriter.
export * from "./IBlueObjectMetadata.js";
export * from "./BlueObjectMetadata.js";
export * from "./IRootReader.js";
export * from "./IRootReaderException.js";
export * from "./InvalidAttributeException.js";
export * from "./IRootReaderBase.js";
export * from "./DictReader.js";
export * from "./IRootWriter.js";
export * from "./DictWriter.js";
export * from "./YamlWriter.js";

export { GetResources } from "./getResources.js";

export * from "./ITriObserverLocal.js";

import "./values.js";
