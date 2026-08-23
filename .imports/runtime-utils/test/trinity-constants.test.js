import assert from "node:assert/strict";
import test from "node:test";

import { Tr2Lod as AggregateTr2Lod } from "../src/constants/index.js";
import { Tr2Lod } from "../src/constants/trinity.js";

test("Tr2Lod is shared through the runtime constants vocabulary", () =>
{
    assert.equal(AggregateTr2Lod, Tr2Lod);
    assert.deepEqual(Tr2Lod, {
        TR2_LOD_UNSPECIFIED: -1,
        TR2_LOD_LOW: 0,
        TR2_LOD_MEDIUM: 1,
        TR2_LOD_HIGH: 2,
        TR2_LOD_ULTRA: 3,
        TR2_LOD_COUNT: 4
    });
    assert.equal(Object.isFrozen(Tr2Lod), true);
});
