// Source: trinity/trinity/Tr2MaterialParameterStore.h
// Source: trinity/trinity/Tr2MaterialParameterStore.cpp
// Source: trinity/trinity/Tr2MaterialParameterStore_Blue.cpp
import { meta, type, blue } from "#schema";
import { IsMatch, be, IInitialize, INotify, CjsBlueClasses } from "#blue";
import * as CcpLog from "../../global/logging/ccpLog.js";

/** Local shader parameter overrides with an optional resource-loaded parent store. */
@blue.define("Tr2MaterialParameterStore")
@blue.inherit(INotify)
@blue.interface(INotify, IInitialize)
export class Tr2MaterialParameterStore extends IInitialize
{
  /**
   * Native m_name: authored material name.
   * @type {string}
   */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /**
   * Native m_parentPath string: resource address of the inherited material.
   * Retains the existing JavaScript path declaration for resource addressing.
   * @type {string}
   */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.path("object")
  parentPath = "";

  /**
   * Native m_parentStore: loaded parent searched after local overrides.
   * @type {Tr2MaterialParameterStore|null}
   */
  @blue.read
  @type.rootRef("Tr2MaterialParameterStore")
  parent = null;

  /**
   * Native m_parameters: named local effect parameters, including null shadows.
   * @type {Map<string, import("../shader/parameter/ITriEffectParameter.js").ITriEffectParameter|null>}
   */
  @blue.read
  @blue.persist
  @type.map("ITriEffectParameter")
  parameters = new Map();

  /**
   * Latest async parent request; prevents earlier completions replacing it.
   * @type {number}
   */
  _loadRequest = 0;

  /**
   * Requests the authored parent after Blue finishes populating this store.
   * Adapted: the existing resource manager completes LoadObject asynchronously.
   * @returns {boolean} True after starting or clearing the parent request.
   */
  @blue.method
  @meta.adapted
  Initialize()
  {
    this._LoadParentResource();
    return true;
  }

  /**
   * Reloads only when the notified native parentPath member changes.
   * @param {string|null} propertyName Changed declaration name.
   * @returns {boolean} True after handling the notification.
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "parentPath")) this._LoadParentResource();
    return true;
  }

  /**
   * Releases the old parent before the native typed LoadObject request.
   * Adapted: JavaScript drops the reference instead of unlocking a BluePtr.
   * Awaiting the existing manager needs stale-result guards; failures leave
   * the parent empty and are logged. No resource-manager lifecycle is added.
   * @returns {Promise<Tr2MaterialParameterStore|null>} Accepted current parent.
   */
  @meta.adapted
  @meta.renamed("LoadParentResource")
  async _LoadParentResource()
  {
    const path = this.parentPath;
    const request = ++this._loadRequest;
    this.parent = null;
    if (!path) return null;

    let object;
    try
    {
      object = await be.resMan.LoadObject(path);
    }
    catch (error)
    {
      if (request === this._loadRequest && path === this.parentPath)
      {
        CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Material parent ${path} failed to load: ${error?.message ?? error}`);
      }
      return null;
    }
    if (request !== this._loadRequest || path !== this.parentPath) return null;
    const parent = object ? be.classes.QueryThisInterface(object, Tr2MaterialParameterStore, object.constructor, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) : null;
    if (!parent)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Resource ${path} is not a Tr2MaterialParameterStore.`);
      return null;
    }
    this.parent = parent;
    return parent;
  }

  /**
   * Looks a parameter up locally, then walks the parent chain.
   * @param {string} name Parameter name.
   * @returns {object|null} First entry, including a local null shadow, or null.
   */
  @blue.method
  @meta.implemented
  FindParameter(name)
  {
    let currentStore = this;
    while (currentStore)
    {
      const parameter = currentStore.parameters.get(name);
      if (parameter !== undefined)
      {
        return parameter;
      }
      currentStore = currentStore.parent;
    }
    return null;
  }
}

