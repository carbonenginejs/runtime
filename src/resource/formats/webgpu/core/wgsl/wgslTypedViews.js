import { CARBON_VIEW_FORMATS, unboundUavRegistersFor } from "../../../hlsl/core/carbonTypedViews.js";

/**
 * The shader program without the UAVs Carbon never binds
 * (`CARBON_UNBOUND_UAVS`): their bindings leave the binding list, and
 * `unboundUavRegisters` names their registers, whose stores then lower to
 * nothing, as D3D11 drops a write to an empty UAV slot. The instructions and
 * blocks are untouched, so every position the program records still holds.
 *
 * @param {object} program Frozen CJS shader IR.
 * @param {object[]} semanticBindings The stage's effect-description bindings.
 * @returns {object} The program, or a copy without those UAVs.
 */
export function withoutUnboundUavs(program, semanticBindings)
{
    const registers = unboundUavRegistersFor(semanticBindings);
    if (!registers.length) return program;

    const unbound = new Set(registers);
    const bindings = program.bindings.filter((binding) => !(binding.resourceKind === "storage-resource"
        && (binding.range?.registerSpace ?? 0) === 0
        && unbound.has(binding.range?.lowerBound ?? binding.registerIndex)));

    return Object.freeze({
        ...program,
        bindings: Object.freeze(bindings),
        unboundUavRegisters: Object.freeze(registers)
    });
}

/**
 * What each Carbon view format (`hlsl/core/carbonTypedViews.js`) means to WGSL:
 * the storage element, the WebGPU storage-texture format, and the
 * four-component value D3D11 returns for an in-bounds element (missing
 * channels 0, alpha 1). The two single-channel 32-bit formats are ones WebGPU
 * allows as read-write storage textures; a `writeOnly` format is a write-only
 * storage texture and never a typed buffer.
 *
 * A uint view applies to render stages only: compute already reads uint
 * buffers as raw words and writes uint UAVs atomically, in the audited
 * histogram profiles among others, and those layouts stay as they are.
 */
export const TYPED_VIEW_FORMATS = Object.freeze({
    R32_FLOAT: Object.freeze({
        returnType: CARBON_VIEW_FORMATS.R32_FLOAT.componentClass,
        element: "f32",
        storageTextureFormat: "r32float",
        renderStagesOnly: false,
        expand: (value) => `vec4<f32>(${value}, 0.0, 0.0, 1.0)`
    }),
    R32_UINT: Object.freeze({
        returnType: CARBON_VIEW_FORMATS.R32_UINT.componentClass,
        element: "u32",
        storageTextureFormat: "r32uint",
        renderStagesOnly: true,
        expand: (value) => `vec4<u32>(${value}, 0u, 0u, 1u)`
    }),
    R32_SINT: Object.freeze({
        returnType: CARBON_VIEW_FORMATS.R32_SINT.componentClass,
        element: "i32",
        storageTextureFormat: "r32sint",
        renderStagesOnly: true,
        expand: (value) => `vec4<i32>(${value}, 0i, 0i, 1i)`
    }),
    // Four channels: a write-only storage texture and nothing else. Core
    // WebGPU has no read-write rgba8snorm, and no typed buffer takes it, since
    // an array element cannot hold four packed snorm bytes.
    R8G8B8A8_SNORM: Object.freeze({
        returnType: CARBON_VIEW_FORMATS.R8G8B8A8_SNORM.componentClass,
        element: "f32",
        storageTextureFormat: "rgba8snorm",
        renderStagesOnly: false,
        writeOnly: true,
        expand: (value) => value
    })
});

const SCALAR_EXPANSION = Object.freeze({
    f32: (value) => `vec4<f32>(${value}, 0.0, 0.0, 1.0)`,
    u32: (value) => `vec4<u32>(${value}, 0u, 0u, 1u)`,
    i32: (value) => `vec4<i32>(${value}, 0i, 0i, 1i)`
});

/**
 * A typed-buffer `ld` from a storage array of `element`, zero out of bounds.
 *
 * D3D's `ld` always returns four components, so a scalar element (a
 * single-channel buffer, such as the R32_UINT histogram a compute program
 * reads) widens as a single-channel format does - missing channels 0, alpha 1
 * - and the instruction's swizzle then applies to a vector, as it must.
 * Without the widening a `.x` landed on a scalar: "cannot index into
 * expression of type 'u32'". A vector element is returned as it is.
 *
 * @param {string} element The array's element type, e.g. `u32` or `vec4<f32>`.
 * @param {string} symbol The storage array's name.
 * @param {string} address The element index expression.
 * @param {string} length The array-length expression.
 * @returns {string} A four-component WGSL expression.
 */
export function typedBufferLoad(element, symbol, address, length)
{
    const expand = SCALAR_EXPANSION[element];
    const clamped = `${symbol}[min(${address}, ${length} - 1u)]`;

    return expand
        ? `select(vec4<${element}>(), ${expand(clamped)}, ${address} < ${length})`
        : `select(${element}(), ${clamped}, ${address} < ${length})`;
}
