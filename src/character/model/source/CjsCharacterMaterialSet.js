import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/info.yaml
// Resource pattern: res:/graphics/character/*

/**
 * A material-info source containing named records, not rendered material instances.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterMaterialSet")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterMaterialSet extends CjsCharacterRecord
{

    /** The file's materials, each named by its key. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterMaterial")
    Materials = [];

}
