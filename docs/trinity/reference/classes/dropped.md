# Dropped Trinity identities

Status: Evolving
Scope: `@carbonenginejs/runtime/trinity`
Audience: Runtime authors and maintainers
Summary: Catalogs unsupported internal Carbon identities retained only as explicit quarantine evidence.

These Carbon identities remain in the dropped quarantine for provenance and
generator exclusion. They are unsupported internal source artifacts and are
not imported, schema-registered, or exported by the runtime.

<!-- class:AreaBoundsInfo -->
## `AreaBoundsInfo`

Retains the quarantined native Granny area-bounds record that readers replace with detached bounds and vertex-count data.

- Source: `src/trinity/dropped/AreaBoundsInfo.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:BoundingBox -->
## `BoundingBox`

Retains the quarantined native Granny minimum/maximum bounds record that readers replace with math or plain data.

- Source: `src/trinity/dropped/BoundingBox.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:CASConstants -->
## `CASConstants`

Retains the quarantined native CAS sharpening constants that renderer code replaces with packed numeric lanes.

- Source: `src/trinity/dropped/CASConstants.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveBasicPerObjectData -->
## `EveBasicPerObjectData`

Represents the dropped object-data record formerly used to carry EveTransform world matrices.

- Source: `src/trinity/dropped/EveBasicPerObjectData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveInstancedMeshManager -->
## `EveInstancedMeshManager`

Retains the quarantined native GPU-backed instancing manager whose realization belongs to an engine backend.

- Source: `src/trinity/dropped/EveInstancedMeshManager.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveMissileWarheadPerObjectData -->
## `EveMissileWarheadPerObjectData`

Represents the dropped object-data record formerly used to carry missile world and size values.

- Source: `src/trinity/dropped/EveMissileWarheadPerObjectData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveSceneStaticParticlesPerObjectData -->
## `EveSceneStaticParticlesPerObjectData`

Represents the retired static-particle payload for current and previous world matrices now written through RawData.

- Source: `src/trinity/dropped/EveSceneStaticParticlesPerObjectData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveSpherePinIndexTree -->
## `EveSpherePinIndexTree`

Retains the quarantined pointer-backed spherical geometry index whose realization belongs to resource or engine spatial indexing.

- Source: `src/trinity/dropped/EveSpherePinIndexTree.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:ITriColor -->
## `ITriColor`

Retains the retired Blue/Python color interface superseded by runtime vec4 values and schema color fields.

- Source: `src/trinity/dropped/ITriColor.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:ITriDevice -->
## `ITriDevice`

Retains the native device interface identity while maintained graph state and injected engines divide its former responsibilities.

- Source: `src/trinity/dropped/ITriDevice.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:ITriEffectTextureParameter -->
## `ITriEffectTextureParameter`

Retains the pure texture-parameter interface identity superseded by maintained concrete texture-parameter graph classes.

- Source: `src/trinity/dropped/ITriEffectTextureParameter.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:ITriMatrix -->
## `ITriMatrix`

Retains the retired Blue/Python matrix interface superseded by runtime mat4 values and schema matrix fields.

- Source: `src/trinity/dropped/ITriMatrix.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:ITriQuaternion -->
## `ITriQuaternion`

Retains the retired Blue/Python quaternion interface superseded by runtime quat values and schema quaternion fields.

- Source: `src/trinity/dropped/ITriQuaternion.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:ITriVector -->
## `ITriVector`

Retains the retired Blue/Python vector interface superseded by runtime vec3 values and schema vector fields.

- Source: `src/trinity/dropped/ITriVector.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:MeshBoundsInfo -->
## `MeshBoundsInfo`

Retains the quarantined pointer-and-count Granny mesh-bounds record that readers replace with detached array-backed data.

- Source: `src/trinity/dropped/MeshBoundsInfo.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:DecalPSPerObjectData -->
## `DecalPSPerObjectData`

Represents the retired pixel-stage decal payload for display, ship, clip, radius, and spherical-harmonic lighting values now written through RawData.

- Source: `src/trinity/dropped/perObjectData/DecalPSPerObjectData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:DecalVSPerObjectData -->
## `DecalVSPerObjectData`

Vertex-stage per-object matrices for a space-object decal - the hull world transform, the decal projection transform and the parent bone transform, each paired with its inverse - as values a renderer packs into a constant buffer.

- Source: `src/trinity/dropped/perObjectData/DecalVSPerObjectData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveBoosterSetPerObjectData -->
## `EveBoosterSetPerObjectData`

Carbon `EveBoosterSetPerObjectData` - a pure composite of the two stage structs, exactly as Carbon declares it (`VertexShaderData m_vsData; PixelShaderData m_psData;`, EveBoosterSet2.h:73-74).

- Source: `src/trinity/dropped/perObjectData/EveBoosterSetPerObjectData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveBoosterSetPSData -->
## `EveBoosterSetPSData`

Carbon `EveBoosterSetPerObjectData::PixelShaderData` - the trail intensities.

- Source: `src/trinity/dropped/perObjectData/EveBoosterSetPSData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveBoosterSetVSData -->
## `EveBoosterSetVSData`

Carbon `EveBoosterSetPerObjectData::VertexShaderData` - the booster set's ship matrix, its intensity/speed/size scalars, and the trail control ring.

- Source: `src/trinity/dropped/perObjectData/EveBoosterSetVSData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveChildBulletStormPerObjectData -->
## `EveChildBulletStormPerObjectData`

Represents the retired bullet-storm payload for its world transform, effect metadata, and ten target positions now written through RawData.

- Source: `src/trinity/dropped/perObjectData/EveChildBulletStormPerObjectData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveChildSpherePinPerObjectData -->
## `EveChildSpherePinPerObjectData`

Per-object values for a sphere pin attached as a space-object child - world matrix plus the pin's position, rotation, colour, threshold, precalculated radius and UV - as values a renderer packs into a constant buffer.

- Source: `src/trinity/dropped/perObjectData/EveChildSpherePinPerObjectData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveDecalPerObjectData -->
## `EveDecalPerObjectData`

Represents the retired decal wrapper that paired vertex- and pixel-stage payloads before producers returned RawData stage records.

- Source: `src/trinity/dropped/perObjectData/EveDecalPerObjectData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EvePerObjectPSData -->
## `EvePerObjectPSData`

Minimal pixel-stage per-object record carrying only the world matrix, matching Carbon's shared Eve constant-buffer format.

- Source: `src/trinity/dropped/perObjectData/EvePerObjectPSData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EvePerObjectVSData -->
## `EvePerObjectVSData`

Minimal vertex-stage per-object record carrying only the world matrix, matching Carbon's shared Eve constant-buffer format.

- Source: `src/trinity/dropped/perObjectData/EvePerObjectVSData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveSpaceObjectPSData -->
## `EveSpaceObjectPSData`

Pixel-stage per-object values for a space object - transforms, clip sphere, impact offset, spherical-harmonic lighting, custom-mask material IDs and targets, and screen size - as values a renderer packs into a constant buffer, never as GPU resources.

- Source: `src/trinity/dropped/perObjectData/EveSpaceObjectPSData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveSpaceObjectVSData -->
## `EveSpaceObjectVSData`

Vertex-stage per-object values for a space object - world/inverse-world transforms, clip and ellipsoid data, custom-mask matrices, bone and morph-target offsets - held as plain values a renderer packs into a constant buffer, never as GPU resources.

- Source: `src/trinity/dropped/perObjectData/EveSpaceObjectVSData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveSpacePerObjectData -->
## `EveSpacePerObjectData`

Combined per-object record for a space object covering both stages - transforms, clip sphere, ellipsoid, custom masks, bone offsets and spherical-harmonic lighting coefficients - as values a renderer packs into a constant buffer, never as GPU resources.

- Source: `src/trinity/dropped/perObjectData/EveSpacePerObjectData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveSpherePinPerObjectData -->
## `EveSpherePinPerObjectData`

Per-object values for a standalone UI sphere pin - world matrix plus the pin's position, orientation, colour, threshold, precalculated radius and UV - as values a renderer packs into a constant buffer.

- Source: `src/trinity/dropped/perObjectData/EveSpherePinPerObjectData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveTurretSetPerObjectData -->
## `EveTurretSetPerObjectData`

Represents the retired turret wrapper that paired vertex- and pixel-stage payloads before its producer returned RawData stage records.

- Source: `src/trinity/dropped/perObjectData/EveTurretSetPerObjectData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveTurretSetPSData -->
## `EveTurretSetPSData`

Represents the retired turret pixel-stage payload for ship, clip, radius, and spherical-harmonic lighting values now written through RawData.

- Source: `src/trinity/dropped/perObjectData/EveTurretSetPSData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:EveTurretSetVSData -->
## `EveTurretSetVSData`

Represents the retired turret vertex-stage payload for cutoff data, ship transforms, bone offsets, and per-turret transforms now written through RawData.

- Source: `src/trinity/dropped/perObjectData/EveTurretSetVSData.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:MergeMorphsConstantBuffer -->
## `MergeMorphsConstantBuffer`

Represents the retired morph-merge compute constants for buffer offsets, strides, active targets, and vertex counts now retained as a catalogued layout.

- Source: `src/trinity/dropped/perObjectData/MergeMorphsConstantBuffer.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Point -->
## `Point`

Retains the quarantined native integer point helper that adapter boundaries replace with plain x/y records.

- Source: `src/trinity/dropped/Point.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Tr2CurveBase -->
## `Tr2CurveBase`

Retains the rejected generic curve-template identity whose unresolved key types are represented by maintained concrete curves.

- Source: `src/trinity/dropped/Tr2CurveBase.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Tr2CurveRasterizeDestination -->
## `Tr2CurveRasterizeDestination`

Retains the native rasterization destination identity consumed as a plain method record by `Tr2CurveScalar`.

- Source: `src/trinity/dropped/Tr2CurveRasterizeDestination.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Tr2CurveScalarDefinition -->
## `Tr2CurveScalarDefinition`

Retains the native scalar-curve definition identity consumed as a plain method record by `Tr2CurveScalar`.

- Source: `src/trinity/dropped/Tr2CurveScalarDefinition.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Tr2DebugColor -->
## `Tr2DebugColor`

Retains the native debug-renderer color identity that engine adapters replace with plain value records.

- Source: `src/trinity/dropped/Tr2DebugColor.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Tr2DebugObjectReference -->
## `Tr2DebugObjectReference`

Retains the native debug-renderer reference identity that engine adapters replace with plain reference records.

- Source: `src/trinity/dropped/Tr2DebugObjectReference.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Tr2Key -->
## `Tr2Key`

Retains the rejected generic key-template identity whose unresolved value type is represented by maintained concrete key classes.

- Source: `src/trinity/dropped/Tr2Key.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Tr2OcclusionBuffer -->
## `Tr2OcclusionBuffer`

Retains the native GPU occlusion-buffer service identity whose allocation and effect processing belong to a renderer backend.

- Source: `src/trinity/dropped/Tr2OcclusionBuffer.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Tr2ParticleStreamIterator -->
## `Tr2ParticleStreamIterator`

Retains the native typed-pointer iterator identity superseded by typed-array indexing in CPU particle simulation.

- Source: `src/trinity/dropped/Tr2ParticleStreamIterator.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Tr2RaytracingMeshArea -->
## `Tr2RaytracingMeshArea`

Retains the native per-area acceleration-structure helper identity whose state belongs to a ray-tracing engine backend.

- Source: `src/trinity/dropped/Tr2RaytracingMeshArea.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Tr2Rect -->
## `Tr2Rect`

Retains the quarantined native integer rectangle helper that adapter boundaries replace with plain edge records.

- Source: `src/trinity/dropped/Tr2Rect.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:TriColor -->
## `TriColor`

Retains the retired Blue/Python color wrapper identity superseded by runtime vec4 math.

- Source: `src/trinity/dropped/TriColor.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:TriPerlinNoise -->
## `TriPerlinNoise`

Retains the incomplete scanner model for Carbon's seeded-noise utility, whose runtime behavior lives in maintained math functions.

- Source: `src/trinity/dropped/TriPerlinNoise.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:TriQuaternion -->
## `TriQuaternion`

Retains the retired Blue/Python quaternion wrapper identity superseded by runtime quat math.

- Source: `src/trinity/dropped/TriQuaternion.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:TriVector -->
## `TriVector`

Retains the retired Blue/Python vector wrapper identity superseded by runtime vec3 math.

- Source: `src/trinity/dropped/TriVector.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Vector3d -->
## `Vector3d`

Retains the native double-precision three-component value identity represented at runtime by numeric arrays or `Float64Array` values.

- Source: `src/trinity/dropped/Vector3d.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:Vector4d -->
## `Vector4d`

Retains the native double-precision four-component value identity represented at runtime by numeric arrays or `Float64Array` values.

- Source: `src/trinity/dropped/Vector4d.js`
- Visibility: Internal
- Kind: Carbon dropped
