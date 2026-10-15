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

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterAppearanceLayer")
    layer = null;

    @meta.readwrite
    @meta.persist
    @type.string
    op = "";

    @meta.readwrite
    @meta.persist
    @type.list("CjsCharacterCompositionInput")
    inputs = [];

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterCoverage")
    coverage = null;

    @meta.readwrite
    @meta.persist
    @type.vec4
    destination = null;

    @meta.readwrite
    @meta.persist
    @type.string
    blend = "replace";

    @meta.readwrite
    @meta.persist
    @type.string
    write = "rgba";

    @meta.readwrite
    @meta.persist
    @type.float64
    strength = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCompositionPass;
