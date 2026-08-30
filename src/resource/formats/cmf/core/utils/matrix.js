import { normalizeQuaternion } from "./quaternion.js";

/** Invert a finite 4x4 row-major matrix with Gauss-Jordan elimination. */
export function invertMatrix4(matrix)
{
    if (!Array.isArray(matrix) || matrix.length !== 16 || matrix.some((value) => !Number.isFinite(value)))
    {
        throw new Error("CMF matrix must contain 16 finite values");
    }
    const source = [
        matrix.slice(0, 4),
        matrix.slice(4, 8),
        matrix.slice(8, 12),
        matrix.slice(12, 16)
    ];
    const inverse = [
        [ 1, 0, 0, 0 ],
        [ 0, 1, 0, 0 ],
        [ 0, 0, 1, 0 ],
        [ 0, 0, 0, 1 ]
    ];

    for (let column = 0; column < 4; column++)
    {
        let pivotRow = column;
        for (let row = column + 1; row < 4; row++)
        {
            if (Math.abs(source[row][column]) > Math.abs(source[pivotRow][column])) pivotRow = row;
        }
        const pivot = source[pivotRow][column];
        if (Math.abs(pivot) < Number.EPSILON) throw new Error("CMF matrix is not invertible");
        if (pivotRow !== column)
        {
            [ source[column], source[pivotRow] ] = [ source[pivotRow], source[column] ];
            [ inverse[column], inverse[pivotRow] ] = [ inverse[pivotRow], inverse[column] ];
        }
        for (let index = 0; index < 4; index++)
        {
            source[column][index] /= pivot;
            inverse[column][index] /= pivot;
        }
        for (let row = 0; row < 4; row++)
        {
            if (row === column) continue;
            const factor = source[row][column];
            for (let index = 0; index < 4; index++)
            {
                source[row][index] -= factor * source[column][index];
                inverse[row][index] -= factor * inverse[column][index];
            }
        }
    }
    return inverse.flat().map((value) => Math.abs(value) < 1e-12 ? 0 : value);
}

/** Multiply two flat row-major 4x4 matrices. */
export function multiplyMatrix4(a, b)
{
    if (!Array.isArray(a) || a.length !== 16 || !Array.isArray(b) || b.length !== 16)
    {
        throw new Error("CMF matrix multiplication requires two 4x4 matrices");
    }
    const output = new Array(16).fill(0);
    for (let row = 0; row < 4; row++)
    {
        for (let column = 0; column < 4; column++)
        {
            for (let index = 0; index < 4; index++)
            {
                output[row * 4 + column] += a[row * 4 + index] * b[index * 4 + column];
            }
        }
    }
    return output;
}

/** Compose CMF row-vector TRS with translation in elements 12..14. */
export function composeCmfTransform(position, rotation, scale)
{
    if (![ position, scale ].every(value => Array.isArray(value) && value.length === 3) ||
        [ ...position, ...scale ].some(value => !Number.isFinite(value)))
    {
        throw new Error("CMF transform position and scale must contain three finite values");
    }
    const [ x, y, z, w ] = normalizeQuaternion(rotation, "CMF transform rotation");
    const
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,
        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2,
        [ sx, sy, sz ] = scale;

    return [
        (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
        (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
        (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
        position[0], position[1], position[2], 1
    ];
}

/** Transpose a flat 4x4 matrix. */
export function transposeMatrix4(matrix)
{
    if (!Array.isArray(matrix) || matrix.length !== 16)
    {
        throw new Error("CMF matrix must contain 16 values");
    }
    return [
        matrix[0], matrix[4], matrix[8], matrix[12],
        matrix[1], matrix[5], matrix[9], matrix[13],
        matrix[2], matrix[6], matrix[10], matrix[14],
        matrix[3], matrix[7], matrix[11], matrix[15]
    ];
}
