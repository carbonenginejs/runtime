// Source: trinity/trinity/Tr2GrannyAnimation.h
// Source: trinity/trinity/Tr2GrannyAnimation.cpp
//
// Hand-maintained (promoted from src/trinity/generated/trinityCore; the generator skips
// it while this file exists). Promoted to give GetMeshBoneMatrixList Carbon's
// storage: one contiguous Float4x3 palette rather than an array of mat4.
import { mat3 } from "#math/mat3";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
import { CjsGrannyCurves } from "../../curves/track/CjsGrannyCurves.js";
import { CjsCmfFormat } from "#resource/formats/cmf";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { GrannyBoneOffset } from "./GrannyBoneOffset.js";
import { Tr2GrannyAnimationLayer } from "./Tr2GrannyAnimationLayer.js";


function createLayer(name = "", weight = 1, allBones = false)
{
  const layer = new Tr2GrannyAnimationLayer();
  layer.name = name;
  layer.weight = weight;
  layer.allBones = allBones;
  return layer;
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


/** Carbon MAX_JOINT_COUNT (Tr2GrannyAnimation.cpp:66): the most mesh bones a palette holds. */
const MAX_JOINT_COUNT = 254;

/** CMF bone channel target types, by the runtime bone slot each one writes. */
const CMF_CHANNEL_SLOTS = Object.freeze({
  BonePosition: "position",
  BoneRotation: "orientation",
  BoneScale: "scaleShear"
});

/** Scratch for a sampled CMF scale, written into a scaleShear diagonal. */
const cmfScale = vec3.create();

/**
 * Samples one CMF channel of a bone into its runtime slot: position and
 * orientation directly, scale onto the scaleShear diagonal.
 */
function sampleCmfChannel(out, curves, channel, time)
{
  if (channel === "position")
  {
    CjsCmfFormat.sampleAnimationCurve(out, curves.position, time);
  }
  else if (channel === "orientation")
  {
    CjsCmfFormat.sampleQuaternionCurve(out, curves.orientation, time);
  }
  else
  {
    CjsCmfFormat.sampleAnimationCurve(cmfScale, curves.scaleShear, time);
    mat3.set(out, cmfScale[0], 0, 0, 0, cmfScale[1], 0, 0, 0, cmfScale[2]);
  }
}


/** Tr2GrannyAnimation (trinityCore) - promoted from generated; shapeHash 056bad2a. */
@type.define({ className: "Tr2GrannyAnimation", family: "trinityCore" })
export class Tr2GrannyAnimation extends CjsModel
{

  /** Last path resolved by Initialize; empty for explicitly attached resources. */
  _resolvedPath = "";

  _additiveMode = false;

  _aimAxis = vec3.fromValues(0, 0, 1);

  _aimBone = "";

  _aimBoneOrientation = vec3.fromValues(0, 0, 1);

  _aimingBone = false;

  _baseLayer = createLayer("", 1, true);

  _curveCache = new WeakMap();

  _initialized = false;

  _layers = new Map();

  _meshBoneIndices = [];

  /**
   * Carbon's `Float4x3* m_meshBoneMatrixList` (Tr2GrannyAnimation.h:208) - one
   * contiguous palette, stride 12, allocated once and rewritten in place.
   */
  _meshBonePalette = null;

  /** Carbon m_useMeshBinding (Tr2GrannyAnimation.cpp:81) - defaults false. */
  _useMeshBinding = false;

  /** Whether grannyRes was borrowed from the mesh rather than resolved here. */
  _sharedGeometry = false;

  /**
   * The borrowed geometry finished loading or reloading (Carbon's notify
   * target, Tr2GrannyAnimation.cpp:293): rebuild from its granny file unless
   * the model was already built from that same file.
   */
  _geometryCompleted = (_event, resource) =>
  {
    if (resource !== this.grannyRes) return;
    if (this._runtimeModel && this._runtimeModel.source === this._GetAnimationSource()) return;
    this.RebuildCachedData();
  };

  _morphAnimations = new Map();

  _morphCurveCache = new WeakMap();

  _morphSample = new Float32Array(1);

  _paused = false;

  /**
   * Carbon m_poseModifier (Tr2GrannyAnimation.h:230): a NON-OWNING
   * ITr2PoseModifier registration - the modifier must outlive it or be
   * cleared with SetPoseModifier(null) before it goes away.
   */
  _poseModifier = null;

  /** The cached skeleton/pose ducks handed to the pose modifier. */
  _poseModifierView = null;

  /** Carbon m_sampledPose (Tr2GrannyAnimation.h:202): the pose before ModifyPose. */
  _sampledPose = null;

  _runtimeModel = null;

  _secondaryResources = new Map();

  /** m_resPath (std::string) [PERSISTONLY] */
  @edit.persistOnly
  @type.string
  resPath_ = "";

  /** m_model (std::string) [PERSISTONLY] */
  @edit.persistOnly
  @type.string
  model_ = "";

  /**
   * Blue property alias for the persisted resPath_ backing field. It is not a
   * separate schema field: exporting both names would create conflicting keys
   * when sparse model values author only the canonical persisted name.
   */
  get resPath()
  {
    return this.resPath_;
  }

  /** Sets the Blue resource-path alias and rebuilds cached animation data. */
  set resPath(value)
  {
    this.resPath_ = String(value ?? "");
    this.Initialize();
  }

  /** Blue property alias for the persisted model_ backing field. */
  get model()
  {
    return this.model_;
  }

  /** Sets the Blue model alias and rebuilds cached animation data. */
  set model(value)
  {
    this.model_ = String(value ?? "");
    this.Initialize();
  }

  /** m_grannyRes (TriGrannyResPtr) [READ] */
  @edit.read
  @type.objectRef("TriGrannyRes")
  grannyRes = null;

  /** m_eventListener (IBlueEventListenerPtr) [READWRITE] */
  @edit.readwrite
  @type.objectRef("IBlueEventListener")
  eventListener = null;

  /** m_animationEnabled (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  animationEnabled = true;

  /** m_debugRenderJointNames (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  debugRenderJointNames = false;

  /** m_debugRenderSkeleton (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  debugRenderSkeleton = false;

  /** m_boneOffset (PGrannyBoneOffset) [READ] */
  @edit.read
  @type.objectRef("GrannyBoneOffset")
  boneOffset = new GrannyBoneOffset();

  /**
   * Refreshes an owned resource from its authored path and rebuilds cached bones.
   *
   * Adapted: Resolves decoded resources synchronously through CjsGrannyCurves.
   * Explicit SetGrannyResource attachments survive a pathless Initialize; borrowed
   * geometry remains authoritative until detached, as in Carbon.
   */
  @impl.adapted
  Initialize()
  {
    if (!this._sharedGeometry && (this.resPath_ || this._resolvedPath))
    {
      this.grannyRes = this.resPath_ ? CjsGrannyCurves.resolveResource(this.resPath_) : null;
      this._resolvedPath = this.resPath_;
    }
    return this.RebuildCachedData();
  }

  /** Attaches an already decoded TriGrannyRes-compatible resource. */
  @impl.adapted
  SetGrannyResource(resource)
  {
    this.grannyRes = resource ?? null;
    this._sharedGeometry = false;
    this._resolvedPath = "";
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
    // Carbon cpp:283-286: rebinding the same geometry (or null to null) is a
    // no-op - no Cleanup, and m_resPath is kept.
    if ((resource ?? null) === (this._sharedGeometry ? this.grannyRes : null))
    {
      return this._initialized;
    }
    // Carbon cpp:288-294: leave the old geometry's notify targets, join the
    // new one's, so a geometry still loading rebuilds this updater when it
    // arrives - otherwise a ship bound before its .gr2 loaded never animates.
    if (this._sharedGeometry) this.grannyRes.OffEvent("completed", this._geometryCompleted, this);
    this.grannyRes = resource ?? null;
    this._sharedGeometry = !!resource;
    this.resPath_ = "";
    this._resolvedPath = "";
    const initialized = this.RebuildCachedData();
    if (resource) resource.OnCompleted(this._geometryCompleted, this);
    return initialized;
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
    return this._useMeshBinding;
  }

  /** Carbon `SetUseMeshBinding` (Tr2GrannyAnimation.h:60). */
  @carbon.method
  @impl.implemented
  SetUseMeshBinding(enable)
  {
    this._useMeshBinding = !!enable;
  }

  /** Whether the bound geometry was borrowed from the mesh. */
  @impl.adapted
  HasSharedGeometryRes()
  {
    return this._sharedGeometry;
  }

  /**
   * The geometry borrowed from the mesh, or null (Carbon cpp:299-302,
   * m_geometryRes). Adapted: this port holds it in `grannyRes`, flagged by
   * `_sharedGeometry`.
   *
   * @returns {object|null} The TriGeometryRes.
   */
  @carbon.method
  @impl.adapted
  GetSharedGeometryRes()
  {
    return this._sharedGeometry ? this.grannyRes : null;
  }

  /**
   * The granny file the gr2 branch animates, or null.
   *
   * Carbon `GetFileInfo` (cpp:367-389): a standalone resource answers its own
   * file; geometry borrowed from the mesh answers its `GetGrannyInfo()`, which
   * is null when that geometry was read from a CMF file. Adapted because this
   * port holds both of Carbon's members (m_grannyRes, m_geometryRes) in
   * `grannyRes`, told apart by `_sharedGeometry`, and a standalone resource is
   * a decoded payload rather than a granny_file.
   *
   * @returns {object|null} The gr2 read.
   */
  @carbon.method
  @impl.adapted
  GetFileInfo()
  {
    if (!this.grannyRes) return null;
    if (this._sharedGeometry) return this._getSource(this.grannyRes.GetGrannyInfo());
    return this._getSource(this.grannyRes);
  }

  /**
   * Whether the bound file is CMF.
   *
   * Carbon `IsUsingCMF` (cpp:393-403) asks the granny resource, then the
   * borrowed geometry, each of which knows by the reader that loaded it.
   * Adapted: a standalone resource here is a decoded gr2 payload
   * (CjsGrannyCurves), so only borrowed geometry can be CMF until a .cmf
   * animation-file route exists.
   *
   * @returns {boolean} True when animating a CMF file.
   */
  @carbon.method
  @impl.adapted
  IsUsingCMF()
  {
    return this._sharedGeometry ? this.grannyRes.IsUsingCMF() : false;
  }

  /**
   * The CMF data this updater animates, or null (Carbon `GetCMFData`,
   * cpp:405-429; adapted as IsUsingCMF is).
   *
   * @returns {object|null} The CMF payload.
   */
  @carbon.method
  @impl.adapted
  GetCMFData()
  {
    return this._sharedGeometry ? this.grannyRes.GetCMFData() : null;
  }

  /** The file whose animations this updater plays: the CMF data or the granny file. */
  _GetAnimationSource()
  {
    return this.IsUsingCMF() ? this.GetCMFData() : this.GetFileInfo();
  }

  /** Rebuilds browser bone state directly from format-gr2's stable payload. */
  @impl.adapted
  RebuildCachedData()
  {
    this._runtimeModel = null;
    this._meshBoneIndices.length = 0;
    this._curveCache = new WeakMap();
    this._morphCurveCache = new WeakMap();
    this._morphAnimations.clear();
    this.boneOffset.ClearRigBindings();
    if (this.IsUsingCMF())
    {
      return this._RebuildFromCMF();
    }

    const source = this.GetFileInfo();
    const models = this._getArray(source, "models", "Models");
    const model = models.find(item => getName(item) === this.model_) ?? models[0] ?? null;
    const skeleton = model?.skeleton ?? model?.Skeleton ?? null;
    const sourceBones = this._getArray(skeleton, "bones", "Bones");
    if (!model || sourceBones.length === 0)
    {
      this._initialized = false;
      return false;
    }

    const bones = sourceBones.map((sourceBone, index) => this._createBone(sourceBone, index));
    const boneByName = new Map(bones.map((bone, index) => [bone.name, index]));
    this._runtimeModel = { source, model, skeleton, bones, boneByName };
    this._rebuildRestTransforms();
    this._rebuildMeshBoneIndices();
    // Carbon cmf::RestPose(m_pose, skeleton) at setup (Tr2GrannyAnimation.cpp:624):
    // the ONLY unconditional rest pose; Update never resets it again.
    this._resetPose();
    this._initialized = true;
    this.Update(0);
    return true;
  }

  /**
   * Carbon's CMF setup (Tr2GrannyAnimation.cpp:577-660), into the same runtime
   * bone model the gr2 branch builds, so posing, layers and the palette are
   * shared.
   *
   * The skeleton is the mesh's (`meshes[0].skeleton`, 0xff for none) with a
   * mesh binding, else the one named by `model`, else the first. Each bone's
   * inverse rest transform is the skeleton's STORED invBindTransforms, which
   * Carbon's palette multiplies by (cpp:1753), not an inverse computed here.
   * The mesh bone mapping is Carbon's CreateMapping (cpp:48-63): by name,
   * clamped to MAX_JOINT_COUNT, an unmapped bone -1.
   *
   * Verified equal to the gr2 branch on a gr2 hull's CMF projection
   * (skinned-hull-animation.test.js). No natively authored animated .cmf has
   * been checked yet: Serenity ships gr2, including its animated skins.
   *
   * @returns {boolean} Whether a skeleton was found.
   */
  _RebuildFromCMF()
  {
    const data = this.GetCMFData();
    if (!data || !Array.isArray(data.skeletons) || data.skeletons.length === 0)
    {
      this._initialized = false;
      return false;
    }

    let modelIndex = 0;
    if (this._useMeshBinding)
    {
      modelIndex = data.meshes.length > 0 && data.meshes[0].skeleton !== 0xff ? data.meshes[0].skeleton : -1;
    }
    else if (this.model_)
    {
      modelIndex = data.skeletons.findIndex(skeleton => skeleton.name === this.model_);
    }
    if (modelIndex === -1)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "Model '%s' not found in '%s'", this.model_, this.resPath_);
      this._initialized = false;
      return false;
    }

    const skeleton = data.skeletons[modelIndex];
    const bones = Array.from(skeleton.bones, (name, index) =>
    {
      const rest = skeleton.restTransforms[index];
      const parent = skeleton.parents[index];
      const bone = this._createBone({
        name,
        parentIndex: parent === 0xffffffff ? -1 : parent,
        position: rest.position,
        orientation: rest.rotation,
        scaleShear: [ rest.scale[0], 0, 0, 0, rest.scale[1], 0, 0, 0, rest.scale[2] ]
      }, index);
      mat4.copy(bone.inverseRestTransform, skeleton.invBindTransforms[index]);
      return bone;
    });
    const boneByName = new Map(bones.map((bone, index) => [ bone.name, index ]));
    this._runtimeModel = { source: data, model: skeleton, skeleton, bones, boneByName, cmf: true };

    if (this._useMeshBinding)
    {
      const bindings = data.meshes[0].boneBindings;
      const count = Math.min(bindings.length, MAX_JOINT_COUNT);
      this._meshBoneIndices = Array.from({ length: count }, (_, index) => boneByName.get(bindings[index].name) ?? -1);
    }

    this._resetPose();
    this._initialized = true;
    // cpp:668-672: pump once so there is a valid pose before the next update.
    this.Update(0);
    return true;
  }

  /**
   * Advances CPU animation controls and rebuilds browser bone matrices.
   *
   * Adapted: Carbon's CMF PrePhysicsAnimation (Tr2GrannyAnimation.cpp:1693-1745)
   * driven by an explicit delta instead of Tr2Renderer's animation clock. The
   * pose is PERSISTENT, as in Carbon: it is rest-posed once at setup
   * (cpp:624) and sampling writes only bones of active animations
   * (cmf AnimationSequencer::Sample, mesh/src/cmf/animation.cpp:810-819), so a
   * bone nothing animates keeps its last value - an aimed bone keeps its aim
   * after DisableAimBone.
   */
  @impl.adapted
  Update(dt = 0)
  {
    if (!this._initialized || !this.animationEnabled)
    {
      return false;
    }
    const deltaTime = this._paused ? 0 : Math.max(0, Number(dt) || 0);
    this._advanceLayer(this._baseLayer, deltaTime);
    for (const layer of this._getOrderedLayers())
    {
      this._advanceLayer(layer, deltaTime);
    }
    this._morphAnimations.clear();
    // Carbon cpp:1704-1709: sampling only writes bones referenced by active
    // animations, so the pre-modifier pose is restored first or the modifier
    // compounds onto its own output.
    if (this._poseModifier && this._sampledPose && this._sampledPose.model === this._runtimeModel)
    {
      this._restorePose(this._sampledPose);
    }
    this._sampleLayer(this._baseLayer, false);
    for (const layer of this._getOrderedLayers())
    {
      this._sampleLayer(layer, this._additiveMode);
    }
    this._UpdateAimingBone(this._GetPoseModifierView().skeleton);
    if (this._poseModifier)
    {
      // Carbon cpp:1719-1723: snapshot the sampled pose, then modify in place.
      this._sampledPose = this._snapshotPose(this._sampledPose);
      const view = this._GetPoseModifierView();
      this._poseModifier.ModifyPose(view.skeleton, view.pose);
    }
    // Carbon quirk (cpp:1727-1742 with GrannyBoneOffset.cpp:195-196): offsets
    // are applied onto the persistent pose, so with no pose modifier to
    // restore it they compound every frame on bones no animation rewrites.
    this._applyBoneOffsets();
    this._composePose();
    return true;
  }

  /**
   * Copies the current local pose into `target` (allocated on first use or on
   * a skeleton change) - Carbon's `m_sampledPose = m_pose` (cpp:1721).
   */
  _snapshotPose(target)
  {
    const bones = this._runtimeModel.bones;
    let snapshot = target;
    if (!snapshot || snapshot.model !== this._runtimeModel)
    {
      snapshot = {
        model: this._runtimeModel,
        bones: bones.map(() => ({ position: vec3.create(), orientation: quat.create(), scaleShear: mat3.create() }))
      };
    }
    for (let index = 0; index < bones.length; index++)
    {
      vec3.copy(snapshot.bones[index].position, bones[index].position);
      quat.copy(snapshot.bones[index].orientation, bones[index].orientation);
      mat3.copy(snapshot.bones[index].scaleShear, bones[index].scaleShear);
    }
    return snapshot;
  }

  /** Writes a pose snapshot back into the live bones - Carbon's `m_pose = m_sampledPose` (cpp:1708). */
  _restorePose(snapshot)
  {
    const bones = this._runtimeModel.bones;
    for (let index = 0; index < bones.length; index++)
    {
      vec3.copy(bones[index].position, snapshot.bones[index].position);
      quat.copy(bones[index].orientation, snapshot.bones[index].orientation);
      mat3.copy(bones[index].scaleShear, snapshot.bones[index].scaleShear);
    }
  }

  /** The registered pose modifier, or null (Carbon Tr2GrannyAnimation.cpp:2170-2173). */
  @carbon.method
  @impl.implemented
  GetPoseModifier()
  {
    return this._poseModifier;
  }

  /**
   * Registers the non-owning modify-the-sampled-pose hook (Carbon
   * Tr2GrannyAnimation.cpp:2175-2178); pass null to clear it.
   */
  @carbon.method
  @impl.implemented
  SetPoseModifier(poseModifier)
  {
    this._poseModifier = poseModifier ?? null;
  }

  /**
   * The skeleton/pose ducks the modifier receives: bone names plus
   * boneTransforms entries whose position/rotation/scaleShear ALIAS the live
   * runtime bone arrays, so in-place modification lands in the composed
   * pose exactly as Carbon's cmf::SkeletonPose& does. Rebuilt only when the
   * runtime model changes.
   */
  _GetPoseModifierView()
  {
    const model = this._runtimeModel;
    if (!this._poseModifierView || this._poseModifierView.model !== model)
    {
      const bones = model?.bones ?? [];
      this._poseModifierView = {
        model,
        skeleton: {
          bones: bones.map(bone => bone.name),
          parents: bones.map(bone => bone.parentIndex)
        },
        pose: {
          boneTransforms: bones.map(bone => ({
            position: bone.position,
            rotation: bone.orientation,
            scaleShear: bone.scaleShear
          }))
        }
      };
    }
    return this._poseModifierView;
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
    if (!name || this._layers.has(name))
    {
      return false;
    }
    this._layers.set(name, createLayer(name, Number(layerWeight) || 0, false));
    return true;
  }

  /** Carbon method AddAnimationLayerAllBones (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  AddAnimationLayerAllBones(layerName)
  {
    const layer = this._getLayer(layerName);
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
    const layer = this._getLayer(layerName);
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
  @impl.reason("Resource loading stays resource-layer-owned; registered decoded resources are attached synchronously when available.")
  AddSecondaryResPath(resPath)
  {
    const path = String(resPath ?? "");
    if (!path || this._secondaryResources.has(path))
    {
      return false;
    }
    this._secondaryResources.set(path, CjsGrannyCurves.resolveResource(path));
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
    this._secondaryResources.set(path, resource ?? null);
    return true;
  }

  /**
   * Aims a named bone axis toward a target in skeleton coordinates on each update.
   *
   * Adapted: Stores the native vectors in gl-matrix arrays. The correction is
   * applied after sampling and before pose modifiers and bone offsets.
   */
  @carbon.method
  @impl.adapted
  AimBone(boneName, targetX, targetY, targetZ, axisX, axisY, axisZ)
  {
    this._aimingBone = true;
    this._aimBone = String(boneName ?? "");
    vec3.set(this._aimBoneOrientation, targetX, targetY, targetZ);
    vec3.set(this._aimAxis, axisX, axisY, axisZ);
  }

  /**
   * Carbon Tr2GrannyAnimation::UpdateAimingBone (Tr2GrannyAnimation.h:175,
   * cpp:1611-1651, private): replaces the first matching bone's local rotation
   * with the aiming correction.
   *
   * Uses the decoded runtime skeleton and gl-matrix world transforms.
   * Native quirk (Tr2GrannyAnimation.cpp:1639): parent transpose is used even
   * under non-uniform scale. Do not substitute a true inverse.
   *
   * @param {object} skeleton Skeleton view containing ordered bone names.
   * @returns {void}
   */
  _UpdateAimingBone(skeleton)
  {
    if (!this._aimingBone || !this._runtimeModel)
    {
      return;
    }
    const name = this._aimBone.toLowerCase();
    const index = skeleton.bones.findIndex(boneName => boneName.toLowerCase() === name);
    if (index < 0)
    {
      return;
    }
    this._composePose();
    const bone = this._runtimeModel.bones[index];
    const world = bone.worldTransform;
    const direction = vec3.fromValues(
      this._aimBoneOrientation[0] - world[12],
      this._aimBoneOrientation[1] - world[13],
      this._aimBoneOrientation[2] - world[14]
    );
    vec3.normalize(direction, direction);
    if (bone.parentIndex >= 0)
    {
      const parent = this._runtimeModel.bones[bone.parentIndex].worldTransform;
      const x = direction[0], y = direction[1], z = direction[2];
      // TransformNormal(direction, Transpose(parentWorld)); no translation.
      vec3.set(direction,
        parent[0] * x + parent[1] * y + parent[2] * z,
        parent[4] * x + parent[5] * y + parent[6] * z,
        parent[8] * x + parent[9] * y + parent[10] * z);
      vec3.normalize(direction, direction);
    }
    quat.rotationArc(bone.orientation, this._aimAxis, direction);
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

  /** Carbon method ClearAnimations (Tr2GrannyAnimation.cpp:1515-1518): the base layer's. */
  @carbon.method
  @impl.implemented
  ClearAnimations()
  {
    this._baseLayer.ClearAnimations();
  }

  /**
   * Stops all base-layer animations, current and queued, `delay` seconds from
   * now (Carbon Tr2GrannyAnimation.cpp:1510-1513 delegating to
   * Tr2GrannyAnimationLayer::StopAnimations). Distinct from EndAnimation
   * (finish the current loop) and ClearAnimations (drop everything with no
   * delay bookkeeping).
   */
  @carbon.method
  @impl.implemented
  StopAnimations(delay = 0)
  {
    this._baseLayer.StopAnimations(delay);
  }

  /**
   * The named animation layer, the base layer for a null name, or null when no
   * layer has that name (Carbon Tr2GrannyAnimation.cpp:305-319). An empty
   * string is a name, not the base layer, as in Carbon's map lookup.
   *
   * @param {?string} name
   * @returns {?Tr2GrannyAnimationLayer}
   */
  @carbon.method
  @impl.implemented
  GetAnimationLayer(name = null)
  {
    if (name === null || name === undefined)
    {
      return this._baseLayer;
    }
    return this._layers.get(String(name)) ?? null;
  }

  /** Carbon method ClearAnimationLayers (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  ClearAnimationLayers()
  {
    this._layers.clear();
  }

  /** Carbon method DisableAimBone (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  DisableAimBone()
  {
    this._aimingBone = false;
  }

  /** Carbon method EndAnimation (Tr2GrannyAnimation.cpp:1505-1508): the base layer's. */
  @carbon.method
  @impl.implemented
  EndAnimation()
  {
    this._baseLayer.EndAnimation();
  }

  /** Carbon method GetAdditiveBlendMode (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetAdditiveBlendMode()
  {
    return this._additiveMode;
  }

  /** Carbon method GetLayerWeight (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetLayerWeight(layerName)
  {
    return this._getLayer(layerName)?.weight ?? 0;
  }

  /** Carbon method GetSecondaryAnimationName (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  GetSecondaryAnimationName(resPath, index)
  {
    const source = this._getSource(this._secondaryResources.get(String(resPath ?? "")));
    return getName(CjsGrannyCurves.getAnimations(source)[Number(index) || 0]);
  }

  /** Carbon method PlayAnimation -> PlayAnimationOnce (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  PlayAnimation(animName, replace = true, loopCount = 1, delay = 0, speed = 1, clearWhenDone = true)
  {
    return this._playLayer("", animName, replace, loopCount, delay, speed, clearWhenDone);
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
    return this._playLayer(layerName, animName, replace, loopCount, delay, speed, clearWhenDone);
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
    const layer = this._getLayer(layerName);
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
      const source = this._getSource(resource);
      for (const animation of CjsGrannyCurves.getAnimations(source))
      {
        names.push(getName(animation));
      }
    };
    append(this._GetAnimationSource());
    for (const resource of this._secondaryResources.values())
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
    this._additiveMode = !!additive;
  }

  /** Carbon method SetLayerControlParam (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetLayerControlParam(layerName, controlParam)
  {
    const layer = this._getLayer(layerName);
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
    const layer = this._getLayer(layerName);
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
    const layer = this._getLayer(layerName);
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
    this._paused = !!pause;
  }

  /** Returns whether a model-bearing decoded Granny payload is ready. */
  @impl.implemented
  IsInitialized()
  {
    return this._initialized;
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
    const bones = this._runtimeModel?.bones ?? [];
    const count = this._meshBoneIndices.length;

    if (!this._meshBonePalette || this._meshBonePalette.length !== count * 12)
    {
      this._meshBonePalette = new Float32Array(count * 12);
    }

    const palette = this._meshBonePalette;

    for (let index = 0; index < count; index++)
    {
      const source = bones[this._meshBoneIndices[index]]?.offsetTransform;
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
  /** Returns the number of mesh bones in the current palette. */
  GetMeshBoneCount()
  {
    return this._meshBoneIndices.length;
  }

  @impl.adapted
  /** Copies a named bone's world transform into an output matrix. */
  GetBoneWorldTransform(boneName, out = mat4.create())
  {
    const index = this._runtimeModel?.boneByName.get(String(boneName ?? ""));
    if (index === undefined)
    {
      return false;
    }
    mat4.copy(out, this._runtimeModel.bones[index].worldTransform);
    return out;
  }

  @impl.adapted
  /** Copies an indexed bone's world transform into an output matrix. */
  GetBoneTransform(index, out = mat4.create())
  {
    const bone = this._runtimeModel?.bones[Number(index)];
    if (!bone)
    {
      return false;
    }
    mat4.copy(out, bone.worldTransform);
    return out;
  }

  @impl.adapted
  /** Resolves a bone name or index to its current world matrix. */
  GetBoneMatrix(bone)
  {
    if (typeof bone === "number")
    {
      return this.GetBoneTransform(bone);
    }
    return this.GetBoneWorldTransform(bone);
  }

  @impl.implemented
  /** Returns the current world transforms for every animation bone. */
  GetAnimationTransforms()
  {
    return this._runtimeModel?.bones.map(bone => bone.worldTransform) ?? [];
  }

  @impl.implemented
  /** Returns the ordered names of the current animation bones. */
  GetAnimationBoneList()
  {
    return this._runtimeModel?.bones.map(bone => bone.name) ?? [];
  }

  /** Returns a detached snapshot of morph values sampled during the last update. */
  @impl.implemented
  GetMorphAnimations()
  {
    return new Map(this._morphAnimations);
  }

  /** Exposes retained aim state to an engine-side IK adapter. */
  @impl.adapted
  GetAimBoneState()
  {
    return {
      enabled: this._aimingBone,
      boneName: this._aimBone,
      target: vec3.clone(this._aimBoneOrientation),
      axis: vec3.clone(this._aimAxis)
    };
  }

  /** Advances one animation layer and retires completed requests. */
  _advanceLayer(layer, dt)
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
    request.animation ??= this._findAnimation(request.name);
    if (!request.animation)
    {
      return;
    }
    request.elapsed += dt;
    // Carbon cmf::AnimationSequencer::RemoveFinishedAnimations erases a
    // player once its pinned stop time is reached (animation.cpp:821-827).
    if (request.stopAt !== undefined && request.elapsed >= request.stopAt)
    {
      layer.queue.shift();
      return;
    }
    const duration = this._getAnimationDuration(request.animation);
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

  /** Applies configured bone offsets to the sampled local pose. */
  _applyBoneOffsets()
  {
    // Carbon cpp:1727-1742: rebind when the rig changed, then apply per bone.
    const bones = this._runtimeModel?.bones ?? [];
    const offsets = this.boneOffset;
    if (offsets.NeedRebind(bones.length) && bones.length)
    {
      offsets.BindToRig(bones.map(bone => bone.name), bones.length);
    }

    if (offsets.HaveTransforms())
    {
      for (const bone of bones)
      {
        offsets.ApplyToLocal(bone.index, bone.orientation, bone.position);
      }
    }
  }

  /** Composes local bone state into world and offset transforms. */
  _composePose()
  {
    const rotationMatrix = mat4.create();
    for (const bone of this._runtimeModel.bones)
    {
      // Granny composite applies ScaleShear FIRST, then Orientation, then
      // Position (row-vector SS*R*T - authority: the validated gr2->CMF
      // converter, runtime resource formats/cmf/core/gr2Anim.js composeTrs).
      // In gl-matrix that is local = R . SS with the translation stamped in.
      // Order-insensitive for identity scaleShear (all EVE skeletons).
      mat4.fromMat3(bone.localTransform, bone.scaleShear);
      mat4.multiply(bone.localTransform, mat4.fromQuat(rotationMatrix, bone.orientation), bone.localTransform);
      bone.localTransform[12] = bone.position[0];
      bone.localTransform[13] = bone.position[1];
      bone.localTransform[14] = bone.position[2];
      if (bone.parentIndex >= 0 && this._runtimeModel.bones[bone.parentIndex])
      {
        mat4.multiply(bone.worldTransform, this._runtimeModel.bones[bone.parentIndex].worldTransform, bone.localTransform);
      }
      else
      {
        mat4.copy(bone.worldTransform, bone.localTransform);
      }
      mat4.multiply(bone.offsetTransform, bone.worldTransform, bone.inverseRestTransform);
    }
  }

  /** Creates one detached runtime bone record from a decoded source bone. */
  _createBone(source, index)
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

  /** Decodes and caches the transform curves for one animation track. */
  _decodeTrack(track)
  {
    let value = this._curveCache.get(track);
    if (!value)
    {
      value = {
        position: CjsGrannyCurves.decodeGrannyCurve(track.position ?? track.Position, 3),
        orientation: CjsGrannyCurves.decodeGrannyCurve(track.orientation ?? track.Orientation, 4),
        scaleShear: CjsGrannyCurves.decodeGrannyCurve(track.scaleShear ?? track.ScaleShear, 9)
      };
      this._curveCache.set(track, value);
    }
    return value;
  }

  /** Finds a named animation across primary and secondary resources. */
  _findAnimation(name)
  {
    const target = String(name ?? "");
    // No file bound yet is no animation, not an error: the request queues by
    // name until a file arrives, as Carbon's ConsumeAnimationQueue drains it
    // on rebuild (cpp:662-666).
    const find = resource =>
    {
      const source = this._getSource(resource);
      return source ? CjsGrannyCurves.getAnimations(source).find(animation => getName(animation) === target) : undefined;
    };
    let animation = find(this._GetAnimationSource());
    if (animation)
    {
      return animation;
    }
    for (const resource of this._secondaryResources.values())
    {
      animation = find(resource);
      if (animation)
      {
        return animation;
      }
    }
    return null;
  }

  /** Returns a nonnegative duration for one animation. */
  _getAnimationDuration(animation)
  {
    return Math.max(0, CjsGrannyCurves.getAnimationDuration(animation));
  }

  /** Reads a lower- or upper-case array property from decoded Granny data. */
  _getArray(value, lowerName, upperName)
  {
    return Array.isArray(value?.[lowerName]) ? value[lowerName] : Array.isArray(value?.[upperName]) ? value[upperName] : [];
  }

  /** Resolves a named layer or the unnamed base layer. */
  _getLayer(layerName)
  {
    const name = String(layerName ?? "");
    return name ? this._layers.get(name) ?? null : this._baseLayer;
  }

  /** Returns named animation layers in deterministic name order. */
  _getOrderedLayers()
  {
    return [ ...this._layers.entries() ]
      .sort(([ left ], [ right ]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([, layer ]) => layer);
  }

  /** Unwraps a resource wrapper to its decoded Granny source object. */
  _getSource(resource)
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

  /** Queues or replaces one animation request on a layer. */
  _playLayer(layerName, animName, replace, loopCount, delay, speed, clearWhenDone)
  {
    const layer = this._getLayer(layerName);
    const name = String(animName ?? "");
    if (!layer || !name)
    {
      return false;
    }
    const animation = this._findAnimation(name);
    if (!animation && this._GetAnimationSource())
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

  /** Rebuilds the mesh-to-skeleton bone index map. */
  _rebuildMeshBoneIndices()
  {
    const { source, model, bones, boneByName } = this._runtimeModel;
    const meshBindings = this._getArray(model, "meshBindings", "MeshBindings");
    const meshes = this._getArray(source, "meshes", "Meshes");
    const mesh = meshes[Number(meshBindings[0]) || 0];
    const bindings = this._getArray(mesh, "boneBindings", "BoneBindings");
    this._meshBoneIndices = bindings
      .map(binding => boneByName.get(getName(binding)))
      .filter(index => index !== undefined);
    if (this._meshBoneIndices.length === 0)
    {
      this._meshBoneIndices = bones.map((_, index) => index);
    }
  }

  /** Rebuilds rest-world and inverse-rest transforms for every bone. */
  _rebuildRestTransforms()
  {
    const rotationMatrix = mat4.create();
    for (const bone of this._runtimeModel.bones)
    {
      // Granny composite: ScaleShear first, then Orientation (see _composePose).
      mat4.fromMat3(bone.localTransform, bone.restScaleShear);
      mat4.multiply(bone.localTransform, mat4.fromQuat(rotationMatrix, bone.restOrientation), bone.localTransform);
      bone.localTransform[12] = bone.restPosition[0];
      bone.localTransform[13] = bone.restPosition[1];
      bone.localTransform[14] = bone.restPosition[2];
      if (bone.parentIndex >= 0 && this._runtimeModel.bones[bone.parentIndex])
      {
        mat4.multiply(bone.worldTransform, this._runtimeModel.bones[bone.parentIndex].worldTransform, bone.localTransform);
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

  /** Restores every runtime bone to its authored rest pose. */
  _resetPose()
  {
    for (const bone of this._runtimeModel.bones)
    {
      vec3.copy(bone.position, bone.restPosition);
      quat.copy(bone.orientation, bone.restOrientation);
      mat3.copy(bone.scaleShear, bone.restScaleShear);
    }
  }

  /** Decodes and caches one modern or legacy morph curve. */
  _decodeMorphCurve(curve, modern)
  {
    if (!curve || typeof curve !== "object")
    {
      return null;
    }

    if (!this._morphCurveCache.has(curve))
    {
      this._morphCurveCache.set(curve, modern
        ? CjsGrannyCurves.decodeAnimationCurve(curve, 1)
        : CjsGrannyCurves.decodeGrannyCurve(curve, 1));
    }
    return this._morphCurveCache.get(curve);
  }

  /** Samples every supported morph channel from one animation. */
  _sampleMorphs(animation, time, duration, weight, additive)
  {
    if (!(duration > 0) || time < 0 || time >= duration)
    {
      return;
    }

    const amount = Number(weight) || 0;
    const channels = this._getArray(animation, "channels", "Channels");
    const curves = this._getArray(animation, "curves", "Curves");
    for (const channel of channels)
    {
      const targetType = channel.targetType ?? channel.TargetType;
      if (targetType !== "MorphTarget" && targetType !== 3)
      {
        continue;
      }

      const name = String(channel.target ?? channel.Target ?? "");
      const curve = curves[Number(channel.curveIndex ?? channel.CurveIndex)];
      this._sampleMorph(name, this._decodeMorphCurve(curve, true), time, duration, amount, additive);
    }

    for (const group of CjsGrannyCurves.getTrackGroups(animation))
    {
      if (getName(group) !== "root")
      {
        continue;
      }

      for (const track of this._getArray(group, "vectorTracks", "VectorTracks"))
      {
        const curve = track.valueCurve ?? track.ValueCurve;
        const dimension = Number(track.dimension ?? track.Dimension ?? curve?.dimension ?? curve?.Dimension);
        if (dimension !== 1)
        {
          continue;
        }
        this._sampleMorph(getName(track), this._decodeMorphCurve(curve, false), time, duration, amount, additive);
      }
      break;
    }
  }

  /** Accumulates one sampled morph curve into retained output state. */
  _sampleMorph(name, curve, time, duration, weight, additive)
  {
    if (!name || !curve)
    {
      return;
    }

    this._morphSample[0] = 0;
    CjsGrannyCurves.sampleGrannyCurve(this._morphSample, curve, time, false, duration);
    const value = this._morphSample[0] * weight;
    if (!Number.isFinite(value))
    {
      return;
    }

    const previous = this._morphAnimations.get(name);
    this._morphAnimations.set(name, additive && previous !== undefined ? previous + value : value);
  }

  /** Samples the active request for one animation layer. */
  _sampleLayer(layer, additive)
  {
    // Carbon's control-param paths rest-pose the RESULT pose before sampling,
    // players or not (Tr2GrannyAnimationLayer.cpp:671 base, :725 layered).
    // Quirk (cpp:725): on a non-additive named layer that is the shared pose,
    // so it wipes what the base layer sampled this frame.
    if (layer.controlParamEnabled && !additive)
    {
      this._resetPose();
    }
    const request = layer.queue[0];
    const animation = request?.animation;
    if (!animation || request.elapsed < 0)
    {
      return;
    }
    // Carbon cmf::AnimationPlayer::Sample returns false past the pinned stop
    // time (animation.cpp:734-743), leaving the bone at its last pose.
    if (request.stopAt !== undefined && request.elapsed >= request.stopAt)
    {
      return;
    }
    const duration = this._getAnimationDuration(animation);
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
    if (this._runtimeModel.cmf)
    {
      this._sampleCmfAnimation(animation, time, layer, additive);
      return;
    }
    this._sampleMorphs(animation, time, duration, layer.weight, additive);
    const trackGroups = CjsGrannyCurves.getTrackGroups(animation);
    const modelName = getName(this._runtimeModel.model);
    const matchingGroups = trackGroups.filter(group => getName(group) === modelName);
    for (const group of matchingGroups.length ? matchingGroups : trackGroups)
    {
      const tracks = this._getArray(group, "transformTracks", "TransformTracks");
      for (const track of tracks)
      {
        const boneIndex = this._runtimeModel.boneByName.get(getName(track));
        const bone = this._runtimeModel.bones[boneIndex];
        if (!bone || (!layer.allBones && !layer.bones.has(bone.name)))
        {
          continue;
        }
        this._sampleTrack(bone, track, time, duration, layer.weight, additive);
      }
    }
  }

  /**
   * Samples a CMF animation's bone channels into the pose.
   *
   * Carbon cmf AnimationPlayer (mesh/src/cmf/animation.cpp:551-590, 750-767):
   * each BonePosition/BoneRotation/BoneScale channel resolves its bone by name,
   * and only the curves an animation has are written. Blending by layer weight
   * is the gr2 branch's, shared through _blendSampledBone. Morph channels are
   * not sampled on this branch.
   */
  _sampleCmfAnimation(animation, time, layer, additive)
  {
    for (const [ boneIndex, curves ] of this._getCmfChannels(animation))
    {
      const bone = this._runtimeModel.bones[boneIndex];
      if (!layer.allBones && !layer.bones.has(bone.name))
      {
        continue;
      }
      this._blendSampledBone(
        bone,
        channel => !!curves[channel],
        (out, channel, at) => sampleCmfChannel(out, curves, channel, at),
        time,
        layer.weight,
        additive
      );
    }
  }

  /** Decodes and caches a CMF animation's bone curves, grouped by bone index. */
  _getCmfChannels(animation)
  {
    let channels = this._curveCache.get(animation);
    if (!channels)
    {
      channels = new Map();
      for (const channel of animation.channels)
      {
        const slot = CMF_CHANNEL_SLOTS[channel.targetType];
        const boneIndex = this._runtimeModel.boneByName.get(channel.target);
        if (!slot || boneIndex === undefined)
        {
          continue;
        }
        if (!channels.has(boneIndex)) channels.set(boneIndex, {});
        channels.get(boneIndex)[slot] = CjsCmfFormat.decodeAnimationCurve(animation.curves[channel.curveIndex]);
      }
      this._curveCache.set(animation, channels);
    }
    return channels;
  }

  /** Samples and blends one transform track into a runtime bone. */
  _sampleTrack(bone, track, time, duration, weight, additive)
  {
    const curves = this._decodeTrack(track);
    this._blendSampledBone(
      bone,
      channel => !!curves[channel],
      (out, channel, at) => CjsGrannyCurves.sampleGrannyCurve(out, curves[channel], at, false, duration),
      time,
      weight,
      additive
    );
  }

  /**
   * Blends one bone's sampled channels into its pose, weighted or additively.
   * Shared by the gr2 tracks and the CMF channels, which differ only in how a
   * channel is sampled.
   *
   * @param {object} bone The runtime bone.
   * @param {function(string): boolean} has Whether a channel
   *   ("position", "orientation", "scaleShear") has a curve.
   * @param {function(*, string, number): void} sample Samples a channel into out.
   * @param {number} time The local animation time.
   * @param {number} weight The layer weight.
   * @param {boolean} additive Whether the layer blends additively.
   */
  _blendSampledBone(bone, has, sample, time, weight, additive)
  {
    // A missing curve leaves its channel as the pose holds it (cmf
    // AnimationPlayer::SampleAtLocalTime writes only the curves it has,
    // mesh/src/cmf/animation.cpp:750-767); the additive delta measures
    // against rest, so it keeps rest defaults.
    const position = vec3.clone(additive ? bone.restPosition : bone.position);
    const orientation = quat.clone(additive ? bone.restOrientation : bone.orientation);
    const scaleShear = mat3.clone(additive ? bone.restScaleShear : bone.scaleShear);
    if (has("position"))
    {
      sample(position, "position", time);
    }
    if (has("orientation"))
    {
      sample(orientation, "orientation", time);
      quat.normalize(orientation, orientation);
    }
    if (has("scaleShear"))
    {
      sample(scaleShear, "scaleShear", time);
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
    if (has("position"))
    {
      sample(referencePosition, "position", 0);
    }
    if (has("orientation"))
    {
      sample(referenceOrientation, "orientation", 0);
      quat.normalize(referenceOrientation, referenceOrientation);
    }
    if (has("scaleShear"))
    {
      sample(referenceScaleShear, "scaleShear", 0);
    }
    vec3.scaleAndAdd(bone.position, bone.position, vec3.subtract(position, position, referencePosition), amount);
    // Additive delta = orientation . reference^-1, applied on the LEFT of the
    // current pose (out = delta . bone), so amount=1 from the reference pose
    // recovers the authored orientation exactly. Authority: the visually
    // proven reverse-engineered composeInteriorAdditivePose
    // (ccpwgl/src/interior/character/Tr2InteriorAdditiveAnimation.js) -
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
