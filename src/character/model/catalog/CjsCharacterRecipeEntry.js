import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** One authored character recipe selection and its material values. */
@type.define({ className: "CjsCharacterRecipeEntry", family: "character" })
export class CjsCharacterRecipeEntry extends CjsModel
{

    @edit.readwrite
    @edit.persist
    @type.string
    category = "";

    @edit.readwrite
    @edit.persist
    @type.string
    path = "";

    @edit.readwrite
    @edit.persist
    @type.float64
    weight = 1;

    @edit.readwrite
    @edit.persist
    @type.string
    colorVariation = null;

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterColorValue")
    colors = [];

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterColorValue")
    specularColors = [];

    @edit.readwrite
    @edit.persist
    @type.string
    pattern = null;

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterColorValue")
    patternColors = [];

    @edit.readwrite
    @edit.persist
    @type.vec4
    patternTransform = [ 0, 0, 1, 1 ];

    @edit.readwrite
    @edit.persist
    @type.float64
    patternRotation = 0;

}

export default CjsCharacterRecipeEntry;
