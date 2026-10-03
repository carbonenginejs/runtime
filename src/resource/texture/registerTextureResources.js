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
import * as CcpLog from "../../global/logging/ccpLog.js";
import { HostBitmap, LoadParameters, Metadata } from "#imageio";
import { ImageIO } from "../imageio/ImageIO.js";
import { createDdsBitmap } from "./ddsBitmap.js";
import { CjsDdsFormat } from "../formats/dds/CjsDdsFormat.js";
import { TriTextureRes } from "./TriTextureRes.js";
import { Tr2ImageRes } from "./Tr2ImageRes.js";
import { ResourceRequirement } from "#blue";
import { CjsSchema } from "#schema";

/** Stable reader identity preserves the caller's requested DDS decode sharing. */
const DDS_BITMAP_DESCRIPTOR = { Format: CjsDdsFormat, defaults: { emit: "bitmap" } };

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
async function ReadImageResource(bytes, context, compression = {})
{
  // Snapshot before decoding: LOAD changes affect later loads, never this one.
  const texture = CjsSchema.cast(context.resource, TriTextureRes);
  const request = texture ? { enabled: TriTextureRes.compressUncompressedTextures,
    backend: compression.backend, features: Array.from(compression.features ?? []),
    role: compression.resolveRole ? compression.resolveRole(context.path) : null } : null;
  let bitmap;
  if (context.resource.GetExt() === "dds")
  {
    const packet = await context.resMan.ReadFormatOnce(context.resource, DDS_BITMAP_DESCRIPTOR, bytes, {
      ...context, emit: "bitmap"
    });
    bitmap = createDdsBitmap(packet);
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
  if (request) bitmap = await CompressLoadedBitmap(bitmap, request, compression, context.signal);
  return bitmap;
}

/** Optional load extension; complete output and diagnostics publish together. */
async function CompressLoadedBitmap(bitmap, request, options, signal)
{
  const packet = { description: {
    type: bitmap.GetType(), format: bitmap.GetFormat(), width: bitmap.GetWidth(),
    height: bitmap.GetHeight(), depth: bitmap.GetDepth(), mipCount: bitmap.GetMipCount(),
    arraySize: bitmap.GetArraySize()
  }, data: bitmap.GetRawData(), metadata: bitmap.metadata };
  const choice = CjsDdsFormat.selectCompression(packet, request);
  const diagnostic = { requested: request.enabled, backend: request.backend ?? null,
    activeFeatures: request.features, role: request.role, outcome: "skipped", reason: choice.reason,
    originalFormat: bitmap.GetFormat(), outputFormat: bitmap.GetFormat(),
    originalBytes: packet.data.length, outputBytes: packet.data.length, encodeTimeMs: 0 };
  if (choice.mode !== null)
  {
    try
    {
      const encoded = await CjsDdsFormat.compressBitmapAsync(packet, choice.mode,
        { workerFactory: options.workerFactory, workerUrl: options.workerUrl, signal });
      bitmap = createDdsBitmap(encoded);
      diagnostic.outcome = "compressed";
      diagnostic.outputFormat = bitmap.GetFormat(); diagnostic.outputBytes = encoded.data.length;
      diagnostic.encodeTimeMs = encoded.encodeTimeMs;
    }
    catch (error)
    {
      if (signal?.aborted) throw error;
      diagnostic.reason = `worker-failed: ${error.message}`;
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
 * selected backend, active device features, role resolver and worker options.
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
    resourceManager.RegisterObjectLoader(extension, (bytes, context) => ReadImageResource(bytes, context, options.compression));
    resourceManager.RegisterExtension(extension, Handler);
  }

  // Carbon asks for the same file as a texture or as a "raw" image; the
  // requirement picks the class and keeps a separate cache entry for each.
  resourceManager.RegisterResourceType(ResourceRequirement.TEXTURE, TriTextureRes);
  resourceManager.RegisterResourceType(ResourceRequirement.IMAGE, Tr2ImageRes);

  return resourceManager;
}
