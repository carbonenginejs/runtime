// Do a MAP_PROPERTY row's Carbon getter and setter only read and write one member?
//
// A property exposed on a plain JavaScript field (decorator-upgrade.md § 00, "MAP_PROPERTY on our storage") is only faithful when
// Carbon's accessors do nothing but `return m_x;` and `m_x = value;`. Anything more (a conversion, a notification, a lock, a
// side effect) means the JavaScript field is not the property and the row stays out.
import fs from "node:fs";
import path from "node:path";

const carbonRoot = () => (process.env.CARBON_ROOT ?? "E:/carbonengine").replace(/\\/g, "/").replace(/\/$/, "");
const text = new Map();
const read = file => { if (!text.has(file)) text.set(file, fs.readFileSync(file, "utf8")); return text.get(file); };

/** Blank comments and string literals, keeping offsets. */
function mask(source)
{
    return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g, value => value.replace(/[^\r\n]/g, " "));
}

function closing(source, open)
{
    let depth = 0;
    for (let i = open; i < source.length; i++)
    {
        if (source[i] === "{") depth++;
        if (source[i] === "}" && --depth === 0) return i;
    }
    return -1;
}

let classFiles = null;
function files(dir, out = [])
{
    for (const e of fs.readdirSync(dir, { withFileTypes: true }))
    {
        const p = dir + "/" + e.name;
        if (e.isDirectory()) { if (e.name !== ".git") files(p, out); }
        else if (/\.(h|cpp|inl)$/.test(e.name)) out.push(p);
    }
    return out;
}
/** Every header that declares `cls`, found once by scanning the checkout. */
function headersOf(cls)
{
    if (!classFiles)
    {
        classFiles = new Map();
        const re = /\b(?:class|struct|BLUE_CLASS\s*\(|BLUE_INTERFACE\s*\()\s*(?:[A-Z][A-Z0-9_]{2,}\s+)?(\w+)\s*\)?\s*(?::|\{|\bfinal\b)/g;
        for (const f of files(carbonRoot()).filter(f => f.endsWith(".h")))
        {
            const m = mask(read(f));
            for (const hit of m.matchAll(re)) { if (!classFiles.has(hit[1])) classFiles.set(hit[1], new Set()); classFiles.get(hit[1]).add(f); }
        }
    }
    return [ ...(classFiles.get(cls) ?? []) ];
}

/** The parameter list and body of `fn` as defined inline in a header or out of line as `cls::fn` in a source beside it. */
function definition(cls, fn)
{
    const found = [];
    const candidates = new Set();
    for (const h of headersOf(cls))
    {
        candidates.add(h);
        const dir = path.dirname(h);
        for (const e of fs.readdirSync(dir)) if (/\.(cpp|inl)$/.test(e)) candidates.add(dir + "/" + e);
    }
    for (const file of candidates)
    {
        const source = read(file), m = mask(source);
        const patterns = file.endsWith(".h")
            ? [ new RegExp(`(?:^|[^\\w:.>~])${fn}\\s*\\(([^;{}]*)\\)\\s*(?:const\\s*)?(?:noexcept\\s*)?(?:override\\s*)?(?:final\\s*)?\\{`, "g") ]
            : [ new RegExp(`\\b${cls}::${fn}\\s*\\(([^;{}]*)\\)\\s*(?:const\\s*)?(?:noexcept\\s*)?\\{`, "g") ];
        for (const re of patterns) for (const hit of m.matchAll(re))
        {
            const open = hit.index + hit[0].length - 1, end = closing(m, open);
            if (end > 0) found.push({ file: path.relative(carbonRoot(), file).replace(/\\/g, "/"), params: hit[1].trim(), body: source.slice(open + 1, end).replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, " ") });
        }
    }
    return found;
}

const squash = body => body.replace(/\s+/g, "").replace(/\bconst\b/g, "").replace(/this->/g, "");

/**
 * @param {string} cls Carbon class name.
 * @param {string} getter C++ getter function.
 * @param {string|null} setter C++ setter function, null for a read-only property.
 * @returns {{ ok: boolean, member?: string, reasons: string[], getter?: string, setter?: string }}
 */
export function checkAccessorBodies(cls, getter, setter)
{
    const reasons = [];
    const g = definition(cls, getter);
    if (g.length !== 1) return { ok: false, reasons: [ g.length ? `getter ${getter} is defined ${g.length} times` : `getter ${getter} has no definition beside the class` ] };
    const gBody = squash(g[0].body);
    const gm = /^return(?:\*)?([A-Za-z_][\w.:]*(?:->[\w.:]+)*);$/.exec(gBody);
    if (!gm) reasons.push(`getter ${getter} does more than return one member: ${gBody.slice(0, 80)}`);
    else if (/^[A-Z][A-Z0-9_]*$/.test(gm[1].split(/[.:>-]+/).at(-1))) reasons.push(`getter ${getter} returns the constant ${gm[1]}, not a member`);
    const out = { ok: false, reasons, getter: gBody.slice(0, 120) };
    if (setter)
    {
        const s = definition(cls, setter);
        if (s.length !== 1) { reasons.push(s.length ? `setter ${setter} is defined ${s.length} times` : `setter ${setter} has no definition beside the class`); return out; }
        const sBody = squash(s[0].body);
        const param = (/(\w+)\s*(?:=[^,]*)?$/.exec(s[0].params.replace(/\s+/g, " ").trim()) ?? [])[1];
        const sm = new RegExp(`^([A-Za-z_][\\w.:]*(?:->[\\w.:]+)*)=(?:static_cast<[^>]+>\\()?(?:std::move\\()?${param}\\)?\\)?;$`).exec(sBody);
        out.setter = sBody.slice(0, 120);
        if (!param || !sm) reasons.push(`setter ${setter} does more than store its argument in one member: ${sBody.slice(0, 80)}`);
        else if (gm && sm[1] !== gm[1]) reasons.push(`getter reads ${gm[1]} but setter writes ${sm[1]}`);
    }
    if (gm) out.member = gm[1];
    out.ok = reasons.length === 0;
    return out;
}
