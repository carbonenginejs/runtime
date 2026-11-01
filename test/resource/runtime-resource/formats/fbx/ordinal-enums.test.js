import assert from "node:assert/strict";
import test from "node:test";
import { blueEnums } from "../../../../../npm/dist/blue/blue/enums/CjsBlueEnumRegistry.js";
import "../../../../../npm/dist/resource/formats/fbx/core/helpers.js";

test("FBX_ROTATION_ORDERS preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.fbx.FBX_ROTATION_ORDERS");
    const originalNames = ["XYZ","XZY","YZX","YXZ","ZXY","ZYX"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.fbx.FBX_ROTATION_ORDERS", index), name);
    }
});
