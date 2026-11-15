import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character library value record; no resource decoding or character construction. */
@meta.define("CjsCharacterPart")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterPart extends CjsCharacterRecord
{

    /** Canonical part folder identity. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Optional source metadata. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsAvatarPartMetaData")
    metadata = null;

    /** The part's types, each identified by its library ID (`_pdpID`, its file). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterType")
    types = [];

    /** The part's colour variations, each identified by its library ID (`_pdpID`, its file). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterColorVariation")
    colorVariations = [];

    /** The part's projections, each identified by its library ID (`_pdpID`, its file). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsProjectedDecal")
    projectedDecals = [];

    /** Parsed dependencies beside the raw metadata strings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterModifier")
    dependantModifiers = [];

    /** Parsed occlusions beside the raw metadata strings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterModifier")
    occludesModifiers = [];

}
