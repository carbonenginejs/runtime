import { decodeElementArray } from "./utils/vertex.js";
import { normalizeQuaternionSeries } from "./utils/quaternion.js";

const NO_CURVE = Object.freeze({ format: 0, degree: 0, error: "no curve data" });

function copyNoCurve()
{
    return { ...NO_CURVE };
}

function expandScaleControls(values)
{
    const expanded = [];
    for (let i = 0; i < values.length; i += 3)
    {
        expanded.push(values[i], 0, 0, 0, values[i + 1], 0, 0, 0, values[i + 2]);
    }
    return expanded;
}

function decodeCurveArray(input, type, expectedLength)
{
    if (Array.isArray(input) && input.length === expectedLength && input.every(Number.isFinite))
    {
        return input.slice();
    }
    return decodeElementArray(input, type);
}

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

/** Build GR2-shaped models from CMF skeleton and mesh bindings. */
export function buildGr2Models(raw)
{
    return (raw.skeletons ?? []).map((skeleton, skeletonIndex) => ({
        name: skeleton.name ?? "",
        skeleton: convertSkeleton(skeleton),
        meshBindings: (raw.meshes ?? []).flatMap((mesh, meshIndex) =>
            mesh.skeleton === skeletonIndex ? [ meshIndex ] : [])
    }));
}

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

/** Build GR2-shaped animations from CMF native animations. */
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
