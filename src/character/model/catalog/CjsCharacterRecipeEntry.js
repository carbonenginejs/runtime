import { meta, type, blue } from "#schema";
import { vec4 } from "#math/vec4";

/** One authored character recipe selection and its material values. */
@meta.define("CjsCharacterRecipeEntry")
export class CjsCharacterRecipeEntry
{

    @blue.readwrite
    @blue.persist
    @type.string
    category = "";

    @blue.readwrite
    @blue.persist
    @type.string
    path = "";

    @blue.readwrite
    @blue.persist
    @type.float64
    weight = 1;

    @blue.readwrite
    @blue.persist
    @type.string
    colorVariation = null;

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterColorValue")
    colors = [];

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterColorValue")
    specularColors = [];

    @blue.readwrite
    @blue.persist
    @type.string
    pattern = null;

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterColorValue")
    patternColors = [];

    @blue.readwrite
    @blue.persist
    @type.vec4
    patternTransform = vec4.fromValues(0, 0, 1, 1);

    @blue.readwrite
    @blue.persist
    @type.float64
    patternRotation = 0;

}

export default CjsCharacterRecipeEntry;
