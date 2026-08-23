const CONDITIONAL_EXITS = new Set([ "retc", "discard" ]);
const TERMINAL_EXITS = new Set([ "ret", "abort" ]);
const UNSUPPORTED_FLOW = new Set([ "call", "callc", "label", "interface_call" ]);

function collectRegions(instructions)
{
    const regions = [];
    const stack = [];

    const requireTop = (kind, opcode, index) =>
    {
        const region = stack.at(-1);
        if (!region || region.kind !== kind)
        {
            throw new Error(`Shader IR has mismatched ${opcode} at instruction ${index}`);
        }
        return region;
    };

    for (const instruction of instructions)
    {
        const index = instruction.index;
        switch (instruction.opcodeName)
        {
            case "if":
                stack.push({ kind: "selection", startInstruction: index, elseInstruction: null });
                break;
            case "else":
            {
                const region = requireTop("selection", "else", index);
                if (region.elseInstruction !== null) throw new Error(`Shader IR has duplicate else at instruction ${index}`);
                region.elseInstruction = index;
                break;
            }
            case "endif":
            {
                const region = requireTop("selection", "endif", index);
                stack.pop();
                region.endInstruction = index;
                regions.push(region);
                break;
            }
            case "loop":
                stack.push({ kind: "loop", startInstruction: index });
                break;
            case "endloop":
            {
                const region = requireTop("loop", "endloop", index);
                stack.pop();
                region.endInstruction = index;
                regions.push(region);
                break;
            }
            case "switch":
                stack.push({ kind: "switch", startInstruction: index, caseInstructions: [], defaultInstruction: null });
                break;
            case "case":
            {
                const region = requireTop("switch", "case", index);
                region.caseInstructions.push(index);
                break;
            }
            case "default":
            {
                const region = requireTop("switch", "default", index);
                if (region.defaultInstruction !== null) throw new Error(`Shader IR has duplicate default at instruction ${index}`);
                region.defaultInstruction = index;
                break;
            }
            case "endswitch":
            {
                const region = requireTop("switch", "endswitch", index);
                stack.pop();
                region.endInstruction = index;
                regions.push(region);
                break;
            }
            default:
                break;
        }
    }

    if (stack.length)
    {
        throw new Error("Shader IR contains an unterminated structured control-flow region");
    }
    return regions.sort((a, b) => a.startInstruction - b.startInstruction);
}

function containingRegion(regions, instructionIndex, kinds)
{
    return regions
        .filter((region) => kinds.has(region.kind)
            && region.startInstruction < instructionIndex
            && instructionIndex < region.endInstruction)
        .sort((a, b) => b.startInstruction - a.startInstruction)[0] || null;
}

function addEdge(from, to, kind)
{
    if (!to) return;
    if (!from.successors.some((edge) => edge.blockId === to.id && edge.kind === kind))
    {
        from.successors.push({ blockId: to.id, kind });
    }
}

/**
 * Adds structured CFG edges without attempting register SSA construction.
 * Join blocks receive merge-site metadata consumed by the later SSA pass.
 *
 * @param {object} program Mutable shader IR under construction.
 * @returns {object} The same program.
 */
export function buildControlFlow(program)
{
    const { blocks, instructions } = program;
    const unsupported = instructions.find((instruction) => UNSUPPORTED_FLOW.has(instruction.opcodeName));
    if (unsupported)
    {
        throw new Error(`Shader IR does not yet support ${unsupported.opcodeName} control flow at instruction ${unsupported.index}`);
    }
    const regions = collectRegions(instructions);
    const blockAtInstruction = new Map();
    const blockById = new Map(blocks.map((block) => [ block.id, block ]));
    for (const block of blocks)
    {
        block.successors = [];
        block.predecessors = [];
        block.exits = [];
        block.mergeSite = null;
        for (const index of block.instructionIndices) blockAtInstruction.set(index, block);
    }

    const blockAfterInstruction = (index) => blockAtInstruction.get(index + 1) || null;
    const regionStartingAt = new Map(regions.map((region) => [ region.startInstruction, region ]));
    const elseRegion = new Map(regions
        .filter((region) => region.kind === "selection" && region.elseInstruction !== null)
        .map((region) => [ region.elseInstruction, region ]));

    for (const block of blocks)
    {
        const last = instructions[block.endInstruction];
        const next = blocks[block.index + 1] || null;
        const opcode = last.opcodeName;
        const region = regionStartingAt.get(last.index);

        if (opcode === "if")
        {
            const trueTarget = region.elseInstruction === next?.startInstruction
                ? blockAtInstruction.get(region.endInstruction)
                : next;
            addEdge(block, trueTarget, "selection-true");
            const falseInstruction = region.elseInstruction ?? region.endInstruction;
            addEdge(block, blockAtInstruction.get(falseInstruction), "selection-false");
        }
        else if (opcode === "switch")
        {
            for (const caseInstruction of region.caseInstructions)
            {
                addEdge(block, blockAtInstruction.get(caseInstruction), "switch-case");
            }
            const fallback = region.defaultInstruction ?? region.endInstruction;
            addEdge(block, blockAtInstruction.get(fallback), region.defaultInstruction === null ? "switch-no-match" : "switch-default");
        }
        else if (opcode === "break" || opcode === "breakc")
        {
            const owner = containingRegion(regions, last.index, new Set([ "loop", "switch" ]));
            if (!owner) throw new Error(`Shader IR has ${opcode} outside loop or switch at instruction ${last.index}`);
            const target = blockAfterInstruction(owner.endInstruction);
            if (target) addEdge(block, target, "break");
            else block.exits.push("break");
            if (opcode === "breakc") addEdge(block, next, "condition-false");
        }
        else if (opcode === "continue" || opcode === "continuec")
        {
            const owner = containingRegion(regions, last.index, new Set([ "loop" ]));
            if (!owner) throw new Error(`Shader IR has ${opcode} outside loop at instruction ${last.index}`);
            addEdge(block, blockAtInstruction.get(owner.endInstruction), "continue");
            if (opcode === "continuec") addEdge(block, next, "condition-false");
        }
        else if (opcode === "endloop")
        {
            const owner = regions.find((entry) => entry.kind === "loop" && entry.endInstruction === last.index);
            addEdge(block, blockAtInstruction.get(owner.startInstruction), "loop-back");
        }
        else if (TERMINAL_EXITS.has(opcode))
        {
            block.exits.push(opcode === "abort" ? "abort" : "return");
        }
        else if (CONDITIONAL_EXITS.has(opcode))
        {
            block.exits.push(opcode === "discard" ? "discard" : "return");
            addEdge(block, next, "condition-false");
        }
        else
        {
            const upcomingElse = next ? elseRegion.get(next.startInstruction) : null;
            if (upcomingElse)
            {
                addEdge(block, blockAtInstruction.get(upcomingElse.endInstruction), "selection-merge");
            }
            else
            {
                addEdge(block, next, opcode === "loop" ? "loop-body" : "fallthrough");
            }
        }
    }

    for (const block of blocks)
    {
        for (const edge of block.successors)
        {
            blockById.get(edge.blockId).predecessors.push({ blockId: block.id, kind: edge.kind });
        }
    }

    const reachable = new Set();
    const pending = blocks.length ? [ blocks[0] ] : [];
    while (pending.length)
    {
        const block = pending.shift();
        if (reachable.has(block.id)) continue;
        reachable.add(block.id);
        for (const edge of block.successors) pending.push(blockById.get(edge.blockId));
    }
    for (const block of blocks) block.reachable = reachable.has(block.id);
    for (const block of blocks)
    {
        const predecessorBlockIds = Array.from(new Set(block.predecessors.map((edge) => edge.blockId)))
            .filter((id) => block.reachable && blockById.get(id).reachable);
        const includesEntry = block.id === blocks[0]?.id;
        if (predecessorBlockIds.length > 1 || (includesEntry && predecessorBlockIds.length > 0))
        {
            block.mergeSite = {
                kind: "control-flow-merge-site",
                id: `merge:${block.id}`,
                predecessorBlockIds,
                includesEntry,
                requiresRegisterMerge: true
            };
        }
    }

    program.controlFlow = {
        kind: "control-flow-graph",
        entryBlockId: blocks[0]?.id || null,
        edgeCount: blocks.reduce((total, block) => total + block.successors.length, 0),
        reachableBlockIds: blocks.filter((block) => block.reachable).map((block) => block.id),
        unreachableBlockIds: blocks.filter((block) => !block.reachable).map((block) => block.id),
        regions: regions.map((region, index) => ({ id: `region${index}`, ...region }))
    };
    return program;
}
