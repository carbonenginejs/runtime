import { meta, type, blue } from "#schema";

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

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterAppearanceLayer")
    layer = null;

    @blue.readwrite
    @blue.persist
    @type.string
    op = "";

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterCompositionInput")
    inputs = [];

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterCoverage")
    coverage = null;

    @blue.readwrite
    @blue.persist
    @type.vec4
    destination = null;

    @blue.readwrite
    @blue.persist
    @type.string
    blend = "replace";

    @blue.readwrite
    @blue.persist
    @type.string
    write = "rgba";

    @blue.readwrite
    @blue.persist
    @type.float64
    strength = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCompositionPass;
