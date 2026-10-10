import test from "node:test";
import assert from "node:assert/strict";
import { Tny, TnyService } from "../../src/core/services/index.js";

const definition = { name: "types", description: "Item types", columns: [
    { name: "typeID", type: "int32", primaryKey: true, description: "Stable type ID" },
    { name: "graphicID", type: "int32" }
] };

test("table registration is inert; generic calls route with pinned identity and owned descriptions", async () =>
{
    let constructions = 0;
    const identities = [];
    class Provider extends TnyService
    {
        constructor() { super(); constructions++; }
        async GetByID(identity, id) { identities.push(identity); return id === 34 ? { typeID: 34, graphicID: 10 } : null; }
        async Find(identity, query) { identities.push(identity); return { entries: [{ typeID: 34, graphicID: 10 }], nextCursor: null }; }
    }
    const tny = new Tny();
    tny.services.Register("api", Provider);
    tny.database.Register(definition, { service: "api", source: "sde", build: 3586130 });
    const described = await tny.database.Describe("types");
    described.columns[0].description = "changed";
    assert.equal((await tny.database.Describe("types")).columns[0].description, "Stable type ID");
    assert.equal(constructions, 0);
    assert.deepEqual(await tny.database.GetByID("types", 34), { typeID: 34, graphicID: 10 });
    assert.equal(await tny.database.GetByID("types", 35), null);
    const page = await tny.database.Find("types", { limit: 1 });
    assert.deepEqual(page.identity, { source: "sde", build: "3586130", revision: 1, table: "types" });
    assert.deepEqual(identities[0], page.identity);
    assert.equal(constructions, 1);
    await tny.Close();
    await assert.rejects(tny.database.GetByID("types", 34), /closed/);
});

test("invalid and unbounded queries fail, and latest cannot become a persisted identity", async () =>
{
    class Provider extends TnyService
    {
        async GetByID() { return { typeID: 99 }; }
        async Find() { return { entries: [{}, {}], nextCursor: null }; }
    }
    const tny = new Tny();
    tny.services.Register("api", Provider);
    assert.throws(() => tny.database.Register(definition, { service: "api", source: "sde", build: "latest" }), /explicit/);
    tny.database.Register(definition, { service: "api", source: "sde", build: 3586130 });
    await assert.rejects(tny.database.Find("types", { limit: 1001 }), /limit/);
    await assert.rejects(tny.database.Find("types", { filters: [{ field: "missing", operator: "eq", value: 2 }] }), /filter/);
    await assert.rejects(tny.database.Find("types", { limit: 1 }), /unbounded/);
    await assert.rejects(tny.database.GetByID("types", 34), /wrong record/);
    await tny.Close();
});
