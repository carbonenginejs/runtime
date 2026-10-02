import { BitmapDimensions, Cutout, HostBitmap, Metadata } from "#imageio";

/**
 * Materialize a DDS worker result as the canonical mutable image object.
 *
 * Format results can be shared by the manager's decoded cache. Copy storage
 * into this resource's bitmap so later image mutations cannot modify another
 * resource or the retained decode. This copies bytes; it does not decode again.
 * The bridge stays in the DDS resource route and requires no shared bitmap or
 * serialization changes.
 *
 * @param {object} payload Plain CjsDdsFormat bitmap output.
 * @returns {HostBitmap} Independently owned bitmap with native class identity.
 */
export function createDdsBitmap(payload)
{
  const bitmap = new HostBitmap();
  if (!(payload.data instanceof Uint8Array)
    || !bitmap.CreateFromBitmapDimensions(new BitmapDimensions(payload.description))
    || bitmap.GetRawDataSize() !== payload.data.byteLength)
  {
    throw new TypeError("Invalid DDS bitmap payload.");
  }
  bitmap.GetRawData().set(payload.data);
  const metadata = new Metadata();
  metadata.cutout = Object.assign(new Cutout(), payload.metadata.cutout);
  metadata.metadata = payload.metadata.metadata.slice();
  bitmap.metadata = metadata;
  return bitmap;
}
