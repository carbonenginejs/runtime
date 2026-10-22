// Source: trinity/trinity/Resources/Tr2MaterialRes.h
// Schema: format-carbon resources/Tr2MaterialRes.json; maintained by the runtime resource layer.
import { exposure as be } from "#be";
import { CjsSchema, type } from "#schema";
import { IRoot } from "#blue";

/**
 * Root persisted material record containing its authored name and material
 * mesh dictionary.
 *
 * It owns the serializable material description, not device shaders,
 * descriptor bindings, or pipelines.
 */
export class Tr2MaterialRes
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
CjsSchema.exposure.inherit(IRoot)(Tr2MaterialRes);

CjsSchema.decorateField(Tr2MaterialRes, "meshes", be.mapAttribute(be.READ | be.PERSIST), type.rootRef("Tr2MaterialMeshDict"));
CjsSchema.decorateField(Tr2MaterialRes, "name", be.mapAttribute(be.READWRITE | be.PERSIST), type.string);
CjsSchema.exposure.define("Tr2MaterialRes")(Tr2MaterialRes);
