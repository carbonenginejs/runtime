import { meta } from "#schema";

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
@meta.define({ className: "CjsCharacterCompositionPass", family: "character" })
export class CjsCharacterCompositionPass
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterAppearanceLayer")
    layer = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    op = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterCompositionInput")
    inputs = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterCoverage")
    coverage = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.vec4
    destination = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    blend = "replace";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    write = "rgba";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    strength = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCompositionPass;
