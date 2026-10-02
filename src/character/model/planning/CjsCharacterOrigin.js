import { meta } from "#schema";

/** Provenance record classifying one appearance-plan fact or decision. */
@meta.define({ className: "CjsCharacterOrigin", family: "character" })
export class CjsCharacterOrigin
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    kind = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    document = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    recordID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    jsonPointer = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    resourcePath = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    rule = null;

}

export default CjsCharacterOrigin;
