import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { Tny } from "../../src/core/services/Tny.js";
import { TnyServiceAPI } from "../../src/core/services/TnyServiceAPI.js";
import { CjsIndexedDBStorage } from "../../src/resource/storage/index.js";

test("API results survive owners, isolate builds, and reject actual-build fallback", async () =>
{
    const indexedDB = new IDBFactory();
    let reads = 0, actualBuild = "100";
    const fetcher = async url =>
    {
        reads++;
        assert.match(url, /\/eve\/\d+\/sde\/types\/34$/);
        return new Response(JSON.stringify({ build: actualBuild, table: "types", id: "34", payload: { graphicID: 10 } }));
    };
    const create = build =>
    {
        const tny = new Tny({ storage: { namespace: "api-test", backend: new CjsIndexedDBStorage({ name: "api", indexedDB, keyRange: IDBKeyRange }) } });
        tny.services.Register("api", TnyServiceAPI, { url: "https://example.invalid", fetcher, tables: { types: { key: "typeID" } } });
        tny.database.Register({ name: "types", columns: [{ name: "typeID", type: "int32", primaryKey: true }] },
            { service: "api", source: "sde", build });
        return tny;
    };
    let tny = create(100);
    const [a,b] = await Promise.all([tny.database.GetByID("types",34),tny.database.GetByID("types",34)]);
    assert.deepEqual(a,b);
    assert.equal(reads,1,"concurrent source requests coalesce");
    await tny.Close();
    tny = create(100);
    assert.equal((await tny.database.GetByID("types",34)).graphicID,10);
    assert.equal(reads,1,"persistent hit after replacing owner");
    await tny.Close();
    tny = create(101);
    await assert.rejects(tny.database.GetByID("types",34), /build mismatch/);
    actualBuild = "101";
    assert.equal((await tny.database.GetByID("types",34)).typeID,34);
    assert.equal(reads,3,"failed fallback was not cached");
    await tny.Close();
});
