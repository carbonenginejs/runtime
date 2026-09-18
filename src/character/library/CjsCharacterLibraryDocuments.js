import { CjsSchema, edit, invalidation, type } from "#schema";
import { CjsModel } from "#model";
import "../model/index.js";

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

    @edit.readwrite
    @invalidation.flag("index:ancestries")
    @type.list("CjsCharacterAncestry")
    ancestries = [];

    @edit.readwrite
    @invalidation.flag("index:archetypes")
    @type.list("CjsCharacterArchetype")
    archetypes = [];

    @edit.readwrite
    @invalidation.flag("index:bloodlines")
    @type.list("CjsCharacterBloodline")
    bloodlines = [];

    @edit.readwrite
    @invalidation.flag("index:characterAvatarBehaviors")
    @type.list("CjsCharacterAvatarBehavior")
    characterAvatarBehaviors = [];

    @edit.readwrite
    @invalidation.flag("index:characterColorLocations")
    @type.list("CjsCharacterColorLocation")
    characterColorLocations = [];

    @edit.readwrite
    @invalidation.flag("index:characterColorNames")
    @type.list("CjsCharacterColorName")
    characterColorNames = [];

    @edit.readwrite
    @invalidation.flag("index:characterModifierLocations")
    @type.list("CjsCharacterModifierLocation")
    characterModifierLocations = [];

    @edit.readwrite
    @invalidation.flag("index:characterPortraitResources")
    @type.list("CjsCharacterPortraitResource")
    characterPortraitResources = [];

    @edit.readwrite
    @invalidation.flag("index:characterResources")
    @type.list("CjsCharacterResource")
    characterResources = [];

    @edit.readwrite
    @invalidation.flag("index:characterSculptingLocations")
    @type.list("CjsCharacterSculptingLocation")
    characterSculptingLocations = [];

    @edit.readwrite
    @invalidation.flag("index:paperdolls")
    @type.list("CjsCharacterPaperdoll")
    paperdolls = [];

    @edit.readwrite
    @invalidation.flag("index:races")
    @type.list("CjsCharacterRace")
    races = [];

    @edit.readwrite
    @invalidation.flag("index:characterDefinitions")
    @type.list("CjsCharacterDefinition")
    characterDefinitions = [];

    @edit.readwrite
    @invalidation.flag("index:characterPartTypes")
    @type.list("CjsCharacterPartType")
    characterPartTypes = [];

    @edit.readwrite
    @invalidation.flag("index:characterPartSources")
    @type.list("CjsCharacterPartSource")
    characterPartSources = [];

    @edit.readwrite
    @invalidation.flag("index:characterPartMetadata")
    @type.list("CjsCharacterPartMetadata")
    characterPartMetadata = [];

    @edit.readwrite
    @invalidation.flag("index:characterMaterialProfiles")
    @type.list("CjsCharacterMaterialProfile")
    characterMaterialProfiles = [];

    @edit.readwrite
    @invalidation.flag("index:characterProjectionProfiles")
    @type.list("CjsCharacterProjectionProfile")
    characterProjectionProfiles = [];

    @edit.readwrite
    @invalidation.flag("index:characterRecipeProfiles")
    @type.list("CjsCharacterRecipeProfile")
    characterRecipeProfiles = [];

    @edit.readwrite
    @invalidation.flag("index:characterTextureMetadata")
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
