import { meta, type } from "#schema";

// Discovery: src/character/discovery/trif.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * One corner of a field triangle (`CjsCharacterFieldTri`): a vertex and its position in the field's plane. In the
 * shipped files the position is the vertex's `VertPositions` x and z (vertex 1 at (0, 0, 2) is (0, 2)); the names are
 * read off the values, as no source names the tuple's slots.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterFieldTriCorner")
export class CjsCharacterFieldTriCorner
{

    /** The vertex index (`CjsCharacterField.VertPositions`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    vertex = 0;

    /** The vertex's position in the field's plane, at the authored double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec2d
    position = new Float64Array(2); // alloc: field default, one per record

}
