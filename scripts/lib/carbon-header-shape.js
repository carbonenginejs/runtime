import { parse } from "@babel/parser";

/**
 * Remove comments and string contents without moving source offsets. An escape
 * takes any next character, line breaks included: a string continued with a
 * trailing backslash (EveCamera.h:6-11) must not end the literal early.
 */
export function maskCpp(source)
{
    return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g,
        value => value.replace(/[^\r\n]/g, " "));
}

/** Find the closing delimiter of a balanced expression, or fail visibly. */
export function closing(source, start, open = "{", close = "}")
{
    let depth = 0;
    for (let i = start; i < source.length; i++)
    {
        if (source[i] === open) depth++;
        if (source[i] === close && --depth === 0) return i;
    }
    throw new Error(`Unbalanced ${open} at offset ${start}`);
}

/** Column-zero definitions, including Blue macros; never forward or nested types. */
export function headerTypes(source)
{
    const masked = maskCpp(source);
    const result = [];
    // The optional ALL-CAPS group is a DLL export or vtable macro - BLUEIMPORT,
    // CARBON_CORE_API, BLUE_NOVTABLE, API - which sits between the keyword and
    // the real name. Without it `class BLUEIMPORT BlueScriptCallback` indexes a
    // class called BLUEIMPORT. It is optional and the name group is greedy, so
    // an all-caps CLASS name like `class PDB` still resolves: there is no second
    // word for the name group to take, and the macro group backtracks away.
    const pattern = /^(?:(class|struct)\s+(?:[A-Z][A-Z0-9_]{2,}\s+)?(\w+)|BLUE_(CLASS|INTERFACE)\s*\(\s*(\w+)\s*\))/gm;
    const scopes = [];
    const braces = masked.matchAll(/\bnamespace(?:\s+\w+(?:::\w+)*)?\s*\{|[{}]/g);
    let token = braces.next();
    for (const match of masked.matchAll(pattern))
    {
        while (!token.done && token.value.index < match.index)
        {
            const value = token.value[0];
            if (value === "}") scopes.pop();
            else scopes.push(value.startsWith("namespace") ? value.replace(/^namespace\s*|\s*\{$/g, "").trim() : null);
            token = braces.next();
        }
        if (scopes.includes(null)) continue;
        const tail = masked.slice(match.index + match[0].length);
        // A specialization is not a distinct class identity in JavaScript.
        if (/^\s*(?:[;<]|::)/.test(tail)) continue;
        const brace = masked.indexOf("{", match.index + match[0].length);
        const semi = masked.indexOf(";", match.index + match[0].length);
        if (brace === -1 || (semi !== -1 && semi < brace)) continue;
        const end = closing(masked, brace);
        const name = match[2] ?? match[4];
        result.push({ name, qualifiedName: [ ...scopes.filter(Boolean), name ].join("::"), kind: match[1] ?? match[3].toLowerCase(),
            line: source.slice(0, match.index).split("\n").length,
            body: source.slice(brace + 1, end), start: brace + 1, end });
    }
    return result;
}

/**
 * Module provenance comments may appear between imports and the first runtime
 * declaration. Parse comments so strings and method-body citations cannot turn
 * into module authority, and an inserted import cannot silently hide a donor.
 */
export function jsProvenance(source)
{
    const ast = parse(source, { sourceType: "module", plugins: [ [ "decorators", { version: "2023-11" } ] ] });
    const firstDeclaration = ast.program.body.find(node => node.type !== "ImportDeclaration");
    const end = firstDeclaration?.start ?? source.length;
    return ast.comments.filter(comment => comment.type === "CommentLine" && comment.end <= end)
        .map(comment => `//${comment.value}`).join("\n");
}

/** Parse the actual JS declarations, including decorated source. */
export function jsClasses(source)
{
    return parse(source, { sourceType: "module", plugins: [ [ "decorators", { version: "2023-11" } ] ] })
        .program.body.map(node => node.declaration ?? node).filter(node => node.type === "ClassDeclaration");
}

/** Split comma-separated constructor arguments without splitting nested calls. */
export function splitArguments(source)
{
    const values = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < source.length; i++)
    {
        if ("([{<".includes(source[i])) depth++;
        if (")]}>".includes(source[i])) depth--;
        if (source[i] === "," && depth === 0)
        {
            values.push(source.slice(start, i).trim());
            start = i + 1;
        }
    }
    if (source.slice(start).trim()) values.push(source.slice(start).trim());
    return values;
}

/** Read inline member defaults and the zero-argument constructor's initializer list.
 * Parameterized overloads and constructor-body assignments are never merged in.
 */
export function structDefaults(type)
{
    const body = maskCpp(type.body);
    const defaults = new Map();
    const unchecked = [];
    let depth = 0;
    let cursor = 0;
    for (const match of body.matchAll(/\b(\w+)\s*=\s*([^;{}]+);/g))
    {
        for (; cursor < match.index; cursor++)
        {
            if (body[cursor] === "{") depth++;
            if (body[cursor] === "}") depth--;
        }
        if (depth === 0) defaults.set(match[1], match[2].trim());
    }
    const constructor = [ ...body.matchAll(new RegExp(`\\b${type.name}\\s*\\(\\s*\\)\\s*(:|\\{)`, "g")) ]
        .find(match => !body.slice(0, match.index).trimEnd().endsWith("~"));
    if (constructor)
    {
        let pos = constructor.index + constructor[0].length;
        while (constructor[1] === ":" && pos < body.length)
        {
            const member = /^\s*,?\s*(\w+)\s*\(/.exec(body.slice(pos));
            if (!member) break;
            const open = pos + member[0].length - 1;
            const end = closing(body, open, "(", ")");
            defaults.set(member[1], body.slice(open + 1, end).trim());
            pos = end + 1;
        }
        const brace = constructor[1] === "{" ? pos - 1 : body.indexOf("{", pos);
        if (brace !== -1)
        {
            const end = closing(body, brace);
            if (body.slice(brace + 1, end).trim()) unchecked.push("constructor body requires review");
        }
    }
    if (!defaults.size) unchecked.push("no supported inline default constructor or field initializer");
    return { defaults, unchecked };
}

/** Evaluate only a deliberately small literal vocabulary. Unknown is not equal. */
export function literalValue(expression, constants = {})
{
    const value = expression.trim();
    if (Object.hasOwn(constants, value)) return { known: true, value: constants[value] };
    if (value === "true" || value === "false") return { known: true, value: value === "true" };
    if (/^0x[\da-f]+[uUlL]*$/i.test(value)) return { known: true, value: Number(value.replace(/[uUlL]+$/, "")) };
    if (/^[+-]?0[0-7]+[uUlL]*$/.test(value)) return { known: true, value: parseInt(value.replace(/[uUlL]+$/, ""), 8) };
    if (/^[+-]?0\d+[uUlL]*$/.test(value)) return { known: false, expression: value };
    if (/^[+-]?\d+(?:\.\d*)?(?:e[+-]?\d+)?[fFuUlL]*$/i.test(value))
    {
        return { known: true, value: Number(value.replace(/[fFuUlL]+$/, "")) };
    }
    return { known: false, expression: value };
}

/** Compare only proven literals; expose unsupported or absent fields separately. */
export function compareDefaults(type, jsClass, cppConstants = {}, jsConstants = {})
{
    const { defaults, unchecked } = structDefaults(type);
    const checked = [];
    const mismatches = [];
    if (jsClass.body.body.some(node => node.kind === "constructor" && node.body.body.length)) unchecked.push("JS constructor body requires review");
    const fields = new Map(jsClass.body.body.filter(node => node.type === "ClassProperty" && !node.static && !node.computed)
        .map(node => [ node.key.name, node.value ]));
    for (const [ nativeName, expression ] of defaults)
    {
        // Public members drop `m_`; private and protected ones take `_` plus the name.
        const bare = nativeName.replace(/^m_/, "");
        const field = fields.get(nativeName) ?? fields.get(bare) ?? fields.get("_" + bare);
        const expected = literalValue(expression, cppConstants);
        let actual = { known: false };
        if (field?.type === "NumericLiteral" || field?.type === "BooleanLiteral") actual = { known: true, value: field.value };
        else if (field?.type === "UnaryExpression" && field.operator === "-" && field.argument.type === "NumericLiteral") actual = { known: true, value: -field.argument.value };
        else if (field?.type === "MemberExpression" && !field.computed) actual = literalValue(`${field.object.name}.${field.property.name}`, jsConstants);
        else if (field?.type === "Identifier") actual = literalValue(field.name, jsConstants);
        if (!expected.known || !actual.known)
        {
            unchecked.push(`${nativeName}: ${expression || "value initialization"}; JS ${field?.type ?? "no field initializer"}`);
            continue;
        }
        checked.push(nativeName);
        if (!Object.is(expected.value, actual.value)) mismatches.push(`${nativeName}: Carbon ${expected.value}, JS ${actual.value}`);
    }
    return { checked, mismatches, unchecked };
}

/**
 * Every named enum a header declares, with its members resolved to values.
 *
 * C++ enum semantics: the first member is 0, each unlabelled member is one more
 * than the last, and an explicit assignment resets the run. Members whose value
 * is an expression this does not evaluate are returned with a null value rather
 * than a guess, so a caller can tell "unknown" from "zero".
 *
 * Nested enums carry the type that encloses them, because a bare name is not an
 * identity: Carbon declares Status, Type, Result and Usage inside several
 * unrelated classes.
 */
export function headerEnums(source)
{
    const masked = maskCpp(source);
    const result = [];
    // Skip a forward declaration (`enum class X : uint8_t;`) - no brace, no members.
    const pattern = /\benum\s+(?:class\s+|struct\s+)?(\w+)\s*(?::\s*[\w:]+\s*)?\{/g;

    for (const match of masked.matchAll(pattern))
    {
        const open = masked.indexOf("{", match.index);
        const end = closing(masked, open);
        if (end === -1) continue;

        const line = masked.slice(0, match.index).split("\n").length;
        result.push({
            name: match[1],
            owner: enclosingType(masked, match.index),
            line,
            members: enumMembers(masked.slice(open + 1, end))
        });
    }
    return result;
}

/** The class or struct a declaration sits inside, or null at file scope. */
function enclosingType(masked, index)
{
    const stack = [];
    let last = 0;

    for (const token of masked.matchAll(/[{}]/g))
    {
        if (token.index >= index) break;

        if (token[0] === "}") { stack.pop(); last = token.index + 1; continue; }

        // Carbon writes `class Foo\n{`, so the name is behind the brace, not beside
        // it. An optional ALL-CAPS export macro may sit between the two.
        const between = masked.slice(last, token.index);
        const declared = between.match(/\b(?:class|struct)\s+(?:[A-Z][A-Z0-9_]{2,}\s+)?(\w+)[^;{]*$/)
            ?? between.match(/\bBLUE_(?:CLASS|INTERFACE)\s*\(\s*(\w+)\s*\)[^;{]*$/);
        stack.push(declared ? declared[1] : null);
        last = token.index + 1;
    }

    for (let i = stack.length - 1; i >= 0; i--) if (stack[i]) return stack[i];
    return null;
}

/** Resolve one enum body to an ordered name -> value map. */
function enumMembers(body)
{
    const members = new Map();
    let next = 0;

    for (const entry of body.split(","))
    {
        const text = entry.trim();
        if (!text) continue;

        const parsed = text.match(/^(\w+)\s*(?:=\s*([\s\S]+))?$/);
        if (!parsed) continue;

        if (parsed[2] === undefined)
        {
            members.set(parsed[1], next);
            if (next !== null) next += 1;
            continue;
        }

        const value = enumValue(parsed[2].trim(), members);
        members.set(parsed[1], value);
        next = value === null ? null : value + 1;
    }
    return members;
}

/** Decimal, hex, a shift, a previous member, or an OR of any of those. */
function enumValue(expression, members)
{
    const term = text =>
    {
        const value = text.trim();
        if (/^-?\d+$/.test(value)) return Number(value);
        if (/^0[xX][0-9a-fA-F]+$/.test(value)) return Number(value);
        if (/^-?\d+\s*<<\s*\d+$/.test(value))
        {
            const [ a, b ] = value.split("<<").map(part => Number(part.trim()));
            return a * (2 ** b);
        }
        if (members.has(value)) return members.get(value);
        return null;
    };

    let total = 0;
    for (const part of expression.split("|"))
    {
        const value = term(part);
        if (value === null) return null;
        total |= value;
    }
    return total < 0 ? total >>> 0 : total;
}

/**
 * Every declaration of the member function `name` in a class body from
 * headerTypes, with the access specifier and nested type it is declared under.
 *
 * The body is walked token by token: `{`/`}` open and close frames, a frame is a
 * type body when a `class`/`struct`/`union` head precedes its brace, and an
 * access label applies to the innermost type frame. A class body starts
 * `private`, a struct or union body `public`, as C++ defines. A name counts as a
 * declaration only directly inside a type frame at parenthesis depth 0, so calls
 * in inline bodies, default arguments and `X::name` / `obj.name` uses are not
 * declarations.
 *
 * @param {{ body: string, kind: string }} type A record from headerTypes.
 * @param {string} name The member function name.
 * @returns {{ access: string, nested: string|null, inline: boolean, pure: boolean }[]}
 *   `nested` is the enclosing nested type's name, or null for the class itself;
 *   `inline` is true when a body follows the declaration; `pure` for `= 0`.
 */
export function memberDeclarations(type, name)
{
    const body = maskCpp(type.body);
    const defaultAccess = kind => kind === "class" ? "private" : "public";
    const frames = [ { type: type.name ?? null, nested: null, access: defaultAccess(type.kind) } ];
    const escaped = name.replace(/[$()*+.?[\\]^{|}]/g, "\$&");
    const tokens = new RegExp(String.raw`[{}();]|\b(public|protected|private)\s*:(?!:)|\b(class|struct|union|enum)\s+(?:[A-Z][A-Z0-9_]{2,}\s+)?(\w+)|(?<![\w.>:~])(${escaped})\s*\(`, "g");
    const result = [];
    let parens = 0;
    let pendingType = null;
    for (const match of body.matchAll(tokens))
    {
        const top = frames[frames.length - 1];
        const token = match[0];
        if (match[1])
        {
            if (top.type !== null && parens === 0) top.access = match[1];
            continue;
        }
        if (match[2])
        {
            if (parens === 0) pendingType = match[2] === "enum" ? { kind: "enum", name: match[3] } : { kind: match[2], name: match[3] };
            continue;
        }
        if (match[4])
        {
            if (parens === 0 && top.type !== null)
            {
                const close = closing(body, match.index + token.length - 1, "(", ")");
                const tail = body.slice(close + 1).match(/^[^{;=]*?(?:([{;])|=\s*(0)\b|=)/);
                const inline = tail?.[1] === "{" || /^[^{;=]*:(?!:)/.test(body.slice(close + 1, close + 1 + (tail?.[0].length ?? 0)));
                result.push({ access: top.access, nested: top.nested, inline, pure: tail?.[2] === "0" });
            }
            parens++;
            pendingType = null;
            continue;
        }
        if (token === "(") { parens++; if (parens === 1) pendingType = null; continue; }
        if (token === ")") { parens = Math.max(0, parens - 1); continue; }
        if (token === ";") { if (parens === 0) pendingType = null; continue; }
        if (token === "{")
        {
            const opened = parens === 0 && pendingType && pendingType.kind !== "enum"
                ? { type: pendingType.name, nested: pendingType.name, access: defaultAccess(pendingType.kind) }
                : { type: null, nested: top.nested, access: top.access };
            frames.push(opened);
            pendingType = null;
            continue;
        }
        if (token === "}" && frames.length > 1) frames.pop();
    }
    return result;
}
