// Minimal SM5.0 compute programs, one per general-path lowering added for the
// particle update kernel, as decoded DXBC records. Each takes the address (or
// structure index) it touches, so a caller can build an in-bounds and an
// out-of-bounds variant. Shared by the compute WGSL tests (static checks) and
// the GPU execution probe that runs the WGSL against D3D's rules.
//
// D3D11 rules these exercise (Direct3D 11.3 functional specification, UAV
// access): an out-of-bounds UAV read returns 0; an out-of-bounds UAV write or
// atomic changes no memory, and a returning atomic then yields 0.
import CjsWebgpuFormat from "../../src/resource/formats/webgpu/index.js";
import { buildWgslBindingPlan } from "../../src/resource/formats/webgpu/core/wgsl/buildWgslBindingPlan.js";

function register(typeName, registerIndex, { componentCount = 4, mask = "", swizzle = "", selected = "" } = {})
{
    return {
        typeName,
        componentCount,
        mask,
        swizzle,
        selected,
        modifierName: "none",
        minPrecisionName: "default",
        nonUniform: false,
        registerIndex,
        indices: Number.isInteger(registerIndex) ? [ { values: [ registerIndex ], relative: null } ] : [],
        immediateValues: []
    };
}

function immediate(bits)
{
    return {
        ...register("immediate32", null, { componentCount: bits.length }),
        immediateValues: bits.map((uint32) => ({ uint32: uint32 >>> 0, float32: 0 }))
    };
}

let offset = 0;

function declaration(opcodeName, data, operand = null)
{
    offset += 4;
    return { offset, opcode: 0, opcodeName, isDeclaration: true, declaration: data, operands: operand ? [ operand ] : [] };
}

function op(opcodeName, operands)
{
    offset += 4;
    return { offset, opcode: 0, opcodeName, isDeclaration: false, operands };
}

function typedReturn(typeName)
{
    const value = { sint: 3, uint: 4, float: 5 }[typeName];
    return { returnTypes: [ value, value, value, value ], returnTypeNames: [ typeName, typeName, typeName, typeName ] };
}

const typedUav = (registerIndex, typeName) => declaration("dcl_unordered_access_view_typed", {
    resourceDimensionName: "buffer",
    globallyCoherent: false,
    returnType: typedReturn(typeName),
    registerIndex
}, register("uav", registerIndex, { componentCount: 0 }));

const structuredUav = (registerIndex, structureStride) => declaration("dcl_unordered_access_view_structured", {
    structureStride,
    globallyCoherent: false,
    hasCounter: false,
    registerIndex
}, register("uav", registerIndex, { componentCount: 0 }));

function program(declarations, body)
{
    offset = 0;
    return {
        program: { programType: 5, programTypeName: "compute", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [], patch: [] },
        instructions: [
            declaration("dcl_global_flags", { globalFlags: 1 << 11, refactoringAllowed: true }),
            ...declarations(),
            declaration("dcl_temps", { tempCount: 1 }),
            declaration("dcl_thread_group", { threadGroupX: 1, threadGroupY: 1, threadGroupZ: 1 }),
            ...body(),
            op("ret", [])
        ]
    };
}

/** Writes r0.x to word 0 of structured u1 (stride 4), so a result is observable. */
const publish = () => op("store_structured", [
    register("uav", 1, { mask: "x" }), immediate([ 0 ]), immediate([ 0 ]), register("temp", 0, { swizzle: "xxxx" })
]);

/**
 * `imm_atomic_iadd r0.x, u0, l(address), l(5)` on a typed uint or sint u0,
 * then r0.x into u1[0]. u0 is R32 words; signed takes the typed-view table's
 * R32_SINT through the binding plan, as ParticleCounters does.
 */
const rawShared = (registerIndex, byteCount) => declaration("dcl_thread_group_shared_memory_raw", {
    registerIndex,
    byteCount
}, register("thread_group_shared_memory", registerIndex, { componentCount: 0 }));

/**
 * Raw group-shared memory g0 (16 bytes) at a byte address, as computelightlists
 * uses it: `atomic_umax g0, a, l(5)` when atomic, `ld_raw r0.x, a, g0.xxxx`,
 * `store_raw g0.x, a, r0.x`, then r0.x into u1[0]. A computed address comes
 * through r0.y (`mov r0.y, l(address)`) rather than an immediate.
 *
 * @param {object} options The access.
 * @param {number} options.address Byte address.
 * @param {boolean} [options.computed] Address through a register.
 * @param {boolean} [options.atomic] Also an atomic on the word, making g0 atomic.
 * @returns {object} The fixture.
 */
export function rawGroupSharedFixture({ address, computed = false, atomic = false })
{
    const shared = (options = {}) => register("thread_group_shared_memory", 0, { componentCount: 0, ...options });
    const at = () => (computed ? register("temp", 0, { selected: "y" }) : immediate([ address ]));
    return program(
        () => [ rawShared(0, 16), structuredUav(1, 4) ],
        () => [
            ...(computed ? [ op("mov", [ register("temp", 0, { mask: "y" }), immediate([ address ]) ]) ] : []),
            ...(atomic ? [ op("atomic_umax", [ shared(), at(), immediate([ 5 ]) ]) ] : []),
            op("ld_raw", [ register("temp", 0, { mask: "x" }), at(), shared({ swizzle: "xxxx" }) ]),
            op("store_raw", [ shared({ mask: "x" }), at(), register("temp", 0, { selected: "x" }) ]),
            publish()
        ]);
}

export function immAtomicAddFixture(address, typeName = "uint")
{
    return program(
        () => [ typedUav(0, typeName), structuredUav(1, 4) ],
        () => [
            op("imm_atomic_iadd", [ register("temp", 0, { mask: "x" }), register("uav", 0, { componentCount: 0 }), immediate([ address ]), immediate([ 5 ]) ]),
            publish()
        ]);
}

/** `ld_structured r0.x, l(index), l(4), u0.xxxx` from structured u0 (stride 8), then into u1[0]. */
export function structuredUavLoadFixture(index)
{
    return program(
        () => [ structuredUav(0, 8), structuredUav(1, 4) ],
        () => [
            op("ld_structured", [ register("temp", 0, { mask: "x" }), immediate([ index ]), immediate([ 4 ]), register("uav", 0, { swizzle: "xxxx" }) ]),
            publish()
        ]);
}

/** `store_structured u0.xy, l(index), l(0), l(7, 9, 0, 0)` into structured u0 (stride 8). */
export function structuredUavStoreFixture(index)
{
    return program(
        () => [ structuredUav(0, 8) ],
        () => [
            op("store_structured", [ register("uav", 0, { mask: "xy" }), immediate([ index ]), immediate([ 0 ]), immediate([ 7, 9, 0, 0 ]) ])
        ]);
}

/** `store_uav_typed u0.xyzw, l(address), l(-3)` on a typed sint u0 (the table's R32_SINT). */
export function signedTypedStoreFixture(address)
{
    return program(
        () => [ typedUav(0, "sint") ],
        () => [
            op("store_uav_typed", [ register("uav", 0, { mask: "xyzw" }), immediate([ address, address, address, address ]), immediate([ -3, -3, -3, -3 ]) ])
        ]);
}

/** `not r0.x, l(0x0f0f0f0f)`, then into u1[0]. */
export function bitwiseNotFixture()
{
    return program(
        () => [ structuredUav(1, 4) ],
        () => [
            op("not", [ register("temp", 0, { mask: "x" }), immediate([ 0x0f0f0f0f ]) ]),
            publish()
        ]);
}

/**
 * Lowers a fixture to WGSL as an effect would: through a pass binding plan
 * carrying the typed-view table's formats for the given identities.
 *
 * @param {object} fixture A decoded-DXBC fixture from this module.
 * @param {Object<string, string>} [typedViews] Identity to view format.
 * @returns {string} The WGSL.
 */
export function fixtureWgsl(fixture, typedViews = {})
{
    const ir = CjsWebgpuFormat.buildShaderIr(fixture, { source: "fixture" });
    const bindingPlan = buildWgslBindingPlan([ ir ], Object.keys(typedViews).length ? { typedViews } : {});
    return CjsWebgpuFormat.buildWgsl(ir, { bindingPlan }).code;
}
