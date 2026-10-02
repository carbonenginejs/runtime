import { edit, type } from "#schema";
import { createChild, addChild, removeChild, deleteChild, clearChildren } from "../../../global/blue/children.js";
import "./CjsCharacterAppearanceBinding.js";
import "./CjsCharacterAppearanceColorSelection.js";
import "./CjsCharacterAppearanceDiagnostic.js";
import "./CjsCharacterAppearanceLayer.js";
import "./CjsCharacterAppearanceSelection.js";
import "./CjsCharacterBindingAlpha.js";
import "./CjsCharacterCompositionInput.js";
import "./CjsCharacterCompositionPass.js";
import "./CjsCharacterCompositionTarget.js";
import "./CjsCharacterCoverage.js";
import "./CjsCharacterOrigin.js";
import "./CjsCharacterMorphTargetWeight.js";
import "./CjsCharacterResolvedPart.js";
import "./CjsCharacterTextureAsset.js";
import "./CjsCharacterTextureChannel.js";

/** Renderer-neutral character appearance plan hydrated directly from model-shaped JSON. */
@type.define({ className: "CjsCharacterAppearancePlan", family: "character" })
export class CjsCharacterAppearancePlan
{

    /** Hydrates and adds an authored colour selection. */
    CreateColorSelection(values = {}, options = {})
    {
        return createChild(this, "colorSelections", values, options);
    }

    /** Adds an existing authored colour selection. */
    AddColorSelection(value, options = {})
    {
        return addChild(this, "colorSelections", value, options);
    }

    /** Detaches an authored colour selection. */
    RemoveColorSelection(value, options = {})
    {
        return removeChild(this, "colorSelections", value, options);
    }

    /** Deletes an authored colour selection through an optional teardown hook. */
    DeleteColorSelection(value, options = {})
    {
        return deleteChild(this, "colorSelections", value, options);
    }

    /** Hydrates and adds an origin. */
    CreateOrigin(values = {}, options = {})
    {
        return createChild(this, "origins", values, options);
    }

    /** Adds an existing origin. */
    AddOrigin(value, options = {})
    {
        return addChild(this, "origins", value, options);
    }

    /** Detaches an origin. */
    RemoveOrigin(value, options = {})
    {
        return removeChild(this, "origins", value, options);
    }

    /** Deletes an origin through an optional teardown hook. */
    DeleteOrigin(value, options = {})
    {
        return deleteChild(this, "origins", value, options);
    }

    /** Hydrates and adds an appearance selection. */
    CreateSelection(values = {}, options = {})
    {
        return createChild(this, "selections", values, options);
    }

    /** Adds an existing appearance selection. */
    AddSelection(value, options = {})
    {
        return addChild(this, "selections", value, options);
    }

    /** Detaches an appearance selection. */
    RemoveSelection(value, options = {})
    {
        return removeChild(this, "selections", value, options);
    }

    /** Deletes an appearance selection through an optional teardown hook. */
    DeleteSelection(value, options = {})
    {
        return deleteChild(this, "selections", value, options);
    }

    /** Hydrates and adds a resolved part. */
    CreatePart(values = {}, options = {})
    {
        return createChild(this, "parts", values, options);
    }

    /** Adds an existing resolved part. */
    AddPart(value, options = {})
    {
        return addChild(this, "parts", value, options);
    }

    /** Detaches a resolved part. */
    RemovePart(value, options = {})
    {
        return removeChild(this, "parts", value, options);
    }

    /** Deletes a resolved part through an optional teardown hook. */
    DeletePart(value, options = {})
    {
        return deleteChild(this, "parts", value, options);
    }

    /** Hydrates and adds an appearance layer. */
    CreateLayer(values = {}, options = {})
    {
        return createChild(this, "layers", values, options);
    }

    /** Adds an existing appearance layer. */
    AddLayer(value, options = {})
    {
        return addChild(this, "layers", value, options);
    }

    /** Detaches an appearance layer. */
    RemoveLayer(value, options = {})
    {
        return removeChild(this, "layers", value, options);
    }

    /** Deletes an appearance layer through an optional teardown hook. */
    DeleteLayer(value, options = {})
    {
        return deleteChild(this, "layers", value, options);
    }

    /** Hydrates and adds a texture asset. */
    CreateTexture(values = {}, options = {})
    {
        return createChild(this, "textures", values, options);
    }

    /** Adds an existing texture asset. */
    AddTexture(value, options = {})
    {
        return addChild(this, "textures", value, options);
    }

    /** Detaches a texture asset. */
    RemoveTexture(value, options = {})
    {
        return removeChild(this, "textures", value, options);
    }

    /** Deletes a texture asset through an optional teardown hook. */
    DeleteTexture(value, options = {})
    {
        return deleteChild(this, "textures", value, options);
    }

    /** Hydrates and adds a coverage record. */
    CreateCoverage(values = {}, options = {})
    {
        return createChild(this, "coverages", values, options);
    }

    /** Adds an existing coverage record. */
    AddCoverage(value, options = {})
    {
        return addChild(this, "coverages", value, options);
    }

    /** Detaches a coverage record. */
    RemoveCoverage(value, options = {})
    {
        return removeChild(this, "coverages", value, options);
    }

    /** Deletes a coverage record through an optional teardown hook. */
    DeleteCoverage(value, options = {})
    {
        return deleteChild(this, "coverages", value, options);
    }

    /** Hydrates and adds one exact morph-target request. */
    CreateMorphTarget(values = {}, options = {})
    {
        return createChild(this, "morphTargets", values, options);
    }

    /** Adds one existing morph-target request. */
    AddMorphTarget(value, options = {})
    {
        return addChild(this, "morphTargets", value, options);
    }

    /** Detaches one morph-target request. */
    RemoveMorphTarget(value, options = {})
    {
        return removeChild(this, "morphTargets", value, options);
    }

    /** Deletes one morph-target request through an optional teardown hook. */
    DeleteMorphTarget(value, options = {})
    {
        return deleteChild(this, "morphTargets", value, options);
    }

    /** Hydrates and adds a composition target. */
    CreateTarget(values = {}, options = {})
    {
        return createChild(this, "targets", values, options);
    }

    /** Adds an existing composition target. */
    AddTarget(value, options = {})
    {
        return addChild(this, "targets", value, options);
    }

    /** Detaches a composition target. */
    RemoveTarget(value, options = {})
    {
        return removeChild(this, "targets", value, options);
    }

    /** Deletes a composition target through an optional teardown hook. */
    DeleteTarget(value, options = {})
    {
        return deleteChild(this, "targets", value, options);
    }

    /** Hydrates and adds an appearance binding. */
    CreateBinding(values = {}, options = {})
    {
        return createChild(this, "bindings", values, options);
    }

    /** Adds an existing appearance binding. */
    AddBinding(value, options = {})
    {
        return addChild(this, "bindings", value, options);
    }

    /** Detaches an appearance binding. */
    RemoveBinding(value, options = {})
    {
        return removeChild(this, "bindings", value, options);
    }

    /** Deletes an appearance binding through an optional teardown hook. */
    DeleteBinding(value, options = {})
    {
        return deleteChild(this, "bindings", value, options);
    }

    /** Hydrates and adds a diagnostic. */
    CreateDiagnostic(values = {}, options = {})
    {
        return createChild(this, "diagnostics", values, options);
    }

    /** Adds an existing diagnostic. */
    AddDiagnostic(value, options = {})
    {
        return addChild(this, "diagnostics", value, options);
    }

    /** Detaches a diagnostic. */
    RemoveDiagnostic(value, options = {})
    {
        return removeChild(this, "diagnostics", value, options);
    }

    /** Deletes a diagnostic through an optional teardown hook. */
    DeleteDiagnostic(value, options = {})
    {
        return deleteChild(this, "diagnostics", value, options);
    }

    @edit.readwrite
    @edit.persist
    @type.string
    schema = "carbonenginejs.characterAppearancePlan";

    @edit.readwrite
    @edit.persist
    @type.uint32
    schemaVersion = 4;

    @edit.readwrite
    @edit.persist
    @type.string
    sourceBuild = null;

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterOrigin")
    origins = [];

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterAppearanceSelection")
    selections = [];

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterAppearanceColorSelection")
    colorSelections = [];

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterResolvedPart")
    parts = [];

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterAppearanceLayer")
    layers = [];

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterTextureAsset")
    textures = [];

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterCoverage")
    coverages = [];

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterMorphTargetWeight")
    morphTargets = [];

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterCompositionTarget")
    targets = [];

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterAppearanceBinding")
    bindings = [];

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterAppearanceDiagnostic")
    diagnostics = [];

}

export default CjsCharacterAppearancePlan;
