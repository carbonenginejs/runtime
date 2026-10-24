import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { vec4 } from "#math/vec4";

/**
 * One authored character recipe selection and its material values.
 *
 * Source shape (`.prs`, build 3646012: 380 recipes, 15,051 entries): a YAML
 * list whose first item is the sex as a bare string, then one flat map per
 * part. `category`, `path` and `weight` are always present, except that 97
 * entries have no `path`. `weight` is a morph strength for shapes and a layer
 * amount for makeup.
 *
 * Material values are stored resolved, not referenced. `colorvariation` only
 * names the palette they came from. `colors` is a quoted string of a tuple
 * list, `'[(r,g,b,a), …]'`. With a pattern it holds five pattern colours, then
 * the transform `(x,y,w,h)` and the rotation, in the same layout as a
 * `.color` file's `patternColors`. `specularcolors` is a YAML list of RGBA
 * tuples, W included.
 *
 * Keys the source uses that this class does not hold yet:
 * - `tuck` (bool, 963 entries);
 * - `variation` (geometry variant `v0`/`v1`, 656);
 * - `decaldata` (a full inline ProjectedDecal, the `.proj` fields, 56);
 * - `decalweight` (float, 51).
 * No `.prs` reader populates recipe profiles yet.
 */
@meta.define("CjsCharacterRecipeEntry")
export class CjsCharacterRecipeEntry
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    category = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    path = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    weight = 1;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    colorVariation = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterColorValue")
    colors = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterColorValue")
    specularColors = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    pattern = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterColorValue")
    patternColors = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.vec4
    patternTransform = vec4.fromValues(0, 0, 1, 1);

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    patternRotation = 0;

}

export default CjsCharacterRecipeEntry;
