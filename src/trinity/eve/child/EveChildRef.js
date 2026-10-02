import { EveEntity } from "../EveEntity.js";
import { ITr2SoundEmitterOwner } from "../ITr2SoundEmitterOwner.js";
import { INotify } from "../../../global/blue/INotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { ITr2CurveSetOwner } from "../../curves/ITr2CurveSetOwner.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildRef.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildRef.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { blue } from "#blue";
import { carbon, impl, edit, type, CjsSchema } from "#schema";
import { vec3 } from "#math/vec3";
import { quat } from "#math/quat";
import { EveChildTransform } from "./EveChildTransform.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { IEveInheritPropertiesOwner } from "../IEveInheritPropertiesOwner.js";

/**
 * A child that loads another space-object child from a red/black file by path
 * and forwards the child interface to it (EveChildRef.cpp).
 *
 * One divergence, forced: Carbon's BeResMan->LoadObject returns the object
 * synchronously; the JS resource manager resolves it asynchronously, so the
 * child joins (registered and forwarded to) once the file has loaded.
 */
@type.define({ className: "EveChildRef", family: "eve/child" })
@carbon.inherit(IInitialize, INotify)
export class EveChildRef extends EveChildTransform
{

  /** m_translation (Vector3) [READWRITE, PERSIST] - EveChildRef_Blue.cpp:28 */
  @edit.readwrite
  @edit.persist
  @type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] - EveChildRef_Blue.cpp:29 */
  @edit.readwrite
  @edit.persist
  @type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] - EveChildRef_Blue.cpp:30 */
  @edit.readwrite
  @edit.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.boolean
  display = true;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_loadChildAutomatically (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  loadChildAutomatically = true;

  /** m_resPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  resPath = "";

  /** m_child (IEveSpaceObjectChildPtr) [READ] */
  @edit.read
  @type.objectRef("IEveSpaceObjectChild")
  child = null;

  /** Which LoadChild request is current, so a superseded load is dropped. */
  _loadRequest = 0;

  /** Carbon EveChildRef::GetResPath (cpp:22-25). */
  @carbon.method
  @impl.implemented
  GetResPath()
  {
    return this.resPath;
  }

  /** Carbon EveChildRef::SetResPath (cpp:27-37): set, then load when automatic. */
  @carbon.method
  @impl.implemented
  SetResPath(resPath)
  {
    this.resPath = String(resPath ?? "");
    this.OnModified("resPath");
  }

  /** Carbon EveChildRef::Reload (cpp:39-45). */
  @carbon.method
  @impl.implemented
  Reload(bypassAutoLoadBlocker = false)
  {
    if (this.loadChildAutomatically || bypassAutoLoadBlocker) this.LoadChild();
  }

  /** Carbon EveChildRef::SetAutoLoadBlocker (cpp:47-50). */
  @carbon.method
  @impl.implemented
  SetAutoLoadBlocker(shouldBlockAutoLoad)
  {
    this.loadChildAutomatically = !shouldBlockAutoLoad;
  }

  /** Carbon EveChildRef::Initialize (cpp:52-60). */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    if (this.loadChildAutomatically) this.LoadChild();
    return true;
  }

  /** Carbon EveChildRef::OnModified (cpp:62-76). */
  @carbon.method
  @impl.implemented
  OnModified(propertyName = null)
  {
    if (propertyName === "resPath" && this.loadChildAutomatically) this.LoadChild();
    if (propertyName === "display") this.ReRegister();
    return true;
  }

  /**
   * Carbon EveChildRef::LoadChild (cpp:342-360): drops the old child, loads
   * the file as an EveSpaceObjectChild, registers it.
   *
   * Adapted: the load resolves later (see the class note). Returns whether a
   * load was started; a failure logs as Carbon's does.
   */
  @carbon.method
  @impl.adapted
  LoadChild()
  {
    this.UnRegisterComponents();
    this.UnregisterChild(this.child);
    this.child = null;

    const path = this.resPath;
    const request = ++this._loadRequest;
    if (!path) return false;

    Promise.resolve(blue.resMan.LoadObject(path)).then(object =>
    {
      if (request !== this._loadRequest) return;
      const child = CjsSchema.cast(object, EveSpaceObjectChild);
      if (!child)
      {
        CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Red file ${path} is invalid or not an Eve Child type.`);
        return;
      }
      this.child = child;
      this.RegisterChild(child);
      this.RegisterComponents();
    }, error =>
    {
      if (request === this._loadRequest) CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Red file ${path} is invalid or not an Eve Child type. ${error?.message ?? error}`);
    });
    return true;
  }

  /** Carbon EveChildRef::RegisterComponents (cpp:78-87). */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    if (this.IsInRegistry() && this.child !== null && this.display)
    {
      this.child.Register(this.GetComponentRegistry());
    }
  }

  /** Carbon EveChildRef::UnRegisterComponents (cpp:89-98). */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    if (this.IsInRegistry() && this.child !== null)
    {
      this.child.UnRegister(this.GetComponentRegistry());
    }
  }

  /** Carbon EveChildRef::GetEffectChildByName (cpp:100-107). */
  @carbon.method
  @impl.implemented
  GetEffectChildByName(name)
  {
    return typeof this.child?.GetEffectChildByName === "function" ? this.child.GetEffectChildByName(name) : null;
  }

  /** Carbon EveChildRef::AddToEffectChildrenList (cpp:109-115). */
  @carbon.method
  @impl.implemented
  AddToEffectChildrenList(child)
  {
    if (typeof this.child?.AddToEffectChildrenList === "function") this.child.AddToEffectChildrenList(child);
  }

  /** Carbon EveChildRef::RemoveFromEffectChildrenList (cpp:117-123). */
  @carbon.method
  @impl.implemented
  RemoveFromEffectChildrenList(child)
  {
    if (typeof this.child?.RemoveFromEffectChildrenList === "function") this.child.RemoveFromEffectChildrenList(child);
  }

  /** Carbon EveChildRef::SetProceduralContainerVariable (cpp:125-131). */
  @carbon.method
  @impl.implemented
  SetProceduralContainerVariable(name, value)
  {
    this.child?.SetProceduralContainerVariable(name, value);
  }

  /** Carbon EveChildRef::UpdateVisibility (cpp:133-143). */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform, parentLod)
  {
    if (!this.display) return;
    this.child?.UpdateVisibility(updateContext, parentTransform, parentLod);
  }

  /** Carbon EveChildRef::GetRenderables (cpp:145-151). */
  @carbon.method
  @impl.implemented
  GetRenderables(renderables)
  {
    if (this.display && this.child) this.child.GetRenderables(renderables);
  }

  /**
   * Carbon EveChildRef::GetBoundingSphere (cpp:153-163): the child's normal
   * bounds, whatever query was asked.
   */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(sphere, _query)
  {
    return this.child ? this.child.GetBoundingSphere(sphere, 0) === true : false;
  }

  /** Carbon EveChildRef::RegisterWithQuadRenderer (cpp:165-171). */
  @carbon.method
  @impl.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    this.child?.RegisterWithQuadRenderer(quadRenderer);
  }

  /** Carbon EveChildRef::AddQuadsToQuadRenderer (cpp:173-179). */
  @carbon.method
  @impl.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (this.display && this.child) this.child.AddQuadsToQuadRenderer(frustum, quadRenderer);
  }

  /** Carbon EveChildRef::UpdateSyncronous (cpp:181-192). */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext, params)
  {
    if (!this.child) return;
    this.child.UpdateSyncronous(updateContext, this._ChildParams(params));
  }

  /** Carbon EveChildRef::UpdateAsyncronous (cpp:194-209): the transform first, then the child. */
  @carbon.method
  @impl.implemented
  UpdateAsyncronous(updateContext, params)
  {
    this.UpdateTransform(params?.localToWorldTransform);
    if (this.child) this.child.UpdateAsyncronous(updateContext, this._ChildParams(params));
  }

  /** The params the child gets: visible only if this is displayed, parented and placed here. */
  _ChildParams(params)
  {
    return {
      ...params,
      isVisible: (params?.isVisible !== false) && this.display,
      childParent: this,
      localToWorldTransform: this.worldTransform
    };
  }

  /** Carbon EveChildRef::GetLocalToWorldTransform (cpp:211-214). */
  @carbon.method
  @impl.implemented
  GetLocalToWorldTransform(transform)
  {
    transform.set(this.worldTransform);
    return transform;
  }

  /** Carbon EveChildRef::PlayCurveSet (cpp:216-222). */
  @carbon.method
  @impl.implemented
  PlayCurveSet(name, rangeName = "")
  {
    if (typeof this.child?.PlayCurveSet === "function") this.child.PlayCurveSet(name, rangeName);
  }

  /** Carbon EveChildRef::StopCurveSet (cpp:224-230). */
  @carbon.method
  @impl.implemented
  StopCurveSet(name)
  {
    if (typeof this.child?.StopCurveSet === "function") this.child.StopCurveSet(name);
  }

  /** Carbon EveChildRef::UpdateCurveSet (cpp:232-238). */
  @carbon.method
  @impl.implemented
  UpdateCurveSet(name, time)
  {
    if (typeof this.child?.UpdateCurveSet === "function") this.child.UpdateCurveSet(name, time);
  }

  /**
   * Carbon EveChildRef::GetCurveSetDuration (cpp:240-247). Quirk, ported as
   * written: Carbon calls the child and discards its result, so this is
   * always 0.
   */
  @carbon.method
  @impl.implemented
  GetCurveSetDuration(name)
  {
    if (typeof this.child?.GetCurveSetDuration === "function") this.child.GetCurveSetDuration(name);
    return 0;
  }

  /** Carbon EveChildRef::GetRangeDuration (cpp:249-256). Same quirk: always 0. */
  @carbon.method
  @impl.implemented
  GetRangeDuration(name, rangeName)
  {
    if (typeof this.child?.GetRangeDuration === "function") this.child.GetRangeDuration(name, rangeName);
    return 0;
  }

  /** Carbon EveChildRef::PlayAllCurveSets (cpp:258-264). */
  @carbon.method
  @impl.implemented
  PlayAllCurveSets()
  {
    if (typeof this.child?.PlayAllCurveSets === "function") this.child.PlayAllCurveSets();
  }

  /** Carbon EveChildRef::SetShaderOption (cpp:266-272). */
  @carbon.method
  @impl.implemented
  SetShaderOption(name, value)
  {
    this.child?.SetShaderOption(name, value);
  }

  /** Carbon EveChildRef::ChangeLOD (cpp:279-285). */
  @carbon.method
  @impl.implemented
  ChangeLOD(lod)
  {
    this.child?.ChangeLOD(lod);
  }

  /** Carbon EveChildRef::SetControllerVariable (cpp:287-293). */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    this.child?.SetControllerVariable(name, value);
  }

  /** Carbon EveChildRef::HandleControllerEvent (cpp:295-301). */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    this.child?.HandleControllerEvent(name);
  }

  /** Carbon EveChildRef::SetInheritProperties (cpp:303-312). */
  @carbon.method
  @impl.implemented
  SetInheritProperties(colorSet)
  {
    const owner = this.child ? CjsSchema.cast(this.child, IEveInheritPropertiesOwner) : null;
    if (owner) owner.SetInheritProperties(colorSet);
  }

  /** Carbon EveChildRef::StartControllers (cpp:314-320). */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    this.child?.StartControllers();
  }

  /** Carbon EveChildRef::FindSoundEmitter (cpp:362-369). */
  @carbon.method
  @impl.implemented
  FindSoundEmitter(name)
  {
    return typeof this.child?.FindSoundEmitter === "function" ? this.child.FindSoundEmitter(name) : null;
  }

  /** Carbon EveChildRef::SetOwner (cpp:371-381). */
  @carbon.method
  @impl.implemented
  SetOwner(owner)
  {
    if (this.GetOwner() === owner) return;
    super.SetOwner(owner);
    if (this.child) this.child.SetOwner(owner);
  }

  /** Carbon EveChildRef::SetPartTag (cpp:383-393). */
  @carbon.method
  @impl.implemented
  SetPartTag(tag)
  {
    const next = Number(tag) >>> 0;
    if (this.GetPartTag() === next) return;
    super.SetPartTag(next);
    if (this.child) this.child.SetPartTag(next);
  }

}

// EveChildRef_Blue.cpp: native exposure; unported contracts: IEveEffectChildrenOwner, IShaderConfigurer.
carbon.interfaceTable({ interfaces: [EveChildRef, EveSpaceObjectChild, IEveSpaceObjectChild, ITr2CurveSetOwner, IInitialize, INotify, ITr2SoundEmitterOwner, EveEntity], chainTo: null })(EveChildRef, { kind: "class" });
