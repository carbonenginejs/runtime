import { IListNotify } from "../../../global/blue/IListNotify.js";
import { ITr2ControllerOwner } from "../../controllers/ITr2ControllerOwner.js";
import { ITr2SoundEmitterOwner } from "../ITr2SoundEmitterOwner.js";
import { ITr2CurveSetOwner } from "../../curves/ITr2CurveSetOwner.js";
import { ITr2ImpostorSource } from "../../core/mesh/ITr2ImpostorSource/ITr2ImpostorSource.js";
// Source: trinity/trinity/Eve/SpaceObject/EveSpaceObject2.h
// Source: trinity/trinity/Eve/SpaceObject/EveSpaceObject2.cpp
// Source: trinity/trinity/Eve/SpaceObject/EveSpaceObject2_Blue.cpp
import "#blue/registerTrinityEnums";
import { CjsSchema, meta } from "#schema";
import { blue } from "#blue";
import { IInitialize } from "#blue/IInitialize";
import { INotify } from "#blue/INotify";
import { IEveInheritPropertiesOwner } from "../IEveInheritPropertiesOwner.js";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";
import { ITr2BoundingBox } from "#interfaces";
import { IWorldPosition } from "../../core/IWorldPosition.js";
import { ITr2SecondaryLightSource } from "../../core/lighting/ITr2SecondaryLightSource.js";
import { ITr2ShLightingReceiver } from "../../core/lighting/ITr2ShLightingReceiver.js";
import { EveEntity } from "../EveEntity.js";
import { EveChildUpdateParams } from "../EveChildUpdateParams.js";
import { EveChildInheritProperties } from "../child/EveChildInheritProperties.js";
import { color } from "#math/color";
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { addChild, removeChild, clearChildren } from "../../../global/blue/children.js";
import { ccpHashFnv1 } from "#utils";
import { BLUELISTEVENT } from "#consts/blue";
import { EveComponentType, ShouldReflect } from "../EveComponentTypes.js";
import { ImpactConfiguration } from "../../generated/include/enums.js";
import { EveLODHelper, Tr2Lod } from "../EveLODHelper.js";
import { EveDamageOverlay } from "../overlays/EveDamageOverlay.js";
import { EmitDamageOverlayBatches, EmitOverlayBatches } from "../overlays/overlayBatches.js";
import { ReflectionMode, TriBatchType } from "#consts/graphics";
import { MatrixCopyFrom3x4 } from "../lights/lightConversion.js";
import { Tr2GrannyAnimation, getBoneList } from "../../core/animation/Tr2GrannyAnimation.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { Tr2RingBuffer, Tr2RingBufferOffsets } from "../../core/device/Tr2RingBuffer/index.js";
import { Tr2PerObjectData } from "../../core/rawData/perObjectData/Tr2PerObjectData.js";
import { Tr2RenderBatch, TriRenderBatchAreaBlock } from "../../core/batch/TriRenderBatch/index.js";
import { RawData } from "../../core/rawData/RawData.js";
import { TR2_PICK_TYPE_DEFAULT, Tr2PickType } from "../../core/view/Tr2PickType.js";
import { IEveSpaceObject2ParentData } from "./IEveSpaceObject2ParentData.js";
import { EveCustomMask } from "../EveCustomMask.js";
import { EveCollectAreas } from "../child/EveSpaceObjectChild.js";
import { EveGetLocatorPose, EveLocatorSets } from "../locator/EveLocatorSets.js";
import { Locator } from "../locator/Locator.js";
import { Copier } from "#blue/Copier";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import { Tr2RenderReason } from "../../generated/trinityCore/enums.js";

// Static scratch for the sorted-transparent area pass (allocation rules: hot
// per-frame path, copy-into, never allocate per call).
const TRANSPARENT_AABB_MIN = vec3.create();
const TRANSPARENT_AABB_MAX = vec3.create();
const TRANSPARENT_CENTER = vec3.create();

// Carbon EveMeshOverlayEffect::OverlayType (EveMeshOverlayEffect.h:35-41).
const OVERLAY_TYPE_OPAQUEONLY = 0;
const OVERLAY_TYPE_ALL = 1;

/**
 * The hull of an EVE space object - its mesh, locators, locator sets, decals,
 * attachments, lights, effect children, overlay effects, impact overlay and
 * controllers - together with the curve-driven world transform, visibility, LOD
 * and batch submission that drive them each frame.
 */
@meta.define({ className: "EveSpaceObject2", family: "eve/spaceObject" })
@meta.blue.inherit(IWorldPosition, ITr2BoundingBox, ITr2Renderable, IEveSpaceObject2, ITr2ShLightingReceiver, ITr2SecondaryLightSource, IEveInheritPropertiesOwner)
@meta.blue.inherit(IInitialize, INotify, IListNotify)
export class EveSpaceObject2 extends EveEntity
{

  /** m_reflectionMode (EntityComponents::ReflectionMode - enum ReflectionMode) [READWRITE, PERSIST, NOTIFY, ENUM]
   * Reflection participation mode used when registering render components.
   * @type {number}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.EntityComponents.ReflectionMode")
  reflectionMode = 3;

  /** m_effectChildren (PIEveSpaceObjectChildVector) [READ, PERSIST]
   * Effect children updated and rendered with the hull.
   * @type {Array<IEveSpaceObjectChild>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveSpaceObjectChild")
  effectChildren = [];

  /** m_children (PIEveTransformVector) [READ, PERSIST]
   * Transform children whose visibility and transforms follow the hull.
   * @type {Array<IEveTransform>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveTransform")
  children = [];

  /** m_name (std::string) [READWRITE, NOTIFY, PERSIST]
   * Name identifying the space object.
   * @type {string}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_mute (bool) [READWRITE, NOTIFY]
   * Whether child effects and local audio observers are muted.
   * @type {boolean}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.boolean
  mute = false;

  /** m_inheritProperties (EveChildInheritPropertiesPtr) [READWRITE]
   * Shared inherited properties supplied to child effects.
   * @type {EveChildInheritProperties|null}
   */
  @meta.blue.readwrite
  @meta.type.objectRef("EveChildInheritProperties")
  inheritProperties = null;

  /** m_customMasks (PEveCustomMaskVector) [READ, PERSIST]
   * Authored custom-material masks copied into per-object shader data.
   * @type {Array<EveCustomMask>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveCustomMask")
  customMasks = [];

  /** m_overlayEffects (PEveMeshOverlayEffectVector) [READ, PERSIST]
   * Mesh overlay effects applied to this hull.
   * @type {Array<EveMeshOverlayEffect>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveMeshOverlayEffect")
  overlayEffects = [];

  /** m_positionDelta (Tr2BindingVector3Ptr) [READ]
   * Binding target for the object's position delta.
   * @type {Tr2BindingVector3|null}
   */
  @meta.blue.read
  @meta.type.objectRef("Tr2BindingVector3")
  positionDelta = null;

  /** m_lodLevel (Tr2Lod - enum Tr2Lod) [READ]
   * Current detail level selected for the hull mesh.
   * @type {number}
   */
  @meta.blue.read
  @meta.type.int32
  @meta.type.enum("trinity.Tr2Lod")
  lodLevel = -1;

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST]
   * Curve sets advanced by the object's update schedule.
   * @type {Array<TriCurveSet>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("TriCurveSet")
  curveSets = [];

  /** m_isPickable (bool) [READWRITE]
   * Whether the object participates in picking.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.type.boolean
  isPickable = true;

  /** m_estimatedPixelDiameter (float) [READ]
   * Estimated screen diameter of the hull's own bounds.
   * @type {number}
   */
  @meta.blue.read
  @meta.type.float32
  estimatedPixelDiameter = 0;

  /** m_estimatedPixelDiameterWithChildren (float) [READ]
   * Screen diameter of the combined hull and child bounds.
   * @type {number}
   */
  @meta.blue.read
  @meta.type.float32
  estimatedPixelDiameterWithChildren = 0;

  /** m_generatedShapeEllipsoidCenter (Vector3) [READ]
   * Center returned by the latest authored-or-derived shape ellipsoid query.
   * @type {Float32Array}
   */
  @meta.blue.read
  @meta.type.vec3
  generatedShapeEllipsoidCenter = vec3.create();

  /** m_generatedShapeEllipsoidRadius (Vector3) [READ]
   * Radii returned by the latest authored-or-derived shape ellipsoid query.
   * @type {Float32Array}
   */
  @meta.blue.read
  @meta.type.vec3
  generatedShapeEllipsoidRadius = vec3.fromValues(-1, -1, -1);

  /** m_animationUpdater (Tr2GrannyAnimationPtr) [READ] - Carbon's constructor creates it (cpp:214).
   * Owned animation updater providing the hull's bone transforms.
   * @type {Tr2GrannyAnimation}
   */
  @meta.blue.read
  @meta.type.objectRef("Tr2GrannyAnimation")
  animationUpdater = new Tr2GrannyAnimation();

  /** m_dna (std::string) [READ, PERSIST]
   * SOF DNA string describing the authored hull configuration.
   * @type {string}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.string
  dna = "";

  /** m_castShadow (bool) [READWRITE, NOTIFY, PERSIST]
   * Whether the hull registers as a shadow caster.
   * @type {boolean}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  castShadow = false;

  /** m_isAnimated (bool) [READWRITE, PERSIST]
   * Whether the hull uses animated mesh data.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  isAnimated = false;

  /** m_dynamicBoundingSphereEnabled (bool) [READ, PERSIST]
   * Whether dynamic bounds contribute to the object's bounding sphere.
   * @type {boolean}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.boolean
  dynamicBoundingSphereEnabled = false;

  /** m_attachments (PIEveSpaceObjectAttachmentVector) [READ, PERSIST]
   * Attachments that contribute updates, bounds and render batches.
   * @type {Array<IEveSpaceObjectAttachment>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveSpaceObjectAttachment")
  attachments = [];

  /** m_decals (PEveSpaceObjectDecalVector) [READ, PERSIST]
   * Decals rendered against the hull's mesh and parent data.
   * @type {Array<EveSpaceObjectDecal>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSpaceObjectDecal")
  decals = [];

  /** m_lights (PTr2LightVector) [READ, PERSIST, NOTIFY]
   * Local lights whose transforms and brightness follow the object.
   * @type {Array<Tr2Light>}
   */
  @meta.blue.notify
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2Light")
  lights = [];

  /** m_externalParameters (PTr2ExternalParameterVector) [READ, PERSIST]
   * External parameter bindings attached to this object's graph.
   * @type {Array<Tr2ExternalParameter>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2ExternalParameter")
  externalParameters = [];

  /** m_controllers (PITr2ControllerVector) [READ, PERSIST]
   * Controllers linked to this object and supplied with its variables.
   * @type {Array<ITr2Controller>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITr2Controller")
  controllers = [];

  /** m_locators (PEveLocator2Vector) [READ, PERSIST]
   * Named locators authored directly on the hull.
   * @type {Array<EveLocator2>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveLocator2")
  locators = [];

  /** m_mesh (Tr2MeshBasePtr) [READWRITE, PERSIST]
   * Hull mesh supplying geometry, areas and shader options.
   * @type {Tr2MeshBase|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2MeshBase")
  mesh = null;

  /** m_impactOverlay (EveImpactOverlayPtr) [READWRITE, PERSIST]
   * Overlay receiving hull impact effects and shader-data offsets.
   * @type {EveImpactOverlay|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveImpactOverlay")
  impactOverlay = null;

  /** m_clipSphereCenter (Vector3) [READWRITE, PERSIST]
   * Authored center of the hull clipping sphere.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  clipSphereCenter = vec3.create();

  /** m_clipSphereFactor2 (float) [READWRITE, NOTIFY]
   * Secondary dissolve factor used to compute the second clipping radius.
   * @type {number}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  clipSphereFactor2 = 0;

  /** m_clipSphereFactor (float) [READWRITE, NOTIFY]
   * Primary dissolve factor used to compute the clipping radius.
   * @type {number}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  clipSphereFactor = 0;

  /** m_observers (PTriObserverLocalVector) [READ, PERSIST]
   * Local observers updated with the hull and its visibility.
   * @type {Array<TriObserverLocal>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("TriObserverLocal")
  observers = [];

  /** m_worldPosition (Vector3) [READ]
   * Current world position sampled from the translation curve.
   * @type {Float32Array}
   */
  @meta.blue.read
  @meta.type.vec3
  worldPosition = vec3.create();

  /** m_ballRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST]
   * Curve supplying the object's world rotation.
   * @type {ITriQuaternionFunction|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("ITriQuaternionFunction")
  rotationCurve = null;

  /** m_worldRotation (Quaternion) [READ]
   * Current world rotation sampled from the rotation curve.
   * @type {Float32Array}
   */
  @meta.blue.read
  @meta.type.quat
  worldRotation = quat.create();

  /** m_modelScale (float) [READWRITE, PERSIST]
   * Uniform scale applied when constructing the model transform.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  modelScale = 1;

  /** m_locatorSets (PEveLocatorSetsVector) [READ, PERSIST]
   * Authored locator groups merged with child locator sets.
   * @type {Array<EveLocatorSets>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveLocatorSets")
  locatorSets = [];

  /** m_activationStrength (float) [READWRITE]
   * Activation value forwarded to children, lights and shader data.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.type.float32
  activationStrength = 1;

  /** m_albedoColor (Color) [READWRITE]
   * Hull albedo used when registering secondary lighting.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.type.color
  albedoColor = color.createLinear();

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY]
   * Whether the hull and its render components are displayed.
   * @type {boolean}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_update (bool) [READWRITE, PERSIST]
   * Whether the object's update work is enabled.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  update = true;

  /** m_secondaryLightingSphereRadius (float) [READ]
   * Radius supplied to the secondary-lighting manager.
   * @type {number}
   */
  @meta.blue.read
  @meta.type.float32
  secondaryLightingSphereRadius = 0;

  /** m_boundingSphereCenter (Vector3) [READWRITE, PERSIST]
   * Authored local-space center of the hull's bounding sphere.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  boundingSphereCenter = vec3.create();

  /** m_dirtLevel (float) [READWRITE, NOTIFY]
   * Dirt amount forwarded to controllers and packed shader ship data.
   * @type {number}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  dirtLevel = 0;

  /** m_psData.customData (Vector4) [READWRITE] - script/SOF-driven custom shader data.
   * Four script-controlled values copied into per-object shader constants.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.type.vec4
  customShaderData = vec4.create();

  /**
   * m_spaceObjectShipData (Vector4) [READ] - the packed shader ship data:
   * .y activation strength, .z dirt level, .w bounding-sphere radius
   * (PrepareShaderData, cpp:734-744). .x is authored elsewhere and left alone.
   * Packed ship values supplied to the vertex and pixel shader records.
   * @type {Float32Array}
   */
  @meta.blue.read
  @meta.type.vec4
  spaceObjectShipData = vec4.create();

  /** m_lastDamageLocatorHit (int) [READ]
   * Index of the last selected damage locator; negative before a hit.
   * @type {number}
   */
  @meta.blue.read
  @meta.type.int32
  lastDamageLocatorHit = -1;

  /**
   * Whether damage locators request automatic occlusion filtering.
   * @type {boolean}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.boolean
  damageLocatorAutoFilterEnabled = false;

  /** m_boundingSphereRadius (float) [READWRITE, PERSIST]
   * Local bounding radius; a negative value marks unavailable bounds.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  boundingSphereRadius = -1;

  /** m_boundingSphereWorldCenter (Vector3) [READ]
   * World-space center of the transformed hull bounding sphere.
   * @type {Float32Array}
   */
  @meta.blue.read
  @meta.type.vec3
  modelWorldPosition = vec3.create();

  /** m_modelTranslation (ITriVectorFunctionPtr) [READWRITE, PERSIST]
   * Curve supplying the model's local translation offset.
   * @type {ITriVectorFunction|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("ITriVectorFunction")
  modelTranslationCurve = null;

  /** m_modelRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST]
   * Curve supplying the model's local rotation offset.
   * @type {ITriQuaternionFunction|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("ITriQuaternionFunction")
  modelRotationCurve = null;

  /** m_shapeEllipsoidCenter (Vector3) [READWRITE, PERSIST]
   * Authored local center used by the shape ellipsoid query.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  shapeEllipsoidCenter = vec3.create();

  /** m_shapeEllipsoidRadius (Vector3) [READWRITE, PERSIST]
   * Authored local radii; unavailable radii cause bounds-derived ellipsoid queries.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  shapeEllipsoidRadius = vec3.fromValues(-1, -1, -1);

  /** m_ballPosition (ITriVectorFunctionPtr) [READWRITE, PERSIST]
   * Curve supplying the object's world position and velocity.
   * @type {ITriVectorFunction|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("ITriVectorFunction")
  translationCurve = null;

  /**
   * Current model-to-world transform, including model offsets and scale.
   * @type {Float32Array}
   */
  @meta.blue.read
  @meta.type.mat4
  worldTransform = mat4.create();

  /** The translation view registered with the SH lighting manager (_GetWorldTranslation).
   * Cached translation view into the world transform for lighting registration.
   * @type {Float32Array|null}
   */
  _worldTranslation = null;

  /**
   * Inverse of the current model-to-world transform.
   * @type {Float32Array}
   */
  @meta.blue.read
  @meta.type.mat4
  inverseWorldTransform = mat4.create();

  /**
   * Previous world transform retained for motion and shader data.
   * @type {Float32Array}
   */
  @meta.blue.read
  @meta.type.mat4
  lastWorldTransform = mat4.create();

  /**
   * Current world velocity obtained from the translation curve derivative.
   * @type {Float32Array}
   */
  @meta.blue.read
  @meta.type.vec3
  worldVelocity = vec3.create();

  /**
   * Audio geometry associated with the object's transform and mute state.
   * @type {ITr2AudGeometry|null}
   */
  @meta.blue.readwrite
  @meta.type.objectRef("ITr2AudGeometry")
  audioGeometry = null;

  /**
   * Visibility result used to gate rendering and update frequency.
   * @type {boolean}
   */
  @meta.type.boolean
  isVisible = false;

  /**
   * Controller values retained for replay to newly attached controllers and children.
   * @type {Map<string, number>}
   */
  _controllerVariables = new Map([
    ["DirtLevel", 0],
    ["ActivationStrength", 1],
    ["ShieldDamage", 1],
    ["ArmorDamage", 1],
    ["HullDamage", 1],
    ["ClipSphereFactor", 0],
    ["ClipSphereFactor2", 0]
  ]);

  /**
   * Last frame time used to build the world transform; null before the first update.
   * @type {number|null}
   */
  _lastUpdateTransformTime = null;

  // Carbon m_lastCurveUpdateTime: stamped by the sync-side LOD gate; the async
  // side updates curve sets only when it matches the frame time.
  /**
   * Frame time authorized by the synchronous LOD gate for curve updates.
   * @type {number}
   */
  _lastCurveUpdateTime = 0;

  /** Carbon m_geometryResFromMesh: the mesh geometry the updater last borrowed.
   * Geometry resource last borrowed from the mesh by the animation updater.
   * @type {import("../../../resource/geometry/TriGeometryRes.js").TriGeometryRes|null}
   */
  _geometryResFromMesh = null;

  /** Carbon m_boneOffsets: where this ship's palette landed in the bone ring, this frame and last.
   * Current and previous frame offsets of this hull's palette in the bone ring.
   * @type {Tr2RingBufferOffsets}
   */
  _boneOffsets = new Tr2RingBufferOffsets();

  // Carbon m_dynamicBoundingSphere: disabled while w is -1; a future animation
  // updater port publishes skinned bounds here.
  /**
   * Dynamic local sphere; a negative radius marks it unavailable.
   * @type {Float32Array}
   */
  _dynamicBoundingSphere = sph3.set(sph3.create(), 0, 0, 0, -1);

  // Carbon keeps the realized world sphere separate from the authored local
  // sphere. UpdateWorldBounds refreshes it from PrepareShaderData, which is
  // Carbon's only refresh point - so a reader sees one value for a whole frame.
  /**
   * Realized world bounding radius retained for the current frame.
   * @type {number}
   */
  _boundingSphereWorldRadius = -1;

  // Carbon visibility and mesh LOD state are runtime-only renderer results.
  /**
   * Whether the combined object bounds intersect the current view frustum.
   * @type {boolean}
   */
  _isInFrustum = false;

  /**
   * Whether the hull mesh or an attachment passed visibility testing.
   * @type {boolean}
   */
  _isMeshVisible = false;

  /**
   * Detail level selected from the combined hull and child bounds.
   * @type {number}
   */
  _lodLevelWithChildren = Tr2Lod.TR2_LOD_UNSPECIFIED;

  /**
   * Cached mesh screen-size value used by render batches.
   * @type {number}
   */
  _meshScreenSize = 0;

  /**
   * Cached area blocks for opaque-only overlays and overlays covering all supported areas.
   * @type {Array<Array<TriRenderBatchAreaBlock>>}
   */
  _overlayMeshAreaBlocks = [ [], [] ];

  /**
   * Cached opaque area groups sharing a material for shadow rendering.
   * @type {Array<TriRenderBatchAreaBlocksWithSharedMaterial>}
   */
  _shadowMeshOpaqueAreas = [];

  /**
   * Whether overlay and shadow area caches have been built for the current mesh.
   * @type {boolean}
   */
  _cachedAreaBlocksBuilt = false;

  /**
   * Locator sets combining the hull's authored groups with child-owned groups.
   * @type {Array<EveLocatorSets>}
   */
  _mergedLocatorSets = [];

  /**
   * Child ownership and transform ranges for merged damage locators.
   * @type {Array<{owner: IEveSpaceObjectChild, partTag: number, start: number, count: number, childToObject: Float32Array}>}
   */
  _mergedDamageLocatorSources = [];

  /**
   * Occlusion-filter results indexed by merged damage locator.
   * @type {Array<boolean>}
   */
  _damageLocatorEnabled = [];

  /**
   * Whether child or authored locator changes require rebuilding the merged sets.
   * @type {boolean}
   */
  _mergedLocatorSetsDirty = true;

  /**
   * Whether a damage-locator filtering pass has been requested.
   * @type {boolean}
   */
  _damageLocatorFilterRequested = false;

  /**
   * Prepared geometry and object-to-geometry transforms used by damage-locator raycasts.
   * @type {Array<{geometry: import("../../../resource/geometry/TriGeometryRes.js").TriGeometryRes, fromObject: Float32Array, areaStart: number, areaCount: number}>}
   */
  _damageFilterOccluders = [];

  // Carbon m_damageFilterAreas (EveSpaceObject2.h:829): the shared area pool
  // the occluders' areaStart/areaCount ranges index into.
  /**
   * Shared geometry-area ranges referenced by the damage-filter occluders.
   * @type {Array<{index: number, count: number, alphaCutout: boolean, reversed: boolean}>}
   */
  _damageFilterAreas = [];

  // 0 idle, 1 pending, 2 active raycast session. Carbon initializes Idle
  // (EveSpaceObject2.cpp:208); SOF's eager RunDamageLocatorFilter was removed
  // upstream (ae5680b3), so filtering runs only when requested or auto-enabled.
  /**
   * Damage-filter lifecycle state: idle, pending or active raycast session.
   * @type {number}
   */
  _damageFilterState = 0;

  // Carbon m_oldClipSphereFactor/2: the last notified clip factors, so
  // OnModified switches SPACE_OBJECT_CLIPPING only on crossing zero.
  /**
   * Last notified primary clipping factor used to detect clipping-state transitions.
   * @type {number}
   */
  _oldClipSphereFactor = 0;
  /**
   * Last notified secondary clipping factor used to detect clipping-state transitions.
   * @type {number}
   */
  _oldClipSphereFactor2 = 0;

  // Carbon m_localAabbMin/Max: cached so GetLocalBoundingBox can answer before
  // LOD selection assigns a mesh (at worst it lags one frame).
  /**
   * Cached minimum corner of the local bounding box.
   * @type {Float32Array}
   */
  _localAabbMin = vec3.create();

  /**
   * Cached maximum corner of the local bounding box.
   * @type {Float32Array}
   */
  _localAabbMax = vec3.create();

  // Carbon m_allowLodSelection: cleared by FreezeHighDetailMesh.
  /**
   * Whether mesh LOD selection is allowed; cleared when high detail is frozen.
   * @type {boolean}
   */
  _allowLodSelection = true;

  // Carbon m_impostorMode: the impostor system that raises it is unported.
  /**
   * Whether rendering is delegated to impostor mode.
   * @type {boolean}
   */
  _impostorMode = false;

  /** EVE_SPACEOBJECT_CUSTOWMASK_MAX (EveSpaceObject2.h:49) - custom-mask slots.
   * Maximum number of custom-material mask slots.
   * @type {number}
   */
  static CUSTOM_MASK_MAX = EveCustomMask.CUSTOM_MASK_COUNT;

  /**
   * Carbon g_secondaryLightingRadiusCutoffFactor (cpp:52), a registered engine
   * setting defaulting to 0.3. It scales this hull's bounding radius into the
   * cutoff below which a secondary light source is too small to matter.
   * Scale factor converting hull radius into the secondary-lighting cutoff.
   * @type {number}
   */
  @meta.setting("secondaryLightingRadiusCutoffFactor")
  static secondaryLightingRadiusCutoffFactor = 0.3;

  /** Scratch for the per-frame shader-data fill; never allocate in it.
   * Shared vector scratch for filling clipping shader constants.
   * @type {Float32Array}
   */
  static _clipSphereCenterScratch = vec3.create();

  /**
   * Shared vector scratch for the shape ellipsoid center.
   * @type {Float32Array}
   */
  static _shapeCenterScratch = vec3.create();

  /**
   * Shared vector scratch for the shape ellipsoid radii.
   * @type {Float32Array}
   */
  static _shapeRadiusScratch = vec3.create();

  // Carbon m_vsData / m_psData: the PERSISTENT per-object records. They are
  // owner-held members across frames rather than pool leases, because the
  // object fills them during update and reads them back afterwards
  // (cpp:3747 takes the world translation out of the STORED transposed matrix).
  // Carbon's paired m_perObjectDataVs/m_perObjectDataPs GPU buffers are the
  // engine's business; Invalidate on these records carries the same signal.
  /** The ParentData Carbon builds on the stack for the decal pass
   * (EveSpaceObject2.cpp:1696), held here so the pass does not allocate.
   * Reusable parent-data record supplied to decal rendering.
   * @type {IEveSpaceObject2ParentData}
   */
  _decalParentData = new IEveSpaceObject2ParentData();

  /**
   * Persistent vertex-shader constants owned by this hull across frames.
   * @type {RawData}
   */
  _vsData = RawData.create("EveSpaceObjectVSData");

  /**
   * Persistent pixel-shader constants owned by this hull across frames.
   * @type {RawData}
   */
  _psData = RawData.create("EveSpaceObjectPSData");

  /** Alias for the mesh property; reads and writes go straight to mesh. */
  @meta.blue.persist
  @meta.type.objectRef("Tr2MeshBase")
  get meshLod()
  {
    return this.mesh;
  }

  /** Alias for the mesh property; reads and writes go straight to mesh. */
  set meshLod(mesh)
  {
    this.mesh = mesh ?? null;
  }

  /**
   * Links the authored controllers, pushes authored inherit properties down to
   * the effect children and lights, and derives the impact overlay's damage
   * locator count from the "damage" locator set - which Carbon does at build
   * time - so a field-populated graph reaches the same live state as the
   * authoring path.
   */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    // Carbon cpp:259-264.
    if (this.mesh) this.PrepareForAnimation();

    for (const controller of this.controllers)
    {
      if (!controller?.IsLinked())
      {
        controller?.Link(this);
      }
    }
    // Authored inherit properties propagate as part of the lifecycle so a
    // field-populated graph (values import, document hydration) matches the
    // SetInheritProperties authoring path.
    if (this.inheritProperties)
    {
      this._PropagateInheritProperties();
    }

    for (const child of this.effectChildren) child.SetOwner(this);

    this.InvalidateMergedLocators("structure");
    // Carbon derives the impact overlay's damage locator count from the
    // "damage" locator set at build time; deriving it here keeps it out of
    // the authored values while reproducing the same live state.
    if (this.impactOverlay)
    {
      this.EnsureChildLocatorMerged();
      this.impactOverlay.SetDamageLocatorCount(this.GetDamageLocatorCount());
    }
    return true;
  }

  /** Returns the hull mesh, or null when none is attached. */
  @meta.blue.method
  @meta.implemented
  GetMesh()
  {
    return this.mesh;
  }

  /**
   * Replaces the hull mesh; the cached area blocks are only rebuilt on the next
   * batch call.
   */
  @meta.blue.method
  @meta.adapted
  SetMesh(mesh)
  {
    this.mesh = mesh ?? null;
    // Carbon cpp:2294-2306.
    if (this.mesh) this.PrepareForAnimation();
  }

  /**
   * Hands the updater the mesh's geometry the first time it is seen, so a
   * skinned hull animates from the granny file that geometry keeps.
   *
   * Carbon `PrepareForAnimation` (cpp:3176-3199). Carbon also moves the ship's
   * own notify target to the new geometry; the updater's rebuild on load is
   * the updater's own subscription here (Tr2GrannyAnimation.SetSharedGeometryRes),
   * and the audio geometry is not ported.
   */
  @meta.blue.method
  @meta.adapted
  PrepareForAnimation()
  {
    const geometryRes = this.mesh.GetGeometryResource();
    if (geometryRes && geometryRes !== this._geometryResFromMesh)
    {
      this._geometryResFromMesh = geometryRes;
      this.animationUpdater.SetUseMeshBinding(true);
      this.animationUpdater.SetSharedGeometryRes(geometryRes);
    }
  }

  /** Borrowed overlay vector used by child mesh inheritance. */
  @meta.blue.method
  @meta.implemented
  GetOverlayEffects()
  {
    return this.overlayEffects;
  }

  /**
   * Appends a controller, links it to this object when it is not already linked,
   * and replays the current controller variables onto it.
   */
  @meta.blue.method
  @meta.adapted
  AddController(controller)
  {
    // The link and the variable replay are the INSERTED arm's (cpp:297-311).
    addChild(this, "controllers", controller, { listNotify: this });
    return controller;
  }

  /**
   * Appends a placement observer, which is repositioned from the observer
   * transform on every synchronous update; the observer is returned for
   * chaining.
   */
  @meta.blue.method
  @meta.implemented
  AddObserver(observer)
  {
    this.observers.push(observer);
    return observer;
  }

  /**
   * Sets the colour set that effect children and lights inherit, creating the
   * inherit-properties holder on first use, and pushes it to the existing
   * children and lights.
   */
  @meta.blue.method
  @meta.implemented
  SetInheritProperties(colorSet)
  {
    if (!this.inheritProperties)
    {
      this.inheritProperties = new EveChildInheritProperties();
    }
    this.inheritProperties.SetProperties(colorSet);
    this._PropagateInheritProperties();
  }

  /** Pushes the current inherited properties to every effect child and light. */
  _PropagateInheritProperties()
  {
    const properties = this.inheritProperties.GetProperties();
    for (const child of this.effectChildren)
    {
      if (CjsSchema.cast(child, IEveInheritPropertiesOwner)) child.SetInheritProperties(properties);
    }
    for (const light of this.lights)
    {
      if (CjsSchema.cast(light, IEveInheritPropertiesOwner)) light.SetInheritProperties(properties);
    }
  }

  /**
   * Returns the first effect child with the given name, or null when none
   * matches.
   */
  @meta.blue.method
  @meta.implemented
  GetEffectChildByName(name)
  {
    const target = String(name ?? "");
    for (const child of this.effectChildren)
    {
      if ((child?.GetName?.() ?? child?.name ?? "") === target)
      {
        return child;
      }
    }
    return null;
  }

  /**
   * Carbon OnListModified (EveSpaceObject2.cpp:291-469), the owner reacting to
   * its own lists. Carbon installs itself on six of them at cpp:217-222 and the
   * lists notify it; a JavaScript array has no notify slot, so the managed child
   * mutation drives the same call.
   *
   * Controllers link and replay the recorded variables on insert, unlink on
   * remove, and unlink every one on unload. Effect children take ownership,
   * replay variables and register with the component registry; removal
   * unregisters and clears ownership. Overlay effects replay variables only.
   * Inherited properties reach a newly inserted child or light. The LightOwner
   * component follows the list edges: registered on the first light, dropped on
   * the last removal or an unload. Decals renumber their priorities, which is
   * the one arm needing SWAPPED and MOVED.
   */
  @meta.blue.method
  @meta.implemented
  OnListModified(event, key = 0, key2 = 0, value = null, list = null)
  {
    const masked = event & BLUELISTEVENT.BELIST_EVENTMASK;
    const loading = (event & BLUELISTEVENT.BELIST_LOADING) !== 0;

    if (list === this.controllers && !loading)
    {
      if (masked === BLUELISTEVENT.BELIST_INSERTED && value)
      {
        value.Link(this);
        EveSpaceObject2._ApplyControllerVariables(value, this._controllerVariables, "SetVariable");
      }
      else if (masked === BLUELISTEVENT.BELIST_REMOVED && value) value.Unlink();
      else if (masked === BLUELISTEVENT.BELIST_UNLOADSTART)
      {
        for (const controller of this.controllers) controller.Unlink();
      }
    }
    else if (list === this.effectChildren && !loading)
    {
      const registry = this.IsInRegistry() ? this.GetComponentRegistry() : null;
      if (masked === BLUELISTEVENT.BELIST_INSERTED)
      {
        value.SetOwner(this);
        EveSpaceObject2._ApplyControllerVariables(value, this._controllerVariables, "SetControllerVariable");
        // Carbon casts to EveEntityPtr before registering (cpp:333-341).
        const inserted = registry ? CjsSchema.cast(value, EveEntity) : null;
        if (inserted) inserted.Register(registry);
      }
      else if (masked === BLUELISTEVENT.BELIST_REMOVED)
      {
        const removed = registry ? CjsSchema.cast(value, EveEntity) : null;
        if (removed) removed.UnRegister(registry);
        value.SetOwner(null);
      }
      else if (masked === BLUELISTEVENT.BELIST_UNLOADSTART)
      {
        for (const child of this.effectChildren)
        {
          const entity = registry ? CjsSchema.cast(child, EveEntity) : null;
          if (entity) entity.UnRegister(registry);
          child.SetOwner(null);
        }
      }
    }
    else if (list === this.overlayEffects && !loading && masked === BLUELISTEVENT.BELIST_INSERTED)
    {
      EveSpaceObject2._ApplyControllerVariables(value, this._controllerVariables, "SetControllerVariable");
    }

    // Independent of the LOADING guard above: inherited properties reach a
    // child or light however it arrived (cpp:389-411).
    if (masked === BLUELISTEVENT.BELIST_INSERTED && this.inheritProperties
      && (list === this.effectChildren || list === this.lights)
      && CjsSchema.cast(value, IEveInheritPropertiesOwner))
    {
      value.SetInheritProperties(this.inheritProperties.GetProperties());
    }

    if (list === this.lights) this._OnLightListModified(masked);
    if (list === this.decals) this._OnDecalListModified(masked, key, key2);
  }

  /**
   * Carbon cpp:413-431: the LightOwner component follows the list EDGES - the
   * first light registers it, the last removal or an unload drops it. The same
   * size rule RegisterComponents applies at registration time.
   */
  _OnLightListModified(masked)
  {
    const registry = this.GetComponentRegistry();
    if (!registry) return;
    if (masked === BLUELISTEVENT.BELIST_UNLOADSTART || (masked === BLUELISTEVENT.BELIST_REMOVED && !this.lights.length))
    {
      registry.UnRegisterComponent(EveComponentType.LightOwner, this);
    }
    else if (masked === BLUELISTEVENT.BELIST_INSERTED && this.lights.length === 1)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
    }
  }

  /**
   * Carbon cpp:433-468: a decal's priority IS its index, so every structural
   * change renumbers from the affected position. The append special case is
   * Carbon's own comment - "in case someone calls the append function of
   * bluelist from python" - and it renumbers the last entry alone.
   */
  _OnDecalListModified(masked, key, key2)
  {
    const decals = this.decals;
    if (masked === BLUELISTEVENT.BELIST_INSERTED && key === decals.length)
    {
      decals[decals.length - 1]?.SetPriority(decals.length - 1);
      return;
    }
    if (masked === BLUELISTEVENT.BELIST_INSERTED || masked === BLUELISTEVENT.BELIST_REMOVED)
    {
      for (let index = key; index < decals.length; index++) decals[index]?.SetPriority(index);
      return;
    }
    if (masked === BLUELISTEVENT.BELIST_SWAPPED)
    {
      decals[key]?.SetPriority(key);
      decals[key2]?.SetPriority(key2);
      return;
    }
    if (masked === BLUELISTEVENT.BELIST_MOVED)
    {
      const low = Math.min(key, key2);
      const high = Math.max(key, key2);
      for (let index = low; index <= high && index < decals.length; index++) decals[index]?.SetPriority(index);
    }
  }

  /**
   * Appends an effect child, first giving it the hull's inherited properties and
   * then replaying the current controller variables onto it, so a late addition
   * starts in the same state as the rest.
   */
  @meta.blue.method
  @meta.adapted
  AddToEffectChildrenList(child)
  {
    // The ownership, the inherited properties and the variable replay are the
    // INSERTED arm's (cpp:322-342), reached through the managed mutation.
    addChild(this, "effectChildren", child, { listNotify: this });
    this.InvalidateMergedLocators("structure");
    return child;
  }

  /** Appends a light, first giving it the hull's inherited properties. */
  @meta.blue.method
  @meta.implemented
  AddLight(light)
  {
    // The inherited properties and the LightOwner registration on the FIRST
    // light are the hook's (cpp:402-431).
    addChild(this, "lights", light, { listNotify: this });
  }

  /**
   * Drops every light from the hull; component registration is not revisited
   * here.
   */
  @meta.blue.method
  @meta.implemented
  ClearLights()
  {
    // UNLOADSTART, which is what drops the LightOwner component registration
    // (cpp:413-421). Emptying the array by hand left it registered.
    clearChildren(this, "lights", { listNotify: this });
  }

  /**
   * Removes an effect child, returning false when it is not attached to this
   * hull.
   */
  @meta.blue.method
  @meta.implemented
  RemoveFromEffectChildrenList(child)
  {
    // The unregister and the cleared ownership are the REMOVED arm's
    // (cpp:343-353).
    if (!removeChild(this, "effectChildren", child, { listNotify: this })) return false;
    this.InvalidateMergedLocators("structure");
    return true;
  }

  /**
   * Sets the curve that rotates the model within the hull's ball rotation, or
   * clears it when passed nothing.
   */
  @meta.blue.method
  @meta.implemented
  SetModelRotationCurve(curve)
  {
    this.modelRotationCurve = curve ?? null;
  }

  /** Returns the model rotation curve, or null when none is set. */
  @meta.blue.method
  @meta.implemented
  GetModelRotationCurve()
  {
    return this.modelRotationCurve;
  }

  /**
   * Sets the curve that offsets the model within the hull's ball position, or
   * clears it when passed nothing.
   */
  @meta.blue.method
  @meta.implemented
  SetModelTranslationCurve(curve)
  {
    this.modelTranslationCurve = curve ?? null;
  }

  /** Returns the model translation curve, or null when none is set. */
  @meta.blue.method
  @meta.implemented
  GetModelTranslationCurve()
  {
    return this.modelTranslationCurve;
  }

  /**
   * Rebuilds the hull world transform for a frame from the ball position and rotation curves plus the optional model translation and rotation curves, applies modelScale as a uniform scale, then refreshes the inverse transform and the world bounds; the previous world transform is kept for motion vectors and the world velocity comes from the position curve's derivative.
   * @param {number} time Frame time; repeating the previous call's time is a no-op.
   * @returns {boolean} False when the transform had already been built for this time.
   */
  @meta.blue.method
  @meta.adapted
  UpdateWorldTransform(time)
  {
    const nextTime = Number(time) || 0;
    if (this._lastUpdateTransformTime === nextTime)
    {
      return false;
    }
    this._lastUpdateTransformTime = nextTime;
    mat4.copy(this.lastWorldTransform, this.worldTransform);
    // Carbon cpp:2675-2676: the OUTGOING transform becomes worldTransformLast,
    // stored transposed in both records, before the new one is built.
    this._vsData.SetAndTranspose("worldTransformLast", this.lastWorldTransform);
    this._psData.SetAndTranspose("worldTransformLast", this.lastWorldTransform);

    EveSpaceObject2._UpdateCurve(this.translationCurve, nextTime, this.worldPosition, EveSpaceObject2._zero);
    if (this.translationCurve?.GetValueDotAt)
    {
      this.translationCurve.GetValueDotAt(nextTime, this.worldVelocity);
    }
    else
    {
      vec3.set(this.worldVelocity, 0, 0, 0);
    }

    EveSpaceObject2._UpdateCurve(this.rotationCurve, nextTime, this.worldRotation, EveSpaceObject2._identityRotation);
    const rotation = quat.clone(this.worldRotation);
    if (this.modelRotationCurve)
    {
      const modelRotation = quat.create();
      EveSpaceObject2._UpdateCurve(this.modelRotationCurve, nextTime, modelRotation, EveSpaceObject2._identityRotation);
      // Carbon (row-vector): rotation = modelRotation * m_worldRotation - model first.
      quat.multiply(rotation, rotation, modelRotation);
    }

    mat4.fromQuat(this.worldTransform, rotation);
    if (this.modelScale !== 1)
    {
      // Carbon (row-vector): m_worldTransform * scaleMatrix - scale LAST
      // (cpp:2711-2716). gl mat4.scale builds W*S = scale FIRST; equivalent
      // ONLY because modelScale is strictly uniform (a uniform scale commutes
      // with the pure rotation here). If modelScale ever becomes a vec3 this
      // must become mat4.multiply(w, S, w) per the swap rule.
      mat4.scale(this.worldTransform, this.worldTransform, [this.modelScale, this.modelScale, this.modelScale]);
    }

    if (this.modelTranslationCurve)
    {
      const modelTranslation = vec3.create();
      EveSpaceObject2._UpdateCurve(this.modelTranslationCurve, nextTime, modelTranslation, EveSpaceObject2._zero);
      vec3.transformMat4(modelTranslation, modelTranslation, this.worldTransform);
      this.worldTransform[12] = this.worldPosition[0] + modelTranslation[0];
      this.worldTransform[13] = this.worldPosition[1] + modelTranslation[1];
      this.worldTransform[14] = this.worldPosition[2] + modelTranslation[2];
    }
    else
    {
      this.worldTransform[12] = this.worldPosition[0];
      this.worldTransform[13] = this.worldPosition[1];
      this.worldTransform[14] = this.worldPosition[2];
    }

    if (!mat4.invert(this.inverseWorldTransform, this.worldTransform))
    {
      mat4.identity(this.inverseWorldTransform);
    }
    return true;
  }

  /**
   * Refreshes Carbon's realized world-space sphere from the dynamic skinned
   * sphere when available, otherwise from the authored local sphere.
   */
  @meta.blue.method
  @meta.implemented
  UpdateWorldBounds()
  {
    const updater = this.animationUpdater;
    if (this.dynamicBoundingSphereEnabled && updater && updater.IsInitialized())
    {
      updater.GetDynamicBounds(
        this._dynamicBoundingSphere, this._localAabbMin, this._localAabbMax);
      if (this._dynamicBoundingSphere[3] > 0)
      {
        vec3.transformMat4(this.modelWorldPosition, this._dynamicBoundingSphere, this.worldTransform);
        this._boundingSphereWorldRadius = this.modelScale * this._dynamicBoundingSphere[3];

        return;
      }
    }
    if (this.boundingSphereRadius > 0)
    {
      vec3.transformMat4(this.modelWorldPosition, this.boundingSphereCenter, this.worldTransform);
      this._boundingSphereWorldRadius = this.modelScale * this.boundingSphereRadius;
    }
  }

  /**
   * Carbon EveSpaceObject2::PrepareShaderData (cpp:734-763): refreshes the
   * world bounds, packs the ship data, and derives the clip-sphere dissolve
   * values into the persistent per-object records.
   */
  @meta.blue.method
  @meta.implemented
  PrepareShaderData(updateContext = null)
  {
    this.UpdateWorldBounds();

    // An impact overlay may damp the activation strength; otherwise full on.
    this.spaceObjectShipData[1] = this.impactOverlay
      ? this.impactOverlay.GetActivationStrength(updateContext)
      : 1;
    this.spaceObjectShipData[3] = this.GetBoundingSphereRadius();
    this.spaceObjectShipData[2] = this.dirtLevel;

    // clipSphereFactor runs 0 (fully visible) to 1 (invisible); the shader gets
    // a signed squared radius rather than the factor itself.
    let normalizedBoundingRadius = this.GetBoundingSphereRadius() / (this.modelScale === 0 ? 1 : this.modelScale);
    const clipOffset = vec3.length(this.clipSphereCenter);
    normalizedBoundingRadius += clipOffset;
    const insideSpherePercentage = Math.min(1, clipOffset / normalizedBoundingRadius);
    const dissolveRadius = this.clipSphereFactor * normalizedBoundingRadius * (1 + insideSpherePercentage);

    const center = this.GetBoundingSphereCenter();
    const clipSphereCenter = EveSpaceObject2._clipSphereCenterScratch;
    vec3.add(clipSphereCenter, this.clipSphereCenter, center);
    const clipRadiusSq = Math.sign(dissolveRadius) * dissolveRadius * dissolveRadius;

    this._psData.Set("clipSphereCenter", clipSphereCenter);
    this._psData.Set("clipRadiusSq", [clipRadiusSq]);
    this._vsData.Set("clipData", [clipSphereCenter[0], clipSphereCenter[1], clipSphereCenter[2], clipRadiusSq]);

    const dissolveRadius2 = this.clipSphereFactor2 * normalizedBoundingRadius * (1 + insideSpherePercentage);
    this._psData.Set("clipRadius2Sq", [Math.sign(dissolveRadius2) * dissolveRadius2 * dissolveRadius2]);
    this._psData.Set("clipSphereFactor", [this.clipSphereFactor]);
    this._psData.Set("clipSphereFactor2", [this.clipSphereFactor2]);
  }

  /**
   * Carbon EveSpaceObject2::UpdateShLighting (cpp:1411-1421): asks the scene's
   * SH lighting manager for this hull's secondary-lighting coefficients, faded
   * in across the low-detail threshold so a hull entering that range does not
   * pop. The coefficients are cleared first, which is also what leaves the
   * unwritten tail zero on the L1 path.
   * @param {Object} manager - Tr2ShLightingManager
   * @param {Object} [updateContext] - frame context, for the detail thresholds
   */
  @meta.blue.method
  @meta.implemented
  UpdateShLighting(manager, updateContext = null)
  {
    const coefficients = this._psData.Get("shLightingCoefficients");

    coefficients.fill(0);

    const lowThreshold = EveSpaceObject2._GetContextValue(updateContext, "GetLowDetailThreshold", "lowDetailThreshold");

    if (!(this.estimatedPixelDiameterWithChildren > lowThreshold))
    {
      return false;
    }

    const mediumThreshold = EveSpaceObject2._GetContextValue(updateContext, "GetMediumDetailThreshold", "mediumDetailThreshold");
    const intensityFadeRadius = (mediumThreshold - lowThreshold) * 0.25;
    const intensity = Math.min(Math.max((this.estimatedPixelDiameterWithChildren - lowThreshold) / intensityFadeRadius, 0), 1);

    manager.GetLighting(
      this.worldPosition,
      intensity,
      this.boundingSphereRadius * EveSpaceObject2.secondaryLightingRadiusCutoffFactor,
      coefficients
    );

    return true;
  }

  /**
   * Registers this hull as a secondary light source (EveSpaceObject2.cpp:510-514):
   * its world translation, its secondary-lighting sphere radius and albedo, and
   * no emissive colour. The translation is one live view, which unregistering
   * matches by identity.
   * Adapted: Carbon passes the radius as a pointer the manager reads live;
   * a getter supplies the current value at every source refresh.
   *
   * @param {import("../../core/lighting/Tr2ShLightingManager.js").Tr2ShLightingManager} manager The scene's manager.
   * @returns {boolean} Whether the manager registered it.
   */
  @meta.blue.method
  @meta.adapted
  RegisterSecondaryLightSource(manager)
  {
    return manager.RegisterSecondaryLightSource(this._GetWorldTranslation(), () => this.secondaryLightingSphereRadius, this.albedoColor, EveSpaceObject2._noEmissiveColor);
  }

  /**
   * Unregisters this hull as a secondary light source (EveSpaceObject2.cpp:516-519).
   *
   * @param {import("../../core/lighting/Tr2ShLightingManager.js").Tr2ShLightingManager} manager The scene's manager.
   * @returns {boolean} Whether the manager removed it.
   */
  @meta.blue.method
  @meta.adapted
  UnregisterSecondaryLightSource(manager)
  {
    return manager.UnregisterSecondaryLightSource(this._GetWorldTranslation());
  }

  /**
   * The live translation view of the world transform, made once.
   *
   * @returns {Float32Array} Elements 12-14 of the world transform.
   */
  _GetWorldTranslation()
  {
    this._worldTranslation ??= this.worldTransform.subarray(12, 15);
    return this._worldTranslation;
  }

  /** Carbon's `s_noEmissiveColor` (EveSpaceObject2.cpp:512).
   * Zero emissive color supplied when registering secondary lighting.
   * @type {Float32Array}
   */
  static _noEmissiveColor = vec4.create();

  /**
   * Carbon EveSpaceObject2::ClearShLighting (cpp:1423-1426): drops this hull's
   * secondary-lighting contribution back to nothing.
   */
  @meta.blue.method
  @meta.implemented
  ClearShLighting()
  {
    this._psData.Get("shLightingCoefficients").fill(0);

    return true;
  }

  /**
   * Carbon EveSpaceObject2::GetParentData (cpp:1872-1885): the values an
   * attachment needs from its hull. `shLighting` is a LIVE view into the PS
   * record, exactly as Carbon hands out a raw pointer into m_psData - an
   * attachment reading it sees the hull's current coefficients.
   * @param {Object} [out] - caller-owned record, refreshed in place
   */
  @meta.blue.method
  @meta.implemented
  GetParentData(out = new IEveSpaceObject2ParentData())
  {
    mat4.copy(out.transform, this.worldTransform);
    // Carbon memsets the record and never assigns killCount on this path.
    out.killCount = 0;
    vec4.copy(out.shipData, this.spaceObjectShipData);
    vec3.copy(out.clipSphereCenter, this._psData.Get("clipSphereCenter"));
    out.clipRadiusSq = this._psData.Get("clipRadiusSq")[0];
    out.clipRadius2Sq = this._psData.Get("clipRadius2Sq")[0];
    out.clipFactor = this._psData.Get("clipSphereFactor")[0];
    out.clipFactor2 = this._psData.Get("clipSphereFactor2")[0];
    out.shLighting = this._psData.Get("shLightingCoefficients");
    vec4.copy(out.customData, this._psData.Get("customData"));

    return out;
  }

  /**
   * Carbon EveSpaceObject2::GetPerObjectStructs (cpp:1485-1490): hands a copy
   * of both records to a caller, with the VS record's customData taken from the
   * PS record as Carbon does.
   * @returns {{vs: RawData, ps: RawData}} independent copies, not live records
   */
  @meta.blue.method
  @meta.implemented
  GetPerObjectStructs(vsData = RawData.create("EveSpaceObjectVSData"), psData = RawData.create("EveSpaceObjectPSData"))
  {
    vsData.CopyFrom(this._vsData);
    psData.CopyFrom(this._psData);
    vsData.Set("customData", this._psData.Get("customData"));
    return { vs: vsData, ps: psData };
  }

  /**
   * Refreshes the world transform, then - when the update flag is on - places the observers, stamps the LOD-gated curve clock while advancing the overlay effects, runs the effect children's synchronous pass with the current placement, and updates the impact overlay; the overlay effects receive the context time as both clocks, as Carbon does.
   * Effect children borrow the root bone palette (cpp:598). Adapted: the
   * CPU animation updater advances by context delta instead of native clock.
   * @returns {boolean} False when the update flag is off; the world transform is refreshed either way.
   */
  @meta.blue.method
  @meta.adapted
  UpdateSyncronous(updateContext = null)
  {
    const time = EveSpaceObject2._GetContextValue(updateContext, "GetTime", "currentTime", "time");
    this.UpdateWorldTransform(time);
    if (!this.update)
    {
      return false;
    }

    const observerTransform = this.GetObserverTransform();
    for (const observer of this.observers)
    {
      observer?.Update(observerTransform);
    }

    // Carbon cpp:560-566: PrePhysicsAnimation reads Tr2Renderer's animation
    // clock; this port's updater steps by the frame's delta instead.
    this.animationUpdater.Update(EveSpaceObject2._GetContextValue(updateContext, "GetDeltaT"));

    // LOD-gated curve/overlay stamp (Carbon EveSpaceObject2::UpdateSyncronous:
    // ShouldUpdate(m_lodLevelWithChildren, time - m_lastCurveUpdateTime) -
    // adapted to lodLevel, m_lodLevelWithChildren is unported). Overlay effects
    // receive the context time as BOTH clocks, as Carbon does; the async pass
    // updates curve sets only on frames stamped here.
    if (EveLODHelper.ShouldUpdate(this.lodLevel, time - this._lastCurveUpdateTime))
    {
      this._lastCurveUpdateTime = time;
      for (const overlay of this.overlayEffects)
      {
        overlay?.Update(time, time);
      }
    }

    if (this.effectChildren.length)
    {
      const params = new EveChildUpdateParams();
      params.spaceObjectParent = this;
      params.ownerMaxSpeed = Number(this.maxSpeed) || 0;
      params.activationStrength = this.activationStrength;
      mat4.copy(params.localToWorldTransform, this.GetLocalToWorldTransform());
      // Carbon cpp:598/724 borrows the root mesh-bone palette in both phases.
      const { bones, boneCount } = getBoneList(this.animationUpdater);
      params.bones = bones;
      params.boneCount = boneCount;
      for (const child of this.effectChildren)
      {
        params.isVisible = this.display && (this.DisplayChildren() || !!child?.IsAlwaysOn());
        child?.UpdateSyncronous(updateContext, params);
      }
    }

    this.EnsureChildLocatorMerged();
    this.UpdateDamageLocatorFilter();
    if (this.impactOverlay) this.impactOverlay.UpdateSyncronous(updateContext, this);
    return true;
  }

  /**
   * Runs the controllers at a frequency derived from the hull's estimated pixel diameter against the context's high-detail threshold, advances the object curve sets only on frames the synchronous LOD gate stamped, then updates the transform children, the effect children and the impact overlay.
   * Carbon cpp:733-743 updates attachment lights from the prepared ship data
   * before the impact overlay; effect children borrow the root bone palette
   * at cpp:724. Adapted: JS executes this update phase serially
   * and returns the computed controller frequency; the native method is void.
   * @returns {number} The controller update frequency in 0..1, which is also handed to the effect children; 0 when the hull is not visible or the update flag is off.
   */
  @meta.blue.method
  @meta.adapted
  UpdateAsyncronous(updateContext = null)
  {
    // Carbon cpp:633: re-arm the once-per-frame palette upload.
    this._boneOffsets.AdvanceFrame();

    if (!this.update)
    {
      return 0;
    }

    const threshold = EveSpaceObject2._GetContextValue(updateContext, "GetHighDetailThreshold", "highDetailThreshold");
    const frequency = this.isVisible && threshold > 0
      ? Math.min(1, this.estimatedPixelDiameter / threshold)
      : 0;
    for (const controller of this.controllers)
    {
      controller?.Update(frequency);
    }

    // Carbon cpp:626-663: the persistent buffers are invalidated once per
    // frame, then the shader data is prepared and copied into both records.
    this._vsData.Invalidate();
    this._psData.Invalidate();

    const previousActivationStrength = this.spaceObjectShipData[1];
    this.PrepareShaderData(updateContext);
    if (previousActivationStrength !== this.spaceObjectShipData[1])
    {
      this.SetControllerVariable("ActivationStrength", this.spaceObjectShipData[1]);
    }

    this._psData.Set("shipData", this.spaceObjectShipData);
    this._vsData.Set("shipData", this.spaceObjectShipData);
    // m_psData.customData is script/SOF-driven; the model field is its author.
    this._psData.Set("customData", this.customShaderData);
    // Both records carry the same two matrices; each is written from the
    // LOGICAL transform, which produces the bytes Carbon's `m_psData.x =
    // m_vsData.x` copy of the already-transposed value produces.
    this._vsData.SetAndTranspose("worldTransform", this.worldTransform);
    this._vsData.SetAndTranspose("invWorldTransform", this.inverseWorldTransform);
    this._psData.SetAndTranspose("worldTransform", this.worldTransform);
    this._psData.SetAndTranspose("invWorldTransform", this.inverseWorldTransform);

    const shapeCenter = EveSpaceObject2._shapeCenterScratch;
    const shapeRadius = EveSpaceObject2._shapeRadiusScratch;
    this.GetShapeEllipsoid(shapeCenter, shapeRadius);
    this._vsData.Set("ellpsoidRadii", [ shapeRadius[0], shapeRadius[1], shapeRadius[2], 0 ]);
    this._vsData.Set("ellpsoidCenter", [ shapeCenter[0], shapeCenter[1], shapeCenter[2], 0 ]);

    if (this.impactOverlay)
    {
      this._psData.Set("impactDataOffset", [ this.impactOverlay.GetDataTextureOffset() ]);
    }

    for (let slot = 0; slot < EveSpaceObject2.CUSTOM_MASK_MAX; slot++)
    {
      if (this.customMasks.length > slot)
      {
        this.customMasks[slot]?.FillPerObjectData(slot, this._vsData, this._psData);
      }
      else
      {
        EveCustomMask.ZeroPerObjectData(slot, this._vsData, this._psData);
      }
    }

    // Object-level curve sets update only on frames the sync-side LOD gate
    // stamped, receiving the context time as BOTH realTime and simTime
    // (Carbon EveSpaceObject2::UpdateAsyncronous: if (m_lastCurveUpdateTime ==
    // time) (*it)->Update(time, time)).
    const time = EveSpaceObject2._GetContextValue(updateContext, "GetTime", "currentTime", "time");
    if (this._lastCurveUpdateTime === time)
    {
      for (const curveSet of this.curveSets)
      {
        curveSet.Update(time, time, updateContext.renderContext);
      }
    }

    for (const child of this.children)
    {
      child?.Update(updateContext);
    }

    if (this.effectChildren.length)
    {
      const params = new EveChildUpdateParams();
      params.spaceObjectParent = this;
      params.ownerMaxSpeed = Number(this.maxSpeed) || 0;
      params.activationStrength = this.activationStrength;
      params.controllerUpdateFrequency = frequency;
      mat4.copy(params.localToWorldTransform, this.GetLocalToWorldTransform());
      // Carbon cpp:598/724 borrows the root mesh-bone palette in both phases.
      const { bones, boneCount } = getBoneList(this.animationUpdater);
      params.bones = bones;
      params.boneCount = boneCount;
      for (const child of this.effectChildren)
      {
        params.isVisible = this.display && (this.DisplayChildren() || !!child?.IsAlwaysOn());
        child?.UpdateAsyncronous(updateContext, params);
      }
    }

    // Carbon EveSpaceObject2.cpp:733-743: update every attachment's lights
    // before the impact overlay, using the current borrowed bone palette.
    if (this.attachments.length)
    {
      const { bones, boneCount } = getBoneList(this.animationUpdater);
      for (const attachment of this.attachments)
      {
        attachment.UpdateLights(this.worldTransform, bones, boneCount, this.spaceObjectShipData[1], this.spaceObjectShipData[0]);
      }
    }

    if (this.impactOverlay) this.impactOverlay.UpdateAsyncronous(updateContext, this);
    return frequency;
  }

  /**
   * Updates Carbon's visibility, pixel-size, and mesh-LOD state, then forwards
   * visibility to the explicitly owned visual branches.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Native impostor, raytracing, and audio-emitter realization are not ported yet; graph visibility and LOD state are preserved.")
  UpdateVisibility(updateContext = null, _parentTransform = EveSpaceObject2._identityTransform)
  {
    this.isVisible = false;
    this._isMeshVisible = false;
    this._isInFrustum = false;
    if (!this.display)
    {
      return false;
    }

    this.lodLevel = Tr2Lod.TR2_LOD_LOW;
    this._lodLevelWithChildren = Tr2Lod.TR2_LOD_LOW;
    this._impostorMode = false;

    const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
    const lowThreshold = EveSpaceObject2._GetContextValue(updateContext, "GetLowDetailThreshold", "lowDetailThreshold");
    const mediumThreshold = EveSpaceObject2._GetContextValue(updateContext, "GetMediumDetailThreshold", "mediumDetailThreshold");
    const visibilityThreshold = EveSpaceObject2._GetContextValue(updateContext, "GetVisibilityThreshold", "visibilityThreshold");
    const lodFactor = EveSpaceObject2._GetContextValue(updateContext, "GetLodFactor", "lodFactor") || 1;

    if (this.boundingSphereRadius > 0 && this._boundingSphereWorldRadius > 0)
    {
      EveSpaceObject2._SetSphere(
        EveSpaceObject2._worldSphere,
        this.modelWorldPosition,
        this._boundingSphereWorldRadius
      );
      if (frustum?.IsSphereVisible(EveSpaceObject2._worldSphere) !== false)
      {
        this.EstimatePixelDiameter(frustum);
        this._isMeshVisible = true;
      }
    }

    // Bones so a bone-parented attachment's bounds follow its bone, which is
    // what drives the per-bone AABB union (Carbon BoundingBox.cpp:815-833).
    const { bones, boneCount } = getBoneList(this.animationUpdater);

    for (const attachment of this.attachments)
    {
      if (!attachment) continue;
      if (attachment.UpdateVisibility(updateContext, this.worldTransform, bones, boneCount))
      {
        this._isMeshVisible = true;
        this.isVisible = true;
      }
    }

    if (this.DisplayChildren())
    {
      for (const child of this.children)
      {
        child?.UpdateVisibility(updateContext, this.worldTransform);
      }
    }

    if (this.GetBoundingSphere(EveSpaceObject2._worldSphere, 1))
    {
      this._isInFrustum = frustum?.IsSphereVisible(EveSpaceObject2._worldSphere) !== false;
      this.estimatedPixelDiameterWithChildren = EveSpaceObject2._GetPixelSize(frustum, EveSpaceObject2._worldSphere);
      if (this._isInFrustum && this.estimatedPixelDiameterWithChildren >= visibilityThreshold)
      {
        this.isVisible = true;
      }
    }

    if (this.isVisible)
    {
      if (this.estimatedPixelDiameter > mediumThreshold) this.lodLevel = Tr2Lod.TR2_LOD_HIGH;
      else if (this.estimatedPixelDiameter > lowThreshold) this.lodLevel = Tr2Lod.TR2_LOD_MEDIUM;

      if (this.estimatedPixelDiameterWithChildren > mediumThreshold) this._lodLevelWithChildren = Tr2Lod.TR2_LOD_HIGH;
      else if (this.estimatedPixelDiameterWithChildren > lowThreshold) this._lodLevelWithChildren = Tr2Lod.TR2_LOD_MEDIUM;
      else this._lodLevelWithChildren = Tr2Lod.TR2_LOD_LOW;
    }

    for (const observer of this.observers)
    {
      const target = observer?.GetObserver() ?? observer?.observer;
      target?.SetVisibility?.(this.isVisible);
    }
    for (const child of this.effectChildren)
    {
      child?.UpdateVisibility(updateContext, this.worldTransform, this._lodLevelWithChildren);
    }

    // Carbon cpp:1694-1706: the decals take one ParentData built for the pass,
    // after the mesh bone palette when the updater has one.
    if (this._isMeshVisible)
    {
      const parentData = this.GetParentData(this._decalParentData);
      for (const decal of this.decals)
      {
        if (boneCount) decal.SetBoneMatrix(bones, boneCount);
        decal.UpdateVisibility(updateContext, parentData);
      }
    }

    // Carbon EveSpaceObject2.cpp:1715-1716 sizes EVERY object, mesh or not: a
    // mesh-less modular object still draws its impacts at this LOD.
    EveSpaceObject2._SetSphere(
      EveSpaceObject2._worldSphere,
      this.modelWorldPosition,
      this._boundingSphereWorldRadius
    );
    this._meshScreenSize = EveSpaceObject2._GetEstimatedPixelSize(frustum, EveSpaceObject2._worldSphere) * lodFactor;
    if (!this._allowLodSelection) this._meshScreenSize = Infinity;
    if (this.mesh && this._boundingSphereWorldRadius > 0)
    {
      this.mesh.UseWithScreenSize?.(this._meshScreenSize, this._boundingSphereWorldRadius);
    }
    return this.isVisible;
  }

  /**
   * Carbon RegisterWithQuadRenderer (EveSpaceObject2.cpp:2224-2234): the
   * effect children and the attachments (sprite and spotlight sets) register
   * their quad effects.
   *
   * @param {object} quadRenderer The scene's Tr2QuadRenderer.
   */
  @meta.blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    for (const child of this.effectChildren) child?.RegisterWithQuadRenderer(quadRenderer);
    for (const attachment of this.attachments) attachment?.RegisterWithQuadRenderer(quadRenderer);
  }

  /**
   * Carbon AddQuadsToQuadRenderer (EveSpaceObject2.cpp:2242-2264): each
   * attachment adds its quads in world space, with the ship data's activation
   * (y) and booster gain (x); the effect children follow the child display
   * rule.
   *
   * @param {object} frustum The frame's frustum.
   * @param {object} quadRenderer The scene's Tr2QuadRenderer.
   */
  @meta.blue.method
  @meta.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (!this.isVisible || !this.display || this._impostorMode) return;

    const { bones, boneCount } = getBoneList(this.animationUpdater);

    for (const attachment of this.attachments)
    {
      attachment?.AddToQuadRenderer(quadRenderer, this.worldTransform, this.spaceObjectShipData[1], this.spaceObjectShipData[0], bones, boneCount);
    }

    const displayChildren = this.DisplayChildren();
    for (const child of this.effectChildren)
    {
      if (child && (displayChildren || child.IsAlwaysOn())) child.AddQuadsToQuadRenderer(frustum, quadRenderer);
    }
  }

  /** Collects the hull and explicitly owned Carbon child/decal renderables. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Impostor submission and decal mesh caches are not ported yet; Trinity returns the backend-neutral renderable graph.")
  GetRenderables(out = [])
  {
    if (!this.display || !this.isVisible) return out;
    if (this._allowLodSelection && this._isMeshVisible)
    {
      this.mesh?.GetBoundingBox?.(this._localAabbMin, this._localAabbMax);
    }
    if (this.mesh && this._isMeshVisible && this.mesh.IsLoading?.() !== true)
    {
      out.push(this);
    }
    else if (!this.mesh && this.impactOverlay && this._isMeshVisible)
    {
      // A mesh-less modular object still draws its impacts (Carbon
      // EveSpaceObject2.cpp:1545-1548).
      out.push(this);
    }
    if (this.DisplayChildren())
    {
      for (const child of this.children) child?.GetRenderables(out);
    }
    for (const child of this.effectChildren)
    {
      if (this.DisplayChildren() || child?.IsAlwaysOn()) child?.GetRenderables(out);
    }
    if (this.mesh && this._isMeshVisible)
    {
      // Not optional-chained: a mesh HAS a geometry resource accessor and a
      // decal HAS GetRenderables. Guarding them turned a missing method into a
      // decal that drew nothing and reported nothing.
      const geometryResource = this.mesh.GetGeometryResource();
      if (geometryResource)
      {
        for (const decal of this.decals)
        {
          decal.GetRenderables(out, null, geometryResource, this._meshScreenSize);
        }
      }
    }
    return out;
  }

  /** Carbon ITr2Renderable contract (EveSpaceObject2.cpp:1097-1140): activated
   * attachments recurse, the impact overlay contributes, the hull mesh delegates
   * per batch type, and TRANSPARENT routes through the distance-sorted area
   * path, then GetBatchesFromOverlayVector adds the overlay batches. Adapted:
   * the view position arrives via the appended render-context argument instead
   * of Carbon's renderer global. */
  @meta.blue.method
  @meta.adapted
  GetBatches(batches, batchType, perObjectData, reason, renderContext = null)
  {
    if (!this.mesh)
    {
      // Mesh-less objects (modular ships) still render their impact effects
      // (Carbon EveSpaceObject2.cpp:1127-1135).
      if (!this.impactOverlay) return false;
      return this.impactOverlay.GetBatches(batches, batchType, perObjectData, this._meshScreenSize);
    }
    if (this.mesh.display === false) return false;

    // Returns whether any batch was committed (JS addition; Carbon returns
    // void). The O(1) accumulator count makes the delta check free.
    const committedBefore = batches.GetBatchCount?.() ?? 0;

    if (this.activationStrength !== 0)
    {
      for (const attachment of this.attachments)
      {
        if (!attachment) continue;
        attachment.GetBatches(batches, batchType, perObjectData, reason);
      }
    }

    this.impactOverlay?.GetBatches?.(batches, batchType, perObjectData, this._meshScreenSize);

    const areas = this.mesh.GetAreas(batchType);
    if (areas)
    {
      if (batchType !== TriBatchType.TRIBATCHTYPE_TRANSPARENT)
      {
        // Carbon EveSpaceObject2.cpp:1130 passes the screen size resolved in
        // UpdateVisibility, so the mesh draws the LOD this object was culled
        // at; reverseWinding is left default on every EveSpaceObject2 path.
        this.mesh.GetBatches(batches, areas, perObjectData, this._meshScreenSize);
      }
      else
      {
        this._GetSortedTransparentBatches(areas, batches, perObjectData, renderContext);
      }
    }

    // add overlay effect batches (Carbon calls this for every batch type)
    this.GetBatchesFromOverlayVector(batches, perObjectData, batchType, this.mesh);

    return (batches.GetBatchCount?.() ?? 0) > committedBefore;
  }

  // Carbon GetSortedBatchesFromMeshAreaVector (EveSpaceObject2.cpp:57-121):
  // object-space area bounding-box centers -> world space -> squared distance to
  // the view position, sorted back-to-front (descending), committed in that
  // order into the order-preserving TRANSPARENT accumulator. Bounding boxes come
  // from the geometry resource when it exposes them; a failed lookup keeps
  // Carbon's origin-center fallback.

  /**
   * Commits the mesh's transparent areas back-to-front, ordering them by the
   * squared distance from the view position to each area's world-space
   * bounding-box center and falling back to the object origin when the geometry
   * resource cannot supply a box.
   */
  _GetSortedTransparentBatches(areas, batches, perObjectData, renderContext)
  {
    const geometry = this.mesh.GetGeometryResource() ?? null;
    const viewPosition = renderContext?.GetViewPosition();
    const meshIndex = this.mesh.meshIndex ?? 0;

    // Carbon resolves the LOD once for the whole sorted list (cpp:72) and
    // returns early when there is none. This port keeps collecting so a
    // GPU-free graph still produces batches; the LOD only supplies draw
    // arguments.
    const lod = geometry?.GetMeshLod?.(meshIndex, this._meshScreenSize) ?? null;

    const sorted = [];
    for (const area of areas)
    {
      if (!area || area.GetDisplay?.() === false) continue;

      vec3.set(TRANSPARENT_CENTER, 0, 0, 0);
      if (geometry?.GetAreaBoundingBox?.(meshIndex, area.GetIndex(), TRANSPARENT_AABB_MIN, TRANSPARENT_AABB_MAX))
      {
        vec3.add(TRANSPARENT_CENTER, TRANSPARENT_AABB_MIN, TRANSPARENT_AABB_MAX);
        vec3.scale(TRANSPARENT_CENTER, TRANSPARENT_CENTER, 0.5);
      }
      vec3.transformMat4(TRANSPARENT_CENTER, TRANSPARENT_CENTER, this.worldTransform);

      const dx = (viewPosition?.[0] ?? 0) - TRANSPARENT_CENTER[0];
      const dy = (viewPosition?.[1] ?? 0) - TRANSPARENT_CENTER[1];
      const dz = (viewPosition?.[2] ?? 0) - TRANSPARENT_CENTER[2];
      sorted.push({ area, distance: dx * dx + dy * dy + dz * dz });
    }

    sorted.sort((a, b) => b.distance - a.distance);

    for (const entry of sorted)
    {
      const area = entry.area;
      if (!area.GetMaterialInterface?.()) continue;
      const batch = this.mesh.CreateGeometryBatch(geometry, area, perObjectData, false, lod);
      if (batch) batches.Commit(batch);
    }
  }

  /** Rebuilds the cached overlay/shadow area-block lists from the current mesh
   * (Carbon RebuildCachedData, EveSpaceObject2.cpp:2077-2097, triggered there by
   * the geometry-resource load callback). TYPE_ALL = shadow-casting OPAQUE +
   * TRANSPARENT + DECAL areas; TYPE_OPAQUEONLY = shadow-casting OPAQUE; the
   * shadow list groups OPAQUE areas by shared material. All coalesced. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon rebuilds from the geometry-resource notify callback; the GPU-free port rebuilds lazily on first batch use from the mesh areas alone.")
  RebuildCachedData()
  {
    this.ReleaseCachedData();
    if (!this.mesh) return;

    const all = this._overlayMeshAreaBlocks[OVERLAY_TYPE_ALL];
    this.mesh.CollectAreaBlocks(all, TriBatchType.TRIBATCHTYPE_OPAQUE);
    this.mesh.CollectAreaBlocks(all, TriBatchType.TRIBATCHTYPE_TRANSPARENT);
    this.mesh.CollectAreaBlocks(all, TriBatchType.TRIBATCHTYPE_DECAL);
    this.mesh.CollectAreaBlocks(
      this._overlayMeshAreaBlocks[OVERLAY_TYPE_OPAQUEONLY], TriBatchType.TRIBATCHTYPE_OPAQUE);
    for (const blocks of this._overlayMeshAreaBlocks)
    {
      TriRenderBatchAreaBlock.Optimize(blocks);
    }

    this.mesh.CollectAreaBlocksWithSharedMaterials(
      this._shadowMeshOpaqueAreas, TriBatchType.TRIBATCHTYPE_OPAQUE);
    for (const collector of this._shadowMeshOpaqueAreas)
    {
      collector.Optimize();
    }
    this._cachedAreaBlocksBuilt = true;
  }

  /**
   * Drops the cached overlay and shadow area-block lists so the next batch call
   * rebuilds them from the current mesh.
   */
  @meta.blue.method
  @meta.implemented
  ReleaseCachedData()
  {
    for (const blocks of this._overlayMeshAreaBlocks)
    {
      blocks.length = 0;
    }
    this._shadowMeshOpaqueAreas.length = 0;
    this._cachedAreaBlocksBuilt = false;
  }

  /**
   * Rebuilds the cached area blocks on first use when a mesh is attached; Carbon
   * instead rebuilds them from the geometry-resource load callback.
   */
  _EnsureCachedAreaBlocks()
  {
    if (!this._cachedAreaBlocksBuilt && this.mesh) this.RebuildCachedData();
  }

  /**
   * Carbon EveSpaceObject2::GetPickingBatches (cpp:3645-3675): collects the
   * geometry a pick pass should test, by mask. It is ordinary batch collection
   * - the pick itself is an engine pass that renders these and reads IDs back.
   *
   * The OPAQUE bit deliberately pulls in the transparent and additive OVERLAY
   * effects too, so a cloaking hull stays pickable.
   *
   * @param {Object} batches - the picking accumulator
   * @param {Number} pickTypes - a Tr2PickType mask
   * @param {Object} perObjectData - this hull's per-object record
   */
  @meta.blue.method
  @meta.implemented
  GetPickingBatches(batches, pickTypes = TR2_PICK_TYPE_DEFAULT, perObjectData = null)
  {
    if (pickTypes & Tr2PickType.PICK_TYPE_PICKING)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_PICKING, perObjectData);
    }

    if (pickTypes & Tr2PickType.PICK_TYPE_OPAQUE)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData);
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_DECAL, perObjectData);
      this.GetBatchesFromOverlayVector(batches, perObjectData, TriBatchType.TRIBATCHTYPE_TRANSPARENT, this.mesh);
      this.GetBatchesFromOverlayVector(batches, perObjectData, TriBatchType.TRIBATCHTYPE_ADDITIVE, this.mesh);
    }

    if (pickTypes & Tr2PickType.PICK_TYPE_TRANSPARENT)
    {
      // Carbon takes the mesh's OWN areas here rather than going through
      // GetBatches, and returns early when the mesh is absent or hidden - so a
      // hidden mesh suppresses the transparent pass only, not the ones above.
      if (!this.mesh || this.mesh.display === false)
      {
        return true;
      }

      for (const batchType of [ TriBatchType.TRIBATCHTYPE_TRANSPARENT, TriBatchType.TRIBATCHTYPE_ADDITIVE ])
      {
        const areas = this.mesh.GetAreas(batchType);

        if (areas)
        {
          this.mesh.GetBatches?.(batches, areas, perObjectData);
        }
      }
    }

    return true;
  }

  /**
   * Carbon EveSpaceObject2::GetID (cpp:3640-3643): a picked area resolves to
   * the hull itself, so the area index is deliberately ignored.
   * @param {Number} [_areaID] - the picked area, unused by this class
   * @returns {EveSpaceObject2} this
   */
  @meta.blue.method
  @meta.implemented
  GetID(_areaID = 0)
  {
    return this;
  }

  /** Carbon GetShadowBatches (EveSpaceObject2.cpp:1143-1184): one batch per
   * cached shared-material OPAQUE area block, using the area's own material.
   * Carbon bakes LOD draw args at this point; doing the same is not ported, so
   * they travel as a geometry source descriptor and shadowPixelSize goes unused
   * until LOD selection is ported. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("LOD draw args are left as a geometry source descriptor and primitive-count gating is not ported yet; Carbon bakes both here.")
  GetShadowBatches(batches, perObjectData, _shadowPixelSize)
  {
    if (!this.mesh || this.mesh.display === false) return false;
    this._EnsureCachedAreaBlocks();

    const geometry = this.mesh.GetGeometryResource() ?? null;
    const meshIndex = this.mesh.meshIndex ?? 0;

    let committed = false;
    for (const collector of this._shadowMeshOpaqueAreas)
    {
      const material = collector.shaderMaterial;
      if (!material) continue;
      for (const block of collector.areaBlockVector)
      {
        const batch = new Tr2RenderBatch();
        batch.SetMaterial(material);
        if (!batch.IsValid()) continue;
        batch.SetGeometrySource(geometry, meshIndex, block.startIndex, block.count, false);
        batch.SetPerObjectData(perObjectData ?? null);
        committed = batches.Commit(batch) || committed;
      }
    }
    return committed;
  }

  /** Carbon GetBatchesFromOverlayVector (EveSpaceObject2.cpp:1236-1265): the
   * impact overlay's armor-damage shader draws over the TYPE_ALL blocks at
   * maximum priority, then each overlay effect draws over its overlay-type
   * blocks, through the shared EmitDamageOverlayBatches/EmitOverlayBatches.
   * The cached blocks are rebuilt lazily (see RebuildCachedData). */
  @meta.blue.method
  @meta.adapted
  GetBatchesFromOverlayVector(batches, perObjectData, batchType, mesh)
  {
    const impactEffect = this.impactOverlay?.GetArmorDamageShader(batchType) ?? null;
    if (!impactEffect && !this.overlayEffects.length) return false;
    this._EnsureCachedAreaBlocks();

    const geometry = mesh.GetGeometryResource();
    if (!geometry || !geometry.IsGood()) return false;

    const meshIndex = mesh.GetMeshIndex();
    const lod = geometry.GetMeshLod(meshIndex, this._meshScreenSize);
    if (!lod) return false;

    let committed = false;
    if (impactEffect)
    {
      committed = EmitDamageOverlayBatches(
        batches, perObjectData, impactEffect, this._overlayMeshAreaBlocks, geometry, meshIndex, lod) || committed;
    }

    committed = EmitOverlayBatches(
      batches, perObjectData, batchType, this.overlayEffects,
      this._overlayMeshAreaBlocks, geometry, meshIndex, lod) || committed;
    return committed;
  }

  /**
   * Reports whether the hull mesh has transparent areas or any overlay effect
   * does, which tells the renderer to route this object through the sorted
   * transparent pass.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Portable mesh area access replaces Carbon's native mesh-area vectors.")
  HasTransparentBatches()
  {
    if (!this.mesh) return false;
    if ((this.mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT)?.length ?? 0) > 0) return true;

    for (const overlay of this.overlayEffects)
    {
      if (overlay?.HasTransparentArea?.()) return true;
    }
    return false;
  }

  /**
   * Returns the distance from the render context's view position to the hull
   * world translation, used to order transparent renderables back-to-front.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon reads the Tr2Renderer view-position global; the relocated camera state arrives via the threaded render context.")
  GetSortValue(renderContext = null)
  {
    const viewPosition = renderContext?.GetViewPosition();
    const x = (viewPosition?.[0] ?? 0) - this.worldTransform[12];
    const y = (viewPosition?.[1] ?? 0) - this.worldTransform[13];
    const z = (viewPosition?.[2] ?? 0) - this.worldTransform[14];
    return Math.hypot(x, y, z);
  }

  /**
   * Uploads this frame's bone palette to the BoneTransforms ring, stamps where
   * it landed into the per-object record, and returns the record.
   *
   * Carbon `GetPerObjectData` (cpp:1419-1440). The offsets are ring ELEMENT
   * offsets the upload returns - the skinned vertex shader indexes the ring at
   * blend index + boneOffsets[0] - and before any upload they are
   * INVALID_OFFSET, Carbon's no-draw state. Adapted: Carbon allocates a pooled
   * Tr2PerObjectDataWithPersistentBuffers from the accumulator; this port
   * returns its two persistent RawData records directly.
   */
  @meta.blue.method
  @meta.adapted
  GetPerObjectData(_accumulator = null)
  {
    if (this.animationUpdater.IsInitialized())
    {
      const boneCount = this.animationUpdater.GetMeshBoneCount();
      this._vsData.SetIndex("boneOffsets", 2, [ boneCount ]);
      // Carbon Tr2RingBuffer::GetInstance<Float4x3>(); EveSpaceScene registers
      // the same arena as BoneTransforms.
      const ring = Tr2RingBuffer.GetInstance("Float4x3", 48, Tr2RenderContext_GetMainThreadRenderContext());
      this._boneOffsets.UploadTransforms(ring, this.animationUpdater.GetMeshBoneMatrixList(), boneCount);
    }
    this._vsData.SetIndex("boneOffsets", 0, [ this._boneOffsets.GetCurrentFrameOffset() ]);
    this._vsData.SetIndex("boneOffsets", 1, [ this._boneOffsets.GetPreviousFrameOffset() ]);
    this._vsData.Set("customData", this._psData.Get("customData"));

    return { vs: this._vsData, ps: this._psData };
  }

  /** Carbon forwards the shadow pass to the same per-object record. */
  @meta.blue.method
  @meta.implemented
  GetShadowPerObjectData(accumulator = null)
  {
    return this.GetPerObjectData(accumulator);
  }

  /** Carbon EveSpaceObject2::GetLights (cpp:3536-3555): display gate only
   * (no lights-empty early-out, unlike EveChildMesh), then per light
   * AddLight(manager, worldTransform, 1, bones, boneCount) FOLLOWED by
   * SetBrightnessMultiplier(m_activationStrength) - the order is contract:
   * the submission uses the multiplier stamped on the PREVIOUS pass (first
   * pass uses the Tr2Light default 1) - one frame of activation-strength
   * lag, preserved verbatim. cpp:3554's dead `DisplayChildren()` local is
   * not ported. */
  @meta.blue.method
  @meta.implemented
  GetLights(lightManager)
  {
    if (!this.display)
    {
      return;
    }

    // cpp:3545-3547 - Tr2GrannyAnimationUtils::GetBoneList, so a bone-parented
    // light is placed by its bone rather than by the object transform alone.
    const { bones, boneCount } = getBoneList(this.animationUpdater);

    for (const light of this.lights)
    {
      light?.AddLight(lightManager, this.worldTransform, 1, bones, boneCount);
      light?.SetBrightnessMultiplier?.(this.activationStrength);
    }
  }

  /**
   * Carbon EveSpaceObject2::IsCastingShadow (cpp:2252-2274): applies the
   * display, world-sphere and reflection gates, then tests the realized sphere
   * against the supplied shadow frustum. Carbon's float& result is represented
   * by an optional length-one array.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The optional length-one array replaces Carbon's float& sizeInShadow out-parameter.")
  IsCastingShadow(cameraFrustum, shadowFrustum, renderReason, sizeInShadowOut = null)
  {
    if (!this.display || this._boundingSphereWorldRadius <= 0)
    {
      return false;
    }
    if (renderReason === Tr2RenderReason.TR2RENDERREASON_REFLECTION &&
      !ShouldReflect(this.reflectionMode))
    {
      return false;
    }

    EveSpaceObject2._SetSphere(
      EveSpaceObject2._worldSphere,
      this.modelWorldPosition,
      this._boundingSphereWorldRadius
    );

    let sizeInShadow = 0;
    if (sizeInShadowOut)
    {
      sizeInShadowOut[0] = 0;
    }
    if (shadowFrustum.IsVisible(cameraFrustum, EveSpaceObject2._worldSphere))
    {
      sizeInShadow = shadowFrustum.GetSizeInShadow(EveSpaceObject2._worldSphere);
      if (sizeInShadowOut)
      {
        sizeInShadowOut[0] = sizeInShadow;
      }
    }
    return sizeInShadow > 15;
  }

  /** Carbon EveSpaceObject2::RegisterComponents (cpp:3568-3609): registers its
   * own components and its children with the scene registration container "so
   * we don't have to traverse the tree every frame". RegisterAudioGeometry
   * (cpp:3572-3575) is audio-engine-owned and unported. Gate m_display. */
  @meta.blue.method
  @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      if (this.lights.length)
      {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }

      if (ShouldReflect(this.reflectionMode))
      {
        registry.RegisterComponent(EveComponentType.ReflectionRenderable, this);
      }

      if (this.castShadow)
      {
        registry.RegisterComponent(EveComponentType.ShadowCaster, this);
      }

      for (const child of this.effectChildren)
      {
        child?.Register(registry);
      }

      for (const attachment of this.attachments)
      {
        attachment?.Register(registry);
      }
    }
  }

  /** Carbon EveSpaceObject2::UnRegisterComponents (cpp:3615-3638): forwards
   * the un-registration to the children only - EveEntity::UnRegister already
   * called UnRegisterAllComponents(this) first (EveEntity.cpp:90) - and does
   * not re-check display. UnregisterAudioGeometry (cpp:3617) is
   * audio-engine-owned and unported. */
  @meta.blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const child of this.effectChildren)
      {
        child?.UnRegister(registry);
      }

      for (const attachment of this.attachments)
      {
        attachment?.UnRegister(registry);
      }
    }
  }

  /**
   * Reports whether children and effect children should be shown; always true on
   * the base hull, subclasses gate it on activation state.
   */
  @meta.blue.method
  @meta.implemented
  DisplayChildren()
  {
    return true;
  }

  /**
   * Returns the transform placement observers are attached to - the live hull
   * world transform.
   */
  @meta.blue.method
  @meta.implemented
  GetObserverTransform()
  {
    return this.worldTransform;
  }

  /**
   * Returns the transform effect children are placed against - the live hull
   * world transform, not a copy.
   */
  @meta.blue.method
  @meta.implemented
  GetLocalToWorldTransform()
  {
    return this.worldTransform;
  }

  /** Carbon's non-updating model-center query. */
  @meta.blue.method
  @meta.implemented
  GetModelCenterWorldPosition(out)
  {
    vec3.transformMat4(out, this.boundingSphereCenter, this.worldTransform);
  }

  /**
   * Returns the live curve-sampled ball position; the array is the object's own
   * field and is rewritten by the next transform update.
   */
  @meta.blue.method
  @meta.implemented
  GetWorldPosition()
  {
    return this.worldPosition;
  }

  /**
   * Returns the live curve-sampled ball rotation, which excludes the model
   * rotation curve; the quaternion is the object's own field and is rewritten by
   * the next transform update.
   */
  @meta.blue.method
  @meta.implemented
  GetWorldRotation()
  {
    return this.worldRotation;
  }

  /**
   * Finds a sound emitter by observer name on this hull and then recursively in
   * the effect children, returning null when no emitter carries the name.
   */
  @meta.blue.method
  @meta.implemented
  FindSoundEmitter(name)
  {
    const target = String(name ?? "");
    for (const observer of this.observers)
    {
      if (observer?.name === target)
      {
        return typeof observer.GetObserver === "function"
          ? observer.GetObserver()
          : observer.observer ?? null;
      }
    }
    for (const child of this.effectChildren)
    {
      const emitter = child?.FindSoundEmitter?.(target);
      if (emitter)
      {
        return emitter;
      }
    }
    return null;
  }

  /**
   * Sets the mute flag and pushes it to every effect child and placement
   * observer.
   */
  @meta.blue.method
  @meta.adapted
  SetMute(mute)
  {
    this.mute = !!mute;
    for (const child of this.effectChildren)
    {
      child?.SetMute?.(this.mute);
    }
    for (const observer of this.observers)
    {
      observer?.SetMute(this.mute);
    }
  }

  /**
   * Plays an animation with explicit loop, start, and speed settings
   * (Carbon PlayAnimationEx, MAP_METHOD_AND_WRAP_OPTIONAL_ARGS).
   */
  @meta.blue.method
  @meta.adapted
  PlayAnimationEx(animName, loopCount, start, speed, clearWhenDone = true)
  {
    this._PlayAnimation(animName, true, loopCount, start, speed, clearWhenDone);
  }

  /**
   * Calculates the skinned bounding box under a transform (CMF path: the
   * local box corners transformed with perspective divide). The granny path
   * is unported. Returns an inverted-empty { min, max } box when dynamic
   * bounds are disabled, as Carbon's BoundingBoxInitialize does.
   */
  @meta.blue.method
  @meta.adapted
  CalculateSkinnedBoundingBoxFromTransform(transform)
  {
    const min = vec3.fromValues(Infinity, Infinity, Infinity);
    const max = vec3.fromValues(-Infinity, -Infinity, -Infinity);
    if (this.dynamicBoundingSphereEnabled && this.mesh?.GetGeometryResource()?.IsUsingCMF?.())
    {
      const { min: localMin, max: localMax } = this.GetLocalBoundingBox();
      const corner = vec3.create();
      for (let index = 0; index < 8; index++)
      {
        vec3.set(
          corner,
          index & 1 ? localMax[0] : localMin[0],
          index & 2 ? localMax[1] : localMin[1],
          index & 4 ? localMax[2] : localMin[2]
        );
        vec3.transformMat4(corner, corner, transform);
        vec3.min(min, min, corner);
        vec3.max(max, max, corner);
      }
    }
    return { min, max };
  }

  /**
   * Calculates the skinned bounding sphere (CMF path: the current bounding
   * sphere; granny path unported). Returns (0,0,0,-1) when dynamic bounds
   * are disabled.
   */
  @meta.blue.method
  @meta.adapted
  CalculateSkinnedBoundingSphere(out = vec4.create())
  {
    if (this.dynamicBoundingSphereEnabled && this.mesh?.GetGeometryResource()?.IsUsingCMF?.())
    {
      const center = this.GetBoundingSphereCenter();
      return vec4.set(out, center[0], center[1], center[2], this.GetBoundingSphereRadius());
    }
    return vec4.set(out, 0, 0, 0, -1);
  }

  /** Marks the derived locator graph stale and restarts any requested filter. */
  @meta.blue.method
  @meta.implemented
  InvalidateMergedLocators(reason = "structure")
  {
    this._mergedLocatorSetsDirty = true;
    this._ReleaseDamageFilterSessions();
    if (reason === "structure" || this.damageLocatorAutoFilterEnabled || this._damageFilterState !== 0)
    {
      this._damageFilterState = 1;
    }
  }

  /**
   * Rebuilds the locator sets visible on this object from its own authored sets
   * plus the sets owned by child meshes and nested child containers.
   */
  @meta.blue.method
  @meta.adapted
  EnsureChildLocatorMerged()
  {
    if (!this._mergedLocatorSetsDirty) return;

    this._mergedLocatorSets.length = 0;
    this._mergedDamageLocatorSources.length = 0;
    const childSources = [];
    const identity = mat4.create();
    for (const child of this.effectChildren) child.CollectOwnedLocatorSets(identity, childSources);

    for (const authored of this.locatorSets)
    {
      const locators = authored.GetLocators();
      if (!locators.length) continue;
      const copy = new EveLocatorSets();
      copy.Set(authored.GetName(), locators);
      this._mergedLocatorSets.push(copy);
    }

    const locatorTransform = mat4.create();
    const transformed = mat4.create();
    for (const source of childSources)
    {
      const sourceSet = source.sets;
      let merged = this._mergedLocatorSets.find(set => set.HasName(sourceSet.GetName()));
      if (!merged)
      {
        merged = new EveLocatorSets();
        merged.SetName(sourceSet.GetName());
        this._mergedLocatorSets.push(merged);
      }

      const start = merged.locators.length;
      for (const locator of sourceSet.GetLocators())
      {
        mat4.fromRotationTranslationScale(
          locatorTransform, locator.direction, locator.position, locator.scale);
        // Carbon row-vector locator * childToObject => gl-matrix childToObject * locator.
        mat4.multiply(transformed, source.childToObject, locatorTransform);

        const result = new Locator();
        // Carbon: Decompose(scale, direction, position, transform) (EveSpaceObject2.cpp:1932).
        mat4.decomposeCarbon(transformed, result.direction, result.position, result.scale);
        result.boneIndex = -1;
        result.partTag = Number(locator.partTag) >>> 0;
        merged.locators.push(result);
      }

      if (sourceSet.HasName(EveSpaceObject2._damageLocatorSetName))
      {
        this._mergedDamageLocatorSources.push({
          owner: source.owner,
          // The SOURCE's tag, not the owner's (Carbon EveSpaceObject2.cpp:1941):
          // one shared instanced child owns many parts' sets.
          partTag: source.partTag,
          start,
          count: sourceSet.GetLocators().length,
          // Carbon LocatorSourceRange.childToObject (EveSpaceObject2.cpp:1944):
          // lets GetLocatorInObjectSpace pose merged damage locators against
          // the owning child's skeleton, then lift them into object space.
          childToObject: source.childToObject
        });
      }
    }

    this._mergedLocatorSetsDirty = false;
  }

  /** Releases every active raycast preparation session used by damage filtering. */
  _ReleaseDamageFilterSessions()
  {
    if (this._damageFilterState !== 2) return;
    for (const occluder of this._damageFilterOccluders) occluder.geometry.ResetRayCaster();
    this._damageFilterOccluders.length = 0;
    this._damageFilterAreas.length = 0;
  }

  /**
   * Collects prepared hull and child geometry and opens raycast sessions
   * (Carbon CollectOccluders, EveSpaceObject2.cpp:1960-2028): occluders carry
   * areaStart/areaCount ranges into the shared _damageFilterAreas pool, and
   * records with no matching areas are skipped rather than raycast whole.
   */
  _CollectDamageFilterOccluders()
  {
    this._damageFilterOccluders.length = 0;
    this._damageFilterAreas.length = 0;
    if (this.mesh)
    {
      const geometry = this.mesh.GetGeometryResource();
      if (geometry)
      {
        if (!geometry.IsPrepared())
        {
          return false;
        }
        if (geometry.IsGood())
        {
          const areaStart = this._damageFilterAreas.length;
          EveCollectAreas(TriBatchType.TRIBATCHTYPE_OPAQUE, this.mesh, this._damageFilterAreas);
          const areaCount = this._damageFilterAreas.length - areaStart;
          if (areaCount !== 0)
          {
            this._damageFilterOccluders.push({
              geometry,
              fromObject: mat4.create(),
              areaStart,
              areaCount
            });
          }
        }
      }
    }

    const childGeometry = [];
    const identity = mat4.create();
    for (const child of this.effectChildren)
    {
      child.CollectOwnedGeometry(
        TriBatchType.TRIBATCHTYPE_OPAQUE, identity, childGeometry, this._damageFilterAreas);
    }

    for (const source of childGeometry)
    {
      if (source.areaCount === 0) continue;
      if (!source.geometry.IsPrepared())
      {
        this._damageFilterOccluders.length = 0;
        this._damageFilterAreas.length = 0;
        return false;
      }
      if (!source.geometry.IsGood()) continue;

      const fromObject = mat4.create();
      if (!mat4.invert(fromObject, source.childToObject)) mat4.identity(fromObject);
      this._damageFilterOccluders.push({
        geometry: source.geometry,
        fromObject,
        areaStart: source.areaStart,
        areaCount: source.areaCount
      });
    }

    for (const occluder of this._damageFilterOccluders) occluder.geometry.PrepareRayCaster();
    return true;
  }

  /** Reports whether all pending raycast sessions are ready or failed. */
  _AreDamageFilterOccludersReady()
  {
    for (let index = 0; index < this._damageFilterOccluders.length;)
    {
      const occluder = this._damageFilterOccluders[index];
      if (occluder.geometry.HasRayCasterPreparationFailed())
      {
        occluder.geometry.ResetRayCaster();
        this._damageFilterOccluders.splice(index, 1);
        continue;
      }
      if (!occluder.geometry.IsRayCasterReady()) return false;
      index++;
    }
    return true;
  }

  /** Rebuilds the enabled mask by testing each locator ray against occluders. */
  _RefreshDamageLocatorMask(damageLocators)
  {
    this._damageLocatorEnabled = damageLocators.map(locator =>
    {
      const direction = vec3.transformQuat(vec3.create(), EveSpaceObject2._unitY, locator.direction);
      const origin = vec3.scaleAndAdd(vec3.create(), locator.position, direction, 0.1);
      let occluded = false;
      let backfacing = false;
      let rayLength = Infinity;
      const frontFaceMinDistance = 0.05 * this.boundingSphereRadius;

      for (const occluder of this._damageFilterOccluders)
      {
        if (occluder.areaCount === 0) continue;

        const rayOrigin = vec3.transformMat4(vec3.create(), origin, occluder.fromObject);
        const rayDirection = vec3.fromValues(
          occluder.fromObject[0] * direction[0] + occluder.fromObject[4] * direction[1] + occluder.fromObject[8] * direction[2],
          occluder.fromObject[1] * direction[0] + occluder.fromObject[5] * direction[1] + occluder.fromObject[9] * direction[2],
          occluder.fromObject[2] * direction[0] + occluder.fromObject[6] * direction[1] + occluder.fromObject[10] * direction[2]);

        // Carbon EveSpaceObject2.cpp:2100-2122: the outer loop walks the
        // occluder's pool range, the INNER loop every sub-area
        // (area.index .. index+count) - a single GetIndex() raycast
        // under-tests multi-area geometry.
        for (let poolIndex = occluder.areaStart; poolIndex < occluder.areaStart + occluder.areaCount; poolIndex++)
        {
          const area = this._damageFilterAreas[poolIndex];
          for (let areaIndex = area.index; areaIndex < area.index + area.count; areaIndex++)
          {
            const hit = {};
            if (!occluder.geometry.GetIntersectionPoints(
              rayOrigin, rayDirection, hit, areaIndex, rayLength)) continue;

            rayLength = hit.distance;
            backfacing = !area.alphaCutout &&
              ((vec3.dot(hit.unnormalizedNormal, rayDirection) > 0) !== area.reversed);
            if (rayLength < frontFaceMinDistance)
            {
              occluded = true;
              break;
            }
          }
          if (occluded) break;
        }
        if (occluded) break;
      }
      return !occluded && !backfacing;
    });
  }

  /** Advances the asynchronous damage-locator filtering state machine. */
  @meta.blue.method
  @meta.implemented
  UpdateDamageLocatorFilter()
  {
    if (this._damageFilterState === 0) return;
    if (!this.damageLocatorAutoFilterEnabled && !this._damageLocatorFilterRequested)
    {
      this._damageLocatorEnabled.length = 0;
      this._ReleaseDamageFilterSessions();
      this._damageFilterState = 0;
      return;
    }

    const damageLocators = this._GetLocatorsForSet(EveSpaceObject2._damageLocatorSetName);
    if (!damageLocators?.length)
    {
      this._damageLocatorEnabled.length = 0;
      this._ReleaseDamageFilterSessions();
      this._damageFilterState = 0;
      this._damageLocatorFilterRequested = false;
      return;
    }
    this._damageLocatorEnabled = Array.from({ length: damageLocators.length }, () => true);

    if (this._damageFilterState === 1)
    {
      if (!this._CollectDamageFilterOccluders()) return;
      this._damageFilterState = 2;
    }
    if (!this._AreDamageFilterOccludersReady()) return;

    this._RefreshDamageLocatorMask(damageLocators);
    this._ReleaseDamageFilterSessions();
    this._damageFilterState = 0;
    this._damageLocatorFilterRequested = false;

    if (this.impactOverlay && this.impactOverlay.GetArmorImpactGoalCount() > 0)
    {
      const last = this.impactOverlay.GetLastDamageState();
      this.ClearImpactDamage();
      this.SetImpactDamageState(last[0], last[1], last[2], true);
    }
  }

  /** Requests a damage-locator filter pass. */
  @meta.blue.method
  @meta.implemented
  RunDamageLocatorFilter()
  {
    this._damageLocatorFilterRequested = true;
    if (this._damageFilterState === 0) this._damageFilterState = 1;
  }

  /**
   * Clears all impact and damage effects on the impact overlay.
   */
  @meta.blue.method
  @meta.implemented
  ClearImpactDamage()
  {
    if (this.impactOverlay) this.impactOverlay.Clear();
    this.EnsureChildLocatorMerged();
    for (const range of this._mergedDamageLocatorSources)
    {
      const overlay = range.owner.GetPartDamageOverlay(range.partTag);
      if (overlay) overlay.Clear();
    }
  }

  /**
   * Clears all animations on the animation updater.
   */
  @meta.blue.method
  @meta.implemented
  ClearAnimations()
  {
    this.animationUpdater?.ClearAnimations?.();
  }

  /**
   * Creates an impact facing a position on the closest facing damage locator.
   */
  @meta.blue.method
  @meta.implemented
  CreateImpactFromPosition(position, direction, lifeTime, size)
  {
    const closestDamageLocator = this._GetClosestLocatorIndex(position, EveSpaceObject2._damageLocatorSetName);
    return this.CreateImpact(closestDamageLocator, direction, lifeTime, size);
  }

  /**
   * Creates an impact effect on a damage locator through the impact overlay.
   */
  @meta.blue.method
  @meta.adapted
  CreateImpact(damageLocatorIndex, direction, lifeTime, size)
  {
    if (this.impactOverlay)
    {
      const configuration = this.impactOverlay.GetImpactConfiguration();
      if (configuration === ImpactConfiguration.IMPACT_ARMOR ||
        configuration === ImpactConfiguration.IMPACT_HULL)
      {
        this.EnsureChildLocatorMerged();
        for (const range of this._mergedDamageLocatorSources)
        {
          if (damageLocatorIndex < range.start || damageLocatorIndex >= range.start + range.count) continue;
          // Carbon EveSpaceObject2.cpp:3644-3651: parts honour the impact
          // switch here, and spawn debris except at low LOD.
          if (!EveDamageOverlay.impactEffectEnabled) return -1;
          return this._EnsureChildDamageOverlay(range).CreateImpact(
            damageLocatorIndex - range.start, size, this.lodLevel !== Tr2Lod.TR2_LOD_LOW);
        }
      }
      return this.impactOverlay.CreateImpact(
        damageLocatorIndex, direction, lifeTime, size, 1, this.lodLevel, this);
    }
    return -1;
  }

  /**
   * Ends the current animation on the animation updater.
   */
  @meta.blue.method
  @meta.implemented
  EndAnimation()
  {
    this.animationUpdater?.EndAnimation?.();
  }

  /**
   * Freezes LOD selection at the current mesh and marks decal geometry
   * frozen.
   */
  @meta.blue.method
  @meta.implemented
  FreezeHighDetailMesh()
  {
    this._allowLodSelection = false;
    for (const decal of this.decals)
    {
      decal?.SetHighDetailDecalState?.(true);
    }
  }

  /**
   * Gets the number of damage locators on this object.
   */
  @meta.blue.method
  @meta.implemented
  GetDamageLocatorCount()
  {
    return this.GetLocatorCount(EveSpaceObject2._damageLocatorSetName);
  }

  /**
   * Gets the number of locators in a named locator set.
   */
  @meta.blue.method
  @meta.implemented
  GetLocatorCount(locatorSetName)
  {
    return this._GetLocatorsForSet(locatorSetName)?.length ?? 0;
  }

  /**
   * Gets the first locator list whose set has the requested Carbon name.
   * The returned list remains owned by the locator set.
   */
  @meta.blue.method
  @meta.implemented
  GetLocatorsForSet(locatorSetName)
  {
    return this._GetLocatorsForSet(locatorSetName);
  }

  /** Appends copies of a named locator set, merging with an existing authored set. */
  @meta.blue.method
  @meta.implemented
  MergeToLocatorSet(locatorSet)
  {
    const locators = locatorSet.GetLocators();
    if (!locators.length) return;

    this.InvalidateMergedLocators("structure");
    const existing = this.locatorSets.find(set => set.HasName(locatorSet.GetName()));
    if (existing)
    {
      existing.Append(locators);
      return;
    }
    this.AddLocatorSet(locatorSet.GetName(), locators);
  }

  /** Adds a new authored locator set without replacing another set of the same name. */
  @meta.blue.method
  @meta.implemented
  AddLocatorSet(name, locators)
  {
    const locatorSet = new EveLocatorSets();
    locatorSet.Set(name, Array.from(locators));
    this.locatorSets.push(locatorSet);
    this.InvalidateMergedLocators("structure");
    return locatorSet;
  }

  /** Removes all authored locator sets and invalidates every derived locator view. */
  @meta.blue.method
  @meta.implemented
  ClearLocatorSets()
  {
    this.locatorSets.length = 0;
    this.InvalidateMergedLocators("structure");
  }

  /**
   * Gets the closest locator in a set to a world position, ignoring locator
   * facing. Returns -1 when the set is missing or empty.
   */
  @meta.blue.method
  @meta.implemented
  GetCloseLocatorIndex(position, locatorSetName)
  {
    const locators = this._GetLocatorsForSet(locatorSetName);
    if (!locators)
    {
      return -1;
    }
    const posInObjectSpace = vec3.transformMat4(vec3.create(), position, this.inverseWorldTransform);
    const locatorPosition = vec3.create();
    const locatorDirection = vec3.create();
    let closestLength = Infinity;
    let closestIndex = -1;
    for (let index = 0; index < locators.length; index++)
    {
      if (locatorSetName === EveSpaceObject2._damageLocatorSetName &&
        index < this._damageLocatorEnabled.length && !this._damageLocatorEnabled[index]) continue;
      this.GetLocatorInObjectSpace(locatorPosition, locatorDirection, locators[index],
        locatorSetName === EveSpaceObject2._damageLocatorSetName ? index : -1);
      const distance = vec3.squaredDistance(locatorPosition, posInObjectSpace);
      if (distance < closestLength)
      {
        closestIndex = index;
        closestLength = distance;
      }
    }
    return closestIndex;
  }

  /**
   * Carbon's script surface maps GetGoodLocatorIndex to GetCloseLocatorIndex
   * (EveSpaceObject2_Blue.cpp); the internal randomized fit heuristic is not
   * script-exposed.
   */
  @meta.blue.method
  @meta.adapted
  GetGoodLocatorIndex(position, locatorSetName)
  {
    return this.GetCloseLocatorIndex(position, locatorSetName);
  }

  /**
   * Gets the local direction of an indexed damage locator, (0,0,0) for
   * indices out of range (Carbon script GetDamageLocatorDirection maps to
   * GetDamageLocatorDirectionLocal).
   */
  @meta.blue.method
  @meta.adapted
  GetDamageLocatorDirection(index, inWorldSpaceOrOut = vec3.create(), out = vec3.create())
  {
    const targetableCall = typeof inWorldSpaceOrOut === "boolean";
    const inWorldSpace = targetableCall && inWorldSpaceOrOut;
    if (!targetableCall) out = inWorldSpaceOrOut;
    const locators = this._GetLocatorsForSet(EveSpaceObject2._damageLocatorSetName);
    if (!locators || !(index >= 0 && index < locators.length))
    {
      vec3.set(out, 0, targetableCall ? 1 : 0, 0);
      return targetableCall ? false : out;
    }
    const position = vec3.create();
    this.GetLocatorInObjectSpace(position, out, locators[index], index);
    if (inWorldSpace) EveSpaceObject2._TransformNormal(out, out, this.worldTransform);
    return targetableCall ? true : out;
  }

  /** Internal ITriTargetable locator query, using the org-standard out-last convention. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("CarbonEngineJS keeps output parameters last and returns a validity flag for targetable callers.")
  GetDamageLocatorPosition(index, inWorldSpace, out = vec3.create())
  {
    const locators = this._GetLocatorsForSet(EveSpaceObject2._damageLocatorSetName);
    if (!locators || !(index >= 0 && index < locators.length))
    {
      if (inWorldSpace) vec3.set(out, this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);
      else vec3.set(out, 0, 0, 0);
      return false;
    }
    this.GetLocatorInObjectSpace(out, EveSpaceObject2._locatorDirection, locators[index], index);
    if (inWorldSpace) vec3.transformMat4(out, out, this.worldTransform);
    return true;
  }

  /**
   * Gets a damage locator's BIND position in object space - the merged set's
   * authored position, no animation (Carbon EveSpaceObject2.cpp:2785-2796).
   * Impact overlays seed decals here so they stay put on animated parts.
   */
  @meta.blue.method
  @meta.implemented
  GetDamageLocatorBindPosition(index, out = vec3.create())
  {
    const locators = this._GetLocatorsForSet(EveSpaceObject2._damageLocatorSetName);
    if (!locators || !(index >= 0 && index < locators.length))
    {
      vec3.set(out, 0, 0, 0);
      return false;
    }
    vec3.copy(out, locators[index].position);
    return true;
  }

  /** Gets the closest facing damage locator for ITriTargetable consumers. */
  @meta.blue.method
  @meta.implemented
  GetClosestDamageLocatorIndex(position)
  {
    return this._GetClosestLocatorIndex(position, EveSpaceObject2._damageLocatorSetName);
  }

  /** Ports Carbon's randomized distance/direction fit for impact variation. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("TriRand is represented by Math.random; all locator scoring remains source-faithful.")
  GetGoodDamageLocatorIndex(position)
  {
    const locators = this._GetLocatorsForSet(EveSpaceObject2._damageLocatorSetName);
    if (!locators) return 0;

    const objectPosition = vec3.transformMat4(EveSpaceObject2._objectPosition, position, this.inverseWorldTransform);
    let minDistance = Infinity;
    let maxDistance = Number.MIN_VALUE;
    let bestDirectionFit = 0;

    for (let index = 0; index < locators.length; index++)
    {
      if (index < this._damageLocatorEnabled.length && !this._damageLocatorEnabled[index]) continue;
      const locator = locators[index];
      this.GetLocatorInObjectSpace(EveSpaceObject2._locatorPosition, EveSpaceObject2._locatorDirection, locator, index);
      if (!EveSpaceObject2._IsLocatorFacingPosition(EveSpaceObject2._locatorDirection, objectPosition)) continue;
      vec3.subtract(EveSpaceObject2._locatorOffset, EveSpaceObject2._locatorPosition, objectPosition);
      const distance = vec3.length(EveSpaceObject2._locatorOffset);
      minDistance = Math.min(minDistance, distance);
      maxDistance = Math.max(maxDistance, distance);
      if (distance) vec3.scale(EveSpaceObject2._locatorOffset, EveSpaceObject2._locatorOffset, 1 / distance);
      bestDirectionFit = Math.max(bestDirectionFit, EveSpaceObject2._GetDirectionFit(EveSpaceObject2._locatorDirection, EveSpaceObject2._locatorOffset));
    }

    const desiredFit = Math.random() * (0.25 - (1 - bestDirectionFit)) + 0.75;
    let bestFit = 1;
    let bestLocator = -1;
    for (let index = 0; index < locators.length; index++)
    {
      if (index < this._damageLocatorEnabled.length && !this._damageLocatorEnabled[index]) continue;
      this.GetLocatorInObjectSpace(EveSpaceObject2._locatorPosition, EveSpaceObject2._locatorDirection, locators[index], index);
      if (!EveSpaceObject2._IsLocatorFacingPosition(EveSpaceObject2._locatorDirection, objectPosition)) continue;
      vec3.subtract(EveSpaceObject2._locatorOffset, EveSpaceObject2._locatorPosition, objectPosition);
      const distance = vec3.length(EveSpaceObject2._locatorOffset);
      const range = maxDistance - minDistance;
      let scale = range > 0 ? 1 - (distance - minDistance) / range : 1;
      let value = 2 * scale - 1;
      value = value < 0 ? 1 - Math.sqrt(Math.abs(value)) : Math.sqrt(Math.abs(value)) + 1;
      value *= 0.5;
      if (distance) vec3.scale(EveSpaceObject2._locatorOffset, EveSpaceObject2._locatorOffset, 1 / distance);
      value *= EveSpaceObject2._GetDirectionFit(EveSpaceObject2._locatorDirection, EveSpaceObject2._locatorOffset);
      const fit = Math.abs(value - desiredFit);
      if (fit < bestFit)
      {
        bestFit = fit;
        bestLocator = index;
      }
    }
    return bestLocator < 0 ? this._GetClosestLocatorIndex(position, EveSpaceObject2._damageLocatorSetName) : bestLocator;
  }

  /** Gets the model-scaled target radius. */
  @meta.blue.method
  @meta.implemented
  GetRadius()
  {
    return this.GetBoundingSphereRadius();
  }

  /** Computes a miss point just outside the model silhouette. */
  @meta.blue.method
  @meta.implemented
  GetMissPosition(hit, source, out = vec3.create())
  {
    if (this.boundingSphereRadius > 0)
    {
      vec3.copy(out, this.modelWorldPosition);
      if (hit && source)
      {
        vec3.subtract(EveSpaceObject2._missOffset, hit, out);
        vec3.subtract(EveSpaceObject2._missDirection, hit, source);
        const directionLength = vec3.length(EveSpaceObject2._missDirection);
        if (directionLength) vec3.scale(EveSpaceObject2._missDirection, EveSpaceObject2._missDirection, 1 / directionLength);
        vec3.scaleAndAdd(EveSpaceObject2._missOffset, EveSpaceObject2._missOffset, EveSpaceObject2._missDirection, -vec3.dot(EveSpaceObject2._missDirection, EveSpaceObject2._missOffset));
        const offsetLength = vec3.length(EveSpaceObject2._missOffset);
        if (offsetLength) vec3.scale(EveSpaceObject2._missOffset, EveSpaceObject2._missOffset, 1 / offsetLength);
        vec3.scaleAndAdd(out, out, EveSpaceObject2._missOffset, this.GetBoundingSphereRadius() * 1.125);
      }
    }
    else
    {
      this.GetDamageLocatorPosition(-1, true, out);
    }
    return out;
  }

  /** Gets the current target impact material. */
  @meta.blue.method
  @meta.implemented
  GetImpactConfiguration()
  {
    return this.impactOverlay
      ? this.impactOverlay.GetImpactConfiguration()
      : ImpactConfiguration.IMPACT_INVALID;
  }

  /** Replaces the ship impact overlay. */
  @meta.blue.method
  @meta.implemented
  SetImpactOverlay(overlay)
  {
    this.impactOverlay = overlay;
  }

  /** Returns the ship impact overlay. */
  @meta.blue.method
  @meta.implemented
  GetImpactOverlay()
  {
    return this.impactOverlay;
  }

  /** Reports whether impacts currently use the authored shield ellipsoid. */
  @meta.blue.method
  @meta.implemented
  HasImpactConfigurationShield()
  {
    return !!this.impactOverlay?.HasShieldEllipsoid()
      && this.GetImpactConfiguration() === ImpactConfiguration.IMPACT_SHIELD;
  }

  /** Resolves a shield-ray or damage-locator collision point. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("CarbonEngineJS uses an out-last signature; the ellipsoid intersection is otherwise source-faithful CPU math.")
  GetImpactPosition(locator, posPrev, posNow, epsilon, out = vec3.create())
  {
    if (!this.HasImpactConfigurationShield())
    {
      this.GetDamageLocatorPosition(locator, true, out);
      return vec3.squaredDistance(posNow, out) < Number(epsilon);
    }

    vec3.transformMat4(EveSpaceObject2._rayOrigin, posPrev, this.inverseWorldTransform);
    vec3.transformMat4(EveSpaceObject2._rayEnd, posNow, this.inverseWorldTransform);
    vec3.subtract(EveSpaceObject2._rayDirection, EveSpaceObject2._rayEnd, EveSpaceObject2._rayOrigin);
    this.GetShapeEllipsoid(EveSpaceObject2._ellipsoidCenter, EveSpaceObject2._ellipsoidRadii);
    const t = EveSpaceObject2._IntersectEllipsoidRay(out, EveSpaceObject2._ellipsoidCenter, EveSpaceObject2._ellipsoidRadii, EveSpaceObject2._rayOrigin, EveSpaceObject2._rayDirection);
    if (t !== null && t >= -1 && t <= 1)
    {
      vec3.transformMat4(out, out, this.worldTransform);
      return true;
    }
    if (EveSpaceObject2._IsPointInsideEllipsoid(EveSpaceObject2._ellipsoidCenter, EveSpaceObject2._ellipsoidRadii, EveSpaceObject2._rayEnd))
    {
      vec3.copy(out, posNow);
      return true;
    }
    return false;
  }

  /** Updates an existing impact overlay entry. */
  @meta.blue.method
  @meta.implemented
  UpdateImpact(out, direction, impactIndex)
  {
    if (!this.impactOverlay) return false;
    if (this.impactOverlay.UpdateImpact(out, direction, impactIndex)) return true;

    this.EnsureChildLocatorMerged();
    for (const range of this._mergedDamageLocatorSources)
    {
      const overlay = range.owner.GetPartDamageOverlay(range.partTag);
      if (overlay && overlay.HasImpact(impactIndex)) return true;
    }
    return false;
  }

  /**
   * Gets the local position of an indexed damage locator, (0,0,0) for
   * indices out of range.
   */
  @meta.blue.method
  @meta.implemented
  GetDamageLocator(index, out = vec3.create())
  {
    const locators = this._GetLocatorsForSet(EveSpaceObject2._damageLocatorSetName);
    if (!locators || !(index >= 0 && index < locators.length))
    {
      return vec3.set(out, 0, 0, 0);
    }
    const direction = vec3.create();
    this.GetLocatorInObjectSpace(out, direction, locators[index], index);
    return out;
  }

  /**
   * Gets the world-space position of an indexed damage locator, (0,0,0) for
   * indices out of range (returned untransformed, as Carbon does).
   */
  @meta.blue.method
  @meta.implemented
  GetTransformedDamageLocator(index, out = vec3.create())
  {
    const locators = this._GetLocatorsForSet(EveSpaceObject2._damageLocatorSetName);
    if (!locators || !(index >= 0 && index < locators.length))
    {
      return vec3.set(out, 0, 0, 0);
    }
    const direction = vec3.create();
    this.GetLocatorInObjectSpace(out, direction, locators[index], index);
    return vec3.transformMat4(out, out, this.worldTransform);
  }

  /**
   * Checks whether this object is in impostor mode. The impostor system that
   * raises the flag is unported, so this reports the default until then.
   */
  @meta.blue.method
  @meta.adapted
  IsImpostor()
  {
    return this._impostorMode;
  }

  /**
   * Gets a locator position from a named set. Out-of-range or missing-set
   * queries return the world translation in world space and (0,0,0) in
   * object space, as Carbon does.
   */
  @meta.blue.method
  @meta.implemented
  GetLocatorPositionFromSet(index, inWorldSpace, locatorSetName, out = vec3.create())
  {
    const locators = this._GetLocatorsForSet(locatorSetName);
    if (index < 0 || !locators || index >= locators.length)
    {
      if (inWorldSpace)
      {
        return vec3.set(out, this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);
      }
      return vec3.set(out, 0, 0, 0);
    }
    const direction = vec3.create();
    this.GetLocatorInObjectSpace(out, direction, locators[index],
      locatorSetName === EveSpaceObject2._damageLocatorSetName ? index : -1);
    if (inWorldSpace)
    {
      vec3.transformMat4(out, out, this.worldTransform);
    }
    return out;
  }

  /**
   * Gets a locator direction from a named set. Out-of-range or missing-set
   * queries return (0,1,0), as Carbon does.
   */
  @meta.blue.method
  @meta.implemented
  GetLocatorRotationFromSet(index, inWorldSpace, locatorSetName, out = vec3.create())
  {
    const locators = this._GetLocatorsForSet(locatorSetName);
    if (index < 0 || !locators || index >= locators.length)
    {
      return vec3.set(out, 0, 1, 0);
    }
    const position = vec3.create();
    this.GetLocatorInObjectSpace(position, out, locators[index],
      locatorSetName === EveSpaceObject2._damageLocatorSetName ? index : -1);
    if (inWorldSpace)
    {
      EveSpaceObject2._TransformNormal(out, out, this.worldTransform);
    }
    return out;
  }

  /**
   * Raises a named controller event on this hull's controllers and forwards it
   * to the effect children and overlay effects.
   */
  @meta.blue.method
  @meta.implemented
  HandleControllerEvent(name)
  {
    const eventName = String(name ?? "");
    for (const controller of this.controllers)
    {
      controller?.HandleEvent(eventName);
    }
    for (const child of this.effectChildren)
    {
      child?.HandleControllerEvent(eventName);
    }
    for (const overlay of this.overlayEffects)
    {
      overlay?.HandleControllerEvent(eventName);
    }
  }

  /**
   * Plays an animation once, replacing the current one
   * (Carbon script PlayAnimation maps to PlayAnimationOnce).
   */
  @meta.blue.method
  @meta.adapted
  PlayAnimation(animName)
  {
    this._PlayAnimation(animName, true, 1, 0, 1, true);
  }

  /**
   * Chains an animation once after the current one (Carbon ChainAnimation).
   */
  @meta.blue.method
  @meta.implemented
  ChainAnimation(animName)
  {
    this._PlayAnimation(animName, false, 1, 0, 1, true);
  }

  /**
   * Chains an animation with explicit loop, start, and speed settings
   * (Carbon ChainAnimationEx).
   */
  @meta.blue.method
  @meta.implemented
  ChainAnimationEx(animName, loopCount, start, speed)
  {
    this._PlayAnimation(animName, false, loopCount, start, speed, true);
  }

  // Carbon EveSpaceObject2::PlayAnimation: every playback wrapper funnels
  // into the animation updater, which owns playback state; a missing updater
  // is a Carbon-faithful no-op.

  /**
   * Forwards a playback request to the animation updater, which owns all
   * animation state; a hull without an updater does nothing, as in Carbon.
   */
  _PlayAnimation(animName, replace, loopCount, delay, speed, clearWhenDone)
  {
    this.animationUpdater?.PlayAnimation?.(String(animName ?? ""), replace, loopCount, delay, speed, clearWhenDone);
  }

  /**
   * Recalculates the authored bounding sphere from the mesh geometry
   * resource. Fails when no mesh or ready geometry resource is attached.
   */
  @meta.blue.method
  @meta.adapted
  RebuildBoundingSphereInformation()
  {
    const mesh = this.mesh;
    if (!mesh)
    {
      return false;
    }
    const geometryRes = mesh.GetGeometryResource();
    if (!geometryRes || !geometryRes.IsGood?.())
    {
      return false;
    }
    geometryRes.RecalculateBoundingSphere?.();
    const sphere = vec4.create();
    geometryRes.GetBoundingSphere(mesh.GetMeshIndex?.() ?? 0, sphere);
    vec3.set(this.boundingSphereCenter, sphere[0], sphere[1], sphere[2]);
    this.boundingSphereRadius = sphere[3];
    return true;
  }

  /** Sets Carbon's authored local bounding sphere from a sph3-compatible value. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon's CcpMath::Sphere is represented by core-math sph3; object-shaped center/radius input is accepted at adapter boundaries.")
  SetBoundingSphereInformation(sphere)
  {
    if (sphere?.center)
    {
      vec3.copy(this.boundingSphereCenter, sphere.center);
      this.boundingSphereRadius = Number(sphere.radius);
    }
    else
    {
      this.boundingSphereRadius = sph3.extract(sphere, this.boundingSphereCenter);
    }
    return this;
  }

  /**
   * Returns a plain-object snapshot of the controller variables currently
   * stamped on this hull.
   */
  @meta.blue.method
  @meta.implemented
  GetControllerVariables()
  {
    return Object.fromEntries(this._controllerVariables);
  }

  /** Gets Carbon's most recently selected geometry LOD. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Geometry resources without multi-LOD support expose their sole browser LOD as index zero.")
  GetLastUsedMeshLod()
  {
    const geometryResource = this.mesh?.GetGeometryResource();
    if (!geometryResource) return -1;
    if (!this._allowLodSelection) return 0;
    return geometryResource.GetLodIndexForScreenSize?.(this.mesh?.GetMeshIndex?.() ?? 0, this._meshScreenSize) ?? 0;
  }

  /**
   * Counts authored locators whose names start with the case-sensitive prefix.
   * JS null or an omitted prefix represents Carbon's null pointer; an empty
   * prefix also matches every authored locator. Animation bones are not counted.
   * @param {string|null} [prefix]
   * @returns {number}
   */
  @meta.blue.method
  @meta.adapted
  CountLocatorsByPrefix(prefix)
  {
    if (prefix == null || prefix === "") return this.locators.length;
    let count = 0;
    for (const locator of this.locators)
    {
      if (locator.GetName().startsWith(prefix)) count++;
    }
    return count;
  }

  /**
   * Finds the first authored locator with this exact, case-sensitive name.
   * JS represents Carbon's reference out parameter with caller-owned indexOut;
   * indexOut.index is written only when the method returns true.
   * @param {string} name
   * @param {{index: number}} indexOut
   * @returns {boolean}
   */
  @meta.blue.method
  @meta.adapted
  FindLocatorTransformByName(name, indexOut)
  {
    for (let index = 0; index < this.locators.length; index++)
    {
      if (this.locators[index].GetName() === name)
      {
        indexOut.index = index;
        return true;
      }
    }
    return false;
  }

  /**
   * Finds a name in the animation skeleton's bone order, not its mesh palette.
   * JS writes Carbon's reference out parameter to caller-owned indexOut.index
   * only on success, using the animation updater's public bone-name list.
   * @param {string} name
   * @param {{index: number}} indexOut
   * @returns {boolean}
   */
  @meta.blue.method
  @meta.adapted
  FindLocatorJointByName(name, indexOut)
  {
    if (!this.animationUpdater) return false;
    const index = this.animationUpdater.GetAnimationBoneList().indexOf(name);
    if (index === -1) return false;
    indexOut.index = index;
    return true;
  }

  /**
   * Selects an animation joint before an authored locator, or ELT_COUNT on miss.
   * JS carries Carbon's reference out parameter in caller-owned indexOut.index;
   * a miss leaves it unchanged.
   * @param {string} name
   * @param {{index: number}} indexOut
   * @returns {number} A member of EveSpaceObject2.LocatorType.
   */
  @meta.blue.method
  @meta.adapted
  DetermineLocatorType(name, indexOut)
  {
    if (this.FindLocatorJointByName(name, indexOut)) return EveSpaceObject2.LocatorType.ELT_JOINT;
    if (this.FindLocatorTransformByName(name, indexOut)) return EveSpaceObject2.LocatorType.ELT_TRANSFORM;
    return EveSpaceObject2.LocatorType.ELT_COUNT;
  }

  /**
   * Copies a locator transform by name or by LocatorType and index.
   * JS combines native typed GetLocatorTransform with script GetEveLocatorTransform
   * under this existing method name, dispatching by the first argument's type.
   * It copies the native matrix value/pointer into a supplied or newly allocated
   * matrix instead of returning a borrowed pointer.
   * The named script form (GetEveLocatorTransform) requires an authored locator
   * before a matching bone can override it; unknown names return the identity.
   * The numeric form returns null on miss without changing out. As a JS bounds
   * adaptation, invalid indices and out-of-range authored indices return null;
   * Carbon's authored path indexes unchecked. JS indices are not coerced into
   * Carbon's unsigned index.
   * @param {string|number} nameOrType Name or EveSpaceObject2.LocatorType.
   * @param {mat4|number} [indexOrOut] Named output matrix or numeric locator index.
   * @param {mat4} [out] Output matrix for the numeric overload.
   * @returns {mat4|null}
   */
  @meta.blue.method
  @meta.adapted
  GetLocatorTransform(nameOrType, indexOrOut, out)
  {
    if (typeof nameOrType === "number")
    {
      const index = indexOrOut;
      if (!Number.isInteger(index) || index < 0) return null;
      switch (nameOrType)
      {
        case EveSpaceObject2.LocatorType.ELT_TRANSFORM:
          if (index >= this.locators.length) return null;
          return mat4.copy(out ?? mat4.create(), this.locators[index].GetTransform()); // alloc: With no output supplied, the returned matrix belongs to the caller.
        case EveSpaceObject2.LocatorType.ELT_JOINT:
          if (!this.animationUpdater) return null;
          return this.animationUpdater.GetBoneTransform(index, out ?? mat4.create()) || null; // alloc: With no output supplied, the returned matrix belongs to the caller.
        default:
          return null;
      }
    }

    const result = indexOrOut ?? mat4.create(); // alloc: With no output supplied, the returned matrix belongs to the caller.
    const target = String(nameOrType ?? "");
    let locator = null;
    for (const candidate of this.locators)
    {
      if (candidate.GetName() === target)
      {
        locator = candidate;
        break;
      }
    }
    if (!locator)
    {
      return mat4.identity(result);
    }
    if (this.animationUpdater && this.animationUpdater.GetBoneWorldTransform(target, result))
    {
      return result;
    }
    return mat4.copy(result, locator.GetTransform());
  }

  /**
   * Gets the local axis-aligned bounding box: dynamic skinned bounds when
   * enabled, else the mesh box, else the cached box (at worst it lags one
   * frame). With out arguments it fills them and returns true; without, it
   * returns { min, max }.
   */
  @meta.blue.method
  @meta.adapted
  GetLocalBoundingBox(minBounds, maxBounds)
  {
    const min = vec3.create();
    const max = vec3.create();
    const updater = this.animationUpdater;
    if (this.dynamicBoundingSphereEnabled && updater && updater.IsInitialized())
    {
      const sphere = vec4.create();
      updater.GetDynamicBounds(sphere, min, max);
      vec3.copy(this._localAabbMin, min);
      vec3.copy(this._localAabbMax, max);
    }
    else if (this.mesh && this.mesh.GetBoundingBox(min, max))
    {
      vec3.copy(this._localAabbMin, min);
      vec3.copy(this._localAabbMax, max);
    }
    else
    {
      vec3.copy(min, this._localAabbMin);
      vec3.copy(max, this._localAabbMax);
    }
    if (minBounds && maxBounds)
    {
      vec3.copy(minBounds, min);
      vec3.copy(maxBounds, max);
      return true;
    }
    return { min, max };
  }

  /** Gets Carbon's cached local box transformed into a world-axis-aligned box. */
  @meta.blue.method
  @meta.adapted
  GetWorldBoundingBox(minBounds, maxBounds)
  {
    box3.fromBounds(EveSpaceObject2._localBox, this._localAabbMin, this._localAabbMax);
    box3.transformMat4(EveSpaceObject2._worldBox, EveSpaceObject2._localBox, this.worldTransform);
    const min = minBounds ?? vec3.create();
    const max = maxBounds ?? vec3.create();
    vec3.set(min, EveSpaceObject2._worldBox[0], EveSpaceObject2._worldBox[1], EveSpaceObject2._worldBox[2]);
    vec3.set(max, EveSpaceObject2._worldBox[3], EveSpaceObject2._worldBox[4], EveSpaceObject2._worldBox[5]);
    return minBounds && maxBounds ? true : { min, max };
  }

  /** Reports whether the attached mesh has a ready geometry resource. */
  @meta.blue.method
  @meta.implemented
  IsBoundingBoxReady()
  {
    if (!this.mesh) return false;
    const geometryResource = this.mesh.GetGeometryResource();
    return geometryResource ? geometryResource.IsGood() : false;
  }

  /**
   * Gets Carbon's realized world sphere, optionally accumulated with transform
   * and effect children when query is EVE_BOUNDS_WITH_CHILDREN.
   */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphere(out = sph3.create(), query = 0)
  {
    if (this.boundingSphereRadius <= 0 && this._dynamicBoundingSphere[3] <= 0) return false;
    EveSpaceObject2._SetSphere(out, this.modelWorldPosition, this._boundingSphereWorldRadius);
    if (!query || !this.DisplayChildren()) return true;
    for (const child of this.children)
    {
      if (child.GetBoundingSphere(EveSpaceObject2._childSphere, query))
      {
        sph3.union(out, out, EveSpaceObject2._childSphere);
      }
    }
    for (const child of this.effectChildren)
    {
      if (child.GetBoundingSphere(EveSpaceObject2._childSphere, query))
      {
        sph3.union(out, out, EveSpaceObject2._childSphere);
      }
    }
    return true;
  }

  /** Updates Carbon's geometry-derived on-screen pixel diameter. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("TriFrustum is supplied structurally by the active engine; both exact and estimated browser frustum methods are supported.")
  EstimatePixelDiameter(frustum)
  {
    if (this.mesh?.GetBoundingBox?.(EveSpaceObject2._boundsMin, EveSpaceObject2._boundsMax))
    {
      vec3.copy(this._localAabbMin, EveSpaceObject2._boundsMin);
      vec3.copy(this._localAabbMax, EveSpaceObject2._boundsMax);
    }
    sph3.fromBounds(EveSpaceObject2._localSphere, this._localAabbMin, this._localAabbMax);
    sph3.transformMat4(EveSpaceObject2._worldSphere, EveSpaceObject2._localSphere, this.worldTransform);
    this.estimatedPixelDiameter = EveSpaceObject2._GetPixelSize(frustum, EveSpaceObject2._worldSphere);
    return this.estimatedPixelDiameter;
  }

  /** Carbon EveSpaceObject2::GetWorldVelocity (cpp:3014-3017): the ball's velocity. */
  @meta.blue.method
  @meta.implemented
  GetWorldVelocity(velocity)
  {
    vec3.copy(velocity, this.worldVelocity);
    return velocity;
  }

  /** Reports the result of the latest Carbon visibility update. */
  @meta.blue.method
  @meta.implemented
  IsInFrustum()
  {
    return this._isInFrustum;
  }

  /**
   * Gets the bounding sphere center, preferring the dynamic skinned sphere
   * when one is published.
   */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphereCenter(out = vec3.create())
  {
    if (this._dynamicBoundingSphere[3] !== -1)
    {
      return vec3.set(out, this._dynamicBoundingSphere[0], this._dynamicBoundingSphere[1], this._dynamicBoundingSphere[2]);
    }
    return vec3.copy(out, this.boundingSphereCenter);
  }

  /**
   * Gets the model-scaled bounding sphere radius, preferring the dynamic
   * skinned sphere when one is published.
   */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphereRadius()
  {
    if (this._dynamicBoundingSphere[3] !== -1)
    {
      return this.modelScale * this._dynamicBoundingSphere[3];
    }
    return this.modelScale * this.boundingSphereRadius;
  }

  /**
   * The Tr2GrannyAnimation driving this object, or null
   * (ITr2GrannyAnimationOwner, EveSpaceObject2.h:450-453).
   */
  @meta.blue.method
  @meta.implemented
  GetAnimationController()
  {
    return this.animationUpdater;
  }

  /**
   * Gets the number of mesh-bound bones. Carbon dereferences the animation
   * updater unchecked; CarbonEngineJS reports 0 when none is attached.
   */
  @meta.blue.method
  @meta.adapted
  GetBoneCount()
  {
    const updater = this.animationUpdater;
    if (!updater)
    {
      return 0;
    }
    if (updater.IsUsingCMF?.())
    {
      if (!updater.HasMeshBinding?.())
      {
        return 0;
      }
      return updater.GetSkeletonBoneIndices?.().length ?? 0;
    }
    return updater.GetMeshBindingBoneCount?.() ?? 0;
  }

  /**
   * Pushes shield, armor and hull damage levels to the impact overlay and
   * mirrors them into the ShieldDamage, ArmorDamage and HullDamage controller
   * variables so bound effects follow.
   */
  @meta.blue.method
  @meta.adapted
  SetImpactDamageState(shield, armor, hull, doCreateArmorImpacts = true)
  {
    if (this.impactOverlay)
    {
      this.impactOverlay.GetDamageOverlay().SetEnabledDamageLocators(this._damageLocatorEnabled);
      this.impactOverlay.SetDamageState(shield, armor, hull, doCreateArmorImpacts);
      this.EnsureChildLocatorMerged();
      for (const range of this._mergedDamageLocatorSources)
      {
        this._EnsureChildDamageOverlay(range).SetDamageState(
          shield, armor, hull, doCreateArmorImpacts);
      }
    }
    this.SetControllerVariable("ShieldDamage", shield);
    this.SetControllerVariable("ArmorDamage", armor);
    this.SetControllerVariable("HullDamage", hull);
  }

  /**
   * Toggles a named impact-overlay animation (boosters, hardeners, ...).
   */
  @meta.blue.method
  @meta.implemented
  SetImpactAnimation(name, enable, duration)
  {
    if (!this.impactOverlay) return;
    this.impactOverlay.ToggleEffect(name, enable, duration);
    if (name === "shieldboost" || name === "shieldhardening") return;

    this.EnsureChildLocatorMerged();
    for (const range of this._mergedDamageLocatorSources)
    {
      this._EnsureChildDamageOverlay(range).ToggleEffect(name, enable, duration);
    }
  }

  /** Creates and synchronizes the damage overlay owned by one child-locator range. */
  _EnsureChildDamageOverlay(range)
  {
    let overlay = range.owner.GetPartDamageOverlay(range.partTag);
    if (!overlay)
    {
      // Carbon EveSpaceObject2.cpp:3529-3555: the child creates the part's
      // overlay, then it is fetched back by the same part tag.
      range.owner.CreatePartDamageOverlay(range.partTag);
      overlay = range.owner.GetPartDamageOverlay(range.partTag);
      const shipDamage = this.impactOverlay.GetDamageOverlay();
      // The part's OWN armour shader (commit 6975d9f1): an animated part
      // needs the skinned variant, which the ship-wide effect is not.
      overlay.SetArmorDamageShaderEffect(range.owner.GetPartArmorDamageShaderEffect(range.partTag));
      const flicker = shipDamage.GetHullDamageFlickerCurve();
      if (flicker) overlay.SetHullDamageFlickerCurve(new Copier().CloneTo(flicker));
      overlay.SetSeed(shipDamage.GetSeed() + range.partTag);
    }

    overlay.SetDamageLocatorCount(range.count);
    overlay.SetEnabledDamageLocators(
      this._damageLocatorEnabled.slice(range.start, range.start + range.count));
    overlay.SetImpactIndexSource(this.impactOverlay.GetDamageOverlay());
    return overlay;
  }

  /**
   * Appends every part's existing damage overlay with its range start in the
   * merged damage locator set, as [overlay, start] pairs (Carbon
   * EveSpaceObject2.cpp:3561-3574).
   */
  @meta.blue.method
  @meta.implemented
  CollectPartDamageOverlays(out = [])
  {
    this.EnsureChildLocatorMerged();
    for (const range of this._mergedDamageLocatorSources)
    {
      if (!range.owner) continue;
      const overlay = range.owner.GetPartDamageOverlay(range.partTag);
      if (overlay) out.push([ overlay, range.start ]);
    }
    return out;
  }

  /**
   * Carbon INotify::OnModified (EveSpaceObject2.cpp:2455-2496). Crossing
   * between no clipping and clipping switches every shader's
   * SPACE_OBJECT_CLIPPING option, so the hull only clips (a cloak dissolving
   * it) once a clip factor turns non-zero.
   *
   * @param {string|null} [propertyName] The changed member's exposed name.
   * @returns {boolean} Always true.
   */
  @meta.blue.method
  @meta.implemented
  OnModified(propertyName = null)
  {
    switch (propertyName)
    {
      case "dirtLevel":
        this.SetControllerVariable("DirtLevel", this.dirtLevel);
        break;

      case "clipSphereFactor":
      case "clipSphereFactor2":
      {
        const clipping = this.clipSphereFactor !== 0 || this.clipSphereFactor2 !== 0;
        const oldClipping = this._oldClipSphereFactor !== 0 || this._oldClipSphereFactor2 !== 0;
        if (clipping !== oldClipping)
        {
          this.SetShaderOption("SPACE_OBJECT_CLIPPING", clipping ? "SOC_ENABLED" : "SOC_DISABLED");
        }
        this._oldClipSphereFactor = this.clipSphereFactor;
        this._oldClipSphereFactor2 = this.clipSphereFactor2;
        this.SetControllerVariable("ClipSphereFactor", this.clipSphereFactor);
        this.SetControllerVariable("ClipSphereFactor2", this.clipSphereFactor2);
        break;
      }

      case "reflectionMode":
      case "display":
      case "castShadow":
        this.ReRegister();
        break;

      case "name":
        this.impactOverlay?.SetSeed(ccpHashFnv1(this.name));
        break;

      case "mute":
        this.SetMute(this.mute);
        break;

      case "damageLocatorAutoFilterEnabled":
        if (this._damageFilterState === 0) this._damageFilterState = 1;
        break;
    }
    return true;
  }

  /**
   * Sets a shader option on the mesh, overlay effects, decals, attachments and
   * effect children (EveSpaceObject2.cpp:4358-4388).
   */
  @meta.blue.method
  @meta.implemented
  SetShaderOption(name, value)
  {
    this.mesh?.SetShaderOption(name, value);
    for (const overlay of this.overlayEffects) overlay.SetShaderOption(name, value);
    for (const decal of this.decals) decal.SetShaderOption(name, value);
    for (const attachment of this.attachments) attachment.SetShaderOption(name, value);
    for (const child of this.effectChildren) child.SetShaderOption(name, value);
  }

  /**
   * Stores a controller variable on the hull and pushes it to the controllers,
   * effect children and overlay effects; the stored value is replayed onto
   * controllers and children added later.
   */
  @meta.blue.method
  @meta.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name ?? "");
    const next = Number(value);
    this._controllerVariables.set(key, next);
    for (const controller of this.controllers)
    {
      controller?.SetVariable(key, next);
    }
    for (const child of this.effectChildren)
    {
      child?.SetControllerVariable(key, next);
    }
    for (const overlay of this.overlayEffects)
    {
      overlay?.SetControllerVariable(key, next);
    }
  }

  /**
   * Forwards a procedural-container variable to every effect child; the hull
   * itself keeps no copy.
   */
  @meta.blue.method
  @meta.implemented
  SetProceduralContainerVariable(name, value)
  {
    for (const child of this.effectChildren)
    {
      child?.SetProceduralContainerVariable?.(name, value);
    }
  }

  /**
   * Starts this hull's controllers and those of its effect children and overlay
   * effects.
   */
  @meta.blue.method
  @meta.implemented
  StartControllers()
  {
    for (const controller of this.controllers)
    {
      controller?.Start();
    }
    for (const child of this.effectChildren)
    {
      child?.StartControllers();
    }
    for (const overlay of this.overlayEffects)
    {
      overlay?.StartControllers();
    }
  }

  /**
   * Applies bone and model transforms to locators and returns
   * [position, rotation, boneIndex] tuples, as the Carbon script surface
   * does (TransformLocators maps to PyTransformLocators). Accepts either
   * locator records ({ position, direction, boneIndex }, Carbon's
   * LocatorStructureList shape) or the same [position, rotation, boneIndex]
   * tuple shape it returns.
   */
  @meta.blue.method
  @meta.adapted
  TransformLocators(locators = [])
  {
    const result = [];
    for (const locator of locators ?? [])
    {
      const record = Array.isArray(locator)
        ? { position: locator[0], rotation: locator[1], boneIndex: locator[2] }
        : { position: locator?.position, rotation: locator?.direction ?? locator?.rotation, boneIndex: locator?.boneIndex };
      const position = vec3.clone(record.position ?? EveSpaceObject2._zero);
      const rotation = quat.clone(record.rotation ?? EveSpaceObject2._identityRotation);
      const boneIndex = Number(record.boneIndex ?? 0);
      this._TransformLocator(position, rotation, boneIndex);
      if (this.modelTranslationCurve || this.modelRotationCurve)
      {
        this._ApplyModelTransform(position, rotation);
      }
      result.push([position, rotation, boneIndex]);
    }
    return result;
  }

  /**
   * Returns the named set's locators - including those merged in from parts -
   * posed by the current bones and model curves, as [position, rotation,
   * boneIndex] tuples (Carbon script GetTransformedLocatorsFromSet maps to
   * PyGetTransformedLocatorsFromSet, EveSpaceObject2_Blue.cpp:146-181).
   */
  @meta.blue.method
  @meta.implemented
  GetTransformedLocatorsFromSet(locatorSetName)
  {
    const result = [];
    for (const locator of this.GetLocatorsForSet(locatorSetName) ?? [])
    {
      const position = vec3.clone(locator.position);
      const rotation = quat.clone(locator.direction);
      this._TransformLocator(position, rotation, locator.boneIndex);
      if (this.modelTranslationCurve || this.modelRotationCurve)
      {
        this._ApplyModelTransform(position, rotation);
      }
      result.push([position, rotation, locator.boneIndex]);
    }
    return result;
  }

  // Carbon Blue TransformLocator: bone-attached records pick up the mesh
  // bone matrix; without bone data the authored values pass through.

  /**
   * Applies the mesh bone matrix to a locator position and rotation for
   * bone-attached locators; the authored values pass through unchanged when
   * there is no usable bone data.
   */
  _TransformLocator(position, rotation, boneIndex)
  {
    const updater = this.animationUpdater;
    if (boneIndex <= 0 || !updater?.IsInitialized?.())
    {
      return;
    }
    const bone = EveSpaceObject2._GetBoneMatrix(updater, boneIndex);
    if (!bone)
    {
      return;
    }
    vec3.transformMat4(position, position, bone);
    const boneRotation = mat4.getRotation(quat.create(), bone);
    quat.multiply(rotation, boneRotation, rotation);
  }

  // Carbon Blue ApplyModelTransform samples both curves at the Be::Time()
  // origin (pure GetValueAt, no playback advance): translation adds, model
  // rotation rotates the position and pre-multiplies.

  /**
   * Applies the model translation and rotation curves sampled at time 0 to a
   * locator position and rotation, matching Carbon's Blue locator surface, which
   * reads the curves without advancing playback.
   */
  _ApplyModelTransform(position, rotation)
  {
    if (this.modelTranslationCurve)
    {
      const translation = vec3.create();
      this.modelTranslationCurve.GetValueAt?.(0, translation);
      vec3.add(position, position, translation);
    }
    if (this.modelRotationCurve)
    {
      const modelRotation = quat.create();
      this.modelRotationCurve.GetValueAt?.(0, modelRotation);
      vec3.transformQuat(position, position, modelRotation);
      quat.multiply(rotation, modelRotation, rotation);
    }
  }

  // Carbon GetLocatorsForSet: first set matching the name wins.

  /**
   * Returns the locator list of the first locator set carrying the name, or null
   * when no set matches; the list stays owned by the locator set.
   */
  _GetLocatorsForSet(locatorSetName)
  {
    const target = String(locatorSetName ?? "");
    this.EnsureChildLocatorMerged();
    for (const set of this._mergedLocatorSets)
    {
      if (set.HasName(target))
      {
        return set.GetLocators();
      }
    }
    return null;
  }

  /**
   * Writes a locator's object-space position and direction (Carbon
   * EveSpaceObject2.cpp:3784-3805, rewritten upstream by 3d988b1d).
   *
   * A merged damage locator (mergedDamageIndex >= 0, indexing the merged
   * damage set) delegates to the owning child's animated pose - the locator's
   * boneIndex addresses the CHILD's skeleton, never this object's - then
   * lifts the result through the range's childToObject transform; Carbon
   * normalizes the direction HERE but not in EveGetLocatorPose, and that
   * asymmetry is preserved. Every other locator resolves against this
   * object's own animation updater.
   *
   * Overridable on purpose: Carbon's EveSwarm overrides this.
   */
  @meta.blue.method
  @meta.implemented
  GetLocatorInObjectSpace(outPosition, outDirection, locator, mergedDamageIndex = -1)
  {
    if (mergedDamageIndex >= 0)
    {
      this.EnsureChildLocatorMerged();
      for (const range of this._mergedDamageLocatorSources)
      {
        if (range.owner && mergedDamageIndex >= range.start && mergedDamageIndex < range.start + range.count)
        {
          if (range.owner.GetPartDamageLocatorAnimatedLocal(
            range.partTag, mergedDamageIndex - range.start, outPosition, outDirection))
          {
            vec3.transformMat4(outPosition, outPosition, range.childToObject);
            EveSpaceObject2._TransformNormal(outDirection, outDirection, range.childToObject);
            vec3.normalize(outDirection, outDirection);
            return;
          }
          break;
        }
      }
    }

    EveGetLocatorPose(outPosition, outDirection, this.animationUpdater, locator);
  }

  // Carbon GetClosestLocatorIndex: facing-gated closest search; 0 when the
  // set is missing, -1 when no locator faces the position.

  /**
   * Returns the index of the nearest locator in a named set that faces the given
   * world position - 0 when the set is missing, -1 when no locator faces the
   * position.
   */
  _GetClosestLocatorIndex(position, locatorSetName)
  {
    const locators = this._GetLocatorsForSet(locatorSetName);
    if (!locators)
    {
      return 0;
    }
    const posInObjectSpace = vec3.transformMat4(vec3.create(), position, this.inverseWorldTransform);
    const locatorPosition = vec3.create();
    const locatorDirection = vec3.create();
    let closestLength = Infinity;
    let closestIndex = -1;
    for (let index = 0; index < locators.length; index++)
    {
      if (locatorSetName === EveSpaceObject2._damageLocatorSetName &&
        index < this._damageLocatorEnabled.length && !this._damageLocatorEnabled[index]) continue;
      this.GetLocatorInObjectSpace(locatorPosition, locatorDirection, locators[index],
        locatorSetName === EveSpaceObject2._damageLocatorSetName ? index : -1);
      if (!EveSpaceObject2._IsLocatorFacingPosition(locatorDirection, posInObjectSpace))
      {
        continue;
      }
      const distance = vec3.squaredDistance(locatorPosition, posInObjectSpace);
      if (distance < closestLength)
      {
        closestIndex = index;
        closestLength = distance;
      }
    }
    return closestIndex;
  }

  /**
   * Reports whether a locator faces a position, by testing that stepping the
   * object-space position back along the locator direction shortens it.
   */
  static _IsLocatorFacingPosition(locatorDirection, posInObjectSpace)
  {
    const moved = vec3.subtract(vec3.create(), posInObjectSpace, locatorDirection);
    return vec3.squaredLength(moved) < vec3.squaredLength(posInObjectSpace);
  }

  /** Rotates a direction by a matrix's rotation basis, ignoring its translation. */
  static _TransformNormal(out, direction, matrix)
  {
    const x = direction[0];
    const y = direction[1];
    const z = direction[2];
    out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
    out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
    out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
    return out;
  }

  /** Carbon's authored-or-derived local shape ellipsoid query. */
  @meta.blue.method
  @meta.implemented
  GetShapeEllipsoid(outCenter, outRadii)
  {
    if (this.shapeEllipsoidRadius[0] > 0)
    {
      vec3.copy(outCenter, this.shapeEllipsoidCenter);
      vec3.copy(outRadii, this.shapeEllipsoidRadius);
    }
    else
    {
      const bounds = this.GetLocalBoundingBox(EveSpaceObject2._boundsMin, EveSpaceObject2._boundsMax);
      if (bounds === false)
      {
        vec3.set(EveSpaceObject2._boundsMin, -1, -1, -1);
        vec3.set(EveSpaceObject2._boundsMax, 1, 1, 1);
      }
      vec3.subtract(outRadii, EveSpaceObject2._boundsMax, EveSpaceObject2._boundsMin);
      vec3.scale(outRadii, outRadii, Math.sqrt(3) * 0.5);
      vec3.lerp(outCenter, EveSpaceObject2._boundsMin, EveSpaceObject2._boundsMax, 0.5);
    }
    vec3.copy(this.generatedShapeEllipsoidCenter, outCenter);
    vec3.copy(this.generatedShapeEllipsoidRadius, outRadii);
  }

  /**
   * Maps the negated dot product of a locator direction and an offset direction
   * onto Carbon's square-root fit score, the ranking used to pick a varied
   * damage locator.
   */
  static _GetDirectionFit(v0, v1)
  {
    const direction = -vec3.dot(v0, v1);
    return direction < 0
      ? (1 - Math.sqrt(Math.abs(direction))) * 0.5
      : (Math.sqrt(Math.abs(direction)) + 1) * 0.5;
  }

  /**
   * Intersects a ray with an axis-aligned ellipsoid in the ellipsoid's own space and writes the hit point into out.
   * @returns {number|null} The ray parameter at the hit, or null when the ray is degenerate or misses.
   */
  static _IntersectEllipsoidRay(out, center, radii, origin, direction)
  {
    const vx = direction[0] / radii[0];
    const vy = direction[1] / radii[1];
    const vz = direction[2] / radii[2];
    const sx = (origin[0] - center[0]) / radii[0];
    const sy = (origin[1] - center[1]) / radii[1];
    const sz = (origin[2] - center[2]) / radii[2];
    const vv = vx * vx + vy * vy + vz * vz;
    if (!(vv > 0)) return null;
    const vs = vx * sx + vy * sy + vz * sz;
    const ss = sx * sx + sy * sy + sz * sz;
    let discriminant = (vs / vv) ** 2 - ss / vv + 1 / vv;
    if (discriminant < 0) return null;
    discriminant = Math.sqrt(discriminant);
    let t = -discriminant - vs / vv;
    if (t < 0) t = discriminant - vs / vv;
    vec3.scaleAndAdd(out, origin, direction, t);
    return t;
  }

  /** Reports whether a point lies inside an axis-aligned ellipsoid. */
  static _IsPointInsideEllipsoid(center, radii, point)
  {
    const x = (point[0] - center[0]) / radii[0];
    const y = (point[1] - center[1]) / radii[1];
    const z = (point[2] - center[2]) / radii[2];
    return x * x + y * y + z * z <= 1;
  }

  // Mesh bone matrices come from the animation updater; only mat4-shaped
  // entries are usable.

  /**
   * Unpacks one bone from the updater's palette into a mat4, or null when the
   * index is out of range.
   *
   * The palette is Carbon's storage - one contiguous Float4x3 buffer, stride
   * 12 - so a bone is expanded rather than borrowed. Carbon does the same at
   * every read site with TriMatrixCopyFrom3x4.
   */
  static _GetBoneMatrix(updater, boneIndex)
  {
    const bones = updater.GetMeshBoneMatrixList?.();

    if (!bones || boneIndex < 0 || (boneIndex + 1) * 12 > bones.length)
    {
      return null;
    }

    return MatrixCopyFrom3x4(mat4.create(), bones, boneIndex);
  }

  /**
   * Replays every stored controller variable onto a newly added controller or
   * effect child through the named setter, so late additions start with the same
   * state.
   */
  static _ApplyControllerVariables(target, variables, methodName)
  {
    const setter = target?.[methodName];
    if (typeof setter !== "function")
    {
      return;
    }
    for (const [name, value] of variables)
    {
      setter.call(target, name, value);
    }
  }

  /**
   * Samples a curve into out through whichever of Update or GetValueAt it
   * exposes, writing the fallback when there is no curve and copying back curves
   * that return a new array instead of filling out.
   */
  static _UpdateCurve(curve, time, out, fallback)
  {
    if (!curve)
    {
      for (let index = 0; index < out.length; index++)
      {
        out[index] = fallback[index];
      }
      return out;
    }

    let result;
    if (typeof curve.Update === "function")
    {
      result = curve.Update(time, out);
    }
    else if (typeof curve.GetValueAt === "function")
    {
      result = curve.GetValueAt(time, out);
    }
    if ((Array.isArray(result) || ArrayBuffer.isView(result)) && result !== out)
    {
      for (let index = 0; index < out.length; index++)
      {
        out[index] = result[index];
      }
    }
    return out;
  }

  /**
   * Reads a numeric value from the update context, preferring a getter method
   * and falling back to the named properties, and yields 0 when nothing supplies
   * it.
   */
  static _GetContextValue(context, methodName, ...propertyNames)
  {
    const method = context?.[methodName];
    if (typeof method === "function")
    {
      return Number(method.call(context)) || 0;
    }
    for (const propertyName of propertyNames)
    {
      if (context?.[propertyName] !== undefined && context?.[propertyName] !== null)
      {
        return Number(context[propertyName]) || 0;
      }
    }
    return 0;
  }

  /**
   * Returns a world sphere's on-screen diameter in pixels from the frustum's
   * exact query, or 0 when the frustum does not expose it.
   */
  static _GetPixelSize(frustum, sphere)
  {
    const method = frustum?.GetPixelSizeAccross;
    return Number(typeof method === "function" ? method.call(frustum, sphere) : 0) || 0;
  }

  /**
   * Returns a world sphere's on-screen diameter in pixels, preferring the
   * frustum's cheaper estimated query and falling back to the exact one, or 0
   * when the frustum exposes neither.
   */
  static _GetEstimatedPixelSize(frustum, sphere)
  {
    const method = frustum?.GetPixelSizeAccrossEst ?? frustum?.GetPixelSizeAccross;
    return Number(typeof method === "function" ? method.call(frustum, sphere) : 0) || 0;
  }

  /** Writes a center and radius into a caller-owned sph3. */
  static _SetSphere(out, center, radius)
  {
    return sph3.set(out, center[0], center[1], center[2], radius);
  }

  /**
   * Zero-vector fallback for missing translation curves.
   * @type {Array<number>}
   */
  static _zero = [0, 0, 0];

  /**
   * Local up axis used to derive locator directions.
   * @type {Array<number>}
   */
  static _unitY = [0, 1, 0];

  /**
   * Shared vector scratch for locator direction queries.
   * @type {Float32Array}
   */
  static _locatorDirection = vec3.create();
  /**
   * Shared vector scratch for locator position queries.
   * @type {Float32Array}
   */
  static _locatorPosition = vec3.create();
  /**
   * Shared vector scratch for offsets between locators and query positions.
   * @type {Float32Array}
   */
  static _locatorOffset = vec3.create();
  /**
   * Shared vector scratch for transforming query positions into object space.
   * @type {Float32Array}
   */
  static _objectPosition = vec3.create();
  /**
   * Shared vector scratch for constructing a shot miss offset.
   * @type {Float32Array}
   */
  static _missOffset = vec3.create();
  /**
   * Shared vector scratch for constructing a shot miss direction.
   * @type {Float32Array}
   */
  static _missDirection = vec3.create();
  /**
   * Shared vector scratch for the origin of intersection rays.
   * @type {Float32Array}
   */
  static _rayOrigin = vec3.create();
  /**
   * Shared vector scratch for the endpoint of intersection rays.
   * @type {Float32Array}
   */
  static _rayEnd = vec3.create();
  /**
   * Shared vector scratch for the direction of intersection rays.
   * @type {Float32Array}
   */
  static _rayDirection = vec3.create();
  /**
   * Shared vector scratch for ellipsoid intersection centers.
   * @type {Float32Array}
   */
  static _ellipsoidCenter = vec3.create();
  /**
   * Shared vector scratch for ellipsoid intersection radii.
   * @type {Float32Array}
   */
  static _ellipsoidRadii = vec3.create();
  /**
   * Shared vector scratch for minimum bounding-box corners.
   * @type {Float32Array}
   */
  static _boundsMin = vec3.create();
  /**
   * Shared vector scratch for maximum bounding-box corners.
   * @type {Float32Array}
   */
  static _boundsMax = vec3.create();
  /**
   * Shared sphere scratch for querying child bounds.
   * @type {Float32Array}
   */
  static _childSphere = sph3.create();
  /**
   * Shared sphere scratch for querying local bounds.
   * @type {Float32Array}
   */
  static _localSphere = sph3.create();
  /**
   * Shared sphere scratch for world bounds and visibility queries.
   * @type {Float32Array}
   */
  static _worldSphere = sph3.create();
  /**
   * Shared box scratch for local bounding-box queries.
   * @type {Float32Array}
   */
  static _localBox = box3.create();
  /**
   * Shared box scratch for world bounding-box queries.
   * @type {Float32Array}
   */
  static _worldBox = box3.create();

  /**
   * Identity quaternion used when no rotation curve or locator rotation is supplied.
   * @type {Array<number>}
   */
  static _identityRotation = [0, 0, 0, 1];

  /**
   * Identity matrix retained as the default parent-transform argument for visibility updates.
   * @type {Float32Array}
   */
  static _identityTransform = mat4.create();

  /**
   * Name identifying the locator group used for damage and impact queries.
   * @type {string}
   */
  static _damageLocatorSetName = "damage";

  /**
   * Native reflection-mode values exposed for callers.
   * @type {typeof ReflectionMode}
   */
  static ReflectionMode = ReflectionMode;

  /**
   * Native level-of-detail values exposed for callers.
   * @type {typeof Tr2Lod}
   */
  static Tr2Lod = Tr2Lod;

  /**
   * Native impact-configuration values exposed for callers.
   * @type {typeof ImpactConfiguration}
   */
  static ImpactConfiguration = ImpactConfiguration;

  /** Carbon's authored-transform, skeleton-joint and missing-locator tags.
   * Native tags distinguishing authored-transform, joint and missing locators.
   * @type {Readonly<{ELT_TRANSFORM: number, ELT_JOINT: number, ELT_COUNT: number}>}
   */
  static LocatorType = Object.freeze({
    ELT_TRANSFORM: 0,
    ELT_JOINT: 1,
    ELT_COUNT: 2
  });

}

blue.enums.RegisterEnum("trinity.EveSpaceObject2.LocatorType", EveSpaceObject2.LocatorType, {
  source: "trinity/trinity/Eve/SpaceObject/EveSpaceObject2.h", family: "eve/spaceObject", line: 263
});


// Supported native mappings; the concrete self slot enables locator queries.
meta.blue.mapInterface(EveSpaceObject2, IInitialize, IWorldPosition, ITr2ShLightingReceiver, INotify, ITr2SecondaryLightSource)(EveSpaceObject2);

// EveSpaceObject2_Blue.cpp: native exposure; unported contracts: IEveShadowCaster, ITr2Pickable, ITriTargetable, IEveEffectChildrenOwner, IShaderConfigurer, ITr2GrannyAnimationOwner, IEveSpaceObjectDecalOwner, ITr2LightOwner, IEveSpaceObjectAttachmentOwner.
meta.blue.interfaceTable({ interfaces: [EveSpaceObject2, EveEntity, IInitialize, ITr2BoundingBox, IWorldPosition, ITr2ShLightingReceiver, INotify, ITr2SecondaryLightSource, ITr2ImpostorSource, ITr2CurveSetOwner, ITr2SoundEmitterOwner, ITr2ControllerOwner, IEveInheritPropertiesOwner], chainTo: null })(EveSpaceObject2, { kind: "class" });
