import { meta, type } from "#schema";
import "./CjsCharacterAnimationOffset.js";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/animationoffsets.yaml
// Resource pattern: res:/graphics/character/unique/characterselect/*

/**
 * A source of named three-component animation offsets.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterAnimationOffsets")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterAnimationOffsets extends CjsCharacterRecord
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The bones' offsets, each named by its bone, the key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterAnimationOffset")
    value = [];

}
