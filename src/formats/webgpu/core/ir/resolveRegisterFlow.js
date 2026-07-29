const MUTABLE_REGISTER_FILES = new Set([
    "temp", "output", "indexable_temp", "output_depth", "output_coverage",
    "output_control_point", "output_depth_greater_equal", "output_depth_less_equal"
]);

function refKey(register, component)
{
    return `${register}.${component}`;
}

function valueRef(value, component)
{
    return { valueId: value.id, component };
}

function isMutableRegister(register)
{
    return MUTABLE_REGISTER_FILES.has(register.slice(0, register.indexOf("[")));
}

function replaceObjectRefs(object, replacements)
{
    if (!object) return object;
    for (const [ key, ref ] of Object.entries(object)) object[key] = replacements.get(ref.valueId) || ref;
    return object;
}

/**
 * Resolves conservative block inputs through CFG predecessors and materializes
 * live cross-block merge values. Values are component-granular so masked DXBC
 * writes retain the correct incoming lanes.
 *
 * @param {object} program Mutable shader IR under construction.
 * @returns {object} The same program.
 */
export function resolveRegisterFlow(program)
{
    const values = program.values;
    const blocksById = new Map(program.blocks.map((block) => [ block.id, block ]));
    const placeholders = new Map(values
        .filter((value) => value.origin === "block-input")
        .map((value) => [ value.id, value ]));
    const replacements = new Map();
    const externalValues = new Map();
    const mergeValues = new Map();
    const entryBlockId = program.controlFlow.entryBlockId;
    const outputMaps = new Map(program.blocks.map((block) => [
        block.id,
        new Map(block.outputValues.map((entry) => [ refKey(entry.register, entry.component), entry.ref ]))
    ]));

    const createValue = (data) =>
    {
        const value = { kind: "register-value", id: `value${values.length}`, ...data };
        values.push(value);
        return value;
    };

    const externalRef = (register, component) =>
    {
        const key = refKey(register, component);
        if (!externalValues.has(key))
        {
            externalValues.set(key, createValue({
                origin: isMutableRegister(register) ? "undefined-register" : "program-input",
                blockId: null,
                instructionIndex: null,
                register,
                writeMask: component,
                previous: null
            }));
        }
        return valueRef(externalValues.get(key), component);
    };

    let resolveEntry;
    let resolveExit;
    const resolveRef = (ref) =>
    {
        const placeholder = placeholders.get(ref.valueId);
        if (!placeholder) return replacements.get(ref.valueId) || ref;
        if (!replacements.has(ref.valueId))
        {
            replacements.set(ref.valueId, resolveEntry(
                blocksById.get(placeholder.blockId),
                placeholder.register,
                placeholder.writeMask
            ));
        }
        return replacements.get(ref.valueId);
    };

    resolveExit = (block, register, component) =>
    {
        const local = outputMaps.get(block.id).get(refKey(register, component));
        return local ? resolveRef(local) : resolveEntry(block, register, component);
    };

    resolveEntry = (block, register, component) =>
    {
        if (!isMutableRegister(register)) return externalRef(register, component);
        const key = refKey(register, component);
        const mergeKey = `${block.id}:${key}`;
        if (mergeValues.has(mergeKey)) return valueRef(mergeValues.get(mergeKey), component);

        const predecessorIds = Array.from(new Set(block.predecessors.map((edge) => edge.blockId)))
            .filter((id) => block.reachable && blocksById.get(id).reachable)
            .sort((a, b) => blocksById.get(a).index - blocksById.get(b).index);
        const includesProgramEntry = block.id === entryBlockId || !block.reachable || predecessorIds.length === 0;
        const incomingCount = predecessorIds.length + (includesProgramEntry ? 1 : 0);

        if (incomingCount === 1)
        {
            if (includesProgramEntry) return externalRef(register, component);
            return resolveExit(blocksById.get(predecessorIds[0]), register, component);
        }

        const merge = createValue({
            origin: "control-flow-merge",
            blockId: block.id,
            instructionIndex: null,
            register,
            writeMask: component,
            previous: null,
            incoming: []
        });
        mergeValues.set(mergeKey, merge);
        if (includesProgramEntry)
        {
            const ref = externalRef(register, component);
            merge.incoming.push({ kind: "program-entry", blockId: null, ...ref });
        }
        for (const predecessorId of predecessorIds)
        {
            const ref = resolveExit(blocksById.get(predecessorId), register, component);
            merge.incoming.push({ kind: "predecessor", blockId: predecessorId, ...ref });
        }
        return valueRef(merge, component);
    };

    for (const placeholder of placeholders.values())
    {
        if (!replacements.has(placeholder.id))
        {
            replacements.set(placeholder.id, resolveEntry(
                blocksById.get(placeholder.blockId),
                placeholder.register,
                placeholder.writeMask
            ));
        }
    }

    const aliases = new Map();
    const canonicalRef = (ref) =>
    {
        let current = ref;
        const seen = new Set();
        while (aliases.has(current.valueId) && !seen.has(current.valueId))
        {
            seen.add(current.valueId);
            current = aliases.get(current.valueId);
        }
        return current;
    };
    let changed = true;
    while (changed)
    {
        changed = false;
        for (const merge of mergeValues.values())
        {
            if (aliases.has(merge.id)) continue;
            const refs = merge.incoming
                .map((incoming) => canonicalRef(incoming))
                .filter((ref) => ref.valueId !== merge.id);
            const unique = Array.from(new Map(refs.map((ref) => [ `${ref.valueId}.${ref.component}`, ref ])).values());
            if (unique.length === 1)
            {
                aliases.set(merge.id, unique[0]);
                changed = true;
            }
        }
    }
    for (const [ id, ref ] of replacements) replacements.set(id, canonicalRef(ref));
    for (const [ id, ref ] of aliases) replacements.set(id, canonicalRef(ref));
    for (const merge of mergeValues.values())
    {
        if (aliases.has(merge.id)) continue;
        merge.incoming = merge.incoming.map((incoming) => ({ ...incoming, ...canonicalRef(incoming) }));
    }

    for (const instruction of program.instructions)
    {
        for (const read of instruction.dataflow.reads)
        {
            read.refs = read.refs.map(resolveRef);
        }
        for (const write of instruction.dataflow.writes)
        {
            replaceObjectRefs(write.previous, replacements);
            replaceObjectRefs(write.result, replacements);
        }
    }
    for (const value of values)
    {
        replaceObjectRefs(value.previous, replacements);
    }
    for (const block of program.blocks)
    {
        block.inputValueIds = Array.from(new Set(block.inputValueIds
            .map((id) => replacements.get(id)?.valueId)
            .filter(Boolean)));
        for (const output of block.outputValues) output.ref = resolveRef(output.ref);
        const concreteMerges = Array.from(mergeValues.values())
            .filter((value) => value.blockId === block.id && !aliases.has(value.id))
            .map((value) => value.id);
        if (block.mergeSite)
        {
            block.mergeSite.valueIds = concreteMerges;
            block.mergeSite.requiresRegisterMerge = concreteMerges.length > 0;
        }
    }

    program.values = values.filter((value) => value.origin !== "block-input" && !aliases.has(value.id));
    return program;
}
