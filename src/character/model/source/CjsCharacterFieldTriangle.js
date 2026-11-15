import { meta, type } from "#schema";

// Discovery: src/character/discovery/trif.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * One triangle of a field (`CjsCharacterField.Triangles`): its key in the file and its three vertex indices.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterFieldTriangle")
export class CjsCharacterFieldTriangle
{

    /** The triangle's key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    index = 0;

    /** Its three vertex indices (`CjsCharacterField.VertPositions`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32Array(3)
    vertices = new Int32Array(3); // alloc: field default, one per record

}
