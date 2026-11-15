import { meta, type } from "#schema";
import { CjsCharacterDataEyeWet } from "./CjsCharacterDataEyeWet.js";

/**
 * One character sex's resource facts. The generic holds these in a list keyed by `name` (`CjsCharacterGeneric.sexes`),
 * as Carbon's generic holds its named items in vectors; the shipped defaults are `factory/defaults/sexes.json`, which
 * also says what each value means.
 *
 * Modelled on: EveSOFDataGenericHullCategory (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:2317-2334), a named
 * item of EveSOFDataGeneric's vectors (:2389-2392). Carbon's generic has no per-sex section, so every field is ours.
 */
@meta.define("CjsCharacterDataSex")
export class CjsCharacterDataSex
{

    /** The sex this record describes, as the library's queries name it. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The paper doll content root every category path is relative to, with its trailing slash. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    root = "";

    /** The master skeleton the character is skinned to. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    skeleton = "";

    /** The generic head's folder below the root. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    genericHead = "";

    /** The nude body's folder below the root. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    body = "";

    /** By foundation texture (`region.Channel`), the folder below the root that supplies it when an archetype ships none. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.map("string")
    bodyFallbacks = new Map();

    /** The morph weights every character of the sex starts from, by morph name, under any sculpt. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.map("float64")
    defaultMorphs = new Map();

    /** Where the generic head's eye-wet effect is borrowed from. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.embed("CjsCharacterDataEyeWet")
    eyeWet = new CjsCharacterDataEyeWet();

}
