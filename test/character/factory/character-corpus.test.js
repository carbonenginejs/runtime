// The character readers and the character factory drop nothing, over a real build (format-ownership.md § Readers and
// factories drop nothing; operator, 2026-11-12). Every key of every shipped `metadata.yaml`, `.type`, `.proj` and
// `.prs` under `res:/graphics/character/` is compared, read independently of our reader, with the record our reader
// gives and, for a recipe, with the DNA the factory reads from it. A key that reaches no field, a value that does not
// arrive, and a recipe entry the DNA does not keep each fail, unless `DROPS` lists it with its proof.
//
// Game files are never committed (org rule). The test reads through tools-core's service and skips when it is not
// running (CJS_TOOLS_SERVER, default http://127.0.0.1:5510); the build is the one the service calls latest.
// Every .proj is read. The metadata.yaml, .type and .prs files are fixed samples (METADATA, TYPES and RECIPES of
// them, every Nth path in sorted order), which keeps the file inside a full run's time. Raise the three numbers
// to read every file.
import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "yaml";
import { CjsCharacterFactory, CjsCharacterLibraryConfiguration, CjsCharacterLibraryManager } from "../../../npm/dist/character/index.js";
import { BluePaths, BlueResMan, BlueResFileSystemRemote, RemoteFileCache } from "../../../npm/dist/blue/index.js";
import { installBlueServices } from "../../../npm/dist/blue/blue.js";
import { CjsSchema } from "../../../npm/dist/blue/schema/index.js";
import "../../support/frameLoop.js";
import { clientResources } from "../../support/clientResources.js";

// One variable for every corpus test: the service's address. The build is the one the service calls latest.
const resources = await clientResources();
const base = resources.skip ? null : (process.env.CJS_TOOLS_SERVER ?? "http://127.0.0.1:5510") + "/eve/" + resources.build;

/** How many of the build's metadata.yaml, .type and .prs files are read. A recipe costs most: it loads its parts. */
const METADATA = 300, TYPES = 400, RECIPES = 30;

/** A fixed sample of sorted paths: every Nth, at most `count`. */
const Sample = (paths, count) => paths.length <= count ? paths : Array.from({ length: count }, (_, i) => paths[Math.floor(i * paths.length / count)]);

/**
 * Keys a reader may leave out, each with its proof: `<record class>.<file key>`. Empty: nothing is dropped.
 * @type {Object<string, string>}
 */
const DROPS = {};

/** A shipped file's bytes from the service. */
async function Bytes(path)
{
    const response = await fetch(base + "/resources/" + path.replace(/^res:\//u, ""));
    if (!response.ok) throw new Error(path + ": " + response.status);
    return new Uint8Array(await response.arrayBuffer());
}

/** A shipped YAML file as plain values, read without our reader: its Python tags are taken off and the rest parsed. */
async function Raw(path)
{
    return parse(new TextDecoder().decode(await Bytes(path)).replace(/!!python\/[^\s[{]+[ \t]*/gu, ""), { uniqueKeys: false });
}

/** A raw value that states nothing: null, empty, zero or false. */
function Empty(value)
{
    return value === null || value === undefined || value === "" || value === 0 || value === false || Array.isArray(value) && value.length === 0;
}

/** The record fields a file key fills, by the class's list forms. */
function FieldsOf(lists, key)
{
    const form = lists[key];
    if (form === undefined) return [ key ];
    if (typeof form === "string") return [ form ];
    if (Array.isArray(form)) return form;
    return [ form.list, ...form.pattern ];
}

/**
 * Compares one file mapping with its record's values: every key fills a field, and a stated value arrives (a scalar
 * or a list of scalars as written, anything else as a field that is not its empty default).
 * @returns {string[]} The failures.
 */
function Compare(label, className, raw, values, empty, lists = {})
{
    const failures = [];
    for (const [ key, value ] of Object.entries(raw ?? {}))
    {
        if (Object.hasOwn(DROPS, className + "." + key)) continue;
        const fields = FieldsOf(lists, key);
        const missing = fields.filter(field => !Object.hasOwn(empty, field));
        if (missing.length) { failures.push(label + ": " + key + " fills no field of " + className); continue; }
        if (Empty(value)) continue;
        const scalar = value => [ "string", "number", "boolean" ].includes(typeof value);
        if (fields.length === 1 && (scalar(value) || Array.isArray(value) && value.every(scalar)))
        {
            if (JSON.stringify(values[fields[0]]) !== JSON.stringify(value)) failures.push(label + ": " + key + " " + JSON.stringify(value) + " arrived as " + JSON.stringify(values[fields[0]]));
        }
        else if (fields.every(field => JSON.stringify(values[field]) === JSON.stringify(empty[field]))) failures.push(label + ": " + key + " " + JSON.stringify(value).slice(0, 80) + " arrived empty");
    }
    return failures;
}

test("the character readers and the factory keep every field of a real build", { skip: resources.skip ?? false, timeout: 1800000 }, async t =>
{
    const index = (await (await fetch(base + "/app/resfileindex.txt")).text()).split("\n").filter(line => line.startsWith("res:/graphics/character/"));
    const cache = new RemoteFileCache();
    cache.AddFileIndex(index.join("\n"));
    const paths = new BluePaths();
    paths.RegisterFileSystem(new BlueResFileSystemRemote(cache));
    const resMan = new BlueResMan({ source: { Read: path => Bytes(path.replace(/\.black$/u, ".red")) } });
    const library = new CjsCharacterLibraryManager();
    const previous = installBlueServices({ paths, resMan, characterLibrary: library }, false);
    t.after(() =>
    {
        installBlueServices(previous, previous.running);
        resMan.Clear();
    });
    library.Initialize({ resMan });
    CjsCharacterFactory.registerObjectBuilders(resMan);
    const files = suffix => index.map(line => line.slice(0, line.indexOf(","))).filter(path => path.endsWith(suffix)).sort();
    const emptyOf = name => CjsSchema.getValues(new (CjsSchema.getConstructor(name))());
    const failures = [];

    // metadata.yaml: weighted occlusions (`#2.0`) included, every list entry as written.
    const metadataEmpty = emptyOf("CjsAvatarPartMetaData");
    for (const path of Sample(files("/metadata.yaml"), METADATA))
        failures.push(...Compare(path, "CjsAvatarPartMetaData", await Raw(path), CjsSchema.getValues(await library.FetchAvatarPartMetaData(path)), metadataEmpty));

    // .proj
    const decalEmpty = emptyOf("CjsProjectedDecal");
    for (const path of files(".proj"))
        failures.push(...Compare(path, "CjsProjectedDecal", await Raw(path), CjsSchema.getValues(await library.FetchProjectedDecal(path)), decalEmpty));

    // .type: a tuple, one item per slot.
    const slots = CjsCharacterLibraryConfiguration.kinds.types.slots;
    for (const path of Sample(files(".type"), TYPES))
    {
        const raw = await Raw(path), values = CjsSchema.getValues(await library.FetchType(path));
        if (!Array.isArray(raw) || raw.length > slots.length) { failures.push(path + ": " + JSON.stringify(raw) + " has items no slot reads"); continue; }
        raw.forEach((value, i) =>
        {
            if (!Empty(value) && JSON.stringify(values[slots[i]]) !== JSON.stringify(value)) failures.push(path + ": " + slots[i] + " " + JSON.stringify(value) + " arrived as " + JSON.stringify(values[slots[i]]));
        });
    }

    // .prs: the recipe reader, then the factory's DNA, which keeps every entry as read.
    const lists = CjsCharacterFactory.recipeConfiguration.sourceLists.CjsCharacterRecipeModifier;
    const modifierEmpty = emptyOf("CjsCharacterRecipeModifier");
    for (const path of Sample(files(".prs"), RECIPES))
    {
        const raw = (await Raw(path)).filter(item => item !== null && typeof item === "object" && !Array.isArray(item));
        const recipe = await CjsCharacterFactory.fetchRecipe(path);
        // A recipe holding entries the paper doll does not apply throws, naming them; the DNA it would give keeps every
        // entry as `modifierValues` reads it.
        let dna;
        try { ({ dna } = await CjsCharacterFactory.readRecipe(path, recipe.sex || "female")); }
        catch (error)
        {
            if (!/^No paper doll rule for \d+ entries of the recipe /u.test(error.message)) throw error;
            dna = { modifiers: recipe.modifiers.map(entry => CjsCharacterFactory.modifierValues(entry)) };
        }
        if (dna.modifiers.length !== raw.length) { failures.push(path + ": " + raw.length + " entries, the DNA keeps " + dna.modifiers.length); continue; }
        raw.forEach((entry, i) =>
        {
            const label = path + " [" + i + "] " + entry.path;
            failures.push(...Compare(label, "CjsCharacterRecipeModifier", entry, CjsSchema.getValues(recipe.modifiers[i]), modifierEmpty, lists));
            const kept = { ...modifierEmpty, ...dna.modifiers[i] };
            for (const [ field, value ] of Object.entries(CjsSchema.getValues(recipe.modifiers[i])))
                if (JSON.stringify(kept[field]) !== JSON.stringify(value)) failures.push(label + ": the DNA does not keep " + field);
        });
    }

    assert.deepEqual(failures, []);
});
