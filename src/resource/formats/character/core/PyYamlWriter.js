// Modelled on: PyYAML's Serializer and Emitter (yaml/serializer.py, yaml/emitter.py), the dumper the game's character
// files were written with. Only the subset those files use: block and flow collections, explicit tags, anchors for
// shared nodes, plain and single-quoted scalars.

const TAG_PREFIX = "tag:yaml.org,2002:";
const WIDTH = 80;
const INDENT = 2;

/**
 * Writes raw YAML values as PyYAML dumps them. Ints are bigints and floats are numbers (the YAML reader's
 * `intAsBigInt`), and tags are `{ tagField, valueField }` envelopes (`preservePythonTags`). Keys are sorted, a node
 * met twice is anchored (`id001`, numbered as PyYAML's serializer numbers them), and a float is written as Python's
 * `repr` (`1.0`, `1.0e-05`).
 *
 * Ours (no Carbon counterpart): the client's paper doll is Python.
 * @param {*} value Raw values.
 * @param {{ defaultFlowStyle?: ?boolean, lineBreak?: string, floatDigits?: ?number, sortKeys?: boolean, emptyNull?: boolean, tagField?: string, valueField?: string }} [options={}]
 *   PyYAML's `default_flow_style` (null writes a collection of scalars in flow style and the rest in block style; false
 *   writes every non-empty collection in block style) and `line_break` (`"\n"` by default); `floatDigits` 17 writes
 *   floats as Python 2.6's `repr` did (`%.17g`), null as Python 2.7's (the shortest); `sortKeys` false keeps the
 *   mappings' own order (true by default); `emptyNull` writes a block mapping's null value as nothing (`key:`)
 *   rather than `null`.
 * @returns {string} YAML text.
 */
export function writePyYaml(value, options = {})
{
    const writer = new PyYamlWriter(options);
    writer.Anchor(value);
    writer.Node(value, null, false, false);
    writer.Break();
    return writer.text;
}

/** One dump's state: the text, the cursor column and the anchors. */
class PyYamlWriter
{
    text = "";

    column = 0;

    /** Whether the last thing written is whitespace (PyYAML's `whitespace`). */
    whitespace = true;

    /** Whether the cursor is at a fresh indent (PyYAML's `indention`). */
    indention = true;

    indent = null;

    _indents = [];

    _seen = new Set();

    _anchors = new Map();

    _written = new Set();

    /**
     * @param {{ defaultFlowStyle?: ?boolean, lineBreak?: string, floatDigits?: ?number, sortKeys?: boolean, emptyNull?: boolean, tagField?: string, valueField?: string }} options The dump's options.
     */
    constructor(options)
    {
        this.defaultFlowStyle = options.defaultFlowStyle ?? null;
        this.lineBreak = options.lineBreak ?? "\n";
        this.floatDigits = options.floatDigits ?? null;
        this.sortKeys = options.sortKeys ?? true;
        this.emptyNull = options.emptyNull ?? false;
        this.tagField = options.tagField ?? "$yamlTag";
        this.valueField = options.valueField ?? "$yamlValue";
    }

    /**
     * A tag envelope's tag and value, or null.
     * @param {*} value A raw value.
     * @returns {?{ tag: string, value: * }}
     */
    Tagged(value)
    {
        if (!value || typeof value !== "object" || Array.isArray(value) || typeof value[this.tagField] !== "string") return null;
        return { tag: value[this.tagField], value: value[this.valueField] };
    }

    /**
     * Whether a raw value is a collection (an array, a mapping, or a tag on one).
     * @param {*} value A raw value.
     * @returns {boolean}
     */
    IsCollection(value)
    {
        const tagged = this.Tagged(value);
        const inner = tagged ? tagged.value : value;
        return inner !== null && typeof inner === "object";
    }

    /**
     * Anchors every collection met twice, in the order of its second meeting (PyYAML `Serializer.anchor_node`).
     * @param {*} value A raw value.
     * @returns {void}
     */
    Anchor(value)
    {
        if (!this.IsCollection(value)) return;
        if (this._seen.has(value))
        {
            if (!this._anchors.has(value)) this._anchors.set(value, "id" + String(this._anchors.size + 1).padStart(3, "0"));
            return;
        }
        this._seen.add(value);
        const tagged = this.Tagged(value);
        const inner = tagged ? tagged.value : value;
        for (const item of Array.isArray(inner) ? inner : Object.values(inner)) this.Anchor(item);
    }

    /**
     * Writes text, tracking the column.
     * @param {string} data The text.
     * @returns {void}
     */
    Write(data)
    {
        this.text += data;
        this.column += data.length;
    }

    /**
     * Ends a line (PyYAML `write_line_break`).
     * @returns {void}
     */
    Break()
    {
        this.text += this.lineBreak;
        this.column = 0;
        this.whitespace = true;
        this.indention = true;
    }

    /**
     * Moves to the current indent, breaking the line where needed (PyYAML `write_indent`).
     * @returns {void}
     */
    WriteIndent()
    {
        const indent = this.indent ?? 0;
        if (!this.indention || this.column > indent || (this.column === indent && !this.whitespace)) this.Break();
        if (this.column < indent)
        {
            this.whitespace = true;
            this.Write(" ".repeat(indent - this.column));
        }
    }

    /**
     * Writes an indicator (PyYAML `write_indicator`).
     * @param {string} indicator The indicator.
     * @param {boolean} needWhitespace Whether a space goes before it.
     * @param {boolean} [whitespace=false] Whether it leaves whitespace after it.
     * @param {boolean} [indention=false] Whether it keeps the indention.
     * @returns {void}
     */
    WriteIndicator(indicator, needWhitespace, whitespace = false, indention = false)
    {
        this.Write(this.whitespace || !needWhitespace ? indicator : " " + indicator);
        this.whitespace = whitespace;
        this.indention = this.indention && indention;
    }

    /**
     * Raises the indent (PyYAML `increase_indent`).
     * @param {boolean} flow Whether the collection is a flow one.
     * @param {boolean} indentless Whether a block sequence keeps its parent's indent.
     * @returns {void}
     */
    IncreaseIndent(flow, indentless)
    {
        this._indents.push(this.indent);
        if (this.indent === null) this.indent = flow ? INDENT : 0;
        else if (!indentless) this.indent += INDENT;
    }

    /**
     * Restores the previous indent.
     * @returns {void}
     */
    DecreaseIndent()
    {
        this.indent = this._indents.pop();
    }

    /**
     * Writes one node: its anchor or alias, its tag, then its content.
     * @param {*} value The raw value.
     * @param {?string} context "sequence", "mapping" (a block mapping's value), "flow" or null (the root).
     * @param {boolean} simpleKey Whether the node is a mapping key.
     * @param {boolean} flow Whether the node is inside a flow collection.
     * @returns {void}
     */
    Node(value, context, simpleKey, flow)
    {
        if (this._anchors.has(value))
        {
            const anchor = this._anchors.get(value);
            if (this._written.has(value))
            {
                this.WriteIndicator("*" + anchor, true);
                return;
            }
            this._written.add(value);
            this.WriteIndicator("&" + anchor, true);
        }
        const tagged = this.Tagged(value);
        const inner = tagged ? tagged.value : value;
        if (tagged) this.WriteIndicator(ShortTag(tagged.tag), true);
        if (inner !== null && typeof inner === "object")
        {
            const items = Array.isArray(inner) ? inner : Object.entries(inner);
            const flowStyle = flow || items.length === 0
                || (this.defaultFlowStyle === null && (Array.isArray(inner) ? inner : Object.values(inner)).every(item => !this.IsCollection(item)));
            if (Array.isArray(inner)) flowStyle ? this.FlowSequence(inner) : this.BlockSequence(inner, context === "mapping" && !this.indention);
            else flowStyle ? this.FlowMapping(inner) : this.BlockMapping(inner);
            return;
        }
        this.Scalar(inner, Boolean(tagged), simpleKey, flow);
    }

    /**
     * @param {Array} items The items.
     * @returns {void}
     */
    FlowSequence(items)
    {
        this.WriteIndicator("[", true, true);
        this.IncreaseIndent(true, false);
        items.forEach((item, index) =>
        {
            if (index) this.WriteIndicator(",", false);
            if (this.column > WIDTH) this.WriteIndent();
            this.Node(item, "flow", false, true);
        });
        this.DecreaseIndent();
        this.WriteIndicator("]", false);
    }

    /**
     * @param {object} mapping The mapping.
     * @returns {void}
     */
    FlowMapping(mapping)
    {
        this.WriteIndicator("{", true, true);
        this.IncreaseIndent(true, false);
        SortedEntries(mapping, this.sortKeys).forEach(([ key, item ], index) =>
        {
            if (index) this.WriteIndicator(",", false);
            if (this.column > WIDTH) this.WriteIndent();
            this.Node(KeyValue(key), "flow", true, true);
            this.WriteIndicator(":", false);
            this.Node(item, "flow", false, true);
        });
        this.DecreaseIndent();
        this.WriteIndicator("}", false);
    }

    /**
     * @param {Array} items The items.
     * @param {boolean} indentless Whether the sequence is a block mapping's value.
     * @returns {void}
     */
    BlockSequence(items, indentless)
    {
        this.IncreaseIndent(false, indentless);
        for (const item of items)
        {
            this.WriteIndent();
            this.WriteIndicator("-", true, false, true);
            this.Node(item, "sequence", false, false);
        }
        this.DecreaseIndent();
    }

    /**
     * @param {object} mapping The mapping.
     * @returns {void}
     */
    BlockMapping(mapping)
    {
        this.IncreaseIndent(false, false);
        for (const [ key, item ] of SortedEntries(mapping, this.sortKeys))
        {
            this.WriteIndent();
            this.Node(KeyValue(key), "mapping", true, false);
            this.WriteIndicator(":", false);
            if (item === null && this.emptyNull) continue;
            this.Node(item, "mapping", false, false);
        }
        this.DecreaseIndent();
    }

    /**
     * Writes a scalar: plain where PyYAML allows it, else single-quoted.
     * @param {*} value A bigint, number, string, boolean or null.
     * @param {boolean} tagged Whether an explicit tag precedes it (PyYAML then never writes it plain).
     * @param {boolean} simpleKey Whether it is a mapping key (keys are never split).
     * @param {boolean} flow Whether it is inside a flow collection.
     * @returns {void}
     */
    Scalar(value, tagged, simpleKey, flow)
    {
        if (typeof value !== "string")
        {
            this.WriteIndicator(ScalarText(value, this.floatDigits), true);
            return;
        }
        const plain = !tagged && PlainAllowed(value, flow);
        const text = plain ? value : "'" + value.replaceAll("'", "''") + "'";
        if (!this.whitespace) this.Write(" ");
        this.whitespace = false;
        this.indention = false;
        if (simpleKey)
        {
            this.Write(text);
            return;
        }
        // PyYAML splits a long scalar at a single space once the line is past the width, continuing one indent in
        // (`expect_scalar` raises the indent around the scalar).
        this.IncreaseIndent(true, false);
        const words = text.split(" ");
        words.forEach((word, index) =>
        {
            if (index)
            {
                if (this.column > WIDTH && word !== "" && words[index - 1] !== "") this.WriteIndent();
                else this.Write(" ");
            }
            this.Write(word);
        });
        this.DecreaseIndent();
        this.whitespace = false;
        this.indention = false;
    }
}

/**
 * A tag as PyYAML writes it: `tag:yaml.org,2002:` as `!!`.
 * @param {string} tag The full tag.
 * @returns {string}
 */
function ShortTag(tag)
{
    return tag.startsWith(TAG_PREFIX) ? "!!" + tag.slice(TAG_PREFIX.length) : "!<" + tag + ">";
}

/**
 * A mapping's entries in PyYAML's order: Python 2 sorts integer keys before strings, numerically. Unsorted, they keep
 * the mapping's order (a JS object lists integer keys first, ascending, as Python sorts them).
 * @param {object} mapping The mapping.
 * @param {boolean} sortKeys Whether to sort.
 * @returns {Array<[string, *]>}
 */
function SortedEntries(mapping, sortKeys)
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
 * A mapping key as the value it was: an integer key is an int.
 * @param {string} key The key.
 * @returns {string|bigint}
 */
function KeyValue(key)
{
    return /^-?\d+$/u.test(key) ? BigInt(key) : key;
}

/**
 * A non-string scalar's text: an int, a float as Python's `repr` with PyYAML's `.0e` rule, a bool or null.
 * @param {*} value The scalar.
 * @param {?number} floatDigits 17 for Python 2.6's float `repr`, null for Python 2.7's.
 * @returns {string}
 * @throws {TypeError} For a value YAML cannot hold.
 */
function ScalarText(value, floatDigits)
{
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "boolean") return value ? "true" : "false";
    if (value === null || value === undefined) return "null";
    if (typeof value !== "number") throw new TypeError("PyYAML writer: no scalar form for " + typeof value);
    if (Number.isNaN(value)) return ".nan";
    if (!Number.isFinite(value)) return value > 0 ? ".inf" : "-.inf";
    return floatDigits === null ? PythonFloat(value) : PythonFloatDigits(value, floatDigits);
}

/**
 * Python 2.6's `repr` of a float (`%.17g`, `.0` added to an integral result), then PyYAML's `.0e` rule.
 * @param {number} value A finite number.
 * @param {number} digits The significant digits (17).
 * @returns {string}
 */
function PythonFloatDigits(value, digits)
{
    const [ mantissa, exponentText ] = value.toExponential(digits - 1).split("e");
    const exponent = Number(exponentText);
    // %g: fixed notation unless the exponent is below -4 or at least the precision; trailing zeros dropped.
    if (exponent < -4 || exponent >= digits)
    {
        const head = mantissa.replace(/\.?0+$/u, "");
        return (head.includes(".") ? head : head + ".0") + "e" + (exponent < 0 ? "-" : "+") + String(Math.abs(exponent)).padStart(2, "0");
    }
    const fixed = value.toFixed(Math.max(0, digits - 1 - exponent)).replace(/(\.\d*?)0+$/u, "$1").replace(/\.$/u, "");
    return fixed.includes(".") ? fixed : fixed + ".0";
}

/**
 * Python 2.7's `repr` of a float, then PyYAML's rule that an exponent form gains `.0` (`1.0e-05`).
 * @param {number} value A finite number.
 * @returns {string}
 */
function PythonFloat(value)
{
    if (value === 0) return Object.is(value, -0) ? "-0.0" : "0.0";
    const [ mantissa, exponentText ] = value.toExponential().split("e");
    const exponent = Number(exponentText);
    const negative = mantissa.startsWith("-");
    const digits = mantissa.replace("-", "").replace(".", "");
    const sign = negative ? "-" : "";
    const point = exponent + 1;
    if (point <= -4 || point > 16)
    {
        const head = digits[0] + "." + (digits.length > 1 ? digits.slice(1) : "0");
        return sign + head + "e" + (exponent < 0 ? "-" : "+") + String(Math.abs(exponent)).padStart(2, "0");
    }
    if (point <= 0) return sign + "0." + "0".repeat(-point) + digits;
    if (point >= digits.length) return sign + digits + "0".repeat(point - digits.length) + ".0";
    return sign + digits.slice(0, point) + "." + digits.slice(point);
}

/** Strings PyYAML's resolver reads as another type, so it quotes them (YAML 1.1 bool, null, int, float). */
const IMPLICIT = /^(?:yes|Yes|YES|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF|~|null|Null|NULL|[-+]?(?:0b[0-1_]+|0[0-7_]+|(?:0|[1-9][0-9_]*)|0x[0-9a-fA-F_]+|[1-9][0-9_]*(?::[0-5]?[0-9])+)|[-+]?(?:[0-9][0-9_]*)\.[0-9_]*(?:[eE][-+][0-9]+)?|\.[0-9_]+(?:[eE][-+][0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/u;

/**
 * Whether PyYAML writes a string plain (its `analyze_scalar`, for the characters these files use).
 * @param {string} value The string.
 * @param {boolean} flow Whether it is inside a flow collection.
 * @returns {boolean}
 */
function PlainAllowed(value, flow)
{
    if (value === "" || IMPLICIT.test(value)) return false;
    if (value.startsWith(" ") || value.endsWith(" ") || /[\n\r\t\u0085\u2028\u2029]/u.test(value)) return false;
    if (/^[-?:,[\]{}#&*!|>'"%@`]/u.test(value) && !(/^[-?:]/u.test(value) && value.length > 1 && value[1] !== " ")) return false;
    if (value.includes(": ") || value.includes(" #") || value.endsWith(":")) return false;
    if (flow && /[,?[\]{}]/u.test(value)) return false;
    if (flow && value.includes(":")) return false;
    // eslint-disable-next-line no-control-regex
    return !/[^\x20-\x7e]/u.test(value);
}
