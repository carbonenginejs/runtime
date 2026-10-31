import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Provenance record classifying one appearance-plan fact or decision. */
@meta.define("CjsCharacterOrigin")
export class CjsCharacterOrigin
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    kind = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    document = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    recordID = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    jsonPointer = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.path
    resourcePath = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    rule = null;

}

export default CjsCharacterOrigin;
