// Source: trinity/trinity/Resources/Tr2MaterialRes.h
// Schema: format-carbon resources/Tr2MaterialMesh.json; maintained by the runtime resource layer.
import { CjsSchema, io, type } from "#schema";
import { CjsModel } from "#model";

/**
 * Holds the persisted material-area dictionary for one material mesh.
 *
 * Area lookup remains resource metadata; engines decide how the selected
 * material becomes backend draw state.
 */
export class Tr2MaterialMesh extends CjsModel
{

  /** Persisted dictionary of material areas. */
  areas = null;

}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2MaterialMesh, {
  className: "Tr2MaterialMesh",
  family: "resources",
  fields: {
    areas: [ io.persist, type.objectRef("Tr2MaterialAreaDict") ]
  }
});
