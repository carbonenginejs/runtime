import { IRoot } from "../../../../blue/exposure/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/EveMultiEffect.h
// Source: trinity/trinity/Eve/EveMultiEffect.cpp
// Source: trinity/trinity/Eve/EveMultiEffect_Blue.cpp
import { IInitialize, IListNotify, BlueList } from "#blue";
import { ITr2DynamicBindingOwner } from "../../ITr2DynamicBindingOwner.js";
import { ITr2CurveSetOwner } from "../../../curves/ITr2CurveSetOwner.js";
import { CjsSchema, type } from "#schema";
import { EveMultiEffectParameter } from "./EveMultiEffectParameter.js";
import { Tr2DynamicBinding } from "../../../core/binding/Tr2DynamicBinding.js";
import { ITr2Controller } from "../../../controllers/ITr2Controller/ITr2Controller.js";
import { UnlinkReason } from "../../../controllers/enums.js";
import { ITr2ControllerOwner } from "../../../controllers/ITr2ControllerOwner.js";
import { IEveSpaceObject2 } from "../../IEveSpaceObject2.js";
import { BLUELISTEVENT } from "#consts/blue";
import { Tr2ExternalParameter } from "../../../core/binding/Tr2ExternalParameter.js";
import { TriCurveSet } from "../../../curves/TriCurveSet.js";

/**
 * A named bundle of curve sets, controllers and dynamic bindings that animates
 * other space objects through typed parameter slots, without owning any geometry
 * itself.
 */
@be.define({
  name: "EveMultiEffect",
  inherit: [ IListNotify, IInitialize, IEveSpaceObject2, ITr2DynamicBindingOwner, ITr2ControllerOwner, ITr2CurveSetOwner ],
  // EveMultiEffect_Blue.cpp:12-81, in Carbon's order.
  interfaces: [ IEveSpaceObject2, ITr2ControllerOwner, IInitialize, ITr2DynamicBindingOwner, ITr2CurveSetOwner ],
  members: [
    [ be.ATTR, "name", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "parameters", be.READ | be.PERSIST ],
    [ be.ATTR, "controllers", be.READ | be.PERSIST ],
    [ be.ATTR, "externalParameters", be.READ | be.PERSIST ],
    [ be.ATTR, "curveSets", be.READ | be.PERSIST ],
    [ be.ATTR, "bindings", be.READ | be.PERSIST ],
    [ be.METHOD, "SetParameter", be.WRAP ],
    [ be.METHOD, "SetControllerVariable", be.WRAP ],
    [ be.METHOD, "HandleControllerEvent", be.WRAP ],
    [ be.METHOD, "StartControllers", be.WRAP ],
    [ be.METHOD, "Rebind", be.WRAP_OPTIONAL_ARGS, 1 ]
  ]
})
export class EveMultiEffect extends IRoot
{

  /** m_bindings (PTr2DynamicBindingVector) [READ, PERSIST] */

  @type.list("Tr2DynamicBinding")
  bindings = new BlueList(Tr2DynamicBinding, { className: "Tr2DynamicBinding" });

  /** m_controllers (PITr2ControllerVector) [READ, PERSIST] */

  @type.list("ITr2Controller")
  controllers = new BlueList(ITr2Controller);

  /**
   * Unlinks controllers for deletion and detaches this owner's native back pointers.
   * Carbon: trinity/trinity/Eve/EveMultiEffect.cpp:23-29.
   * @adapted Detaches owned list observers as BlueList member destruction does (blueexposure/include/BlueListUtil.h:198-204), retaining content.
   * @adapted Detaches JS strong back references; native BlueList destruction suppresses removal callbacks.
   * Native removal behavior: EveMultiEffect.cpp:99,119; blueexposure/include/BlueListUtil.h:198-204.
   * @returns {void}
   */
  _Destructor()
  {
    for (const controller of this.controllers) controller.Unlink(UnlinkReason.DELETING);
    for (const parameter of this.parameters) parameter.SetOwner(null);
    for (const binding of this.bindings) binding.SetOwner(null);
    this.bindings.SetNotify(null);
    this.parameters.SetNotify(null);
    this.controllers.SetNotify(null);
  }

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */

  @type.list("TriCurveSet")
  curveSets = new BlueList(TriCurveSet, { className: "TriCurveSet" });

  /** m_externalParameters (PTr2ExternalParameterVector) [READ, PERSIST] */

  @type.list("Tr2ExternalParameter")
  externalParameters = new BlueList(Tr2ExternalParameter, { className: "Tr2ExternalParameter" });

  /** m_parameters (PEveMultiEffectParameterVector) [READ, PERSIST] */

  @type.list("EveMultiEffectParameter")
  parameters = new BlueList(EveMultiEffectParameter, { className: "EveMultiEffectParameter" });

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */

  @type.string
  name = "";

  /**
   * Carbon EveMultiEffect constructor (cpp:18-20).
   *
   * @implemented
   */
  constructor()
  {
    super();
    this.bindings.SetNotify(this);
    this.parameters.SetNotify(this);
    this.controllers.SetNotify(this);
  }

  /**
   * Builds the prototype-free name map that dynamic bindings resolve against:
   * each parameter slot's bound object and each curve set's root under their own
   * names, plus Owner for the effect itself (EveMultiEffect.cpp:31-47).
   *
   * @adapted Carbon's unordered_map is a prototype-free object, and a curve set is its own raw root.
   */

  GetParameterMap()
  {
    const out = Object.create(null);
    for (const parameter of this.parameters)
    {
      out[parameter.GetName()] = parameter.GetParameterObject();
    }
    for (const curveSet of this.curveSets)
    {
      out[curveSet.GetName()] = curveSet;
    }
    out.Owner = this;
    return out;
  }

  /**
   * Carbon method Rebind (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS; EveMultiEffect.cpp:49-67): links and primes every
   * binding, then links the controllers to this effect unless only the bindings were asked for.
   *
   * @implemented
   */
  Rebind(onlyUpdateBindings = false)
  {
    for (const binding of this.bindings)
    {
      binding.Link();
      binding.Update(0);
    }
    if (!onlyUpdateBindings)
    {
      for (const controller of this.controllers) controller.Link(this);
    }
  }

  /**
   * Carbon Initialize (EveMultiEffect.cpp:69-82): takes ownership of the parameter slots and dynamic bindings, then
   * links the bindings and controllers.
   *
   * @implemented
   */

  Initialize()
  {
    for (const parameter of this.parameters) parameter.SetOwner(this);
    for (const binding of this.bindings) binding.SetOwner(this);
    this.Rebind();
    return true;
  }

  /**
   * Carbon OnListModified (EveMultiEffect.cpp:84-154): the IList ownership callbacks for the parameters, bindings and
   * controllers lists - assigning or clearing owners, linking or unlinking controllers, unlinking all of them on
   * unload - then a rebind. Each value is cast to its list's type, as Carbon's BlueCastPtr does.
   *
   * @implemented
   */

  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    const maskedEvent = event & BLUELISTEVENT.BELIST_EVENTMASK;
    if (list === this.parameters)
    {
      const parameter = CjsSchema.cast(value, EveMultiEffectParameter);
      if (parameter && maskedEvent === BLUELISTEVENT.BELIST_INSERTED) parameter.SetOwner(this);
      else if (parameter && maskedEvent === BLUELISTEVENT.BELIST_REMOVED) parameter.SetOwner(null);
    }
    else if (list === this.bindings)
    {
      const binding = CjsSchema.cast(value, Tr2DynamicBinding);
      if (binding && maskedEvent === BLUELISTEVENT.BELIST_INSERTED) binding.SetOwner(this);
      else if (binding && maskedEvent === BLUELISTEVENT.BELIST_REMOVED) binding.SetOwner(null);
    }
    else if (list === this.controllers && (event & BLUELISTEVENT.BELIST_LOADING) === 0)
    {
      const controller = CjsSchema.cast(value, ITr2Controller);
      if (controller && maskedEvent === BLUELISTEVENT.BELIST_INSERTED) controller.Link(this);
      else if (controller && maskedEvent === BLUELISTEVENT.BELIST_REMOVED) controller.Unlink();
      else if (maskedEvent === BLUELISTEVENT.BELIST_UNLOADSTART)
      {
        for (const each of this.controllers) each.Unlink();
      }
    }
    this.Rebind();
  }

  /**
   * Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   */
  HandleControllerEvent(name)
  {
    for (const controller of this.controllers) controller.HandleEvent(name);
  }

  /**
   * Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   */
  SetControllerVariable(name, value)
  {
    for (const controller of this.controllers) controller.SetVariable(name, value);
  }

  /**
   * Carbon method SetParameter (MAP_METHOD_AND_WRAP; EveMultiEffect.cpp:156-169): binds the first slot of that name.
   *
   * @implemented
   */
  SetParameter(parameterName, object)
  {
    for (const parameter of this.parameters)
    {
      if (parameter.GetName() === parameterName)
      {
        parameter.SetParameterObject(object);
        this.Rebind();
        return true;
      }
    }
    return false;
  }

  /**
   * Carbon method StartControllers (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   */
  StartControllers()
  {
    for (const controller of this.controllers) controller.Start();
  }

  /**
   * First parameter slot with the given name, or null.
   *
   * @implemented
   */

  GetParameterByName(parameterName)
  {
    return this.parameters.find(parameter => parameter.GetName() === parameterName) ?? null;
  }

  /**
   * Fills out with Owner followed by each parameter slot's bound object, so a slot named Owner overrides the effect itself.
   *
   * @adapted Carbon's unordered_map is a JavaScript object or Map, filled Owner first so a slot named Owner wins.
   * @param {Object|Map} out - caller-owned map, mutated in place
   * @returns {Object|Map} out
   */

  GetBindingRoots(out)
  {
    EveMultiEffect._SetMapValue(out, "Owner", this);
    for (const parameter of this.parameters)
    {
      EveMultiEffect._SetMapValue(out, parameter.GetName(), parameter.GetParameterObject());
    }
    return out;
  }

  /**
   * Plays every curve set with the given name, over a named time range when one
   * is given, otherwise from the start with the range reset.
   *
   * @implemented
   */

  PlayCurveSet(name, rangeName = "")
  {
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() !== name) continue;
      if (rangeName) curveSet.PlayTimeRange(rangeName);
      else
      {
        curveSet.ResetTimeRange();
        curveSet.Play();
      }
    }
  }

  /**
   * Stops every curve set with the given name.
   *
   * @implemented
   */

  StopCurveSet(name)
  {
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() === name) curveSet.Stop();
    }
  }

  /**
   * Carbon EveMultiEffect::UpdateCurveSet (EveMultiEffect.cpp:253-262): advances
   * every curve set with the given name to an explicit time on both clocks,
   * bypassing the effect's own update pass.
   *
   * @implemented
   */

  UpdateCurveSet(name, time)
  {
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() === name) curveSet.Update__RealTimeSimTime(time, time);
    }
  }

  /**
   * Longest duration among the curve sets with the given name, or 0 when there
   * is no such set.
   *
   * @implemented
   */

  GetCurveSetDuration(name)
  {
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() === name)
      {
        duration = Math.max(duration, curveSet.GetMaxCurveDuration());
      }
    }
    return duration;
  }

  /**
   * Longest duration of a named time range among the curve sets with the given
   * name, or 0 when there is no such range.
   *
   * @implemented
   */

  GetRangeDuration(name, rangeName)
  {
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() === name)
      {
        duration = Math.max(duration, curveSet.GetRangeDuration(rangeName));
      }
    }
    return duration;
  }

  /**
   * Advances the curve sets, controllers and bindings for the frame; the effect
   * has no geometry, so this is its only update phase.
   *
   * @implemented
   */

  UpdateSyncronous(updateContext)
  {
    const time = updateContext.GetTime();
    for (const curveSet of this.curveSets) curveSet.Update__RealTimeSimTime(time, time);
    for (const controller of this.controllers) controller.Update(0.5);
    for (const binding of this.bindings) binding.Update(time);
  }

  /**
   * IEveSpaceObject2 asynchronous phase; the effect does all of its work
   * synchronously.
   *
   * @adapted
   */

  UpdateAsyncronous(_updateContext)
  {
  }

  /**
   * IEveSpaceObject2 hook; the effect has nothing of its own to cull.
   *
   * @adapted
   */

  UpdateVisibility(_updateContext, _parentTransform)
  {
  }

  /**
   * IEveSpaceObject2 hook; the effect contributes no renderables - it animates
   * objects that are collected by their own owners.
   *
   * @adapted
   */

  GetRenderables__Impostors(_renderables, _impostors)
  {
  }

  /**
   * The effect has no spatial extent, so it never reports a bounding sphere.
   *
   * @implemented
   */

  GetBoundingSphere(_sphere, _query = 0)
  {
    return false;
  }

  /**
   * IEveSpaceObject2 hook; the effect contributes no per-object values of its
   * own.
   *
   * @adapted
   */

  GetPerObjectStructs(_vsData, _psData)
  {
  }

  /**
   * IEveSpaceObject2 hook with nothing to advance: a multi-effect has no model
   * centre, so the call is a no-op.
   *
   * @adapted
   */

  UpdateModelCenterWorldPosition(_position, _time)
  {
  }

  /**
   * IEveSpaceObject2 hook that leaves the caller position untouched, since a
   * multi-effect has no model centre to report.
   *
   * @adapted
   */

  GetModelCenterWorldPosition(_position)
  {
  }

  /**
   * The effect has no local geometry, so it never reports a bounding box.
   *
   * @implemented
   */

  GetLocalBoundingBox(_min, _max)
  {
    return false;
  }

  /**
   * IEveSpaceObject2 hook; the effect has no placement of its own, so the
   * caller's matrix is left as it was.
   *
   * @adapted
   */

  GetLocalToWorldTransform(_transform)
  {
  }

  /**
   * IEveSpaceObject2 hook with nothing to register, since a multi-effect owns no
   * quads.
   *
   * @adapted
   */

  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /**
   * IEveSpaceObject2 hook with nothing to submit: a multi-effect contributes no
   * quads for the frustum.
   *
   * @adapted
   */

  AddQuadsToQuadRenderer(_frustum, _quadRenderer)
  {
  }

  /**
   * Writes a name and value into a binding-root container that may be either a
   * Map or a plain object.
   */
  static _SetMapValue(out, name, value)
  {
    if (out instanceof Map) out.set(name, value);
    else out[name] = value;
  }

}
