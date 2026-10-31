import { meta, type } from "#schema";
import { PixelFormat } from "#consts/render-context";

/**
 * Character library value record: one texture path. The record decodes nothing; its statics are the
 * material-mask decode the library runs on loaded textures (`CjsCharacterLibraryManager.FetchMaterialMaskAreas`).
 */
@meta.define("CjsCharacterTexture")
export class CjsCharacterTexture
{

    /** Lookup name. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Original texture path; no selection or decoding. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path
    resFilePath = "";

    /**
     * A loaded texture's encoding code, as the colourize blit reads it: 0 single-channel (L8), 4 two-channel
     * (L8A8), 2 BGRX, 6 RGBA.
     *
     * Ours (non-carbon-extensions.md § *The shared character library*): moved from Graphene's
     * `textureComposer.js` (`encoding`) with the material-mask decode.
     *
     * @param {object} texture A ready texture resource.
     * @returns {number} The encoding code.
     */
    static encodingOf(texture)
    {
        const format = texture.format;
        if (format === PixelFormat.PIXEL_FORMAT_R8_UNORM || format === PixelFormat.PIXEL_FORMAT_R16_UNORM) return 0;
        if (format === PixelFormat.PIXEL_FORMAT_R8G8_UNORM || format === PixelFormat.PIXEL_FORMAT_R16G16_UNORM) return 4;
        return format === PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM ? 2 : 6;
    }

    /**
     * The colour areas a zone map selects, decoded per pixel as the colourize shader decodes zones (the same
     * rule as `usedColourAreas`): a single-channel zone maps its value through the 42/255 bands; a colour
     * zone weights area 1 by R(1-G)(1-B), area 2 by G(1-B) and area 3 by B, all times alpha (an RGB zone,
     * loaded as B8G8R8X8, is opaque). An area counts if any pixel gives it weight. Head tattoos select area 1
     * only; lipstick_04 and _05 select 1 and 2.
     *
     * Ours (non-carbon-extensions.md § *The shared character library*): moved from Graphene's
     * `zoneAreas.js` (`AreasOfZone`) unchanged.
     *
     * @param {object} texture A ready zone texture with its loaded bitmap.
     * @param {string} path The zone's path, for errors.
     * @returns {number[]} The colour areas the zone selects, ascending.
     * @throws {Error} When the zone selects no area.
     */
    static areasOfZone(texture, path)
    {
        const bytes = texture.loadedBitmap.GetMipRawData(0);
        const single = texture.format === PixelFormat.PIXEL_FORMAT_R8_UNORM;
        const opaque = texture.format === PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM;
        const stride = single ? 1 : 4;
        const used = [ false, false, false ];

        for (let i = 0; i < texture.width * texture.height * stride; i += stride)
        {
            let sample;
            if (single)
            {
                const q = bytes[i] / 255, a = 42 / 255;
                sample = q >= .5 ? [ 1, 1, 1, 0 ] : q <= a ? [ 1, q / a, 0, 1 ] : q <= 2 * a ? [ 1, 1, (q - a) / a, 1 ] : [ 1, 0, 3 - q / a, 1 ];
            }
            // Colour PNGs load as B8G8R8A8 or B8G8R8X8.
            else sample = [ bytes[i + 2] / 255, bytes[i + 1] / 255, bytes[i] / 255, opaque ? 1 : bytes[i + 3] / 255 ];

            if (sample[3] * sample[0] * (1 - sample[1]) * (1 - sample[2]) > 1e-3) used[0] = true;
            if (sample[3] * sample[1] * (1 - sample[2]) > 1e-3) used[1] = true;
            if (sample[3] * sample[2] > 1e-3) used[2] = true;
        }

        const areas = [];
        for (let index = 0; index < 3; index++) if (used[index]) areas.push(index + 1);
        if (!areas.length) throw new Error("Zone selects no colour area " + path);
        return areas;
    }

    /**
     * The colour areas (1 to 3) a detail map actually paints through its zone map, sampling the zone
     * bilinearly at each painted detail pixel, through both maps' atlas cutouts, as the colourize blit does.
     * Qualified for the current ColorizedBlit contract: RGBA, RGB, L8A8 or L8 detail (the smaller size tiers
     * ship grey and grey+alpha details, which the blit reads through its detailmap_L8/_L8A8 flags), RGBA/RGB or
     * compact L8 zones, transparent overlay, UseMask=0.
     *
     * Ours (non-carbon-extensions.md § *The shared character library*): moved from Graphene's
     * `usedColourAreas.js` unchanged.
     *
     * @param {object} detail The detail texture, with its CPU bitmap.
     * @param {object} zones The zone texture, with its CPU bitmap.
     * @param {number} detailType The detail's encoding (`encodingOf`).
     * @param {number} zoneType The zone's encoding, in the same codes.
     * @returns {number[]} The used areas, ascending.
     * @throws {Error} For an encoding or cutout the blit contract does not cover.
     */
    static usedColourAreas(detail, zones, detailType, zoneType)
    {
        const detailBytes = { 0: 1, 2: 4, 4: 2, 6: 4 }[detailType];
        if (!detailBytes || ![ 0, 2, 6 ].includes(zoneType)) throw new Error("Unqualified colour-area encoding");
        const d = detail.loadedBitmap,
            z = zones.loadedBitmap,
            db = d.GetMipRawData(0),
            zb = z.GetMipRawData(0),
            sample = new Float32Array(4),
            used = new Uint8Array(3);
        const dp = d.GetPitch(),
            zp = z.GetPitch(),
            zoneBytes = zoneType === 0 ? 1 : 4;
        const dr = Float32Array.of(detail.cutoutX, detail.cutoutY, detail.cutoutWidth, detail.cutoutHeight),
            zr = Float32Array.of(zones.cutoutX, zones.cutoutY, zones.cutoutWidth, zones.cutoutHeight);
        if (dr[2] <= 0 || dr[3] <= 0 || zr[2] <= 0 || zr[3] <= 0) throw new Error("Invalid colour-area cutout");
        for (let y = 0; y < detail.height; y++) for (let x = 0; x < detail.width; x++)
        {
            const p = y * dp + x * detailBytes,
                alpha = detailType === 6 ? db[p + 3] : detailType === 4 ? db[p + 1] : 255,
                level = detailType === 0 || detailType === 4 ? db[p] : Math.max(db[p], db[p + 1], db[p + 2]);
            if (!alpha || !level) continue;
            const u = (dr[0] + (x + .5) / detail.width * dr[2] - zr[0]) / zr[2],
                v = (dr[1] + (y + .5) / detail.height * dr[3] - zr[1]) / zr[3];
            const px = u * zones.width - .5,
                py = v * zones.height - .5,
                x0 = Math.floor(px),
                y0 = Math.floor(py),
                fx = px - x0,
                fy = py - y0;
            sample.fill(0);
            for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++)
            {
                const sx = Math.min(zones.width - 1, Math.max(0, x0 + dx)),
                    sy = Math.min(zones.height - 1, Math.max(0, y0 + dy)),
                    q = sy * zp + sx * zoneBytes,
                    w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) / 255;
                if (zoneType === 0) sample[0] += zb[q] * w;
                else
                {
                    sample[0] += zb[q + 2] * w;
                    sample[1] += zb[q + 1] * w;
                    sample[2] += zb[q] * w;
                    sample[3] += zb[q + 3] * w;
                }
            }
            if (zoneType === 0)
            {
                const q = sample[0],
                    a = 42 / 255;
                sample[0] = 1;
                sample[3] = 1;
                if (q >= .5)
                {
                    sample[1] = 1;
                    sample[2] = 1;
                    sample[3] = 0;
                }
                else if (q <= a)
                {
                    sample[1] = q / a;
                    sample[2] = 0;
                }
                else if (q <= 2 * a)
                {
                    sample[1] = 1;
                    sample[2] = (q - a) / a;
                }
                else
                {
                    sample[1] = 0;
                    sample[2] = 3 - q / a;
                }
            }
            const scale = 2 * sample[3] * alpha / 255 * level / 255;
            if (Math.abs(scale * sample[0] * (1 - sample[1]) * (1 - sample[2])) > 1e-7) used[0] = 1;
            if (Math.abs(scale * sample[1] * (1 - sample[2])) > 1e-7) used[1] = 1;
            if (Math.abs(scale * sample[2]) > 1e-7) used[2] = 1;
            if (used[0] && used[1] && used[2]) return [ 1, 2, 3 ];
        }
        const areas = [];
        for (let index = 0; index < 3; index++) if (used[index]) areas.push(index + 1);
        return areas;
    }

}
