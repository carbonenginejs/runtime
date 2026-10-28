import { CjsSchema } from "../../global/schema/CjsSchema.js";
import { getClassRegistrations } from "../../global/blue/classes/registry.js";

const PYTHON_OBJECT = "tag:yaml.org,2002:python/object:";

/**
 * Binds one Python object handler to registered names through YAML's existing
 * exact-tag lookup. Call after the desired classes and aliases are registered.
 * No Python code is evaluated and no character classes are imported here.
 *
 * @returns {Map<string, Function>} Exact tags sharing the same handler.
 */
export function createCharacterYamlTagHandlers()
{
    const handlers = new Map();
    for (const registration of getClassRegistrations())
    {
        handlers.set(PYTHON_OBJECT + registration.name, readCharacterYamlObject);
    }
    return handlers;
}

/**
 * Constructs a registered YAML-tagged object through the existing values door.
 * The reader has already resolved child tags and aliases before this callback.
 *
 * @param {object} values Authored mapping, with children already converted.
 * @param {{tag:string,sourceName:string|null}} context YAML tag and source.
 * @returns {object} A newly populated registered instance.
 * @throws {TypeError} If the tag, class name or mapping is invalid.
 */
export function readCharacterYamlObject(values, context)
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
    CjsSchema.setValues(object, normalizeCharacterYamlValues(Constructor, values), { initialize: false });
    return object;
}

/**
 * Normalizes only declared string/list nulls and the two reviewed light flags.
 * Source keys and scalar references are copied without rewriting their spelling.
 *
 * @param {Function} Constructor Registered target declaration.
 * @param {object} values Authored plain values.
 * @returns {object} Values suitable for the target's existing transport.
 */
export function normalizeCharacterYamlValues(Constructor, values)
{
    const fields = new Map(CjsSchema.getSchema(Constructor).fields.map(field => [ field.name, field.type ]));
    const result = { ...values };
    for (const [ key, value ] of Object.entries(values))
    {
        const descriptor = fields.get(key) || null;
        const kind = descriptor?.kind;
        let normalized = value;
        if (value === null && [ "string", "path", "wpath", "wstring" ].includes(kind)) normalized = "";
        else if (value === null && kind === "list") normalized = [];
        if (CjsSchema.getClassName(Constructor) === "Tr2InteriorLightSource"
            && [ "primaryLighting", "useKelvinColor" ].includes(key)
            && (value === 0 || value === 1))
        {
            normalized = value === 1;
        }
        result[key] = normalized;
    }
    return result;
}
