import {
    LineCounter,
    isAlias,
    isMap,
    isScalar,
    isSeq,
    parseDocument,
    visit
} from "yaml";

import { CjsReader } from "../../../format/CjsReader.js";
import { TAG_HANDLE, TAG_PRESERVE, TAG_REJECT, toJsonGraph } from "./helpers.js";

const TAG_PREFIX = "tag:yaml.org,2002:";
const PYTHON_TUPLE = `${TAG_PREFIX}python/tuple`;
const PYTHON_UNICODE = `${TAG_PREFIX}python/unicode`;
const PYTHON_PROJECTED_DECAL = `${TAG_PREFIX}python/object:paperDoll.ProjectedDecal`;
const PYTHON_PART_METADATA = `${TAG_PREFIX}python/object:paperDoll.AvatarPartMetaData`;

const STANDARD_TAGS = new Set([
    "binary", "bool", "float", "int", "map", "merge", "null", "omap",
    "pairs", "seq", "set", "str", "timestamp"
].map(name => `${TAG_PREFIX}${name}`));

function canonicalTag(tag)
{
    if (typeof tag !== "string") return tag;
    if (tag.startsWith("!!")) return `${TAG_PREFIX}${tag.slice(2)}`;
    return tag;
}

function displayMessage(error)
{
    return String(error && error.message ? error.message : error).trim();
}

function defineMappingValue(target, key, value)
{
    Object.defineProperty(target, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true
    });
}

/**
 * Construction-bound reader that parses one YAML source with the `yaml`
 * library and produces the format's payload, raw, or document graphs while
 * enforcing tag policy and alias limits.
 */
export class CjsYamlReader extends CjsReader
{
    constructor(input, options = {})
    {
        super(options);

        if (typeof input !== "string")
        {
            throw new TypeError("CjsYamlFormat input must be a YAML string");
        }

        this.source = input;
        this.lineCounter = new LineCounter();
        this.document = parseDocument(input, {
            keepSourceTokens: true,
            lineCounter: this.lineCounter,
            prettyErrors: true,
            strict: true,
            uniqueKeys: this.options.uniqueKeys
        });
        this.inventory = this.BuildInventory();
    }

    Read()
    {
        return this.ReadPayload();
    }

    ReadPayload()
    {
        return toJsonGraph(this.ReadRaw(), this.options);
    }

    ReadRaw()
    {
        this.AssertSyntax();
        this.AssertAliasLimit();
        return this.Convert(this.document.contents, new Map());
    }

    ReadDocument()
    {
        let value = null;
        const errors = this.inventory.errors.slice();

        if (!errors.length)
        {
            try
            {
                this.AssertAliasLimit();
                value = this.Convert(this.document.contents, new Map());
            }
            catch (error)
            {
                errors.push(this.DescribeError(error));
            }
        }

        return {
            format: { id: "yaml" },
            source: { name: this.options.sourceName, length: this.source.length },
            root: { kind: this.RootKind() },
            value,
            tags: this.inventory.tags,
            anchors: this.inventory.anchors,
            aliases: this.inventory.aliases,
            warnings: this.inventory.warnings,
            errors
        };
    }

    Inspect()
    {
        return {
            format: { id: "yaml" },
            source: { name: this.options.sourceName, length: this.source.length },
            root: { kind: this.RootKind() },
            tags: this.inventory.tags,
            anchors: this.inventory.anchors,
            aliases: this.inventory.aliases,
            warnings: this.inventory.warnings,
            errors: this.inventory.errors
        };
    }

    RootKind()
    {
        const node = this.document.contents;
        if (node === null) return "null";
        if (isMap(node)) return "mapping";
        if (isSeq(node)) return "sequence";
        if (isScalar(node)) return "scalar";
        if (isAlias(node)) return "alias";
        return "unknown";
    }

    AssertSyntax()
    {
        if (!this.document.errors.length) return;
        const first = this.document.errors[0];
        const source = this.options.sourceName ? ` in ${this.options.sourceName}` : "";
        throw new SyntaxError(`CjsYamlFormat${source}: ${displayMessage(first)}`);
    }

    AssertAliasLimit()
    {
        if (this.inventory.aliases.length <= this.options.maxAliasCount) return;
        const source = this.options.sourceName ? ` in ${this.options.sourceName}` : "";
        throw new RangeError(`CjsYamlFormat${source}: alias count ${this.inventory.aliases.length} exceeds maxAliasCount ${this.options.maxAliasCount}`);
    }

    Convert(node, memo)
    {
        if (node === null || node === undefined) return null;

        if (isAlias(node))
        {
            const source = node.resolve(this.document);
            if (!source) throw this.NodeError(node, `unresolved alias "${node.source}"`);
            return this.Convert(source, memo);
        }

        if (memo.has(node)) return memo.get(node);

        const tag = this.CustomTag(node);
        if (tag)
        {
            this.AssertTagAllowed(tag, node);
            const handler = this.FindTagHandler(tag);

            if (handler)
            {
                const value = this.ConvertBase(node, memo, true);
                const handled = handler(value, this.TagContext(tag, node));
                memo.set(node, handled);
                return handled;
            }

            if (tag === PYTHON_TUPLE)
            {
                if (!isSeq(node)) throw this.NodeError(node, `${tag} must decorate a sequence`);
                return this.ConvertBase(node, memo, true);
            }

            if (tag === PYTHON_UNICODE)
            {
                if (!isScalar(node) || typeof node.value !== "string")
                {
                    throw this.NodeError(node, `${tag} must decorate a string scalar`);
                }
                return node.value;
            }

            if (this.options.tagPolicy === TAG_REJECT)
            {
                throw this.NodeError(node, `custom tag "${tag}" is rejected by tagPolicy`);
            }

            if (this.options.tagPolicy === TAG_HANDLE)
            {
                throw this.NodeError(node, `custom tag "${tag}" has no explicit handler`);
            }

            if (this.options.tagPolicy === TAG_PRESERVE || tag === PYTHON_PROJECTED_DECAL || tag === PYTHON_PART_METADATA)
            {
                const wrapper = { [this.options.tagField]: tag };
                memo.set(node, wrapper);
                wrapper[this.options.valueField] = this.ConvertBase(node, memo, false);
                return wrapper;
            }
        }

        return this.ConvertBase(node, memo, true);
    }

    ConvertBase(node, memo, memoize)
    {
        if (isScalar(node)) return node.value;

        if (isSeq(node))
        {
            const out = [];
            if (memoize) memo.set(node, out);
            for (const item of node.items) out.push(this.Convert(item, memo));
            return out;
        }

        if (isMap(node))
        {
            const out = {};
            if (memoize) memo.set(node, out);
            for (const pair of node.items)
            {
                const key = this.MapKey(pair.key);
                if (this.options.uniqueKeys && Object.prototype.hasOwnProperty.call(out, key))
                {
                    throw this.NodeError(pair.key, `duplicate mapping key "${key}"`);
                }
                // Defining the property prevents keys such as "__proto__" from
                // mutating the result object's prototype.
                defineMappingValue(out, key, this.Convert(pair.value, memo));
            }
            return out;
        }

        throw this.NodeError(node, "unsupported YAML node");
    }

    MapKey(node)
    {
        if (!isScalar(node)) throw this.NodeError(node, "mapping keys must be scalar values");
        return String(node.value);
    }

    CustomTag(node)
    {
        const tag = canonicalTag(node.tag);
        return tag && !STANDARD_TAGS.has(tag) ? tag : null;
    }

    AssertTagAllowed(tag, node)
    {
        if (!this.options.allowedTags) return;
        const allowed = new Set(this.options.allowedTags.map(canonicalTag));
        if (!allowed.has(tag)) throw this.NodeError(node, `custom tag "${tag}" is not in allowedTags`);
    }

    FindTagHandler(tag)
    {
        const handlers = this.options.tagHandlers;
        const short = tag.startsWith(TAG_PREFIX) ? `!!${tag.slice(TAG_PREFIX.length)}` : tag;
        if (handlers instanceof Map) return handlers.get(tag) || handlers.get(short) || null;
        return handlers[tag] || handlers[short] || null;
    }

    TagContext(tag, node)
    {
        return {
            tag,
            sourceName: this.options.sourceName,
            location: this.TagLocation(node)
        };
    }

    NodeError(node, message)
    {
        const at = node && node.tag ? this.TagLocation(node) : this.Location(node);
        const source = this.options.sourceName ? `${this.options.sourceName}:` : "";
        const where = at ? `${source}${at.line}:${at.column}` : (this.options.sourceName || "YAML input");
        const error = new Error(`CjsYamlFormat ${where}: ${message}`);
        error.code = "YAML_TAG_POLICY";
        error.location = at;
        return error;
    }

    Location(node)
    {
        if (!node || !Array.isArray(node.range)) return null;
        const pos = this.lineCounter.linePos(node.range[0]);
        return { offset: node.range[0], line: pos.line, column: pos.col };
    }

    TagLocation(node)
    {
        const fallback = this.Location(node);
        if (!fallback || !node.tag) return fallback;

        const lineStart = this.source.lastIndexOf("\n", node.range[0] - 1) + 1;
        const prefix = this.source.slice(lineStart, node.range[0]);
        const tags = [ ...prefix.matchAll(/!<[^>]+>|!!?[^\s[\]{},]+/g) ];
        const match = tags[tags.length - 1];
        if (!match) return fallback;

        const offset = lineStart + match.index;
        const pos = this.lineCounter.linePos(offset);
        return { offset, line: pos.line, column: pos.col };
    }

    DescribeError(error)
    {
        const linePos = error && error.linePos && error.linePos[0];
        return {
            code: error && error.code ? error.code : "YAML_ERROR",
            message: displayMessage(error),
            location: error && error.location ? error.location : (linePos ? {
                line: linePos.line,
                column: linePos.col
            } : null)
        };
    }

    BuildInventory()
    {
        const tags = [];
        const anchors = [];
        const aliases = [];

        visit(this.document, (_key, node) =>
        {
            if (!node || typeof node !== "object") return;
            const tag = this.CustomTag(node);
            const location = tag ? this.TagLocation(node) : this.Location(node);
            if (tag) tags.push({ tag, kind: this.NodeKind(node), location });
            if (node.anchor) anchors.push({ name: node.anchor, kind: this.NodeKind(node), location });
            if (isAlias(node)) aliases.push({ name: node.source, location });
        });

        return {
            tags,
            anchors,
            aliases,
            warnings: this.document.warnings.map(error => this.DescribeError(error)),
            errors: this.document.errors.map(error => this.DescribeError(error))
        };
    }

    NodeKind(node)
    {
        if (isMap(node)) return "mapping";
        if (isSeq(node)) return "sequence";
        if (isScalar(node)) return "scalar";
        if (isAlias(node)) return "alias";
        return "unknown";
    }
}

export default CjsYamlReader;
