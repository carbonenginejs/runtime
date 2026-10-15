import { meta, type, blue } from "#schema";

/**
 * One source relationship whose target record does not exist: the owning
 * member holds null, and this records which identity it named.
 */
@meta.define("CjsCharacterUnresolvedRelationship")
export class CjsCharacterUnresolvedRelationship
{

    /** The document holding the relationship, such as `paperdolls`. */
    @blue.readwrite
    @blue.persist
    @type.string
    document = "";

    /** The owning record's `recordID`. */
    @blue.readwrite
    @blue.persist
    @type.string
    recordID = "";

    /** The member path within the record, such as `modifiers[1].paperdollResourceID`. */
    @blue.readwrite
    @blue.persist
    @type.string
    field = "";

    /** The document the relationship targets, such as `characterResources`. */
    @blue.readwrite
    @blue.persist
    @type.string
    targetDocument = "";

    /** The identity it named, which that document does not hold. */
    @blue.readwrite
    @blue.persist
    @type.string
    targetID = "";

}

export default CjsCharacterUnresolvedRelationship;
