// Ports of Carbon's two Blue libraries, which live side by side here because
// every subsystem uses both:
//
//   - blueexposure (blueexposure/): the class-exposure and object-model layer.
//     BlueClasses / IBlueClasses, Copier / ICopier /
//     ICopierCustomAssignment, BlueList, ICustomPersist, IInitialize, IList,
//     IListNotify and INotify.
//   - blue (blue/): the runtime services. The OS and clock interfaces
//     (IBlueOS, BlueOS, BeInfo, IBlueEvents, ICatchupTicks, IVariableTicker,
//     ISimTimeRebaseNotify), paths, the resource manager and file systems
//     (IBlueResMan, BlueResMan, MotherLode, ICacheable, IBlueResFileSystem,
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
// header of the same name (BlueScriptCallback,
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
 * Native resource flags and persistent notifications live on BlueAsyncRes.
 * resMan owns pending promises and plain/object data; concrete resources own
 * their decoded family data. Only a policy purge permits implicit revival.
 */

export * from "./exposure/BlueScriptCallback.js";
export * from "./interfaces/IBlueDynamicResourceConstructor.js";
export * from "./services/BeInfo.js";
export * from "./interfaces/IBlueEvents.js";
export * from "./interfaces/IBlueEventListener.js";
export * from "./interfaces/IBluePlacementObserver.js";
export * from "./interfaces/PositionDescription.js";
export * from "./interfaces/IBlueMultiPlacementObserver.js";
export * from "./interfaces/IVariableTicker.js";
export * from "./interfaces/ICatchupTicks.js";
export * from "./interfaces/ISimTimeRebaseNotify.js";
export * from "./interfaces/IBlueOS.js";
export * from "./services/BlueOS.js";
export * from "./CcpDateTime.js";
export * from "./CcpTime.js";
export * from "./interfaces/IBlueResMan.js";
export * from "./interfaces/IBlueResManNotifications.js";
export * from "./interfaces/IBlueResource.js";
export * from "./interfaces/IBlueAsyncResNotifyTarget.js";
export * from "./resman/BlueAsyncRes.js";
export * from "./exposure/IPythonMethods.js";
export * from "./interfaces/ICacheable.js";
export * from "./exposure/IRoot.js";
export * from "./exposure/IInitialize.js";
export * from "./interfaces/IUnloadable.js";
export * from "./interfaces/IBlueObjectBuilder.js";
export * from "./interfaces/IBlueObjectProxy.js";
export * from "./services/BlueObjectProxy.js";
export * from "./interfaces/ICurveSetDriver.js";
export * from "./interfaces/ITriFunction.js";
export * from "./interfaces/ITriScalarFunction.js";
export * from "./interfaces/ITriVectorFunction.js";
export * from "./interfaces/ITriQuaternionFunction.js";
export * from "./interfaces/ITriColorFunction.js";
export * from "./interfaces/ITriCurveLength.js";
export * from "./exposure/IList.js";
export * from "./exposure/BlueList.js";
export * from "./exposure/IListNotify.js";
export * from "./exposure/INotify.js";
export { NotifyModified } from "./compose/modified.js";
export * from "./interfaces/IBlueResFileSystem.js";
export * from "./io/RemoteFileCache.js";
export * from "./io/BlueResFileSystemRemote.js";
export * from "./io/BlueResFileSystemLocal.js";
export * from "./io/CjsBlueResFileSystemFetch.js";
export * from "./io/CjsBlueResFileSystemCallback.js";
export * from "./services/BlueFileUtil.js";
export * from "./services/BluePaths.js";
export * from "./interfaces/IBlueCallbackMan.js";
export * from "./services/BlueCallbackMan.js";
export * from "./services/BlueCallbackManTicker.js";
export * from "./interfaces/IBlueThreadMonitor.js";
export * from "./services/BlueThreadMonitor.js";
export * from "./services/ScopedThreadStatus.js";
export * from "./worker/BlueCallbackManWorker.js";
// The resource manager core: Carbon's BlueResMan, BlueAsyncRes and MotherLode
// live in Blue, and so does ours. Formats and concrete resources stay in
// resource and register with it.
export * from "../global/consts/resourceHandlerMode.js";

export * from "./resman/CjsFormatStore.js";

export * from "./resman/CjsLoadingObject.js";
export * from "./resman/MotherLode.js";
export * from "./worker/CjsResManMainThreadLoader.js";
export * from "./worker/CjsResManWorkerLoader.js";
export * from "./resman/BlueResMan.js";
export * from "./interfaces/IBluePaths.js";
export * from "./exposure/IBlueClasses.js";
export * from "./exposure/BlueClasses.js";
export { ClassInfo } from "../global/model/graph/ClassInfo.js";
export { VarEntry } from "../global/model/graph/VarEntry.js";
export { IBlueRtti } from "./exposure/IBlueRtti.js";
export { BlueRttiValue } from "./exposure/BlueRttiValue.js";
export { BlueRttiType } from "./exposure/BlueRttiType.js";
export * from "./exposure/ICopier.js";
export * from "./exposure/ICopierCustomAssignment.js";
export * from "./exposure/ICustomPersist.js";
export * from "./exposure/Copier.js";
export { CjsBlue } from "./services/CjsBlue.js";
export { blue } from "./blue.js";
export { CjsBlueEnumRegistry, EnumRegistrationType } from "./enums/CjsBlueEnumRegistry.js";
// The values engine: Blue's dictionary reader and a writer modelled on YamlWriter.
export * from "./interfaces/IBlueObjectMetadata.js";
export * from "./services/BlueObjectMetadata.js";
export * from "./format/IRootReader.js";
export * from "./format/IRootReaderException.js";
export * from "./format/InvalidAttributeException.js";
export * from "./format/IRootReaderBase.js";
export * from "./formats/graph/DictReader.js";
export * from "./format/IRootWriter.js";
export * from "./formats/graph/DictWriter.js";
export * from "./formats/yaml/YamlWriter.js";
export * from "./formats/yaml/YamlReader.js";

export { GetResources } from "./getResources.js";

export * from "./interfaces/ITriObserverLocal.js";

import "./values.js";

// Composition owns the concrete manager dependency. The holder module imports
// no manager or resource implementation, so resources and MotherLode can use
// its live references without an import cycle or deferred constructor lookup.
import { blue } from "./blue.js";
import { BlueResMan } from "./resman/BlueResMan.js";
blue.resMan = new BlueResMan();
