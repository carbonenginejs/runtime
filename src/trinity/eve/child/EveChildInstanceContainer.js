// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstanceContainer.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { EveChildTransform } from "./EveChildTransform.js";
import { Origin } from "../../generated/eve/child/enums.js";
import { EveChildUpdateParams } from "../EveChildUpdateParams.js";
import { Tr2Lod } from "../EveLODHelper.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";

/** A child that instantiates a source template across a list of authored or locator-driven transforms, forwarding controller and registration calls to the instances. */
@type.define({ className: "EveChildInstanceContainer", family: "eve/child" })
export class EveChildInstanceContainer extends EveChildTransform
{

  #controllerVariables = new Map();

  // Carbon m_hasUpdated: set by UpdateAsyncronous, gates GetRenderables.
  #hasUpdated = false;

  // Carbon m_ownerMaxSpeed, captured from the sync params each frame.
  #ownerMaxSpeed = 0;

  // Carbon m_worldVelocity, sampled from a space-object-rooted parent.
  #worldVelocity = vec3.create();

  /** m_transformModifiers (PIEveChildTransformModifierVector) [READ, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.list("IEveChildTransformModifier")
  transformModifiers = [];

  /** m_transforms (PEveChildInstanceTransformStructureList) [READ, PERSIST] */
  @io.persist
  @type.list("EveChildInstanceTransform")
  transforms = [];

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  display = true;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_isAlwaysOn (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  alwaysOn = false;

  /** m_inheritProperties (EveChildInheritPropertiesPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("EveChildInheritProperties")
  inheritProperties = null;

  /** m_reset (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  reset = true;

  /** m_instances (PIEveSpaceObjectChildVector) [READ] */
  @io.read
  @type.list("IEveSpaceObjectChild")
  instances = [];

  /** m_locatorSetName (BlueSharedString) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  locatorSet = "";

  /** m_source (IEveSpaceObjectChildPtr) [PERSISTONLY] */
  @io.persistOnly
  @type.model("IEveSpaceObjectChild")
  source = null;

  /** m_origin (Origin - enum Origin) [READ] */
  @io.read
  @type.int32
  @type.enum("Origin")
  origin = 0;

  /** Propagates the owning space object to the source and live instances. */
  @carbon.method
  @impl.implemented
  SetOwner(owner)
  {
    if (this.GetOwner() === owner) return;
    super.SetOwner(owner);
    for (const child of this.instances) child.SetOwner(owner);
    if (this.source) this.source.SetOwner(owner);
  }

  /** Propagates a modular part tag to the source and live instances. */
  @carbon.method
  @impl.implemented
  SetPartTag(tag)
  {
    const next = Number(tag) >>> 0;
    if (this.GetPartTag() === next) return;
    super.SetPartTag(next);
    for (const child of this.instances) child.SetPartTag(next);
    if (this.source) this.source.SetPartTag(next);
  }

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    for (const instance of this.instances) instance?.HandleControllerEvent(name);
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name);
    const next = Number(value);
    this.source?.SetControllerVariable(key, next);
    this.#controllerVariables.set(key, next);
    for (const instance of this.instances) instance?.SetControllerVariable(key, next);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    for (const instance of this.instances) instance?.StartControllers();
  }

  /** Carbon EveChildInstanceContainer::RunOnInstances (cpp:318-331): with no
   * instances, the source template stands in - but only while edit mode is
   * enabled (m_disableEditMode has no JS field yet; an absent field reads as
   * edit mode on, matching RegisterComponents below). */
  #RunOnInstances(func)
  {
    if (!this.instances.length && this.source && !this.disableEditMode)
    {
      func(this.source);
      return;
    }
    for (const instance of this.instances)
    {
      if (instance) func(instance);
    }
  }

  /** Carbon copies the incoming params before overriding (cpp:404-407,
   * 429-432); the duck-tolerant reads mirror EveChildContainer, because the
   * turret ambient path passes a plain object literal, not a full params. */
  static #DeriveChildParams(params)
  {
    const next = new EveChildUpdateParams();
    if (params)
    {
      next.spaceObjectParent = params.spaceObjectParent ?? null;
      next.childParent = params.childParent ?? null;
      next.boneCount = params.boneCount ?? 0;
      next.bones = params.bones ?? null;
      next.ownerMaxSpeed = Number(params.ownerMaxSpeed) || 0;
      next.activationStrength = Number(params.activationStrength ?? 1);
      next.controllerUpdateFrequency = Number(params.controllerUpdateFrequency ?? 0.5);
      next.isVisible = params.isVisible !== false;
      if (params.localToWorldTransform?.length === 16)
      {
        mat4.copy(next.localToWorldTransform, params.localToWorldTransform);
      }
      if (params.worldVelocity)
      {
        vec3.copy(next.worldVelocity, params.worldVelocity);
      }
    }
    return next;
  }

  /** Carbon EveChildInstanceContainer::UpdateSyncronous (cpp:388-410): the
   * display gate, the reset re-creation, the owner speed capture, then the
   * fan-out under this container's own transform. The m_reset branch calls
   * CreateInstances (cpp:397), which is unported - it deep-clones the source
   * through BeClasses->CopyTo and touches Tr2QuadRenderer - so `reset` stays
   * raised until that port lands rather than being consumed with no effect. */
  @carbon.method
  @impl.adapted
  @impl.reason("CreateInstances (deep-clone + quad-renderer seam) is unported; the reset flag stays pending instead of being silently cleared.")
  UpdateSyncronous(updateContext, params)
  {
    if (!this.display) return;

    this.#ownerMaxSpeed = Number(params?.ownerMaxSpeed) || 0;

    const newParams = EveChildInstanceContainer.#DeriveChildParams(params);
    newParams.isVisible = (params?.isVisible !== false) && this.display;
    newParams.childParent = this;
    mat4.copy(newParams.localToWorldTransform, this.worldTransform);

    this.#RunOnInstances(child => child.UpdateSyncronous(updateContext, newParams));
  }

  /** Carbon EveChildInstanceContainer::UpdateAsyncronous (cpp:418-443):
   * rebuild the world transform from the parent, fan out with childParent
   * params, sample the owner's world velocity when space-object rooted, and
   * arm GetRenderables. The Matrix-overload declaration at header:64 has no
   * definition - it exists only to un-hide the base overload under C++ name
   * hiding, so JS ports ONE method. */
  @carbon.method
  @impl.implemented
  UpdateAsyncronous(updateContext, params)
  {
    if (!this.display) return;

    const parentTransform = params?.localToWorldTransform;
    if (parentTransform && parentTransform.length === 16)
    {
      this.UpdateTransform(parentTransform);
    }

    const newParams = EveChildInstanceContainer.#DeriveChildParams(params);
    newParams.isVisible = (params?.isVisible !== false) && this.display;
    newParams.childParent = this;
    mat4.copy(newParams.localToWorldTransform, this.worldTransform);

    this.#RunOnInstances(child => child.UpdateAsyncronous(updateContext, newParams));

    if (params?.spaceObjectParent && !params.childParent)
    {
      params.spaceObjectParent.GetWorldVelocity(this.#worldVelocity);
    }

    this.#hasUpdated = true;
  }

  /** Carbon EveChildInstanceContainer::UpdateVisibility (cpp:378-386): the
   * display gate, then the parent transform and LOD pass through UNCHANGED -
   * unlike the update pair, which rebase onto this container's transform. */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform = null, parentLod = Tr2Lod.TR2_LOD_HIGH)
  {
    if (!this.display) return;

    this.#RunOnInstances(child => child.UpdateVisibility(updateContext, parentTransform, parentLod));
  }

  /** Carbon EveChildInstanceContainer::GetRenderables (cpp:367-375): gated on
   * display AND a completed async update; the std::vector& out-param becomes
   * the returned array. */
  @carbon.method
  @impl.implemented
  GetRenderables(out = [])
  {
    if (!this.display || !this.#hasUpdated) return out;

    this.#RunOnInstances(child => child.GetRenderables(out));
    return out;
  }

  /** Carbon EveChildInstanceContainer::RegisterComponents (cpp:83-103):
   * forwards the instances; with no instances (and edit mode enabled -
   * m_disableEditMode has no JS field yet, read duck-typed) the source
   * template registers instead. Gate IsInRegistry() && m_display. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    if (this.IsInRegistry() && this.display)
    {
      const registry = this.GetComponentRegistry();
      for (const instance of this.instances)
      {
        instance?.Register(registry);
      }

      if (!this.instances.length && !this.disableEditMode)
      {
        this.source?.Register(registry);
      }
    }
  }

  /** Carbon EveChildInstanceContainer::UnRegisterComponents (cpp:105-122):
   * forwards the instances and the source; no display re-check. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    if (this.IsInRegistry())
    {
      const registry = this.GetComponentRegistry();
      for (const instance of this.instances)
      {
        instance?.UnRegister(registry);
      }
      this.source?.UnRegister(registry);
    }
  }

  static Origin = Origin;

}
