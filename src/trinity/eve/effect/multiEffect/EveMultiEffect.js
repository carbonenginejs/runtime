// Source: trinity/trinity/Eve/EveMultiEffect.h
// Source: trinity/trinity/Eve/EveMultiEffect.cpp
// Source: trinity/trinity/Eve/EveMultiEffect_Blue.cpp
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import {
  BELIST_EVENTMASK,
  BELIST_INSERTED,
  BELIST_LOADING,
  BELIST_REMOVED,
  BELIST_UNLOADSTART
} from "../../../controllers/contracts.js";

/**
 * A named bundle of curve sets, controllers and dynamic bindings that animates
 * other space objects through typed parameter slots, without owning any geometry
 * itself.
 */
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

  /**
   * Builds the prototype-free name map that dynamic bindings resolve against:
   * each parameter slot's bound object and each curve set's root under their own
   * names, plus Owner for the effect itself.
   */
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
      binding?.Link();
      binding?.Update(0);
    }
    if (!onlyUpdateBindings)
    {
      for (const controller of this.controllers) controller?.Link(this);
    }
  }

  /**
   * Post-hydration hook; takes ownership of the parameter slots and dynamic
   * bindings, then links the bindings and controllers.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Assigns portable owner references before linking because JavaScript arrays do not provide Carbon IList parent locks.")
  Initialize()
  {
    for (const parameter of this.parameters) parameter?.SetOwner?.(this);
    for (const binding of this.bindings) binding?.SetOwner(this);
    this.Rebind();
    return true;
  }

  /**
   * Applies Carbon's IList ownership callbacks for the parameters, bindings and
   * controllers lists - assigning or clearing owners, linking or unlinking
   * controllers, unlinking all of them on unload - and rebinds afterwards.
   */
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
        for (const controller of this.controllers) controller?.Unlink();
      }
    }
    this.Rebind();
  }

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    for (const controller of this.controllers) controller?.HandleEvent(name);
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    for (const controller of this.controllers) controller?.SetVariable(name, value);
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
    for (const controller of this.controllers) controller?.Start();
  }

  /** First parameter slot with the given name, or null. */
  @carbon.method
  @impl.implemented
  GetParameterByName(parameterName)
  {
    const name = String(parameterName);
    return this.parameters.find(parameter => EveMultiEffect.#GetName(parameter) === name) ?? null;
  }

  /**
   * Fills out with Owner followed by each parameter slot's bound object, so a slot named Owner overrides the effect itself.
   * @param {Object|Map} [out] - caller-owned map, mutated in place
   * @returns {Object|Map} out
   */
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

  /**
   * Plays every curve set with the given name, over a named time range when one
   * is given, otherwise from the start with the range reset.
   */
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
        curveSet?.ResetTimeRange();
        curveSet?.Play();
      }
    }
  }

  /** Stops every curve set with the given name. */
  @carbon.method
  @impl.implemented
  StopCurveSet(name)
  {
    for (const curveSet of this.curveSets)
    {
      if (EveMultiEffect.#GetName(curveSet) === name) curveSet?.Stop();
    }
  }

  /**
   * Advances every curve set with the given name to an explicit time, bypassing
   * the effect's own update pass.
   */
  @carbon.method
  @impl.implemented
  UpdateCurveSet(name, time, renderContext = null)
  {
    for (const curveSet of this.curveSets)
    {
      if (EveMultiEffect.#GetName(curveSet) === name) curveSet.Update(time, time, renderContext);
    }
  }

  /**
   * Longest duration among the curve sets with the given name, or 0 when there
   * is no such set.
   */
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

  /**
   * Longest duration of a named time range among the curve sets with the given
   * name, or 0 when there is no such range.
   */
  @carbon.method
  @impl.implemented
  GetRangeDuration(name, rangeName)
  {
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      if (EveMultiEffect.#GetName(curveSet) === name)
      {
        duration = Math.max(duration, Number(curveSet?.GetRangeDuration(rangeName) ?? 0));
      }
    }
    return duration;
  }

  /**
   * Advances the curve sets, controllers and bindings for the frame; the effect
   * has no geometry, so this is its only update phase.
   */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext)
  {
    const time = Number(updateContext?.GetTime?.() ?? updateContext?.currentTime ?? updateContext?.time ?? 0);
    for (const curveSet of this.curveSets) curveSet.Update(time, time, updateContext.renderContext);
    for (const controller of this.controllers) controller?.Update(0.5);
    for (const binding of this.bindings) binding?.Update(time);
  }

  /**
   * IEveSpaceObject2 asynchronous phase; the effect does all of its work
   * synchronously.
   */
  @carbon.method
  @impl.noop
  UpdateAsyncronous(_updateContext)
  {
  }

  /** IEveSpaceObject2 hook; the effect has nothing of its own to cull. */
  @carbon.method
  @impl.noop
  UpdateVisibility(_updateContext, _parentTransform)
  {
  }

  /**
   * IEveSpaceObject2 hook; the effect contributes no renderables - it animates
   * objects that are collected by their own owners.
   */
  @carbon.method
  @impl.noop
  GetRenderables(_renderables, _impostors)
  {
  }

  /** The effect has no spatial extent, so it never reports a bounding sphere. */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(_sphere, _query = 0)
  {
    return false;
  }

  /**
   * IEveSpaceObject2 hook; the effect contributes no per-object values of its
   * own.
   */
  @carbon.method
  @impl.noop
  GetPerObjectStructs(_vsData, _psData)
  {
  }

  /**
   * IEveSpaceObject2 hook with nothing to advance: a multi-effect has no model
   * centre, so the call is a no-op.
   */
  @carbon.method
  @impl.noop
  UpdateModelCenterWorldPosition(_position, _time)
  {
  }

  /**
   * IEveSpaceObject2 hook that leaves the caller position untouched, since a
   * multi-effect has no model centre to report.
   */
  @carbon.method
  @impl.noop
  GetModelCenterWorldPosition(_position)
  {
  }

  /** The effect has no local geometry, so it never reports a bounding box. */
  @carbon.method
  @impl.implemented
  GetLocalBoundingBox(_min, _max)
  {
    return false;
  }

  /**
   * IEveSpaceObject2 hook; the effect has no placement of its own, so the
   * caller's matrix is left as it was.
   */
  @carbon.method
  @impl.noop
  GetLocalToWorldTransform(_transform)
  {
  }

  /**
   * IEveSpaceObject2 hook with nothing to register, since a multi-effect owns no
   * quads.
   */
  @carbon.method
  @impl.noop
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /**
   * IEveSpaceObject2 hook with nothing to submit: a multi-effect contributes no
   * quads for the frustum.
   */
  @carbon.method
  @impl.noop
  AddQuadsToQuadRenderer(_frustum, _quadRenderer)
  {
  }

  /**
   * Name of a parameter slot or curve set as a string, from GetName() or a name
   * field, empty when it has neither.
   */
  static #GetName(value)
  {
    return String(value?.GetName?.() ?? value?.name ?? "");
  }

  /**
   * Writes a name and value into a binding-root container that may be either a
   * Map or a plain object.
   */
  static #SetMapValue(out, name, value)
  {
    if (out instanceof Map) out.set(name, value);
    else out[name] = value;
  }

}
