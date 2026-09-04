const originalIndices = new WeakMap();

/**
 * Applies reviewed GLES palette-capacity policies to realized geometry.
 *
 * Geometry inspection is intentionally local to this backend helper; every
 * platform-specific resource operation is delegated to the injected host.
 */
export class CjsCharacterGlesPaletteCompatibility
{
    _geometryHost;

    constructor({ geometryHost } = {})
    {
        this._geometryHost = RequireGeometryHost(geometryHost);
    }

    /** Applies one declared palette policy to geometry that the host realized. */
    async Apply(geometryResource, policy)
    {
        ValidatePolicy(policy);

        const meshes = this._geometryHost.GetMeshes(geometryResource);
        if (!Array.isArray(meshes) || !meshes.length)
        {
            throw new Error("GLES palette compatibility requires geometry meshes");
        }

        await this._geometryHost.EnsureSystemMirror(geometryResource);

        const reports = meshes.map(mesh => MaskMesh(
            mesh,
            policy.bonePrefixes,
            this._geometryHost
        ));
        const report = {
            status: reports.every(value => value.available && value.uploaded)
                ? "applied"
                : "failed",
            rule: policy.rule,
            shaderCapacity: policy.shaderCapacity,
            requiredBoneCount: policy.requiredBoneCount,
            bonePrefixes: [ ...policy.bonePrefixes ],
            matchedBoneCount: reports.reduce((sum, value) => sum + value.matchedBoneCount, 0),
            maskedVertexCount: reports.reduce((sum, value) => sum + value.maskedVertexCount, 0),
            maskedTriangleCount: reports.reduce((sum, value) => sum + value.maskedTriangleCount, 0),
            meshReports: reports
        };

        if (report.status !== "applied" || !report.maskedTriangleCount)
        {
            throw new Error("GLES right-hand compatibility mask could not be applied");
        }

        await this._geometryHost.RebuildBounds(geometryResource);
        return report;
    }
}

function MaskMesh(mesh, bonePrefixes, geometryHost)
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
        return EmptyReport(false);
    }

    let source = originalIndices.get(mesh);
    if (!source || source.target !== indices || source.values.length !== indices.length)
    {
        source = { target: indices, values: indices.slice() };
        originalIndices.set(mesh, source);
    }
    if (typeof indices.set === "function") indices.set(source.values);
    else source.values.forEach((value, index) => { indices[index] = value; });

    const normalizedPrefixes = bonePrefixes.map(value => value.toLowerCase());
    const matchedBones = new Set();

    bindings.forEach((binding, index) =>
    {
        const name = String(binding ?? "").toLowerCase();
        if (normalizedPrefixes.some(prefix => name.startsWith(prefix))) matchedBones.add(index);
    });

    if (!matchedBones.size) return EmptyReport(true);

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
            if (weight <= 1e-6 || !matchedBones.has(boneIndex)) continue;
            affected[vertex] = 1;
            maskedVertexCount++;
            break;
        }
    }

    let maskedTriangleCount = 0;
    for (let index = 0; index + 2 < indices.length; index += 3)
    {
        const a = Number(indices[index]);
        const b = Number(indices[index + 1]);
        const c = Number(indices[index + 2]);
        if (![ a, b, c ].every(value => Number.isInteger(value) && value >= 0 && value < vertexCount)) continue;
        if (!affected[a] && !affected[b] && !affected[c]) continue;
        indices[index + 1] = a;
        indices[index + 2] = a;
        maskedTriangleCount++;
    }

    return {
        available: true,
        matchedBoneCount: matchedBones.size,
        maskedVertexCount,
        maskedTriangleCount,
        uploaded: maskedTriangleCount > 0 && geometryHost.UploadIndices(mesh)
    };
}

function EmptyReport(available)
{
    return {
        available,
        matchedBoneCount: 0,
        maskedVertexCount: 0,
        maskedTriangleCount: 0,
        uploaded: false
    };
}

function RequireGeometryHost(value)
{
    const host = value && typeof value === "object" ? value : null;
    for (const name of [ "GetMeshes", "EnsureSystemMirror", "UploadIndices", "RebuildBounds" ])
    {
        if (typeof host?.[name] !== "function")
        {
            throw new TypeError(`GLES palette compatibility geometryHost.${name} is required`);
        }
    }
    return host;
}

function ValidatePolicy(policy)
{
    if (policy?.status !== "policy"
        || policy?.rule !== "legacy-opengl-bone-capacity-mask-v1"
        || policy?.shaderCapacity !== 58
        || policy?.requiredBoneCount !== 69
        || !Array.isArray(policy?.bonePrefixes)
        || policy.bonePrefixes.length !== 1
        || policy.bonePrefixes[0] !== "RightHand")
    {
        throw new TypeError("Unsupported GLES palette compatibility policy");
    }
}

export default CjsCharacterGlesPaletteCompatibility;
