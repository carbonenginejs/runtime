import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_id, _init_extra_id, _init_name, _init_extra_name, _init_sex, _init_extra_sex, _init_recipe, _init_extra_recipe, _init_parts, _init_extra_parts, _init_rules, _init_extra_rules, _init_materials, _init_extra_materials, _init_poses, _init_extra_poses, _init_activePose, _init_extra_activePose, _init_morphs, _init_extra_morphs, _init_projections, _init_extra_projections, _init_dependencies, _init_extra_dependencies, _init_resolutionIssues, _init_extra_resolutionIssues, _init_complete, _init_extra_complete, _init_metadata, _init_extra_metadata, _init_state, _init_extra_state;
let _CjsCharacterGraph;
class CjsCharacterGraph extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_name, _init_extra_name, _init_sex, _init_extra_sex, _init_recipe, _init_extra_recipe, _init_parts, _init_extra_parts, _init_rules, _init_extra_rules, _init_materials, _init_extra_materials, _init_poses, _init_extra_poses, _init_activePose, _init_extra_activePose, _init_morphs, _init_extra_morphs, _init_projections, _init_extra_projections, _init_dependencies, _init_extra_dependencies, _init_resolutionIssues, _init_extra_resolutionIssues, _init_complete, _init_extra_complete, _init_metadata, _init_extra_metadata, _init_state, _init_extra_state],
      c: [_CjsCharacterGraph, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterGraph",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.string, io, io.persist], 16, "name"], [[type, type.string, io, io.persist], 16, "sex"], [[void 0, type.struct("CjsCharacterRecipe"), io, io.persist], 16, "recipe"], [[void 0, type.list("CjsCharacterResolvedPart"), io, io.persist], 16, "parts"], [[void 0, type.list("CjsCharacterResolvedRule"), io, io.persist], 16, "rules"], [[void 0, type.list("CjsCharacterMaterial"), io, io.persist], 16, "materials"], [[void 0, type.list("CjsCharacterPose"), io, io.persist], 16, "poses"], [[type, type.string, io, io.persist], 16, "activePose"], [[void 0, type.map("float32"), io, io.persist], 16, "morphs"], [[void 0, type.list("CjsCharacterProjection"), io, io.persist], 16, "projections"], [[void 0, type.list("CjsCharacterDependency"), io, io.persist], 16, "dependencies"], [[void 0, type.list("CjsCharacterResolutionIssue"), io, io.persist], 16, "resolutionIssues"], [[type, type.boolean, io, io.persist], 16, "complete"], [[type, type.unknown, io, io.persist], 16, "metadata"], [[type, type.unknown, io, io.persist], 16, "state"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_state(this);
  }
  id = _init_id(this, "");
  name = (_init_extra_id(this), _init_name(this, ""));
  sex = (_init_extra_name(this), _init_sex(this, ""));
  recipe = (_init_extra_sex(this), _init_recipe(this, null));
  parts = (_init_extra_recipe(this), _init_parts(this, []));
  rules = (_init_extra_parts(this), _init_rules(this, []));
  materials = (_init_extra_rules(this), _init_materials(this, []));
  poses = (_init_extra_materials(this), _init_poses(this, []));
  activePose = (_init_extra_poses(this), _init_activePose(this, ""));
  morphs = (_init_extra_activePose(this), _init_morphs(this, new Map()));
  projections = (_init_extra_morphs(this), _init_projections(this, []));
  dependencies = (_init_extra_projections(this), _init_dependencies(this, []));
  resolutionIssues = (_init_extra_dependencies(this), _init_resolutionIssues(this, []));
  complete = (_init_extra_resolutionIssues(this), _init_complete(this, true));
  metadata = (_init_extra_complete(this), _init_metadata(this, {}));
  state = (_init_extra_metadata(this), _init_state(this, {}));

  /**
   * Stores one finite named morph weight through the model change pipeline and
   * returns this graph.
   */
  SetMorph(name, value, options = {}) {
    if (typeof name !== "string" || !name.trim()) {
      throw new TypeError("Character morph name must be a non-empty string");
    }
    const weight = Number(value);
    if (!Number.isFinite(weight)) {
      throw new TypeError(`Character morph weight must be finite, received ${value}`);
    }
    const morphs = new Map(this.morphs);
    morphs.set(name, weight);
    this.SetValues({
      morphs
    }, options);
    return this;
  }

  /**
   * Stores the desired pose name through the model change pipeline and returns
   * this graph.
   */
  SetActivePose(name, options = {}) {
    if (typeof name !== "string") {
      throw new TypeError("Character active pose must be a string");
    }
    this.SetValues({
      activePose: name
    }, options);
    return this;
  }

  /**
   * Returns a detached dependency list, optionally filtered to required
   * resources.
   */
  GetDependencies({
    requiredOnly = false
  } = {}) {
    return requiredOnly ? this.dependencies.filter(value => value.required) : this.dependencies.slice();
  }
  static {
    _initClass();
  }
}

export { _CjsCharacterGraph as CjsCharacterGraph };
//# sourceMappingURL=CjsCharacterGraph.js.map
