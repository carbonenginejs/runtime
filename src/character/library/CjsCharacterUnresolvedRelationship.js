import { exposure as be } from "#be";
import { meta, type } from "#schema";

/**
 * One source relationship whose target record does not exist: the owning
 * member holds null, and this records which identity it named.
 */
@meta.define("CjsCharacterUnresolvedRelationship")
export class CjsCharacterUnresolvedRelationship
{

    /** The document holding the relationship, such as `paperdolls`. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    document = "";

    /** The owning record's `recordID`. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    recordID = "";

    /** The member path within the record, such as `modifiers[1].paperdollResourceID`. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    field = "";

    /** The document the relationship targets, such as `characterResources`. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    targetDocument = "";

    /** The identity it named, which that document does not hold. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    targetID = "";

}

export default CjsCharacterUnresolvedRelationship;
