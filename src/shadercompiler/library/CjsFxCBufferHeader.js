import { CjsSchema } from "#schema/CjsSchema";

// Not in Carbon: writes HLSL declarations for Carbon's constant-buffer structs.
//
// Carbon fills its per-frame and per-object constant buffers by copying a C++
// struct into them, so the C++ declaration order and sizes are the byte layout
// the shader reads. The runtime already records those structs as layout
// catalogs (@carbonenginejs/runtime's CjsPerFrameLayouts and
// CjsPerObjectLayouts). This turns one catalogued struct into the HLSL a shader
// includes, so the two sides come from one declaration instead of being kept in
// step by hand.
//
// HLSL does not pack a struct the way C++ does: a member may not straddle a
// 16-byte register, every array element starts a register, and a nested struct
// starts and ends on a register. This lays the members out by HLSL's rules and
// throws where the result differs from the C++ offset, so a header that
// compiles is a header whose bytes match what the engine uploads.
//
// Carbon's shaders declare these blocks as a struct variable, not a cbuffer:
// `struct PerFrameVSData { ... } PerFrameVS;` (shadercompiler
// tests/RayTracingTest.cpp:311-314). Carbon's compiler wraps a global named
// PerFrameVS, PerFramePS, PerObjectVS or PerObjectPS into the constant buffer
// slot for that name (ParserUtils.cpp:523-561, PatchCBuffers :563-600).

/** Float lanes per catalog type. */
const LANES = {
    matrix4: 16,
    quaternion: 4,
    vector4: 4,
    color: 4,
    vector3: 3,
    vector2: 2,
    float: 1,
    uint32: 1,
    int32: 1
};

/** The HLSL scalar each catalog type is made of. */
const SCALAR = {
    matrix4: "float",
    quaternion: "float",
    vector4: "float",
    color: "float",
    vector3: "float",
    vector2: "float",
    float: "float",
    uint32: "uint",
    int32: "int"
};

const COMPONENTS = "xyzw";

/**
 * Builds the HLSL text for catalogued constant-buffer structs.
 */
export class CjsFxCBufferHeader
{
    /**
     * Lays out one struct by HLSL's packing rules and checks it against the
     * C++ offsets.
     *
     * A run of fields named `Prefix.member` is a nested struct member named
     * `Prefix`, as the catalogs write Carbon's nested structs (`Sun.DirWorld`
     * for `SunData Sun`). A scalar array of up to four elements that fits one
     * register is declared as a vector (`float VolumetricSlices[4]` becomes
     * `float4`): C++ packs those elements into one register, where an HLSL
     * array would give each its own; indexing reads the same element either
     * way.
     *
     * @param {{ struct: string, fields: Array<{ name: string, type: string, offset: number, count: number }>, stride: number }} layout
     *   The struct: fields in declaration order, `offset` in floats from the start, `stride` its size in floats.
     * @param {Record<string, string>} nestedTypes The HLSL struct type of each nested member prefix (`{ Sun: "SunData" }`).
     * @returns {Array<{ name: string, hlsl: string, offset: number } | { name: string, type: string, offset: number, members: Array<{ name: string, hlsl: string, offset: number }> }>}
     *   The members with their HLSL declarations and float offsets; nested structs carry their own members.
     */
    static layOut(layout, nestedTypes)
    {
        const members = [];
        let cursor = 0;
        const fields = layout.fields;
        for (let i = 0; i < fields.length;)
        {
            const dot = fields[i].name.indexOf(".");
            if (dot < 0)
            {
                const member = CjsFxCBufferHeader._placeField(layout.struct, fields[i], fields[i].name, cursor);
                members.push(member);
                cursor = member.end;
                ++i;
                continue;
            }
            const prefix = fields[i].name.slice(0, dot);
            const type = nestedTypes[prefix];
            if (type === undefined)
            {
                throw new Error(`CjsFxCBufferHeader: ${layout.struct}.${fields[i].name} is in a nested struct whose HLSL type is not given`);
            }
            // A nested struct starts on a register.
            const start = alignToRegister(cursor);
            const inner = [];
            let innerCursor = 0;
            while (i < fields.length && fields[i].name.startsWith(`${prefix}.`))
            {
                const member = CjsFxCBufferHeader._placeField(layout.struct, fields[i], fields[i].name.slice(dot + 1), innerCursor, start);
                inner.push(member);
                innerCursor = member.end - start;
                ++i;
            }
            if (members.some(member => member.name === prefix))
            {
                throw new Error(`CjsFxCBufferHeader: ${layout.struct}.${prefix} is split by other fields`);
            }
            members.push({ name: prefix, type, offset: start, members: inner, end: start + alignToRegister(innerCursor) });
            // The member after a nested struct starts on a register too.
            cursor = start + alignToRegister(innerCursor);
        }
        if (alignToRegister(cursor) !== layout.stride)
        {
            throw new Error(`CjsFxCBufferHeader: ${layout.struct} is ${alignToRegister(cursor)} floats in HLSL but ${layout.stride} in C++`);
        }
        return members;
    }

    /**
     * The HLSL text declaring catalogued structs as Carbon's shaders do: each
     * struct type, then a global variable of it whose name selects the
     * constant buffer slot.
     *
     * @param {object} options What to declare.
     * @param {string} options.guard The include guard macro.
     * @param {string[]} options.comment Lines for the header comment, without `//`.
     * @param {Array<{ variable: string, layout: { struct: string, fields: Array<{ name: string, type: string, offset: number, count: number }>, stride: number } }>} options.blocks
     *   Each variable (`PerFrameVS`) and the struct it holds.
     * @param {Record<string, string>} [options.nestedTypes={}] The HLSL struct type of each nested member prefix.
     * @returns {string} The header text.
     */
    static write({ guard, comment, blocks, nestedTypes = {} })
    {
        const lines = comment.map(line => (line ? `// ${line}` : "//"));
        lines.push("", `#ifndef ${guard}`, `#define ${guard}`, "");

        const declaredNested = new Set();
        for (const { variable, layout } of blocks)
        {
            const members = CjsFxCBufferHeader.layOut(layout, nestedTypes);
            for (const member of members)
            {
                if (member.members && !declaredNested.has(member.type))
                {
                    declaredNested.add(member.type);
                    lines.push(`struct ${member.type}`, "{");
                    lines.push(...alignColumns(member.members.map(inner => [`    ${inner.hlsl};`, `// +${inner.offset - member.offset} floats`])));
                    lines.push("};", "");
                }
            }
            lines.push(`struct ${layout.struct}`, "{");
            lines.push(...alignColumns(members.map(member => [
                member.members ? `    ${member.type} ${member.name};` : `    ${member.hlsl};`,
                `// ${registerOf(member.offset)}`
            ])));
            lines.push(`} ${variable};`, "");
        }
        lines.push(`#endif // ${guard}`, "");
        return lines.join("\n");
    }

    /**
     * Places one field by HLSL's rules and checks its offset.
     *
     * @param {string} struct The struct's name, for messages.
     * @param {{ name: string, type: string, offset: number, count: number }} field The catalogued field.
     * @param {string} name The member's HLSL name.
     * @param {number} cursor The first free float, relative to `base`.
     * @param {number} [base=0] The float offset of the enclosing nested struct.
     * @returns {{ name: string, hlsl: string, offset: number, end: number }} The member, with absolute float offsets.
     */
    static _placeField(struct, field, name, cursor, base = 0)
    {
        const lanes = LANES[field.type];
        if (lanes === undefined)
        {
            throw new Error(`CjsFxCBufferHeader: ${struct}.${field.name} has unknown type "${field.type}"`);
        }
        const scalar = SCALAR[field.type];
        const count = field.count ?? 1;
        let hlsl;
        let size;
        let offset;
        if (lanes === 1 && count > 1)
        {
            // A scalar array C++ packs into one register is an HLSL vector.
            if (count > 4)
            {
                throw new Error(`CjsFxCBufferHeader: ${struct}.${field.name} is ${count} packed scalars, which no HLSL type holds`);
            }
            offset = fitInRegister(cursor, count);
            hlsl = `${scalar}${count} ${name}`;
            size = count;
        }
        else if (lanes < 4)
        {
            if (count > 1)
            {
                throw new Error(`CjsFxCBufferHeader: ${struct}.${field.name} is an array of ${lanes}-lane vectors; HLSL pads each element to a register, C++ does not`);
            }
            offset = fitInRegister(cursor, lanes);
            hlsl = `${scalar}${lanes === 1 ? "" : lanes} ${name}`;
            size = lanes;
        }
        else
        {
            offset = alignToRegister(cursor);
            const type = field.type === "matrix4" ? "column_major float4x4" : `${scalar}4`;
            hlsl = count > 1 ? `${type} ${name}[${count}]` : `${type} ${name}`;
            size = lanes * count;
        }
        if (base + offset !== field.offset)
        {
            throw new Error(`CjsFxCBufferHeader: ${struct}.${field.name} is at float ${base + offset} in HLSL but ${field.offset} in C++`);
        }
        return { name, hlsl, offset: base + offset, end: base + offset + size };
    }
}

/**
 * The next register boundary at or after a float offset.
 *
 * @param {number} offset Floats.
 * @returns {number} The aligned offset.
 */
function alignToRegister(offset)
{
    return Math.ceil(offset / 4) * 4;
}

/**
 * Where HLSL puts a value of `lanes` floats: at `cursor`, unless it would
 * straddle a register, then at the next register.
 *
 * @param {number} cursor The first free float.
 * @param {number} lanes The value's floats.
 * @returns {number} Its offset.
 */
function fitInRegister(cursor, lanes)
{
    return (cursor % 4) + lanes > 4 ? alignToRegister(cursor) : cursor;
}

/**
 * The `cN.x` form of a float offset, as HLSL's `packoffset` writes it.
 *
 * @param {number} offset Floats.
 * @returns {string} The register and component.
 */
function registerOf(offset)
{
    return `c${Math.floor(offset / 4)}.${COMPONENTS[offset % 4]}`;
}

/**
 * Pads the first column so the comments line up.
 *
 * @param {Array<[string, string]>} rows Declaration and comment pairs.
 * @returns {string[]} The lines.
 */
function alignColumns(rows)
{
    const width = Math.max(...rows.map(([code]) => code.length));
    return rows.map(([code, note]) => `${code.padEnd(width)}  ${note}`);
}

CjsSchema.meta.define("CjsFxCBufferHeader")(CjsFxCBufferHeader);
