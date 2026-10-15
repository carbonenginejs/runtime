import { meta, type, blue } from "#schema";

/** Provenance record classifying one appearance-plan fact or decision. */
@meta.define("CjsCharacterOrigin")
export class CjsCharacterOrigin
{

    @blue.readwrite
    @blue.persist
    @type.string
    kind = "";

    @blue.readwrite
    @blue.persist
    @type.string
    document = null;

    @blue.readwrite
    @blue.persist
    @type.string
    recordID = null;

    @blue.readwrite
    @blue.persist
    @type.string
    jsonPointer = null;

    @blue.readwrite
    @blue.persist
    @type.path
    resourcePath = null;

    @blue.readwrite
    @blue.persist
    @type.string
    rule = null;

}

export default CjsCharacterOrigin;
