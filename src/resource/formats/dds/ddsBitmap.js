import { BitmapDimensions, Cutout, HostBitmap, Metadata } from "#imageio";

/**
 * Materialize an image format's bitmap packet - DDS's `readBitmap` or any
 * image format's `readBitmapAsync`, from a worker or this thread - as the
 * canonical mutable image object.
 *
 * Format results can be shared by the manager's decoded cache. Copy storage
 * into this resource's bitmap so later image mutations cannot modify another
 * resource or the retained decode. This copies bytes; it does not decode again.
 * The name is historical: it began as the DDS route's bridge.
 *
 * @param {object} payload Plain bitmap packet: description, data and metadata.
 * @returns {HostBitmap} Independently owned bitmap with native class identity.
 */
export function createDdsBitmap(payload)
{
  const bitmap = new HostBitmap();
  const d = payload.description;
  if (!(payload.data instanceof Uint8Array)
    || !bitmap.CreateFromBitmapDimensions(BitmapDimensions.create__AllFields(d.type, d.format, d.width, d.height, d.depth, d.mipCount, d.arraySize))
    || bitmap.GetRawDataSize() !== payload.data.byteLength)
  {
    throw new TypeError("Invalid bitmap payload.");
  }
  bitmap.GetRawData().set(payload.data);
  const metadata = new Metadata();
  metadata.cutout = Object.assign(new Cutout(), payload.metadata.cutout);
  metadata.metadata = payload.metadata.metadata.slice();
  bitmap.metadata = metadata;
  return bitmap;
}
