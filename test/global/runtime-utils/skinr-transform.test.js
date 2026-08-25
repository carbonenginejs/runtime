import assert from "node:assert/strict";
import test from "node:test";

import * as mat4 from "@carbonenginejs/runtime/math/mat4";

/**
 * `mat4.fromSkinr` and `mat4.getSkinr`, which carry a SKINR pattern placement
 * between the six numbers the game's panel edits and the matrix an engine draws.
 *
 * The numbers these are checked against were measured over 3964 player-authored
 * placements harvested from published designs, not derived. Where a test says a
 * thing is always so, that is what the corpus showed.
 *
 * The pool inside `mat4` is Float32, so the tolerances here are a float32
 * pipeline's rather than a float64 one's. That is the library's convention and
 * not a property of this maths: the same steps in double precision round-trip to
 * about 1e-8.
 */

const EPSILON = 1e-3;

/** Degrees, brought into -180..180 so that -312.9 and 47.1 compare equal. */
function wrap(degrees)
{
    let d = degrees % 360;

    if (d > 180) d -= 360;
    if (d < -180) d += 360;

    return d;
}

function assertAngle(actual, expected, what)
{
    const d = Math.abs(wrap(actual - expected));

    assert.ok(d < 0.01, `${what}: expected ${expected}, got ${actual}`);
}

function assertClose(actual, expected, what, epsilon = EPSILON)
{
    const scale = Math.max(1, Math.abs(expected));

    assert.ok(
        Math.abs(actual - expected) / scale < epsilon,
        `${what}: expected ${expected}, got ${actual}`
    );
}

/** A placement in the middle of every range, so nothing under test is zero. */
function placement(over = {})
{
    return {
        orbitA: 37.5,
        orbitB: -22.25,
        offsetA: 14.75,
        offsetB: -8.5,
        rotationA: 63,
        scaleA: 12.25,
        depth: 148.6,
        ...over
    };
}

/** Where the projector sits, out of a matrix. */
function translation(m)
{
    return [ m[12], m[13], m[14] ];
}

test("a placement survives a trip through a matrix", () =>
{
    const m = mat4.fromSkinr(new Float32Array(16), placement());
    const back = mat4.getSkinr({}, m);

    assertAngle(back.orbitA, 37.5, "orbitA");
    assertAngle(back.orbitB, -22.25, "orbitB");
    assertAngle(back.rotationA, 63, "rotationA");
    assertClose(back.offsetA, 14.75, "offsetA");
    assertClose(back.offsetB, -8.5, "offsetB");
    assertClose(back.scaleA, 12.25, "scaleA");
    assertClose(back.depth, 148.6, "depth");
});

test("the default placement round-trips, where a shortest-arc orbit does not", () =>
{
    // Longitude 0, latitude 0 is where the projector's -X points straight back
    // along +X, which is the antiparallel case of a shortest-arc rotation and so
    // its singularity. It is also where real designs cluster, which is what made
    // this worth a test of its own: the arc form lost three digits HERE, on the
    // commonest placement there is, and nowhere a casual check would look.
    const m = mat4.fromSkinr(new Float32Array(16), placement({ orbitA: 0, orbitB: 0 }));
    const back = mat4.getSkinr({}, m);

    assertAngle(back.orbitA, 0, "orbitA");
    assertAngle(back.orbitB, 0, "orbitB");
    assertAngle(back.rotationA, 63, "rotationA");
    assertClose(back.offsetA, 14.75, "offsetA");
    assertClose(back.offsetB, -8.5, "offsetB");
    assertClose(back.depth, 148.6, "depth");
});

test("the offsets slide a flat plane, and leave the depth alone", () =>
{
    // The finding this encodes: on all 35 hulls with enough samples to check,
    // designs whose offsets differ share a depth to the last decimal. The
    // projector slides across its own plane at a fixed standoff rather than
    // following the hull's shape.
    const a = mat4.getSkinr({}, mat4.fromSkinr(new Float32Array(16), placement()));
    const b = mat4.getSkinr({}, mat4.fromSkinr(
        new Float32Array(16),
        placement({ offsetA: -60, offsetB: 95 })
    ));

    assertClose(b.depth, a.depth, "depth");
    assertAngle(b.orbitA, a.orbitA, "orbitA");
    assertAngle(b.orbitB, a.orbitB, "orbitB");
});

test("moving only the offsets moves the projector at a right angle to its axis", () =>
{
    const straight = mat4.fromSkinr(new Float32Array(16), placement({ offsetA: 0, offsetB: 0 }));
    const slid = mat4.fromSkinr(new Float32Array(16), placement({ offsetA: 30, offsetB: -45 }));

    const axis = translation(straight);
    const moved = translation(slid).map((n, i) => n - axis[i]);
    const length = Math.hypot(...axis) * Math.hypot(...moved);
    const dot = axis[0] * moved[0] + axis[1] * moved[1] + axis[2] * moved[2];

    assert.ok(
        Math.abs(dot / length) < 1e-3,
        `the offset should move across the axis, not along it (cosine ${dot / length})`
    );
});

test("the orbit alone puts the projector where its longitude and latitude say", () =>
{
    // With no offsets, the projector sits at `depth` along the direction the two
    // orbital angles name - longitude about the vertical, latitude up from the
    // horizontal - and nowhere else.
    const depth = 100;
    const m = mat4.fromSkinr(new Float32Array(16), placement({
        orbitA: 90, orbitB: 30, offsetA: 0, offsetB: 0, depth
    }));

    const [ x, y, z ] = translation(m);
    const lat = 30 * Math.PI / 180;
    const lon = 90 * Math.PI / 180;

    assertClose(x, depth * Math.cos(lat) * Math.cos(lon), "x");
    assertClose(y, depth * Math.sin(lat), "y");
    assertClose(z, depth * Math.cos(lat) * Math.sin(lon), "z");
});

test("the scale is uniform, as every sampled design's is", () =>
{
    const m = mat4.fromSkinr(new Float32Array(16), placement({ scaleA: 7.5 }));
    const scaling = mat4.getScaling(new Float32Array(3), m);

    assertClose(scaling[0], 7.5, "x");
    assertClose(scaling[1], 7.5, "y");
    assertClose(scaling[2], 7.5, "z");
});

test("a reflected frame is reported rather than folded into the rotation", () =>
{
    // A mirrored placement cannot be a rotation and a positive scale. Reporting
    // it is what stops a caller producing a placement that reads as ordinary and
    // draws inside out.
    const m = mat4.fromSkinr(new Float32Array(16), placement());

    m[0] = -m[0];
    m[1] = -m[1];
    m[2] = -m[2];

    assert.equal(mat4.getSkinr({}, m).mirrored, true);
    assert.equal(mat4.getSkinr({}, mat4.fromSkinr(new Float32Array(16), placement())).mirrored, false);
});

test("the scale comes back positive even from a reflected frame", () =>
{
    const m = mat4.fromSkinr(new Float32Array(16), placement({ scaleA: 9 }));

    m[0] = -m[0];
    m[1] = -m[1];
    m[2] = -m[2];

    assertClose(mat4.getSkinr({}, m).scaleA, 9, "scaleA");
});

test("placements right around the orbit all round-trip", () =>
{
    for (let lon = -180; lon <= 180; lon += 15)
    {
        for (let lat = -75; lat <= 75; lat += 15)
        {
            const p = placement({ orbitA: lon, orbitB: lat });
            const back = mat4.getSkinr({}, mat4.fromSkinr(new Float32Array(16), p));

            assertAngle(back.orbitA, lon, `orbitA at ${lon}/${lat}`);
            assertAngle(back.orbitB, lat, `orbitB at ${lon}/${lat}`);
            assertClose(back.depth, p.depth, `depth at ${lon}/${lat}`);
            assertClose(back.offsetA, p.offsetA, `offsetA at ${lon}/${lat}`);
            assertClose(back.offsetB, p.offsetB, `offsetB at ${lon}/${lat}`);
        }
    }
});
