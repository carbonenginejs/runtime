import { io, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored character color, pattern, and specular profile. */
@type.define({ className: "CjsCharacterMaterialProfile", family: "character" })
export class CjsCharacterMaterialProfile extends CjsCharacterRecord
{

    @io.readwrite
    @type.path
    sourcePath = "";

    @io.readwrite
    @type.list("CjsCharacterColorValue")
    colors = [];

    @io.readwrite
    @type.string
    pattern = null;

    @io.readwrite
    @type.list("CjsCharacterColorValue")
    patternColors = [];

    @io.readwrite
    @type.vec4
    patternTransform = [ 0, 0, 1, 1 ];

    @io.readwrite
    @type.float64
    patternRotation = 0;

    @io.readwrite
    @type.list("CjsCharacterColorValue")
    specularColors = [];

}

export default CjsCharacterMaterialProfile;
