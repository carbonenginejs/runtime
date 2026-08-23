import { TnyMarketDetailsDemo } from "../../src/tools/demo-apps/index.js";
import { CjsESIMarketMemorySource } from "../../src/tools/market/index.js";

const source = CreateMarketSource();
const demo = new TnyMarketDetailsDemo({
    marketSource: source,
    initialTypeID: 7001,
    initialRegionID: 90000001
});

await demo.Mount(document.querySelector("#demo-root"));
globalThis.marketDetailsDemo = demo;

function CreateMarketSource()
{
    const history = [];

    for (let day = 1; day <= 60; day++)
    {
        history.push({
            typeID: 7001,
            regionID: 90000001,
            date: new Date(Date.UTC(2026, 5, day)).toISOString().slice(0, 10),
            average: 1000000 + day * 17000,
            high: 1050000 + day * 18000,
            low: 950000 + day * 16000,
            orderCount: 20 + day,
            volume: 1000 + day * 13
        });
    }

    return new CjsESIMarketMemorySource({
        regions: [ { regionID: 90000001, name: "Synthetic Region" } ],
        types: [
            {
                typeID: 7001,
                name: "Synthetic Survey Hull",
                group: "DEMONSTRATION HULLS",
                groupName: "Demonstration Hulls",
                description: "Caller-owned browser-memory data.",
                breadcrumb: [ { marketGroupID: 1, name: "Synthetic Ships" } ]
            },
            {
                typeID: 7002,
                name: "Synthetic Survey Hull II",
                group: "DEMONSTRATION HULLS",
                groupName: "Demonstration Hulls",
                description: "A second market selection without a remote API.",
                breadcrumb: [ { marketGroupID: 1, name: "Synthetic Ships" } ]
            }
        ],
        orders: [
            { orderID: 1, typeID: 7001, regionID: 90000001, side: "sell", price: 2040000, volumeRemain: 12, minVolume: 1, locationName: "Synthetic Exchange", expiresAt: "2026-09-20T00:00:00Z" },
            { orderID: 2, typeID: 7001, regionID: 90000001, side: "buy", price: 1960000, volumeRemain: 28, minVolume: 1, range: "region", locationName: "Synthetic Exchange", expiresAt: "2026-09-18T00:00:00Z" },
            { orderID: 3, typeID: 7002, regionID: 90000001, side: "sell", price: 4200000, volumeRemain: 4, minVolume: 1, locationName: "Synthetic Exchange", expiresAt: "2026-09-22T00:00:00Z" }
        ],
        history
    });
}
