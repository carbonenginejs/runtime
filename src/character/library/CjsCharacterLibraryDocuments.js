import { CjsSchema, edit, impl, type } from "#schema";
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
@type.define({ className: "CjsCharacterLibraryDocuments", family: "character" })
export class CjsCharacterLibraryDocuments
{
    /**
     * Revisions live beside the document lists, not among them: key
     * enumeration of this object lists exactly the documents, so the state
     * is defined non-enumerable.
     */
    constructor()
    {
        Object.defineProperty(this, "_documentRevisions", {
            value: new Map(),
            writable: true,
            configurable: true,
            enumerable: false
        });
    }

    /** Revision of library-owned list mutations, independent of edit settling. */
    GetDocumentRevision(name)
    {
        return this._documentRevisions.get(name) ?? 0;
    }

    /** Advances the revision of the document list that was mutated. */
    @impl.custom
    @impl.reason("JS character library lookup indexes must observe same-length list replacements, including deferred edits.")
    @impl.invalidates("_documentRevisions")
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

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterAncestry")
    ancestries = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterArchetype")
    archetypes = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterBloodline")
    bloodlines = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterAvatarBehavior")
    characterAvatarBehaviors = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterColorLocation")
    characterColorLocations = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterColorName")
    characterColorNames = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterModifierLocation")
    characterModifierLocations = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterPortraitResource")
    characterPortraitResources = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterResource")
    characterResources = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterSculptingLocation")
    characterSculptingLocations = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterPaperdoll")
    paperdolls = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterRace")
    races = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterDefinition")
    characterDefinitions = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterPartType")
    characterPartTypes = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterPartSource")
    characterPartSources = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterPartMetadata")
    characterPartMetadata = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterMaterialProfile")
    characterMaterialProfiles = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterProjectionProfile")
    characterProjectionProfiles = [];

    @edit.readwrite
    @edit.persist

    @type.list("CjsCharacterRecipeProfile")
    characterRecipeProfiles = [];

    @edit.readwrite
    @edit.persist

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
