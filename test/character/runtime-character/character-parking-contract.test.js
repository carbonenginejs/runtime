import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import * as character from "../../../npm/dist/character/index.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";

test("retained character entry hydrates every document family after creator removal", () =>
{
    const documents = {};
    for (const name of character.CjsCharacterLibraryDocuments.listDocumentNames())
    {
        documents[name] = { sample: {} };
    }
    const library = character.CjsCharacterLibraryBuilder.buildLibrary(documents, {
        sourceBuild: "test"
    });
    const values = JSON.parse(JSON.stringify(CjsSchema.getValues(library, {}, { refs: true })));
    const installed = new character.CjsCharacterLibraryManager(values).GetLibrary();
    for (const name of character.CjsCharacterLibraryDocuments.listDocumentNames())
    {
        const record = installed.Get(name, "sample");
        assert.ok(record, name);
        assert.equal(CjsSchema.getClassName(record.constructor),
            character.CjsCharacterLibraryDocuments.getDocumentType(name), name);
    }
});

test("built package excludes creator and archived backend entry points", async () =>
{
    const manifest = JSON.parse(await fs.readFile(new URL("../../../npm/package.json", import.meta.url), "utf8"));
    for (const name of ["CjsCharacter", "CjsCharacterAppearanceConstruction",
        "CjsCharacterAppearanceManager", "CjsCharacterAtlasLayout", "CjsCharacterTexturePolicy"])
    {
        assert.equal(Object.hasOwn(character, name), false, name);
    }
    for (const backend of ["gles", "webgl2"])
    {
        assert.equal(Object.hasOwn(manifest.exports, `./character/${backend}`), false);
        assert.equal(Object.hasOwn(manifest.imports, `#character/${backend}`), false);
        await assert.rejects(fs.access(new URL(`../../../npm/dist/character/${backend}/index.js`, import.meta.url)),
            { code: "ENOENT" });
    }
    await assert.rejects(fs.access(new URL("../../../npm/dist/character/CjsCharacter.js", import.meta.url)),
        { code: "ENOENT" });
});
