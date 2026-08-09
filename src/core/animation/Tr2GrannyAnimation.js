// Source: E:\carbonengine\trinity\trinity\Tr2GrannyAnimation.h
// Source: E:\carbonengine\trinity\trinity\Tr2GrannyAnimation.cpp
//
// Hand-maintained (promoted from src/generated/trinityCore; the generator skips
// it while this file exists). Promoted to give GetMeshBoneMatrixList Carbon's
// storage: one contiguous Float4x3 palette rather than an array of mat4.
import { mat3 } from "@carbonenginejs/runtime-utils/mat3";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { CjsGrannyCurves } from "../../curves/track/CjsGrannyCurves.js";
import { GrannyBoneOffset } from "./GrannyBoneOffset.js";


function createLayer(name = "", weight = 1, allBones = false)
{
  return {
    name,
    weight,
    allBones,
    bones: new Set(),
    queue: [],
    controlParam: 0,
    controlParamTarget: 0,
    controlParamEnabled: false,
    controlParamSkewRate: 0
  };
}


function getName(value)
{
  return String(value?.name ?? value?.Name ?? "");
}


/** No bones: the shape every consumer already handles, per Carbon's else branch. */
const NO_BONES = Object.freeze({ bones: null, boneCount: 0 });


/**
 * The mesh bone palette of an animation updater, or nulls when it has none.
 *
 * Carbon `Tr2GrannyAnimationUtils::GetBoneList` (Tr2GrannyAnimation.cpp:24-33),
 * which every bone consumer calls before threading `(bones, boneCount)` down.
 * An uninitialised updater or a zero bone count yields the same shape as no
 * updater at all, so callers need one branch rather than three.
 *
 * The palette is BORROWED - it is the updater's live buffer, rewritten in place
 * each frame. Do not retain it across frames or mutate it.
 */
export function getBoneList(animationUpdater)
{
  if (!animationUpdater?.IsInitialized?.())
  {
    return NO_BONES;
  }

  const boneCount = animationUpdater.GetMeshBoneCount?.() ?? 0;

  if (!boneCount)
  {
    return NO_BONES;
  }

  const bones = animationUpdater.GetMeshBoneMatrixList?.();

  return bones ? { bones, boneCount } : NO_BONES;
}


/** Tr2GrannyAnimation (trinityCore) - promoted from generated; shapeHash 056bad2a. */
@type.define({ className: "Tr2GrannyAnimation", family: "trinityCore" })
export class Tr2GrannyAnimation extends CjsModel
{

  #additiveMode = false;

  #aimAxis = vec3.fromValues(0, 0, 1);

  #aimBone = "";

  #aimBoneOrientation = vec3.fromValues(0, 0, 1);

  #aimingBone = false;

  #baseLayer = createLayer("", 1, true);

  #curveCache = new WeakMap();

  #initialized = false;

  #layers = new Map();

  #meshBoneIndices = [];

  /**
   * Carbon's `Float4x3* m_meshBoneMatrixList` (Tr2GrannyAnimation.h:208) - one
   * contiguous palette, stride 12, allocated once and rewritten in place.
   */
  #meshBonePalette = null;

  /** Carbon m_useMeshBinding (Tr2GrannyAnimation.cpp:81) - defaults false. */
  #useMeshBinding = false;

  /** Whether grannyRes was borrowed from the mesh rather than resolved here. */
  #sharedGeometry = false;

  #morphAnimations = new Map();

  #morphCurveCache = new WeakMap();

  #morphSample = new Float32Array(1);

  #paused = false;

  #runtimeModel = null;

  #secondaryResources = new Map();

  /** m_resPath (std::string) [PERSISTONLY] */
  @io.persistOnly
  @type.string
  resPath_ = "";

  /** m_model (std::string) [PERSISTONLY] */
  @io.persistOnly
  @type.string
  model_ = "";

  /** m_grannyRes (TriGrannyResPtr) [READ] */
  @io.read
  @type.objectRef("TriGrannyRes")
  grannyRes = null;

  /** m_eventListener (IBlueEventListenerPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("IBlueEventListener")
  eventListener = null;

  /** m_animationEnabled (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  animationEnabled = true;

  /** m_debugRenderJointNames (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  debugRenderJointNames = false;

  /** m_debugRenderSkeleton (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  debugRenderSkeleton = false;

  /** m_boneOffset (PGrannyBoneOffset) [READ] */
  @io.read
  @type.objectRef("GrannyBoneOffset")
  boneOffset = new GrannyBoneOffset();

  /** Resolves an authored resource path from the shared CPU Granny registry. */
  @impl.adapted
  Initialize()
  {
    if (!this.grannyRes && this.resPath_)
    {
      this.grannyRes = CjsGrannyCurves.resolveResource(this.resPath_);
    }
    return this.RebuildCachedData();
  }

  /** Attaches an already decoded TriGrannyRes-compatible resource. */
  @impl.adapted
  SetGrannyResource(resource)
  {
    this.grannyRes = resource ?? null;
    this.#sharedGeometry = false;
    return this.RebuildCachedData();
  }

  /**
   * Binds a geometry resource BORROWED from the mesh this controller animates,
   * rather than one resolved from its own resPath.
   *
   * Carbon `SetSharedGeometryRes` (Tr2GrannyAnimation.h), driven by
   * `EveChildMesh::InitializeAnimation` when the updater has no authored path
   * of its own. A null resource clears the binding, which is Carbon's fallback
   * when the mesh has no geometry yet.
   */
  @carbon.method
  @impl.adapted
  SetSharedGeometryRes(resource)
  {
    this.grannyRes = resource ?? null;
    this.#sharedGeometry = !!resource;
    return this.RebuildCachedData();
  }

  /**
   * Whether the palette is built from the MESH's bone binding.
   *
   * Carbon gates palette construction on this (`m_useMeshBinding`,
   * Tr2GrannyAnimation.cpp:588, :633) and `EveChildMesh::GetBoneTransforms`
   * branches on it to choose between this controller's palette and a separate
   * Tr2AnimationMeshBinding. Defaults false, matching cpp:81.
   */
  @carbon.method
  @impl.implemented
  HasMeshBinding()
  {
    return this.#useMeshBinding;
  }

  /** Carbon `SetUseMeshBinding` (Tr2GrannyAnimation.h:60). */
  @carbon.method
  @impl.implemented
  SetUseMeshBinding(enable)
  {
    this.#useMeshBinding = !!enable;
  }

  /** Whether the bound geometry was borrowed from the mesh. */
  @impl.adapted
  HasSharedGeometryRes()
  {
    return this.#sharedGeometry;
  }

  /** Rebuilds browser bone state directly from format-gr2's stable payload. */
  @impl.adapted
  RebuildCachedData()
  {
    const source = this.#getSource(this.grannyRes);
    const models = this.#getArray(source, "models", "Models");
    const model = models.find(item => getName(item) === this.model_) ?? models[0] ?? null;
    const skeleton = model?.skeleton ?? model?.Skeleton ?? null;
    const sourceBones = this.#getArray(skeleton, "bones", "Bones");
    this.#runtimeModel = null;
    this.#meshBoneIndices.length = 0;
    this.#curveCache = new WeakMap();
    this.#morphCurveCache = new WeakMap();
    this.#morphAnimations.clear();
    this.boneOffset?.ClearRigBindings?.();
    if (!model || sourceBones.length === 0)
    {
      this.#initialized = false;
      return false;
    }

    const bones = sourceBones.map((sourceBone, index) => this.#createBone(sourceBone, index));
    const boneByName = new Map(bones.map((bone, index) => [bone.name, index]));
    this.#runtimeModel = { source, model, skeleton, bones, boneByName };
    this.#rebuildRestTransforms();
    this.#rebuildMeshBoneIndices();
    this.#initialized = true;
    this.Update(0);
    return true;
  }

  /** Advances CPU animation controls and rebuilds browser bone matrices. */
  @impl.adapted
  Update(dt = 0)
  {
    if (!this.#initialized || !this.animationEnabled)
    {
      return false;
    }
    const deltaTime = this.#paused ? 0 : Math.max(0, Number(dt) || 0);
    this.#advanceLayer(this.#baseLayer, deltaTime);
    for (const layer of this.#getOrderedLayers())
    {
      this.#advanceLayer(layer, deltaTime);
    }
    this.#resetPose();
    this.#morphAnimations.clear();
    this.#sampleLayer(this.#baseLayer, false);
    for (const layer of this.#getOrderedLayers())
    {
      this.#sampleLayer(layer, this.#additiveMode);
    }
    this.#applyBoneOffsets();
    this.#composePose();
    return true;
  }

  /** Carbon method PlayAnimationEx (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.adapted
  PlayAnimationEx(animName, loopCount, delay, speed, clearWhenDone = true)
  {
    return this.PlayAnimation(animName, true, loopCount, delay, speed, clearWhenDone);
  }

  /** Carbon method AddAnimationLayer (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  AddAnimationLayer(layerName, layerWeight = 1)
  {
    const name = String(layerName ?? "");
    if (!name || this.#layers.has(name))
    {
      return false;
    }
    this.#layers.set(name, createLayer(name, Number(layerWeight) || 0, false));
    return true;
  }

  /** Carbon method AddAnimationLayerAllBones (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  AddAnimationLayerAllBones(layerName)
  {
    const layer = this.#getLayer(layerName);
    if (!layer)
    {
      return false;
    }
    layer.allBones = true;
    return true;
  }

  /** Carbon method AddAnimationLayerBone (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  AddAnimationLayerBone(layerName, boneName)
  {
    const layer = this.#getLayer(layerName);
    if (!layer)
    {
      return false;
    }
    layer.bones.add(String(boneName ?? ""));
    return true;
  }

  /** Carbon method AddSecondaryResPath (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Resource loading stays runtime-resource-owned; registered decoded resources are attached synchronously when available.")
  AddSecondaryResPath(resPath)
  {
    const path = String(resPath ?? "");
    if (!path || this.#secondaryResources.has(path))
    {
      return false;
    }
    this.#secondaryResources.set(path, CjsGrannyCurves.resolveResource(path));
    return true;
  }

  /** Attaches a decoded secondary animation resource after async loading. */
  @impl.adapted
  SetSecondaryGrannyResource(resPath, resource)
  {
    const path = String(resPath ?? "");
    if (!path)
    {
      return false;
    }
    this.#secondaryResources.set(path, resource ?? null);
    return true;
  }

  /** Carbon method AimBone (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("The browser graph retains Carbon's aim request; final IK realization can be refined by an engine adapter.")
  AimBone(boneName, targetX, targetY, targetZ, axisX, axisY, axisZ)
  {
    this.#aimingBone = true;
    this.#aimBone = String(boneName ?? "");
    vec3.set(this.#aimBoneOrientation, targetX, targetY, targetZ);
    vec3.set(this.#aimAxis, axisX, axisY, axisZ);
  }

  /** Carbon method ChainAnimation (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  ChainAnimation(animName)
  {
    return this.PlayAnimation(animName, false, 1, 0, 1, true);
  }

  /** Carbon method ChainAnimationEx (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  ChainAnimationEx(animName, loopCount, delay, speed)
  {
    return this.PlayAnimation(animName, false, loopCount, delay, speed, true);
  }

  /** Carbon method ClearAnimations (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  ClearAnimations()
  {
    this.#baseLayer.queue.length = 0;
  }

  /** Carbon method ClearAnimationLayers (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  ClearAnimationLayers()
  {
    this.#layers.clear();
  }

  /** Carbon method DisableAimBone (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  DisableAimBone()
  {
    this.#aimingBone = false;
  }

  /** Carbon method EndAnimation (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  EndAnimation()
  {
    const request = this.#baseLayer.queue[0];
    this.#baseLayer.queue.splice(1);
    if (!request?.animation)
    {
      return;
    }
    const duration = this.#getAnimationDuration(request.animation);
    if (duration > 0)
    {
      const localTime = Math.max(0, request.elapsed) * Math.abs(request.speed);
      request.loopCount = Math.floor(localTime / duration) + 1;
    }
  }

  /** Carbon method GetAdditiveBlendMode (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetAdditiveBlendMode()
  {
    return this.#additiveMode;
  }

  /** Carbon method GetLayerWeight (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetLayerWeight(layerName)
  {
    return this.#getLayer(layerName)?.weight ?? 0;
  }

  /** Carbon method GetSecondaryAnimationName (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  GetSecondaryAnimationName(resPath, index)
  {
    const source = this.#getSource(this.#secondaryResources.get(String(resPath ?? "")));
    return getName(CjsGrannyCurves.getAnimations(source)[Number(index) || 0]);
  }

  /** Carbon method PlayAnimation -> PlayAnimationOnce (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  PlayAnimation(animName, replace = true, loopCount = 1, delay = 0, speed = 1, clearWhenDone = true)
  {
    return this.#playLayer("", animName, replace, loopCount, delay, speed, clearWhenDone);
  }

  /** Native-name alias retained for controller integrations. */
  @impl.adapted
  PlayAnimationOnce(animName)
  {
    return this.PlayAnimation(animName, true, 1, 0, 1, true);
  }

  /** Carbon method PlayLayerAnimation -> PlayLayerAnimationByName (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  PlayLayerAnimation(layerName, animName, replace = true, loopCount = 1, delay = 0, speed = 1, clearWhenDone = true)
  {
    return this.#playLayer(layerName, animName, replace, loopCount, delay, speed, clearWhenDone);
  }

  /** Alias used by Carbon controller actions. */
  @impl.adapted
  PlayLayerAnimationByName(...args)
  {
    return this.PlayLayerAnimation(...args);
  }

  /** Carbon method RemoveAnimationLayerBone (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  RemoveAnimationLayerBone(layerName, boneName)
  {
    const layer = this.#getLayer(layerName);
    return layer ? layer.bones.delete(String(boneName ?? "")) : false;
  }

  /** Carbon method GetAnimationNames (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  GetAnimationNames()
  {
    const names = [];
    const append = resource =>
    {
      const source = this.#getSource(resource);
      for (const animation of CjsGrannyCurves.getAnimations(source))
      {
        names.push(getName(animation));
      }
    };
    append(this.grannyRes);
    for (const resource of this.#secondaryResources.values())
    {
      append(resource);
    }
    return names;
  }

  /** Carbon method SetAdditiveBlendMode (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetAdditiveBlendMode(additive)
  {
    this.#additiveMode = !!additive;
  }

  /** Carbon method SetLayerControlParam (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetLayerControlParam(layerName, controlParam)
  {
    const layer = this.#getLayer(layerName);
    if (!layer)
    {
      return false;
    }
    layer.controlParamTarget = Number(controlParam) || 0;
    layer.controlParamEnabled = true;
    return true;
  }

  /** Carbon method SetLayerControlParamSkewRate (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetLayerControlParamSkewRate(layerName, skewRate)
  {
    const layer = this.#getLayer(layerName);
    if (!layer)
    {
      return false;
    }
    layer.controlParamSkewRate = Number(skewRate) || 0;
    return true;
  }

  /** Carbon method SetLayerWeight (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetLayerWeight(layerName, layerWeight)
  {
    const layer = this.#getLayer(layerName);
    if (!layer)
    {
      return false;
    }
    layer.weight = Number(layerWeight) || 0;
    return true;
  }

  /** Carbon method TogglePauseAnimations (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  TogglePauseAnimations(pause)
  {
    this.#paused = !!pause;
  }

  /** Returns whether a model-bearing decoded Granny payload is ready. */
  @impl.implemented
  IsInitialized()
  {
    return this.#initialized;
  }

  /**
   * The mesh-order bone palette, in Carbon's storage: ONE contiguous buffer of
   * Float4x3 entries, stride 12, not an array of matrices.
   *
   * Carbon holds `Float4x3* m_meshBoneMatrixList` (Tr2GrannyAnimation.h:208)
   * and every CPU consumer unpacks it with `TriMatrixCopyFrom3x4`. The JS
   * consumers already expect that shape - `MatrixCopyFrom3x4` indexes
   * `boneIndex * 12` for the light sets, bounds and decals - so the palette is
   * built here rather than converted at each of nine call sites. It is also
   * what an uploader wants: one block, handed over whole.
   *
   * Float4x3 drops the constant fourth column and stores the first three
   * columns of the 4x4 (Utilities/MatrixUtils.cpp:6-20).
   */
  @impl.adapted
  GetMeshBoneMatrixList()
  {
    const bones = this.#runtimeModel?.bones ?? [];
    const count = this.#meshBoneIndices.length;

    if (!this.#meshBonePalette || this.#meshBonePalette.length !== count * 12)
    {
      this.#meshBonePalette = new Float32Array(count * 12);
    }

    const palette = this.#meshBonePalette;

    for (let index = 0; index < count; index++)
    {
      const source = bones[this.#meshBoneIndices[index]]?.offsetTransform;
      const base = index * 12;

      if (!source)
      {
        // Carbon leaves an unmapped bone at whatever the palette held; identity
        // is the reproducible stand-in and keeps a missing bone from collapsing
        // its geometry to the origin.
        palette[base] = palette[base + 5] = palette[base + 10] = 1;
        palette[base + 1] = palette[base + 2] = palette[base + 3] = 0;
        palette[base + 4] = palette[base + 6] = palette[base + 7] = 0;
        palette[base + 8] = palette[base + 9] = palette[base + 11] = 0;
        continue;
      }

      // Columns of the 4x4, which is rows of its transpose. gl-matrix is
      // column-major, so column c is source[c * 4 + r].
      palette[base] = source[0];
      palette[base + 1] = source[4];
      palette[base + 2] = source[8];
      palette[base + 3] = source[12];
      palette[base + 4] = source[1];
      palette[base + 5] = source[5];
      palette[base + 6] = source[9];
      palette[base + 7] = source[13];
      palette[base + 8] = source[2];
      palette[base + 9] = source[6];
      palette[base + 10] = source[10];
      palette[base + 11] = source[14];
    }

    return palette;
  }

  @impl.implemented
  GetMeshBoneCount()
  {
    return this.#meshBoneIndices.length;
  }

  @impl.adapted
  GetBoneWorldTransform(boneName, out = mat4.create())
  {
    const index = this.#runtimeModel?.boneByName.get(String(boneName ?? ""));
    if (index === undefined)
    {
      return false;
    }
    mat4.copy(out, this.#runtimeModel.bones[index].worldTransform);
    return out;
  }

  @impl.adapted
  GetBoneTransform(index, out = mat4.create())
  {
    const bone = this.#runtimeModel?.bones[Number(index)];
    if (!bone)
    {
      return false;
    }
    mat4.copy(out, bone.worldTransform);
    return out;
  }

  @impl.adapted
  GetBoneMatrix(bone)
  {
    if (typeof bone === "number")
    {
      return this.GetBoneTransform(bone);
    }
    return this.GetBoneWorldTransform(bone);
  }

  @impl.implemented
  GetAnimationTransforms()
  {
    return this.#runtimeModel?.bones.map(bone => bone.worldTransform) ?? [];
  }

  @impl.implemented
  GetAnimationBoneList()
  {
    return this.#runtimeModel?.bones.map(bone => bone.name) ?? [];
  }

  /** Returns a detached snapshot of morph values sampled during the last update. */
  @impl.implemented
  GetMorphAnimations()
  {
    return new Map(this.#morphAnimations);
  }

  /** Exposes retained aim state to an engine-side IK adapter. */
  @impl.adapted
  GetAimBoneState()
  {
    return {
      enabled: this.#aimingBone,
      boneName: this.#aimBone,
      target: vec3.clone(this.#aimBoneOrientation),
      axis: vec3.clone(this.#aimAxis)
    };
  }

  #advanceLayer(layer, dt)
  {
    if (layer.controlParamEnabled)
    {
      const difference = layer.controlParamTarget - layer.controlParam;
      const increment = Math.abs(layer.controlParamSkewRate * dt);
      if (increment === 0 || Math.abs(difference) <= increment)
      {
        layer.controlParam = layer.controlParamTarget;
      }
      else
      {
        layer.controlParam += Math.sign(difference) * increment;
      }
    }
    const request = layer.queue[0];
    if (!request)
    {
      return;
    }
    request.animation ??= this.#findAnimation(request.name);
    if (!request.animation)
    {
      return;
    }
    request.elapsed += dt;
    const duration = this.#getAnimationDuration(request.animation);
    const speed = Math.abs(request.speed);
    if (duration <= 0 || request.elapsed < 0 || request.loopCount <= 0)
    {
      return;
    }
    if (request.elapsed * speed < duration * request.loopCount)
    {
      return;
    }
    if (layer.queue.length > 1 || request.clearWhenDone)
    {
      layer.queue.shift();
    }
    else
    {
      request.elapsed = duration * request.loopCount / speed;
      request.held = true;
    }
  }

  #applyBoneOffsets()
  {
    const bones = this.#runtimeModel?.bones ?? [];
    const offsets = this.boneOffset;
    if (!bones.length || !offsets?.HaveTransforms?.())
    {
      return;
    }

    if (offsets.NeedRebind?.(bones.length))
    {
      offsets.BindToRig?.(bones.map(bone => bone.name), bones.length);
    }

    for (const bone of bones)
    {
      offsets.ApplyToLocal?.(bone.index, bone.orientation, bone.position);
    }
  }

  #composePose()
  {
    const rotationMatrix = mat4.create();
    for (const bone of this.#runtimeModel.bones)
    {
      // Granny composite applies ScaleShear FIRST, then Orientation, then
      // Position (row-vector SS*R*T - authority: the validated gr2->CMF
      // converter, runtime-resource formats/cmf/core/gr2Anim.js composeTrs).
      // In gl-matrix that is local = R . SS with the translation stamped in.
      // Order-insensitive for identity scaleShear (all EVE skeletons).
      mat4.fromMat3(bone.localTransform, bone.scaleShear);
      mat4.multiply(bone.localTransform, mat4.fromQuat(rotationMatrix, bone.orientation), bone.localTransform);
      bone.localTransform[12] = bone.position[0];
      bone.localTransform[13] = bone.position[1];
      bone.localTransform[14] = bone.position[2];
      if (bone.parentIndex >= 0 && this.#runtimeModel.bones[bone.parentIndex])
      {
        mat4.multiply(bone.worldTransform, this.#runtimeModel.bones[bone.parentIndex].worldTransform, bone.localTransform);
      }
      else
      {
        mat4.copy(bone.worldTransform, bone.localTransform);
      }
      mat4.multiply(bone.offsetTransform, bone.worldTransform, bone.inverseRestTransform);
    }
  }

  #createBone(source, index)
  {
    const sourcePosition = source.position ?? source.Position ?? [0, 0, 0];
    const sourceOrientation = source.orientation ?? source.Orientation ?? [0, 0, 0, 1];
    const sourceScaleShear = source.scaleShear ?? source.ScaleShear ?? [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const parent = Number(source.parentIndex ?? source.ParentIndex ?? -1);
    return {
      index,
      name: getName(source) || String(source.bone ?? source.Bone ?? ""),
      parentIndex: parent === 255 ? -1 : parent,
      restPosition: vec3.fromValues(sourcePosition[0] ?? 0, sourcePosition[1] ?? 0, sourcePosition[2] ?? 0),
      restOrientation: quat.fromValues(sourceOrientation[0] ?? 0, sourceOrientation[1] ?? 0, sourceOrientation[2] ?? 0, sourceOrientation[3] ?? 1),
      restScaleShear: mat3.fromValues(...sourceScaleShear),
      position: vec3.create(),
      orientation: quat.create(),
      scaleShear: mat3.create(),
      localTransform: mat4.create(),
      worldTransform: mat4.create(),
      inverseRestTransform: mat4.create(),
      offsetTransform: mat4.create()
    };
  }

  #decodeTrack(track)
  {
    let value = this.#curveCache.get(track);
    if (!value)
    {
      value = {
        position: CjsGrannyCurves.decodeGrannyCurve(track.position ?? track.Position, 3),
        orientation: CjsGrannyCurves.decodeGrannyCurve(track.orientation ?? track.Orientation, 4),
        scaleShear: CjsGrannyCurves.decodeGrannyCurve(track.scaleShear ?? track.ScaleShear, 9)
      };
      this.#curveCache.set(track, value);
    }
    return value;
  }

  #findAnimation(name)
  {
    const target = String(name ?? "");
    const find = resource => CjsGrannyCurves.getAnimations(this.#getSource(resource)).find(animation => getName(animation) === target);
    let animation = find(this.grannyRes);
    if (animation)
    {
      return animation;
    }
    for (const resource of this.#secondaryResources.values())
    {
      animation = find(resource);
      if (animation)
      {
        return animation;
      }
    }
    return null;
  }

  #getAnimationDuration(animation)
  {
    return Math.max(0, CjsGrannyCurves.getAnimationDuration(animation));
  }

  #getArray(value, lowerName, upperName)
  {
    return Array.isArray(value?.[lowerName]) ? value[lowerName] : Array.isArray(value?.[upperName]) ? value[upperName] : [];
  }

  #getLayer(layerName)
  {
    const name = String(layerName ?? "");
    return name ? this.#layers.get(name) ?? null : this.#baseLayer;
  }

  #getOrderedLayers()
  {
    return [ ...this.#layers.entries() ]
      .sort(([ left ], [ right ]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([, layer ]) => layer);
  }

  #getSource(resource)
  {
    let value = resource?.GetPayload?.() ?? resource;
    const seen = new Set();
    while (value && typeof value === "object" && !seen.has(value))
    {
      seen.add(value);
      if (Array.isArray(value.animations) || Array.isArray(value.Animations))
      {
        return value;
      }
      value = value.json ?? value.Json ?? value.data ?? value.Data ?? value.value ?? value.Value ?? value.source ?? value.Source ?? value.fileInfo ?? value.FileInfo;
    }
    return null;
  }

  #playLayer(layerName, animName, replace, loopCount, delay, speed, clearWhenDone)
  {
    const layer = this.#getLayer(layerName);
    const name = String(animName ?? "");
    if (!layer || !name)
    {
      return false;
    }
    const animation = this.#findAnimation(name);
    if (!animation && this.#getSource(this.grannyRes))
    {
      return false;
    }
    if (replace)
    {
      layer.queue.length = 0;
    }
    layer.queue.push({
      name,
      animation,
      loopCount: Math.max(0, Math.trunc(Number(loopCount) || 0)),
      elapsed: -Math.max(0, Number(delay) || 0),
      speed: Number.isFinite(Number(speed)) ? Number(speed) : 1,
      clearWhenDone: !!clearWhenDone,
      held: false
    });
    return true;
  }

  #rebuildMeshBoneIndices()
  {
    const { source, model, bones, boneByName } = this.#runtimeModel;
    const meshBindings = this.#getArray(model, "meshBindings", "MeshBindings");
    const meshes = this.#getArray(source, "meshes", "Meshes");
    const mesh = meshes[Number(meshBindings[0]) || 0];
    const bindings = this.#getArray(mesh, "boneBindings", "BoneBindings");
    this.#meshBoneIndices = bindings
      .map(binding => boneByName.get(getName(binding)))
      .filter(index => index !== undefined);
    if (this.#meshBoneIndices.length === 0)
    {
      this.#meshBoneIndices = bones.map((_, index) => index);
    }
  }

  #rebuildRestTransforms()
  {
    const rotationMatrix = mat4.create();
    for (const bone of this.#runtimeModel.bones)
    {
      // Granny composite: ScaleShear first, then Orientation (see #composePose).
      mat4.fromMat3(bone.localTransform, bone.restScaleShear);
      mat4.multiply(bone.localTransform, mat4.fromQuat(rotationMatrix, bone.restOrientation), bone.localTransform);
      bone.localTransform[12] = bone.restPosition[0];
      bone.localTransform[13] = bone.restPosition[1];
      bone.localTransform[14] = bone.restPosition[2];
      if (bone.parentIndex >= 0 && this.#runtimeModel.bones[bone.parentIndex])
      {
        mat4.multiply(bone.worldTransform, this.#runtimeModel.bones[bone.parentIndex].worldTransform, bone.localTransform);
      }
      else
      {
        mat4.copy(bone.worldTransform, bone.localTransform);
      }
      if (!mat4.invert(bone.inverseRestTransform, bone.worldTransform))
      {
        mat4.identity(bone.inverseRestTransform);
      }
    }
  }

  #resetPose()
  {
    for (const bone of this.#runtimeModel.bones)
    {
      vec3.copy(bone.position, bone.restPosition);
      quat.copy(bone.orientation, bone.restOrientation);
      mat3.copy(bone.scaleShear, bone.restScaleShear);
    }
  }

  #decodeMorphCurve(curve, modern)
  {
    if (!curve || typeof curve !== "object")
    {
      return null;
    }

    if (!this.#morphCurveCache.has(curve))
    {
      this.#morphCurveCache.set(curve, modern
        ? CjsGrannyCurves.decodeAnimationCurve(curve, 1)
        : CjsGrannyCurves.decodeGrannyCurve(curve, 1));
    }
    return this.#morphCurveCache.get(curve);
  }

  #sampleMorphs(animation, time, duration, weight, additive)
  {
    if (!(duration > 0) || time < 0 || time >= duration)
    {
      return;
    }

    const amount = Number(weight) || 0;
    const channels = this.#getArray(animation, "channels", "Channels");
    const curves = this.#getArray(animation, "curves", "Curves");
    for (const channel of channels)
    {
      const targetType = channel.targetType ?? channel.TargetType;
      if (targetType !== "MorphTarget" && targetType !== 3)
      {
        continue;
      }

      const name = String(channel.target ?? channel.Target ?? "");
      const curve = curves[Number(channel.curveIndex ?? channel.CurveIndex)];
      this.#sampleMorph(name, this.#decodeMorphCurve(curve, true), time, duration, amount, additive);
    }

    for (const group of CjsGrannyCurves.getTrackGroups(animation))
    {
      if (getName(group) !== "root")
      {
        continue;
      }

      for (const track of this.#getArray(group, "vectorTracks", "VectorTracks"))
      {
        const curve = track.valueCurve ?? track.ValueCurve;
        const dimension = Number(track.dimension ?? track.Dimension ?? curve?.dimension ?? curve?.Dimension);
        if (dimension !== 1)
        {
          continue;
        }
        this.#sampleMorph(getName(track), this.#decodeMorphCurve(curve, false), time, duration, amount, additive);
      }
      break;
    }
  }

  #sampleMorph(name, curve, time, duration, weight, additive)
  {
    if (!name || !curve)
    {
      return;
    }

    this.#morphSample[0] = 0;
    CjsGrannyCurves.sampleGrannyCurve(this.#morphSample, curve, time, false, duration);
    const value = this.#morphSample[0] * weight;
    if (!Number.isFinite(value))
    {
      return;
    }

    const previous = this.#morphAnimations.get(name);
    this.#morphAnimations.set(name, additive && previous !== undefined ? previous + value : value);
  }

  #sampleLayer(layer, additive)
  {
    const request = layer.queue[0];
    const animation = request?.animation;
    if (!animation || request.elapsed < 0)
    {
      return;
    }
    const duration = this.#getAnimationDuration(animation);
    const speed = Math.abs(request.speed);
    let time = layer.controlParamEnabled ? layer.controlParam * duration : request.elapsed * speed;
    if (duration > 0)
    {
      const totalDuration = request.loopCount > 0 ? duration * request.loopCount : Infinity;
      if (time >= totalDuration)
      {
        time = request.speed < 0 ? 0 : duration;
      }
      else
      {
        time %= duration;
        if (request.speed < 0)
        {
          time = time === 0 ? duration : duration - time;
        }
      }
    }
    this.#sampleMorphs(animation, time, duration, layer.weight, additive);
    const trackGroups = CjsGrannyCurves.getTrackGroups(animation);
    const modelName = getName(this.#runtimeModel.model);
    const matchingGroups = trackGroups.filter(group => getName(group) === modelName);
    for (const group of matchingGroups.length ? matchingGroups : trackGroups)
    {
      const tracks = this.#getArray(group, "transformTracks", "TransformTracks");
      for (const track of tracks)
      {
        const boneIndex = this.#runtimeModel.boneByName.get(getName(track));
        const bone = this.#runtimeModel.bones[boneIndex];
        if (!bone || (!layer.allBones && !layer.bones.has(bone.name)))
        {
          continue;
        }
        this.#sampleTrack(bone, track, time, duration, layer.weight, additive);
      }
    }
  }

  #sampleTrack(bone, track, time, duration, weight, additive)
  {
    const curves = this.#decodeTrack(track);
    const position = vec3.clone(bone.restPosition);
    const orientation = quat.clone(bone.restOrientation);
    const scaleShear = mat3.clone(bone.restScaleShear);
    if (curves.position)
    {
      CjsGrannyCurves.sampleGrannyCurve(position, curves.position, time, false, duration);
    }
    if (curves.orientation)
    {
      CjsGrannyCurves.sampleGrannyCurve(orientation, curves.orientation, time, false, duration);
      quat.normalize(orientation, orientation);
    }
    if (curves.scaleShear)
    {
      CjsGrannyCurves.sampleGrannyCurve(scaleShear, curves.scaleShear, time, false, duration);
    }
    const amount = Math.max(0, Number(weight) || 0);
    if (!additive)
    {
      vec3.lerp(bone.position, bone.position, position, Math.min(1, amount));
      quat.slerp(bone.orientation, bone.orientation, orientation, Math.min(1, amount));
      for (let index = 0; index < 9; index++)
      {
        bone.scaleShear[index] += (scaleShear[index] - bone.scaleShear[index]) * Math.min(1, amount);
      }
      return;
    }

    const referencePosition = vec3.clone(bone.restPosition);
    const referenceOrientation = quat.clone(bone.restOrientation);
    const referenceScaleShear = mat3.clone(bone.restScaleShear);
    if (curves.position)
    {
      CjsGrannyCurves.sampleGrannyCurve(referencePosition, curves.position, 0, false, duration);
    }
    if (curves.orientation)
    {
      CjsGrannyCurves.sampleGrannyCurve(referenceOrientation, curves.orientation, 0, false, duration);
      quat.normalize(referenceOrientation, referenceOrientation);
    }
    if (curves.scaleShear)
    {
      CjsGrannyCurves.sampleGrannyCurve(referenceScaleShear, curves.scaleShear, 0, false, duration);
    }
    vec3.scaleAndAdd(bone.position, bone.position, vec3.subtract(position, position, referencePosition), amount);
    // Additive delta = orientation . reference^-1, applied on the LEFT of the
    // current pose (out = delta . bone), so amount=1 from the reference pose
    // recovers the authored orientation exactly. Authority: the visually
    // proven reverse-engineered composeInteriorAdditivePose
    // (e:\ccpwgl\src\interior\character\Tr2InteriorAdditiveAnimation.js) -
    // right-multiplying conjugates the delta instead.
    const inverseReference = quat.invert(quat.create(), referenceOrientation);
    const delta = quat.multiply(quat.create(), orientation, inverseReference);
    quat.slerp(delta, quat.create(), delta, Math.min(1, amount));
    quat.multiply(bone.orientation, delta, bone.orientation);
    quat.normalize(bone.orientation, bone.orientation);
    for (let index = 0; index < 9; index++)
    {
      bone.scaleShear[index] += (scaleShear[index] - referenceScaleShear[index]) * amount;
    }
  }

}
