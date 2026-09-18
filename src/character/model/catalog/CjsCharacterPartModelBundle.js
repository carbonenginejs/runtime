import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** One producer-verified atomic configuration/geometry relationship. */
@type.define({ className: "CjsCharacterPartModelBundle", family: "character" })
export class CjsCharacterPartModelBundle extends CjsModel
{

    @edit.readwrite
    @type.string
    configurationPath = null;

    @edit.readwrite
    @type.string
    geometryPath = null;

    @edit.readwrite
    @type.int32
    lod = null;

    @edit.readwrite
    @type.string
    lodOrigin = null;

    @edit.readwrite
    @type.string
    modelFamily = null;

    @edit.readwrite
    @type.string
    modelFamilyOrigin = null;

}

export default CjsCharacterPartModelBundle;
