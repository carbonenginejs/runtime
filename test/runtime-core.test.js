import assert from "node:assert/strict";
import test from "node:test";
import CjsLibrary, { CjsLibrary as NamedCjsLibrary, CjsServiceKey } from "../src/index.js";

test("exports the JS-only CjsLibrary composition root", () =>
{
    assert.equal(CjsLibrary, NamedCjsLibrary);
    assert.equal(CjsServiceKey.RESOURCE_MANAGER, "resourceManager");
});

test("registers services without creating backend objects", () =>
{
    const resourceManager = { name: "resources" };
    const library = new CjsLibrary({ resourceManager });

    assert.equal(library.GetResourceManager(), resourceManager);
    assert.equal(library.GetService(CjsServiceKey.RESOURCE_MANAGER), resourceManager);
    assert.equal(library.HasService(CjsServiceKey.RESOURCE_MANAGER), true);
    assert.equal(library.IsInitialized(), false);

    const audioManager = {
        name: "audio",
        InstallLibrary() {},
    };

    library.SetAudioManager(audioManager).Initialize();

    assert.equal(library.IsInitialized(), true);
    assert.equal(
        library.GetService(CjsServiceKey.AUDIO_MANAGER).name,
        "audio",
    );
    assert.equal(library.GetAudioManager(), audioManager);
    library.Shutdown();
    assert.equal(library.IsInitialized(), false);
});

test("generic service registration keeps the resource and SOF facades synchronized", () =>
{
    const first = { GetResource: () => "first" };
    const second = { GetResource: () => "second" };
    const sof = {};
    const library = new CjsLibrary({ services: {
        [CjsServiceKey.RESOURCE_MANAGER]: first,
        [CjsServiceKey.SPACE_OBJECT_FACTORY]: sof
    } });

    assert.equal(library.GetResourceManager(), first);
    assert.equal(library.GetSpaceObjectFactory(), sof);
    assert.equal(library.GetResource("res:/one"), "first");

    library.SetService(CjsServiceKey.RESOURCE_MANAGER, second);
    assert.equal(library.GetResourceManager(), second);
    assert.equal(library.GetResource("res:/two"), "second");

    library.RemoveService(CjsServiceKey.RESOURCE_MANAGER);
    assert.equal(library.GetResourceManager(), null);
    assert.throws(() => library.GetResource("res:/three"), error => error.code === "CJS_LIBRARY_METHOD_MISSING");
});

test("Register forwards topic options unchanged to configured services", () =>
{
    const resManOptions = { formats: [ "format" ], resourceTypes: [ "resource" ] };
    const sofOptions = { dataPath: "res:/sof/data.black" };
    let receivedResMan = null;
    let receivedSof = null;
    const resourceManager = {
        Register(options)
        {
            receivedResMan = options;
            return this;
        }
    };
    const spaceObjectFactory = {
        Register(options)
        {
            receivedSof = options;
            return this;
        }
    };
    const library = new CjsLibrary({ resourceManager, spaceObjectFactory });

    assert.equal(library.Register({ resMan: resManOptions, sof: sofOptions }), library);
    assert.equal(receivedResMan, resManOptions);
    assert.equal(receivedSof, sofOptions);
    assert.equal(library.GetSpaceObjectFactory(), spaceObjectFactory);
    assert.equal(library.GetService(CjsServiceKey.SPACE_OBJECT_FACTORY), spaceObjectFactory);
});

test("resource facade delegates synchronous handles and promise-shaped fetches", async () =>
{
    const resource = {
        async Ready()
        {
            return this;
        }
    };
    const resourceManager = {
        GetResource(path, options)
        {
            assert.equal(path, "res:/ship.gr2");
            assert.equal(options.requirement, "geometry");
            return resource;
        },
        GetObject(path)
        {
            return Promise.resolve({ path });
        }
    };
    const library = new CjsLibrary({ resourceManager });

    assert.equal(library.GetResource("res:/ship.gr2", { requirement: "geometry" }), resource);
    assert.equal(await library.FetchResource("res:/ship.gr2", { requirement: "geometry" }), resource);
    assert.deepEqual(await library.FetchObject("res:/data.black"), { path: "res:/data.black" });
});

test("resource @output suffix forces a test outcome without changing the source path", async () =>
{
    const calls = [];
    const library = new CjsLibrary({
        resourceManager: {
            Fetch(path, options)
            {
                calls.push({ path, options });
                return Promise.resolve({ path, output: options.emit });
            }
        },
        behaviors: {
            geometry: {
                behavior: {
                    request: { requirement: "geometry", emit: "cmf" },
                    CanResolveResourceRequest: ({ path }) => path.endsWith(".gr2")
                },
                default: true
            }
        }
    });

    const cmfFromGr2 = await library.Fetch("res:/ship.gr2@cmf");
    const resInDefaultFormat = await library.Fetch("res:/ship.gr2");
    const resInForcedFormat = await library.Fetch("res:/ship.gr2@gr2");

    assert.deepEqual(cmfFromGr2, { path: "res:/ship.gr2", output: "cmf" });
    assert.deepEqual(resInDefaultFormat, { path: "res:/ship.gr2", output: "cmf" });
    assert.deepEqual(resInForcedFormat, { path: "res:/ship.gr2", output: "gr2" });
    assert.deepEqual(calls.map(call => call.path), [
        "res:/ship.gr2",
        "res:/ship.gr2",
        "res:/ship.gr2"
    ]);
    assert.deepEqual(calls.map(call => call.options), [
        { requirement: "geometry", emit: "cmf", variant: "cmf" },
        { requirement: "geometry", emit: "cmf" },
        { requirement: "geometry", emit: "gr2", variant: "gr2" }
    ]);
    assert.throws(
        () => library.ResolveResourceRequest("res:/ship.gr2@"),
        /resource @output must be/u
    );
});

test("Fetch routes DNA through the configured async SOF facade", async () =>
{
    const seen = [];
    const sof = {
        async LoadDataAsync(path)
        {
            seen.push([ "data", path ]);
            return true;
        },
        async BuildFromDNAAsync(dna, options)
        {
            seen.push([ "dna", dna, options ]);
            return { schema: "carbon.document", dna };
        }
    };
    const library = new CjsLibrary({ spaceObjectFactory: sof });

    assert.equal(await library.InitializeAsync({ dataPath: "res:/sof/data.black" }), library);
    assert.deepEqual(await library.Fetch("rifter:minmatar:minmatar"), {
        schema: "carbon.document",
        dna: "rifter:minmatar:minmatar"
    });
    assert.deepEqual(seen.map(entry => entry.slice(0, 2)), [
        [ "data", "res:/sof/data.black" ],
        [ "dna", "rifter:minmatar:minmatar" ]
    ]);
});

test("default resource behavior selects a presentation recipe before ResMan", () =>
{
    let received = null;
    const behavior = {
        request: {
            requirement: "image",
            emit: "object",
            formatOptions: { colorSpace: "srgb", quality: "normal" }
        },
        CanResolveResourceRequest({ path, capabilities })
        {
            return path.endsWith(".dds") && capabilities.dds === false;
        },
        ResolveResourceRequest({ path })
        {
            return { path: path.replace(/\.dds$/u, ".png") };
        }
    };
    const library = new CjsLibrary({
        resourceManager: {
            GetResource(path, options)
            {
                received = { path, options };
                return "resource";
            }
        },
        capabilities: { dds: false },
        resourceDefaults: {
            payload: "texture",
            formatOptions: { source: "default", quality: "low" }
        },
        behaviors: {
            fallback_texture: { behavior, default: true, priority: 10 }
        }
    });

    assert.equal(library.GetResource("res:/texture/albedo.dds", {
        emit: "json",
        formatOptions: { source: "request", mipmaps: true }
    }), "resource");
    assert.equal(received.path, "res:/texture/albedo.png");
    assert.deepEqual(received.options, {
        payload: "texture",
        requirement: "image",
        emit: "json",
        formatOptions: {
            source: "request",
            quality: "normal",
            colorSpace: "srgb",
            mipmaps: true
        }
    });
    assert.equal(Object.isFrozen(received.options), true);
    assert.equal(Object.isFrozen(received.options.formatOptions), true);
    assert.equal(library.GetResourceBehavior("fallback_texture"), behavior);
});

test("explicit behavior selection overrides defaults and false disables behavior", () =>
{
    const calls = [];
    const library = new CjsLibrary({ resourceManager: {
        GetObject(path, options)
        {
            calls.push({ path, options });
            return { path };
        }
    } });
    library
        .RegisterResourceBehavior("native", {
            request: { requirement: "native", emit: "native" },
            CanResolveResourceRequest: () => true
        }, { default: true, priority: 1 })
        .RegisterResourceBehavior("cmf", {
            request: { requirement: "geometry", emit: "object" }
        });

    library.GetObject("res:/model/ship.gr2", { behavior: "cmf", emit: "json" });
    library.GetObject("res:/model/ship.gr2", { behavior: false, requirement: "raw" });

    assert.deepEqual(calls, [
        {
            path: "res:/model/ship.gr2",
            options: { requirement: "geometry", emit: "json" }
        },
        { path: "res:/model/ship.gr2", options: { requirement: "raw" } }
    ]);
    assert.equal(Object.prototype.hasOwnProperty.call(calls[0].options, "behavior"), false);
});

test("resource behavior resolution fails closed", () =>
{
    const library = new CjsLibrary();
    library
        .RegisterResourceBehavior("one", { request: { emit: "one" } }, { default: true, priority: 5 })
        .RegisterResourceBehavior("two", { request: { emit: "two" } }, { default: true, priority: 5 });

    assert.throws(
        () => library.ResolveResourceRequest("res:/value.bin"),
        error => error.code === "CJS_LIBRARY_BEHAVIOR_AMBIGUOUS"
    );
    assert.throws(
        () => library.ResolveResourceRequest("res:/value.bin", { behavior: "missing" }),
        error => error.code === "CJS_LIBRARY_BEHAVIOR_UNKNOWN"
    );
    assert.throws(
        () => new CjsLibrary().RegisterResourceBehavior("bad", {}),
        /must provide request or ResolveResourceRequest/u
    );

    const asynchronous = new CjsLibrary();
    asynchronous.RegisterResourceBehavior("async", {
        async ResolveResourceRequest()
        {
            return { options: { emit: "json" } };
        }
    }, { default: true });
    assert.throws(
        () => asynchronous.ResolveResourceRequest("res:/value.bin"),
        error => error.code === "CJS_LIBRARY_BEHAVIOR_ASYNC"
    );
});

test("every resource facade resolves exactly once while DNA bypasses resource behavior", async () =>
{
    let matches = 0;
    const calls = [];
    const resourceManager = {
        GetResource: (path, options) => (calls.push([ "GetResource", path, options ]), {}),
        GetObject: (path, options) => (calls.push([ "GetObject", path, options ]), {}),
        FetchResource: (path, options) => (calls.push([ "FetchResource", path, options ]), Promise.resolve({})),
        FetchObject: (path, options) => (calls.push([ "FetchObject", path, options ]), Promise.resolve({})),
        Fetch: (path, options) => (calls.push([ "Fetch", path, options ]), Promise.resolve({}))
    };
    const library = new CjsLibrary({
        resourceManager,
        spaceObjectFactory: { BuildFromDNAAsync: async dna => ({ dna }) },
        behaviors: {
            default: {
                behavior: {
                    request: { emit: "json" },
                    CanResolveResourceRequest()
                    {
                        matches++;
                        return true;
                    }
                },
                default: true
            }
        }
    });

    library.GetResource("res:/a");
    library.GetObject("res:/b");
    await library.FetchResource("res:/c");
    await library.FetchObject("res:/d");
    await library.Fetch("res:/e");
    await library.Fetch("rifter:minmatar:minmatar");

    assert.equal(matches, 5);
    assert.deepEqual(calls.map(call => call.slice(0, 2)), [
        [ "GetResource", "res:/a" ],
        [ "GetObject", "res:/b" ],
        [ "FetchResource", "res:/c" ],
        [ "FetchObject", "res:/d" ],
        [ "Fetch", "res:/e" ]
    ]);
    assert.equal(calls.every(call => call[2].emit === "json"), true);
});

test("FetchResource fallback gives GetResource and Ready the same resolved request", async () =>
{
    let getOptions = null;
    let readyOptions = null;
    const resource = {
        async Ready(options)
        {
            readyOptions = options;
            return this;
        }
    };
    const library = new CjsLibrary({
        resourceManager: {
            GetResource(_path, options)
            {
                getOptions = options;
                return resource;
            }
        },
        resourceDefaults: { formatOptions: { source: "default" } },
        behaviors: {
            package: {
                behavior: {
                    request: {
                        requirement: "webgpu-package",
                        formatOptions: { format: "behavior" }
                    }
                },
                default: true
            }
        }
    });

    assert.equal(await library.FetchResource("res:/effect.cewgpu", {
        behavior: "package",
        formatOptions: { source: "caller" }
    }), resource);
    assert.equal(readyOptions, getOptions);
    assert.deepEqual(getOptions, {
        requirement: "webgpu-package",
        formatOptions: { source: "caller", format: "behavior" }
    });
    assert.equal(Object.prototype.hasOwnProperty.call(readyOptions, "behavior"), false);
});

test("Fetch fallback routes from behavior-resolved options without resolving twice", async () =>
{
    let matches = 0;
    const calls = [];
    const resource = { Ready: async () => resource };
    const library = new CjsLibrary({
        resourceManager: {
            GetResource(path, options)
            {
                calls.push(["resource", path, options]);
                return resource;
            },
            GetObject(path, options)
            {
                calls.push(["object", path, options]);
                return {};
            }
        },
        behaviors: {
            package: {
                behavior: {
                    request: { requirement: "webgpu-package" },
                    CanResolveResourceRequest()
                    {
                        matches++;
                        return true;
                    }
                },
                default: true
            }
        }
    });

    assert.equal(await library.Fetch("res:/effect.cewgpu"), resource);
    assert.equal(matches, 1);
    assert.deepEqual(calls.map(call => call[0]), ["resource"]);
    assert.equal(calls[0][2].requirement, "webgpu-package");
});

test("resource behavior keeps engine-owned methods out of ResMan options", () =>
{
    const BuildUniformData = () => "uniform-data";
    let received = null;
    const behavior = {
        request: { requirement: "webgpu-package" },
        BuildUniformData
    };
    const library = new CjsLibrary({
        resourceManager: {
            GetResource(path, options)
            {
                received = { path, options };
                return {};
            }
        },
        behaviors: { main: { behavior, default: true } }
    });

    const resolved = library.ResolveResourceRequest("res:/effect.cewgpu");
    library.GetResource("res:/effect.cewgpu");

    assert.equal(resolved.behavior, behavior);
    assert.equal(resolved.behavior.BuildUniformData, BuildUniformData);
    assert.deepEqual(received.options, { requirement: "webgpu-package" });
});

test("validates service keys and option shapes", () =>
{
    assert.throws(() => new CjsLibrary({ services: [] }), /services must be an object/u);
    assert.throws(() => new CjsLibrary().SetService("", {}), /service key must be a non-empty string/u);
    assert.throws(() => new CjsLibrary({ unknown: true }), /unknown option/u);
    assert.throws(() => new CjsLibrary().Register({ resMan: {} }), error => error.code === "CJS_LIBRARY_SERVICE_MISSING");
});

test("audio registration forwards one document and shutdown deactivates without disposal", () =>
{
    const calls = [];
    const audioManager = {
        InstallLibrary(document)
        {
            calls.push([ "install", document ]);
        },
        Disable()
        {
            calls.push([ "disable" ]);
        },
        Detach()
        {
            calls.push([ "detach" ]);
        },
        Dispose()
        {
            calls.push([ "dispose" ]);
        },
    };
    const document = {
        schema: "carbonenginejs.audioLibrary",
    };
    const library = new CjsLibrary({
        audioManager,
    }).Register({
        audio: document,
    }).Initialize();

    assert.equal(library.GetAudioManager(), audioManager);
    assert.deepEqual(calls, [
        [ "install", document ],
    ]);

    library.Shutdown();

    assert.deepEqual(calls, [
        [ "install", document ],
        [ "disable" ],
        [ "detach" ],
    ]);
});
