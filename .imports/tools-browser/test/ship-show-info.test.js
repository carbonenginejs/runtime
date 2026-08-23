import assert from "node:assert/strict";
import test from "node:test";

import {
    alignTimeSeconds,
    CjsESIShipShowInfoController as LegacyShipShowInfoController,
    CjsShipShowInfoController,
    CjsESIShipShowInfoMarketSource,
    CjsESIShipShowInfoMemorySource,
    CjsESIShipShowInfoSessionSource,
    CjsShipShowInfoToolsCoreSessionSource,
    CjsShipShowInfoToolsCoreSource,
    effectiveHitpoints,
    MarketEstimate,
    metersToAU,
    resistancePercent,
    shipShowInfoID
} from "@carbonenginejs/tools-browser/ship-show-info";
import { TnyShipShowInfoImageRenderer } from "@carbonenginejs/tools-browser/ship-show-info/ui";

test("Show Info sources retain provider identity while the controller remains provider-neutral", () =>
{
    assert.equal(CjsShipShowInfoController.name, "CjsShipShowInfoController");
    assert.equal(LegacyShipShowInfoController, CjsShipShowInfoController);
    assert.equal(CjsESIShipShowInfoMarketSource.name, "CjsESIShipShowInfoMarketSource");
    assert.equal(CjsESIShipShowInfoMemorySource.name, "CjsESIShipShowInfoMemorySource");
    assert.equal(CjsESIShipShowInfoSessionSource.name, "CjsESIShipShowInfoSessionSource");
    assert.equal(CjsShipShowInfoToolsCoreSessionSource.name, "CjsShipShowInfoToolsCoreSessionSource");
    assert.equal(CjsShipShowInfoToolsCoreSource.name, "CjsShipShowInfoToolsCoreSource");
});

test("Show Info model helpers remain presentation neutral", () =>
{
    assert.equal(shipShowInfoID(" 28661 "), 28661);
    assert.equal(shipShowInfoID("28661.5"), null);
    assert.equal(resistancePercent(0.2), 80);
    assert.equal(effectiveHitpoints(1000, [ 0.5, 0.5, 0.5, 0.5 ]), 2000);
    assert.ok(Math.abs(alignTimeSeconds(10000000, 0.5) - 6.931471805599453) < 0.000001);
    assert.ok(Math.abs(metersToAU(149597870700) - 1) < Number.EPSILON);
});

test("memory source returns independent mutable caller records", async () =>
{
    const source = new CjsESIShipShowInfoMemorySource({
        records: [ {
            ship: { typeID: 7001, name: "Synthetic Hull", dna: "hull:base:race" },
            overview: { description: "Synthetic public description" },
            variations: { variations: [ { typeID: 7002, name: "Synthetic Variation" } ] }
        } ]
    });
    const first = await source.FetchShip({ typeID: 7001 });
    const second = await source.FetchShip({ typeID: 7001 });

    first.name = "Changed";
    assert.equal(second.name, "Synthetic Hull");
    assert.equal(Object.isFrozen(first), false);
    assert.deepEqual(await source.FetchOverview({ typeID: 7001 }), {
        description: "Synthetic public description"
    });
    assert.equal(await source.FetchSkills({ typeID: 7001 }), null);
    await assert.rejects(
        source.FetchShip({ typeID: 9999 }),
        error => error?.statusCode === 404
    );
});

test("controller awaits asynchronous ship acquisition and renderer loading", async () =>
{
    const calls = [];
    let releaseShip;
    const shipSource = {
        FetchShip(request)
        {
            calls.push([ "source", request.typeID ]);

            return new Promise(resolve =>
            {
                releaseShip = () => resolve({
                    typeID: request.typeID,
                    name: "Synthetic Hull",
                    dna: "hull:base:race"
                });
            });
        }
    };
    const renderer = {
        async Mount(container)
        {
            calls.push([ "mount", container ]);
        },
        async FetchShip(request)
        {
            calls.push([ "renderer", request.dna, request.signal instanceof AbortSignal ]);
        },
        async Destroy()
        {
            calls.push([ "destroy" ]);
        }
    };
    const controller = new CjsShipShowInfoController({ shipSource, renderer });
    const container = { id: "surface" };

    await controller.Mount(container);
    const opening = controller.Open({ typeID: 7001, regionID: 90000001 });

    assert.equal(controller.status, "loading");
    releaseShip();
    assert.equal((await opening).name, "Synthetic Hull");
    assert.equal(controller.status, "ready");
    assert.deepEqual(calls.slice(0, 3), [
        [ "mount", container ],
        [ "source", 7001 ],
        [ "renderer", "hull:base:race", true ]
    ]);

    await controller.Destroy();
    assert.deepEqual(calls.at(-1), [ "destroy" ]);
});

test("controller lazily deduplicates panels and forwards renderer selections", async () =>
{
    const calls = [];
    let releaseOverview;
    const shipSource = {
        async FetchShip(request)
        {
            return { typeID: request.typeID, name: "Synthetic Hull", dna: "hull:base:race" };
        },
        FetchOverview(request)
        {
            calls.push([ "overview", request.typeID, request.ship.name ]);

            return new Promise(resolve =>
            {
                releaseOverview = () => resolve({ description: "Public overview" });
            });
        }
    };
    const renderer = {
        async SelectPanel(request)
        {
            calls.push([ "panel", request.panel ]);
        }
    };
    const controller = new CjsShipShowInfoController({ shipSource, renderer });

    await controller.Open({ typeID: 7001 });
    const first = controller.SelectPanel("overview");
    const second = controller.FetchPanel("overview");

    assert.equal(calls.filter(call => call[0] === "overview").length, 1);
    releaseOverview();
    assert.deepEqual(await first, { description: "Public overview" });
    assert.deepEqual(await second, { description: "Public overview" });
    assert.deepEqual(calls[0], [ "panel", "overview" ]);
    assert.deepEqual(controller.Snapshot().panels.overview, {
        description: "Public overview"
    });
    await controller.Destroy();
});

test("caller cancellation stops waiting without canceling a shared panel read", async () =>
{
    let releaseOverview;
    const source = {
        async FetchShip(request)
        {
            return { typeID: request.typeID, name: "Synthetic Hull" };
        },
        FetchOverview()
        {
            return new Promise(resolve =>
            {
                releaseOverview = () => resolve({ description: "Still useful" });
            });
        }
    };
    const controller = new CjsShipShowInfoController({ shipSource: source });
    const cancellation = new AbortController();

    await controller.Open({ typeID: 7001 });
    const canceled = controller.FetchPanel("overview", { signal: cancellation.signal });
    const shared = controller.FetchPanel("overview");

    cancellation.abort(new DOMException("View closed", "AbortError"));
    await assert.rejects(canceled, error => error?.name === "AbortError");
    releaseOverview();
    assert.deepEqual(await shared, { description: "Still useful" });
    await controller.Destroy();
});

test("newest ship request wins and variations reuse Open", async () =>
{
    const pending = [];
    const source = {
        FetchShip(request)
        {
            return new Promise((resolve, reject) =>
            {
                request.signal.addEventListener("abort", () =>
                {
                    reject(request.signal.reason ?? new DOMException("Superseded", "AbortError"));
                }, { once: true });
                pending.push({ request, resolve });
            });
        }
    };
    const controller = new CjsShipShowInfoController({ shipSource: source });
    const first = controller.Open({ typeID: 7001, regionID: 90000001 });
    const second = controller.Open({ typeID: 7002, regionID: 90000001 });

    assert.equal(pending[0].request.signal.aborted, true);
    pending[1].resolve({ typeID: 7002, name: "Second Hull", dna: "second:base:race" });
    await assert.rejects(first, error => error?.name === "AbortError");
    assert.equal((await second).typeID, 7002);

    const variation = controller.SelectVariation({ typeID: 7003 });

    assert.equal(pending[2].request.regionID, 90000001);
    pending[2].resolve({ typeID: 7003, name: "Variation", dna: "third:base:race" });
    assert.equal((await variation).typeID, 7003);
    await controller.Destroy();
});

test("skin selection remains renderer-owned and supports returning to the base hull", async () =>
{
    const calls = [];
    const source = {
        async FetchShip(request)
        {
            return { typeID: request.typeID, name: "Synthetic Hull", dna: "hull:base:race" };
        }
    };
    const renderer = {
        async FetchSkin(request)
        {
            calls.push(request.skin);
        }
    };
    const controller = new CjsShipShowInfoController({ shipSource: source, renderer });
    const skin = { materialSetID: 8001, name: "Synthetic Finish" };

    await controller.Open({ typeID: 7001 });
    await controller.SelectSkin(skin);
    await controller.SelectSkin(null);

    assert.deepEqual(calls, [ skin, null ]);
    assert.equal(controller.selectedSkin, null);
    await controller.Destroy();
});

test("market decorator enriches price without coupling it to the ship record", async () =>
{
    const receivers = [];
    const shipSource = {
        FetchShip: async function(request)
        {
            return { typeID: request.typeID, name: "Synthetic Hull" };
        },
        FetchOverview: async function()
        {
            receivers.push(this);

            return { description: "Public overview" };
        }
    };
    const source = new CjsESIShipShowInfoMarketSource({
        shipSource,
        market: {
            async GetMarket()
            {
                return {
                    orders: [
                        { side: "buy", price: 12 },
                        { side: "sell", price: 15 },
                        { side: "sell", price: 14 }
                    ],
                    history: [ { date: "2026-08-16", average: 13 } ]
                };
            }
        }
    });

    assert.deepEqual(await source.FetchPrice({ typeID: 7001, regionID: 90000001 }), {
        estimatedPrice: 14
    });
    assert.deepEqual(await source.FetchOverview({ typeID: 7001 }), {
        description: "Public overview"
    });
    assert.deepEqual(receivers, [ shipSource ]);
    assert.equal(MarketEstimate({
        orders: [ { side: "buy", price: 12 } ],
        history: [
            { date: "2026-08-15", average: 10 },
            { date: "2026-08-16", average: 11 }
        ]
    }), 11);
});

test("session decorator distinguishes anonymous, automatic, and reauthorization states", async () =>
{
    const publicRequests = [];
    const shipSource = {
        async FetchShip(request)
        {
            return { typeID: request.typeID, name: "Synthetic Hull" };
        },
        async FetchSkills(request)
        {
            publicRequests.push(request);

            return { requirements: [ { typeID: 3300, name: "Test Skill", level: 3 } ] };
        }
    };
    const anonymous = new CjsESIShipShowInfoSessionSource({
        shipSource,
        sessionSource: {
            async FetchViewer()
            {
                return { authenticated: false };
            }
        }
    });
    const anonymousSkills = await anonymous.FetchSkills({ typeID: 7001 });

    assert.equal(anonymousSkills.profileState.status, "anonymous");
    assert.equal(publicRequests.at(-1).characterID, null);
    assert.equal(publicRequests.at(-1).skillProfile, null);

    const authenticated = new CjsESIShipShowInfoSessionSource({
        shipSource,
        sessionSource: {
            async FetchViewer()
            {
                return { authenticated: true, characterId: 90000001, name: "Test Pilot" };
            },
            async FetchSkills()
            {
                return {
                    characterId: 90000001,
                    characterName: "Test Pilot",
                    totalSkillPoints: 1000,
                    skills: [ {
                        typeID: 3300,
                        activeSkillLevel: 4,
                        trainedSkillLevel: 4,
                        skillPoints: 500
                    } ]
                };
            }
        }
    });
    const automaticSkills = await authenticated.FetchSkills({ typeID: 7001 });

    assert.equal(automaticSkills.profileState.status, "available");
    assert.equal(publicRequests.at(-1).skillProfile.mode, "automatic");
    assert.equal(publicRequests.at(-1).skillProfile.skills[0].activeSkillLevel, 4);

    const reauthorization = new CjsESIShipShowInfoSessionSource({
        shipSource,
        sessionSource: {
            async FetchViewer()
            {
                return { authenticated: true, characterId: 90000001, name: "Test Pilot" };
            },
            async FetchSkills()
            {
                const error = new Error("Stored grant lacks the skills scope");

                error.statusCode = 403;
                error.scope = "esi-skills.read_skills.v1";
                throw error;
            },
            LoginURL()
            {
                return "https://auth.example.test/login";
            }
        }
    });
    const reauthorizationSkills = await reauthorization.FetchSkills({ typeID: 7001 });

    assert.equal(reauthorizationSkills.profileState.status, "reauthorization-required");
    assert.equal(reauthorizationSkills.profileState.scope, "esi-skills.read_skills.v1");
    assert.equal(reauthorizationSkills.profileState.actionURL, "https://auth.example.test/login");
});

test("session source retains the injected provider receiver", async () =>
{
    const receivers = [];
    const sessionSource = {
        FetchViewer: async function()
        {
            receivers.push(this);

            return { authenticated: false };
        }
    };
    const source = new CjsESIShipShowInfoSessionSource({
        shipSource: {
            FetchShip: async function(request)
            {
                return { typeID: request.typeID, name: "Synthetic Hull" };
            }
        },
        sessionSource
    });

    await source.FetchShip({ typeID: 7001 });
    assert.deepEqual(receivers, [ sessionSource ]);
});

test("session decoration preserves missing optional price enrichment", async () =>
{
    const source = new CjsESIShipShowInfoSessionSource({
        shipSource: {
            async FetchShip()
            {
                return { typeID: 7001, name: "No Market Hull" };
            }
        },
        sessionSource: {
            async FetchViewer()
            {
                return { authenticated: false };
            }
        }
    });

    assert.equal(await source.FetchPrice({ typeID: 7001, regionID: 10000002 }), null);
});

test("tools-core source pins one exact SDE facet and never reads inspection tables", async () =>
{
    const calls = [];
    const receivers = [];
    const fetchImpl = async function(url)
    {
        receivers.push(this);
        const path = String(url).replace("https://tools.example.test", "");

        calls.push(path);
        if (path === "/eve/latest/build")
        {
            return JsonResponse({ builds: { sde: 3466501, resources: 3466502 } });
        }
        if (path === "/eve/3466501/types/28661?lang=en")
        {
            return JsonResponse({
                typeID: 28661,
                categoryID: 6,
                name: { text: "Kronos", language: "en" },
                groupName: { text: "Marauder", language: "en" },
                manufacturers: [ 1000109 ],
                manufacturerNames: {
                    1000109: { text: "Duvolle Laboratories", language: "en" }
                },
                quote: { text: "Unparalleled innovation.", language: "en" },
                quoteAuthor: { text: "Joroutte Duvolle", language: "en" }
            });
        }
        if (path === "/eve/3466501/dna/resolve?typeID=28661")
        {
            return JsonResponse({ dna: "gb2_t2:duvolle:gallente" });
        }
        if (path === "/eve/3466501/types/28661/traits")
        {
            return JsonResponse({
                roleBonuses: [ { bonus: 100, unit: "%", text: { text: "large hybrid turret damage" } } ]
            });
        }
        if (path === "/eve/3466501/types/28661/variations")
        {
            return JsonResponse({
                parentTypeID: 641,
                variations: [
                    { typeID: 641, name: { text: "Megathron" }, categoryID: 6 },
                    { typeID: 28661, name: { text: "Kronos" } },
                    { typeID: 999, name: { text: "Not a ship" }, categoryID: 7 }
                ]
            });
        }
        return JsonResponse({ error: `Unexpected route ${path}` }, 404);
    };
    const source = new CjsShipShowInfoToolsCoreSource({
        baseURL: "https://tools.example.test",
        resourceBaseURL: "https://tools.example.test",
        fetchImpl
    });
    const ship = await source.FetchShip({ typeID: 28661, regionID: 10000002 });
    const overview = await source.FetchOverview({ typeID: 28661 });
    const variations = await source.FetchVariations({ typeID: 28661 });

    assert.equal(ship.name, "Kronos");
    assert.equal(ship.dna, "gb2_t2:duvolle:gallente");
    assert.equal(ship.manufacturers[0].name, "Duvolle Laboratories");
    assert.match(ship.faction?.backdropURL || "", /^$/u);
    assert.deepEqual(overview.quote, {
        text: "Unparalleled innovation.",
        author: "Joroutte Duvolle"
    });
    assert.deepEqual(variations.variations.map(item => item.typeID), [ 641, 28661 ]);
    assert.equal(calls.filter(path => path === "/eve/latest/build").length, 1);
    assert.equal(calls.some(path => path.includes("/sde/")), false);
    assert.equal(calls.some(path => path.includes("3466502")), false);
    assert.ok(receivers.every(receiver => receiver === globalThis));
});

test("tools-core session source binds injected fetch and exposes the stored grant only", async () =>
{
    const receivers = [];
    const fetchImpl = async function(url)
    {
        receivers.push(this);
        const path = String(url).replace("https://tools.example.test", "");

        if (path === "/v1/auth/esi/status")
        {
            return JsonResponse({ authenticated: true, characterId: 90000001, characterName: "Test Pilot" });
        }
        if (path === "/v1/auth/esi/skills")
        {
            return JsonResponse({
                characterId: 90000001,
                characterName: "Test Pilot",
                skills: [ { typeID: 3300, activeSkillLevel: 5, trainedSkillLevel: 5, skillPoints: 256000 } ]
            });
        }
        return JsonResponse({ error: "missing" }, 404);
    };
    const source = new CjsShipShowInfoToolsCoreSessionSource({
        baseURL: "https://tools.example.test",
        fetchImpl
    });

    assert.deepEqual(await source.FetchViewer(), {
        authenticated: true,
        characterID: 90000001,
        name: "Test Pilot",
        iconURL: "https://images.evetech.net/characters/90000001/portrait?size=128"
    });
    assert.equal((await source.FetchSkills()).skills[0].activeSkillLevel, 5);
    assert.equal(source.LoginURL(), "https://tools.example.test/v1/auth/esi/login");
    assert.ok(receivers.every(receiver => receiver === globalThis));
});

test("image fallback keeps the previous decoded preview until its replacement is ready", async () =>
{
    const children = [];
    const images = [];
    const container = {
        replaceChildren(...next)
        {
            children.splice(0, children.length, ...next);
        }
    };
    const renderer = new TnyShipShowInfoImageRenderer({
        imageFactory()
        {
            const image = FakeImage();

            images.push(image);
            return image;
        }
    });

    renderer.Mount(container);
    const first = renderer.FetchShip({ ship: { name: "First", renderURL: "first.png" } });

    images[0].Emit("load");
    await first;
    assert.equal(children[0], images[0]);

    const second = renderer.FetchShip({ ship: { name: "Second", renderURL: "second.png" } });

    assert.equal(children[0], images[0]);
    images[1].Emit("load");
    await second;
    assert.equal(children[0], images[1]);
    renderer.Destroy();
    assert.equal(children.length, 0);
});

function JsonResponse(body, status = 200)
{
    return {
        ok: status >= 200 && status < 300,
        status,
        async json()
        {
            return structuredClone(body);
        }
    };
}

function FakeImage()
{
    const listeners = new Map();

    return {
        complete: false,
        naturalWidth: 0,
        src: "",
        addEventListener(name, listener)
        {
            if (!listeners.has(name)) listeners.set(name, new Set());
            listeners.get(name).add(listener);
        },
        removeEventListener(name, listener)
        {
            listeners.get(name)?.delete(listener);
        },
        Emit(name)
        {
            this.complete = name === "load";
            this.naturalWidth = name === "load" ? 512 : 0;
            for (const listener of Array.from(listeners.get(name) || [])) listener();
        },
        async decode() {}
    };
}
