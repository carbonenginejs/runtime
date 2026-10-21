import { exposure as be } from "#be";
import { CjsSchema } from "#schema";
// Source: trinity/trinity/Controllers/Actions/Tr2ActionOverlay.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionOverlay.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionOverlay_Blue.cpp
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { blue, CjsBlueClasses } from "#blue";
import { meta, type } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Carbon's BlueCastPtr: a silent QueryInterface for a class asked of Blue by
 * its Carbon name (BlueSmartPtr.h:289-301), so the controllers do not import
 * Eve; null for a null object. An unregistered class throws: Carbon's cast
 * target always exists.
 */
function CastTo(value, className)
{
  const registration = blue.classes.GetClassRegistration(className);
  if (!registration) throw new Error(`Tr2ActionOverlay: class ${className} is not registered with Blue`);
  if (!value || typeof value !== "object") return null;
  return blue.classes.QueryThisInterface(value, registration.type, value.constructor, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT);
}


/**
 * Controller action that adds a named overlay effect to its owner when the
 * action starts and removes it again when the action stops.
 */
@be.define("Tr2ActionOverlay")
export class Tr2ActionOverlay extends ITr2ControllerAction
{
  /**
   * Resource path for loading the overlay when no matching overlay exists.
   * @type {string}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.path("object")
  path = "";

  /**
   * Name used to find an existing overlay and assign to a newly loaded one.
   * @type {string}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  overlayName = "";

  /**
   * Named parameter or stretch endpoint used to redirect overlay ownership when the controller owner cannot hold overlays.
   * @type {string}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  targetAnotherOwner = "";

  /**
   * Whether Start may load and attach an overlay when none is already found.
   * @type {boolean}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  addOnStart = true;

  /**
   * Whether Stop removes the retained overlay from the resolved owner.
   * @type {boolean}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  removeOnStop = true;

  /** Carbon m_overlay: the overlay found or loaded by Start, until Stop. */
  _overlay = null;

  /** Counts loads, so a Stop or a newer Start discards one still in flight. */
  _loadRequest = 0;

  /**
   * Carbon Start (Tr2ActionOverlay.cpp:18-75): the controller owner as an
   * EveSpaceObject2, or else the space object targetAnotherOwner names on a
   * multi-effect or a stretch; then load the overlay and rebind a redirected
   * owner.
   *
   * Adapted: the load is asynchronous (see LoadOverlay), so a redirected
   * owner is rebound once it settles.
   */

  @meta.adapted
  Start(controller)
  {
    const controllerOwner = controller.GetOwner();
    let owner = CastTo(controllerOwner, "EveSpaceObject2");
    let rebind = false;
    if (!owner)
    {
      if (this.targetAnotherOwner) owner = this._GetRedirectedOwner(controllerOwner);
      if (!owner) return;
      rebind = true;
    }
    const loading = this.LoadOverlay(owner);
    if (!rebind) return;
    if (loading) loading.then(() => this._Rebind(controllerOwner));
    else this._Rebind(controllerOwner);
  }

  /**
   * Carbon Stop (Tr2ActionOverlay.cpp:77-121): with removeOnStop, remove the
   * overlay from the owner Start would resolve.
   *
   * Adapted: also discards a load still in flight.
   */

  @meta.adapted
  Stop(controller)
  {
    this._loadRequest++;
    if (!this._overlay) return;
    const controllerOwner = controller.GetOwner();
    let owner = CastTo(controllerOwner, "EveSpaceObject2");
    if (!owner && this.targetAnotherOwner) owner = this._GetRedirectedOwner(controllerOwner);
    if (owner && this.removeOnStop) owner.RemoveOverlayEffect(this._overlay);
    this._overlay = null;
  }

  /**
   * Carbon LoadOverlay (Tr2ActionOverlay.cpp:123-163): the owner's overlay of
   * overlayName, else - with addOnStart and a path - the path, lower-cased
   * and given or stripped of "_skinned" to match the owner, loaded as an
   * EveMeshOverlayEffect, named, added and started.
   *
   * Adapted: Carbon loads synchronously as an urgent load; the JS resource
   * manager resolves asynchronously, so the overlay is added when the file
   * arrives, and a Stop or a newer Start before then discards it.
   *
   * @param {object} owner The EveSpaceObject2.
   * @returns {Promise<void>|null} The pending load, or null when none started.
   */

  @meta.adapted
  LoadOverlay(owner)
  {
    this._overlay = null;
    if (this.overlayName) this._overlay = owner.GetOverlayEffectByName(this.overlayName);
    if (!this.addOnStart || this._overlay || !this.path) return null;

    let path = this.path.toLowerCase();
    if (owner.IsAnimated() && !path.includes("_skinned"))
    {
      // StringInsertStubBefore: before the LAST ".red" (StringUtils.h:11-20).
      const index = path.lastIndexOf(".red");
      if (index !== -1) path = path.slice(0, index) + "_skinned" + path.slice(index);
    }
    else if (!owner.IsAnimated() && path.includes("_skinned"))
    {
      // StringRemove: the FIRST "_skinned" only (StringUtils.h:58-68).
      path = path.replace("_skinned", "");
    }

    const request = ++this._loadRequest;
    return Promise.resolve(blue.resMan.LoadObject(path)).then(object =>
    {
      if (request !== this._loadRequest) return;
      const overlay = CastTo(object, "EveMeshOverlayEffect");
      if (!overlay)
      {
        CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Tr2ActionOverlay: ${path} is not an EveMeshOverlayEffect`);
        return;
      }
      this._overlay = overlay;
      if (this.overlayName) overlay.name = this.overlayName;
      owner.AddOverlayEffect(overlay);
      overlay.StartControllers();
    }, error =>
    {
      if (request === this._loadRequest) CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Tr2ActionOverlay: ${path} failed to load. ${error?.message ?? error}`);
    });
  }

  /**
   * The space object targetAnotherOwner names when the controller owner is
   * not one (Tr2ActionOverlay.cpp:25-52, :88-113): a multi-effect parameter's
   * object, or a stretch's source or destination space object.
   *
   * @param {object} controllerOwner The controller's owner.
   * @returns {object|null} The EveSpaceObject2, or null.
   */
  _GetRedirectedOwner(controllerOwner)
  {
    const multiEffect = CastTo(controllerOwner, "EveMultiEffect");
    if (multiEffect)
    {
      const parameter = multiEffect.GetParameterByName(this.targetAnotherOwner);
      return parameter ? CastTo(parameter.GetParameterObject(), "EveSpaceObject2") : null;
    }
    const stretch = CastTo(controllerOwner, "EveStretch3");
    if (!stretch) return null;
    let object = null;
    if (this.targetAnotherOwner === "SourceSpaceObject") object = stretch.GetSourceSpaceObject();
    if (this.targetAnotherOwner === "DestSpaceObject") object = stretch.GetDestSpaceObject();
    return object ? CastTo(object, "EveSpaceObject2") : null;
  }

  /** Carbon Start's rebind of a redirected owner (Tr2ActionOverlay.cpp:64-74). */
  _Rebind(controllerOwner)
  {
    const multiEffect = CastTo(controllerOwner, "EveMultiEffect");
    if (multiEffect)
    {
      multiEffect.Rebind(true);
      return;
    }
    const stretch = CastTo(controllerOwner, "EveStretch3");
    if (stretch) stretch.Rebind(true);
  }
}

// Native exposure ends at this concrete table (Tr2ActionOverlay_Blue.cpp:12-13,37).
CjsSchema.exposure.mapInterface(ITr2ControllerAction)(Tr2ActionOverlay);
