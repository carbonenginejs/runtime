import { meta, type } from "#schema";
import "./CjsCharacterDataNamedValue.js";

// Discovery: src/character/discovery/info.yaml
// Resource pattern: res:/graphics/character/*

/**
 * One authored material-info record, without Carbon parameter objects.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterMaterial")
export class CjsCharacterMaterial
{

    /** The material name, its key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored material attribute record. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterAttributes")
    Attributes = null;

    /** Its textures by name. Every shipped file writes none (`Textures: {}`), so the value's type is not evidenced; it is read as a string (a number or list warns and reads "", a mapping reads as its text). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataNamedValue")
    Textures = [];

}
