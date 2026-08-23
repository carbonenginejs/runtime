import { io, type } from "#schema";
import { CjsModel } from "#model";

/** One authored character recipe selection and its material values. */
@type.define({ className: "CjsCharacterRecipeEntry", family: "character" })
export class CjsCharacterRecipeEntry extends CjsModel
{

    @io.readwrite
    @type.string
    category = "";

    @io.readwrite
    @type.string
    path = "";

    @io.readwrite
    @type.float64
    weight = 1;

    @io.readwrite
    @type.string
    colorVariation = null;

    @io.readwrite
    @type.list("CjsCharacterColorValue")
    colors = [];

    @io.readwrite
    @type.list("CjsCharacterColorValue")
    specularColors = [];

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

}

export default CjsCharacterRecipeEntry;
