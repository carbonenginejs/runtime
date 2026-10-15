// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch3.h
// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch3.cpp
// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch3_Blue.cpp
import { IsMatch, be, CjsBlueClasses } from "#blue";

import { mat4 } from "#math/mat4";
import { IEveSpaceObject2 } from "../../IEveSpaceObject2.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { sph3 } from "#math/sph3";
import { quat } from "#math/quat";
import { Tr2Lod } from "../../EveLODHelper.js";
import { CjsSchema, meta, type, blue } from "#schema";
import { BLUELISTEVENT } from "#consts/blue";
import { IEveFiringEffectElement } from "../../IEveFiringEffectElement.js";
import { TriFloat } from "../../../core/variable/TriFloat.js";
import { EveChildUpdateParams } from "../../EveChildUpdateParams.js";
import { StretchState } from "../../../generated/eve/renderable/stretch/enums.js";
import { ITr2ControllerOwner } from "../../../controllers/ITr2ControllerOwner.js";
import { ITr2Controller } from "../../../controllers/ITr2Controller/ITr2Controller.js";
import { Tr2DynamicBinding } from "../../../core/binding/Tr2DynamicBinding.js";
import { ITr2CurveSetOwner } from "../../../curves/ITr2CurveSetOwner.js";
import { ITr2DynamicBindingOwner } from "../../ITr2DynamicBindingOwner.js";
import { ITr2SoundEmitterOwner } from "../../ITr2SoundEmitterOwner.js";
import { EveEntity } from "../../EveEntity.js";
import { EveChildModifierStretch } from "../../child/modifiers/EveChildModifierStretch.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
import { INotify } from "../../../../global/blue/INotify.js";
import { IListNotify } from "../../../../global/blue/IListNotify.js";
import { CjsStretchRuntime } from "./CjsStretchRuntime.js";


/**
 * The current stretch effect: places space-object children at the source, across
 * the span, at the destination and at a travelling point between them, driven by
 * its own controllers, dynamic bindings and curve sets.
 */
@blue.define("EveStretch3")
@blue.inherit(ITr2DynamicBindingOwner, IEveSpaceObject2, ITr2ControllerOwner,
  INotify, IListNotify, IInitialize, ITr2CurveSetOwner, ITr2SoundEmitterOwner)
@blue.inherit(INotify, IListNotify, IInitialize)
@blue.interface(INotify, IListNotify, IInitialize, IEveSpaceObject2, IEveFiringEffectElement, ITr2ControllerOwner, ITr2CurveSetOwner, ITr2DynamicBindingOwner, ITr2SoundEmitterOwner, EveEntity)
export class EveStretch3 extends IEveFiringEffectElement
{
  @blue.read
  @type.vec3
  sourcePosition = vec3.create();
  @blue.read
  @type.vec3
  destinationPosition = vec3.create();
  @blue.notify
  @blue.readwrite
  @blue.persist
 @type.rootRef("ITriVectorFunction")
  source = null;
  @blue.notify
  @blue.readwrite
  @blue.persist
 @type.rootRef("ITriVectorFunction")
  dest = null;
  @blue.readwrite
  @blue.persist
 @type.string
  name = "";
  @blue.readwrite
  @blue.persist
 @type.rootRef("TriFloat")
  moveProgression = new TriFloat();
  @blue.readwrite
  @blue.persist
 @type.rootRef("IStretchAudio")
  stretchAudio = null;
  @blue.read
  @blue.persist
 @type.list("ITr2Controller")
  controllers = [];
  @blue.read
  @blue.persist
 @type.list("TriCurveSet")
  curveSets = [];
  @blue.read
  @blue.persist
 @type.rootRef("TriFloat")
  length = new TriFloat();
  @blue.read
  @blue.persist
 @type.list("Tr2DynamicBinding")
  dynamicBindings = [];
  @blue.notify
  @blue.readwrite
  @blue.persist
 @type.boolean
  display = true;
  @blue.readwrite
  @blue.persist
 @type.boolean
  update = true;
  /** Hidden persisted destObject storage, distinct from the live setter. */
  @meta.member("destObject")
  @blue.persistOnly
  @type.rootRef("EveSpaceObjectChild")
  _destObject = null;

  /** Live destObject property. */
  @blue.readwrite
  @type.rootRef("EveSpaceObjectChild")
  @meta.implemented
  get destObject()
  {
    return this.GetDestObject();
  }

  /** Replaces destObject through native component registration. */
  @meta.implemented
  set destObject(value)
  {
    this.SetDestObject(value);
  }
  /** Hidden persisted sourceObject storage, distinct from the live setter. */
  @meta.member("sourceObject")
  @blue.persistOnly
  @type.rootRef("EveSpaceObjectChild")
  _sourceObject = null;

  /** Live sourceObject property. */
  @blue.readwrite
  @type.rootRef("EveSpaceObjectChild")
  @meta.implemented
  get sourceObject()
  {
    return this.GetSourceObject();
  }

  /** Replaces sourceObject through native component registration. */
  @meta.implemented
  set sourceObject(value)
  {
    this.SetSourceObject(value);
  }
  /** Hidden persisted stretchObject storage, distinct from the live setter. */
  @meta.member("stretchObject")
  @blue.persistOnly
  @type.rootRef("EveSpaceObjectChild")
  _stretchObject = null;

  /** Live stretchObject property. */
  @blue.readwrite
  @type.rootRef("EveSpaceObjectChild")
  @meta.implemented
  get stretchObject()
  {
    return this.GetStretchObject();
  }

  /** Replaces stretchObject through native component registration. */
  @meta.implemented
  set stretchObject(value)
  {
    this.SetStretchObject(value);
  }
  /** Be::Time is represented as numeric seconds in this JS update path. */
  @blue.read
  @type.float64
  startTime = 0;
  @blue.readwrite
  @blue.persist
 @type.rootRef("ITr2Audio")
  audio = null;
  /** Hidden persisted moveObject storage, distinct from the live setter. */
  @meta.member("moveObject")
  @blue.persistOnly
  @type.rootRef("EveSpaceObjectChild")
  _moveObject = null;

  /** Live moveObject property. */
  @blue.readwrite
  @type.rootRef("EveSpaceObjectChild")
  @meta.implemented
  get moveObject()
  {
    return this.GetMoveObject();
  }

  /** Replaces moveObject through native component registration. */
  @meta.implemented
  set moveObject(value)
  {
    this.SetMoveObject(value);
  }

  /** Live sourceSpaceObject pointer property; native backing storage is weak. */
  @blue.readwrite
  @type.rootRef("IEveSpaceObject2")
  @meta.implemented
  get sourceSpaceObject()
  {
    return this.GetSourceSpaceObject();
  }

  /** Changes the binding-root parent and relinks dynamic bindings. */
  @meta.implemented
  set sourceSpaceObject(value)
  {
    this.SetSourceSpaceObject(value);
  }

  /** Live destSpaceObject pointer property; native backing storage is weak. */
  @blue.readwrite
  @type.rootRef("IEveSpaceObject2")
  @meta.implemented
  get destSpaceObject()
  {
    return this.GetDestSpaceObject();
  }

  /** Changes the binding-root parent and relinks dynamic bindings. */
  @meta.implemented
  set destSpaceObject(value)
  {
    this.SetDestSpaceObject(value);
  }

  _sourceSpaceObject = null;
  _destinationSpaceObject = null;
  _sourceMatrix = mat4.create();
  _stretchModifier = null;
  _destinationScale = 1;
  _delay = 0;
  _isMuzzleEffect = false;
  _stretchState = EveStretch3.StretchState.STRETCH_STATE_UNDEFINED;

  /**
   * Post-hydration hook; links any controller that is not already linked and
   * takes ownership of the dynamic bindings. JS stores lists without native parent locks.
   */
  @blue.method
  @meta.adapted
  Initialize()
  {
    if (this.stretchObject) this._stretchModifier = new EveChildModifierStretch();
    if (this.dest && this._stretchModifier) this._stretchModifier.SetDest(this.dest);
    for (const controller of this.controllers)
    {
      if (!controller.IsLinked()) controller.Link(this);
    }
    this._InitializeBindings();
    return true;
  }

  /**
   * The space object standing in as parent for the source-side children, or
   * null.
   */
  @blue.method
  @meta.implemented
  GetSourceSpaceObject()
  {
    return this._sourceSpaceObject;
  }

  /**
   * Sets the space object used as parent for the source-side children and
   * relinks the dynamic bindings, since it is one of their roots.
   */
  @blue.method
  @meta.implemented
  SetSourceSpaceObject(value)
  {
    this._sourceSpaceObject = value ?? null;
    this._InitializeBindings();
  }

  /** The space object standing in as parent for the destination child, or null. */
  @blue.method
  @meta.implemented
  GetDestSpaceObject()
  {
    return this._destinationSpaceObject;
  }

  /**
   * Sets the space object used as parent for the destination child and relinks
   * the dynamic bindings, since it is one of their roots.
   */
  @blue.method
  @meta.implemented
  SetDestSpaceObject(value)
  {
    this._destinationSpaceObject = value ?? null;
    this._InitializeBindings();
  }

  /**
   * Relinks bindings at time zero and, unless only bindings were requested, controllers.
   * JS uses the object directly where Carbon supplies its raw root.
   * @param {Boolean} [onlyUpdateBindings] - leave the controllers linked as they are
   */
  @blue.method
  @meta.adapted
  Rebind(onlyUpdateBindings = false)
  {
    for (const binding of this.dynamicBindings)
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
   * Builds the prototype-free name map that bindings and controllers resolve
   * against: every curve set under its own name, plus Owner, the source and
   * destination space objects, and the root object of each child.
   * JS objects serve as raw roots; the native unordered map becomes a plain name map.
   */
  @blue.method
  @meta.adapted
  GetParameterMap()
  {
    const out = Object.create(null);
    for (const curveSet of this.curveSets)
    {
      out[curveSet.GetName()] = curveSet;
    }
    out.Owner = this;
    if (this._sourceSpaceObject) out.SourceSpaceObject = this._sourceSpaceObject;
    if (this._destinationSpaceObject) out.DestSpaceObject = this._destinationSpaceObject;
    if (this.sourceObject) out.SourceObject = this.sourceObject;
    if (this.destObject) out.DestObject = this.destObject;
    if (this.moveObject) out.MoveObject = this.moveObject;
    if (this.stretchObject) out.StretchObject = this.stretchObject;
    return out;
  }

  /**
   * Fills out with the fixed binding roots - Owner, Source, Dest, Stretch, Move and the two space objects - under their binding-path names.
   * @param {Object} [out] - caller-owned map, mutated in place
   * @returns {Object} out
   */
  @blue.method
  @meta.implemented
  GetBindingRoots(out = {})
  {
    out.Owner = this;
    out.Source = this.sourceObject;
    out.Dest = this.destObject;
    out.Stretch = this.stretchObject;
    out.Move = this.moveObject;
    out.SourceSpaceObject = this._sourceSpaceObject;
    out.DestSpaceObject = this._destinationSpaceObject;
    return out;
  }

  /**
   * Applies Carbon's IList ownership callbacks for the controllers and
   * dynamic-binding lists - linking on insert, unlinking on remove, unlinking
   * every controller on unload - and ignores events flagged as loading.
   */
  @blue.method
  @meta.adapted
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    if ((event & BLUELISTEVENT.BELIST_LOADING) !== 0) return;
    const maskedEvent = event & BLUELISTEVENT.BELIST_EVENTMASK;
    if (list === this.controllers)
    {
      const controller = value ? be.classes.QueryThisInterface(value, ITr2Controller, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) : null;
      if (maskedEvent === BLUELISTEVENT.BELIST_INSERTED && controller) controller.Link(this);
      else if (maskedEvent === BLUELISTEVENT.BELIST_REMOVED && controller) controller.Unlink();
      else if (maskedEvent === BLUELISTEVENT.BELIST_UNLOADSTART)
      {
        for (const controller of this.controllers) controller.Unlink();
      }
    }
    else if (list === this.dynamicBindings)
    {
      const binding = value ? be.classes.QueryThisInterface(value, Tr2DynamicBinding, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) : null;
      if (!binding) return;
      if (maskedEvent === BLUELISTEVENT.BELIST_INSERTED)
      {
        binding.SetOwner(this);
        binding.Link();
      }
      else if (maskedEvent === BLUELISTEVENT.BELIST_REMOVED)
      {
        binding.SetOwner(null);
      }
    }
  }

  /** Refreshes modifier or registration; JS notifications name the exposed native member. */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "dest"))
    {
      if (!this.dest) this._stretchModifier = null;
      else
      {
        if (!this._stretchModifier) this._stretchModifier = new EveChildModifierStretch();
        this._stretchModifier.SetDest(this.dest);
      }
    }
    if (IsMatch(propertyName, "display")) this.ReRegister();
    return true;
  }

  /** Returns the source child. */
  @blue.method
  @meta.implemented
  GetSourceObject()
  {
    return this._sourceObject;
  }

  /** Replaces the source child and transfers its mapped entity registration. */
  @blue.method
  @meta.implemented
  SetSourceObject(value)
  {
    const registry = this.GetComponentRegistry();
    const previous = this._sourceObject;
    const previousEntity = previous ? be.classes.QueryThisInterface(previous, EveEntity, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) : null;
    if (previousEntity) previousEntity.UnRegister(registry);
    this._sourceObject = value;
    const entity = value ? be.classes.QueryThisInterface(value, EveEntity, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) : null;
    if (entity) entity.Register(registry);
  }

  /** Returns the dest child. */
  @blue.method
  @meta.implemented
  GetDestObject()
  {
    return this._destObject;
  }

  /** Replaces the dest child and transfers its mapped entity registration. */
  @blue.method
  @meta.implemented
  SetDestObject(value)
  {
    const registry = this.GetComponentRegistry();
    const previous = this._destObject;
    const previousEntity = previous ? be.classes.QueryThisInterface(previous, EveEntity, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) : null;
    if (previousEntity) previousEntity.UnRegister(registry);
    this._destObject = value;
    const entity = value ? be.classes.QueryThisInterface(value, EveEntity, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) : null;
    if (entity) entity.Register(registry);
  }

  /** Returns the stretch child. */
  @blue.method
  @meta.implemented
  GetStretchObject()
  {
    return this._stretchObject;
  }

  /** Replaces the stretch child and transfers its mapped entity registration. */
  @blue.method
  @meta.implemented
  SetStretchObject(value)
  {
    const registry = this.GetComponentRegistry();
    const previous = this._stretchObject;
    const previousEntity = previous ? be.classes.QueryThisInterface(previous, EveEntity, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) : null;
    if (previousEntity) previousEntity.UnRegister(registry);
    this._stretchObject = value;
    if (value)
    {
      this._stretchModifier = new EveChildModifierStretch();
      if (this.dest) this._stretchModifier.SetDest(this.dest);
    }
    else this._stretchModifier = null;
    const entity = value ? be.classes.QueryThisInterface(value, EveEntity, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) : null;
    if (entity) entity.Register(registry);
  }

  /** Returns the move child. */
  @blue.method
  @meta.implemented
  GetMoveObject()
  {
    return this._moveObject;
  }

  /** Replaces the move child and transfers its mapped entity registration. */
  @blue.method
  @meta.implemented
  SetMoveObject(value)
  {
    const registry = this.GetComponentRegistry();
    const previous = this._moveObject;
    const previousEntity = previous ? be.classes.QueryThisInterface(previous, EveEntity, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) : null;
    if (previousEntity) previousEntity.UnRegister(registry);
    this._moveObject = value;
    const entity = value ? be.classes.QueryThisInterface(value, EveEntity, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) : null;
    if (entity) entity.Register(registry);
  }

  /**
   * Applies a pending firing transition (starting sets the FiringDelay and
   * IsFiring controller variables, stopping clears IsFiring), advances the
   * bindings and controllers, samples the endpoint curves, records the span in
   * length, and drives each child's synchronous phase with a fresh parameter
   * block: the source and stretch children under the source space object, the
   * move child at the interpolated offset, and the destination child under the
   * destination space object at its translation. JS runs the task phase serially
   * and passes seconds to the existing curve API. Skipped while update is false.
   */
  @meta.ours
  UpdateSynchronous(context)
  {
    if (!this.update) return true;
    if (this._stretchState === EveStretch3.StretchState.STRETCH_STATE_STARTING)
    {
      this.StartControllers();
      this.SetControllerVariable("FiringDelay", this._delay);
      this.SetControllerVariable("IsFiring", 1);
      this._stretchState = EveStretch3.StretchState.STRETCH_STATE_STARTED;
    }
    else if (this._stretchState === EveStretch3.StretchState.STRETCH_STATE_STOPPING)
    {
      this.SetControllerVariable("IsFiring", 0);
      this._stretchState = EveStretch3.StretchState.STRETCH_STATE_UNDEFINED;
    }

    const time = context.GetTime();
    for (const binding of this.dynamicBindings) binding.Update(time);
    for (const controller of this.controllers) controller.Update(0.5);
    if (this.source) this.source.Update__Ticks(time, this.sourcePosition);
    if (this.dest) this.dest.Update__Ticks(time, this.destinationPosition);
    this.length.value = vec3.distance(this.sourcePosition, this.destinationPosition);

    const params = this._makeParams();
    params.spaceObjectParent = this._sourceSpaceObject ?? this;
    if (this.sourceObject) this.sourceObject.UpdateSyncronous(context, params);
    if (this.stretchObject) this.stretchObject.UpdateSyncronous(context, params);
    if (this.moveObject)
    {
      vec3.subtract(EveStretch3._movePosition, this.sourcePosition, this.destinationPosition);
      vec3.scale(EveStretch3._movePosition, EveStretch3._movePosition, this.moveProgression.value);
      CjsStretchRuntime.translationMatrix(EveStretch3._movePosition, params.localToWorldTransform);
      this.moveObject.UpdateSyncronous(context, params);
    }
    if (this.destObject)
    {
      params.spaceObjectParent = this._destinationSpaceObject ?? this;
      CjsStretchRuntime.translationMatrix(this.destinationPosition, params.localToWorldTransform);
      this.destObject.UpdateSyncronous(context, params);
    }
    return true;
  }

  /** Carbon's IEveSpaceObject2 spelling of UpdateSynchronous; forwards unchanged. */
  @blue.method
  @meta.adapted
  UpdateSyncronous(context)
  {
    return this.UpdateSynchronous(context);
  }

  /**
   * Advances the curve sets on time measured from the first asynchronous update,
   * then places each child: the source at the span basis, or verbatim at the
   * muzzle transform when SetFiringTransform supplied one; the stretch child
   * spanning the endpoints and re-centred on their midpoint; the move child at
   * the interpolated position carrying the span orientation; and the destination
   * at its scaled basis. Finally feeds both audio objects the current endpoints.
   * JS runs the task phase serially with the existing seconds-based curve API.
   * Skipped entirely while update is false.
   */
  @meta.ours
  UpdateAsynchronous(context)
  {
    if (!this.update) return true;
    const time = context.GetTime();
    if (this.startTime === 0) this.startTime = time;
    const relative = time - this.startTime;
    for (const curveSet of this.curveSets) curveSet.Update__RealTimeSimTime(relative, relative, context.renderContext);

    const params = this._makeParams();
    vec3.subtract(EveStretch3._moveDirection, this.sourcePosition, this.destinationPosition);
    quat.arcFromForward(EveStretch3._moveRotation, EveStretch3._moveDirection);
    if (this.sourceObject)
    {
      if (this._isMuzzleEffect) mat4.copy(params.localToWorldTransform, this._sourceMatrix);
      else mat4.fromRotationTranslation(params.localToWorldTransform, EveStretch3._moveRotation, this.sourcePosition);
      this.sourceObject.UpdateAsyncronous(context, params);
    }
    if (this.stretchObject)
    {
      CjsStretchRuntime.translationMatrix(this.sourcePosition, EveStretch3._sourceTransform);
      if (this._stretchModifier)
      {
        this._stretchModifier.SetDestPosition(this.destinationPosition);
        this._stretchModifier.ApplyTransform(context, EveStretch3._sourceTransform, 0, null, params.localToWorldTransform);
      }
      else mat4.copy(params.localToWorldTransform, EveStretch3._sourceTransform);
      this.stretchObject.UpdateAsyncronous(context, params);
    }
    if (this.moveObject)
    {
      vec3.lerp(EveStretch3._movePosition, this.sourcePosition, this.destinationPosition, this.moveProgression.value);
      mat4.fromRotationTranslation(params.localToWorldTransform, EveStretch3._moveRotation, EveStretch3._movePosition);
      this.moveObject.UpdateAsyncronous(context, params);
    }
    if (this.destObject)
    {
      mat4.fromRotationTranslation(params.localToWorldTransform, EveStretch3._moveRotation, this.destinationPosition);
      // Carbon row order scale * Y180 * rotation * translation reverses here.
      vec3.set(EveStretch3._destinationScale, -this._destinationScale, this._destinationScale, -this._destinationScale);
      mat4.scale(params.localToWorldTransform, params.localToWorldTransform, EveStretch3._destinationScale);
      this.destObject.UpdateAsyncronous(context, params);
    }
    const audioType = CjsSchema.GetConstructor("Tr2AudioStretchBase");
    const audio = audioType ? CjsSchema.cast(this.audio, audioType) : null;
    if (audio) audio.Update(this.sourcePosition, this.destinationPosition);
    if (this.stretchAudio)
    {
      this.stretchAudio.Update(this.sourcePosition, this.destinationPosition);
    }
    return true;
  }

  /**
   * Carbon's IEveSpaceObject2 spelling of UpdateAsynchronous; forwards
   * unchanged.
   */
  @blue.method
  @meta.adapted
  UpdateAsyncronous(context)
  {
    return this.UpdateAsynchronous(context);
  }

  /**
   * IEveFiringEffectElement synchronous hook; runs the normal synchronous
   * update.
   */
  @blue.method
  @meta.implemented
  UpdateEffectSync(context)
  {
    return this.UpdateSynchronous(context);
  }

  /**
   * IEveFiringEffectElement asynchronous hook; runs the normal asynchronous
   * update.
   */
  @blue.method
  @meta.implemented
  UpdateEffectAsync(context)
  {
    return this.UpdateAsynchronous(context);
  }

  /**
   * IEveFiringEffectElement move hook; EveStretch3 drives its travelling child
   * from the moveProgression value instead of a start event.
   */
  @blue.method
  @meta.noop
  StartMoving()
  {
  }

  /**
   * Carbon UpdateVisibility (EveStretch3.cpp:554-594), every child at
   * TR2_LOD_HIGH: the endpoint children at plain translations, the stretch
   * child at the parent transform, the move child turned from -Z onto
   * normalize(source - destination) (TriQuaternionArcFromForward) at scale 1,
   * placed at the interpolated position.
   */
  @blue.method
  @meta.implemented
  UpdateVisibility(context, parentTransform = EveStretch3._identity)
  {
    if (!this.display) return;
    const high = Tr2Lod.TR2_LOD_HIGH;
    if (this.sourceObject) this.sourceObject.UpdateVisibility(context, CjsStretchRuntime.translationMatrix(this.sourcePosition, EveStretch3._sourceVisibility), high);
    if (this.destObject) this.destObject.UpdateVisibility(context, CjsStretchRuntime.translationMatrix(this.destinationPosition, EveStretch3._destinationVisibility), high);
    if (this.stretchObject) this.stretchObject.UpdateVisibility(context, parentTransform, high);
    vec3.lerp(EveStretch3._movePosition, this.sourcePosition, this.destinationPosition, this.moveProgression.value);
    vec3.subtract(EveStretch3._moveDirection, this.sourcePosition, this.destinationPosition);
    quat.arcFromForward(EveStretch3._moveRotation, EveStretch3._moveDirection);
    mat4.fromRotationTranslation(EveStretch3._moveVisibility, EveStretch3._moveRotation, EveStretch3._movePosition);
    if (this.moveObject) this.moveObject.UpdateVisibility(context, EveStretch3._moveVisibility, high);
  }

  static _moveDirection = vec3.create();
  static _moveRotation = quat.create();

  /** Registers every displayed stretch component with Carbon's quad renderer. */
  @blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (!this.display) return;
    this._RunOnComponents((component) => component.RegisterWithQuadRenderer(quadRenderer));
  }

  /** Submits displayed components in source, destination, stretch, then move order. */
  @blue.method
  @meta.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (!this.display) return;
    this._RunOnComponents((component) => component.AddQuadsToQuadRenderer(frustum, quadRenderer));
  }

  /** Carbon's GetRenderables( renderables ): forwards with no impostor manager. */
  @blue.method
  @meta.implemented
  GetRenderables(out)
  {
    return this.GetRenderables__Impostors(out, null);
  }

  /**
   * Carbon GetRenderables (cpp:601-609): every child's renderables while
   * displayed. EveStretch3 has no batches of its own; its children draw.
   * @returns {Array} out
   */
  @meta.implemented
  GetRenderables__Impostors(out = [], _impostors)
  {
    if (this.display) this._RunOnComponents((component) => component.GetRenderables(out));
    return out;
  }

  /**
   * Shows or hides the stretch, gating visibility, renderable collection,
   * curve-set control and component registration.
   */
  @blue.method
  @meta.implemented
  SetDisplay(display)
  {
    this.display = !!display;
    this.ReRegister();
  }

  /**
   * Merges the bounding spheres of every child, including the travelling one.
   * The retained JS merger uses a zero-radius sentinel and source-first order;
   * native starts with the destination and tracks validity separately.
   * @param {Array} out - caller-owned packed (x, y, z, radius), overwritten
   * @returns {Boolean} whether any child contributed a sphere
   */
  @blue.method
  @meta.adapted
  GetBoundingSphere(out = vec4.create(), query = 0)
  {
    let valid = false;
    for (const component of [this._destObject, this._sourceObject, this._stretchObject, this._moveObject])
    {
      if (component && component.GetBoundingSphere(EveStretch3._sphere, query))
      {
        // BoundingSphereSetOrUpdate: the first sphere is copied, later ones grow it.
        if (valid) sph3.union(out, out, EveStretch3._sphere);
        else vec4.copy(out, EveStretch3._sphere);
        valid = true;
      }
    }
    return valid;
  }

  /**
   * Longest curve-set duration in seconds, each divided by that set's own time
   * scale.
   */
  @blue.method
  @meta.implemented
  GetCurveDuration()
  {
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      duration = Math.max(duration, curveSet.GetMaxCurveDuration() / curveSet.GetTimeScale());
    }
    return duration;
  }

  /**
   * Requests a firing start; the controller variables are only applied on the next synchronous update, while the stretch audio starts immediately.
   * @param {Number} [delay] - seconds handed to the controllers as the FiringDelay variable
   */
  @blue.method
  @meta.implemented
  StartFiring(delay = 0)
  {
    this._delay = Number(delay);
    this._stretchState = EveStretch3.StretchState.STRETCH_STATE_STARTING;
    if (this.stretchAudio)
    {
      this.stretchAudio.Start();
    }
  }

  /**
   * Requests a firing stop; IsFiring is cleared on the next synchronous update,
   * while the stretch audio stops immediately.
   */
  @blue.method
  @meta.implemented
  StopFiring()
  {
    this._stretchState = EveStretch3.StretchState.STRETCH_STATE_STOPPING;
    if (this.stretchAudio)
    {
      this.stretchAudio.Stop();
    }
  }

  /**
   * Pins both endpoints explicitly and drops the source and dest position curves
   * so they cannot overwrite them. A 16-element source marks this a muzzle
   * effect, whose transform is used verbatim for the source child instead of the
   * derived span basis.
   */
  @blue.method
  @meta.implemented
  SetFiringTransform(source, destination)
  {
    this.source = null;
    this.dest = null;
    if (source.length === 16)
    {
      this._isMuzzleEffect = true;
      mat4.copy(this._sourceMatrix, source);
      mat4.getTranslation(this.sourcePosition, source);
    }
    else
    {
      this._isMuzzleEffect = false;
      vec3.copy(this.sourcePosition, source);
      CjsStretchRuntime.translationMatrix(source, this._sourceMatrix);
    }
    vec3.copy(this.destinationPosition, destination);
  }

  /** Native stretch effects leave the requested model centre untouched. */
  @blue.method
  @meta.noop
  UpdateModelCenterWorldPosition(_position, _time)
  {
  }

  /** Native stretch effects leave the requested model centre untouched. */
  @blue.method
  @meta.noop
  GetModelCenterWorldPosition(_position)
  {
  }

  /** Native stretch effects do not supply a local bounding box. */
  @blue.method
  @meta.implemented
  GetLocalBoundingBox(_min, _max)
  {
    return false;
  }

  /** Native stretch effects leave the requested transform untouched. */
  @blue.method
  @meta.noop
  GetLocalToWorldTransform(_transform)
  {
  }

  /** IEveFiringEffectElement hook; EveStretch3 cannot hide individual endpoints. */
  @blue.method
  @meta.noop
  DisplayEndPoints(_displaySource, _displayDestination)
  {
  }

  /**
   * Uniform scale applied to the destination child's asynchronous placement.
   */
  @blue.method
  @meta.implemented
  SetDestObjectScale(scale)
  {
    this._destinationScale = Number(scale);
  }

  /**
   * IEveFiringEffectElement intensity hook; EveStretch3 has no intensity term of
   * its own.
   */
  @blue.method
  @meta.noop
  SetIntensity(_intensity)
  {
  }

  /**
   * Sets a controller variable on every child and on this stretch's own
   * controllers.
   */
  @blue.method
  @meta.implemented
  SetControllerVariable(name, value)
  {
    this._RunOnComponents((component) => component.SetControllerVariable(name, value));
    for (const controller of this.controllers) controller.SetVariable(name, value);
  }

  /**
   * Delivers a controller event to every child and to this stretch's own
   * controllers.
   */
  @blue.method
  @meta.implemented
  HandleControllerEvent(name)
  {
    this._RunOnComponents((component) => component.HandleControllerEvent(name));
    for (const controller of this.controllers) controller.HandleEvent(name);
  }

  /** Starts every child's controllers and this stretch's own. */
  @blue.method
  @meta.implemented
  StartControllers()
  {
    this._RunOnComponents((component) => component.StartControllers());
    for (const controller of this.controllers) controller.Start();
  }

  /**
   * Plays every local curve set with the given name - over a named time range
   * when one is given, otherwise from the start with the range reset - and
   * forwards the call to the children. Ignored while hidden.
   */
  @blue.method
  @meta.implemented
  PlayCurveSet(name, rangeName = "")
  {
    if (!this.display) return;
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() !== name) continue;
      if (rangeName) curveSet.PlayTimeRange(rangeName);
      else { curveSet.ResetTimeRange(); curveSet.Play(); }
    }
    this._RunOnComponents((component) =>
    {
      const owner = CjsSchema.cast(component, ITr2CurveSetOwner);
      if (owner) owner.PlayCurveSet(name, rangeName);
    });
  }

  /**
   * Stops every local curve set with the given name and forwards the call to the
   * children. Ignored while hidden.
   */
  @blue.method
  @meta.implemented
  StopCurveSet(name)
  {
    if (!this.display) return;
    for (const curveSet of this.curveSets) if (curveSet.GetName() === name) curveSet.Stop();
    this._RunOnComponents((component) =>
    {
      const owner = CjsSchema.cast(component, ITr2CurveSetOwner);
      if (owner) owner.StopCurveSet(name);
    });
  }

  /**
   * Advances every local curve set with the given name to an explicit time and
   * forwards the call to the children; unlike play and stop this is not gated on
   * display.
   * JS passes the optional render context through the existing curve-set API.
   */
  @blue.method
  @meta.adapted
  UpdateCurveSet(name, time, renderContext = null)
  {
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() === name)
      {
        curveSet.Update__RealTimeSimTime(time, time, renderContext);
      }
    }
    this._RunOnComponents((component) =>
    {
      const owner = CjsSchema.cast(component, ITr2CurveSetOwner);
      if (owner) owner.UpdateCurveSet(name, time, renderContext);
    });
  }

  /**
   * Longest duration of the named curve set across this stretch and its
   * children; 0 while hidden.
   */
  @blue.method
  @meta.implemented
  GetCurveSetDuration(name)
  {
    if (!this.display) return 0;
    let duration = 0;
    for (const curveSet of this.curveSets) if (curveSet.GetName() === name) duration = Math.max(duration, curveSet.GetMaxCurveDuration());
    const componentMax = this._RunOnComponentsGetMax((component) =>
    {
      const owner = CjsSchema.cast(component, ITr2CurveSetOwner);
      return owner ? owner.GetCurveSetDuration(name) : 0;
    });
    return Math.max(duration, componentMax);
  }

  /**
   * Longest duration of a named time range within the named curve set, across
   * this stretch and its children; 0 while hidden.
   */
  @blue.method
  @meta.implemented
  GetRangeDuration(name, rangeName)
  {
    if (!this.display) return 0;
    let duration = 0;
    for (const curveSet of this.curveSets) if (curveSet.GetName() === name) duration = Math.max(duration, curveSet.GetRangeDuration(rangeName));
    const componentMax = this._RunOnComponentsGetMax((component) =>
    {
      const owner = CjsSchema.cast(component, ITr2CurveSetOwner);
      return owner ? owner.GetRangeDuration(name, rangeName) : 0;
    });
    return Math.max(duration, componentMax);
  }

  /**
   * Looks up the name in nominal stretch audio. The secondary audio is used only
   * when the primary object fails the native cast, even if a primary lookup returns null.
   * Audio constructors are resolved by registration to preserve the optional service boundary.
   */
  @blue.method
  @meta.adapted
  FindSoundEmitter(name)
  {
    const audioType = CjsSchema.GetConstructor("Tr2AudioStretchBase");
    const audio = audioType ? CjsSchema.cast(this.audio, audioType) : null;
    if (audio) return audio.FindEmitterByName(name);
    if (this.stretchAudio)
    {
      return this.stretchAudio.FindEmitterByName(name);
    }
    return null;
  }

  /** Registers all four mapped child entities while displayed. */
  @blue.method
  @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      this._RunOnComponents((component) =>
      {
        const entity = component ? be.classes.QueryThisInterface(component, EveEntity, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) : null;
        if (entity) entity.Register(registry);
      });
    }
  }

  /** Unregisters all four mapped child entities without a display recheck. */
  @blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      this._RunOnComponents((component) =>
      {
        const entity = component ? be.classes.QueryThisInterface(component, EveEntity, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) : null;
        if (entity) entity.UnRegister(registry);
      });
    }
  }

  /**
   * Carbon RunOnComponents (EveStretch3.cpp:126-147): calls `func` on each
   * non-null child in source, destination, stretch, then move order.
   * @param {function(*): void} func
   * @returns {void}
   */
  @meta.implemented
  _RunOnComponents(func)
  {
    if (this._sourceObject) func(this._sourceObject);
    if (this._destObject) func(this._destObject);
    if (this._stretchObject) func(this._stretchObject);
    if (this._moveObject) func(this._moveObject);
  }

  /**
   * Carbon RunOnComponentsGetMax (EveStretch3.cpp:149-172): the largest value
   * `func` returns over the non-null children, in RunOnComponents order; -1
   * when there are none.
   * @param {function(*): number} func
   * @returns {number}
   */
  @meta.implemented
  _RunOnComponentsGetMax(func)
  {
    let result = -1;
    if (this._sourceObject) result = Math.max(result, func(this._sourceObject));
    if (this._destObject) result = Math.max(result, func(this._destObject));
    if (this._stretchObject) result = Math.max(result, func(this._stretchObject));
    if (this._moveObject) result = Math.max(result, func(this._moveObject));
    return result;
  }

  /**
   * Takes ownership of every dynamic binding and links it, so the bindings
   * resolve against this stretch's roots.
   */
  _InitializeBindings()
  {
    for (const binding of this.dynamicBindings)
    {
      binding.SetOwner(this);
      binding.Link();
    }
  }

  /**
   * A fresh child-update parameter block carrying this stretch's visibility;
   * each call site fills in the parent object and the world placement.
   */
  _makeParams()
  {
    const params = new EveChildUpdateParams();
    params.isVisible = this.display;
    return params;
  }

  static StretchState = StretchState;
  static _identity = mat4.create();
  static _sourceTransform = mat4.create();
  static _sourceVisibility = mat4.create();
  static _destinationVisibility = mat4.create();
  static _moveVisibility = mat4.create();
  static _movePosition = vec3.create();
  static _sphere = vec4.create();
  static _destinationScale = vec3.create();
}

// Native exposure includes the concrete class itself; JS has no implicit self mapping.

// EveStretch3_Blue.cpp: native exposure.
