import { meta, type } from "#schema";

/** Exact source-qualified material selection with producer provenance. */
@meta.define("CjsCharacterMaterialBinding")
export class CjsCharacterMaterialBinding
{
    
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    kind = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterPartType")
    partType = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterColorLocation")
    colorLocation = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterColorName")
    colorName = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterMaterialProfile")
    materialProfile = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterOrigin")
    origin = null;

}
