import { edit, type } from "#schema";
import { CjsModel } from "#model";

/**
 * One producer-verified atomic configuration/geometry relationship.
 *
 * Decoded from the configuration's own mesh resource path. `lod` and
 * `modelFamily` are labelled derivations (see their `*Origin` fields) set
 * only when the paired paths agree on terminal LOD or normalized stem.
 * Bundles do not remove candidates from the version's inventories.
 */
@type.define({ className: "CjsCharacterPartModelBundle", family: "character" })
export class CjsCharacterPartModelBundle extends CjsModel
{

    @edit.readwrite
    @edit.persist
    @type.string
    configurationPath = null;

    @edit.readwrite
    @edit.persist
    @type.string
    geometryPath = null;

    @edit.readwrite
    @edit.persist
    @type.int32
    lod = null;

    @edit.readwrite
    @edit.persist
    @type.string
    lodOrigin = null;

    @edit.readwrite
    @edit.persist
    @type.string
    modelFamily = null;

    @edit.readwrite
    @edit.persist
    @type.string
    modelFamilyOrigin = null;

}

export default CjsCharacterPartModelBundle;
