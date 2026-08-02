import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import "../character/index.js";

/** Typed document collections contained by one character library. */
@type.define({ className: "CjsCharacterLibraryDocuments", family: "character" })
export class CjsCharacterLibraryDocuments extends CjsModel
{

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

}

export default CjsCharacterLibraryDocuments;
