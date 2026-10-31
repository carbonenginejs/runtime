import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CjsPaperDollDefinition } from "../../../npm/dist/character/index.js";

// Expected values recorded from Graphene's tier helpers (resourceListing.js SplitTier, TierOrder,
// PickTier and TierCandidates at graphene 0294b0c) over map files of build 3662168's female
// paper-doll folders. The statics must answer exactly as those did, for every quality.
const expected = JSON.parse(readFileSync(new URL("./fixtures/paper-doll-texture-tiers.json", import.meta.url), "utf8"));
const QUALITIES = [ "4k", "2k", "512", "256" ];

/** Runs `body` with the texture quality set, restoring the setting afterwards. */
function WithQuality(quality, body)
{
    const previous = CjsPaperDollDefinition.characterTextureQuality;
    CjsPaperDollDefinition.characterTextureQuality = quality;
    try { body(); }
    finally { CjsPaperDollDefinition.characterTextureQuality = previous; }
}

test("splitTier answers the stem and tier suffix as Graphene's SplitTier did", () =>
{
    for (const path of expected.paths) assert.deepEqual(CjsPaperDollDefinition.splitTier(path), expected.splitTier[path], path);
});

test("tierOrder answers each quality's fallback order, by the setting and explicitly", () =>
{
    for (const quality of QUALITIES) WithQuality(quality, () =>
    {
        const entry = expected.byQuality[quality];
        assert.deepEqual(CjsPaperDollDefinition.tierOrder(), entry.tierOrder, quality);
        for (const other of QUALITIES) assert.deepEqual(CjsPaperDollDefinition.tierOrder(other), entry.tierOrderExplicit[other], quality + " " + other);
    });
});

test("tierOrder rejects a quality the setting does not offer, with the same message", () =>
{
    assert.throws(() => CjsPaperDollDefinition.tierOrder("8k"), { message: expected.unknownQualityError });
});

test("pickTier picks the same file for every listed folder at every quality", () =>
{
    for (const quality of QUALITIES) WithQuality(quality, () =>
    {
        for (const [ name, files ] of Object.entries(expected.lists))
            assert.deepEqual(expected.paths.map(path => CjsPaperDollDefinition.pickTier(path, files)), expected.byQuality[quality].pickTier[name], quality + " " + name);
    });
});

test("tierCandidates answers the same matches for every listed folder at every quality", () =>
{
    for (const quality of QUALITIES) WithQuality(quality, () =>
    {
        for (const [ name, files ] of Object.entries(expected.lists))
            assert.deepEqual(expected.endings.map(ending => CjsPaperDollDefinition.tierCandidates(files, ending)), expected.byQuality[quality].tierCandidates[name], quality + " " + name);
    });
});
