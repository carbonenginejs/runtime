/**
 * Granny State semantic helpers.
 *
 * GSF uses the ordinary Granny container and reflected type tree. These
 * helpers classify and project the reflected GState root without introducing
 * a second container reader.
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

/** Whether a reflected Granny result has the GState root schema. */
export function isGsfRaw(raw)
{
    return !!raw?.fileInfo?.StateMachine && Array.isArray(raw.fileInfo?.AnimationSets);
}

/** Project a reflected Granny result into a stable GSF-facing document. */
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

/** Build a lightweight GSF support and dependency summary. */
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

