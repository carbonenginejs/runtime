import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CjsCharacterLibraryManager } from "../../../npm/dist/character/index.js";
import { blue, BluePaths, BlueResMan, BlueResFileSystemRemote, RemoteFileCache } from "../../../npm/dist/blue/blue/index.js";
import { installBlueServices } from "../../../npm/dist/blue/blue/blue.js";
import "../../support/frameLoop.js";

// Expected values recorded from Graphene's readPaletteFile (palettes.js at graphene b6649d7) over
// build 3662168: one real palette per outcome across all twelve option sets, the first in path
// order. Over all 2,555 character palettes of that build, FetchPalette answered the same as
// readPaletteFile for every option set, error messages included (30,660 comparisons). One change
// since, by the colour reshape (2026-11-01): a palette that states no specular colours holds neutral
// grey ones, so `specular: true` answers them where readPaletteFile threw "Malformed palette"; those
// cases were re-recorded (1,374 of the 30,660 over the build; the rest still answer the same).
const expected = JSON.parse(readFileSync(new URL("./fixtures/character-library-palettes.json", import.meta.url), "utf8"));

/** Installs Blue paths and a resMan over the fixture's palette texts for one test. */
function InstallPalettes(t)
{
    const text = new Map(expected.palettes.map(palette => [ palette.path, palette.text ]));
    const cache = new RemoteFileCache();
    cache.AddFileIndex(expected.palettes.map((palette, index) => `${palette.path},synthetic/${index},checksum,1`).join("\n"));
    const paths = new BluePaths();
    paths.RegisterFileSystem(new BlueResFileSystemRemote(cache));
    const resMan = new BlueResMan({ source: { Read: path => new TextEncoder().encode(text.get(path)) } });
    const previous = installBlueServices({ paths, resMan }, false);
    t.after(() =>
    {
        installBlueServices(previous, previous.running);
        resMan.Clear();
    });
}

/** A fetch result as the fixture records it: Float32Arrays as plain number lists, errors by message. */
function Settle(promise)
{
    return promise.then(
        value => ({ value: JSON.parse(JSON.stringify(value, (_key, item) => ArrayBuffer.isView(item) ? Array.from(item) : item)) }),
        error => ({ error: error.message })
    );
}

test("FetchPalette answers each palette as Graphene's readPaletteFile did, for every option set", async t =>
{
    InstallPalettes(t);
    const library = new CjsCharacterLibraryManager().Initialize(blue);
    for (const palette of expected.palettes)
    {
        for (let i = 0; i < expected.combos.length; i++)
        {
            assert.deepEqual(await Settle(library.FetchPalette(palette.path, expected.combos[i])), palette.results[i],
                palette.path + " " + JSON.stringify(expected.combos[i]));
        }
    }
});

test("the shared library starts lazily over Blue's installed services and loads only what is fetched", async t =>
{
    InstallPalettes(t);
    const reads = [];
    const read = blue.resMan.source.Read;
    blue.resMan.SetSource({ Read: path => { reads.push(path); return read(path); } });
    const library = new CjsCharacterLibraryManager().Initialize(blue);
    const [ path ] = expected.palettes.map(palette => palette.path);
    await library.FetchPalette(path);
    await library.FetchPalette(path);
    assert.deepEqual(reads, [ path ]);
});

test("a palette's colours are the record's own fields, and FetchPalette hands out copies", async t =>
{
    InstallPalettes(t);
    const library = new CjsCharacterLibraryManager().Initialize(blue);
    const [ path ] = expected.palettes.map(palette => palette.path);
    const palette = await library.FetchPalette(path, { specular: true });
    const record = await library.GetColorVariation(path);
    assert.deepEqual(Array.from(record.color1), Array.from(palette.colors[0]));
    assert.notEqual(palette.colors[0], record.color1);
    assert.notEqual(record.color1, record.color2);
    palette.colors[0][0] = 9;
    assert.notEqual(record.color1[0], 9);
});
