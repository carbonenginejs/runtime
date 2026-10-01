import { CjsSchema } from "../schema/CjsSchema.js";

const VIEWS = new WeakMap();

/**
 * Selects the JavaScript dictionary values view, not native persistence.
 * Derived owners claim exposed names first; within one owner stored members
 * precede live properties. Filters run after selection, without falling back
 * to a shadowed declaration or merging its flags. This keeps export/import
 * addressing identical, including the unrestricted all-fields values view.
 * @param {Function} Constructor Declared class.
 * @returns {object} Selected fields and exact-name/alias lookup maps.
 */
export function getDictionaryDeclarations(Constructor)
{
  const schema = CjsSchema.getSchema(Constructor);
  const previous = VIEWS.get(Constructor);
  // getSchema invalidates its identity on schema and registration revisions.
  if (previous?.schema === schema) return previous;

  const fields = [];
  const byName = new Map();
  for (let owner = Constructor; typeof owner === "function"; owner = Object.getPrototypeOf(owner))
  {
    for (const declarations of [schema.members, schema.properties])
    {
      for (const field of declarations)
      {
        if (field.declaringClass !== owner || byName.has(field.name)) continue;
        byName.set(field.name, field);
        fields.push(field);
      }
    }
  }

  const aliases = new Map();
  for (const field of fields)
  {
    const declared = field.aliases ?? (field.alias === undefined ? [] : [field.alias]);
    for (const alias of Array.isArray(declared) ? declared : [declared])
    {
      if (typeof alias === "string" && alias && !byName.has(alias) && !aliases.has(alias)) aliases.set(alias, field);
    }
  }
  const view = { schema, fields, byName, aliases };
  VIEWS.set(Constructor, view);
  return view;
}

/**
 * Reads stored key/index data, or invokes an explicitly live property.
 * @param {object} instance Dictionary target.
 * @param {object} field Selected canonical declaration.
 * @returns {*} Current value.
 */
export function readDictionaryValue(instance, field)
{
  const { target, key } = dictionaryTarget(instance, field);
  return field.role === "property" ? target[key] : dataValue(target, key);
}

/**
 * Writes the same key/index addressed by dictionary export.
 * @param {object} instance Dictionary target.
 * @param {object} field Selected canonical declaration.
 * @param {*} value Decoded value.
 */
export function writeDictionaryValue(instance, field, value)
{
  const { target, key } = dictionaryTarget(instance, field);
  if (field.role === "member") dataValue(target, key);
  target[key] = value;
}

/** Resolves an existing indexed slot without inventing storage or invoking stored accessors. */
function dictionaryTarget(instance, field)
{
  let target = instance;
  let key = field.key;
  if (field.index !== undefined)
  {
    const value = field.role === "property" ? target[key] : dataValue(target, key);
    if (!Number.isInteger(field.index) || field.index < 0)
    {
      throw new TypeError(`Dictionary member ${field.name} has an invalid storage index.`);
    }
    if (!Array.isArray(value) && !(ArrayBuffer.isView(value) && !(value instanceof DataView)))
    {
      throw new TypeError(`Dictionary member ${field.name} requires existing indexed storage.`);
    }
    if (field.index >= value.length)
    {
      throw new RangeError(`Dictionary member ${field.name} exceeds its indexed storage length.`);
    }
    target = value;
    key = field.index;
  }
  return { target, key };
}

/** Stored-member reads inspect data descriptors; only the property role runs accessors. */
function dataValue(target, key)
{
  for (let current = target; current !== null; current = Object.getPrototypeOf(current))
  {
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (!descriptor) continue;
    if (!Object.hasOwn(descriptor, "value"))
    {
      throw new TypeError(`Dictionary storage ${String(key)} is an accessor; declare its backing key.`);
    }
    return descriptor.value;
  }
  return undefined;
}
