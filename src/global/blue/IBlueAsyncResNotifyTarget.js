// Source: blue/include/BlueAsyncRes.h:23-28
import { CjsSchema, meta } from "#schema";

/**
 * Receives notifications from an asynchronously loaded resource.
 *
 * Carbon: IBlueAsyncResNotifyTarget (blue/include/BlueAsyncRes.h:23-28)
 *
 * A plain C++ interface, not a Blue one: Carbon never exposes it, so it carries
 * no exposure. `BlueAsyncRes` calls `RebuildCachedData` when a load finishes
 * (or at once, for a target added to a prepared resource) and
 * `ReleaseCachedData` before a reload.
 */
export class IBlueAsyncResNotifyTarget
{
  /**
   * `ReleaseCachedData( BlueAsyncRes* p )` - drop data derived from the resource.
   *
   * @param {import("./BlueAsyncRes.js").BlueAsyncRes} _resource The notifying resource.
   */
  ReleaseCachedData(_resource) {}

  /**
   * `RebuildCachedData( BlueAsyncRes* p )` - rebuild data derived from the resource.
   *
   * @param {import("./BlueAsyncRes.js").BlueAsyncRes} _resource The notifying resource.
   */
  RebuildCachedData(_resource) {}
}

CjsSchema.decorateMethod(IBlueAsyncResNotifyTarget, "ReleaseCachedData", meta.abstract);
CjsSchema.decorateMethod(IBlueAsyncResNotifyTarget, "RebuildCachedData", meta.abstract);
CjsSchema.meta.carbon("IBlueAsyncResNotifyTarget")(IBlueAsyncResNotifyTarget);
