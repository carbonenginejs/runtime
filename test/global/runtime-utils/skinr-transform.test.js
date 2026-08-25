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
        longitude: 37.5,
        latitude: -22.25,
        offsetU: 14.75,
        offsetV: -8.5,
        roll: 63,
        scale: 12.25,
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

    assertAngle(back.longitude, 37.5, "longitude");
    assertAngle(back.latitude, -22.25, "latitude");
    assertAngle(back.roll, 63, "roll");
    assertClose(back.offsetU, 14.75, "offsetU");
    assertClose(back.offsetV, -8.5, "offsetV");
    assertClose(back.scale, 12.25, "scale");
    assertClose(back.depth, 148.6, "depth");
});

test("the default placement round-trips, where a shortest-arc orbit does not", () =>
{
    // Longitude 0, latitude 0 is where the projector's -X points straight back
    // along +X, which is the antiparallel case of a shortest-arc rotation and so
    // its singularity. It is also where real designs cluster, which is what made
    // this worth a test of its own: the arc form lost three digits HERE, on the
    // commonest placement there is, and nowhere a casual check would look.
    const m = mat4.fromSkinr(new Float32Array(16), placement({ longitude: 0, latitude: 0 }));
    const back = mat4.getSkinr({}, m);

    assertAngle(back.longitude, 0, "longitude");
    assertAngle(back.latitude, 0, "latitude");
    assertAngle(back.roll, 63, "roll");
    assertClose(back.offsetU, 14.75, "offsetU");
    assertClose(back.offsetV, -8.5, "offsetV");
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
        placement({ offsetU: -60, offsetV: 95 })
    ));

    assertClose(b.depth, a.depth, "depth");
    assertAngle(b.longitude, a.longitude, "longitude");
    assertAngle(b.latitude, a.latitude, "latitude");
});

test("moving only the offsets moves the projector at a right angle to its axis", () =>
{
    const straight = mat4.fromSkinr(new Float32Array(16), placement({ offsetU: 0, offsetV: 0 }));
    const slid = mat4.fromSkinr(new Float32Array(16), placement({ offsetU: 30, offsetV: -45 }));

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
        longitude: 90, latitude: 30, offsetU: 0, offsetV: 0, depth
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
    const m = mat4.fromSkinr(new Float32Array(16), placement({ scale: 7.5 }));
    const scaling = mat4.getScaling(new Float32Array(3), m);

    assertClose(scaling[0], 7.5, "x");
    assertClose(scaling[1], 7.5, "y");
    assertClose(scaling[2], 7.5, "z");
});

test("a placement never builds a reflected frame", () =>
{
    // A well-formedness check on the pair, and the reason `getSkinr` can take
    // the magnitude of the scale without losing anything. Note that a design's
    // `mirrored` is a UV mirror rather than a reflected frame, so it has no
    // bearing on this and none on the matrix.
    for (const over of [ {}, { longitude: -140, latitude: 61 }, { roll: -95, scale: 0.25 } ])
    {
        const m = mat4.fromSkinr(new Float32Array(16), placement(over));

        assert.ok(
            mat4.determinant(m) > 0,
            `expected a right-handed frame, got determinant ${mat4.determinant(m)}`
        );
    }
});

test("at a pole the matrix still round-trips, though the angles need not", () =>
{
    // Straight up, a longitude names no direction and the two angles buy the
    // same turn, so the pair that comes back is not always the pair that went
    // in. What must hold is the MATRIX - and it is what a caller should compare,
    // because about one sampled design in seventy sits within a degree of this.
    for (const latitude of [ 90, -90, 89.999 ])
    {
        const m = mat4.fromSkinr(new Float32Array(16), placement({ latitude }));
        const again = mat4.fromSkinr(new Float32Array(16), mat4.getSkinr({}, m));

        for (let i = 0; i < 16; i++)
        {
            assertClose(again[i], m[i], `element ${i} at latitude ${latitude}`, 1e-2);
        }
    }
});

test("placements right around the orbit all round-trip", () =>
{
    for (let lon = -180; lon <= 180; lon += 15)
    {
        for (let lat = -75; lat <= 75; lat += 15)
        {
            const p = placement({ longitude: lon, latitude: lat });
            const back = mat4.getSkinr({}, mat4.fromSkinr(new Float32Array(16), p));

            assertAngle(back.longitude, lon, `longitude at ${lon}/${lat}`);
            assertAngle(back.latitude, lat, `latitude at ${lon}/${lat}`);
            assertClose(back.depth, p.depth, `depth at ${lon}/${lat}`);
            assertClose(back.offsetU, p.offsetU, `offsetU at ${lon}/${lat}`);
            assertClose(back.offsetV, p.offsetV, `offsetV at ${lon}/${lat}`);
        }
    }
});
