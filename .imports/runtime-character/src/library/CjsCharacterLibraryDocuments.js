import { CjsSchema, io, type } from "@carbonenginejs/runtime-utils/schema";
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
    [ "characterDefinitions", "CjsCharacterDefinition", false ],
    [ "characterPartTypes", "CjsCharacterPartType", false ],
    [ "characterPartSources", "CjsCharacterPartSource", false ],
    [ "characterPartMetadata", "CjsCharacterPartMetadata", false ],
    [ "characterMaterialProfiles", "CjsCharacterMaterialProfile", false ],
    [ "characterProjectionProfiles", "CjsCharacterProjectionProfile", false ],
    [ "characterRecipeProfiles", "CjsCharacterRecipeProfile", false ],
    [ "characterTextureMetadata", "CjsCharacterTextureMetadata", false ]
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

    /** Hydrates and adds one record to a named document collection. */
    Create(documentName, values = {}, options = {})
    {
        return CjsModel.createChild(this, RequireDocumentName(documentName), values, options);
    }

    /** Adds one existing record to a named document collection. */
    Add(documentName, record, options = {})
    {
        const name = RequireDocumentName(documentName);
        RequireDocumentRecord(name, record);
        return CjsModel.addChild(this, name, record, options);
    }

    /** Detaches one existing record from a named document collection. */
    Remove(documentName, record, options = {})
    {
        const name = RequireDocumentName(documentName);
        RequireDocumentRecord(name, record);
        return CjsModel.removeChild(this, name, record, options);
    }

    /** Deletes one existing record through an optional domain teardown hook. */
    Delete(documentName, record, options = {})
    {
        const name = RequireDocumentName(documentName);
        RequireDocumentRecord(name, record);
        return CjsModel.deleteChild(this, name, record, options);
    }

    /** Clears one named document collection without deleting its records. */
    Clear(documentName, options = {})
    {
        return CjsModel.clearChildren(this, RequireDocumentName(documentName), options);
    }

    @io.readwrite
    @io.flag("index:ancestries")
    @type.list("CjsCharacterAncestry")
    ancestries = [];

    @io.readwrite
    @io.flag("index:archetypes")
    @type.list("CjsCharacterArchetype")
    archetypes = [];

    @io.readwrite
    @io.flag("index:bloodlines")
    @type.list("CjsCharacterBloodline")
    bloodlines = [];

    @io.readwrite
    @io.flag("index:characterAvatarBehaviors")
    @type.list("CjsCharacterAvatarBehavior")
    characterAvatarBehaviors = [];

    @io.readwrite
    @io.flag("index:characterColorLocations")
    @type.list("CjsCharacterColorLocation")
    characterColorLocations = [];

    @io.readwrite
    @io.flag("index:characterColorNames")
    @type.list("CjsCharacterColorName")
    characterColorNames = [];

    @io.readwrite
    @io.flag("index:characterModifierLocations")
    @type.list("CjsCharacterModifierLocation")
    characterModifierLocations = [];

    @io.readwrite
    @io.flag("index:characterPortraitResources")
    @type.list("CjsCharacterPortraitResource")
    characterPortraitResources = [];

    @io.readwrite
    @io.flag("index:characterResources")
    @type.list("CjsCharacterResource")
    characterResources = [];

    @io.readwrite
    @io.flag("index:characterSculptingLocations")
    @type.list("CjsCharacterSculptingLocation")
    characterSculptingLocations = [];

    @io.readwrite
    @io.flag("index:paperdolls")
    @type.list("CjsCharacterPaperdoll")
    paperdolls = [];

    @io.readwrite
    @io.flag("index:races")
    @type.list("CjsCharacterRace")
    races = [];

    @io.readwrite
    @io.flag("index:characterDefinitions")
    @type.list("CjsCharacterDefinition")
    characterDefinitions = [];

    @io.readwrite
    @io.flag("index:characterPartTypes")
    @type.list("CjsCharacterPartType")
    characterPartTypes = [];

    @io.readwrite
    @io.flag("index:characterPartSources")
    @type.list("CjsCharacterPartSource")
    characterPartSources = [];

    @io.readwrite
    @io.flag("index:characterPartMetadata")
    @type.list("CjsCharacterPartMetadata")
    characterPartMetadata = [];

    @io.readwrite
    @io.flag("index:characterMaterialProfiles")
    @type.list("CjsCharacterMaterialProfile")
    characterMaterialProfiles = [];

    @io.readwrite
    @io.flag("index:characterProjectionProfiles")
    @type.list("CjsCharacterProjectionProfile")
    characterProjectionProfiles = [];

    @io.readwrite
    @io.flag("index:characterRecipeProfiles")
    @type.list("CjsCharacterRecipeProfile")
    characterRecipeProfiles = [];

    @io.readwrite
    @io.flag("index:characterTextureMetadata")
    @type.list("CjsCharacterTextureMetadata")
    characterTextureMetadata = [];

}

function RequireDocumentName(value)
{
    const name = String(value);
    if (!CjsCharacterLibraryDocuments.getDocumentType(name))
    {
        throw new Error(`Unknown character library document ${JSON.stringify(name)}`);
    }
    return name;
}

function RequireDocumentRecord(documentName, record)
{
    const typeName = CjsCharacterLibraryDocuments.getDocumentType(documentName);
    const Constructor = CjsSchema.GetConstructor(typeName);
    if (!Constructor || !(record instanceof Constructor))
    {
        throw new TypeError(
            `Character library document ${JSON.stringify(documentName)} requires ${typeName}`
        );
    }
    return record;
}

export default CjsCharacterLibraryDocuments;
