// Source: trinity/shadercompiler/ParserUtils.h
// Source: trinity/shadercompiler/ParserUtils.cpp
//
// Carbon's free functions, under Carbon's names. Overloads that differ by
// argument type are `Name__Variant`. A C++ `T& out` parameter is an object
// whose fields the function fills.

import { HLSLParserTokens } from "../hlslParserTokens.js";
import { ASTNode } from "../ASTNode/ASTNode.js";
import { InlineString } from "../InlineString.js";
import { Type } from "../Type.js";
import { ScannerToken } from "../ParserState/ScannerToken.js";
import { RegisterSpecifier } from "../SymbolTable/RegisterSpecifier.js";
import { GlobalInputElement } from "./GlobalInputElement.js";
import { Registers } from "./Registers.js";
import { PreprocessString, TokenizeGlobalInput } from "../hlslScanner.js";
import { ParserState } from "../ParserState/ParserState.js";
import { StageInput } from "../EffectData/StageInput.js";

const {
    OP_STRING_CONST, OP_RAY_DESC, OP_INPUTPATCH, OP_OUTPUTPATCH, OP_UINT, OP_FLOAT, OP_BOOL_CONST, OP_CBUFFER,
    OP_RETURN, OP_QUESTION, OP_UNIFORM, OP_VOID, OP_RAYTRACING_ACCELERATION_STRUCTURE,
    OP_SAMPLER2D, OP_SAMPLER3D, OP_SAMPLERCUBE, OP_SAMPLER, OP_SAMPLERCOMPARISON,
    OP_TEXTURE1D, OP_TEXTURE2D, OP_TEXTURE3D, OP_TEXTURECUBE, OP_TEXTURE1DARRAY, OP_TEXTURE2DARRAY, OP_TEXTURE3DARRAY,
    OP_TEXTURECUBEARRAY, OP_TEXTURE2DMS, OP_TEXTURE2DMSARRAY, OP_TEXTURE, OP_BUFFER, OP_STRUCTUREDBUFFER, OP_BYTEADDRESSBUFFER,
    OP_APPENDSTRUCTUREDBUFFER, OP_CONSUMESTRUCTUREDBUFFER, OP_RWBUFFER, OP_RWBYTEADDRESSBUFFER, OP_RWSTRUCTUREDBUFFER,
    OP_RWTEXTURE1D, OP_RWTEXTURE1DARRAY, OP_RWTEXTURE2D, OP_RWTEXTURE2DARRAY, OP_RWTEXTURE3D, OP_RWTEXTURE3DARRAY
} = HLSLParserTokens;

const {
    NT_FUNCTION_ATTRIBUTE, NT_STRUCT, NT_SAMPLER_STATE_LIST, NT_VAR_DECLARATION_LIST, NT_STRUCT_MEMBER, NT_NAME_DECLARATION,
    NT_CBUFFER, NT_PROGRAM, NT_BRACKET_LIST, NT_TECHNIQUE, NT_FUNCTION_DEFINITION, NT_VAR_IDENTIFIER, NT_CONSTANT,
    NT_POSTFIX_EXPRESSION, NT_EXPRESSION, NT_CONDITIONAL_EXPRESSION, NT_FUNCTION_CALL, NT_CAST_EXPRESSION,
    NT_EXPRESSION_STATEMENT, NT_JUMP, NT_FUNCTION_PARAMETER
} = ASTNode.ASTNodeType;

const LONG_MAX = 0x7fffffff;
const LONG_MIN = -0x80000000;

/**
 * C `isspace` in the "C" locale.
 *
 * @param {number} code A character code.
 * @returns {boolean} Whether it is white space.
 */
function isSpace(code)
{
    return code === 32 || (code >= 9 && code <= 13);
}

/**
 * The value of a digit in bases up to 36, or 99 for a non-digit.
 *
 * @param {number} code A character code.
 * @returns {number} The digit value.
 */
function digitValue(code)
{
    if (code >= 48 && code <= 57)
    {
        return code - 48;
    }
    if (code >= 97 && code <= 122)
    {
        return code - 87;
    }
    if (code >= 65 && code <= 90)
    {
        return code - 55;
    }
    return 99;
}

/**
 * C `strtol` on a buffer, reading from an offset until the first character
 * that cannot continue the number, as the C call reads past the token. The
 * result clamps to a 32-bit `long`, Carbon's Windows build.
 *
 * @param {InlineString} at The buffer and start offset (`at.start`); `at.end` is ignored, as `strtol` ignores it.
 * @param {number} offset Offset into the buffer to start at.
 * @param {number} base Number base, 2 to 36; 16 accepts a `0x` prefix.
 * @returns {number} The value, 0 when no digits were read.
 */
function strtol(at, offset, base)
{
    let i = offset;
    while (isSpace(at.CharAt(i)))
    {
        ++i;
    }
    let negative = false;
    if (at.CharAt(i) === 43 || at.CharAt(i) === 45)
    {
        negative = at.CharAt(i) === 45;
        ++i;
    }
    if (base === 16 && at.CharAt(i) === 48 && (at.CharAt(i + 1) | 32) === 120 && digitValue(at.CharAt(i + 2)) < 16)
    {
        i += 2;
    }
    let value = 0;
    let any = false;
    for (; digitValue(at.CharAt(i)) < base; ++i)
    {
        value = value * base + digitValue(at.CharAt(i));
        any = true;
    }
    if (!any)
    {
        return 0;
    }
    value = negative ? -value : value;
    return Math.min(LONG_MAX, Math.max(LONG_MIN, value));
}

/**
 * Carbon's `ParseRegisterID`: `sscanf( start, "%c%i", ... )`. The class
 * character is lower-cased; `%i` takes a decimal, `0x` hexadecimal or `0`
 * octal number after optional white space and sign.
 *
 * @param {InlineString} string The register text, such as `t3`.
 * @param {{ registerType: string, registerNumber: number }} register Filled on success.
 * @returns {boolean} Whether a class and a number were read.
 */
export function ParseRegisterID(string, register)
{
    const at = string;
    let i = at.start;
    const typeCode = at.CharAt(i);
    if (typeCode === 0)
    {
        return false;
    }
    ++i;
    while (isSpace(at.CharAt(i)))
    {
        ++i;
    }
    let sign = 1;
    if (at.CharAt(i) === 43 || at.CharAt(i) === 45)
    {
        sign = at.CharAt(i) === 45 ? -1 : 1;
        ++i;
    }
    let base = 10;
    if (at.CharAt(i) === 48)
    {
        if ((at.CharAt(i + 1) | 32) === 120 && digitValue(at.CharAt(i + 2)) < 16)
        {
            base = 16;
            i += 2;
        }
        else
        {
            base = 8;
        }
    }
    if (digitValue(at.CharAt(i)) >= base)
    {
        return false;
    }
    let value = 0;
    for (; digitValue(at.CharAt(i)) < base; ++i)
    {
        value = value * base + digitValue(at.CharAt(i));
    }
    // Bug (ParserUtils.cpp:16; Carbon known defect CE-84): a number outside
    // `int` is undefined for `%i`, so it throws here.
    if (sign * value > 2147483647 || sign * value < -2147483648)
    {
        throw new RangeError("ParseRegisterID: register number overflows int (Carbon known defect CE-84)");
    }
    const type = String.fromCharCode(typeCode);
    register.registerType = type >= "A" && type <= "Z" ? type.toLowerCase() : type;
    register.registerNumber = sign * value;
    return true;
}

/**
 * Carbon's file-local `ParseNumber( start, end, base )`: `strtol` from `start`.
 *
 * @param {InlineString} at The buffer.
 * @param {number} offset Offset to start at.
 * @param {number} base Number base.
 * @returns {number} The value.
 */
function ParseNumber__Base(at, offset, base)
{
    return strtol(at, offset, base);
}

/**
 * Carbon's `ParseNumber( start, end )`: an integer literal with an optional
 * `u`/`l` suffix, `0x` hexadecimal, a leading `0` meaning octal, and an
 * optional leading `-`.
 *
 * A literal such as `08` reads as octal and stops at the `8`, giving 0; that
 * is the C behaviour Carbon inherits.
 *
 * @param {InlineString} string The literal's range.
 * @returns {number} The value, a 32-bit `long`.
 */
export function ParseNumber(string)
{
    let start = string.start;
    let negate = false;
    if (string.CharAt(start) === 45)
    {
        ++start;
        while (isSpace(string.CharAt(start)))
        {
            ++start;
        }
        negate = true;
    }
    let base = 10;
    if (string.CharAt(start) === 48)
    {
        if ((string.CharAt(start + 1) | 32) === 120)
        {
            base = 16;
            start += 2;
        }
        else
        {
            base = 8;
            start += 1;
        }
    }
    const result = ParseNumber__Base(string, start, base);
    return negate ? -result : result;
}

/**
 * Carbon's `ParseString`: the text of a quoted string literal, escapes
 * resolved.
 *
 * Bug (ParserUtils.cpp:116,124): the octal and `\x` escapes pass `strtol` the
 * position of the backslash, which it cannot read, so the escape becomes a
 * NUL character and the digits that follow are kept as text; `\x` also falls
 * through and appends the `x`. Reproduced (Carbon known defect CE-58).
 *
 * @param {InlineString} string The literal, quotes included; a null range gives "".
 * @returns {string} The string's value.
 */
export function ParseString(string)
{
    if (!string.IsSet())
    {
        return "";
    }
    let result = "";
    for (let c = string.start + 1; c + 1 < string.end; ++c)
    {
        const ch = string.CharAt(c);
        if (ch === 92)
        {
            const next = String.fromCharCode(string.CharAt(c + 1));
            switch (next)
            {
                case "a": result += "\x07"; break;
                case "b": result += "\b"; break;
                case "f": result += "\f"; break;
                case "n": result += "\n"; break;
                case "r": result += "\r"; break;
                case "t": result += "\t"; break;
                case "v": result += "\v"; break;
                case "0":
                case "1":
                case "2":
                case "3":
                case "4":
                case "5":
                case "6":
                case "7":
                    result += String.fromCharCode(ParseNumber__Base(string, c, 8) & 0xff);
                    break;
                case "x":
                case "X":
                    if (digitValue(string.CharAt(c + 2)) < 16)
                    {
                        result += String.fromCharCode(ParseNumber__Base(string, c, 16) & 0xff);
                    }
                // falls through
                default:
                    result += next;
            }
            c++;
        }
        else
        {
            result += String.fromCharCode(ch);
        }
    }
    return result;
}

/**
 * Carbon's `ParseFloat`: a floating-point literal with an optional `f`
 * suffix and an optional leading `-`, read with `strtod`.
 *
 * @param {InlineString} string The literal's range.
 * @returns {number} The value.
 */
export function ParseFloat(string)
{
    let text = string.buffer.text.slice(string.start);
    let negate = false;
    if (text[0] === "-")
    {
        text = text.slice(1).replace(/^[ \t\n\v\f\r]+/u, "");
        negate = true;
    }
    const match = /^[ \t\n\v\f\r]*[+-]?(?:\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)/u.exec(text);
    const result = match ? Number(match[0].trim()) : 0;
    return negate ? -result : result;
}

/**
 * Carbon's `ToString( const InlineString& )`, also declared in ParserUtils.h.
 *
 * @param {InlineString} string The range.
 * @returns {string} Its text.
 */
export function ToString(string)
{
    return string.ToString();
}

/**
 * Carbon's `MarkUsedSymbols( ASTNode*, SymbolTable& )`: marks every symbol
 * reachable from `entryPoint` as used, following symbols to their
 * definitions and types to their struct definitions. A `patchconstantfunc`
 * attribute pulls in the named function. The `GlobalsData` struct and sampler
 * state lists are not walked, so only the members actually read get marked.
 *
 * @param {ASTNode|null} entryPoint The node to start from.
 * @param {import("../SymbolTable/SymbolTable.js").SymbolTable} symbols The symbol table.
 */
export function MarkUsedSymbols__SymbolTable(entryPoint, symbols)
{
    if (entryPoint === null)
    {
        return;
    }

    if (entryPoint.GetNodeType() === NT_FUNCTION_ATTRIBUTE &&
        entryPoint.GetChildOrNull(0) &&
        entryPoint.GetToken().stringValue.Equals__Chars("patchconstantfunc") &&
        entryPoint.GetChildOrNull(0).GetToken().type === OP_STRING_CONST)
    {
        const symbol = symbols.LookupGlobal(ParseString(entryPoint.GetChildOrNull(0).GetToken().stringValue));
        if (symbol && !symbol.used)
        {
            MarkUsedSymbols__SymbolTable(symbol.definition, symbols);
        }
    }
    // "Globals" struct is a special case and we don't want to mark all of it's members
    // as "used" automatically.
    if (!(entryPoint.GetNodeType() === NT_STRUCT && entryPoint.GetSymbol().name.Equals__Chars("GlobalsData")) && entryPoint.GetNodeType() !== NT_SAMPLER_STATE_LIST)
    {
        for (let i = 0; i < entryPoint.GetChildrenCount(); ++i)
        {
            MarkUsedSymbols__SymbolTable(entryPoint.GetChild(i), symbols);
        }
    }
    const symbol = entryPoint.GetSymbol();
    if (symbol && symbol.used)
    {
        return;
    }
    if (symbol)
    {
        symbol.used = true;
        if (symbol.definition)
        {
            MarkUsedSymbols__SymbolTable(symbol.definition, symbols);
        }
        if (symbol.type.symbol && symbol.type.symbol.definition)
        {
            MarkUsedSymbols__SymbolTable(symbol.type.symbol.definition, symbols);
        }
    }
    if (entryPoint.GetType().symbol)
    {
        MarkUsedSymbols__SymbolTable(entryPoint.GetType().symbol.definition, symbols);
    }
}

/**
 * Carbon's file-local `HasUsedDeclarations`.
 *
 * @param {ASTNode} node A struct, buffer or declaration list.
 * @returns {boolean} Whether any name declared under it is used.
 */
function HasUsedDeclarations(node)
{
    for (let i = 0; i < node.GetChildrenCount(); ++i)
    {
        const child = node.GetChild(i);
        if (child)
        {
            if (child.GetNodeType() === NT_VAR_DECLARATION_LIST || child.GetNodeType() === NT_STRUCT_MEMBER)
            {
                if (HasUsedDeclarations(child))
                {
                    return true;
                }
            }
            else if (child.GetNodeType() === NT_NAME_DECLARATION)
            {
                if (child.GetSymbol() && child.GetSymbol().used)
                {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Carbon's file-local `MarkCBuffersAndStructsUsed`: marks a whole struct, or
 * a whole constant buffer other than the `Globals` buffer (register `b0`), as
 * used when any one of its members is.
 *
 * @param {ASTNode|null} node The subtree.
 * @param {import("../SymbolTable/SymbolTable.js").SymbolTable} symbols The symbol table.
 */
function MarkCBuffersAndStructsUsed(node, symbols)
{
    if (node === null)
    {
        return;
    }
    if (node.GetNodeType() === NT_STRUCT)
    {
        if (HasUsedDeclarations(node))
        {
            MarkUsedSymbols__SymbolTable(node, symbols);
        }
    }
    const isGlobals = () =>
    {
        if (!node.GetSymbol())
        {
            return false;
        }
        const found = node.GetSymbol().registerSpecifier.get("");
        if (found === undefined)
        {
            return false;
        }
        return found.registerNumber === 0 && found.explicitRegister;
    };
    if (node.GetNodeType() === NT_CBUFFER && !isGlobals())
    {
        if (HasUsedDeclarations(node))
        {
            MarkUsedSymbols__SymbolTable(node, symbols);
        }
    }
    for (let i = 0; i < node.GetChildrenCount(); ++i)
    {
        MarkCBuffersAndStructsUsed(node.GetChild(i), symbols);
    }
}

/**
 * Carbon's `MarkUsedSymbols( ASTNode*, ParserState& )`: the tree shaker's
 * marking pass for one entry point, followed by whole-struct and
 * whole-buffer marking.
 *
 * @param {ASTNode|null} entryPoint The entry point's definition.
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 */
export function MarkUsedSymbols(entryPoint, state)
{
    MarkUsedSymbols__SymbolTable(entryPoint, state.GetSymbolTable());
    MarkCBuffersAndStructsUsed(state.GetTree(), state.GetSymbolTable());
}

/**
 * Carbon's `ComputeMemberType`: the type of `left.member`, a struct field, a
 * `RayDesc` field, a patch `Length`, or a vector/matrix swizzle.
 *
 * @param {Type} leftType The type on the left of the dot.
 * @param {InlineString} member The member name.
 * @param {Type} type Filled with the member's type.
 * @param {{ symbol: import("../SymbolTable/Symbol.js").Symbol|null }} out `out.symbol` is set to the field's symbol, or null.
 * @returns {boolean} Whether the member exists.
 */
export function ComputeMemberType(leftType, member, type, out)
{
    out.symbol = null;
    if (leftType.symbol)
    {
        const structDef = leftType.symbol.definition;
        if (structDef)
        {
            for (let i = 0; i < structDef.GetChildrenCount(); ++i)
            {
                const child = structDef.GetChild(i);
                if (child === null)
                {
                    continue;
                }
                for (let j = 0; j < child.GetChildrenCount(); ++j)
                {
                    const field = child.GetChild(j);
                    if (field === null || field.GetSymbol() === null)
                    {
                        continue;
                    }
                    if (member.Equals(field.GetSymbol().name))
                    {
                        type.Assign(field.GetType());
                        out.symbol = field.GetSymbol();
                        return true;
                    }
                }
            }
        }
        return false;
    }
    if (leftType.builtInType === OP_RAY_DESC)
    {
        if (member.Equals__Chars("Origin") || member.Equals__Chars("Direction"))
        {
            type.FromTokenType(OP_FLOAT);
            type.width = 3;
            return true;
        }
        if (member.Equals__Chars("TMin") || member.Equals__Chars("TMax"))
        {
            type.FromTokenType(OP_FLOAT);
            return true;
        }
        return false;
    }
    if ((leftType.builtInType === OP_INPUTPATCH || leftType.builtInType === OP_OUTPUTPATCH) && member.Equals__Chars("Length"))
    {
        type.FromTokenType(OP_UINT);
        return true;
    }
    if (!leftType.IsScalarOrVector())
    {
        return false;
    }
    type.Assign(leftType);
    const end = member.end;
    const at = c => String.fromCharCode(member.CharAt(c));
    if (leftType.height !== 1)
    {
        type.width = 0;
        type.height = 1;
        let swizzleSet = 0;
        for (let c = member.start; c !== end; ++c)
        {
            if (at(c) !== "_")
            {
                return false;
            }
            ++c;
            if (c === end)
            {
                return false;
            }
            if (at(c) === "m")
            {
                if (swizzleSet === 1)
                {
                    return false;
                }
                else if (swizzleSet === 0)
                {
                    swizzleSet = 2;
                }
                ++c;
                if (c === end)
                {
                    return false;
                }
            }
            else
            {
                if (swizzleSet === 2)
                {
                    return false;
                }
                else if (swizzleSet === 0)
                {
                    swizzleSet = 1;
                }
            }
            if (c === end)
            {
                return false;
            }
            const digitOk = d => (swizzleSet === 1 ? d >= "1" && d <= "4" : d >= "0" && d <= "3");
            if (!digitOk(at(c)))
            {
                return false;
            }
            ++c;
            if (c === end)
            {
                return false;
            }
            if (!digitOk(at(c)))
            {
                return false;
            }
            type.width++;
        }
        return true;
    }
    let swizzleSet = 0;
    for (let c = member.start; c !== end; ++c)
    {
        const ch = at(c);
        const pos = "xyzw".indexOf(ch);
        const pos2 = "rgba".indexOf(ch);
        if (pos >= 0)
        {
            if (swizzleSet === 2)
            {
                return false;
            }
            if (pos >= leftType.width)
            {
                return false;
            }
            swizzleSet = 1;
        }
        else if (pos2 >= 0)
        {
            if (swizzleSet === 1)
            {
                return false;
            }
            if (pos2 >= leftType.width)
            {
                return false;
            }
            swizzleSet = 2;
        }
        else
        {
            return false;
        }
    }
    type.height = 1;
    type.width = member.end - member.start;
    return true;
}

/**
 * Carbon's file-local `AddCBuffer`: a `cbuffer` node bound to `b<index>`
 * holding the given declaration's name. Carbon's `shadowStruct` out-parameter
 * is always null.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {ASTNode} node The name declaration being wrapped.
 * @param {number} cbufferIndex The `b` register.
 * @param {{ value: ASTNode|null }} shadowStruct Set to null.
 * @returns {ASTNode} The buffer node.
 */
function AddCBuffer(state, node, cbufferIndex, shadowStruct)
{
    shadowStruct.value = null;

    const token = new ScannerToken(OP_CBUFFER, 0, InlineString.makeInlineString("cbuffer"), node.GetLocation());
    const cbuffer = new ASTNode(NT_CBUFFER, node.GetLocation(), node.GetScope(), token);

    const cbufferName = state.GetSymbolTable().AddBufferSymbol(node.GetSymbol().name);
    const reg = new RegisterSpecifier();
    reg.registerNumber = cbufferIndex;
    reg.registerType = "b";
    reg.subComponent = -1;
    reg.space = -1;
    reg.shaderProfile = InlineString.makeInlineString("");
    reg.explicitRegister = true;
    reg.explicitSpace = false;
    cbufferName.registerSpecifier.set("", reg);
    cbufferName.definition = cbuffer;
    cbuffer.SetSymbol(cbufferName);
    return cbuffer;
}

/**
 * Carbon's `HasRegisterBinding`: whether the symbol is bound to a register
 * for a profile, falling back to its every-profile binding.
 *
 * @param {import("../SymbolTable/Symbol.js").Symbol} symbol The symbol.
 * @param {string} shaderProfile Profile such as `"vs"`.
 * @param {string} registerType Register class character.
 * @param {number} registerNumber Register number.
 * @returns {boolean} Whether that exact binding applies.
 */
export function HasRegisterBinding(symbol, shaderProfile, registerType, registerNumber)
{
    let found = symbol.registerSpecifier.get(shaderProfile);
    if (found === undefined)
    {
        found = symbol.registerSpecifier.get("");
    }
    if (found !== undefined)
    {
        return found.registerType === registerType && found.registerNumber === registerNumber;
    }
    return false;
}

/**
 * C `strncmp( text, prefix, prefix.length ) == 0` from the start of a range,
 * reading past its end as the C call does.
 *
 * @param {InlineString} name The range.
 * @param {string} prefix The text to compare with.
 * @returns {boolean} Whether the buffer at `name.start` begins with `prefix`.
 */
function startsWith(name, prefix)
{
    for (let i = 0; i < prefix.length; ++i)
    {
        if (name.CharAt(name.start + i) !== prefix.charCodeAt(i))
        {
            return false;
        }
    }
    return true;
}

/**
 * Carbon's `GetCBufferIndex( const InlineString& )`: the fixed constant
 * buffer slot of Carbon's per-frame and per-object constant names, matched by
 * prefix.
 *
 * Bug (ParserUtils.cpp:523-547; Carbon known defect CE-82): the match is
 * `strncmp` over the prefix's length only, so any global whose name starts
 * with one, such as `float4 Globalscale;`, is wrapped in a constant buffer of
 * its own at that slot (`b0` here, the slot of the generated `Globals`).
 *
 * @param {InlineString} name The global's name.
 * @returns {number} The `b` register, or -1.
 */
export function GetCBufferIndex(name)
{
    if (startsWith(name, "PerFrameVS"))
    {
        return 1;
    }
    else if (startsWith(name, "PerObjectPS"))
    {
        return 4;
    }
    else if (startsWith(name, "PerFramePS"))
    {
        return 2;
    }
    else if (startsWith(name, "g_uiTransforms"))
    {
        return 6;
    }
    else if (startsWith(name, "Globals"))
    {
        return 0;
    }
    return -1;
}

/**
 * Carbon's `GetCBufferIndex( const Symbol* )`: as the name overload, plus
 * `PerObjectVS`, which takes slot 5 when it is bound to `c180` for the vertex
 * shader and slot 3 otherwise.
 *
 * @param {import("../SymbolTable/Symbol.js").Symbol} symbol The global.
 * @returns {number} The `b` register, or -1.
 */
export function GetCBufferIndex__Symbol(symbol)
{
    if (startsWith(symbol.name, "PerObjectVS"))
    {
        if (HasRegisterBinding(symbol, "vs", "c", 180))
        {
            return 5;
        }
        return 3;
    }
    return GetCBufferIndex(symbol.name);
}

/**
 * Carbon's file-local `PatchCBuffers( ParserState&, ASTNode*, unsigned& )`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {ASTNode} parent The parent node.
 * @param {{ value: number }} index Child index, advanced past an inserted shadow struct.
 */
function PatchCBuffers__ParentIndex(state, parent, index)
{
    const node = parent.GetChild(index.value);
    if (node === null)
    {
        return;
    }
    if (node.GetNodeType() === NT_NAME_DECLARATION)
    {
        const cbufferIndex = GetCBufferIndex__Symbol(node.GetSymbol());
        if (cbufferIndex >= 0)
        {
            const shadowStruct = { value: null };
            const cbuffer = AddCBuffer(state, node, cbufferIndex, shadowStruct);

            cbuffer.AddChild(node);
            parent.RemoveChild(index.value);
            if (shadowStruct.value)
            {
                parent.InsertChild(index.value++, shadowStruct.value);
            }
            parent.InsertChild(index.value, cbuffer);
        }
    }
    for (const i = { value: 0 }; i.value < node.GetChildrenCount(); ++i.value)
    {
        PatchCBuffers__ParentIndex(state, node, i);
    }
}

/**
 * Carbon's `PatchCBuffers( ParserState& )`: wraps each global named for one
 * of Carbon's fixed constant buffers (see {@link GetCBufferIndex}) in a
 * `cbuffer` bound to that slot.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 */
export function PatchCBuffers(state)
{
    for (const i = { value: 0 }; i.value < state.GetTree().GetChildrenCount(); ++i.value)
    {
        PatchCBuffers__ParentIndex(state, state.GetTree(), i);
    }
}

/**
 * Carbon's `IsUniformInputArgument`.
 *
 * @param {ASTNode} argument An `NT_FUNCTION_PARAMETER` node.
 * @returns {boolean} Whether it is a `uniform` parameter without array brackets.
 */
export function IsUniformInputArgument(argument)
{
    if (argument.GetChildOrNull(0))
    {
        // is it correct?
        return false;
    }
    return argument.GetType().storageClass === OP_UNIFORM;
}

/**
 * Carbon's anonymous-namespace `GetRegisterSet`.
 *
 * @param {Registers} registers The register sets.
 * @param {string} specifier Register class character.
 * @returns {Set<number>|null} The set for that class.
 */
function GetRegisterSet(registers, specifier)
{
    switch (specifier)
    {
        case "b": return registers.b;
        case "t": return registers.t;
        case "s": return registers.s;
        case "u": return registers.u;
        default: return null;
    }
}

/**
 * Carbon's anonymous-namespace `DoesProfileMatchStage`.
 *
 * @param {string} profile Profile key; `""` matches every stage.
 * @param {number} stage An `InputStageType` value.
 * @returns {boolean} Whether a binding for the profile applies to the stage.
 */
function DoesProfileMatchStage(profile, stage)
{
    if (profile === "")
    {
        return true;
    }
    switch (stage)
    {
        case StageInput.InputStageType.VERTEX_STAGE: return profile === "vs";
        case StageInput.InputStageType.PIXEL_STAGE: return profile === "ps";
        case StageInput.InputStageType.COMPUTE_STAGE: return profile === "cs";
        case StageInput.InputStageType.GEOMETRY_STAGE: return profile === "gs";
        case StageInput.InputStageType.HULL_STAGE: return profile === "hs";
        case StageInput.InputStageType.DOMAIN_STAGE: return profile === "ds";
        default: return false;
    }
}

/**
 * Carbon's anonymous-namespace `AllocateRegister`: the lowest free number.
 *
 * @param {Set<number>} set The taken registers; the result is added.
 * @returns {number} The register.
 */
function AllocateRegister(set)
{
    for (let i = 0; ; ++i)
    {
        if (!set.has(i))
        {
            set.add(i);
            return i;
        }
    }
}

/**
 * Carbon's anonymous-namespace `GetRegisterType`: the register class a
 * resource type binds to.
 *
 * @param {Type} type The type.
 * @returns {string} `"s"`, `"t"` or `"u"`, or `""` (Carbon's 0) for none.
 */
export function GetRegisterType(type)
{
    if (type.symbol)
    {
        return "";
    }
    switch (type.builtInType)
    {
        case OP_SAMPLER2D:
        case OP_SAMPLER3D:
        case OP_SAMPLERCUBE:
        case OP_SAMPLER:
        case OP_SAMPLERCOMPARISON:
            return "s";
        case OP_TEXTURE1D:
        case OP_TEXTURE2D:
        case OP_TEXTURE3D:
        case OP_TEXTURECUBE:
        case OP_TEXTURE1DARRAY:
        case OP_TEXTURE2DARRAY:
        case OP_TEXTURE3DARRAY:
        case OP_TEXTURECUBEARRAY:
        case OP_TEXTURE2DMS:
        case OP_TEXTURE2DMSARRAY:
        case OP_TEXTURE:
        case OP_BUFFER:
        case OP_STRUCTUREDBUFFER:
        case OP_RAYTRACING_ACCELERATION_STRUCTURE:
        case OP_BYTEADDRESSBUFFER:
            return "t";
        case OP_APPENDSTRUCTUREDBUFFER:
        case OP_CONSUMESTRUCTUREDBUFFER:
        case OP_RWBUFFER:
        case OP_RWBYTEADDRESSBUFFER:
        case OP_RWSTRUCTUREDBUFFER:
        case OP_RWTEXTURE1D:
        case OP_RWTEXTURE1DARRAY:
        case OP_RWTEXTURE2D:
        case OP_RWTEXTURE2DARRAY:
        case OP_RWTEXTURE3D:
        case OP_RWTEXTURE3DARRAY:
            return "u";
        default:
            return "";
    }
}

/**
 * Carbon's anonymous-namespace `SymbolMatchesGlobalInput`.
 *
 * @param {import("../SymbolTable/Symbol.js").Symbol} symbol The symbol.
 * @param {GlobalInputElement} element The global input.
 * @returns {boolean} Same name and type.
 */
function SymbolMatchesGlobalInput(symbol, element)
{
    return symbol.name.Equals(element.name) && symbol.type.Equals(element.type);
}

/**
 * A register binding the allocator invents: every profile, implicit.
 *
 * @param {string} registerType Register class character.
 * @param {number} registerNumber Register number.
 * @param {number} space Register space.
 * @returns {RegisterSpecifier} The binding.
 */
function allocatedRegister(registerType, registerNumber, space)
{
    const r = new RegisterSpecifier();
    r.shaderProfile = InlineString.makeInlineString("");
    r.registerType = registerType;
    r.registerNumber = registerNumber;
    r.subComponent = -1;
    r.space = space;
    r.explicitRegister = false;
    r.explicitSpace = false;
    return r;
}

/**
 * Carbon's anonymous-namespace `AssignRegisters`, the recursive walk.
 *
 * Bug (ParserUtils.cpp:733-826; Carbon known defect CE-79): a symbol with an
 * explicit register keeps it, but nothing records that register as taken;
 * only `AllocateRegister` fills `registers`. An automatically placed symbol
 * can therefore get a register already bound explicitly:
 * `Texture2D a : register(t0); Texture2D b;` gives `b` `t0` as well.
 *
 * @param {ASTNode|null} root The subtree.
 * @param {number} stage An `InputStageType` value.
 * @param {Registers} registers Registers taken so far.
 * @param {GlobalInputElement[]} globalInput The library's global inputs.
 * @param {RegisterSpecifier[]} globalInputRegisters Their bindings, by position.
 */
function AssignRegisters__Registers(root, stage, registers, globalInput, globalInputRegisters)
{
    if (!root)
    {
        return;
    }
    switch (root.GetNodeType())
    {
        case NT_CBUFFER:
            if (root.GetSymbol().used)
            {
                let assigned = false;
                for (const [profile, r] of root.GetSymbol().registerSpecifier)
                {
                    if (r.explicitRegister && DoesProfileMatchStage(profile, stage))
                    {
                        assigned = true;
                        break;
                    }
                }
                if (!assigned)
                {
                    root.GetSymbol().registerSpecifier.set("", allocatedRegister("b", AllocateRegister(registers.b), 0));
                }
            }
            break;
        case NT_NAME_DECLARATION:
        {
            if (!root.GetSymbol().used)
            {
                return;
            }
            const registerType = GetRegisterType(root.GetSymbol().type);
            if (registerType)
            {
                const elementIndex = globalInput.findIndex(element => SymbolMatchesGlobalInput(root.GetSymbol(), element));
                if (elementIndex >= 0)
                {
                    const r = globalInputRegisters[elementIndex];
                    root.GetSymbol().registerSpecifier.set(r.shaderProfile.ToString(), r.Copy());
                }
                else
                {
                    let assigned = false;
                    for (const [profile, r] of root.GetSymbol().registerSpecifier)
                    {
                        if (r.explicitRegister && DoesProfileMatchStage(profile, stage))
                        {
                            assigned = true;
                            break;
                        }
                    }
                    if (!assigned)
                    {
                        const isArray = root.GetChildOrNull(0) && root.GetChildOrNull(0).GetNodeType() === NT_BRACKET_LIST;
                        const registerNumber = AllocateRegister(GetRegisterSet(registers, registerType));
                        const space = isArray ? AllocateRegister(registers.spaces) : 0;
                        root.GetSymbol().registerSpecifier.set("", allocatedRegister(registerType, registerNumber, space));
                    }
                }
            }
            break;
        }
        case NT_PROGRAM:
        case NT_VAR_DECLARATION_LIST:
            for (let i = 0; i < root.GetChildrenCount(); ++i)
            {
                AssignRegisters__Registers(root.GetChild(i), stage, registers, globalInput, globalInputRegisters);
            }
            break;
        default:
            break;
    }
}

/**
 * Carbon's `AssignGlobalInputRegisters`: registers for a library's global
 * inputs, allocated first so every function of the library agrees.
 *
 * @param {GlobalInputElement[]} globalInput The global inputs.
 * @param {Registers} registers Registers taken so far.
 * @param {RegisterSpecifier[]} globalInputRegisters Receives one binding per input.
 */
export function AssignGlobalInputRegisters(globalInput, registers, globalInputRegisters)
{
    for (const input of globalInput)
    {
        const registerType = GetRegisterType(input.type);
        if (registerType)
        {
            const isArray = input.type.arrayDimensions > 0;
            const registerNumber = AllocateRegister(GetRegisterSet(registers, registerType));
            const space = isArray ? AllocateRegister(registers.spaces) : 0;
            globalInputRegisters.push(allocatedRegister(registerType, registerNumber, space));
        }
        else if (input.declaration && input.declaration.GetNodeType() === NT_CBUFFER)
        {
            let assigned = false;
            for (const [profile, r] of input.declaration.GetSymbol().registerSpecifier)
            {
                if (r.explicitRegister && profile === "")
                {
                    assigned = true;
                    globalInputRegisters.push(r.Copy());
                    break;
                }
            }
            if (!assigned)
            {
                globalInputRegisters.push(allocatedRegister("b", AllocateRegister(registers.b), 0));
            }
        }
        else
        {
            globalInputRegisters.push(new RegisterSpecifier());
        }
    }
}

/**
 * Carbon's `AssignRegisters( ASTNode*, int32_t, const std::vector<GlobalInputElement>& )`:
 * gives every used buffer and resource without an explicit binding for the
 * stage the lowest free register of its class.
 *
 * @param {ASTNode|null} root The program.
 * @param {number} stage An `InputStageType` value.
 * @param {GlobalInputElement[]} [globalInput=[]] The library's global inputs.
 */
export function AssignRegisters(root, stage, globalInput = [])
{
    const registers = new Registers();
    registers.spaces.add(0);

    const globalInputRegisters = [];
    AssignGlobalInputRegisters(globalInput, registers, globalInputRegisters);

    AssignRegisters__Registers(root, stage, registers, globalInput, globalInputRegisters);
}

/**
 * Carbon's `GetNodeOrder`: sort key of a top-level node. Structs first, then
 * plain globals, then resources and buffers, then functions, then techniques.
 *
 * @param {ASTNode} t A program child.
 * @returns {number} The key.
 */
export function GetNodeOrder(t)
{
    switch (t.GetNodeType())
    {
        case NT_VAR_DECLARATION_LIST:
        {
            const child0 = t.GetChildOrNull(0);
            if (child0 && child0.GetNodeType() === NT_CBUFFER)
            {
                return 2;
            }
            const child1 = t.GetChildOrNull(1);
            if (child1 && child1.GetNodeType() === NT_CBUFFER)
            {
                return 2;
            }
            return GetRegisterType(t.GetType()) ? 2 : 1;
        }
        case NT_TECHNIQUE:
            return 12;
        case NT_FUNCTION_DEFINITION:
            return 11;
        case NT_STRUCT:
            return 0;
        default:
            return 0;
    }
}

/**
 * Carbon's `SortProgramNodes`: a stable sort of the program's children by
 * {@link GetNodeOrder}.
 *
 * @param {ASTNode|null} root The program.
 */
export function SortProgramNodes(root)
{
    if (!root)
    {
        return;
    }
    root.GetChildren().sort((a, b) => GetNodeOrder(a) - GetNodeOrder(b));
}

/**
 * Carbon's `CreateGlobalsCB`: after sorting the program, gathers the run of
 * plain global variables into a `cbuffer Globals : register(b0)`, then moves
 * scalar declarations to the end of it.
 *
 * Latent bug (Carbon known defect CE-67): an empty program reads child 0;
 * see the loop below.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 */
export function CreateGlobalsCB(state)
{
    const root = state.GetTree();
    if (!root)
    {
        return;
    }
    SortProgramNodes(root);
    let varStart = root.GetChildrenCount();
    let varEnd = 0;
    for (let i = 0; i < root.GetChildrenCount(); ++i)
    {
        const child = root.GetChild(i);
        if (!child)
        {
            continue;
        }
        if (child.GetNodeType() === NT_VAR_DECLARATION_LIST)
        {
            const name0 = child.GetChildOrNull(0);
            if (name0 && name0.GetNodeType() === NT_CBUFFER)
            {
                continue;
            }
            const name1 = child.GetChildOrNull(1);
            if (name1 && name1.GetNodeType() === NT_CBUFFER)
            {
                continue;
            }
            if (!GetRegisterType(child.GetType()))
            {
                varStart = Math.min(varStart, i);
                varEnd = Math.max(varEnd, i);
            }
        }
    }
    if (varStart <= varEnd)
    {
        const token = new ScannerToken(OP_CBUFFER, 0, InlineString.makeInlineString("cbuffer"), root.GetLocation());
        const cbuffer = new ASTNode(NT_CBUFFER, root.GetLocation(), root.GetScope(), token);

        const cbufferName = state.GetSymbolTable().AddBufferSymbol(InlineString.makeInlineString("Globals"));
        const reg = new RegisterSpecifier();
        reg.registerNumber = 0;
        reg.registerType = "b";
        reg.subComponent = -1;
        reg.space = -1;
        reg.shaderProfile = InlineString.makeInlineString("");
        reg.explicitRegister = true;
        reg.explicitSpace = false;
        cbufferName.registerSpecifier.set("", reg);
        cbuffer.SetSymbol(cbufferName);

        // Bug (ParserUtils.cpp:995, :1020; Carbon known defect CE-67): with no
        // children `varStart <= varEnd` holds (both 0), and this reads child 0
        // of an empty program, which `GetChild` throws for.
        for (let i = 0; i <= varEnd - varStart; ++i)
        {
            cbuffer.AddChild(root.GetChild(varStart));
            root.RemoveChild(varStart);
        }

        if (cbuffer.GetChildrenCount() > 1)
        {
            let back = cbuffer.GetChildrenCount() - 1;
            for (let i = 0; i < back; ++i)
            {
                const nameDecl = cbuffer.GetChild(i).GetChild(0);
                const type = nameDecl.GetType();
                if (type.IsScalar())
                {
                    const children = cbuffer.GetChildren();
                    [children[i], children[back]] = [children[back], children[i]];
                    --back;
                    --i;
                }
            }
        }
        root.InsertChild(varStart, cbuffer);
    }
}

/**
 * Carbon's `NewStruct`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {InlineString} [name] The struct's name; a generated one when unset.
 * @returns {ASTNode} The `NT_STRUCT` node.
 */
export function NewStruct(state, name = new InlineString())
{
    const structDecl = state.NewNode(NT_STRUCT);
    const symbol = state.GetSymbolTable().AddSymbol(name.IsSet() ? name : state.AllocateName());
    symbol.isTypeName = true;
    symbol.definition = structDecl;
    structDecl.SetSymbol(symbol);
    structDecl.SetType(Type.typeFromSymbol(symbol));
    return structDecl;
}

/**
 * Carbon's `NewVarIdentifier`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {import("../SymbolTable/Symbol.js").Symbol} variable The variable.
 * @returns {ASTNode} The `NT_VAR_IDENTIFIER` node.
 */
export function NewVarIdentifier(state, variable)
{
    const access = state.NewNode__Token(NT_VAR_IDENTIFIER, ScannerToken.id(variable.name));
    access.SetSymbol(variable);
    access.SetType(variable.type);
    return access;
}

/**
 * C++ `std::to_string( float )`: `printf( "%f" )` of the value promoted to
 * `double`. Every digit of the integer part, six decimals rounded from the
 * exact binary value with ties to even (the UCRT's rounding), a kept sign on
 * negative zero and on values that round to zero, and `inf` / `nan` spelled
 * as MSVC spells them. JavaScript's `toFixed` differs on ties, on -0, past
 * 1e21 and on the non-finite values.
 *
 * @param {number} value The float.
 * @returns {string} The text.
 */
function toStringFloat(value)
{
    const bits = new DataView(new ArrayBuffer(8));
    bits.setFloat64(0, Math.fround(value));
    const negative = (bits.getUint8(0) & 0x80) !== 0;
    const sign = negative ? "-" : "";
    if (Number.isNaN(value))
    {
        return negative ? "-nan(ind)" : "nan";
    }
    if (!Number.isFinite(value))
    {
        return `${sign}inf`;
    }
    const high = bits.getUint32(0);
    const exponentBits = (high >>> 20) & 0x7ff;
    let mantissa = (BigInt(high & 0xfffff) << 32n) | BigInt(bits.getUint32(4));
    let exponent = exponentBits - 1075;
    if (exponentBits === 0)
    {
        exponent = -1074;
    }
    else
    {
        mantissa |= 1n << 52n;
    }
    // |value| * 10^6 = mantissa * 2^exponent * 10^6, rounded half to even.
    let scaled;
    if (exponent >= 0)
    {
        scaled = (mantissa << BigInt(exponent)) * 1000000n;
    }
    else
    {
        const numerator = mantissa * 1000000n;
        const denominator = 1n << BigInt(-exponent);
        scaled = numerator / denominator;
        const twice = (numerator % denominator) * 2n;
        if (twice > denominator || (twice === denominator && (scaled & 1n) === 1n))
        {
            scaled += 1n;
        }
    }
    const digits = scaled.toString().padStart(7, "0");
    return `${sign}${digits.slice(0, -6)}.${digits.slice(-6)}`;
}

/**
 * Carbon's `NewLiteralConst( ParserState&, float )`. The text is
 * `std::to_string`; the token type is `OP_FLOAT`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {number} value The value.
 * @returns {ASTNode} The `NT_CONSTANT` node.
 */
export function NewLiteralConst__Float(state, value)
{
    const token = new ScannerToken(OP_FLOAT, 0, state.AllocateName__Chars(toStringFloat(value)));
    const result = state.NewNode__Token(NT_CONSTANT, token);
    result.SetType(Type.typeFromTokenType(OP_FLOAT));
    return result;
}

/**
 * Carbon's `NewLiteralConst( ParserState&, uint32_t )`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {number} value The value.
 * @returns {ASTNode} The `NT_CONSTANT` node.
 */
export function NewLiteralConst__Uint(state, value)
{
    const token = new ScannerToken(OP_UINT, 0, state.AllocateName__Chars(String(value >>> 0)));
    const result = state.NewNode__Token(NT_CONSTANT, token);
    result.SetType(Type.typeFromTokenType(OP_UINT));
    return result;
}

/**
 * Carbon's `NewLiteralConst( ParserState&, bool )`.
 *
 * Bug (ParserUtils.cpp:1080): the token's integer value is 1 for `false` as
 * well as `true`, so evaluating the constant reads it as true. Reproduced
 * (Carbon known defect CE-59).
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {boolean} value The value.
 * @returns {ASTNode} The `NT_CONSTANT` node.
 */
export function NewLiteralConst__Bool(state, value)
{
    const result = state.NewNode__Token(NT_CONSTANT, new ScannerToken(OP_BOOL_CONST, 1, InlineString.makeInlineString(value ? "true" : "false")));
    result.SetType(Type.hlsl.bool_t);
    return result;
}

/**
 * Carbon's `NewDot( ParserState&, ASTNode*, Symbol* )`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {ASTNode} expr The object expression.
 * @param {import("../SymbolTable/Symbol.js").Symbol} field The field.
 * @returns {ASTNode} The `NT_POSTFIX_EXPRESSION` node.
 */
export function NewDot__Symbol(state, expr, field)
{
    const access = state.NewNode__Token(NT_POSTFIX_EXPRESSION, ScannerToken.id(field.name));
    access.AddChild(expr);
    access.SetType(field.type);
    access.SetSymbol(field);
    return access;
}

/**
 * Carbon's `NewDot( ParserState&, ASTNode*, const InlineString& )`: a member
 * or swizzle by name, typed with {@link ComputeMemberType}.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {ASTNode} expr The object expression.
 * @param {InlineString} field The member name.
 * @returns {ASTNode} The `NT_POSTFIX_EXPRESSION` node.
 */
export function NewDot__InlineString(state, expr, field)
{
    const access = state.NewNode__Token(NT_POSTFIX_EXPRESSION, ScannerToken.id(field));
    access.AddChild(expr);
    const type = new Type();
    const out = { symbol: null };
    if (!ComputeMemberType(expr.GetType(), field, type, out))
    {
        state.ShowMessage(ParserState.ErrorCode.EC_INVALID_SUBSCRIPT, field.ToString());
        type.FromTokenType(OP_VOID);
    }
    access.SetType(type);
    access.SetSymbol(out.symbol);
    return access;
}

/**
 * Carbon's `NewBinaryExpression`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {number} op Operator token type.
 * @param {ASTNode} left Left operand.
 * @param {ASTNode} right Right operand.
 * @returns {ASTNode} The `NT_EXPRESSION` node.
 */
export function NewBinaryExpression(state, op, left, right)
{
    const expr = state.NewNode__Token(NT_EXPRESSION, ScannerToken.fromTokenType(op));
    expr.AddChild(left);
    expr.AddChild(right);
    const type = new Type();
    if (!Type.getCommonType(left.GetType(), right.GetType(), type))
    {
        state.ShowMessage(ParserState.ErrorCode.EC_TYPE_MISMATCH);
        type.FromTokenType(OP_VOID);
    }
    expr.SetType(type);
    return expr;
}

/**
 * Carbon's `NewConditionalExpression`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {ASTNode} condition The condition.
 * @param {ASTNode} trueExpr Value when true.
 * @param {ASTNode} falseExpr Value when false.
 * @returns {ASTNode} The `NT_CONDITIONAL_EXPRESSION` node.
 */
export function NewConditionalExpression(state, condition, trueExpr, falseExpr)
{
    const expr = state.NewNode__Token(NT_CONDITIONAL_EXPRESSION, ScannerToken.fromTokenType(OP_QUESTION));
    expr.AddChild(condition);
    expr.AddChild(trueExpr);
    expr.AddChild(falseExpr);
    const type = new Type();
    if (!Type.getCommonType(trueExpr.GetType(), falseExpr.GetType(), type))
    {
        state.ShowMessage(ParserState.ErrorCode.EC_TYPE_MISMATCH);
        type.FromTokenType(OP_VOID);
    }
    expr.SetType(type);
    return expr;
}

/**
 * Carbon's `NewVarDeclaration( ParserState&, const Type&, const InlineString& )`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {Type} type The variable's type.
 * @param {InlineString} [name] Its name; a generated one when unset.
 * @returns {ASTNode} The `NT_VAR_DECLARATION_LIST` node.
 */
export function NewVarDeclaration__Type(state, type, name = new InlineString())
{
    const nameDecl = state.NewNode(NT_NAME_DECLARATION);
    const nameSymbol = state.GetSymbolTable().AddSymbol(name.IsSet() ? name : state.AllocateName());
    nameDecl.SetSymbol(nameSymbol);

    nameSymbol.type = type.Copy();
    nameSymbol.definition = nameDecl;
    nameDecl.SetType(nameSymbol.type);

    const declList = state.NewNode(NT_VAR_DECLARATION_LIST);
    declList.AddChild(nameDecl);
    declList.SetType(nameSymbol.type);
    return declList;
}

/**
 * Carbon's `NewVarDeclaration( ParserState&, Symbol*, ASTNode* )`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {import("../SymbolTable/Symbol.js").Symbol} symbol The variable.
 * @param {ASTNode|null} [initializer=null] Its initial value.
 * @returns {ASTNode} The `NT_VAR_DECLARATION_LIST` node.
 */
export function NewVarDeclaration__Symbol(state, symbol, initializer = null)
{
    const nameDecl = state.NewNode(NT_NAME_DECLARATION);
    nameDecl.SetSymbol(symbol);
    nameDecl.SetType(symbol.type);

    const declList = state.NewNode(NT_VAR_DECLARATION_LIST);
    declList.AddChild(nameDecl);
    declList.SetType(symbol.type);

    if (initializer)
    {
        nameDecl.AddChild(null);
        nameDecl.AddChild(initializer);
    }
    return declList;
}

/**
 * Carbon's `NewFunctionCall`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {Type} type The call's result type.
 * @param {string} name The function name.
 * @param {ASTNode[]} args The arguments.
 * @returns {ASTNode} The `NT_FUNCTION_CALL` node.
 */
export function NewFunctionCall(state, type, name, args)
{
    const token = ScannerToken.id(InlineString.makeInlineString(name));
    const ctr = state.NewNode(NT_FUNCTION_CALL);
    ctr.SetToken(token);
    ctr.SetType(type);
    for (const arg of args)
    {
        ctr.AddChild(arg);
    }
    return ctr;
}

/**
 * Carbon's `NewCastExpression`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {Type} type The target type.
 * @param {ASTNode} child The value.
 * @returns {ASTNode} The `NT_CAST_EXPRESSION` node.
 */
export function NewCastExpression(state, type, child)
{
    const cast = state.NewNode(NT_CAST_EXPRESSION);
    cast.SetType(type);
    cast.AddChild(child);
    return cast;
}

/**
 * Carbon's `NewExpressionStatement`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {ASTNode} expr The expression.
 * @returns {ASTNode} The `NT_EXPRESSION_STATEMENT` node.
 */
export function NewExpressionStatement(state, expr)
{
    const statement = state.NewNode(NT_EXPRESSION_STATEMENT);
    statement.AddChild(expr);
    return statement;
}

/**
 * Carbon's `NewReturn`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {ASTNode|null} [expr=null] The returned value.
 * @returns {ASTNode} The `NT_JUMP` node.
 */
export function NewReturn(state, expr = null)
{
    const returnNode = state.NewNode__Token(NT_JUMP, ScannerToken.fromTokenType(OP_RETURN));
    if (expr)
    {
        returnNode.AddChild(expr);
    }
    return returnNode;
}

/**
 * Carbon's `NewFunctionParameter( ParserState&, const Type&, const InlineString& )`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {Type} type The parameter's type.
 * @param {InlineString} [name] Its name; a generated one when unset.
 * @returns {ASTNode} The `NT_FUNCTION_PARAMETER` node.
 */
export function NewFunctionParameter(state, type, name = new InlineString())
{
    const param = state.NewNode(NT_FUNCTION_PARAMETER);
    const symbol = state.GetSymbolTable().AddSymbol(name.IsSet() ? name : state.AllocateName());
    symbol.type = type.Copy();
    symbol.definition = param;
    param.SetType(symbol.type);
    param.SetSymbol(symbol);
    if (type.arrayDimensions)
    {
        const brackets = state.NewNode(NT_BRACKET_LIST);
        brackets.AddChild(null);
        param.AddChild(brackets);
    }
    else
    {
        param.AddChild(null);
    }
    return param;
}

/**
 * Carbon's `NewFunctionParameter( ParserState&, const Type&, const char* )`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {Type} type The parameter's type.
 * @param {string} name Its name.
 * @returns {ASTNode} The `NT_FUNCTION_PARAMETER` node.
 */
export function NewFunctionParameter__Chars(state, type, name)
{
    return NewFunctionParameter(state, type, state.AllocateName__Chars(name));
}

/**
 * Carbon's `NewFunctionParameter( ParserState&, const Type&, const char*, const RegisterSpecifier& )`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {Type} type The parameter's type.
 * @param {string} name Its name.
 * @param {RegisterSpecifier} reg Its every-profile register binding.
 * @returns {ASTNode} The `NT_FUNCTION_PARAMETER` node.
 */
export function NewFunctionParameter__RegisterSpecifier(state, type, name, reg)
{
    const arg = NewFunctionParameter(state, type, state.AllocateName__Chars(name));
    arg.GetSymbol().registerSpecifier.set("", reg.Copy());
    return arg;
}

/**
 * Carbon's `ParseGlobalInput`: the names in a `globalinput` attribute
 * string, each a global resource or buffer.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {ScannerToken} input The attribute's string literal token.
 * @returns {GlobalInputElement[]|null} The inputs, or null after reporting an error.
 */
export function ParseGlobalInput(state, input)
{
    const processed = PreprocessString(input.stringValue);
    if (processed === null)
    {
        return null;
    }

    const tokens = TokenizeGlobalInput(InlineString.makeInlineString(processed));
    if (tokens === null)
    {
        state.ShowMessage__Location(input.fileLocation, ParserState.ErrorCode.EC_CUSTOM_ERROR, "Malformed globalinput string");
        return null;
    }

    const result = [];
    for (const name of tokens)
    {
        let symbol = state.GetSymbolTable().LookupGlobal(name.ToString());
        let isCBuffer = false;
        // Carbon's `useCBuffers` is a constant false; this is its else branch.
        if (!symbol)
        {
            symbol = state.GetSymbolTable().LookupBuffer(name);
            isCBuffer = true;
        }
        if (symbol && symbol.type.IsStruct())
        {
            isCBuffer = true;
        }
        if (!symbol)
        {
            state.ShowMessage__Location(input.fileLocation, ParserState.ErrorCode.EC_UNDECLARED_IDENTIFIER, name.ToString());
            return null;
        }
        const type = symbol.type;
        if (!isCBuffer && !type.IsTexture() && !type.IsSampler() && !type.IsBuffer() && !(type.symbol === null && type.builtInType === OP_RAYTRACING_ACCELERATION_STRUCTURE))
        {
            state.ShowMessage__Location(input.fileLocation, ParserState.ErrorCode.EC_CUSTOM_ERROR, "Unsupported type for \"%s\" in the globalinput", name.ToString());
            return null;
        }
        result.push(new GlobalInputElement(type, symbol.name, symbol.definition, symbol));
    }
    return result;
}

/**
 * Carbon's `ProcessGlobalInputAttribute`: reads a function's `globalinput`
 * attribute and checks every function of a library declares the same inputs.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {ASTNode} func The `NT_FUNCTION_DEFINITION` node.
 * @param {GlobalInputElement[]} globalInput The library's inputs so far; filled from the first function that declares them.
 * @returns {boolean} False after reporting an error.
 */
export function ProcessGlobalInputAttribute(state, func, globalInput)
{
    const attribs = func.GetChildOrNull(2);
    if (attribs)
    {
        for (const attrib of attribs.GetChildren())
        {
            if (attrib.GetToken().stringValue.Equals__Chars("globalinput"))
            {
                if (!attrib.GetChildOrNull(0))
                {
                    state.ShowMessage__Location(attrib.GetToken().fileLocation, ParserState.ErrorCode.EC_CUSTOM_ERROR, "Function annotation globalinput must have a string parameter with global input declarations");
                    return false;
                }
                const input = ParseGlobalInput(state, attrib.GetChildOrNull(0).GetToken());
                if (input === null)
                {
                    return false;
                }
                if (globalInput.length !== 0)
                {
                    const same = globalInput.length === input.length && globalInput.every((element, i) => element.Equals(input[i]));
                    if (!same)
                    {
                        state.ShowMessage__Location(attrib.GetToken().fileLocation, ParserState.ErrorCode.EC_CUSTOM_ERROR, "Function annotations globalinput must match across all functions in the library");
                        return false;
                    }
                }
                else
                {
                    for (const element of input)
                    {
                        globalInput.push(element);
                    }
                }
            }
        }
    }
    return true;
}
