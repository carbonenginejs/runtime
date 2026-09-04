function f32(value)
{
    return Math.fround(value);
}

function length3(x, y, z)
{
    const
        xx = f32(f32(x) * f32(x)),
        yy = f32(f32(y) * f32(y)),
        zz = f32(f32(z) * f32(z)),
        squared = f32(f32(xx + yy) + zz);
    return f32(Math.sqrt(squared));
}

function meshDiameter(position)
{
    if (!position.length) return 0;

    const min = [ f32(position[0]), f32(position[1]), f32(position[2]) ];
    const max = min.slice();
    for (let offset = 3; offset < position.length; offset += 3)
    {
        for (let component = 0; component < 3; component++)
        {
            const value = f32(position[offset + component]);
            if (value < min[component]) min[component] = value;
            if (value > max[component]) max[component] = value;
        }
    }
    return length3(
        f32(max[0] - min[0]),
        f32(max[1] - min[1]),
        f32(max[2] - min[2])
    );
}

function edgeLength(position, leftIndex, rightIndex)
{
    const left = leftIndex * 3;
    const right = rightIndex * 3;
    return length3(
        f32(f32(position[left]) - f32(position[right])),
        f32(f32(position[left + 1]) - f32(position[right + 1])),
        f32(f32(position[left + 2]) - f32(position[right + 2]))
    );
}

function uvDistanceSquared(uv, width, leftIndex, rightIndex)
{
    let squared = 0;
    const left = leftIndex * width;
    const right = rightIndex * width;
    for (let component = 0; component < 4; component++)
    {
        const difference = component < width
            ? f32(f32(uv[left + component]) - f32(uv[right + component]))
            : 0;
        squared = f32(squared + f32(difference * difference));
    }
    return squared;
}

function calculateUvDensity(position, uv, indices)
{
    const vertexCount = Math.floor(position.length / 3);
    if (!vertexCount || !uv.length || uv.length % vertexCount) return 0;

    const
        uvWidth = uv.length / vertexCount,
        diameter = meshDiameter(position),
        densities = [];
    let totalArea = 0;

    if (indices.length % 3)
    {
        throw new Error("CMF UV density triangle index count must be divisible by 3");
    }

    for (let offset = 0; offset < indices.length; offset += 3)
    {
        const triangle = [ indices[offset], indices[offset + 1], indices[offset + 2] ];
        if (triangle.some(index => !Number.isInteger(index) || index < 0 || index >= vertexCount))
        {
            throw new Error("CMF UV density index is outside the vertex range");
        }

        const edges = new Array(3);
        let density = 0;
        let valid = true;
        for (let edge = 0; edge < 3; edge++)
        {
            const
                left = triangle[edge],
                right = triangle[(edge + 1) % 3],
                dx = edgeLength(position, left, right);
            if (dx === 0)
            {
                valid = false;
                break;
            }
            edges[edge] = dx;

            let dy = uvDistanceSquared(uv, uvWidth, left, right);
            if (dy !== 0)
            {
                dy = f32(f32(Math.sqrt(dy)) * diameter);
                const ratio = f32(dy / dx);
                density = edge === 0 ? ratio : Math.min(density, ratio);
            }
        }
        if (!valid) continue;

        const
            perimeter = f32(f32(f32(edges[0] + edges[1]) + edges[2]) * 0.5),
            area = Math.sqrt(Math.max(
                perimeter * (perimeter - edges[0]) *
                (perimeter - edges[1]) * (perimeter - edges[2]),
                0
            ));
        totalArea += area;
        densities.push([ f32(area), density ]);
    }

    if (!densities.length) return 0;
    densities.sort((left, right) => left[1] - right[1]);

    const discardArea = totalArea * f32(0.03);
    let discarded = 0;
    let offset = 0;
    while (discarded < discardArea && offset < densities.length)
    {
        discarded = f32(discarded + densities[offset][0]);
        offset++;
    }

    // Carbon indexes one past the vector when the discarded prefix consumes
    // every triangle (mesh/src/cmf/uvdensity.cpp:77-89). That is undefined
    // native behavior for single triangles and some small meshes. CMF output
    // must stay deterministic, so clamp to the last measured density.
    return densities[Math.min(offset, densities.length - 1)][1];
}

/**
 * Calculate CMF UV-density entries from shared vertex and index channels.
 *
 * @param {object} vertex Shared vertex channels.
 * @param {object[]} groups Shared triangle index groups.
 * @param {object[]} declaration CMF vertex declaration.
 * @returns {number[]} One value for every TexCoord usage index through the maximum.
 */
export function calculateUvDensities(vertex, groups, declaration)
{
    let uvSetCount = 0;
    for (const element of declaration)
    {
        if (element.usage === "TexCoord")
        {
            uvSetCount = Math.max(uvSetCount, element.usageIndex + 1);
        }
    }
    if (!uvSetCount || !(vertex.position ?? []).length) return [];

    const indices = [];
    for (const group of groups ?? [])
    {
        for (const index of group.faces ?? []) indices.push(index);
    }

    const densities = new Array(uvSetCount).fill(0);
    for (const element of declaration)
    {
        if (element.usage !== "TexCoord") continue;
        densities[element.usageIndex] = calculateUvDensity(
            vertex.position,
            vertex[`texcoord${element.usageIndex}`] ?? [],
            indices
        );
    }
    return densities;
}
