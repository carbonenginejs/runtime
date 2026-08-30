import assert from "node:assert/strict";
import test from "node:test";
import {
    normalizedLerpQuaternion,
    quaternionSegmentMidpointTick,
    quaternionSegmentNeedsSubdivision
} from "../../../../../src/resource/formats/cmf/core/utils/quaternion.js";

test("normalizes quaternion interpolation onto the local hemisphere", () =>
{
    assert.deepEqual(normalizedLerpQuaternion([ 0, 0, 0, 1 ], [ 0, 0, 0, -1 ], 0.5), [ 0, 0, 0, 1 ]);
});

test("samples unique interior ticks across small and extreme safe spans", () =>
{
    const collect = (start, end) =>
    {
        const ticks = [];
        assert.equal(quaternionSegmentNeedsSubdivision(start, end, (tick) =>
        {
            ticks.push(tick);
            return 0;
        }), false);
        return ticks;
    };

    assert.deepEqual(collect(0, 1), []);
    assert.deepEqual(collect(0, 2), [ 1 ]);
    assert.deepEqual(collect(0, 3), [ 1, 2 ]);
    assert.deepEqual(collect(Number.MAX_SAFE_INTEGER - 3, Number.MAX_SAFE_INTEGER), [
        Number.MAX_SAFE_INTEGER - 2,
        Number.MAX_SAFE_INTEGER - 1
    ]);
    assert.equal(
        quaternionSegmentMidpointTick(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
        0
    );
});
