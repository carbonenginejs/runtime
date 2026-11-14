import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsYamlFormat } from "../yaml/CjsYamlFormat.js";
import { writePyYaml } from "./core/PyYamlWriter.js";

/**
 * The game's character files with an extension of their own (`.prs`, `.type`, `.color`, `.proj`, `.pose`, `.base`,
 * `.info`, `.face`, `.trif`). Every one is a PyYAML dump, so one format reads them all, through the YAML reader. By
 * default it reads losslessly: `!!python/` tags stay as tag envelopes (`preservePythonTags`), ints stay bigints
 * (`intAsBigInt`), and a node the file shares stays shared. It writes the same values back as PyYAML dumped them
 * (`writePyYaml`), so read, write and read again give equal values. A caller that wants plain values reads with
 * `{ preservePythonTags: false, intAsBigInt: false }`.
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
     * How PyYAML dumped each file type, as `writePyYaml` options, read off the shipped files (the round-trip test
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

    /**
     * Creates the format with the lossless read options under the caller's.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     */
    constructor(options = {})
    {
        super({ ...CjsCharacterYamlFormat.readOptions, ...options });
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
        return CjsYamlFormat.read(input, { ...CjsCharacterYamlFormat.readOptions, ...options });
    }

    /**
     * Reads raw values losslessly (`readOptions`) unless the caller's options say otherwise.
     * @param {string|ArrayBuffer|ArrayBufferView} input YAML text or UTF-8 bytes.
     * @param {object} [options={}] Option overrides; any CjsYamlValues field.
     * @returns {*} The raw values, shared nodes kept shared.
     */
    static readRaw(input, options = {})
    {
        return CjsYamlFormat.readRaw(input, { ...CjsCharacterYamlFormat.readOptions, ...options });
    }

    /**
     * Writes raw values as PyYAML dumped the file type (`dumpStyles`); the caller's options win.
     * @param {*} value Raw values, as the lossless read gives them.
     * @param {{ extension?: string, defaultFlowStyle?: ?boolean, sortKeys?: boolean, emptyNull?: boolean, floatDigits?: ?number, lineBreak?: string }} [options={}]
     *   The file type (`.prs`), and any `writePyYaml` option to use in place of its type's.
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
        return writePyYaml(value, { ...style, ...overrides });
    }

    static inputs = CjsFormat.defineInputs({
        raw: { default: true, options: [ "extension", "defaultFlowStyle", "sortKeys", "emptyNull", "floatDigits", "lineBreak" ] }
    });
}
