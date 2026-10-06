/**
 * Granny State semantic helpers.
 *
 * GSF uses the ordinary Granny container and reflected type tree. These
 * helpers classify and project the reflected GState root without introducing
 * a second container reader.
 */

/**
 * Collect string values under file, path or source keys that name a `.gr2` file.
 *
 * @param {*} value Reflected value to walk.
 * @param {Set<object>} [seen] Objects already visited.
 * @param {Set<string>} [output] Collected references.
 * @returns {Set<string>} The `output` set.
 */
function collectGr2References(value, seen = new Set(), output = new Set())
{
    if (!value || typeof value !== "object" || seen.has(value)) return output;
    seen.add(value);

    for (const [ key, child ] of Object.entries(value))
    {
        if (typeof child === "string" && /file|path|source/i.test(key) && /\.gr2(?:;|$)/i.test(child))
        {
            output.add(child);
        }
        else if (child && typeof child === "object")
        {
            collectGr2References(child, seen, output);
        }
    }

    return output;
}

/**
 * Whether a reflected Granny result has the GState root schema.
 *
 * @param {import("./reader.js").RawGr2ReadResult} raw Raw reflected read result.
 * @returns {boolean} True when the root has a state machine and animation sets.
 */
export function isGsfRaw(raw)
{
    return !!raw?.fileInfo?.StateMachine && Array.isArray(raw.fileInfo?.AnimationSets);
}

/**
 * Project a reflected Granny result into a stable GSF-facing document.
 *
 * @param {import("./reader.js").RawGr2ReadResult} raw Raw reflected read result.
 * @returns {import("./helpers.js").GsfDocument} The GSF document.
 * @throws {Error} When the root is not a GState root.
 */
export function projectGsf(raw)
{
    if (!isGsfRaw(raw)) throw new Error("format-gr2: expected Granny State root schema");

    const root = raw.fileInfo;
    return {
        format: "gsf",
        container: {
            family: "granny",
            revision: raw.version,
            sectionCount: raw.secCount
        },
        character: {
            modelNameHint: root.ModelNameHint ?? null,
            modelIndexHint: root.ModelIndexHint ?? -1,
            retargetSourceModelNameHint: root.RetargetSourceModelNameHint ?? null,
            retargetSourceModelIndexHint: root.RetargetSourceModelIndexHint ?? -1
        },
        stateMachine: root.StateMachine,
        animationSlots: root.AnimationSlots,
        animationSets: root.AnimationSets.map((set, index) => ({
            index,
            sourceFileReferences: [ ...collectGr2References(set) ],
            raw: set
        })),
        uniqueTokenCount: root.NumUniqueTokenized ?? 0,
        editorData: root.EditorData ?? null,
        extendedData: root.ExtendedData ?? null
    };
}

/**
 * Build a lightweight GSF support and dependency summary.
 *
 * @param {import("./reader.js").RawGr2ReadResult} raw Raw reflected read result.
 * @returns {import("./helpers.js").GsfInspection} The summary.
 */
export function inspectGsfRaw(raw)
{
    const value = projectGsf(raw);
    return {
        format: "gsf",
        supported: true,
        revision: value.container.revision,
        sectionCount: value.container.sectionCount,
        animationSlotCount: value.animationSlots.length,
        animationSetCount: value.animationSets.length,
        animationFileReferences: [ ...new Set(value.animationSets.flatMap(set => set.sourceFileReferences)) ]
    };
}

