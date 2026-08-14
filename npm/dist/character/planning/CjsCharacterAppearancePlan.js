import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import './CjsCharacterAppearanceBinding.js';
import './CjsCharacterAppearanceColorSelection.js';
import './CjsCharacterAppearanceDiagnostic.js';
import './CjsCharacterAppearanceLayer.js';
import './CjsCharacterAppearanceSelection.js';
import './CjsCharacterBindingAlpha.js';
import './CjsCharacterCompositionInput.js';
import './CjsCharacterCompositionPass.js';
import './CjsCharacterCompositionTarget.js';
import './CjsCharacterCoverage.js';
import './CjsCharacterOrigin.js';
import './CjsCharacterMorphTargetWeight.js';
import './CjsCharacterResolvedPart.js';
import './CjsCharacterTextureAsset.js';
import './CjsCharacterTextureChannel.js';

let _initClass, _init_schema, _init_extra_schema, _init_schemaVersion, _init_extra_schemaVersion, _init_sourceBuild, _init_extra_sourceBuild, _init_origins, _init_extra_origins, _init_selections, _init_extra_selections, _init_colorSelections, _init_extra_colorSelections, _init_parts, _init_extra_parts, _init_layers, _init_extra_layers, _init_textures, _init_extra_textures, _init_coverages, _init_extra_coverages, _init_morphTargets, _init_extra_morphTargets, _init_targets, _init_extra_targets, _init_bindings, _init_extra_bindings, _init_diagnostics, _init_extra_diagnostics;

/** Renderer-neutral character appearance plan hydrated directly from model-shaped JSON. */
let _CjsCharacterAppearan;
class CjsCharacterAppearancePlan extends CjsModel {
  static {
    ({
      e: [_init_schema, _init_extra_schema, _init_schemaVersion, _init_extra_schemaVersion, _init_sourceBuild, _init_extra_sourceBuild, _init_origins, _init_extra_origins, _init_selections, _init_extra_selections, _init_colorSelections, _init_extra_colorSelections, _init_parts, _init_extra_parts, _init_layers, _init_extra_layers, _init_textures, _init_extra_textures, _init_coverages, _init_extra_coverages, _init_morphTargets, _init_extra_morphTargets, _init_targets, _init_extra_targets, _init_bindings, _init_extra_bindings, _init_diagnostics, _init_extra_diagnostics],
      c: [_CjsCharacterAppearan, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterAppearancePlan",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "schema"], [[io, io.readwrite, type, type.uint32], 16, "schemaVersion"], [[io, io.readwrite, type, type.string], 16, "sourceBuild"], [[io, io.readwrite, void 0, type.list("CjsCharacterOrigin")], 16, "origins"], [[io, io.readwrite, void 0, type.list("CjsCharacterAppearanceSelection")], 16, "selections"], [[io, io.readwrite, void 0, type.list("CjsCharacterAppearanceColorSelection")], 16, "colorSelections"], [[io, io.readwrite, void 0, type.list("CjsCharacterResolvedPart")], 16, "parts"], [[io, io.readwrite, void 0, type.list("CjsCharacterAppearanceLayer")], 16, "layers"], [[io, io.readwrite, void 0, type.list("CjsCharacterTextureAsset")], 16, "textures"], [[io, io.readwrite, void 0, type.list("CjsCharacterCoverage")], 16, "coverages"], [[io, io.readwrite, void 0, type.list("CjsCharacterMorphTargetWeight")], 16, "morphTargets"], [[io, io.readwrite, void 0, type.list("CjsCharacterCompositionTarget")], 16, "targets"], [[io, io.readwrite, void 0, type.list("CjsCharacterAppearanceBinding")], 16, "bindings"], [[io, io.readwrite, void 0, type.list("CjsCharacterAppearanceDiagnostic")], 16, "diagnostics"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_diagnostics(this);
  }
  /** Hydrates and adds an authored colour selection. */
  CreateColorSelection(values = {}, options = {}) {
    return CjsModel.createChild(this, "colorSelections", values, options);
  }

  /** Adds an existing authored colour selection. */
  AddColorSelection(value, options = {}) {
    return CjsModel.addChild(this, "colorSelections", value, options);
  }

  /** Detaches an authored colour selection. */
  RemoveColorSelection(value, options = {}) {
    return CjsModel.removeChild(this, "colorSelections", value, options);
  }

  /** Deletes an authored colour selection through an optional teardown hook. */
  DeleteColorSelection(value, options = {}) {
    return CjsModel.deleteChild(this, "colorSelections", value, options);
  }

  /** Hydrates and adds an origin. */
  CreateOrigin(values = {}, options = {}) {
    return CjsModel.createChild(this, "origins", values, options);
  }

  /** Adds an existing origin. */
  AddOrigin(value, options = {}) {
    return CjsModel.addChild(this, "origins", value, options);
  }

  /** Detaches an origin. */
  RemoveOrigin(value, options = {}) {
    return CjsModel.removeChild(this, "origins", value, options);
  }

  /** Deletes an origin through an optional teardown hook. */
  DeleteOrigin(value, options = {}) {
    return CjsModel.deleteChild(this, "origins", value, options);
  }

  /** Hydrates and adds an appearance selection. */
  CreateSelection(values = {}, options = {}) {
    return CjsModel.createChild(this, "selections", values, options);
  }

  /** Adds an existing appearance selection. */
  AddSelection(value, options = {}) {
    return CjsModel.addChild(this, "selections", value, options);
  }

  /** Detaches an appearance selection. */
  RemoveSelection(value, options = {}) {
    return CjsModel.removeChild(this, "selections", value, options);
  }

  /** Deletes an appearance selection through an optional teardown hook. */
  DeleteSelection(value, options = {}) {
    return CjsModel.deleteChild(this, "selections", value, options);
  }

  /** Hydrates and adds a resolved part. */
  CreatePart(values = {}, options = {}) {
    return CjsModel.createChild(this, "parts", values, options);
  }

  /** Adds an existing resolved part. */
  AddPart(value, options = {}) {
    return CjsModel.addChild(this, "parts", value, options);
  }

  /** Detaches a resolved part. */
  RemovePart(value, options = {}) {
    return CjsModel.removeChild(this, "parts", value, options);
  }

  /** Deletes a resolved part through an optional teardown hook. */
  DeletePart(value, options = {}) {
    return CjsModel.deleteChild(this, "parts", value, options);
  }

  /** Hydrates and adds an appearance layer. */
  CreateLayer(values = {}, options = {}) {
    return CjsModel.createChild(this, "layers", values, options);
  }

  /** Adds an existing appearance layer. */
  AddLayer(value, options = {}) {
    return CjsModel.addChild(this, "layers", value, options);
  }

  /** Detaches an appearance layer. */
  RemoveLayer(value, options = {}) {
    return CjsModel.removeChild(this, "layers", value, options);
  }

  /** Deletes an appearance layer through an optional teardown hook. */
  DeleteLayer(value, options = {}) {
    return CjsModel.deleteChild(this, "layers", value, options);
  }

  /** Hydrates and adds a texture asset. */
  CreateTexture(values = {}, options = {}) {
    return CjsModel.createChild(this, "textures", values, options);
  }

  /** Adds an existing texture asset. */
  AddTexture(value, options = {}) {
    return CjsModel.addChild(this, "textures", value, options);
  }

  /** Detaches a texture asset. */
  RemoveTexture(value, options = {}) {
    return CjsModel.removeChild(this, "textures", value, options);
  }

  /** Deletes a texture asset through an optional teardown hook. */
  DeleteTexture(value, options = {}) {
    return CjsModel.deleteChild(this, "textures", value, options);
  }

  /** Hydrates and adds a coverage record. */
  CreateCoverage(values = {}, options = {}) {
    return CjsModel.createChild(this, "coverages", values, options);
  }

  /** Adds an existing coverage record. */
  AddCoverage(value, options = {}) {
    return CjsModel.addChild(this, "coverages", value, options);
  }

  /** Detaches a coverage record. */
  RemoveCoverage(value, options = {}) {
    return CjsModel.removeChild(this, "coverages", value, options);
  }

  /** Deletes a coverage record through an optional teardown hook. */
  DeleteCoverage(value, options = {}) {
    return CjsModel.deleteChild(this, "coverages", value, options);
  }

  /** Hydrates and adds one exact morph-target request. */
  CreateMorphTarget(values = {}, options = {}) {
    return CjsModel.createChild(this, "morphTargets", values, options);
  }

  /** Adds one existing morph-target request. */
  AddMorphTarget(value, options = {}) {
    return CjsModel.addChild(this, "morphTargets", value, options);
  }

  /** Detaches one morph-target request. */
  RemoveMorphTarget(value, options = {}) {
    return CjsModel.removeChild(this, "morphTargets", value, options);
  }

  /** Deletes one morph-target request through an optional teardown hook. */
  DeleteMorphTarget(value, options = {}) {
    return CjsModel.deleteChild(this, "morphTargets", value, options);
  }

  /** Hydrates and adds a composition target. */
  CreateTarget(values = {}, options = {}) {
    return CjsModel.createChild(this, "targets", values, options);
  }

  /** Adds an existing composition target. */
  AddTarget(value, options = {}) {
    return CjsModel.addChild(this, "targets", value, options);
  }

  /** Detaches a composition target. */
  RemoveTarget(value, options = {}) {
    return CjsModel.removeChild(this, "targets", value, options);
  }

  /** Deletes a composition target through an optional teardown hook. */
  DeleteTarget(value, options = {}) {
    return CjsModel.deleteChild(this, "targets", value, options);
  }

  /** Hydrates and adds an appearance binding. */
  CreateBinding(values = {}, options = {}) {
    return CjsModel.createChild(this, "bindings", values, options);
  }

  /** Adds an existing appearance binding. */
  AddBinding(value, options = {}) {
    return CjsModel.addChild(this, "bindings", value, options);
  }

  /** Detaches an appearance binding. */
  RemoveBinding(value, options = {}) {
    return CjsModel.removeChild(this, "bindings", value, options);
  }

  /** Deletes an appearance binding through an optional teardown hook. */
  DeleteBinding(value, options = {}) {
    return CjsModel.deleteChild(this, "bindings", value, options);
  }

  /** Hydrates and adds a diagnostic. */
  CreateDiagnostic(values = {}, options = {}) {
    return CjsModel.createChild(this, "diagnostics", values, options);
  }

  /** Adds an existing diagnostic. */
  AddDiagnostic(value, options = {}) {
    return CjsModel.addChild(this, "diagnostics", value, options);
  }

  /** Detaches a diagnostic. */
  RemoveDiagnostic(value, options = {}) {
    return CjsModel.removeChild(this, "diagnostics", value, options);
  }

  /** Deletes a diagnostic through an optional teardown hook. */
  DeleteDiagnostic(value, options = {}) {
    return CjsModel.deleteChild(this, "diagnostics", value, options);
  }
  schema = _init_schema(this, "carbonenginejs.characterAppearancePlan");
  schemaVersion = (_init_extra_schema(this), _init_schemaVersion(this, 4));
  sourceBuild = (_init_extra_schemaVersion(this), _init_sourceBuild(this, null));
  origins = (_init_extra_sourceBuild(this), _init_origins(this, []));
  selections = (_init_extra_origins(this), _init_selections(this, []));
  colorSelections = (_init_extra_selections(this), _init_colorSelections(this, []));
  parts = (_init_extra_colorSelections(this), _init_parts(this, []));
  layers = (_init_extra_parts(this), _init_layers(this, []));
  textures = (_init_extra_layers(this), _init_textures(this, []));
  coverages = (_init_extra_textures(this), _init_coverages(this, []));
  morphTargets = (_init_extra_coverages(this), _init_morphTargets(this, []));
  targets = (_init_extra_morphTargets(this), _init_targets(this, []));
  bindings = (_init_extra_targets(this), _init_bindings(this, []));
  diagnostics = (_init_extra_bindings(this), _init_diagnostics(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterAppearan as CjsCharacterAppearancePlan };
//# sourceMappingURL=CjsCharacterAppearancePlan.js.map
