import { meta } from "#schema";

/** One authored character recipe selection and its material values. */
@meta.define({ className: "CjsCharacterRecipeEntry", family: "character" })
export class CjsCharacterRecipeEntry
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    category = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    path = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    weight = 1;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    colorVariation = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterColorValue")
    colors = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterColorValue")
    specularColors = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    pattern = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterColorValue")
    patternColors = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.vec4
    patternTransform = [ 0, 0, 1, 1 ];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    patternRotation = 0;

}

export default CjsCharacterRecipeEntry;
