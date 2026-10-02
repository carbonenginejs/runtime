import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { INotify } from "../../../global/blue/INotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildCloud.h
// Hand-maintained from Carbon source.
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";


const LOCAL_MIN = vec3.fromValues(-0.5, -0.5, -0.5);
const LOCAL_MAX = vec3.fromValues(0.5, 0.5, 0.5);
const PARENT_TRANSFORM = mat4.create();
const BOUNDS_MIN = vec3.create();
const BOUNDS_MAX = vec3.create();


function updateBoundingSphere(cloud)
{
  vec3.transformMat4(BOUNDS_MIN, LOCAL_MIN, cloud.worldTransform);
  vec3.transformMat4(BOUNDS_MAX, LOCAL_MAX, cloud.worldTransform);
  vec4.set(
    cloud.boundingSphere,
    (BOUNDS_MIN[0] + BOUNDS_MAX[0]) * 0.5,
    (BOUNDS_MIN[1] + BOUNDS_MAX[1]) * 0.5,
    (BOUNDS_MIN[2] + BOUNDS_MAX[2]) * 0.5,
    vec3.distance(BOUNDS_MIN, BOUNDS_MAX) * 0.5);
}


/**
 * Legacy transformable volumetric-cloud child. Trinity owns its authored
 * state, SRT composition, visibility and bounds; GPU tessellation and draw
 * realization are not ported yet.
 */
@meta.define({ className: "EveChildCloud", family: "eve/child", purpose: "Describes a transformable volumetric cloud child, including its effect, editable volume, tessellation, LOD, and bounds state." })
@meta.blue.inherit(ITr2Renderable)
@meta.blue.inherit(IInitialize, INotify)
export class EveChildCloud extends EveSpaceObjectChild
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  sortingModifier = 1;

  @meta.blue.read
  @meta.type.uint64
  currentLod = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minScreenSize = 0;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  preTesselationLevel = 32;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Material")
  effect = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("EveCloudEditableVolume")
  volume = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  cellScreenSize = 0.3;

  @meta.blue.readwrite
  @meta.type.boolean
  display = true;

  @meta.blue.read
  @meta.type.vec4
  boundingSphere = vec4.create();

  /** Runtime-local authored SRT transform. */
  localTransform = mat4.create();

  /** Runtime world transform composed during the sync pass. */
  worldTransform = mat4.create();

  /** Whether the last visibility pass accepted the cloud. */
  isVisible = false;

  /** Carbon does not render the cloud before its first update. */
  hasUpdated = false;

  /** LOD factor retained for an engine's tessellation selection. */
  lastLodFactor = 1;

  /** Initializes the portable CPU half; GPU resources belong to the engine. */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    return true;
  }

  /** Advances the editable volume, composes local SRT with its live parent and refreshes bounds. */
  @meta.blue.method
  @meta.implemented
  UpdateSyncronous(updateContext, params)
  {
    if (this.volume)
    {
      this.volume.Update(updateContext.GetTime());
    }

    mat4.fromRotationTranslationScale(
      this.localTransform, this.rotation, this.translation, this.scaling);
    const parent = params.childParent ?? params.spaceObjectParent;
    const parentTransform = parent.GetLocalToWorldTransform(PARENT_TRANSFORM);
    // Carbon row-vector local * parent maps to parent * local in gl-matrix.
    mat4.multiply(this.worldTransform, parentTransform, this.localTransform);
    updateBoundingSphere(this);
    this.hasUpdated = true;
  }

  /** Refreshes bounds from the transform finalized by the sync pass. */
  @meta.blue.method
  @meta.implemented
  UpdateAsyncronous(_updateContext, _params)
  {
    updateBoundingSphere(this);
  }

  /** Applies Carbon's display, frustum and minimum-screen-size visibility gate. */
  @meta.blue.method
  @meta.implemented
  UpdateVisibility(updateContext, _parentTransform, _parentLod)
  {
    const frustum = updateContext.GetFrustum();
    this.isVisible = this.display &&
      frustum.IsSphereVisible(this.boundingSphere) &&
      frustum.GetPixelSizeAccross(this.boundingSphere) >=
        this.minScreenSize * updateContext.GetLodFactor();
    this.lastLodFactor = updateContext.GetLodFactor();
  }

  /** Copies the current world-space sphere and always reports it available. */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphere(out = vec4.create(), _query = 0)
  {
    vec4.copy(out, this.boundingSphere);
    return true;
  }

  /** Copies the transform composed during the last sync pass. */
  @meta.blue.method
  @meta.implemented
  GetLocalToWorldTransform(out = mat4.create())
  {
    return mat4.copy(out, this.worldTransform);
  }

  /** Carbon always routes this legacy cloud through transparent rendering. */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return true;
  }
}

// EveChildCloud_Blue.cpp: native exposure.
meta.blue.interfaceTable({ interfaces: [EveChildCloud, ITr2Renderable, IInitialize, INotify, EveSpaceObjectChild, IEveSpaceObjectChild], chainTo: null })(EveChildCloud, { kind: "class" });
