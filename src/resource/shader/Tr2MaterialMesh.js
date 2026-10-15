// Source: trinity/trinity/Resources/Tr2MaterialRes.h
// Schema: format-carbon resources/Tr2MaterialMesh.json; maintained by the runtime resource layer.
import { CjsSchema, type, blue } from "#schema";
import { IRoot } from "#blue";

/**
 * Holds the persisted material-area dictionary for one material mesh.
 *
 * Area lookup remains resource metadata; engines decide how the selected
 * material becomes backend draw state.
 */
export class Tr2MaterialMesh
{

  /** Persisted dictionary of material areas. */
  areas = null;

}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.blue.inherit(IRoot)(Tr2MaterialMesh);
CjsSchema.blue.interface(IRoot, Tr2MaterialMesh)(Tr2MaterialMesh);
CjsSchema.blue.define(Tr2MaterialMesh, {
  className: "Tr2MaterialMesh",
  fields: {
    areas: [ blue.read, blue.persist, type.rootRef("Tr2MaterialAreaDict") ]
  }
});
