import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { TriBatchType } from '@carbonenginejs/runtime-utils/graphics';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { BELIST_LOADING, BELIST_EVENTMASK, BELIST_UNLOADSTART, BELIST_REMOVED, BELIST_INSERTED } from '../../controllers/contracts.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_controllers, _init_extra_controllers, _init_curveSet, _init_extra_curveSet, _init_additiveEffects, _init_extra_additiveEffects, _init_decalEffects, _init_extra_decalEffects, _init_distortionEffects, _init_extra_distortionEffects, _init_opaqueEffects, _init_extra_opaqueEffects, _init_transparentEffects, _init_extra_transparentEffects, _init_update, _init_extra_update, _init_display, _init_extra_display;

/**
 * Named overlay pass attached to a mesh, holding one effect list per batch type
 * together with the curve set and controllers that animate them.
 */
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

    /**
     * Returns the effect list for a batch type, or null when the overlay is hidden
     * or the batch type has no list of its own.
     */
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

    /**
     * Reports whether the overlay applies to the opaque batch alone or to all
     * batches, given the batch type being queried.
     */
    GetType(batchType) {
      return batchType === TriBatchType.TRIBATCHTYPE_OPAQUE ? _EveMeshOverlayEffect.OverlayType.TYPE_OPAQUEONLY : _EveMeshOverlayEffect.OverlayType.TYPE_ALL;
    }

    /**
     * Reports whether the overlay contributes any transparent effects, which
     * decides whether it needs a transparent pass.
     */
    HasTransparentArea() {
      return this.transparentEffects.length > 0;
    }

    /** Sets a shader option on every effect across all five batch lists. */
    SetShaderOption(name, value) {
      for (const effects of this.#effectLists()) {
        for (const effect of effects) effect?.SetOption?.(name, value);
      }
    }

    /**
     * Links each controller that is not already linked to this overlay so it can
     * resolve the overlay's variables; always succeeds.
     */
    Initialize() {
      for (const controller of this.controllers) {
        if (!controller?.IsLinked?.()) controller?.Link?.(this);
      }
      return true;
    }

    /**
     * Applies a Blue list notification for the controller list: links inserted
     * controllers, unlinks removed ones and unlinks all of them on unload start;
     * loading events and notifications for any other list are ignored.
     */
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

    /** Forwards a named variable value to every controller. */
    SetControllerVariable(name, value) {
      for (const controller of this.controllers) controller?.SetVariable?.(name, value);
    }

    /** Forwards a named event to every controller. */
    HandleControllerEvent(name) {
      for (const controller of this.controllers) controller?.HandleEvent?.(name);
    }

    /** Starts every controller attached to the overlay. */
    StartControllers() {
      for (const controller of this.controllers) controller?.Start?.();
    }

    /**
     * Plays the overlay's curve set when its name matches: a named time range
     * plays that range, otherwise the range is reset and the set plays from the
     * start; a name that does not match is ignored.
     */
    PlayCurveSet(name, rangeName = "") {
      const curveSet = this.#matchingCurveSet(name);
      if (!curveSet) return;
      if (rangeName) curveSet.PlayTimeRange?.(rangeName);else {
        curveSet.ResetTimeRange?.();
        curveSet.Play?.();
      }
    }

    /**
     * Stops the overlay's curve set when its name matches, and does nothing
     * otherwise.
     */
    StopCurveSet(name) {
      this.#matchingCurveSet(name)?.Stop?.();
    }

    /**
     * Returns the longest curve duration in the named curve set, or 0 when the
     * name does not match the overlay's set.
     */
    GetCurveSetDuration(name) {
      return Math.max(0, Number(this.#matchingCurveSet(name)?.GetMaxCurveDuration?.() ?? 0));
    }

    /**
     * Returns the duration of a named time range within the named curve set, or 0
     * when either name does not match.
     */
    GetRangeDuration(name, rangeName) {
      return Math.max(0, Number(this.#matchingCurveSet(name)?.GetRangeDuration?.(rangeName) ?? 0));
    }

    /**
     * Advances the curve set with the supplied real and simulation times and steps
     * every controller, matching Carbon's fixed 0.5 controller step; skipped
     * entirely when updates are disabled or no curve set is assigned.
     */
    Update(realTime, simTime) {
      if (!this.update || !this.curveSet) return;
      this.curveSet.Update?.(realTime, simTime);
      for (const controller of this.controllers) controller?.Update?.(0.5);
    }

    /**
     * Returns the five per-batch effect lists so callers can apply an operation to
     * every effect the overlay owns.
     */
    #effectLists() {
      return [this.opaqueEffects, this.decalEffects, this.transparentEffects, this.additiveEffects, this.distortionEffects];
    }

    /**
     * Returns the owned curve set when its name matches the requested one,
     * otherwise null.
     */
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
