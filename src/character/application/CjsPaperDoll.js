import { meta, type } from "#schema";
import { CjsPaperDollDefinition } from "./CjsPaperDollDefinition.js";

/**
 * One paper doll character as a manager lists it: its definition (who and
 * what it is) and the instance built from it that is drawn (`front`).
 *
 * A `back` instance, built from edits while the front stays on screen and
 * swapped in when complete, is reserved for an edit mode and is not built
 * yet: with no back instance, edits rebuild the front in place, which is safe
 * because every binding composes synchronously before the frame.
 *
 * An application class (operator-approved character application); no Carbon
 * donor.
 */
@meta.define("CjsPaperDoll")
export class CjsPaperDoll
{

    /** Who and what this character is: identity, foundation and part settings. */
    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollDefinition")
    definition = new CjsPaperDollDefinition();

    /** The instance drawn on screen; null until one is built. */
    front = null;

    /** The instance an edit builds while `front` stays on screen; reserved, always null for now. */
    back = null;

    /**
     * @param {CjsPaperDollDefinition} [definition] The character's settings; a new, empty definition when omitted.
     */
    constructor(definition = new CjsPaperDollDefinition())
    {
        this.definition = definition;
    }

    /**
     * Applies the definition's pending edits to the front instance.
     * @returns {boolean} Whether any output was rebuilt; false with no front instance.
     * @throws {Error} Whatever the instance's bindings throw.
     */
    Update()
    {
        return this.front ? this.front.Update(this.definition) : false;
    }

}
