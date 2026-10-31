import { IRoot } from "../../../global/blue/IRoot.js";
import { exposure as be } from "#be";
import { ITr2DebugRenderable } from "#interfaces/ITr2DebugRenderable";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";
import { TriDebugFont } from "../../../trinity/core/TriDebugTextRenderer.js";
import { color } from "#math/color";
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
import { Obb } from "../../../trinity/utilities/Obb.js";
import { ITr2Renderable } from "../../../trinity/core/ITr2Renderable.js";

/**
 * Skinned character object managing whole-model LOD selection and an immediate
 * CPU skinning palette.
 *
 * @abstract
 */
@be.define("Tr2SkinnedObject")
@be.inherit(ITr2Renderable, IWorldPosition, IListNotify, INotify, ITr2SkinnedObject, ITr2DebugRenderable)
@be.mapInterface(ITr2Renderable)
@be.mapInterface(IWorldPosition)
@be.mapInterface(IListNotify)
@be.abstract
export class Tr2SkinnedObject extends IRoot
{
  /** Scratch for RenderDebugInfo. */
  static scratch = { vec3_0: vec3.create(), vec3_1: vec3.create(), vec3_2: vec3.create(), color_0: color.create() };

  /**
   * Native base list observer intentionally does nothing (Tr2SkinnedObject.cpp:743).
   *
   * @implemented
   */

  @meta.implemented
  OnListModified(_event, _key, _key2, _value, _theList) {}

  /**
   * Native base has no transparent-sort offset.
   *
   * @implemented
   */

  @meta.implemented
  GetSortValue() { return 0; }

  /**
   * Native base supplies no per-object render data.
   *
   * @implemented
   */

  @meta.implemented
  GetPerObjectData(_accumulator) { return null; }

  /**
   * Carbon GetBatches (h:113, cpp:592-601): guarded delegation to the model.
   *
   * @implemented
   */
  @blue.method
  @meta.implemented
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    if (this.visualModel && perObjectData && this.DoDisplay())
    {
      this.visualModel.GetBatches(batches, batchType, this.GetSkinningTransform(), perObjectData);
    }
  }

  /**
   * Native protected visibility hook (Tr2SkinnedObject.h:161-164).
   *
   * @implemented
   */
  @blue.method
  @meta.implemented
  DoDisplay()
  {
    return this.display;
  }

  /**
   * Carbon GetDebugOptions (h:52, cpp:483-493): names, transforms and bounds,
   * and the two bone options when the visual model has a skeleton.
   *
   * @implemented
   * @param {Set<string>} options The caller-owned option set the options are added to.
   * @returns {void}
   */
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Names");
    options.add("Transforms");
    options.add("Bounds");
    if (this.visualModel && this.visualModel.GetSkeleton())
    {
      options.add("Bones");
      options.add("Bones Names");
    }
  }

  /**
   * Carbon RenderDebugInfo (h:53, cpp:495-588), drawn only while displayed:
   * - "Names": the name at the top centre of the local bounds (the position
   *   when there are none), in magenta;
   * - "Transforms": the transform's axes, lit;
   * - "Bounds": the local bounds under the transform as a wireframe box,
   *   orange for explicit bounds and yellow otherwise.
   *
   * @adapted "Bones" and "Bones Names" draw nothing. Carbon draws them from
   *   its per-frame queues of accumulated joint transforms and its anim-rig to
   *   render-rig mappings (h:190-201), and this port skins immediately without
   *   those queues (see GetSkinningTransform).
   * @param {ITr2DebugRenderer2} renderer The debug renderer drawing this frame; it decides which options are on.
   * @returns {void}
   */
  @meta.adapted
  RenderDebugInfo(renderer)
  {
    if (!this.DoDisplay()) return;
    const { vec3_0, vec3_1, vec3_2, color_0 } = Tr2SkinnedObject.scratch;
    const owner = Tr2DebugObjectReference.create__Object(this);
    if (renderer.HasOption(this, "Names"))
    {
      // GetPosition is the transform's translation row (h:62-65).
      vec3.set(vec3_2, this.transform[12], this.transform[13], this.transform[14]);
      if (this.GetLocalBoundingBox(vec3_0, vec3_1)) vec3.set(vec3_2, 0, vec3_1[1], 0);
      vec3.transformMat4(vec3_2, vec3_2, this.transform);
      renderer.DrawText(TriDebugFont.TRI_DBG_FONT_MEDIUM, vec3_2, color.fromARGB(color_0, 0xffff00ff), "%s", this.name);
    }
    if (renderer.HasOption(this, "Transforms"))
    {
      renderer.DrawAxis(owner, this.transform, ITr2DebugRenderer2.Effect.Lit);
    }
    if (renderer.HasOption(this, "Bounds") && this.GetLocalBoundingBox(vec3_0, vec3_1))
    {
      renderer.DrawBox__Transform(owner, this.transform, vec3_0, vec3_1, ITr2DebugRenderer2.Effect.Wireframe,
        Tr2DebugColor.create__Uint32(this.useExplicitBounds ? 0xffff8800 : 0xffffff00));
    }
  }

  /**
   * Carbon GetSkinningTransform (h:50, cpp:732-740).
   *
   * @adapted the existing immediate CPU skinning path has no delayed transform
   *   queue, so this returns the native empty-queue value, the current transform.
   */
  @blue.method
  @meta.adapted
  GetSkinningTransform()
  {
    return this.transform;
  }

  /**
   * Carbon's UpdatePerObjectData body is empty (h:150, cpp:612-614).
   *
   * @implemented
   */
  @blue.method
  @meta.implemented
  UpdatePerObjectData()
  {
  }

  /** Native dynamic bounds start unavailable (cpp:40-44); pose updates own validity. */
  _hasDynamicBounds = false;

  /** m_minDynamicBounds, retained local-space bound. */
  _minDynamicBounds = vec3.create(); // alloc: retained native bound

  /** m_maxDynamicBounds, retained local-space bound. */
  _maxDynamicBounds = vec3.create(); // alloc: retained native bound

  /**
   * Carbon GetLocalBoundingBox (h:74, cpp:616-638), preserving bounds precedence.
   *
   * @implemented
   */
  @blue.method
  @meta.implemented
  GetLocalBoundingBox(min, max)
  {
    if (this.useExplicitBounds)
    {
      vec3.copy(min, this.explicitMinBounds);
      vec3.copy(max, this.explicitMaxBounds);
      return true;
    }
    if (this.useDynamicBounds && this._hasDynamicBounds)
    {
      vec3.copy(min, this._minDynamicBounds);
      vec3.copy(max, this._maxDynamicBounds);
      return true;
    }
    return this.visualModel ? this.visualModel.GetBoundingBox(min, max) : false;
  }

  /**
   * Carbon GetClippedWorldBoundingObb (Tr2SkinnedObject.cpp:659-675): the local
   * bounding box in world space, tightened against the camera frustum.
   * Carbon's five output vectors become the returned Obb.
   *
   * @adapted
   * @param {mat4} localToWorld The skinning transform.
   * @param {TriFrustum|null} cameraFrustum Frustum to clip against, or null.
   * @returns {Obb|null} The box, or null without local bounds.
   */
  @meta.adapted
  GetClippedWorldBoundingObb(localToWorld, cameraFrustum)
  {
    const { vec3_0, vec3_1 } = Tr2SkinnedObject.boundsScratch;
    if (!this.GetLocalBoundingBox(vec3_0, vec3_1)) return null;
    const obb = new Obb();
    obb.CreateClippedWorldBoundingObb(vec3_0, vec3_1, localToWorld, cameraFrustum);
    return obb;
  }

  /** GetClippedWorldBoundingObb's local bounds. */
  static boundsScratch = { vec3_0: vec3.create(), vec3_1: vec3.create() };

  /**
   * World position awaits the maintained TriMatrix storage conversion contract.
   *
   * @notImplemented
   */

  @meta.notImplemented
  GetWorldPosition(_out) { throw new Error("Tr2SkinnedObject.GetWorldPosition requires the TriMatrix conversion port."); }

  /**
   * World rotation awaits the maintained TriMatrix storage conversion contract.
   *
   * @notImplemented
   */

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
   *
   * @implemented
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


  @type.object.ref("Tr2SkinnedModel")
  visualModel = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_animationUpdater (ITr2AnimationUpdaterPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("ITr2AnimationUpdater")
  animationUpdater = null;

  /** m_worldTransformUpdater (ITr2WorldTransformUpdaterPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("ITr2WorldTransformUpdater")
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
  @be.mapPropertyReadOnly()
  @type.int32
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
   *
   * @implemented
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

  /**
   * Carbon method GetCurrentLod.
   *
   * @implemented
   */

  @meta.implemented
  GetCurrentLod()
  {
    return this.lod.GetCurrentLod();
  }

  /**
   * Carbon method SetHighDetailModel.
   *
   * @adapted Proxy construction belongs to the outer runtime adapter; this delegates to an
   *   already supplied proxy.
   */

  @meta.adapted
  SetHighDetailModel(model)
  {
    this.lod.SetHighDetailModel(model);
  }

  /**
   * Carbon method SetMediumDetailModel.
   *
   * @adapted Proxy construction belongs to the outer runtime adapter; this delegates to an
   *   already supplied proxy.
   */

  @meta.adapted
  SetMediumDetailModel(model)
  {
    this.lod.SetMediumDetailModel(model);
  }

  /**
   * Carbon method SetLowDetailModel.
   *
   * @adapted Proxy construction belongs to the outer runtime adapter; this delegates to an
   *   already supplied proxy.
   */

  @meta.adapted
  SetLowDetailModel(model)
  {
    this.lod.SetLowDetailModel(model);
  }

  /**
   * Carbon's base bounds implementation is deliberately an inline false stub.
   *
   * @implemented
   */

  @meta.implemented
  GetBoundingSphere(_out)
  {
    return false;
  }

  /**
   * Carbon's base world-bounds implementation is deliberately an inline false stub.
   *
   * @implemented
   */

  @meta.implemented
  GetWorldBoundingBox(_min, _max)
  {
    return false;
  }

  /**
   * Selects one whole skinned model through the native LOD helper.
   *
   * @adapted The caller supplies the frustum and the LOD proxy. A changed visual model is
   *   posed immediately through this class's CPU UpdateBones implementation.
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

  /**
   * Carbon method GetBoundingBoxInLocalSpace (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  @meta.notImplemented
  GetBoundingBoxInLocalSpace(...args)
  {
    throw new Error("Tr2SkinnedObject.GetBoundingBoxInLocalSpace is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method ResetAnimationBindings (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  ResetAnimationBindings()
  {
    if (this.visualModel)
    {
      this.visualModel.ResetBindings();
    }
  }

  /**
   * Carbon method GetSkeletonTag (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  GetSkeletonTag()
  {
    return this._skeletonTag;
  }

  /**
   * Carbon native method UpdateBones.
   *
   * @adapted Implements the immediate CPU rig mapping, 3x4 palette and dynamic
   *   bounds. Native cloth synchronization, delayed queues and backend upload
   *   remain outside this update. Bounds validity resets before early returns
   *   and follows current animation transforms (cpp:134,263-268).
   */

  @meta.adapted
  UpdateBones(_time = 0, _apexScene = null)
  {
    this._hasDynamicBounds = false;

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

    const animationTransforms = this.animationUpdater ? this.animationUpdater.GetAnimationTransforms() : null;
    if (animationTransforms)
    {
      this._hasDynamicBounds = model.GetDynamicBoundingBox(animationTransforms, this._minDynamicBounds, this._maxDynamicBounds);
    }

    this._rigBinding.Update(usesAnimationRig ? animationTransforms : null);
  }

  /**
   * Carbon native method GetSkinningMatrices.
   *
   * @adapted Returns a detached immediate CPU palette rather than a pointer into the native
   *   delayed skinning queue.
   */

  @meta.adapted
  GetSkinningMatrices()
  {
    return this._rigBinding.GetPalette();
  }

  /**
   * Carbon method GetBoneIndex (MAP_METHOD_AND_WRAP).
   *
   * @adapted Consumes the CarbonEngineJS animation updater's bone-name array because
   *   JavaScript has no output-count reference.
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
   * @adapted Reads the CarbonEngineJS animation updater's matrix array and supports
   *   caller-provided vector output.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  GetBonePosition(joint, out)
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
   * @adapted Returns a matrix from the CarbonEngineJS animation updater's transform array
   *   rather than a native pointer.
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

  /**
   * Carbon method PrintAllBones (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
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

