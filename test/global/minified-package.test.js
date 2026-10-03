import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { test } from "node:test";
import * as runtime from "../../npm/dist/carbonenginejs.min.js";

test("the min entry is ESM with renamed constructors and stable Blue registrations", async () =>
{
    const manifest = JSON.parse(await fs.readFile(new URL("../../npm/package.json", import.meta.url), "utf8"));
    assert.equal(manifest.exports["./min"], "./dist/carbonenginejs.min.js");
    assert.ok(manifest.sideEffects.includes("./dist/carbonenginejs.min.js"));
    assert.notEqual(runtime.EveShip2.name, "EveShip2", "keepNames must not mask identity dependencies");
    assert.equal(runtime.blue.classes.GetClassRegistration("EveShip2").type, runtime.EveShip2);
    assert.equal(runtime.blue.classes.CreateInstanceFromName("EveShip2").constructor, runtime.EveShip2);
    const error = new runtime.CjsError("CJS_MINIFIED_PROOF", "Minified error identity");
    assert.equal(error.name, "CjsError");
});

test("the min bundle and per-file modules retain portable source maps", async () =>
{
    const url = new URL("../../npm/dist/carbonenginejs.min.js", import.meta.url);
    const code = await fs.readFile(url, "utf8");
    assert.match(code, /sourceMappingURL=carbonenginejs\.min\.js\.map/u);
    const map = JSON.parse(await fs.readFile(new URL(`${url.href}.map`), "utf8"));
    assert.equal(map.sources.length, map.sourcesContent.length);
    assert.ok(map.sources.some(source => source.endsWith("src/global/schema/CjsSchema.js")));
    assert.ok(map.sources.every(source => !/^(?:[A-Za-z]:|file:|\/)/u.test(source)));
    await fs.access(new URL("../../npm/dist/global/schema/CjsSchema.js.map", import.meta.url));
});
