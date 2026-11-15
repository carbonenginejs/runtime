import { meta, type } from "#schema";
import "./CjsCharacterDataString.js";

/**
 * One nude body carrier: a part every character wears under its garments, drawn while nothing covers or replaces it
 * (`CjsCharacterLibraryManager.FetchBodyCarriers`). The generic holds these in `bodyCarriers`; the shipped defaults
 * are `factory/defaults/generic.js`.
 *
 * Ours (no Carbon counterpart): the client's paper doll is Python.
 */
@meta.define("CjsCharacterDataBodyCarrier")
export class CjsCharacterDataBodyCarrier
{

    /** The part's folder below the sex's paper doll root (`topinner/torso_nude`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    path = "";

    /** The dependant categories whose dependants its metadata names as its own carriers (the torso's sleeves). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataString")
    dependants = [];

}
