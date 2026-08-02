import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { CjsCharacterLibraryDocuments } from "./CjsCharacterLibraryDocuments.js";

/** Hydrated character library whose public fields have the same shape as its JSON values. */
@type.define({ className: "CjsCharacterLibrary", family: "character" })
export class CjsCharacterLibrary extends CjsModel
{

    @io.readwrite
    @type.string
    schema = "carbonenginejs.characterLibrary";

    @io.readwrite
    @type.uint32
    schemaVersion = 4;

    @io.readwrite
    @type.string
    sourceTarget = null;

    @io.readwrite
    @type.string
    sourceGame = null;

    @io.readwrite
    @type.string
    sourceProvider = null;

    @io.readwrite
    @type.string
    sourceBuild = null;

    @io.readwrite
    @type.string
    generatedAt = null;

    @io.readwrite
    @type.model("CjsCharacterLibraryDocuments")
    documents = new CjsCharacterLibraryDocuments();

    /** Lists the document collections declared by this library model. */
    ListDocuments()
    {
        return Object.keys(this.documents.GetValues());
    }

    /** Returns one hydrated document collection or null. */
    GetDocument(name)
    {
        const key = String(name);
        return Object.hasOwn(this.documents, key) ? this.documents[key] : null;
    }

    /** Returns whether a document contains a record with the requested source identity. */
    Has(documentName, recordID)
    {
        return this.Get(documentName, recordID) !== null;
    }

    /** Returns one hydrated source record by its named recordID field. */
    Get(documentName, recordID)
    {
        const document = this.GetDocument(documentName);
        const identity = String(recordID);

        if (!document)
        {
            return null;
        }

        return document.find(record => record.recordID === identity) ?? null;
    }

}

export default CjsCharacterLibrary;
