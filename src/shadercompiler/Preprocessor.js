import { CjsSchema } from "#schema/CjsSchema";

// Source: trinity/shadercompiler/Preprocessor.y
//
// The `#if` / `#elif` expression grammar, rule for rule, with lemon's tables
// built by CjsFxLemon. Values are C `long`, 32 bits in Carbon's Windows build.

import { CjsFxLemon } from "./lemon/CjsFxLemon.js";
import { PreprocessorTokens } from "./preprocessorTokens.js";
import { ParseNumber } from "./ParserUtils/parserUtils.js";
import { ParserState } from "./ParserState/ParserState.js";

/**
 * C `long` division, which truncates.
 *
 * Bug (Preprocessor.y:138-146; Carbon known defect CE-84): nothing checks the
 * divisor. On Carbon's x64 Windows build `idiv` traps on zero and on
 * `LONG_MIN / -1`, and the compiler process faults; on arm64 the same
 * division gives 0. Both throw here.
 *
 * @param {number} b Dividend.
 * @param {number} d Divisor.
 * @returns {number} The quotient.
 */
function divide(b, d)
{
    if (d === 0 || (b === -2147483648 && d === -1))
    {
        throw new RangeError(`Preprocessor.y: ${b} / ${d} traps in an #if expression (Carbon known defect CE-84)`);
    }
    return Math.trunc(b / d) | 0;
}

/**
 * C `long` remainder, which takes the dividend's sign; traps as `divide` does.
 *
 * @param {number} b Dividend.
 * @param {number} d Divisor.
 * @returns {number} The remainder.
 */
function remainder(b, d)
{
    if (d === 0 || (b === -2147483648 && d === -1))
    {
        throw new RangeError(`Preprocessor.y: ${b} % ${d} traps in an #if expression (Carbon known defect CE-84)`);
    }
    return (b % d) | 0;
}

const rules = [
    ["in ::= expression(B).", ({ B }, parserState) =>
    {
        parserState.preprocessorConditionResult = B | 0;
    }],

    ["literal_constant(A) ::= PP_INT_CONST(B).", ({ B }) => ParseNumber(B.stringValue)],
    ["literal_constant(A) ::= PP_CHAR_CONST.", () => 1],

    ["id(A) ::= PP_ID(C).", ({ C }, parserState) =>
    {
        if (C.stringValue.Equals__Chars("defined"))
        {
            parserState.expandMacros = false;
        }
        return C;
    }],

    // Bug (Preprocessor.y:53-63; Carbon known defect CE-88): `defined` without
    // parentheses leaves A unassigned. A and C have different types, so lemon
    // writes A through its uninitialised `yylhsminor` local and the value is
    // indeterminate; that throws here.
    ["primary_expression(A) ::= id(C).", ({ C }, parserState) =>
    {
        if (C.stringValue.Equals__Chars("defined"))
        {
            parserState.expandMacros = false;
            throw new RangeError("Preprocessor.y: #if value of a bare 'defined' is uninitialised (Carbon known defect CE-88)");
        }
        return 0;
    }],
    ["primary_expression(A) ::= literal_constant(B).", ({ B }) => B],
    ["primary_expression(A) ::= PP_LEFT_PAREN expression(B) PP_RIGHT_PAREN.", ({ B }) => B],

    ["postfix_expression(A) ::= primary_expression(B).", ({ B }) => B],
    ["postfix_expression(A) ::= id(C) PP_LEFT_PAREN PP_ID(B) PP_RIGHT_PAREN.", ({ C, B }, parserState) =>
    {
        let A = 0;
        if (!C.stringValue.Equals__Chars("defined"))
        {
            // Bug (Preprocessor.y:81-99; Carbon known defect CE-88): after the
            // error A is unassigned, as for a bare `defined`. A parse fails on
            // the error, but permutation discovery would read the value.
            parserState.ShowMessage(ParserState.ErrorCode.EC_SYNTAX_ERROR, C.stringValue.ToString());
            throw new RangeError(`Preprocessor.y: #if value of '${C.stringValue.ToString()}(...)' is uninitialised (Carbon known defect CE-88)`);
        }
        else
        {
            A = parserState.defines.has(B.stringValue.ToString()) ? 1 : 0;
        }
        parserState.expandMacros = true;
        return A;
    }],

    ["unary_expression(A) ::= postfix_expression(B).", ({ B }) => B],
    ["unary_expression(A) ::= PP_PLUS unary_expression(C).", ({ C }) => C],
    ["unary_expression(A) ::= PP_DASH unary_expression(C).", ({ C }) => -C | 0],
    ["unary_expression(A) ::= PP_BANG unary_expression(C).", ({ C }) => (C ? 0 : 1)],
    ["unary_expression(A) ::= PP_TILDE unary_expression(C).", ({ C }) => ~C],

    ["multiplicative_expression(A) ::= unary_expression(B).", ({ B }) => B],
    ["multiplicative_expression(A) ::= multiplicative_expression(B) PP_STAR unary_expression(D).", ({ B, D }) => Math.imul(B, D)],
    ["multiplicative_expression(A) ::= multiplicative_expression(B) PP_SLASH unary_expression(D).", ({ B, D }) => divide(B, D)],
    ["multiplicative_expression(A) ::= multiplicative_expression(B) PP_PERCENT unary_expression(D).", ({ B, D }) => remainder(B, D)],

    ["additive_expression(A) ::= multiplicative_expression(B).", ({ B }) => B],
    ["additive_expression(A) ::= additive_expression(B) PP_PLUS multiplicative_expression(D).", ({ B, D }) => (B + D) | 0],
    ["additive_expression(A) ::= additive_expression(B) PP_DASH multiplicative_expression(D).", ({ B, D }) => (B - D) | 0],

    ["shift_expression(A) ::= additive_expression(B).", ({ B }) => B],
    ["shift_expression(A) ::= shift_expression(B) PP_LEFT_OP additive_expression(D).", ({ B, D }) => B << D],
    // Bug (Preprocessor.y, rule for PP_RIGHT_OP; Carbon known defect CE-57):
    // `>>` shifts left. Reproduced.
    ["shift_expression(A) ::= shift_expression(B) PP_RIGHT_OP additive_expression(D).", ({ B, D }) => B << D],

    ["relational_expression(A) ::= shift_expression(B).", ({ B }) => B],
    ["relational_expression(A) ::= relational_expression(B) PP_LESS shift_expression(D).", ({ B, D }) => (B < D ? 1 : 0)],
    ["relational_expression(A) ::= relational_expression(B) PP_MORE shift_expression(D).", ({ B, D }) => (B > D ? 1 : 0)],
    ["relational_expression(A) ::= relational_expression(B) PP_LE_OP shift_expression(D).", ({ B, D }) => (B <= D ? 1 : 0)],
    ["relational_expression(A) ::= relational_expression(B) PP_GE_OP shift_expression(D).", ({ B, D }) => (B >= D ? 1 : 0)],

    ["equality_expression(A) ::= relational_expression(B).", ({ B }) => B],
    ["equality_expression(A) ::= equality_expression(B) PP_EQ_OP relational_expression(D).", ({ B, D }) => (B === D ? 1 : 0)],
    ["equality_expression(A) ::= equality_expression(B) PP_NE_OP relational_expression(D).", ({ B, D }) => (B !== D ? 1 : 0)],

    ["and_expression(A) ::= equality_expression(B).", ({ B }) => B],
    ["and_expression(A) ::= and_expression(B) PP_AMPERSAND equality_expression(D).", ({ B, D }) => B & D],

    ["exclusive_or_expression(A) ::= and_expression(B).", ({ B }) => B],
    ["exclusive_or_expression(A) ::= exclusive_or_expression(B) PP_CARET and_expression(D).", ({ B, D }) => B ^ D],

    ["inclusive_or_expression(A) ::= exclusive_or_expression(B).", ({ B }) => B],
    ["inclusive_or_expression(A) ::= inclusive_or_expression(B) PP_VERTICAL_BAR exclusive_or_expression(D).", ({ B, D }) => B | D],

    ["logical_and_expression(A) ::= inclusive_or_expression(B).", ({ B }) => B],
    ["logical_and_expression(A) ::= logical_and_expression(B) PP_AND_OP inclusive_or_expression(D).", ({ B, D }) => (B && D ? 1 : 0)],

    ["logical_or_expression(A) ::= logical_and_expression(B).", ({ B }) => B],
    ["logical_or_expression(A) ::= logical_or_expression(B) PP_OR_OP logical_and_expression(D).", ({ B, D }) => (B || D ? 1 : 0)],

    ["conditional_expression(A) ::= logical_or_expression(B).", ({ B }) => B],
    ["conditional_expression(A) ::= logical_or_expression(B) PP_QUESTION expression(D) PP_COLON expression(E).", ({ B, D, E }) => (B ? D : E)],

    ["expression(A) ::= conditional_expression(B).", ({ B }) => B]
];

let tables = null;

/**
 * The parser for Carbon's `#if` expressions: lemon's generated
 * `PreprocessorParse*` functions over `Preprocessor.y`.
 */
export class Preprocessor
{
    /**
     * The grammar's tables, built on first use. They are checked against
     * lemon's token numbering.
     *
     * @returns {CjsFxLemon} The tables.
     */
    static getTables()
    {
        if (tables === null)
        {
            tables = new CjsFxLemon({
                name: "Preprocessor",
                rules,
                syntaxError: (major, minor, parserState) =>
                {
                    parserState.ShowMessage__Token(minor, ParserState.ErrorCode.EC_SYNTAX_ERROR, minor.stringValue.ToString());
                }
            });
            const tokens = tables.GetTokens();
            for (const [name, value] of Object.entries(PreprocessorTokens))
            {
                if (tokens[name] !== value)
                {
                    throw new Error(`Preprocessor: token ${name} is ${tokens[name]} here and ${value} in lemon's header`);
                }
            }
        }
        return tables;
    }

    /**
     * Lemon's `PreprocessorParseAlloc`.
     *
     * @param {import("./ParserState/ParserState.js").ParserState} parserState The extra argument.
     * @returns {import("./lemon/CjsFxLemonParser.js").CjsFxLemonParser} A parser.
     */
    static parseAlloc(parserState)
    {
        return Preprocessor.getTables().CreateParser(parserState);
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

CjsSchema.meta.define("Preprocessor")(Preprocessor);
