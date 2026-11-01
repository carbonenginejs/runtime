import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterLibraryConfiguration } from "../../../npm/dist/character/index.js";
import { BluePaths, BlueResFileSystemRemote, RemoteFileCache } from "../../../npm/dist/blue/blue/index.js";

test("every character matcher accepts its scope and rejects an adjacent extension", () =>
{
    for (const row of CjsCharacterLibraryConfiguration.getRows())
    {
        const positive = row.match.replaceAll("**", "branch/deep").replaceAll("*", "sample");
        const negative = positive + ".unrelated";
        const cache = new RemoteFileCache();
        cache.AddFileIndex([positive, negative].map((path, index) => `${path},synthetic/${index},checksum,1`).join("\n"));
        const paths = new BluePaths();
        paths.RegisterFileSystem(new BlueResFileSystemRemote(cache));
        // RemoteFileCache exposes compiled Black files under their .red alias.
        const expected = positive.endsWith(".black") ? [] : [positive];
        assert.deepEqual(paths.Filter(row.match), expected, row.match);
        assert.ok(!paths.Filter(row.match).includes(negative), row.match);
        assert.ok(Object.hasOwn(CjsCharacterLibraryConfiguration.kinds, row.kind));
    }
});
