import { CjsSchema } from "#schema/CjsSchema";
import { blue } from "./blue.js";
import { BlueAsyncRes } from "./BlueAsyncRes.js";
import { ResourceHandlerMode } from "../consts/resourceHandlerMode.js";

/**
 * Internal asynchronous object reader. JavaScript cannot block on Carbon's
 * LoadObject read, so resMan retains its builder and constructs per caller.
 * LoadObject exposes the graph, never this handler's native notify surface.
 */
export class CjsLoadingObject extends BlueAsyncRes
{
  /** Internal data carrier, not a domain resource. */
  static isResource = false;
  /** Object routes construct independently for each LoadObject caller. */
  static handlerMode = ResourceHandlerMode.OBJECT;

  /** Read through the configured reader; resMan retains plain data/builders. */
  _DoLoad()
  {
    return blue.resMan._LoadObjectData(this);
  }

  /** No device preparation is needed for a cached object builder. */
  _DoPrepare()
  {
    return true;
  }

  /**
   * Drop retained builder data at explicit JS cleanup, honoring MotherLode policy.
   * @param {object} [options={}] Existing releasePayload switch.
   * @returns {void}
   */
  _OnShutdown(options = {})
  {
    if (options.releasePayload !== false) blue.resMan.ReleaseResourcePayload(this);
  }
}

export default CjsLoadingObject;
CjsSchema.meta.define("CjsLoadingObject")(CjsLoadingObject);

CjsSchema.decorateMethod(CjsLoadingObject, "_DoLoad", CjsSchema.meta.adapted);

CjsSchema.decorateMethod(CjsLoadingObject, "_DoPrepare", CjsSchema.meta.adapted);

CjsSchema.decorateMethod(CjsLoadingObject, "_OnShutdown", CjsSchema.meta.adapted);
