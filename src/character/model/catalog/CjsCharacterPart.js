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

    /** Types by local name. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.map("CjsCharacterType")
    types = new Map();

    /** Colour variations by local name. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.map("CjsCharacterColorVariation")
    colorVariations = new Map();

    /** Projections by local name. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.map("CjsProjectedDecal")
    projectedDecals = new Map();

    /** Parsed dependencies beside the raw metadata strings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterModifier")
    dependantModifiers = [];

    /** Parsed occlusions beside the raw metadata strings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterModifier")
    occludesModifiers = [];

}
