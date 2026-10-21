import { CjsSchema } from "#schema/CjsSchema";

// Source: trinity/shadercompiler/HLSLParser.y
//
// Carbon's HLSL/FX grammar, rule for rule and in order, with lemon's tables
// built by CjsFxLemon. Each rule's text is lemon's, so this file can be read
// against the .y; each action is the C++ action. `ps` is lemon's extra
// argument, the ParserState.
//
// Carbon's values are copied on assignment (`Type`, `ScannerToken`, ...).
// Actions receive their own copies (the driver copies every token it shifts),
// so they may change them; storing one in a node or symbol copies it again.

import { CjsFxLemon } from "./lemon/CjsFxLemon.js";
import { HLSLParserTokens } from "./hlslParserTokens.js";
import { ASTNode } from "./ASTNode/ASTNode.js";
import { InlineString } from "./InlineString.js";
import { Type } from "./Type.js";
import { ScannerToken } from "./ParserState/ScannerToken.js";
import { FileLocation } from "./ParserState/FileLocation.js";
import { Symbol } from "./SymbolTable/Symbol.js";
import { PackOffset } from "./SymbolTable/PackOffset.js";
import { RegisterSpecifier } from "./SymbolTable/RegisterSpecifier.js";
import { SymbolAnnotation } from "./SymbolTable/SymbolAnnotation.js";
import { ComputeMemberType, ParseRegisterID, ParseNumber } from "./ParserUtils/parserUtils.js";
import { EvaluateIntegerExpression } from "./FXAnalyzer/index.js";
import { ParserState } from "./ParserState/ParserState.js";
import { SymbolTable } from "./SymbolTable/SymbolTable.js";

const T = HLSLParserTokens;
const N = ASTNode.ASTNodeType;
const { ALLOW_OVERRIDES } = SymbolTable.OverrideBehavior;

/**
 * Carbon's `new ASTNode( type, location, parserState->GetSymbolTable().GetCurrentScope(), token )`.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} ps The parse.
 * @param {number} type An `ASTNodeType` value.
 * @param {FileLocation} location Where.
 * @param {ScannerToken|null} [token=null] The node's token.
 * @returns {ASTNode} The node.
 */
function node(ps, type, location, token = null)
{
    return new ASTNode(type, location, ps.GetSymbolTable().GetCurrentScope(), token);
}

/**
 * A `Type` from a token type, as `Type type; type.FromTokenType( t );`.
 *
 * @param {number} tokenType The type token.
 * @returns {Type} The type.
 */
function typeOf(tokenType)
{
    const type = new Type();
    type.FromTokenType(tokenType);
    return type;
}

/**
 * The binary operators that only type-check (`*`, `/`, `%`, `+`, `-`).
 *
 * @returns {Function} The action.
 */
function arithmetic()
{
    return ({ B, C, D }, ps) =>
    {
        const A = node(ps, N.NT_EXPRESSION, C.fileLocation, C);
        A.AddChild(B);
        A.AddChild(D);
        const type = new Type();
        if (!Type.getCommonType(B.GetType(), D.GetType(), type))
        {
            ps.ShowMessage__Token(C, ParserState.ErrorCode.EC_TYPE_MISMATCH);
            type.FromTokenType(T.OP_VOID);
        }
        A.SetType(type);
        return A;
    };
}

/**
 * The integer operators (`<<`, `>>`, `&`, `^`, `|`): in HLSL mode the common
 * type must be int or uint.
 *
 * @returns {Function} The action.
 */
function integerOperator()
{
    return ({ B, C, D }, ps) =>
    {
        const A = node(ps, N.NT_EXPRESSION, C.fileLocation, C);
        A.AddChild(B);
        A.AddChild(D);
        const type = new Type();
        if (!Type.getCommonType(B.GetType(), D.GetType(), type))
        {
            ps.ShowMessage__Token(C, ParserState.ErrorCode.EC_TYPE_MISMATCH);
            type.FromTokenType(T.OP_VOID);
        }
        else if (ps.mode === ps.constructor.Mode.HLSL && (type.symbol || (type.builtInType !== T.OP_INT && type.builtInType !== T.OP_UINT)))
        {
            ps.ShowMessage__Token(C, ParserState.ErrorCode.EC_INT_TYPE_REQUIRED);
        }
        A.SetType(type);
        return A;
    };
}

/**
 * The comparison and logical operators: scalar or vector operands, bool result.
 *
 * @returns {Function} The action.
 */
function booleanOperator()
{
    return ({ B, C, D }, ps) =>
    {
        const A = node(ps, N.NT_EXPRESSION, C.fileLocation, C);
        A.AddChild(B);
        A.AddChild(D);
        const type = new Type();
        if (!Type.getCommonType(B.GetType(), D.GetType(), type))
        {
            ps.ShowMessage__Token(C, ParserState.ErrorCode.EC_TYPE_MISMATCH);
            type.FromTokenType(T.OP_VOID);
        }
        else if (!type.IsScalarOrVector())
        {
            ps.ShowMessage__Token(C, ParserState.ErrorCode.EC_SCALAR_VECTOR_TYPE_REQUIRED);
        }
        type.builtInType = T.OP_BOOL;
        A.SetType(type);
        return A;
    };
}

/**
 * The unary prefix operators: the operand's type.
 *
 * @returns {Function} The action.
 */
function prefixOperator()
{
    return ({ B, C }, ps) =>
    {
        const A = node(ps, N.NT_PREFIX_EXPRESSION, B.fileLocation, B);
        A.AddChild(C);
        A.SetType(C.GetType());
        return A;
    };
}

/**
 * Carbon's `function_prototype` actions: finds or declares the function.
 *
 * @param {ASTNode} B The function header.
 * @param {import("./ParserState/ParserState.js").ParserState} ps The parse.
 * @returns {ASTNode} The header, with its symbol.
 */
function functionPrototype(B, ps)
{
    let symbol = ps.GetSymbolTable().LookupFunctionDeclaration(B.GetToken().stringValue, B);
    if (!symbol)
    {
        symbol = ps.GetSymbolTable().AddSymbol(B.GetToken().stringValue, ALLOW_OVERRIDES);
    }
    if (!symbol)
    {
        ps.ShowMessage__Location(B.GetToken().fileLocation, ParserState.ErrorCode.EC_IDENTIFIER_REDEFINITION, B.GetToken().stringValue.ToString());
    }
    symbol.isFunction = true;
    symbol.type = B.GetType().Copy();
    B.SetSymbol(symbol);
    symbol.definition = B;
    return B;
}

/**
 * Carbon's `parameter_declarator` actions.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} ps The parse.
 * @param {object} parts The rule's values.
 * @param {Type} parts.type The parameter type.
 * @param {ScannerToken} parts.name The name token.
 * @param {ScannerToken|null} parts.token The node's token (Carbon passes the name for one rule only).
 * @param {ASTNode|null} parts.brackets The bracket list, if any.
 * @param {InlineString|null} parts.semantic The semantic, if any.
 * @param {number} parts.interpolation The interpolation modifier.
 * @returns {ASTNode} The `NT_FUNCTION_PARAMETER` node.
 */
function parameterDeclarator(ps, { type, name, token, brackets, semantic, interpolation })
{
    const A = node(ps, N.NT_FUNCTION_PARAMETER, name.fileLocation, token);
    applyArraySizes(ps, type, brackets);
    const symbol = ps.GetSymbolTable().AddSymbol(name.stringValue);
    if (!symbol)
    {
        ps.ShowMessage__Token(name, ParserState.ErrorCode.EC_PARAMETER_REDEFINITION, name.stringValue.ToString());
    }
    else
    {
        if (semantic)
        {
            symbol.semantic = semantic.Copy();
        }
        symbol.interpolationModifier = interpolation;
        symbol.type = type.Copy();
        symbol.definition = A;
    }
    A.SetType(type);
    A.SetSymbol(symbol);
    A.AddChild(brackets);
    return A;
}

/**
 * Carbon's `parameter_declaration` actions.
 *
 * @param {ASTNode|null} P The primitive type, if any.
 * @param {ScannerToken} C The parameter qualifier.
 * @param {ASTNode} D The declarator.
 * @param {ASTNode|null} defaultValue The initializer, if any.
 * @returns {ASTNode} The declarator.
 */
function parameterDeclaration(P, C, D, defaultValue)
{
    D.SetToken(C);
    D.AddChild(defaultValue);
    D.AddChild(P);
    return D;
}

/**
 * Carbon's `register_specifier` setup shared by its four rules.
 *
 * @returns {RegisterSpecifier} A specifier with Carbon's initial values.
 */
function registerSpecifier()
{
    const A = new RegisterSpecifier();
    A.shaderProfile = InlineString.makeInlineString("");
    A.subComponent = -1;
    A.space = -1;
    A.explicitSpace = false;
    A.explicitRegister = true;
    return A;
}

/**
 * Carbon's `name_declaration` symbol creation, shared by its five rules.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} ps The parse.
 * @param {ScannerToken} C The name token.
 * @param {Symbol|null} B The decorations, as a partial symbol.
 * @returns {Symbol|null} The declared symbol.
 */
function declareName(ps, C, B)
{
    let symbol = null;
    if (B)
    {
        B.name = C.stringValue.Copy();
        symbol = ps.GetSymbolTable().AddSymbol__Symbol(B);
    }
    else
    {
        symbol = ps.GetSymbolTable().AddSymbol(C.stringValue);
    }
    if (!symbol)
    {
        ps.ShowMessage__Token(C, ParserState.ErrorCode.EC_IDENTIFIER_REDEFINITION, C.stringValue.ToString());
    }
    return symbol;
}

/**
 * Carbon's array-size computation: a declared name's bracket list into its
 * type, which every array-declaring rule repeats.
 *
 * Bug (Type.h:41-43; HLSLParser.y:1125-1128 and the eight other copies;
 * Carbon known defect CE-72): `Type::arraySizes` holds eight sizes and the
 * loop writes past it, over `modifier`, `storageClass` and beyond. This is
 * undefined in Carbon, so the port throws for a ninth dimension.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} ps The parse.
 * @param {Type} type Changed in place.
 * @param {ASTNode|null} brackets The bracket list.
 */
function applyArraySizes(ps, type, brackets)
{
    if (brackets)
    {
        if (brackets.GetChildrenCount() > 8)
        {
            throw new RangeError("HLSLParser: more than 8 array dimensions overflow Type::arraySizes (Carbon known defect CE-72)");
        }
        type.arrayDimensions = brackets.GetChildrenCount();
        for (let i = 0; i < type.arrayDimensions; i++)
        {
            type.arraySizes[i] = EvaluateIntegerExpression(ps, brackets.GetChild(i), 0);
        }
    }
}

/**
 * Carbon's bindless-sampler bookkeeping after a declaration.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} ps The parse.
 * @param {Type} type The declared type.
 * @param {ASTNode} C The name declaration.
 */
function recordBindlessSampler(ps, type, C)
{
    if (type.Equals(Type.typeFromTokenType(T.OP_BINDLESSHANDLESAMPLER)))
    {
        if (C.GetChildOrNull(1))
        {
            ps.AddBindlessSampler(C.GetSymbol(), C.Copy());
            C.ReplaceChild(1, null);
        }
    }
}

/**
 * Carbon's `struct_declaration` actions: types each declared member.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} ps The parse.
 * @param {Type} B The member type.
 * @param {ASTNode} C The declarator list.
 * @param {number|null} interpolation The interpolation modifier, for the rules that have one.
 * @returns {ASTNode} The list.
 */
function structDeclaration(ps, B, C, interpolation)
{
    for (let i = 0; i < C.GetChildrenCount(); ++i)
    {
        const type = B.Copy();
        applyArraySizes(ps, type, C.GetChild(i).GetChildOrNull(0));
        C.GetChild(i).SetType(type);
        const symbol = C.GetChild(i).GetSymbol();
        if (symbol)
        {
            symbol.type = type.Copy();
            if (interpolation !== null)
            {
                symbol.interpolationModifier = interpolation;
            }
        }
    }
    C.SetType(B);
    return C;
}

/**
 * Carbon's `struct_declarator` symbol creation.
 *
 * Bug (HLSLParser.y:2385-2441; Carbon known defect CE-70): after reporting a
 * member redefinition Carbon dereferences the null symbol; so does this, with
 * a TypeError.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} ps The parse.
 * @param {ScannerToken} B The member name.
 * @returns {Symbol|null} The symbol.
 */
function declareMember(ps, B)
{
    const symbol = ps.GetSymbolTable().AddSymbol(B.stringValue);
    if (!symbol)
    {
        ps.ShowMessage__Token(B, ParserState.ErrorCode.EC_IDENTIFIER_REDEFINITION, B.stringValue.ToString());
    }
    return symbol;
}

/**
 * Carbon's `function_definition` actions.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} ps The parse.
 * @param {ASTNode|null} L The attribute list, if any.
 * @param {ASTNode} B The prototype.
 * @param {Array|null|undefined} annotations The annotations (the rule's N); undefined for the rules without them.
 * @param {ASTNode} C The body.
 * @returns {ASTNode} The `NT_FUNCTION_DEFINITION` node.
 */
function functionDefinition(ps, L, B, annotations, C)
{
    const A = node(ps, N.NT_FUNCTION_DEFINITION, B.GetLocation());
    A.AddChild(B);
    A.AddChild(C);
    if (L !== undefined)
    {
        A.AddChild(L);
    }
    B.GetSymbol().definition = A;
    if (annotations !== undefined)
    {
        B.GetSymbol().annotations = annotations;
    }
    ps.GetSymbolTable().LeaveScope();
    return A;
}

/**
 * Carbon's `cbuffer_declaration` actions.
 *
 * @param {ASTNode} members The member list.
 * @param {ScannerToken} bufferType `cbuffer` or `tbuffer`.
 * @param {Symbol} symbol The buffer symbol.
 * @param {RegisterSpecifier|null} register The explicit binding, if any.
 * @param {FileLocation} location Where.
 * @returns {ASTNode} The `NT_CBUFFER` node.
 */
function cbufferDeclaration(members, bufferType, symbol, register, location)
{
    members.SetToken(bufferType);
    if (register)
    {
        symbol.registerSpecifier.set(register.shaderProfile.ToString(), register.Copy());
    }
    members.SetSymbol(symbol);
    members.SetLocation(location);
    return members;
}

/** Texture-like `type_specifier` rules: a type token with an optional `<T>`. */
const TEMPLATED_TYPES = [
    "OP_TEXTURE1D", "OP_TEXTURE1DARRAY", "OP_TEXTURE2D", "OP_TEXTURE2DARRAY"
];

const rules = [
    ["in ::= translation_unit(A).", ({ A }, ps) => { ps.SetTree(A); }],

    ["variable_identifier(A) ::= OP_ID(B).", ({ B }, ps) =>
    {
        let A;
        if (ps.mode === ps.constructor.Mode.FX)
        {
            A = node(ps, N.NT_STATE_VALUE, B.fileLocation, B);
            A.SetType(typeOf(T.OP_INT));
        }
        else
        {
            const symbol = ps.GetSymbolTable().Lookup(B.stringValue);
            if (!symbol)
            {
                ps.ShowMessage__Location(B.fileLocation, ParserState.ErrorCode.EC_UNDECLARED_IDENTIFIER, B.stringValue.ToString());
            }
            A = node(ps, N.NT_VAR_IDENTIFIER, B.fileLocation);
            A.SetSymbol(symbol);
            if (symbol)
            {
                A.SetType(symbol.type);
            }
        }
        return A;
    }],

    ["string_literal(A) ::= OP_STRING_CONST(B).", ({ B }) => B],
    ["string_literal(A) ::= string_literal(B) OP_STRING_CONST(C).", ({ B, C }) =>
    {
        // Quirk (HLSLParser.y:86-90, Carbon known defect CE-73): the range
        // runs from the first literal's start to the last one's end in the
        // buffer, text between them included. PreprocessString skips what lies
        // between the quotes; ParseString keeps it, so `"ab" /*c*/ "cd"` reads
        // as `ab" /*c*/ "cd`. With the second literal from a macro the end can
        // precede the start, undefined in Carbon; the range is then empty.
        B.stringValue.end = C.stringValue.end;
        return B;
    }],

    ["literal_constant(A) ::= OP_INT_CONST(B).", ({ B }) => B],
    ["literal_constant(A) ::= OP_FLOAT_CONST(B).", ({ B }) => B],
    ["literal_constant(A) ::= OP_BOOL_CONST(B).", ({ B }) => B],
    ["literal_constant(A) ::= string_literal(B).", ({ B }) => B],

    ["inline_constructor(A) ::= OP_LEFT_BRACE(T) inline_initializer_list(B) OP_RIGHT_BRACE.", ({ T: brace, B }) =>
    {
        B.SetToken(brace);
        return B;
    }],
    ["inline_constructor(A) ::= OP_LEFT_BRACE(T) inline_initializer_list(B) OP_COMA OP_RIGHT_BRACE.", ({ T: brace, B }) =>
    {
        B.SetToken(brace);
        return B;
    }],

    ["inline_initializer_list(A) ::= constant_expression(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_INLINE_CONSTRUCTOR, B.GetLocation());
        A.AddChild(B);
        return A;
    }],
    ["inline_initializer_list(A) ::= inline_constructor(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_INLINE_CONSTRUCTOR, B.GetLocation());
        A.AddChild(B);
        return A;
    }],
    ["inline_initializer_list(A) ::= inline_initializer_list(B) OP_COMA constant_expression(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],
    ["inline_initializer_list(A) ::= inline_initializer_list(B) OP_COMA inline_constructor(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],

    ["primary_expression(A) ::= variable_identifier(B).", ({ B }) => B],
    ["primary_expression(A) ::= literal_constant(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_CONSTANT, B.fileLocation, B);
        const type = new Type();
        switch (B.type)
        {
            case T.OP_INT_CONST: type.FromTokenType(T.OP_INT); break;
            case T.OP_FLOAT_CONST: type.FromTokenType(T.OP_FLOAT); break;
            case T.OP_BOOL_CONST: type.FromTokenType(T.OP_BOOL); break;
            case T.OP_STRING_CONST: type.FromTokenType(T.OP_STRING); break;
        }
        A.SetType(type);
        return A;
    }],
    ["primary_expression(A) ::= OP_LEFT_PAREN(C) expression(B) OP_RIGHT_PAREN.", ({ C, B }, ps) =>
    {
        const A = node(ps, N.NT_EXPRESSION, C.fileLocation, C);
        A.AddChild(B);
        A.SetType(B.GetType());
        return A;
    }],

    ["postfix_expression(A) ::= primary_expression(B).", ({ B }) => B],
    ["postfix_expression(A) ::= function_call(B).", ({ B }, ps) =>
    {
        const A = B;
        if (B.GetToken().type === T.OP_ID)
        {
            const diagnosticMessage = { value: "" };
            const symbol = ps.GetSymbolTable().LookupFunction(B.GetToken().stringValue, B, diagnosticMessage);
            if (!symbol)
            {
                ps.ShowMessage__Location(B.GetToken().fileLocation, ParserState.ErrorCode.EC_NO_OVERRIDE, B.GetToken().stringValue.ToString(), diagnosticMessage.value);
            }
            else if (symbol.intrinsicType)
            {
                A.SetType(symbol.intrinsicType(A, -1));
            }
            else
            {
                A.SetType(symbol.type);
            }
            A.SetSymbol(symbol);
        }
        else
        {
            const type = new Type();
            type.FromToken(A.GetToken());
            A.SetType(type);
        }
        return A;
    }],
    ["postfix_expression(A) ::= postfix_expression(B) OP_LEFT_BRACKET(D) integer_expression(C) OP_RIGHT_BRACKET.", ({ B, D, C }, ps) =>
    {
        const A = node(ps, N.NT_POSTFIX_EXPRESSION, D.fileLocation, D);
        A.AddChild(B);
        A.AddChild(C);
        const type = new Type();
        if (!B.GetType().GetIndexedType(type))
        {
            ps.ShowMessage__Token(D, ParserState.ErrorCode.EC_INVALID_INDEXING);
            type.FromTokenType(T.OP_VOID);
        }
        A.SetType(type);
        return A;
    }],
    ["postfix_expression(A) ::= postfix_expression(B) OP_DOT OP_ID(C).", ({ B, C }, ps) =>
    {
        const A = node(ps, N.NT_POSTFIX_EXPRESSION, C.fileLocation, C);
        A.AddChild(B);
        const type = new Type();
        const out = { symbol: null };
        if (!ComputeMemberType(B.GetType(), C.stringValue, type, out))
        {
            ps.ShowMessage__Token(C, ParserState.ErrorCode.EC_INVALID_SUBSCRIPT, C.stringValue.ToString());
            type.FromTokenType(T.OP_VOID);
        }
        A.SetType(type);
        A.SetSymbol(out.symbol);
        return A;
    }],
    ["postfix_expression(A) ::= postfix_expression(B) OP_DOT(C) function_call(D).", ({ B, C, D }, ps) =>
    {
        const A = node(ps, N.NT_POSTFIX_EXPRESSION, C.fileLocation, C);
        A.AddChild(B);
        A.AddChild(D);
        const type = new Type();
        if (B.GetType().GetMethodType(D, type))
        {
            A.SetType(type);
        }
        else
        {
            ps.ShowMessage__Token(C, ParserState.ErrorCode.EC_INVALID_SUBSCRIPT, D.GetToken().stringValue.ToString());
        }
        return A;
    }],
    ["postfix_expression(A) ::= postfix_expression(B) OP_INC_OP(C).", ({ B, C }, ps) =>
    {
        const A = node(ps, N.NT_POSTFIX_EXPRESSION, C.fileLocation, C);
        A.AddChild(B);
        A.SetType(B.GetType());
        return A;
    }],
    ["postfix_expression(A) ::= postfix_expression(B) OP_DEC_OP(C).", ({ B, C }, ps) =>
    {
        const A = node(ps, N.NT_POSTFIX_EXPRESSION, C.fileLocation, C);
        A.AddChild(B);
        A.SetType(B.GetType());
        return A;
    }],

    ["integer_expression(A) ::= expression(B).", ({ B }) => B],

    ["function_call(A) ::= function_call_header_with_parameters(B) OP_RIGHT_PAREN.", ({ B }) => B],
    ["function_call(A) ::= function_call_header_no_parameters(B) OP_RIGHT_PAREN.", ({ B }) => B],

    ["function_call_header_no_parameters(A) ::= function_call_header(B) OP_VOID.", ({ B }) => B],
    ["function_call_header_no_parameters(A) ::= function_call_header(B).", ({ B }) => B],

    ["function_call_header_with_parameters(A) ::= function_call_header(B) assignment_expression(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],
    ["function_call_header_with_parameters(A) ::= function_call_header_with_parameters(B) OP_COMA assignment_expression(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],

    ["function_call_header(A) ::= constructor_identifier(B) OP_LEFT_PAREN.", ({ B }, ps) => node(ps, N.NT_FUNCTION_CALL, B.fileLocation, B)],
    ["function_call_header(A) ::= OP_ID(B) OP_LEFT_PAREN.", ({ B }, ps) => node(ps, N.NT_FUNCTION_CALL, B.fileLocation, B)],

    ["constructor_identifier(A) ::= OP_BOOL(B).", ({ B }) => B],
    ["constructor_identifier(A) ::= OP_INT(B).", ({ B }) => B],
    ["constructor_identifier(A) ::= OP_UINT(B).", ({ B }) => B],
    ["constructor_identifier(A) ::= OP_HALF(B).", ({ B }) => B],
    ["constructor_identifier(A) ::= OP_FLOAT(B).", ({ B }) => B],
    ["constructor_identifier(A) ::= OP_DOUBLE(B).", ({ B }) => B],
    ["constructor_identifier(A) ::= OP_STRING(B).", ({ B }) => B],
    // The OP_INT_CONST values here carry the comma's intValue (CE-61).
    ["constructor_identifier(A) ::= OP_VECTOR OP_LESS constructor_identifier(B) OP_COMA OP_INT_CONST(C) OP_MORE.", ({ B, C }) =>
    {
        B.intValue = C.intValue;
        return B;
    }],
    // Bug (HLSLParser.y:380-384; Carbon known defect CE-95): this packs the
    // columns into the low byte, where the scanner's `floatRxC` packs the rows
    // (HLSLScanner.re:829-830), so `matrix<float, 2, 3>` would be the
    // transpose of `float2x3`. Latent while CE-61 loses both dimensions.
    ["constructor_identifier(A) ::= OP_MATRIX OP_LESS constructor_identifier(B) OP_COMA OP_INT_CONST(C) OP_COMA OP_INT_CONST(D) OP_MORE.", ({ B, C, D }) =>
    {
        B.intValue = D.intValue | (C.intValue << 8);
        return B;
    }],

    ["unary_expression(A) ::= postfix_expression(B).", ({ B }) => B],
    ["unary_expression(A) ::= OP_INC_OP(B) unary_expression(C).", prefixOperator()],
    ["unary_expression(A) ::= OP_DEC_OP(B) unary_expression(C).", prefixOperator()],
    ["unary_expression(A) ::= OP_PLUS(B) unary_expression(C).", prefixOperator()],
    ["unary_expression(A) ::= OP_DASH(B) unary_expression(C).", prefixOperator()],
    ["unary_expression(A) ::= OP_BANG(B) unary_expression(C).", prefixOperator()],
    ["unary_expression(A) ::= OP_TILDE(B) unary_expression(C).", prefixOperator()],

    ["cast_expression(A) ::= unary_expression(C).", ({ C }) => C],
    ["cast_expression(A) ::= OP_LEFT_PAREN constructor_identifier(B) OP_RIGHT_PAREN cast_expression(C).", ({ B, C }, ps) =>
    {
        const type = new Type();
        type.FromToken(B);
        const A = node(ps, N.NT_CAST_EXPRESSION, B.fileLocation, B);
        A.AddChild(C);
        A.SetType(type);
        return A;
    }],
    ["cast_expression(A) ::= OP_LEFT_PAREN OP_TYPE_NAME(B) OP_RIGHT_PAREN cast_expression(C).", ({ B, C }, ps) =>
    {
        const symbol = ps.GetSymbolTable().LookupType(B.stringValue);
        const type = new Type();
        type.FromSymbol(symbol);
        const A = node(ps, N.NT_CAST_EXPRESSION, B.fileLocation, B);
        A.AddChild(C);
        A.SetType(type);
        return A;
    }],

    ["multiplicative_expression(A) ::= cast_expression(B).", ({ B }) => B],
    ["multiplicative_expression(A) ::= multiplicative_expression(B) OP_STAR(C) cast_expression(D).", arithmetic()],
    ["multiplicative_expression(A) ::= multiplicative_expression(B) OP_SLASH(C) cast_expression(D).", arithmetic()],
    ["multiplicative_expression(A) ::= multiplicative_expression(B) OP_PERCENT(C) cast_expression(D).", arithmetic()],

    ["additive_expression(A) ::= multiplicative_expression(B).", ({ B }) => B],
    ["additive_expression(A) ::= additive_expression(B) OP_PLUS(C) multiplicative_expression(D).", arithmetic()],
    ["additive_expression(A) ::= additive_expression(B) OP_DASH(C) multiplicative_expression(D).", arithmetic()],

    ["shift_expression(A) ::= additive_expression(B).", ({ B }) => B],
    ["shift_expression(A) ::= shift_expression(B) OP_LEFT_OP(C) additive_expression(D).", integerOperator()],
    ["shift_expression(A) ::= shift_expression(B) OP_RIGHT_OP(C) additive_expression(D).", integerOperator()],

    ["relational_expression(A) ::= shift_expression(B).", ({ B }) => B],
    ["relational_expression(A) ::= relational_expression(B) OP_LESS(C) shift_expression(D).", booleanOperator()],
    ["relational_expression(A) ::= relational_expression(B) OP_MORE(C) shift_expression(D).", booleanOperator()],
    ["relational_expression(A) ::= relational_expression(B) OP_LE_OP(C) shift_expression(D).", booleanOperator()],
    ["relational_expression(A) ::= relational_expression(B) OP_GE_OP(C) shift_expression(D).", booleanOperator()],

    ["equality_expression(A) ::= relational_expression(B).", ({ B }) => B],
    ["equality_expression(A) ::= equality_expression(B) OP_EQ_OP(C) relational_expression(D).", booleanOperator()],
    ["equality_expression(A) ::= equality_expression(B) OP_NE_OP(C) relational_expression(D).", booleanOperator()],

    ["and_expression(A) ::= equality_expression(B).", ({ B }) => B],
    ["and_expression(A) ::= and_expression(B) OP_AMPERSAND(C) equality_expression(D).", integerOperator()],

    ["exclusive_or_expression(A) ::= and_expression(B).", ({ B }) => B],
    ["exclusive_or_expression(A) ::= exclusive_or_expression(B) OP_CARET(C) and_expression(D).", integerOperator()],

    ["inclusive_or_expression(A) ::= exclusive_or_expression(B).", ({ B }) => B],
    ["inclusive_or_expression(A) ::= inclusive_or_expression(B) OP_VERTICAL_BAR(C) exclusive_or_expression(D).", integerOperator()],

    ["logical_and_expression(A) ::= inclusive_or_expression(B).", ({ B }) => B],
    ["logical_and_expression(A) ::= logical_and_expression(B) OP_AND_OP(C) inclusive_or_expression(D).", booleanOperator()],

    ["logical_or_expression(A) ::= logical_and_expression(B).", ({ B }) => B],
    ["logical_or_expression(A) ::= logical_or_expression(B) OP_OR_OP(C) logical_and_expression(D).", booleanOperator()],

    ["conditional_expression(A) ::= logical_or_expression(B).", ({ B }) => B],
    ["conditional_expression(A) ::= logical_or_expression(B) OP_QUESTION(C) expression(D) OP_COLON assignment_expression(E).", ({ B, C, D, E: F }, ps) =>
    {
        const A = node(ps, N.NT_CONDITIONAL_EXPRESSION, C.fileLocation, C);
        A.AddChild(B);
        A.AddChild(D);
        A.AddChild(F);
        const type = new Type();
        if (!Type.getCommonType(D.GetType(), F.GetType(), type))
        {
            ps.ShowMessage__Token(C, ParserState.ErrorCode.EC_TYPE_MISMATCH);
            type.FromTokenType(T.OP_VOID);
        }
        A.SetType(type);
        return A;
    }],

    ["assignment_expression(A) ::= conditional_expression(B).", ({ B }) => B],
    ["assignment_expression(A) ::= unary_expression(B) assigment_operator(C) assignment_expression(D).", ({ B, C, D }, ps) =>
    {
        const A = node(ps, N.NT_EXPRESSION, C.fileLocation, C);
        A.AddChild(B);
        A.AddChild(D);
        const casts = { value: 0 };
        if (!D.GetType().CanImplicitCast(B.GetType(), casts))
        {
            ps.ShowMessage__Token(C, ParserState.ErrorCode.EC_INVALID_CAST, D.GetType().ToString(), B.GetType().ToString());
        }
        A.SetType(B.GetType());
        return A;
    }],

    ["assigment_operator(A) ::= OP_EQUAL(B).", ({ B }) => B],
    ["assigment_operator(A) ::= OP_MUL_ASSIGN(B).", ({ B }) => B],
    ["assigment_operator(A) ::= OP_DIV_ASSIGN(B).", ({ B }) => B],
    ["assigment_operator(A) ::= OP_MOD_ASSIGN(B).", ({ B }) => B],
    ["assigment_operator(A) ::= OP_ADD_ASSIGN(B).", ({ B }) => B],
    ["assigment_operator(A) ::= OP_SUB_ASSIGN(B).", ({ B }) => B],
    ["assigment_operator(A) ::= OP_LEFT_ASSIGN(B).", ({ B }) => B],
    ["assigment_operator(A) ::= OP_RIGHT_ASSIGN(B).", ({ B }) => B],
    ["assigment_operator(A) ::= OP_AND_ASSIGN(B).", ({ B }) => B],
    ["assigment_operator(A) ::= OP_XOR_ASSIGN(B).", ({ B }) => B],
    ["assigment_operator(A) ::= OP_OR_ASSIGN(B).", ({ B }) => B],

    ["expression(A) ::= assignment_expression(B).", ({ B }) => B],
    ["expression(A) ::= expression(B) OP_COMA(C) assignment_expression(D).", ({ B, C, D }, ps) =>
    {
        const A = node(ps, N.NT_EXPRESSION, C.fileLocation, C);
        A.AddChild(B);
        A.AddChild(D);
        A.SetType(D.GetType());
        return A;
    }],

    ["constant_expression(A) ::= conditional_expression(B).", ({ B }) => B],

    ["semantics(A) ::= OP_COLON OP_ID(B).", ({ B }) => B.stringValue],

    ["declaration(A) ::= function_prototype(B) OP_SEMICOLON.", ({ B }, ps) =>
    {
        ps.GetSymbolTable().LeaveScope();
        return B;
    }],
    ["declaration(A) ::= init_declarator_list(B) OP_SEMICOLON.", ({ B }) => B],
    ["declaration(A) ::= struct_named_specifier(B) OP_SEMICOLON.", ({ B }) => B],

    ["function_prototype(A) ::= function_declarator(B) OP_RIGHT_PAREN.", ({ B }, ps) => functionPrototype(B, ps)],
    ["function_prototype(A) ::= function_declarator(B) OP_RIGHT_PAREN semantics(C).", ({ B, C }, ps) =>
    {
        const A = functionPrototype(B, ps);
        A.GetSymbol().semantic = C.Copy();
        return A;
    }],

    ["function_declarator(A) ::= function_header(B).", ({ B }) => B],
    ["function_declarator(A) ::= function_header_with_parameters(B).", ({ B }) => B],

    ["function_header_with_parameters(A) ::= function_header(B) parameter_declaration(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],
    ["function_header_with_parameters(A) ::= function_header_with_parameters(B) OP_COMA parameter_declaration(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],

    ["function_header(A) ::= fully_specified_type(B) OP_ID(C) OP_LEFT_PAREN.", ({ B, C }, ps) =>
    {
        const A = node(ps, N.NT_FUNCTION_HEADER, C.fileLocation, C);
        A.SetType(B);
        ps.GetSymbolTable().EnterScope();
        return A;
    }],

    ["interpolation_modifier(A) ::= .", () => 0],
    ["interpolation_modifier(A) ::= interpolation_modifier2(B).", ({ B }) => B],

    ["interpolation_modifier2(A) ::= OP_LINEAR(B).", ({ B }) => B.type],
    ["interpolation_modifier2(A) ::= OP_CENTROID(B).", ({ B }) => B.type],
    ["interpolation_modifier2(A) ::= OP_NOINTERPOLATION(B).", ({ B }) => B.type],
    ["interpolation_modifier2(A) ::= OP_NOPERSPECTIVE(B).", ({ B }) => B.type],

    ["parameter_declarator(A) ::= fully_specified_type(B) OP_ID(C) semantics(D) interpolation_modifier(E).", ({ B, C, D, E: F }, ps) =>
        parameterDeclarator(ps, { type: B, name: C, token: null, brackets: null, semantic: D, interpolation: F })],
    ["parameter_declarator(A) ::= fully_specified_type(B) OP_ID(C) interpolation_modifier(E).", ({ B, C, E: F }, ps) =>
        parameterDeclarator(ps, { type: B, name: C, token: C, brackets: null, semantic: null, interpolation: F })],
    ["parameter_declarator(A) ::= fully_specified_type(B) OP_ID(C) bracket_list(D) semantics(E) interpolation_modifier(F).", ({ B, C, D, E: S, F }, ps) =>
        parameterDeclarator(ps, { type: B, name: C, token: null, brackets: D, semantic: S, interpolation: F })],
    ["parameter_declarator(A) ::= fully_specified_type(B) OP_ID(C) bracket_list(D) interpolation_modifier(F).", ({ B, C, D, F }, ps) =>
        parameterDeclarator(ps, { type: B, name: C, token: null, brackets: D, semantic: null, interpolation: F })],

    ["parameter_declaration(A) ::= primitive_type(P) parameter_qualifier(C) parameter_declarator(D).", ({ P, C, D }) => parameterDeclaration(P, C, D, null)],
    ["parameter_declaration(A) ::= primitive_type(P) parameter_qualifier(C) parameter_type_specifier(D).", ({ P, C, D }) => parameterDeclaration(P, C, D, null)],
    ["parameter_declaration(A) ::= primitive_type(P) parameter_qualifier(C) parameter_declarator(D) OP_EQUAL initializer(E).", ({ P, C, D, E: F }) => parameterDeclaration(P, C, D, F)],
    ["parameter_declaration(A) ::= primitive_type(P) parameter_qualifier(C) parameter_type_specifier(D) OP_EQUAL initializer(E).", ({ P, C, D, E: F }) => parameterDeclaration(P, C, D, F)],

    ["primitive_type(A) ::= .", () => null],
    ["primitive_type(A) ::= OP_POINT(B).", ({ B }, ps) => node(ps, N.NT_PRIMITIVE_TYPE, B.fileLocation, B)],
    ["primitive_type(A) ::= OP_LINE(B).", ({ B }, ps) => node(ps, N.NT_PRIMITIVE_TYPE, B.fileLocation, B)],
    ["primitive_type(A) ::= OP_TRIANGLE(B).", ({ B }, ps) => node(ps, N.NT_PRIMITIVE_TYPE, B.fileLocation, B)],
    ["primitive_type(A) ::= OP_LINEADJ(B).", ({ B }, ps) => node(ps, N.NT_PRIMITIVE_TYPE, B.fileLocation, B)],
    ["primitive_type(A) ::= OP_TRIANGLEADJ(B).", ({ B }, ps) => node(ps, N.NT_PRIMITIVE_TYPE, B.fileLocation, B)],

    ["parameter_qualifier(A) ::= .", () => new ScannerToken(0)],
    ["parameter_qualifier(A) ::= OP_IN(B).", ({ B }) => B],
    ["parameter_qualifier(A) ::= OP_OUT(B).", ({ B }) => B],
    ["parameter_qualifier(A) ::= OP_INOUT(B).", ({ B }) => B],

    ["parameter_type_specifier(A) ::= fully_specified_type(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_FUNCTION_PARAMETER, ps.GetCurrentLocation());
        A.SetType(B);
        A.AddChild(null);
        return A;
    }],
    ["parameter_type_specifier(A) ::= fully_specified_type(B) bracket_list(C).", ({ B, C }, ps) =>
    {
        const A = node(ps, N.NT_FUNCTION_PARAMETER, C.GetLocation());
        applyArraySizes(ps, B, C);
        A.SetType(B);
        A.AddChild(C);
        return A;
    }],

    ["pack_offset(A) ::= OP_COLON OP_PACKOFFSET OP_LEFT_PAREN OP_ID(B) OP_RIGHT_PAREN.", ({ B }, ps) =>
    {
        const A = new PackOffset();
        A.Create(ps, B, null);
        return A;
    }],
    ["pack_offset(A) ::= OP_COLON OP_PACKOFFSET OP_LEFT_PAREN OP_ID(B) OP_DOT OP_ID(C) OP_RIGHT_PAREN.", ({ B, C }, ps) =>
    {
        const A = new PackOffset();
        A.Create(ps, B, C);
        return A;
    }],

    ["register_specifier(A) ::= OP_COLON OP_REGISTER OP_LEFT_PAREN OP_ID(B) OP_RIGHT_PAREN.", ({ B }, ps) =>
    {
        const A = registerSpecifier();
        if (!ParseRegisterID(B.stringValue, A))
        {
            ps.ShowMessage__Token(B, ParserState.ErrorCode.EC_INVALID_REGISTER);
        }
        return A;
    }],
    ["register_specifier(A) ::= OP_COLON OP_REGISTER OP_LEFT_PAREN OP_ID(B) OP_LEFT_BRACKET OP_INT_CONST(D) OP_RIGHT_BRACKET OP_RIGHT_PAREN.", ({ B, D }, ps) =>
    {
        const A = registerSpecifier();
        if (!ParseRegisterID(B.stringValue, A))
        {
            ps.ShowMessage__Token(B, ParserState.ErrorCode.EC_INVALID_REGISTER);
        }
        A.subComponent = ParseNumber(D.stringValue);
        return A;
    }],
    ["register_specifier(A) ::= OP_COLON OP_REGISTER OP_LEFT_PAREN OP_ID(B) OP_COMA OP_ID(T) OP_RIGHT_PAREN.", ({ B, T: second }, ps) =>
    {
        const A = new RegisterSpecifier();
        A.explicitRegister = true;
        A.subComponent = -1;
        const space = second.stringValue.ToString();
        if (space.slice(0, 5) === "space")
        {
            A.shaderProfile = InlineString.makeInlineString("");
            A.space = Number.parseInt(space.slice(5), 10) || 0;
            // Bug (HLSLParser.y:1330; Carbon known defect CE-84): `atoi` of a
            // number outside `int` is undefined.
            if (A.space > 2147483647)
            {
                throw new RangeError("HLSLParser: register space overflows int (Carbon known defect CE-84)");
            }
            A.explicitSpace = true;
            if (!ParseRegisterID(B.stringValue, A))
            {
                ps.ShowMessage__Token(B, ParserState.ErrorCode.EC_INVALID_REGISTER);
            }
        }
        else
        {
            A.shaderProfile = B.stringValue.Copy();
            A.space = -1;
            A.explicitSpace = false;
            if (!ParseRegisterID(second.stringValue, A))
            {
                ps.ShowMessage__Token(second, ParserState.ErrorCode.EC_INVALID_REGISTER);
            }
        }
        return A;
    }],
    ["register_specifier(A) ::= OP_COLON OP_REGISTER OP_LEFT_PAREN OP_ID(B) OP_COMA OP_ID(T) OP_LEFT_BRACKET OP_INT_CONST(D) OP_RIGHT_BRACKET OP_RIGHT_PAREN.", ({ B, T: second, D }, ps) =>
    {
        const A = registerSpecifier();
        if (!ParseRegisterID(second.stringValue, A))
        {
            ps.ShowMessage__Token(second, ParserState.ErrorCode.EC_INVALID_REGISTER);
        }
        A.shaderProfile = B.stringValue.Copy();
        A.subComponent = ParseNumber(D.stringValue);
        return A;
    }],

    ["annotation_declaration(A) ::= OP_LESS annotation_list(B) OP_MORE.", ({ B }) => B],
    ["annotation_declaration(A) ::= OP_LESS OP_MORE.", () => null],

    ["annotation_list(A) ::= single_annotation(B).", ({ B }) => [B]],
    ["annotation_list(A) ::= annotation_list(B) single_annotation(C).", ({ B, C }) =>
    {
        B.push(C);
        return B;
    }],

    ["single_annotation(A) ::= constructor_identifier(B) OP_ID(C) OP_EQUAL literal_constant(D) OP_SEMICOLON.", ({ B, C, D }, ps) =>
    {
        const mismatch = () => ps.ShowMessage__Token(D, ParserState.ErrorCode.EC_ANNOTATION_TYPE_MISMATCH, C.stringValue.ToString());
        switch (B.type)
        {
            case T.OP_BOOL:
                if (D.type !== T.OP_BOOL_CONST)
                {
                    mismatch();
                }
                break;
            case T.OP_INT:
            case T.OP_UINT:
                if (D.type !== T.OP_INT_CONST)
                {
                    mismatch();
                }
                break;
            case T.OP_HALF:
            case T.OP_FLOAT:
            case T.OP_DOUBLE:
                if (D.type !== T.OP_FLOAT_CONST)
                {
                    mismatch();
                }
                break;
            case T.OP_STRING:
                if (D.type !== T.OP_STRING_CONST)
                {
                    mismatch();
                }
                break;
        }
        const A = new SymbolAnnotation();
        A.type = B.type;
        A.name = C.stringValue.Copy();
        A.value = D.Copy();
        return A;
    }],

    ["name_decoration(A) ::= semantics(B).", ({ B }) =>
    {
        const A = new Symbol();
        A.semantic = B.Copy();
        return A;
    }],
    ["name_decoration(A) ::= pack_offset(B).", ({ B }) =>
    {
        const A = new Symbol();
        A.packOffset = B.Copy();
        return A;
    }],
    ["name_decoration(A) ::= register_specifier(B).", ({ B }) =>
    {
        const A = new Symbol();
        A.registerSpecifier.set(B.shaderProfile.ToString(), B.Copy());
        return A;
    }],

    ["name_decoration_list(A) ::= name_decoration(B).", ({ B }) => B],
    ["name_decoration_list(A) ::= name_decoration_list(B) name_decoration(C).", ({ B, C }, ps) =>
    {
        if (C.semantic.IsSet())
        {
            B.semantic = C.semantic;
        }
        else if (C.packOffset.subComponent >= 0)
        {
            B.packOffset = C.packOffset;
        }
        else if (C.registerSpecifier.size !== 0)
        {
            const reg = C.registerSpecifier.First()[1];
            if (B.registerSpecifier.size !== 0)
            {
                if (B.registerSpecifier.has(reg.shaderProfile.ToString()) || B.registerSpecifier.has(""))
                {
                    ps.ShowMessage(ParserState.ErrorCode.EC_MULTIPLE_REGISTER_BINDINGS);
                }
            }
            B.registerSpecifier.set(reg.shaderProfile.ToString(), reg);
        }
        return B;
    }],

    ["name_post_declaration(A) ::= .", () => null],
    ["name_post_declaration(A) ::= name_decoration_list(B).", ({ B }) => B],
    ["name_post_declaration(A) ::= annotation_declaration(B).", ({ B }) =>
    {
        const A = new Symbol();
        A.annotations = B;
        return A;
    }],
    ["name_post_declaration(A) ::= name_decoration_list(B) annotation_declaration(C).", ({ B, C }) =>
    {
        B.annotations = C;
        return B;
    }],

    ["name_declaration(A) ::= OP_ID(C) name_post_declaration(B).", ({ C, B }, ps) =>
    {
        const symbol = declareName(ps, C, B);
        const A = node(ps, N.NT_NAME_DECLARATION, C.fileLocation, C);
        A.SetSymbol(symbol);
        return A;
    }],

    ["bracket_expression(A) ::= OP_LEFT_BRACKET OP_RIGHT_BRACKET.", () => null],
    ["bracket_expression(A) ::= OP_LEFT_BRACKET constant_expression(B) OP_RIGHT_BRACKET.", ({ B }) => B],

    ["bracket_list(A) ::= bracket_expression(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_BRACKET_LIST, B ? B.GetLocation() : new FileLocation());
        A.AddChild(B);
        return A;
    }],
    ["bracket_list(A) ::= bracket_list(B) bracket_expression(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],

    ["name_declaration(A) ::= OP_ID(C) bracket_list(D) name_post_declaration(B).", ({ C, D, B }, ps) =>
    {
        const symbol = declareName(ps, C, B);
        const A = node(ps, N.NT_NAME_DECLARATION, C.fileLocation);
        A.AddChild(D);
        A.AddChild(null);
        A.SetSymbol(symbol);
        return A;
    }],
    ["name_declaration(A) ::= OP_ID(C) bracket_list(D) name_post_declaration(B) OP_EQUAL initializer(E).", ({ C, D, B, E: F }, ps) =>
    {
        const symbol = declareName(ps, C, B);
        const A = node(ps, N.NT_NAME_DECLARATION, C.fileLocation);
        A.AddChild(D);
        A.AddChild(F);
        A.SetSymbol(symbol);
        return A;
    }],
    ["name_declaration(A) ::= OP_ID(C) name_post_declaration(B) OP_EQUAL initializer(D).", ({ C, B, D }, ps) =>
    {
        const symbol = declareName(ps, C, B);
        const A = node(ps, N.NT_NAME_DECLARATION, C.fileLocation);
        A.AddChild(null);
        A.AddChild(D);
        A.SetSymbol(symbol);
        return A;
    }],
    ["name_declaration(A) ::= OP_ID(C) name_post_declaration(B) sampler_initializer_10(D).", ({ C, B, D }, ps) =>
    {
        const symbol = declareName(ps, C, B);
        const A = node(ps, N.NT_NAME_DECLARATION, C.fileLocation);
        A.AddChild(null);
        A.AddChild(D);
        A.SetSymbol(symbol);
        return A;
    }],

    ["init_declarator_list(A) ::= single_declaration(B).", ({ B }) => B],
    ["init_declarator_list(A) ::= init_declarator_list(B) OP_COMA name_declaration(C).", ({ B, C }, ps) =>
    {
        const type = B.GetType().Copy();
        applyArraySizes(ps, type, C.GetChildOrNull(0));
        const symbol = C.GetSymbol();
        if (symbol)
        {
            symbol.type = type.Copy();
            symbol.definition = C;
        }
        C.SetType(type);
        B.AddChild(C);
        recordBindlessSampler(ps, type, C);
        return B;
    }],

    ["single_declaration(A) ::= fully_specified_type(B) name_declaration(C).", ({ B, C }, ps) =>
    {
        const A = node(ps, N.NT_VAR_DECLARATION_LIST, C.GetLocation());
        A.AddChild(C);
        const type = B.Copy();
        applyArraySizes(ps, type, C.GetChildOrNull(0));
        C.SetType(type);

        const symbol = C.GetSymbol();
        if (symbol)
        {
            symbol.type = type.Copy();
            symbol.definition = C;
        }
        A.SetType(B);

        recordBindlessSampler(ps, type, C);
        return A;
    }],

    ["fully_specified_type(A) ::= type_specifier(B).", ({ B }) => B],
    ["fully_specified_type(A) ::= type_modifier(B) type_specifier(C).", ({ B, C }) =>
    {
        C.modifier = B.type;
        return C;
    }],
    ["fully_specified_type(A) ::= storage_class(B) type_specifier(D).", ({ B, D }) =>
    {
        D.storageClass = B.type;
        return D;
    }],
    ["fully_specified_type(A) ::= storage_class(B) type_modifier(C) type_specifier(D).", ({ B, C, D }) =>
    {
        D.storageClass = B.type;
        D.modifier = C.type;
        return D;
    }],

    ["storage_class(A) ::= OP_EXTERN(B).", ({ B }) => B],
    ["storage_class(A) ::= OP_NOINTERPOLATION(B).", ({ B }) => B],
    ["storage_class(A) ::= OP_PRECISE(B).", ({ B }) => B],
    ["storage_class(A) ::= OP_SHARED(B).", ({ B }) => B],
    ["storage_class(A) ::= OP_GROUPSHARED(B).", ({ B }) => B],
    ["storage_class(A) ::= OP_STATIC(B).", ({ B }) => B],
    ["storage_class(A) ::= OP_UNIFORM(B).", ({ B }) => B],
    ["storage_class(A) ::= OP_VOLATILE(B).", ({ B }) => B],

    ["type_modifier(A) ::= OP_CONST(B).", ({ B }) => B],
    ["type_modifier(A) ::= OP_ROW_MAJOR(B).", ({ B }) => B],
    ["type_modifier(A) ::= OP_COLUMN_MAJOR(B).", ({ B }) => B],

    ...typeSpecifierRules(),

    ["struct_named_specifier(A) ::= OP_STRUCT enter_block OP_ID(B) OP_LEFT_BRACE  OP_RIGHT_BRACE.", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_STRUCT, B.fileLocation);

        ps.GetSymbolTable().LeaveScope();

        const symbol = ps.GetSymbolTable().AddSymbol(B.stringValue);
        if (!symbol)
        {
            ps.ShowMessage__Token(B, ParserState.ErrorCode.EC_IDENTIFIER_REDEFINITION, B.stringValue.ToString());
        }
        else
        {
            symbol.isTypeName = true;
            symbol.definition = A;
            A.SetSymbol(symbol);
            A.SetType(Type.typeFromSymbol(symbol));
        }
        return A;
    }],

    ["struct_specifier(A) ::= OP_STRUCT(B) enter_block OP_LEFT_BRACE  OP_RIGHT_BRACE.", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_STRUCT, B.fileLocation);

        ps.GetSymbolTable().LeaveScope();

        const symbol = ps.GetSymbolTable().AddSymbol(ps.AllocateName());
        symbol.definition = A;
        symbol.isTypeName = true;
        A.SetSymbol(symbol);
        A.SetType(Type.typeFromSymbol(symbol));
        return A;
    }],

    ["struct_named_specifier(A) ::= OP_STRUCT enter_block OP_ID(B) OP_LEFT_BRACE struct_declaration_list(C) OP_RIGHT_BRACE.", ({ B, C }, ps) =>
    {
        ps.GetSymbolTable().LeaveScope();

        const A = C;

        const symbol = ps.GetSymbolTable().AddSymbol(B.stringValue);
        if (!symbol)
        {
            ps.ShowMessage__Token(B, ParserState.ErrorCode.EC_IDENTIFIER_REDEFINITION, B.stringValue.ToString());
        }
        else
        {
            symbol.isTypeName = true;
            symbol.definition = C;
            A.SetSymbol(symbol);
            A.SetType(Type.typeFromSymbol(symbol));
        }
        return A;
    }],

    ["struct_specifier(A) ::= OP_STRUCT enter_block OP_LEFT_BRACE struct_declaration_list(C) OP_RIGHT_BRACE.", ({ C }, ps) =>
    {
        ps.GetSymbolTable().LeaveScope();

        const A = C;

        const symbol = ps.GetSymbolTable().AddSymbol(ps.AllocateName());
        symbol.definition = C;
        symbol.isTypeName = true;
        A.SetSymbol(symbol);
        A.SetType(Type.typeFromSymbol(symbol));
        return A;
    }],

    ["struct_declaration_list(A) ::= struct_declaration(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_STRUCT, B.GetLocation());
        A.AddChild(B);
        return A;
    }],
    ["struct_declaration_list(A) ::= struct_declaration_list(B) struct_declaration(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],

    ["struct_declaration(A) ::= type_specifier(B) struct_declarator_list(C) OP_SEMICOLON.", ({ B, C }, ps) => structDeclaration(ps, B, C, null)],
    ["struct_declaration(A) ::= type_modifier(D) type_specifier(B) struct_declarator_list(C) OP_SEMICOLON.", ({ D, B, C }, ps) =>
    {
        B.modifier = D.type;
        return structDeclaration(ps, B, C, null);
    }],
    ["struct_declaration(A) ::= interpolation_modifier2(E) type_modifier(D) type_specifier(B) struct_declarator_list(C) OP_SEMICOLON.", ({ E: I, D, B, C }, ps) =>
    {
        B.modifier = D.type;
        return structDeclaration(ps, B, C, I);
    }],
    ["struct_declaration(A) ::= interpolation_modifier2(E) type_specifier(B) struct_declarator_list(C) OP_SEMICOLON.", ({ E: I, B, C }, ps) => structDeclaration(ps, B, C, I)],

    ["struct_declarator_list(A) ::= struct_declarator(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_STRUCT_MEMBER, B.GetLocation());
        A.AddChild(B);
        return A;
    }],
    ["struct_declarator_list(A) ::= struct_declarator_list(B) OP_COMA struct_declarator(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],

    // CE-70: each of these dereferences a null symbol after a redefinition.
    ["struct_declarator(A) ::= OP_ID(B).", ({ B }, ps) =>
    {
        const symbol = declareMember(ps, B);
        const A = node(ps, N.NT_NAME_DECLARATION, B.fileLocation);
        symbol.definition = A;
        A.SetSymbol(symbol);
        return A;
    }],
    ["struct_declarator(A) ::= OP_ID(B) semantics(C).", ({ B, C }, ps) =>
    {
        const symbol = declareMember(ps, B);
        symbol.semantic = C.Copy();
        const A = node(ps, N.NT_NAME_DECLARATION, B.fileLocation);
        symbol.definition = A;
        A.SetSymbol(symbol);
        return A;
    }],
    ["struct_declarator(A) ::= OP_ID(B) bracket_list(C).", ({ B, C }, ps) =>
    {
        const symbol = declareMember(ps, B);
        const A = node(ps, N.NT_NAME_DECLARATION, B.fileLocation);
        symbol.definition = A;
        A.AddChild(C);
        A.SetSymbol(symbol);
        return A;
    }],
    ["struct_declarator(A) ::= OP_ID(B) bracket_list(C) semantics(D).", ({ B, C, D }, ps) =>
    {
        const symbol = declareMember(ps, B);
        if (symbol)
        {
            symbol.semantic = D.Copy();
        }
        const A = node(ps, N.NT_NAME_DECLARATION, B.fileLocation);
        symbol.definition = A;
        A.AddChild(C);
        A.SetSymbol(symbol);
        return A;
    }],

    ["initializer(A) ::= assignment_expression(B).", ({ B }) => B],
    ["initializer(A) ::= sampler_initializer(B).", ({ B }) => B],
    ["initializer(A) ::= inline_constructor(B).", ({ B }) => B],

    ["enter_fx_mode ::= .", (values, ps) => { ps.mode = ps.constructor.Mode.FX; }],

    ["sampler_initializer(A) ::= OP_SAMPLER_STATE enter_fx_mode OP_LEFT_BRACE sampler_state_list(B) OP_RIGHT_BRACE.", ({ B }, ps) =>
    {
        ps.mode = ps.constructor.Mode.HLSL;
        return B;
    }],

    ["sampler_initializer_10(A) ::= enter_fx_mode OP_LEFT_BRACE sampler_state_list(B) OP_RIGHT_BRACE.", ({ B }, ps) =>
    {
        ps.mode = ps.constructor.Mode.HLSL;
        return B;
    }],

    ["sampler_state_list(A) ::= state_assignment(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_SAMPLER_STATE_LIST, B.GetLocation());
        A.AddChild(B);
        return A;
    }],
    ["sampler_state_list(A) ::= sampler_state_list(B) state_assignment(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],

    ["state_assignment(A) ::= OP_ID(B) OP_EQUAL constant_expression(C) OP_SEMICOLON.", ({ B, C }, ps) =>
    {
        const A = node(ps, N.NT_STATE_ASSIGNMENT, B.fileLocation, B);
        A.AddChild(C);
        return A;
    }],
    ["state_assignment(A) ::= OP_ID(B) OP_EQUAL inline_constructor(C) OP_SEMICOLON.", ({ B, C }, ps) =>
    {
        const A = node(ps, N.NT_STATE_ASSIGNMENT, B.fileLocation, B);
        A.AddChild(C);
        return A;
    }],
    ["state_assignment(A) ::= OP_ID(B) OP_EQUAL OP_LESS OP_ID(C) OP_MORE OP_SEMICOLON.", ({ B, C }, ps) =>
    {
        const symbol = ps.GetSymbolTable().Lookup(C.stringValue);
        if (!symbol)
        {
            ps.ShowMessage__Token(B, ParserState.ErrorCode.EC_UNDECLARED_IDENTIFIER, C.stringValue.ToString());
        }
        const child = node(ps, N.NT_VAR_IDENTIFIER, C.fileLocation);
        child.SetSymbol(symbol);
        const A = node(ps, N.NT_STATE_ASSIGNMENT, B.fileLocation, B);
        A.AddChild(child);
        return A;
    }],

    ["statement_no_new_scope(A) ::= compount_statement_with_scope(B).", ({ B }) => B],
    ["statement_no_new_scope(A) ::= simple_statement(B).", ({ B }) => B],

    ["simple_statement(A) ::= declaration(B).", ({ B }) => B],
    ["simple_statement(A) ::= expression_statement(B).", ({ B }) => B],
    ["simple_statement(A) ::= selection_statement(B).", ({ B }) => B],
    ["simple_statement(A) ::= iteration_statement(B).", ({ B }) => B],
    ["simple_statement(A) ::= switch_statement(B).", ({ B }) => B],
    ["simple_statement(A) ::= jump_statement(B).", ({ B }) => B],

    ["compount_statement_with_scope(A) ::= OP_LEFT_BRACE(B) OP_RIGHT_BRACE.", ({ B }, ps) => node(ps, N.NT_BLOCK, B.fileLocation)],
    ["compount_statement_with_scope(A) ::= OP_LEFT_BRACE enter_block statement_list(C) OP_RIGHT_BRACE.", ({ C }, ps) =>
    {
        ps.GetSymbolTable().LeaveScope();
        return C;
    }],

    ["enter_block ::= .", (values, ps) => { ps.GetSymbolTable().EnterScope(); }],

    ["compount_statement_no_new_scope(A) ::= OP_LEFT_BRACE(B) OP_RIGHT_BRACE.", ({ B }, ps) => node(ps, N.NT_BLOCK, B.fileLocation)],
    ["compount_statement_no_new_scope(A) ::= OP_LEFT_BRACE statement_list(C) OP_RIGHT_BRACE.", ({ C }) => C],

    ["statement_list(A) ::= statement_no_new_scope(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_BLOCK, B.GetLocation());
        ps.MoveOfflineStatements(A);
        A.AddChild(B);
        return A;
    }],
    ["statement_list(A) ::= statement_list(B) statement_no_new_scope(C).", ({ B, C }, ps) =>
    {
        ps.MoveOfflineStatements(B);
        B.AddChild(C);
        return B;
    }],

    ["expression_statement(A) ::= OP_SEMICOLON(B).", ({ B }, ps) => node(ps, N.NT_EXPRESSION_STATEMENT, B.fileLocation)],
    ["expression_statement(A) ::= expression(B) OP_SEMICOLON(C).", ({ B, C }, ps) =>
    {
        const A = node(ps, N.NT_EXPRESSION_STATEMENT, C.fileLocation);
        A.AddChild(B);
        return A;
    }],

    ["statement_attribute(A) ::= OP_LEFT_BRACKET OP_ID(B) OP_RIGHT_BRACKET.", ({ B }) => B],

    ["selection_statement(A) ::= statement_attribute(T) OP_IF(D) OP_LEFT_PAREN expression(B) OP_RIGHT_PAREN selection_rest_statement(C).", ({ T: attribute, D, B, C }) =>
    {
        C.SetLocation(D.fileLocation);
        C.SetToken(attribute);
        C.InsertChild(0, B);
        return C;
    }],
    ["selection_statement(A) ::= OP_IF(D) OP_LEFT_PAREN expression(B) OP_RIGHT_PAREN selection_rest_statement(C).", ({ D, B, C }) =>
    {
        C.SetLocation(D.fileLocation);
        C.InsertChild(0, B);
        return C;
    }],

    ["selection_rest_statement(A) ::= statement_no_new_scope(B) OP_ELSE(D) statement_no_new_scope(C).", ({ B, D, C }, ps) =>
    {
        const A = node(ps, N.NT_IF, D.fileLocation);
        A.AddChild(B);
        A.AddChild(C);
        return A;
    }],
    ["selection_rest_statement(A) ::= statement_no_new_scope(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_IF, B.GetLocation());
        A.AddChild(B);
        return A;
    }],

    ["iteration_statement(A) ::= statement_attribute(T) OP_WHILE(D) OP_LEFT_PAREN expression(B) OP_RIGHT_PAREN statement_no_new_scope(C).", ({ T: attribute, D, B, C }, ps) =>
    {
        const A = node(ps, N.NT_WHILE, D.fileLocation, attribute);
        A.AddChild(B);
        A.AddChild(C);
        return A;
    }],
    ["iteration_statement(A) ::= OP_WHILE(D) OP_LEFT_PAREN expression(B) OP_RIGHT_PAREN statement_no_new_scope(C).", ({ D, B, C }, ps) =>
    {
        const A = node(ps, N.NT_WHILE, D.fileLocation);
        A.AddChild(B);
        A.AddChild(C);
        return A;
    }],
    ["iteration_statement(A) ::= OP_DO(D) statement_no_new_scope(B) OP_WHILE OP_LEFT_PAREN expression(C) OP_RIGHT_PAREN.", ({ D, B, C }, ps) =>
    {
        const A = node(ps, N.NT_DO, D.fileLocation);
        A.AddChild(C);
        A.AddChild(B);
        return A;
    }],
    ["iteration_statement(A) ::= OP_FOR(F) enter_block OP_LEFT_PAREN for_init_statement(B) for_rest_statement(C) OP_RIGHT_PAREN statement_no_new_scope(D).", ({ F, B, C, D }, ps) =>
    {
        C.InsertChild(0, B);
        C.AddChild(D);
        C.SetLocation(F.fileLocation);
        ps.GetSymbolTable().LeaveScope();
        return C;
    }],
    ["iteration_statement(A) ::= statement_attribute(T) OP_FOR(F) enter_block OP_LEFT_PAREN for_init_statement(B) for_rest_statement(C) OP_RIGHT_PAREN statement_no_new_scope(D).", ({ T: attribute, F, B, C, D }, ps) =>
    {
        C.SetToken(attribute);
        C.InsertChild(0, B);
        C.AddChild(D);
        C.SetLocation(F.fileLocation);
        ps.GetSymbolTable().LeaveScope();
        return C;
    }],

    ["for_init_statement(A) ::= expression_statement(B).", ({ B }) => B],
    ["for_init_statement(A) ::= declaration(B).", ({ B }) => B],

    ["conditionopt(A) ::= expression(B).", ({ B }) => B],
    ["conditionopt(A) ::= .", () => null],

    // Bug (HLSLParser.y:2716,2723; Carbon known defect CE-66): an empty
    // condition (`for( ;; )`) is null here and its location is read anyway;
    // Carbon crashes, this throws a TypeError.
    ["for_rest_statement(A) ::= conditionopt(B) OP_SEMICOLON.", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_FOR, B.GetLocation());
        A.AddChild(B);
        A.AddChild(null);
        return A;
    }],
    ["for_rest_statement(A) ::= conditionopt(B) OP_SEMICOLON expression(C).", ({ B, C }, ps) =>
    {
        const A = node(ps, N.NT_FOR, B.GetLocation());
        A.AddChild(B);
        A.AddChild(C);
        return A;
    }],

    ["switch_statement(A) ::= statement_attribute(T) OP_SWITCH(S) OP_LEFT_PAREN expression(B) OP_RIGHT_PAREN OP_LEFT_BRACE case_statements(C) OP_RIGHT_BRACE.", ({ T: attribute, S, B, C }) =>
    {
        C.InsertChild(0, B);
        C.SetToken(attribute);
        C.SetLocation(S.fileLocation);
        return C;
    }],
    ["switch_statement(A) ::= OP_SWITCH(S) OP_LEFT_PAREN expression(B) OP_RIGHT_PAREN OP_LEFT_BRACE case_statements(C) OP_RIGHT_BRACE.", ({ S, B, C }) =>
    {
        C.InsertChild(0, B);
        C.SetLocation(S.fileLocation);
        return C;
    }],

    ["case_statements(A) ::= case_statement(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_SWITCH, B.GetLocation());
        A.AddChild(B);
        return A;
    }],
    ["case_statements(A) ::= case_statements(B) case_statement(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],

    ["case_statement(A) ::= case_label(B) statement_list(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],
    ["case_statement(A) ::= case_label(B).", ({ B }) => B],

    ["case_label(A) ::= OP_CASE(C) constant_expression(B) OP_COLON.", ({ C, B }, ps) =>
    {
        const A = node(ps, N.NT_CASE, C.fileLocation);
        A.AddChild(B);
        return A;
    }],
    ["case_label(A) ::= OP_DEFAULT(B) OP_COLON.", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_CASE, B.fileLocation);
        A.AddChild(null);
        return A;
    }],

    ["jump_statement(A) ::= OP_CONTINUE(B) OP_SEMICOLON.", ({ B }, ps) => node(ps, N.NT_JUMP, B.fileLocation, B)],
    ["jump_statement(A) ::= OP_BREAK(B) OP_SEMICOLON.", ({ B }, ps) => node(ps, N.NT_JUMP, B.fileLocation, B)],
    ["jump_statement(A) ::= OP_RETURN(B) OP_SEMICOLON.", ({ B }, ps) => node(ps, N.NT_JUMP, B.fileLocation, B)],
    ["jump_statement(A) ::= OP_DISCARD(B) OP_SEMICOLON.", ({ B }, ps) => node(ps, N.NT_JUMP, B.fileLocation, B)],
    ["jump_statement(A) ::= OP_RETURN(B) expression(C) OP_SEMICOLON.", ({ B, C }, ps) =>
    {
        const A = node(ps, N.NT_JUMP, B.fileLocation, B);
        A.AddChild(C);
        return A;
    }],

    ["external_declaration(A) ::= function_definition(B).", ({ B }) => B],
    ["external_declaration(A) ::= declaration(B).", ({ B }) => B],
    ["external_declaration(A) ::= technique(B).", ({ B }) => B],
    ["external_declaration(A) ::= cbuffer_declaration(B).", ({ B }) => B],
    ["external_declaration(A) ::= OP_SEMICOLON.", () => null],

    ["function_attribute_list(A) ::= function_attribute(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_FUNCTION_ATTRIBUTE_LIST, B.GetLocation());
        A.AddChild(B);
        return A;
    }],
    ["function_attribute_list(A) ::= function_attribute_list(B) function_attribute(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],

    ["function_attribute(A) ::= OP_LEFT_BRACKET OP_ID(B) OP_LEFT_PAREN function_atrribute_value_list(C) OP_RIGHT_PAREN OP_RIGHT_BRACKET.", ({ B, C }) =>
    {
        C.SetToken(B);
        return C;
    }],
    ["function_attribute(A) ::= OP_LEFT_BRACKET OP_ID(B) OP_RIGHT_BRACKET.", ({ B }, ps) => node(ps, N.NT_FUNCTION_ATTRIBUTE, B.fileLocation, B)],

    ["function_atrribute_value_list(A) ::= literal_constant(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_FUNCTION_ATTRIBUTE, B.fileLocation);
        A.AddChild(node(ps, N.NT_FUNCTION_ATTRIBUTE_VALUE, B.fileLocation, B));
        return A;
    }],
    ["function_atrribute_value_list(A) ::= function_atrribute_value_list(B) OP_COMA literal_constant(C).", ({ B, C }, ps) =>
    {
        B.AddChild(node(ps, N.NT_FUNCTION_ATTRIBUTE_VALUE, C.fileLocation, C));
        return B;
    }],

    ["function_definition(A) ::= function_attribute_list(L) function_prototype(B) annotation_declaration(N) compount_statement_no_new_scope(C).", ({ L, B, N: annotations, C }, ps) =>
        functionDefinition(ps, L, B, annotations, C)],
    ["function_definition(A) ::= function_attribute_list(L) function_prototype(B) compount_statement_no_new_scope(C).", ({ L, B, C }, ps) =>
        functionDefinition(ps, L, B, undefined, C)],
    ["function_definition(A) ::= function_prototype(B) annotation_declaration(N) compount_statement_no_new_scope(C).", ({ B, N: annotations, C }, ps) =>
        functionDefinition(ps, undefined, B, annotations, C)],
    ["function_definition(A) ::= function_prototype(B) compount_statement_no_new_scope(C).", ({ B, C }, ps) =>
        functionDefinition(ps, undefined, B, undefined, C)],

    ["library(A) ::= OP_LIBRARY(P) OP_ID(B) enter_fx_mode OP_LEFT_BRACE state_list(C) OP_RIGHT_BRACE.", ({ P, B, C }, ps) =>
    {
        C.SetNodeType(N.NT_LIBRARY);
        C.SetLocation(P.fileLocation);
        C.SetToken(B);
        ps.mode = ps.constructor.Mode.HLSL;
        return C;
    }],

    ["technique(A) ::= OP_TECHNIQUE(T) OP_ID(B) OP_LEFT_BRACE OP_RIGHT_BRACE.", ({ T: keyword, B }, ps) => node(ps, N.NT_TECHNIQUE, keyword.fileLocation, B)],
    ["technique(A) ::= OP_TECHNIQUE(T) OP_ID(B) OP_LEFT_BRACE pass_list(C) OP_RIGHT_BRACE.", ({ T: keyword, B, C }) =>
    {
        C.SetToken(B);
        C.SetLocation(keyword.fileLocation);
        return C;
    }],

    ["pass_list_element(A) ::= pass_declaration(B).", ({ B }) => B],
    ["pass_list_element(A) ::= library(B).", ({ B }) => B],

    ["pass_list(A) ::= pass_list_element(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_TECHNIQUE, B.GetLocation());
        A.AddChild(B);
        return A;
    }],
    ["pass_list(A) ::= pass_list(B) pass_declaration(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],

    ["pass_declaration(A) ::= OP_PASS(P) OP_ID(B) enter_fx_mode OP_LEFT_BRACE state_list(C) OP_RIGHT_BRACE.", ({ P, B, C }, ps) =>
    {
        C.SetToken(B);
        C.SetLocation(P.fileLocation);
        ps.mode = ps.constructor.Mode.HLSL;
        return C;
    }],

    ["pass_declaration(A) ::= OP_PASS(P) OP_ID(B) enter_fx_mode OP_LEFT_BRACE OP_RIGHT_BRACE.", ({ P, B }, ps) =>
    {
        const A = node(ps, N.NT_PASS, B.fileLocation);
        A.SetToken(B);
        A.SetLocation(P.fileLocation);
        ps.mode = ps.constructor.Mode.HLSL;
        return A;
    }],

    ["state_list(A) ::= state_assignment(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_PASS, B.GetLocation());
        A.AddChild(B);
        return A;
    }],
    ["state_list(A) ::= shader_assignment(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_PASS, B.GetLocation());
        A.AddChild(B);
        return A;
    }],
    ["state_list(A) ::= state_list(B) state_assignment(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],
    ["state_list(A) ::= state_list(B) shader_assignment(C).", ({ B, C }) =>
    {
        B.AddChild(C);
        return B;
    }],

    ["leave_fx_mode ::= .", (values, ps) => { ps.mode = ps.constructor.Mode.HLSL; }],

    ["shader_assignment(A) ::= OP_ID(B) OP_EQUAL OP_COMPILE leave_fx_mode OP_ID(C) function_call(D) OP_SEMICOLON.", ({ B, C, D }, ps) =>
    {
        if (D.GetToken().type === T.OP_ID)
        {
            const diagnosticMessage = { value: "" };
            const symbol = ps.GetSymbolTable().LookupFunction(D.GetToken().stringValue, D, diagnosticMessage);
            if (!symbol)
            {
                ps.ShowMessage__Token(D.GetToken(), ParserState.ErrorCode.EC_NO_OVERRIDE, D.GetToken().stringValue.ToString(), diagnosticMessage.value);
            }
            D.SetSymbol(symbol);
        }

        const A = node(ps, N.NT_SHADER_ASSIGNMENT, B.fileLocation, B);
        A.AddChild(node(ps, N.NT_SHADER_PROFILE, C.fileLocation, C));
        A.AddChild(D);
        ps.mode = ps.constructor.Mode.FX;
        return A;
    }],

    ["buffer_type(A) ::= OP_CBUFFER(B).", ({ B }) => B],
    ["buffer_type(A) ::= OP_TBUFFER(B).", ({ B }) => B],
    ["buffer_type(A) ::= OP_SHARED OP_CBUFFER(B).", ({ B }) => B],
    ["buffer_type(A) ::= OP_SHARED OP_TBUFFER(B).", ({ B }) => B],

    ["cbuffer_declaration(A) ::= buffer_type(T) OP_ID(C) register_specifier(R) OP_LEFT_BRACE cbuffer_members(B)  OP_RIGHT_BRACE.", ({ T: bufferType, C, R, B }, ps) =>
        cbufferDeclaration(B, bufferType, ps.GetSymbolTable().AddBufferSymbol(C.stringValue), R, C.fileLocation)],
    ["cbuffer_declaration(A) ::= buffer_type(T) OP_ID(C) OP_LEFT_BRACE cbuffer_members(B)  OP_RIGHT_BRACE.", ({ T: bufferType, C, B }, ps) =>
        cbufferDeclaration(B, bufferType, ps.GetSymbolTable().AddBufferSymbol(C.stringValue), null, C.fileLocation)],
    ["cbuffer_declaration(A) ::= buffer_type(T) register_specifier(R) OP_LEFT_BRACE cbuffer_members(B)  OP_RIGHT_BRACE.", ({ T: bufferType, R, B }, ps) =>
        cbufferDeclaration(B, bufferType, ps.GetSymbolTable().AddBufferSymbol(ps.AllocateName()), R, bufferType.fileLocation)],
    ["cbuffer_declaration(A) ::= buffer_type(T) OP_LEFT_BRACE cbuffer_members(B)  OP_RIGHT_BRACE.", ({ T: bufferType, B }, ps) =>
        cbufferDeclaration(B, bufferType, ps.GetSymbolTable().AddBufferSymbol(ps.AllocateName()), null, bufferType.fileLocation)],

    ["cbuffer_members(A) ::= declaration(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_CBUFFER, B.GetLocation());
        A.AddChild(B);
        return A;
    }],
    ["cbuffer_members(A) ::= cbuffer_members(C) declaration(B).", ({ C, B }) =>
    {
        C.AddChild(B);
        return C;
    }],

    // CE-66: a source starting with `;` reads the location of a null declaration.
    ["translation_unit(A) ::= external_declaration(B).", ({ B }, ps) =>
    {
        const A = node(ps, N.NT_PROGRAM, B.GetLocation());
        ps.MoveOfflineStatements(A);
        if (B)
        {
            A.AddChild(B);
        }
        return A;
    }],
    ["translation_unit(A) ::= translation_unit(B) external_declaration(C).", ({ B, C }, ps) =>
    {
        ps.MoveOfflineStatements(B);
        if (C)
        {
            B.AddChild(C);
        }
        return B;
    }]
];

/**
 * The `type_specifier` rules, HLSLParser.y:1817-2168, in order.
 *
 * @returns {Array<[string, Function]>} The rules.
 */
function typeSpecifierRules()
{
    const fromToken = ({ B }) =>
    {
        const A = new Type();
        A.FromToken(B);
        return A;
    };
    const withTemplate = ({ B, C }) =>
    {
        const A = new Type();
        A.FromToken(B);
        A.templateParameter = C.Copy();
        return A;
    };
    const withSamples = ({ B, C, D }) =>
    {
        const A = withTemplate({ B, C });
        A.templateSamples = ParseNumber(D.stringValue);
        return A;
    };
    const withNoSamples = ({ B, C }) =>
    {
        const A = withTemplate({ B, C });
        A.templateSamples = -1;
        return A;
    };
    const depth = (builtInType, templated) => ({ B, C }) =>
    {
        const A = new Type();
        A.FromToken(B);
        A.builtInType = builtInType;
        A.isDepthTexture = true;
        if (templated)
        {
            A.templateParameter = C.Copy();
        }
        return A;
    };
    const plain = token => [`type_specifier(A) ::= ${token}(B).`, fromToken];
    const templated = token => [`type_specifier(A) ::= ${token}(B) OP_LESS type_specifier(C) OP_MORE.`, withTemplate];

    return [
        plain("OP_VOID"),
        ["type_specifier(A) ::= constructor_identifier(B).", fromToken],
        plain("OP_SAMPLER"),
        plain("OP_SAMPLERCOMPARISON"),
        plain("OP_SAMPLER1D"),
        plain("OP_SAMPLER2D"),
        plain("OP_SAMPLER3D"),
        plain("OP_SAMPLERCUBE"),
        plain("OP_TEXTURE"),
        ...TEMPLATED_TYPES.flatMap(token => [templated(token), plain(token)]),
        ["type_specifier(A) ::= OP_DEPTHTEXTURE2D(B) OP_LESS type_specifier(C) OP_MORE.", depth(T.OP_TEXTURE2D, true)],
        ["type_specifier(A) ::= OP_DEPTHTEXTURE2D(B).", depth(T.OP_TEXTURE2D, false)],
        ["type_specifier(A) ::= OP_DEPTHTEXTURE2DARRAY(B) OP_LESS type_specifier(C) OP_MORE.", depth(T.OP_TEXTURE2DARRAY, true)],
        ["type_specifier(A) ::= OP_DEPTHTEXTURE2DARRAY(B).", depth(T.OP_TEXTURE2DARRAY, false)],
        templated("OP_TEXTURE3D"),
        plain("OP_TEXTURE3D"),
        templated("OP_TEXTURE3DARRAY"),
        plain("OP_TEXTURE3DARRAY"),
        templated("OP_TEXTURECUBE"),
        plain("OP_TEXTURECUBE"),
        templated("OP_TEXTURECUBEARRAY"),
        plain("OP_TEXTURECUBEARRAY"),
        ["type_specifier(A) ::= OP_TEXTURE2DMS(B) OP_LESS type_specifier(C) OP_COMA OP_INT_CONST(D) OP_MORE.", withSamples],
        ["type_specifier(A) ::= OP_TEXTURE2DMS(B) OP_LESS type_specifier(C) OP_MORE.", withNoSamples],
        ["type_specifier(A) ::= OP_TEXTURE2DMSARRAY(B) OP_LESS type_specifier(C) OP_COMA OP_INT_CONST(D) OP_MORE.", withSamples],
        ["type_specifier(A) ::= OP_TEXTURE2DMSARRAY(B) OP_LESS type_specifier(C) OP_MORE.", withNoSamples],
        templated("OP_BUFFER"),
        templated("OP_APPENDSTRUCTUREDBUFFER"),
        plain("OP_BYTEADDRESSBUFFER"),
        templated("OP_CONSUMESTRUCTUREDBUFFER"),
        ["type_specifier(A) ::= OP_INPUTPATCH(B) OP_LESS type_specifier(C) OP_COMA OP_INT_CONST(D) OP_MORE.", withSamples],
        ["type_specifier(A) ::= OP_OUTPUTPATCH(B) OP_LESS type_specifier(C) OP_COMA OP_INT_CONST(D) OP_MORE.", withSamples],
        templated("OP_RWBUFFER"),
        plain("OP_RWBYTEADDRESSBUFFER"),
        templated("OP_RWSTRUCTUREDBUFFER"),
        templated("OP_RWTEXTURE1D"),
        templated("OP_RWTEXTURE2D"),
        templated("OP_RWTEXTURE3D"),
        templated("OP_RWTEXTURE1DARRAY"),
        templated("OP_RWTEXTURE2DARRAY"),
        templated("OP_RWTEXTURE3DARRAY"),
        templated("OP_STRUCTUREDBUFFER"),
        templated("OP_POINTSTREAM"),
        templated("OP_LINESTREAM"),
        templated("OP_TRIANGLESTREAM"),
        plain("OP_BINDLESSHANDLETEXTURE2D"),
        plain("OP_BINDLESSHANDLESAMPLER"),
        plain("OP_BINDLESSHANDLETEXTURE3D"),
        plain("OP_BINDLESSHANDLETEXTURECUBE"),
        plain("OP_RAYTRACING_ACCELERATION_STRUCTURE"),
        plain("OP_RAY_DESC"),
        ["type_specifier(A) ::= OP_TYPE_NAME(B).", ({ B }, ps) =>
        {
            const symbol = ps.GetSymbolTable().LookupType(B.stringValue);
            const A = new Type();
            A.FromSymbol(symbol);
            return A;
        }],
        ["type_specifier(A) ::= struct_specifier(B).", ({ B }, ps) =>
        {
            ps.AddOfflineStatement(B);
            return B.GetType().Copy();
        }],
        ["type_specifier(A) ::= struct_named_specifier(B).", ({ B }, ps) =>
        {
            ps.AddOfflineStatement(B);
            return B.GetType().Copy();
        }]
    ];
}

let tables = null;

/**
 * Carbon's generated HLSL parser: lemon's `ParseAlloc` and `Parse` over
 * `HLSLParser.y`.
 */
export class HLSLParser
{
    /**
     * The grammar's tables, built on first use and checked against lemon's
     * token numbering for Carbon's grammar.
     *
     * @returns {CjsFxLemon} The tables.
     */
    static getTables()
    {
        if (tables === null)
        {
            tables = new CjsFxLemon({
                name: "HLSLParser",
                rules,
                stackSize: 2000,
                syntaxError: (major, minor, ps) =>
                {
                    if (minor.type === 0)
                    {
                        ps.ShowMessage(ParserState.ErrorCode.EC_UNEXPECTED_EOF);
                    }
                    else
                    {
                        ps.ShowMessage__Token(minor, ParserState.ErrorCode.EC_SYNTAX_ERROR, minor.stringValue.ToString());
                    }
                },
                stackOverflow: ps =>
                {
                    ps.ShowMessage(ParserState.ErrorCode.EC_CUSTOM_ERROR, "Compiler stack overflow :/");
                }
            });
            const tokens = tables.GetTokens();
            for (const [name, value] of Object.entries(HLSLParserTokens))
            {
                if (tokens[name] !== value)
                {
                    throw new Error(`HLSLParser: token ${name} is ${tokens[name]} here and ${value} in lemon's header`);
                }
            }
        }
        return tables;
    }

    /**
     * Lemon's `ParseAlloc`.
     *
     * @param {import("./ParserState/ParserState.js").ParserState} parserState The extra argument.
     * @returns {import("./lemon/CjsFxLemonParser.js").CjsFxLemonParser} A parser.
     */
    static parseAlloc(parserState)
    {
        return HLSLParser.getTables().CreateParser(parserState);
    }

    /**
     * The grammar's rules, in Carbon's order, as `[lemon text, action]`.
     *
     * @returns {Array<[string, Function]>} The rules.
     */
    static getRules()
    {
        return rules;
    }
}

CjsSchema.meta.define("HLSLParser")(HLSLParser);
