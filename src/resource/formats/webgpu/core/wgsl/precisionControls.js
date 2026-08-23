const COMPONENT_MASK = /^x?y?z?w?$/u;
const REFACTORING_ALLOWED = 1 << 11;

function fail(stage, instruction, message)
{
    throw new Error(`WGSL ${stage} instruction ${instruction.index} precise ${instruction.opcodeName} ${message}`);
}

/**
 * Requires the DXBC shader to opt into refactoring. Without the global flag,
 * DXBC defines every operation as precise, which portable WGSL cannot promise.
 *
 * @param {object} program CJS shader IR.
 * @param {string} stage Diagnostic stage label.
 */
export function requireRefactoringAllowed(program, stage)
{
    const declarations = program.declarations.filter((entry) => entry.opcodeName === "dcl_global_flags");
    if (declarations.length !== 1)
    {
        throw new Error(`WGSL ${stage} shader requires exactly one dcl_global_flags declaration`);
    }
    const data = declarations[0].data;
    if (!Number.isInteger(data?.globalFlags) || data.globalFlags < 0
        || typeof data.refactoringAllowed !== "boolean"
        || data.refactoringAllowed !== ((data.globalFlags & REFACTORING_ALLOWED) !== 0))
    {
        throw new Error(`WGSL ${stage} shader has inconsistent dcl_global_flags metadata`);
    }
    if (!data.refactoringAllowed)
    {
        throw new Error(`WGSL ${stage} shader disables refactoring globally; exact lowering is not representable in WGSL`);
    }
}

/**
 * Validates precise-mask metadata only. ADAPTED CONTRACT (requester decision,
 * 2026-07-20): DXBC `precise` operations are accepted and lowered as ordinary
 * IEEE float math, and the vertex position output is emitted `@invariant`.
 * WGSL has no general no-contraction control, so bit-exact parity with native
 * D3D11 arithmetic is NOT promised; `@invariant` instead guarantees identical
 * position results across the pipelines built from the same emitted WGSL,
 * which is the multi-pass invariance `precise` protects in these shaders.
 * See docs/reference/wgsl-compatibility.md ("precise" entry) before changing
 * this.
 *
 * @param {object} instruction Typed CJS shader IR instruction.
 * @param {string} stage Diagnostic stage label.
 */
export function validatePreciseInstruction(instruction, stage)
{
    const mask = instruction.preciseMask;
    if (typeof mask !== "string" || !COMPONENT_MASK.test(mask))
    {
        fail(stage, instruction, `has malformed component mask ${String(mask)}`);
    }
    if (!mask) return;
    const writes = instruction.dataflow?.writes || [];
    if (!writes.length
        || Array.from(mask).some((component) => !writes.some((write) => write.mask.includes(component))))
    {
        fail(stage, instruction, `mask ${mask} requires a destination write containing every precise lane`);
    }
}
