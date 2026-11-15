import { meta, type } from "#schema";
import "./CjsCharacterFaceMappingEntry.js";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/face.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * A face mapping (`.face`): one entry per joint, each read from the joint's four- or seven-slot tuple
 * (`CjsCharacterFaceMappingEntry`).
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterFaceMapping")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterFaceMapping extends CjsCharacterRecord
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The joints' mappings, each named by its joint, the key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterFaceMappingEntry")
    value = [];

}
