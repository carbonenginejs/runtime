import assert from "node:assert/strict";
import test from "node:test";

import {
    CjsDemoDataService as LegacyDemoDataService,
    CjsDemoHost as LegacyDemoHost,
    CjsDemoRenderer as LegacyDemoRenderer,
    TnyDemoDataService,
    TnyDemoHost,
    TnyDemoRenderer
} from "@carbonenginejs/runtime/tools/demos";
import {
    CjsShipShowInfoDemo as LegacyShipShowInfoDemo,
    TnyMarketDetailsDemo,
    TnyShipShowInfoDemo,
    TnyShipTreeDemo,
    CreateMarketDetailsDemoDefinition,
    CreateShipShowInfoDemoDefinition,
    CreateShipTreeDemoDefinition
} from "@carbonenginejs/runtime/tools/demo-apps";

test("Tny demo names are canonical while published 0.1.x aliases retain identity", () =>
{
    assert.equal(TnyDemoDataService.name, "TnyDemoDataService");
    assert.equal(TnyDemoHost.name, "TnyDemoHost");
    assert.equal(TnyDemoRenderer.name, "TnyDemoRenderer");
    assert.equal(TnyMarketDetailsDemo.name, "TnyMarketDetailsDemo");
    assert.equal(TnyShipShowInfoDemo.name, "TnyShipShowInfoDemo");
    assert.equal(TnyShipTreeDemo.name, "TnyShipTreeDemo");
    assert.equal(LegacyDemoDataService, TnyDemoDataService);
    assert.equal(LegacyDemoHost, TnyDemoHost);
    assert.equal(LegacyDemoRenderer, TnyDemoRenderer);
    assert.equal(LegacyShipShowInfoDemo, TnyShipShowInfoDemo);
});

test("Ship Tree uses the same explicit composition in catalogue and standalone form", () =>
{
    const context = { id: "catalogue-context" };
    const options = { source: { FetchTree() {} }, initialFactionID: 9001 };
    let receivedContext = null;
    const definition = CreateShipTreeDemoDefinition({
        CreateOptions(value)
        {
            receivedContext = value;

            return options;
        }
    });
    const catalogueDemo = definition.create({ context });
    const standaloneDemo = new TnyShipTreeDemo(options);

    assert.equal(receivedContext, context);
    assert.equal(definition.id, "ship-tree");
    assert.equal(catalogueDemo instanceof TnyShipTreeDemo, true);
    assert.equal(standaloneDemo instanceof TnyShipTreeDemo, true);
    assert.notEqual(catalogueDemo.options, options);
    assert.equal(catalogueDemo.options.source, options.source);
});

test("Market Details uses the same explicit composition in catalogue and standalone form", () =>
{
    const context = { id: "catalogue-context" };
    const options = { marketSource: {}, initialTypeID: 7001, initialRegionID: 90000001 };
    let receivedContext = null;
    const definition = CreateMarketDetailsDemoDefinition({
        CreateOptions(value)
        {
            receivedContext = value;

            return options;
        }
    });
    const catalogueDemo = definition.create({ context });
    const standaloneDemo = new TnyMarketDetailsDemo(options);

    assert.equal(receivedContext, context);
    assert.equal(definition.id, "market-details");
    assert.equal(catalogueDemo instanceof TnyMarketDetailsDemo, true);
    assert.equal(standaloneDemo instanceof TnyMarketDetailsDemo, true);
    assert.notEqual(catalogueDemo.options, options);
    assert.equal(catalogueDemo.options.marketSource, options.marketSource);
});

test("Ship Show Info uses the same explicit composition in catalogue and standalone form", () =>
{
    const context = { id: "catalogue-context" };
    const options = { shipSource: { FetchShip() {} }, initialTypeID: 7001 };
    let receivedContext = null;
    const definition = CreateShipShowInfoDemoDefinition({
        CreateOptions(value)
        {
            receivedContext = value;

            return options;
        }
    });
    const catalogueDemo = definition.create({ context });
    const standaloneDemo = new TnyShipShowInfoDemo(options);

    assert.equal(receivedContext, context);
    assert.equal(definition.id, "ship-show-info");
    assert.equal(catalogueDemo instanceof TnyShipShowInfoDemo, true);
    assert.equal(standaloneDemo instanceof TnyShipShowInfoDemo, true);
    assert.notEqual(catalogueDemo.options, options);
    assert.equal(catalogueDemo.options.shipSource, options.shipSource);
});

test("hosts independently constructible demos in one container", async () =>
{
    const events = [];
    const container = { id: "demo-root" };
    const context = { runtimes: {}, data: {} };

    function definition(id)
    {
        return {
            id,
            label: id.toUpperCase(),
            create(received)
            {
                assert.equal(received.context, context);

                return {
                    async Mount(target, options)
                    {
                        assert.equal(target, container);
                        assert.equal(options.context, context);
                        events.push(`${id}:mount`);
                    },
                    async Destroy()
                    {
                        events.push(`${id}:destroy`);
                    }
                };
            }
        };
    }

    const host = new TnyDemoHost({
        container,
        context,
        demos: [ definition("market"), definition("show-info") ]
    });

    assert.deepEqual(host.List(), [
        { id: "market", label: "MARKET", description: null },
        { id: "show-info", label: "SHOW-INFO", description: null }
    ]);

    await host.Open("market");
    assert.equal(host.activeID, "market");

    await host.Open("show-info");
    assert.equal(host.activeID, "show-info");
    assert.deepEqual(events, [ "market:mount", "market:destroy", "show-info:mount" ]);

    await host.Destroy();
    assert.equal(host.activeID, null);
    assert.deepEqual(events, [
        "market:mount",
        "market:destroy",
        "show-info:mount",
        "show-info:destroy"
    ]);
    assert.throws(() => host.Open("market"), /destroyed/u);
});

test("destroys a demo whose asynchronous mount fails", async () =>
{
    let destroyed = 0;
    const host = new TnyDemoHost({
        container: {},
        demos: [ {
            id: "broken",
            create: () => ({
                async Mount()
                {
                    throw new Error("mount failed");
                },
                async Destroy()
                {
                    destroyed++;
                }
            })
        } ]
    });

    await assert.rejects(host.Open("broken"), /mount failed/u);
    assert.equal(destroyed, 1);
    assert.equal(host.activeID, null);
    await host.Destroy();
});

test("an invalid selection leaves the active demo mounted", async () =>
{
    let activeSignal = null;
    const host = new TnyDemoHost({
        container: {},
        demos: [ {
            id: "known",
            create: () => ({
                async Mount(container, { signal })
                {
                    activeSignal = signal;
                },
                async Destroy() {}
            })
        } ]
    });

    await host.Open("known");
    assert.throws(() => host.Open("missing"), /Unknown demo/u);
    assert.equal(host.activeID, "known");
    assert.equal(activeSignal.aborted, false);
    await host.Destroy();
});

test("can cancel a queued demo before its factory runs", async () =>
{
    let created = 0;
    const host = new TnyDemoHost({
        container: {},
        demos: [ {
            id: "queued",
            create: () =>
            {
                created++;

                return {
                    async Mount() {},
                    async Destroy() {}
                };
            }
        } ]
    });
    const opening = host.Open("queued");
    const closing = host.Close();

    await assert.rejects(opening);
    await closing;
    assert.equal(created, 0);
    await host.Destroy();
});

test("aborts a mounting demo as soon as another demo is requested", async () =>
{
    const events = [];
    let mountingSignal = null;
    let markMountStarted;
    const mountStarted = new Promise(resolve =>
    {
        markMountStarted = resolve;
    });
    const host = new TnyDemoHost({
        container: {},
        demos: [
            {
                id: "slow",
                create: () => ({
                    Mount(container, { signal })
                    {
                        mountingSignal = signal;
                        markMountStarted();

                        return new Promise((resolve, reject) =>
                        {
                            signal.addEventListener("abort", () =>
                            {
                                const error = new Error("slow demo aborted");

                                error.name = "AbortError";
                                reject(error);
                            }, { once: true });
                        });
                    },
                    async Destroy()
                    {
                        events.push("slow:destroy");
                    }
                })
            },
            {
                id: "next",
                create: () => ({
                    async Mount()
                    {
                        events.push("next:mount");
                    },
                    async Destroy()
                    {
                        events.push("next:destroy");
                    }
                })
            }
        ]
    });

    const slow = host.Open("slow");

    await mountStarted;
    assert.equal(mountingSignal instanceof AbortSignal, true);

    const next = host.Open("next");

    assert.equal(mountingSignal.aborted, true);
    await assert.rejects(slow, error => error.name === "AbortError");
    await next;
    assert.deepEqual(events, [ "slow:destroy", "next:mount" ]);
    await host.Destroy();
});

test("coordinates rendering through an injected receiver-preserving adapter", async () =>
{
    class Adapter
    {

        calls = [];

        async Mount(container)
        {
            this.calls.push([ "mount", container ]);
        }

        async Load(request, { signal })
        {
            this.calls.push([ "load", request, signal ]);

            return { loaded: request.id };
        }

        async SetView(view)
        {
            this.calls.push([ "view", view ]);
        }

        async Unmount()
        {
            this.calls.push([ "unmount" ]);
        }

        async Destroy()
        {
            this.calls.push([ "destroy" ]);
        }

    }

    const adapter = new Adapter();
    const renderer = new TnyDemoRenderer({ adapter });
    const container = {};

    await renderer.Mount(container);
    assert.deepEqual(await renderer.Load({ id: "hull" }), { loaded: "hull" });
    await renderer.SetView("top");
    await renderer.Destroy();

    assert.equal(renderer.mounted, false);
    assert.deepEqual(adapter.calls.map(call => call[0]), [
        "mount",
        "load",
        "view",
        "unmount",
        "destroy"
    ]);
    assert.equal(adapter.calls[0][1], container);
    assert.equal(adapter.calls[1][2] instanceof AbortSignal, true);
});

test("suppresses a renderer load completed after a newer request", async () =>
{
    const pending = [];
    const adapter = {
        async Mount() {},
        Load(request, { signal })
        {
            return new Promise(resolve => pending.push({ request, signal, resolve }));
        },
        async Unmount() {},
        async Destroy() {}
    };
    const renderer = new TnyDemoRenderer({ adapter });

    await renderer.Mount({});

    const first = renderer.Load({ id: "first" });
    const second = renderer.Load({ id: "second" });

    assert.equal(pending[0].signal.aborted, true);
    pending[1].resolve("second-result");
    assert.equal(await second, "second-result");
    pending[0].resolve("first-result");
    await assert.rejects(first, error => error.name === "AbortError");
    await renderer.Destroy();
});

test("selects browser data providers by declared authority without hidden fallback", async () =>
{
    let fallbackReads = 0;
    const service = new TnyDemoDataService({
        providers: [
            {
                id: "manual",
                CanRead(request)
                {
                    return request.profile === "manual";
                },
                async Read()
                {
                    return {
                        status: "unavailable",
                        presence: "value",
                        value: { stale: true }
                    };
                }
            },
            {
                id: "bundled-json",
                async Read(request)
                {
                    fallbackReads++;

                    return {
                        status: "ready",
                        presence: "value",
                        value: request.record,
                        provenance: [ { kind: "bundled-json" } ]
                    };
                }
            }
        ]
    });

    const unavailable = await service.Read({ profile: "manual" });

    assert.equal(unavailable.status, "unavailable");
    assert.equal(unavailable.presence, "omitted");
    assert.equal(unavailable.providerID, "manual");
    assert.equal(fallbackReads, 0);

    const record = { typeID: 1, name: "Synthetic Hull" };
    const ready = await service.Read({ profile: "none", record });

    assert.equal(ready.status, "ready");
    assert.equal(ready.value, record);
    assert.equal(ready.providerID, "bundled-json");
    ready.viewState = "expanded";
    assert.equal(ready.viewState, "expanded", "result records remain mutable");
});

test("distinguishes unsupported, provider failure, and invalid provider answers", async () =>
{
    const unsupported = new TnyDemoDataService({
        providers: [ {
            id: "remote",
            CanRead: () => false,
            async Read() { throw new Error("must not run"); }
        } ]
    });

    assert.deepEqual(await unsupported.Read({}), {
        status: "unsupported",
        presence: "omitted",
        providerID: null,
        value: undefined,
        provenance: []
    });

    const failure = new TnyDemoDataService({
        providers: [ {
            id: "api",
            async Read() { throw new Error("offline"); }
        } ]
    });
    const failed = await failure.Read({});

    assert.equal(failed.status, "failed");
    assert.equal(failed.providerID, "api");
    assert.match(failed.error.message, /offline/u);

    const invalid = new TnyDemoDataService({
        providers: [ {
            id: "invalid",
            async Read() { return { status: "ready", presence: "value" }; }
        } ]
    });

    await assert.rejects(invalid.Read({}), /omitted its declared value/u);
});
