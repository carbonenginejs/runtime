// Source: trinity/trinity/Resources/Tr2MaterialRes.h
// Schema: format-carbon resources/Tr2MaterialArea.json; maintained by the runtime resource layer.
import { CjsSchema, type, blue } from "#schema";
import { IRoot } from "#blue";

/**
 * Associates one material-area metatype with its persisted parameter store.
 *
 * The record describes resource data and does not own shader bindings or
 * backend material realization.
 */
export class Tr2MaterialArea
{

  /** Persisted material parameter-store reference. */
  material = null;

  /** Authored material-area metatype. */
  metatype = "";

}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.blue.inherit(IRoot)(Tr2MaterialArea);

CjsSchema.decorateField(Tr2MaterialArea, "material", blue.readwrite, blue.persist, type.rootRef("Tr2MaterialParameterStore"));
CjsSchema.decorateField(Tr2MaterialArea, "metatype", blue.readwrite, blue.persist, type.string);
CjsSchema.exposure.define("Tr2MaterialArea")(Tr2MaterialArea);
