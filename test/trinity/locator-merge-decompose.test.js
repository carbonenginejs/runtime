import test from "node:test";
import assert from "node:assert/strict";
import { EveSpaceObject2, EveLocatorSets, Locator } from "../../npm/dist/trinity/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";

// EnsureChildLocatorMerged decomposes each child locator with Carbon's
// Decompose (EveSpaceObject2.cpp:1932, math/src/Matrix.cpp:225-268).
function mergeThrough(childToObject)
{
    const ship = new EveSpaceObject2();
    const sets = new EveLocatorSets();
    sets.Set("child", [ new Locator() ]);
    ship.effectChildren.push({
        CollectOwnedLocatorSets(parent, out)
        {
            out.push({ sets, childToObject, owner: this });
        }
    });
    return ship.GetLocatorsForSet("child")[0];
}

test("merged child locators keep Carbon's positive scale under a mirrored child transform", () =>
{
    const locator = mergeThrough(mat4.fromScaling(mat4.create(), [ -2, 3, 4 ]));
    assert.deepEqual(Array.from(locator.scale), [ 2, 3, 4 ]);
});

test("a mirrored child locator carries Carbon's unnormalized rotation (CE-49)", () =>
{
    // The normalized basis is diag(-1, 1, 1): trace 2 takes RotationQuaternion's
    // first branch, giving w = sqrt(2) / 2 with no renormalization.
    const locator = mergeThrough(mat4.fromScaling(mat4.create(), [ -2, 3, 4 ]));
    const expected = [ 0, 0, 0, Math.SQRT2 / 2 ];
    locator.direction.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-6, `direction[${index}] ${value}`));
});

test("a proper child transform merges to its translation and unit rotation", () =>
{
    const childToObject = mat4.fromTranslation(mat4.create(), [ 1, 2, 3 ]);
    const locator = mergeThrough(childToObject);
    assert.deepEqual(Array.from(locator.position), [ 1, 2, 3 ]);
    assert.deepEqual(Array.from(locator.direction), [ 0, 0, 0, 1 ]);
    assert.deepEqual(Array.from(locator.scale), [ 1, 1, 1 ]);
});
