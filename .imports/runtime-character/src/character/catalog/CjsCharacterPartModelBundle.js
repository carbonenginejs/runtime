import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** One producer-verified atomic configuration/geometry relationship. */
@type.define({ className: "CjsCharacterPartModelBundle", family: "character" })
export class CjsCharacterPartModelBundle extends CjsModel
{

    @io.readwrite
    @type.string
    configurationPath = null;

    @io.readwrite
    @type.string
    geometryPath = null;

    @io.readwrite
    @type.int32
    lod = null;

    @io.readwrite
    @type.string
    lodOrigin = null;

    @io.readwrite
    @type.string
    modelFamily = null;

    @io.readwrite
    @type.string
    modelFamilyOrigin = null;

}

export default CjsCharacterPartModelBundle;
