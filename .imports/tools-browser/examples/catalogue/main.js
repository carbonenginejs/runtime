import {
    CreateMarketDetailsDemoDefinition,
    CreateShipShowInfoDemoDefinition,
    CreateShipTreeDemoDefinition
} from "../../src/demo-apps/index.js";
import { TnyDemoHost } from "../../src/demos/index.js";
import { CjsESIMarketMemorySource } from "../../src/market/index.js";
import { CjsESIShipShowInfoMemorySource } from "../../src/ship-show-info/index.js";
import { CjsShipTreeMemorySource } from "../../src/ship-tree/index.js";
import { syntheticShipTree } from "../ship-tree/fixture.js";

const context = {
    marketSource: CreateMarketSource(),
    showInfoSource: CreateShowInfoSource(),
    shipTreeSource: new CjsShipTreeMemorySource({ trees: [ syntheticShipTree ] }),
    selectedTypeID: ParseTypeID(new URLSearchParams(location.search).get("typeID")) ?? 7001
};
const host = new TnyDemoHost({
    container: document.querySelector("#demo-root"),
    context,
    demos: [
        CreateShipShowInfoDemoDefinition({
            CreateOptions(value)
            {
                return {
                    shipSource: value.showInfoSource,
                    initialTypeID: value.selectedTypeID,
                    initialRegionID: 90000001
                };
            }
        }),
        CreateMarketDetailsDemoDefinition({
            CreateOptions(value)
            {
                return {
                    marketSource: value.marketSource,
                    initialTypeID: 7001,
                    initialRegionID: 90000001
                };
            }
        }),
        CreateShipTreeDemoDefinition({
            CreateOptions(value)
            {
                return {
                    source: value.shipTreeSource,
                    initialFactionID: 9001,
                    onOpenType(type)
                    {
                        void OpenSelectedType(type.typeID);
                    }
                };
            }
        })
    ]
});

for (const button of document.querySelectorAll("[data-demo-id]"))
{
    button.addEventListener("click", () => Open(button.dataset.demoId));
}

await Open(new URLSearchParams(location.search).get("demo") || "ship-show-info");
globalThis.demoCatalogueHost = host;

async function Open(id)
{
    await host.Open(id);

    for (const button of document.querySelectorAll("[data-demo-id]"))
    {
        button.setAttribute("aria-selected", String(button.dataset.demoId === id));
    }
}

async function OpenSelectedType(typeID)
{
    context.selectedTypeID = typeID;
    await Open("ship-show-info");
}

function CreateMarketSource()
{
    return new CjsESIMarketMemorySource({
        regions: [ { regionID: 90000001, name: "Synthetic Region" } ],
        types: [ {
            typeID: 7001,
            name: "Synthetic Survey Hull",
            group: "DEMONSTRATION HULLS",
            groupName: "Demonstration Hulls",
            description: "The catalogue injected this browser-memory record.",
            breadcrumb: [ { marketGroupID: 1, name: "Synthetic Ships" } ]
        } ],
        orders: [
            { orderID: 1, typeID: 7001, regionID: 90000001, side: "sell", price: 2040000, volumeRemain: 12, minVolume: 1, locationName: "Synthetic Exchange" },
            { orderID: 2, typeID: 7001, regionID: 90000001, side: "buy", price: 1960000, volumeRemain: 28, minVolume: 1, range: "region", locationName: "Synthetic Exchange" }
        ],
        history: [ {
            typeID: 7001,
            regionID: 90000001,
            date: "2026-08-16",
            average: 2000000,
            high: 2040000,
            low: 1960000,
            orderCount: 40,
            volume: 1200
        } ]
    });
}

function CreateShowInfoSource()
{
    const records = [ CreateShowInfoRecord({
        typeID: 7001,
        name: "Synthetic Survey Hull",
        groupName: "Demonstration Hull"
    }) ];

    for (const type of syntheticShipTree.types)
    {
        records.push(CreateShowInfoRecord({
            typeID: type.typeID,
            name: type.name,
            groupName: type.className
        }));
    }

    return new CjsESIShipShowInfoMemorySource({
        records
    });
}

function CreateShowInfoRecord({ typeID, name, groupName })
{
    return {
        ship: {
            typeID,
            name,
            groupName,
            dna: "synthetic_survey:base:race",
            longAxis: 240
        },
        price: { estimatedPrice: 2040000 },
        overview: { description: "The same catalogue context can supply a separate feature record.", bonuses: [] },
        attributes: { longAxis: 240, groups: [] },
        fitting: { rows: [], hardpoints: [] },
        skills: { requirements: [], tiers: [], profileState: { status: "anonymous" } },
        variations: { selectedTypeID: typeID, variations: [ { typeID, name } ] },
        industry: { materials: [] },
        skins: { skins: [] }
    };
}

function ParseTypeID(value)
{
    if (value === null || value === "") return null;

    const typeID = Number(value);

    return Number.isSafeInteger(typeID) && typeID > 0 ? typeID : null;
}
