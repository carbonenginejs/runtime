// Source: trinity/trinity/Resources/Tr2MaterialRes.h
// Schema: format-carbon resources/Tr2MaterialArea.json; maintained by runtime-resource.
import { CjsSchema, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/**
 * Associates one material-area metatype with its persisted parameter store.
 *
 * The record describes resource data and does not own shader bindings or
 * backend material realization.
 */
export class Tr2MaterialArea extends CjsModel
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
CjsSchema.define(Tr2MaterialArea, {
  className: "Tr2MaterialArea",
  family: "resources",
  fields: {
    material: [ io.persist, type.objectRef("Tr2MaterialParameterStore") ],
    metatype: [ io.persist, type.string ]
  }
});
