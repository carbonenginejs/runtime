import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import "./CjsCharacterAppearanceBinding.js";
import "./CjsCharacterAppearanceDiagnostic.js";
import "./CjsCharacterAppearanceLayer.js";
import "./CjsCharacterAppearanceSelection.js";
import "./CjsCharacterBindingAlpha.js";
import "./CjsCharacterCompositionInput.js";
import "./CjsCharacterCompositionPass.js";
import "./CjsCharacterCompositionTarget.js";
import "./CjsCharacterCoverage.js";
import "./CjsCharacterOrigin.js";
import "./CjsCharacterResolvedPart.js";
import "./CjsCharacterTextureAsset.js";
import "./CjsCharacterTextureChannel.js";

/** Renderer-neutral character appearance plan hydrated directly from model-shaped JSON. */
@type.define({ className: "CjsCharacterAppearancePlan", family: "character" })
export class CjsCharacterAppearancePlan extends CjsModel
{

    @io.readwrite
    @type.string
    schema = "carbonenginejs.characterAppearancePlan";

    @io.readwrite
    @type.uint32
    schemaVersion = 1;

    @io.readwrite
    @type.string
    sourceBuild = null;

    @io.readwrite
    @type.list("CjsCharacterOrigin")
    origins = [];

    @io.readwrite
    @type.list("CjsCharacterAppearanceSelection")
    selections = [];

    @io.readwrite
    @type.list("CjsCharacterResolvedPart")
    parts = [];

    @io.readwrite
    @type.list("CjsCharacterAppearanceLayer")
    layers = [];

    @io.readwrite
    @type.list("CjsCharacterTextureAsset")
    textures = [];

    @io.readwrite
    @type.list("CjsCharacterCoverage")
    coverages = [];

    @io.readwrite
    @type.list("CjsCharacterCompositionTarget")
    targets = [];

    @io.readwrite
    @type.list("CjsCharacterAppearanceBinding")
    bindings = [];

    @io.readwrite
    @type.list("CjsCharacterAppearanceDiagnostic")
    diagnostics = [];

}

export default CjsCharacterAppearancePlan;
