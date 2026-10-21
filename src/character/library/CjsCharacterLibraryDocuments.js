import { exposure as be } from "#be";
import { CjsSchema, meta, type } from "#schema";
import { createChild, addChild, removeChild, deleteChild, clearChildren } from "../../global/blue/children.js";
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
@meta.define("CjsCharacterLibraryDocuments")
export class CjsCharacterLibraryDocuments
{
    /**
     * Revision of each document list, by document name. Not a document: the
     * document names are `listDocumentNames()`, never this object's keys.
     *
     * @type {Map<string, number>}
     */
    _documentRevisions = new Map();

    /** Revision of library-owned list mutations, independent of edit settling. */
    GetDocumentRevision(name)
    {
        return this._documentRevisions.get(name) ?? 0;
    }

    /**
     * Advances the revision of the document list that was mutated.
     *
     * Adapted: JS character library lookup indexes must observe same-length list replacements,
     * including deferred edits.
     */
    @meta.invalidates("_documentRevisions")
    OnListModified(_event, _key, _key2, _value, list)
    {
        for (const [name] of DOCUMENT_DEFINITIONS)
        {
            if (this[name] === list)
            {
                this._documentRevisions.set(name, this.GetDocumentRevision(name) + 1);
            }
        }
    }

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
        return createChild(this, RequireDocumentName(documentName), values, { ...options, listNotify: this });
    }

    /** Adds one existing record to a named document collection. */
    Add(documentName, record, options = {})
    {
        const name = RequireDocumentName(documentName);
        RequireDocumentRecord(name, record);
        return addChild(this, name, record, { ...options, listNotify: this });
    }

    /** Detaches one existing record from a named document collection. */
    Remove(documentName, record, options = {})
    {
        const name = RequireDocumentName(documentName);
        RequireDocumentRecord(name, record);
        return removeChild(this, name, record, { ...options, listNotify: this });
    }

    /** Deletes one existing record through an optional domain teardown hook. */
    Delete(documentName, record, options = {})
    {
        const name = RequireDocumentName(documentName);
        RequireDocumentRecord(name, record);
        return deleteChild(this, name, record, { ...options, listNotify: this });
    }

    /** Clears one named document collection without deleting its records. */
    Clear(documentName, options = {})
    {
        return clearChildren(this, RequireDocumentName(documentName), { ...options, listNotify: this });
    }

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterAncestry")
    ancestries = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterArchetype")
    archetypes = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterBloodline")
    bloodlines = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterAvatarBehavior")
    characterAvatarBehaviors = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterColorLocation")
    characterColorLocations = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterColorName")
    characterColorNames = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterModifierLocation")
    characterModifierLocations = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterPortraitResource")
    characterPortraitResources = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterResource")
    characterResources = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterSculptingLocation")
    characterSculptingLocations = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterPaperdoll")
    paperdolls = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterRace")
    races = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterDefinition")
    characterDefinitions = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterPartType")
    characterPartTypes = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterPartSource")
    characterPartSources = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterPartMetadata")
    characterPartMetadata = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterMaterialProfile")
    characterMaterialProfiles = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterProjectionProfile")
    characterProjectionProfiles = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


    @type.list("CjsCharacterRecipeProfile")
    characterRecipeProfiles = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)


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
    const Constructor = CjsSchema.getConstructor(typeName);
    if (!Constructor || !(record instanceof Constructor))
    {
        throw new TypeError(
            `Character library document ${JSON.stringify(documentName)} requires ${typeName}`
        );
    }
    return record;
}

export default CjsCharacterLibraryDocuments;
