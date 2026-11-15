import { meta, type } from "#schema";
import "./CjsCharacterDataString.js";

/**
 * One group of paper doll parts that cannot be worn together: definition members of which at most one is worn (on
 * with an option; `CjsPaperDollInstance.exclusiveParts`). The generic holds these in `exclusiveParts`; the shipped
 * defaults are `factory/defaults/generic.js`.
 *
 * Ours (no Carbon counterpart): the client's paper doll is Python.
 */
@meta.define("CjsCharacterDataPartGroup")
export class CjsCharacterDataPartGroup
{

    /** The group's definition members (`topMiddle`, `topOuter`), in order: with no earlier state, the later one stays. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataString")
    members = [];

}
