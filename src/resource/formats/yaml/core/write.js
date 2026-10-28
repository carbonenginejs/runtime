import { Document, isAlias, isDocument, isMap, isScalar, isSeq, visit } from "yaml";

/**
 * Writes raw YAML values or a yaml.Document AST without mutating caller-owned input.
 * ReadDocument's public inventory record is not an AST and is not accepted as one.
 * @param {*} value Raw values, or an AST when input is document.
 * @param {object} [options={}] Input, optional sourceDocument, tagField/valueField and stringify options.
 * @returns {string} YAML source text.
 */
export function writeYaml(value, options = {})
{
    const input = options.input ?? "raw";
    let document;
    if (input === "document")
    {
        if (!isDocument(value)) throw new TypeError("YAML document write input requires a yaml.Document AST.");
        document = value.clone();
    }
    else if (input === "raw")
    {
        if (options.sourceDocument)
        {
            if (!isDocument(options.sourceDocument)) throw new TypeError("YAML sourceDocument requires a yaml.Document AST.");
            document = options.sourceDocument.clone();
            document.contents = UpdateNode(document, document.contents, value, new Map(), options);
        }
        else document = new Document(value);
        RestoreTags(document, options);
    }
    else throw new TypeError(`Unknown YAML write input ${input}`);
    if (document.errors.length) throw new SyntaxError(document.errors[0].message);
    return document.toString(options.stringify ?? {});
}

/**
 * Updates an existing layout, preserving keys/tags and the earlier duplicate pairs.
 * @param {import("yaml").Document} document Cloned output document.
 * @param {*} node Existing AST node.
 * @param {*} value Current raw value.
 * @param {Map<object,*>} assigned Values already assigned to shared nodes.
 * @param {object} options Writer options.
 * @returns {*} Updated node.
 */
function UpdateNode(document, node, value, assigned, options)
{
    const tagged = UnwrapTag(value, options);
    if (isAlias(node))
    {
        const target = node.resolve(document);
        if (!target) throw new TypeError(`Unresolved YAML alias ${node.source}`);
        if (!assigned.has(target) || !equalYamlValues(assigned.get(target), tagged ? tagged.value : value))
            throw new TypeError(`Divergent edit to YAML alias ${node.source}; supply an explicit document layout.`);
        return node;
    }
    if (node && typeof node === "object") assigned.set(node, value);
    if (tagged)
    {
        const result = UpdateNode(document, node, tagged.value, assigned, options);
        result.tag = tagged.tag;
        return result;
    }
    if (isMap(node) && value && typeof value === "object" && !Array.isArray(value) && !ArrayBuffer.isView(value))
    {
        const entries = value instanceof Map ? [...value] : Object.entries(value);
        const values = new Map(entries.map(([key, item]) => [String(key), item]));
        const finalPairs = new Map();
        for (const pair of node.items)
        {
            if (!isScalar(pair.key)) throw new TypeError("YAML writing requires scalar mapping keys.");
            finalPairs.set(String(pair.key.value), pair);
        }
        node.items = node.items.filter(pair => values.has(String(pair.key.value)));
        for (const pair of node.items)
        {
            const key = String(pair.key.value);
            if (finalPairs.get(key) === pair) pair.value = UpdateNode(document, pair.value, values.get(key), assigned, options);
        }
        for (const [key, item] of entries)
        {
            if (!finalPairs.has(String(key))) node.items.push(document.createPair(key, item));
        }
        return node;
    }
    if (isSeq(node) && (Array.isArray(value) || ArrayBuffer.isView(value)))
    {
        node.items = Array.from(value, (item, index) => UpdateNode(document, node.items[index], item, assigned, options));
        return node;
    }
    if (isScalar(node) && (value === null || typeof value !== "object"))
    {
        node.value = value;
        return node;
    }
    const replacement = document.createNode(value);
    assigned.set(replacement, value);
    if (node?.anchor) replacement.anchor = node.anchor;
    if (node?.comment) replacement.comment = node.comment;
    if (node?.commentBefore) replacement.commentBefore = node.commentBefore;
    return replacement;
}

/**
 * Reads the format's inert tag/value envelope, without resolving a constructor.
 * @param {*} value Raw value.
 * @param {object} options Reader-compatible tagField and valueField names.
 * @returns {{tag:string,value:*}|null} Explicit custom tag, or null.
 */
function UnwrapTag(value, options)
{
    const tagField = options.tagField ?? "$yamlTag", valueField = options.valueField ?? "$yamlValue";
    if (!value || typeof value !== "object" || typeof value[tagField] !== "string" || !Object.hasOwn(value, valueField)) return null;
    if (Object.keys(value).length !== 2) throw new TypeError("A YAML tag envelope must contain only its tag and value.");
    return { tag: value[tagField], value: value[valueField] };
}

/**
 * Restores explicit inert tag envelopes after node construction.
 * @param {import("yaml").Document} document Output document.
 * @param {object} options Reader-compatible tag and value field names.
 * @returns {void}
 */
function RestoreTags(document, options)
{
    const tagField = options.tagField ?? "$yamlTag", valueField = options.valueField ?? "$yamlValue";
    visit(document, (_key, node) =>
    {
        if (!isMap(node) || !node.has(tagField) || !node.has(valueField)) return;
        if (node.items.length !== 2) throw new TypeError("A YAML tag envelope must contain only its tag and value.");
        const tag = node.get(tagField);
        if (typeof tag !== "string") throw new TypeError("YAML tag must be a string.");
        const value = node.get(valueField, true);
        if (!value || isAlias(value)) throw new TypeError("A YAML tag must decorate a concrete node.");
        value.tag = tag;
        if (node.anchor) value.anchor = node.anchor;
        return value;
    });
}

/**
 * Compares raw alias values, including cycles, without traversing class prototypes.
 * @param {*} left First value.
 * @param {*} right Second value.
 * @param {Map<object,Set<object>>} [seen=new Map()] Compared graph pairs.
 * @returns {boolean} Whether both values encode the same YAML content.
 */
export function equalYamlValues(left, right, seen = new Map())
{
    if (Object.is(left, right)) return true;
    if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    if (seen.get(left)?.has(right)) return true;
    if (!seen.has(left)) seen.set(left, new Set());
    seen.get(left).add(right);
    const a = left instanceof Map ? [...left] : Object.entries(left);
    const b = right instanceof Map ? [...right] : Object.entries(right);
    if (a.length !== b.length) return false;
    const indexed = new Map(b.map(([key, value]) => [String(key), value]));
    return a.every(([key, value]) => indexed.has(String(key)) && equalYamlValues(value, indexed.get(String(key)), seen));
}
