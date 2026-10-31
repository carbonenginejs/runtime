import { exposure as be } from "#be";
import { meta, type } from "#schema";

/**
 * One ordered logical operation in a character texture-composition target.
 *
 * `op`, `blend` and `write` are resolver-owned strings (not validated by
 * this model): operations `copy`, `fill`, `alpha-overlay`, `colorize`,
 * `pattern`, `normal-replace`, `normal-add`, `restore-base`; blends
 * `replace`, `source-over`, `add`; write masks `rgba`, `rgb`, `rg`, `b`,
 * `a`. Renderer bit masks and blend constants never appear here. Coverage
 * subtraction lives in the shared `coverage` record, not in a mask pass, and
 * projection placement is resolved to an ordinary alpha overlay first.
 */
@meta.define("CjsCharacterCompositionPass")
export class CjsCharacterCompositionPass
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterAppearanceLayer")
    layer = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    op = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterCompositionInput")
    inputs = [];

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterCoverage")
    coverage = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.vec4
    destination = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    blend = "replace";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    write = "rgba";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    strength = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCompositionPass;
