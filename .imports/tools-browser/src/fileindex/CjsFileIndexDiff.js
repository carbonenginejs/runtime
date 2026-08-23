import { parseResFileAddress } from "@carbonenginejs/runtime-utils/resfile";

/**
 * Compares two resfileindexes to find what changed between builds.
 *
 * A resource's stored location contains the md5 of its contents, so two builds
 * either carry the same address for a path or they do not. That makes the
 * comparison a pure data operation - no file reads, and no hashing of the
 * 400 MiB soundbanks the answer would otherwise cost.
 *
 * Pure by design: it takes parsed indexes and returns paths. Reading them off a
 * disk, retaining them per build, and reasoning across a span of builds all
 * belong to the caller.
 *
 * ## Comparability
 *
 * An entry is comparable only if its location is a content address. Overlay
 * rows frequently are not - a local overlay records a plain path with no
 * checksum, so nothing about the row changes when the file behind it does.
 * Those are reported as INDETERMINATE rather than unchanged, and a caller must
 * treat indeterminate as changed. Deciding a locally edited file is unchanged
 * because nothing recorded that it moved is the failure this exists to avoid.
 */
export class CjsFileIndexDiff
{

    /**
     * Compares two indexes.
     *
     * @param {CjsFileIndex} previous
     * @param {CjsFileIndex} next
     * @returns {{added: Array<String>, removed: Array<String>, changed: Array<String>, indeterminate: Array<String>, unchanged: Number}}
     */
    static Between(previous, next)
    {
        const before = CjsFileIndexDiff.#addressesOf(previous);
        const after = CjsFileIndexDiff.#addressesOf(next);

        const added = [];
        const removed = [];
        const changed = [];
        const indeterminate = [];
        let unchanged = 0;

        for (const [ logicalPath, address ] of after)
        {
            if (!before.has(logicalPath))
            {
                added.push(logicalPath);
                continue;
            }

            const previousAddress = before.get(logicalPath);

            // Either side lacking a content address means the question cannot
            // be answered from the indexes alone.
            if (address === null || previousAddress === null)
            {
                indeterminate.push(logicalPath);
                continue;
            }

            if (address === previousAddress) unchanged++;
            else changed.push(logicalPath);
        }

        for (const logicalPath of before.keys())
        {
            if (!after.has(logicalPath)) removed.push(logicalPath);
        }

        return {
            added: added.sort(),
            removed: removed.sort(),
            changed: changed.sort(),
            indeterminate: indeterminate.sort(),
            unchanged,
        };
    }

    /**
     * Whether any of the given paths may have changed.
     *
     * The question a builder actually asks: "do I need to run". Added, removed,
     * changed and indeterminate all answer yes - only a path proven identical
     * answers no.
     *
     * @param {CjsFileIndex} previous
     * @param {CjsFileIndex} next
     * @param {Iterable<String>} logicalPaths - the paths this consumer reads
     * @returns {Boolean}
     */
    static MayHaveChanged(previous, next, logicalPaths)
    {
        const before = CjsFileIndexDiff.#addressesOf(previous);
        const after = CjsFileIndexDiff.#addressesOf(next);

        for (const logicalPath of logicalPaths)
        {
            const key = String(logicalPath).toLowerCase();
            const a = before.get(key);
            const b = after.get(key);

            // Absent on either side, or unaddressable on either side, is not
            // proof of sameness.
            if (a === undefined || b === undefined) return true;
            if (a === null || b === null) return true;
            if (a !== b) return true;
        }

        return false;
    }

    /**
     * Whether an entry can take part in a comparison at all.
     * @param {CjsFileIndexEntry} entry
     * @returns {Boolean}
     */
    static IsComparable(entry)
    {
        return CjsFileIndexDiff.#addressOf(entry) !== null;
    }

    /** logicalPath -> content address, or null where there is not one. */
    static #addressesOf(index)
    {
        const out = new Map();

        for (const entry of index?.entries ?? [])
        {
            out.set(String(entry.logicalPath).toLowerCase(), CjsFileIndexDiff.#addressOf(entry));
        }

        return out;
    }

    /**
     * The content identity of one entry.
     *
     * Prefers the location, which carries both halves of the address; falls back
     * to the checksum column, which some indexes populate without a
     * content-addressed location. Null when neither is present - a plain
     * overlay row.
     */
    static #addressOf(entry)
    {
        const parsed = parseResFileAddress(entry?.location);

        if (parsed) return `${parsed.pathHash}_${parsed.checksum}`;

        return entry?.checksum ? String(entry.checksum).toLowerCase() : null;
    }

}
