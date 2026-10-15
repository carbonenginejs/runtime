import { meta, type } from "#schema";

/**
 * One source relationship whose target record does not exist: the owning
 * member holds null, and this records which identity it named.
 */
@meta.define("CjsCharacterUnresolvedRelationship")
export class CjsCharacterUnresolvedRelationship
{

    /** The document holding the relationship, such as `paperdolls`. */
    @meta.readwrite
    @meta.persist
    @type.string
    document = "";

    /** The owning record's `recordID`. */
    @meta.readwrite
    @meta.persist
    @type.string
    recordID = "";

    /** The member path within the record, such as `modifiers[1].paperdollResourceID`. */
    @meta.readwrite
    @meta.persist
    @type.string
    field = "";

    /** The document the relationship targets, such as `characterResources`. */
    @meta.readwrite
    @meta.persist
    @type.string
    targetDocument = "";

    /** The identity it named, which that document does not hold. */
    @meta.readwrite
    @meta.persist
    @type.string
    targetID = "";

}

export default CjsCharacterUnresolvedRelationship;
