# Formats class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource` classes under `src/resource/formats`
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for maintained classes under `src/resource/formats`.

### black

<!-- class:CjsBlackFormat -->
## `CjsBlackFormat`

CarbonEngineJS-facing Black format profile.

- Export: `@carbonenginejs/runtime/resource/formats/black`
- Source: `src/resource/formats/black/CjsBlackFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsBlackBinaryReader -->
## `CjsBlackBinaryReader`

Bounds-aware `DataView` cursor that provides the primitive reads and end-of-stream checks the Black transport decodes with.

- Source: `src/resource/formats/black/core/CjsBlackBinaryReader.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsBlackPropertyReaders -->
## `CjsBlackPropertyReaders`

Static set of read and skip routines that decode or skip individual Black property values (primitives, strings, arrays, structure lists, dictionaries, and binary blocks) from their type descriptors.

- Source: `src/resource/formats/black/core/CjsBlackPropertyReaders.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsBlackReader -->
## `CjsBlackReader`

Reads a `.black` stream into a payload/document/runtime graph.

- Source: `src/resource/formats/black/core/CjsBlackReader.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsBlackSchemaRegistry -->
## `CjsBlackSchemaRegistry`

Registry that normalizes caller-supplied schemas into per-class source shapes the Black reader uses to resolve persisted fields.

- Source: `src/resource/formats/black/core/CjsBlackSchemaRegistry.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsBnkFormat -->
## `CjsBnkFormat`

Reader for Audiokinetic Wwise soundbank (.bnk) containers.

- Export: `@carbonenginejs/runtime/resource/formats/bnk`
- Source: `src/resource/formats/bnk/CjsBnkFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:WwiseCursor -->
## `WwiseCursor`

Bounds-aware little-endian cursor over one HIRC payload.

- Source: `src/resource/formats/bnk/core/WwiseCursor.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsCmfFormat -->
## `CjsCmfFormat`

CarbonEngineJS-facing CMF reader.

- Export: `@carbonenginejs/runtime/resource/formats/cmf`
- Source: `src/resource/formats/cmf/CjsCmfFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:BinaryReader -->
## `BinaryReader`

Bounds-checked little-endian offset reader over CMF file bytes, including 64-bit integer reads guarded against unsafe values.

- Source: `src/resource/formats/cmf/core/binary.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:Flattener -->
## `Flattener`

Growable little-endian struct buffer with tagged span support.

- Source: `src/resource/formats/cmf/core/writer.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsDdsFormat -->
## `CjsDdsFormat`

DDS texture format profile that inspects header metadata, probes output support, and reads DDS bytes into raw, GPU-free texture, image, or software-decoded RGBA and float payloads (BC1-BC5, BC7, and BC6H included).

- Export: `@carbonenginejs/runtime/resource/formats/dds`
- Source: `src/resource/formats/dds/CjsDdsFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Bc7BitReader -->
## `Bc7BitReader`

The shared LSB-first cursor, bounded to one 128-bit block.

- Source: `src/resource/formats/dds/core/bc7.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsDxbcFormat -->
## `CjsDxbcFormat`

CarbonEngineJS-facing DXBC (Direct3D shader bytecode) reader.

- Export: `@carbonenginejs/runtime/resource/formats/dxbc`
- Source: `src/resource/formats/dxbc/CjsDxbcFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:DxbcInstructionDecoder -->
## `DxbcInstructionDecoder`

SM4/SM5 instruction-stream decoder over a `DxbcShaderProgram` token array.

- Source: `src/resource/formats/dxbc/core/decoder.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:DxbcContainer -->
## `DxbcContainer`

DirectX shader bytecode container reader.

- Source: `src/resource/formats/dxbc/core/DxbcContainer.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:DxbcReader -->
## `DxbcReader`

Little-endian binary reader for DirectX shader bytecode.

- Source: `src/resource/formats/dxbc/core/DxbcReader.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:DxbcReadError -->
## `DxbcReadError`

Error raised when DirectX shader bytecode cannot be decoded safely.

- Source: `src/resource/formats/dxbc/core/DxbcReadError.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:DxbcShaderProgram -->
## `DxbcShaderProgram`

DXBC shader program chunk reader for `SHEX`/`SHDR` token streams.

- Source: `src/resource/formats/dxbc/core/DxbcShaderProgram.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:DxbcSignatureChunk -->
## `DxbcSignatureChunk`

DXBC input/output signature chunk reader for `ISGN`-family chunks.

- Source: `src/resource/formats/dxbc/core/DxbcSignatureChunk.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsFbxFormat -->
## `CjsFbxFormat`

CarbonEngineJS-facing FBX format surface.

- Export: `@carbonenginejs/runtime/resource/formats/fbx`
- Source: `src/resource/formats/fbx/CjsFbxFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:DeflateBitReader -->
## `DeflateBitReader`

Bit reader over a zlib/deflate stream used to inflate compressed FBX property arrays.

- Source: `src/resource/formats/fbx/core/helpers.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:DeflateHuffmanTable -->
## `DeflateHuffmanTable`

Canonical Huffman decode table built from deflate code lengths for inflating compressed FBX property arrays.

- Source: `src/resource/formats/fbx/core/helpers.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsFlacFormat -->
## `CjsFlacFormat`

Metadata-only FLAC format profile that validates the stream signature, inspects stream metadata, and emits raw container bytes or debug JSON without decoding PCM.

- Export: `@carbonenginejs/runtime/resource/formats/flac`
- Source: `src/resource/formats/flac/CjsFlacFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd32Format -->
## `CjsFsd32Format`

Reserved legacy FSD reader boundary.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/32`
- Source: `src/resource/formats/fsd/32/CjsFsd32Format.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64Format -->
## `CjsFsd64Format`

Identifies and dispatches modern 64-bit cFSD containers.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64`
- Source: `src/resource/formats/fsd/64/CjsFsd64Format.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64Binary -->
## `CjsFsd64Binary`

Provides bounds-checked access to 64-bit FSD container bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64`
- Source: `src/resource/formats/fsd/64/core/CjsFsd64Binary.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64Reader -->
## `CjsFsd64Reader`

Dispatches caller-supplied bytes to an explicitly registered FSD reader.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64`
- Source: `src/resource/formats/fsd/64/core/CjsFsd64Reader.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaDecoder -->
## `CjsFsd64SchemaDecoder`

Validates declarative binary schemas and decodes caller-supplied bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64`
- Source: `src/resource/formats/fsd/64/core/CjsFsd64SchemaDecoder.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaReader -->
## `CjsFsd64SchemaReader`

Base class for file-specific readers defined by JSON-shaped JavaScript layouts.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64`
- Source: `src/resource/formats/fsd/64/core/CjsFsd64SchemaReader.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64ReaderSetCharacterStaticData -->
## `CjsFsd64ReaderSetCharacterStaticData`

File-specific character/staticdata readers.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64ReaderSetCharacterStaticData.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaAgentsInSpace -->
## `CjsFsd64SchemaAgentsInSpace`

Reads caller-supplied `agentsinspace.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaAgentsInSpace.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaAgentTypes -->
## `CjsFsd64SchemaAgentTypes`

Reads caller-supplied `agenttypes.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaAgentTypes.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaAncestries -->
## `CjsFsd64SchemaAncestries`

Reads caller-supplied ancestry static-data bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaAncestries.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaArchetypes -->
## `CjsFsd64SchemaArchetypes`

Reads caller-supplied archetype static-data bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaArchetypes.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaAudioMetadata -->
## `CjsFsd64SchemaAudioMetadata`

Reads res:/staticdata/audiometadata.fsdbinary.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaAudioMetadata.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaBloodlines -->
## `CjsFsd64SchemaBloodlines`

Reads caller-supplied bloodline static-data bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaBloodlines.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaCategories -->
## `CjsFsd64SchemaCategories`

Reads caller-supplied `categories.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaCategories.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaCharacterAvatarBehaviors -->
## `CjsFsd64SchemaCharacterAvatarBehaviors`

Reads caller-supplied character avatar-behavior bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaCharacterAvatarBehaviors.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaCharacterColorLocations -->
## `CjsFsd64SchemaCharacterColorLocations`

Reads caller-supplied character color-location bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaCharacterColorLocations.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaCharacterColorNames -->
## `CjsFsd64SchemaCharacterColorNames`

Reads caller-supplied character color-name bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaCharacterColorNames.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaCharacterModifierLocations -->
## `CjsFsd64SchemaCharacterModifierLocations`

Reads caller-supplied character modifier-location bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaCharacterModifierLocations.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaCharacterPortraitResources -->
## `CjsFsd64SchemaCharacterPortraitResources`

Reads caller-supplied character portrait-resource bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaCharacterPortraitResources.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaCharacterResources -->
## `CjsFsd64SchemaCharacterResources`

Reads res:/staticdata/character_resources.fsdbinary.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaCharacterResources.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaCharacterSculptingLocations -->
## `CjsFsd64SchemaCharacterSculptingLocations`

Reads caller-supplied character sculpting-location bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaCharacterSculptingLocations.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaCompressibleTypes -->
## `CjsFsd64SchemaCompressibleTypes`

Reads caller-supplied `compressibletypes.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaCompressibleTypes.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaContrabandTypes -->
## `CjsFsd64SchemaContrabandTypes`

Reads caller-supplied `contrabandtypes.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaContrabandTypes.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaControlTowerResources -->
## `CjsFsd64SchemaControlTowerResources`

Reads caller-supplied `controltowerresources.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaControlTowerResources.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaCorporationActivities -->
## `CjsFsd64SchemaCorporationActivities`

Reads caller-supplied `corporationactivities.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaCorporationActivities.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaCorporationRoleGroups -->
## `CjsFsd64SchemaCorporationRoleGroups`

Reads caller-supplied `corporationrolegroups.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaCorporationRoleGroups.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaCorporationRoles -->
## `CjsFsd64SchemaCorporationRoles`

Reads caller-supplied `corporationroles.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaCorporationRoles.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaDogmaAttributeCategories -->
## `CjsFsd64SchemaDogmaAttributeCategories`

Reads caller-supplied `dogmaattributecategories.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaDogmaAttributeCategories.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaDogmaAttributes -->
## `CjsFsd64SchemaDogmaAttributes`

Reads caller-supplied `dogmaattributes.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaDogmaAttributes.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaDogmaEffects -->
## `CjsFsd64SchemaDogmaEffects`

Reads caller-supplied `dogmaeffects.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaDogmaEffects.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaDogmaUnits -->
## `CjsFsd64SchemaDogmaUnits`

Reads caller-supplied `dogmaunits.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaDogmaUnits.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaDynamicItemAttributes -->
## `CjsFsd64SchemaDynamicItemAttributes`

Reads caller-supplied `dynamicitemattributes.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaDynamicItemAttributes.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaEpicArcs -->
## `CjsFsd64SchemaEpicArcs`

Reads caller-supplied `epicarcs.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaEpicArcs.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaExpertSystems -->
## `CjsFsd64SchemaExpertSystems`

Reads caller-supplied `expertsystems.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaExpertSystems.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaFactions -->
## `CjsFsd64SchemaFactions`

Reads caller-supplied `factions.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaFactions.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaFrontierGraphicIds -->
## `CjsFsd64SchemaFrontierGraphicIds`

Reads caller-supplied graphic identifier bytes **as EVE Frontier stores them**.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaFrontierGraphicIds.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaFrontierTypes -->
## `CjsFsd64SchemaFrontierTypes`

Reads caller-supplied `types.fsdbinary` bytes **as EVE Frontier stores them**.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaFrontierTypes.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaGraphicIds -->
## `CjsFsd64SchemaGraphicIds`

Reads caller-supplied graphic identifier bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaGraphicIds.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaGraphicMaterialSets -->
## `CjsFsd64SchemaGraphicMaterialSets`

Reads caller-supplied graphic material set bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaGraphicMaterialSets.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaGroups -->
## `CjsFsd64SchemaGroups`

Reads caller-supplied `groups.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaGroups.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaIcons -->
## `CjsFsd64SchemaIcons`

Reads caller-supplied `iconids.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaIcons.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaMarketGroups -->
## `CjsFsd64SchemaMarketGroups`

Reads caller-supplied `marketgroups.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaMarketGroups.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaMetaGroups -->
## `CjsFsd64SchemaMetaGroups`

Reads caller-supplied `metagroups.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaMetaGroups.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaNpcCorporationDivisions -->
## `CjsFsd64SchemaNpcCorporationDivisions`

Reads caller-supplied `npccorporationdivisions.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaNpcCorporationDivisions.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaNpcCorporations -->
## `CjsFsd64SchemaNpcCorporations`

Reads caller-supplied `npccorporations.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaNpcCorporations.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaPaperdolls -->
## `CjsFsd64SchemaPaperdolls`

Reads caller-supplied paper-doll recipe bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaPaperdolls.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaRaces -->
## `CjsFsd64SchemaRaces`

Reads caller-supplied race static-data bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaRaces.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaSchoolMap -->
## `CjsFsd64SchemaSchoolMap`

Reads caller-supplied `schoolmap.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaSchoolMap.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaSchools -->
## `CjsFsd64SchemaSchools`

Reads caller-supplied `schools.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaSchools.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaSkillPlans -->
## `CjsFsd64SchemaSkillPlans`

Reads caller-supplied `skillplans.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaSkillPlans.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaSkinrComponentCategories -->
## `CjsFsd64SchemaSkinrComponentCategories`

Reads caller-supplied `ship_skin_design_component_categories.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaSkinrComponentCategories.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaSkinrComponentPointValues -->
## `CjsFsd64SchemaSkinrComponentPointValues`

Reads caller-supplied `ship_skin_design_component_point_values.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaSkinrComponentPointValues.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaSkinrComponentRarities -->
## `CjsFsd64SchemaSkinrComponentRarities`

Reads caller-supplied `ship_skin_design_component_rarities.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaSkinrComponentRarities.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaSkinrComponents -->
## `CjsFsd64SchemaSkinrComponents`

Reads caller-supplied `ship_skin_design_components.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaSkinrComponents.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaSkinrSlotCategories -->
## `CjsFsd64SchemaSkinrSlotCategories`

Reads caller-supplied `ship_cosmetic_slot_categories.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaSkinrSlotCategories.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaSkinrSlotConfigurations -->
## `CjsFsd64SchemaSkinrSlotConfigurations`

Reads caller-supplied `ship_cosmetic_slot_configurations.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaSkinrSlotConfigurations.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaSkinrSlotNames -->
## `CjsFsd64SchemaSkinrSlotNames`

Reads caller-supplied `ship_cosmetic_slot_names.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaSkinrSlotNames.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaSkinrSlots -->
## `CjsFsd64SchemaSkinrSlots`

Reads caller-supplied `ship_cosmetic_slots.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaSkinrSlots.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaSkinrTierThresholds -->
## `CjsFsd64SchemaSkinrTierThresholds`

Reads caller-supplied `ship_skin_design_tier_thresholds.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaSkinrTierThresholds.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaStationOperations -->
## `CjsFsd64SchemaStationOperations`

Reads caller-supplied `stationoperations.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaStationOperations.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaStationServices -->
## `CjsFsd64SchemaStationServices`

Reads caller-supplied `stationservices.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaStationServices.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaTypeDogma -->
## `CjsFsd64SchemaTypeDogma`

Reads caller-supplied `typedogma.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaTypeDogma.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaTypeLists -->
## `CjsFsd64SchemaTypeLists`

Reads caller-supplied `typelist.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaTypeLists.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaTypeMaterials -->
## `CjsFsd64SchemaTypeMaterials`

Reads caller-supplied `typematerials.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaTypeMaterials.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsd64SchemaTypes -->
## `CjsFsd64SchemaTypes`

Reads caller-supplied `types.fsdbinary` bytes.

- Export: `@carbonenginejs/runtime/resource/formats/fsd/64/readers`
- Source: `src/resource/formats/fsd/64/readers/CjsFsd64SchemaTypes.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFsdFormat -->
## `CjsFsdFormat`

Normal FSD format-pipeline entry point.

- Export: `@carbonenginejs/runtime/resource/formats/fsd`
- Source: `src/resource/formats/fsd/CjsFsdFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsGifFormat -->
## `CjsGifFormat`

GIF format profile that inspects header and frame metadata and reads GIF bytes into raw, debug JSON, or LZW-decoded RGBA frame payloads.

- Export: `@carbonenginejs/runtime/resource/formats/gif`
- Source: `src/resource/formats/gif/CjsGifFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsGltfFormat -->
## `CjsGltfFormat`

glTF/GLB format class that parses documents, decodes accessors, and converts meshes, skins, and animations into shared-mesh, GR2, or CMF output plus debug JSON.

- Export: `@carbonenginejs/runtime/resource/formats/gltf`
- Source: `src/resource/formats/gltf/CjsGltfFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsGr2Format -->
## `CjsGr2Format`

CarbonEngineJS-facing GR2/GSF reader and CMF-first GR2 geometry writer.

- Export: `@carbonenginejs/runtime/resource/formats/gr2`
- Source: `src/resource/formats/gr2/CjsGr2Format.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:FrequencyModel -->
## `FrequencyModel`

One adaptive frequency model with 15-bit precision (TOTAL = 0x8000).

- Source: `src/resource/formats/gr2/core/bitknit2.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:SectionSerializer -->
## `SectionSerializer`

Serializes one reflected Granny object graph into relocatable section data.

- Source: `src/resource/formats/gr2/core/container.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:Decoder -->
## `Decoder`

Arithmetic decoder for the Oodle1 7-bit-per-byte bitstream.

- Source: `src/resource/formats/gr2/core/oodle1.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:Dictionary -->
## `Dictionary`

Per-segment Oodle1 dictionary and adaptive symbol windows.

- Source: `src/resource/formats/gr2/core/oodle1.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:WeighWindow -->
## `WeighWindow`

Adaptive weighted symbol window used by Oodle1 dictionaries.

- Source: `src/resource/formats/gr2/core/oodle1.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsHlslFormat -->
## `CjsHlslFormat`

CarbonEngineJS-facing reader for CCP's Tr2 compiled effect container format (`.sm_hi` / `.sm_lo` / `.sm_depth` bodies).

- Export: `@carbonenginejs/runtime/resource/formats/hlsl`
- Source: `src/resource/formats/hlsl/CjsHlslFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:HlslEffectReadError -->
## `HlslEffectReadError`

Error raised when a Carbon/Trinity effect payload cannot be decoded safely.

- Source: `src/resource/formats/hlsl/core/HlslEffectReadError.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslEffectStateManager -->
## `HlslEffectStateManager`

In-memory JavaScript substitute for Carbon's effect state manager registry.

- Source: `src/resource/formats/hlsl/core/HlslEffectStateManager.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslReader -->
## `HlslReader`

Little-endian binary reader for Carbon/Trinity compiled effect data.

- Source: `src/resource/formats/hlsl/core/HlslReader.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslRenderStateSetup -->
## `HlslRenderStateSetup`

JavaScript mirror of a registered Carbon render-state setup.

- Source: `src/resource/formats/hlsl/core/HlslRenderStateSetup.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslResourceSetDescription -->
## `HlslResourceSetDescription`

JavaScript mirror of Carbon's resource-set descriptor builder.

- Source: `src/resource/formats/hlsl/core/HlslResourceSetDescription.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslShaderBytecode -->
## `HlslShaderBytecode`

JavaScript stand-in for Carbon's shader-bytecode handle payload.

- Source: `src/resource/formats/hlsl/core/HlslShaderBytecode.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslEffectRes -->
## `HlslEffectRes`

Carbon/Trinity effect resource reader for compiled shader metadata.

- Source: `src/resource/formats/hlsl/core/tr2/resources/HlslEffectRes.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslShaderPermutation -->
## `HlslShaderPermutation`

Trinity shader permutation axis and option metadata.

- Source: `src/resource/formats/hlsl/core/tr2/resources/HlslShaderPermutation.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslEffectBindingManifest -->
## `HlslEffectBindingManifest`

Carbon-backed binding manifest for register-named shader outputs.

- Source: `src/resource/formats/hlsl/core/tr2/shader/HlslEffectBindingManifest.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslEffectConstant -->
## `HlslEffectConstant`

Constant-buffer parameter metadata read from a Trinity effect body.

- Source: `src/resource/formats/hlsl/core/tr2/shader/HlslEffectConstant.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslEffectDescription -->
## `HlslEffectDescription`

Trinity effect-description body decoded from one compiled permutation record.

- Source: `src/resource/formats/hlsl/core/tr2/shader/HlslEffectDescription.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslEffectLibrary -->
## `HlslEffectLibrary`

Ray-tracing shader library metadata from v14+ Trinity effects.

- Source: `src/resource/formats/hlsl/core/tr2/shader/HlslEffectLibrary.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslEffectParameterAnnotation -->
## `HlslEffectParameterAnnotation`

Parameter annotation value attached to a Trinity effect parameter.

- Source: `src/resource/formats/hlsl/core/tr2/shader/HlslEffectParameterAnnotation.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslEffectResource -->
## `HlslEffectResource`

Shader resource or UAV metadata read from a Trinity effect body.

- Source: `src/resource/formats/hlsl/core/tr2/shader/HlslEffectResource.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslEffectStageInput -->
## `HlslEffectStageInput`

Decoded per-stage input metadata for constants, resources, samplers, and signatures.

- Source: `src/resource/formats/hlsl/core/tr2/shader/HlslEffectStageInput.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslEffectTechnique -->
## `HlslEffectTechnique`

Trinity effect technique containing passes and optional shader libraries.

- Source: `src/resource/formats/hlsl/core/tr2/shader/HlslEffectTechnique.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslPass -->
## `HlslPass`

Trinity effect pass containing shader stages, resource metadata, and render state.

- Source: `src/resource/formats/hlsl/core/tr2/shader/HlslPass.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslSamplerDescription -->
## `HlslSamplerDescription`

Trinity sampler descriptor read from compiled effect metadata.

- Source: `src/resource/formats/hlsl/core/tr2/shader/HlslSamplerDescription.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslSamplerSetup -->
## `HlslSamplerSetup`

Trinity sampler binding that pairs a metadata name with a sampler descriptor.

- Source: `src/resource/formats/hlsl/core/tr2/shader/HlslSamplerSetup.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslShader -->
## `HlslShader`

Trinity shader wrapper around a decoded `HlslEffectDescription`.

- Source: `src/resource/formats/hlsl/core/tr2/shader/HlslShader.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:HlslShaderOption -->
## `HlslShaderOption`

Name/value shader permutation option used during effect lookup.

- Source: `src/resource/formats/hlsl/core/tr2/shader/HlslShaderOption.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsIESFormat -->
## `CjsIESFormat`

Reads IES photometric bytes into authored CPU data.

- Export: `@carbonenginejs/runtime/resource/formats/ies`
- Source: `src/resource/formats/ies/CjsIESFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsJpegFormat -->
## `CjsJpegFormat`

JPEG format profile that inspects marker and header metadata and reads baseline JPEG bytes into raw, debug JSON, or RGBA payloads through the in-project baseline decoder.

- Export: `@carbonenginejs/runtime/resource/formats/jpeg`
- Source: `src/resource/formats/jpeg/CjsJpegFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:BaselineJpegDecoder -->
## `BaselineJpegDecoder`

Pure-JS baseline sequential JPEG decoder that parses markers, quantization and Huffman tables, and entropy-coded scans into RGBA pixels.

- Source: `src/resource/formats/jpeg/core/jpeg.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:EntropyReader -->
## `EntropyReader`

Bit-level reader over JPEG entropy-coded data that handles byte stuffing and restart markers for the baseline decoder.

- Source: `src/resource/formats/jpeg/core/jpeg.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:BitWriter -->
## `BitWriter`

Collects bytes and packs Huffman codes, stuffing 0x00 after every 0xFF.

- Source: `src/resource/formats/jpeg/core/writer.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsJsonlFormat -->
## `CjsJsonlFormat`

JSON Lines format profile: one standalone JSON value per non-blank line.

- Export: `@carbonenginejs/runtime/resource/formats/jsonl`
- Source: `src/resource/formats/jsonl/CjsJsonlFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsMp3Format -->
## `CjsMp3Format`

MP3 audio format profile that inspects frame and tag metadata and emits raw container bytes or debug JSON, with PCM decoding not implemented.

- Export: `@carbonenginejs/runtime/resource/formats/mp3`
- Source: `src/resource/formats/mp3/CjsMp3Format.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsMp4Format -->
## `CjsMp4Format`

MP4 container format profile that inspects box and track structure and emits raw bytes, debug JSON, or a container-only video payload with codec and duration summaries but no frame decoding.

- Export: `@carbonenginejs/runtime/resource/formats/mp4`
- Source: `src/resource/formats/mp4/CjsMp4Format.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsObjFormat -->
## `CjsObjFormat`

CarbonEngineJS-facing Wavefront OBJ format surface.

- Export: `@carbonenginejs/runtime/resource/formats/obj`
- Source: `src/resource/formats/obj/CjsObjFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsOggFormat -->
## `CjsOggFormat`

Ogg container format profile that inspects page and stream metadata and decodes Ogg Vorbis audio to PCM with the in-project pure-JS Vorbis decoder, alongside raw and debug JSON output.

- Export: `@carbonenginejs/runtime/resource/formats/ogg`
- Source: `src/resource/formats/ogg/CjsOggFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Codebook -->
## `Codebook`

Vorbis codebook that builds Huffman decode trees and VQ lookup vectors for scalar and vector packet decoding.

- Source: `src/resource/formats/ogg/core/vorbis.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:PacketReader -->
## `PacketReader`

LSB-first bit reader over one Vorbis packet; reading past the end sets `eop` instead of throwing (end-of-packet is a defined decode condition).

- Source: `src/resource/formats/ogg/core/vorbis.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsPickleFormat -->
## `CjsPickleFormat`

Data-only Python pickle format facade that decodes the inert subset of protocols 0 through 4 into JSON-compatible values or identity-preserving payload graphs while rejecting callable and object-construction opcodes.

- Export: `@carbonenginejs/runtime/resource/formats/pickle`
- Source: `src/resource/formats/pickle/CjsPickleFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsPickleProtocol0Reader -->
## `CjsPickleProtocol0Reader`

Construction-bound decoder for the inert data subset of Python pickle protocol 0.

- Source: `src/resource/formats/pickle/core/CjsPickleProtocol0Reader.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsPickleProtocol4Reader -->
## `CjsPickleProtocol4Reader`

Construction-bound decoder for the inert data subset of Python pickle's binary protocols, 1 through 4.

- Source: `src/resource/formats/pickle/core/CjsPickleProtocol4Reader.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsPngFormat -->
## `CjsPngFormat`

PNG format profile that synchronously inspects chunk and header metadata and emits raw bytes or debug JSON, with RGBA decoding available on the asynchronous read path.

- Export: `@carbonenginejs/runtime/resource/formats/png`
- Source: `src/resource/formats/png/CjsPngFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsRedFormat -->
## `CjsRedFormat`

CarbonEngineJS-facing Red format profile.

- Export: `@carbonenginejs/runtime/resource/formats/red`
- Source: `src/resource/formats/red/CjsRedFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsRedReader -->
## `CjsRedReader`

Reads a Red (YAML) object graph.

- Source: `src/resource/formats/red/core/CjsRedReader.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsSchemaBoundFormat -->
## `CjsSchemaBoundFormat`

Reads a container whose layout lives in a separate schema.

- Export: `@carbonenginejs/runtime/resource/formats/schemabound`
- Source: `src/resource/formats/schemabound/CjsSchemaBoundFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsSqliteFormat -->
## `CjsSqliteFormat`

Reads a SQLite 3 container as data.

- Export: `@carbonenginejs/runtime/resource/formats/sqlite`
- Source: `src/resource/formats/sqlite/CjsSqliteFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsStaticFormat -->
## `CjsStaticFormat`

Identifies which container a client `.static` file actually holds.

- Export: `@carbonenginejs/runtime/resource/formats/static`
- Source: `src/resource/formats/static/CjsStaticFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsStlFormat -->
## `CjsStlFormat`

CarbonEngineJS-facing STL format surface.

- Export: `@carbonenginejs/runtime/resource/formats/stl`
- Source: `src/resource/formats/stl/CjsStlFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:DisjointSet -->
## `DisjointSet`

Union-find structure with path compression used to group edge-connected triangles during STL printability inspection.

- Source: `src/resource/formats/stl/core/stl.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsTgaFormat -->
## `CjsTgaFormat`

TGA format profile that inspects header metadata and reads TGA bytes into raw, debug JSON, or decoded RGBA image payloads.

- Export: `@carbonenginejs/runtime/resource/formats/tga`
- Source: `src/resource/formats/tga/CjsTgaFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsVtaFormat -->
## `CjsVtaFormat`

VTA format profile - Carbon's Volume Texture Animation container.

- Export: `@carbonenginejs/runtime/resource/formats/vta`
- Source: `src/resource/formats/vta/CjsVtaFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWavFormat -->
## `CjsWavFormat`

WAV audio format profile that inspects RIFF chunk metadata and reads supported WAV bytes into PCM or audio payloads, alongside raw and debug JSON output.

- Export: `@carbonenginejs/runtime/resource/formats/wav`
- Source: `src/resource/formats/wav/CjsWavFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebglFormat -->
## `CjsWebglFormat`

CarbonEngineJS-facing format surface for `.carbonwebgl` WebGL shader packages, and a DXBC -> GLSL ES 3.00 emitter for the WebGL2 vertex/pixel/map-style-compute stages ccpwgl targets.

- Export: `@carbonenginejs/runtime/resource/formats/webgl`
- Source: `src/resource/formats/webgl/CjsWebglFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:DxbcGlslEmitter -->
## `DxbcGlslEmitter`

DXBC -> GLSL ES 3.00 emitter for vertex and pixel stages.

- Source: `src/resource/formats/webgl/core/glsl/DxbcGlslEmitter.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:DxbcGlslHelperRegistry -->
## `DxbcGlslHelperRegistry`

Registry of GLSL helper functions the emitter can require per shader.

- Source: `src/resource/formats/webgl/core/glsl/DxbcGlslHelperRegistry.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:DxbcGlslOperandFormatter -->
## `DxbcGlslOperandFormatter`

Formats decoded DXBC operands as GLSL ES 3.00 expressions and assignments.

- Source: `src/resource/formats/webgl/core/glsl/DxbcGlslOperandFormatter.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:WebglReadError -->
## `WebglReadError`

Error raised when a Carbon WebGL package or a DXBC-to-GLSL emission cannot be completed safely.

- Source: `src/resource/formats/webgl/core/WebglReadError.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuFormat -->
## `CjsWebgpuFormat`

CarbonEngineJS-facing format surface for `.carbonwebgpu` WebGPU packages, plus an offline effect-analysis helper built on the runtime resource HLSL and DXBC format subpaths.

- Export: `@carbonenginejs/runtime/resource/formats/webgpu`
- Source: `src/resource/formats/webgpu/CjsWebgpuFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CarbonWebgpuContainer -->
## `CarbonWebgpuContainer`

Reader over one WebGPU effect container.

- Source: `src/resource/formats/webgpu/core/carbonWebgpu/CarbonWebgpuContainer.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:WebgpuReadError -->
## `WebgpuReadError`

Error raised when a Carbon WebGPU package or WebGPU analysis pass cannot be completed safely.

- Source: `src/resource/formats/webgpu/core/WebgpuReadError.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebmFormat -->
## `CjsWebmFormat`

WebM container format profile that inspects EBML segment and track structure and emits raw bytes, debug JSON, or a container-only video payload with codec and duration summaries but no frame decoding.

- Export: `@carbonenginejs/runtime/resource/formats/webm`
- Source: `src/resource/formats/webm/CjsWebmFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebpFormat -->
## `CjsWebpFormat`

Metadata-only WebP format profile that inspects RIFF chunk headers and emits raw container bytes or debug JSON without decoding pixels.

- Export: `@carbonenginejs/runtime/resource/formats/webp`
- Source: `src/resource/formats/webp/CjsWebpFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWemFormat -->
## `CjsWemFormat`

Reader for Audiokinetic Wwise media (.wem) containers.

- Export: `@carbonenginejs/runtime/resource/formats/wem`
- Source: `src/resource/formats/wem/CjsWemFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:BitReader -->
## `BitReader`

LSB-first bit reader over a byte range.

- Source: `src/resource/formats/wem/core/bitStream.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:OggPageWriter -->
## `OggPageWriter`

LSB-first bit writer that assembles Ogg pages, one packet per page.

- Source: `src/resource/formats/wem/core/bitStream.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:WemBitstreamError -->
## `WemBitstreamError`

Error raised when a Wwise Vorbis bitstream runs out mid-read.

- Source: `src/resource/formats/wem/core/bitStream.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsYamlFormat -->
## `CjsYamlFormat`

YAML format profile that parses YAML text or strict UTF-8 bytes into payload, JSON-graph, raw, or document output with configurable tag policies, alias limits, and identity/reference markers.

- Export: `@carbonenginejs/runtime/resource/formats/yaml`
- Source: `src/resource/formats/yaml/CjsYamlFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsYamlReader -->
## `CjsYamlReader`

Construction-bound reader that parses one YAML source with the `yaml` library and produces the format's payload, raw, or document graphs while enforcing tag policy and alias limits.

- Source: `src/resource/formats/yaml/core/CjsYamlReader.js`
- Visibility: Internal
- Kind: CarbonEngineJS
