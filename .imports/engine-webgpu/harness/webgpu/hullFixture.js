/**
 * Fixture for drawing a real EVE hull through the packed `quadv5` PPT shader.
 *
 * Every other quad fixture in this harness authors its own geometry and its own
 * 1x1 textures, because each is a gate on one shader behaviour and a synthetic
 * input is the only way to know what the answer should be. This fixture is the
 * opposite instrument: the geometry, the material maps and the vertex
 * declaration all come from the client, and nothing here asserts a pixel. It
 * exists to prove the whole path carries real content end to end.
 *
 * The distinction that matters is the vertex declaration. The committed
 * `unpacked_quadv5` golden draws against an UNPACKED tangent declaration, which
 * no space object ever uses: a space object arrives as `.gr2` and its tangent
 * frame is always angle-packed into one vec4. That is why this fixture cannot
 * reuse `quadV5Fixture.js` — it is a different shader variant with a different
 * input signature, not a different set of values.
 *
 * See `../../../docs/contracts/webgl2-texture-budget.md`
 * (§ Which variant a space object actually needs) for the variant rule, and
 * `../../../docs/contracts/carbon-scene-composite.md` before comparing any
 * output here against the client.
 */

const HULL_TECHNIQUE = "Main";
const HULL_PASS_INDEX = 0;

/**
 * A hull is 512 square rather than the 64 the gate fixtures use. Those are
 * sized to make per-pixel assertions cheap; this one is sized to be looked at,
 * and a 25-metre frigate at 64 pixels is a smudge.
 */
export const HULL_TARGET_WIDTH = 512;
export const HULL_TARGET_HEIGHT = 512;

/**
 * The shader writes two render targets. Both clear to opaque black: unlike the
 * gate fixtures, nothing here classifies pixels by clear colour, so a garish
 * clear would only pollute the picture.
 */
export const HULL_CLEAR_TARGETS = Object.freeze([
    Object.freeze([ 0, 0, 0, 255 ]),
    Object.freeze([ 0, 0, 0, 255 ])
]);

export const HULL_DEPTH_FORMAT = "depth24plus";

/**
 * The packed declaration, read from the built package rather than assumed:
 *
 *   POSITION0      register 0  float3  usedMask 7
 *   BLENDINDICES0  register 1  uint4   usedMask 0
 *   TEXCOORD0      register 2  float2  usedMask 3
 *   TANGENT0       register 3  float4  usedMask 15
 *   TEXCOORD1      register 4  float2  usedMask 3
 *
 * Two of those are supplied as zeroes rather than omitted. A declared input
 * must still be bound even when the shader never reads it, so BLENDINDICES0
 * (`usedMask 0`, present only because the declaration is shared with the
 * skinned variant) and TEXCOORD1 (read only when `GeneralData` selects the
 * second UV set, which this hull does not) occupy their four and eight bytes.
 *
 * BLENDINDICES0 is four bytes for four components, so it is `uint8x4` — the
 * shader still sees a `vec4<u32>`.
 */
export const HULL_VERTEX_BUFFER_LAYOUT = Object.freeze({
    arrayStride: 48,
    attributes: Object.freeze([
        Object.freeze({ shaderLocation: 0, offset: 0, format: "float32x3" }),
        Object.freeze({ shaderLocation: 1, offset: 12, format: "uint8x4" }),
        Object.freeze({ shaderLocation: 2, offset: 16, format: "float32x2" }),
        Object.freeze({ shaderLocation: 3, offset: 24, format: "float32x4" }),
        Object.freeze({ shaderLocation: 4, offset: 40, format: "float32x2" })
    ])
});

/**
 * The six maps the hull actually supplies, keyed by the binding that consumes
 * them. `af1_t1_d.dds` (dirt) was fetched alongside these and is deliberately
 * absent: the PPT Main pass has no dirt binding, so publishing it would leave a
 * texture nothing can bind.
 */
export const HULL_TEXTURE_ASSETS = Object.freeze({
    AlbedoMap: "/hull/af1_a.dds",
    NormalMap: "/hull/af1_n.dds",
    RoughnessMap: "/hull/af1_r.dds",
    MaterialMap: "/hull/af1_m.dds",
    // The paint mask protects part of the albedo from being coloured by the
    // four base material layers. That makes it untestable here: this fixture
    // runs on Carbon's default constants, where all four layers are white, so
    // the colouring it exists to hold back does nothing and a correct mask and
    // a broken one produce identical pixels. It becomes meaningful only once
    // the SOF DNA supplies the hull's real material colours.
    PaintMaskMap: "/hull/af1_p3.dds",
    GlowMap: "/hull/af1_g.dds"
});

export const HULL_GEOMETRY_ASSETS = Object.freeze({
    vertices: "/hull/af1_vertices.bin",
    indices: "/hull/af1_indices.bin",
    describe: "/hull/af1_geometry.json"
});

function fail(message)
{
    throw new Error(`Hull fixture: ${message}`);
}

/* ---------------------------------------------------------------------- */
/* DDS                                                                     */
/* ---------------------------------------------------------------------- */

const DDS_MAGIC = 0x20534444;
const DDS_HEADER_BYTES = 124;
const DDSPF_FOURCC = 0x4;
const DDSD_MIPMAPCOUNT = 0x20000;

function fourCC(text)
{
    return text.charCodeAt(0)
        | (text.charCodeAt(1) << 8)
        | (text.charCodeAt(2) << 16)
        | (text.charCodeAt(3) << 24);
}

/**
 * Two format paths, not one. Only the albedo carries a DX10 header; the other
 * five arrive through the legacy fourCC path with `dxgiFormat` absent
 * entirely. A reader that consults `dxgiFormat` alone rejects five of the six
 * maps this hull needs, so both paths are mapped here.
 *
 * `ATI1`/`ATI2` are the pre-DX10 names for what DXGI calls BC4 and BC5.
 */
const FOURCC_FORMATS = new Map([
    [ fourCC("DXT1"), "bc1-rgba-unorm" ],
    [ fourCC("DXT3"), "bc2-rgba-unorm" ],
    [ fourCC("DXT5"), "bc3-rgba-unorm" ],
    [ fourCC("ATI1"), "bc4-r-unorm" ],
    [ fourCC("BC4U"), "bc4-r-unorm" ],
    [ fourCC("ATI2"), "bc5-rg-unorm" ],
    [ fourCC("BC5U"), "bc5-rg-unorm" ]
]);

const DXGI_FORMATS = new Map([
    [ 71, "bc1-rgba-unorm" ],
    [ 72, "bc1-rgba-unorm-srgb" ],
    [ 74, "bc2-rgba-unorm" ],
    [ 75, "bc2-rgba-unorm-srgb" ],
    [ 77, "bc3-rgba-unorm" ],
    [ 78, "bc3-rgba-unorm-srgb" ],
    [ 80, "bc4-r-unorm" ],
    [ 83, "bc5-rg-unorm" ],
    [ 98, "bc7-rgba-unorm" ],
    [ 99, "bc7-rgba-unorm-srgb" ]
]);

/**
 * The sRGB pair of a linear block format, for the bindings whose reflection
 * carries `Tr2sRGB`. Colour maps are authored in sRGB and the shader expects
 * the sampler to linearize; binding the linear view instead darkens the hull
 * in a way that reads as a lighting bug.
 */
const SRGB_FORMATS = new Map([
    [ "bc1-rgba-unorm", "bc1-rgba-unorm-srgb" ],
    [ "bc2-rgba-unorm", "bc2-rgba-unorm-srgb" ],
    [ "bc3-rgba-unorm", "bc3-rgba-unorm-srgb" ],
    [ "bc7-rgba-unorm", "bc7-rgba-unorm-srgb" ]
]);

/**
 * Decode a DDS container into an engine texture payload.
 *
 * The engine plans the upload itself, so this returns dimensions, a format and
 * the whole undivided mip chain rather than per-level slices. Block-row versus
 * pixel-row stride is `PlanTextureUpload`'s problem, and it is the one place it
 * should be solved.
 *
 * @param {ArrayBuffer|ArrayBufferView} source DDS bytes.
 * @param {string} label Diagnostic label, also used as the texture label.
 * @param {boolean} [isSRGB] Bind the sRGB view of the decoded block format.
 * @returns {object} Texture payload for `RealizeResource`.
 */
export function parseDdsTexture(source, label, isSRGB = false)
{
    const bytes = source instanceof ArrayBuffer
        ? new Uint8Array(source)
        : new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    if (bytes.byteLength < 128) fail(`${label} is too short to be a DDS container`);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(0, true) !== DDS_MAGIC) fail(`${label} is not a DDS container`);
    if (view.getUint32(4, true) !== DDS_HEADER_BYTES) fail(`${label} has an unexpected DDS header size`);

    const flags = view.getUint32(8, true);
    const height = view.getUint32(12, true);
    const width = view.getUint32(16, true);
    const declaredMips = view.getUint32(28, true);
    const pixelFormatFlags = view.getUint32(80, true);
    const code = view.getUint32(84, true);

    let format = null;
    let dataOffset = 128;
    if ((pixelFormatFlags & DDSPF_FOURCC) === 0)
    {
        fail(`${label} is uncompressed; only block-compressed maps are handled here`);
    }
    if (code === fourCC("DX10"))
    {
        if (bytes.byteLength < 148) fail(`${label} claims a DX10 header it does not contain`);
        const dxgiFormat = view.getUint32(128, true);
        format = DXGI_FORMATS.get(dxgiFormat);
        if (!format) fail(`${label} uses unhandled DXGI format ${dxgiFormat}`);
        dataOffset = 148;
    }
    else
    {
        format = FOURCC_FORMATS.get(code);
        if (!format)
        {
            const text = String.fromCharCode(
                code & 0xff, (code >> 8) & 0xff, (code >> 16) & 0xff, (code >> 24) & 0xff
            );
            fail(`${label} uses unhandled fourCC "${text}"`);
        }
    }
    if (isSRGB) format = SRGB_FORMATS.get(format) ?? format;

    // A container may declare no mip count at all, which means one level.
    const mipLevelCount = (flags & DDSD_MIPMAPCOUNT) !== 0 && declaredMips > 0
        ? declaredMips
        : 1;
    return {
        label,
        width,
        height,
        format,
        mipLevelCount,
        data: bytes.subarray(dataOffset)
    };
}

/* ---------------------------------------------------------------------- */
/* Placeholder scene inputs                                                */
/* ---------------------------------------------------------------------- */

function solidTexture(label, format, pixel, size = 4)
{
    const data = new Uint8Array(size * size * 4);
    for (let index = 0; index < data.length; index += 4)
    {
        data[index] = pixel[0];
        data[index + 1] = pixel[1];
        data[index + 2] = pixel[2];
        data[index + 3] = pixel[3];
    }
    return { label, width: size, height: size, format, mipLevelCount: 1, data };
}

/**
 * The four scene inputs no hull carries, in the only neutral values that mean
 * "this stage contributed nothing".
 *
 * The depth-ish maps are white on purpose and the reasoning is worth keeping:
 * depth 0 resolves to the NEAR plane, so a black shadow map tells the shader
 * every surface is behind an occluder and the hull renders as an empty frame.
 * The failure mode of getting this wrong is a blank image, not a dark one, and
 * it is easy to misread as "the draw never happened". ccpwgl reached the same
 * neutrals independently for its own fallbacks.
 *
 * @returns {object[]} Texture payloads keyed for the placeholder bindings.
 */
export function createHullPlaceholderTextures()
{
    // Six square layers bound through a cube view.
    //
    // Bright, not mid-grey. This pass gets most of its light from the
    // environment rather than from the sun term, and the binding is sRGB, so a
    // "neutral" 96/255 arrives at the shader as 0.11 linear and the hull comes
    // out very nearly black. That is not a lighting bug to chase; it is what
    // asking for one ninth of the light looks like.
    const face = [ 196, 202, 214, 255 ];
    const cubeData = new Uint8Array(4 * 4 * 4 * 6);
    for (let index = 0; index < cubeData.length; index += 4)
    {
        cubeData[index] = face[0];
        cubeData[index + 1] = face[1];
        cubeData[index + 2] = face[2];
        cubeData[index + 3] = face[3];
    }
    return Object.freeze({
        EveSpaceSceneEnvMap: {
            label: "Hull EveSpaceSceneEnvMap placeholder",
            width: 4,
            height: 4,
            layers: 6,
            viewDimension: "cube",
            format: "rgba8unorm-srgb",
            mipLevelCount: 1,
            data: cubeData
        },
        // 1.0 is unoccluded.
        SSAOMap: solidTexture("Hull SSAOMap placeholder", "rgba8unorm", [ 255, 255, 255, 255 ]),
        EveSpaceSceneShadowMap: solidTexture(
            "Hull EveSpaceSceneShadowMap placeholder", "rgba8unorm", [ 255, 255, 255, 255 ]
        ),
        // Transparent black: an unset pattern mask must contribute nothing,
        // and both the colour and the coverage have to say so.
        PatternMask1Map: solidTexture(
            "Hull PatternMask1Map placeholder", "rgba8unorm", [ 0, 0, 0, 0 ]
        ),
        PatternMask2Map: solidTexture(
            "Hull PatternMask2Map placeholder", "rgba8unorm", [ 0, 0, 0, 0 ]
        )
    });
}

/**
 * Samplers as the package reflects them: anisotropic, wrapping, full mip
 * filtering. All three bindings share one state, so they share one descriptor.
 *
 * @returns {object} Sampler descriptors keyed by binding name.
 */
export function createHullSamplers()
{
    const state = Object.freeze({
        addressModeU: "repeat",
        addressModeV: "repeat",
        addressModeW: "repeat",
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
        maxAnisotropy: 16
    });
    return Object.freeze({
        s0: { label: "Hull s0", ...state },
        PatternMask1MapSampler: { label: "Hull PatternMask1MapSampler", ...state },
        PatternMask2MapSampler: { label: "Hull PatternMask2MapSampler", ...state }
    });
}

/* ---------------------------------------------------------------------- */
/* Package inspection                                                      */
/* ---------------------------------------------------------------------- */

/**
 * Confirm a package record really is the packed PPT Main variant.
 *
 * This is deliberately thin next to `validateQuadV5PackageRecord`. That one
 * pins an exact expected layout because it guards a byte-for-byte golden; this
 * one only has to catch a caller pointing the hull draw at the wrong package,
 * so it checks the input signature that distinguishes packed from unpacked and
 * nothing more.
 *
 * @param {object} record Package record with a resolved pipeline.
 * @returns {object} The validated record.
 */
export function validateHullPackageRecord(record)
{
    const pipeline = record?.pipeline;
    if (!pipeline || typeof pipeline !== "object") fail("record has no resolved pipeline");
    if (pipeline.techniqueName !== HULL_TECHNIQUE || pipeline.passIndex !== HULL_PASS_INDEX)
    {
        fail(`record resolves ${pipeline.techniqueName}.pass${pipeline.passIndex}, not Main.pass0`);
    }
    const vertex = pipeline.shaderModules?.find((entry) => entry.stageName === "vertex");
    if (!vertex) fail("record has no vertex stage");
    const inputs = vertex.pipelineInputs ?? [];
    const signature = inputs
        .map((entry) => `${entry.usageName}${entry.usageIndex}:${entry.registerIndex}:${entry.dimension}`)
        .join(" ");
    const expected =
        "POSITION0:0:3 BLENDINDICES0:1:4 TEXCOORD0:2:2 TANGENT0:3:4 TEXCOORD1:4:2";
    if (signature !== expected)
    {
        fail(
            "record is not the packed quadv5 variant; a space object needs the packed " +
            `tangent declaration but this package declares "${signature}"`
        );
    }
    return record;
}

/**
 * Derive the binding plan from the package itself.
 *
 * The gate fixtures compare against an authored expected layout, because a
 * silently changed binding table would otherwise invalidate their goldens
 * without failing. Nothing here is a golden, so the package is the source and
 * the only requirement is that every binding it declares gets filled.
 *
 * @param {object} record Validated package record.
 * @returns {{textures: object[], samplers: object[], uniforms: object[]}} Frozen plan.
 */
export function getHullResourcePlan(record)
{
    validateHullPackageRecord(record);
    const textures = [];
    const samplers = [];
    const uniforms = [];
    for (const group of record.pipeline.bindGroups ?? [])
    {
        for (const binding of group.bindings ?? [])
        {
            const entry = Object.freeze({
                name: binding.name,
                scopeIdentity: binding.scopeIdentity,
                isSRGB: !!binding.isSRGB,
                textureKind: binding.textureKind ?? null
            });
            if (binding.resourceKind === "sampled-resource") textures.push(entry);
            else if (binding.resourceKind === "sampler") samplers.push(entry);
            else if (binding.resourceKind === "uniform-buffer") uniforms.push(entry);
            else fail(`binding ${binding.name} has unsupported kind ${binding.resourceKind}`);
        }
    }
    if (!textures.length || !samplers.length || !uniforms.length)
    {
        fail("package binding plan is incomplete");
    }
    return Object.freeze({
        textures: Object.freeze(textures),
        samplers: Object.freeze(samplers),
        uniforms: Object.freeze(uniforms)
    });
}


/**
 * Carbon's own constant defaults for this pass, transcribed from the
 * `constantValues` block a current-format package carries.
 *
 * These are not invented and not tuned. Older packages reach the engine with
 * the constant LAYOUT but an empty value block, and `PackMaterialConstants`
 * fails closed on a missing value, so something has to fill twenty slots. The
 * choice is between authoring a material — which would put a made-up look on
 * screen and invite it to be read as the hull's real one — and using the
 * values Carbon itself falls back to. This is the latter, read out of a
 * package built by the current emitter and copied here verbatim.
 *
 * The shape is worth noticing: everything is white and fully opaque, gloss is
 * 0.4, and only `GeneralData` and the `PMtl*Gloss` tails are zero. A hull drawn
 * against these shows its own maps with no material tint on top.
 */
/**
 * `af1_t1`'s own material, from its SOF DNA.
 *
 * Transcribed from the `area_hull` effect of `af1_t1:amarrbase:amarr` as the
 * tools-core service resolves it — the `Tr2ConstantEffectParameter` nodes of
 * the `Tr2Effect` whose `effectFilePath` is `quadv5.fx`. These are the numbers
 * that make an Amarr T1 hull look Amarr: `Mtl1` is the pale gold base, `Mtl2`
 * and `Mtl3` are near-black trim, `Mtl4` is black, and the fresnel colours
 * carry the warm rim the client is recognisable for.
 *
 * Transcribed rather than fetched because the harness must run without the
 * service, and because resolving a DNA properly is Trinity's job, not a
 * fixture's — this is a stand-in for that hookup, not a substitute for it.
 *
 * The DNA also carries `Mtl*DustDiffuseColor` and a `DirtMap`, which this
 * package does not declare: the DNA selects `SOPPT_DISABLED` while the package
 * here is the PPT-enabled permutation. Constants the package does not declare
 * are simply not packed, so the extra entries are inert.
 */
const HULL_SOF_MATERIAL = Object.freeze({
    GeneralData: Object.freeze([ 1, 0, 0, 0 ]),
    GeneralGlowColor: Object.freeze([ 0.7607843, 0.5176471, 0.2705882, 1 ]),
    Mtl1DiffuseColor: Object.freeze([ 0.7803922, 0.6509804, 0.5137255, 1 ]),
    Mtl2DiffuseColor: Object.freeze([ 0.0528606, 0.0578054, 0.0612461, 1 ]),
    Mtl3DiffuseColor: Object.freeze([ 0.0137021, 0.0137021, 0.0137021, 1 ]),
    Mtl4DiffuseColor: Object.freeze([ 0, 0, 0, 1 ]),
    Mtl1FresnelColor: Object.freeze([ 0.1878208, 0.2015563, 0.2232280, 1 ]),
    Mtl2FresnelColor: Object.freeze([ 0.4117647, 0.4392157, 0.4823529, 1 ]),
    Mtl3FresnelColor: Object.freeze([ 0.0392157, 0.0431373, 0.0470588, 1 ]),
    Mtl4FresnelColor: Object.freeze([ 1, 0.7083758, 0.3613068, 1 ]),
    Mtl1Gloss: Object.freeze([ 0.3483480, 0, 0, 0 ]),
    Mtl2Gloss: Object.freeze([ 0.6825000, 0, 0, 0 ]),
    Mtl3Gloss: Object.freeze([ 0.6825000, 0, 0, 0 ]),
    Mtl4Gloss: Object.freeze([ 0.7826000, 0, 0, 0 ]),
    // The pattern materials are all zero, because this DNA carries no SKIN.
    // Both pattern masks resolve to `res:/texture/global/black.dds`, which is
    // what the transparent-black placeholders above stand in for.
    PMtl1DiffuseColor: Object.freeze([ 0, 0, 0, 0 ]),
    PMtl1FresnelColor: Object.freeze([ 0, 0, 0, 0 ]),
    PMtl1Gloss: Object.freeze([ 0, 0, 0, 0 ]),
    PMtl2DiffuseColor: Object.freeze([ 0, 0, 0, 0 ]),
    PMtl2FresnelColor: Object.freeze([ 0, 0, 0, 0 ]),
    PMtl2Gloss: Object.freeze([ 0, 0, 0, 0 ])
});

const CARBON_MATERIAL_DEFAULTS = Object.freeze({
    GeneralData: Object.freeze([ 1, 0, 0, 0 ]),
    GeneralGlowColor: Object.freeze([ 1, 1, 1, 1 ]),
    Mtl1DiffuseColor: Object.freeze([ 1, 1, 1, 1 ]),
    Mtl2DiffuseColor: Object.freeze([ 1, 1, 1, 1 ]),
    Mtl3DiffuseColor: Object.freeze([ 1, 1, 1, 1 ]),
    Mtl4DiffuseColor: Object.freeze([ 1, 1, 1, 1 ]),
    Mtl1FresnelColor: Object.freeze([ 1, 1, 1, 1 ]),
    Mtl2FresnelColor: Object.freeze([ 1, 1, 1, 1 ]),
    Mtl3FresnelColor: Object.freeze([ 1, 1, 1, 1 ]),
    Mtl4FresnelColor: Object.freeze([ 1, 1, 1, 1 ]),
    Mtl1Gloss: Object.freeze([ 0.4, 1, 1, 1 ]),
    Mtl2Gloss: Object.freeze([ 0.4, 1, 1, 1 ]),
    Mtl3Gloss: Object.freeze([ 0.4, 1, 1, 1 ]),
    Mtl4Gloss: Object.freeze([ 0.4, 1, 1, 1 ]),
    PMtl1DiffuseColor: Object.freeze([ 1, 1, 1, 1 ]),
    PMtl1FresnelColor: Object.freeze([ 1, 1, 1, 1 ]),
    PMtl1Gloss: Object.freeze([ 0.4, 0, 0, 0 ]),
    PMtl2DiffuseColor: Object.freeze([ 1, 1, 1, 1 ]),
    PMtl2FresnelColor: Object.freeze([ 1, 1, 1, 1 ]),
    PMtl2Gloss: Object.freeze([ 0.4, 0, 0, 0 ])
});

function materialBinding(record)
{
    const binding = (record.pipeline.bindGroups ?? [])
        .flatMap((group) => group.bindings ?? [])
        .find((entry) => entry.name === "$LocalConstants");
    if (!binding?.carbon?.constants?.length) fail("package declares no material constants");
    return binding;
}


/**
 * Resolve one value for every material constant the package declares.
 *
 * `PackMaterialConstants` needs a value for each and fails closed on a gap, so
 * twenty values have to come from somewhere. Three sources, in descending order
 * of how much they mean:
 *
 * 1. The hull's own SOF material, when `options.sof` is set. This is what the
 *    hull actually looks like in the client.
 * 2. The package's own `constantValues` block, when it carries one. These are
 *    Carbon's defaults — white everywhere — so the hull shows its maps with no
 *    material on top.
 * 3. The transcribed copy of those same defaults, for packages built by an
 *    emitter that carries the constant LAYOUT but no values.
 *
 * A constant the chosen source does not name falls through to the defaults
 * rather than to zero: a zero-filled material is not a neutral one, it is a
 * black hull with no gloss, and it reads as a broken shader.
 *
 * @param {object} record Validated package record.
 * @param {object} [options] `{ sof }` to use the hull's SOF material.
 * @returns {object} Constant name to number array.
 */
export function getHullMaterialDefaults(record, options = {})
{
    validateHullPackageRecord(record);
    const binding = materialBinding(record);
    const bytes = Uint8Array.from(binding.carbon.constantValues ?? []);
    const values = {};
    if (options.sof)
    {
        for (const constant of binding.carbon.constants)
        {
            const value = HULL_SOF_MATERIAL[constant.name] ?? CARBON_MATERIAL_DEFAULTS[constant.name];
            if (!value) fail(`no SOF or Carbon value is recorded for constant ${constant.name}`);
            if (value.length !== constant.size >> 2)
            {
                fail(`recorded value for ${constant.name} does not match its declared size`);
            }
            values[constant.name] = [ ...value ];
        }
        return Object.freeze(values);
    }
    if (bytes.byteLength >= binding.carbon.constantValueSize)
    {
        const floats = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength >> 2);
        for (const constant of binding.carbon.constants)
        {
            const first = constant.offset >> 2;
            const count = constant.size >> 2;
            values[constant.name] = Array.from(floats.subarray(first, first + count));
        }
        return Object.freeze(values);
    }
    // No value block. Fall back to the transcribed table rather than to zeroes:
    // a zero-filled material is not a neutral one, it is a black ship with no
    // gloss, and it would read as a broken shader instead of a missing default.
    for (const constant of binding.carbon.constants)
    {
        const fallback = CARBON_MATERIAL_DEFAULTS[constant.name];
        if (!fallback) fail(`no Carbon default is recorded for constant ${constant.name}`);
        if (fallback.length !== constant.size >> 2)
        {
            fail(`recorded Carbon default for ${constant.name} does not match its declared size`);
        }
        values[constant.name] = [ ...fallback ];
    }
    return Object.freeze(values);
}

/* ---------------------------------------------------------------------- */
/* Camera                                                                  */
/* ---------------------------------------------------------------------- */

/*
 * Row-vector, left-handed, depth 0..1 — Carbon's convention, and the one the
 * DXBC-derived shader was compiled against. A point is a row: `p' = p * M`, so
 * a composition reads left to right and `viewProjection` is `view * projection`
 * rather than the other way round. Getting the order backwards here produces a
 * frame that is empty rather than wrong, which is the expensive kind of
 * mistake, so the composition is written once and used everywhere.
 *
 * These are LOGICAL matrices. `buildEveSpaceObjectMainUniformData` transposes
 * every 4x4 once on its way into cbuffer register rows, so nothing here should
 * pre-transpose to "help".
 */

function identityMatrix()
{
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
}

function identityMatrices(count)
{
    const values = [];
    for (let index = 0; index < count; index += 1) values.push(...identityMatrix());
    return values;
}

function zeros(count)
{
    return new Array(count).fill(0);
}

function multiply(left, right)
{
    const out = new Array(16).fill(0);
    for (let row = 0; row < 4; row += 1)
    {
        for (let column = 0; column < 4; column += 1)
        {
            let sum = 0;
            for (let index = 0; index < 4; index += 1)
            {
                sum += left[row * 4 + index] * right[index * 4 + column];
            }
            out[row * 4 + column] = sum;
        }
    }
    return out;
}

function transpose(matrix)
{
    const out = new Array(16);
    for (let row = 0; row < 4; row += 1)
    {
        for (let column = 0; column < 4; column += 1)
        {
            out[column * 4 + row] = matrix[row * 4 + column];
        }
    }
    return out;
}

function normalize(vector)
{
    const length = Math.hypot(vector[0], vector[1], vector[2]);
    if (!length) fail("cannot normalize a zero-length camera axis");
    return [ vector[0] / length, vector[1] / length, vector[2] / length ];
}

function cross(left, right)
{
    return [
        left[1] * right[2] - left[2] * right[1],
        left[2] * right[0] - left[0] * right[2],
        left[0] * right[1] - left[1] * right[0]
    ];
}

function dot(left, right)
{
    return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function lookAtLH(eye, target, up)
{
    const zAxis = normalize([ target[0] - eye[0], target[1] - eye[1], target[2] - eye[2] ]);
    const xAxis = normalize(cross(up, zAxis));
    const yAxis = cross(zAxis, xAxis);
    return [
        xAxis[0], yAxis[0], zAxis[0], 0,
        xAxis[1], yAxis[1], zAxis[1], 0,
        xAxis[2], yAxis[2], zAxis[2], 0,
        -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1
    ];
}

function perspectiveLH(fovY, aspect, near, far)
{
    const yScale = 1 / Math.tan(fovY / 2);
    const xScale = yScale / aspect;
    const range = far / (far - near);
    return [
        xScale, 0, 0, 0,
        0, yScale, 0, 0,
        0, 0, range, 1,
        0, 0, -near * range, 0
    ];
}

/**
 * The camera world matrix, which is the inverse of a `lookAtLH` view. Built
 * directly from the axes rather than inverted numerically, because an
 * orthonormal basis plus a translation inverts exactly and a general inverse
 * does not.
 */
function cameraWorld(eye, target, up)
{
    const zAxis = normalize([ target[0] - eye[0], target[1] - eye[1], target[2] - eye[2] ]);
    const xAxis = normalize(cross(up, zAxis));
    const yAxis = cross(zAxis, xAxis);
    return [
        xAxis[0], xAxis[1], xAxis[2], 0,
        yAxis[0], yAxis[1], yAxis[2], 0,
        zAxis[0], zAxis[1], zAxis[2], 0,
        eye[0], eye[1], eye[2], 1
    ];
}

/**
 * A three-quarter view framing the whole hull.
 *
 * `af1_t1` measures roughly 25 by 13 by 54 in model units, so the camera sits
 * back far enough for the long axis to fit and slightly above the centreline,
 * which is the angle that makes a ship read as a ship.
 */
export const HULL_CAMERA = Object.freeze({
    eye: Object.freeze([ 38, 16, -52 ]),
    target: Object.freeze([ 0, 0, 0 ]),
    up: Object.freeze([ 0, 1, 0 ]),
    fovY: Math.PI / 4,
    near: 1,
    far: 5000
});

/**
 * Build the five constant-buffer value sets for one hull draw.
 *
 * @param {object} record Validated package record, for its material defaults.
 * @param {number} width Target width in pixels.
 * @param {number} height Target height in pixels.
 * @returns {object} Frozen `{ material, perFrameVS, perFramePS, perObjectVS, perObjectPS }`.
 */
export function createHullBindingValues(record, width, height, options = {})
{
    if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1)
    {
        fail("target dimensions must be positive integers");
    }
    const camera = HULL_CAMERA;
    const view = lookAtLH(
        [ ...camera.eye ], [ ...camera.target ], [ ...camera.up ]
    );
    const projection = perspectiveLH(camera.fovY, width / height, camera.near, camera.far);
    const viewProjection = multiply(view, projection);
    // The shader reads the eye position out of this matrix, so it is a real
    // inverse-transpose rather than the identity the gate fixtures can afford.
    const viewInverseTranspose = transpose(
        cameraWorld([ ...camera.eye ], [ ...camera.target ], [ ...camera.up ])
    );

    // A single directional key light, warm and slightly off the camera axis so
    // the hull's surfaces separate. Nothing here claims to match the client's sun.
    //
    // DirWorld points TO the light, not along the direction the light travels.
    // The pixel stage dots it against the surface normal and clamps at zero, so
    // the sign is not cosmetic: reversed, every camera-facing surface clamps to
    // zero and the sun contributes NOTHING while ambient and the environment
    // carry on unchanged. That failure reads as "the lighting is a bit flat",
    // not as a broken light, which is what makes it worth stating here.
    const sun = Object.freeze({
        DirWorld: [ 0.42, 0.5, -0.76 ],
        unused_pad0: 0,
        DiffuseColor: [ 2.4, 2.25, 2, 1 ]
    });

    const perFrameVS = Object.freeze({
        ViewInverseTransposeMat: viewInverseTranspose,
        ViewProjectionMat: viewProjection,
        ViewMat: view,
        ProjectionMat: projection,
        ShadowViewMat: identityMatrix(),
        ShadowViewProjectionMat: identityMatrix(),
        EnvMapRotationMat: identityMatrix(),
        // No motion this frame, so the "last" matrices are this frame's. Zero
        // or identity would make the velocity target read as a full-screen
        // sweep instead of a still.
        ViewProjectionLast: viewProjection,
        ViewLast: view,
        ProjLast: projection,
        Sun: sun,
        FogFactors: [ 0, 1, 0 ],
        pad: 0,
        TargetResolution: [ width, height ],
        FovXY: [ camera.fovY, camera.fovY ],
        ViewportAdjustment: [ 1, 1, 0, 0 ],
        Time: 0,
        Upscaling: 1,
        ViewportSize: [ width, height ]
    });

    const perFramePS = Object.freeze({
        ViewInverseTransposeMat: viewInverseTranspose,
        ViewMat: view,
        EnvMapRotationMat: identityMatrix(),
        Sun: sun,
        AmbientColor: [ 0.16, 0.17, 0.2 ],
        ReflectionIntensity: 0.45,
        FogColor: [ 0, 0, 0, 0 ],
        ViewportOffset: [ 0, 0 ],
        ViewportSize: [ width, height ],
        TargetResolution: [ width, height ],
        DepthMapSampleCount: 1,
        Debug: 0,
        // Shadowing is off: the shadow map is a white placeholder and these
        // settings must agree with it, or the shader spends the whole frame
        // sampling a texture that carries no depth.
        ShadowMapSettings: [ 1, 1, 0, 0 ],
        ShadowCameraRange: [ 0, 1 ],
        ShadowLightness: 1,
        ShadowQuality: 0,
        ProjectionToView: [ 1, 1 ],
        FovXY: [ camera.fovY, camera.fovY ],
        Time: 0,
        SceneMipLodBias: 0,
        Upscaling: 1,
        GammaBrightness: 2,
        FrameIndex: 0,
        Jittering: 0,
        InverseShadowMapAtlasSize: 1,
        ShadowMapAtlasEntryMinSizeLog2: 0,
        VolumetricSlices: [ 0, 0, 0, 0 ],
        ShadowMapValues: identityMatrix(),
        ShadowMatrixVal: identityMatrices(16),
        SplitInfo: [ 0, 0, 0, 0 ],
        ProjectionInverseMat: identityMatrix(),
        CascadeRanges: zeros(64),
        FroxelFogData: Object.freeze({
            FogColor: [ 0, 0, 0 ],
            BackgroundVisibility: 1,
            BaseDensity: 0,
            MaxDistance: 0,
            MaxDistanceVisibility: 1,
            EnvironmentIntensity: 0,
            EnvironmentG: 0,
            _pad0: 0,
            _pad1: 0,
            _pad2: 0,
            planets: zeros(8)
        })
    });

    const perObjectVS = Object.freeze({
        worldTransform: identityMatrix(),
        worldTransformLast: identityMatrix(),
        invWorldTransform: identityMatrix(),
        // shipData.y is the activation strength the PPT pass fades glow and
        // pattern contribution against. At 0 the hull renders unlit-looking and
        // reads as a failed draw, so a fully activated ship is the only useful
        // value here.
        shipData: [ 0, 1, 0, 0 ],
        // Clipping off. The pixel stage's clip radii below have to say the same
        // thing: a zero radius with a non-zero factor discards the whole hull.
        clipData: [ 0, 0, 0, 0 ],
        ellpsoidRadii: [ 1, 1, 1, 0 ],
        ellpsoidCenter: [ 0, 0, 0, 0 ],
        customMaskMatrix: identityMatrices(2),
        customMaskData: zeros(8),
        boneOffsets: [ 0, 0, 1, 0 ],
        morphTargetVertexDataOffset: 0,
        morphTargetAnimationDataOffset: 0,
        activeMorphTargetsCount: 0,
        bakedMorphTargetVertexDataOffset: 0,
        customData: [ 0, 0, 0, 0 ]
    });

    // A flat ambient probe. Only the constant band is set, so the hull picks up
    // an even fill rather than a directional bias this scene has not earned.
    const shLightingCoefficients = zeros(28);
    shLightingCoefficients[0] = 0.3;
    shLightingCoefficients[1] = 0.31;
    shLightingCoefficients[2] = 0.34;

    const perObjectPS = Object.freeze({
        worldTransform: identityMatrix(),
        worldTransformLast: identityMatrix(),
        invWorldTransform: identityMatrix(),
        shipData: [ 0, 1, 0, 0 ],
        clipSphereCenter: [ 0, 0, 0 ],
        clipRadiusSq: 0,
        clipRadius2Sq: 0,
        impactDataOffset: 0,
        clipSphereFactor2: 0,
        clipSphereFactor: 0,
        shLightingCoefficients,
        customMaskMaterialIDs: zeros(8),
        customMaskTargets: zeros(8),
        customMaskClamps: [ 0, 1, 0, 1 ],
        screenSize: [ width, height, 1 / width, 1 / height ],
        customData: [ 0, 0, 0, 0 ]
    });

    return Object.freeze({
        material: getHullMaterialDefaults(record, options),
        perFrameVS,
        perFramePS,
        perObjectVS,
        perObjectPS
    });
}
