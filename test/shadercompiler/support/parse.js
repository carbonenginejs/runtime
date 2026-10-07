import { ParserState, InlineString, CachingIncludeHandler, CompileMessageQueue, ASTNode } from "../../../src/shadercompiler/index.js";

/**
 * A ParserState over `source`, set up as Carbon's callers do: the buffer
 * starts with a newline that the state reads first.
 *
 * @param {string} source HLSL/FX text.
 * @param {Record<string, string>} [files={}] Includable files by path.
 * @returns {ParserState} The state.
 */
export function createState(source, files = {})
{
    const text = "\n" + source;
    const includeHandler = new CachingIncludeHandler(path => (Object.hasOwn(files, path) ? files[path] : null));
    return new ParserState(InlineString.makeInlineString__StartEnd({ text }, 1, text.length), { includeHandler, messages: new CompileMessageQueue() });
}

/**
 * Parses `source`.
 *
 * @param {string} source HLSL/FX text.
 * @param {Record<string, string>} [files={}] Includable files by path.
 * @returns {{ state: ParserState, ok: boolean, messages: string[] }} The result.
 */
export function parse(source, files = {})
{
    const state = createState(source, files);
    const ok = state.Parse();
    return { state, ok, messages: state._messages.GetMessages() };
}

/**
 * The token texts the preprocessor yields for `source`, macros expanded and
 * inactive blocks skipped, as `ParserState.Parse` would see them.
 *
 * @param {string} source HLSL text.
 * @param {Record<string, string>} [files={}] Includable files by path.
 * @returns {{ tokens: string[], state: ParserState, result: number }} The tokens, the state and the last scan result.
 */
export function preprocess(source, files = {})
{
    const state = createState(source, files);
    const tokens = [];
    let result;
    while (true)
    {
        const token = { type: 0, string: null, fileLocation: null };
        result = state.GetPreprocessorToken(token);
        if (result === 1)
        {
            if (state._fileStack.length > 1)
            {
                state._fileStack.pop();
                continue;
            }
            break;
        }
        if (result === 0)
        {
            break;
        }
        tokens.push(token.string.ToString());
    }
    return { tokens, state, result };
}

const NAMES = Object.fromEntries(Object.entries(ASTNode.ASTNodeType).map(([name, value]) => [value, name]));

/**
 * A compact text form of a syntax tree, for assertions.
 *
 * @param {import("../../../src/shadercompiler/index.js").ASTNode|null} node The root.
 * @returns {string} One line per node, indented by depth.
 */
export function dumpTree(node)
{
    const lines = [];
    const walk = (n, depth) =>
    {
        if (!n)
        {
            lines.push(`${"  ".repeat(depth)}null`);
            return;
        }
        const token = n.GetToken();
        const symbol = n.GetSymbol();
        lines.push(`${"  ".repeat(depth)}${NAMES[n.GetNodeType()]}${token ? ` '${token.stringValue.ToString()}'` : ""}${symbol ? ` #${symbol.name.ToString()}` : ""} : ${n.GetType().ToString()}`);
        for (const child of n.GetChildren())
        {
            walk(child, depth + 1);
        }
    };
    walk(node, 0);
    return lines.join("\n");
}
