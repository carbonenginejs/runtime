import { Alias, Document, Pair, Scalar, YAMLMap, YAMLSeq } from "yaml";

const TAG_FIELD = "$yamlTag";
const VALUE_FIELD = "$yamlValue";
const WIDTH = 80;

/**
 * Builds the yaml library Document PyYAML would have dumped from raw values: keys in Python 2's order, a collection of
 * scalars in flow style (`default_flow_style` None), the `!!python/` tags on their nodes, anchors named and numbered
 * as PyYAML's serializer names them (`id001`, in the order a node is met the second time), and floats as Python's
 * `repr` (a custom float tag). The yaml library writes it (`stringifyPyYaml`).
 *
 * Ours (no Carbon counterpart): the client's paper doll is Python.
 * @param {*} value Raw values, as the lossless read gives them (ints as bigints, tags as envelopes).
 * @param {{ defaultFlowStyle: ?boolean, sortKeys: boolean, floatDigits: ?number }} style The type's dump style.
 * @returns {Document} The document.
 */
export function createPyYamlDocument(value, style)
{
    const floatTag = {
        identify: item => typeof item === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^$/u,
        resolve: text => Number(text),
        stringify: ({ value: item }) => pythonFloat(item, style.floatDigits)
    };
    // Ahead of the core schema's tags, whose int tag would claim a whole float.
    const document = new Document(null, { customTags: tags => [ floatTag, ...tags ] });
    const nodes = new Map();
    const IsCollection = item =>
    {
        const inner = Untag(item).value;
        return inner !== null && typeof inner === "object";
    };
    const Build = item =>
    {
        if (nodes.has(item))
        {
            const node = nodes.get(item);
            if (!node.anchor) node.anchor = "id" + String(++Build.anchors).padStart(3, "0");
            return new Alias(node.anchor);
        }
        const { tag, value: inner } = Untag(item);
        let node;
        if (inner !== null && typeof inner === "object")
        {
            const items = Array.isArray(inner) ? inner : Object.values(inner);
            node = Array.isArray(inner) ? new YAMLSeq() : new YAMLMap();
            nodes.set(item, node);
            node.flow = items.length === 0 || (style.defaultFlowStyle === null && !items.some(IsCollection));
            if (Array.isArray(inner)) for (const child of inner) node.items.push(Build(child));
            else for (const [ key, child ] of Entries(inner, style.sortKeys)) node.items.push(new Pair(Key(key), Build(child)));
        }
        else
        {
            node = new Scalar(inner);
            // PyYAML never writes a tagged string plain.
            if (tag && typeof inner === "string") node.type = Scalar.QUOTE_SINGLE;
        }
        if (tag) node.tag = tag;
        return node;
    };
    Build.anchors = 0;
    document.contents = Build(value);
    return document;
}

/**
 * Writes a PyYAML document through the yaml library, then makes two layout choices of PyYAML's the library cannot:
 * a block sequence that is a mapping's value stays at the key's indent even when it carries an anchor
 * (`OutdentAnchoredSequences`), and lines break at a space only once they are past 80 columns (`write_plain`,
 * `write_single_quoted` and the flow items), so PyYAML's lines run one word past the width (`FoldLine`).
 * @param {Document} document The document (`createPyYamlDocument`).
 * @param {{ emptyNull: boolean, lineBreak: string }} style The type's dump style.
 * @param {function(Document, object): string} write The YAML writer (`CjsYamlFormat.write` with `input: "document"`).
 * @returns {string} YAML text.
 */
export function stringifyPyYaml(document, style, write)
{
    const text = write(document, {
        input: "document",
        stringify: { indent: 2, indentSeq: false, lineWidth: 0, flowCollectionPadding: false, singleQuote: true, nullStr: style.emptyNull ? "" : "null" }
    });
    return OutdentAnchoredSequences(text.split("\n")).map(FoldLine).join("\n").replaceAll("\n", style.lineBreak);
}

/**
 * Moves an anchored block sequence under a mapping key back to the key's indent: the yaml library indents it (`key:
 * &id001` then `  - item`) where PyYAML, as for any sequence value, does not.
 * @param {string[]} lines The written lines.
 * @returns {string[]} The lines.
 */
function OutdentAnchoredSequences(lines)
{
    const result = [];
    let shift = 0, keyIndent = -1;
    for (const line of lines)
    {
        const indent = line.length - line.trimStart().length;
        if (shift && line.trim() !== "" && indent <= keyIndent) shift = 0;
        result.push(shift ? line.slice(shift) : line);
        const anchored = /^(\s*(?:- )*)[^\s].*: &id\d+$/u.exec(line);
        const next = lines[result.length];
        if (!shift && anchored && next !== undefined)
        {
            keyIndent = anchored[1].length;
            const nextIndent = next.length - next.trimStart().length;
            if (next.trimStart().startsWith("- ") && nextIndent === keyIndent + 2) shift = 2;
        }
    }
    return result;
}

/**
 * Breaks one written line as PyYAML would: at a space after a flow item's comma, or between two words of a value,
 * once the column is past the width.
 * @param {string} line The line.
 * @returns {string} The line, broken where PyYAML breaks it.
 */
function FoldLine(line)
{
    if (line.length <= WIDTH) return line;
    const leader = /^(?:\s*- )*\s*/u.exec(line)[0], lead = leader.length;
    // A mapping entry's scalar continues one indent past the mapping; a flow collection that is a sequence item, at
    // the item; the root's, one indent in.
    const entry = /^(?:[\w$.-]+|'[^']*'):(?: |$)/u.test(line.slice(lead));
    const indent = " ".repeat(entry || !leader.includes("-") ? lead + 2 : lead);
    let result = "", column = 0, quoted = false, value = false;
    for (let i = 0; i < line.length; i++)
    {
        const character = line[i];
        if (character === "'" ) quoted = !quoted;
        if (!quoted && character === ":" && line[i + 1] === " ") value = true;
        if (character === " " && column > WIDTH && i > lead && BreakAt(line, i, quoted, value))
        {
            result += "\n" + indent;
            column = indent.length;
            continue;
        }
        result += character;
        column++;
    }
    return result;
}

/**
 * Whether PyYAML may break at a space: after a flow item's comma, or inside a value's scalar between two words (never
 * after a key's colon, a tag, an anchor or before a flow collection).
 * @param {string} line The line.
 * @param {number} i The space's index.
 * @param {boolean} quoted Whether it is inside a single-quoted scalar.
 * @param {boolean} value Whether a block mapping's value has begun.
 * @returns {boolean}
 */
function BreakAt(line, i, quoted, value)
{
    const before = line[i - 1], after = line[i + 1];
    if (after === " " || before === " " || after === undefined) return false;
    if (before === ",") return true;
    if (before === ":" || after === "[" || after === "{" || before === "-") return false;
    const token = line.slice(line.lastIndexOf(" ", i - 1) + 1, i);
    if (/^[!&*]/u.test(token)) return false;
    return quoted || value;
}

/**
 * A tag envelope's tag and value; a plain value has no tag.
 * @param {*} item A raw value.
 * @returns {{ tag: ?string, value: * }}
 */
function Untag(item)
{
    if (item && typeof item === "object" && !Array.isArray(item) && typeof item[TAG_FIELD] === "string") return { tag: item[TAG_FIELD], value: item[VALUE_FIELD] };
    return { tag: null, value: item };
}

/**
 * A mapping's entries in PyYAML's order: Python 2 sorts integer keys before strings, numerically. Unsorted, they keep
 * the mapping's order (a JS object lists integer keys first, ascending, as Python sorts them).
 * @param {object} mapping The mapping.
 * @param {boolean} sortKeys Whether to sort.
 * @returns {Array<[string, *]>}
 */
function Entries(mapping, sortKeys)
{
    if (!sortKeys) return Object.entries(mapping);
    const isInt = key => /^-?\d+$/u.test(key);
    return Object.entries(mapping).sort(([ a ], [ b ]) =>
    {
        if (isInt(a) !== isInt(b)) return isInt(a) ? -1 : 1;
        if (isInt(a)) return Number(a) - Number(b);
        return a < b ? -1 : a > b ? 1 : 0;
    });
}

/**
 * A mapping key as its node: an integer key is an int.
 * @param {string} key The key.
 * @returns {Scalar}
 */
function Key(key)
{
    return new Scalar(/^-?\d+$/u.test(key) ? BigInt(key) : key);
}

/**
 * A float as Python's `repr` (2.7's shortest form, or 2.6's `%.17g` with `digits` 17), then PyYAML's rule that an
 * exponent form gains `.0` (`1.0e-05`).
 * @param {number} value The float.
 * @param {?number} digits 17 for Python 2.6, null for 2.7.
 * @returns {string}
 */
export function pythonFloat(value, digits)
{
    if (Number.isNaN(value)) return ".nan";
    if (!Number.isFinite(value)) return value > 0 ? ".inf" : "-.inf";
    if (value === 0) return Object.is(value, -0) ? "-0.0" : "0.0";
    const [ mantissa, exponentText ] = (digits === null ? value.toExponential() : value.toExponential(digits - 1)).split("e");
    const exponent = Number(exponentText);
    const sign = mantissa.startsWith("-") ? "-" : "";
    const significant = mantissa.replace("-", "").replace(".", "").replace(/0+$/u, "") || "0";
    // Python switches to the exponent form below 1e-4 and, for the shortest form, from 1e16 (%.17g from 1e17).
    if (exponent < -4 || exponent >= (digits ?? 16))
    {
        const head = significant[0] + "." + (significant.length > 1 ? significant.slice(1) : "0");
        return sign + head + "e" + (exponent < 0 ? "-" : "+") + String(Math.abs(exponent)).padStart(2, "0");
    }
    const point = exponent + 1;
    if (point <= 0) return sign + "0." + "0".repeat(-point) + significant;
    if (point >= significant.length) return sign + significant + "0".repeat(point - significant.length) + ".0";
    return sign + significant.slice(0, point) + "." + significant.slice(point);
}
