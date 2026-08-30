/** One immutable row from a CCP-style appfileindex or resfileindex. */
export class CjsFileIndexEntry
{

    /**
     * Normalizes and freezes one row: the root and logical path first, then the
     * storage location, an optional 32-hex checksum and non-negative sizes.
     * @param {string} sourceLogicalPath The path exactly as written in the file,
     * retained for diagnostics; logicalPath is the normalized lookup key.
     * @param {number|null} lineNumber Source row, used only to locate errors.
     */
    constructor({
        logicalPath,
        sourceLogicalPath = logicalPath,
        location,
        checksum = null,
        uncompressedSize = null,
        compressedSize = null,
        binaryOperation = null,
        lineNumber = null,
        root = "res"
    })
    {
        const normalizedRoot = CjsFileIndexEntry.normalizeRoot(root);
        const normalizedPath = CjsFileIndexEntry.normalizeLogicalPath(logicalPath, normalizedRoot);

        this.logicalPath = normalizedPath;
        this.sourceLogicalPath = String(sourceLogicalPath).trim().replaceAll("\\", "/");
        this.root = normalizedRoot;
        this.relativePath = normalizedPath.slice(`${normalizedRoot}:/`.length);
        this.location = CjsFileIndexEntry.normalizeLocation(location);
        this.checksum = normalizeOptionalChecksum(checksum, lineNumber);
        this.uncompressedSize = normalizeOptionalInteger(uncompressedSize, "uncompressedSize", lineNumber);
        this.compressedSize = normalizeOptionalInteger(compressedSize, "compressedSize", lineNumber);
        this.binaryOperation = normalizeOptionalInteger(binaryOperation, "binaryOperation", lineNumber);
        this.lineNumber = lineNumber;

        this;
    }

    /**
     * Parses one comma-separated row of 2 to 6 columns - logical path, storage
     * location, checksum, uncompressed size, compressed size, binary operation -
     * of which only the first two are required.
     */
    static parse(line, lineNumber = 1, root = "res")
    {
        if (typeof line !== "string")
        {
            throw new TypeError("file-index line must be a string.");
        }

        const columns = line.split(",").map(value => value.trim());

        if (columns.length < 2 || columns.length > 6)
        {
            throw new Error(`Invalid file-index row at line ${lineNumber}: expected 2 to 6 columns.`);
        }

        const [ logicalPath, location, checksum, uncompressedSize, compressedSize, binaryOperation ] = columns;

        if (!logicalPath || !location)
        {
            throw new Error(`Invalid file-index row at line ${lineNumber}: missing logical path or location.`);
        }

        return new CjsFileIndexEntry({
            logicalPath,
            sourceLogicalPath: logicalPath,
            location,
            checksum,
            uncompressedSize,
            compressedSize,
            binaryOperation,
            lineNumber,
            root
        });
    }

    /**
     * Lowercases, converts backslashes and prefixes the root when the value
     * carries none, rejecting empty, ".", ".." and any path outside the given
     * root.
     */
    static normalizeLogicalPath(value, root = "res")
    {
        const normalizedRoot = CjsFileIndexEntry.normalizeRoot(root);
        const text = String(value ?? "").trim().replaceAll("\\", "/").toLowerCase();

        if (!text || text.includes("\0"))
        {
            throw new Error("file-index logical path is required.");
        }

        const withRoot = text.includes(":/") ? text : `${normalizedRoot}:/${text}`;

        if (!withRoot.startsWith(`${normalizedRoot}:/`))
        {
            throw new Error(`Invalid file-index logical root: ${value}`);
        }

        const segments = normalizeSegments(withRoot.slice(`${normalizedRoot}:/`.length), "logical path");

        if (segments.length === 0)
        {
            throw new Error(`Invalid file-index logical path: ${value}`);
        }

        return `${normalizedRoot}:/${segments.join("/")}`;
    }

    /**
     * Normalizes a storage location, preserving an optional lowercase "source:/"
     * prefix, and rejects an absolute path, query, fragment, URL scheme or
     * traversal segment so a location can never escape its source base URL.
     */
    static normalizeLocation(value)
    {
        const text = String(value ?? "").trim().replaceAll("\\", "/");
        const match = text.match(/^([a-z0-9][a-z0-9._-]*):\/(.+)$/iu);
        const sourcePrefix = match ? `${match[1].toLowerCase()}:/` : "";
        const path = match ? match[2] : text;

        if (
            !path
            || path.startsWith("/")
            || path.includes("?")
            || path.includes("#")
            || /^[a-z][a-z0-9+.-]*:/iu.test(path)
        )
        {
            throw new Error("Unsafe file-index storage location.");
        }

        const segments = normalizeSegments(path, "storage location");

        if (segments.length === 0)
        {
            throw new Error("file-index storage location is required.");
        }

        return `${sourcePrefix}${segments.join("/")}`;
    }

    /** Lowercases and validates a scheme-like index root such as "res" or "app". */
    static normalizeRoot(value)
    {
        const root = String(value ?? "").trim().toLowerCase();

        if (!/^[a-z][a-z0-9+.-]*$/u.test(root))
        {
            throw new Error(`Invalid file-index root: ${value}`);
        }

        return root;
    }

}

function normalizeSegments(value, label)
{
    const segments = String(value).split("/").filter(Boolean);

    for (const segment of segments)
    {
        let decodedSegment;

        try
        {
            decodedSegment = decodeURIComponent(segment);
        }
        catch
        {
            throw new Error(`Unsafe file-index ${label}.`);
        }

        if (
            decodedSegment === "."
            || decodedSegment === ".."
            || decodedSegment.includes("/")
            || decodedSegment.includes("\\")
            || decodedSegment.includes("\0")
        )
        {
            throw new Error(`Unsafe file-index ${label}.`);
        }
    }

    return segments;
}

function normalizeOptionalChecksum(value, lineNumber)
{
    if (value === undefined || value === null || value === "") return null;

    const checksum = String(value).trim().toLowerCase();

    if (!/^[a-f0-9]{32}$/u.test(checksum))
    {
        throw new Error(`Invalid file-index checksum at line ${lineNumber ?? "unknown"}.`);
    }

    return checksum;
}

function normalizeOptionalInteger(value, label, lineNumber)
{
    if (value === undefined || value === null || value === "") return null;

    const result = Number(value);

    if (!Number.isSafeInteger(result) || result < 0)
    {
        throw new Error(`Invalid file-index ${label} at line ${lineNumber ?? "unknown"}: ${value}.`);
    }

    return result;
}
