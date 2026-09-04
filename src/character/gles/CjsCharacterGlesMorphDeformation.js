const deformationStates = new WeakMap();

const TARGET_CHANNELS = new Set([
    "POSITION",
    "NORMAL",
    "TANGENT",
    "BITANGENT",
    "BINORMAL"
]);

/**
 * Reversibly realizes exact morph requests on cached GLES geometry.
 *
 * The backend host supplies vertex-layout interpretation and the live buffer
 * operations, keeping Tw2/GL bindings out of the reusable character package.
 */
export class CjsCharacterGlesMorphDeformation
{
    _geometryHost;

    constructor({ geometryHost } = {})
    {
        this._geometryHost = RequireGeometryHost(geometryHost);
    }

    /** Classifies a requested target without mutating realized geometry. */
    static ClassifyTarget(geometryResource, requests)
    {
        const normalized = NormalizeRequests(requests);
        if (normalized.length !== 1)
        {
            throw new TypeError("GLES morph target classification requires one request");
        }

        const request = normalized[0];
        const matchedMeshIndices = [];
        const coalescedMeshIndices = [];
        const ambiguousMeshIndices = [];
        for (const [ meshIndex, mesh ] of (geometryResource?.meshes ?? []).entries())
        {
            const matches = (mesh?.morphTargets ?? []).filter(target =>
                TargetIdentity(target) === request.identity);
            if (matches.length === 1)
            {
                matchedMeshIndices.push(meshIndex);
            }
            else if (matches.length > 1)
            {
                if (AreEquivalentTargets(matches))
                {
                    matchedMeshIndices.push(meshIndex);
                    coalescedMeshIndices.push(meshIndex);
                }
                else
                {
                    ambiguousMeshIndices.push(meshIndex);
                }
            }
        }

        return {
            status: ambiguousMeshIndices.length
                ? "ambiguous"
                : matchedMeshIndices.length
                    ? "exact"
                    : "unavailable",
            targetName: request.targetName,
            matchedMeshIndices,
            coalescedMeshIndices,
            ambiguousMeshIndices
        };
    }

    /** Returns whether geometry exposes at least one non-ambiguous target. */
    static HasAnyTarget(geometryResource, requests)
    {
        const classifications = NormalizeRequests(requests).map(request =>
            this.ClassifyTarget(geometryResource, [ request ]));
        return classifications.every(value => value.status !== "ambiguous")
            && classifications.some(value => value.status === "exact");
    }

    /** Acquires one shared-geometry deformation lease. */
    async Acquire(geometryResource, requests)
    {
        const normalized = NormalizeRequests(requests);
        const meshes = this._geometryHost.GetMeshes(geometryResource);
        if (!Array.isArray(meshes) || !meshes.length)
        {
            throw new Error("GLES morph deformation requires geometry meshes");
        }

        const signature = JSON.stringify(normalized.map(value => [ value.identity, value.weight ]));
        let state = deformationStates.get(geometryResource);

        if (state?.leases.size)
        {
            if (state.signature !== signature)
            {
                throw new Error("GLES morph deformation conflicts on shared geometry");
            }
            VerifyPreparedIdentity(state.prepared);
            ApplyPrepared(state.prepared, this._geometryHost);
            const lease = {};
            state.leases.add(lease);
            return { lease, report: CloneReport(state.report) };
        }

        await this._geometryHost.EnsureSystemMirror(geometryResource);
        const prepared = meshes.map((mesh, meshIndex) =>
            PrepareMesh(mesh, meshIndex, normalized, this._geometryHost));
        const matched = new Set(prepared.flatMap(value => value.matchedTargets));
        if (!matched.size)
        {
            throw new Error("GLES morph deformation found no exact target");
        }

        ApplyPrepared(prepared, this._geometryHost);
        await this._geometryHost.RebuildBounds(geometryResource);

        const report = CreateReport(normalized, prepared, matched);
        const lease = {};
        state = {
            leases: new Set([ lease ]),
            meshes,
            prepared,
            report,
            signature
        };
        deformationStates.set(geometryResource, state);
        return { lease, report: CloneReport(report) };
    }

    /** Replaces one exclusively owned lease's weights without a rebuild. */
    async Update(geometryResource, lease, requests)
    {
        const normalized = NormalizeRequests(requests, { allowEmpty: true });
        const state = deformationStates.get(geometryResource);
        if (!state?.leases.has(lease))
        {
            throw new Error("GLES morph deformation update requires an active lease");
        }

        const signature = JSON.stringify(normalized.map(value => [ value.identity, value.weight ]));
        if (state.signature === signature)
        {
            VerifyPreparedIdentity(state.prepared);
            ApplyPrepared(state.prepared, this._geometryHost);
            await this._geometryHost.RebuildBounds(geometryResource);
            return CloneReport(state.report);
        }
        if (state.leases.size !== 1)
        {
            throw new Error("GLES morph deformation update conflicts on shared geometry");
        }

        VerifyPreparedIdentity(state.prepared);
        const previousByMesh = new Map(state.prepared.map(value => [ value.mesh, value ]));
        const prepared = state.meshes.map((mesh, meshIndex) => PrepareMesh(
            mesh,
            meshIndex,
            normalized,
            this._geometryHost,
            previousByMesh.get(mesh)?.original ?? null
        ));
        const matched = new Set(prepared.flatMap(value => value.matchedTargets));
        if (normalized.length && !matched.size)
        {
            throw new Error("GLES morph deformation found no exact target");
        }

        ApplyUpdatedPrepared(state.prepared, prepared, this._geometryHost);
        await this._geometryHost.RebuildBounds(geometryResource);
        const report = CreateReport(normalized, prepared, matched);
        state.prepared = prepared;
        state.report = report;
        state.signature = signature;
        return CloneReport(report);
    }

    /** Releases a lease and restores original vertices after the final owner. */
    async Release(geometryResource, lease)
    {
        const state = deformationStates.get(geometryResource);
        if (!state?.leases.delete(lease)) return false;
        if (state.leases.size) return true;

        VerifyPreparedIdentity(state.prepared);
        const failures = RestorePrepared(state.prepared, this._geometryHost);
        if (failures.length)
        {
            state.leases.add(lease);
            const error = new Error("GLES morph deformation restore failed");
            error.errors = failures;
            throw error;
        }
        await this._geometryHost.RebuildBounds(geometryResource);
        deformationStates.delete(geometryResource);
        return true;
    }
}

function NormalizeRequests(requests, { allowEmpty = false } = {})
{
    if (!Array.isArray(requests) || (!allowEmpty && !requests.length))
    {
        throw new TypeError("GLES morph deformation requires target requests");
    }

    const byIdentity = new Map();
    for (const request of requests)
    {
        const targetName = String(request?.targetName ?? "").trim();
        const identity = normalizeCjsCharacterGlesMorphTargetName(targetName);
        const weight = Number(request?.weight);
        if (!targetName || !Number.isFinite(weight))
        {
            throw new TypeError("GLES morph deformation requires exact finite target weights");
        }
        const existing = byIdentity.get(identity);
        if (existing && existing.weight !== weight)
        {
            throw new Error(`Conflicting morph weights for ${JSON.stringify(targetName)}`);
        }
        byIdentity.set(identity, { identity, targetName, weight });
    }
    return [ ...byIdentity.values() ].sort((a, b) => a.identity.localeCompare(b.identity));
}

function PrepareMesh(mesh, meshIndex, requests, geometryHost, baseBufferData = null)
{
    const bufferData = mesh?.bufferData;
    const stride = Number(mesh?.declaration?.stride) / 4;
    if (!bufferData?.length || !Number.isInteger(stride) || stride <= 0)
    {
        return EmptyPrepared(mesh, meshIndex);
    }

    const vertexCount = Number(mesh?._vertices) || Math.floor(bufferData.length / stride);
    if (!vertexCount || vertexCount * stride > bufferData.length)
    {
        throw new Error(`GLES morph deformation mesh ${meshIndex} has invalid vertex storage`);
    }

    const targets = Array.isArray(mesh.morphTargets) ? mesh.morphTargets : [];
    if (baseBufferData && baseBufferData.length !== bufferData.length)
    {
        throw new Error(`GLES morph deformation mesh ${meshIndex} changed vertex storage`);
    }
    const original = baseBufferData ? baseBufferData.slice() : bufferData.slice();
    const deformed = original.slice();
    const matchedTargets = [];
    const changedVertices = new Set();

    for (const request of requests)
    {
        const matches = targets.filter(target => TargetIdentity(target) === request.identity);
        if (matches.length > 1 && !AreEquivalentTargets(matches))
        {
            throw new Error(
                `GLES morph target ${JSON.stringify(request.targetName)} is ambiguous on mesh ${meshIndex}`
            );
        }
        if (!matches.length) continue;
        ApplyTarget(
            mesh,
            matches[0],
            request.weight,
            original,
            deformed,
            stride,
            vertexCount,
            changedVertices,
            geometryHost
        );
        matchedTargets.push(request.identity);
    }

    return {
        mesh,
        meshIndex,
        bufferData,
        buffer: mesh.buffer,
        original,
        deformed,
        matchedTargets,
        changedVertexCount: changedVertices.size
    };
}

function ApplyTarget(
    mesh,
    target,
    weight,
    original,
    deformed,
    stride,
    vertexCount,
    changed,
    geometryHost
)
{
    const sparse = target.vertexIndices ?? null;
    const targetVertexCount = sparse ? sparse.length : vertexCount;
    if (!targetVertexCount) return;

    for (const [ key, values ] of Object.entries(target.vertex ?? {}))
    {
        const channel = String(key).toUpperCase();
        if (!TARGET_CHANNELS.has(channel) || !values?.length) continue;

        const declaration = geometryHost.GetVertexChannelDeclaration(mesh, channel);
        if (!declaration) continue;
        const components = values.length / targetVertexCount;
        if (!Number.isInteger(components) || components <= 0 || components > declaration.elements)
        {
            throw new Error(`GLES morph target ${JSON.stringify(target.sourceName)} has invalid ${key} data`);
        }
        const offset = Number(declaration.offset) / 4;
        if (!Number.isInteger(offset) || offset < 0)
        {
            throw new Error("GLES morph target declaration has an invalid offset");
        }

        for (let item = 0; item < targetVertexCount; item++)
        {
            const vertex = sparse ? Number(sparse[item]) : item;
            if (!Number.isInteger(vertex) || vertex < 0 || vertex >= vertexCount)
            {
                throw new Error(`GLES morph target ${JSON.stringify(target.sourceName)} has an invalid vertex index`);
            }
            const destination = vertex * stride + offset;
            const source = item * components;
            for (let component = 0; component < components; component++)
            {
                const base = original[destination + component];
                const value = Number(values[source + component]);
                if (!Number.isFinite(value))
                {
                    throw new Error(`GLES morph target ${JSON.stringify(target.sourceName)} contains non-finite data`);
                }
                deformed[destination + component] += weight * (
                    target.dataIsDeltas === true ? value : value - base
                );
            }
            changed.add(vertex);
        }
    }
}

function EmptyPrepared(mesh, meshIndex)
{
    return {
        mesh,
        meshIndex,
        bufferData: mesh?.bufferData ?? null,
        buffer: mesh?.buffer ?? null,
        original: null,
        deformed: null,
        matchedTargets: [],
        changedVertexCount: 0
    };
}

function TargetIdentity(target)
{
    return normalizeCjsCharacterGlesMorphTargetName(target?.sourceName || target?.name || "");
}

/** Normalizes the authored Shape suffix and separators used by GR2 targets. */
export function normalizeCjsCharacterGlesMorphTargetName(value)
{
    return String(value ?? "")
        .trim()
        .replace(/shape[\s_.-]*\d*$/iu, "")
        .replace(/[^a-z0-9]+/giu, "")
        .toLowerCase();
}

function AreEquivalentTargets(targets)
{
    const first = targets[0];
    return targets.slice(1).every(target => AreEquivalentTargetPayloads(first, target));
}

function AreEquivalentTargetPayloads(left, right)
{
    if ((left?.dataIsDeltas === true) !== (right?.dataIsDeltas === true)) return false;
    if (!AreEquivalentNumberArrays(left?.vertexIndices ?? null, right?.vertexIndices ?? null))
    {
        return false;
    }

    const leftChannels = NormalizeTargetChannels(left?.vertex);
    const rightChannels = NormalizeTargetChannels(right?.vertex);
    if (!leftChannels || !rightChannels || leftChannels.size !== rightChannels.size) return false;
    for (const [ channel, values ] of leftChannels)
    {
        if (!rightChannels.has(channel)
            || !AreEquivalentNumberArrays(values, rightChannels.get(channel)))
        {
            return false;
        }
    }
    return true;
}

function NormalizeTargetChannels(vertex)
{
    const channels = new Map();
    for (const [ key, values ] of Object.entries(vertex ?? {}))
    {
        const channel = String(key).toUpperCase();
        if (!TARGET_CHANNELS.has(channel) || !values?.length) continue;
        if (channels.has(channel)) return null;
        channels.set(channel, values);
    }
    return channels;
}

function AreEquivalentNumberArrays(left, right)
{
    if (left === right) return true;
    if (left == null || right == null || left.length !== right.length) return false;
    for (let index = 0; index < left.length; index++)
    {
        if (Number(left[index]) !== Number(right[index])) return false;
    }
    return true;
}

function VerifyPreparedIdentity(prepared)
{
    for (const value of prepared)
    {
        if (!value.matchedTargets.length) continue;
        if (value.mesh?.bufferData !== value.bufferData || value.mesh?.buffer !== value.buffer)
        {
            throw new Error("GLES morph deformation geometry changed while leased");
        }
    }
}

function ApplyPrepared(prepared, geometryHost)
{
    const applied = [];
    try
    {
        for (const value of prepared)
        {
            if (!value.matchedTargets.length) continue;
            value.bufferData.set(value.deformed);
            geometryHost.RebuildMeshBounds(value.mesh);
            applied.push(value);
            if (!geometryHost.UploadVertices(value.mesh))
            {
                throw new Error("GLES morph deformation upload failed");
            }
        }
    }
    catch (error)
    {
        error.rollbackFailures = RestorePrepared(applied, geometryHost);
        throw error;
    }
}

function ApplyUpdatedPrepared(previous, prepared, geometryHost)
{
    if (previous.length !== prepared.length)
    {
        throw new Error("GLES morph deformation geometry changed while leased");
    }

    const applied = [];
    try
    {
        for (let index = 0; index < prepared.length; index++)
        {
            const before = previous[index];
            const after = prepared[index];
            if (before.mesh !== after.mesh || before.bufferData !== after.bufferData
                || before.buffer !== after.buffer)
            {
                throw new Error("GLES morph deformation geometry changed while leased");
            }
            if (!before.matchedTargets.length && !after.matchedTargets.length) continue;
            after.bufferData.set(after.deformed);
            geometryHost.RebuildMeshBounds(after.mesh);
            applied.push({ before, after });
            if (!geometryHost.UploadVertices(after.mesh))
            {
                throw new Error("GLES morph deformation upload failed");
            }
        }
    }
    catch (error)
    {
        const rollbackFailures = [];
        for (const { before } of applied.reverse())
        {
            try
            {
                before.bufferData.set(before.deformed);
                geometryHost.RebuildMeshBounds(before.mesh);
                if (!geometryHost.UploadVertices(before.mesh))
                {
                    throw new Error("vertex update rollback upload failed");
                }
            }
            catch (rollbackError)
            {
                rollbackFailures.push(rollbackError);
            }
        }
        error.rollbackFailures = rollbackFailures;
        throw error;
    }
}

function RestorePrepared(prepared, geometryHost)
{
    const failures = [];
    for (const value of [ ...prepared ].reverse())
    {
        if (!value.matchedTargets.length) continue;
        try
        {
            value.bufferData.set(value.original);
            geometryHost.RebuildMeshBounds(value.mesh);
            if (!geometryHost.UploadVertices(value.mesh))
            {
                throw new Error("vertex restore upload failed");
            }
        }
        catch (error)
        {
            failures.push(error);
        }
    }
    return failures;
}

function RequireGeometryHost(value)
{
    const host = value && typeof value === "object" ? value : null;
    for (const name of [
        "GetMeshes",
        "EnsureSystemMirror",
        "GetVertexChannelDeclaration",
        "RebuildMeshBounds",
        "UploadVertices",
        "RebuildBounds"
    ])
    {
        if (typeof host?.[name] !== "function")
        {
            throw new TypeError(`GLES morph deformation geometryHost.${name} is required`);
        }
    }
    return host;
}

function CreateReport(requests, prepared, matched)
{
    return {
        status: "applied",
        rule: "legacy-gles-exact-morph-target-v1",
        requestedTargetCount: requests.length,
        matchedTargetCount: matched.size,
        matchedTargets: [ ...matched ].sort(),
        meshReports: prepared.map(value => ({
            meshIndex: value.meshIndex,
            matchedTargets: [ ...value.matchedTargets ],
            changedVertexCount: value.changedVertexCount,
            uploaded: value.matchedTargets.length > 0
        }))
    };
}

function CloneReport(value)
{
    return {
        ...value,
        matchedTargets: [ ...value.matchedTargets ],
        meshReports: value.meshReports.map(report => ({
            ...report,
            matchedTargets: [ ...report.matchedTargets ]
        }))
    };
}

export default CjsCharacterGlesMorphDeformation;
