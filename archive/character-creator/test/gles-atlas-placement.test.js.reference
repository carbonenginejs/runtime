import assert from "node:assert/strict";
import test from "node:test";

import { CjsCharacterGlesAtlasPlacement } from "../../../src/character/gles/CjsCharacterGlesAtlasPlacement.js";

test("reads authored cropped atlas metadata into detached placement values", () =>
{
    const metadata = CjsCharacterGlesAtlasPlacement.ReadLibraryMetadata({
        recordID: "res:/character/diffuse.dds",
        width: 1024,
        height: 512,
        hasPlacementMetadata: true,
        offsetX: 0.25,
        offsetY: 0.5,
        extentX: 0.5,
        extentY: 0.25,
        hasOffsetMetadata: true,
        sourcePath: "res:/character/diffuse.dds",
        placementEncoding: "normalized",
        placementPolicy: "legacy-opengl",
        placementStatus: "authored"
    });

    assert.deepEqual(CjsCharacterGlesAtlasPlacement.GetTargetSize(metadata), [ 2048, 2048 ]);
    assert.deepEqual(CjsCharacterGlesAtlasPlacement.GetPlacement(metadata), [ 0.25, 0.5, 0.5, 0.25 ]);
    assert.deepEqual(CjsCharacterGlesAtlasPlacement.GetBounds(
        CjsCharacterGlesAtlasPlacement.GetPlacement(metadata)
    ), [ 0.25, 0.5, 0.75, 0.75 ]);
    assert.deepEqual(CjsCharacterGlesAtlasPlacement.GetViewport(
        [ 2048, 2048 ],
        CjsCharacterGlesAtlasPlacement.GetPlacement(metadata)
    ), [ 512, 1024, 1024, 512 ]);
    assert.deepEqual(CjsCharacterGlesAtlasPlacement.GetCroppedTextureTransform(metadata), [
        -0.5,
        -2,
        1.5,
        2
    ]);
    assert.deepEqual(CjsCharacterGlesAtlasPlacement.DescribeUvDecision(metadata), {
        status: "experimental-policy",
        rule: "legacy-opengl-normalized-png-placement-v1",
        metadata: {
            width: 1024,
            height: 512,
            offset: [ 0.25, 0.5 ],
            extent: [ 0.5, 0.25 ],
            hasPlacementMetadata: true,
            targetSize: [ 2048, 2048 ]
        },
        sourceBounds: [ 0.25, 0.5, 0.75, 0.75 ],
        destinationViewport: [ 512, 1024, 1024, 512 ],
        correctness: "unverified"
    });
});

test("uses an unplaced source as a complete atlas", () =>
{
    const metadata = CjsCharacterGlesAtlasPlacement.ReadLibraryMetadata({
        recordID: "complete",
        width: 512,
        height: 1024
    });

    assert.deepEqual(CjsCharacterGlesAtlasPlacement.GetTargetSize(metadata), [ 512, 1024 ]);
    assert.deepEqual(CjsCharacterGlesAtlasPlacement.GetPlacement(metadata), [ 0, 0, 1, 1 ]);
    assert.equal(CjsCharacterGlesAtlasPlacement.GetCroppedTextureTransform(metadata), null);
});

test("intersects placements and rejects incompatible atlas contracts", () =>
{
    assert.deepEqual(
        CjsCharacterGlesAtlasPlacement.Intersect([ 0, 0, 0.5, 1 ], [ 0.25, 0.25, 0.5, 0.5 ]),
        [ 0.25, 0.25, 0.25, 0.5 ]
    );
    assert.equal(
        CjsCharacterGlesAtlasPlacement.Intersect([ 0, 0, 0.5, 1 ], [ 0.5, 0, 0.5, 1 ]),
        null
    );
    assert.deepEqual(
        CjsCharacterGlesAtlasPlacement.RequireCompatibleTargetAspect(
            "res:/target",
            [ 2048, 1024 ],
            [ 1024, 512 ]
        ),
        [ 2048, 1024 ]
    );
    assert.throws(
        () => CjsCharacterGlesAtlasPlacement.RequireCompatibleTargetAspect(
            "res:/target",
            [ 1024, 1024 ],
            [ 1024, 512 ]
        ),
        /aspect mismatch/u
    );
    assert.throws(
        () => CjsCharacterGlesAtlasPlacement.ReadLibraryMetadata({
            recordID: "bad",
            width: 0,
            height: 32
        }),
        /invalid texture metadata/u
    );
});
