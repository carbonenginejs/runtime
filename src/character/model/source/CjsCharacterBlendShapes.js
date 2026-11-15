import { meta, type } from "#schema";
import "./CjsCharacterDataParameterDouble.js";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/blendshapes.yaml
// Resource pattern: res:/graphics/character/unique/characterselect/*

/**
 * Named blend-shape weights from one source file.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterBlendShapes")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterBlendShapes extends CjsCharacterRecord
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The blend shapes' weights, each named by its shape, the key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataParameterDouble")
    value = [];

}
