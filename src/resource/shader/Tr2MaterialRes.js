// Source: trinity/trinity/Resources/Tr2MaterialRes.h
// Schema: format-carbon resources/Tr2MaterialRes.json; maintained by runtime-resource.
import { CjsSchema, io, type } from "#schema";
import { CjsModel } from "#model";

/**
 * Root persisted material record containing its authored name and material
 * mesh dictionary.
 *
 * It owns the serializable material description, not device shaders,
 * descriptor bindings, or pipelines.
 */
export class Tr2MaterialRes extends CjsModel
{

  /** Persisted dictionary of material meshes. */
  meshes = null;

  /** Authored material name. */
  name = "";

}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2MaterialRes, {
  className: "Tr2MaterialRes",
  family: "resources",
  fields: {
    meshes: [ io.persist, type.objectRef("Tr2MaterialMeshDict") ],
    name: [ io.persist, type.string ]
  }
});
