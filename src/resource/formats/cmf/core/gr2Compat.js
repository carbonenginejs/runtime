import { decodeElementArray } from "./utils/vertex.js";
import { normalizeQuaternionSeries } from "./utils/quaternion.js";

const NO_CURVE = { format: 0, degree: 0, error: "no curve data" };

/**
 * Returns a fresh copy of the no-curve placeholder.
 *
 * @returns {{ format: number, degree: number, error: string }} The placeholder curve.
 */
function copyNoCurve()
{
    return { ...NO_CURVE };
}

/**
 * Expands flat vec3 scale controls into 3x3 diagonal scale/shear controls.
 *
 * @param {ArrayLike<number>} values Flat scale values.
 * @returns {Array<number>} Nine values per key.
 */
function expandScaleControls(values)
{
    const expanded = [];
    for (let i = 0; i < values.length; i += 3)
    {
        expanded.push(values[i], 0, 0, 0, values[i + 1], 0, 0, 0, values[i + 2]);
    }
    return expanded;
}

/**
 * Returns a curve payload as numbers, copying an already-decoded array or
 * decoding tagged bytes.
 *
 * @param {ArrayLike<number>|Uint8Array|ArrayBuffer} input Decoded values or packed bytes.
 * @param {string} type ElementType name of the packed bytes.
 * @param {number} expectedLength Value count of an already-decoded array.
 * @returns {Array<number>} The values.
 */
function decodeCurveArray(input, type, expectedLength)
{
    if (Array.isArray(input) && input.length === expectedLength && input.every(Number.isFinite))
    {
        return input.slice();
    }
    return decodeElementArray(input, type);
}

/**
 * Converts a CMF curve into a decoded GR2-shaped curve.
 *
 * @param {import("./helpers.js").CmfAnimationCurve|null|undefined} curve CMF curve.
 * @param {number} targetDimension Required value dimension.
 * @param {boolean} [expandScale=false] Expands vec3 scale to 3x3 scale/shear.
 * @param {boolean} [normalizeRotation=false] Normalizes quaternion controls.
 * @returns {object} The GR2 curve `{ format, degree, knots, controls }`, or the no-curve placeholder.
 * @throws {Error} When the interpolation, counts or dimension do not fit.
 */
function convertCurve(curve, targetDimension, expandScale = false, normalizeRotation = false)
{
    if (!curve) return copyNoCurve();
    if (curve.interpolation !== "Step" && curve.interpolation !== "Linear")
    {
        throw new Error(`CMF to GR2: unsupported animation interpolation "${curve.interpolation}"`);
    }
    const knots = decodeCurveArray(curve.knots, curve.knotType, curve.knotCount);
    let controls = decodeCurveArray(
        curve.values,
        curve.valueType,
        curve.knotCount * curve.valueDimension
    );
    if (knots.length !== curve.knotCount)
    {
        throw new Error(`CMF to GR2: curve declares ${curve.knotCount} knots but contains ${knots.length}`);
    }
    if (controls.length !== curve.knotCount * curve.valueDimension)
    {
        throw new Error(
            `CMF to GR2: curve expects ${curve.knotCount * curve.valueDimension} values but contains ${controls.length}`
        );
    }
    if (curve.valueDimension !== targetDimension)
    {
        throw new Error(
            `CMF to GR2: curve dimension ${curve.valueDimension} does not match target dimension ${targetDimension}`
        );
    }
    if (normalizeRotation)
    {
        controls = normalizeQuaternionSeries(controls, "CMF to GR2 rotation curve");
    }
    if (expandScale) controls = expandScaleControls(controls);
    return {
        format: 1,
        degree: curve.interpolation === "Step" ? 0 : 1,
        knots,
        controls
    };
}

/**
 * Converts a CMF skeleton into a GR2-shaped skeleton.
 *
 * @param {import("./helpers.js").CmfSkeleton} skeleton CMF skeleton.
 * @returns {{ name: string, bones: Array<object> }} The GR2 skeleton.
 * @throws {Error} When bone names repeat.
 */
function convertSkeleton(skeleton)
{
    const names = skeleton.bones ?? [];
    if (new Set(names).size !== names.length)
    {
        throw new Error(`CMF to GR2: skeleton "${skeleton.name ?? ""}" contains duplicate bone names`);
    }
    return {
        name: skeleton.name ?? "",
        bones: (skeleton.bones ?? []).map((name, index) =>
        {
            const rest = skeleton.restTransforms?.[index] ?? {};
            const scale = rest.scale ?? [ 1, 1, 1 ];
            return {
                name,
                parentIndex: skeleton.parents?.[index] === 0xffffffff ? -1 : skeleton.parents?.[index] ?? -1,
                transformFlags: 7,
                position: (rest.position ?? [ 0, 0, 0 ]).slice(0, 3),
                orientation: (rest.rotation ?? [ 0, 0, 0, 1 ]).slice(0, 4),
                scaleShear: [ scale[0], 0, 0, 0, scale[1], 0, 0, 0, scale[2] ]
            };
        })
    };
}

/**
 * Build GR2-shaped models from CMF skeleton and mesh bindings.
 *
 * @param {import("./helpers.js").CmfGraph} raw CMF graph.
 * @returns {Array<{ name: string, skeleton: object, meshBindings: Array<number> }>} One model per skeleton.
 */
export function buildGr2Models(raw)
{
    return (raw.skeletons ?? []).map((skeleton, skeletonIndex) => ({
        name: skeleton.name ?? "",
        skeleton: convertSkeleton(skeleton),
        meshBindings: (raw.meshes ?? []).flatMap((mesh, meshIndex) =>
            mesh.skeleton === skeletonIndex ? [ meshIndex ] : [])
    }));
}

/**
 * Creates an empty GR2 transform track.
 *
 * @param {string} name Bone name.
 * @returns {object} The track with no-curve placeholders.
 */
function makeTransformTrack(name)
{
    return {
        name,
        flags: 0,
        orientation: copyNoCurve(),
        position: copyNoCurve(),
        scaleShear: copyNoCurve()
    };
}

/**
 * Groups a CMF animation's channels into GR2 track groups, one per skeleton
 * plus groups for unclaimed bones and morph targets.
 *
 * @param {import("./helpers.js").CmfAnimation} animation CMF animation.
 * @param {Array<import("./helpers.js").CmfSkeleton>} skeletons CMF skeletons.
 * @returns {Array<{ name: string, transformTracks: Array<object>, vectorTracks: Array<object> }>} The track groups.
 * @throws {Error} When a channel is unsupported, duplicated, missing its curve, or resolves to no single skeleton.
 */
function animationGroups(animation, skeletons)
{
    const boneChannels = new Map();
    const vectorTracks = [];
    const channelKeys = new Set();
    for (const channel of animation.channels ?? [])
    {
        if (![ "MorphTarget", "BonePosition", "BoneRotation", "BoneScale" ].includes(channel.targetType))
        {
            throw new Error(`CMF to GR2: unsupported animation target type "${channel.targetType ?? ""}"`);
        }
        const key = `${channel.targetType}\0${channel.target ?? ""}`;
        if (channelKeys.has(key))
        {
            throw new Error(`CMF to GR2: duplicate ${channel.targetType} target "${channel.target ?? ""}"`);
        }
        channelKeys.add(key);
        if (!Number.isInteger(channel.curveIndex) || !animation.curves?.[channel.curveIndex])
        {
            throw new Error(`CMF to GR2: channel "${channel.target ?? ""}" references a missing curve`);
        }
        const curve = animation.curves[channel.curveIndex];
        if (channel.targetType === "MorphTarget")
        {
            vectorTracks.push({
                name: channel.target ?? "",
                dimension: 1,
                valueCurve: convertCurve(curve, 1)
            });
            continue;
        }

        let track = boneChannels.get(channel.target);
        if (!track)
        {
            track = makeTransformTrack(channel.target ?? "");
            boneChannels.set(channel.target, track);
        }
        if (channel.targetType === "BonePosition") track.position = convertCurve(curve, 3);
        else if (channel.targetType === "BoneRotation") track.orientation = convertCurve(curve, 4, false, true);
        else if (channel.targetType === "BoneScale")
        {
            track.scaleShear = convertCurve(curve, 3, true);
        }
    }

    for (const track of boneChannels.values())
    {
        const matches = (skeletons ?? []).filter(skeleton => (skeleton.bones ?? []).includes(track.name));
        if (matches.length !== 1)
        {
            const reason = matches.length ? "is ambiguous across skeletons" : "does not resolve to a skeleton";
            throw new Error(`CMF to GR2: bone animation target "${track.name}" ${reason}`);
        }
    }

    const groups = [];
    const claimedTargets = new Set();
    for (const skeleton of skeletons ?? [])
    {
        const boneNames = new Set(skeleton.bones ?? []);
        const transformTracks = [ ...boneChannels.values() ].filter((track) => boneNames.has(track.name));
        if (!transformTracks.length) continue;
        for (const track of transformTracks) claimedTargets.add(track.name);
        groups.push({ name: skeleton.name ?? "", transformTracks, vectorTracks: [] });
    }
    const unclaimed = [ ...boneChannels.values() ].filter((track) => !claimedTargets.has(track.name));
    if (unclaimed.length) groups.push({ name: "", transformTracks: unclaimed, vectorTracks: [] });
    if (vectorTracks.length) groups.push({ name: "root", transformTracks: [], vectorTracks });
    return groups;
}

/**
 * Build GR2-shaped animations from CMF native animations.
 *
 * @param {import("./helpers.js").CmfGraph} raw CMF graph.
 * @returns {Array<object>} GR2-shaped animations.
 */
export function buildGr2Animations(raw)
{
    return (raw.animations ?? []).map((animation) => ({
        name: animation.name ?? "",
        duration: animation.duration ?? 0,
        timeStep: 0,
        oversampling: 0,
        defaultLoopCount: 0,
        flags: 0,
        trackGroups: animationGroups(animation, raw.skeletons)
    }));
}
