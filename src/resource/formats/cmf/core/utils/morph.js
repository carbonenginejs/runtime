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

/** Canonicalize a shared morph target to full per-vertex CMF delta channels. */
export function canonicalMorphVertex(baseVertex, target, specs = null, explicitVertexCount = null)
{
    const vertexCount = explicitVertexCount ?? vertexCountOf(baseVertex);
    const sourceVertex = target.vertex ?? {};
    const sourceCount = sourceCountOf(target, vertexCount);
    const indices = Array.isArray(target.vertexIndices) ? target.vertexIndices : null;
    const output = {};

    const channels = specs ?? Object.keys(sourceVertex).map((name) => ({ name }));
    for (const spec of channels)
    {
        const channel = spec.name;
        const source = sourceVertex[channel] ?? [];
        if (specs && !source.length)
        {
            output[channel] = new Array(vertexCount * spec.elementCount).fill(0);
            continue;
        }
        if (!Array.isArray(source) || !source.length) continue;
        const width = spec.elementCount ?? channelWidth(source, sourceCount, channel);
        if (source.length !== sourceCount * width)
        {
            throw new Error(`CMF morph ${channel} length ${source.length} does not match ${sourceCount} vec${width} values`);
        }
        const base = baseVertex?.[channel] ?? [];
        const baseWidth = base.length ? channelWidth(base, vertexCount, channel) : width;
        const values = new Array(vertexCount * width).fill(0);
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
                    ? sourceValue - baseValue
                    : sourceValue;
            }
        }
        output[channel] = values;
    }
    return output;
}

/** Maximum Euclidean displacement in a flat vec3 delta channel. */
export function maxMorphDisplacement(position = [])
{
    let maximum = 0;
    for (let index = 0; index < position.length; index += 3)
    {
        maximum = Math.max(maximum, Math.hypot(
            position[index] ?? 0,
            position[index + 1] ?? 0,
            position[index + 2] ?? 0
        ));
    }
    return maximum;
}
