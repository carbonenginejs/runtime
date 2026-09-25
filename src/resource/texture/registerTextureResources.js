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
// The read is the loader rather than the resource's own `DoLoad` because one
// format needs it: PNG decodes through `DecompressionStream`, which is
// asynchronous, and `SetPayload` is not. The loader therefore does what
// Carbon's DoLoad does, and hands the resource the finished bitmap.
import { HostBitmap, LoadParameters, Metadata } from "#imageio";
import { ImageIO } from "../imageio/ImageIO.js";
import { TriTextureRes } from "./TriTextureRes.js";
import { Tr2ImageRes } from "./Tr2ImageRes.js";
import { ResourceRequirement } from "#blue";


/**
 * The image extensions Carbon routes to a texture resource
 * (`TriTextureRes.cpp:46-55`).
 *
 * Carbon lists dds, png, sdd, tga, jpg, jpeg, bmp, ecs, ctr and vta. These are
 * the ones an image handler is registered for here; `bmp`, `ecs`, `sdd`,
 * `ctr` and `vta` join their handlers as those land.
 */
export const TextureResourceExtensions = Object.freeze([
  "dds",
  "png",
  "jpg",
  "jpeg",
  "tga",
  "gif"
]);


/**
 * Read one image into a bitmap, as Carbon's `DoLoad` does.
 *
 * @param {Uint8Array|ArrayBuffer} bytes The file's bytes.
 * @param {object} context The manager's prepare context.
 * @returns {Promise<HostBitmap>} The decoded bitmap.
 */
async function ReadImageResource(bytes, context)
{
  const bitmap = new HostBitmap();
  const metadata = new Metadata();
  const path = context.path;
  const result = await ImageIO.readImageAsync(bytes, new LoadParameters(path), bitmap, metadata);

  // Carbon: CCP_LOGWARN("Tr2ImageRes: error reading '%S' - %s") and LR_FAILED.
  if (!result.IsOk())
  {
    const error = new Error(`${path || "image"}: ${result.GetErrorMessage()}`);
    error.code = "CJS_RESOURCE_IMAGE_READ_FAILED";
    throw error;
  }

  bitmap.metadata = metadata;
  return bitmap;
}


/**
 * Routes every image extension to a texture resource on one manager.
 *
 * @param {object} resourceManager Manager to register on.
 * @param {object} [options] `{ Handler }` to route to `Tr2ImageRes` instead.
 * @returns {object} The same manager, for chaining.
 */
export function RegisterTextureResources(resourceManager, options = {})
{
  if (typeof resourceManager?.RegisterExtension !== "function"
    || typeof resourceManager?.RegisterObjectLoader !== "function")
  {
    throw new TypeError("RegisterTextureResources requires a CjsResMan.");
  }

  const Handler = options.Handler ?? TriTextureRes;

  if (Handler !== TriTextureRes && Handler !== Tr2ImageRes)
  {
    throw new TypeError("RegisterTextureResources routes to TriTextureRes or Tr2ImageRes.");
  }

  for (const extension of TextureResourceExtensions)
  {
    resourceManager.RegisterObjectLoader(extension, ReadImageResource);
    resourceManager.RegisterExtension(extension, Handler);
  }

  // Carbon asks for the same file as a texture or as a "raw" image; the
  // requirement picks the class and keeps a separate cache entry for each.
  resourceManager.RegisterResourceType(ResourceRequirement.TEXTURE, TriTextureRes);
  resourceManager.RegisterResourceType(ResourceRequirement.IMAGE, Tr2ImageRes);

  return resourceManager;
}
