# Blue object services and dropped class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime/global` classes under `src/global/blue` and `src/global/dropped`
Audience: Users, maintainers, and automated readers  
Summary: Describes shared Blue interfaces and object services, together with native classes deliberately omitted from the runtime.

<!-- class:BlueList -->
## `BlueList`

A typed object list with Carbon's explicit single-observer mutation methods.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/BlueList.js`
- Visibility: Public
- Kind: Carbon

<!-- class:BlueObjectMetadata -->
## `BlueObjectMetadata`

`BlueObjectMetadata` - the object-metadata store.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/BlueObjectMetadata.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Copier -->
## `Copier`

`Copier` - Blue's object copy mechanism, per blueexposure/Copier.cpp.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/Copier.js`
- Visibility: Public
- Kind: Carbon

<!-- class:DictReader -->
## `DictReader`

`DictReader` - reads plain dictionaries into Blue objects.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/DictReader.js`
- Visibility: Public
- Kind: Carbon

<!-- class:DictWriter -->
## `DictWriter`

`DictWriter` - writes an object as a plain values bag.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/DictWriter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IBlueEventListener -->
## `IBlueEventListener`

Receives named events from other subsystems.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/IBlueEventListener.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IBlueMultiPlacementObserver -->
## `IBlueMultiPlacementObserver`

Receives multiple forward vectors and positions from another subsystem.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/IBlueMultiPlacementObserver.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IBlueObjectMetadata -->
## `IBlueObjectMetadata`

`IBlueObjectMetadata` - per-object string metadata, per blue/include/IBlueObjectMetadata.h.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/IBlueObjectMetadata.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IBluePlacementObserver -->
## `IBluePlacementObserver`

Receives orientation and position from another subsystem.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/IBluePlacementObserver.js`
- Visibility: Public
- Kind: Carbon

<!-- class:ICopier -->
## `ICopier`

`ICopier` - copies a Blue object through its persisted members, per blueexposure/include/ICopier.h.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/ICopier.js`
- Visibility: Public
- Kind: Carbon

<!-- class:ICopierCustomAssignment -->
## `ICopierCustomAssignment`

`ICopierCustomAssignment` - copies data a class holds outside its exposed members, per blueexposure/include/ICopier.h.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/ICopierCustomAssignment.js`
- Visibility: Public
- Kind: Carbon

<!-- class:ICurveSetDriver -->
## `ICurveSetDriver`

Supplies a curve set's driven time.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/ICurveSetDriver.js`
- Visibility: Public
- Kind: Carbon

<!-- class:ICustomPersist -->
## `ICustomPersist`

Supplies storage for a member's custom persisted binary data.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/ICustomPersist.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IList -->
## `IList`

Native IRoot-derived typed object-list contract, represented as a plain JS interface.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/IList.js`
- Visibility: Public
- Kind: Carbon

<!-- class:InvalidAttributeException -->
## `InvalidAttributeException`

`InvalidAttributeException` - a key names no member the reader may write (IRootReader.h:46-53).

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/InvalidAttributeException.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IRootReader -->
## `IRootReader`

`IRootReader` - reads an object tree from a stream, per blue/src/IRootReader.h:15-25.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/IRootReader.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IRootReaderBase -->
## `IRootReaderBase`

`IRootReaderBase` - reads one member of an instance by the member's type.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/IRootReaderBase.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IRootReaderException -->
## `IRootReaderException`

`IRootReaderException` - a reader could not read a value (IRootReader.h:21-38).

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/IRootReaderException.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IRootWriter -->
## `IRootWriter`

`IRootWriter` - writes an object's members through a writer's primitives.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/IRootWriter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:PositionDescription -->
## `PositionDescription`

One forward vector and position in a multi-placement update.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/PositionDescription.js`
- Visibility: Public
- Kind: Carbon

<!-- class:YamlWriter -->
## `YamlWriter`

`YamlWriter` - writes an object tree as YAML (`.red`); not yet implemented.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/YamlWriter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:BlueList_Impl -->
## `BlueList_Impl`

Records the shared typed-list implementation absorbed by BlueList, excluding Python wrapper support.

- Source: `src/global/dropped/BlueList_Impl.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:BlueListBase -->
## `BlueListBase`

Records the list bounds helper absorbed by BlueList, without its native Python diagnostics.

- Source: `src/global/dropped/BlueListBase.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:BlueListT -->
## `BlueListT`

Records the unsupported native class-offset list template; ordinary BlueList does not port it.

- Source: `src/global/dropped/BlueListT.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:BlueResManRegistrar -->
## `BlueResManRegistrar`

Carbon's file-extension registrar; dropped because a module body registers directly.

- Source: `src/global/dropped/BlueResManRegistrar.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:BlueScriptCallbackStatus -->
## `BlueScriptCallbackStatus`

The call outcome Carbon returns from every script callback invocation; dropped because JavaScript propagates the exception itself.

- Source: `src/global/dropped/BlueScriptCallbackStatus.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EnumRegistration -->
## `EnumRegistration`

Records the enum template registration responsibilities absorbed by CjsBlueEnumRegistry.

- Source: `src/global/dropped/EnumRegistration.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EnumTypeRegistration -->
## `EnumTypeRegistration`

Records the static enum registrar absorbed by CjsBlueEnumRegistry.RegisterEnum.

- Source: `src/global/dropped/EnumTypeRegistration.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:ListSorter -->
## `ListSorter`

Records the zero-offset pointer-list comparator absorbed by BlueList.Sort.

- Source: `src/global/dropped/ListSorter.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:ListSorterC -->
## `ListSorterC`

Records the unsupported GetRawRoot value-reference comparator, with no current JS replacement.

- Source: `src/global/dropped/ListSorterC.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:ListSorterT -->
## `ListSorterT`

Records the unsupported GetRawRoot pointer-wrapper comparator used by native BlueListT.

- Source: `src/global/dropped/ListSorterT.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:PyBlueEnumObject -->
## `PyBlueEnumObject`

Records the Python BlueEnum wrapper absorbed by CjsBlueEnumRegistry and plain enum objects.

- Source: `src/global/dropped/PyBlueEnumObject.js`
- Visibility: Internal
- Kind: Carbon dropped
