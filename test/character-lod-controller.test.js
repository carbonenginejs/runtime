import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterLodController,
    Tr2SkinnedObject
} from "../npm/dist/index.js";

class TestProxy
{
    constructor(name)
    {
        this.model = { name };
        this.selections = 0;
    }

    IsTemporary()
    {
        return false;
    }

    IsResident()
    {
        return true;
    }

    GetObject()
    {
        return this.model;
    }

    OnSelected()
    {
        this.selections++;
    }
}

test("drives verified whole-model LOD selection from projected size", () =>
{
    const object = new Tr2SkinnedObject();
    const high = new TestProxy("high");
    const medium = new TestProxy("medium");
    const low = new TestProxy("low");
    const controller = new CjsCharacterLodController();

    object.highDetailModel = high;
    object.mediumDetailModel = medium;
    object.lowDetailModel = low;

    const highSelection = controller.SelectProjectedSize(object, 501);
    assert.equal(highSelection.currentLod, 0);
    assert.equal(highSelection.visualModel, high.model);
    assert.equal(object.visualModel, high.model);

    const mediumSelection = controller.SelectProjectedSize(object, 500);
    assert.equal(mediumSelection.currentLod, 1);
    assert.equal(mediumSelection.visualModel, medium.model);

    const lowSelection = controller.SelectProjectedSize(object, 150);
    assert.equal(lowSelection.currentLod, 2);
    assert.equal(lowSelection.visualModel, low.model);
    assert.deepEqual([ high.selections, medium.selections, low.selections ], [ 1, 1, 1 ]);
});

test("selects primary and explicit crowd LODs without bypassing proxy fallback", () =>
{
    const object = new Tr2SkinnedObject();
    const high = new TestProxy("high");
    const medium = new TestProxy("medium");
    const low = new TestProxy("low");
    const controller = new CjsCharacterLodController();

    object.highDetailModel = high;
    object.mediumDetailModel = medium;
    object.lowDetailModel = low;

    const primary = controller.SelectPrimary(object);
    assert.equal(primary.requestedLod, 0);
    assert.equal(primary.currentLod, 0);
    assert.equal(primary.estimatedPixelDiameter, 501);
    assert.equal(primary.visualModel, high.model);

    const crowdMedium = controller.SelectLod(object, 1);
    assert.equal(crowdMedium.requestedLod, 1);
    assert.equal(crowdMedium.currentLod, 1);
    assert.equal(crowdMedium.visualModel, medium.model);

    const crowdLow = controller.SelectLod(object, 2);
    assert.equal(crowdLow.requestedLod, 2);
    assert.equal(crowdLow.currentLod, 2);
    assert.equal(crowdLow.visualModel, low.model);
});

test("explicit primary selection falls back through the native proxy order", () =>
{
    const object = new Tr2SkinnedObject();
    const medium = new TestProxy("medium");
    const low = new TestProxy("low");
    const controller = new CjsCharacterLodController();

    object.mediumDetailModel = medium;
    object.lowDetailModel = low;

    const result = controller.SelectPrimary(object);
    assert.equal(result.requestedLod, 0);
    assert.equal(result.currentLod, 1);
    assert.equal(result.visualModel, medium.model);
});

test("rejects invalid projected-size LOD inputs", () =>
{
    const controller = new CjsCharacterLodController();
    const object = new Tr2SkinnedObject();

    assert.throws(() => controller.SelectProjectedSize(null, 10), /requires a skinned-object/);
    assert.throws(() => controller.SelectProjectedSize(object, -1), /projected pixel diameter/);
    assert.throws(() => controller.SelectProjectedSize(object, Infinity), /projected pixel diameter/);
    assert.throws(() => controller.SelectLod(object, -1), /LOD must be 0, 1, or 2/);
    assert.throws(() => controller.SelectLod(object, 1.5), /LOD must be 0, 1, or 2/);
    assert.throws(
        () => controller.SelectProjectedSize(object, 10, { frustum: {} }),
        /frustum must expose a visibility/
    );
});
