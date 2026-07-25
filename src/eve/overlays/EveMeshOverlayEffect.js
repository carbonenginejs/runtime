// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveMeshOverlayEffect.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveMeshOverlayEffect.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveMeshOverlayEffect_Blue.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { TriBatchType } from "@carbonenginejs/runtime-utils/graphics";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import {
  BELIST_EVENTMASK,
  BELIST_INSERTED,
  BELIST_LOADING,
  BELIST_REMOVED,
  BELIST_UNLOADSTART
} from "../../controllers/contracts.js";


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

  @carbon.method
  @impl.implemented
  GetType(batchType)
  {
    return batchType === TriBatchType.TRIBATCHTYPE_OPAQUE
      ? EveMeshOverlayEffect.OverlayType.TYPE_OPAQUEONLY
      : EveMeshOverlayEffect.OverlayType.TYPE_ALL;
  }

  @carbon.method
  @impl.implemented
  HasTransparentArea()
  {
    return this.transparentEffects.length > 0;
  }

  @carbon.method
  @impl.implemented
  SetShaderOption(name, value)
  {
    for (const effects of this.#effectLists())
    {
      for (const effect of effects) effect?.SetOption?.(name, value);
    }
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Blue root locking is represented by the hydrated JavaScript object identity.")
  Initialize()
  {
    for (const controller of this.controllers)
    {
      if (!controller?.IsLinked?.()) controller?.Link?.(this);
    }
    return true;
  }

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
        for (const controller of this.controllers) controller?.Unlink?.();
        break;
    }
  }

  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    for (const controller of this.controllers) controller?.SetVariable?.(name, value);
  }

  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    for (const controller of this.controllers) controller?.HandleEvent?.(name);
  }

  @carbon.method
  @impl.implemented
  StartControllers()
  {
    for (const controller of this.controllers) controller?.Start?.();
  }

  @carbon.method
  @impl.implemented
  PlayCurveSet(name, rangeName = "")
  {
    const curveSet = this.#matchingCurveSet(name);
    if (!curveSet) return;
    if (rangeName) curveSet.PlayTimeRange?.(rangeName);
    else
    {
      curveSet.ResetTimeRange?.();
      curveSet.Play?.();
    }
  }

  @carbon.method
  @impl.implemented
  StopCurveSet(name)
  {
    this.#matchingCurveSet(name)?.Stop?.();
  }

  @carbon.method
  @impl.implemented
  GetCurveSetDuration(name)
  {
    return Math.max(0, Number(this.#matchingCurveSet(name)?.GetMaxCurveDuration?.() ?? 0));
  }

  @carbon.method
  @impl.implemented
  GetRangeDuration(name, rangeName)
  {
    return Math.max(0, Number(this.#matchingCurveSet(name)?.GetRangeDuration?.(rangeName) ?? 0));
  }

  @carbon.method
  @impl.implemented
  Update(realTime, simTime)
  {
    if (!this.update || !this.curveSet) return;
    this.curveSet.Update?.(realTime, simTime);
    for (const controller of this.controllers) controller?.Update?.(0.5);
  }

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

  #matchingCurveSet(name)
  {
    const curveSet = this.curveSet;
    return curveSet?.GetName?.() === name ? curveSet : null;
  }

  static OverlayType = Object.freeze({
    TYPE_OPAQUEONLY: 0,
    TYPE_ALL: 1,
    TYPE_COUNT: 2
  });
}
