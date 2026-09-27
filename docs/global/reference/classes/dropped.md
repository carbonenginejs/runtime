# Dropped class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime` global classes under `src/global/dropped`
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for donor classes that are written but deliberately not live, each carrying the reason it was dropped.

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

<!-- class:IBlueObjectMetadata -->
## `IBlueObjectMetadata`

`IBlueObjectMetadata` - per-object string metadata, per blue/include/IBlueObjectMetadata.h.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/IBlueObjectMetadata.js`
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

<!-- class:YamlWriter -->
## `YamlWriter`

`YamlWriter` - writes an object tree as YAML (`.red`); not yet implemented.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/YamlWriter.js`
- Visibility: Public
- Kind: Carbon

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

<!-- class:PyBlueEnumObject -->
## `PyBlueEnumObject`

Records the Python BlueEnum wrapper absorbed by CjsBlueEnumRegistry and plain enum objects.

- Source: `src/global/dropped/PyBlueEnumObject.js`
- Visibility: Internal
- Kind: Carbon dropped
