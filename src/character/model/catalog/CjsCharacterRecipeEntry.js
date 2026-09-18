import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** One authored character recipe selection and its material values. */
@type.define({ className: "CjsCharacterRecipeEntry", family: "character" })
export class CjsCharacterRecipeEntry extends CjsModel
{

    @edit.readwrite
    @type.string
    category = "";

    @edit.readwrite
    @type.string
    path = "";

    @edit.readwrite
    @type.float64
    weight = 1;

    @edit.readwrite
    @type.string
    colorVariation = null;

    @edit.readwrite
    @type.list("CjsCharacterColorValue")
    colors = [];

    @edit.readwrite
    @type.list("CjsCharacterColorValue")
    specularColors = [];

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

}

export default CjsCharacterRecipeEntry;
