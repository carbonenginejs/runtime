import assert from "node:assert/strict";
import test from "node:test";

import { CjsESIMarket } from "../src/market/CjsESIMarket.js";
import { CjsESIMarketMemorySource } from "../src/market/CjsESIMarketMemorySource.js";
import { CjsESIMarketSource } from "../src/market/CjsESIMarketSource.js";
import {
    analyzeOrders,
    buildHistoryChart,
    buildOrdersCsv,
    filterHistory,
    marketID
} from "../src/market/marketModel.js";

test("market logic classes preserve the CjsESIMarket family", () =>
{
    assert.equal(CjsESIMarket.name, "CjsESIMarket");
    assert.equal(CjsESIMarketSource.name, "CjsESIMarketSource");
    assert.equal(CjsESIMarketMemorySource.name, "CjsESIMarketMemorySource");
});

test("market IDs reject coercive and non-positive addresses", () =>
{
    assert.equal(marketID("34"), 34);
    assert.equal(marketID(10000002), 10000002);
    assert.equal(marketID("34.5"), null);
    assert.equal(marketID(0), null);
    assert.equal(marketID("not-an-id"), null);
});

test("order analysis handles a market-sized collection without variadic spread", () =>
{
    const orders = [];

    for (let index = 0; index < 20000; index++)
    {
        orders.push({
            orderID: index + 1,
            side: index % 2 ? "buy" : "sell",
            price: index % 2 ? 90 + index / 100000 : 110 + index / 100000,
            volumeRemain: index + 1
        });
    }

    const result = analyzeOrders(orders);

    assert.equal(result.sellers.length, 10000);
    assert.equal(result.buyers.length, 10000);
    assert.equal(result.bestSell.orderID, 1);
    assert.equal(result.bestBuy.orderID, 20000);
    assert.ok(result.sellVolume > 0);
    assert.ok(result.buyVolume > 0);
});

test("history filtering and chart geometry use the newest record as their range", () =>
{
    const history = [];

    for (let day = 0; day < 120; day++)
    {
        history.push({
            date: new Date(Date.UTC(2026, 0, day + 1)).toISOString().slice(0, 10),
            average: 100 + day,
            high: 110 + day,
            low: 90 + day,
            orderCount: 10 + day,
            volume: 1000 + day * 4
        });
    }

    const rows = filterHistory(history, 30);
    const chart = buildHistoryChart(rows);

    assert.equal(rows.length, 30);
    assert.equal(rows.at(-1).date, history.at(-1).date);
    assert.equal(chart.points.length, 30);
    assert.match(chart.averagePath, /^M/);
    assert.match(chart.bandPath, /Z$/);
    assert.equal(chart.yTicks.length, 5);
});

test("market CSV keeps provider names as text rather than spreadsheet formulae", () =>
{
    const csv = buildOrdersCsv([ {
        orderID: 1,
        side: "sell",
        price: 12.5,
        volumeRemain: 4,
        minVolume: 1,
        locationName: "=COMMAND()",
        systemName: "Jita",
        range: "region",
        expiresAt: "2026-08-20T00:00:00.000Z"
    } ]);

    assert.match(csv, /"'=COMMAND\(\)"/);
    assert.match(csv, /"sell","12.5"/);
});

test("memory source supplies mutable caller-owned market records", async () =>
{
    const source = new CjsESIMarketMemorySource({
        regions: [ { regionID: 90000001, name: "Test Region" } ],
        types: [ {
            typeID: 7001,
            name: "Test Commodity",
            groupName: "Test Group",
            breadcrumb: [ { marketGroupID: 1, name: "Test Group" } ]
        } ],
        orders: [
            { orderID: 1, typeID: 7001, regionID: 90000001, side: "sell", price: 12 },
            { orderID: 2, typeID: 7001, regionID: 90000001, side: "buy", price: 10 }
        ],
        history: [ {
            typeID: 7001,
            regionID: 90000001,
            date: "2026-08-13",
            average: 11
        } ]
    });
    const [ type, orders, history ] = await Promise.all([
        source.GetType(7001),
        source.GetOrders({ typeID: 7001, regionID: 90000001 }),
        source.GetHistory({ typeID: 7001, regionID: 90000001 })
    ]);

    assert.equal(type.typeID, 7001);
    assert.equal(type.breadcrumb.at(-1).name, "Test Group");
    assert.ok(orders.some(order => order.side === "sell"));
    assert.ok(orders.some(order => order.side === "buy"));
    assert.equal(history.length, 1);
    assert.equal(Object.isFrozen(type), false);
    assert.notEqual(type, source.types[0]);
});

test("market clients retain an injected browser fetch receiver", async () =>
{
    const receivers = [];
    const fetchImpl = async function()
    {
        receivers.push(this);

        return jsonResponse({ entries: 0 });
    };
    const client = new CjsESIMarket({
        baseURL: "https://market.test/api/",
        fetchImpl
    });

    await client.GetStatus();

    assert.deepEqual(receivers, [ globalThis ]);
});

test("ESI source contains wire translation and emits normalized records", async () =>
{
    const calls = [];
    const source = new CjsESIMarketSource({
        fetchImpl: async (url, options) =>
        {
            calls.push({ url: url.toString(), options });
            if (url.pathname.endsWith("/orders"))
            {
                return jsonResponse([ {
                    duration: 90,
                    is_buy_order: false,
                    issued: "2026-08-01T00:00:00Z",
                    location_id: 60003760,
                    min_volume: 1,
                    order_id: 77,
                    price: 4.2,
                    range: "region",
                    system_id: 30000142,
                    type_id: 34,
                    volume_remain: 120,
                    volume_total: 200
                } ], { "X-Pages": "1" });
            }
            if (url.pathname === "/universe/names")
            {
                return jsonResponse([
                    { id: 60003760, name: "Jita IV - Moon 4" },
                    { id: 30000142, name: "Jita" }
                ]);
            }
            if (url.pathname.endsWith("/history"))
            {
                return jsonResponse([ {
                    average: 4.1,
                    date: "2026-08-13",
                    highest: 4.3,
                    lowest: 4,
                    order_count: 99,
                    volume: 1000000
                } ]);
            }
            throw new Error(`Unexpected request ${url}`);
        }
    });

    const orders = await source.GetOrders({ typeID: 34, regionID: 10000002 });
    const history = await source.GetHistory({ typeID: 34, regionID: 10000002 });

    assert.deepEqual(orders[0], {
        orderID: 77,
        typeID: 34,
        side: "sell",
        price: 4.2,
        volumeRemain: 120,
        volumeTotal: 200,
        minVolume: 1,
        range: "region",
        issued: "2026-08-01T00:00:00Z",
        expiresAt: "2026-10-30T00:00:00.000Z",
        locationID: 60003760,
        locationName: "Jita IV - Moon 4",
        systemID: 30000142,
        systemName: "Jita"
    });
    assert.deepEqual(history[0], {
        date: "2026-08-13",
        average: 4.1,
        high: 4.3,
        low: 4,
        orderCount: 99,
        volume: 1000000
    });
    assert.match(calls[0].url, /\/markets\/10000002\/orders\?order_type=all&type_id=34&page=1/);
    assert.equal(calls[0].options.headers["X-Compatibility-Date"], "2026-08-14");
});

function jsonResponse(body, headers = {})
{
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: Object.assign({ "Content-Type": "application/json" }, headers)
    });
}
