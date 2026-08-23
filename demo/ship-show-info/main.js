import { TnyShipShowInfoDemo } from "../../src/tools/demo-apps/index.js";
import {
    CjsESIShipShowInfoMemorySource,
    CjsESIShipShowInfoSessionSource,
    CjsShipShowInfoToolsCoreSessionSource,
    CjsShipShowInfoToolsCoreSource,
    SHIP_SHOW_INFO_PANELS,
    shipShowInfoID
} from "../../src/tools/ship-show-info/index.js";
import { TnyShipShowInfoImageRenderer } from "../../src/tools/ship-show-info/ui/index.js";

const parameters = new URLSearchParams(location.search);
const mode = parameters.get("mode") === "synthetic" ? "synthetic" : "live";
const localToolsCoreURL = `${location.protocol}//${location.hostname}:5510`;
const toolsCoreURL = String(parameters.get("toolsCoreURL")
    || ([ "localhost", "127.0.0.1" ].includes(location.hostname) ? localToolsCoreURL : ""))
    .replace(/\/+$/u, "");
if (mode === "live" && toolsCoreURL) await InstallEveFonts(toolsCoreURL);
const typeID = shipShowInfoID(parameters.get("typeID")) || (mode === "live" ? 28661 : 7001);
const regionID = shipShowInfoID(parameters.get("regionID")) || 10000002;
const resourceRoot = parameters.get("resourceRoot")
    || `${toolsCoreURL}/eve/latest/resources/ui/texture/`;
const source = mode === "synthetic" ? SyntheticSource() : LiveSource(toolsCoreURL);
const demo = new TnyShipShowInfoDemo({
    shipSource: source,
    renderer: new TnyShipShowInfoImageRenderer(),
    initialTypeID: typeID,
    initialRegionID: regionID,
    uiResourceRoot: resourceRoot
});
const root = document.querySelector("#demo-root");
let showInfoWindow = null;
let synchronizingAddress = true;
let addressGeneration = 0;

root.addEventListener("shipshowinfochange", event =>
{
    if (synchronizingAddress) return;

    const current = AddressRequest();
    const detail = event.detail || {};

    if (current.typeID === detail.typeID && current.regionID === detail.regionID) return;
    WriteAddress("push", {
        typeID: detail.typeID,
        regionID: detail.regionID,
        panel: "overview"
    });
});

root.addEventListener("shipshowinfopanelchange", event =>
{
    if (synchronizingAddress) return;

    const current = AddressRequest();
    const detail = event.detail || {};

    // Open() renders Overview before announcing a new hull. Do not let that
    // internal panel transition overwrite the previous hull's history entry.
    if (current.typeID !== detail.typeID || current.regionID !== detail.regionID) return;
    WriteAddress("replace", detail);
});

globalThis.addEventListener("popstate", () =>
{
    RestoreAddress().catch(error => console.error(error));
});

try
{
    showInfoWindow = await demo.Mount(root);
    const panel = parameters.get("panel");

    if (SHIP_SHOW_INFO_PANELS.includes(panel) && panel !== "overview")
    {
        await showInfoWindow.SelectPanel(panel);
    }
    synchronizingAddress = false;
    WriteAddress("replace", {
        typeID: showInfoWindow.typeID,
        regionID: showInfoWindow.regionID,
        panel: SHIP_SHOW_INFO_PANELS.includes(panel) ? panel : "overview"
    });
    globalThis.shipShowInfoDemo = demo;
    globalThis.shipShowInfoSource = source;
}
catch (error)
{
    const message = document.createElement("section");

    message.className = "ship-show-info-demo-error";
    message.innerHTML = `<h1>Ship preview unavailable</h1>
        <p></p>
        <p>Start tools-core on port 5510, pass <code>?toolsCoreURL=http://host:port</code>,
        or use <a href="?mode=synthetic">synthetic mode</a>.</p>`;
    message.querySelector("p").textContent = error?.message || String(error);
    root.replaceChildren(message);
    console.error(error);
}

async function RestoreAddress()
{
    if (!showInfoWindow) return;

    const generation = ++addressGeneration;
    const request = AddressRequest();

    synchronizingAddress = true;

    try
    {
        if (showInfoWindow.typeID !== request.typeID || showInfoWindow.regionID !== request.regionID)
        {
            await showInfoWindow.Open(request);
        }
        if (generation !== addressGeneration) return;
        await showInfoWindow.SelectPanel(request.panel);
    }
    finally
    {
        if (generation === addressGeneration) synchronizingAddress = false;
    }
}

function AddressRequest()
{
    const query = new URLSearchParams(location.search);
    const panel = query.get("panel");

    return {
        typeID: shipShowInfoID(query.get("typeID")) || (mode === "live" ? 28661 : 7001),
        regionID: shipShowInfoID(query.get("regionID")) || 10000002,
        panel: SHIP_SHOW_INFO_PANELS.includes(panel) ? panel : "overview"
    };
}

function WriteAddress(method, { typeID, regionID, panel })
{
    const url = new URL(location.href);

    url.searchParams.set("typeID", String(typeID));
    url.searchParams.set("regionID", String(regionID));
    if (panel && panel !== "overview") url.searchParams.set("panel", panel);
    else url.searchParams.delete("panel");
    history[`${method}State`](null, "", url);
}

function LiveSource(baseURL)
{
    const shipSource = new CjsShipShowInfoToolsCoreSource({
        baseURL,
        resourceBaseURL: baseURL
    });

    if (parameters.get("session") === "off") return shipSource;

    return new CjsESIShipShowInfoSessionSource({
        shipSource,
        sessionSource: new CjsShipShowInfoToolsCoreSessionSource({ baseURL })
    });
}

async function InstallEveFonts(baseURL)
{
    if (typeof globalThis.FontFace !== "function" || !document.fonts) return;

    const root = `${String(baseURL).replace(/\/+$/u, "")}/eve/latest/resources/ui/fonts/`;
    const definitions = [
        [ "evesansneue-regular.otf", "400" ],
        [ "evesansneue-bold.otf", "700" ]
    ];
    const results = await Promise.allSettled(definitions.map(([ file, weight ]) =>
    {
        const face = new FontFace(
            "EVE Sans Neue",
            `url("${root}${file}") format("opentype")`,
            { style: "normal", weight }
        );

        return face.load();
    }));
    let loaded = 0;

    for (const result of results)
    {
        if (result.status !== "fulfilled") continue;
        document.fonts.add(result.value);
        loaded++;
    }
    if (loaded)
    {
        document.body.style.setProperty(
            "--cjs-eve-font-family",
            '"EVE Sans Neue", "Arial Narrow", "Segoe UI", sans-serif'
        );
    }
}

function SyntheticSource()
{
    return new CjsESIShipShowInfoMemorySource({
        records: [
            Record(7001, "Synthetic Survey Hull", "synthetic_survey:base:race", 7002),
            Record(7002, "Synthetic Survey Hull II", "synthetic_survey:variant:race", 7001)
        ]
    });
}

function Record(typeID, name, dna, variationTypeID)
{
    return {
        ship: {
            typeID,
            name,
            groupName: "Demonstration Hull",
            metaLabel: "Caller-owned memory data",
            dna,
            renderURL: SyntheticRenderURL(name),
            longAxis: 240
        },
        price: { estimatedPrice: typeID * 100000 },
        overview: {
            description: "This standalone window uses synthetic browser-memory records.",
            bonuses: []
        },
        attributes: {
            longAxis: 240,
            groups: []
        },
        fitting: {
            rows: [],
            hardpoints: []
        },
        skills: {
            requirements: [],
            tiers: [],
            profileState: { status: "anonymous" }
        },
        variations: {
            selectedTypeID: typeID,
            variations: [
                { typeID, name },
                {
                    typeID: variationTypeID,
                    name: variationTypeID === 7001
                        ? "Synthetic Survey Hull"
                        : "Synthetic Survey Hull II"
                }
            ]
        },
        industry: {
            materials: []
        },
        skins: {
            skins: []
        }
    };
}

function SyntheticRenderURL(name)
{
    const label = String(name).replace(/[&<>"']/gu, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600">
        <defs><linearGradient id="h" x1="0" x2="1"><stop stop-color="#31575c"/><stop offset=".55" stop-color="#c3b27a"/><stop offset="1" stop-color="#203137"/></linearGradient></defs>
        <g transform="translate(150 130) rotate(-12 330 170)" fill="url(#h)" stroke="#8cc1c2" stroke-opacity=".55" stroke-width="4">
            <path d="M20 180 180 80 510 54 680 150 510 250 180 274Z"/><path d="m235 79 62-74 170 38 41 77Z"/>
            <path d="m210 248 85 87 170-53 38-80Z"/><ellipse cx="536" cy="153" rx="90" ry="62" fill="#152327"/>
            <path d="m42 170-38-72 140 47v70L4 257Z" fill="#6e6647"/>
        </g><text x="480" y="550" text-anchor="middle" fill="#8aa7a8" font-family="sans-serif" font-size="24">${label}</text>
    </svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
