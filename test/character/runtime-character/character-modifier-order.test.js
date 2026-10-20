import assert from "node:assert/strict";
import test from "node:test";
import { CjsCharacterModifierOrder } from "../../../npm/dist/character/index.js";

test("aggregates metadata rules and applies native endpoint swaps", () =>
{
    const rules = CjsCharacterModifierOrder.resolveRules([
        { hidesBootShin: true, swapTops: false },
        null,
        { swapTops: true, swapSocks: true }
    ]);

    assert.deepEqual(rules, {
        forcesLooseTop: false,
        hidesBootShin: true,
        swapTops: true,
        swapBottom: false,
        swapSocks: true
    });

    const categories = CjsCharacterModifierOrder.resolveCategories(rules);

    assert.equal(categories[16], "topunderwear");
    assert.equal(categories[19], "topunderweartucked");
    assert.equal(categories[17], "socks");
    assert.equal(categories[20], "sockstucked");
    assert.equal(categories[22], "feet");
    assert.equal(categories[27], "feettucked");
    assert.equal(categories[23], "bottomouter");
    assert.equal(categories[26], "bottomoutertucked");
    assert.equal(categories[24], "topmiddle");
    assert.equal(categories[25], "toptight");
});

test("computes native sort keys and preserves equal-key inventory order", () =>
{
    const values = [
        { id: "skin-a", category: "skin" },
        { id: "makeup-eyes", category: "makeup", group: "eyes" },
        { id: "unknown", category: "not-authored" },
        { id: "skin-b", category: "skin" },
        { id: "makeup-implants", category: "makeup", group: "implants" },
        { id: "makeup-unknown", category: "makeup", group: "other" }
    ];

    assert.equal(CjsCharacterModifierOrder.getSortKey("not-authored"), -1);
    assert.equal(CjsCharacterModifierOrder.getSortKey("skin"), 999);
    assert.equal(CjsCharacterModifierOrder.getSortKey("makeup", "implants"), 8000);
    assert.equal(CjsCharacterModifierOrder.getSortKey("makeup", "other"), 8999);
    assert.deepEqual(
        CjsCharacterModifierOrder.sort(values).map(value => value.id),
        [
            "unknown",
            "skin-a",
            "skin-b",
            "makeup-implants",
            "makeup-eyes",
            "makeup-unknown"
        ]
    );
    assert.equal(values[0].id, "skin-a");
});
