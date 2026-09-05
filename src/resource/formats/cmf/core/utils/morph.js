/** Resolve a mesh morph name to its animation channel name using Carbon's Shape suffix convention. */
export function morphAnimationTargetName(name)
{
    // AddMorphWeightChannels strips one suffix only when a non-empty name remains.
    return name.length > 5 && name.endsWith("Shape") ? name.slice(0, -5) : name;
}

function vertexCountOf(vertex)
{
    for (const [ name, width ] of [
        [ "position", 3 ], [ "normal", 3 ], [ "tangent", 3 ], [ "binormal", 3 ],
        [ "texcoord0", 2 ], [ "texcoord1", 2 ], [ "color0", 4 ],
        [ "blendIndice", 4 ], [ "blendWeight", 4 ]
    ])
    {
        const values = vertex?.[name] ?? [];
        if (values.length) return Math.floor(values.length / width);
    }
    return 0;
}

function sourceCountOf(target, fallback)
{
    return Array.isArray(target.vertexIndices) ? target.vertexIndices.length : vertexCountOf(target.vertex) || fallback;
}

function channelWidth(values, count, channel)
{
    if (!values.length) return 0;
    if (!count || values.length % count)
    {
        throw new Error(`CMF morph ${channel} length ${values.length} does not match ${count} vertices`);
    }
    return values.length / count;
}

function baseChannelValues(baseVertex, channel, vertexCount, width)
{
    const base = baseVertex?.[channel] ?? [];
    if (!base.length) return new Array(vertexCount * width).fill(0);

    const baseWidth = channelWidth(base, vertexCount, channel);
    const values = new Array(vertexCount * width).fill(0);
    for (let row = 0; row < vertexCount; row++)
    {
        for (let component = 0; component < width; component++)
        {
            values[row * width + component] = base[row * baseWidth + component] ?? 0;
        }
    }
    return values;
}

/** Canonicalize a shared morph target to full per-vertex CMF absolute channels. */
export function canonicalMorphVertex(baseVertex, target, specs = null, explicitVertexCount = null)
{
    const vertexCount = explicitVertexCount ?? vertexCountOf(baseVertex);
    const sourceVertex = target.vertex ?? {};
    const sourceCount = sourceCountOf(target, vertexCount);
    const indices = Array.isArray(target.vertexIndices) ? target.vertexIndices : null;
    const output = {};

    const channels = specs ?? [
        ...(baseVertex?.position?.length ? [ { name: "position", elementCount: 3 } ] : []),
        ...Object.keys(sourceVertex)
            .filter(name => name !== "position")
            .map((name) => ({ name }))
    ];
    for (const spec of channels)
    {
        const channel = spec.name;
        const source = sourceVertex[channel] ?? [];
        const base = baseVertex?.[channel] ?? [];
        if (!base.length && source.length)
        {
            throw new Error(`CMF morph ${channel} is absent from the base vertex declaration`);
        }
        if (!Array.isArray(source)) throw new TypeError(`CMF morph ${channel} must be an array`);
        const width = spec.elementCount ?? (
            source.length
                ? channelWidth(source, sourceCount, channel)
                : channelWidth(base, vertexCount, channel)
        );
        const values = baseChannelValues(baseVertex, channel, vertexCount, width);
        if (!source.length)
        {
            output[channel] = values;
            continue;
        }
        if (source.length !== sourceCount * width)
        {
            throw new Error(`CMF morph ${channel} length ${source.length} does not match ${sourceCount} vec${width} values`);
        }
        const baseWidth = base.length ? channelWidth(base, vertexCount, channel) : width;
        for (let row = 0; row < sourceCount; row++)
        {
            const vertexIndex = indices ? indices[row] : row;
            if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= vertexCount)
            {
                throw new Error(`CMF morph ${channel} vertex index ${vertexIndex} is outside 0..${vertexCount - 1}`);
            }
            for (let component = 0; component < width; component++)
            {
                const sourceValue = source[row * width + component];
                const baseValue = base[vertexIndex * baseWidth + component] ?? 0;
                values[vertexIndex * width + component] = target.dataIsDeltas === false
                    ? sourceValue
                    : sourceValue + baseValue;
            }
        }
        output[channel] = values;
    }
    return output;
}

/** Maximum Euclidean displacement between flat vec3 absolute and base channels. */
export function maxMorphDisplacement(position = [], basePosition = [])
{
    let maximum = 0;
    for (let index = 0; index < position.length; index += 3)
    {
        maximum = Math.max(maximum, Math.hypot(
            (position[index] ?? 0) - (basePosition[index] ?? 0),
            (position[index + 1] ?? 0) - (basePosition[index + 1] ?? 0),
            (position[index + 2] ?? 0) - (basePosition[index + 2] ?? 0)
        ));
    }
    return maximum;
}
