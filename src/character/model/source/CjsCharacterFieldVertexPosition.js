import { meta, type } from "#schema";

// Discovery: src/character/discovery/trif.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * One vertex's position in a field (`CjsCharacterField.VertPositions`): its index, the key in the file, and its point.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterFieldVertexPosition")
export class CjsCharacterFieldVertexPosition
{

    /** The vertex index, its key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    index = 0;

    /** Its point, at the authored double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec3d
    position = new Float64Array(3);

}
