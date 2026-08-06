/**
 * Text disassembly of a decoded DXBC token stream.
 *
 * A translated shader can only be judged against what the bytecode actually
 * says. Reading the emitted GLSL or WGSL beside the original HLSL proves
 * nothing, because the compiler that produced the bytecode already rewrote the
 * program; and the emitters cannot be their own oracle. This module turns the
 * decoder's instruction records back into assembly text so a translation can be
 * checked instruction by instruction against its own input.
 *
 * The output follows Microsoft's shader-assembly conventions closely enough to
 * read beside published DXBC listings, but it is a rendering of this decoder's
 * records, not a reimplementation of any disassembler. Every field printed here
 * comes from `DxbcInstructionDecoder`.
 */

const OPERAND_PREFIXES = Object.freeze({
    temp: "r",
    input: "v",
    output: "o",
    indexable_temp: "x",
    immediate32: "l",
    immediate64: "d",
    sampler: "s",
    resource: "t",
    constant_buffer: "cb",
    immediate_constant_buffer: "icb",
    label: "label",
    uav: "u",
    thread_group_shared_memory: "g",
    output_depth: "oDepth",
    null: "null",
    rasterizer: "rasterizer",
    output_coverage: "oMask",
    input_coverage_mask: "vCoverage",
    input_primitive_id: "vPrim",
    input_thread_id: "vThreadID",
    input_thread_group_id: "vThreadGroupID",
    input_thread_id_in_group: "vThreadIDInGroup",
    input_thread_id_in_group_flattened: "vThreadIDInGroupFlattened",
    input_domain_point: "vDomain",
    input_control_point: "vicp",
    output_control_point: "vocp",
    input_patch_constant: "vpc",
    output_depth_greater_equal: "oDepthGE",
    output_depth_less_equal: "oDepthLE"
});

/**
 * Registers whose name already stands alone: printing an index would invent a
 * dimension the encoding does not have.
 */
const UNINDEXED_OPERANDS = new Set([
    "null", "rasterizer", "output_depth", "output_depth_greater_equal",
    "output_depth_less_equal", "output_coverage", "input_coverage_mask",
    "input_primitive_id", "input_thread_id", "input_thread_group_id",
    "input_thread_id_in_group", "input_thread_id_in_group_flattened",
    "input_domain_point"
]);

/**
 * Formats one immediate component.
 *
 * Integer-typed opcodes carry their operands as the same 32 bits a float
 * opcode would, so both readings are printed when they disagree meaningfully.
 * A bare float is enough when the integer reading is small and matches.
 *
 * @param {object} value Decoded immediate with `uint32` and `float32`.
 * @returns {string} Printable component.
 */
function formatImmediateComponent(value)
{
    if (!value || typeof value !== "object")
    {
        return String(value);
    }

    const { uint32, float32 } = value;

    if (!Number.isFinite(float32))
    {
        return `0x${(uint32 >>> 0).toString(16).padStart(8, "0")}`;
    }

    if (Number.isInteger(float32) && Math.abs(float32) < 1e7)
    {
        return float32.toFixed(1);
    }

    return String(float32);
}

/**
 * Formats an operand index chain, including relative (indexed) addressing.
 *
 * @param {object} operand Decoded operand.
 * @returns {string} Printable index chain.
 */
function formatIndices(operand)
{
    const indices = operand.indices ?? [];

    if (!indices.length || UNINDEXED_OPERANDS.has(operand.typeName))
    {
        return "";
    }

    return indices.map((index) =>
    {
        const literal = index.values?.[0] ?? 0;

        if (index.relative)
        {
            // eslint-disable-next-line no-use-before-define
            const inner = formatOperand(index.relative);

            return literal ? `[${inner} + ${literal}]` : `[${inner}]`;
        }

        return `[${literal}]`;
    }).join("");
}

/**
 * Formats the component selection suffix for an operand.
 *
 * A masked destination and a swizzled source print differently, and a
 * single-component selection prints as one letter. Getting this wrong is the
 * whole reason a translation review needs the listing, so it is printed
 * exactly as encoded rather than normalized.
 *
 * @param {object} operand Decoded operand.
 * @returns {string} Printable suffix, including the leading dot.
 */
function formatSelection(operand)
{
    if (operand.selectionModeName === "mask")
    {
        return operand.mask ? `.${operand.mask}` : "";
    }

    if (operand.selectionModeName === "swizzle")
    {
        return operand.swizzle ? `.${operand.swizzle}` : "";
    }

    return operand.selected ? `.${operand.selected}` : "";
}

/**
 * Formats one decoded operand.
 *
 * @param {object} operand Decoded operand.
 * @returns {string} Printable operand.
 */
export function formatOperand(operand)
{
    if (!operand)
    {
        return "<null>";
    }

    if (operand.typeName === "immediate32" || operand.typeName === "immediate64")
    {
        const components = (operand.immediateValues ?? []).map(formatImmediateComponent);

        return `l(${components.join(", ")})`;
    }

    const prefix = OPERAND_PREFIXES[operand.typeName] ?? operand.typeName;
    let text = `${prefix}${formatIndices(operand)}${formatSelection(operand)}`;

    if (operand.minPrecisionName && operand.minPrecisionName !== "default")
    {
        text = `${text} {${operand.minPrecisionName}}`;
    }

    if (operand.nonUniform)
    {
        text = `${text} {nonuniform}`;
    }

    switch (operand.modifierName)
    {
        case "neg":
            return `-${text}`;

        case "abs":
            return `|${text}|`;

        case "absneg":
            return `-|${text}|`;

        default:
            return text;
    }
}

/**
 * Formats the trailing detail a declaration carries outside its operands.
 *
 * @param {object} instruction Decoded declaration instruction.
 * @returns {string} Printable suffix, or an empty string.
 */
function formatDeclarationDetail(instruction)
{
    const declaration = instruction.declaration;

    if (!declaration)
    {
        return "";
    }

    const parts = [];

    for (const [ key, value ] of Object.entries(declaration))
    {
        if (value === null || value === undefined || key === "registerIndex")
        {
            continue;
        }

        if (typeof value === "object")
        {
            continue;
        }

        parts.push(`${key}=${value}`);
    }

    return parts.length ? ` ; ${parts.join(" ")}` : "";
}

const OPENS_BLOCK = new Set([ "if", "else", "loop", "switch", "case", "default" ]);
const CLOSES_BLOCK = new Set([ "endif", "else", "endloop", "endswitch", "case", "default" ]);

/**
 * Disassembles a decoded DXBC instruction stream to assembly text.
 *
 * Accepts either the raw decoder (`emit: "raw"` gives `result.decoder`) or the
 * JSON form of the same record, because the two share field names.
 *
 * @param {object} decoder Decoder record with an `instructions` array.
 * @param {object} [options] Listing options.
 * @param {boolean} [options.declarations] Include declarations. Default true.
 * @param {boolean} [options.numbers] Prefix executable instructions with their
 *     index. Default true. The numbering counts executable instructions only,
 *     so it matches the order a translation walks them in.
 * @param {boolean} [options.indent] Indent control-flow bodies. Default true.
 * @returns {string} Assembly listing.
 */
export function disassembleInstructions(decoder, options = {})
{
    const instructions = decoder?.instructions ?? [];
    const showDeclarations = options.declarations !== false;
    const showNumbers = options.numbers !== false;
    const indentBodies = options.indent !== false;
    const lines = [];
    let index = 0;
    let depth = 0;

    for (const instruction of instructions)
    {
        const name = instruction.opcodeName ?? `opcode_${instruction.opcode}`;

        if (instruction.isDeclaration)
        {
            if (showDeclarations)
            {
                const operands = (instruction.operands ?? []).map(formatOperand).join(", ");

                lines.push(`${" ".repeat(showNumbers ? 6 : 0)}${name}${operands ? ` ${operands}` : ""}`
                    + formatDeclarationDetail(instruction));
            }

            continue;
        }

        if (instruction.customData)
        {
            const className = instruction.customData.dataClassName ?? "custom_data";

            lines.push(`${" ".repeat(showNumbers ? 6 : 0)}${className}`);
            continue;
        }

        if (indentBodies && CLOSES_BLOCK.has(name))
        {
            depth = Math.max(0, depth - 1);
        }

        const operands = (instruction.operands ?? []).map(formatOperand).join(", ");
        const modifiers = instruction.saturate ? "_sat" : "";
        const precise = instruction.preciseMask ? ` {precise ${instruction.preciseMask}}` : "";
        const prefix = showNumbers ? `${String(index).padStart(4)}: ` : "";
        const pad = indentBodies ? "  ".repeat(depth) : "";

        lines.push(`${prefix}${pad}${name}${modifiers}${operands ? ` ${operands}` : ""}${precise}`);
        index++;

        if (indentBodies && OPENS_BLOCK.has(name))
        {
            depth++;
        }
    }

    return lines.join("\n");
}

export default disassembleInstructions;
