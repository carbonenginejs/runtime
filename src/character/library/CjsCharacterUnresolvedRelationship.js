import { edit, type } from "#schema";
import { CjsModel } from "#model";

/**
 * One source relationship whose target record does not exist: the owning
 * member holds null, and this records which identity it named.
 */
@type.define({ className: "CjsCharacterUnresolvedRelationship", family: "character" })
export class CjsCharacterUnresolvedRelationship extends CjsModel
{

    /** The document holding the relationship, such as `paperdolls`. */
    @edit.readwrite
    @type.string
    document = "";

    /** The owning record's `recordID`. */
    @edit.readwrite
    @type.string
    recordID = "";

    /** The member path within the record, such as `modifiers[1].paperdollResourceID`. */
    @edit.readwrite
    @type.string
    field = "";

    /** The document the relationship targets, such as `characterResources`. */
    @edit.readwrite
    @type.string
    targetDocument = "";

    /** The identity it named, which that document does not hold. */
    @edit.readwrite
    @type.string
    targetID = "";

}

export default CjsCharacterUnresolvedRelationship;
