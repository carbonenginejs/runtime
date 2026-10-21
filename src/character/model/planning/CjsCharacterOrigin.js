import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Provenance record classifying one appearance-plan fact or decision. */
@meta.define("CjsCharacterOrigin")
export class CjsCharacterOrigin
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    kind = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    document = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    recordID = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    jsonPointer = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.path
    resourcePath = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    rule = null;

}

export default CjsCharacterOrigin;
