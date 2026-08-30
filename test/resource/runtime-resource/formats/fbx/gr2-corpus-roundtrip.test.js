import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { CjsGr2Format } from "../../../../../src/resource/formats/gr2/index.js";
import { CjsFbxFormat } from "../../../../../src/resource/formats/fbx/index.js";
import { quaternionAngularDifference, normalizeQuaternion } from "../../../../../src/resource/formats/cmf/core/utils/quaternion.js";
import { totalIndexCount } from "../../../../../src/resource/formats/cmf/core/utils/indices.js";
import { CjsGrannyCurves } from "../../../../../src/trinity/curves/track/CjsGrannyCurves.js";

/**
 * Optional real-file proof for the EVE FAUX and tactical-destroyer geometry
 * families. Game bytes are never committed. Fetch these exact paths through
 * tools-core at build 3484357 and point FBX_GR2_CORPUS_DIR at the directory:
 *
 *   FBX_GR2_CORPUS_DIR=path/to/gr2 node --test test/resource/runtime-resource/formats/fbx/gr2-corpus-roundtrip.test.js
 */

const TICKS_PER_SECOND = 46186158000;
const EXPECTED = new Map(Object.entries({
    "ade3_t3.gr2": [ "ce31adc41c1ac4eef2c21bb0b1742171681034c7aaf4a74aae57ebde1fe868db", "res:/dx9/model/ship/amarr/destroyer/ade3/ade3_t3.gr2" ],
    "ade3_t3_lowdetail.gr2": [ "fc5363250e3e081ab690a5df8e1ff20a2f49f27ad81d6daa33a3ef2a11a85dff", "res:/dx9/model/ship/amarr/destroyer/ade3/ade3_t3_lowdetail.gr2" ],
    "afaux1_t1.gr2": [ "68cadd21095644e1e0194368a2b1a5662067951472d9fd2cc9847f17e171e9e7", "res:/dx9/model/ship/amarr/forceauxillary/afaux1/afaux1_t1.gr2" ],
    "afaux1_t1_lowdetail.gr2": [ "32dffea2ad3c2f68425cf1986b6e5b8ab8ece10a638f7a8164df8351d8ec21db", "res:/dx9/model/ship/amarr/forceauxillary/afaux1/afaux1_t1_lowdetail.gr2" ],
    "cde3_t3.gr2": [ "81166931c85ce8975577c97b147703af99877cd7f064240b0fb22d7dfd3a974d", "res:/dx9/model/ship/caldari/destroyer/cde3/cde3_t3.gr2" ],
    "cde3_t3_lowdetail.gr2": [ "dbce835b01b30480d15f1f208f4172f995a95b003c4693e21f450c7d0c12d135", "res:/dx9/model/ship/caldari/destroyer/cde3/cde3_t3_lowdetail.gr2" ],
    "cde3_xxi.gr2": [ "63a1772d331d458c1f456960b15ad4de08ca6ed1bd998af7a9d86c989455e905", "res:/dx9/model/ship/caldari/destroyer/cde3/cde3_xxi.gr2" ],
    "cde3_xxi_lowdetail.gr2": [ "d988851f0eb62e46e185147327e5906081da3f77d24397861d9dc751b0155e05", "res:/dx9/model/ship/caldari/destroyer/cde3/cde3_xxi_lowdetail.gr2" ],
    "cfaux1_t1.gr2": [ "0decad596b4b0ed21c95f70ee66d62a359cc2df83b10670c9ab6412cb5bd8596", "res:/dx9/model/ship/caldari/forceauxillary/cfaux1/cfaux1_t1.gr2" ],
    "cfaux1_t1_lowdetail.gr2": [ "0b3e8105ee9b33016b076d0db71dcf0a2349fcb9401f2b5b5bf9654ebc53d24a", "res:/dx9/model/ship/caldari/forceauxillary/cfaux1/cfaux1_t1_lowdetail.gr2" ],
    "gde3_t3.gr2": [ "dddc3e9eb34abfe785a4529f288e392e69e2bc8eb9eb99a2f4d886e543765483", "res:/dx9/model/ship/gallente/destroyer/gde3/gde3_t3.gr2" ],
    "gde3_t3_lowdetail.gr2": [ "5f11e75b866567ba14c008069f61c335738e98680677436a0aafb305fac90bfc", "res:/dx9/model/ship/gallente/destroyer/gde3/gde3_t3_lowdetail.gr2" ],
    "gfaux1_t1.gr2": [ "cda29ca4d5abc1f8b9efd2e6e1b7cdbd737917b118c67d4183f4c236ad2192a4", "res:/dx9/model/ship/gallente/forceauxillary/gfaux1/gfaux1_t1.gr2" ],
    "gfaux1_t1_lowdetail.gr2": [ "f9b0a289728ea29d2b5dd47a9e4f599f33589b1bcabbb302aae1d98aaad40e10", "res:/dx9/model/ship/gallente/forceauxillary/gfaux1/gfaux1_t1_lowdetail.gr2" ],
    "mde3_t3.gr2": [ "5cae1a039c579da77e1276fd084cc74bde8fea45ffd549a332c00be3b5287337", "res:/dx9/model/ship/minmatar/destroyer/mde3/mde3_t3.gr2" ],
    "mde3_t3_lowdetail.gr2": [ "8fe188cf2488881971280fdd2136f7e61f625e9c82cffa8374ea864698e27bca", "res:/dx9/model/ship/minmatar/destroyer/mde3/mde3_t3_lowdetail.gr2" ],
    "mfaux1_t1.gr2": [ "daee4d4015a997a465c9d336a5f06b80fce94272777ec28f6f5681687e1df46f", "res:/dx9/model/ship/minmatar/forceauxillary/mfaux1/mfaux1_t1.gr2" ],
    "mfaux1_t1_lowdetail.gr2": [ "0c9a5bc3212efa03f48111b8fe24fae7647761d5530998fa1a325487fb873740", "res:/dx9/model/ship/minmatar/forceauxillary/mfaux1/mfaux1_t1_lowdetail.gr2" ]
}));

const CHANNELS = Object.freeze({
    position: 3,
    normal: 3,
    tangent: 3,
    binormal: 3,
    texcoord0: 2,
    texcoord1: 2,
    color0: 4
});

class ValueNode
{
    SetValues(values)
    {
        Object.assign(this, values);
        return this;
    }
}

async function* walk(dir)
{
    for (const entry of await readdir(dir, { withFileTypes: true }))
    {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(entryPath);
        else if (entry.name.toLowerCase().endsWith(".gr2")) yield entryPath;
    }
}

function vertexData(mesh)
{
    return mesh.vertex ?? mesh.lods?.[0]?.vertex ?? {};
}

function indexGroups(mesh)
{
    return mesh.indices ?? mesh.lods?.[0]?.indices ?? [];
}

function flattenedFaces(mesh)
{
    return indexGroups(mesh).flatMap(group => group.faces ?? []);
}

function expandChannel(mesh, name, width)
{
    const values = vertexData(mesh)[name] ?? [];
    if (!values.length) return [];
    const expanded = [];
    for (const vertexIndex of flattenedFaces(mesh))
    {
        const offset = vertexIndex * width;
        for (let component = 0; component < width; component++) expanded.push(values[offset + component]);
    }
    return expanded;
}

function assertArrayClose(actual, expected, tolerance, label, metrics)
{
    assert.equal(actual.length, expected.length, `${label} length`);
    for (let index = 0; index < expected.length; index++)
    {
        const error = Math.abs(actual[index] - expected[index]);
        metrics.geometry = Math.max(metrics.geometry, error);
        assert.ok(
            error <= tolerance * Math.max(1, Math.abs(expected[index])),
            `${label}[${index}] differs by ${error}: ${actual[index]} != ${expected[index]}`
        );
    }
}

function assertDirectionsClose(actual, expected, label, metrics)
{
    assert.equal(actual.length, expected.length, `${label} length`);
    assert.equal(actual.length % 3, 0, `${label} contains vec3 values`);
    for (let index = 0; index < expected.length; index += 3)
    {
        const
            aLength = Math.hypot(actual[index], actual[index + 1], actual[index + 2]),
            bLength = Math.hypot(expected[index], expected[index + 1], expected[index + 2]);
        if (aLength <= 1e-8 || bLength <= 1e-8)
        {
            assert.ok(aLength <= 1e-8 && bLength <= 1e-8, `${label}[${index / 3}] zero direction mismatch`);
            continue;
        }
        const dot = Math.min(1, Math.max(-1, (
            actual[index] * expected[index] +
            actual[index + 1] * expected[index + 1] +
            actual[index + 2] * expected[index + 2]
        ) / (aLength * bLength)));
        const error = Math.acos(dot);
        metrics.direction = Math.max(metrics.direction, error);
        assert.ok(error <= 3e-4, `${label}[${index / 3}] differs by ${error} radians`);
    }
}

function influences(mesh, vertexIndex)
{
    const
        vertex = vertexData(mesh),
        indices = vertex.blendIndice ?? [],
        weights = vertex.blendWeight ?? [],
        bindings = mesh.boneBindings ?? [],
        merged = new Map();
    if (!indices.length && !weights.length) return [];

    for (let component = 0; component < 4; component++)
    {
        const
            offset = vertexIndex * 4 + component,
            weight = weights[offset] ?? 0;
        if (!(weight > 1e-8)) continue;
        const name = bindings[indices[offset]]?.name;
        assert.equal(typeof name, "string", `skin influence ${indices[offset]} has no binding name`);
        merged.set(name, (merged.get(name) ?? 0) + weight);
    }
    return [ ...merged ].sort(([ a ], [ b ]) => a.localeCompare(b));
}

function compareSkin(source, result, label, metrics)
{
    assert.equal(result.skeleton, source.skeleton, `${label} skeleton index`);
    const sourceFaces = flattenedFaces(source);
    const resultFaces = flattenedFaces(result);
    assert.equal(resultFaces.length, sourceFaces.length, `${label} skin corner count`);
    for (let corner = 0; corner < sourceFaces.length; corner++)
    {
        const
            a = influences(source, sourceFaces[corner]),
            b = influences(result, resultFaces[corner]);
        assert.deepEqual(b.map(([ name ]) => name), a.map(([ name ]) => name), `${label} corner ${corner} bones`);
        for (let influence = 0; influence < a.length; influence++)
        {
            const error = Math.abs(a[influence][1] - b[influence][1]);
            metrics.skin = Math.max(metrics.skin, error);
            assert.ok(error <= 1e-6, `${label} corner ${corner} weight differs by ${error}`);
        }
    }
}

function compareMorphTargets(source, result, label, metrics)
{
    const
        sourceTargets = source.morphTargets?.targets ?? [],
        resultTargets = result.morphTargets?.targets ?? [];
    assert.deepEqual(resultTargets.map(target => target.name), sourceTargets.map(target => target.name), `${label} morph names`);
    for (let targetIndex = 0; targetIndex < sourceTargets.length; targetIndex++)
    {
        const
            sourceVertex = source.lods?.[0]?.morphTargets?.[targetIndex]?.vertex ?? {},
            resultVertex = result.lods?.[0]?.morphTargets?.[targetIndex]?.vertex ?? {},
            sourceFaces = flattenedFaces(source),
            resultFaces = flattenedFaces(result);
        for (const [ channel, width ] of Object.entries(CHANNELS))
        {
            const sourceValues = sourceVertex[channel] ?? [];
            const resultValues = resultVertex[channel] ?? [];
            if (!sourceValues.length && !resultValues.length) continue;
            const expand = (values, faces) => faces.flatMap(vertexIndex =>
                values.slice(vertexIndex * width, vertexIndex * width + width));
            assertArrayClose(
                expand(resultValues, resultFaces),
                expand(sourceValues, sourceFaces),
                2e-5,
                `${label} morph ${targetIndex} ${channel}`,
                metrics
            );
        }
    }
}

function compareMeshes(source, result, metrics)
{
    assert.equal(result.meshes.length, source.meshes.length, "mesh count");
    for (let meshIndex = 0; meshIndex < source.meshes.length; meshIndex++)
    {
        const
            a = source.meshes[meshIndex],
            b = result.meshes[meshIndex],
            label = `mesh ${meshIndex} (${a.name})`,
            aGroups = indexGroups(a),
            bGroups = indexGroups(b);
        assert.equal(b.name, a.name, `${label} name`);
        assert.deepEqual(bGroups.map(group => group.name), aGroups.map(group => group.name), `${label} material groups`);
        assert.deepEqual(bGroups.map(group => group.faces.length), aGroups.map(group => group.faces.length), `${label} group index counts`);
        assert.equal(totalIndexCount(bGroups), totalIndexCount(aGroups), `${label} total index count`);

        for (const [ channel, width ] of Object.entries(CHANNELS))
        {
            const actual = expandChannel(b, channel, width);
            const expected = expandChannel(a, channel, width);
            if ([ "normal", "tangent", "binormal" ].includes(channel))
            {
                assertDirectionsClose(actual, expected, `${label} ${channel}`, metrics);
            }
            else
            {
                assertArrayClose(
                    actual,
                    expected,
                    channel === "position" ? 1e-5 : 2e-5,
                    `${label} ${channel}`,
                    metrics
                );
            }
        }
        compareSkin(a, b, label, metrics);
        compareMorphTargets(a, b, label, metrics);
    }
}

function compareSkeletons(source, result, metrics)
{
    assert.equal(result.skeletons.length, source.skeletons.length, "skeleton count");
    for (let skeletonIndex = 0; skeletonIndex < source.skeletons.length; skeletonIndex++)
    {
        const
            a = source.skeletons[skeletonIndex],
            b = result.skeletons[skeletonIndex],
            label = `skeleton ${skeletonIndex} (${a.name})`;
        assert.equal(b.name, a.name, `${label} name`);
        assert.deepEqual(b.bones, a.bones, `${label} bones`);
        assert.deepEqual(b.parents, a.parents, `${label} parents`);
        assert.equal(b.restTransforms.length, a.restTransforms.length, `${label} rest count`);
        for (let boneIndex = 0; boneIndex < a.bones.length; boneIndex++)
        {
            const
                ar = a.restTransforms[boneIndex],
                br = b.restTransforms[boneIndex];
            assertArrayClose(br.position, ar.position, 1e-5, `${label} bone ${boneIndex} position`, metrics);
            assertArrayClose(br.scale, ar.scale, 1e-5, `${label} bone ${boneIndex} scale`, metrics);
            const rotationError = quaternionAngularDifference(
                normalizeQuaternion(br.rotation),
                normalizeQuaternion(ar.rotation)
            );
            metrics.rotation = Math.max(metrics.rotation, rotationError);
            assert.ok(rotationError <= 3e-4, `${label} bone ${boneIndex} rotation differs by ${rotationError} radians`);
            assertArrayClose(
                b.invBindTransforms[boneIndex],
                a.invBindTransforms[boneIndex],
                2e-5,
                `${label} bone ${boneIndex} inverse bind`,
                metrics
            );
        }
    }
}

function channelMap(animation, label)
{
    const result = new Map();
    for (const channel of animation.channels ?? [])
    {
        const key = `${channel.targetType}\0${channel.target}`;
        assert.equal(result.has(key), false, `${label} duplicate channel ${key}`);
        result.set(key, channel);
    }
    return result;
}

function curveSampleTimes(a, b, duration)
{
    const times = new Set([ 0 ]);
    for (const curve of [ a, b ])
    {
        for (const knot of curve.knots)
        {
            if (knot >= 0 && knot < duration) times.add(knot);
        }
        for (let index = 1; index < curve.knots.length; index++)
        {
            const start = curve.knots[index - 1];
            const end = curve.knots[index];
            for (const fraction of [ 0.25, 0.5, 0.75 ])
            {
                const time = start + (end - start) * fraction;
                if (time >= 0 && time < duration) times.add(time);
            }
        }
    }
    const uniformSamples = Math.max(1, Math.ceil(duration * 240));
    for (let sample = 0; sample < uniformSamples; sample++) times.add(sample / 240);
    if (duration > 0) times.add(Math.max(0, duration - 1 / TICKS_PER_SECOND));
    return [ ...times ].filter(time => time >= 0 && (duration === 0 ? time === 0 : time < duration)).sort((x, y) => x - y);
}

function compareAnimations(source, result, metrics, coverage)
{
    assert.equal(result.animations.length, source.animations.length, "animation count");
    for (let animationIndex = 0; animationIndex < source.animations.length; animationIndex++)
    {
        const
            a = source.animations[animationIndex],
            b = result.animations[animationIndex],
            label = `animation ${animationIndex} (${a.name})`;
        assert.equal(b.name, a.name, `${label} name`);
        assert.ok(Math.abs(b.duration - a.duration) <= 1e-7, `${label} duration ${b.duration} != ${a.duration}`);
        const aChannels = channelMap(a, label);
        const bChannels = channelMap(b, label);
        assert.deepEqual([ ...bChannels.keys() ].sort(), [ ...aChannels.keys() ].sort(), `${label} channel identities`);

        for (const [ key, aChannel ] of aChannels)
        {
            const
                bChannel = bChannels.get(key),
                aCurveRecord = a.curves[aChannel.curveIndex],
                bCurveRecord = b.curves[bChannel.curveIndex],
                dimension = aCurveRecord.valueDimension,
                aCurve = CjsGrannyCurves.decodeAnimationCurve(aCurveRecord, dimension),
                bCurve = CjsGrannyCurves.decodeAnimationCurve(bCurveRecord, dimension);
            assert.ok(aCurve, `${label} ${key} source curve decodes`);
            assert.ok(bCurve, `${label} ${key} result curve decodes`);
            assert.equal(bCurveRecord.valueDimension, dimension, `${label} ${key} dimension`);
            assert.equal(bCurveRecord.interpolation, aCurveRecord.interpolation, `${label} ${key} interpolation`);
            coverage.targetTypes.add(aChannel.targetType);
            coverage.interpolations.add(aCurveRecord.interpolation);

            for (const time of curveSampleTimes(aCurve, bCurve, Math.min(a.duration, b.duration)))
            {
                const
                    av = CjsGrannyCurves.sampleGrannyCurve(new Array(dimension).fill(0), aCurve, time, false, a.duration),
                    bv = CjsGrannyCurves.sampleGrannyCurve(new Array(dimension).fill(0), bCurve, time, false, b.duration);
                if (aChannel.targetType === "BoneRotation")
                {
                    const error = quaternionAngularDifference(normalizeQuaternion(av), normalizeQuaternion(bv));
                    metrics.rotation = Math.max(metrics.rotation, error);
                    assert.ok(error <= 3e-4, `${label} ${key} at ${time}s differs by ${error} radians`);
                }
                else
                {
                    for (let component = 0; component < dimension; component++)
                    {
                        const error = Math.abs(av[component] - bv[component]);
                        metrics.animation = Math.max(metrics.animation, error);
                        assert.ok(
                            error <= 1e-5 * Math.max(1, Math.abs(av[component])),
                            `${label} ${key}[${component}] at ${time}s differs by ${error}`
                        );
                    }
                }
            }
        }
    }
}

function collectGr2Coverage(root, coverage)
{
    for (const animation of root.animations ?? [])
    {
        for (const group of animation.trackGroups ?? [])
        {
            coverage.trackGroups.add(group.name ?? "");
            for (const track of group.transformTracks ?? [])
            {
                for (const curve of [ track.position, track.orientation, track.scaleShear ])
                {
                    if (typeof curve?.format === "number") coverage.curves.add(`${curve.format}/${curve.degree}`);
                }
            }
            for (const track of group.vectorTracks ?? [])
            {
                const curve = track.value;
                if (typeof curve?.format === "number") coverage.curves.add(`${curve.format}/${curve.degree}`);
            }
        }
    }
}

const corpusDir = process.env.FBX_GR2_CORPUS_DIR || null;

test(
    "pinned EVE FAUX and T3 GR2 assets survive CMF/FBX semantic round trips",
    { skip: corpusDir ? false : "set FBX_GR2_CORPUS_DIR to run the pinned real-file proof" },
    async () =>
    {
        assert.ok((await stat(corpusDir)).isDirectory(), `corpus dir not found: ${corpusDir}`);
        const files = [];
        for await (const filePath of walk(corpusDir)) files.push(filePath);
        files.sort((a, b) => path.basename(a) < path.basename(b) ? -1 : path.basename(a) > path.basename(b) ? 1 : 0);
        assert.deepEqual(files.map(filePath => path.basename(filePath)), [ ...EXPECTED.keys() ].sort(), "pinned corpus files");

        const
            failures = [],
            reports = [],
            coverage = {
                targetTypes: new Set(),
                interpolations: new Set(),
                trackGroups: new Set(),
                curves: new Set()
            };

        for (const filePath of files)
        {
            const name = path.basename(filePath);
            try
            {
                const
                    bytes = new Uint8Array(await readFile(filePath)),
                    hash = createHash("sha256").update(bytes).digest("hex"),
                    [ expectedHash, resPath ] = EXPECTED.get(name),
                    gr2 = CjsGr2Format.read(bytes),
                    source = CjsGr2Format.read(bytes, { emit: "cmf", classes: { Root: ValueNode } }),
                    first = CjsFbxFormat.write(source),
                    second = CjsFbxFormat.write(source),
                    inspect = CjsFbxFormat.inspect(first),
                    support = CjsFbxFormat.getSupport(first),
                    result = CjsFbxFormat.read(first, { emit: "cmf", classes: { Root: ValueNode } }),
                    metrics = { geometry: 0, direction: 0, skin: 0, animation: 0, rotation: 0 };

                assert.equal(hash, expectedHash, `${name} SHA-256 for TQ build 3484357`);
                assert.equal(first.length, second.length, `${name} deterministic FBX length`);
                assert.equal(Buffer.compare(Buffer.from(first), Buffer.from(second)), 0, `${name} deterministic FBX bytes`);
                assert.equal(inspect.version, 7400, `${name} FBX version`);
                assert.equal(support.supported, true, `${name} generated FBX support`);
                assert.deepEqual(support.errors, [], `${name} generated FBX errors`);
                assert.deepEqual(support.warnings, [], `${name} generated FBX warnings`);

                collectGr2Coverage(gr2, coverage);
                compareMeshes(source, result, metrics);
                compareSkeletons(source, result, metrics);
                compareAnimations(source, result, metrics, coverage);
                reports.push({
                    name,
                    resPath,
                    sha256: hash,
                    gr2Bytes: bytes.length,
                    fbxBytes: first.length,
                    meshes: source.meshes.length,
                    skeletons: source.skeletons.length,
                    animations: source.animations.length,
                    metrics
                });
            }
            catch (error)
            {
                failures.push({ name, message: error.message });
            }
        }

        console.log(JSON.stringify({
            build: "3484357",
            files: reports,
            coverage: Object.fromEntries(Object.entries(coverage).map(([ key, value ]) => [ key, [ ...value ].sort() ]))
        }, null, 2));
        assert.deepEqual(failures, [], `${failures.length} pinned GR2 round-trip failures`);
        assert.equal(reports.length, EXPECTED.size, "all pinned assets qualified");
        assert.ok(coverage.targetTypes.has("BonePosition"), "corpus covers bone position animation");
        assert.ok(coverage.targetTypes.has("BoneRotation"), "corpus covers bone rotation animation");
        assert.ok(coverage.interpolations.has("Linear"), "corpus covers linear CMF animation");
    }
);
