import { CjsCharacterLibrary } from "./CjsCharacterLibrary.js";
import { normalizeResourcePath } from "#utils/path";

/** Installs, loads, and queries one combined hydrated character library. */
export class CjsCharacterLibraryManager
{

    _library = new CjsCharacterLibrary();

    _resourceLoader = null;

    _resourceManager = null;

    _loadOperations = new Map();

    _installGeneration = 0;

    /** Creates a manager from an optional combined library and structural loader. */
    constructor(library = null, options = {})
    {
        if (options === null || typeof options !== "object" || Array.isArray(options))
        {
            throw new TypeError("Character library manager options must be an object");
        }

        if (Object.hasOwn(options, "resourceLoader"))
        {
            this.SetResourceLoader(options.resourceLoader);
        }
        if (Object.hasOwn(options, "resourceManager"))
        {
            this.SetResourceManager(options.resourceManager);
        }

        if (library !== null && library !== undefined)
        {
            this.InstallLibrary(library);
        }
    }

    /** Supplies the object loader used to obtain a combined library resource. */
    SetResourceLoader(loader)
    {
        if (loader !== null && typeof loader !== "function")
        {
            throw new TypeError("Character library resource loader must be a function or null");
        }

        this._resourceLoader = loader;
        return this;
    }

    /** Supplies the runtime resource manager used for incremental resource-data inspection. */
    SetResourceManager(resMan = null)
    {
        if (resMan !== null && typeof resMan.GetObject !== "function")
        {
            throw new TypeError("Character library resource manager must expose GetObject");
        }

        this._resourceManager = resMan;
        this._library.SetResourceManager(resMan);
        return this;
    }

    /** Installs a hydrated library directly, or hydrates the same-shaped JSON values once. */
    InstallLibrary(value)
    {
        const installed = PrepareLibrary(value);
        this._installGeneration += 1;
        installed.SetResourceManager(this._resourceManager);
        this._library = installed;
        return installed;
    }

    /** Returns the currently installed combined library. */
    GetLibrary()
    {
        return this._library;
    }

    /** Loads and installs a combined library through the configured synchronous loader. */
    LoadLibrary(filePath)
    {
        if (!this._resourceLoader)
        {
            return false;
        }

        const path = NormalizeLibraryPath(filePath);
        const value = this._resourceLoader(path);

        if (value && typeof value.then === "function")
        {
            throw new TypeError("CjsCharacterLibraryManager.LoadLibrary requires a synchronous loader");
        }

        if (!value)
        {
            return false;
        }

        this.InstallLibrary(value);
        return true;
    }

    /** Loads and installs one combined library while deduplicating equivalent in-flight paths. */
    async LoadLibraryAsync(filePath)
    {
        const loader = this._resourceLoader;

        if (!loader)
        {
            return false;
        }

        const path = NormalizeLibraryPath(filePath);
        const existing = this._loadOperations.get(path);

        if (existing)
        {
            return existing;
        }

        const generation = ++this._installGeneration;
        const operation = Promise.resolve()
            .then(() => loader(path))
            .then(value =>
            {
                if (!value)
                {
                    return false;
                }

                const installed = PrepareLibrary(value);

                if (this._installGeneration !== generation)
                {
                    return false;
                }

                installed.SetResourceManager(this._resourceManager);
                this._library = installed;
                return true;
            });
        this._loadOperations.set(path, operation);

        const clear = () =>
        {
            if (this._loadOperations.get(path) === operation)
            {
                this._loadOperations.delete(path);
            }
        };

        operation.then(clear, clear);
        return operation;
    }

    /** Hydrates and adds one item to the installed editor library. */
    Create(documentName, values = {}, options = {})
    {
        return this._library.Create(documentName, values, options);
    }

    /** Adds one already-hydrated item to the installed editor library. */
    Add(documentName, record, options = {})
    {
        return this._library.Add(documentName, record, options);
    }

    /** Detaches one item from the installed editor library. */
    Remove(documentName, record, options = {})
    {
        return this._library.Remove(documentName, record, options);
    }

    /** Deletes one item from the installed editor library. */
    Delete(documentName, record, options = {})
    {
        return this._library.Delete(documentName, record, options);
    }

    /** Clears one document in the installed editor library. */
    Clear(documentName, options = {})
    {
        return this._library.Clear(documentName, options);
    }

    /** Returns one installed library document collection. */
    GetDocument(name)
    {
        return this._library.GetDocument(name);
    }

    /** Returns one installed record by document name and named record identity. */
    Get(documentName, recordID)
    {
        return this._library.Get(documentName, recordID);
    }

    /** Returns the installed library's unresolved relationship for one member, or null. */
    GetUnresolvedRelationship(documentName, recordID, field)
    {
        return this._library.GetUnresolvedRelationship(documentName, recordID, field);
    }

    /** Lists the installed combined-library document collections. */
    ListDocuments()
    {
        return this._library.ListDocuments();
    }

    /** Returns whether the installed library contains one named record. */
    Has(documentName, recordID)
    {
        return this._library.Has(documentName, recordID);
    }

    /** Rebuilds one or every installed private record index after editor mutation. */
    Reindex(documentName = null)
    {
        this._library.Reindex(documentName);
        return this;
    }

    /** Returns or discovers extension-neutral character data for one resource path. */
    InspectResourceForData(resourcePath, options = {})
    {
        return this._library.InspectResourceForData(resourcePath, options);
    }

}

function NormalizeLibraryPath(value)
{
    if (typeof value !== "string" || !value.trim())
    {
        throw new TypeError("Character library path must be a non-empty string");
    }

    const path = normalizeResourcePath(value);

    if (!path)
    {
        throw new TypeError("Character library path must be a non-empty string");
    }

    return path;
}

function PrepareLibrary(value)
{
    if (value === null || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError("Character library must be an object");
    }

    if (value.schema !== "carbonenginejs.characterLibrary"
        || ![ 7, 8, 9, 10, 11 ].includes(value.schemaVersion))
    {
        throw new TypeError(
            "Character library must use carbonenginejs.characterLibrary schema version 7, 8, 9, 10, or 11"
        );
    }

    const installed = value instanceof CjsCharacterLibrary
        ? value
        : CjsCharacterLibrary.from(CjsCharacterLibrary.validateValues(value));

    installed.Reindex();
    return installed;
}

export default CjsCharacterLibraryManager;
