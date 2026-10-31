import { meta, type } from "#schema";
import { vec4 } from "#math/vec4";

// Discovery: src/character/discovery/info.yaml
// Resource pattern: res:/graphics/character/*

/**
 * Authored material attributes. The file writes each colour as a one-element list holding an RGB tuple; the
 * reader translates it into the colour field (`sourceLists`), opaque. `transparency` is read as a colour too,
 * as the file's other RGB attributes are (unverified: it may be a per-channel opacity).
 */
@meta.define("CjsCharacterAttributes")
export class CjsCharacterAttributes
{

    /** The `ambientColor` RGB colour, opaque. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.color
    ambientColor = vec4.fromValues(0, 0, 0, 1);

    /** The `color` RGB colour, opaque. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.color
    color = vec4.fromValues(0, 0, 0, 1);

    /** The `incandescence` RGB colour, opaque. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.color
    incandescence = vec4.fromValues(0, 0, 0, 1);

    /** The `transparency` RGB colour, opaque. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.color
    transparency = vec4.fromValues(0, 0, 0, 1);

    /**
     * The files' list form, translated by the reader: each listed key holds one tuple per named field, copied
     * into that field in order; an RGB tuple gains alpha 1.
     */
    static sourceLists = {
        ambientColor: [ "ambientColor" ],
        color: [ "color" ],
        incandescence: [ "incandescence" ],
        transparency: [ "transparency" ]
    };

}
