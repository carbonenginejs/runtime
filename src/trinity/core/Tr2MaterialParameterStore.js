// Source: trinity/trinity/Tr2MaterialParameterStore.h
// Source: trinity/trinity/Tr2MaterialParameterStore.cpp
// Source: trinity/trinity/Tr2MaterialParameterStore_Blue.cpp
import { meta } from "#schema";
import { blue, IInitialize, INotify } from "#blue";
import { mappedInterfaces } from "../../global/compose/interface.js";
import * as CcpLog from "../../global/logging/ccpLog.js";

/** Local shader parameter overrides with an optional resource-loaded parent store. */
@meta.define({ className: "Tr2MaterialParameterStore", family: "trinityCore" })
@meta.blue.inherit(INotify)
export class Tr2MaterialParameterStore extends IInitialize
{
  /**
   * Native m_name: authored material name.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /**
   * Native m_parentPath string: resource address of the inherited material.
   * Retains the existing JavaScript path declaration for resource addressing.
   * @type {string}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  parentPath = "";

  /**
   * Native m_parentStore: loaded parent searched after local overrides.
   * @type {Tr2MaterialParameterStore|null}
   */
  @meta.blue.read
  @meta.type.objectRef("Tr2MaterialParameterStore")
  parent = null;

  /**
   * Native m_parameters: named local effect parameters, including null shadows.
   * @type {Map<string, import("../shader/parameter/ITriEffectParameter.js").ITriEffectParameter|null>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.map("ITriEffectParameter")
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
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    this._LoadParentResource();
    return true;
  }

  /**
   * Reloads only when the notified native parentPath member changes.
   * Adapted: JavaScript receives the member name instead of a Be::Var pointer.
   * @param {string|null} propertyName Changed declaration name.
   * @returns {boolean} True after handling the notification.
   */
  @meta.blue.method
  @meta.adapted
  OnModified(propertyName)
  {
    if (propertyName === "parentPath") this._LoadParentResource();
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
  async _LoadParentResource()
  {
    const path = this.parentPath;
    const request = ++this._loadRequest;
    this.parent = null;
    if (!path) return null;

    let object;
    try
    {
      object = await blue.resMan.LoadObject(path);
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
    const parent = object && mappedInterfaces(object.constructor).has(Tr2MaterialParameterStore) ? object : null;
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
  @meta.blue.method
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

meta.blue.interfaceTable({ interfaces: [INotify, IInitialize, Tr2MaterialParameterStore], chainTo: null })(Tr2MaterialParameterStore);
