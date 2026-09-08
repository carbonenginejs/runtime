import { num } from "#math/num";

/**
 * Bakes photometry into Carbon's light-profile strip.
 *
 * Literal port of the texture half of `Tr2LightProfileRes::ParseIes`
 * (trinity/Resources/Tr2LightProfileRes.cpp:160-216): select the FIRST
 * horizontal slice (Carbon sizes `intensities` to `vAngleCount` and never
 * reads further - rotational symmetry is assumed), normalize to peak 1.0
 * (normalization seeded from intensities[0], divide only when > 0; the
 * candela multiplier and ballast factor are deliberately ignored), resample
 * to a 1024-texel cosine-uniform strip (`acos(-i/1024*2+1)/PI*180` degrees,
 * inclusive bracket scan, out-of-table angles stay 0), encode R16F through
 * Carbon's own Float_16 conversion, and build the 11-level mip chain as a
 * 2-tap box filter that decodes to f32 and re-encodes to half AT EVERY
 * LEVEL - rounding accumulates per level by design, so a port that filters
 * in f32 and quantizes once diverges in the low mips.
 *
 * Byte parity notes: samples are laid out mip-major (1024 + 512 + ... + 1 =
 * 2047 halfwords), exactly Carbon's bitmap raw data. Arithmetic follows
 * float32 (Math.fround) where Carbon computes in float; acos/Ï€ differences
 * from C's float intrinsics sit below half-float quantization.
 *
 * @param {object} photometry `readIes` output (horizontal-major candela table).
 * @returns {{width: number, height: number, mipCount: number, format: string, samples: Uint16Array}}
 */
export function bakeLightProfile(photometry)
{
    const f32 = Math.fround;
    const XM_PI = f32(3.141592654);
    const WIDTH = 1024;
    const MIP_COUNT = 11;

    const
        verticalAngleCount = photometry.verticalAngleCount,
        angles = photometry.verticalAngles,
        intensities = new Array(verticalAngleCount);

    // First horizontal slice only (candela values are horizontal-major:
    // h * verticalAngleCount + v, so slice 0 is the first vAngleCount).
    for (let i = 0; i < verticalAngleCount; i++)
    {
        intensities[i] = f32(photometry.candelaValues[i]);
    }

    let normalization = intensities[0];
    for (let i = 1; i < verticalAngleCount; i++)
    {
        normalization = Math.max(normalization, intensities[i]);
    }
    if (normalization > 0)
    {
        for (let i = 0; i < verticalAngleCount; i++)
        {
            intensities[i] = f32(intensities[i] / normalization);
        }
    }

    const samples = new Uint16Array(2047);
    for (let i = 0; i < WIDTH; i++)
    {
        const angle = f32(f32(Math.acos(f32(-i / WIDTH * 2 + 1))) / XM_PI * 180);

        let intensity = 0;
        for (let j = 0; j + 1 < verticalAngleCount; j++)
        {
            if (angle >= angles[j] && angle <= angles[j + 1])
            {
                const t = f32((angle - angles[j]) / f32(angles[j + 1] - angles[j]));
                intensity = f32(intensities[j] + f32(t * f32(intensities[j + 1] - intensities[j])));
                break;
            }
        }
        samples[i] = num.toHalfFloat(intensity);
    }

    let previous = 0, offset = WIDTH;
    for (let width = WIDTH >> 1; width > 0; width >>= 1)
    {
        for (let i = 0; i < width; i++)
        {
            samples[offset + i] = num.toHalfFloat(f32(
                (num.fromHalfFloat(samples[previous + i * 2])
                    + num.fromHalfFloat(samples[previous + i * 2 + 1])) * 0.5
            ));
        }
        previous = offset;
        offset += width;
    }

    return {
        width: WIDTH,
        height: 1,
        mipCount: MIP_COUNT,
        format: "r16float",
        samples
    };
}
