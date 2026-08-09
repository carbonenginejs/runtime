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

    /** Hydrates and adds an origin. */
    CreateOrigin(values = {}, options = {})
    {
        return CjsModel.createChild(this, "origins", values, options);
    }

    /** Adds an existing origin. */
    AddOrigin(value, options = {})
    {
        return CjsModel.addChild(this, "origins", value, options);
    }

    /** Detaches an origin. */
    RemoveOrigin(value, options = {})
    {
        return CjsModel.removeChild(this, "origins", value, options);
    }

    /** Deletes an origin through an optional teardown hook. */
    DeleteOrigin(value, options = {})
    {
        return CjsModel.deleteChild(this, "origins", value, options);
    }

    /** Hydrates and adds an appearance selection. */
    CreateSelection(values = {}, options = {})
    {
        return CjsModel.createChild(this, "selections", values, options);
    }

    /** Adds an existing appearance selection. */
    AddSelection(value, options = {})
    {
        return CjsModel.addChild(this, "selections", value, options);
    }

    /** Detaches an appearance selection. */
    RemoveSelection(value, options = {})
    {
        return CjsModel.removeChild(this, "selections", value, options);
    }

    /** Deletes an appearance selection through an optional teardown hook. */
    DeleteSelection(value, options = {})
    {
        return CjsModel.deleteChild(this, "selections", value, options);
    }

    /** Hydrates and adds a resolved part. */
    CreatePart(values = {}, options = {})
    {
        return CjsModel.createChild(this, "parts", values, options);
    }

    /** Adds an existing resolved part. */
    AddPart(value, options = {})
    {
        return CjsModel.addChild(this, "parts", value, options);
    }

    /** Detaches a resolved part. */
    RemovePart(value, options = {})
    {
        return CjsModel.removeChild(this, "parts", value, options);
    }

    /** Deletes a resolved part through an optional teardown hook. */
    DeletePart(value, options = {})
    {
        return CjsModel.deleteChild(this, "parts", value, options);
    }

    /** Hydrates and adds an appearance layer. */
    CreateLayer(values = {}, options = {})
    {
        return CjsModel.createChild(this, "layers", values, options);
    }

    /** Adds an existing appearance layer. */
    AddLayer(value, options = {})
    {
        return CjsModel.addChild(this, "layers", value, options);
    }

    /** Detaches an appearance layer. */
    RemoveLayer(value, options = {})
    {
        return CjsModel.removeChild(this, "layers", value, options);
    }

    /** Deletes an appearance layer through an optional teardown hook. */
    DeleteLayer(value, options = {})
    {
        return CjsModel.deleteChild(this, "layers", value, options);
    }

    /** Hydrates and adds a texture asset. */
    CreateTexture(values = {}, options = {})
    {
        return CjsModel.createChild(this, "textures", values, options);
    }

    /** Adds an existing texture asset. */
    AddTexture(value, options = {})
    {
        return CjsModel.addChild(this, "textures", value, options);
    }

    /** Detaches a texture asset. */
    RemoveTexture(value, options = {})
    {
        return CjsModel.removeChild(this, "textures", value, options);
    }

    /** Deletes a texture asset through an optional teardown hook. */
    DeleteTexture(value, options = {})
    {
        return CjsModel.deleteChild(this, "textures", value, options);
    }

    /** Hydrates and adds a coverage record. */
    CreateCoverage(values = {}, options = {})
    {
        return CjsModel.createChild(this, "coverages", values, options);
    }

    /** Adds an existing coverage record. */
    AddCoverage(value, options = {})
    {
        return CjsModel.addChild(this, "coverages", value, options);
    }

    /** Detaches a coverage record. */
    RemoveCoverage(value, options = {})
    {
        return CjsModel.removeChild(this, "coverages", value, options);
    }

    /** Deletes a coverage record through an optional teardown hook. */
    DeleteCoverage(value, options = {})
    {
        return CjsModel.deleteChild(this, "coverages", value, options);
    }

    /** Hydrates and adds a composition target. */
    CreateTarget(values = {}, options = {})
    {
        return CjsModel.createChild(this, "targets", values, options);
    }

    /** Adds an existing composition target. */
    AddTarget(value, options = {})
    {
        return CjsModel.addChild(this, "targets", value, options);
    }

    /** Detaches a composition target. */
    RemoveTarget(value, options = {})
    {
        return CjsModel.removeChild(this, "targets", value, options);
    }

    /** Deletes a composition target through an optional teardown hook. */
    DeleteTarget(value, options = {})
    {
        return CjsModel.deleteChild(this, "targets", value, options);
    }

    /** Hydrates and adds an appearance binding. */
    CreateBinding(values = {}, options = {})
    {
        return CjsModel.createChild(this, "bindings", values, options);
    }

    /** Adds an existing appearance binding. */
    AddBinding(value, options = {})
    {
        return CjsModel.addChild(this, "bindings", value, options);
    }

    /** Detaches an appearance binding. */
    RemoveBinding(value, options = {})
    {
        return CjsModel.removeChild(this, "bindings", value, options);
    }

    /** Deletes an appearance binding through an optional teardown hook. */
    DeleteBinding(value, options = {})
    {
        return CjsModel.deleteChild(this, "bindings", value, options);
    }

    /** Hydrates and adds a diagnostic. */
    CreateDiagnostic(values = {}, options = {})
    {
        return CjsModel.createChild(this, "diagnostics", values, options);
    }

    /** Adds an existing diagnostic. */
    AddDiagnostic(value, options = {})
    {
        return CjsModel.addChild(this, "diagnostics", value, options);
    }

    /** Detaches a diagnostic. */
    RemoveDiagnostic(value, options = {})
    {
        return CjsModel.removeChild(this, "diagnostics", value, options);
    }

    /** Deletes a diagnostic through an optional teardown hook. */
    DeleteDiagnostic(value, options = {})
    {
        return CjsModel.deleteChild(this, "diagnostics", value, options);
    }

    @io.readwrite
    @type.string
    schema = "carbonenginejs.characterAppearancePlan";

    @io.readwrite
    @type.uint32
    schemaVersion = 2;

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
