import { exposure as be } from "#be";
import { ITr2DebugRenderable } from "#interfaces/ITr2DebugRenderable";
import { ITr2SkinnedObject } from "./ITr2SkinnedObject.js";
// Source: trinity/trinity/Tr2SkinnedObject.h
import { meta, type, blue } from "#schema";
import { IsMatch, IListNotify, INotify } from "#blue";
import { IWorldPosition } from "../../../trinity/core/IWorldPosition.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsCharacterRigBinding } from "../../controls/CjsCharacterRigBinding.js";
import { Tr2SkinnedObjectLod } from "./Tr2SkinnedObjectLod.js";
import { ITr2Renderable } from "../../../trinity/core/ITr2Renderable.js";

/**
 * Skinned character object managing whole-model LOD selection and an immediate
 * CPU skinning palette.
 */
@blue.define({
  className: "Tr2SkinnedObject",
  abstract: true,
  fields: {
    // MAP_PROPERTY_READONLY (Tr2SkinnedObject_Blue.cpp:48).
    currentLod: [blue.property(), type.int32]
  }
})
@blue.inherit(ITr2Renderable, IWorldPosition, IListNotify, INotify, ITr2SkinnedObject, ITr2DebugRenderable)
@blue.interface(ITr2Renderable, IWorldPosition, IListNotify)
export class Tr2SkinnedObject
{

  /** Native base list observer intentionally does nothing (Tr2SkinnedObject.cpp:743). */

  @meta.implemented
  OnListModified(_event, _key, _key2, _value, _theList) {}

  /** Native base has no transparent-sort offset. */

  @meta.implemented
  GetSortValue() { return 0; }

  /** Native base supplies no per-object render data. */

  @meta.implemented
  GetPerObjectData(_accumulator) { return null; }

  /** World position awaits the maintained TriMatrix storage conversion contract. */

  @meta.notImplemented
  GetWorldPosition(_out) { throw new Error("Tr2SkinnedObject.GetWorldPosition requires the TriMatrix conversion port."); }

  /** World rotation awaits the maintained TriMatrix storage conversion contract. */

  @meta.notImplemented
  GetWorldRotation() { throw new Error("Tr2SkinnedObject.GetWorldRotation requires the TriMatrix conversion port."); }

  lod = new Tr2SkinnedObjectLod();
  _lastUpdateTime = 0;

  _skeletonTag = 0;

  _boneList = [];

  _boneListSource = null;

  _rigBinding = new CjsCharacterRigBinding();

  /** m_skinningMatrixFrameDelay (unsigned int) [READ] */
  @be.mapAttribute(be.READ)
  @type.uint32
  frameDelay = 0;

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("TriCurveSet")
  curveSets = [];

  /** m_maxBounds (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.vec3
  explicitMaxBounds = vec3.create();

  /** m_minBounds (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.vec3
  explicitMinBounds = vec3.create();

  /** m_updatePeriod (float) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.float32
  updatePeriod = 0;

  /**
   * m_transform (PTriMatrix) [READ, PERSIST]: the object's world transform.
   * Carbon holds a PTriMatrix (a Blue object wrapping a Matrix); the port holds the
   * matrix itself as a mat4, and Black reads the embedded TriMatrix's _11.._44 into it.
   * Carbon's row-major Matrix has gl-matrix's byte layout, so no conversion is needed.
   * @type {mat4}
   */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.mat4.wrapped("TriMatrix")
  transform = mat4.create();

  /**
   * Carbon GetTransform (Tr2SkinnedObject.h:57-60): the world transform, copied
   * into out.
   * @param {mat4} out
   * @returns {mat4} out
   */
  @meta.implemented

  GetTransform(out)
  {
    return mat4.copy(out, this.transform);
  }

  /** m_visualModel (Tr2SkinnedModelPtr) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.rootRef("Tr2SkinnedModel")
  visualModel = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_animationUpdater (ITr2AnimationUpdaterPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("ITr2AnimationUpdater")
  animationUpdater = null;

  /** m_worldTransformUpdater (ITr2WorldTransformUpdaterPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("ITr2WorldTransformUpdater")
  worldTransformUpdater = null;

  // MAP_ATTRIBUTE("highDetailModel", m_lod.m_highDetailProxy, READWRITE | PERSIST | NOTIFY)
  // (Tr2SkinnedObject_Blue.cpp:49-51): an attribute whose offset points into the
  // embedded Tr2SkinnedObjectLod m_lod (Tr2SkinnedObject.h:218). The accessors are
  // only that path; a write is a raw store, and NOTIFY then reaches OnModified.

  /** Reads the high-detail proxy stored by the native LOD helper. */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.rootRef("IBlueObjectProxy")
  get highDetailModel()
  {
    return this.lod.highDetailProxy;
  }

  /** Replaces the high-detail proxy stored by the native LOD helper. */
  set highDetailModel(value)
  {
    this.lod.highDetailProxy = value;
  }

  // MAP_ATTRIBUTE("lowDetailModel", m_lod.m_lowDetailProxy, READWRITE | PERSIST | NOTIFY)
  // (Tr2SkinnedObject_Blue.cpp:49-51): an attribute whose offset points into the
  // embedded Tr2SkinnedObjectLod m_lod (Tr2SkinnedObject.h:218). The accessors are
  // only that path; a write is a raw store, and NOTIFY then reaches OnModified.

  /** Reads the low-detail proxy stored by the native LOD helper. */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.rootRef("IBlueObjectProxy")
  get lowDetailModel()
  {
    return this.lod.lowDetailProxy;
  }

  /** Replaces the low-detail proxy stored by the native LOD helper. */
  set lowDetailModel(value)
  {
    this.lod.lowDetailProxy = value;
  }

  // MAP_ATTRIBUTE("mediumDetailModel", m_lod.m_mediumDetailProxy, READWRITE | PERSIST | NOTIFY)
  // (Tr2SkinnedObject_Blue.cpp:49-51): an attribute whose offset points into the
  // embedded Tr2SkinnedObjectLod m_lod (Tr2SkinnedObject.h:218). The accessors are
  // only that path; a write is a raw store, and NOTIFY then reaches OnModified.

  /** Reads the medium-detail proxy stored by the native LOD helper. */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.rootRef("IBlueObjectProxy")
  get mediumDetailModel()
  {
    return this.lod.mediumDetailProxy;
  }

  /** Replaces the medium-detail proxy stored by the native LOD helper. */
  set mediumDetailModel(value)
  {
    this.lod.mediumDetailProxy = value;
  }

  /** m_lod.GetCurrentLod() (int) [READ] */
  get currentLod()
  {
    return this.lod.GetCurrentLod();
  }

  /** m_numRenderRigBones (unsigned int) [READ] */
  @be.mapAttribute(be.READ)
  @type.uint32
  renderRigBoneCount = 0;

  /** m_skinningMatrixCount (unsigned int) [READ] */
  @be.mapAttribute(be.READ)
  @type.uint32
  skinningMatrixCount = 0;

  /** m_useDynamicBounds (bool) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.boolean
  useDynamicBounds = true;

  /** m_useExplicitBounds (bool) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.boolean
  useExplicitBounds = false;

  /** m_estimatedPixelDiameter (float) [READ] */
  @be.mapAttribute(be.READ)
  @type.float32
  estimatedPixelDiameter = 0;

  /** m_display (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  display = true;

  /**
   * Carbon INotify hook: retains active model changes in the selected proxy.
   */

  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "visualModel"))
    {
      this.lod.OnModelChanged(this.visualModel);
      return true;
    }
    return false;
  }

  /** Carbon method GetCurrentLod. */

  @meta.implemented
  GetCurrentLod()
  {
    return this.lod.GetCurrentLod();
  }

  /**
   * Carbon method SetHighDetailModel.
   *
   * Adapted: Proxy construction belongs to the outer runtime adapter; this delegates to an
   * already supplied proxy.
   */

  @meta.adapted
  SetHighDetailModel(model)
  {
    this.lod.SetHighDetailModel(model);
  }

  /**
   * Carbon method SetMediumDetailModel.
   *
   * Adapted: Proxy construction belongs to the outer runtime adapter; this delegates to an
   * already supplied proxy.
   */

  @meta.adapted
  SetMediumDetailModel(model)
  {
    this.lod.SetMediumDetailModel(model);
  }

  /**
   * Carbon method SetLowDetailModel.
   *
   * Adapted: Proxy construction belongs to the outer runtime adapter; this delegates to an
   * already supplied proxy.
   */

  @meta.adapted
  SetLowDetailModel(model)
  {
    this.lod.SetLowDetailModel(model);
  }

  /** Carbon's base bounds implementation is deliberately an inline false stub. */

  @meta.implemented
  GetBoundingSphere(_out)
  {
    return false;
  }

  /** Carbon's base world-bounds implementation is deliberately an inline false stub. */

  @meta.implemented
  GetWorldBoundingBox(_min, _max)
  {
    return false;
  }

  /**
   * Selects one whole skinned model through the native LOD helper.
   *
   * Adapted: The caller supplies the frustum and the LOD proxy. A changed visual model is
   * posed immediately through this class's CPU UpdateBones implementation.
   */

  @meta.adapted
  SetLOD(frustum)
  {
    if (!frustum)
    {
      return;
    }

    const boundingSphere = vec4.create();
    if (this.GetBoundingSphere(boundingSphere)
      && frustum.IsSphereVisible(boundingSphere, true))
    {
      const estimate = frustum.GetPixelSizeAccross(boundingSphere);
      if (estimate >= 0 && estimate < 1000000)
      {
        this.estimatedPixelDiameter = estimate;
      }
    }

    const model = this.lod.SetLOD(frustum, this.estimatedPixelDiameter);

    if (model && model !== this.visualModel)
    {
      this.visualModel = model;
      this.skinningMatrixCount = 0;
      this.UpdateBones(this._lastUpdateTime, null);
    }
  }

  /** Carbon method GetBoundingBoxInLocalSpace (MAP_METHOD_AND_WRAP). */
  @be.mapMethodAndWrap()
  @meta.notImplemented
  GetBoundingBoxInLocalSpace(...args)
  {
    throw new Error("Tr2SkinnedObject.GetBoundingBoxInLocalSpace is not implemented in CarbonEngineJS.");
  }

  /** Carbon method ResetAnimationBindings (MAP_METHOD_AND_WRAP). */
  @be.mapMethodAndWrap()
  @meta.implemented
  ResetAnimationBindings()
  {
    if (this.visualModel)
    {
      this.visualModel.ResetBindings();
    }
  }

  /** Carbon method GetSkeletonTag (MAP_METHOD_AND_WRAP). */
  @be.mapMethodAndWrap()
  @meta.implemented
  GetSkeletonTag()
  {
    return this._skeletonTag;
  }

  /**
   * Carbon native method UpdateBones.
   *
   * Adapted: Implements the immediate CPU rig mapping and 3x4 palette; native cloth
   * synchronization, delayed queues, dynamic bounds, and backend upload remain outside the
   * character layer.
   */

  @meta.adapted
  UpdateBones(_time = 0, _apexScene = null)
  {
    const model = this.visualModel;
    const skeleton = model?.GetSkeleton();

    if (!model || !skeleton)
    {
      return;
    }

    const renderJoints = ReadRenderJoints(skeleton);
    const updaterBoneList = this.animationUpdater?.GetAnimationBoneList();
    const usesAnimationRig = Array.isArray(updaterBoneList);
    let boneNames;

    if (usesAnimationRig)
    {
      boneNames = ReadBoneNames(updaterBoneList, "animation rig");
      this.renderRigBoneCount = renderJoints.length;
    }
    else
    {
      boneNames = renderJoints.map(joint => joint.name);
      this.renderRigBoneCount = renderJoints.length;

      if (!boneNames.length)
      {
        boneNames = [ "Render_rig_missing" ];
        this.renderRigBoneCount = 1;
      }
    }

    const source = usesAnimationRig ? "animation" : "render";
    const sourceChanged = source !== this._boneListSource;

    if (sourceChanged || !NamesEqual(this._boneList, boneNames))
    {
      this._boneList = boneNames;
      this._boneListSource = source;
    }
    else
    {
      boneNames = this._boneList;
    }

    const countChanged = this.skinningMatrixCount !== boneNames.length;
    const bindingChanged = this._rigBinding.Bind(renderJoints, boneNames);
    const rebuildMapping = sourceChanged || countChanged || bindingChanged;

    model.BindToRig(boneNames, boneNames.length, rebuildMapping);

    if (rebuildMapping)
    {
      this._skeletonTag = (this._skeletonTag + 1) >>> 0;
      this.skinningMatrixCount = boneNames.length;
      model.ResetBindings();
    }

    let transforms = null;

    if (usesAnimationRig)
    {
      transforms = this.animationUpdater.GetAnimationTransforms();
    }

    this._rigBinding.Update(transforms);
  }

  /**
   * Carbon native method GetSkinningMatrices.
   *
   * Adapted: Returns a detached immediate CPU palette rather than a pointer into the native
   * delayed skinning queue.
   */

  @meta.adapted
  GetSkinningMatrices()
  {
    return this._rigBinding.GetPalette();
  }

  /**
   * Carbon method GetBoneIndex (MAP_METHOD_AND_WRAP).
   *
   * Adapted: Consumes the CarbonEngineJS animation updater's bone-name array because
   * JavaScript has no output-count reference.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  GetBoneIndex(boneName)
  {
    const bones = this.animationUpdater?.GetAnimationBoneList();

    if (!Array.isArray(bones)
      || (this.skinningMatrixCount > 0 && bones.length !== this.skinningMatrixCount))
    {
      return 0xffffffff;
    }

    const index = bones.indexOf(String(boneName));
    return index === -1 ? 0xffffffff : index;
  }

  /**
   * Carbon method GetBonePosition (MAP_METHOD_AND_WRAP).
   *
   * Adapted: Reads the CarbonEngineJS animation updater's matrix array and supports
   * caller-provided vector output.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  GetBonePosition(joint, out = vec3.create())
  {
    const transform = this.GetBoneTransform(joint);

    if (!transform)
    {
      return vec3.set(out, 0, 0, 0);
    }

    return vec3.set(out, transform[12], transform[13], transform[14]);
  }

  /**
   * Carbon native method GetBoneTransform.
   *
   * Adapted: Returns a matrix from the CarbonEngineJS animation updater's transform array
   * rather than a native pointer.
   */

  @meta.adapted
  GetBoneTransform(joint)
  {
    const index = Number(joint);
    const transforms = this.animationUpdater?.GetAnimationTransforms();

    if (!Number.isInteger(index)
      || index < 0
      || !Array.isArray(transforms)
      || index >= transforms.length
      || (this.skinningMatrixCount > 0 && index >= this.skinningMatrixCount))
    {
      return null;
    }

    return transforms[index] || null;
  }

  /** Carbon method PrintAllBones (MAP_METHOD_AND_WRAP). */
  @be.mapMethodAndWrap()
  @meta.notImplemented
  PrintAllBones(...args)
  {
    throw new Error("Tr2SkinnedObject.PrintAllBones is not implemented in CarbonEngineJS.");
  }

}

function ReadRenderJoints(skeleton)
{
  const joints = skeleton?.joints ?? skeleton?.m_joints;

  if (Array.isArray(joints))
  {
    return joints.map((joint, index) => ReadRenderJoint(
      joint?.name ?? joint?.m_name,
      joint?.inverseWorldTransform ?? joint?.m_inverseWorldTransform,
      index
    ));
  }

  const bones = skeleton?.bones;

  if (!Array.isArray(bones))
  {
    throw new TypeError("Tr2SkinnedObject render skeleton must expose joints or bones");
  }

  const inverseTransforms = skeleton?.invBindTransforms;
  return bones.map((bone, index) => ReadRenderJoint(
    typeof bone === "string" ? bone : bone?.name,
    inverseTransforms?.[index]
      ?? bone?.inverseWorldTransform
      ?? bone?.invBindTransform,
    index
  ));
}

function ReadRenderJoint(name, inverseWorldTransform, index)
{
  if (typeof name !== "string" || !name)
  {
    throw new TypeError(`Tr2SkinnedObject render joint ${index} requires a name`);
  }

  if (!inverseWorldTransform || inverseWorldTransform.length !== 16)
  {
    throw new TypeError(
      `Tr2SkinnedObject render joint "${name}" requires a 16-component inverse world transform`
    );
  }

  return { name, inverseWorldTransform };
}

function ReadBoneNames(values, label)
{
  return values.map((value, index) =>
  {
    if (typeof value !== "string" || !value)
    {
      throw new TypeError(`Tr2SkinnedObject ${label} bone ${index} requires a name`);
    }

    return value;
  });
}

function NamesEqual(left, right)
{
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

