import assert from "node:assert/strict";
import test from "node:test";

import { CjsFileIndex, CjsFileIndexDiff } from "../../../src/tools/fileindex/index.js";

// Rows in the shape a real resfileindex uses: a content-addressed location for
// build resources, and a plain path for a local overlay row.
const ADDRESSED = "bc/bce582ba34593376_29ef35b9a16668fd0eabfcc9641633d0";
const ADDRESSED_V2 = "bc/bce582ba34593376_00000000000000000000000000000000";

const Index = rows => new CjsFileIndex(rows.map(([ logicalPath, location, checksum = null ]) =>
    ({ logicalPath, location, checksum })));

test("an unchanged address is proven unchanged", () =>
{
    const a = Index([ [ "res:/a.dds", ADDRESSED ] ]);
    const b = Index([ [ "res:/a.dds", ADDRESSED ] ]);

    const diff = CjsFileIndexDiff.between(a, b);

    assert.equal(diff.unchanged, 1);
    assert.deepEqual(diff.changed, []);
    assert.equal(CjsFileIndexDiff.mayHaveChanged(a, b, [ "res:/a.dds" ]), false);
});

test("a changed content hash is detected without reading anything", () =>
{
    const a = Index([ [ "res:/a.dds", ADDRESSED ] ]);
    const b = Index([ [ "res:/a.dds", ADDRESSED_V2 ] ]);

    assert.deepEqual(CjsFileIndexDiff.between(a, b).changed, [ "res:/a.dds" ]);
    assert.equal(CjsFileIndexDiff.mayHaveChanged(a, b, [ "res:/a.dds" ]), true);
});

test("added and removed paths are reported apart from changes", () =>
{
    const a = Index([ [ "res:/gone.dds", ADDRESSED ] ]);
    const b = Index([ [ "res:/new.dds", ADDRESSED ] ]);

    const diff = CjsFileIndexDiff.between(a, b);

    assert.deepEqual(diff.added, [ "res:/new.dds" ]);
    assert.deepEqual(diff.removed, [ "res:/gone.dds" ]);
    assert.deepEqual(diff.changed, []);
});

test("a plain overlay row is indeterminate, never unchanged", () =>
{
    // The failure this class exists to prevent: an identical-looking row whose
    // file may well have been edited.
    const a = Index([ [ "res:/a.dds", "overlay/a.dds" ] ]);
    const b = Index([ [ "res:/a.dds", "overlay/a.dds" ] ]);

    const diff = CjsFileIndexDiff.between(a, b);

    assert.deepEqual(diff.indeterminate, [ "res:/a.dds" ]);
    assert.equal(diff.unchanged, 0, "an unaddressable row must never count as unchanged");
    assert.equal(CjsFileIndexDiff.mayHaveChanged(a, b, [ "res:/a.dds" ]), true);
});

test("one addressable side is still not proof", () =>
{
    const a = Index([ [ "res:/a.dds", ADDRESSED ] ]);
    const b = Index([ [ "res:/a.dds", "overlay/a.dds" ] ]);

    assert.deepEqual(CjsFileIndexDiff.between(a, b).indeterminate, [ "res:/a.dds" ]);
    assert.equal(CjsFileIndexDiff.mayHaveChanged(a, b, [ "res:/a.dds" ]), true);
});

test("a checksum column counts when the location is not addressed", () =>
{
    const digest = "29ef35b9a16668fd0eabfcc9641633d0";
    const a = Index([ [ "res:/a.dds", "plain/a.dds", digest ] ]);
    const b = Index([ [ "res:/a.dds", "plain/a.dds", digest ] ]);
    const c = Index([ [ "res:/a.dds", "plain/a.dds", "0".repeat(32) ] ]);

    assert.equal(CjsFileIndexDiff.between(a, b).unchanged, 1);
    assert.deepEqual(CjsFileIndexDiff.between(a, c).changed, [ "res:/a.dds" ]);
});

test("a path absent from either side may have changed", () =>
{
    const a = Index([ [ "res:/a.dds", ADDRESSED ] ]);
    const b = Index([ [ "res:/b.dds", ADDRESSED ] ]);

    assert.equal(CjsFileIndexDiff.mayHaveChanged(a, b, [ "res:/a.dds" ]), true);
    assert.equal(CjsFileIndexDiff.mayHaveChanged(a, b, [ "res:/missing.dds" ]), true);
});

test("a consumer only rebuilds for paths it actually reads", () =>
{
    const a = Index([ [ "res:/mine.dds", ADDRESSED ], [ "res:/theirs.dds", ADDRESSED ] ]);
    const b = Index([ [ "res:/mine.dds", ADDRESSED ], [ "res:/theirs.dds", ADDRESSED_V2 ] ]);

    // The whole point: a build changed, but not for this consumer.
    assert.equal(CjsFileIndexDiff.mayHaveChanged(a, b, [ "res:/mine.dds" ]), false);
    assert.equal(CjsFileIndexDiff.mayHaveChanged(a, b, [ "res:/theirs.dds" ]), true);
});

test("comparability is reported per entry", () =>
{
    const index = Index([ [ "res:/a.dds", ADDRESSED ], [ "res:/b.dds", "overlay/b.dds" ] ]);
    const [ addressed, plain ] = index.entries;

    assert.equal(CjsFileIndexDiff.isComparable(addressed), true);
    assert.equal(CjsFileIndexDiff.isComparable(plain), false);
});
