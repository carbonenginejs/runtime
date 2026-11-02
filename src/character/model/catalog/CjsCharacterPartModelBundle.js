import { exposure as be } from "#be";
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

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path
    configurationPath = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path
    geometryPath = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    lod = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    lodOrigin = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    modelFamily = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    modelFamilyOrigin = "";

}

export default CjsCharacterPartModelBundle;
