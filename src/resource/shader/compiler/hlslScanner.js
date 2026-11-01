// Source: trinity/shadercompiler/HLSLScanner.re
//
// re2c compiles Carbon's scanner rules into a DFA that takes the longest match
// at the cursor and, between equally long matches, the rule written first.
// This module implements the same rule sets by hand, dispatching on the first
// character. Like the generated C, it reads the buffer past a range's end when
// a pattern continues (re2c runs with `yyfill` disabled), and treats the
// position past the buffer as the NUL that terminates a C buffer.

import { InlineString } from "./InlineString.js";
import { HLSLParserTokens } from "./hlslParserTokens.js";
import { PreprocessorToken } from "./ParserState/PreprocessorToken.js";
import { PreprocessorCondition } from "./ParserState/PreprocessorCondition.js";
import { PreprocessorDefine } from "./ParserState/PreprocessorDefine.js";
import { ParseNumber } from "./ParserUtils/parserUtils.js";
import { ParserState } from "./ParserState/ParserState.js";

const T = HLSLParserTokens;

const isSpaceChar = c => c === 32 || c === 9 || c === 11 || c === 12 || c === 13;
const isLetter = c => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;
const isDecimal = c => c >= 48 && c <= 57;
const isOctal = c => c >= 48 && c <= 55;
const isHex = c => isDecimal(c) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);

const MULTI_CHAR_OPERATORS = ["<<=", ">>=", "*=", "/=", "%=", "+=", "-=", "&=", "^=", "|=", "++", "--", "<<", ">>", "<=", ">=", "==", "!=", "&&", "||"];
const SINGLE_CHAR_OPERATORS = "+-!~*/%()[].,<>&^|?:=;{}";

/**
 * Increments the current line, as Carbon's `unsigned lineNumber++` (which
 * wraps after the `#line` defect below).
 *
 * @param {import("./ParserState/ParserState.js").ParserState} state The parse.
 */
function nextLine(state)
{
    const location = state.GetCurrentLocation();
    location.lineNumber = (location.lineNumber + 1) >>> 0;
}

/**
 * Length of `pattern` (a JavaScript sticky regex) at a buffer offset.
 *
 * @param {InlineString} at The buffer.
 * @param {number} offset Where to match.
 * @param {RegExp} pattern A regex with the `y` flag.
 * @returns {number} Matched length, or -1.
 */
function stickyLength(at, offset, pattern)
{
    pattern.lastIndex = offset;
    const match = pattern.exec(at.buffer.text);
    return match ? match[0].length : -1;
}

const STRING_PATTERN = /"(?:\\(?:[abfnrtv?'"\\]|x[0-9A-Fa-f]+|[0-7]+)|[^\n\\"])*"/uy;
const PP_PREFIX = /\n[ \t\v\f\r]*#[ \t]*/uy;
const PP_LINE_FILE = /line[ \t\v\f\r]+[0-9]+[ \t\v\f\r]+"(?:\\(?:[abfnrtv?'"\\]|x[0-9A-Fa-f]+|[0-7]+)|[^\n\\"])*"/uy;
const PP_LINE = /line[ \t\v\f\r]+[0-9]+/uy;
const PP_WITH_SPACE = { include: /include[ \t\v\f\r]+/uy, define: /define[ \t\v\f\r]+/uy, pragma: /pragma[ \t\v\f\r]+/uy };

/**
 * The longest integer literal at an offset: re2c's
 * `("0" [xX] HEX+ INT_SUFFIX?) | ("0" OCTAL+ INT_SUFFIX?) | (DECIMAL+ INT_SUFFIX?)`,
 * where `INT_SUFFIX` is `[uUlL]*`.
 *
 * @param {InlineString} at The buffer.
 * @param {number} p Offset.
 * @returns {number} Length, or -1.
 */
function matchInt(at, p)
{
    const suffix = q =>
    {
        while ("uUlL".includes(String.fromCharCode(at.CharAt(q))) && at.CharAt(q) !== 0)
        {
            ++q;
        }
        return q;
    };
    let best = -1;
    if (at.CharAt(p) === 48 && (at.CharAt(p + 1) | 32) === 120 && isHex(at.CharAt(p + 2)))
    {
        let q = p + 2;
        while (isHex(at.CharAt(q)))
        {
            ++q;
        }
        best = Math.max(best, suffix(q) - p);
    }
    if (at.CharAt(p) === 48 && isOctal(at.CharAt(p + 1)))
    {
        let q = p + 1;
        while (isOctal(at.CharAt(q)))
        {
            ++q;
        }
        best = Math.max(best, suffix(q) - p);
    }
    if (isDecimal(at.CharAt(p)))
    {
        let q = p;
        while (isDecimal(at.CharAt(q)))
        {
            ++q;
        }
        best = Math.max(best, suffix(q) - p);
    }
    return best;
}

/**
 * The longest floating-point literal at an offset: re2c's
 * `(DECIMAL+ EXPONENT FLOAT_SUFFIX?) | (DECIMAL* "." DECIMAL+ EXPONENT? FLOAT_SUFFIX?) | (DECIMAL+ "." DECIMAL* EXPONENT? FLOAT_SUFFIX?)`.
 *
 * @param {InlineString} at The buffer.
 * @param {number} p Offset.
 * @returns {number} Length, or -1.
 */
function matchFloat(at, p)
{
    const digits = q =>
    {
        while (isDecimal(at.CharAt(q)))
        {
            ++q;
        }
        return q;
    };
    const exponent = q =>
    {
        if ((at.CharAt(q) | 32) !== 101)
        {
            return -1;
        }
        let r = q + 1;
        if (at.CharAt(r) === 43 || at.CharAt(r) === 45)
        {
            ++r;
        }
        if (!isDecimal(at.CharAt(r)))
        {
            return -1;
        }
        return digits(r);
    };
    const floatSuffix = q => ("fFlL".includes(String.fromCharCode(at.CharAt(q))) && at.CharAt(q) !== 0 ? q + 1 : q);
    const tail = q =>
    {
        const e = exponent(q);
        return floatSuffix(e >= 0 ? e : q);
    };
    let best = -1;
    const intEnd = digits(p);
    if (intEnd > p)
    {
        const e = exponent(intEnd);
        if (e >= 0)
        {
            best = Math.max(best, floatSuffix(e) - p);
        }
        if (at.CharAt(intEnd) === 46)
        {
            best = Math.max(best, tail(digits(intEnd + 1)) - p);
        }
    }
    if (at.CharAt(intEnd) === 46 && isDecimal(at.CharAt(intEnd + 1)))
    {
        best = Math.max(best, tail(digits(intEnd + 1)) - p);
    }
    return best;
}

/**
 * The preprocessor directive at an offset holding a newline, if any: re2c's
 * `PP "<directive>" ...` rules, with `PP = "\n" SPACE* "#" [ \t]*`.
 *
 * @param {InlineString} at The buffer.
 * @param {number} p Offset of the newline.
 * @returns {{ kind: string, length: number }|null} The longest directive match.
 */
function matchDirective(at, p)
{
    const prefix = stickyLength(at, p, PP_PREFIX);
    if (prefix < 0)
    {
        return null;
    }
    const q = p + prefix;
    const text = at.buffer.text;
    let best = null;
    const offer = (kind, length) =>
    {
        if (length >= 0 && (best === null || prefix + length > best.length))
        {
            best = { kind, length: prefix + length };
        }
    };
    const word = w => (text.startsWith(w, q) ? w.length : -1);
    offer("include", stickyLength(at, q, PP_WITH_SPACE.include));
    offer("define", stickyLength(at, q, PP_WITH_SPACE.define));
    offer("if", word("if"));
    offer("ifdef", word("ifdef"));
    offer("ifndef", word("ifndef"));
    offer("elif", word("elif"));
    offer("else", word("else"));
    offer("endif", word("endif"));
    offer("error", word("error"));
    offer("lineFile", stickyLength(at, q, PP_LINE_FILE));
    offer("line", stickyLength(at, q, PP_LINE));
    offer("undef", word("undef"));
    offer("pragma", stickyLength(at, q, PP_WITH_SPACE.pragma));
    return best;
}

/**
 * The operator at an offset, longest first.
 *
 * @param {InlineString} at The buffer.
 * @param {number} p Offset.
 * @returns {number} Length, or -1.
 */
function matchOperator(at, p)
{
    const text = at.buffer.text;
    for (const op of MULTI_CHAR_OPERATORS)
    {
        if (text.startsWith(op, p))
        {
            return op.length;
        }
    }
    const c = at.CharAt(p);
    return c !== 0 && SINGLE_CHAR_OPERATORS.includes(String.fromCharCode(c)) ? 1 : -1;
}

/**
 * Carbon's `GetIncludePath`: the quoted or bracketed path after `#include`,
 * delimiters included.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} state The parse; its cursor advances past the path.
 * @param {{ path: InlineString|null }} out Receives the path's range.
 * @returns {boolean} Whether a closed path was found.
 */
function GetIncludePath(state, out)
{
    const code = state.GetStreamCode();
    const first = code.CharAt(state.GetStreamPosition());
    let local;
    if (first === 34)
    {
        local = true;
    }
    else if (first === 60)
    {
        local = false;
    }
    else
    {
        return false;
    }
    const start = state.GetStreamPosition();
    state.SetStreamPosition(start + 1);
    while (state.GetStreamPosition() < state.GetStreamEnd())
    {
        const c = code.CharAt(state.GetStreamPosition());
        if ((c === 34 && local) || (c === 62 && !local))
        {
            state.SetStreamPosition(state.GetStreamPosition() + 1);
            out.path = InlineString.makeInlineString__StartEnd(code.buffer, start, state.GetStreamPosition());
            return true;
        }
        state.SetStreamPosition(state.GetStreamPosition() + 1);
    }
    return false;
}

/**
 * Carbon's `ExpectToken`: the next preprocessor token, which must be of a type.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} state The parse.
 * @param {number} type The required `PreprocessorTokenType`.
 * @param {{ value: InlineString|null }} result Receives the token's range.
 * @returns {boolean} False after reporting an error.
 */
function ExpectToken(state, type, result)
{
    const token = new PreprocessorToken();
    const code = state.GetPreprocessorToken(token);
    if (code === ParserState.PreprocessorScanResult.PPSR_ERROR)
    {
        return false;
    }
    else if (code === ParserState.PreprocessorScanResult.PPSR_EOF)
    {
        state.ShowMessage(ParserState.ErrorCode.EC_UNEXPECTED_EOF);
        return false;
    }
    if (token.type !== type)
    {
        state.ShowMessage(ParserState.ErrorCode.EC_SYNTAX_ERROR, token.string.ToString());
        return false;
    }
    result.value = token.string;
    return true;
}

/**
 * Skips a directive's body to its newline, honouring backslash continuations,
 * as Carbon's `#define` handling does in both its branches.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} state The parse.
 */
function skipDefineBody(state)
{
    const code = state.GetStreamCode();
    let slash = false;
    for (; state.GetStreamPosition() < state.GetStreamEnd(); state.SetStreamPosition(state.GetStreamPosition() + 1))
    {
        const c = code.CharAt(state.GetStreamPosition());
        if (c === 92)
        {
            slash = true;
        }
        else if (isSpaceChar(c))
        {
            // keeps a pending backslash
        }
        else if (c === 10)
        {
            if (slash)
            {
                nextLine(state);
                slash = false;
            }
            else
            {
                return;
            }
        }
        else
        {
            slash = false;
        }
    }
}

/**
 * Advances the cursor to the next newline, not past it.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} state The parse.
 */
function skipToNewline(state)
{
    const code = state.GetStreamCode();
    while (state.GetStreamPosition() < state.GetStreamEnd() && code.CharAt(state.GetStreamPosition()) !== 10)
    {
        state.SetStreamPosition(state.GetStreamPosition() + 1);
    }
}

/**
 * Skips spaces before the name of an `#ifdef` or `#ifndef`.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} state The parse.
 * @returns {boolean} False after reporting a line that ends first.
 */
function skipToName(state)
{
    const code = state.GetStreamCode();
    while (state.GetStreamPosition() < state.GetStreamEnd())
    {
        const c = code.CharAt(state.GetStreamPosition());
        if (isSpaceChar(c))
        {
            state.SetStreamPosition(state.GetStreamPosition() + 1);
        }
        else if (c === 10)
        {
            state.ShowMessage(ParserState.ErrorCode.EC_UNEXPECTED_EOL);
            return false;
        }
        else
        {
            return true;
        }
    }
    return true;
}

/**
 * A new `PreprocessorCondition` nested in the current one.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} state The parse.
 * @returns {PreprocessorCondition} The condition, inheriting skip mode.
 */
function nestedCondition(state)
{
    const condition = new PreprocessorCondition();
    condition.inheridedSkipMode = false;
    if (state.prepocessorConditions.length !== 0)
    {
        condition.inheridedSkipMode = state.prepocessorConditions[state.prepocessorConditions.length - 1].skipMode;
    }
    return condition;
}

/**
 * Carbon's `GetPreprocessorToken( ParserState&, PreprocessorToken& )`: the
 * raw preprocessor scanner. It handles directives itself and returns the next
 * token of the current file or macro, or end of file when the cursor reaches
 * the end of the current range. Skipping inactive blocks and expanding macros
 * belong to `ParserState.GetPreprocessorToken`, which calls this.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} state The parse.
 * @param {PreprocessorToken} token Filled with the token.
 * @returns {number} A `PreprocessorScanResult` value.
 */
export function GetPreprocessorToken(state, token)
{
    const ret = (type, start) =>
    {
        token.type = type;
        token.string = InlineString.makeInlineString__StartEnd(state.GetStreamCode().buffer, start, state.GetStreamPosition());
        token.fileLocation = state.GetCurrentLocation().Copy();
        return ParserState.PreprocessorScanResult.PPSR_OK;
    };

    std: while (true)
    {
        while (state.GetStreamPosition() < state.GetStreamEnd())
        {
            const at = state.GetStreamCode();
            const start = state.GetStreamPosition();
            const c = at.CharAt(start);
            const advance = n => state.SetStreamPosition(start + n);

            if (isLetter(c))
            {
                let q = start + 1;
                while (isLetter(at.CharAt(q)) || isDecimal(at.CharAt(q)))
                {
                    ++q;
                }
                advance(q - start);
                return ret(ParserState.PreprocessorTokenType.PPT_ID, start);
            }
            if (isDecimal(c) || c === 46)
            {
                const intLength = matchInt(at, start);
                const floatLength = matchFloat(at, start);
                if (intLength >= 0 && intLength >= floatLength)
                {
                    advance(intLength);
                    return ret(ParserState.PreprocessorTokenType.PPT_INT_CONST, start);
                }
                if (floatLength >= 0)
                {
                    advance(floatLength);
                    return ret(ParserState.PreprocessorTokenType.PPT_FLOAT_CONST, start);
                }
            }
            if (c === 34)
            {
                const length = stickyLength(at, start, STRING_PATTERN);
                if (length >= 0)
                {
                    advance(length);
                    return ret(ParserState.PreprocessorTokenType.PPT_STRING_CONST, start);
                }
                advance(1);
                state.ShowMessage(ParserState.ErrorCode.EC_UNEXPECTED_CHARACTER, "\"");
                return ParserState.PreprocessorScanResult.PPSR_ERROR;
            }
            if (c === 47 && at.CharAt(start + 1) === 47)
            {
                advance(2);
                // cppComment: runs to the newline and leaves it for the next token.
                while (state.GetStreamPosition() < state.GetStreamEnd())
                {
                    const d = at.CharAt(state.GetStreamPosition());
                    if (d === 10)
                    {
                        state.newLine = true;
                        continue std;
                    }
                    if (d === 0)
                    {
                        return ParserState.PreprocessorScanResult.PPSR_EOF;
                    }
                    state.SetStreamPosition(state.GetStreamPosition() + 1);
                }
                return ParserState.PreprocessorScanResult.PPSR_EOF;
            }
            if (c === 47 && at.CharAt(start + 1) === 42)
            {
                advance(2);
                // comment: runs past "*/", counting lines.
                //
                // Quirk (HLSLScanner.re:745-759; Carbon known defect CE-90):
                // the loop stops at the end of the range being read. A comment
                // opened on a `#define`, `#if` or `#elif` line ends with that
                // range, and the rest of it is scanned as tokens:
                // `#define A 1 /* c` / `d */` / `A` gives `d * / 1`.
                while (state.GetStreamPosition() < state.GetStreamEnd())
                {
                    const p = state.GetStreamPosition();
                    const d = at.CharAt(p);
                    if (d === 42 && at.CharAt(p + 1) === 47)
                    {
                        state.SetStreamPosition(p + 2);
                        continue std;
                    }
                    if (d === 0)
                    {
                        state.SetStreamPosition(p + 1);
                        return ParserState.PreprocessorScanResult.PPSR_EOF;
                    }
                    if (d === 10)
                    {
                        nextLine(state);
                    }
                    state.SetStreamPosition(p + 1);
                }
                return ParserState.PreprocessorScanResult.PPSR_EOF;
            }
            if (c === 10)
            {
                const directive = matchDirective(at, start);
                if (directive)
                {
                    advance(directive.length);
                    const result = handleDirective(state, directive.kind);
                    if (result !== null)
                    {
                        return result;
                    }
                    continue;
                }
                advance(1);
                nextLine(state);
                state.newLine = true;
                continue;
            }
            if (isSpaceChar(c))
            {
                let q = start + 1;
                while (isSpaceChar(at.CharAt(q)))
                {
                    ++q;
                }
                advance(q - start);
                continue;
            }
            if (c === 92)
            {
                let q = start + 1;
                while (isSpaceChar(at.CharAt(q)))
                {
                    ++q;
                }
                if (at.CharAt(q) === 10)
                {
                    advance(q + 1 - start);
                    if (state.InMacro())
                    {
                        continue;
                    }
                    state.ShowMessage(ParserState.ErrorCode.EC_UNEXPECTED_CHARACTER, "\\");
                    return ParserState.PreprocessorScanResult.PPSR_ERROR;
                }
                advance(1);
                state.ShowMessage(ParserState.ErrorCode.EC_UNEXPECTED_CHARACTER, "\\");
                return ParserState.PreprocessorScanResult.PPSR_ERROR;
            }
            if (c === 35)
            {
                const next = at.CharAt(start + 1);
                advance(next === 35 || next === 64 ? 2 : 1);
                return ret(ParserState.PreprocessorTokenType.PPT_PP_OPERATOR, start);
            }
            if (c === 0)
            {
                advance(1);
                return ParserState.PreprocessorScanResult.PPSR_EOF;
            }
            const operatorLength = matchOperator(at, start);
            if (operatorLength > 0)
            {
                advance(operatorLength);
                return ret(ParserState.PreprocessorTokenType.PPT_OPERATOR, start);
            }
            advance(1);
            state.ShowMessage(ParserState.ErrorCode.EC_UNEXPECTED_CHARACTER, String.fromCharCode(c));
            return ParserState.PreprocessorScanResult.PPSR_ERROR;
        }
        return ParserState.PreprocessorScanResult.PPSR_EOF;
    }
}

/**
 * The bodies of Carbon's `PP "<directive>"` rules.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} state The parse, its cursor past the directive keyword.
 * @param {string} kind The directive.
 * @returns {number|null} A scan result to return, or null to keep scanning.
 */
function handleDirective(state, kind)
{
    nextLine(state);
    switch (kind)
    {
        case "include":
        {
            // Quirk (HLSLScanner.re:140-149; Carbon known defect CE-89): the
            // path is read and checked before the skip test, so a malformed
            // `#include` inside `#if 0` is still an error.
            const out = { path: null };
            if (!GetIncludePath(state, out))
            {
                state.ShowMessage(ParserState.ErrorCode.EC_INVALID_INCLUDE_PATH);
                return ParserState.PreprocessorScanResult.PPSR_ERROR;
            }
            if (!state.InSkipMode())
            {
                state.IncludeFile(out.path);
            }
            return null;
        }
        case "define":
        {
            if (state.InSkipMode())
            {
                skipDefineBody(state);
                return null;
            }
            const define = new PreprocessorDefine();
            define.location = state.GetCurrentLocation().Copy();
            const name = { value: null };
            const idToken = { value: null };
            state.expandMacros = false;
            if (!ExpectToken(state, ParserState.PreprocessorTokenType.PPT_ID, name))
            {
                state.expandMacros = true;
                return ParserState.PreprocessorScanResult.PPSR_ERROR;
            }
            // Bug (HLSLScanner.re:209-218; Carbon known defect CE-91): macros
            // are expanded again before the parameter list is read, so a
            // parameter named after a macro reads as its value:
            // `#define N 3` / `#define F(N) N` is a syntax error.
            state.expandMacros = true;
            if (state.GetStreamPosition() < state.GetStreamEnd() && state.GetStreamCode().CharAt(state.GetStreamPosition()) === 40)
            {
                state.SetStreamPosition(state.GetStreamPosition() + 1);
                while (true)
                {
                    if (!ExpectToken(state, ParserState.PreprocessorTokenType.PPT_ID, idToken))
                    {
                        return ParserState.PreprocessorScanResult.PPSR_ERROR;
                    }
                    define.parameters.push(idToken.value);
                    if (!ExpectToken(state, ParserState.PreprocessorTokenType.PPT_OPERATOR, idToken))
                    {
                        return ParserState.PreprocessorScanResult.PPSR_ERROR;
                    }
                    if (idToken.value.end - idToken.value.start !== 1)
                    {
                        state.ShowMessage(ParserState.ErrorCode.EC_SYNTAX_ERROR, idToken.value.ToString());
                        return ParserState.PreprocessorScanResult.PPSR_ERROR;
                    }
                    const separator = idToken.value.CharAt(idToken.value.start);
                    if (separator === 44)
                    {
                        continue;
                    }
                    if (separator === 41)
                    {
                        break;
                    }
                    state.ShowMessage(ParserState.ErrorCode.EC_SYNTAX_ERROR, idToken.value.ToString());
                    return ParserState.PreprocessorScanResult.PPSR_ERROR;
                }
            }
            const start = state.GetStreamPosition();
            skipDefineBody(state);
            define.value = InlineString.makeInlineString__StartEnd(state.GetStreamCode().buffer, start, state.GetStreamPosition());
            state.defines.set(name.value.ToString(), define);
            return null;
        }
        case "if":
        {
            const start = state.GetStreamPosition();
            skipToNewline(state);
            const condition = nestedCondition(state);
            if (condition.inheridedSkipMode)
            {
                condition.skipMode = true;
            }
            else
            {
                const result = { value: false };
                const code = state.EvaluatePreprocessorCondition(InlineString.makeInlineString__StartEnd(state.GetStreamCode().buffer, start, state.GetStreamPosition()), result);
                condition.skipMode = !result.value;
                if (code !== ParserState.PreprocessorScanResult.PPSR_OK)
                {
                    return code;
                }
            }
            condition.used = !condition.skipMode;
            condition.seenElse = false;
            state.prepocessorConditions.push(condition);
            return null;
        }
        case "ifdef":
        case "ifndef":
        {
            if (state.InSkipMode())
            {
                skipToNewline(state);
                const condition = new PreprocessorCondition();
                condition.inheridedSkipMode = true;
                condition.skipMode = true;
                condition.used = !condition.skipMode;
                condition.seenElse = false;
                state.prepocessorConditions.push(condition);
                return null;
            }
            if (!skipToName(state))
            {
                return ParserState.PreprocessorScanResult.PPSR_ERROR;
            }
            state.expandMacros = false;
            const name = { value: null };
            if (!ExpectToken(state, ParserState.PreprocessorTokenType.PPT_ID, name))
            {
                state.expandMacros = true;
                return ParserState.PreprocessorScanResult.PPSR_ERROR;
            }
            state.expandMacros = true;

            const condition = nestedCondition(state);
            if (condition.inheridedSkipMode)
            {
                condition.skipMode = true;
            }
            else
            {
                const defined = state.defines.has(name.value.ToString());
                condition.skipMode = kind === "ifdef" ? !defined : defined;
            }
            condition.used = !condition.skipMode;
            condition.seenElse = false;
            state.prepocessorConditions.push(condition);
            return null;
        }
        case "elif":
        {
            const start = state.GetStreamPosition();
            skipToNewline(state);
            if (state.prepocessorConditions.length === 0)
            {
                state.ShowMessage(ParserState.ErrorCode.EC_PREPROCESSOR_MISPLACED_ELIF);
                return ParserState.PreprocessorScanResult.PPSR_ERROR;
            }
            const condition = state.prepocessorConditions[state.prepocessorConditions.length - 1];
            // Quirk (HLSLScanner.re:480,521, Carbon known defect CE-63): nothing sets `seenElse`, so a
            // second #else or an #elif after #else is accepted.
            if (condition.seenElse)
            {
                state.ShowMessage(ParserState.ErrorCode.EC_PREPROCESSOR_MISPLACED_ELIF);
                return ParserState.PreprocessorScanResult.PPSR_ERROR;
            }
            else if (condition.used || condition.inheridedSkipMode)
            {
                condition.skipMode = true;
            }
            else
            {
                const result = { value: false };
                const code = state.EvaluatePreprocessorCondition(InlineString.makeInlineString__StartEnd(state.GetStreamCode().buffer, start, state.GetStreamPosition()), result);
                condition.skipMode = !result.value;
                if (code !== ParserState.PreprocessorScanResult.PPSR_OK)
                {
                    return code;
                }
                condition.used = !condition.skipMode;
            }
            return null;
        }
        case "else":
        {
            skipToNewline(state);
            if (state.prepocessorConditions.length === 0)
            {
                state.ShowMessage(ParserState.ErrorCode.EC_PREPROCESSOR_MISPLACED_ELSE);
                return ParserState.PreprocessorScanResult.PPSR_ERROR;
            }
            const condition = state.prepocessorConditions[state.prepocessorConditions.length - 1];
            if (condition.seenElse)
            {
                state.ShowMessage(ParserState.ErrorCode.EC_PREPROCESSOR_MISPLACED_ELSE);
                return ParserState.PreprocessorScanResult.PPSR_ERROR;
            }
            else if (condition.inheridedSkipMode)
            {
                condition.skipMode = true;
            }
            else
            {
                condition.skipMode = condition.used;
            }
            return null;
        }
        case "endif":
        {
            skipToNewline(state);
            if (state.prepocessorConditions.length === 0)
            {
                state.ShowMessage(ParserState.ErrorCode.EC_PREPROCESSOR_MISPLACED_ENDIF);
                return ParserState.PreprocessorScanResult.PPSR_ERROR;
            }
            state.prepocessorConditions.pop();
            return null;
        }
        case "error":
        {
            const start = state.GetStreamPosition();
            skipToNewline(state);
            if (!state.InSkipMode())
            {
                state.ShowMessage(ParserState.ErrorCode.EC_USER_ERROR, InlineString.makeInlineString__StartEnd(state.GetStreamCode().buffer, start, state.GetStreamPosition()).ToString());
                return ParserState.PreprocessorScanResult.PPSR_ERROR;
            }
            return null;
        }
        case "lineFile":
        {
            if (!state.InSkipMode())
            {
                // Bug (HLSLScanner.re:588, Carbon known defect CE-60): the space-skipping loop starts on
                // the opening quote, so the number is read from the space before
                // it, strtol finds no digits, and the line becomes 0 - 1 as an
                // unsigned value; the line after the directive is numbered 0.
                const at = state.GetStreamCode();
                const cursor = state.GetStreamPosition();
                let c = cursor - 2;
                while (at.CharAt(c) !== 34)
                {
                    --c;
                }
                state.GetCurrentLocation().fileName = InlineString.makeInlineString__StartEnd(at.buffer, c + 1, cursor - 1);
                while (isSpaceChar(at.CharAt(c)))
                {
                    --c;
                }
                const end = c;
                while (!isSpaceChar(at.CharAt(c)))
                {
                    --c;
                }
                state.GetCurrentLocation().lineNumber = (ParseNumber(InlineString.makeInlineString__StartEnd(at.buffer, c, end + 1)) - 1) >>> 0;
            }
            return null;
        }
        case "line":
        {
            if (!state.InSkipMode())
            {
                const at = state.GetStreamCode();
                const cursor = state.GetStreamPosition();
                let c = cursor - 1;
                while (!isSpaceChar(at.CharAt(c)))
                {
                    --c;
                }
                state.GetCurrentLocation().lineNumber = (ParseNumber(InlineString.makeInlineString__StartEnd(at.buffer, c, cursor)) - 1) >>> 0;
            }
            return null;
        }
        case "undef":
        {
            if (!state.InSkipMode())
            {
                const name = { value: null };
                state.expandMacros = false;
                if (!ExpectToken(state, ParserState.PreprocessorTokenType.PPT_ID, name))
                {
                    state.expandMacros = true;
                    return ParserState.PreprocessorScanResult.PPSR_ERROR;
                }
                state.expandMacros = true;
                state.defines.delete(name.value.ToString());
            }
            else
            {
                skipToNewline(state);
            }
            return null;
        }
        case "pragma":
        {
            const start = state.GetStreamPosition();
            skipToNewline(state);
            if (!state.InSkipMode())
            {
                state.AddPragma(InlineString.makeInlineString__StartEnd(state.GetStreamCode().buffer, start, state.GetStreamPosition()));
            }
            return null;
        }
    }
    return null;
}

/**
 * The keyword rules of `ConvertToScannerToken`, in rule order: a keyword
 * matching the whole identifier wins over the identifier rule. `fx` marks
 * rules that yield `OP_ID` in FX mode (inside pass and sampler-state blocks).
 */
const KEYWORDS = [
    ["void", T.OP_VOID, false],
    ["vector", T.OP_VECTOR, false],
    ["matrix", T.OP_MATRIX, false],
    ["sampler1D", T.OP_SAMPLER1D, true],
    ["sampler2D", T.OP_SAMPLER2D, true],
    ["sampler3D", T.OP_SAMPLER3D, true],
    ["samplerCUBE", T.OP_SAMPLERCUBE, true],
    ["sampler", T.OP_SAMPLER, true],
    ["SamplerState", T.OP_SAMPLER, true],
    ["SamplerComparisonState", T.OP_SAMPLERCOMPARISON, true],
    ["DepthTexture2D", T.OP_DEPTHTEXTURE2D, true],
    // Quirk (HLSLScanner.re:946, Carbon known defect CE-62): DepthTexture2DArray scans as OP_DEPTHTEXTURE2D.
    ["DepthTexture2DArray", T.OP_DEPTHTEXTURE2D, true],
    ["texture1D", T.OP_TEXTURE1D, true],
    ["Texture1D", T.OP_TEXTURE1D, true],
    ["texture2D", T.OP_TEXTURE2D, true],
    ["Texture2D", T.OP_TEXTURE2D, true],
    ["texture3D", T.OP_TEXTURE3D, true],
    ["Texture3D", T.OP_TEXTURE3D, true],
    ["TextureCube", T.OP_TEXTURECUBE, true],
    ["textureCUBE", T.OP_TEXTURECUBE, true],
    ["Texture1DArray", T.OP_TEXTURE1DARRAY, true],
    ["Texture2DArray", T.OP_TEXTURE2DARRAY, true],
    ["Texture3DArray", T.OP_TEXTURE3DARRAY, true],
    ["TextureCubeArray", T.OP_TEXTURECUBEARRAY, true],
    ["Texture2DMS", T.OP_TEXTURE2DMS, true],
    ["Texture2DMSArray", T.OP_TEXTURE2DMSARRAY, true],
    ["texture", T.OP_TEXTURE, true],
    ["Buffer", T.OP_BUFFER, true],
    ["AppendStructuredBuffer", T.OP_APPENDSTRUCTUREDBUFFER, true],
    ["ByteAddressBuffer", T.OP_BYTEADDRESSBUFFER, true],
    ["ConsumeStructuredBuffer", T.OP_CONSUMESTRUCTUREDBUFFER, true],
    ["InputPatch", T.OP_INPUTPATCH, true],
    ["OutputPatch", T.OP_OUTPUTPATCH, true],
    ["BindlessHandleTexture2D", T.OP_BINDLESSHANDLETEXTURE2D, true],
    ["BindlessHandleTexture3D", T.OP_BINDLESSHANDLETEXTURE3D, true],
    ["BindlessHandleTextureCube", T.OP_BINDLESSHANDLETEXTURECUBE, true],
    ["BindlessHandleSampler", T.OP_BINDLESSHANDLESAMPLER, true],
    ["RaytracingAccelerationStructure", T.OP_RAYTRACING_ACCELERATION_STRUCTURE, false],
    ["RayDesc", T.OP_RAY_DESC, false],
    ["RWBuffer", T.OP_RWBUFFER, true],
    ["RWByteAddressBuffer", T.OP_RWBYTEADDRESSBUFFER, true],
    ["RWStructuredBuffer", T.OP_RWSTRUCTUREDBUFFER, true],
    ["RWTexture1D", T.OP_RWTEXTURE1D, true],
    ["RWTexture1DArray", T.OP_RWTEXTURE1DARRAY, true],
    ["RWTexture2D", T.OP_RWTEXTURE2D, true],
    ["RWTexture2DArray", T.OP_RWTEXTURE2DARRAY, true],
    ["RWTexture3D", T.OP_RWTEXTURE3D, true],
    ["RWTexture3DArray", T.OP_RWTEXTURE3DARRAY, true],
    ["StructuredBuffer", T.OP_STRUCTUREDBUFFER, true],
    ["PointStream", T.OP_POINTSTREAM, true],
    ["LineStream", T.OP_LINESTREAM, true],
    ["TriangleStream", T.OP_TRIANGLESTREAM, true],
    ["struct", T.OP_STRUCT, true],
    ["if", T.OP_IF, true],
    ["else", T.OP_ELSE, true],
    ["while", T.OP_WHILE, true],
    ["do", T.OP_DO, true],
    ["for", T.OP_FOR, true],
    ["continue", T.OP_CONTINUE, true],
    ["break", T.OP_BREAK, true],
    ["return", T.OP_RETURN, true],
    ["discard", T.OP_DISCARD, true],
    ["switch", T.OP_SWITCH, true],
    ["case", T.OP_CASE, true],
    ["default", T.OP_DEFAULT, true],
    ["technique", T.OP_TECHNIQUE, false],
    ["library", T.OP_LIBRARY, false],
    ["pass", T.OP_PASS, false],
    ["compile", T.OP_COMPILE, false],
    ["inout", T.OP_INOUT, true],
    ["in", T.OP_IN, true],
    ["out", T.OP_OUT, true],
    ["point", T.OP_POINT, true],
    ["line", T.OP_LINE, true],
    ["triangle", T.OP_TRIANGLE, true],
    ["lineadj", T.OP_LINEADJ, true],
    ["triangleadj", T.OP_TRIANGLEADJ, true],
    ["const", T.OP_CONST, false],
    ["row_major", T.OP_ROW_MAJOR, false],
    ["column_major", T.OP_COLUMN_MAJOR, false],
    ["extern", T.OP_EXTERN, true],
    ["nointerpolation", T.OP_NOINTERPOLATION, true],
    ["precise", T.OP_PRECISE, true],
    ["shared", T.OP_SHARED, true],
    ["groupshared", T.OP_GROUPSHARED, true],
    ["static", T.OP_STATIC, true],
    ["uniform", T.OP_UNIFORM, true],
    ["volatile", T.OP_VOLATILE, true],
    ["linear", T.OP_LINEAR, true],
    ["centroid", T.OP_CENTROID, true],
    ["noperspective", T.OP_NOPERSPECTIVE, true],
    ["packoffset", T.OP_PACKOFFSET, true],
    ["register", T.OP_REGISTER, true],
    ["sampler_state", T.OP_SAMPLER_STATE, true],
    ["cbuffer", T.OP_CBUFFER, true],
    ["tbuffer", T.OP_TBUFFER, true]
];
const KEYWORD_MAP = new Map(KEYWORDS.map(([word, type, fx]) => [word, { type, fx }]));

const NUMERIC_TYPES = new Map([
    ["float", T.OP_FLOAT], ["int", T.OP_INT], ["uint", T.OP_UINT], ["half", T.OP_HALF],
    ["double", T.OP_DOUBLE], ["bool", T.OP_BOOL], ["string", T.OP_STRING]
]);
const NUMERIC_PATTERN = /^(float|int|uint|half|double|bool|string)(?:([1-4])(?:x([1-4]))?)?$/u;

const OPERATOR_TOKENS = new Map([
    ["*=", T.OP_MUL_ASSIGN], ["/=", T.OP_DIV_ASSIGN], ["%=", T.OP_MOD_ASSIGN], ["+=", T.OP_ADD_ASSIGN], ["-=", T.OP_SUB_ASSIGN],
    ["<<=", T.OP_LEFT_ASSIGN], [">>=", T.OP_RIGHT_ASSIGN], ["&=", T.OP_AND_ASSIGN], ["^=", T.OP_XOR_ASSIGN], ["|=", T.OP_OR_ASSIGN],
    ["++", T.OP_INC_OP], ["--", T.OP_DEC_OP], ["<<", T.OP_LEFT_OP], [">>", T.OP_RIGHT_OP],
    ["<=", T.OP_LE_OP], [">=", T.OP_GE_OP], ["==", T.OP_EQ_OP], ["!=", T.OP_NE_OP], ["&&", T.OP_AND_OP], ["||", T.OP_OR_OP],
    ["+", T.OP_PLUS], ["-", T.OP_DASH], ["!", T.OP_BANG], ["~", T.OP_TILDE], ["*", T.OP_STAR], ["/", T.OP_SLASH],
    ["%", T.OP_PERCENT], ["(", T.OP_LEFT_PAREN], [")", T.OP_RIGHT_PAREN], ["[", T.OP_LEFT_BRACKET], ["]", T.OP_RIGHT_BRACKET],
    [".", T.OP_DOT], [",", T.OP_COMA], ["<", T.OP_LESS], [">", T.OP_MORE], ["&", T.OP_AMPERSAND], ["^", T.OP_CARET],
    ["|", T.OP_VERTICAL_BAR], ["?", T.OP_QUESTION], [":", T.OP_COLON], ["=", T.OP_EQUAL], [";", T.OP_SEMICOLON],
    ["{", T.OP_LEFT_BRACE], ["}", T.OP_RIGHT_BRACE]
]);

/**
 * Carbon's `ConvertToScannerToken`: classifies a preprocessor token for the
 * HLSL parser. Literals keep their kind. An identifier is a keyword when a
 * keyword rule matches all of it (a longer identifier is an identifier), a
 * type name when the symbol table says so, and `OP_ID` otherwise. In FX mode
 * most keywords read as `OP_ID`, so state names like `CullMode` and values like
 * `NONE` parse in pass blocks.
 *
 * @param {import("./ParserState/ParserState.js").ParserState} state The parse.
 * @param {PreprocessorToken} ppToken The preprocessor token.
 * @param {import("./ParserState/ScannerToken.js").ScannerToken} token Filled with the parser token.
 * @returns {boolean} False for `#`, `##` and `#@`, which the parser cannot take.
 */
export function ConvertToScannerToken(state, ppToken, token)
{
    const done = (type, intValue = 1) =>
    {
        token.type = type;
        token.intValue = intValue;
        token.stringValue = ppToken.string;
        token.fileLocation = ppToken.fileLocation;
        return true;
    };

    // Bug (HLSLScanner.re:799-806, Carbon known defect CE-61): literals return
    // before `intValue` is reset, keeping the previous token's value, because
    // ParserState reuses one ScannerToken. The `3` of `vector<float, 3>` then
    // carries the comma's 1, so the vector gets width 1. Callers must pass the
    // same reused token, as ParserState.Parse does.
    switch (ppToken.type)
    {
        case ParserState.PreprocessorTokenType.PPT_INT_CONST:
            return done(T.OP_INT_CONST, token.intValue);
        case ParserState.PreprocessorTokenType.PPT_FLOAT_CONST:
            return done(T.OP_FLOAT_CONST, token.intValue);
        case ParserState.PreprocessorTokenType.PPT_STRING_CONST:
            return done(T.OP_STRING_CONST, token.intValue);
        default:
            break;
    }

    // Carbon re-scans the token's text with re2c (HLSLScanner.re:809-1104):
    // the longest rule match from the start wins, the earlier rule on a tie,
    // and the match is not bounded by the token's end (no YYFILL). A token
    // from the preprocessor ends where a rule ends, so this only differs for
    // a `##` result, which keeps its first token's type unscanned: `return ## -`
    // reads as `return`, `float4 ## .` as `float4`. The type is decided by
    // the matched prefix; the token keeps its whole text.
    const range = ppToken.string;
    if (range.start >= range.end)
    {
        return false;
    }
    let text;
    if (isLetter(range.CharAt(range.start)))
    {
        let end = range.start + 1;
        while (isLetter(range.CharAt(end)) || isDecimal(range.CharAt(end)))
        {
            ++end;
        }
        text = range.buffer.text.slice(range.start, end);
    }
    else
    {
        for (let length = 3; length > 0; --length)
        {
            let candidate = "";
            for (let i = 0; i < length; ++i)
            {
                candidate += String.fromCharCode(range.CharAt(range.start + i));
            }
            if (candidate === "##" || candidate === "#@" || candidate === "#")
            {
                return false;
            }
            const operator = OPERATOR_TOKENS.get(candidate);
            if (operator !== undefined)
            {
                return done(operator);
            }
        }
        // No rule matches and the re2c block has no default rule, so
        // Carbon's control flow is undefined here.
        throw new Error(`ConvertToScannerToken: no rule matches "${range.ToString()}"`);
    }
    if (text === "true")
    {
        return done(T.OP_BOOL_CONST, 1);
    }
    if (text === "false")
    {
        return done(T.OP_BOOL_CONST, 0);
    }
    const numeric = NUMERIC_PATTERN.exec(text);
    if (numeric)
    {
        const type = NUMERIC_TYPES.get(numeric[1]);
        if (numeric[3] !== undefined)
        {
            return done(type, (Number(numeric[3]) << 8) | Number(numeric[2]));
        }
        if (numeric[2] !== undefined)
        {
            return done(type, Number(numeric[2]));
        }
        return done(type, 1);
    }
    const keyword = KEYWORD_MAP.get(text);
    if (keyword !== undefined)
    {
        return done(keyword.fx && state.mode === state.constructor.Mode.FX ? T.OP_ID : keyword.type);
    }
    const symbol = state.GetSymbolTable().LookupType(ppToken.string);
    if (symbol && symbol.isTypeName)
    {
        return done(T.OP_TYPE_NAME);
    }
    return done(T.OP_ID);
}

/**
 * Carbon's `PreprocessString`: the value of a (possibly concatenated) string
 * literal with C escapes resolved, for `globalinput`. `\u` and `\U` keep the
 * low byte, as Carbon's cast to `char` does.
 *
 * @param {InlineString} input The literal, quotes included.
 * @returns {string|null} The value, or null for a malformed escape or a newline.
 */
export function PreprocessString(input)
{
    const q = input.CharAt(input.start);
    let cur = input.start + 1;
    let out = "";
    const escapes = { a: 7, b: 8, f: 12, n: 10, r: 13, t: 9, v: 11, "\\": 92, "'": 39, "\"": 34, "?": 63 };
    while (cur < input.end)
    {
        while (true)
        {
            // Carbon's `[^\n\\]` rule also takes NUL, so with no closing
            // quote it reads on past the buffer's terminator, which is
            // undefined. A literal range only runs off its buffer when it was
            // concatenated across buffers (Carbon known defect CE-73).
            if (cur > input.buffer.text.length)
            {
                throw new RangeError("PreprocessString: the literal runs past the end of its buffer (Carbon known defect CE-73)");
            }
            const c = input.CharAt(cur);
            if (c !== 92)
            {
                if (c === 10)
                {
                    return null;
                }
                ++cur;
                if (c === q)
                {
                    break;
                }
                out += String.fromCharCode(c);
                continue;
            }
            const e = String.fromCharCode(input.CharAt(cur + 1));
            if (Object.hasOwn(escapes, e))
            {
                cur += 2;
                out += String.fromCharCode(escapes[e]);
                continue;
            }
            if (isOctal(input.CharAt(cur + 1)))
            {
                let end = cur + 1;
                while (end < cur + 4 && isOctal(input.CharAt(end)))
                {
                    ++end;
                }
                let v = 0;
                for (let s = cur + 1; s < end; ++s)
                {
                    v = (v * 8 + (input.CharAt(s) - 48)) >>> 0;
                }
                cur = end;
                out += String.fromCharCode(v & 0xff);
                continue;
            }
            const hexRun = (from, count) =>
            {
                for (let i = 0; i < count; ++i)
                {
                    if (!isHex(input.CharAt(from + i)))
                    {
                        return false;
                    }
                }
                return true;
            };
            if (e === "u" && hexRun(cur + 2, 4))
            {
                out += String.fromCharCode(parseInt(input.buffer.text.slice(cur + 2, cur + 6), 16) & 0xff);
                cur += 6;
                continue;
            }
            if (e === "U" && hexRun(cur + 2, 8))
            {
                out += String.fromCharCode(parseInt(input.buffer.text.slice(cur + 2, cur + 10), 16) & 0xff);
                cur += 10;
                continue;
            }
            if (e === "x" && isHex(input.CharAt(cur + 2)))
            {
                let end = cur + 2;
                let v = 0;
                while (isHex(input.CharAt(end)))
                {
                    const d = parseInt(String.fromCharCode(input.CharAt(end)), 16);
                    // lex_hex's adddgt: fails when the 32-bit unsigned long would overflow.
                    if (v > Math.floor((0xffffffff - d) / 16))
                    {
                        return null;
                    }
                    v = v * 16 + d;
                    ++end;
                }
                cur = end;
                out += String.fromCharCode(v & 0xff);
                continue;
            }
            return null;
        }
        while (cur !== input.end)
        {
            if (input.CharAt(cur) === q)
            {
                ++cur;
                break;
            }
            ++cur;
        }
    }
    return out;
}

/**
 * Carbon's `TokenizeGlobalInput`: `name; name; ...`.
 *
 * @param {InlineString} input The processed `globalinput` string.
 * @returns {InlineString[]|null} The names, or null when the list is malformed.
 */
export function TokenizeGlobalInput(input)
{
    const result = [];
    let cur = input.start;
    let expectID = true;
    while (cur < input.end)
    {
        const start = cur;
        const c = input.CharAt(cur);
        if (isSpaceChar(c))
        {
            ++cur;
            continue;
        }
        if (isLetter(c))
        {
            while (isLetter(input.CharAt(cur)) || isDecimal(input.CharAt(cur)))
            {
                ++cur;
            }
            if (!expectID)
            {
                return null;
            }
            expectID = false;
            result.push(InlineString.makeInlineString__StartEnd(input.buffer, start, cur));
            continue;
        }
        if (c === 59)
        {
            ++cur;
            if (expectID)
            {
                return null;
            }
            expectID = true;
            continue;
        }
        return null;
    }
    return result;
}

