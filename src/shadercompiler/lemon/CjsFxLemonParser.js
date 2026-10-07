// Custom: the parse loop of LEMON's driver template, over tables built by CjsFxLemon.
//
// LEMON's driver template, lempar.c, by D. Richard Hipp (SQLite), carries
// this in place of a legal notice:
//
//   The author disclaims copyright to this source code.  In place of
//   a legal notice, here is a blessing:
//
//      May you do good and not evil.
//      May you find forgiveness for yourself and forgive others.
//      May you share freely, never taking more than you give.
//
// Reference: LEMON (public domain), lempar.c Parse, yy_find_shift_action,
// yy_shift, yy_reduce, yy_syntax_error, yy_parse_failed, yy_accept,
// yyStackOverflow. Line citations of lempar.c are to Carbon's copy in
// trinity/shadercompiler; Preprocessor.y is built with preprocessorLempar.c,
// which has the same lines. HLSLParser.y is built with the lemon package's own
// lempar.c (CMakeLists.txt:173); that 3.39.3 template moves the empty-rule
// stack check from yy_reduce into Parse's loop, still before the rule's
// action, and otherwise differs only under YYERRORSYMBOL, which neither
// grammar defines.

import { CjsFxLemon } from "./CjsFxLemon.js";

/**
 * One running parse: lemon's `yyParser`, created by `CjsFxLemon.CreateParser`.
 *
 * Feed tokens with {@link CjsFxLemonParser#Parse}, then token 0 to end the
 * input, as a lemon-generated parser is driven. Reductions run when the token
 * after them arrives, which is when lemon runs them; grammar actions that
 * change scanner state (scopes, the type-name table, modes) depend on it.
 *
 * A state's default reduce is taken for any terminal the state has no action
 * for, as lempar.c does (see {@link CjsFxLemon#FindShiftAction}). On a bad
 * token the parser therefore first reduces as far as the defaults lead and
 * only then reports the error, so reduce actions with side effects run before
 * the report, in the order Carbon runs them.
 *
 * Grammars without an `error` symbol recover as lemon does: the syntax error
 * is reported, the token is dropped, and further reports are suppressed until
 * three tokens have shifted. An error at the end of input fails the parse.
 */
export class CjsFxLemonParser
{
    /** @type {import("./CjsFxLemon.js").CjsFxLemon} The parse tables. */
    tables = null;

    /** @type {*} Lemon's `%extra_argument`. */
    extra = null;

    /** @type {Array<{ state: number, value: * }>} Lemon's `yystack`; entry 0 is the bottom, in state 0. */
    stack = [{ state: 0, value: null }];

    /** @type {number} Lemon's `yyerrcnt`, which starts at -1 (lempar.c:340). */
    errorCount = -1;

    /** @type {boolean} Custom: set on accept. Lemon reports acceptance only through `%parse_accept`, which neither grammar declares. */
    accepted = false;

    /** @type {boolean} Custom: set on a failed parse. Lemon reports failure only through `%parse_failure`, which neither grammar declares. */
    failed = false;

    /**
     * @param {import("./CjsFxLemon.js").CjsFxLemon} tables The parse tables.
     * @param {*} extra Lemon's `%extra_argument`, passed to every action.
     */
    constructor(tables, extra)
    {
        this.tables = tables;

        this.extra = extra;
    }

    /**
     * Lemon's `Parse` (lempar.c:895-1063): offers one token.
     *
     * @param {number} major Token number; 0 ends the input.
     * @param {*} minor The token's value.
     */
    Parse(major, minor)
    {
        const tables = this.tables;
        const endOfInput = major === 0;
        // lempar.c:931-1049. The loop ends when the token shifts or is dropped,
        // or when the stack is back at its bottom entry: an accept, a failed
        // parse and a stack overflow each pop it there.
        do
        {
            // lempar.c:933.
            const action = tables.FindShiftAction(this.stack[this.stack.length - 1].state, major);
            if (action < CjsFxLemon.error)
            {
                // lempar.c:934-936.
                this._Reduce(CjsFxLemon.reduceRule(action));
                continue;
            }
            if (action >= 0)
            {
                // lempar.c:937-942: the count drops even when the shift overflowed.
                this._Shift(action, minor);
                this.errorCount--;
                break;
            }
            // lempar.c:1035-1046: the recovery for a grammar without an error symbol.
            if (this.errorCount <= 0 && tables.syntaxError)
            {
                tables.syntaxError(major, minor, this.extra);
            }
            this.errorCount = 3;
            if (endOfInput)
            {
                this._ParseFailed();
                this.errorCount = -1;
            }
            break;
        }
        while (this.stack.length > 1);
    }

    /**
     * Lemon's `yy_shift` (lempar.c:647-684), including its stack-overflow
     * check (lempar.c:662-666): `yystackEnd` is the last of `%stack_size`
     * entries (lempar.c:346), the bottom one included.
     *
     * @param {number} state The state to push.
     * @param {*} value The value to push.
     */
    _Shift(state, value)
    {
        if (this.stack.length >= this.tables.stackSize)
        {
            this._StackOverflow();
            return;
        }
        this.stack.push({ state, value });
    }

    /**
     * Lemon's `yy_reduce` (lempar.c:710-805): runs the rule's action and
     * takes the goto. An accept or a stack overflow leaves only the bottom
     * entry on the stack, which ends {@link CjsFxLemonParser#Parse}'s loop.
     *
     * @param {number} ruleIndex The rule to reduce by.
     */
    _Reduce(ruleIndex)
    {
        const tables = this.tables;
        const rule = tables.rules[ruleIndex];
        const count = rule.rhs.length;
        // lempar.c:745-759: an empty rule pushes without popping, so the stack
        // must have room for one more entry before the rule's action runs. The
        // test is yy_shift's.
        if (count === 0 && this.stack.length >= tables.stackSize)
        {
            this._StackOverflow();
            return;
        }
        const base = this.stack.length - count;
        const values = {};
        for (let i = 0; i < count; ++i)
        {
            const alias = rule.aliases[i];
            if (alias !== null)
            {
                values[alias] = this.stack[base + i].value;
            }
        }
        const result = rule.action ? rule.action(values, this.extra) : null;
        this.stack.length = base;
        const target = tables.FindReduceAction(this.stack[base - 1].state, rule.lhs);
        if (target === CjsFxLemon.accept)
        {
            // Lemon pushes the accept and takes it on the loop's next pass
            // (lempar.c:943-947); nothing runs between.
            this._Accept();
            return;
        }
        this.stack.push({ state: target, value: rule.lhsAlias === null || result === undefined ? null : result });
    }

    /**
     * Lemon's `yy_accept` (lempar.c:853-874): pops the stack.
     */
    _Accept()
    {
        this.errorCount = -1;
        this.stack.length = 1;
        this.accepted = true;
    }

    /**
     * Lemon's `yy_parse_failed` (lempar.c:811-829): pops the stack. No
     * grammar here defines `%parse_failure`.
     */
    _ParseFailed()
    {
        this.stack.length = 1;
        this.failed = true;
    }

    /**
     * Lemon's `yyStackOverflow` (lempar.c:605-621): pops the stack and runs
     * `%stack_overflow`.
     */
    _StackOverflow()
    {
        this.stack.length = 1;
        if (this.tables.stackOverflow)
        {
            this.tables.stackOverflow(this.extra);
        }
    }
}
