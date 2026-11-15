import { meta, type } from "#schema";
import "./CjsCharacterFieldTriCorner.js";

// Discovery: src/character/discovery/trif.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * One triangle of a field's `Tris` list: its three corners, each a vertex and that vertex's position in the field's
 * plane. The file writes it as three `(vertex, (x, y))` tuples.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterFieldTri")
export class CjsCharacterFieldTri
{

    /** Its corners, in file order. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterFieldTriCorner")
    corners = [];

}
