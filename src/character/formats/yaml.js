import { CjsSchema } from "../../blue/schema/CjsSchema.js";
import { DictReader } from "../../blue/formats/graph/DictReader.js";
import { getClassRegistrations } from "../../blue/exposure/classes/registry.js";

const PYTHON_OBJECT = "tag:yaml.org,2002:python/object:";

/**
 * Binds one Python object handler to registered names through YAML's existing
 * exact-tag lookup. Call after the desired classes and aliases are registered.
 * No Python code is evaluated and no character classes are imported here.
 *
 * @param {Object<string, Object<string, (string|string[]|object)>>} sourceLists The caller's list forms, by record class
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
 * @param {Object<string, Object<string, (string|string[]|object)>>} sourceLists The caller's list forms, by record class.
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
 * - `{ list, pattern }`: the key's value is a list of tuples and numbers (the character format has read a recipe's
 *   Python repr text, `CjsCharacterYamlFormat.decodeRepr`); with the record's `pattern` set its items fill the
 *   `pattern` fields in order, else they are the `list` field's colours.
 * - `{ keyed?, value?, tuple?, rest? }`: the key's value becomes the field's list of records (`ReadRecordList`). With
 *   `keyed` the file holds a mapping and each key fills that field of its record (a whole-number field takes the key
 *   as a number); without it the file holds a list. Each value fills its record by `tuple` (field names by position;
 *   where a file mixes tuple shapes, the names for each tuple length; `rest` takes the items after the names as one
 *   list), else whole into the `value` field, else, a mapping, field by field.
 * Tuples are colours (an RGB tuple gains alpha 1) or a vec4. The model classes hold the fields; how a file lays them
 * out is the format's. A list of records is the library's shape for a keyed collection: values hold no maps
 * (model-values-interchange.md § Collections).
 *
 * Ours (non-carbon-extensions.md § *Character source YAML values*): the game's files write colours as tuple
 * lists, and the records hold one named colour per value, as Carbon exposes
 * `EveSOFDataFactionColorSet` colour by colour.
 *
 * @param {Function} Constructor Registered target declaration.
 * @param {object} values Authored plain values.
 * @param {Object<string, Object<string, (string|string[]|{ list: string, pattern: string[] }|{ keyed?: string, value?: string, tuple?: (string[]|Object<number, string[]>), rest?: string })>>} sourceLists
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
        else if (form.list === undefined)
        {
            // A whole-number field takes a keyed mapping's keys as numbers (a vertex index).
            const Item = RecordClass(fields.get(key)?.itemType);
            const keyKind = Item && form.keyed !== undefined ? CjsSchema.getSchema(Item).fields.find(field => field.name === form.keyed)?.type.kind : undefined;
            const numeric = [ "int8", "int16", "int32", "uint8", "uint16", "uint32" ].includes(keyKind);
            result[key] = ReadRecordList(className + "." + key, value, form, numeric);
        }
        else if (value !== "")
        {
            if (!Array.isArray(value)) throw new TypeError(className + "." + key + " must be a list of tuples");
            const items = value;
            if (result.pattern) TranslateSourceList(className + "." + key, items, form.pattern, result);
            else result[form.list] = items.map((item, i) => ReadTuple(className + "." + key + "[" + i + "]", item));
        }
    }

    // Records the file nests (a map's values, a list's items, one member's record) normalize by their own class, so
    // their list forms apply too (a material set's materials, each with its attributes' colours).
    for (const [ key, value ] of Object.entries(result))
    {
        const type = fields.get(key);
        if (!type || value === null || typeof value !== "object") continue;
        const nested = (item, Item) => IsPlainRecord(item) ? normalizeCharacterYamlValues(Item, item, sourceLists) : item;
        if (type.kind === "map")
        {
            const Item = RecordClass(type.valueType);
            if (Item && IsPlainRecord(value)) result[key] = Object.fromEntries(Object.entries(value).map(([ name, item ]) => [ name, nested(item, Item) ]));
        }
        else if (type.kind === "list")
        {
            const Item = RecordClass(type.itemType);
            if (Item && Array.isArray(value)) result[key] = value.map(item => nested(item, Item));
        }
        else
        {
            const Item = RecordClass(type);
            if (Item) result[key] = nested(value, Item);
        }
    }
    return result;
}

/**
 * The registered record class a member type holds, or null for a value type.
 * @param {*} type A field type, a map's value type or a list's item type (a class name, or `{ className }`).
 * @returns {?Function} The class.
 */
function RecordClass(type)
{
    const name = typeof type === "string" ? type : type?.className;
    return name ? CjsSchema.getConstructor(name) ?? null : null;
}

/**
 * Whether a value is a plain authored record (not an instance, a list or a reference).
 * @param {*} value The value.
 * @returns {boolean} Whether to normalize it.
 */
function IsPlainRecord(value)
{
    return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype && !Object.hasOwn(value, "_ref");
}

/**
 * A file's keyed mapping or list as a list of records' values, each then read by the list's record class (its own list
 * forms apply in the nested pass).
 * @param {string} label The file key, for errors.
 * @param {*} value The file's mapping (`keyed`) or list.
 * @param {{ keyed?: string, value?: string, tuple?: (string[]|Object<number, string[]>), rest?: string }} form The
 *   list form.
 * @param {boolean} numeric Whether the `keyed` field is a whole number.
 * @returns {object[]} The records' values, in file order, except that whole-number keys come first, ascending, as a
 *   JavaScript object holds them.
 * @throws {TypeError} For a value of another shape, a key that is not a whole number for a whole-number field, a
 *   mapping value that writes the `keyed` field itself, or a tuple whose length its form does not name.
 */
function ReadRecordList(label, value, form, numeric)
{
    let entries;
    if (form.keyed !== undefined)
    {
        if (!IsPlainRecord(value)) throw new TypeError(label + " must be a mapping");
        entries = Object.entries(value);
    }
    else
    {
        if (!Array.isArray(value)) throw new TypeError(label + " must be a list");
        entries = value.map(item => [ null, item ]);
    }
    return entries.map(([ key, item ], index) =>
    {
        const at = label + (key === null ? "[" + index + "]" : "." + key);
        const record = {};
        if (form.tuple !== undefined)
        {
            if (!Array.isArray(item)) throw new TypeError(at + " must be a tuple");
            const names = Array.isArray(form.tuple) ? form.tuple : form.tuple[item.length];
            if (!names || item.length < names.length || (form.rest === undefined && item.length !== names.length))
                throw new TypeError(`${at} has ${item.length} items; its form names no tuple of that length`);
            for (let i = 0; i < names.length; i++) record[names[i]] = item[i];
            if (form.rest !== undefined) record[form.rest] = item.slice(names.length);
        }
        else if (form.value !== undefined) record[form.value] = item;
        else if (IsPlainRecord(item)) Object.assign(record, item);
        else throw new TypeError(at + " must be a mapping");
        if (form.keyed !== undefined)
        {
            if (Object.hasOwn(record, form.keyed)) throw new TypeError(`${at} writes ${form.keyed}, which its key fills`);
            const name = numeric ? Number(key) : key;
            if (numeric && !(Number.isInteger(name) && String(name) === key)) throw new TypeError(at + " must be keyed by a whole number");
            record[form.keyed] = name;
        }
        return record;
    });
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
