import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildRef.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildRef.cpp
import { IShaderConfigurer } from "../../shader/IShaderConfigurer.js";
import { EveEntity } from "../EveEntity.js";
import { ITr2SoundEmitterOwner } from "../ITr2SoundEmitterOwner.js";
import { INotify } from "../../../global/blue/INotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { ITr2CurveSetOwner } from "../../curves/ITr2CurveSetOwner.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
// Hand-maintained from Carbon source, promoted out of generated intake.
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { IsMatch, blue } from "#blue";
import { CjsSchema, meta, type } from "#schema";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { quat } from "#math/quat";
import { EveChildTransform } from "./EveChildTransform.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { IEveInheritPropertiesOwner } from "../IEveInheritPropertiesOwner.js";
import { IEveEffectChildrenOwner } from "./IEveEffectChildrenOwner.js";

/**
 * A child that loads another space-object child from a red/black file by path
 * and forwards the child interface to it (EveChildRef.cpp).
 *
 * One divergence, forced: Carbon's BeResMan->LoadObject returns the object
 * synchronously; the JS resource manager resolves it asynchronously, so the
 * child joins (registered and forwarded to) once the file has loaded.
 */
@be.define("EveChildRef")
@be.inherit(ITr2CurveSetOwner, IInitialize, INotify)
@be.mapInterface(EveSpaceObjectChild)
@be.mapInterface(IEveSpaceObjectChild)
@be.mapInterface(ITr2CurveSetOwner)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
@be.mapInterface(IEveEffectChildrenOwner)
@be.mapInterface(IShaderConfigurer)
@be.mapInterface(ITr2SoundEmitterOwner)
@be.mapInterface(EveEntity)
@be.inherit(IEveEffectChildrenOwner, ITr2SoundEmitterOwner)
@be.mapMethodAndWrap([ "RebuildLocalTransform", "GetParent", "GetOwner" ])
@be.mapPropertyReadOnly__Field("partTag")
@be.mapAttribute(be.READ, "worldTransform")
@be.mapAttribute(be.READWRITE | be.PERSIST, "useSRT")
@be.mapAttribute(be.READWRITE | be.PERSIST, "staticTransform")
export class EveChildRef extends EveChildTransform
{

  /** m_translation (Vector3) [READWRITE, PERSIST] - EveChildRef_Blue.cpp:28 */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] - EveChildRef_Blue.cpp:29 */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] - EveChildRef_Blue.cpp:30 */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_localTransform (Matrix) [READWRITE, PERSIST] (EveChildRef_Blue.cpp:31) */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.mat4
  localTransform = mat4.create();

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.boolean
  display = true;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_loadChildAutomatically (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  loadChildAutomatically = true;

  /** m_resPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.path("object")
  resPath = "";

  /** m_child (IEveSpaceObjectChildPtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("IEveSpaceObjectChild")
  child = null;

  /** Which LoadChild request is current, so a superseded load is dropped. */
  _loadRequest = 0;

  /**
   * Carbon EveChildRef::GetResPath (cpp:22-25).
   *
   * @implemented
   */

  @meta.implemented
  GetResPath()
  {
    return this.resPath;
  }

  /**
   * Carbon EveChildRef::SetResPath (cpp:27-37): set, then load when automatic.
   *
   * @implemented
   */

  @meta.implemented
  SetResPath(resPath)
  {
    this.resPath = String(resPath ?? "");
    this.OnModified("resPath");
  }

  /**
   * Carbon EveChildRef::Reload (cpp:39-45).
   *
   * @implemented
   */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.implemented
  Reload(bypassAutoLoadBlocker = false)
  {
    if (this.loadChildAutomatically || bypassAutoLoadBlocker) this.LoadChild();
  }

  /**
   * Carbon EveChildRef::SetAutoLoadBlocker (cpp:47-50).
   *
   * @implemented
   */

  @meta.implemented
  SetAutoLoadBlocker(shouldBlockAutoLoad)
  {
    this.loadChildAutomatically = !shouldBlockAutoLoad;
  }

  /**
   * Carbon EveChildRef::Initialize (cpp:52-60).
   *
   * @implemented
   */

  @meta.implemented
  Initialize()
  {
    if (this.loadChildAutomatically) this.LoadChild();
    return true;
  }

  /**
   * Carbon EveChildRef::OnModified (cpp:62-76).
   *
   * @implemented
   */

  @meta.implemented
  OnModified(propertyName = null)
  {
    if (IsMatch(propertyName, "resPath") && this.loadChildAutomatically) this.LoadChild();
    if (IsMatch(propertyName, "display")) this.ReRegister();
    return true;
  }

  /**
   * Carbon EveChildRef::LoadChild (cpp:342-360): drops the old child, loads
   * the file as an EveSpaceObjectChild, registers it.
   *
   * @adapted the load resolves later (see the class note). Returns whether a
   *   load was started; a failure logs as Carbon's does.
   */

  @meta.adapted
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

  /**
   * Carbon EveChildRef::RegisterComponents (cpp:78-87).
   *
   * @implemented
   */

  @meta.implemented
  RegisterComponents()
  {
    if (this.IsInRegistry() && this.child !== null && this.display)
    {
      this.child.Register(this.GetComponentRegistry());
    }
  }

  /**
   * Carbon EveChildRef::UnRegisterComponents (cpp:89-98).
   *
   * @implemented
   */

  @meta.implemented
  UnRegisterComponents()
  {
    if (this.IsInRegistry() && this.child !== null)
    {
      this.child.UnRegister(this.GetComponentRegistry());
    }
  }

  /**
   * Carbon EveChildRef::GetEffectChildByName (cpp:100-107).
   *
   * @implemented
   */

  @meta.implemented
  GetEffectChildByName(name)
  {
    const owner = CjsSchema.cast(this.child, IEveEffectChildrenOwner);
    return owner === null ? null : owner.GetEffectChildByName(name);
  }

  /**
   * Carbon EveChildRef::AddToEffectChildrenList (cpp:109-115).
   *
   * @implemented
   */

  @meta.implemented
  AddToEffectChildrenList(child)
  {
    CjsSchema.cast(this.child, IEveEffectChildrenOwner)?.AddToEffectChildrenList(child);
  }

  /**
   * Carbon EveChildRef::RemoveFromEffectChildrenList (cpp:117-123).
   *
   * @implemented
   */

  @meta.implemented
  RemoveFromEffectChildrenList(child)
  {
    CjsSchema.cast(this.child, IEveEffectChildrenOwner)?.RemoveFromEffectChildrenList(child);
  }

  /**
   * Carbon EveChildRef::SetProceduralContainerVariable (cpp:125-131).
   *
   * @implemented
   */

  @meta.implemented
  SetProceduralContainerVariable(name, value)
  {
    this.child?.SetProceduralContainerVariable(name, value);
  }

  /**
   * Carbon EveChildRef::UpdateVisibility (cpp:133-143).
   *
   * @implemented
   */

  @meta.implemented
  UpdateVisibility(updateContext, parentTransform, parentLod)
  {
    if (!this.display) return;
    this.child?.UpdateVisibility(updateContext, parentTransform, parentLod);
  }

  /**
   * Carbon EveChildRef::GetRenderables (cpp:145-151).
   *
   * @implemented
   */

  @meta.implemented
  GetRenderables(renderables)
  {
    if (this.display && this.child) this.child.GetRenderables(renderables);
  }

  /**
   * Carbon EveChildRef::GetBoundingSphere (cpp:153-163): the child's normal
   * bounds, whatever query was asked.
   *
   * @implemented
   */

  @meta.implemented
  GetBoundingSphere(sphere, _query)
  {
    return this.child ? this.child.GetBoundingSphere(sphere, 0) === true : false;
  }

  /**
   * Carbon EveChildRef::RegisterWithQuadRenderer (cpp:165-171).
   *
   * @implemented
   */

  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    this.child?.RegisterWithQuadRenderer(quadRenderer);
  }

  /**
   * Carbon EveChildRef::AddQuadsToQuadRenderer (cpp:173-179).
   *
   * @implemented
   */

  @meta.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (this.display && this.child) this.child.AddQuadsToQuadRenderer(frustum, quadRenderer);
  }

  /**
   * Carbon EveChildRef::UpdateSyncronous (cpp:181-192).
   *
   * @implemented
   */

  @meta.implemented
  UpdateSyncronous(updateContext, params)
  {
    if (!this.child) return;
    this.child.UpdateSyncronous(updateContext, this._ChildParams(params));
  }

  /**
   * Carbon EveChildRef::UpdateAsyncronous (cpp:194-209): the transform first, then the child.
   *
   * @implemented
   */

  @meta.implemented
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

  /**
   * Carbon EveChildRef::GetLocalToWorldTransform (cpp:211-214).
   *
   * @implemented
   */

  @meta.implemented
  GetLocalToWorldTransform(transform)
  {
    transform.set(this.worldTransform);
    return transform;
  }

  /**
   * Carbon EveChildRef::PlayCurveSet (cpp:216-222).
   *
   * @implemented
   */

  @meta.implemented
  PlayCurveSet(name, rangeName = "")
  {
    const owner = CjsSchema.cast(this.child, ITr2CurveSetOwner);
    if (owner) owner.PlayCurveSet(name, rangeName);
  }

  /**
   * Carbon EveChildRef::StopCurveSet (cpp:224-230).
   *
   * @implemented
   */

  @meta.implemented
  StopCurveSet(name)
  {
    const owner = CjsSchema.cast(this.child, ITr2CurveSetOwner);
    if (owner) owner.StopCurveSet(name);
  }

  /**
   * Carbon EveChildRef::UpdateCurveSet (cpp:232-238).
   *
   * @implemented
   */

  @meta.implemented
  UpdateCurveSet(name, time)
  {
    const owner = CjsSchema.cast(this.child, ITr2CurveSetOwner);
    if (owner) owner.UpdateCurveSet(name, time);
  }

  /**
   * Carbon EveChildRef::GetCurveSetDuration (cpp:240-247). Quirk, ported as
   * written: Carbon calls the child and discards its result, so this is
   * always 0.
   *
   * @implemented
   */

  @meta.implemented
  GetCurveSetDuration(name)
  {
    const owner = CjsSchema.cast(this.child, ITr2CurveSetOwner);
    if (owner) owner.GetCurveSetDuration(name);
    return 0;
  }

  /**
   * Carbon EveChildRef::GetRangeDuration (cpp:249-256). Same quirk: always 0.
   *
   * @implemented
   */

  @meta.implemented
  GetRangeDuration(name, rangeName)
  {
    const owner = CjsSchema.cast(this.child, ITr2CurveSetOwner);
    if (owner) owner.GetRangeDuration(name, rangeName);
    return 0;
  }

  /**
   * Carbon EveChildRef::PlayAllCurveSets (cpp:258-264).
   *
   * @implemented
   */

  @meta.implemented
  PlayAllCurveSets()
  {
    const owner = CjsSchema.cast(this.child, ITr2CurveSetOwner);
    if (owner) owner.PlayAllCurveSets();
  }

  /**
   * Carbon EveChildRef::SetShaderOption (cpp:266-272).
   *
   * @implemented
   */

  @meta.implemented
  SetShaderOption(name, value)
  {
    this.child?.SetShaderOption(name, value);
  }

  /**
   * Carbon EveChildRef::ChangeLOD (cpp:279-285).
   *
   * @implemented
   */

  @meta.implemented
  ChangeLOD(lod)
  {
    this.child?.ChangeLOD(lod);
  }

  /**
   * Carbon EveChildRef::SetControllerVariable (cpp:287-293).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  SetControllerVariable(name, value)
  {
    this.child?.SetControllerVariable(name, value);
  }

  /**
   * Carbon EveChildRef::HandleControllerEvent (cpp:295-301).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  HandleControllerEvent(name)
  {
    this.child?.HandleControllerEvent(name);
  }

  /**
   * Carbon EveChildRef::SetInheritProperties (cpp:303-312).
   *
   * @implemented
   */

  @meta.implemented
  SetInheritProperties(colorSet)
  {
    const owner = this.child ? CjsSchema.cast(this.child, IEveInheritPropertiesOwner) : null;
    if (owner) owner.SetInheritProperties(colorSet);
  }

  /**
   * Carbon EveChildRef::StartControllers (cpp:314-320).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  StartControllers()
  {
    this.child?.StartControllers();
  }

  /**
   * Carbon EveChildRef::FindSoundEmitter (cpp:362-369).
   *
   * @implemented
   */

  @meta.implemented
  FindSoundEmitter(name)
  {
    const owner = CjsSchema.cast(this.child, ITr2SoundEmitterOwner);
    return owner === null ? null : owner.FindSoundEmitter(name);
  }

  /**
   * Carbon EveChildRef::SetOwner (cpp:371-381).
   *
   * @implemented
   */

  @meta.implemented
  SetOwner(owner)
  {
    if (this.GetOwner() === owner) return;
    super.SetOwner(owner);
    if (this.child) this.child.SetOwner(owner);
  }

  /**
   * Carbon EveChildRef::SetPartTag (cpp:383-393).
   *
   * @implemented
   */

  @meta.implemented
  SetPartTag(tag)
  {
    const next = Number(tag) >>> 0;
    if (this.GetPartTag() === next) return;
    super.SetPartTag(next);
    if (this.child) this.child.SetPartTag(next);
  }

}

// EveChildRef_Blue.cpp: native exposure; unported contracts: IShaderConfigurer.
