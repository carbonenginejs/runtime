import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsYamlFormat } from "../yaml/CjsYamlFormat.js";
import { createPyYamlDocument, pythonFloat, stringifyPyYaml } from "./core/pyYamlDocument.js";

const TAG_FIELD = "$yamlTag";
const VALUE_FIELD = "$yamlValue";
const NUMBER = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";

/** Caller tag handlers already given decoded modifiers (`SetConfiguration` may run more than once). */
const wrappedHandlers = new WeakSet();

/**
 * The game's character files with an extension of their own (`.prs`, `.type`, `.color`, `.proj`, `.pose`, `.base`,
 * `.info`, `.face`, `.trif`). Every one is a PyYAML dump, so one format reads them all, through the YAML reader. By
 * default it reads losslessly: `!!python/` tags stay as tag envelopes (`preservePythonTags`), ints stay bigints
 * (`intAsBigInt`), and a node the file shares stays shared. It writes the same values back as PyYAML dumped them
 * through the yaml library (`createPyYamlDocument`), so read, write and read again give equal values. A caller that
 * wants plain values reads with `{ preservePythonTags: false, intAsBigInt: false }`.
 *
 * A part's metadata (`paperDoll.AvatarPartMetaData`) writes each modifier as one string: a path and, after a
 * separator, the weight it states (`modifierLists`). The format reads each as `{ path, weight }`, the weight null when
 * the file states none, and writes it back as the string.
 *
 * Ours (no Carbon counterpart): the client's paper doll is Python.
 */
export class CjsCharacterYamlFormat extends CjsYamlFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsCharacterYamlFormat";

    static id = "CjsCharacterYamlFormat";

    static extensions = [ ".base", ".color", ".face", ".info", ".pose", ".proj", ".prs", ".trif", ".type" ];

    /** The reader options a lossless read uses; a caller's options win. */
    static readOptions = { preservePythonTags: true, intAsBigInt: true, uniqueKeys: false, maxAliasCount: 100000 };

    /**
     * How PyYAML dumped each file type, read off the shipped files (the round-trip test
     * checks them on the corpus): `defaultFlowStyle` (null: a collection of scalars in flow style; false: block
     * style), `sortKeys`, `emptyNull` (a recipe writes most nulls as nothing), `floatDigits` (17 where Python 2.6
     * wrote the floats) and `lineBreak`. A file that differs from its type's usual dump is a known exception the
     * test lists, not a rule here.
     * @type {Object<string, { defaultFlowStyle: ?boolean, sortKeys: boolean, emptyNull: boolean, floatDigits: ?number, lineBreak: string }>}
     */
    static dumpStyles = {
        ".base": { defaultFlowStyle: null, sortKeys: true, emptyNull: false, floatDigits: null, lineBreak: "\r\n" },
        ".color": { defaultFlowStyle: null, sortKeys: true, emptyNull: false, floatDigits: null, lineBreak: "\r\n" },
        ".face": { defaultFlowStyle: null, sortKeys: false, emptyNull: false, floatDigits: 17, lineBreak: "\r\n" },
        ".info": { defaultFlowStyle: null, sortKeys: true, emptyNull: false, floatDigits: null, lineBreak: "\r\n" },
        ".pose": { defaultFlowStyle: null, sortKeys: true, emptyNull: false, floatDigits: 17, lineBreak: "\r\n" },
        ".proj": { defaultFlowStyle: null, sortKeys: true, emptyNull: false, floatDigits: null, lineBreak: "\r\n" },
        ".prs": { defaultFlowStyle: false, sortKeys: true, emptyNull: true, floatDigits: null, lineBreak: "\r\n" },
        ".trif": { defaultFlowStyle: null, sortKeys: false, emptyNull: false, floatDigits: null, lineBreak: "\r\n" },
        ".type": { defaultFlowStyle: false, sortKeys: true, emptyNull: false, floatDigits: null, lineBreak: "\r\n" }
    };

    /** The Python object whose modifier lists the format decodes. */
    static metadataTag = "tag:yaml.org,2002:python/object:paperDoll.AvatarPartMetaData";

    /**
     * A part's metadata's modifier lists and the separator each writes before a stated weight, read off the shipped
     * files: every weighted `dependantModifiers` entry is `path###w` and every weighted `occludesModifiers` entry
     * `path#w`.
     * @type {Object<string, string>}
     */
    static modifierLists = { dependantModifiers: "###", occludesModifiers: "#" };

    /**
     * Creates the format with the lossless read options under the caller's.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     */
    constructor(options = {})
    {
        super({ ...CjsCharacterYamlFormat.readOptions, ...options });
    }

    /**
     * Applies options; a caller's handler for the metadata tag is given the modifiers decoded (`decodeMetadata`).
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {CjsCharacterYamlFormat} This format.
     */
    SetConfiguration(options = {})
    {
        super.SetConfiguration(options);
        const handlers = this._values.tagHandlers;
        const short = "!!" + CjsCharacterYamlFormat.metadataTag.slice("tag:yaml.org,2002:".length);
        for (const key of [ CjsCharacterYamlFormat.metadataTag, short ])
        {
            const handler = handlers instanceof Map ? handlers.get(key) : handlers[key];
            if (typeof handler !== "function" || wrappedHandlers.has(handler)) continue;
            const decoding = (values, context) => handler(CjsCharacterYamlFormat.decodeMetadata(values, context.sourceName), context);
            wrappedHandlers.add(decoding);
            if (handlers instanceof Map) handlers.set(key, decoding);
            else handlers[key] = decoding;
        }
        return this;
    }

    /**
     * A part's metadata values with each modifier string read as `{ path, weight }` (`decodeModifier`).
     * @param {object} values The metadata's values, edited in place.
     * @param {?string} [sourceName=null] The file, for errors.
     * @returns {object} The values.
     */
    static decodeMetadata(values, sourceName = null)
    {
        for (const [ list, separator ] of Object.entries(CjsCharacterYamlFormat.modifierLists))
        {
            if (!Array.isArray(values[list])) continue;
            values[list] = values[list].map(entry => CjsCharacterYamlFormat.decodeModifier(entry, separator, (sourceName ?? "metadata") + " " + list));
        }
        return values;
    }

    /**
     * One modifier string as `{ path, weight }`: `path` alone (weight null, none stated), or `path` + separator +
     * number. A `dependantModifiers` entry ending in a bare `#` states no weight either: the one such entry in the
     * corpus is `outer/jacketmilf01`'s `utilityshapes/pinchrightouterlowerhipsshape#`, which writes back without it. An
     * occlusion outside `utilityshapes/` may also use `###`.
     * @param {string} text The entry as written.
     * @param {string} separator The list's separator (`modifierLists`).
     * @param {string} label The file and list, for errors.
     * @returns {{ path: string, weight: ?number }}
     * @throws {TypeError} For any other `#` form or a weight that is not a finite number.
     */
    static decodeModifier(text, separator, label)
    {
        const value = String(text);
        // An occlusion outside `utilityshapes/` may also write `###` (build 3693310: shirtaf01 v1
        // `topunderwear###1`), as the library has always read it; it writes back with the list's own separator. A
        // utility-shape occlusion written so was never read, and still is not.
        const separators = separator === "#" && !/^utilityshapes\//iu.test(value) ? [ "#", "###" ] : [ separator ];
        const weighted = separators.map(each => new RegExp("^([^#]+)" + each + "(" + NUMBER + ")$", "u").exec(value)).find(match => match);
        if (weighted)
        {
            const weight = Number(weighted[2]);
            if (!Number.isFinite(weight)) throw new TypeError(label + ": modifier weight is not finite: " + value);
            return { path: weighted[1], weight };
        }
        if (separator === "###" && /^[^#]+#+$/u.test(value)) return { path: value.replace(/#+$/u, ""), weight: null };
        if (value.includes("#")) throw new TypeError(label + ": no modifier form reads " + value);
        return { path: value, weight: null };
    }

    /**
     * A modifier written back as its string: the path, then the separator and the weight as Python writes a float.
     * @param {{ path: string, weight: ?number }} modifier The modifier.
     * @param {string} separator The list's separator (`modifierLists`).
     * @returns {string}
     */
    static joinModifier(modifier, separator)
    {
        return modifier.weight === null || modifier.weight === undefined ? modifier.path : modifier.path + separator + pythonFloat(modifier.weight, null);
    }

    /**
     * Decodes the modifiers of every metadata object in raw values (a lossless read keeps the object as a tag envelope).
     * @param {*} raw Raw values, edited in place.
     * @param {?string} sourceName The file, for errors.
     * @returns {*} The values.
     */
    static _DecodeRaw(raw, sourceName)
    {
        const seen = new Set();
        const walk = value =>
        {
            if (!value || typeof value !== "object" || seen.has(value)) return;
            seen.add(value);
            if (value[TAG_FIELD] === CjsCharacterYamlFormat.metadataTag && value[VALUE_FIELD] && typeof value[VALUE_FIELD] === "object")
                CjsCharacterYamlFormat.decodeMetadata(value[VALUE_FIELD], sourceName);
            for (const child of Array.isArray(value) ? value : Object.values(value)) walk(child);
        };
        walk(raw);
        return raw;
    }

    /**
     * A copy of raw values with every metadata object's modifiers joined back into strings; other nodes are shared.
     * @param {*} raw Raw values, as a read gives them.
     * @returns {*} The values to write.
     */
    static _JoinRaw(raw)
    {
        const copies = new Map();
        const join = value =>
        {
            if (!value || typeof value !== "object") return value;
            if (copies.has(value)) return copies.get(value);
            if (value[TAG_FIELD] === CjsCharacterYamlFormat.metadataTag && value[VALUE_FIELD] && typeof value[VALUE_FIELD] === "object")
            {
                const inner = { ...value[VALUE_FIELD] };
                for (const [ list, separator ] of Object.entries(CjsCharacterYamlFormat.modifierLists))
                    if (Array.isArray(inner[list])) inner[list] = inner[list].map(entry => CjsCharacterYamlFormat.joinModifier(entry, separator));
                const copy = { [TAG_FIELD]: value[TAG_FIELD], [VALUE_FIELD]: inner };
                copies.set(value, copy);
                return copy;
            }
            const copy = Array.isArray(value) ? [] : {};
            copies.set(value, copy);
            for (const [ key, child ] of Object.entries(value)) copy[key] = join(child);
            return copy;
        };
        return join(raw);
    }

    /**
     * Writes raw values as the game's file of that type.
     * @param {*} value Raw values, as the lossless read gives them.
     * @param {{ extension?: string }} [options={}] As `write`.
     * @returns {string} YAML text.
     */
    Write(value, options = {})
    {
        return CjsCharacterYamlFormat.write(value, options);
    }

    /**
     * Reads losslessly (`readOptions`) unless the caller's options say otherwise.
     * @param {string|ArrayBuffer|ArrayBufferView} input YAML text or UTF-8 bytes.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {*} The output selected by emit.
     */
    static read(input, options = {})
    {
        return CjsCharacterYamlFormat._DecodeRaw(CjsYamlFormat.read(input, new CjsCharacterYamlFormat(options).GetConfiguration()), options.sourceName ?? null);
    }

    /**
     * Reads raw values losslessly (`readOptions`) unless the caller's options say otherwise; a metadata object's
     * modifiers come decoded (`decodeMetadata`).
     * @param {string|ArrayBuffer|ArrayBufferView} input YAML text or UTF-8 bytes.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {*} The raw values, shared nodes kept shared.
     */
    static readRaw(input, options = {})
    {
        return CjsCharacterYamlFormat._DecodeRaw(CjsYamlFormat.readRaw(input, new CjsCharacterYamlFormat(options).GetConfiguration()), options.sourceName ?? null);
    }

    /**
     * Writes raw values as PyYAML dumped the file type (`dumpStyles`); the caller's options win.
     * @param {*} value Raw values, as the lossless read gives them.
     * @param {{ extension?: string, defaultFlowStyle?: ?boolean, sortKeys?: boolean, emptyNull?: boolean, floatDigits?: ?number, lineBreak?: string }} [options={}]
     *   The file type (`.prs`), and any dump option to use in place of its type's (`dumpStyles`).
     * @returns {string} YAML text.
     * @throws {TypeError} For an extension this format does not read.
     */
    static write(value, options = {})
    {
        const { extension, ...overrides } = options;
        let style = {};
        if (extension !== undefined)
        {
            const key = String(extension).toLowerCase();
            if (!Object.hasOwn(CjsCharacterYamlFormat.dumpStyles, key)) throw new TypeError("CjsCharacterYamlFormat writes no " + (key || "file without an extension"));
            style = CjsCharacterYamlFormat.dumpStyles[key];
        }
        const dump = { defaultFlowStyle: null, sortKeys: true, emptyNull: false, floatDigits: null, lineBreak: "\n", ...style, ...overrides };
        return stringifyPyYaml(createPyYamlDocument(CjsCharacterYamlFormat._JoinRaw(value), dump), dump, CjsYamlFormat.write);
    }

    static inputs = CjsFormat.defineInputs({
        raw: { default: true, options: [ "extension", "defaultFlowStyle", "sortKeys", "emptyNull", "floatDigits", "lineBreak" ] }
    });
}
