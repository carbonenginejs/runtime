import { meta } from "#schema";

/**
 * One producer-verified atomic configuration/geometry relationship.
 *
 * Decoded from the configuration's own mesh resource path. `lod` and
 * `modelFamily` are labelled derivations (see their `*Origin` fields) set
 * only when the paired paths agree on terminal LOD or normalized stem.
 * Bundles do not remove candidates from the version's inventories.
 */
@meta.define({ className: "CjsCharacterPartModelBundle", family: "character" })
export class CjsCharacterPartModelBundle
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    configurationPath = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    geometryPath = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    lod = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    lodOrigin = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    modelFamily = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    modelFamilyOrigin = null;

}

export default CjsCharacterPartModelBundle;
