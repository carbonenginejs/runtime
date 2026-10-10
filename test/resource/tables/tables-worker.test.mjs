import assert from "node:assert/strict";
import { test } from "node:test";
import { Worker } from "node:worker_threads";
import { CjsResManWorkerLoader } from "../../../npm/dist/global/blue/index.js";
import { CjsJsonlFormat } from "../../../npm/dist/resource/formats/jsonl/index.js";
import { CjsSqliteFormat } from "../../../npm/dist/resource/formats/sqlite/index.js";
import { CjsFsdFormat } from "../../../npm/dist/resource/formats/fsd/index.js";
import { CjsTableData } from "../../../npm/dist/resource/format/CjsTableData.js";
import { sqliteFixture, fsdFixture } from "./fixtures.mjs";

test("production format worker returns the same cjstables for JSONL, SQLite and FSD", async t =>
{
    const thread = new Worker(new URL("../fixtures/resource-worker-thread.mjs", import.meta.url));
    const adapter = {
        postMessage(message, transfer) { thread.postMessage(message, transfer); },
        terminate() { void thread.terminate(); }
    };
    thread.on("message", data => adapter.onmessage?.({ data }));
    thread.on("error", error => adapter.onerror?.({ error }));
    const loader = new CjsResManWorkerLoader({ worker: adapter });
    t.after(async () => { loader.Disable(); await thread.terminate(); });
    const fsd = fsdFixture();
    const inputs = [
        [CjsJsonlFormat, new TextEncoder().encode('{"typeID":587}\n'), { name: "types", keyPath: "typeID" }],
        [CjsSqliteFormat, sqliteFixture(), { tables: ["graphics"], keyPaths: { graphics: "graphicID" } }],
        [CjsFsdFormat, fsd.bytes, { schema: fsd.schema }]
    ];
    for (const [Format, input, settings] of inputs)
    {
        const options = { ...settings, emit: "cjstables" };
        const expected = Format.read(input, options);
        assert.equal(loader.CanReadFormat({ Format }, options), true);
        const actual = await loader.ReadFormat({ Format }, input, options);
        assert.deepEqual(actual, expected);
        assert.deepEqual(CjsTableData.from(actual).GetValues(), expected);
        assert.ok(input.byteLength > 0, "default worker ownership must not detach source bytes");
    }
});
