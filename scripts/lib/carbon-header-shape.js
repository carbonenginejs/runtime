import { parse } from "@babel/parser";

/** Remove comments and string contents without moving source offsets. */
export function maskCpp(source)
{
    return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
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
    const pattern = /^(?:(class|struct)\s+(\w+)|BLUE_(CLASS|INTERFACE)\s*\(\s*(\w+)\s*\))/gm;
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
        const field = fields.get(nativeName) ?? fields.get(nativeName.replace(/^m_/, ""));
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
