import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import './CjsCharacterAppearanceBinding.js';
import './CjsCharacterAppearanceDiagnostic.js';
import './CjsCharacterAppearanceLayer.js';
import './CjsCharacterAppearanceSelection.js';
import './CjsCharacterBindingAlpha.js';
import './CjsCharacterCompositionInput.js';
import './CjsCharacterCompositionPass.js';
import './CjsCharacterCompositionTarget.js';
import './CjsCharacterCoverage.js';
import './CjsCharacterOrigin.js';
import './CjsCharacterResolvedPart.js';
import './CjsCharacterTextureAsset.js';
import './CjsCharacterTextureChannel.js';

let _initClass, _init_schema, _init_extra_schema, _init_schemaVersion, _init_extra_schemaVersion, _init_sourceBuild, _init_extra_sourceBuild, _init_origins, _init_extra_origins, _init_selections, _init_extra_selections, _init_parts, _init_extra_parts, _init_layers, _init_extra_layers, _init_textures, _init_extra_textures, _init_coverages, _init_extra_coverages, _init_targets, _init_extra_targets, _init_bindings, _init_extra_bindings, _init_diagnostics, _init_extra_diagnostics;

/** Renderer-neutral character appearance plan hydrated directly from model-shaped JSON. */
let _CjsCharacterAppearan;
class CjsCharacterAppearancePlan extends CjsModel {
  static {
    ({
      e: [_init_schema, _init_extra_schema, _init_schemaVersion, _init_extra_schemaVersion, _init_sourceBuild, _init_extra_sourceBuild, _init_origins, _init_extra_origins, _init_selections, _init_extra_selections, _init_parts, _init_extra_parts, _init_layers, _init_extra_layers, _init_textures, _init_extra_textures, _init_coverages, _init_extra_coverages, _init_targets, _init_extra_targets, _init_bindings, _init_extra_bindings, _init_diagnostics, _init_extra_diagnostics],
      c: [_CjsCharacterAppearan, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterAppearancePlan",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "schema"], [[io, io.readwrite, type, type.uint32], 16, "schemaVersion"], [[io, io.readwrite, type, type.string], 16, "sourceBuild"], [[io, io.readwrite, void 0, type.list("CjsCharacterOrigin")], 16, "origins"], [[io, io.readwrite, void 0, type.list("CjsCharacterAppearanceSelection")], 16, "selections"], [[io, io.readwrite, void 0, type.list("CjsCharacterResolvedPart")], 16, "parts"], [[io, io.readwrite, void 0, type.list("CjsCharacterAppearanceLayer")], 16, "layers"], [[io, io.readwrite, void 0, type.list("CjsCharacterTextureAsset")], 16, "textures"], [[io, io.readwrite, void 0, type.list("CjsCharacterCoverage")], 16, "coverages"], [[io, io.readwrite, void 0, type.list("CjsCharacterCompositionTarget")], 16, "targets"], [[io, io.readwrite, void 0, type.list("CjsCharacterAppearanceBinding")], 16, "bindings"], [[io, io.readwrite, void 0, type.list("CjsCharacterAppearanceDiagnostic")], 16, "diagnostics"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_diagnostics(this);
  }
  schema = _init_schema(this, "carbonenginejs.characterAppearancePlan");
  schemaVersion = (_init_extra_schema(this), _init_schemaVersion(this, 1));
  sourceBuild = (_init_extra_schemaVersion(this), _init_sourceBuild(this, null));
  origins = (_init_extra_sourceBuild(this), _init_origins(this, []));
  selections = (_init_extra_origins(this), _init_selections(this, []));
  parts = (_init_extra_selections(this), _init_parts(this, []));
  layers = (_init_extra_parts(this), _init_layers(this, []));
  textures = (_init_extra_layers(this), _init_textures(this, []));
  coverages = (_init_extra_textures(this), _init_coverages(this, []));
  targets = (_init_extra_coverages(this), _init_targets(this, []));
  bindings = (_init_extra_targets(this), _init_bindings(this, []));
  diagnostics = (_init_extra_bindings(this), _init_diagnostics(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterAppearan as CjsCharacterAppearancePlan };
//# sourceMappingURL=CjsCharacterAppearancePlan.js.map
