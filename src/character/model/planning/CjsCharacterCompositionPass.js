import { edit, type } from "#schema";

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
@type.define({ className: "CjsCharacterCompositionPass", family: "character" })
export class CjsCharacterCompositionPass
{

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterAppearanceLayer")
    layer = null;

    @edit.readwrite
    @edit.persist
    @type.string
    op = "";

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterCompositionInput")
    inputs = [];

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterCoverage")
    coverage = null;

    @edit.readwrite
    @edit.persist
    @type.vec4
    destination = null;

    @edit.readwrite
    @edit.persist
    @type.string
    blend = "replace";

    @edit.readwrite
    @edit.persist
    @type.string
    write = "rgba";

    @edit.readwrite
    @edit.persist
    @type.float64
    strength = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCompositionPass;
