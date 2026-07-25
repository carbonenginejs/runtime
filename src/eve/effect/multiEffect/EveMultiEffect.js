// Source: E:\carbonengine\trinity\trinity\Eve\EveMultiEffect.h
// Source: E:\carbonengine\trinity\trinity\Eve\EveMultiEffect.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\EveMultiEffect_Blue.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import {
  BELIST_EVENTMASK,
  BELIST_INSERTED,
  BELIST_LOADING,
  BELIST_REMOVED,
  BELIST_UNLOADSTART
} from "../../../controllers/contracts.js";

@type.define({ className: "EveMultiEffect", family: "eve/effect" })
export class EveMultiEffect extends CjsModel
{

  /** m_bindings (PTr2DynamicBindingVector) [READ, PERSIST] */
  @io.persist
  @type.list("Tr2DynamicBinding")
  bindings = [];

  /** m_controllers (PITr2ControllerVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2Controller")
  controllers = [];

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @io.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** m_externalParameters (PTr2ExternalParameterVector) [READ, PERSIST] */
  @io.persist
  @type.list("Tr2ExternalParameter")
  externalParameters = [];

  /** m_parameters (PEveMultiEffectParameterVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveMultiEffectParameter")
  parameters = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  @carbon.method
  @impl.adapted
  @impl.reason("Builds Carbon's unordered root map as a prototype-free JavaScript object.")
  GetParameterMap()
  {
    const out = Object.create(null);
    for (const parameter of this.parameters)
    {
      out[EveMultiEffect.#GetName(parameter)] = parameter?.GetParameterObject?.() ?? parameter?.object ?? null;
    }
    for (const curveSet of this.curveSets)
    {
      out[EveMultiEffect.#GetName(curveSet)] = curveSet?.GetRawRoot?.() ?? curveSet;
    }
    out.Owner = this;
    return out;
  }

  /** Carbon method Rebind (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.adapted
  @impl.reason("Links portable owner objects directly instead of using Carbon parent locks and raw roots.")
  Rebind(onlyUpdateBindings = false)
  {
    for (const binding of this.bindings)
    {
      binding?.Link?.();
      binding?.Update?.(0);
    }
    if (!onlyUpdateBindings)
    {
      for (const controller of this.controllers) controller?.Link?.(this);
    }
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Assigns portable owner references before linking because JavaScript arrays do not provide Carbon IList parent locks.")
  Initialize()
  {
    for (const parameter of this.parameters) parameter?.SetOwner?.(this);
    for (const binding of this.bindings) binding?.SetOwner?.(this);
    this.Rebind();
    return true;
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Reproduces Carbon IList ownership and controller callbacks through explicit portable list-event arguments.")
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    const maskedEvent = event & BELIST_EVENTMASK;
    if (list === this.parameters)
    {
      if (maskedEvent === BELIST_INSERTED) value?.SetOwner?.(this);
      else if (maskedEvent === BELIST_REMOVED) value?.SetOwner?.(null);
    }
    else if (list === this.bindings)
    {
      if (maskedEvent === BELIST_INSERTED) value?.SetOwner?.(this);
      else if (maskedEvent === BELIST_REMOVED) value?.SetOwner?.(null);
    }
    else if (list === this.controllers && (event & BELIST_LOADING) === 0)
    {
      if (maskedEvent === BELIST_INSERTED) value?.Link?.(this);
      else if (maskedEvent === BELIST_REMOVED) value?.Unlink?.();
      else if (maskedEvent === BELIST_UNLOADSTART)
      {
        for (const controller of this.controllers) controller?.Unlink?.();
      }
    }
    this.Rebind();
  }

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    for (const controller of this.controllers) controller?.HandleEvent?.(name);
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    for (const controller of this.controllers) controller?.SetVariable?.(name, value);
  }

  /** Carbon method SetParameter (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Accepts portable parameter objects and duck-typed setter methods in place of Carbon's Blue interface cast.")
  SetParameter(parameterName, object)
  {
    const name = String(parameterName);
    const parameter = this.parameters.find(item => (item?.GetName?.() ?? item?.name) === name);
    if (!parameter) return false;
    if (parameter.SetParameterObject) parameter.SetParameterObject(object);
    else parameter.object = object;
    this.Rebind();
    return true;
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    for (const controller of this.controllers) controller?.Start?.();
  }

  @carbon.method
  @impl.implemented
  GetParameterByName(parameterName)
  {
    const name = String(parameterName);
    return this.parameters.find(parameter => EveMultiEffect.#GetName(parameter) === name) ?? null;
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Mutates a JavaScript object or Map while preserving Carbon's base-Owner-then-parameter precedence.")
  GetBindingRoots(out = {})
  {
    EveMultiEffect.#SetMapValue(out, "Owner", this);
    for (const parameter of this.parameters)
    {
      EveMultiEffect.#SetMapValue(
        out,
        EveMultiEffect.#GetName(parameter),
        parameter?.GetParameterObject?.() ?? parameter?.object ?? null
      );
    }
    return out;
  }

  @carbon.method
  @impl.implemented
  PlayCurveSet(name, rangeName = "")
  {
    for (const curveSet of this.curveSets)
    {
      if (EveMultiEffect.#GetName(curveSet) !== name) continue;
      if (rangeName) curveSet?.PlayTimeRange?.(rangeName);
      else
      {
        curveSet?.ResetTimeRange?.();
        curveSet?.Play?.();
      }
    }
  }

  @carbon.method
  @impl.implemented
  StopCurveSet(name)
  {
    for (const curveSet of this.curveSets)
    {
      if (EveMultiEffect.#GetName(curveSet) === name) curveSet?.Stop?.();
    }
  }

  @carbon.method
  @impl.implemented
  UpdateCurveSet(name, time)
  {
    for (const curveSet of this.curveSets)
    {
      if (EveMultiEffect.#GetName(curveSet) === name) curveSet?.Update?.(time, time);
    }
  }

  @carbon.method
  @impl.implemented
  GetCurveSetDuration(name)
  {
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      if (EveMultiEffect.#GetName(curveSet) === name)
      {
        duration = Math.max(duration, Number(curveSet?.GetMaxCurveDuration?.() ?? 0));
      }
    }
    return duration;
  }

  @carbon.method
  @impl.implemented
  GetRangeDuration(name, rangeName)
  {
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      if (EveMultiEffect.#GetName(curveSet) === name)
      {
        duration = Math.max(duration, Number(curveSet?.GetRangeDuration?.(rangeName) ?? 0));
      }
    }
    return duration;
  }

  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext)
  {
    const time = Number(updateContext?.GetTime?.() ?? updateContext?.currentTime ?? updateContext?.time ?? 0);
    for (const curveSet of this.curveSets) curveSet?.Update?.(time, time);
    for (const controller of this.controllers) controller?.Update?.(0.5);
    for (const binding of this.bindings) binding?.Update?.(time);
  }

  @carbon.method
  @impl.noop
  UpdateAsyncronous(_updateContext)
  {
  }

  @carbon.method
  @impl.noop
  UpdateVisibility(_updateContext, _parentTransform)
  {
  }

  @carbon.method
  @impl.noop
  GetRenderables(_renderables, _impostors)
  {
  }

  @carbon.method
  @impl.implemented
  GetBoundingSphere(_sphere, _query = 0)
  {
    return false;
  }

  @carbon.method
  @impl.noop
  GetPerObjectStructs(_vsData, _psData)
  {
  }

  @carbon.method
  @impl.noop
  UpdateModelCenterWorldPosition(_position, _time)
  {
  }

  @carbon.method
  @impl.noop
  GetModelCenterWorldPosition(_position)
  {
  }

  @carbon.method
  @impl.implemented
  GetLocalBoundingBox(_min, _max)
  {
    return false;
  }

  @carbon.method
  @impl.noop
  GetLocalToWorldTransform(_transform)
  {
  }

  @carbon.method
  @impl.noop
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  @carbon.method
  @impl.noop
  AddQuadsToQuadRenderer(_frustum, _quadRenderer)
  {
  }

  static #GetName(value)
  {
    return String(value?.GetName?.() ?? value?.name ?? "");
  }

  static #SetMapValue(out, name, value)
  {
    if (out instanceof Map) out.set(name, value);
    else out[name] = value;
  }

}
