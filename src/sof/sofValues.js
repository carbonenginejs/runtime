// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOF.cpp
//
// The model-values predicates and the literal-$ref marker, shared by EveSOF
// and SofValuesBuilder. They live here rather than on either of them so that
// splitting the builder out does not put the two modules in an import cycle.


// A model-values record may legitimately own a `$ref` field: only `_ref` is
// reserved by that format. Mark such records while they sit in the builder's
// node table so its reference walker does not reinterpret their data. Symbols
// never appear in the JSON output.
export const VALUES_LITERAL_DOLLAR_REF = Symbol("values-literal-dollar-ref");

/** Tests whether a value is an object with a nonempty model type tag. */
export function IsModelValuesRoot(value)
{
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.hasOwn(value, "_type")
    && typeof value._type === "string"
    && value._type.length > 0;
}

/** Tests whether a value is an object with a model reference tag. */
export function IsModelValuesReference(value)
{
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.hasOwn(value, "_ref");
}
