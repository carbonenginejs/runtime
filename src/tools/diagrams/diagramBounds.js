/** Returns a validated mutable diagram bounds record. */
export function normalizeDiagramBounds(value)
{
    if (!value || typeof value !== "object")
    {
        throw new TypeError("Diagram bounds must be a record");
    }

    const minX = finiteNumber(value.minX, "bounds.minX");
    const minY = finiteNumber(value.minY, "bounds.minY");
    const maxX = finiteNumber(value.maxX, "bounds.maxX");
    const maxY = finiteNumber(value.maxY, "bounds.maxY");

    if (maxX < minX || maxY < minY)
    {
        throw new RangeError("Diagram bounds maximums must not precede their minimums");
    }

    return { minX, minY, maxX, maxY };
}

/** Resolves one node or group record to world-space bounds. */
export function diagramRecordBounds(record)
{
    if (!record || typeof record !== "object")
    {
        throw new TypeError("Diagram records must be objects");
    }

    if (record.bounds !== undefined && record.bounds !== null)
    {
        return normalizeDiagramBounds(record.bounds);
    }

    const position = record.position ?? record;
    const x = finiteNumber(position.x, "record.position.x");
    const y = finiteNumber(position.y, "record.position.y");
    const size = record.size ?? record;
    const width = optionalNonNegativeNumber(size.width, "record.size.width");
    const height = optionalNonNegativeNumber(size.height, "record.size.height");
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return {
        minX: x - halfWidth,
        minY: y - halfHeight,
        maxX: x + halfWidth,
        maxY: y + halfHeight
    };
}

/** Computes the union of an externally sized iterable without argument spread. */
export function diagramBoundsFromRecords(records, { getBounds = diagramRecordBounds } = {})
{
    if (!records || typeof records[Symbol.iterator] !== "function")
    {
        throw new TypeError("Diagram records must be iterable");
    }
    if (typeof getBounds !== "function")
    {
        throw new TypeError("getBounds must be a function");
    }

    let result = null;

    for (const record of records)
    {
        const bounds = normalizeDiagramBounds(getBounds(record));

        if (result === null)
        {
            result = bounds;
            continue;
        }

        if (bounds.minX < result.minX) result.minX = bounds.minX;
        if (bounds.minY < result.minY) result.minY = bounds.minY;
        if (bounds.maxX > result.maxX) result.maxX = bounds.maxX;
        if (bounds.maxY > result.maxY) result.maxY = bounds.maxY;
    }

    return result;
}

/** Returns whether two inclusive world-space bounds overlap. */
export function diagramBoundsIntersect(left, right)
{
    left = normalizeDiagramBounds(left);
    right = normalizeDiagramBounds(right);

    return left.minX <= right.maxX
        && left.maxX >= right.minX
        && left.minY <= right.maxY
        && left.maxY >= right.minY;
}

/** Returns whether an inclusive world-space bounds record contains a point. */
export function diagramBoundsContainPoint(bounds, x, y)
{
    bounds = normalizeDiagramBounds(bounds);
    x = finiteNumber(x, "x");
    y = finiteNumber(y, "y");

    return x >= bounds.minX
        && x <= bounds.maxX
        && y >= bounds.minY
        && y <= bounds.maxY;
}

/** Expands all four sides of a bounds record by one non-negative amount. */
export function expandDiagramBounds(bounds, padding)
{
    bounds = normalizeDiagramBounds(bounds);
    padding = nonNegativeNumber(padding, "padding");

    return {
        minX: bounds.minX - padding,
        minY: bounds.minY - padding,
        maxX: bounds.maxX + padding,
        maxY: bounds.maxY + padding
    };
}

function optionalNonNegativeNumber(value, label)
{
    if (value === undefined || value === null) return 0;

    return nonNegativeNumber(value, label);
}

function nonNegativeNumber(value, label)
{
    value = finiteNumber(value, label);

    if (value < 0) throw new RangeError(`${label} must not be negative`);

    return value;
}

function finiteNumber(value, label)
{
    value = Number(value);

    if (!Number.isFinite(value)) throw new TypeError(`${label} must be a finite number`);

    return value;
}
