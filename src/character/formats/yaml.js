import { CjsSchema } from "../../blue/schema/CjsSchema.js";
import { DictReader } from "../../blue/formats/graph/DictReader.js";
import { getClassRegistrations } from "../../blue/exposure/classes/registry.js";

const PYTHON_OBJECT = "tag:yaml.org,2002:python/object:";

/**
 * Binds one Python object handler to registered names through YAML's existing
 * exact-tag lookup. Call after the desired classes and aliases are registered.
 * No Python code is evaluated and no character classes are imported here.
 *
 * @param {Object<string, Object<string, string[]>>} sourceLists The caller's list forms, by record class
 *   (`normalizeCharacterYamlValues`).
 * @returns {Map<string, Function>} Exact tags sharing the same handler.
 */
export function createCharacterYamlTagHandlers(sourceLists)
{
    const handlers = new Map();
    const handler = (values, context) => readCharacterYamlObject(values, context, sourceLists);
    for (const registration of getClassRegistrations())
    {
        handlers.set(PYTHON_OBJECT + registration.name, handler);
    }
    return handlers;
}

/**
 * Constructs a registered YAML-tagged object through the existing values door.
 * The reader has already resolved child tags and aliases before this callback.
 *
 * @param {object} values Authored mapping, with children already converted.
 * @param {{tag:string,sourceName:string|null}} context YAML tag and source.
 * @param {Object<string, Object<string, string[]>>} sourceLists The caller's list forms, by record class.
 * @returns {object} A newly populated registered instance.
 * @throws {TypeError} If the tag, class name or mapping is invalid.
 */
export function readCharacterYamlObject(values, context, sourceLists)
{
    const tag = context.tag;
    if (!tag.startsWith(PYTHON_OBJECT))
    {
        throw new TypeError(`Unsupported character object tag ${tag}.`);
    }
    const name = tag.slice(PYTHON_OBJECT.length);
    const Constructor = CjsSchema.getConstructor(name);
    if (!Constructor)
    {
        throw new TypeError(`${context.sourceName || "YAML input"}: unregistered Python object ${name}.`);
    }
    CjsSchema.assertValues(values, `Python object ${name}`);
    if (values === null)
    {
        throw new TypeError(`Python object ${name} requires a mapping.`);
    }
    const object = new Constructor();
    new DictReader({ liveLists: true }).ReadInto(object, normalizeCharacterYamlValues(Constructor, values, sourceLists), null);
    return object;
}

/**
 * Normalizes only declared string/list nulls and the two reviewed light flags, and translates the record class's
 * list forms. Source keys and scalar references are copied without rewriting their spelling, except where a list form
 * renames a key.
 *
 * The list forms are the caller's, as each owner declares the files it reads: the parts library's
 * (`CjsCharacterLibraryConfiguration.sourceLists`) and the character factory's recipes
 * (`CjsCharacterFactory.recipeConfiguration`). For each file key, a form is one of:
 * - a field name: the key's value is that field's (`colorvariation` is `colorVariation`);
 * - field names: the key's list holds one item per field, in order (`TranslateSourceList`);
 * - `{ text, list, pattern }`: the key's value is a list written as Python tuple text; with the record's `pattern`
 *   set its items fill the `pattern` fields in order, else they are the `list` field's colours.
 * Tuples are colours (an RGB tuple gains alpha 1) or a vec4. The model classes hold the fields; how a file lays them
 * out is the format's.
 *
 * Ours (non-carbon-extensions.md § *Character source YAML values*): the game's files write colours as tuple
 * lists, and the records hold one named colour per value, as Carbon exposes
 * `EveSOFDataFactionColorSet` colour by colour.
 *
 * @param {Function} Constructor Registered target declaration.
 * @param {object} values Authored plain values.
 * @param {Object<string, Object<string, (string|string[]|{ text: true, list: string, pattern: string[] })>>} sourceLists
 *   The caller's list forms, by record class.
 * @returns {object} Values suitable for the target's existing transport.
 */
export function normalizeCharacterYamlValues(Constructor, values, sourceLists)
{
    const className = CjsSchema.getClassName(Constructor);
    const lists = sourceLists[className] ?? {};
    const fields = new Map(CjsSchema.getSchema(Constructor).fields.map(field => [ field.name, field.type ]));

    // Renamed keys first, so their nulls normalize by the field they fill.
    const named = {};
    for (const [ key, value ] of Object.entries(values)) named[typeof lists[key] === "string" ? lists[key] : key] = value;

    const result = { ...named };
    for (const [ key, value ] of Object.entries(named))
    {
        const kind = fields.get(key)?.kind;
        let normalized = value;
        if (value === null && [ "string", "path", "wpath", "wstring" ].includes(kind)) normalized = "";
        else if (value === null && kind === "list") normalized = [];
        if (className === "Tr2InteriorLightSource"
            && [ "primaryLighting", "useKelvinColor" ].includes(key)
            && (value === 0 || value === 1))
        {
            normalized = value === 1;
        }
        result[key] = normalized;
    }

    for (const [ key, form ] of Object.entries(lists))
    {
        if (typeof form === "string" || !Object.hasOwn(values, key)) continue;
        const value = values[key];
        delete result[key];
        if (value === null) continue;
        if (Array.isArray(form)) TranslateSourceList(className + "." + key, value, form, result);
        else if (value !== "")
        {
            const items = ReadTupleText(className + "." + key, value);
            if (result.pattern) TranslateSourceList(className + "." + key, items, form.pattern, result);
            else result[form.list] = items.map((item, i) => ReadTuple(className + "." + key + "[" + i + "]", item));
        }
    }
    return result;
}

/**
 * Copies each item of a file's list into its named field, in order. An item is a tuple or a number.
 * @param {string} label The file key, for errors.
 * @param {*} list The file's list.
 * @param {string[]} names The fields, one per item.
 * @param {object} result The values to set, edited in place.
 * @returns {void}
 * @throws {TypeError} For a list of another length or an item that is neither.
 */
function TranslateSourceList(label, list, names, result)
{
    if (!Array.isArray(list) || list.length !== names.length) throw new TypeError(`${label} must list ${names.length} item(s)`);
    for (let i = 0; i < names.length; i++) result[names[i]] = Number.isFinite(list[i]) ? list[i] : ReadTuple(label + "[" + i + "]", list[i]);
}

/**
 * A colour or vec4 tuple: three or four finite numbers, an RGB tuple gaining alpha 1.
 * @param {string} label The item, for errors.
 * @param {*} tuple The file's tuple.
 * @returns {number[]} Four numbers.
 * @throws {TypeError} For any other value.
 */
function ReadTuple(label, tuple)
{
    if (!Array.isArray(tuple) || (tuple.length !== 3 && tuple.length !== 4) || !tuple.every(Number.isFinite))
        throw new TypeError(`${label} must be an RGB or RGBA tuple or a number`);
    return tuple.length === 3 ? [ tuple[0], tuple[1], tuple[2], 1 ] : tuple;
}

/**
 * A list written as Python tuple text (a recipe entry's `colors`: `'[(r, g, b, a), ...]'` or a tuple of tuples, then
 * any scalars): its tuples in order, then its scalars.
 * @param {string} label The file key, for errors.
 * @param {*} text The file's text.
 * @returns {Array<(number[]|number)>} The items.
 * @throws {TypeError} For a value that is not such text.
 */
function ReadTupleText(label, text)
{
    if (typeof text !== "string") throw new TypeError(`${label} must be tuple text`);
    const tuples = Array.from(text.matchAll(/\(([^()]*)\)/gu), match => match[1].split(",").map(Number));
    const scalars = text.replace(/\(([^()]*)\)/gu, "").split(/[\[\],\s()]+/u).filter(token => token !== "").map(Number);
    if (!scalars.every(Number.isFinite)) throw new TypeError(`${label} must be tuple text`);
    return tuples.concat(scalars);
}
