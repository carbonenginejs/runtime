// Source: resources/include/ResourceGroup.h
// Source: resources/src/ResourceGroup.cpp
import { ResourceGroupImpl } from "./ResourceGroupImpl.js";
import { StatusSettings } from "./StatusSettings.js";
import { StatusProgressType } from "./enums.js";
import { CjsSchema, meta } from "#schema";

/** Carbon resource-group facade, preserving its separately owned nested implementation. */
export class ResourceGroup
{
    static ResourceGroupImpl = ResourceGroupImpl;
    m_impl = null;

    /**
     * Native default and protected implementation constructors.
     *
     * @param {import('./ResourceGroupImpl.js').ResourceGroupImpl} [impl] Implementation instance owned by this facade.
     */
    constructor(impl = new ResourceGroupImpl())
    {
        this.m_impl = impl;
    }

    /**
     * Native merge facade; explicit finally replaces status-scope destruction.
     *
     * @param {import('./ResourceGroupMergeParams.js').ResourceGroupMergeParams} params Caller-owned operation parameters.
     * @returns {import('./Result.js').Result} Native success or failure result; output references may be mutated.
     */
    Merge(params)
    {
        return this._Invoke("Merge", params);
    }

    /**
     * Native diff facade; explicit finally replaces status-scope destruction.
     *
     * @param {import('./ResourceGroupDiffAgainstGroupParams.js').ResourceGroupDiffAgainstGroupParams} params Caller-owned operation parameters.
     * @returns {import('./Result.js').Result} Native success or failure result; output references may be mutated.
     */
    DiffAgainstGroup(params)
    {
        return this._Invoke("DiffChangesAsLists", params);
    }

    /**
     * Native removal facade; explicit finally replaces status-scope destruction.
     *
     * @param {import('./ResourceGroupRemoveResourcesParams.js').ResourceGroupRemoveResourcesParams} params Caller-owned operation parameters.
     * @returns {import('./Result.js').Result} Native success or failure result; output references may be mutated.
     */
    RemoveResources(params)
    {
        return this._Invoke("RemoveResources", params);
    }

    /**
     * What each Carbon facade method does inline (ResourceGroup.cpp:80-105): a
     * status scope with the caller's callback settings, a START update, the
     * implementation's operation, then the scope's end.
     *
     * @param {string} method Implementation method.
     * @param {object} params The operation's parameters, with its callbackSettings.
     * @returns {import('./Result.js').Result} The operation's result.
     */
    _Invoke(method, params)
    {
        const status = new StatusSettings();
        status.SetCallbackSettings(params.callbackSettings);
        status.Update(StatusProgressType.START, 0, 0, "Starting Process");
        try { return this.m_impl[method](params, status); }
        finally { status.Dispose(); }
    }

    /** `CreateBundle` - not ported: it needs chunking and compression. */
    CreateBundle()
    {
        throw new Error("ResourceGroup.CreateBundle is not implemented: it needs chunking and compression.");
    }

    /** `CreatePatch` - not ported: it needs binary diffing. */
    CreatePatch()
    {
        throw new Error("ResourceGroup.CreatePatch is not implemented: it needs binary diffing.");
    }

    /**
     * Native import facade, awaiting the caller's injected reader before ending progress.
     *
     * @param {import('./ResourceGroupImportFromFileParams.js').ResourceGroupImportFromFileParams} params Caller-owned operation parameters.
     * @returns {Promise<import('./Result.js').Result>} Native success or failure result; output references may be mutated.
     * @throws {TypeError} If the required reader or writer was not injected.
     */
    ImportFromFile(params)
    {
        return this._InvokeAsync("ImportFromFile", params);
    }

    /**
     * Native export facade, awaiting the caller's injected writer before ending progress.
     *
     * @param {import('./ResourceGroupExportToFileParams.js').ResourceGroupExportToFileParams} params Caller-owned operation parameters.
     * @returns {Promise<import('./Result.js').Result>} Native success or failure result; output references may be mutated.
     * @throws {TypeError} If the required reader or writer was not injected.
     */
    ExportToFile(params)
    {
        return this._InvokeAsync("ExportToFile", params);
    }

    /**
     * _Invoke for the asynchronous file operations: the scope ends after the
     * host's reader or writer settles.
     *
     * @param {string} method Implementation method.
     * @param {object} params The operation's parameters, with its callbackSettings.
     * @returns {Promise<import('./Result.js').Result>} The operation's result.
     */
    async _InvokeAsync(method, params)
    {
        const status = new StatusSettings();
        status.SetCallbackSettings(params.callbackSettings);
        status.Update(StatusProgressType.START, 0, 0, "Starting Process");
        try { return await this.m_impl[method](params, status); }
        finally { status.Dispose(); }
    }

    /** `CreateFromDirectory` - not ported: it needs a file system to walk and file hashing. */
    CreateFromDirectory()
    {
        throw new Error("ResourceGroup.CreateFromDirectory is not implemented: it needs a file system to walk and file hashing.");
    }

    /** `CreateFromFilter` - not ported: ResourceFilter is not ported. */
    static createFromFilter()
    {
        throw new Error("ResourceGroup.createFromFilter is not implemented: ResourceFilter is not ported.");
    }
}


CjsSchema.define(ResourceGroup, {
    className: "ResourceGroup",
    carbon: "ResourceGroup",
    family: "tools",
    fields: {},
    methods: {
        Merge: [ meta.blue.method, meta.implemented ],
        DiffAgainstGroup: [ meta.blue.method, meta.implemented ],
        RemoveResources: [ meta.blue.method, meta.implemented ],
        ImportFromFile: [ meta.blue.method, meta.adapted ],
        ExportToFile: [ meta.blue.method, meta.adapted ],
        _Invoke: [ meta.ours ],
        _InvokeAsync: [ meta.ours ],
        CreateBundle: [ meta.blue.method, meta.notImplemented ],
        CreatePatch: [ meta.blue.method, meta.notImplemented ],
        CreateFromDirectory: [ meta.blue.method, meta.notImplemented ],
        createFromFilter: [ meta.blue.method, meta.notImplemented ]
    }
});
