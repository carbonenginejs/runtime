// Source: trinity/shadercompiler/TextureFunctionConversionDX11.h
// Source: trinity/shadercompiler/TextureFunctionConversionDX11.cpp
//
// Carbon's tree passes that rewrite texture access, under Carbon's names and
// in Carbon's order:
//
// - DX9 `tex*( sampler, ... )` intrinsics become DX10 method calls on the
//   texture the sampler names (`ConvertTextureFunctionsDX11`), adding texture
//   parameters to the functions that take samplers, and texture arguments to
//   their calls;
// - a sampler's `SRGBTexture` state becomes a `Tr2sRGB` annotation on its
//   texture (`TransferSRGBToTexturesDX11`);
// - DX10 texture methods, texture indexing and buffer loads become Metal's
//   (`ConvertTextureFunctionsToMetal`);
// - samplers with identical static state are merged (`MergeSamplers`).
//
// Carbon's file-local (`static`) functions are module functions that are not
// exported. `SplitCoordVec`, `PatchMetalBufferCalls`, `PatchMetalTextureCall`
// and `PatchMetalTextureCalls` have external linkage in Carbon without a
// header declaration, and are exported.
//
// Carbon's `assert`s are compiled out of the shipped (release) compiler; the
// port follows the release behaviour and says so at each site.

import { HLSLParserTokens } from "../hlslParserTokens.js";
import { ASTNode } from "../ASTNode/ASTNode.js";
import { InlineString } from "../InlineString.js";
import { Type } from "../Type.js";
import { ScannerToken } from "../ParserState/ScannerToken.js";
import { FileLocation } from "../ParserState/FileLocation.js";
import { CjsFxStdMap } from "../CjsFxStdMap.js";
import { Symbol } from "../SymbolTable/Symbol.js";
import { SymbolAnnotation } from "../SymbolTable/SymbolAnnotation.js";
import { Sampler } from "../EffectData/Sampler.js";
import { ToString, NewDot__InlineString } from "../ParserUtils/parserUtils.js";
import { GetSamplerState, ParseStateAssignment, g_samplerStates } from "../FXAnalyzer/fxAnalyzer.js";
import { SamplerToTexture } from "./SamplerToTexture.js";
import { ParameterInfo } from "./ParameterInfo.js";
import { ParserState } from "../ParserState/ParserState.js";
import { SymbolTable } from "../SymbolTable/SymbolTable.js";
import { Texture } from "../EffectData/Texture.js";

const {
    OP_TEXTURE, OP_TEXTURE1D, OP_TEXTURE2D, OP_TEXTURE3D, OP_TEXTURECUBE, OP_TEXTURE1DARRAY, OP_TEXTURE2DARRAY,
    OP_TEXTURE3DARRAY, OP_TEXTURECUBEARRAY, OP_TEXTURE2DMS, OP_TEXTURE2DMSARRAY,
    OP_RWTEXTURE1D, OP_RWTEXTURE1DARRAY, OP_RWTEXTURE2D, OP_RWTEXTURE2DARRAY, OP_RWTEXTURE3D, OP_RWTEXTURE3DARRAY,
    OP_BINDLESSHANDLETEXTURE2D, OP_BINDLESSHANDLETEXTURE3D, OP_BINDLESSHANDLETEXTURECUBE,
    OP_DOT, OP_ID, OP_LEFT_PAREN, OP_SLASH, OP_LEFT_BRACKET, OP_EQUAL,
    OP_MUL_ASSIGN, OP_DIV_ASSIGN, OP_MOD_ASSIGN, OP_ADD_ASSIGN, OP_SUB_ASSIGN, OP_LEFT_ASSIGN, OP_RIGHT_ASSIGN,
    OP_AND_ASSIGN, OP_XOR_ASSIGN, OP_OR_ASSIGN,
    OP_UINT, OP_FLOAT, OP_BOOL, OP_INT_CONST, OP_BOOL_CONST
} = HLSLParserTokens;

const {
    NT_VAR_IDENTIFIER, NT_EXPRESSION, NT_FUNCTION_CALL, NT_FUNCTION_PARAMETER, NT_FUNCTION_HEADER,
    NT_FUNCTION_DEFINITION, NT_NAME_DECLARATION, NT_POSTFIX_EXPRESSION, NT_SAMPLER_STATE_LIST, NT_CAST_EXPRESSION,
    NT_CONSTANT, NT_VAR_DECLARATION_LIST
} = ASTNode.ASTNodeType;

/**
 * The storage of Carbon's `const char* xyzw = "xyzw"` locals, which the
 * swizzles below take ranges of with `MakeInlineString( start, end )`.
 */
const XYZW = { text: "xyzw" };

/**
 * C `_stricmp( a, b ) == 0`, over `a` as `c_str()` hands it over.
 *
 * @param {string} a First string; it ends at its first NUL.
 * @param {string} b Second string.
 * @returns {boolean} Whether they match ignoring ASCII case.
 */
function stricmpEqual(a, b)
{
    return InlineString.iEquals__Chars(InlineString.makeInlineString(a), b);
}

/**
 * Carbon's `std::map<Symbol*, ...>::find`: the value, or null where Carbon
 * gets `end()`. Carbon orders these maps by pointer; the passes only find and
 * insert, so a `Map` keyed by the symbol is the same.
 *
 * @template T
 * @param {Map<import("../SymbolTable/Symbol.js").Symbol|null, T>} map The map.
 * @param {import("../SymbolTable/Symbol.js").Symbol|null} key The key.
 * @returns {T|null} The value, or null when absent.
 */
function find(map, key)
{
    const value = map.get(key);
    return value === undefined ? null : value;
}

/**
 * A copy of a `Symbol::registerSpecifier` map, as assigning a `std::map`
 * copies its `RegisterSpecifier` values.
 *
 * @param {CjsFxStdMap} registerSpecifier The bindings to copy.
 * @returns {CjsFxStdMap} The copy.
 */
function copyRegisterSpecifier(registerSpecifier)
{
    const copy = new CjsFxStdMap();
    for (const [profile, reg] of registerSpecifier)
    {
        copy.set(profile, reg.Copy());
    }
    return copy;
}

/**
 * Carbon's `GetTextureType`: the texture type a DX9 `tex*` intrinsic samples,
 * by the dimension its name contains.
 *
 * Quirk (TextureFunctionConversionDX11.cpp:35-36; Carbon known defect CE-104):
 * a name with no dimension returns `TEX_TYPE_TYPELESS`, an `EffectData`
 * `TextureType`, where the callers expect a parser token; the `assert` before
 * it is compiled out of the shipped compiler. Every registered `tex*`
 * intrinsic names a dimension, so it is not reached.
 *
 * @param {InlineString} name The intrinsic's name.
 * @returns {number} `OP_TEXTURE1D`, `OP_TEXTURE2D`, `OP_TEXTURE3D` or `OP_TEXTURECUBE`.
 */
function GetTextureType(name)
{
    const s_textureName = ["1D", "2D", "3D", "CUBE"];
    const s_textureType = [OP_TEXTURE1D, OP_TEXTURE2D, OP_TEXTURE3D, OP_TEXTURECUBE];
    for (let i = 0; i < s_textureType.length; ++i)
    {
        if (InlineString.containsSubstring(name, s_textureName[i]))
        {
            return s_textureType[i];
        }
    }
    // assert( false ), compiled out.
    // Quirk (TextureFunctionConversionDX11.cpp:36; Carbon known defect CE-104): a TextureType, not a token.
    return Texture.TextureType.TEX_TYPE_TYPELESS;
}

/**
 * Carbon's `ExtractTextureState`: the symbol a sampler's
 * `sampler_state { Texture = ...; }` names.
 *
 * Carbon dereferences the sampler's definition and the state's value without
 * checking; null there is undefined, so it throws.
 *
 * @param {import("../SymbolTable/Symbol.js").Symbol} symbol The sampler.
 * @returns {import("../SymbolTable/Symbol.js").Symbol|null} The value's symbol, or null when there is no `Texture` state.
 */
function ExtractTextureState(symbol)
{
    if (symbol.definition === null)
    {
        throw new TypeError("ExtractTextureState: the sampler has no definition (Carbon dereferences null)");
    }
    const states = symbol.definition.GetChildOrNull(1);
    if (states && states.GetNodeType() === NT_SAMPLER_STATE_LIST)
    {
        for (let k = 0; k < states.GetChildrenCount(); ++k)
        {
            const state = states.GetChild(k);
            const name = ToString(state.GetToken().stringValue);
            if (stricmpEqual(name, "Texture"))
            {
                const value = state.GetChildOrNull(0);
                if (value === null)
                {
                    throw new TypeError("ExtractTextureState: the Texture state has no value (Carbon dereferences null)");
                }
                return value.GetSymbol();
            }
        }
    }
    return null;
}

/**
 * Carbon's `GetSamplerArg`: the identifier a sampler argument names, through
 * any parentheses.
 *
 * @param {ASTNode|null} arg The argument.
 * @returns {ASTNode|null} The `NT_VAR_IDENTIFIER`, or null for any other expression.
 */
function GetSamplerArg(arg)
{
    if (arg === null)
    {
        return null;
    }
    switch (arg.GetNodeType())
    {
        case NT_VAR_IDENTIFIER:
            return arg;
        case NT_EXPRESSION:
            if (arg.GetToken().type === OP_LEFT_PAREN)
            {
                return GetSamplerArg(arg.GetChildOrNull(0));
            }
        // falls through
        default:
            break;
    }
    return null;
}

/**
 * Carbon's `GetTextureTypeName`.
 *
 * @param {number} textureType A texture type token.
 * @returns {string} `"1D"`, `"2D"`, `"3D"`, `"CUBE"`, or `""` for any other.
 */
function GetTextureTypeName(textureType)
{
    switch (textureType)
    {
        case OP_TEXTURE1D:
            return "1D";
        case OP_TEXTURE2D:
            return "2D";
        case OP_TEXTURE3D:
            return "3D";
        case OP_TEXTURECUBE:
            return "CUBE";
        default:
            return "";
    }
}

/**
 * Carbon's `AssignTextureType`: gives an untyped `texture` the type it is
 * sampled as, and warns when a typed one is sampled as another (taking the
 * new type).
 *
 * Quirk (TextureFunctionConversionDX11.cpp:110-113 and 122-125; Carbon known
 * defect CE-100): the new type is set on child 0 of the texture's definition,
 * which for a name declaration or a function parameter is its bracket list
 * (or null), not on the declaration node itself, so the declaration node
 * keeps the old type while the symbol takes the new one.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state Reports messages.
 * @param {import("../SymbolTable/Symbol.js").Symbol} texture The texture.
 * @param {number} type The texture type token it is used as.
 * @param {ScannerToken} token Where it is used, for messages.
 * @returns {boolean} False, after reporting `EC_NO_OVERRIDE`, when the symbol is not a texture.
 */
function AssignTextureType(state, texture, type, token)
{
    switch (texture.type.builtInType)
    {
        case OP_TEXTURE1D:
        case OP_TEXTURE2D:
        case OP_TEXTURE3D:
        case OP_TEXTURECUBE:
            if (texture.type.builtInType !== type)
            {
                state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_MISMATCHED_TEXTURE_TYPE, ToString(texture.name), GetTextureTypeName(texture.type.builtInType), GetTextureTypeName(type));
                texture.type.builtInType = type;
                if (texture.definition)
                {
                    // Quirk (TextureFunctionConversionDX11.cpp:110; Carbon known defect CE-100):
                    // child 0 is the bracket list, not the declaration.
                    const textureType = texture.definition.GetChildOrNull(0);
                    if (textureType)
                    {
                        textureType.SetType(texture.type);
                    }
                }
            }
            break;
        case OP_TEXTURE:
            texture.type.builtInType = type;
            if (texture.definition)
            {
                // Quirk (TextureFunctionConversionDX11.cpp:122; Carbon known defect CE-100):
                // child 0 is the bracket list, not the declaration.
                const textureType = texture.definition.GetChildOrNull(0);
                if (textureType)
                {
                    textureType.SetType(texture.type);
                }
            }
            break;
        default:
            state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_NO_OVERRIDE, ToString(token.stringValue), "");
            return false;
    }
    return true;
}

/**
 * Carbon's `FindTextureToSampler`: the texture a sampler argument samples,
 * recorded in `samplers`.
 *
 * A sampler already recorded gives its texture (an error if it was sampled as
 * another type). A sampler that is a function parameter gets a new texture
 * symbol, `_new_symbol_NNNN`, of the type used, bound to the sampler's
 * registers as `t` registers. Any other sampler gives the texture its
 * `sampler_state` names; without one, a warning, and a new untyped texture of
 * the sampler's own name, declared first in the program. That texture then
 * takes the type used, and the sampler's registers when it has none.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {ASTNode|null} sampler The sampler argument.
 * @param {Map<import("../SymbolTable/Symbol.js").Symbol, SamplerToTexture>} samplers Samplers paired so far, by sampler symbol.
 * @param {number} usedType The texture type token the call samples.
 * @param {ScannerToken} token The call's token, for messages.
 * @returns {import("../SymbolTable/Symbol.js").Symbol|null} The texture, or null when the argument names no symbol.
 */
function FindTextureToSampler(state, sampler, samplers, usedType, token)
{
    sampler = GetSamplerArg(sampler);
    if (sampler && sampler.GetSymbol())
    {
        let texture = null;
        const found = find(samplers, sampler.GetSymbol());
        if (found !== null && found.texture)
        {
            const oldType = found.texture.type.builtInType;
            if (usedType !== OP_TEXTURE && oldType !== usedType)
            {
                state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_MISMATCHED_SAMPLER_TYPE, ToString(sampler.GetSymbol().name), GetTextureTypeName(usedType), GetTextureTypeName(oldType));
            }
            return found.texture;
        }
        else if (sampler.GetSymbol().definition && sampler.GetSymbol().definition.GetNodeType() === NT_FUNCTION_PARAMETER)
        {
            const str = state.AllocateName();
            texture = state.GetSymbolTable().AddSymbol(str);
            texture.type.FromTokenType(usedType);
            if (sampler.GetSymbol().registerSpecifier.size !== 0)
            {
                texture.registerSpecifier = copyRegisterSpecifier(sampler.GetSymbol().registerSpecifier);
                for (const [, reg] of texture.registerSpecifier)
                {
                    reg.registerType = "t";
                }
            }
        }
        else
        {
            texture = ExtractTextureState(sampler.GetSymbol());
            if (texture === null)
            {
                state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_SAMPLER_WITHOUT_TEXTURE, ToString(sampler.GetSymbol().name));

                const texDecl = new ASTNode(NT_NAME_DECLARATION, sampler.GetLocation(), sampler.GetScope(), null);

                const type = new Type();
                type.FromTokenType(OP_TEXTURE);
                texDecl.SetType(type);

                texture = new Symbol();
                texture.name = sampler.GetSymbol().name.Copy();
                texture.type = type.Copy();
                texDecl.SetSymbol(texture);
                state.GetSymbolTable().AddSymbol__Symbol(texture, SymbolTable.OverrideBehavior.ALLOW_OVERRIDES);

                state.GetTree().InsertChild(0, texDecl);
            }

            AssignTextureType(state, texture, usedType, token);
            if (sampler.GetSymbol().registerSpecifier.size !== 0)
            {
                if (texture.registerSpecifier.size === 0)
                {
                    texture.registerSpecifier = copyRegisterSpecifier(sampler.GetSymbol().registerSpecifier);
                    for (const [, reg] of texture.registerSpecifier)
                    {
                        reg.registerType = "t";
                    }
                }
            }
        }
        const record = new SamplerToTexture();
        record.texture = texture;
        record.processed = false;
        samplers.set(sampler.GetSymbol(), record);
        return texture;
    }
    return null;
}

/**
 * The swizzle Carbon picks from the fourth character of a DX9 intrinsic's
 * name (`tex2Dlod` gives `"xy"`), the switch Carbon repeats for `lod`, `bias`
 * and `proj`.
 *
 * @param {InlineString} name The intrinsic's name.
 * @returns {string|null} The swizzle, or null where Carbon sets `doSwizzle` false.
 */
function coordinateSwizzle(name)
{
    switch (String.fromCharCode(name.CharAt(name.start + 3)))
    {
        case "1":
            return "x";
        case "2":
            return "xy";
        case "3":
        case "C":
            return "xyz";
        default:
            return null;
    }
}

/**
 * Carbon's `FindDX9TexSampleCalls`: rewrites every DX9 `tex*( sampler, ... )`
 * call in a subtree as a method call on the sampler's texture,
 * `texture.Sample*( sampler, ... )`, and records each sampler's texture.
 *
 * `lod` and `bias` take the level from the coordinate's `w` and keep the
 * coordinate's leading components; `proj` divides them by `w`; four
 * arguments or `grad` give `SampleGrad`. A scalar coordinate is used as both.
 * A symbol in scope with the texture's name is renamed first.
 *
 * Carbon builds the rewritten call's token, and the `.` node's, from a
 * default-constructed `ScannerToken` (TextureFunctionConversionDX11.cpp:239),
 * which leaves `intValue` (and, for the `.` node, `stringValue`)
 * indeterminate. Nothing reads them for these node kinds; the port's tokens
 * hold 0 and the null string there.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {ASTNode|null} node The subtree.
 * @param {Set<import("../SymbolTable/Symbol.js").Symbol>} dx9TextureFunctions The DX9 `tex*` intrinsics.
 * @param {Map<import("../SymbolTable/Symbol.js").Symbol, SamplerToTexture>} samplers Samplers paired so far.
 * @returns {ASTNode|null} The `texture.Sample*( ... )` node replacing `node`, or null when `node` itself is not replaced.
 */
function FindDX9TexSampleCalls(state, node, dx9TextureFunctions, samplers)
{
    if (node === null)
    {
        return null;
    }
    let result = null;
    if (node.GetNodeType() === NT_FUNCTION_CALL)
    {
        if (node.GetSymbol())
        {
            if (dx9TextureFunctions.has(node.GetSymbol()))
            {
                const type = GetTextureType(node.GetSymbol().name);
                const texture = FindTextureToSampler(state, node.GetChildOrNull(0), samplers, type, node.GetToken());

                if (texture)
                {
                    const otherSymbol = node.GetScope().Lookup(texture.name);
                    if (otherSymbol !== null && otherSymbol !== texture)
                    {
                        // we have a local symbol with the same name as the texture
                        // rename it
                        otherSymbol.name = state.AllocateName();
                    }
                    const token = new ScannerToken();
                    token.fileLocation = new FileLocation(0, new InlineString());
                    token.type = OP_DOT;
                    const variable = new ASTNode(NT_VAR_IDENTIFIER, node.GetLocation(), node.GetScope(), null);
                    variable.SetSymbol(texture);
                    variable.SetType(texture.type);
                    result = new ASTNode(NT_POSTFIX_EXPRESSION, node.GetLocation(), node.GetScope(), token);
                    result.AddChild(variable);
                    result.AddChild(node);

                    let sample;
                    if (InlineString.containsSubstring(node.GetSymbol().name, "lod"))
                    {
                        const s_sample = "SampleLevel";
                        sample = s_sample;
                        let coord = node.GetChildOrNull(1);
                        if (coord)
                        {
                            // we need to convert tex##lod( sampler, xyzw ) to
                            // texture.SampleLevel( sampler, xyz, w )
                            // TODO: we do it in a dirty way: texture.SampleLevel( sampler, xyzw.###, (xyzw).w )
                            // which is not OK if "xyzw" contains side effects
                            if (coord.GetType().width !== 1)
                            {
                                const lod = coord.Copy();
                                const swizzle = new ScannerToken();
                                swizzle.fileLocation = new FileLocation(0, new InlineString());
                                swizzle.intValue = 0;
                                swizzle.stringValue = InlineString.makeInlineString("w");
                                swizzle.type = OP_ID;

                                const dot = new ASTNode(NT_POSTFIX_EXPRESSION, lod.GetLocation(), lod.GetScope(), swizzle);
                                dot.AddChild(lod);
                                node.InsertChild(2, dot);

                                const components = coordinateSwizzle(node.GetSymbol().name);
                                const doSwizzle = components !== null;
                                if (doSwizzle)
                                {
                                    swizzle.stringValue = InlineString.makeInlineString(components);
                                    const swizzleDot = new ASTNode(NT_POSTFIX_EXPRESSION, lod.GetLocation(), lod.GetScope(), swizzle);
                                    swizzleDot.AddChild(coord);
                                    node.ReplaceChild(1, swizzleDot);
                                    coord = swizzleDot;
                                }
                            }
                            else
                            {
                                node.InsertChild(2, coord.Copy());
                            }
                        }
                    }
                    else if (InlineString.containsSubstring(node.GetSymbol().name, "bias"))
                    {
                        const s_sample = "SampleBias";
                        sample = s_sample;
                        let coord = node.GetChildOrNull(1);
                        if (coord)
                        {
                            // we need to convert tex##bias( sampler, xyzw ) to
                            // texture.SampleBias( sampler, xyz, w )
                            // TODO: we do it in a dirty way: texture.SampleLevel( sampler, xyzw, (xyzw).w )
                            // which is not OK if "xyzw" contains side effects
                            if (coord.GetType().width !== 1)
                            {
                                const lod = coord.Copy();
                                const swizzle = new ScannerToken();
                                swizzle.fileLocation = new FileLocation(0, new InlineString());
                                swizzle.intValue = 0;
                                swizzle.stringValue = InlineString.makeInlineString("w");
                                swizzle.type = OP_ID;

                                const dot = new ASTNode(NT_POSTFIX_EXPRESSION, lod.GetLocation(), lod.GetScope(), swizzle);
                                dot.AddChild(lod);
                                node.InsertChild(2, dot);

                                const components = coordinateSwizzle(node.GetSymbol().name);
                                const doSwizzle = components !== null;
                                if (doSwizzle)
                                {
                                    swizzle.stringValue = InlineString.makeInlineString(components);
                                    const swizzleDot = new ASTNode(NT_POSTFIX_EXPRESSION, lod.GetLocation(), lod.GetScope(), swizzle);
                                    swizzleDot.AddChild(coord);
                                    node.ReplaceChild(1, swizzleDot);
                                    coord = swizzleDot;
                                }
                            }
                            else
                            {
                                node.InsertChild(2, coord.Copy());
                            }
                        }
                    }
                    else if (InlineString.containsSubstring(node.GetSymbol().name, "proj"))
                    {
                        const s_sample = "Sample";
                        sample = s_sample;
                        let coord = node.GetChildOrNull(1);
                        if (coord)
                        {
                            // we need to convert tex##proj( sampler, xyzw ) to
                            // texture.Sample( sampler, xyz / w )
                            // TODO: we do it in a dirty way: texture.SampleLevel( sampler, xyzw / (xyzw).w )
                            // which is not OK if "xyzw" contains side effects
                            if (coord.GetType().width !== 1)
                            {
                                const lod = coord.Copy();
                                const swizzle = new ScannerToken();
                                swizzle.fileLocation = new FileLocation(0, new InlineString());
                                swizzle.intValue = 0;
                                swizzle.stringValue = InlineString.makeInlineString("w");
                                swizzle.type = OP_ID;

                                const dot = new ASTNode(NT_POSTFIX_EXPRESSION, lod.GetLocation(), lod.GetScope(), swizzle);
                                dot.AddChild(lod);

                                const div = new ScannerToken();
                                div.fileLocation = new FileLocation(0, new InlineString());
                                div.intValue = 0;
                                div.stringValue = new InlineString();
                                div.type = OP_SLASH;

                                const expr = new ASTNode(NT_EXPRESSION, lod.GetLocation(), lod.GetScope(), div);

                                const components = coordinateSwizzle(node.GetSymbol().name);
                                const doSwizzle = components !== null;
                                if (doSwizzle)
                                {
                                    swizzle.stringValue = InlineString.makeInlineString(components);
                                    const swizzleDot = new ASTNode(NT_POSTFIX_EXPRESSION, lod.GetLocation(), lod.GetScope(), swizzle);
                                    swizzleDot.AddChild(coord);
                                    node.ReplaceChild(1, swizzleDot);
                                    coord = swizzleDot;
                                }

                                expr.AddChild(coord);
                                expr.AddChild(dot);
                                node.ReplaceChild(1, expr);
                            }
                            else
                            {
                                const div = new ScannerToken();
                                div.fileLocation = new FileLocation(0, new InlineString());
                                div.intValue = 0;
                                div.stringValue = new InlineString();
                                div.type = OP_SLASH;

                                const expr = new ASTNode(NT_EXPRESSION, coord.GetLocation(), coord.GetScope(), div);
                                expr.AddChild(coord);
                                expr.AddChild(coord.Copy());
                                node.ReplaceChild(1, expr);
                            }
                        }
                    }
                    else if (node.GetChildrenCount() === 4 || InlineString.containsSubstring(node.GetSymbol().name, "grad"))
                    {
                        // this is a form tex##( sampler, coord, ddx, ddy )
                        const s_sample = "SampleGrad";
                        sample = s_sample;
                    }
                    else
                    {
                        const s_sample = "Sample";
                        sample = s_sample;
                    }
                    token.type = OP_ID;
                    token.stringValue = InlineString.makeInlineString(sample);

                    node.SetSymbol(null);
                    node.SetToken(token);
                }
            }
        }
    }
    for (let i = 0; i < node.GetChildrenCount(); ++i)
    {
        const ret = FindDX9TexSampleCalls(state, node.GetChild(i), dx9TextureFunctions, samplers);
        if (ret)
        {
            node.ReplaceChild(i, ret);
        }
    }
    return result;
}

/**
 * Carbon's `PatchFunctionHeaders`: inserts a texture parameter before each
 * sampler parameter whose sampler has a texture not yet given a parameter,
 * and records, per function symbol, where its calls must insert the texture
 * argument.
 *
 * @param {ASTNode|null} node The subtree.
 * @param {Map<import("../SymbolTable/Symbol.js").Symbol, SamplerToTexture>} samplers Samplers paired so far; each patched one is marked processed.
 * @param {Map<import("../SymbolTable/Symbol.js").Symbol, ParameterInfo[]>} functions Receives the patched functions.
 */
function PatchFunctionHeaders(node, samplers, functions)
{
    if (node === null)
    {
        return;
    }

    if (node.GetNodeType() === NT_FUNCTION_HEADER)
    {
        const patchedParams = [];
        let callIndex = 0;
        for (let i = 0; i < node.GetChildrenCount(); ++i)
        {
            const found = find(samplers, node.GetChild(i).GetSymbol());
            if (found === null || found.processed)
            {
                ++callIndex;
                continue;
            }

            const newParam = new ASTNode(NT_FUNCTION_PARAMETER, node.GetLocation(), node.GetScope(), null);
            found.texture.definition = newParam;
            newParam.SetType(found.texture.type);
            newParam.SetSymbol(found.texture);

            node.InsertChild(i, newParam);

            const info = new ParameterInfo();
            info.argumentIndex = callIndex;
            info.parameterIndex = i;
            patchedParams.push(info);
            ++i;
            ++callIndex;
            found.processed = true;
        }
        if (patchedParams.length !== 0)
        {
            functions.set(node.GetSymbol(), patchedParams);
        }
    }

    for (let i = 0; i < node.GetChildrenCount(); ++i)
    {
        PatchFunctionHeaders(node.GetChild(i), samplers, functions);
    }
}

/**
 * Carbon's `PatchCalls`: inserts the texture argument into every call of a
 * function `PatchFunctionHeaders` patched, last parameter first, so each
 * recorded argument index still counts the call's original arguments.
 *
 * The texture is the one paired with the sampler argument, else the one its
 * `sampler_state` names, else, for a sampler that is itself a parameter of
 * the calling function, a new one of the parameter's type; it takes the type
 * of the callee's texture parameter.
 *
 * Bug (TextureFunctionConversionDX11.cpp:593; Carbon known defect CE-98): the
 * new texture for a sampler parameter is looked up from argument 0 of the
 * call, not from the sampler argument (`argumentIndex`), so a call that does
 * not pass the sampler first pairs a texture with whatever argument 0 is.
 *
 * Quirk (TextureFunctionConversionDX11.cpp:544-548 and 597-601; Carbon known
 * defect CE-101): a sampler argument that is not an identifier (`s[0]`,
 * `a.s`), or no texture for it, returns without a message. The `assert`
 * before the `return` is compiled out of the shipped compiler, so the callee
 * keeps its new texture parameter, this call does not get the argument, and
 * this call's arguments are not visited.
 *
 * Quirk (TextureFunctionConversionDX11.cpp:617-619; Carbon known defect
 * CE-102): the inserted argument node is given the texture's symbol but not its
 * type, unlike the texture node `FindDX9TexSampleCalls` builds (line 245); its
 * type is the zeroed type.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {ASTNode|null} node The subtree.
 * @param {Map<import("../SymbolTable/Symbol.js").Symbol, SamplerToTexture>} samplers Samplers paired so far.
 * @param {Map<import("../SymbolTable/Symbol.js").Symbol, ParameterInfo[]>} functions The patched functions.
 */
function PatchCalls(state, node, samplers, functions)
{
    if (node === null)
    {
        return;
    }
    if (node.GetNodeType() === NT_FUNCTION_CALL)
    {
        const found = find(functions, node.GetSymbol());
        if (found !== null)
        {
            for (let index = found.length - 1; index >= 0; --index)
            {
                const it = found[index];
                let samplerArg = null;
                const arg = GetSamplerArg(node.GetChildOrNull(it.argumentIndex));
                if (arg)
                {
                    samplerArg = arg.GetSymbol();
                }
                if (samplerArg === null)
                {
                    // assert( false ), compiled out.
                    // Quirk (TextureFunctionConversionDX11.cpp:546; Carbon known defect CE-101).
                    return;
                }
                let texture = null;
                const textureFound = find(samplers, samplerArg);
                if (textureFound === null)
                {
                    if (samplerArg.definition && samplerArg.definition.GetNodeType() !== NT_FUNCTION_PARAMETER)
                    {
                        texture = ExtractTextureState(samplerArg);

                        if (texture)
                        {
                            if (samplerArg.registerSpecifier.size !== 0)
                            {
                                if (texture.registerSpecifier.size === 0)
                                {
                                    texture.registerSpecifier = copyRegisterSpecifier(samplerArg.registerSpecifier);
                                    for (const [, registerSpecifier] of texture.registerSpecifier)
                                    {
                                        registerSpecifier.registerType = "t";
                                    }
                                }
                            }
                        }
                    }
                }
                else
                {
                    texture = textureFound.texture;
                }
                if (texture === null)
                {
                    if (samplerArg.definition && samplerArg.definition.GetNodeType() === NT_FUNCTION_PARAMETER && node.GetSymbol() && node.GetSymbol().definition)
                    {
                        let header = node.GetSymbol().definition;
                        if (header.GetNodeType() === NT_FUNCTION_DEFINITION)
                        {
                            header = header.GetChildOrNull(0);
                        }
                        if (header)
                        {
                            const paramNumber = it.parameterIndex;
                            const textureParam = header.GetChildOrNull(paramNumber);
                            if (textureParam)
                            {
                                const type = textureParam.GetType().builtInType;
                                // Bug (TextureFunctionConversionDX11.cpp:593; Carbon known defect CE-98):
                                // argument 0, not argument `it.argumentIndex`.
                                texture = FindTextureToSampler(state, node.GetChildOrNull(0), samplers, type, node.GetToken());
                            }
                        }
                    }
                    if (texture === null || texture.type.symbol)
                    {
                        // assert( false ), compiled out.
                        // Quirk (TextureFunctionConversionDX11.cpp:599; Carbon known defect CE-101).
                        return;
                    }
                }
                let header = node.GetSymbol().definition;
                if (header && header.GetNodeType() === NT_FUNCTION_DEFINITION)
                {
                    header = header.GetChildOrNull(0);
                }
                if (header)
                {
                    const param = header.GetChildOrNull(it.parameterIndex);
                    if (param && param.GetSymbol())
                    {
                        const usedType = param.GetSymbol().type.builtInType;
                        AssignTextureType(state, texture, usedType, node.GetToken());
                    }
                }
                // Quirk (TextureFunctionConversionDX11.cpp:617; Carbon known defect CE-102): no type.
                const textureArg = new ASTNode(NT_VAR_IDENTIFIER, node.GetLocation(), node.GetScope(), null);
                textureArg.SetSymbol(texture);
                node.InsertChild(it.argumentIndex, textureArg);
            }
        }
    }
    for (let i = 0; i < node.GetChildrenCount(); ++i)
    {
        PatchCalls(state, node.GetChild(i), samplers, functions);
    }
}

/**
 * Carbon's `ConvertTextureFunctionsDX11`: rewrites DX9 `tex*` intrinsics as
 * DX10 texture methods, then adds texture parameters and arguments up the
 * call chain until no function takes a new one.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parsed shader; its tree is rewritten.
 */
export function ConvertTextureFunctionsDX11(state)
{
    const samplers = new Map();
    const functions = new Map();

    FindDX9TexSampleCalls(state, state.GetTree(), state.GetDX9TextureFunctions(), samplers);
    if (state.HasErrors())
    {
        return;
    }
    while (true)
    {
        PatchFunctionHeaders(state.GetTree(), samplers, functions);
        if (state.HasErrors() || functions.size === 0)
        {
            break;
        }

        PatchCalls(state, state.GetTree(), samplers, functions);
        if (state.HasErrors())
        {
            break;
        }

        functions.clear();
    }
}

/**
 * Carbon's `TransferSRGBToTexturesDX11( ParserState&, ASTNode* )`, the
 * file-local overload: for each `sampler_state` that names both a `Texture`
 * and `SRGBTexture`, appends a `bool Tr2sRGB` annotation with the state's
 * value to the texture. The last of each in a list wins.
 *
 * Carbon dereferences a `Texture` state's value without checking; null there
 * is undefined, so `GetChild` throws.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parse.
 * @param {ASTNode|null} node The subtree.
 */
function TransferSRGBToTexturesDX11__Node(state, node)
{
    if (node === null)
    {
        return;
    }
    if (node.GetNodeType() === NT_SAMPLER_STATE_LIST)
    {
        let texture = null;
        let isSRGB = null;

        for (let i = 0; i < node.GetChildrenCount(); ++i)
        {
            if (node.GetChild(i) && node.GetChild(i).GetToken())
            {
                if (stricmpEqual(ToString(node.GetChild(i).GetToken().stringValue), "texture"))
                {
                    const value = node.GetChild(i).GetChild(0);
                    if (value === null)
                    {
                        throw new TypeError("TransferSRGBToTexturesDX11: the texture state has no value (Carbon dereferences null)");
                    }
                    texture = value.GetSymbol();
                }
                else if (stricmpEqual(ToString(node.GetChild(i).GetToken().stringValue), "SRGBTexture"))
                {
                    isSRGB = node.GetChild(i);
                }
            }
        }
        if (texture && isSRGB)
        {
            const sampler = new Sampler();
            sampler.srgbTexture = 0;
            ParseStateAssignment(state, isSRGB, g_samplerStates, sampler);

            const annotation = new SymbolAnnotation();
            annotation.type = OP_BOOL;
            annotation.name = InlineString.makeInlineString("Tr2sRGB");
            annotation.value.fileLocation.fileName = InlineString.makeInlineString("");
            annotation.value.fileLocation.lineNumber = 0;
            annotation.value.intValue = sampler.srgbTexture ? 1 : 0;
            annotation.value.type = OP_BOOL_CONST;
            annotation.value.stringValue = InlineString.makeInlineString(sampler.srgbTexture ? "true" : "false");

            if (texture.annotations === null)
            {
                texture.annotations = [];
            }
            texture.annotations.push(annotation);
        }
    }
    for (let i = 0; i < node.GetChildrenCount(); ++i)
    {
        TransferSRGBToTexturesDX11__Node(state, node.GetChild(i));
    }
}

/**
 * Carbon's `TransferSRGBToTexturesDX11( ParserState& )`: moves each
 * sampler's `SRGBTexture` state onto its texture as a `Tr2sRGB` annotation.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parsed shader.
 */
export function TransferSRGBToTexturesDX11(state)
{
    TransferSRGBToTexturesDX11__Node(state, state.GetTree());
}

/**
 * Carbon's `SplitCoordVec`: for a texture array, splits the coordinate
 * argument into its leading components and, as the next argument, its last
 * component cast to `uint`, the array index Metal takes separately. Other
 * texture types are left alone.
 *
 * Carbon reads the coordinate's width from its node type; the swizzle nodes
 * it builds carry no type.
 *
 * @param {ASTNode} call The method call.
 * @param {Type} textureType The texture's type.
 * @param {number} [coordOffset=1] The coordinate's argument index.
 */
export function SplitCoordVec(call, textureType, coordOffset = 1)
{
    switch (textureType.builtInType)
    {
        case OP_TEXTURE1DARRAY:
        case OP_TEXTURE2DARRAY:
        case OP_TEXTURE3DARRAY:
        case OP_TEXTURECUBEARRAY: {
            const coord = call.GetChild(coordOffset);
            let swizzle = ScannerToken.id(InlineString.makeInlineString__StartEnd(XYZW, 0, coord.GetType().width - 1));
            let dot = new ASTNode(NT_POSTFIX_EXPRESSION, coord.GetLocation(), coord.GetScope(), swizzle);
            dot.AddChild(coord.Copy());
            call.ReplaceChild(coordOffset, dot);

            swizzle = ScannerToken.id(InlineString.makeInlineString__StartEnd(XYZW, coord.GetType().width - 1, coord.GetType().width));
            dot = new ASTNode(NT_POSTFIX_EXPRESSION, coord.GetLocation(), coord.GetScope(), swizzle);
            dot.AddChild(coord.Copy());

            const typeToken = ScannerToken.fromTokenType(OP_UINT);
            typeToken.intValue = 1;
            const cast = new ASTNode(NT_CAST_EXPRESSION, coord.GetLocation(), coord.GetScope(), typeToken);
            cast.SetType(Type.typeFromTokenType(OP_UINT));
            cast.AddChild(dot);

            call.InsertChild(coordOffset + 1, cast);
            break;
        }
        default:
            break;
    }
}

/**
 * Carbon's `PatchMetalBufferCalls`: rewrites `buffer.Load( index )` as
 * `buffer[index]`, and reports the forms Metal lacks: `Load` with a status
 * argument and `GetDimensions` on a buffer.
 *
 * Carbon reads `Load`'s first argument without checking; past the end that
 * is undefined, so `GetChild` throws.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state Reports errors.
 * @param {ASTNode|null} node The subtree.
 */
export function PatchMetalBufferCalls(state, node)
{
    if (!node)
    {
        return;
    }
    if (node.GetNodeType() === NT_POSTFIX_EXPRESSION &&
        node.GetToken() &&
        node.GetToken().type === OP_DOT &&
        node.GetChildrenCount() === 2 &&
        node.GetChild(0).GetType().IsBuffer() &&
        node.GetChild(1).GetNodeType() === NT_FUNCTION_CALL)
    {
        const call = node.GetChild(1);
        const functionToken = call.GetToken().Copy();
        if (functionToken.stringValue.Equals__Chars("Load"))
        {
            // b.Load(index) -> b[index]
            if (call.GetChildrenCount() === 2)
            {
                state.ShowMessage__Location(call.GetLocation(), ParserState.ErrorCode.EC_CUSTOM_ERROR, "Metal does not support Load with status argument");
            }
            else
            {
                const token = node.GetToken().Copy();
                token.type = OP_LEFT_BRACKET;
                node.SetToken(token);
                node.AddChild(call.GetChild(0));
                node.RemoveChild(1);
            }
        }
        else if (functionToken.stringValue.Equals__Chars("GetDimensions"))
        {
            state.ShowMessage__Location(call.GetLocation(), ParserState.ErrorCode.EC_CUSTOM_ERROR, "Metal does not support GetDimensions method for buffers");
        }
    }
    for (let i = 0; i < node.GetChildrenCount(); ++i)
    {
        PatchMetalBufferCalls(state, node.GetChild(i));
    }
}

/**
 * Whether a texture type is one of the read-write textures whose symbol
 * `PatchMetalTextureCall` and `PatchMetalTextureCalls` mark for read access;
 * the six-way test Carbon repeats at both sites.
 *
 * @param {number} builtInType A type token.
 * @returns {boolean} Whether it is `RWTexture1D` to `RWTexture3DArray`.
 */
function isRWTexture(builtInType)
{
    return builtInType === OP_RWTEXTURE1D ||
        builtInType === OP_RWTEXTURE1DARRAY ||
        builtInType === OP_RWTEXTURE2D ||
        builtInType === OP_RWTEXTURE2DARRAY ||
        builtInType === OP_RWTEXTURE3D ||
        builtInType === OP_RWTEXTURE3DARRAY;
}

/**
 * Carbon's `PatchMetalTextureCall`: rewrites one `texture.Method( ... )` as
 * Metal's.
 *
 * - `Sample`, `SampleBias`, `SampleGrad`, `SampleLevel` become `sample`, the
 *   bias, gradients and level wrapped in Metal's option calls (`bias(...)`,
 *   `gradient2d(...)`, `gradient3d(...)`, `gradientcube(...)`, `level(...)`);
 * - `GatherRed`, `GatherGreen`, `GatherBlue` become `gather`, the last two
 *   with `component::y` or `component::z` appended;
 * - `Load` becomes `read`, the coordinate cast to `uint` and, except for
 *   multisampled textures, split into the position and the mip level;
 * - `SampleCmp` and `SampleCmpLevelZero` become `sample_compare`, the latter
 *   with `level(0)`;
 * - `GetDimensions` becomes a free call taking the texture first, which
 *   replaces `node`.
 *
 * Texture arrays then have the array index split from the coordinate
 * ({@link SplitCoordVec}). Any other method is left alone. A result Metal
 * returns as four components, from a texture whose element type is narrower,
 * is swizzled back down (not for depth textures or gathers).
 *
 * Carbon reads the arguments by index without checking; past the end that is
 * undefined, so `GetChild` throws, as does inserting `SampleCmpLevelZero`'s
 * level past the end of the arguments.
 *
 * @param {ASTNode} node The `texture.Method( ... )` postfix node.
 * @returns {ASTNode} The node replacing `node`: itself, its swizzle, or the free `GetDimensions` call.
 */
export function PatchMetalTextureCall(node)
{
    const textureType = node.GetChild(0).GetType().Copy();
    const call = node.GetChild(1);

    /**
     * Carbon's `WrapInOption` lambda: moves the arguments at `childIndexes`
     * into a call of `option` that takes the first one's place.
     *
     * @param {number[]} childIndexes Argument indexes, ascending.
     * @param {string} option The Metal option function's name.
     */
    const WrapInOption = (childIndexes, option) =>
    {
        const token = ScannerToken.id(InlineString.makeInlineString(option));
        token.fileLocation = call.GetLocation().Copy();
        const options = new ASTNode(NT_FUNCTION_CALL, call.GetLocation(), call.GetScope(), token);
        options.SetSymbol(null);
        for (const child of childIndexes)
        {
            options.AddChild(call.GetChild(child));
        }
        call.ReplaceChild(childIndexes[0], options);
        for (let i = childIndexes.length - 1; i > 0; --i)
        {
            call.RemoveChild(childIndexes[i]);
        }
    };

    let isGatherCall = false;

    const functionToken = call.GetToken().Copy();
    if (functionToken.stringValue.Equals__Chars("Sample"))
    {
        // t.Sample(sampler, coord [,offset]) -> t.sample(sampler, coord, [offset])
        functionToken.stringValue = InlineString.makeInlineString("sample");
        // texture arrays: t.Sample(sampler, coord [,offset]) -> t.sample(sampler, coord., coord., [offset])
        SplitCoordVec(call, textureType);
    }
    else if (functionToken.stringValue.Equals__Chars("SampleBias"))
    {
        // t.SampleBias(sampler, coord, bias) -> t.sample(sampler, coord, bias(bias))
        // TODO: support offset?
        functionToken.stringValue = InlineString.makeInlineString("sample");
        WrapInOption([2], "bias");
        SplitCoordVec(call, textureType);
    }
    else if (functionToken.stringValue.Equals__Chars("SampleGrad"))
    {
        // t.SampleGrad(sampler, coord, dx, dy) -> t.sample(sampler, coord, gradient#(dx, dy))
        // TODO: support offset?
        functionToken.stringValue = InlineString.makeInlineString("sample");
        switch (textureType.builtInType)
        {
            case OP_TEXTURE3D:
                WrapInOption([2, 3], "gradient3d");
                break;
            case OP_TEXTURECUBE:
                WrapInOption([2, 3], "gradientcube");
                break;
            default:
                WrapInOption([2, 3], "gradient2d");
        }
        SplitCoordVec(call, textureType);
    }
    else if (functionToken.stringValue.Equals__Chars("SampleLevel"))
    {
        // t.SampleLevel(sampler, coord, lod) -> t.sample(sampler, coord, level(lod))
        // TODO: support offset?
        functionToken.stringValue = InlineString.makeInlineString("sample");
        WrapInOption([2], "level");
        SplitCoordVec(call, textureType);
    }
    else if (functionToken.stringValue.Equals__Chars("GatherRed"))
    {
        isGatherCall = true;
        functionToken.stringValue = InlineString.makeInlineString("gather");

        // Add x component enumeration to the function
        //auto x = ScannerToken::FromTokenType(OP_INT_CONST, call->GetLocation());
        //x.stringValue = MakeInlineString("component::x");
        //ASTNode* component = new ASTNode(NT_CONSTANT, call->GetLocation(), call->GetScope(), &x);
        //call->AddChild(component);

        SplitCoordVec(call, textureType);
    }
    else if (functionToken.stringValue.Equals__Chars("GatherGreen"))
    {
        isGatherCall = true;
        functionToken.stringValue = InlineString.makeInlineString("gather");

        // Add y component enumeration to the function
        const y = ScannerToken.fromTokenType(OP_INT_CONST, call.GetLocation());
        y.stringValue = InlineString.makeInlineString("component::y");
        const component = new ASTNode(NT_CONSTANT, call.GetLocation(), call.GetScope(), y);
        call.AddChild(component);

        SplitCoordVec(call, textureType);
    }
    else if (functionToken.stringValue.Equals__Chars("GatherBlue"))
    {
        isGatherCall = true;
        functionToken.stringValue = InlineString.makeInlineString("gather");

        // Add z component enumeration to the function
        const z = ScannerToken.fromTokenType(OP_INT_CONST, call.GetLocation());
        z.stringValue = InlineString.makeInlineString("component::z");
        const component = new ASTNode(NT_CONSTANT, call.GetLocation(), call.GetScope(), z);
        call.AddChild(component);

        SplitCoordVec(call, textureType);
    }
    else if (functionToken.stringValue.Equals__Chars("Load"))
    {
        // normal textures: t.Load(coord) -> t.read(coord.xy, coord.z)
        // MS textures: t.Load(coord, sample) -> t.read(coord, sample)
        // TODO: support offset?
        functionToken.stringValue = InlineString.makeInlineString("read");
        const coord = call.GetChild(0);

        if (node.GetChild(0).GetSymbol() && isRWTexture(textureType.builtInType))
        {
            node.GetChild(0).GetSymbol().type.metalTextureAccess = 1;
        }
        if (textureType.builtInType !== OP_TEXTURE2DMS && textureType.builtInType !== OP_TEXTURE2DMSARRAY)
        {
            let swizzle = ScannerToken.id(InlineString.makeInlineString__StartEnd(XYZW, 0, coord.GetType().width - 1));
            let dot = new ASTNode(NT_POSTFIX_EXPRESSION, coord.GetLocation(), coord.GetScope(), swizzle);
            const t = coord.GetType().Copy();
            --t.width;
            dot.SetType(t);
            dot.AddChild(coord.Copy());
            if (coord.GetType().builtInType !== OP_UINT)
            {
                const typeToken = ScannerToken.fromTokenType(OP_FLOAT);
                typeToken.intValue = 4;
                const cast = new ASTNode(NT_CAST_EXPRESSION, coord.GetLocation(), coord.GetScope(), typeToken);
                const castType = coord.GetType().Copy();
                castType.width -= 1;
                castType.builtInType = OP_UINT;
                cast.SetType(castType);
                cast.AddChild(dot);
                dot = cast;
            }
            call.ReplaceChild(0, dot);

            swizzle = ScannerToken.id(InlineString.makeInlineString__StartEnd(XYZW, coord.GetType().width - 1, coord.GetType().width));
            dot = new ASTNode(NT_POSTFIX_EXPRESSION, coord.GetLocation(), coord.GetScope(), swizzle);
            dot.AddChild(coord.Copy());
            call.InsertChild(1, dot);
        }
        else if (coord.GetType().builtInType !== OP_UINT)
        {
            const typeToken = ScannerToken.fromTokenType(OP_FLOAT);
            typeToken.intValue = 4;
            const cast = new ASTNode(NT_CAST_EXPRESSION, coord.GetLocation(), coord.GetScope(), typeToken);
            const castType = coord.GetType().Copy();
            castType.builtInType = OP_UINT;
            cast.SetType(castType);
            cast.AddChild(coord);
            call.ReplaceChild(0, cast);
        }
        SplitCoordVec(call, textureType, 0);
    }
    else if (functionToken.stringValue.Equals__Chars("SampleCmp"))
    {
        // t.SampleCmp(sampler, coord, cmp [,offset]) -> t.sample_compare(sampler, coord, cmp, [offset])
        functionToken.stringValue = InlineString.makeInlineString("sample_compare");
        // texture arrays: t.SampleCmp(sampler, coord, cmp [,offset]) -> t.sample_compare(sampler, coord., coord., [offset])
        SplitCoordVec(call, textureType);
    }
    else if (functionToken.stringValue.Equals__Chars("SampleCmpLevelZero"))
    {
        // t.SampleCmpLevelZero(sampler, coord, cmp [,offset]) -> t.sample_compare(sampler, coord, level(0), [offset])
        functionToken.stringValue = InlineString.makeInlineString("sample_compare");
        // texture arrays: t.SampleCmpLevelZero(sampler, coord, cmp [,offset]) -> t.sample_compare(sampler, coord., coord., level(0), [offset])
        const zero = ScannerToken.fromTokenType(OP_INT_CONST, call.GetLocation());
        zero.stringValue = InlineString.makeInlineString("0");
        if (call.GetChildrenCount() < 3)
        {
            // `std::vector::insert` past the end is undefined.
            throw new RangeError(`PatchMetalTextureCall: SampleCmpLevelZero with ${call.GetChildrenCount()} arguments inserts past the end (Carbon's behaviour is undefined)`);
        }
        call.InsertChild(3, new ASTNode(NT_CONSTANT, call.GetLocation(), call.GetScope(), zero));
        WrapInOption([3], "level");
        SplitCoordVec(call, textureType);
    }
    else if (functionToken.stringValue.Equals__Chars("GetDimensions"))
    {
        // replace tex.GetDimensions(...) with GetDemensions(tex, ...)
        call.InsertChild(0, node.GetChild(0));
        return call;
    }
    else
    {
        return node;
    }

    call.SetToken(functionToken);

    if (!textureType.isDepthTexture && !isGatherCall && textureType.templateParameter && textureType.templateParameter.width !== 4)
    {
        const swizzle = ScannerToken.id(InlineString.makeInlineString__StartEnd(XYZW, 0, textureType.templateParameter.width));
        const dot = new ASTNode(NT_POSTFIX_EXPRESSION, call.GetLocation(), call.GetScope(), swizzle);
        dot.AddChild(node);

        const callType = textureType.templateParameter.Copy();
        callType.width = 4;
        node.SetType(callType);

        dot.SetType(textureType.templateParameter);

        return dot;
    }
    return node;
}

/**
 * Carbon's `IsTextureIndexing`: whether a node is `texture[x]` on a single
 * texture (not an array of textures).
 *
 * @param {ASTNode} node The node.
 * @returns {boolean} Whether it indexes a texture.
 */
function IsTextureIndexing(node)
{
    return node.GetNodeType() === NT_POSTFIX_EXPRESSION &&
        node.GetToken() !== null &&
        node.GetToken().type === OP_LEFT_BRACKET &&
        node.GetChild(0).GetType().IsTexture() &&
        node.GetChild(0).GetType().arrayDimensions === 0;
}

/**
 * Carbon's `PatchMetalTextureCalls`: rewrites a subtree's texture methods
 * ({@link PatchMetalTextureCall}), texture reads `t[x]` as `t.read( x )` and
 * texture writes `t[x] = y` as `t.write( y, x )`, the value widened to four
 * components and the coordinate cast to `uint`, with texture arrays' array
 * index split off. Indexing a texture on the left of any other assignment is
 * an error.
 *
 * Bug (TextureFunctionConversionDX11.cpp:1116; Carbon known defect CE-99): a
 * read of a `Texture1DArray`, `Texture2DArray` or `Texture3DArray` has its
 * array index split off twice, by the `SplitIndex` lambda and again by
 * `SplitCoordVec`, so `t[int3( x, y, i )]` on a `Texture2DArray` reads with
 * position `x`, array `y` and level `i`.
 *
 * Quirk (TextureFunctionConversionDX11.cpp:1247; Carbon known defect CE-103):
 * the whole left operand of an assignment counts as written, so a texture
 * read inside it, such as an index (`a[t[p]] = v`), is reported as
 * "cannot rewite texture assignment for Metal".
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state Reports errors; builds the array-index swizzles.
 * @param {ASTNode|null} node The subtree.
 * @param {boolean} [rightHandSide=true] False inside the left operand of an assignment.
 * @returns {ASTNode|null} The node replacing `node`.
 */
export function PatchMetalTextureCalls(state, node, rightHandSide = true)
{
    if (!node)
    {
        return node;
    }
    if (node.GetNodeType() === NT_POSTFIX_EXPRESSION &&
        node.GetToken() &&
        node.GetToken().type === OP_DOT &&
        node.GetChildrenCount() === 2 &&
        node.GetChild(0).GetType().IsTexture() &&
        node.GetChild(1).GetNodeType() === NT_FUNCTION_CALL)
    {
        node = PatchMetalTextureCall(node);
    }
    else if (IsTextureIndexing(node))
    {
        if (rightHandSide)
        {
            if (node.GetChild(0).GetSymbol() && isRWTexture(node.GetChild(0).GetType().builtInType))
            {
                node.GetChild(0).GetSymbol().type.metalTextureAccess = 1;
            }

            // t[x] -> t.read(x)
            const functionToken = ScannerToken.id(InlineString.makeInlineString("read"), node.GetLocation());
            const call = new ASTNode(NT_FUNCTION_CALL, node.GetLocation(), node.GetScope(), functionToken);
            const nodeToken = node.GetToken().Copy();
            nodeToken.type = OP_DOT;
            node.SetToken(nodeToken);
            call.AddChild(node.GetChild(1));
            node.ReplaceChild(1, call);

            const coord = call.GetChild(0);
            if (coord.GetType().builtInType !== OP_UINT)
            {
                const typeToken = ScannerToken.fromTokenType(OP_FLOAT);
                typeToken.intValue = 4;
                const cast = new ASTNode(NT_CAST_EXPRESSION, coord.GetLocation(), coord.GetScope(), typeToken);
                const castType = coord.GetType().Copy();
                castType.builtInType = OP_UINT;
                cast.SetType(castType);
                cast.AddChild(coord);
                call.ReplaceChild(0, cast);
            }

            const textureType = node.GetChild(0).GetType().Copy();
            // For indexing texture arrays we need to separate the array index from the coordinate
            /**
             * Carbon's `SplitIndex` lambda: splits the coordinate argument into
             * its first `dimension` components and, as the next argument, the
             * array index after them.
             *
             * @param {number} dimension The texture's dimension.
             */
            const SplitIndex = dimension =>
            {
                const arg = call.GetChild(0);

                let dot = NewDot__InlineString(state, arg, InlineString.makeInlineString__StartEnd(XYZW, 0, dimension));
                call.ReplaceChild(0, dot);

                dot = NewDot__InlineString(state, arg.Copy(), InlineString.makeInlineString__StartEnd(XYZW, dimension, dimension + 1));
                call.InsertChild(1, dot);
            };
            switch (textureType.builtInType)
            {
                case OP_TEXTURE1DARRAY:
                case OP_RWTEXTURE1DARRAY:
                    SplitIndex(1);
                    break;
                case OP_TEXTURE2DARRAY:
                case OP_RWTEXTURE2DARRAY:
                    SplitIndex(2);
                    break;
                case OP_TEXTURE3DARRAY:
                case OP_RWTEXTURE3DARRAY:
                    SplitIndex(3);
                    break;
                default:
                    break;
            }
            // MLS tex.read is always a 4 component vector. If the original texture is not a 4 component vector, we need to swizzle the result
            if (!textureType.isDepthTexture && textureType.templateParameter && textureType.templateParameter.width !== 4)
            {
                const swizzle = ScannerToken.id(InlineString.makeInlineString__StartEnd(XYZW, 0, textureType.templateParameter.width));
                const dot = new ASTNode(NT_POSTFIX_EXPRESSION, call.GetLocation(), call.GetScope(), swizzle);
                dot.AddChild(node);

                const callType = textureType.templateParameter.Copy();
                callType.width = 4;
                node.SetType(callType);

                dot.SetType(textureType.templateParameter);

                node = dot;
            }
            // Bug (TextureFunctionConversionDX11.cpp:1116; Carbon known defect CE-99):
            // a non-RW texture array, already split by SplitIndex, is split again.
            SplitCoordVec(call, textureType, 0);
        }
        else
        {
            state.ShowMessage__Location(node.GetLocation(), ParserState.ErrorCode.EC_CUSTOM_ERROR, "cannot rewite texture assignment for Metal");
        }
    }
    let isAssignment = false;
    if (node.GetNodeType() === NT_EXPRESSION)
    {
        switch (node.GetToken().type)
        {
            case OP_EQUAL:
                if (IsTextureIndexing(node.GetChild(0)))
                {
                    // t[x] = y; -> t.write(y, x);
                    const functionToken = ScannerToken.id(InlineString.makeInlineString("write"), node.GetLocation());
                    const call = new ASTNode(NT_FUNCTION_CALL, node.GetLocation(), node.GetScope(), functionToken);
                    const nodeToken = node.GetToken().Copy();
                    nodeToken.type = OP_DOT;
                    node.GetChild(0).SetToken(nodeToken);

                    let value = node.GetChild(1);
                    if (value.GetType().width !== 4)
                    {
                        const ctrToken = ScannerToken.fromTokenType(value.GetType().builtInType);
                        ctrToken.intValue = (1 << 8) | 4;
                        const ctr = new ASTNode(NT_FUNCTION_CALL, node.GetLocation(), node.GetScope(), ctrToken);
                        const type = value.GetType().Copy();
                        type.width = 4;
                        ctr.SetType(type);
                        ctr.AddChild(value);

                        for (let i = value.GetType().width; i < 4; i++)
                        {
                            const zero = ScannerToken.fromTokenType(OP_INT_CONST, value.GetLocation());
                            zero.stringValue = InlineString.makeInlineString("0");
                            ctr.AddChild(new ASTNode(NT_CONSTANT, value.GetLocation(), value.GetScope(), zero));
                        }
                        value = ctr;
                    }
                    call.AddChild(value);
                    if (node.GetChild(0).GetChild(0).GetType().IsTextureArray())
                    {
                        const coord = node.GetChild(0).GetChild(1);

                        let swizzle = ScannerToken.id(InlineString.makeInlineString__StartEnd(XYZW, 0, coord.GetType().width - 1));
                        let dot = new ASTNode(NT_POSTFIX_EXPRESSION, coord.GetLocation(), coord.GetScope(), swizzle);
                        dot.AddChild(coord.Copy());

                        if (coord.GetType().builtInType !== OP_UINT)
                        {
                            const typeToken = ScannerToken.fromTokenType(OP_FLOAT);
                            typeToken.intValue = 4;
                            const cast = new ASTNode(NT_CAST_EXPRESSION, coord.GetLocation(), coord.GetScope(), typeToken);
                            const castType = coord.GetType().Copy();
                            castType.width -= 1;
                            castType.builtInType = OP_UINT;
                            cast.SetType(castType);
                            cast.AddChild(dot);
                            dot = cast;
                        }

                        call.AddChild(dot);

                        swizzle = ScannerToken.id(InlineString.makeInlineString__StartEnd(XYZW, coord.GetType().width - 1, coord.GetType().width));
                        dot = new ASTNode(NT_POSTFIX_EXPRESSION, coord.GetLocation(), coord.GetScope(), swizzle);
                        dot.AddChild(coord.Copy());

                        if (coord.GetType().builtInType !== OP_UINT)
                        {
                            const typeToken = ScannerToken.fromTokenType(OP_FLOAT);
                            typeToken.intValue = 4;
                            const cast = new ASTNode(NT_CAST_EXPRESSION, coord.GetLocation(), coord.GetScope(), typeToken);
                            const castType = coord.GetType().Copy();
                            castType.width = 1;
                            castType.builtInType = OP_UINT;
                            cast.SetType(castType);
                            cast.AddChild(dot);
                            dot = cast;
                        }
                        call.AddChild(dot);
                    }
                    else
                    {
                        const coord = node.GetChild(0).GetChild(1);
                        if (coord.GetType().builtInType !== OP_UINT)
                        {
                            const typeToken = ScannerToken.fromTokenType(OP_FLOAT);
                            typeToken.intValue = 4;
                            const cast = new ASTNode(NT_CAST_EXPRESSION, coord.GetLocation(), coord.GetScope(), typeToken);
                            const castType = coord.GetType().Copy();
                            castType.builtInType = OP_UINT;
                            cast.SetType(castType);
                            cast.AddChild(coord);
                            call.AddChild(cast);
                        }
                        else
                        {
                            call.AddChild(coord);
                        }
                    }
                    node.GetChild(0).ReplaceChild(1, call);
                    node = node.GetChild(0);
                }
                else
                {
                    isAssignment = true;
                }
                break;
            case OP_MUL_ASSIGN:
            case OP_DIV_ASSIGN:
            case OP_MOD_ASSIGN:
            case OP_ADD_ASSIGN:
            case OP_SUB_ASSIGN:
            case OP_LEFT_ASSIGN:
            case OP_RIGHT_ASSIGN:
            case OP_AND_ASSIGN:
            case OP_XOR_ASSIGN:
            case OP_OR_ASSIGN:
                isAssignment = true;
                break;
            default:
                break;
        }
    }

    // Quirk (TextureFunctionConversionDX11.cpp:1247; Carbon known defect CE-103):
    // the whole left operand, index expressions included, counts as written.
    for (let i = 0; i < node.GetChildrenCount(); ++i)
    {
        node.ReplaceChild(i, PatchMetalTextureCalls(state, node.GetChild(i), isAssignment && i === 0 ? false : rightHandSide));
    }
    return node;
}

/**
 * Carbon's `ConvertTextureFunctionsToMetal`: the DX11 conversion, then the
 * Metal rewrites of texture methods and indexing, then of buffer loads.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parsed shader; its tree is rewritten.
 */
export function ConvertTextureFunctionsToMetal(state)
{
    ConvertTextureFunctionsDX11(state);
    PatchMetalTextureCalls(state, state.GetTree());
    PatchMetalBufferCalls(state, state.GetTree());
}

/**
 * Carbon's `MergeSamplers`: among the program's top-level sampler
 * declarations with static state, every reference to a sampler whose state
 * equals an earlier one's (by `Sampler::operator<`, so name, `filter` and
 * `srgbTexture` are ignored) is pointed at the earlier sampler. The later
 * declarations stay.
 *
 * Carbon keys the samplers by `std::map<Sampler, Symbol*>`; only `find` and
 * insertion are used, so a list searched by the same ordering's equivalence
 * is the same.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state The parsed shader; its tree is rewritten.
 */
export function MergeSamplers(state)
{
    /** @type {Array<[Sampler, import("../SymbolTable/Symbol.js").Symbol]>} */
    const samplers = [];

    for (const child of state.GetTree().GetChildren())
    {
        if (child.GetNodeType() === NT_VAR_DECLARATION_LIST)
        {
            for (const name of child.GetChildren())
            {
                if (name && name.GetSymbol() && name.GetSymbol().type.IsSampler())
                {
                    const sampler = new Sampler();
                    if (GetSamplerState(state, name, sampler) && !sampler.isDynamic)
                    {
                        const found = samplers.find(([key]) => !key.Less(sampler) && !sampler.Less(key));
                        if (found !== undefined)
                        {
                            state.GetTree().Map(node =>
                            {
                                if (node.GetNodeType() !== NT_NAME_DECLARATION && node.GetSymbol() === name.GetSymbol())
                                {
                                    node.SetSymbol(found[1]);
                                }
                                return node;
                            });
                        }
                        else
                        {
                            samplers.push([sampler, name.GetSymbol()]);
                        }
                    }
                }
            }
        }
    }
}

/**
 * Carbon's `BindlessTextureType`: the `EffectData` texture type of a bindless
 * texture handle type.
 *
 * @param {number} type A type token.
 * @returns {number} `TEX_TYPE_2D`, `TEX_TYPE_3D`, `TEX_TYPE_CUBE`, or `TEX_TYPE_INVALID` for any other.
 */
export function BindlessTextureType(type)
{
    switch (type)
    {
        case OP_BINDLESSHANDLETEXTURE2D:
            return Texture.TextureType.TEX_TYPE_2D;
        case OP_BINDLESSHANDLETEXTURE3D:
            return Texture.TextureType.TEX_TYPE_3D;
        case OP_BINDLESSHANDLETEXTURECUBE:
            return Texture.TextureType.TEX_TYPE_CUBE;
        default:
            return Texture.TextureType.TEX_TYPE_INVALID;
    }
}
