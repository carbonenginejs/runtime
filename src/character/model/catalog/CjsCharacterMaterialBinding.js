import { meta, type } from "#schema";

/** Exact source-qualified material selection with producer provenance. */
@meta.define("CjsCharacterMaterialBinding")
export class CjsCharacterMaterialBinding
{
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    kind = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterPartType")
    partType = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterColorLocation")
    colorLocation = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterColorName")
    colorName = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterMaterialProfile")
    materialProfile = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterOrigin")
    origin = null;

}
