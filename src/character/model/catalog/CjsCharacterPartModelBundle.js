import { meta, type, blue } from "#schema";

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

    @blue.readwrite
    @blue.persist
    @type.path
    configurationPath = null;

    @blue.readwrite
    @blue.persist
    @type.path
    geometryPath = null;

    @blue.readwrite
    @blue.persist
    @type.int32
    lod = null;

    @blue.readwrite
    @blue.persist
    @type.string
    lodOrigin = null;

    @blue.readwrite
    @blue.persist
    @type.string
    modelFamily = null;

    @blue.readwrite
    @blue.persist
    @type.string
    modelFamilyOrigin = null;

}

export default CjsCharacterPartModelBundle;
