import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, CjsSchema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import '../character/CjsCharacterRecord.js';
import '../character/activity/CjsCharacterArchetype.js';
import '../character/appearance/CjsCharacterColorLocation.js';
import '../character/appearance/CjsCharacterColorName.js';
import '../character/appearance/CjsCharacterColorSelection.js';
import '../character/appearance/CjsCharacterSculptingLocation.js';
import '../character/appearance/CjsCharacterSculptSelection.js';
import '../character/behavior/CjsCharacterAvatarBehavior.js';
import '../character/catalog/CjsCharacterColorValue.js';
import '../character/catalog/CjsCharacterDefinition.js';
import '../character/catalog/CjsCharacterMaterialProfile.js';
import '../character/catalog/CjsCharacterModifierReference.js';
import '../character/catalog/CjsCharacterPartMetadata.js';
import '../character/catalog/CjsCharacterPartSource.js';
import '../character/catalog/CjsCharacterPartSourceVersion.js';
import '../character/catalog/CjsCharacterPartType.js';
import '../character/catalog/CjsCharacterProjectionProfile.js';
import '../character/catalog/CjsCharacterRecipeEntry.js';
import '../character/catalog/CjsCharacterRecipeProfile.js';
import '../character/catalog/CjsCharacterTextureMetadata.js';
import '../character/composition/CjsCharacterModifierLocation.js';
import '../character/composition/CjsCharacterModifierSelection.js';
import '../character/creation/CjsCharacterPaperdoll.js';
import '../character/demographics/CjsCharacterAncestry.js';
import '../character/demographics/CjsCharacterBloodline.js';
import '../character/demographics/CjsCharacterRace.js';
import '../character/planning/CjsCharacterAppearanceBinding.js';
import '../character/planning/CjsCharacterAppearanceColorSelection.js';
import '../character/planning/CjsCharacterAppearanceDiagnostic.js';
import '../character/planning/CjsCharacterAppearanceLayer.js';
import '../character/planning/CjsCharacterAppearancePlan.js';
import '../character/planning/CjsCharacterAppearanceSelection.js';
import '../character/planning/CjsCharacterBindingAlpha.js';
import '../character/planning/CjsCharacterCompositionInput.js';
import '../character/planning/CjsCharacterCompositionPass.js';
import '../character/planning/CjsCharacterCompositionTarget.js';
import '../character/planning/CjsCharacterCoverage.js';
import '../character/planning/CjsCharacterOrigin.js';
import '../character/planning/CjsCharacterMorphTargetWeight.js';
import '../character/planning/CjsCharacterResolvedPart.js';
import '../character/planning/CjsCharacterTextureAsset.js';
import '../character/planning/CjsCharacterTextureChannel.js';
import '../character/resources/CjsCharacterResource.js';
import '../character/resources/CjsCharacterPortraitResource.js';

let _initClass, _init_ancestries, _init_extra_ancestries, _init_archetypes, _init_extra_archetypes, _init_bloodlines, _init_extra_bloodlines, _init_characterAvatarBehaviors, _init_extra_characterAvatarBehaviors, _init_characterColorLocations, _init_extra_characterColorLocations, _init_characterColorNames, _init_extra_characterColorNames, _init_characterModifierLocations, _init_extra_characterModifierLocations, _init_characterPortraitResources, _init_extra_characterPortraitResources, _init_characterResources, _init_extra_characterResources, _init_characterSculptingLocations, _init_extra_characterSculptingLocations, _init_paperdolls, _init_extra_paperdolls, _init_races, _init_extra_races, _init_characterDefinitions, _init_extra_characterDefinitions, _init_characterPartTypes, _init_extra_characterPartTypes, _init_characterPartSources, _init_extra_characterPartSources, _init_characterPartMetadata, _init_extra_characterPartMetadata, _init_characterMaterialProfiles, _init_extra_characterMaterialProfiles, _init_characterProjectionProfiles, _init_extra_characterProjectionProfiles, _init_characterRecipeProfiles, _init_extra_characterRecipeProfiles, _init_characterTextureMetadata, _init_extra_characterTextureMetadata;
const DOCUMENT_DEFINITIONS = [["ancestries", "CjsCharacterAncestry", true], ["archetypes", "CjsCharacterArchetype", true], ["bloodlines", "CjsCharacterBloodline", true], ["characterAvatarBehaviors", "CjsCharacterAvatarBehavior", true], ["characterColorLocations", "CjsCharacterColorLocation", true], ["characterColorNames", "CjsCharacterColorName", true], ["characterModifierLocations", "CjsCharacterModifierLocation", true], ["characterPortraitResources", "CjsCharacterPortraitResource", true], ["characterResources", "CjsCharacterResource", true], ["characterSculptingLocations", "CjsCharacterSculptingLocation", true], ["paperdolls", "CjsCharacterPaperdoll", true], ["races", "CjsCharacterRace", true], ["characterDefinitions", "CjsCharacterDefinition", false], ["characterPartTypes", "CjsCharacterPartType", false], ["characterPartSources", "CjsCharacterPartSource", false], ["characterPartMetadata", "CjsCharacterPartMetadata", false], ["characterMaterialProfiles", "CjsCharacterMaterialProfile", false], ["characterProjectionProfiles", "CjsCharacterProjectionProfile", false], ["characterRecipeProfiles", "CjsCharacterRecipeProfile", false], ["characterTextureMetadata", "CjsCharacterTextureMetadata", false]];

/** Typed document collections contained by one character library. */
let _CjsCharacterLibraryD;
class CjsCharacterLibraryDocuments extends CjsModel {
  static {
    ({
      e: [_init_ancestries, _init_extra_ancestries, _init_archetypes, _init_extra_archetypes, _init_bloodlines, _init_extra_bloodlines, _init_characterAvatarBehaviors, _init_extra_characterAvatarBehaviors, _init_characterColorLocations, _init_extra_characterColorLocations, _init_characterColorNames, _init_extra_characterColorNames, _init_characterModifierLocations, _init_extra_characterModifierLocations, _init_characterPortraitResources, _init_extra_characterPortraitResources, _init_characterResources, _init_extra_characterResources, _init_characterSculptingLocations, _init_extra_characterSculptingLocations, _init_paperdolls, _init_extra_paperdolls, _init_races, _init_extra_races, _init_characterDefinitions, _init_extra_characterDefinitions, _init_characterPartTypes, _init_extra_characterPartTypes, _init_characterPartSources, _init_extra_characterPartSources, _init_characterPartMetadata, _init_extra_characterPartMetadata, _init_characterMaterialProfiles, _init_extra_characterMaterialProfiles, _init_characterProjectionProfiles, _init_extra_characterProjectionProfiles, _init_characterRecipeProfiles, _init_extra_characterRecipeProfiles, _init_characterTextureMetadata, _init_extra_characterTextureMetadata],
      c: [_CjsCharacterLibraryD, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterLibraryDocuments",
      family: "character"
    })], [[[io, io.readwrite, void 0, io.flag("index:ancestries"), void 0, type.list("CjsCharacterAncestry")], 16, "ancestries"], [[io, io.readwrite, void 0, io.flag("index:archetypes"), void 0, type.list("CjsCharacterArchetype")], 16, "archetypes"], [[io, io.readwrite, void 0, io.flag("index:bloodlines"), void 0, type.list("CjsCharacterBloodline")], 16, "bloodlines"], [[io, io.readwrite, void 0, io.flag("index:characterAvatarBehaviors"), void 0, type.list("CjsCharacterAvatarBehavior")], 16, "characterAvatarBehaviors"], [[io, io.readwrite, void 0, io.flag("index:characterColorLocations"), void 0, type.list("CjsCharacterColorLocation")], 16, "characterColorLocations"], [[io, io.readwrite, void 0, io.flag("index:characterColorNames"), void 0, type.list("CjsCharacterColorName")], 16, "characterColorNames"], [[io, io.readwrite, void 0, io.flag("index:characterModifierLocations"), void 0, type.list("CjsCharacterModifierLocation")], 16, "characterModifierLocations"], [[io, io.readwrite, void 0, io.flag("index:characterPortraitResources"), void 0, type.list("CjsCharacterPortraitResource")], 16, "characterPortraitResources"], [[io, io.readwrite, void 0, io.flag("index:characterResources"), void 0, type.list("CjsCharacterResource")], 16, "characterResources"], [[io, io.readwrite, void 0, io.flag("index:characterSculptingLocations"), void 0, type.list("CjsCharacterSculptingLocation")], 16, "characterSculptingLocations"], [[io, io.readwrite, void 0, io.flag("index:paperdolls"), void 0, type.list("CjsCharacterPaperdoll")], 16, "paperdolls"], [[io, io.readwrite, void 0, io.flag("index:races"), void 0, type.list("CjsCharacterRace")], 16, "races"], [[io, io.readwrite, void 0, io.flag("index:characterDefinitions"), void 0, type.list("CjsCharacterDefinition")], 16, "characterDefinitions"], [[io, io.readwrite, void 0, io.flag("index:characterPartTypes"), void 0, type.list("CjsCharacterPartType")], 16, "characterPartTypes"], [[io, io.readwrite, void 0, io.flag("index:characterPartSources"), void 0, type.list("CjsCharacterPartSource")], 16, "characterPartSources"], [[io, io.readwrite, void 0, io.flag("index:characterPartMetadata"), void 0, type.list("CjsCharacterPartMetadata")], 16, "characterPartMetadata"], [[io, io.readwrite, void 0, io.flag("index:characterMaterialProfiles"), void 0, type.list("CjsCharacterMaterialProfile")], 16, "characterMaterialProfiles"], [[io, io.readwrite, void 0, io.flag("index:characterProjectionProfiles"), void 0, type.list("CjsCharacterProjectionProfile")], 16, "characterProjectionProfiles"], [[io, io.readwrite, void 0, io.flag("index:characterRecipeProfiles"), void 0, type.list("CjsCharacterRecipeProfile")], 16, "characterRecipeProfiles"], [[io, io.readwrite, void 0, io.flag("index:characterTextureMetadata"), void 0, type.list("CjsCharacterTextureMetadata")], 16, "characterTextureMetadata"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_characterTextureMetadata(this);
  }
  /** Returns the canonical ordered combined-library document names. */
  static listDocumentNames() {
    return DOCUMENT_DEFINITIONS.map(([name]) => name);
  }

  /** Returns the registered model name for one combined-library document. */
  static getDocumentType(name) {
    return DOCUMENT_DEFINITIONS.find(([candidate]) => candidate === name)?.[1] ?? null;
  }

  /** Returns whether a source-document input is required for every build. */
  static isRequiredDocument(name) {
    return DOCUMENT_DEFINITIONS.find(([candidate]) => candidate === name)?.[2] === true;
  }

  /** Hydrates and adds one record to a named document collection. */
  Create(documentName, values = {}, options = {}) {
    return CjsModel.createChild(this, RequireDocumentName(documentName), values, options);
  }

  /** Adds one existing record to a named document collection. */
  Add(documentName, record, options = {}) {
    const name = RequireDocumentName(documentName);
    RequireDocumentRecord(name, record);
    return CjsModel.addChild(this, name, record, options);
  }

  /** Detaches one existing record from a named document collection. */
  Remove(documentName, record, options = {}) {
    const name = RequireDocumentName(documentName);
    RequireDocumentRecord(name, record);
    return CjsModel.removeChild(this, name, record, options);
  }

  /** Deletes one existing record through an optional domain teardown hook. */
  Delete(documentName, record, options = {}) {
    const name = RequireDocumentName(documentName);
    RequireDocumentRecord(name, record);
    return CjsModel.deleteChild(this, name, record, options);
  }

  /** Clears one named document collection without deleting its records. */
  Clear(documentName, options = {}) {
    return CjsModel.clearChildren(this, RequireDocumentName(documentName), options);
  }
  ancestries = _init_ancestries(this, []);
  archetypes = (_init_extra_ancestries(this), _init_archetypes(this, []));
  bloodlines = (_init_extra_archetypes(this), _init_bloodlines(this, []));
  characterAvatarBehaviors = (_init_extra_bloodlines(this), _init_characterAvatarBehaviors(this, []));
  characterColorLocations = (_init_extra_characterAvatarBehaviors(this), _init_characterColorLocations(this, []));
  characterColorNames = (_init_extra_characterColorLocations(this), _init_characterColorNames(this, []));
  characterModifierLocations = (_init_extra_characterColorNames(this), _init_characterModifierLocations(this, []));
  characterPortraitResources = (_init_extra_characterModifierLocations(this), _init_characterPortraitResources(this, []));
  characterResources = (_init_extra_characterPortraitResources(this), _init_characterResources(this, []));
  characterSculptingLocations = (_init_extra_characterResources(this), _init_characterSculptingLocations(this, []));
  paperdolls = (_init_extra_characterSculptingLocations(this), _init_paperdolls(this, []));
  races = (_init_extra_paperdolls(this), _init_races(this, []));
  characterDefinitions = (_init_extra_races(this), _init_characterDefinitions(this, []));
  characterPartTypes = (_init_extra_characterDefinitions(this), _init_characterPartTypes(this, []));
  characterPartSources = (_init_extra_characterPartTypes(this), _init_characterPartSources(this, []));
  characterPartMetadata = (_init_extra_characterPartSources(this), _init_characterPartMetadata(this, []));
  characterMaterialProfiles = (_init_extra_characterPartMetadata(this), _init_characterMaterialProfiles(this, []));
  characterProjectionProfiles = (_init_extra_characterMaterialProfiles(this), _init_characterProjectionProfiles(this, []));
  characterRecipeProfiles = (_init_extra_characterProjectionProfiles(this), _init_characterRecipeProfiles(this, []));
  characterTextureMetadata = (_init_extra_characterRecipeProfiles(this), _init_characterTextureMetadata(this, []));
  static {
    _initClass();
  }
}
function RequireDocumentName(value) {
  const name = String(value);
  if (!_CjsCharacterLibraryD.getDocumentType(name)) {
    throw new Error(`Unknown character library document ${JSON.stringify(name)}`);
  }
  return name;
}
function RequireDocumentRecord(documentName, record) {
  const typeName = _CjsCharacterLibraryD.getDocumentType(documentName);
  const Constructor = CjsSchema.GetConstructor(typeName);
  if (!Constructor || !(record instanceof Constructor)) {
    throw new TypeError(`Character library document ${JSON.stringify(documentName)} requires ${typeName}`);
  }
  return record;
}

export { _CjsCharacterLibraryD as CjsCharacterLibraryDocuments };
//# sourceMappingURL=CjsCharacterLibraryDocuments.js.map
