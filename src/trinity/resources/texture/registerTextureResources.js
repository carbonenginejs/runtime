// Source: trinity/trinity/Resources/TriTextureRes.cpp:39-55
//   BLUE_REGISTER_RESOURCE_EXTENSION for each image extension -> CreateTextureResource.
// Source: trinity/trinity/Resources/Tr2ImageRes.cpp:39-52 (DoLoad reads into m_bitmap)
//
// Carbon registers at static-initialisation time inside the class's own
// translation unit, and its resource reads the file with `ImageIO::ReadImage`
// into its own `HostBitmap`. We do not self-register at module scope - the same
// reason `RegisterShaderResources` does not - so this is an explicit call made
// by whoever composes a manager.
//
// The read is the loader rather than the resource's own `DoLoad` because two
// formats need it: PNG and VTA decode through `DecompressionStream`, which is
// asynchronous, and `SetPayload` is not. The loader therefore does what
// Carbon's DoLoad does, and hands the resource the finished bitmap.
//
// Carbon's DoLoad runs on resMan's background queue, which is BeCallbackMan
// (BlueResMan.cpp:109). Here the decode of PNG, JPEG, TGA, VTA and GIF is
// queued there as the `image.decodeBitmap` job, so several images decode at
// once on its workers (resman-in-the-browser: the CPU stage). When nothing
// registered that job, the image decodes on this thread. Other formats decode
// here through ImageIO; DDS still reads through ReadFormatOnce.
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { HostBitmap, LoadParameters, Metadata } from "#imageio";
import { ImageIO } from "../../../resource/imageio/ImageIO.js";
import { createDdsBitmap } from "../../../resource/formats/dds/ddsBitmap.js";
import { CjsDdsFormat } from "../../../resource/formats/dds/CjsDdsFormat.js";
import { compressBitmapAsync, selectCompression } from "#resource/codecs/bcn";
import { DECODE_BITMAP_CALLBACK, IMAGE_DECODE_FORMATS } from "../../../resource/imageio/imageDecodeCallbacks.js";
import { BeCallbackMan, BlueCallbackMan } from "../../../global/blue/BlueCallbackMan.js";
import { asUint8Array } from "#utils/bytes";
import { TriTextureRes } from "./TriTextureRes.js";
import { Tr2ImageRes } from "./Tr2ImageRes.js";
import { ResourceRequirement } from "#blue";
import { CjsSchema } from "#schema";
import { getResourceExtension } from "#utils/path";

/** Stable reader identity preserves the caller's requested DDS decode sharing. */
const DDS_BITMAP_DESCRIPTOR = { Format: CjsDdsFormat, defaults: { emit: "bitmap" } };

/**
 * Decodes an image to its bitmap packet: on BeCallbackMan when it has the
 * `image.decodeBitmap` job, otherwise on this thread. A cancelled load
 * cancels a queued decode; one already running finishes and its result is
 * dropped.
 *
 * @param {Function} Format The extension's image format, one `IMAGE_DECODE_FORMATS` holds.
 * @param {Uint8Array|ArrayBuffer} bytes The file's bytes.
 * @param {object} context The manager's prepare context.
 * @param {string} context.path The resource path.
 * @param {AbortSignal} [context.signal] Cancels the load.
 * @returns {Promise<object>} The bitmap packet.
 */
async function DecodeImageBitmap(Format, bytes, context)
{
  if (!BeCallbackMan.HasCallbackModule(DECODE_BITMAP_CALLBACK)) return Format.readBitmapAsync(bytes, { source: context.path });
  const id = { value: 0 };
  const cancel = () => BeCallbackMan.Cancel(id.value);
  const signal = context.signal;
  if (signal) signal.addEventListener("abort", cancel, { once: true });
  try
  {
    return await BeCallbackMan.Add__Name(DECODE_BITMAP_CALLBACK,
      { format: Format.id, input: asUint8Array(bytes), source: context.path }, BlueCallbackMan.BCBF_NONE, id);
  }
  finally
  {
    if (signal) signal.removeEventListener("abort", cancel);
  }
}

/**
 * The image extensions Carbon routes to a texture resource
 * (`TriTextureRes.cpp:46-55`).
 *
 * Carbon lists dds, png, sdd, tga, jpg, jpeg, bmp, ecs, ctr and vta. These are
 * the ones an image handler is registered for here; `bmp`, `ecs`, `sdd`,
 * and `ctr` join their handlers as those land.
 */
export const TextureResourceExtensions = Object.freeze([
  "dds",
  "png",
  "jpg",
  "jpeg",
  "tga",
  "vta",
  "gif"
]);


/**
 * Read one image into a bitmap, as Carbon's `DoLoad` does.
 *
 * @param {Uint8Array|ArrayBuffer} bytes The file's bytes.
 * @param {object} context The manager's prepare context.
 * @returns {Promise<HostBitmap>} The decoded bitmap.
 */
export async function ReadImageResource(bytes, context, compression = {})
{
  // Snapshot before decoding: LOAD changes affect later loads, never this one.
  const texture = CjsSchema.cast(context.resource, TriTextureRes);
  const request = texture ? { enabled: TriTextureRes.compressUncompressedTextures,
    backend: compression.backend, features: Array.from(compression.features ?? []),
    role: compression.resolveRole ? compression.resolveRole(context.path) : null } : null;
  let bitmap;
  if (getResourceExtension(context.resource.GetPath()) === "dds")
  {
    const packet = await context.resMan.ReadFormatOnce(context.resource, DDS_BITMAP_DESCRIPTOR, bytes, {
      ...context, emit: "bitmap"
    });
    bitmap = createDdsBitmap(packet);
  }
  else if (IsDecodedImage(ImageIO.getImageHandler(ImageIO.getExtension(context.path))))
  {
    const Format = ImageIO.getImageHandler(ImageIO.getExtension(context.path));
    try
    {
      bitmap = createDdsBitmap(await DecodeImageBitmap(Format, bytes, context));
    }
    catch (error)
    {
      if (error.name === "AbortError") throw error;
      CcpLog.CCP_LOGWARN_CH(CcpLog.GetModuleChannel("trinity"), "Tr2ImageRes: error reading '%S' - %s", context.path, error.message);
      const failure = new Error(`${context.path || "image"}: ${error.message}`, { cause: error });
      failure.code = "CJS_RESOURCE_IMAGE_READ_FAILED";
      throw failure;
    }
  }
  else
  {
    bitmap = new HostBitmap();
    const metadata = new Metadata();
    const path = context.path;
    const result = await ImageIO.readImageAsync(bytes, new LoadParameters(path), bitmap, metadata);

    if (!result.IsOk())
    {
      CcpLog.CCP_LOGWARN_CH(CcpLog.GetModuleChannel("trinity"), "Tr2ImageRes: error reading '%S' - %s", path, result.GetErrorMessage());
      const error = new Error(`${path || "image"}: ${result.GetErrorMessage()}`);
      error.code = "CJS_RESOURCE_IMAGE_READ_FAILED";
      throw error;
    }

    bitmap.metadata = metadata;
  }
  if (request) bitmap = await CompressLoadedBitmap(bitmap, request, context.path, context.signal);
  return bitmap;
}

/**
 * Whether an extension's image format is one the `image.decodeBitmap` job decodes.
 *
 * @param {?Function} Format The extension's registered image format, or null.
 * @returns {boolean} True for the formats `IMAGE_DECODE_FORMATS` holds.
 */
function IsDecodedImage(Format)
{
  return Format !== null && IMAGE_DECODE_FORMATS.get(Format.id) === Format;
}

/**
 * Optional load extension; complete output and diagnostics publish together.
 * A compression, or a failed one, is also logged on trinity's Main channel,
 * where texture loading logs (a skip is only recorded in the diagnostic).
 */
async function CompressLoadedBitmap(bitmap, request, path, signal)
{
  const packet = { description: {
    type: bitmap.GetType(), format: bitmap.GetFormat(), width: bitmap.GetWidth(),
    height: bitmap.GetHeight(), depth: bitmap.GetDepth(), mipCount: bitmap.GetMipCount(),
    arraySize: bitmap.GetArraySize()
  }, data: bitmap.GetRawData(), metadata: bitmap.metadata };
  const choice = selectCompression(packet, request);
  const diagnostic = { requested: request.enabled, backend: request.backend ?? null,
    activeFeatures: request.features, role: request.role, outcome: "skipped", reason: choice.reason,
    originalFormat: bitmap.GetFormat(), outputFormat: bitmap.GetFormat(),
    originalBytes: packet.data.length, outputBytes: packet.data.length, encodeTimeMs: 0 };
  if (choice.mode !== null)
  {
    try
    {
      const encoded = await compressBitmapAsync(packet, choice.mode, { signal });
      bitmap = createDdsBitmap(encoded);
      diagnostic.outcome = "compressed";
      diagnostic.outputFormat = bitmap.GetFormat(); diagnostic.outputBytes = encoded.data.length;
      diagnostic.encodeTimeMs = encoded.encodeTimeMs;
      CcpLog.CCP_LOG_CH(CcpLog.GetModuleChannel("trinity"), "Compressed '%S' on load: mode %d, format %d to %d, %d to %d bytes in %g ms",
        path, choice.mode, diagnostic.originalFormat, diagnostic.outputFormat, diagnostic.originalBytes, diagnostic.outputBytes, diagnostic.encodeTimeMs);
    }
    catch (error)
    {
      if (signal?.aborted) throw error;
      diagnostic.reason = `worker-failed: ${error.message}`;
      CcpLog.CCP_LOGWARN_CH(CcpLog.GetModuleChannel("trinity"), "On-load compression of '%S' failed: %s", path, error.message);
    }
  }
  bitmap.compression = diagnostic;
  return bitmap;
}


/**
 * Routes every image extension to a texture resource on one manager.
 *
 * @param {object} resourceManager Manager to register on.
 * @param {object} [options] Handler and optional compression configuration:
 * selected backend, active device features and role resolver.
 * @returns {object} The same manager, for chaining.
 */
export function RegisterTextureResources(resourceManager, options = {})
{
  const Handler = options.Handler ?? TriTextureRes;

  if (Handler !== TriTextureRes && Handler !== Tr2ImageRes)
  {
    throw new TypeError("RegisterTextureResources routes to TriTextureRes or Tr2ImageRes.");
  }

  for (const extension of TextureResourceExtensions)
  {
    const loader = (bytes, context) => ReadImageResource(bytes, context, options.compression);
    resourceManager.RegisterObjectLoader(extension, loader);
    resourceManager.RegisterExtension(extension, Handler);
    // Carbon: Tr2ImageRes registers ddsraw (Resources/Tr2ImageRes_Blue.cpp:16).
    // Browser ImageIO also accepts the other configured image containers.
    resourceManager.RegisterObjectLoader(`${extension}raw`, loader);
    resourceManager.RegisterExtension(`${extension}raw`, Tr2ImageRes);
  }

  // Carbon asks for the same file as a texture or as a "raw" image; the
  // requirement picks the class and keeps a separate cache entry for each.
  resourceManager.RegisterResourceType(ResourceRequirement.TEXTURE, TriTextureRes);
  resourceManager.RegisterResourceType(ResourceRequirement.IMAGE, Tr2ImageRes);

  return resourceManager;
}
