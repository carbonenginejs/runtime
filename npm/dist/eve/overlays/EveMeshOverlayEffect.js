import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { TriBatchType } from '@carbonenginejs/runtime-utils/graphics';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { BELIST_LOADING, BELIST_EVENTMASK, BELIST_UNLOADSTART, BELIST_REMOVED, BELIST_INSERTED } from '../../controllers/contracts.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_controllers, _init_extra_controllers, _init_curveSet, _init_extra_curveSet, _init_additiveEffects, _init_extra_additiveEffects, _init_decalEffects, _init_extra_decalEffects, _init_distortionEffects, _init_extra_distortionEffects, _init_opaqueEffects, _init_extra_opaqueEffects, _init_transparentEffects, _init_extra_transparentEffects, _init_update, _init_extra_update, _init_display, _init_extra_display;
let _EveMeshOverlayEffect;
new class extends _identity {
  static [class EveMeshOverlayEffect extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_controllers, _init_extra_controllers, _init_curveSet, _init_extra_curveSet, _init_additiveEffects, _init_extra_additiveEffects, _init_decalEffects, _init_extra_decalEffects, _init_distortionEffects, _init_extra_distortionEffects, _init_opaqueEffects, _init_extra_opaqueEffects, _init_transparentEffects, _init_extra_transparentEffects, _init_update, _init_extra_update, _init_display, _init_extra_display, _initProto],
        c: [_EveMeshOverlayEffect, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveMeshOverlayEffect",
        family: "eve/overlays"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.list("ITr2Controller")], 16, "controllers"], [[io, io.persist, void 0, type.model("TriCurveSet")], 16, "curveSet"], [[io, io.persist, void 0, type.list("Tr2Effect")], 16, "additiveEffects"], [[io, io.persist, void 0, type.list("Tr2Effect")], 16, "decalEffects"], [[io, io.persist, void 0, type.list("Tr2Effect")], 16, "distortionEffects"], [[io, io.persist, void 0, type.list("Tr2Effect")], 16, "opaqueEffects"], [[io, io.persist, void 0, type.list("Tr2Effect")], 16, "transparentEffects"], [[io, io.readwrite, type, type.boolean], 16, "update"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reports success through a bool out-parameter; JavaScript returns null for unsupported or hidden batches.")], 18, "GetEffects"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetType"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTransparentArea"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Blue root locking is represented by the hydrated JavaScript object identity.")], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Plain JavaScript arrays do not raise Blue IList notifications; callers forward the equivalent event explicitly.")], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "HandleControllerEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartControllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "PlayCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurveSetDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRangeDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_display(this);
    }
    name = (_initProto(this), _init_name(this, ""));
    controllers = (_init_extra_name(this), _init_controllers(this, []));
    curveSet = (_init_extra_controllers(this), _init_curveSet(this, null));
    additiveEffects = (_init_extra_curveSet(this), _init_additiveEffects(this, []));
    decalEffects = (_init_extra_additiveEffects(this), _init_decalEffects(this, []));
    distortionEffects = (_init_extra_decalEffects(this), _init_distortionEffects(this, []));
    opaqueEffects = (_init_extra_distortionEffects(this), _init_opaqueEffects(this, []));
    transparentEffects = (_init_extra_opaqueEffects(this), _init_transparentEffects(this, []));
    update = (_init_extra_transparentEffects(this), _init_update(this, true));
    display = (_init_extra_update(this), _init_display(this, true));
    GetEffects(batchType) {
      if (!this.display) return null;
      switch (batchType) {
        case TriBatchType.TRIBATCHTYPE_OPAQUE:
          return this.opaqueEffects;
        case TriBatchType.TRIBATCHTYPE_DECAL:
          return this.decalEffects;
        case TriBatchType.TRIBATCHTYPE_TRANSPARENT:
          return this.transparentEffects;
        case TriBatchType.TRIBATCHTYPE_ADDITIVE:
          return this.additiveEffects;
        case TriBatchType.TRIBATCHTYPE_DISTORTION:
          return this.distortionEffects;
        default:
          return null;
      }
    }
    GetType(batchType) {
      return batchType === TriBatchType.TRIBATCHTYPE_OPAQUE ? _EveMeshOverlayEffect.OverlayType.TYPE_OPAQUEONLY : _EveMeshOverlayEffect.OverlayType.TYPE_ALL;
    }
    HasTransparentArea() {
      return this.transparentEffects.length > 0;
    }
    SetShaderOption(name, value) {
      for (const effects of this.#effectLists()) {
        for (const effect of effects) effect?.SetOption?.(name, value);
      }
    }
    Initialize() {
      for (const controller of this.controllers) {
        if (!controller?.IsLinked?.()) controller?.Link?.(this);
      }
      return true;
    }
    OnListModified(event, _key = 0, _key2 = 0, value = null, list = this.controllers) {
      if (list !== this.controllers || (event & BELIST_LOADING) !== 0) return;
      switch (event & BELIST_EVENTMASK) {
        case BELIST_INSERTED:
          value?.Link?.(this);
          break;
        case BELIST_REMOVED:
          value?.Unlink?.();
          break;
        case BELIST_UNLOADSTART:
          for (const controller of this.controllers) controller?.Unlink?.();
          break;
      }
    }
    SetControllerVariable(name, value) {
      for (const controller of this.controllers) controller?.SetVariable?.(name, value);
    }
    HandleControllerEvent(name) {
      for (const controller of this.controllers) controller?.HandleEvent?.(name);
    }
    StartControllers() {
      for (const controller of this.controllers) controller?.Start?.();
    }
    PlayCurveSet(name, rangeName = "") {
      const curveSet = this.#matchingCurveSet(name);
      if (!curveSet) return;
      if (rangeName) curveSet.PlayTimeRange?.(rangeName);else {
        curveSet.ResetTimeRange?.();
        curveSet.Play?.();
      }
    }
    StopCurveSet(name) {
      this.#matchingCurveSet(name)?.Stop?.();
    }
    GetCurveSetDuration(name) {
      return Math.max(0, Number(this.#matchingCurveSet(name)?.GetMaxCurveDuration?.() ?? 0));
    }
    GetRangeDuration(name, rangeName) {
      return Math.max(0, Number(this.#matchingCurveSet(name)?.GetRangeDuration?.(rangeName) ?? 0));
    }
    Update(realTime, simTime) {
      if (!this.update || !this.curveSet) return;
      this.curveSet.Update?.(realTime, simTime);
      for (const controller of this.controllers) controller?.Update?.(0.5);
    }
    #effectLists() {
      return [this.opaqueEffects, this.decalEffects, this.transparentEffects, this.additiveEffects, this.distortionEffects];
    }
    #matchingCurveSet(name) {
      const curveSet = this.curveSet;
      return curveSet?.GetName?.() === name ? curveSet : null;
    }
  }];
  OverlayType = Object.freeze({
    TYPE_OPAQUEONLY: 0,
    TYPE_ALL: 1,
    TYPE_COUNT: 2
  });
  constructor() {
    super(_EveMeshOverlayEffect), _initClass();
  }
}();

export { _EveMeshOverlayEffect as EveMeshOverlayEffect };
//# sourceMappingURL=EveMeshOverlayEffect.js.map
