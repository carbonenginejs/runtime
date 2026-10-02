import { meta } from "#schema";

/**
 * One source relationship whose target record does not exist: the owning
 * member holds null, and this records which identity it named.
 */
@meta.define({ className: "CjsCharacterUnresolvedRelationship", family: "character" })
export class CjsCharacterUnresolvedRelationship
{

    /** The document holding the relationship, such as `paperdolls`. */
    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    document = "";

    /** The owning record's `recordID`. */
    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    recordID = "";

    /** The member path within the record, such as `modifiers[1].paperdollResourceID`. */
    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    field = "";

    /** The document the relationship targets, such as `characterResources`. */
    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    targetDocument = "";

    /** The identity it named, which that document does not hold. */
    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    targetID = "";

}

export default CjsCharacterUnresolvedRelationship;
