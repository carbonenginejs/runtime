import { CjsCharacterLibrary } from "./CjsCharacterLibrary.js";
import { normalizeResourcePath } from "@carbonenginejs/runtime-utils/path";

/** Installs, loads, and queries one combined hydrated character library. */
export class CjsCharacterLibraryManager
{

    #library = new CjsCharacterLibrary();

    #resourceLoader = null;

    #loadOperations = new Map();

    #installGeneration = 0;

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

        this.#resourceLoader = loader;
        return this;
    }

    /** Installs a hydrated library directly, or hydrates the same-shaped JSON values once. */
    InstallLibrary(value)
    {
        const installed = PrepareLibrary(value);
        this.#installGeneration += 1;
        this.#library = installed;
        return installed;
    }

    /** Returns the currently installed combined library. */
    GetLibrary()
    {
        return this.#library;
    }

    /** Loads and installs a combined library through the configured synchronous loader. */
    LoadLibrary(filePath)
    {
        if (!this.#resourceLoader)
        {
            return false;
        }

        const path = NormalizeLibraryPath(filePath);
        const value = this.#resourceLoader(path);

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
        const loader = this.#resourceLoader;

        if (!loader)
        {
            return false;
        }

        const path = NormalizeLibraryPath(filePath);
        const existing = this.#loadOperations.get(path);

        if (existing)
        {
            return existing;
        }

        const generation = ++this.#installGeneration;
        const operation = Promise.resolve()
            .then(() => loader(path))
            .then(value =>
            {
                if (!value)
                {
                    return false;
                }

                const installed = PrepareLibrary(value);

                if (this.#installGeneration !== generation)
                {
                    return false;
                }

                this.#library = installed;
                return true;
            });
        this.#loadOperations.set(path, operation);

        const clear = () =>
        {
            if (this.#loadOperations.get(path) === operation)
            {
                this.#loadOperations.delete(path);
            }
        };

        operation.then(clear, clear);
        return operation;
    }

    /** Adds one already-hydrated item to the installed editor library. */
    Add(documentName, record)
    {
        return this.#library.Add(documentName, record);
    }

    /** Returns one installed library document collection. */
    GetDocument(name)
    {
        return this.#library.GetDocument(name);
    }

    /** Returns one installed record by document name and named record identity. */
    Get(documentName, recordID)
    {
        return this.#library.Get(documentName, recordID);
    }

    /** Lists the installed combined-library document collections. */
    ListDocuments()
    {
        return this.#library.ListDocuments();
    }

    /** Returns whether the installed library contains one named record. */
    Has(documentName, recordID)
    {
        return this.#library.Has(documentName, recordID);
    }

    /** Rebuilds one or every installed private record index after editor mutation. */
    Reindex(documentName = null)
    {
        this.#library.Reindex(documentName);
        return this;
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

    if (value.schema !== "carbonenginejs.characterLibrary" || value.schemaVersion !== 6)
    {
        throw new TypeError("Character library must use carbonenginejs.characterLibrary schema version 6");
    }

    const installed = value instanceof CjsCharacterLibrary
        ? value
        : CjsCharacterLibrary.from(CjsCharacterLibrary.validateValues(value));

    installed.Reindex();
    return installed;
}

export default CjsCharacterLibraryManager;
