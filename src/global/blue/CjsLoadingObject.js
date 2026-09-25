import { CjsResource } from "./CjsResource.js";
import { ResourceHandlerMode } from "./ResourceHandlerMode.js";

/**
 * Resource-compatible handler whose public loading result is the constructed
 * object produced by an extension route.
 *
 * The handler reuses CjsResource lifecycle, queue, reload, and payload
 * retention mechanics. CjsResMan keeps the handler internal to its canonical
 * cache while `GetObject()` and path-only `Fetch()` expose its payload.
 */
export class CjsLoadingObject extends CjsResource
{
  /** The handler borrows resource mechanics but is not itself a domain resource. */
  static isResource = false;

  static handlerMode = ResourceHandlerMode.OBJECT;
}

export default CjsLoadingObject;
