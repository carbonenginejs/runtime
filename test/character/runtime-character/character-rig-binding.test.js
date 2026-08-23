import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../../npm/dist/global/math/mat4.js";
import { CjsCharacterRigBinding } from "../../../npm/dist/character/index.js";

const IDENTITY_PALETTE = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0
];

function Translation(x, y, z)
{
    return mat4.fromTranslation(mat4.create(), [ x, y, z ]);
}

test("binds differently ordered rigs and packs exact native 3x4 palette entries", () =>
{
    const binding = new CjsCharacterRigBinding();
    const updater = {
        GetAnimationBoneList: () => [ "Root", "Head", "AnimationOnly" ],
        GetAnimationTransforms: () => [
            Translation(3, 4, 5),
            Translation(10, 20, 30),
            Translation(40, 50, 60)
        ]
    };
    const renderJoints = [
        { name: "Head", inverseWorldTransform: Translation(-2, -3, -4) },
        { name: "Root", inverseWorldTransform: mat4.create() },
        { name: "RenderOnly", inverseWorldTransform: mat4.create() }
    ];

    assert.equal(binding.Bind(renderJoints, updater.GetAnimationBoneList()), true);
    assert.deepEqual(Array.from(binding.GetAnimationToRenderMapping()), [ 1, 0, -1 ]);
    assert.deepEqual(Array.from(binding.GetPalette()), [
        ...IDENTITY_PALETTE,
        ...IDENTITY_PALETTE,
        ...IDENTITY_PALETTE
    ]);

    binding.Update(updater.GetAnimationTransforms());
    assert.deepEqual(Array.from(binding.GetPalette()), [
        1, 0, 0, 3,
        0, 1, 0, 4,
        0, 0, 1, 5,
        1, 0, 0, 8,
        0, 1, 0, 17,
        0, 0, 1, 26,
        ...IDENTITY_PALETTE
    ]);

    binding.Update(null);
    assert.deepEqual(Array.from(binding.GetPalette()), [
        ...IDENTITY_PALETTE,
        ...IDENTITY_PALETTE,
        ...IDENTITY_PALETTE
    ]);
});

test("multiplies animation world transforms before inverse bind transforms", () =>
{
    const binding = new CjsCharacterRigBinding();
    const world = mat4.fromZRotation(mat4.create(), Math.PI / 2);

    binding.Bind([
        { name: "Head", inverseWorldTransform: Translation(1, 0, 0) }
    ], [ "Head" ]);
    binding.Update([ world ]);

    const palette = binding.GetPalette();
    assert.ok(Math.abs(palette[3]) < 1e-6);
    assert.ok(Math.abs(palette[7] - 1) < 1e-6);
    assert.ok(Math.abs(palette[0]) < 1e-6);
    // Carbon Float4x3 packs the shared-layout COLUMN stride: slot 1 holds
    // v[4] = -sin(+90 deg) = -1 (a row-stride pack would put +1 here).
    assert.ok(Math.abs(palette[1] + 1) < 1e-6);
});

test("tracks only real rig changes and returns detached snapshots", () =>
{
    const binding = new CjsCharacterRigBinding();
    const renderJoints = [ { name: "Root", inverseWorldTransform: mat4.create() } ];

    assert.equal(binding.GetRevision(), 0);
    assert.equal(binding.Bind(renderJoints, [ "Root" ]), true);
    assert.equal(binding.GetRevision(), 1);
    assert.equal(binding.Bind(renderJoints, [ "Root" ]), false);
    assert.equal(binding.GetRevision(), 1);

    const mapping = binding.GetAnimationToRenderMapping();
    const palette = binding.GetPalette();
    mapping[0] = 99;
    palette[0] = 99;
    assert.deepEqual(Array.from(binding.GetAnimationToRenderMapping()), [ 0 ]);
    assert.deepEqual(Array.from(binding.GetPalette()), IDENTITY_PALETTE);

    assert.equal(binding.Bind(renderJoints, [ "Other" ]), true);
    assert.equal(binding.GetRevision(), 2);
    assert.equal(binding.Reset(), true);
    assert.equal(binding.GetRevision(), 3);
    assert.equal(binding.Reset(), false);
    assert.equal(binding.GetRevision(), 3);
    assert.deepEqual(Array.from(binding.GetPalette()), []);
});

test("rejects ambiguous, malformed, mismatched, and overflowing rig input", () =>
{
    const binding = new CjsCharacterRigBinding();
    const identity = mat4.create();

    assert.throws(() => binding.Update([]), /must be bound/u);
    assert.throws(() => binding.Bind([
        { name: "Root", inverseWorldTransform: identity },
        { name: "Root", inverseWorldTransform: identity }
    ], [ "Root" ]), /duplicate bone name "Root"/u);
    assert.throws(() => binding.Bind([
        { name: "Root", inverseWorldTransform: identity }
    ], [ "Root", "Root" ]), /duplicate bone name "Root"/u);
    assert.throws(() => binding.Bind([
        { name: "", inverseWorldTransform: identity }
    ], []), /non-empty string/u);
    assert.throws(() => binding.Bind([
        { name: "Root", inverseWorldTransform: [ 1, 2, 3 ] }
    ], [ "Root" ]), /16 components/u);

    const invalid = mat4.create();
    invalid[2] = Number.NaN;
    assert.throws(() => binding.Bind([
        { name: "Root", inverseWorldTransform: invalid }
    ], [ "Root" ]), /finite components/u);

    const tooLarge = Array.from(mat4.create());
    tooLarge[0] = Number.MAX_VALUE;
    assert.throws(() => binding.Bind([
        { name: "Root", inverseWorldTransform: tooLarge }
    ], [ "Root" ]), /float32 range/u);

    binding.Bind([ { name: "Root", inverseWorldTransform: identity } ], [ "Root" ]);
    assert.throws(() => binding.Update([]), /requires 1 animation transforms/u);
    assert.throws(() => binding.Update([ [ 1, 2 ] ]), /16 components/u);

    const huge = Array.from(mat4.create());
    huge[0] = Number.MAX_VALUE;
    assert.throws(() => binding.Update([ huge ]), /float32 range/u);
});
