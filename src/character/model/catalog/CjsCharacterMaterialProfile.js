import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored character color, pattern, and specular profile. */
@type.define({ className: "CjsCharacterMaterialProfile", family: "character" })
export class CjsCharacterMaterialProfile extends CjsCharacterRecord
{

    @edit.readwrite
    @type.path
    sourcePath = "";

    @edit.readwrite
    @type.list("CjsCharacterColorValue")
    colors = [];

    @edit.readwrite
    @type.string
    pattern = null;

    @edit.readwrite
    @type.list("CjsCharacterColorValue")
    patternColors = [];

    @edit.readwrite
    @type.vec4
    patternTransform = [ 0, 0, 1, 1 ];

    @edit.readwrite
    @type.float64
    patternRotation = 0;

    @edit.readwrite
    @type.list("CjsCharacterColorValue")
    specularColors = [];

}

export default CjsCharacterMaterialProfile;
