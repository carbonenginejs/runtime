import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2CurveLineSet as _Tr2CurveLineSet } from '../../../core/line/Tr2CurveLineSet.js';
import { Tr2Effect as _Tr2Effect } from '../../../shader/Tr2Effect.js';
import { Tr2Lod } from '@carbonenginejs/runtime-utils/const/trinity';

let _initProto, _initClass, _init_isVisible, _init_extra_isVisible;
const LOCAL_TRANSFORM = mat4.create();
const WORLD_SPHERE = vec4.create();

/** An Eve-owned, transformed and visibility-culled Carbon curve-line set. */
let _EveCurveLineSet;
new class extends _identity {
  static [class EveCurveLineSet extends _Tr2CurveLineSet {
    static {
      ({
        e: [_init_isVisible, _init_extra_isVisible, _initProto],
        c: [_EveCurveLineSet, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveCurveLineSet",
        family: "eve/ui"
      })], [[[type, type.boolean], 16, "isVisible"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPerObjectData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLODLevel"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateModelCenterWorldPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetModelCenterWorldPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocalBoundingBox"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocalToWorldTransform"]], 0, void 0, _Tr2CurveLineSet));
    }
    /** Creates the default line and picking effects. */
    constructor() {
      super(), _init_extra_isVisible(this);
      this.lineEffect = new _Tr2Effect();
      this.lineEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Space/SpecialFX/Lines3D.fx");
      this.pickEffect = new _Tr2Effect();
      this.pickEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Space/SpecialFX/Lines3DPicking.fx");
    }

    /** Carbon's last visibility result. */
    isVisible = (_initProto(this), _init_isVisible(this, false));

    /** Carbon performs no synchronous work for this leaf. */
    UpdateSyncronous(_updateContext) {}

    /** Carbon performs no asynchronous work for this leaf. */
    UpdateAsyncronous(_updateContext) {}

    /** Carbon's IEveTransform update is intentionally empty. */
    Update(_updateContext) {}

    /** Composes local SRT with the parent and culls the transformed local sphere. */
    UpdateVisibility(updateContext, parentTransform) {
      this.isVisible = false;
      if (!this.display) {
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
    GetRenderables(renderables, _impostors = null) {
      if (this.isVisible) {
        renderables.push(this);
      }
      return renderables;
    }

    /** Copies Carbon's local-space bound. */
    GetBoundingSphere(out = vec4.create(), _query = 0) {
      vec4.copy(out, this.boundingSphere);
      return true;
    }

    /** Allocates and packs the line set's standard VS and PS object records. */
    GetPerObjectData(accumulator) {
      const vs = accumulator.Alloc("EvePerObjectVSData");
      const ps = accumulator.Alloc("EvePerObjectPSData");
      vs.SetAndTranspose("WorldMat", this.worldTransform);
      ps.SetAndTranspose("WorldMat", this.worldTransform);
      return {
        vs,
        ps
      };
    }

    /** Carbon always reports the high LOD for this UI renderable. */
    GetLODLevel() {
      return Tr2Lod.TR2_LOD_HIGH;
    }

    /** Carbon provides no model-center update for this object. */
    UpdateModelCenterWorldPosition(_position, _time) {}

    /** Carbon provides no model-center result for this object. */
    GetModelCenterWorldPosition(_position) {}

    /** Carbon provides no local box for this object. */
    GetLocalBoundingBox(_minBounds, _maxBounds) {
      return false;
    }

    /** Carbon's IEveTransform implementation deliberately returns identity. */
    GetLocalToWorldTransform(out = mat4.create()) {
      return mat4.identity(out);
    }
  }];
  Tr2Lod = Tr2Lod;
  constructor() {
    super(_EveCurveLineSet), _initClass();
  }
}();

export { _EveCurveLineSet as EveCurveLineSet };
//# sourceMappingURL=EveCurveLineSet.js.map
