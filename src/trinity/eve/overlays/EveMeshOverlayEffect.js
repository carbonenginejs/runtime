// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveMeshOverlayEffect.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveMeshOverlayEffect.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveMeshOverlayEffect_Blue.cpp
import { CjsModel } from "#model";
import { TriBatchType } from "#consts/graphics";
import { carbon, impl, io, type } from "#schema";
import {
  BELIST_EVENTMASK,
  BELIST_INSERTED,
  BELIST_LOADING,
  BELIST_REMOVED,
  BELIST_UNLOADSTART
} from "../../controllers/contracts.js";


/**
 * Named overlay pass attached to a mesh, holding one effect list per batch type
 * together with the curve set and controllers that animate them.
 */
@type.define({ className: "EveMeshOverlayEffect", family: "eve/overlays" })
export class EveMeshOverlayEffect extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.list("ITr2Controller")
  controllers = [];

  @io.persist
  @type.model("TriCurveSet")
  curveSet = null;

  @io.persist
  @type.list("Tr2Effect")
  additiveEffects = [];

  @io.persist
  @type.list("Tr2Effect")
  decalEffects = [];

  @io.persist
  @type.list("Tr2Effect")
  distortionEffects = [];

  @io.persist
  @type.list("Tr2Effect")
  opaqueEffects = [];

  @io.persist
  @type.list("Tr2Effect")
  transparentEffects = [];

  @io.readwrite
  @type.boolean
  update = true;

  @io.readwrite
  @type.boolean
  display = true;

  /**
   * Returns the effect list for a batch type, or null when the overlay is hidden
   * or the batch type has no list of its own.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reports success through a bool out-parameter; JavaScript returns null for unsupported or hidden batches.")
  GetEffects(batchType)
  {
    if (!this.display) return null;

    switch (batchType)
    {
      case TriBatchType.TRIBATCHTYPE_OPAQUE: return this.opaqueEffects;
      case TriBatchType.TRIBATCHTYPE_DECAL: return this.decalEffects;
      case TriBatchType.TRIBATCHTYPE_TRANSPARENT: return this.transparentEffects;
      case TriBatchType.TRIBATCHTYPE_ADDITIVE: return this.additiveEffects;
      case TriBatchType.TRIBATCHTYPE_DISTORTION: return this.distortionEffects;
      default: return null;
    }
  }

  /**
   * Reports whether the overlay applies to the opaque batch alone or to all
   * batches, given the batch type being queried.
   */
  @carbon.method
  @impl.implemented
  GetType(batchType)
  {
    return batchType === TriBatchType.TRIBATCHTYPE_OPAQUE
      ? EveMeshOverlayEffect.OverlayType.TYPE_OPAQUEONLY
      : EveMeshOverlayEffect.OverlayType.TYPE_ALL;
  }

  /**
   * Reports whether the overlay contributes any transparent effects, which
   * decides whether it needs a transparent pass.
   */
  @carbon.method
  @impl.implemented
  HasTransparentArea()
  {
    return this.transparentEffects.length > 0;
  }

  /** Sets a shader option on every effect across all five batch lists. */
  @carbon.method
  @impl.implemented
  SetShaderOption(name, value)
  {
    for (const effects of this.#effectLists())
    {
      for (const effect of effects) effect?.SetOption?.(name, value);
    }
  }

  /**
   * Links each controller that is not already linked to this overlay so it can
   * resolve the overlay's variables; always succeeds.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Blue root locking is represented by the hydrated JavaScript object identity.")
  Initialize()
  {
    for (const controller of this.controllers)
    {
      if (!controller?.IsLinked()) controller?.Link(this);
    }
    return true;
  }

  /**
   * Applies a Blue list notification for the controller list: links inserted
   * controllers, unlinks removed ones and unlinks all of them on unload start;
   * loading events and notifications for any other list are ignored.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Plain JavaScript arrays do not raise Blue IList notifications; callers forward the equivalent event explicitly.")
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = this.controllers)
  {
    if (list !== this.controllers || (event & BELIST_LOADING) !== 0) return;

    switch (event & BELIST_EVENTMASK)
    {
      case BELIST_INSERTED:
        value?.Link?.(this);
        break;
      case BELIST_REMOVED:
        value?.Unlink?.();
        break;
      case BELIST_UNLOADSTART:
        for (const controller of this.controllers) controller?.Unlink();
        break;
    }
  }

  /** Forwards a named variable value to every controller. */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    for (const controller of this.controllers) controller?.SetVariable(name, value);
  }

  /** Forwards a named event to every controller. */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    for (const controller of this.controllers) controller?.HandleEvent(name);
  }

  /** Starts every controller attached to the overlay. */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    for (const controller of this.controllers) controller?.Start();
  }

  /**
   * Plays the overlay's curve set when its name matches: a named time range
   * plays that range, otherwise the range is reset and the set plays from the
   * start; a name that does not match is ignored.
   */
  @carbon.method
  @impl.implemented
  PlayCurveSet(name, rangeName = "")
  {
    const curveSet = this.#matchingCurveSet(name);
    if (!curveSet) return;
    if (rangeName) curveSet.PlayTimeRange?.(rangeName);
    else
    {
      curveSet.ResetTimeRange();
      curveSet.Play();
    }
  }

  /**
   * Stops the overlay's curve set when its name matches, and does nothing
   * otherwise.
   */
  @carbon.method
  @impl.implemented
  StopCurveSet(name)
  {
    this.#matchingCurveSet(name)?.Stop?.();
  }

  /**
   * Returns the longest curve duration in the named curve set, or 0 when the
   * name does not match the overlay's set.
   */
  @carbon.method
  @impl.implemented
  GetCurveSetDuration(name)
  {
    return Math.max(0, Number(this.#matchingCurveSet(name)?.GetMaxCurveDuration?.() ?? 0));
  }

  /**
   * Returns the duration of a named time range within the named curve set, or 0
   * when either name does not match.
   */
  @carbon.method
  @impl.implemented
  GetRangeDuration(name, rangeName)
  {
    return Math.max(0, Number(this.#matchingCurveSet(name)?.GetRangeDuration?.(rangeName) ?? 0));
  }

  /**
   * Advances the curve set with the supplied real and simulation times and steps
   * every controller, matching Carbon's fixed 0.5 controller step; skipped
   * entirely when updates are disabled or no curve set is assigned.
   */
  @carbon.method
  @impl.implemented
  Update(realTime, simTime, renderContext = null)
  {
    if (!this.update || !this.curveSet) return;
    this.curveSet.Update(realTime, simTime, renderContext);
    for (const controller of this.controllers) controller?.Update(0.5);
  }

  /**
   * Returns the five per-batch effect lists so callers can apply an operation to
   * every effect the overlay owns.
   */
  #effectLists()
  {
    return [
      this.opaqueEffects,
      this.decalEffects,
      this.transparentEffects,
      this.additiveEffects,
      this.distortionEffects
    ];
  }

  /**
   * Returns the owned curve set when its name matches the requested one,
   * otherwise null.
   */
  #matchingCurveSet(name)
  {
    const curveSet = this.curveSet;
    return curveSet?.GetName() === name ? curveSet : null;
  }

  static OverlayType = Object.freeze({
    TYPE_OPAQUEONLY: 0,
    TYPE_ALL: 1,
    TYPE_COUNT: 2
  });
}
