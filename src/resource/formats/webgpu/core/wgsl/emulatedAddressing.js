// Clamp-to-border and mirror-once, emulated in WGSL.
//
// WebGPU's GPUAddressMode has exactly three values - clamp-to-edge, repeat and
// mirror-repeat - and no border colour anywhere in GPUSamplerDescriptor. D3D's
// TA_BORDER and TA_MIRROR_ONCE therefore cannot be expressed by a sampler at
// all, and no WebGPU feature adds them. The shader has to do it.
//
// TRANSCRIBED FROM `DxbcGlslEmitter`'s helpers so the two backends cannot
// drift. The semantics are that emitter's, verified there and exercised
// continuously, since the WebGL2 path emulates border in practice rather than
// reaching for EXT_texture_border_clamp.
//
// Modes are the Trinity enum as stored: 1 wrap, 2 mirror, 3 clamp-edge,
// 4 border, 5 mirror-once. ZERO MEANS "NOTHING TO EMULATE", which is what every
// failure produces - a zeroed buffer, an absent upload, a texture the consumer
// did not know about. Carbon's enum starts at 1 and no shipped sampler carries
// 0, so 0 cannot swallow a real mode.
//
// Two named arities rather than an overload: WGSL has no function overloading,
// and a 2D sample has no third coordinate even though its sampler may still
// declare a W mode - eight shipped samplers declare border on W - which must
// not be tested against a component that does not exist.

import { CARBON_BACKEND_ADDRESS_MODES_SYMBOL } from "../../../../format/carbonEffect/carbonEffectBackendBlock.js";

/** Helper names, so the emitter and its tests cannot disagree about spelling. */
export const ADDRESS_COORD_2 = "cjsAddressCoord2";

/** @see ADDRESS_COORD_2 */
export const ADDRESS_COORD_3 = "cjsAddressCoord3";

/** @see ADDRESS_COORD_2 */
export const ADDRESS_BORDER_2 = "cjsAddressBorder2";

/** @see ADDRESS_COORD_2 */
export const ADDRESS_BORDER_3 = "cjsAddressBorder3";

/** The two authored modes WebGPU cannot express. */
export const BORDER_MODE = 4;

/** @see BORDER_MODE */
export const MIRROR_ONCE_MODE = 5;

/**
 * Whether an axis list carries a mode that has to be emulated.
 *
 * @param {number[]} modes Authored `[u, v, w]` modes.
 * @returns {boolean} True when any axis is border or mirror-once.
 */
export function NeedsEmulation(modes)
{
    return (modes ?? []).some((mode) => mode === BORDER_MODE || mode === MIRROR_ONCE_MODE);
}

/**
 * The helper function sources, emitted once per module that samples through an
 * emulated mode.
 *
 * `cjsAddressCoord*` transforms the coordinate BEFORE the fetch;
 * `cjsAddressBorder*` tests the result AFTER it. That is why they are separate:
 * the border test composes with every sample form the emitter produces -
 * textureSample, textureSampleBias, textureSampleLevel and textureSampleGrad -
 * instead of needing a variant for each.
 *
 * @returns {string[]} WGSL source lines.
 */
export function EmulatedAddressingHelpers(used)
{
    const wanted = used instanceof Set ? used : null;
    const keep = (name, lines) => (!wanted || wanted.has(name) ? lines : []);

    return [
        ...keep(ADDRESS_COORD_2, [
            `fn ${ADDRESS_COORD_2}(uv: vec2<f32>, modes: vec2<f32>) -> vec2<f32>`,
            "{",
            "    var out = uv;",
            `    if (i32(modes.x) == ${MIRROR_ONCE_MODE}) { out.x = clamp(abs(out.x), 0.0, 1.0); }`,
            `    if (i32(modes.y) == ${MIRROR_ONCE_MODE}) { out.y = clamp(abs(out.y), 0.0, 1.0); }`,
            "    return out;",
            "}",
        ]),
        ...keep(ADDRESS_COORD_2, [ "" ]),
        ...keep(ADDRESS_COORD_3, [
            `fn ${ADDRESS_COORD_3}(uv: vec3<f32>, modes: vec3<f32>) -> vec3<f32>`,
            "{",
            "    var out = uv;",
            `    if (i32(modes.x) == ${MIRROR_ONCE_MODE}) { out.x = clamp(abs(out.x), 0.0, 1.0); }`,
            `    if (i32(modes.y) == ${MIRROR_ONCE_MODE}) { out.y = clamp(abs(out.y), 0.0, 1.0); }`,
            `    if (i32(modes.z) == ${MIRROR_ONCE_MODE}) { out.z = clamp(abs(out.z), 0.0, 1.0); }`,
            "    return out;",
            "}",
        ]),
        ...keep(ADDRESS_COORD_3, [ "" ]),
        // Testing the post-transform coordinate is safe: an axis is either
        // mirror-once or border, never both, and mirror-once leaves other axes
        // untouched.
        ...keep(ADDRESS_BORDER_2, [
            `fn ${ADDRESS_BORDER_2}(sampled: vec4<f32>, uv: vec2<f32>, modes: vec2<f32>, borderColor: vec4<f32>) -> vec4<f32>`,
            "{",
            `    if (i32(modes.x) == ${BORDER_MODE} && (uv.x < 0.0 || uv.x > 1.0)) { return borderColor; }`,
            `    if (i32(modes.y) == ${BORDER_MODE} && (uv.y < 0.0 || uv.y > 1.0)) { return borderColor; }`,
            "    return sampled;",
            "}",
        ]),
        ...keep(ADDRESS_BORDER_2, [ "" ]),
        ...keep(ADDRESS_BORDER_3, [
            `fn ${ADDRESS_BORDER_3}(sampled: vec4<f32>, uv: vec3<f32>, modes: vec3<f32>, borderColor: vec4<f32>) -> vec4<f32>`,
            "{",
            `    if (i32(modes.x) == ${BORDER_MODE} && (uv.x < 0.0 || uv.x > 1.0)) { return borderColor; }`,
            `    if (i32(modes.y) == ${BORDER_MODE} && (uv.y < 0.0 || uv.y > 1.0)) { return borderColor; }`,
            `    if (i32(modes.z) == ${BORDER_MODE} && (uv.z < 0.0 || uv.z > 1.0)) { return borderColor; }`,
            "    return sampled;",
            "}",
        ]),
        ...keep(ADDRESS_BORDER_3, [ "" ]),
        ""
    ];
}

/**
 * A WGSL literal for one texture's baked border colour.
 *
 * BAKED, NOT READ FROM THE BUFFER. Carbon's `AddSamplerOverride` takes only U
 * and V, so no override can change the colour, and it is not always transparent
 * black: `specialfx/cloud`, `cloudsimple` and `volumetrichalfsphereglow` author
 * opaque white.
 *
 * @param {number[]} color Four authored components.
 * @returns {string} A `vec4<f32>` literal.
 */
export function BorderColorLiteral(color)
{
    const components = (color ?? [ 0, 0, 0, 0 ]).map((value) =>
    {
        const parsed = Number(value);

        if (!Number.isFinite(parsed))
        {
            throw new Error("WGSL border colour components must be finite numbers");
        }

        return Number.isInteger(parsed) ? parsed.toFixed(1) : String(parsed);
    });

    if (components.length !== 4)
    {
        throw new Error("WGSL border colour must be four components");
    }

    return `vec4<f32>(${components.join(", ")})`;
}

/**
 * A WGSL expression reading one texture's axis modes at draw time.
 *
 * READ, NOT BAKED. A quad pattern's wrap modes are changed by users at will -
 * `EveSOF` writes `projectionAddressModeU`/`V` into a sampler override named
 * after the texture - so a mode baked at translation time would freeze a value
 * the player can still change. The GLSL emitter reads them for the same reason:
 * it "is what lets an override correct a container that is wrong".
 *
 * The WebGL2 path indexes by resource register; this one passes the SAMPLER
 * register, as Carbon's overrides key the sampler (withEmulatedAddressing).
 *
 * @param {string} bufferSymbol Generated symbol of the modes buffer.
 * @param {number} resourceRegister The register the buffer is indexed by.
 * @param {number} components 2 or 3.
 * @returns {string} A `vec2<f32>` or `vec3<f32>` expression.
 */
export function ModesExpression(bufferSymbol, resourceRegister, components)
{
    if (components !== 2 && components !== 3)
    {
        throw new Error("WGSL emulated addressing takes two or three axes");
    }

    if (!bufferSymbol)
    {
        throw new Error("WGSL emulated addressing needs the modes buffer symbol");
    }

    if (!Number.isInteger(resourceRegister) || resourceRegister < 0)
    {
        throw new Error("WGSL emulated addressing needs a resource register");
    }

    return `${bufferSymbol}[${resourceRegister}].${components === 2 ? "xy" : "xyz"}`;
}

/**
 * Whether a sample must be gated, given what the container says and what the
 * caller forces.
 *
 * Two independent reasons, mirroring the GLSL profile. The container's own
 * modes are the ordinary case. The forced list is for a sampler whose mode can
 * CHANGE - a quad pattern's does - where the container gives no reason to gate
 * but a user can still select border or mirror-once later.
 *
 * @param {number[]} modes Container modes for the sampler, if known.
 * @param {object|null} forced The caller's entry for this texture, if it forced one.
 * @returns {boolean} True when the sample needs the helpers.
 */
export function ShouldEmulate(modes, forced)
{
    return NeedsEmulation(modes) || Boolean(forced);
}

/**
 * The constant-buffer register the modes buffer takes, as the WebGL2 path's
 * `emulatedAddressingRegister` (docs/specifications/webgl2-emulated-addressing.md).
 */
export const ADDRESS_MODES_REGISTER = 8;

/**
 * The modes buffer's WGSL symbol. It is not `cb8`, so the backend can tell
 * this buffer, which it fills itself, from a constant buffer the effect binds.
 */
export const ADDRESS_MODES_SYMBOL = CARBON_BACKEND_ADDRESS_MODES_SYMBOL;

/** The sample forms the fragment lowering emulates addressing for. */
const SAMPLE_OPCODES = new Set([ "sample", "sample_b", "sample_l", "sample_d" ]);

/**
 * The pixel program with emulated addressing switched on: when one of its
 * samples goes through a sampler whose AUTHORED state has a border or
 * mirror-once axis, the program gains the modes buffer as a uniform binding
 * at `ADDRESS_MODES_REGISTER`, and `emulatedAddressing` names those samplers.
 *
 * KEYED BY SAMPLER REGISTER, as Carbon keys an override: its
 * `Tr2Effect::RebuildSamplerOverrides` writes the sampler register, so every
 * texture on a shared sampler changes together. The backend fills
 * `modes[samplerRegister]` from the sampler state actually bound there, so an
 * override that keeps an emulated mode is honoured; one that adds border to a
 * sampler the container did not author with it is not gated here.
 *
 * @param {object} program Frozen CJS shader IR.
 * @param {object[]} semanticBindings The stage's effect-description bindings.
 * @returns {object} The program, or a copy with emulated addressing.
 */
export function withEmulatedAddressing(program, semanticBindings)
{
    if (program.stage !== "pixel") return program;

    const samplerModes = {};

    for (const binding of semanticBindings || [])
    {
        const state = binding?.kind === "sampler" && (binding.registerSpace ?? 0) === 0 ? binding.carbon?.sampler : null;
        if (!state) continue;

        const axes = [ state.addressU, state.addressV, state.addressW ];
        if (!NeedsEmulation(axes)) continue;

        samplerModes[binding.registerIndex] = {
            u: axes[0],
            v: axes[1],
            w: axes[2],
            borderColor: [ ...(state.borderColor ?? [ 0, 0, 0, 0 ]) ]
        };
    }

    const registers = Object.keys(samplerModes).map(Number);
    const sampled = program.instructions.some((instruction) => SAMPLE_OPCODES.has(instruction.opcodeName)
        && registers.includes(instruction.operands?.[3]?.registerIndex));

    if (!sampled) return program;

    if (program.bindings.some((binding) => binding.resourceKind === "uniform-buffer"
        && (binding.range?.registerSpace ?? 0) === 0
        && (binding.range?.lowerBound ?? binding.registerIndex) === ADDRESS_MODES_REGISTER))
    {
        throw new Error(`WGSL emulated addressing needs constant-buffer register ${ADDRESS_MODES_REGISTER}, which the shader already declares`);
    }

    const modesBuffer = {
        kind: "binding",
        id: `uniform-buffer:space0:range${ADDRESS_MODES_REGISTER}`,
        resourceKind: "uniform-buffer",
        operandType: "constant_buffer",
        declarationOffset: -1,
        registerIndex: ADDRESS_MODES_REGISTER,
        range: {
            bindingModel: "sm5.0-register",
            rangeId: null,
            lowerBound: ADDRESS_MODES_REGISTER,
            upperBound: ADDRESS_MODES_REGISTER,
            unbounded: false,
            registerCount: 1,
            registerSpace: 0
        },
        accessPattern: "dynamic_indexed",
        resourceDimension: null,
        structureStride: null,
        returnType: null,
        synthetic: "emulated-addressing"
    };

    return {
        ...program,
        bindings: [ ...program.bindings, modesBuffer ],
        emulatedAddressing: {
            samplerModes: samplerModes,
            bufferRegister: ADDRESS_MODES_REGISTER,
            sizeInVec4: Math.max(...registers) + 1
        }
    };
}
