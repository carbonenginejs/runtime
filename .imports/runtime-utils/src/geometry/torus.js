import { toJSON } from "./json.js";
import { vec3 } from "../vec3.js";


export function createTorus(options = {})
{
    let {
        radius = 1,
        tube = 0.4,
        radialSegments = 12,
        tubularSegments = 49,
        arc = Math.PI * 2
    } = options;

    if (![ radius, tube, radialSegments, tubularSegments, arc ].every(Number.isFinite) ||
        radius <= 0 ||
        tube <= 0 ||
        arc === 0)
    {
        throw new Error("Invalid torus dimensions");
    }

    radialSegments = Math.max(3, Math.floor(Number.isFinite(radialSegments) ? radialSegments : 12));
    tubularSegments = Math.max(3, Math.floor(Number.isFinite(tubularSegments) ? tubularSegments : 49));

    const
        indices = [],
        positions = [],
        uvs = [],
        normals = [];

    const
        center = vec3.alloc(),
        vertex = vec3.alloc(),
        normal = vec3.alloc();

    // generate vertices, normals and uvs
    for (let j = 0; j <= radialSegments; j++)
    {
        for (let i = 0; i <= tubularSegments; i++)
        {
            const
                u = i / tubularSegments * arc,
                v = j / radialSegments * Math.PI * 2;

            // vertex
            vertex[0] = (radius + tube * Math.cos(v)) * Math.cos(u);
            vertex[1] = (radius + tube * Math.cos(v)) * Math.sin(u);
            vertex[2] = tube * Math.sin(v);
            positions.push(vertex[0], vertex[1], vertex[2]);

            // normal
            center[0] = radius * Math.cos(u);
            center[1] = radius * Math.sin(u);
            vec3.subtract(normal, vertex, center);
            vec3.normalize(normal, normal);
            normals.push(normal[0], normal[1], normal[2]);

            // uv
            uvs.push(i / tubularSegments);
            uvs.push(j / radialSegments);
        }
    }

    vec3.unalloc(center);
    vec3.unalloc(vertex);
    vec3.unalloc(normal);

    // generate indices
    for (let j = 1; j <= radialSegments; j++)
    {
        for (let i = 1; i <= tubularSegments; i++)
        {
            // indices
            const
                a = (tubularSegments + 1) * j + i - 1,
                b = (tubularSegments + 1) * (j - 1) + i - 1,
                c = (tubularSegments + 1) * (j - 1) + i,
                d = (tubularSegments + 1) * j + i;
            // faces
            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    const result = toJSON(indices, positions, uvs, normals);
    result.factory = createTorus;
    result.options = {
        radius,
        tube,
        radialSegments,
        tubularSegments,
        arc
    };
    return result;
}
