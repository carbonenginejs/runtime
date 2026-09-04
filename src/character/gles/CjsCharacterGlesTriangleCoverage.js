const coverageStates = new WeakMap();

/**
 * Reversibly masks triangles for reviewed GLES foundation-coverage policies.
 *
 * Cached geometry may be shared by overlapping appearance revisions. Leases
 * keep a mask active until the final realized consumer has released it. All
 * live resource and buffer work is performed by the injected geometry host.
 */
export class CjsCharacterGlesTriangleCoverage
{
    _geometryHost;

    constructor({ geometryHost } = {})
    {
        this._geometryHost = RequireGeometryHost(geometryHost);
    }

    /** Acquires one coverage lease and returns a detached application report. */
    async Acquire(geometryResource, policy)
    {
        ValidatePolicy(policy);
        const meshes = this._geometryHost.GetMeshes(geometryResource);
        if (!Array.isArray(meshes) || !meshes.length)
        {
            throw new Error("GLES triangle coverage requires geometry meshes");
        }

        let state = coverageStates.get(geometryResource);
        if (state?.leases.size)
        {
            const lease = {};
            const previousPrepared = state.prepared;
            const policies = new Map(state.policies);
            policies.set(lease, CreatePolicyDescriptor(policy));
            const prepared = BuildPrepared(state.meshes, state.originalIndices, [ ...policies.values() ]);
            if (prepared.some(value => !value.available)
                || !prepared.some(value => value.maskedTriangleCount > 0))
            {
                throw new Error("GLES semantic triangle coverage could not be prepared");
            }
            try
            {
                ApplyPrepared(prepared, this._geometryHost);
            }
            catch (error)
            {
                error.rollbackFailures ??= [];
                error.rollbackFailures.push(...TryApplyPrepared(
                    previousPrepared,
                    this._geometryHost
                ));
                throw error;
            }
            const report = CreateReport(policy, prepared);
            state.leases.add(lease);
            state.policies = policies;
            state.prepared = prepared;
            state.report = report;
            await this._geometryHost.RebuildBounds(geometryResource);
            return { lease, report: CloneReport(report) };
        }

        await this._geometryHost.EnsureSystemMirror(geometryResource);
        const originalIndices = meshes.map(mesh => mesh?.indexData?.slice?.() ?? null);
        const prepared = BuildPrepared(meshes, originalIndices, [ CreatePolicyDescriptor(policy) ]);
        if (prepared.some(value => !value.available)
            || !prepared.some(value => value.maskedTriangleCount > 0))
        {
            throw new Error("GLES semantic triangle coverage could not be prepared");
        }

        ApplyPrepared(prepared, this._geometryHost);
        await this._geometryHost.RebuildBounds(geometryResource);

        const report = CreateReport(policy, prepared);
        const lease = {};
        state = {
            leases: new Set([ lease ]),
            policies: new Map([ [ lease, CreatePolicyDescriptor(policy) ] ]),
            meshes,
            originalIndices,
            prepared,
            report
        };
        coverageStates.set(geometryResource, state);
        return { lease, report: CloneReport(report) };
    }

    /** Releases a lease and restores captured indices after the final owner. */
    async Release(geometryResource, lease)
    {
        const state = coverageStates.get(geometryResource);
        if (!state?.leases.has(lease)) return false;
        state.leases.delete(lease);
        const releasedPolicy = state.policies.get(lease);
        state.policies.delete(lease);
        if (state.leases.size)
        {
            const previousPrepared = state.prepared;
            const prepared = BuildPrepared(
                state.meshes,
                state.originalIndices,
                [ ...state.policies.values() ]
            );
            try
            {
                ApplyPrepared(prepared, this._geometryHost);
            }
            catch (error)
            {
                const reapplyFailures = TryApplyPrepared(previousPrepared, this._geometryHost);
                state.leases.add(lease);
                state.policies.set(lease, releasedPolicy);
                error.rollbackFailures ??= [];
                error.rollbackFailures.push(...reapplyFailures);
                throw error;
            }
            state.prepared = prepared;
            await this._geometryHost.RebuildBounds(geometryResource);
            return true;
        }

        const failures = RestorePrepared(state.prepared, this._geometryHost);
        if (failures.length)
        {
            const reapplyFailures = TryApplyPrepared(state.prepared, this._geometryHost);
            state.leases.add(lease);
            state.policies.set(lease, releasedPolicy);
            failures.push(...reapplyFailures);
            const error = new Error("GLES triangle coverage restore failed");
            error.errors = failures;
            throw error;
        }
        await this._geometryHost.RebuildBounds(geometryResource);
        coverageStates.delete(geometryResource);
        return true;
    }
}

function ApplyPrepared(prepared, geometryHost)
{
    const applied = [];
    try
    {
        for (const item of prepared)
        {
            SetIndices(item.mesh.indexData, item.maskedIndices);
            applied.push(item);
            if (!geometryHost.UploadIndices(item.mesh))
            {
                throw new Error("GLES foot/toe triangle coverage upload failed");
            }
        }
    }
    catch (error)
    {
        error.rollbackFailures = RestorePrepared(applied, geometryHost);
        throw error;
    }
}

function TryApplyPrepared(prepared, geometryHost)
{
    try
    {
        ApplyPrepared(prepared, geometryHost);
        return [];
    }
    catch (error)
    {
        return [ error, ...(error.rollbackFailures ?? []) ];
    }
}

function BuildPrepared(meshes, originalIndices, policies)
{
    return meshes.map((mesh, index) => PrepareMesh(mesh, policies, originalIndices[index]));
}

function CreatePolicyDescriptor(policy)
{
    return {
        bonePrefixes: [ ...policy.bonePrefixes ],
        triangleSelection: policy.triangleSelection ?? "any-vertex"
    };
}

function PrepareMesh(mesh, policies, sourceIndices = null)
{
    const indices = mesh?.indexData;
    const bindings = Array.isArray(mesh?.boneBindings) ? mesh.boneBindings : [];
    const stride = Number(mesh?.declaration?.stride) / 4;
    const vertexCount = Number(mesh?._vertices)
        || (Number.isInteger(stride) && stride > 0 && mesh?.bufferData
            ? Math.floor(mesh.bufferData.length / stride)
            : 0);
    if (!indices?.length || !bindings.length || !vertexCount
        || typeof mesh?.GetVertexBlendIndice !== "function"
        || typeof mesh?.GetVertexBlendWeight !== "function")
    {
        return {
            mesh,
            available: false,
            originalIndices: null,
            maskedIndices: null,
            matchedBoneCount: 0,
            maskedVertexCount: 0,
            maskedTriangleCount: 0
        };
    }

    const originalIndices = sourceIndices?.slice?.() ?? indices.slice();
    const maskedIndices = originalIndices.slice();
    const matchedBoneSets = policies.map(policy =>
    {
        const prefixes = policy.bonePrefixes.map(value => value.toLowerCase());
        const matched = new Set();
        bindings.forEach((binding, index) =>
        {
            const name = String(binding ?? "").toLowerCase();
            if (prefixes.some(prefix => name.startsWith(prefix))) matched.add(index);
        });
        return matched;
    });

    const affectedByPolicy = policies.map(() => new Uint8Array(vertexCount));
    const affected = new Uint8Array(vertexCount);
    const blendIndices = [ 0, 0, 0, 0 ];
    const blendWeights = [ 0, 0, 0, 0 ];
    let maskedVertexCount = 0;
    for (let vertex = 0; vertex < vertexCount; vertex++)
    {
        if (mesh.declaration?.swapBlendWeightsAndIndices === false)
        {
            mesh.GetVertexBlendWeight(blendIndices, vertex);
            mesh.GetVertexBlendIndice(blendWeights, vertex);
        }
        else
        {
            mesh.GetVertexBlendIndice(blendIndices, vertex);
            mesh.GetVertexBlendWeight(blendWeights, vertex);
        }
        for (let influence = 0; influence < 4; influence++)
        {
            const boneIndex = Math.round(Number(blendIndices[influence]));
            const weight = Math.abs(Number(blendWeights[influence]) || 0);
            if (weight <= 1e-6) continue;
            matchedBoneSets.forEach((matchedBones, policyIndex) =>
            {
                if (matchedBones.has(boneIndex)) affectedByPolicy[policyIndex][vertex] = 1;
            });
        }
        if (affectedByPolicy.some(value => value[vertex]))
        {
            affected[vertex] = 1;
            maskedVertexCount++;
        }
    }

    let maskedTriangleCount = 0;
    for (let index = 0; index + 2 < maskedIndices.length; index += 3)
    {
        const a = Number(maskedIndices[index]);
        const b = Number(maskedIndices[index + 1]);
        const c = Number(maskedIndices[index + 2]);
        if (![ a, b, c ].every(value => Number.isInteger(value)
            && value >= 0 && value < vertexCount)) continue;
        const selected = policies.some((policy, policyIndex) =>
        {
            const policyAffected = affectedByPolicy[policyIndex];
            return policy.triangleSelection === "all-vertices"
                ? policyAffected[a] && policyAffected[b] && policyAffected[c]
                : policyAffected[a] || policyAffected[b] || policyAffected[c];
        });
        if (!selected) continue;
        maskedIndices[index + 1] = a;
        maskedIndices[index + 2] = a;
        maskedTriangleCount++;
    }

    return {
        mesh,
        available: true,
        originalIndices,
        maskedIndices,
        matchedBoneCount: new Set(matchedBoneSets.flatMap(value => [ ...value ])).size,
        maskedVertexCount,
        maskedTriangleCount
    };
}

function RestorePrepared(prepared, geometryHost)
{
    const failures = [];
    for (const item of [ ...prepared ].reverse())
    {
        try
        {
            SetIndices(item.mesh.indexData, item.originalIndices);
            if (!geometryHost.UploadIndices(item.mesh))
            {
                throw new Error("index restore upload failed");
            }
        }
        catch (error)
        {
            failures.push(error);
        }
    }
    return failures;
}

function SetIndices(target, source)
{
    if (typeof target?.set === "function") target.set(source);
    else source.forEach((value, index) => { target[index] = value; });
}

function RequireGeometryHost(value)
{
    const host = value && typeof value === "object" ? value : null;
    for (const name of [ "GetMeshes", "EnsureSystemMirror", "UploadIndices", "RebuildBounds" ])
    {
        if (typeof host?.[name] !== "function")
        {
            throw new TypeError(`GLES triangle coverage geometryHost.${name} is required`);
        }
    }
    return host;
}

function ValidatePolicy(policy)
{
    const footwear = [ "LeftFoot", "RightFoot", "LeftToe", "RightToe" ];
    const fullLeg = [
        "LeftUpLeg", "RightUpLeg", "LeftLeg", "RightLeg",
        "LeftFoot", "RightFoot", "LeftToe", "RightToe"
    ];
    const expected = policy?.evidence?.rule === "legacy-opengl-authored-leg-coverage-v1"
        ? fullLeg
        : footwear;
    if (policy?.strategy !== "triangle-mask"
        || policy?.triangleRule !== "legacy-opengl-exact-foundation-triangle-coverage-v1"
        || policy?.evidence?.status !== "policy"
        || ![
            "legacy-opengl-exact-foundation-coverage-v1",
            "legacy-opengl-authored-footwear-coverage-v1",
            "legacy-opengl-configured-footwear-skin-replacement-v1",
            "legacy-opengl-authored-leg-coverage-v1"
        ].includes(policy?.evidence?.rule)
        || !Array.isArray(policy?.bonePrefixes)
        || policy?.triangleSelection !== (policy?.evidence?.rule
            === "legacy-opengl-authored-leg-coverage-v1"
            ? "all-vertices"
            : undefined)
        || policy.bonePrefixes.length !== expected.length
        || expected.some((value, index) => policy.bonePrefixes[index] !== value))
    {
        throw new TypeError("Unsupported GLES triangle coverage policy");
    }
}

function CreateReport(policy, prepared)
{
    return {
        status: "applied",
        rule: policy.triangleRule,
        bonePrefixes: [ ...policy.bonePrefixes ],
        matchedBoneCount: prepared.reduce((sum, value) => sum + value.matchedBoneCount, 0),
        maskedVertexCount: prepared.reduce((sum, value) => sum + value.maskedVertexCount, 0),
        maskedTriangleCount: prepared.reduce((sum, value) => sum + value.maskedTriangleCount, 0),
        meshReports: prepared.map(value => ({
            available: value.available,
            matchedBoneCount: value.matchedBoneCount,
            maskedVertexCount: value.maskedVertexCount,
            maskedTriangleCount: value.maskedTriangleCount,
            uploaded: true
        }))
    };
}

function CloneReport(value)
{
    return {
        ...value,
        bonePrefixes: [ ...value.bonePrefixes ],
        meshReports: value.meshReports.map(report => ({ ...report }))
    };
}

export default CjsCharacterGlesTriangleCoverage;
