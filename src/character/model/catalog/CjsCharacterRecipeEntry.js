import { meta, type } from "#schema";
import { vec4 } from "#math/vec4";

/** One authored character recipe selection and its material values. */
@meta.define("CjsCharacterRecipeEntry")
export class CjsCharacterRecipeEntry
{

    @meta.readwrite
    @meta.persist
    @type.string
    category = "";

    @meta.readwrite
    @meta.persist
    @type.string
    path = "";

    @meta.readwrite
    @meta.persist
    @type.float64
    weight = 1;

    @meta.readwrite
    @meta.persist
    @type.string
    colorVariation = null;

    @meta.readwrite
    @meta.persist
    @type.list("CjsCharacterColorValue")
    colors = [];

    @meta.readwrite
    @meta.persist
    @type.list("CjsCharacterColorValue")
    specularColors = [];

    @meta.readwrite
    @meta.persist
    @type.string
    pattern = null;

    @meta.readwrite
    @meta.persist
    @type.list("CjsCharacterColorValue")
    patternColors = [];

    @meta.readwrite
    @meta.persist
    @type.vec4
    patternTransform = vec4.fromValues(0, 0, 1, 1);

    @meta.readwrite
    @meta.persist
    @type.float64
    patternRotation = 0;

}

export default CjsCharacterRecipeEntry;
