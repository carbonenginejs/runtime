import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CjsCharacterFactory, CjsCharacterLibraryManager } from "../../../npm/dist/character/index.js";
import { blue, BluePaths, BlueResMan, BlueResFileSystemRemote, RemoteFileCache } from "../../../npm/dist/blue/index.js";
import { installBlueServices } from "../../../npm/dist/blue/blue.js";
import "../../support/frameLoop.js";

// Expected values recorded from Graphene's readYaml (resourceListing.js at graphene 8597c52) over build
// 3662168: every .type tuple shape once, one .proj per signature of the fields tattoos.js reads, and the
// two .prs recipes Graphene reads, reduced to the fields it uses (category, path, weight). Over the whole
// build, every .type record's value equals readYaml's tuple (2,296 files); a .proj record differs only in
// maskResource and textureResource (null read as ""), which no composer reads.
const expected = JSON.parse(readFileSync(new URL("./fixtures/character-library-r3-kinds.json", import.meta.url), "utf8"));

/** Installs Blue paths and a resMan over the fixture's texts, and answers a manager over them. */
function Library(t)
{
    const paths = Object.keys(expected.texts);
    const cache = new RemoteFileCache();
    cache.AddFileIndex(paths.map((path, index) => `${path},synthetic/${index},checksum,1`).join("\n"));
    const bluePaths = new BluePaths();
    bluePaths.RegisterFileSystem(new BlueResFileSystemRemote(cache));
    const resMan = new BlueResMan({ source: { Read: path => new TextEncoder().encode(expected.texts[path]) } });
    const previous = installBlueServices({ paths: bluePaths, resMan }, false);
    t.after(() =>
    {
        installBlueServices(previous, previous.running);
        resMan.Clear();
    });
    CjsCharacterFactory.registerObjectBuilders(resMan);
    return new CjsCharacterLibraryManager().Initialize(blue);
}

test("FetchType names each .type tuple's slots as Graphene's readYaml read them", async t =>
{
    const library = Library(t);
    for (const { path, value } of expected.types)
    {
        const record = await library.FetchType(path);
        assert.deepEqual([ record.partPath, record.variation, record.colorVariant, Array.from(record.bloodlineIDs) ], [ ...value.slice(0, 3), value[3] ?? [] ], path);
    }
});

test("FetchProjectedDecal answers the projection fields the tattoo bake reads as readYaml did", async t =>
{
    const library = Library(t);
    for (const { path, value } of expected.projections)
    {
        const record = await library.FetchProjectedDecal(path);
        assert.deepEqual(Object.fromEntries(expected.tattooFields.map(key => [ key, record[key] ])), value, path);
    }
});

test("the factory's FetchRecipe answers the modifiers' category, path and weight as readYaml did", async t =>
{
    Library(t);
    for (const { path, value } of expected.recipes)
    {
        const record = await CjsCharacterFactory.fetchRecipe(path);
        const read = record.modifiers.map(entry => entry === null ? entry : { category: entry.category, path: entry.path, weight: entry.weight });
        if (record.sex) read.unshift(record.sex);
        assert.deepEqual(read, value, path);
    }
});
