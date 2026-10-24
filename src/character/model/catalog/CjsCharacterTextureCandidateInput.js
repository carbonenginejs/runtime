import { meta, type } from "#schema";

/** Original candidate presence and qualified inheritance intent before materialization. */
@meta.define("CjsCharacterTextureCandidateInput")
export class CjsCharacterTextureCandidateInput
{
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    mode = "omitted";

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    paths = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterOrigin")
    origin = null;

}
