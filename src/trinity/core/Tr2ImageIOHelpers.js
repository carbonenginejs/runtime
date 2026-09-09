// Source: trinity/trinity/Tr2ImageIOHelpers.h
//   trinity/trinity/Tr2ImageIOHelpers.cpp:47-145
//   trinity/trinity/Resources/TriTextureRes.cpp:662-705 (DoPrepare)
//
// Carbon's bridge from a decoded bitmap to a `Tr2TextureAL`: `CreateTexture`
// builds one `Tr2SubresourceData` per (mip, layer), indexed
// `mip + layer * mipCount`, and calls the texture's `Create` with them as
// initial data (`Tr2ImageIOHelpers.cpp:104-128`). The texture resource calls it
// from `DoPrepare` on the main thread through `USE_MAIN_THREAD_RENDER_CONTEXT`
// and stores the result with `SetTexture` (`TriTextureRes.cpp:690-704`).
//
// WHERE OURS DIFFERS, AND WHY. The resource layer cannot reach a render
// context - `layers.json` forbids it - so the texture is made the first time a
// PREPARED resource is bound, through the context that binds it, and stored on
// the resource exactly where Carbon stores it. A resource not yet prepared
// yields null, and the parameter binds Carbon's fallback instead.
import { Tr2BitmapDimensions } from "../../trinityal/Tr2BitmapDimensions.js";
import { PixelFormat, PixelFormatFromCanonical, TextureType, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";


/** The payload's `dimension` to Carbon's texture type. */
const TYPE_OF_DIMENSION = Object.freeze({
  "2d": TextureType.TEX_TYPE_2D,
  "array": TextureType.TEX_TYPE_2D,
  "cube": TextureType.TEX_TYPE_CUBE,
  "3d": TextureType.TEX_TYPE_3D
});


/**
 * The description and initial data a texture payload describes.
 *
 * @param {object} payload A `"texture"` or `"rgba"` payload.
 * @returns {{desc: Tr2BitmapDimensions, initialData: object[]}|null} What to
 *   create, or null when the payload is not one a texture can be made from.
 */
export function DescribeTexturePayload(payload)
{
  if (!payload) return null;

  if (payload.payloadType === "rgba")
  {
    if (!(payload.data instanceof Uint8Array) || payload.pixelFormat !== "rgba8unorm") return null;

    const srgb = payload.colorSpace === "srgb";

    return {
      desc: Tr2BitmapDimensions.Texture2D(
        payload.width,
        payload.height,
        1,
        srgb ? PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM_SRGB : PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM
      ),
      initialData: [ {
        sysMem: payload.data,
        sysMemPitch: payload.strideBytes ?? payload.width * 4,
        sysMemSlicePitch: payload.data.byteLength
      } ]
    };
  }

  if (payload.payloadType !== "texture") return null;

  const format = PixelFormatFromCanonical[payload.pixelFormat];
  const type = TYPE_OF_DIMENSION[payload.dimension];

  if (format === undefined || type === undefined) return null;

  const mipCount = Math.max(1, payload.mipCount | 0);
  const arraySize = payload.dimension === "3d" ? 1 : Math.max(1, payload.arraySize | 0);
  const desc = new Tr2BitmapDimensions({
    type,
    format,
    width: payload.width,
    height: payload.height,
    depth: payload.dimension === "3d" ? Math.max(1, payload.depth | 0) : 1,
    mipCount,
    arraySize
  });
  const initialData = new Array(mipCount * arraySize).fill(null);

  // Carbon's index: `i + j * trueMipLevelCount` for mip i of layer j.
  for (const subresource of payload.subresources ?? [])
  {
    const index = (subresource.mip | 0) + (subresource.layer | 0) * mipCount;

    if (index < 0 || index >= initialData.length) continue;

    initialData[index] = {
      sysMem: payload.data.subarray(subresource.offset, subresource.offset + subresource.byteLength),
      sysMemPitch: subresource.rowPitch,
      sysMemSlicePitch: subresource.slicePitch
    };
  }

  return { desc, initialData };
}


/**
 * Creates the running backend's texture from a prepared texture resource.
 *
 * Carbon's `Tr2ImageIOHelpers::CreateTexture( bitmap, out, memoryUse, ctx,
 * USAGE_IMMUTABLE )`: shader-resource usage, CPU read, all data at creation.
 *
 * @param {object} resource A prepared `TriTextureRes`.
 * @param {object} renderContext The `Tr2RenderContext` to create through.
 * @returns {object|null} A `Tr2TextureAL`, or null when nothing could be made.
 */
export function CreateTexture(resource, renderContext)
{
  const described = DescribeTexturePayload(resource.GetPayload());

  if (!described) return null;

  const texture = renderContext.CreateTexture(described.desc, {
    gpuUsage: Tr2GpuUsage.SHADER_RESOURCE,
    cpuUsage: Tr2CpuUsage.READ,
    initialData: described.initialData
  });

  if (texture) texture.SetName(resource.GetPath() || resource.name || "TriTextureRes");

  return texture;
}


/**
 * The resource's texture, made on first request once the resource is prepared.
 *
 * This is `TriTextureRes::DoPrepare`'s creation step (`TriTextureRes.cpp:690-704`)
 * moved to the first bind, for the reason in the head note.
 *
 * @param {object} resource A `TriTextureRes`, or anything else (which yields null).
 * @param {object} renderContext The `Tr2RenderContext` to create through.
 * @returns {object|null} The texture, or null while the resource is not ready.
 */
export function RealizeTexture(resource, renderContext)
{
  if (!resource || typeof resource.GetTexture !== "function") return null;

  const existing = resource.GetTexture();

  if (existing) return existing;
  if (!renderContext || typeof resource.IsPrepared !== "function" || !resource.IsPrepared()) return null;

  const texture = CreateTexture(resource, renderContext);

  if (texture) resource.SetTexture(texture);

  return texture;
}
