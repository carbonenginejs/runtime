import { createHash } from "node:crypto";

export const DEFAULT_FRONTIER_CMF_GR2_OPTIONS = Object.freeze({
    frontierBuild: "3474408",
    eveBuild: "3487903",
    host: "http://127.0.0.1:5510",
    prefix: "res:/",
    limit: 0,
    concurrency: 4,
    progress: 100,
    timeout: 30000,
    examples: 12
});

export const FRONTIER_CMF_GR2_CAMERA_PREFIX = "res:/animation/cameraanimation/";
const NUMERIC_OPTIONS = new Set([ "limit", "concurrency", "progress", "timeout", "examples" ]);
const UINT32_MAX = 0xffffffff;

export function parseFrontierCmfGr2Options(args, defaults = DEFAULT_FRONTIER_CMF_GR2_OPTIONS)
{
    const options = { ...defaults };
    if (args.length % 2 !== 0) throw new Error(`missing value for ${args.at(-1)}`);
    for (let index = 0; index < args.length; index += 2)
    {
        const token = args[index];
        if (!token.startsWith("--")) throw new Error(`expected an option, got ${token}`);
        const name = token.slice(2);
        if (!(name in options)) throw new Error(`unknown option --${name}`);
        options[name] = NUMERIC_OPTIONS.has(name) ? Number(args[index + 1]) : args[index + 1];
    }
    for (const name of [ "limit", "examples" ])
    {
        if (!Number.isSafeInteger(options[name]) || options[name] < 0)
        {
            throw new Error(`--${name} must be a non-negative integer`);
        }
    }
    for (const name of [ "concurrency", "progress", "timeout" ])
    {
        if (!Number.isSafeInteger(options[name]) || options[name] < 1)
        {
            throw new Error(`--${name} must be a positive integer`);
        }
    }
    for (const name of [ "frontierBuild", "eveBuild", "host", "prefix" ])
    {
        if (!String(options[name]).length) throw new Error(`--${name} must not be empty`);
    }
    return options;
}

export function selectFrontierCmfEveGr2Pairs(frontierManifest, eveManifest, options = {})
{
    const prefix = (options.prefix ?? "res:/").toLowerCase();
    const eveGr2 = new Map();
    for (const path of eveManifest)
    {
        if (path.toLowerCase().endsWith(".gr2")) eveGr2.set(path.toLowerCase(), path);
    }
    const pairs = [];
    for (const frontierPath of frontierManifest)
    {
        const lowerPath = frontierPath.toLowerCase();
        // Frontier's four GR2 files are unrelated exceptions, never inputs.
        if (!lowerPath.startsWith(prefix) || !lowerPath.endsWith(".cmf")) continue;
        const evePath = eveGr2.get(`${lowerPath.slice(0, -4)}.gr2`);
        if (evePath) pairs.push({ frontierPath, evePath });
    }
    return pairs.sort((left, right) => left.frontierPath.localeCompare(right.frontierPath));
}

export function isFrontierCmfGr2CameraPair(pair)
{
    return pair.frontierPath.toLowerCase().startsWith(FRONTIER_CMF_GR2_CAMERA_PREFIX);
}

function pairCohort(pair)
{
    const path = pair.frontierPath.toLowerCase();
    if (path.startsWith("res:/animation_gstate/")) return "animation-gstate";
    if (path.startsWith("res:/animation/")) return "animation";
    if (/^res:\/(?:graphics|dx9\/model)\/character\//u.test(path)) return "character";
    if (path.startsWith("res:/dx9/model/ship/")) return "ship";
    if (path.startsWith("res:/dx9/model/turret/")) return "turret";
    if (path.startsWith("res:/graphics/generic/")) return "generic";
    if (path.includes("/effects/") || path.startsWith("res:/fisfx/")) return "effects";
    return path.split("/").slice(1, 4).join("/");
}

function evenlySample(values, count)
{
    if (count >= values.length) return values.slice();
    if (count === 1) return [ values[0] ];
    return Array.from({ length: count }, (_, index) =>
        values[Math.floor(index * (values.length - 1) / (count - 1))]);
}

export function sampleFrontierCmfEveGr2Pairs(pairs, limit)
{
    if (!limit || limit >= pairs.length) return pairs.slice();
    const buckets = new Map();
    for (const pair of pairs)
    {
        const cohort = pairCohort(pair);
        if (!buckets.has(cohort)) buckets.set(cohort, []);
        buckets.get(cohort).push(pair);
    }
    const cohorts = [ ...buckets.keys() ].sort();
    const counts = new Map(cohorts.map(cohort => [ cohort, 0 ]));
    for (let selected = 0; selected < limit;)
    {
        let advanced = false;
        for (const cohort of cohorts)
        {
            if (selected >= limit) break;
            if (counts.get(cohort) >= buckets.get(cohort).length) continue;
            counts.set(cohort, counts.get(cohort) + 1);
            selected++;
            advanced = true;
        }
        if (!advanced) break;
    }
    const samples = new Map(cohorts.map(cohort => [
        cohort,
        evenlySample(buckets.get(cohort), counts.get(cohort))
    ]));
    const result = [];
    for (let index = 0; result.length < limit; index++)
    {
        for (const cohort of cohorts)
        {
            const pair = samples.get(cohort)[index];
            if (pair) result.push(pair);
        }
    }
    return result;
}

const lower = value => String(value ?? "").toLowerCase();
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const names = values => (values ?? []).map(value => lower(value?.name ?? value)).sort();
const sorted = values => values.slice().sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)));

function finiteCount(size, stride)
{
    if (!Number.isFinite(size) || !Number.isFinite(stride) || stride <= 0) return 0;
    const count = size / stride;
    return Number.isSafeInteger(count) ? count : 0;
}

function vertexCount(lod)
{
    return finiteCount(lod?.vb?.size, lod?.vb?.stride) ||
        Math.floor((lod?.vertex?.position ?? []).length / 3);
}

function indexCount(lod, topology)
{
    const described = finiteCount(lod?.ib?.size, lod?.ib?.stride);
    if (described) return described;
    if (topology === "PointList")
    {
        return (lod?.areas ?? []).reduce((sum, area) => sum + (area.elementCount ?? 0), 0);
    }
    return (lod?.indices ?? []).reduce((sum, group) => sum + (group.faces?.length ?? 0), 0);
}

function tangentLayout(decl)
{
    const usages = new Set((decl ?? []).map(element => element.usage));
    if (usages.has("PackedTangent") || usages.has("PackedTangentLegacy")) return "packed";
    if (usages.has("Tangent") && usages.has("Normal") && usages.has("Binormal")) return "unpacked";
    if (usages.has("Normal")) return "normal-only";
    return "none";
}

const floatScratch = new Float32Array(1);
const floatBits = new Uint32Array(floatScratch.buffer);

function floatToken(value)
{
    floatScratch[0] = Object.is(value, -0) ? 0 : value;
    return floatBits[0].toString(16).padStart(8, "0");
}

function vertexToken(positions, index)
{
    const offset = index * 3;
    if (offset < 0 || offset + 2 >= positions.length) return null;
    return `${floatToken(positions[offset])}${floatToken(positions[offset + 1])}${floatToken(positions[offset + 2])}`;
}

function triangleToken(positions, a, b, c)
{
    const vertices = [ vertexToken(positions, a), vertexToken(positions, b), vertexToken(positions, c) ];
    if (vertices.some(value => value === null)) return null;
    // Cyclic starts compare equal; reversed winding remains different.
    return [
        `${vertices[0]}:${vertices[1]}:${vertices[2]}`,
        `${vertices[1]}:${vertices[2]}:${vertices[0]}`,
        `${vertices[2]}:${vertices[0]}:${vertices[1]}`
    ].sort()[0];
}

function hashTokens(tokens)
{
    if (!tokens.length) return null;
    const hash = createHash("sha256");
    for (const token of tokens.sort()) hash.update(token).update("\n");
    return hash.digest("hex");
}

function areaPayloadHash(positions, faces, topology)
{
    if (!positions?.length) return null;
    if (topology === "PointList")
    {
        return hashTokens((faces ?? []).map(index => vertexToken(positions, index)).filter(Boolean));
    }
    const triangles = [];
    for (let index = 0; index + 2 < (faces?.length ?? 0); index += 3)
    {
        const token = triangleToken(positions, faces[index], faces[index + 1], faces[index + 2]);
        if (token) triangles.push(token);
    }
    return hashTokens(triangles);
}

function parsedLodName(name)
{
    const match = /^(.*?)\s+LOD\s+(\d+)$/iu.exec(String(name ?? ""));
    return match ? { base: lower(match[1]), threshold: Number(match[2]) } : null;
}

function summarizeLod(mesh, lod, index, suffixThreshold)
{
    const topology = mesh.topology ?? lod.topology ?? "TriangleList";
    const positions = lod.vertex?.position ?? mesh.vertex?.position ?? [];
    const indexGroups = lod.indices ?? mesh.indices ?? [];
    const areas = (lod.areas ?? []).map((area, areaIndex) => ({
        name: lower(mesh.areas?.[areaIndex]?.name ?? indexGroups[areaIndex]?.name),
        elementCount: area.elementCount ?? 0,
        payloadHash: areaPayloadHash(positions, indexGroups[areaIndex]?.faces ?? [], topology)
    }));
    return {
        threshold: suffixThreshold ?? lod.threshold ?? (index === 0 ? UINT32_MAX : null),
        topology,
        vertexCount: vertexCount(lod),
        indexCount: indexCount(lod, topology),
        tangentLayout: tangentLayout(lod.decl ?? mesh.decl),
        areas,
        morphTargets: (lod.morphTargets ?? []).length
    };
}

function summarizeMeshGroups(meshes)
{
    const baseCounts = new Map();
    for (const mesh of meshes)
    {
        if (!parsedLodName(mesh.name)) baseCounts.set(lower(mesh.name), (baseCounts.get(lower(mesh.name)) ?? 0) + 1);
    }
    const groups = [];
    const groupByBase = new Map();
    for (const mesh of meshes)
    {
        const parsed = parsedLodName(mesh.name);
        const attach = parsed && baseCounts.get(parsed.base) === 1;
        const base = attach ? parsed.base : lower(mesh.name);
        let group = attach ? groupByBase.get(base) : null;
        if (!group)
        {
            group = {
                name: base,
                ambiguous: !attach && (baseCounts.get(base) ?? 0) > 1,
                skeletons: [],
                boneBindings: [],
                hasBoneIndices: false,
                morphTargets: [],
                lods: []
            };
            groups.push(group);
            if (!parsed) groupByBase.set(base, group);
        }
        const lods = mesh.lods?.length ? mesh.lods : [ mesh ];
        group.skeletons.push(mesh.skeleton ?? null);
        group.boneBindings.push(...names(mesh.boneBindings));
        group.hasBoneIndices ||= (mesh.decl ?? []).some(element => element.usage === "BoneIndices");
        group.morphTargets.push(...names(mesh.morphTargets?.targets));
        group.lods.push(...lods.map((lod, index) => summarizeLod(mesh, lod, index, attach ? parsed.threshold : null)));
    }
    return groups.map(group => ({
        ...group,
        skeletons: [ ...new Set(group.skeletons) ].sort(),
        boneBindings: [ ...new Set(group.boneBindings) ].sort(),
        morphTargets: [ ...new Set(group.morphTargets) ].sort(),
        lods: group.lods.sort((left, right) => (right.threshold ?? -1) - (left.threshold ?? -1))
    })).sort((left, right) => left.name.localeCompare(right.name));
}

function summarizeSkeleton(skeleton)
{
    return {
        name: lower(skeleton.name),
        bones: (skeleton.bones ?? []).map(lower),
        parents: (skeleton.parents ?? []).map(value => value >>> 0),
        restTransforms: (skeleton.restTransforms ?? []).map(transform => ({
            position: (transform.position ?? []).map(Math.fround),
            rotation: canonicalQuaternion(transform.rotation ?? []),
            scale: (transform.scale ?? []).map(Math.fround)
        }))
    };
}

function canonicalQuaternion(rotation)
{
    const values = rotation.map(Math.fround);
    const first = values.find(value => value !== 0);
    return first < 0 ? values.map(value => -value) : values;
}

function summarizeAnimation(animation)
{
    return {
        name: lower(animation.name),
        duration: Number(animation.duration ?? 0),
        channels: sorted((animation.channels ?? []).map(channel => ({
            targetType: channel.targetType ?? "",
            target: lower(channel.target)
        })))
    };
}

export function summarizeCmfGraph(graph)
{
    const meshes = graph?.meshes ?? [];
    return {
        meshContainers: meshes.length,
        meshGroups: summarizeMeshGroups(meshes),
        skeletons: (graph?.skeletons ?? []).map(summarizeSkeleton),
        animations: (graph?.animations ?? []).map(summarizeAnimation)
    };
}

export function countGr2VectorTracks(raw)
{
    return (raw?.fileInfo?.Animations ?? []).reduce((animationTotal, animation) =>
        animationTotal + (animation?.TrackGroups ?? []).reduce((groupTotal, group) =>
            groupTotal + (group?.VectorTracks?.length ?? 0), 0), 0);
}

export function countGr2RigidBindingMeshes(raw)
{
    return (raw?.fileInfo?.Meshes ?? []).filter(mesh =>
    {
        const vertices = mesh?.PrimaryVertexData?.Vertices;
        const hasBoneIndices = (vertices?.__type ?? []).some(member => member.name === "BoneIndices");
        return (mesh?.BoneBindings?.length ?? 0) > 0 && !hasBoneIndices;
    }).length;
}

function approximateNumbers(left, right, tolerance = 1e-5)
{
    if (left.length !== right.length) return false;
    return left.every((value, index) =>
        Math.abs(value - right[index]) <= tolerance * Math.max(1, Math.abs(value), Math.abs(right[index])));
}

function skeletonIdentity(skeleton)
{
    return { name: skeleton.name, bones: skeleton.bones, parents: skeleton.parents };
}

function skeletonTransformsEqual(left, right)
{
    if (left.length !== right.length) return false;
    return left.every((skeleton, skeletonIndex) =>
    {
        const other = right[skeletonIndex];
        if (skeleton.restTransforms.length !== other.restTransforms.length) return false;
        return skeleton.restTransforms.every((transform, index) =>
        {
            const candidate = other.restTransforms[index];
            return approximateNumbers(transform.position, candidate.position, 1e-4) &&
                approximateNumbers(transform.rotation, candidate.rotation, 1e-4) &&
                approximateNumbers(transform.scale, candidate.scale, 1e-4);
        });
    });
}

function groupIdentity(group)
{
    return { name: group.name, ambiguous: group.ambiguous };
}

function groupStructure(group)
{
    return {
        ...groupIdentity(group),
        skeletons: group.skeletons,
        boneBindings: group.boneBindings,
        hasBoneIndices: group.hasBoneIndices,
        morphTargets: group.morphTargets,
        lods: group.lods.map(lod => ({
            threshold: lod.threshold,
            topology: lod.topology,
            indexCount: lod.indexCount,
            areas: lod.areas.map(area => ({ elementCount: area.elementCount })),
            morphTargets: lod.morphTargets
        }))
    };
}

const payloadHashes = groups => groups.map(group => ({
    name: group.name,
    lods: group.lods.map(lod => lod.areas.map(area => area.payloadHash))
}));
const tangentLayouts = groups => groups.map(group => ({
    name: group.name,
    lods: group.lods.map(lod => lod.tangentLayout)
}));
const vertexCounts = groups => groups.map(group => ({
    name: group.name,
    lods: group.lods.map(lod => lod.vertexCount)
}));
const areaNames = groups => groups.map(group => ({
    name: group.name,
    lods: group.lods.map(lod => lod.areas.map(area => area.name))
}));

function packedSplitOnly(left, right)
{
    const a = left.flatMap(group => group.lods);
    const b = right.flatMap(group => group.lods);
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index] ||
        [ value, b[index] ].every(item => item === "packed" || item === "unpacked"));
}

function animationsEqual(left, right)
{
    if (left.length !== right.length) return false;
    return left.every((animation, index) =>
    {
        const other = right[index];
        const tolerance = Math.max(1e-4, Math.max(Math.abs(animation.duration), Math.abs(other.duration)) * 1e-5);
        return animation.name === other.name && Math.abs(animation.duration - other.duration) <= tolerance &&
            equal(animation.channels, other.channels);
    });
}

function basePayloadsEqual(left, right)
{
    if (left.length !== right.length || !left.length) return false;
    return left.every((group, index) =>
    {
        const other = right[index];
        return group.name === other.name && equal(
            group.lods[0]?.areas.map(area => area.payloadHash),
            other.lods[0]?.areas.map(area => area.payloadHash)
        );
    });
}

export function compareFrontierCmfToEveGr2(frontier, eve, options = {})
{
    const differences = [];
    const observations = [];
    const leftPresence = [ frontier.meshGroups.length, frontier.skeletons.length, frontier.animations.length ];
    const rightPresence = [ eve.meshGroups.length, eve.skeletons.length, eve.animations.length ];
    const sameContentFamily = leftPresence.every((value, index) => !!value === !!rightPresence[index]);
    if (!sameContentFamily) differences.push("content-family");
    if (![ ...leftPresence, ...rightPresence ].some(Boolean)) differences.push("empty-content");

    if (!equal(frontier.meshGroups.map(groupIdentity), eve.meshGroups.map(groupIdentity)))
    {
        differences.push("geometry-groups");
    }
    if (!equal(frontier.meshGroups.map(groupStructure), eve.meshGroups.map(groupStructure)))
    {
        differences.push("geometry-structure");
    }
    if (!equal(payloadHashes(frontier.meshGroups), payloadHashes(eve.meshGroups)))
    {
        differences.push("geometry-payload");
    }

    const leftTangents = tangentLayouts(frontier.meshGroups);
    const rightTangents = tangentLayouts(eve.meshGroups);
    if (!equal(leftTangents, rightTangents))
    {
        if (packedSplitOnly(leftTangents, rightTangents)) observations.push("packed-split-tangent-layout");
        else differences.push("tangent-frame");
    }
    if (!equal(vertexCounts(frontier.meshGroups), vertexCounts(eve.meshGroups)) &&
        equal(payloadHashes(frontier.meshGroups), payloadHashes(eve.meshGroups)))
    {
        observations.push("vertex-remap");
    }
    if (!equal(areaNames(frontier.meshGroups), areaNames(eve.meshGroups)))
    {
        observations.push("area-labels");
    }
    if (frontier.meshContainers !== eve.meshContainers &&
        equal(frontier.meshGroups.map(groupIdentity), eve.meshGroups.map(groupIdentity)))
    {
        observations.push("lod-container-reassembly");
    }
    if (options.gr2RigidBindingMeshes) observations.push("implicit-rigid-bindings");
    if (options.gr2VectorTracks) observations.push("gr2-vector-metadata");

    const leftSkeletons = frontier.skeletons.map(skeletonIdentity);
    const rightSkeletons = eve.skeletons.map(skeletonIdentity);
    if (!equal(leftSkeletons, rightSkeletons)) differences.push("skeleton-identity");
    else if (!skeletonTransformsEqual(frontier.skeletons, eve.skeletons)) differences.push("skeleton-transforms");

    const animationIdentity = animation => ({ name: animation.name });
    if (!equal(frontier.animations.map(animationIdentity), eve.animations.map(animationIdentity)))
    {
        differences.push("animation-identity");
    }
    else if (!animationsEqual(frontier.animations, eve.animations)) differences.push("animation-channels");

    const nearOnly = new Set([ "geometry-structure", "geometry-payload", "skeleton-transforms", "animation-channels" ]);
    const near = sameContentFamily && differences.every(value => nearOnly.has(value)) &&
        (!frontier.meshGroups.length || basePayloadsEqual(frontier.meshGroups, eve.meshGroups));
    return {
        classification: differences.length === 0 ? "normalized-match" : near ? "near-match" : "different",
        differences,
        observations,
        gr2VectorTracks: options.gr2VectorTracks ?? 0,
        gr2RigidBindingMeshes: options.gr2RigidBindingMeshes ?? 0
    };
}
