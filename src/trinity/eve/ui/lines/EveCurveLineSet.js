// Source: trinity/trinity/Eve/UI/EveCurveLineSet.h
// Source: trinity/trinity/Eve/UI/EveCurveLineSet.cpp
import { mat4 } from "#math/mat4";
import { IEveSpaceObject2 } from "../../IEveSpaceObject2.js";
import { IEveTransform } from "../../IEveTransform.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";
import { Tr2CurveLineSet } from "../../../core/line/Tr2CurveLineSet.js";
import { Tr2PerObjectDataStandard } from "../../../core/rawData/perObjectData/Tr2PerObjectDataStandard.js";
import { Tr2Effect } from "../../../shader/Tr2Effect.js";
import { Tr2Lod } from "../../EveLODHelper.js";


const LOCAL_TRANSFORM = mat4.create();
const WORLD_SPHERE = vec4.create();


/** An Eve-owned, transformed and visibility-culled Carbon curve-line set. */
@meta.define({ className: "EveCurveLineSet", family: "eve/ui" })
@meta.blue.inherit(IEveSpaceObject2, IEveTransform)
export class EveCurveLineSet extends Tr2CurveLineSet
{

  /** Creates the default line and picking effects. */
  constructor()
  {
    super();
    this.lineEffect = new Tr2Effect();
    this.lineEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Space/SpecialFX/Lines3D.fx");
    this.pickEffect = new Tr2Effect();
    this.pickEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Space/SpecialFX/Lines3DPicking.fx");
  }

  /** Carbon's last visibility result. */
  @meta.type.boolean
  isVisible = false;

  /** Carbon performs no synchronous work for this leaf. */
  @meta.blue.method
  @meta.implemented
  UpdateSyncronous(_updateContext)
  {
  }

  /** Carbon performs no asynchronous work for this leaf. */
  @meta.blue.method
  @meta.implemented
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Carbon's IEveTransform update is intentionally empty. */
  @meta.blue.method
  @meta.implemented
  Update(_updateContext)
  {
  }

  /** Composes local SRT with the parent and culls the transformed local sphere. */
  @meta.blue.method
  @meta.blue.contextual(["camera"])
  @meta.implemented
  UpdateVisibility(updateContext, parentTransform)
  {
    this.isVisible = false;
    if (!this.display)
    {
      return;
    }

    mat4.fromRotationTranslationScale(LOCAL_TRANSFORM, this.rotation, this.translation, this.scaling);
    mat4.multiply(this.worldTransform, parentTransform, LOCAL_TRANSFORM);

    vec4.copy(WORLD_SPHERE, this.boundingSphere);
    vec3.transformMat4(WORLD_SPHERE, WORLD_SPHERE, this.worldTransform);
    const scaleX = Math.hypot(this.worldTransform[0], this.worldTransform[1], this.worldTransform[2]);
    const scaleY = Math.hypot(this.worldTransform[4], this.worldTransform[5], this.worldTransform[6]);
    const scaleZ = Math.hypot(this.worldTransform[8], this.worldTransform[9], this.worldTransform[10]);
    WORLD_SPHERE[3] *= Math.max(scaleX, scaleY, scaleZ);
    this.isVisible = updateContext.GetFrustum().IsSphereVisible(WORLD_SPHERE);
  }

  /** Appends this renderable only when the last cull passed. */
  @meta.blue.method
  @meta.implemented
  GetRenderables(renderables, _impostors = null)
  {
    if (this.isVisible)
    {
      renderables.push(this);
    }
    return renderables;
  }

  /** Copies Carbon's local-space bound. */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphere(out = vec4.create(), _query = 0)
  {
    vec4.copy(out, this.boundingSphere);
    return true;
  }

  /**
   * Carbon EveCurveLineSet::GetPerObjectData (cpp:106-125): the same standard
   * pair as EveLineSet, each with a transposed WorldMat.
   */
  @meta.blue.method
  @meta.implemented
  GetPerObjectData(accumulator)
  {
    const data = Tr2PerObjectDataStandard.alloc(accumulator, "EvePerObjectVSData", "EvePerObjectPSData");

    data.vs.SetAndTranspose("WorldMat", this.worldTransform);
    data.ps.SetAndTranspose("WorldMat", this.worldTransform);

    return data;
  }

  /** Carbon always reports the high LOD for this UI renderable. */
  @meta.blue.method
  @meta.implemented
  GetLODLevel()
  {
    return Tr2Lod.TR2_LOD_HIGH;
  }

  /** Carbon provides no model-center update for this object. */
  @meta.blue.method
  @meta.implemented
  UpdateModelCenterWorldPosition(_position, _time)
  {
  }

  /** Carbon provides no model-center result for this object. */
  @meta.blue.method
  @meta.implemented
  GetModelCenterWorldPosition(_position)
  {
  }

  /** Carbon provides no local box for this object. */
  @meta.blue.method
  @meta.implemented
  GetLocalBoundingBox(_minBounds, _maxBounds)
  {
    return false;
  }

  /** Carbon's IEveTransform implementation deliberately returns identity. */
  @meta.blue.method
  @meta.implemented
  GetLocalToWorldTransform(out = mat4.create())
  {
    return mat4.identity(out);
  }

  static Tr2Lod = Tr2Lod;

}
