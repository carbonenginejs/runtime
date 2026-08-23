# Runtime-utils class reference

Status: Evolving
Scope: `@carbonenginejs/runtime-utils` class exports
Audience: Runtime authors and integrators
Summary: Catalogs maintained named classes in the consolidated runtime foundation.

<!-- class:CjsBackendCandidate -->
## `CjsBackendCandidate`

Dependency-free participant in runtime backend selection.

- Export: `@carbonenginejs/runtime-utils/contracts`
- Source: `src/contracts/CjsBackendCandidate.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsConstantPayload -->
## `CjsConstantPayload`

Terminal constant-buffer bytes with an explicit upload dirty lifecycle.

- Export: `@carbonenginejs/runtime-utils/contracts`
- Source: `src/contracts/CjsConstantPayload.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsError -->
## `CjsError`

Represents one structured operational failure with a stable CarbonEngineJS code.

- Export: `@carbonenginejs/runtime-utils/errors`
- Source: `src/errors/CjsError.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCancellationError -->
## `CjsCancellationError`

Represents one cancelled operation using Web-compatible abort identity.

- Export: `@carbonenginejs/runtime-utils/errors`
- Source: `src/errors/CjsError.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCarbonDocument -->
## `CjsCarbonDocument`

Represents one neutral Carbon document graph for hydration and dehydration.

- Export: `@carbonenginejs/runtime-utils/document`
- Source: `src/document/CjsCarbonDocument.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsClassRegistry -->
## `CjsClassRegistry`

Maps serialized Carbon class names to explicit runtime constructors.

- Export: `@carbonenginejs/runtime-utils/document`
- Source: `src/document/CjsClassRegistry.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsDocumentDehydrator -->
## `CjsDocumentDehydrator`

Converts runtime object graphs into neutral Carbon documents.

- Export: `@carbonenginejs/runtime-utils/document`
- Source: `src/document/CjsDocumentDehydrator.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsDocumentHydrator -->
## `CjsDocumentHydrator`

Constructs runtime object graphs from neutral Carbon documents.

- Export: `@carbonenginejs/runtime-utils/document`
- Source: `src/document/CjsDocumentHydrator.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsStructRegistry -->
## `CjsStructRegistry`

Maps serialized Carbon struct names to explicit constructors and layouts.

- Export: `@carbonenginejs/runtime-utils/document`
- Source: `src/document/CjsStructRegistry.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsLifecycleState -->
## `CjsLifecycleState`

Inspectable lifecycle state shared by participating runtime objects.

- Export: `@carbonenginejs/runtime-utils/lifecycle`
- Source: `src/lifecycle/CjsLifecycleState.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsEventEmitter -->
## `CjsEventEmitter`

Minimal event emitter with lowercase exact-name dispatch.

- Export: `@carbonenginejs/runtime-utils/model`
- Source: `src/model/CjsEventEmitter.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsModel -->
## `CjsModel`

Shared base for schema-backed CarbonEngineJS runtime classes.

- Export: `@carbonenginejs/runtime-utils/model`
- Source: `src/model/CjsModel.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsPendingReference -->
## `CjsPendingReference`

Represents one unresolved model reference during a single import operation.

- Source: `src/model/CjsModel.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsModelState -->
## `CjsModelState`

Per-model runtime state.

- Export: `@carbonenginejs/runtime-utils/model`
- Source: `src/model/CjsModelState.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsSchema -->
## `CjsSchema`

Reusable schema/decorator metadata surface.

- Export: `@carbonenginejs/runtime-utils/schema`
- Source: `src/schema/CjsSchema.js`
- Visibility: Public
- Kind: CarbonEngineJS
