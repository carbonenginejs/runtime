import { EveEntity } from "../EveEntity.js";
import { ITr2SoundEmitterOwner } from "../ITr2SoundEmitterOwner.js";
import { INotify } from "../../../global/blue/INotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { ITr2CurveSetOwner } from "../../curves/ITr2CurveSetOwner.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildSocket.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { blue } from "#blue";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { EveChildPlug } from "./EveChildPlug.js";
import { CjsSchema, meta } from "#schema";
import { vec3 } from "#math/vec3";
import { quat } from "#math/quat";
import { EveChildTransform } from "./EveChildTransform.js";
import { EveSocketParameterString } from "../socket/EveSocketParameterString.js";

/** A named attachment point on a ship that resolves and hot-reloads a plugged-in child resource, forwarding controller and registration calls to it. */
@meta.define({ className: "EveChildSocket", family: "eve/child" })
@meta.blue.inherit(IInitialize, INotify)
export class EveChildSocket extends EveChildTransform
{

  /** m_translation (Vector3) [READWRITE, PERSIST] - EveChildSocket_Blue.cpp:28 */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] - EveChildSocket_Blue.cpp:29 */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] - EveChildSocket_Blue.cpp:30 */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** Identifies the current asynchronous native LoadObject translation. */
  _loadRequest = 0;

  /** Calls made during loading, replayed after binding in their original order. */
  _pendingPlugCalls = null;

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_parameters (PIEveSocketParameterVector) [READ, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveSocketParameter")
  parameters = [];

  /** m_plugResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  resPath = "";

  /** m_plug (EveChildPlugPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("EveChildPlug")
  plug = null;

  /**
   * Carbon EveChildSocket.cpp:431-437 forwards an event. Adapted: retain calls
   * made while the synchronous native load is pending in JavaScript.
   */
  @meta.blue.method
  @meta.adapted
  HandleControllerEvent(name)
  {
    if (this._pendingPlugCalls) this._pendingPlugCalls.push(plug => plug.HandleControllerEvent(name));
    else this.plug?.HandleControllerEvent(name);
  }

  /**
   * Carbon BindParameters (EveChildSocket.cpp:146-178), exposed as Rebind by
   * EveChildSocket_Blue.cpp:67-72. Adapted: the existing partial port creates
   * string bindings only; already-authored parameter classes bind directly.
   */
  @meta.blue.method
  @meta.adapted
  BindParameters()
  {
    if (!this.plug) return false;
    for (const parameter of this.parameters) parameter.ClearBindings();
    for (const external of this.plug.externalParameters ?? [])
    {
      let bound = this.parameters.some(parameter => parameter.BindToExternalParameter(external));
      if (!bound && typeof external.GetValue() === "string")
      {
        const parameter = new EveSocketParameterString();
        parameter.SetName(external.GetName());
        bound = parameter.BindToExternalParameter(external);
        if (bound)
        {
          parameter.SetValueToDefault();
          this.parameters.push(parameter);
        }
      }
    }
    return true;
  }

  /** Blue-exposed alias for Carbon BindParameters (EveChildSocket_Blue.cpp:67). */
  @meta.blue.method
  @meta.implemented
  Rebind()
  {
    this.BindParameters();
  }

  /** Carbon EveChildSocket.cpp:174-183 propagates each bound parameter. */
  @meta.blue.method
  @meta.implemented
  Propogate()
  {
    if (this.plug) for (const parameter of this.parameters) parameter.Propagate();
  }

  /**
   * Carbon Initialize (cpp:185-191) always succeeds. Adapted: binding,
   * propagation, and deferred forwarding follow asynchronous LoadChild.
   */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    const operation = this.LoadChild();
    const request = this._loadRequest;
    operation.then(loaded =>
    {
      if (request !== this._loadRequest) return;
      this.BindParameters();
      this.Propogate();
      const pending = this._pendingPlugCalls;
      this._pendingPlugCalls = null;
      if (loaded) for (const call of pending) call(this.plug);
    });
    return true;
  }

  /** Carbon EveChildSocket.cpp:28-31 returns the authored plug path. */
  @meta.blue.method
  @meta.implemented
  GetPlugResPath()
  {
    return this.resPath;
  }

  /**
   * Carbon cpp:33-40 reloads only a changed path, without binding parameters.
   * Adapted: forward calls made during the asynchronous load after arrival;
   * unlike Initialize, this setter does not bind or propagate parameters.
   */
  @meta.blue.method
  @meta.adapted
  SetPlugResPath(path)
  {
    if (this.resPath === path) return;
    this.resPath = path;
    const operation = this.LoadChild();
    const request = this._loadRequest;
    operation.then(loaded =>
    {
      if (request !== this._loadRequest) return;
      const pending = this._pendingPlugCalls;
      this._pendingPlugCalls = null;
      if (loaded) for (const call of pending) call(this.plug);
    });
  }

  /** Carbon EveChildSocket.cpp:42-45 reloads by initializing again. */
  @meta.blue.method
  @meta.implemented
  Reload()
  {
    this.Initialize();
  }

  /** Carbon EveChildSocket.cpp:194-206 reacts to path and display changes. */
  @meta.blue.method
  @meta.implemented
  OnModified(propertyName = null)
  {
    if (propertyName === "resPath") this.Initialize();
    if (propertyName === "display") this.ReRegister();
    return true;
  }

  /**
   * Carbon EveChildSocket.cpp:479-497 replaces its plug through typed LoadObject.
   * Adapted: LoadObject is asynchronous in JS. Discard superseded completions,
   * let the caller finish native binding and deferred forwarding. The promise
   * resolves to the native success boolean; failure logs and leaves no plug.
   */
  @meta.blue.method
  @meta.adapted
  async LoadChild()
  {
    const request = ++this._loadRequest;
    const path = this.resPath;
    this.UnRegisterComponents();
    this.UnregisterChild(this.plug);
    this.plug = null;
    this._pendingPlugCalls = [];
    const channel = CcpLog.GetModuleChannel("trinity");
    CcpLog.CCP_LOG_CH(channel, "Loading child red file %s", path);
    let object = null;
    try
    {
      if (path) object = await blue.resMan.LoadObject(path);
    }
    catch
    {
      // Native typed loading also returns null on resource failure.
    }
    if (request !== this._loadRequest) return false;
    const plug = CjsSchema.cast(object, EveChildPlug);
    if (!plug)
    {
      this._pendingPlugCalls = null;
      CcpLog.CCP_LOGERR_CH(channel, "Red file %s is invalid or not an Eve Child type.", path);
      return false;
    }
    this.plug = plug;
    this.RegisterChild(plug);
    this.RegisterComponents();
    return true;
  }

  /** Propagates the owning space object to the loaded plug. */
  @meta.blue.method
  @meta.implemented
  SetOwner(owner)
  {
    if (this.GetOwner() === owner) return;
    super.SetOwner(owner);
    if (this.plug) this.plug.SetOwner(owner);
  }

  /** Propagates a modular part tag to the loaded plug. */
  @meta.blue.method
  @meta.implemented
  SetPartTag(tag)
  {
    const next = Number(tag) >>> 0;
    if (this.GetPartTag() === next) return;
    super.SetPartTag(next);
    if (this.plug) this.plug.SetPartTag(next);
  }

  /**
   * Carbon cpp:423-429 forwards a variable. Adapted: replay calls made during
   * asynchronous loading after the plug has been registered and bound.
   */
  @meta.blue.method
  @meta.adapted
  SetControllerVariable(name, value)
  {
    if (this._pendingPlugCalls) this._pendingPlugCalls.push(plug => plug.SetControllerVariable(name, value));
    else this.plug?.SetControllerVariable(name, value);
  }

  /**
   * Carbon cpp:447-453 starts the plug controllers. Adapted: defer starts made
   * during loading until the native registration/binding order is complete.
   */
  @meta.blue.method
  @meta.adapted
  StartControllers()
  {
    if (this._pendingPlugCalls) this._pendingPlugCalls.push(plug => plug.StartControllers());
    else this.plug?.StartControllers();
  }

  /** Carbon EveChildSocket::RegisterComponents (cpp:212-221): forward-only to
   * the plug. Gate IsInRegistry() && plug && m_display. */
  @meta.blue.method
  @meta.implemented
  RegisterComponents()
  {
    if (this.IsInRegistry() && this.plug !== null && this.display)
    {
      this.plug.Register(this.GetComponentRegistry());
    }
  }

  /** Carbon EveChildSocket::UnRegisterComponents (cpp:227-236): forwards to
   * the plug; no display re-check. */
  @meta.blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    if (this.IsInRegistry() && this.plug)
    {
      this.plug.UnRegister(this.GetComponentRegistry());
    }
  }

}

// EveChildSocket_Blue.cpp: native exposure; unported contracts: IEveEffectChildrenOwner, IShaderConfigurer.
meta.blue.interfaceTable({ interfaces: [EveChildSocket, EveSpaceObjectChild, IEveSpaceObjectChild, ITr2CurveSetOwner, IInitialize, INotify, ITr2SoundEmitterOwner, EveEntity], chainTo: null })(EveChildSocket, { kind: "class" });
