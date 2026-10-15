import { meta, type } from "#schema";

/**
 * One producer-verified atomic configuration/geometry relationship.
 *
 * Decoded from the configuration's own mesh resource path. `lod` and
 * `modelFamily` are labelled derivations (see their `*Origin` fields) set
 * only when the paired paths agree on terminal LOD or normalized stem.
 * Bundles do not remove candidates from the version's inventories.
 */
@meta.define("CjsCharacterPartModelBundle")
export class CjsCharacterPartModelBundle
{

    @meta.readwrite
    @meta.persist
    @type.path
    configurationPath = null;

    @meta.readwrite
    @meta.persist
    @type.path
    geometryPath = null;

    @meta.readwrite
    @meta.persist
    @type.int32
    lod = null;

    @meta.readwrite
    @meta.persist
    @type.string
    lodOrigin = null;

    @meta.readwrite
    @meta.persist
    @type.string
    modelFamily = null;

    @meta.readwrite
    @meta.persist
    @type.string
    modelFamilyOrigin = null;

}

export default CjsCharacterPartModelBundle;
