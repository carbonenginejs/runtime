import { meta, type } from "#schema";
import "./CjsCharacterFieldTriangle.js";
import "./CjsCharacterFieldTri.js";
import "./CjsCharacterFieldVertexData.js";
import "./CjsCharacterFieldVertexPosition.js";

// Discovery: src/character/discovery/trif.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * One field of a `.trif` field set: a small triangulated grid whose vertices carry named values. The file's
 * integer-keyed mappings and tuples read as lists of records, each with its key.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterField")
export class CjsCharacterField
{

    /** The field name, its key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored attribute names. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    Attributes = [];

    /** Authored 3-component numeric tuple. Kept at the authored double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec3d
    MarkerPosition = new Float64Array(3); // alloc: field default, one per record

    /** Its triangles, each with its key in the file and three vertex indices. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterFieldTriangle")
    Triangles = [];

    /** Its triangles as corners: each corner a vertex and its position in the field's plane. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterFieldTri")
    Tris = [];

    /** Its vertices' named values, each with its vertex index, the key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterFieldVertexData")
    VertData = [];

    /** Its vertices' points, each with its vertex index, the key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterFieldVertexPosition")
    VertPositions = [];

}
