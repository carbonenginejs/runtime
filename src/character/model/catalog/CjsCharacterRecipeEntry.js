import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { vec4 } from "#math/vec4";

/** One authored character recipe selection and its material values. */
@meta.define("CjsCharacterRecipeEntry")
export class CjsCharacterRecipeEntry
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    category = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    path = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    weight = 1;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    colorVariation = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterColorValue")
    colors = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterColorValue")
    specularColors = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    pattern = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterColorValue")
    patternColors = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.vec4
    patternTransform = vec4.fromValues(0, 0, 1, 1);

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    patternRotation = 0;

}

export default CjsCharacterRecipeEntry;
