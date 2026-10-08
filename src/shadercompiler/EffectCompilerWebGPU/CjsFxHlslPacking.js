// Not in Carbon: HLSL's constant-buffer packing, for the WebGPU target.
//
// Carbon's DX11 compiler leaves constant layout to Microsoft's compiler and
// reads it back through reflection; its Metal compiler lays constants out by
// MSL rules (EffectCompilerMetal.cpp CalculateSizeAndOffset). The WebGPU
// target keeps HLSL's own layout, so the bytes the engine uploads for a
// constant buffer mean what they mean to D3D, and the WGSL reads members out
// of 16-byte registers (runtime contract: uniforms are `array<vec4<f32>, N>`).
//
// HLSL's rules (cbuffer packing): a value never straddles a 16-byte register;
// every array element, matrix and struct starts a register; the member after
// a struct starts a register. Matrices are column_major unless declared
// row_major, as Carbon compiles with D3DCOMPILE_PACK_MATRIX_COLUMN_MAJOR
// (EffectCompilerDX11.cpp:1423): a column_major RxC matrix is C registers of R
// floats.

import { HLSLParserTokens } from "../hlslParserTokens.js";

const T = HLSLParserTokens;

/** Struct layouts by struct symbol. @type {WeakMap<object, { size: number, members: Map<object, { offset: number, type: import("../Type.js").Type }> }>} */
const STRUCT_LAYOUTS = new WeakMap();

/**
 * HLSL constant-buffer packing: where each value of a constant buffer lies.
 * Not instantiated; every member is static.
 */
export class CjsFxHlslPacking
{
    /**
     * Rounds a byte offset up to the next register.
     *
     * @param {number} offset Bytes.
     * @returns {number} The aligned offset.
     */
    static alignToRegister(offset)
    {
        return Math.ceil(offset / CjsFxHlslPacking.registerBytes) * CjsFxHlslPacking.registerBytes;
    }

    /**
     * Whether a matrix type is stored row by row.
     *
     * @param {import("../Type.js").Type} type A matrix type.
     * @returns {boolean} True for `row_major`.
     */
    static isRowMajor(type)
    {
        return type.modifier === T.OP_ROW_MAJOR;
    }

    /**
     * The layout of one value (not an array) of a type: its size in bytes, and
     * whether it must start a register.
     *
     * @param {import("../Type.js").Type} type The type; its array dimensions are ignored.
     * @returns {{ size: number, startsRegister: boolean }} The layout.
     */
    static elementLayout(type)
    {
        if (type.IsStruct())
        {
            return { size: CjsFxHlslPacking.structLayout(type.symbol).size, startsRegister: true };
        }
        if (type.IsMatrix())
        {
            // Rows are `width`, columns `height` (Type.FromToken).
            const vectors = CjsFxHlslPacking.isRowMajor(type) ? type.width : type.height;
            const lanes = CjsFxHlslPacking.isRowMajor(type) ? type.height : type.width;
            return { size: (vectors - 1) * CjsFxHlslPacking.registerBytes + lanes * 4, startsRegister: true };
        }
        if (type.IsScalarOrVector())
        {
            return { size: type.width * 4, startsRegister: false };
        }
        throw new Error(`CjsFxHlslPacking: ${type.ToString()} has no constant-buffer layout`);
    }

    /**
     * The number of elements of an array type, 1 for a non-array.
     *
     * @param {import("../Type.js").Type} type The type.
     * @returns {number} The element count.
     */
    static elementCount(type)
    {
        let count = 1;
        for (let i = 0; i < type.arrayDimensions; ++i)
        {
            count *= type.arraySizes[i];
        }
        return count;
    }

    /**
     * Places a value after `cursor` by HLSL's rules.
     *
     * @param {import("../Type.js").Type} type The value's type, arrays included.
     * @param {number} cursor The first free byte.
     * @returns {{ offset: number, size: number, stride: number, end: number }} Where it starts, its size,
     *   the stride between array elements (a register multiple), and the first byte after it.
     */
    static place(type, cursor)
    {
        const REGISTER_BYTES = CjsFxHlslPacking.registerBytes;
        const element = CjsFxHlslPacking.elementLayout(type);
        const count = CjsFxHlslPacking.elementCount(type);
        let offset = cursor;
        if (type.arrayDimensions > 0 || element.startsRegister || (cursor % REGISTER_BYTES) + element.size > REGISTER_BYTES)
        {
            offset = CjsFxHlslPacking.alignToRegister(cursor);
        }
        const stride = CjsFxHlslPacking.alignToRegister(element.size);
        const size = (count - 1) * stride + element.size;
        let end = offset + size;
        // The member after a struct starts a register.
        if (type.IsStruct())
        {
            end = CjsFxHlslPacking.alignToRegister(end);
        }
        return { offset, size, stride, end };
    }

    /**
     * The HLSL constant-buffer layout of a struct: each member's byte offset
     * from the struct's start, and the struct's size.
     *
     * @param {import("../SymbolTable/Symbol.js").Symbol} structSymbol The struct's symbol; its definition is an `NT_STRUCT`.
     * @returns {{ size: number, members: Map<object, { offset: number, type: import("../Type.js").Type }> }} The layout, keyed by member symbol.
     */
    static structLayout(structSymbol)
    {
        const cached = STRUCT_LAYOUTS.get(structSymbol);
        if (cached)
        {
            return cached;
        }
        const layout = CjsFxHlslPacking.memberLayout(structSymbol, false);
        STRUCT_LAYOUTS.set(structSymbol, layout);
        return layout;
    }

    /**
     * The layout of a struct over its used members only, in declaration order.
     * CollectGlobals' `GlobalsData` is laid out this way per stage, as Carbon's
     * CollectConstants records only the members the stage uses
     * (EffectCompilerMetal.cpp CollectConstants); the stage's constants, its
     * default values and its WGSL reads all take their offsets from here.
     *
     * @param {import("../SymbolTable/Symbol.js").Symbol} structSymbol The struct's symbol, after MarkUsedSymbols for the stage.
     * @returns {{ size: number, members: Map<object, { offset: number, type: import("../Type.js").Type, size: number, stride: number }> }} The layout.
     */
    static usedMembersLayout(structSymbol)
    {
        return CjsFxHlslPacking.memberLayout(structSymbol, true);
    }

    /**
     * Places explicit packoffset declarations first, then automatic members
     * after their highest occupied byte. Both reflection and register reads
     * use this layout, including stage-filtered globals. Carbon's DX11 path
     * forwards packoffset to D3D and obtains these addresses from reflection.
     *
     * @param {import("../SymbolTable/Symbol.js").Symbol} structSymbol The struct.
     * @param {boolean} usedOnly Whether unused globals are omitted.
     * @returns {{ size: number, members: Map<object, { offset: number, type: import("../Type.js").Type, size: number, stride: number }> }} The layout.
     */
    static memberLayout(structSymbol, usedOnly)
    {
        const symbols = [];
        for (const memberNode of structSymbol.definition.GetChildren())
        {
            for (const nameNode of memberNode.GetChildren())
            {
                const symbol = nameNode.GetSymbol();
                if (!usedOnly || symbol.used)
                {
                    symbols.push(symbol);
                }
            }
        }
        const placements = new Map();
        let cursor = 0;
        for (const symbol of symbols)
        {
            const explicit = symbol.packOffset;
            if (explicit.subComponent < 0)
            {
                continue;
            }
            const component = explicit.component.ToString();
            const lane = component === "" ? 0 : "xyzw".indexOf(component);
            const element = CjsFxHlslPacking.elementLayout(symbol.type);
            if ((component !== "" && (component.length !== 1 || lane < 0))
                || (lane !== 0 && (symbol.type.arrayDimensions > 0 || element.startsRegister))
                || (!element.startsRegister && symbol.type.arrayDimensions === 0 && lane * 4 + element.size > 16))
            {
                throw new Error("CjsFxHlslPacking: invalid packoffset component or register crossing is not supported yet");
            }
            const placed = CjsFxHlslPacking.place(symbol.type, 0);
            placed.offset = explicit.subComponent * CjsFxHlslPacking.registerBytes + lane * 4;
            placed.end += placed.offset;
            for (const other of placements.values())
            {
                if (placed.offset < other.end && other.offset < placed.end)
                {
                    throw new Error("CjsFxHlslPacking: overlapping packoffset declarations are not supported yet");
                }
            }
            placements.set(symbol, placed);
            cursor = Math.max(cursor, placed.end);
        }
        const members = new Map();
        for (const symbol of symbols)
        {
            let placed = placements.get(symbol);
            if (placed === undefined)
            {
                placed = CjsFxHlslPacking.place(symbol.type, cursor);
                cursor = placed.end;
            }
            members.set(symbol, { offset: placed.offset, type: symbol.type, size: placed.size, stride: placed.stride });
        }
        return { size: cursor, members };
    }

    /** Bytes per HLSL register. */
    static registerBytes = 16;
}
