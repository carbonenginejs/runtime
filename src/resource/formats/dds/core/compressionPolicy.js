// Operator-approved optional on-load extension, 2026-10-03.
// Roles come from the caller's asset semantics, never just the channel count.
// A density role means a verified opacity/extinction mask, not any scalar volume.
// Scalars used as lookup coordinates (including cloud temperature) are lookup/data.
// BC4 eligibility permits lossy mask encoding; it does not establish visual quality.
import { PixelFormat as P, TextureType as T, IsCompressedFormat } from "#consts/render-context";
import { isCompressionSourceSupported } from "./dxtCompression.js";

/** Choose a Carbon encoder only when role, storage and active WebGPU features permit it. */
export function selectCompression(packet, request)
{
    const { format, type, width, height } = packet.description;
    const skip = reason => ({ mode: null, reason });
    if (!request.enabled) return skip("disabled");
    if (request.backend !== "webgpu") return skip("selected-backend-has-no-BC-compression-policy");
    if (IsCompressedFormat(format)) return skip("already-compressed");
    if (!isCompressionSourceSupported(format)) return skip("source-is-not-supported-8-bit-UNORM");
    const role = request.role;
    if (["lookup", "ramp", "ui", "flow", "data"].includes(role)) return skip(`excluded-role:${role}`);
    let mode;
    if (["roughness", "material", "paint", "emissive", "mask", "density"].includes(role))
    {
        if (format !== P.PIXEL_FORMAT_R8_UNORM) return skip("mask-is-not-single-channel");
        mode = 8;
    }
    else if (role === "normal")
    {
        if (![P.PIXEL_FORMAT_R8G8_UNORM, P.PIXEL_FORMAT_R8G8B8A8_UNORM,
            P.PIXEL_FORMAT_B8G8R8A8_UNORM, P.PIXEL_FORMAT_B8G8R8X8_UNORM].includes(format))
            return skip("normal-requires-linear-red-and-green-channels");
        mode = 9;
    }
    else if (role === "colour")
    {
        if ([P.PIXEL_FORMAT_B8G8R8X8_UNORM, P.PIXEL_FORMAT_B8G8R8X8_UNORM_SRGB].includes(format)) mode = 5;
        else if ([P.PIXEL_FORMAT_R8G8B8A8_UNORM, P.PIXEL_FORMAT_R8G8B8A8_UNORM_SRGB,
            P.PIXEL_FORMAT_B8G8R8A8_UNORM, P.PIXEL_FORMAT_B8G8R8A8_UNORM_SRGB].includes(format))
        {
            mode = 5;
            for (let i = 3; i < packet.data.length; i += 4) if (packet.data[i] !== 255) { mode = 7; break; }
        }
        else return skip("colour-channel-semantics-unsupported");
    }
    else return skip("unknown-texture-role");
    const features = new Set(request.features);
    if (!features.has("texture-compression-bc")) return skip("missing-active-texture-compression-bc");
    if (type === T.TEX_TYPE_1D) return skip("WebGPU-does-not-support-compressed-1D-textures");
    if (type === T.TEX_TYPE_3D && !features.has("texture-compression-bc-sliced-3d"))
        return skip("missing-active-texture-compression-bc-sliced-3d");
    if ((width % 4 || height % 4) && !features.has("texture-compression-unaligned"))
        return skip("missing-active-texture-compression-unaligned");
    return { mode, reason: "role-and-active-capabilities-supported" };
}
