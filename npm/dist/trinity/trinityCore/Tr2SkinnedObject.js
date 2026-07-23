import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';
import { vec3 } from '@carbonenginejs/core-math/vec3';
import { vec4 } from '@carbonenginejs/core-math/vec4';
import { CjsCharacterRigBinding } from '../../CjsCharacterRigBinding.js';
import { Tr2SkinnedObjectLod } from './Tr2SkinnedObjectLod.js';

let _initProto, _initClass, _init_frameDelay, _init_extra_frameDelay, _init_curveSets, _init_extra_curveSets, _init_explicitMaxBounds, _init_extra_explicitMaxBounds, _init_explicitMinBounds, _init_extra_explicitMinBounds, _init_updatePeriod, _init_extra_updatePeriod, _init_transform, _init_extra_transform, _init_visualModel, _init_extra_visualModel, _init_name, _init_extra_name, _init_animationUpdater, _init_extra_animationUpdater, _init_worldTransformUpdater, _init_extra_worldTransformUpdater, _init_highDetailModel, _init_extra_highDetailModel, _init_lowDetailModel, _init_extra_lowDetailModel, _init_mediumDetailModel, _init_extra_mediumDetailModel, _init_currentLod, _init_extra_currentLod, _init_renderRigBoneCount, _init_extra_renderRigBoneCount, _init_skinningMatrixCount, _init_extra_skinningMatrixCount, _init_useDynamicBounds, _init_extra_useDynamicBounds, _init_useExplicitBounds, _init_extra_useExplicitBounds, _init_estimatedPixelDiameter, _init_extra_estimatedPixelDiameter, _init_display, _init_extra_display;

/** Tr2SkinnedObject (trinityCore) - generated from schema shapeHash ad7ba330.... */
let _Tr2SkinnedObject;
class Tr2SkinnedObject extends CjsModel {
  static {
    ({
      e: [_init_frameDelay, _init_extra_frameDelay, _init_curveSets, _init_extra_curveSets, _init_explicitMaxBounds, _init_extra_explicitMaxBounds, _init_explicitMinBounds, _init_extra_explicitMinBounds, _init_updatePeriod, _init_extra_updatePeriod, _init_transform, _init_extra_transform, _init_visualModel, _init_extra_visualModel, _init_name, _init_extra_name, _init_animationUpdater, _init_extra_animationUpdater, _init_worldTransformUpdater, _init_extra_worldTransformUpdater, _init_highDetailModel, _init_extra_highDetailModel, _init_lowDetailModel, _init_extra_lowDetailModel, _init_mediumDetailModel, _init_extra_mediumDetailModel, _init_currentLod, _init_extra_currentLod, _init_renderRigBoneCount, _init_extra_renderRigBoneCount, _init_skinningMatrixCount, _init_extra_skinningMatrixCount, _init_useDynamicBounds, _init_extra_useDynamicBounds, _init_useExplicitBounds, _init_extra_useExplicitBounds, _init_estimatedPixelDiameter, _init_extra_estimatedPixelDiameter, _init_display, _init_extra_display, _initProto],
      c: [_Tr2SkinnedObject, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2SkinnedObject",
      family: "trinityCore"
    })], [[[io, io.read, type, type.uint32], 16, "frameDelay"], [[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "explicitMaxBounds"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "explicitMinBounds"], [[io, io.readwrite, type, type.float32], 16, "updatePeriod"], [[io, io.persist, void 0, type.model("TriMatrix")], 16, "transform"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2SkinnedModel")], 16, "visualModel"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.model("ITr2AnimationUpdater")], 16, "animationUpdater"], [[io, io.persist, void 0, type.model("ITr2WorldTransformUpdater")], 16, "worldTransformUpdater"], [[io, io.notify, io, io.persist, type, type.unknown], 16, "highDetailModel"], [[io, io.notify, io, io.persist, type, type.unknown], 16, "lowDetailModel"], [[io, io.notify, io, io.persist, type, type.unknown], 16, "mediumDetailModel"], [[io, io.read, type, type.int32], 16, "currentLod"], [[io, io.read, type, type.uint32], 16, "renderRigBoneCount"], [[io, io.read, type, type.uint32], 16, "skinningMatrixCount"], [[io, io.readwrite, type, type.boolean], 16, "useDynamicBounds"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "useExplicitBounds"], [[io, io.read, type, type.float32], 16, "estimatedPixelDiameter"], [[io, io.persist, type, type.boolean], 16, "display"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The cooperative JS mutation hook compares cached proxy/model identities instead of receiving Be::Var field handles.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurrentLod"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Proxy construction belongs to the outer runtime adapter; this delegates to an already supplied proxy.")], 18, "SetHighDetailModel"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Proxy construction belongs to the outer runtime adapter; this delegates to an already supplied proxy.")], 18, "SetMediumDetailModel"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Proxy construction belongs to the outer runtime adapter; this delegates to an already supplied proxy.")], 18, "SetLowDetailModel"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetWorldBoundingBox"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Uses duck-typed frustum/proxy seams and poses immediately only when an engine UpdateBones implementation is installed.")], 18, "SetLOD"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetBoundingBoxInLocalSpace"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetAnimationBindings"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSkeletonTag"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Implements the immediate CPU rig mapping and 3x4 palette; native cloth synchronization, delayed queues, dynamic bounds, and backend upload remain outside runtime-character.")], 18, "UpdateBones"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Returns a detached immediate CPU palette rather than a pointer into the native delayed skinning queue.")], 18, "GetSkinningMatrices"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Consumes the CarbonEngineJS animation updater's bone-name array because JavaScript has no output-count reference.")], 18, "GetBoneIndex"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Reads the CarbonEngineJS animation updater's matrix array and supports caller-provided vector output.")], 18, "GetBonePosition"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Returns a matrix from the CarbonEngineJS animation updater's transform array rather than a native pointer.")], 18, "GetBoneTransform"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "PrintAllBones"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_display(this);
  }
  #lod = (_initProto(this), new Tr2SkinnedObjectLod());
  #highDetailProxy = undefined;
  #mediumDetailProxy = undefined;
  #lowDetailProxy = undefined;
  #visualModel = undefined;
  #lastUpdateTime = 0;
  #skeletonTag = 0;
  #boneList = [];
  #boneListSource = null;
  #rigBinding = new CjsCharacterRigBinding();

  /** m_skinningMatrixFrameDelay (unsigned int) [READ] */
  frameDelay = _init_frameDelay(this, 0);

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  curveSets = (_init_extra_frameDelay(this), _init_curveSets(this, []));

  /** m_maxBounds (Vector3) [READWRITE, PERSIST, NOTIFY] */
  explicitMaxBounds = (_init_extra_curveSets(this), _init_explicitMaxBounds(this, vec3.create()));

  /** m_minBounds (Vector3) [READWRITE, PERSIST, NOTIFY] */
  explicitMinBounds = (_init_extra_explicitMaxBounds(this), _init_explicitMinBounds(this, vec3.create()));

  /** m_updatePeriod (float) [READWRITE] */
  updatePeriod = (_init_extra_explicitMinBounds(this), _init_updatePeriod(this, 0));

  /** m_transform (PTriMatrix) [READ, PERSIST] */
  transform = (_init_extra_updatePeriod(this), _init_transform(this, null));

  /** m_visualModel (Tr2SkinnedModelPtr) [READWRITE, PERSIST, NOTIFY] */
  visualModel = (_init_extra_transform(this), _init_visualModel(this, null));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_visualModel(this), _init_name(this, ""));

  /** m_animationUpdater (ITr2AnimationUpdaterPtr) [READWRITE, PERSIST] */
  animationUpdater = (_init_extra_name(this), _init_animationUpdater(this, null));

  /** m_worldTransformUpdater (ITr2WorldTransformUpdaterPtr) [READWRITE, PERSIST] */
  worldTransformUpdater = (_init_extra_animationUpdater(this), _init_worldTransformUpdater(this, null));

  /** m_lod.m_highDetailProxy (Tr2SkinnedObjectLod) [READWRITE, PERSIST, NOTIFY] */
  highDetailModel = (_init_extra_worldTransformUpdater(this), _init_highDetailModel(this, null));

  /** m_lod.m_lowDetailProxy (Tr2SkinnedObjectLod) [READWRITE, PERSIST, NOTIFY] */
  lowDetailModel = (_init_extra_highDetailModel(this), _init_lowDetailModel(this, null));

  /** m_lod.m_mediumDetailProxy (Tr2SkinnedObjectLod) [READWRITE, PERSIST, NOTIFY] */
  mediumDetailModel = (_init_extra_lowDetailModel(this), _init_mediumDetailModel(this, null));

  /** m_lod.GetCurrentLod() (int) [READ] */
  currentLod = (_init_extra_mediumDetailModel(this), _init_currentLod(this, -1));

  /** m_numRenderRigBones (unsigned int) [READ] */
  renderRigBoneCount = (_init_extra_currentLod(this), _init_renderRigBoneCount(this, 0));

  /** m_skinningMatrixCount (unsigned int) [READ] */
  skinningMatrixCount = (_init_extra_renderRigBoneCount(this), _init_skinningMatrixCount(this, 0));

  /** m_useDynamicBounds (bool) [READWRITE] */
  useDynamicBounds = (_init_extra_skinningMatrixCount(this), _init_useDynamicBounds(this, true));

  /** m_useExplicitBounds (bool) [READWRITE, PERSIST, NOTIFY] */
  useExplicitBounds = (_init_extra_useDynamicBounds(this), _init_useExplicitBounds(this, false));

  /** m_estimatedPixelDiameter (float) [READ] */
  estimatedPixelDiameter = (_init_extra_useExplicitBounds(this), _init_estimatedPixelDiameter(this, 0));

  /** m_display (bool) [READWRITE, PERSIST] */
  display = (_init_extra_estimatedPixelDiameter(this), _init_display(this, true));

  /** Carbon INotify hook: retains active model changes in the selected proxy. */
  OnModified(_options = {}) {
    this.#SyncLodProxies();
    if (this.#visualModel !== this.visualModel) {
      this.#lod.OnModelChanged(this.visualModel);
      this.#visualModel = this.visualModel;
    }
    this.currentLod = this.#lod.GetCurrentLod();
    return true;
  }

  /** Carbon method GetCurrentLod. */
  GetCurrentLod() {
    return this.#lod.GetCurrentLod();
  }

  /** Carbon method SetHighDetailModel. */
  SetHighDetailModel(model) {
    this.#SyncLodProxies();
    this.#lod.SetHighDetailModel(model);
  }

  /** Carbon method SetMediumDetailModel. */
  SetMediumDetailModel(model) {
    this.#SyncLodProxies();
    this.#lod.SetMediumDetailModel(model);
  }

  /** Carbon method SetLowDetailModel. */
  SetLowDetailModel(model) {
    this.#SyncLodProxies();
    this.#lod.SetLowDetailModel(model);
  }

  /** Carbon's base bounds implementation is deliberately an inline false stub. */
  GetBoundingSphere(_out) {
    return false;
  }

  /** Carbon's base world-bounds implementation is deliberately an inline false stub. */
  GetWorldBoundingBox(_min, _max) {
    return false;
  }

  /** Selects one whole skinned model through the native LOD helper. */
  SetLOD(frustum) {
    if (!frustum) {
      return;
    }
    this.#SyncLodProxies();
    const boundingSphere = vec4.create();
    if (this.GetBoundingSphere(boundingSphere) && frustum.IsSphereVisible(boundingSphere, true)) {
      const estimate = frustum.GetPixelSizeAccross(boundingSphere);
      if (estimate >= 0 && estimate < 1000000) {
        this.estimatedPixelDiameter = estimate;
      }
    }
    const model = this.#lod.SetLOD(frustum, this.estimatedPixelDiameter);
    this.currentLod = this.#lod.GetCurrentLod();
    if (model && model !== this.visualModel) {
      this.visualModel = model;
      this.#visualModel = model;
      this.skinningMatrixCount = 0;
      if (typeof this.UpdateBones === "function") {
        this.UpdateBones(this.#lastUpdateTime, null);
      }
    }
  }
  #SyncLodProxies() {
    const changed = this.#highDetailProxy !== this.highDetailModel || this.#mediumDetailProxy !== this.mediumDetailModel || this.#lowDetailProxy !== this.lowDetailModel;
    if (!changed) {
      return;
    }
    this.#lod.highDetailProxy = this.highDetailModel;
    this.#lod.mediumDetailProxy = this.mediumDetailModel;
    this.#lod.lowDetailProxy = this.lowDetailModel;
    this.#highDetailProxy = this.highDetailModel;
    this.#mediumDetailProxy = this.mediumDetailModel;
    this.#lowDetailProxy = this.lowDetailModel;
    this.#lod.PopulateLods();
  }

  /** Carbon method GetBoundingBoxInLocalSpace (MAP_METHOD_AND_WRAP). */
  GetBoundingBoxInLocalSpace(...args) {
    throw new Error("Tr2SkinnedObject.GetBoundingBoxInLocalSpace is not implemented in CarbonEngineJS.");
  }

  /** Carbon method ResetAnimationBindings (MAP_METHOD_AND_WRAP). */
  ResetAnimationBindings() {
    if (this.visualModel) {
      this.visualModel.ResetBindings();
    }
  }

  /** Carbon method GetSkeletonTag (MAP_METHOD_AND_WRAP). */
  GetSkeletonTag() {
    return this.#skeletonTag;
  }

  /** Carbon native method UpdateBones. */
  UpdateBones(_time = 0, _apexScene = null) {
    const model = this.visualModel;
    const skeleton = model?.GetSkeleton?.();
    if (!model || !skeleton) {
      return;
    }
    const renderJoints = ReadRenderJoints(skeleton);
    const updaterBoneList = this.animationUpdater?.GetAnimationBoneList?.();
    const usesAnimationRig = Array.isArray(updaterBoneList);
    let boneNames;
    if (usesAnimationRig) {
      boneNames = ReadBoneNames(updaterBoneList, "animation rig");
      this.renderRigBoneCount = renderJoints.length;
    } else {
      boneNames = renderJoints.map(joint => joint.name);
      this.renderRigBoneCount = renderJoints.length;
      if (!boneNames.length) {
        boneNames = ["Render_rig_missing"];
        this.renderRigBoneCount = 1;
      }
    }
    const source = usesAnimationRig ? "animation" : "render";
    const sourceChanged = source !== this.#boneListSource;
    if (sourceChanged || !NamesEqual(this.#boneList, boneNames)) {
      this.#boneList = boneNames;
      this.#boneListSource = source;
    } else {
      boneNames = this.#boneList;
    }
    const countChanged = this.skinningMatrixCount !== boneNames.length;
    const bindingChanged = this.#rigBinding.Bind(renderJoints, boneNames);
    const rebuildMapping = sourceChanged || countChanged || bindingChanged;
    if (typeof model.BindToRig === "function") {
      model.BindToRig(boneNames, boneNames.length, rebuildMapping);
    }
    if (rebuildMapping) {
      this.#skeletonTag = this.#skeletonTag + 1 >>> 0;
      this.skinningMatrixCount = boneNames.length;
      model.ResetBindings?.();
    }
    let transforms = null;
    if (usesAnimationRig && typeof this.animationUpdater?.GetAnimationTransforms === "function") {
      transforms = this.animationUpdater.GetAnimationTransforms();
    }
    this.#rigBinding.Update(transforms);
  }

  /** Carbon native method GetSkinningMatrices. */
  GetSkinningMatrices() {
    return this.#rigBinding.GetPalette();
  }

  /** Carbon method GetBoneIndex (MAP_METHOD_AND_WRAP). */
  GetBoneIndex(boneName) {
    const bones = this.animationUpdater?.GetAnimationBoneList?.();
    if (!Array.isArray(bones) || this.skinningMatrixCount > 0 && bones.length !== this.skinningMatrixCount) {
      return 0xffffffff;
    }
    const index = bones.indexOf(String(boneName));
    return index === -1 ? 0xffffffff : index;
  }

  /** Carbon method GetBonePosition (MAP_METHOD_AND_WRAP). */
  GetBonePosition(joint, out = vec3.create()) {
    const transform = this.GetBoneTransform(joint);
    if (!transform) {
      return vec3.set(out, 0, 0, 0);
    }
    return vec3.set(out, transform[12], transform[13], transform[14]);
  }

  /** Carbon native method GetBoneTransform. */
  GetBoneTransform(joint) {
    const index = Number(joint);
    const transforms = this.animationUpdater?.GetAnimationTransforms?.();
    if (!Number.isInteger(index) || index < 0 || !Array.isArray(transforms) || index >= transforms.length || this.skinningMatrixCount > 0 && index >= this.skinningMatrixCount) {
      return null;
    }
    return transforms[index] || null;
  }

  /** Carbon method PrintAllBones (MAP_METHOD_AND_WRAP). */
  PrintAllBones(...args) {
    throw new Error("Tr2SkinnedObject.PrintAllBones is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}
function ReadRenderJoints(skeleton) {
  const joints = skeleton?.joints ?? skeleton?.m_joints;
  if (Array.isArray(joints)) {
    return joints.map((joint, index) => ReadRenderJoint(joint?.name ?? joint?.m_name, joint?.inverseWorldTransform ?? joint?.m_inverseWorldTransform, index));
  }
  const bones = skeleton?.bones;
  if (!Array.isArray(bones)) {
    throw new TypeError("Tr2SkinnedObject render skeleton must expose joints or bones");
  }
  const inverseTransforms = skeleton?.invBindTransforms;
  return bones.map((bone, index) => ReadRenderJoint(typeof bone === "string" ? bone : bone?.name, inverseTransforms?.[index] ?? bone?.inverseWorldTransform ?? bone?.invBindTransform, index));
}
function ReadRenderJoint(name, inverseWorldTransform, index) {
  if (typeof name !== "string" || !name) {
    throw new TypeError(`Tr2SkinnedObject render joint ${index} requires a name`);
  }
  if (!inverseWorldTransform || inverseWorldTransform.length !== 16) {
    throw new TypeError(`Tr2SkinnedObject render joint "${name}" requires a 16-component inverse world transform`);
  }
  return {
    name,
    inverseWorldTransform
  };
}
function ReadBoneNames(values, label) {
  return values.map((value, index) => {
    if (typeof value !== "string" || !value) {
      throw new TypeError(`Tr2SkinnedObject ${label} bone ${index} requires a name`);
    }
    return value;
  });
}
function NamesEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export { _Tr2SkinnedObject as Tr2SkinnedObject };
//# sourceMappingURL=Tr2SkinnedObject.js.map
