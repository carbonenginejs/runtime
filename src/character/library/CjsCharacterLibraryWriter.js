import { CjsSchema } from "../../global/schema/CjsSchema.js";
import { CjsYamlFormat } from "../../resource/formats/yaml/CjsYamlFormat.js";
import { equalYamlValues } from "../../resource/formats/yaml/core/write.js";
import { CjsCharacterObjectBuilder } from "./CjsCharacterObjectBuilder.js";
import { CjsCharacterLibraryConfiguration } from "./CjsCharacterLibraryConfiguration.js";

/** Inverse character layout mapping; generic YAML node writing belongs to CjsYamlFormat. */
export class CjsCharacterLibraryWriter
{
    /**
     * Writes a loaded record using its original layout or an explicitly supplied source AST.
     * @param {object} record Typed character source record.
     * @param {object} [options={}] Optional kind/sourceDocument; new and hydrated records use canonical kind layouts.
     * @returns {string} Equivalent YAML source with authored tags and tuple layout retained.
     */
    Write(record, options = {})
    {
        return CjsCharacterLibraryWriter.write(record, options);
    }

    /**
     * Projects current values onto an original source layout without mutating either.
     * The declared kind layout supplies canonical tags/tuples without an original source AST.
     * @param {object} record Typed character source record.
     * @param {object} [options={}] Optional kind, sourceDocument and YAML stringify options.
     * @returns {string} Original-format YAML text.
     */
    static write(record, options = {})
    {
        const association = CjsCharacterObjectBuilder.getSource(record);
        const className = CjsSchema.getClassName(record?.constructor);
        const kind = options.kind ?? association?.kind ?? Object.keys(CjsCharacterLibraryConfiguration.kinds)
            .find(key => CjsCharacterLibraryConfiguration.kinds[key].className === className);
        const declaration = CjsCharacterLibraryConfiguration.kinds[kind];
        if (!declaration || declaration.pathOnly || declaration.derived) throw new TypeError("Character writing requires an original text kind.");
        const document = options.sourceDocument ?? association?.builder.GetSourceDocument();
        const layout = CjsCharacterLibraryConfiguration.layouts[kind];
        if (!layout) throw new TypeError(`No original character layout for ${kind}`);
        const builder = options.sourceDocument
            ? new CjsCharacterObjectBuilder(document.toString(), kind, options.sourceName ?? "", { uniqueKeys: kind !== "sculptingLimits" })
            : association?.builder;
        const baseline = builder?.CreateObject();
        const original = document?.toJS({ maxAliasCount: 100000 });
        const current = declaration.envelope ? record.value : record;
        const initial = declaration.envelope ? baseline?.value : baseline;
        if (layout.root === "sequence" && !Array.isArray(current)
            || layout.root === "scalar" && typeof current !== "string"
            || layout.root === "map" && (!current || typeof current !== "object" || Array.isArray(current)))
            throw new TypeError(`Invalid ${layout.root} root for ${kind}`);
        if (kind === "recipes" && typeof current[0] === "string" && !["female", "male"].includes(current[0]))
            throw new TypeError("A recipe's leading sex must be female or male.");
        const raw = ApplyLayout(ProjectValue(current, initial, original, new Map()), original, layout);
        return CjsYamlFormat.write(raw, { sourceDocument: document, stringify: options.stringify });
    }
}

/**
 * Keeps authored members and adds deliberately edited formerly absent fields.
 * @param {*} current Current typed value.
 * @param {*} baseline Fresh typed source value, used to distinguish edits from defaults.
 * @param {*} original Original YAML value, before hydration.
 * @param {Map<object,object>} memo Already projected objects and aliases.
 * @returns {*} Plain source values, with explicit tags only for new tagged structures.
 */
function ProjectValue(current, baseline, original, memo)
{
    if (current === null || typeof current !== "object") return current;
    if (memo.has(current)) return memo.get(current);
    if (Array.isArray(current) || ArrayBuffer.isView(current))
    {
        const result = [];
        memo.set(current, result);
        for (let index = 0; index < current.length; index++)
            result.push(ProjectValue(current[index], baseline?.[index], original?.[index], memo));
        return result;
    }
    if (current instanceof Map)
    {
        const result = new Map();
        memo.set(current, result);
        for (const [key, value] of current)
            result.set(key, ProjectValue(value, baseline?.get(key), original?.[key], memo));
        return result;
    }
    const className = CjsSchema.getClassName(current.constructor);
    const fields = className ? [...CjsSchema.getSchema(current.constructor).members, ...CjsSchema.getSchema(current.constructor).properties].filter(field => field.edit?.persist) : [];
    const byName = new Map(fields.map(field => [field.name, field]));
    const keys = new Set(original && typeof original === "object" ? Object.keys(original) : []);
    for (const field of fields)
    {
        if (className === "CjsAvatarPartMetaData" && ["recordID", "sourcePath", "dependencies", "occlusions"].includes(field.name)) continue;
        if (!equalYamlValues(current[field.key ?? field.name], baseline?.[field.key ?? field.name])) keys.add(field.name);
    }
    if (!className) for (const key of Object.keys(current)) keys.add(key);
    const result = Object.create(null);
    memo.set(current, result);
    for (const key of keys)
    {
        const field = byName.get(key);
        const storage = field?.key ?? key;
        if (key === "type" && original?.type && className)
        {
            result.type = original.type;
            continue;
        }
        if (!(storage in current))
        {
            if (className && original && Object.hasOwn(original, key)) result[key] = original[key];
            continue;
        }
        const value = ProjectValue(current[storage], baseline?.[storage], original?.[key], memo);
        if (value === undefined || className === "CjsProjectedDecal" && key === "layeres" && value === null) continue;
        result[key] = value;
    }
    if (original === undefined)
    {
        if (className && !className.startsWith("Cjs")) result.type = className;
    }
    return result;
}

/** @param {string} tag YAML tag suffix. @param {*} value Raw values. @returns {object} Inert tag/value pair. */
function Tagged(tag, value)
{
    return { $yamlTag: "tag:yaml.org,2002:" + tag, $yamlValue: value };
}

CjsSchema.meta.define("CjsCharacterLibraryWriter")(CjsCharacterLibraryWriter);

/**
 * Applies declared game-format tuples/tags/numeric keys; source annotations win where present.
 * @param {*} raw Inverse-mapped values.
 * @param {*} original Original raw values, or undefined for canonical writing.
 * @param {object} layout One configured kind layout.
 * @returns {*} Values with inert format tag annotations.
 */
function ApplyLayout(raw, original, layout)
{
    const holder = { value: raw }, source = { value: original };
    const taggedObjects = new WeakMap();
    const tag = (suffix, value) =>
    {
        const raw = value?.$yamlTag ? value.$yamlValue : value;
        if (!raw || typeof raw !== "object") return Tagged(suffix, raw);
        let tags = taggedObjects.get(raw);
        if (!tags) { tags = new Map(); taggedObjects.set(raw, tags); }
        if (!tags.has(suffix)) tags.set(suffix, Tagged(suffix, raw));
        return tags.get(suffix);
    };
    const apply = (path, visit) => VisitLayout(holder, source, ["value", ...(path ? path.split(".") : [])], 0, visit);
    for (const path of layout.tuples ?? []) apply(path, (value, prior) =>
    {
        if (!Array.isArray(value)) throw new TypeError(`Python tuple layout requires an array at ${path}`);
        return prior === undefined ? tag("python/tuple", value) : value;
    });
    for (const path of layout.unicode ?? []) apply(path, (value, prior) =>
    {
        if (typeof value !== "string") return value;
        return prior === undefined ? tag("python/unicode", value) : value;
    });
    for (const [path, suffix] of Object.entries(layout.tags ?? {})) apply(path, (value, prior) =>
        value === null || prior !== undefined ? value : tag(suffix, value));
    for (const path of layout.numericMaps ?? []) apply(path, value =>
    {
        const entries = value instanceof Map ? [...value] : Object.entries(value);
        return new Map(entries.map(([key, item]) =>
        {
            if (!/^-?(?:0|[1-9]\d*)$/u.test(String(key)) || !Number.isSafeInteger(Number(key)))
                throw new TypeError(`Non-integer character map key at ${path}: ${key}`);
            return [Number(key), item];
        }));
    });
    if (layout.tag && original === undefined) holder.value = tag(layout.tag, holder.value);
    return holder.value;
}

/**
 * Visits only the explicit segments in a declared field layout; * spans a stored collection.
 * @param {*} value Current parent.
 * @param {*} original Original parent for presence decisions.
 * @param {Array<string>} path Declared field segments.
 * @param {number} index Current segment index.
 * @param {Function} visit Leaf replacement callback.
 * @returns {void}
 */
function VisitLayout(value, original, path, index, visit)
{
    if (value?.$yamlTag) value = value.$yamlValue;
    if (!value || typeof value !== "object") return;
    const segment = path[index];
    const keys = segment === "*" ? (value instanceof Map ? [...value.keys()] : Object.keys(value)) : [segment];
    for (const key of keys)
    {
        const exists = value instanceof Map ? value.has(key) : Object.hasOwn(value, key);
        if (!exists) continue;
        const child = value instanceof Map ? value.get(key) : value[key];
        const prior = original instanceof Map ? original.get(key) : original?.[key];
        if (index === path.length - 1)
        {
            const next = visit(child, prior);
            if (value instanceof Map) value.set(key, next);
            else value[key] = next;
        }
        else VisitLayout(child, prior, path, index + 1, visit);
    }
}
