import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import "../character/index.js";

const DOCUMENT_DEFINITIONS = [
    [ "ancestries", "CjsCharacterAncestry", true ],
    [ "archetypes", "CjsCharacterArchetype", true ],
    [ "bloodlines", "CjsCharacterBloodline", true ],
    [ "characterAvatarBehaviors", "CjsCharacterAvatarBehavior", true ],
    [ "characterColorLocations", "CjsCharacterColorLocation", true ],
    [ "characterColorNames", "CjsCharacterColorName", true ],
    [ "characterModifierLocations", "CjsCharacterModifierLocation", true ],
    [ "characterPortraitResources", "CjsCharacterPortraitResource", true ],
    [ "characterResources", "CjsCharacterResource", true ],
    [ "characterSculptingLocations", "CjsCharacterSculptingLocation", true ],
    [ "paperdolls", "CjsCharacterPaperdoll", true ],
    [ "races", "CjsCharacterRace", true ],
    [ "characterPartTypes", "CjsCharacterPartType", false ],
    [ "characterPartSources", "CjsCharacterPartSource", false ],
    [ "characterPartMetadata", "CjsCharacterPartMetadata", false ],
    [ "characterMaterialProfiles", "CjsCharacterMaterialProfile", false ],
    [ "characterProjectionProfiles", "CjsCharacterProjectionProfile", false ],
    [ "characterRecipeProfiles", "CjsCharacterRecipeProfile", false ]
];

/** Typed document collections contained by one character library. */
@type.define({ className: "CjsCharacterLibraryDocuments", family: "character" })
export class CjsCharacterLibraryDocuments extends CjsModel
{

    /** Returns the canonical ordered combined-library document names. */
    static listDocumentNames()
    {
        return DOCUMENT_DEFINITIONS.map(([ name ]) => name);
    }

    /** Returns the registered model name for one combined-library document. */
    static getDocumentType(name)
    {
        return DOCUMENT_DEFINITIONS.find(([ candidate ]) => candidate === name)?.[1] ?? null;
    }

    /** Returns whether a source-document input is required for every build. */
    static isRequiredDocument(name)
    {
        return DOCUMENT_DEFINITIONS.find(([ candidate ]) => candidate === name)?.[2] === true;
    }

    @io.readwrite
    @type.list("CjsCharacterAncestry")
    ancestries = [];

    @io.readwrite
    @type.list("CjsCharacterArchetype")
    archetypes = [];

    @io.readwrite
    @type.list("CjsCharacterBloodline")
    bloodlines = [];

    @io.readwrite
    @type.list("CjsCharacterAvatarBehavior")
    characterAvatarBehaviors = [];

    @io.readwrite
    @type.list("CjsCharacterColorLocation")
    characterColorLocations = [];

    @io.readwrite
    @type.list("CjsCharacterColorName")
    characterColorNames = [];

    @io.readwrite
    @type.list("CjsCharacterModifierLocation")
    characterModifierLocations = [];

    @io.readwrite
    @type.list("CjsCharacterPortraitResource")
    characterPortraitResources = [];

    @io.readwrite
    @type.list("CjsCharacterResource")
    characterResources = [];

    @io.readwrite
    @type.list("CjsCharacterSculptingLocation")
    characterSculptingLocations = [];

    @io.readwrite
    @type.list("CjsCharacterPaperdoll")
    paperdolls = [];

    @io.readwrite
    @type.list("CjsCharacterRace")
    races = [];

    @io.readwrite
    @type.list("CjsCharacterPartType")
    characterPartTypes = [];

    @io.readwrite
    @type.list("CjsCharacterPartSource")
    characterPartSources = [];

    @io.readwrite
    @type.list("CjsCharacterPartMetadata")
    characterPartMetadata = [];

    @io.readwrite
    @type.list("CjsCharacterMaterialProfile")
    characterMaterialProfiles = [];

    @io.readwrite
    @type.list("CjsCharacterProjectionProfile")
    characterProjectionProfiles = [];

    @io.readwrite
    @type.list("CjsCharacterRecipeProfile")
    characterRecipeProfiles = [];

}

export default CjsCharacterLibraryDocuments;
