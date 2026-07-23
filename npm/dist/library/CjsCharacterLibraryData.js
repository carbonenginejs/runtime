import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_schema, _init_extra_schema, _init_schemaVersion, _init_extra_schemaVersion, _init_sourceTarget, _init_extra_sourceTarget, _init_sourceGame, _init_extra_sourceGame, _init_sourceProvider, _init_extra_sourceProvider, _init_sourceBuild, _init_extra_sourceBuild, _init_generatedAt, _init_extra_generatedAt, _init_sourceRefs, _init_extra_sourceRefs, _init_sources, _init_extra_sources, _init_partMetadata, _init_extra_partMetadata, _init_parts, _init_extra_parts, _init_materials, _init_extra_materials, _init_projections, _init_extra_projections, _init_poses, _init_extra_poses, _init_presets, _init_extra_presets, _init_recipeLinks, _init_extra_recipeLinks, _init_sculptFields, _init_extra_sculptFields, _init_blendshapeLimits, _init_extra_blendshapeLimits, _init_uniqueCharacters, _init_extra_uniqueCharacters, _init_visemeSets, _init_extra_visemeSets, _init_modifierNames, _init_extra_modifierNames, _init_faceSetup, _init_extra_faceSetup, _init_partAuthoring, _init_extra_partAuthoring, _init_presentation, _init_extra_presentation;
let _CjsCharacterLibraryD;
class CjsCharacterLibraryData extends _CjsCharacterNode {
  static {
    ({
      e: [_init_schema, _init_extra_schema, _init_schemaVersion, _init_extra_schemaVersion, _init_sourceTarget, _init_extra_sourceTarget, _init_sourceGame, _init_extra_sourceGame, _init_sourceProvider, _init_extra_sourceProvider, _init_sourceBuild, _init_extra_sourceBuild, _init_generatedAt, _init_extra_generatedAt, _init_sourceRefs, _init_extra_sourceRefs, _init_sources, _init_extra_sources, _init_partMetadata, _init_extra_partMetadata, _init_parts, _init_extra_parts, _init_materials, _init_extra_materials, _init_projections, _init_extra_projections, _init_poses, _init_extra_poses, _init_presets, _init_extra_presets, _init_recipeLinks, _init_extra_recipeLinks, _init_sculptFields, _init_extra_sculptFields, _init_blendshapeLimits, _init_extra_blendshapeLimits, _init_uniqueCharacters, _init_extra_uniqueCharacters, _init_visemeSets, _init_extra_visemeSets, _init_modifierNames, _init_extra_modifierNames, _init_faceSetup, _init_extra_faceSetup, _init_partAuthoring, _init_extra_partAuthoring, _init_presentation, _init_extra_presentation],
      c: [_CjsCharacterLibraryD, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterLibraryData",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "schema"], [[type, type.uint32, io, io.persist], 16, "schemaVersion"], [[type, type.string, io, io.persist], 16, "sourceTarget"], [[type, type.string, io, io.persist], 16, "sourceGame"], [[type, type.string, io, io.persist], 16, "sourceProvider"], [[type, type.string, io, io.persist], 16, "sourceBuild"], [[type, type.string, io, io.persist], 16, "generatedAt"], [[void 0, type.map("path"), io, io.persist], 16, "sourceRefs"], [[void 0, type.list("CjsCharacterLibrarySource"), io, io.persist], 16, "sources"], [[void 0, type.list("CjsCharacterPartMetadata"), io, io.persist], 16, "partMetadata"], [[void 0, type.list("CjsCharacterPartDefinition"), io, io.persist], 16, "parts"], [[void 0, type.list("CjsCharacterMaterial"), io, io.persist], 16, "materials"], [[void 0, type.list("CjsCharacterProjection"), io, io.persist], 16, "projections"], [[void 0, type.list("CjsCharacterPose"), io, io.persist], 16, "poses"], [[void 0, type.list("CjsCharacterRecipe"), io, io.persist], 16, "presets"], [[void 0, type.map("CjsCharacterRecipeLinkSet"), io, io.persist], 16, "recipeLinks"], [[void 0, type.list("CjsCharacterSculptField"), io, io.persist], 16, "sculptFields"], [[void 0, type.list("CjsCharacterBlendshapeLimits"), io, io.persist], 16, "blendshapeLimits"], [[void 0, type.list("CjsCharacterUniqueCharacter"), io, io.persist], 16, "uniqueCharacters"], [[void 0, type.list("CjsCharacterVisemeSet"), io, io.persist], 16, "visemeSets"], [[void 0, type.objectRef("CjsCharacterModifierNames"), io, io.persist], 16, "modifierNames"], [[void 0, type.objectRef("CjsCharacterFaceSetup"), io, io.persist], 16, "faceSetup"], [[void 0, type.map("CjsCharacterPartAuthoring"), io, io.persist], 16, "partAuthoring"], [[void 0, type.objectRef("CjsCharacterPresentation"), io, io.persist], 16, "presentation"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_presentation(this);
  }
  schema = _init_schema(this, "carbonenginejs.characterLibrary");
  schemaVersion = (_init_extra_schema(this), _init_schemaVersion(this, 1));
  sourceTarget = (_init_extra_schemaVersion(this), _init_sourceTarget(this, null));
  sourceGame = (_init_extra_sourceTarget(this), _init_sourceGame(this, null));
  sourceProvider = (_init_extra_sourceGame(this), _init_sourceProvider(this, null));
  sourceBuild = (_init_extra_sourceProvider(this), _init_sourceBuild(this, null));
  generatedAt = (_init_extra_sourceBuild(this), _init_generatedAt(this, null));
  sourceRefs = (_init_extra_generatedAt(this), _init_sourceRefs(this, new Map()));
  sources = (_init_extra_sourceRefs(this), _init_sources(this, []));
  partMetadata = (_init_extra_sources(this), _init_partMetadata(this, []));
  parts = (_init_extra_partMetadata(this), _init_parts(this, []));
  materials = (_init_extra_parts(this), _init_materials(this, []));
  projections = (_init_extra_materials(this), _init_projections(this, []));
  poses = (_init_extra_projections(this), _init_poses(this, []));
  presets = (_init_extra_poses(this), _init_presets(this, []));
  recipeLinks = (_init_extra_presets(this), _init_recipeLinks(this, new Map()));
  sculptFields = (_init_extra_recipeLinks(this), _init_sculptFields(this, []));
  blendshapeLimits = (_init_extra_sculptFields(this), _init_blendshapeLimits(this, []));
  uniqueCharacters = (_init_extra_blendshapeLimits(this), _init_uniqueCharacters(this, []));
  visemeSets = (_init_extra_uniqueCharacters(this), _init_visemeSets(this, []));
  modifierNames = (_init_extra_visemeSets(this), _init_modifierNames(this, null));
  faceSetup = (_init_extra_modifierNames(this), _init_faceSetup(this, null));
  partAuthoring = (_init_extra_faceSetup(this), _init_partAuthoring(this, new Map()));
  presentation = (_init_extra_partAuthoring(this), _init_presentation(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterLibraryD as CjsCharacterLibraryData };
//# sourceMappingURL=CjsCharacterLibraryData.js.map
