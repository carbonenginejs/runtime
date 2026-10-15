import { meta, type } from "#schema";

/** Provenance record classifying one appearance-plan fact or decision. */
@meta.define("CjsCharacterOrigin")
export class CjsCharacterOrigin
{

    @meta.readwrite
    @meta.persist
    @type.string
    kind = "";

    @meta.readwrite
    @meta.persist
    @type.string
    document = null;

    @meta.readwrite
    @meta.persist
    @type.string
    recordID = null;

    @meta.readwrite
    @meta.persist
    @type.string
    jsonPointer = null;

    @meta.readwrite
    @meta.persist
    @type.path
    resourcePath = null;

    @meta.readwrite
    @meta.persist
    @type.string
    rule = null;

}

export default CjsCharacterOrigin;
