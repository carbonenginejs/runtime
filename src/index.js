/**
 * GPU-free CarbonEngineJS composition root.
 *
 * CjsLibrary owns service composition and resource-request policy. Resource
 * loading, decoding, device creation, and backend realization remain in the
 * supplied services.
 */

export const CjsServiceKey = Object.freeze({
    RESOURCE_MANAGER: "resourceManager",
    SPACE_OBJECT_FACTORY: "spaceObjectFactory",
    DEVICE: "device",
    AUDIO_SYSTEM: "audioSystem",
    INPUT_MANAGER: "inputManager"
});

const OPTION_KEYS = new Set([
    "services",
    "resourceManager",
    "spaceObjectFactory",
    "capabilities",
    "resourceDefaults",
    "behaviors"
]);

const REQUEST_SELECTOR_KEYS = Object.freeze([ "behavior", "resourceBehavior" ]);

export class CjsLibrary
{
    #services = new Map();
    #capabilities = new Map();
    #resourceBehaviors = new Map();
    #resourceDefaults = Object.freeze({});
    #behaviorOrder = 0;
    #resourceManager = null;
    #spaceObjectFactory = null;
    #initialized = false;

    constructor(options = {})
    {
        this.SetValues(options);
    }

    SetValues(options = {})
    {
        if (!options || typeof options !== "object" || Array.isArray(options))
        {
            throw new TypeError("CjsLibrary options must be an object.");
        }
        for (const key of Object.keys(options))
        {
            if (!OPTION_KEYS.has(key)) throw new TypeError(`CjsLibrary unknown option ${JSON.stringify(key)}.`);
        }
        if (Object.prototype.hasOwnProperty.call(options, "services"))
        {
            if (!options.services || typeof options.services !== "object" || Array.isArray(options.services))
            {
                throw new TypeError("CjsLibrary.services must be an object.");
            }
            for (const [ key, service ] of Object.entries(options.services)) this.SetService(key, service);
        }
        if (Object.prototype.hasOwnProperty.call(options, "resourceManager"))
        {
            this.SetResourceManager(options.resourceManager);
        }
        if (Object.prototype.hasOwnProperty.call(options, "spaceObjectFactory"))
        {
            this.SetSpaceObjectFactory(options.spaceObjectFactory);
        }
        if (Object.prototype.hasOwnProperty.call(options, "capabilities"))
        {
            this.RegisterCapabilities(options.capabilities);
        }
        if (Object.prototype.hasOwnProperty.call(options, "resourceDefaults"))
        {
            this.SetResourceDefaults(options.resourceDefaults);
        }
        if (Object.prototype.hasOwnProperty.call(options, "behaviors"))
        {
            RegisterBehaviorMap(this, options.behaviors);
        }
        return this;
    }

    /**
     * Add service configuration using the same class-method vocabulary as the
     * services being composed. Topic options are forwarded unchanged.
     */
    Register(options = {})
    {
        if (!options || typeof options !== "object" || Array.isArray(options))
        {
            throw new TypeError("CjsLibrary.Register options must be an object.");
        }

        const known = new Set([
            "services",
            "resourceManager",
            "spaceObjectFactory",
            "capabilities",
            "resourceDefaults",
            "behaviors",
            "resMan",
            "sof"
        ]);
        for (const key of Object.keys(options))
        {
            if (!known.has(key)) throw new TypeError(`CjsLibrary.Register unknown topic ${JSON.stringify(key)}.`);
        }

        if (Object.prototype.hasOwnProperty.call(options, "services"))
        {
            this.SetValues({ services: options.services });
        }
        if (Object.prototype.hasOwnProperty.call(options, "resourceManager"))
        {
            this.SetResourceManager(options.resourceManager);
        }
        if (Object.prototype.hasOwnProperty.call(options, "spaceObjectFactory"))
        {
            this.SetSpaceObjectFactory(options.spaceObjectFactory);
        }
        if (Object.prototype.hasOwnProperty.call(options, "capabilities"))
        {
            this.RegisterCapabilities(options.capabilities);
        }
        if (Object.prototype.hasOwnProperty.call(options, "resourceDefaults"))
        {
            this.SetResourceDefaults(options.resourceDefaults);
        }
        if (Object.prototype.hasOwnProperty.call(options, "behaviors"))
        {
            RegisterBehaviorMap(this, options.behaviors);
        }
        if (Object.prototype.hasOwnProperty.call(options, "resMan"))
        {
            ForwardRegistration(this.#resourceManager, "resMan", options.resMan);
        }
        if (Object.prototype.hasOwnProperty.call(options, "sof"))
        {
            ForwardRegistration(this.#spaceObjectFactory, "sof", options.sof);
        }
        return this;
    }

    GetValues()
    {
        return {
            initialized: this.#initialized,
            resourceManager: this.#resourceManager,
            spaceObjectFactory: this.#spaceObjectFactory,
            services: Object.fromEntries(this.#services),
            capabilities: this.GetCapabilities(),
            resourceDefaults: this.GetResourceDefaults(),
            resourceBehaviors: this.GetResourceBehaviors()
        };
    }

    Initialize(options = {})
    {
        this.SetValues(options);
        this.#initialized = true;
        return this;
    }

    async InitializeAsync(options = {})
    {
        const { dataPath, ...libraryOptions } = options || {};
        this.Initialize(libraryOptions);
        if (dataPath !== undefined)
        {
            const sof = this.#spaceObjectFactory;
            if (!sof || typeof sof.LoadDataAsync !== "function")
            {
                const error = new Error("CjsLibrary cannot load SOF data without an async space object factory.");
                error.code = "CJS_LIBRARY_SOF_MISSING";
                throw error;
            }
            await sof.LoadDataAsync(dataPath);
        }
        return this;
    }

    Shutdown()
    {
        this.#initialized = false;
        return this;
    }

    SetService(key, service)
    {
        const name = normalizeServiceKey(key);
        if (service === null || service === undefined)
        {
            this.#services.delete(name);
            if (name === CjsServiceKey.RESOURCE_MANAGER) this.#resourceManager = null;
            if (name === CjsServiceKey.SPACE_OBJECT_FACTORY) this.#spaceObjectFactory = null;
        }
        else
        {
            this.#services.set(name, service);
            if (name === CjsServiceKey.RESOURCE_MANAGER) this.#resourceManager = service;
            if (name === CjsServiceKey.SPACE_OBJECT_FACTORY) this.#spaceObjectFactory = service;
        }
        return this;
    }

    GetService(key)
    {
        return this.#services.get(normalizeServiceKey(key)) ?? null;
    }

    HasService(key)
    {
        return this.#services.has(normalizeServiceKey(key));
    }

    RemoveService(key)
    {
        this.SetService(key, null);
        return this;
    }

    SetResourceManager(resourceManager)
    {
        return this.SetService(CjsServiceKey.RESOURCE_MANAGER, resourceManager);
    }

    GetResourceManager()
    {
        return this.#resourceManager;
    }

    SetSpaceObjectFactory(spaceObjectFactory)
    {
        return this.SetService(CjsServiceKey.SPACE_OBJECT_FACTORY, spaceObjectFactory);
    }

    GetSpaceObjectFactory()
    {
        return this.#spaceObjectFactory;
    }

    /** Merge an already-probed synchronous capability report. */
    RegisterCapabilities(capabilities = {})
    {
        assertPlainObject(capabilities, "CjsLibrary capabilities");
        for (const [ key, value ] of Object.entries(capabilities)) this.SetCapability(key, value);
        return this;
    }

    SetCapability(key, value)
    {
        const name = normalizeCapabilityKey(key);
        if (value === undefined) this.#capabilities.delete(name);
        else this.#capabilities.set(name, value);
        return this;
    }

    GetCapability(key)
    {
        return this.#capabilities.get(normalizeCapabilityKey(key));
    }

    HasCapability(key)
    {
        return this.#capabilities.has(normalizeCapabilityKey(key));
    }

    RemoveCapability(key)
    {
        this.#capabilities.delete(normalizeCapabilityKey(key));
        return this;
    }

    GetCapabilities()
    {
        return Object.freeze(Object.fromEntries(this.#capabilities));
    }

    SetResourceDefaults(options = {})
    {
        assertPlainObject(options, "CjsLibrary resource defaults");
        this.#resourceDefaults = freezeRequestOptions(stripRequestSelectors(options));
        return this;
    }

    GetResourceDefaults()
    {
        return this.#resourceDefaults;
    }

    /** Register a structural request policy without importing its owner. */
    RegisterResourceBehavior(name, behavior, options = {})
    {
        const behaviorName = normalizeBehaviorName(name);
        assertPlainObject(behavior, `CjsLibrary resource behavior ${JSON.stringify(behaviorName)}`);
        assertPlainObject(options, "CjsLibrary resource behavior registration options");
        for (const key of Object.keys(options))
        {
            if (key !== "default" && key !== "priority")
            {
                throw new TypeError(`CjsLibrary resource behavior unknown registration option ${JSON.stringify(key)}.`);
            }
        }
        if (Object.prototype.hasOwnProperty.call(behavior, "request"))
        {
            assertPlainObject(behavior.request, `CjsLibrary resource behavior ${JSON.stringify(behaviorName)} request`);
        }
        if (behavior.CanResolveResourceRequest !== undefined && typeof behavior.CanResolveResourceRequest !== "function")
        {
            throw new TypeError(`CjsLibrary resource behavior ${JSON.stringify(behaviorName)} CanResolveResourceRequest must be a function.`);
        }
        if (behavior.ResolveResourceRequest !== undefined && typeof behavior.ResolveResourceRequest !== "function")
        {
            throw new TypeError(`CjsLibrary resource behavior ${JSON.stringify(behaviorName)} ResolveResourceRequest must be a function.`);
        }
        if (behavior.request === undefined && behavior.ResolveResourceRequest === undefined)
        {
            throw new TypeError(`CjsLibrary resource behavior ${JSON.stringify(behaviorName)} must provide request or ResolveResourceRequest.`);
        }

        const isDefault = options.default ?? false;
        const priority = options.priority ?? 0;
        if (typeof isDefault !== "boolean") throw new TypeError("CjsLibrary resource behavior default must be boolean.");
        if (!Number.isSafeInteger(priority)) throw new TypeError("CjsLibrary resource behavior priority must be a safe integer.");

        this.#resourceBehaviors.set(behaviorName, Object.freeze({
            name: behaviorName,
            behavior,
            default: isDefault,
            priority,
            order: this.#behaviorOrder++
        }));
        return this;
    }

    GetResourceBehavior(name)
    {
        return this.#resourceBehaviors.get(normalizeBehaviorName(name))?.behavior ?? null;
    }

    HasResourceBehavior(name)
    {
        return this.#resourceBehaviors.has(normalizeBehaviorName(name));
    }

    RemoveResourceBehavior(name)
    {
        this.#resourceBehaviors.delete(normalizeBehaviorName(name));
        return this;
    }

    GetResourceBehaviors()
    {
        return Object.freeze(Object.fromEntries(
            Array.from(this.#resourceBehaviors, ([ name, record ]) => [ name, record.behavior ])
        ));
    }

    /**
     * Resolve one final ResMan source path and promised-output request.
     *
     * A terminal `@output` suffix is removed before behavior matching and is
     * applied last as both `variant` and `emit`. This makes the source path and
     * its requested result explicit without teaching ResMan about specifier
     * syntax.
     */
    ResolveResourceRequest(path, options = {})
    {
        if (typeof path !== "string" || path.trim() === "")
        {
            throw new TypeError("CjsLibrary resource path must be a non-empty string.");
        }
        assertPlainObject(options, "CjsLibrary resource request options");

        const specifier = parseResourceSpecifier(path);
        const requestedOptions = freezeRequestOptions(options);
        const selector = getBehaviorSelector(options);
        const callerOptions = stripRequestSelectors(options);
        let selected = null;

        const baseContext = Object.freeze({
            path: specifier.path,
            options: requestedOptions,
            capabilities: this.GetCapabilities(),
            services: Object.freeze(Object.fromEntries(this.#services)),
            library: this
        });

        if (selector !== false)
        {
            if (selector !== undefined)
            {
                selected = this.#resourceBehaviors.get(normalizeBehaviorName(selector)) ?? null;
                if (!selected)
                {
                    const error = new Error(`CjsLibrary resource behavior ${JSON.stringify(selector)} is not registered.`);
                    error.code = "CJS_LIBRARY_BEHAVIOR_UNKNOWN";
                    error.behavior = selector;
                    throw error;
                }
            }
            else
            {
                const candidates = [];
                for (const record of this.#resourceBehaviors.values())
                {
                    if (!record.default) continue;
                    const matcher = record.behavior.CanResolveResourceRequest;
                    const matches = matcher ? assertSynchronousResult(
                        matcher(Object.freeze({ ...baseContext, behaviorName: record.name })),
                        record.name,
                        "CanResolveResourceRequest"
                    ) : true;
                    if (typeof matches !== "boolean")
                    {
                        throw new TypeError(`CjsLibrary resource behavior ${JSON.stringify(record.name)} CanResolveResourceRequest must return boolean.`);
                    }
                    if (matches) candidates.push(record);
                }
                candidates.sort((a, b) => b.priority - a.priority || a.order - b.order);
                if (candidates.length > 1 && candidates[0].priority === candidates[1].priority)
                {
                    const error = new Error(`CjsLibrary resource behavior is ambiguous at priority ${candidates[0].priority}.`);
                    error.code = "CJS_LIBRARY_BEHAVIOR_AMBIGUOUS";
                    error.behaviors = candidates
                        .filter(record => record.priority === candidates[0].priority)
                        .map(record => record.name);
                    throw error;
                }
                selected = candidates[0] ?? null;
            }
        }

        let resolvedPath = specifier.path;
        let resolvedOutput = specifier.output;
        let behaviorOptions = {};
        if (selected)
        {
            if (selected.behavior.request !== undefined)
            {
                behaviorOptions = stripRequestSelectors(selected.behavior.request);
            }
            const resolver = selected.behavior.ResolveResourceRequest;
            if (resolver)
            {
                const result = assertSynchronousResult(
                    resolver(Object.freeze({ ...baseContext, behaviorName: selected.name })),
                    selected.name,
                    "ResolveResourceRequest"
                );
                if (result !== undefined)
                {
                    assertPlainObject(result, `CjsLibrary resource behavior ${JSON.stringify(selected.name)} result`);
                    for (const key of Object.keys(result))
                    {
                        if (key !== "path" && key !== "options")
                        {
                            throw new TypeError(`CjsLibrary resource behavior ${JSON.stringify(selected.name)} returned unknown key ${JSON.stringify(key)}.`);
                        }
                    }
                    if (result.path !== undefined)
                    {
                        if (typeof result.path !== "string" || result.path.trim() === "")
                        {
                            throw new TypeError(`CjsLibrary resource behavior ${JSON.stringify(selected.name)} path must be a non-empty string.`);
                        }
                        const resolvedSpecifier = parseResourceSpecifier(result.path);
                        resolvedPath = resolvedSpecifier.path;
                        if (resolvedOutput === null) resolvedOutput = resolvedSpecifier.output;
                    }
                    if (result.options !== undefined)
                    {
                        assertPlainObject(result.options, `CjsLibrary resource behavior ${JSON.stringify(selected.name)} result options`);
                        behaviorOptions = mergeRequestOptions(behaviorOptions, stripRequestSelectors(result.options));
                    }
                }
            }
        }

        const outputOptions = resolvedOutput === null
            ? null
            : { variant: resolvedOutput, emit: resolvedOutput };
        const resolvedOptions = freezeRequestOptions(mergeRequestOptions(
            this.#resourceDefaults,
            behaviorOptions,
            callerOptions,
            outputOptions
        ));
        return Object.freeze({
            sourcePath: specifier.path,
            path: resolvedPath,
            options: resolvedOptions,
            behaviorName: selected?.name ?? null,
            behavior: selected?.behavior ?? null
        });
    }

    GetResource(path, options = {})
    {
        const request = this.ResolveResourceRequest(path, options);
        return ForwardCall(this.#resourceManager, "GetResource", request.path, request.options);
    }

    GetObject(path, options = {})
    {
        const request = this.ResolveResourceRequest(path, options);
        return ForwardCall(this.#resourceManager, "GetObject", request.path, request.options);
    }

    FetchResource(path, options = {})
    {
        const request = this.ResolveResourceRequest(path, options);
        return FetchResolvedResource(this.#resourceManager, request);
    }

    FetchObject(path, options = {})
    {
        const request = this.ResolveResourceRequest(path, options);
        return FetchResolvedObject(this.#resourceManager, request);
    }

    FetchDNA(dna, options = {})
    {
        const sof = this.#spaceObjectFactory;
        if (!sof)
        {
            const error = new Error("CjsLibrary cannot build DNA without a configured space object factory.");
            error.code = "CJS_LIBRARY_SOF_MISSING";
            throw error;
        }
        if (typeof sof.BuildFromDNAAsync === "function")
        {
            return sof.BuildFromDNAAsync(dna, options);
        }
        if (typeof sof.BuildFromDNA === "function")
        {
            return Promise.resolve(sof.BuildFromDNA(dna, options));
        }
        return ForwardCall(sof, "BuildFromDNAAsync", dna, options);
    }

    Fetch(value, options = {})
    {
        if (options.kind === "dna" || IsDNAString(value)) return this.FetchDNA(value, options);
        const request = this.ResolveResourceRequest(value, options);
        if (this.#resourceManager && typeof this.#resourceManager.Fetch === "function")
        {
            return this.#resourceManager.Fetch(request.path, request.options);
        }
        return request.options.resource === true
            || request.options.requirement !== undefined
            || request.options.payload !== undefined
            ? FetchResolvedResource(this.#resourceManager, request)
            : FetchResolvedObject(this.#resourceManager, request);
    }

    IsInitialized()
    {
        return this.#initialized;
    }
}

function normalizeServiceKey(key)
{
    if (typeof key !== "string" || key.trim() === "")
    {
        throw new TypeError("CjsLibrary service key must be a non-empty string.");
    }
    return key;
}

function normalizeCapabilityKey(key)
{
    if (typeof key !== "string" || key.trim() === "")
    {
        throw new TypeError("CjsLibrary capability key must be a non-empty string.");
    }
    return key;
}

function normalizeBehaviorName(name)
{
    if (typeof name !== "string" || name.trim() === "")
    {
        throw new TypeError("CjsLibrary resource behavior name must be a non-empty string.");
    }
    return name;
}

/**
 * Split one CjsLibrary resource specifier into its source path and optional
 * promised output suffix.
 *
 * The final `@tag` is reserved for output selection. Tags are normalized to
 * lowercase and intentionally exclude path/query delimiters; source services
 * therefore never see the suffix as part of the filename or extension.
 *
 * @param {string} value Non-empty resource specifier.
 * @returns {Readonly<{path: string, output: string|null}>} Source path and explicit output.
 * @throws {TypeError} If a present output suffix is malformed.
 */
function parseResourceSpecifier(value)
{
    const separator = value.lastIndexOf("@");
    if (separator <= value.lastIndexOf("/"))
    {
        return Object.freeze({ path: value, output: null });
    }

    const path = value.slice(0, separator);
    const output = value.slice(separator + 1).trim().toLowerCase();
    if (!path || !/^[a-z0-9][a-z0-9._-]*$/u.test(output))
    {
        throw new TypeError("CjsLibrary resource @output must be a non-empty alphanumeric tag.");
    }
    return Object.freeze({ path, output });
}

function assertPlainObject(value, label)
{
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(`${label} must be an object.`);
    }
    return value;
}

function getBehaviorSelector(options)
{
    const hasBehavior = Object.prototype.hasOwnProperty.call(options, "behavior");
    const hasResourceBehavior = Object.prototype.hasOwnProperty.call(options, "resourceBehavior");
    if (hasBehavior && hasResourceBehavior && options.behavior !== options.resourceBehavior)
    {
        throw new TypeError("CjsLibrary resource request behavior selectors conflict.");
    }
    const selector = hasBehavior ? options.behavior : options.resourceBehavior;
    if (selector !== undefined && selector !== false && (typeof selector !== "string" || selector.trim() === ""))
    {
        throw new TypeError("CjsLibrary resource request behavior must be a non-empty string or false.");
    }
    return selector;
}

function stripRequestSelectors(options)
{
    const result = { ...options };
    for (const key of REQUEST_SELECTOR_KEYS) delete result[key];
    if (Object.prototype.hasOwnProperty.call(result, "formatOptions") && result.formatOptions !== undefined)
    {
        assertPlainObject(result.formatOptions, "CjsLibrary resource request formatOptions");
        result.formatOptions = { ...result.formatOptions };
    }
    return result;
}

function mergeRequestOptions(...sources)
{
    const result = {};
    let formatOptions = null;
    for (const source of sources)
    {
        if (!source) continue;
        for (const [ key, value ] of Object.entries(source))
        {
            if (key === "formatOptions")
            {
                if (value === undefined)
                {
                    formatOptions = null;
                    delete result.formatOptions;
                    continue;
                }
                assertPlainObject(value, "CjsLibrary resource request formatOptions");
                formatOptions = { ...(formatOptions ?? {}), ...value };
                result.formatOptions = formatOptions;
            }
            else if (!REQUEST_SELECTOR_KEYS.includes(key))
            {
                result[key] = value;
            }
        }
    }
    return result;
}

function freezeRequestOptions(options)
{
    const result = stripRequestSelectors(options);
    if (result.formatOptions) Object.freeze(result.formatOptions);
    return Object.freeze(result);
}

function assertSynchronousResult(result, behaviorName, method)
{
    if (result && typeof result.then === "function")
    {
        const error = new Error(`CjsLibrary resource behavior ${JSON.stringify(behaviorName)} ${method} must be synchronous.`);
        error.code = "CJS_LIBRARY_BEHAVIOR_ASYNC";
        error.behavior = behaviorName;
        error.method = method;
        throw error;
    }
    return result;
}

function RegisterBehaviorMap(library, behaviors)
{
    assertPlainObject(behaviors, "CjsLibrary behaviors");
    for (const [ name, definition ] of Object.entries(behaviors))
    {
        if (
            definition &&
            typeof definition === "object" &&
            !Array.isArray(definition) &&
            Object.prototype.hasOwnProperty.call(definition, "behavior")
        )
        {
            library.RegisterResourceBehavior(name, definition.behavior, {
                default: definition.default ?? false,
                priority: definition.priority ?? 0
            });
        }
        else
        {
            library.RegisterResourceBehavior(name, definition);
        }
    }
}

function ForwardRegistration(service, topic, options)
{
    if (!service || typeof service.Register !== "function")
    {
        const error = new Error(`CjsLibrary cannot register ${topic} options without a configured service.`);
        error.code = "CJS_LIBRARY_SERVICE_MISSING";
        error.topic = topic;
        throw error;
    }
    service.Register(options);
}

function ForwardCall(service, method, ...args)
{
    if (!service || typeof service[method] !== "function")
    {
        const error = new Error(`CjsLibrary resource manager does not implement ${method}.`);
        error.code = "CJS_LIBRARY_METHOD_MISSING";
        error.method = method;
        throw error;
    }
    return service[method](...args);
}

function FetchResolvedResource(resourceManager, request)
{
    if (resourceManager && typeof resourceManager.FetchResource === "function")
    {
        return resourceManager.FetchResource(request.path, request.options);
    }
    const resource = ForwardCall(resourceManager, "GetResource", request.path, request.options);
    return resource && typeof resource.Ready === "function"
        ? resource.Ready(request.options).then(() => resource)
        : Promise.resolve(resource);
}

function FetchResolvedObject(resourceManager, request)
{
    if (resourceManager && typeof resourceManager.FetchObject === "function")
    {
        return resourceManager.FetchObject(request.path, request.options);
    }
    return Promise.resolve(ForwardCall(resourceManager, "GetObject", request.path, request.options));
}

function IsDNAString(value)
{
    if (typeof value !== "string" || value.includes(":/")) return false;
    return value.split(":").length >= 3;
}

export default CjsLibrary;
