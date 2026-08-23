// Source: trinity/trinity/Eve/UI/EveCurveLineSet.h
// Source: trinity/trinity/Eve/UI/EveCurveLineSet.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { carbon, impl, type } from "#schema";
import { Tr2CurveLineSet } from "../../../core/line/Tr2CurveLineSet.js";
import { Tr2Effect } from "../../../shader/Tr2Effect.js";
import { Tr2Lod } from "../../EveLODHelper.js";


const LOCAL_TRANSFORM = mat4.create();
const WORLD_SPHERE = vec4.create();


/** An Eve-owned, transformed and visibility-culled Carbon curve-line set. */
@type.define({ className: "EveCurveLineSet", family: "eve/ui" })
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
  @type.boolean
  isVisible = false;

  /** Carbon performs no synchronous work for this leaf. */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(_updateContext)
  {
  }

  /** Carbon performs no asynchronous work for this leaf. */
  @carbon.method
  @impl.implemented
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Carbon's IEveTransform update is intentionally empty. */
  @carbon.method
  @impl.implemented
  Update(_updateContext)
  {
  }

  /** Composes local SRT with the parent and culls the transformed local sphere. */
  @carbon.method
  @carbon.contextual(["camera"])
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  GetRenderables(renderables, _impostors = null)
  {
    if (this.isVisible)
    {
      renderables.push(this);
    }
    return renderables;
  }

  /** Copies Carbon's local-space bound. */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(out = vec4.create(), _query = 0)
  {
    vec4.copy(out, this.boundingSphere);
    return true;
  }

  /** Allocates and packs the line set's standard VS and PS object records. */
  @carbon.method
  @impl.implemented
  GetPerObjectData(accumulator)
  {
    const vs = accumulator.Alloc("EvePerObjectVSData");
    const ps = accumulator.Alloc("EvePerObjectPSData");
    vs.SetAndTranspose("WorldMat", this.worldTransform);
    ps.SetAndTranspose("WorldMat", this.worldTransform);
    return { vs, ps };
  }

  /** Carbon always reports the high LOD for this UI renderable. */
  @carbon.method
  @impl.implemented
  GetLODLevel()
  {
    return Tr2Lod.TR2_LOD_HIGH;
  }

  /** Carbon provides no model-center update for this object. */
  @carbon.method
  @impl.implemented
  UpdateModelCenterWorldPosition(_position, _time)
  {
  }

  /** Carbon provides no model-center result for this object. */
  @carbon.method
  @impl.implemented
  GetModelCenterWorldPosition(_position)
  {
  }

  /** Carbon provides no local box for this object. */
  @carbon.method
  @impl.implemented
  GetLocalBoundingBox(_minBounds, _maxBounds)
  {
    return false;
  }

  /** Carbon's IEveTransform implementation deliberately returns identity. */
  @carbon.method
  @impl.implemented
  GetLocalToWorldTransform(out = mat4.create())
  {
    return mat4.identity(out);
  }

  static Tr2Lod = Tr2Lod;

}
