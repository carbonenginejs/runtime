import { edit, type } from "#schema";

/**
 * One source relationship whose target record does not exist: the owning
 * member holds null, and this records which identity it named.
 */
@type.define({ className: "CjsCharacterUnresolvedRelationship", family: "character" })
export class CjsCharacterUnresolvedRelationship
{

    /** The document holding the relationship, such as `paperdolls`. */
    @edit.readwrite
    @edit.persist
    @type.string
    document = "";

    /** The owning record's `recordID`. */
    @edit.readwrite
    @edit.persist
    @type.string
    recordID = "";

    /** The member path within the record, such as `modifiers[1].paperdollResourceID`. */
    @edit.readwrite
    @edit.persist
    @type.string
    field = "";

    /** The document the relationship targets, such as `characterResources`. */
    @edit.readwrite
    @edit.persist
    @type.string
    targetDocument = "";

    /** The identity it named, which that document does not hold. */
    @edit.readwrite
    @edit.persist
    @type.string
    targetID = "";

}

export default CjsCharacterUnresolvedRelationship;
