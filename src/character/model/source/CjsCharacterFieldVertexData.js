import { meta, type } from "#schema";
import "./CjsCharacterDataParameterDouble.js";

// Discovery: src/character/discovery/trif.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * One vertex's data in a field (`CjsCharacterField.VertData`): its index, the key in the file, and its named values,
 * which the file writes as `[name, value]` pairs (`XXX_up 1.0`).
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterFieldVertexData")
export class CjsCharacterFieldVertexData
{

    /** The vertex index, its key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    index = 0;

    /** Its named values, in file order. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataParameterDouble")
    parameters = [];

}
