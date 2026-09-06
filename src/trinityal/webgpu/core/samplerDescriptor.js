// Authored Carbon sampler state to a GPUSamplerDescriptor.
//
// The enums are Carbon's, read from Tr2RenderContextEnum.h: TextureFilter
// (TF_NONE 0, TF_POINT 1, TF_LINEAR 2, TF_ANISOTROPIC 3), TextureAddressMode
// (TA_WRAP 1 .. TA_MIRROR_ONCE 5) and CompareFunc (CMP_NEVER 1 .. CMP_ALWAYS 8).
// The container stores them as bare bytes with no table of its own, so this is
// where they acquire meaning.
//
// TWO ADDRESS MODES HAVE NO WEBGPU FORM. Border and mirror-once exist in D3D and
// not in WebGPU - and unlike WebGL2, which can reach border clamp through
// EXT_texture_border_clamp, WebGPU has no extension for either. They are
// flattened to clamp-to-edge HERE, at the device boundary, and nowhere earlier.
//
// That placement is the whole point. ccpwgl learned it the expensive way: its
// wrap table once held a plain clamp in the mirror-once slot, which made every
// consumer downstream unable to tell a mirror-once sampler from a clamped one,
// erasing the mode before anything could act on it
// (`Tw2SamplerState.js`, the note above its wrap table). Correctness for both
// modes comes from the shader reading the AUTHORED mode, so the authored value
// has to survive; only the descriptor handed to the GPU is flattened.
function fail(message)
{
    const error = new Error(`CarbonSamplerDescriptor: ${message}`);
    error.code = "CJS_WEBGPU_SAMPLER_INVALID";
    throw error;
}

/** Carbon `TextureAddressMode`, indexed by its authored value. */
const ADDRESS_MODES = Object.freeze([
    null,
    "repeat",         // TA_WRAP
    "mirror-repeat",  // TA_MIRROR
    "clamp-to-edge",  // TA_CLAMP
    "clamp-to-edge",  // TA_BORDER, emulated in the shader
    "clamp-to-edge"   // TA_MIRROR_ONCE, emulated in the shader
]);

/** The authored modes WebGPU cannot express, which a shader has to emulate. */
export const EMULATED_ADDRESS_MODES = Object.freeze([ 4, 5 ]);

/** Carbon `CompareFunc`, indexed by its authored value. */
const COMPARE_FUNCTIONS = Object.freeze([
    null,
    "never",
    "less",
    "equal",
    "less-equal",
    "greater",
    "not-equal",
    "greater-equal",
    "always"
]);

/**
 * Whether an authored address mode needs shader emulation to be correct.
 *
 * @param {number} mode Carbon `TextureAddressMode` value.
 * @returns {boolean} True when the descriptor's clamp is a substitute.
 */
export function IsEmulatedAddressMode(mode)
{
    return EMULATED_ADDRESS_MODES.includes(mode);
}

/**
 * Translates one authored address mode.
 *
 * @param {number} mode Carbon `TextureAddressMode` value.
 * @param {string} axis Axis name, for the failure message.
 * @returns {GPUAddressMode} The mode to hand the device.
 */
function addressMode(mode, axis)
{
    const translated = ADDRESS_MODES[mode];

    if (!translated) fail(`sampler ${axis} has no such Carbon address mode: ${mode}`);

    return translated;
}

/**
 * Translates a min or mag filter.
 *
 * Anisotropic becomes linear because WebGPU has no separate anisotropic filter:
 * it is expressed as linear filtering plus `maxAnisotropy`, and the device
 * refuses anisotropy unless all three filters are linear.
 *
 * @param {number} filter Carbon `TextureFilter` value.
 * @param {string} which Field name, for the failure message.
 * @returns {GPUFilterMode} The filter to hand the device.
 */
function filterMode(filter, which)
{
    if (filter === 1 || filter === 0) return "nearest";
    if (filter === 2 || filter === 3) return "linear";

    fail(`sampler ${which} has no such Carbon filter: ${filter}`);
}

/**
 * Builds a `GPUSamplerDescriptor` from authored Carbon sampler state.
 *
 * @param {object} sampler Authored state, as carried at `binding.carbon.sampler`.
 * @param {string} [label] Optional label for the created sampler.
 * @returns {object} A descriptor for `CjsWebgpuDevice.CreateSampler`.
 */
export function CarbonSamplerDescriptor(sampler, label)
{
    if (!sampler) fail("a sampler binding carries no authored state to translate");

    const magFilter = filterMode(sampler.magFilter, "magFilter");
    const minFilter = filterMode(sampler.minFilter, "minFilter");

    // TF_NONE on the mip filter means no mipmapping at all. WebGPU has no way to
    // say that in the filter, so it is said in the LOD clamp instead: pinning
    // both ends to zero samples only the top level.
    const noMips = sampler.mipFilter === 0;
    const mipmapFilter = noMips ? "nearest" : filterMode(sampler.mipFilter, "mipFilter");

    // Carbon authors the open ends as +/- FLT_MAX, which WebGPU rejects. 32 is
    // WebGPU's own default upper clamp, so an unbounded author lands on it.
    const lodMinClamp = noMips ? 0 : Math.max(0, sampler.minLOD ?? 0);
    const lodMaxClamp = noMips ? 0 : Math.min(32, sampler.maxLOD ?? 32);

    const anisotropic = sampler.minFilter === 3 || sampler.magFilter === 3;
    const filtersAllLinear = magFilter === "linear" && minFilter === "linear" && mipmapFilter === "linear";

    const descriptor = {
        addressModeU: addressMode(sampler.addressU, "addressU"),
        addressModeV: addressMode(sampler.addressV, "addressV"),
        addressModeW: addressMode(sampler.addressW, "addressW"),
        magFilter,
        minFilter,
        mipmapFilter,
        lodMinClamp,
        lodMaxClamp,
        // The device rejects anisotropy that is not backed by linear filtering
        // on all three, so an author asking for both is honoured only where it
        // is expressible.
        maxAnisotropy: anisotropic && filtersAllLinear ? (sampler.maxAnisotropy ?? 1) : 1
    };

    if (sampler.comparison)
    {
        const compare = COMPARE_FUNCTIONS[sampler.comparisonFunc];

        if (!compare) fail(`comparison sampler has no such Carbon compare function: ${sampler.comparisonFunc}`);

        descriptor.compare = compare;
    }

    if (label) descriptor.label = label;

    return descriptor;
}
