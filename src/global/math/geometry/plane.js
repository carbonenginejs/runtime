import { toJSON } from "./json.js";

/**
 * Creates a plane
 * @author Three.js converted
 * @param {Object} [options={}]
 * @param {Number} [options.width=1]
 * @param {Number} [options.height=1]
 * @param {Number} [widthSegments=1]
 * @param {Number} [heightSegments=1]
 * @returns {Object}
 */
export function createPlane(options = {})
{
    const {
        width = 1,
        height = 1,
        widthSegments = 1,
        heightSegments = 1
    } = options;

    if (!Number.isFinite(width) || !Number.isFinite(height) || width === 0 || height === 0)
    {
        throw new Error("Plane dimensions must be finite and non-zero");
    }

    const
        indices = [],
        positions = [],
        normals = [],
        uvs = [];

    const
        widthHalf = width / 2,
        heightHalf = height / 2,
        gridX = Math.max(1, Math.floor(Number.isFinite(widthSegments) ? widthSegments : 1)),
        gridY = Math.max(1, Math.floor(Number.isFinite(heightSegments) ? heightSegments : 1)),
        gridX1 = gridX + 1,
        gridY1 = gridY + 1,
        segmentWidth = width / gridX,
        segmentHeight = height / gridY;

    for (let iy = 0; iy < gridY1; iy++)
    {
        const y = iy * segmentHeight - heightHalf;
        for (let ix = 0; ix < gridX1; ix++)
        {
            const x = ix * segmentWidth - widthHalf;
            positions.push(x, -y, 0);
            normals.push(0, 0, 1);
            uvs.push(ix / gridX);
            uvs.push(1 - (iy / gridY));
        }
    }

    for (let iy = 0; iy < gridY; iy++)
    {
        for (let ix = 0; ix < gridX; ix++)
        {
            const
                a = ix + gridX1 * iy,
                b = ix + gridX1 * (iy + 1),
                c = (ix + 1) + gridX1 * (iy + 1),
                d = (ix + 1) + gridX1 * iy;

            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    // Normalize
    const result = toJSON(indices, positions, uvs, normals);
    result.factory = createPlane;
    result.options = {
        width,
        height,
        widthSegments: gridX,
        heightSegments: gridY
    };
    return result;
}
