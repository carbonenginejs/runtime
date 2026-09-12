// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOF.cpp
//
// The values-document predicates and the literal-$ref marker, shared by EveSOF
// and SofDocumentBuilder. They live here rather than on either of them so that
// splitting the builder out does not put the two modules in an import cycle.


// A model-values record may legitimately own a `$ref` field: only `_ref` is
// reserved by that format. Mark such records while they cross the deprecated
// document intermediate so its private reference walker does not reinterpret
// their data. Symbols survive the in-process shallow normalization but never
// appear in either JSON output shape.
export const VALUES_LITERAL_DOLLAR_REF = Symbol("values-literal-dollar-ref");

export function IsModelValuesRoot(value)
{
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.hasOwn(value, "_type")
    && typeof value._type === "string"
    && value._type.length > 0;
}

export function IsModelValuesReference(value)
{
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.hasOwn(value, "_ref");
}

export function remapImportedValue(value, refs)
{
  if (Array.isArray(value)) return value.map(item => remapImportedValue(item, refs));
  if (!value || typeof value !== "object") return value;
  if (Object.hasOwn(value, "$ref"))
  {
    const ref = refs.get(Number(value.$ref));
    if (!ref) throw new TypeError(`EveSOF child resource ref ${value.$ref} does not exist`);
    return { $ref: ref.$ref };
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, remapImportedValue(item, refs)]));
}
