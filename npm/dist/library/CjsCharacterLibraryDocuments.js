import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import '../character/CjsCharacterRecord.js';
import '../character/activity/CjsCharacterArchetype.js';
import '../character/appearance/CjsCharacterColorLocation.js';
import '../character/appearance/CjsCharacterColorName.js';
import '../character/appearance/CjsCharacterColorSelection.js';
import '../character/appearance/CjsCharacterSculptingLocation.js';
import '../character/appearance/CjsCharacterSculptSelection.js';
import '../character/behavior/CjsCharacterAvatarBehavior.js';
import '../character/composition/CjsCharacterModifierLocation.js';
import '../character/composition/CjsCharacterModifierSelection.js';
import '../character/creation/CjsCharacterPaperdoll.js';
import '../character/demographics/CjsCharacterAncestry.js';
import '../character/demographics/CjsCharacterBloodline.js';
import '../character/demographics/CjsCharacterRace.js';
import '../character/planning/CjsCharacterAppearanceBinding.js';
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
import '../character/planning/CjsCharacterResolvedPart.js';
import '../character/planning/CjsCharacterTextureAsset.js';
import '../character/planning/CjsCharacterTextureChannel.js';
import '../character/resources/CjsCharacterPortraitResource.js';
import '../character/resources/CjsCharacterResource.js';

let _initClass, _init_ancestries, _init_extra_ancestries, _init_archetypes, _init_extra_archetypes, _init_bloodlines, _init_extra_bloodlines, _init_characterAvatarBehaviors, _init_extra_characterAvatarBehaviors, _init_characterColorLocations, _init_extra_characterColorLocations, _init_characterColorNames, _init_extra_characterColorNames, _init_characterModifierLocations, _init_extra_characterModifierLocations, _init_characterPortraitResources, _init_extra_characterPortraitResources, _init_characterResources, _init_extra_characterResources, _init_characterSculptingLocations, _init_extra_characterSculptingLocations, _init_paperdolls, _init_extra_paperdolls, _init_races, _init_extra_races;

/** Typed document collections contained by one character library. */
let _CjsCharacterLibraryD;
class CjsCharacterLibraryDocuments extends CjsModel {
  static {
    ({
      e: [_init_ancestries, _init_extra_ancestries, _init_archetypes, _init_extra_archetypes, _init_bloodlines, _init_extra_bloodlines, _init_characterAvatarBehaviors, _init_extra_characterAvatarBehaviors, _init_characterColorLocations, _init_extra_characterColorLocations, _init_characterColorNames, _init_extra_characterColorNames, _init_characterModifierLocations, _init_extra_characterModifierLocations, _init_characterPortraitResources, _init_extra_characterPortraitResources, _init_characterResources, _init_extra_characterResources, _init_characterSculptingLocations, _init_extra_characterSculptingLocations, _init_paperdolls, _init_extra_paperdolls, _init_races, _init_extra_races],
      c: [_CjsCharacterLibraryD, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterLibraryDocuments",
      family: "character"
    })], [[[io, io.readwrite, void 0, type.list("CjsCharacterAncestry")], 16, "ancestries"], [[io, io.readwrite, void 0, type.list("CjsCharacterArchetype")], 16, "archetypes"], [[io, io.readwrite, void 0, type.list("CjsCharacterBloodline")], 16, "bloodlines"], [[io, io.readwrite, void 0, type.list("CjsCharacterAvatarBehavior")], 16, "characterAvatarBehaviors"], [[io, io.readwrite, void 0, type.list("CjsCharacterColorLocation")], 16, "characterColorLocations"], [[io, io.readwrite, void 0, type.list("CjsCharacterColorName")], 16, "characterColorNames"], [[io, io.readwrite, void 0, type.list("CjsCharacterModifierLocation")], 16, "characterModifierLocations"], [[io, io.readwrite, void 0, type.list("CjsCharacterPortraitResource")], 16, "characterPortraitResources"], [[io, io.readwrite, void 0, type.list("CjsCharacterResource")], 16, "characterResources"], [[io, io.readwrite, void 0, type.list("CjsCharacterSculptingLocation")], 16, "characterSculptingLocations"], [[io, io.readwrite, void 0, type.list("CjsCharacterPaperdoll")], 16, "paperdolls"], [[io, io.readwrite, void 0, type.list("CjsCharacterRace")], 16, "races"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_races(this);
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
  static {
    _initClass();
  }
}

export { _CjsCharacterLibraryD as CjsCharacterLibraryDocuments };
//# sourceMappingURL=CjsCharacterLibraryDocuments.js.map
