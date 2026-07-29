const SCALAR_TYPE_NAMES = Object.freeze({
    float32: "f32", int32: "i32", uint32: "u32", bool: "bool", bitpattern32: "u32"
});

function scalarTypeName(type)
{
    return SCALAR_TYPE_NAMES[type] || null;
}

/** Returns the WGSL zero literal for a scalar IR type, or null. */
export function zeroForType(type)
{
    return ({ float32: "0.0", int32: "0i", uint32: "0u", bitpattern32: "0u", bool: "false" })[type] || null;
}

/** Clones the per-field output-component write tracking map. */
export function cloneWritten(written)
{
    return new Map(Array.from(written, ([ key, value ]) => [ key, new Set(value) ]));
}

/** Finds the basic block containing an instruction index. */
export function blockForInstruction(program, instructionIndex)
{
    return program.blocks.find((block) => instructionIndex >= block.startInstruction && instructionIndex <= block.endInstruction) || null;
}

/**
 * Whether a lowered statement definitely returns on every path: a `return`, an
 * `if`/`else` whose both arms terminate, or a `switch` with a default whose
 * every clause terminates. Code after such a statement is unreachable.
 *
 * @param {object[]} statements Lowered statement list.
 * @returns {boolean} True when the list's last statement terminates all paths.
 */
export function terminatesAllPaths(statements)
{
    const statement = statements.at(-1);
    if (!statement) return false;
    if (statement.kind === "return") return true;
    if (statement.kind === "if")
    {
        return Boolean(statement.elseStatements)
            && terminatesAllPaths(statement.statements)
            && terminatesAllPaths(statement.elseStatements);
    }
    if (statement.kind === "switch")
    {
        return statement.clauses.some((clause) => clause.isDefault)
            && statement.clauses.every((clause) => terminatesAllPaths(clause.statements));
    }
    return false;
}

function buildDominators(program)
{
    const reachable = program.blocks.filter((block) => block.reachable !== false);
    const all = new Set(reachable.map((block) => block.id));
    const entry = reachable[0];
    const dominators = new Map(reachable.map((block) => [ block.id, block === entry ? new Set([ block.id ]) : new Set(all) ]));
    let changed = true;
    while (changed)
    {
        changed = false;
        for (const block of reachable.slice(1))
        {
            const predecessors = block.predecessors
                .map((edge) => dominators.get(edge.blockId))
                .filter(Boolean);
            const next = predecessors.length ? new Set(predecessors[0]) : new Set();
            for (const candidate of Array.from(next))
            {
                if (predecessors.some((set) => !set.has(candidate))) next.delete(candidate);
            }
            next.add(block.id);
            const current = dominators.get(block.id);
            if (next.size !== current.size || Array.from(next).some((id) => !current.has(id)))
            {
                dominators.set(block.id, next);
                changed = true;
            }
        }
    }
    return dominators;
}

function loopHeaderMergeIds(program)
{
    const ids = new Set();
    for (const region of program.controlFlow.regions)
    {
        if (region.kind !== "loop") continue;
        const header = blockForInstruction(program, region.startInstruction);
        for (const id of header?.mergeSite?.valueIds || []) ids.add(id);
    }
    return ids;
}

function liveMergeIds(program, values, stage, loopMergeIds)
{
    const live = new Set();
    const visiting = new Set();
    function visit(id)
    {
        const value = values.get(id);
        if (value?.origin !== "control-flow-merge" || live.has(id)) return;
        if (visiting.has(id))
        {
            if (loopMergeIds.has(id)) return;
            throw new Error(`WGSL ${stage} merge graph contains a cycle at ${id}`);
        }
        visiting.add(id);
        for (const incoming of value.incoming) visit(incoming.valueId);
        visiting.delete(id);
        live.add(id);
    }
    for (const instruction of program.instructions)
    {
        for (const ref of instruction.dataflow.reads.flatMap((read) => read.refs)) visit(ref.valueId);
    }
    return live;
}

function definitionDominates(value, targetBlockId, targetInstruction, dominators)
{
    if (value?.origin === "program-input") return true;
    if (!value?.blockId || !dominators.get(targetBlockId)?.has(value.blockId)) return false;
    return value.blockId !== targetBlockId
        || value.origin !== "instruction-write"
        || value.instructionIndex < targetInstruction;
}

/**
 * Whether a two-armed selection merge input can be referenced at its arm-tail
 * merge assignment. The fast path is lexical dominance. A selection region is
 * acyclic, so an input that does NOT dominate its arm tail is still safe when it
 * is a value `hoistEscapingValues` can lift to a function-top `var`: an ordinary
 * instruction result (always emitted as a `let`) or a live merge phi (emitted as
 * a `var` by its own plan). This is the inherited-input case — the arm tail only
 * carries the register through, and its incoming ref resolves to an upstream
 * definition. On the path that reaches the arm tail the value was assigned before
 * the merge write, so the hoisted var's zero initializer is unobservable.
 * (Loops cannot use this relaxation: a back-edge could reach the assignment with
 * the value defined in a different iteration.) Undefined-register inputs are
 * handled by the caller; anything else fails closed.
 */
function armInputUsable(value, armBlockId, boundaryInstruction, dominators, live)
{
    if (definitionDominates(value, armBlockId, boundaryInstruction, dominators)) return true;
    if (value?.origin === "instruction-write") return true;
    return value?.origin === "control-flow-merge" && live.has(value.id);
}

/**
 * The value a register+component actually holds at the exit of a block, found by
 * walking the dominator chain from that block to the nearest dominating block
 * whose `outputValues` define the register. A break predecessor frequently only
 * INHERITS the register (never redefines it on that path), so it is absent from
 * its own `outputValues`. Canonical phi inputs do retain the CFG predecessor as
 * `blockId`, but their value ref may resolve to an upstream definition; this walk
 * derives that same reaching value directly from block state.
 *
 * @returns {{valueId: string, component: string}|null} The reaching ref, or null.
 */
function reachingRef(program, blockId, register, component, dominators)
{
    const domSet = dominators.get(blockId);
    if (!domSet) return null;
    let best = null;
    for (const block of program.blocks)
    {
        if (!domSet.has(block.id)) continue;
        const output = (block.outputValues || []).find((entry) =>
            entry.register === register && entry.component === component);
        if (output && (!best || block.startInstruction > best.block.startInstruction))
        {
            best = { block, ref: output.ref };
        }
    }
    return best ? { valueId: best.ref.valueId, component: best.ref.component } : null;
}

function withCondition(constraints, conditionId, nonzero)
{
    const existing = constraints.get(conditionId);
    if (existing !== undefined && existing !== nonzero) return null;
    const next = new Map(constraints);
    next.set(conditionId, nonzero);
    return next;
}

function selectionConditionId(instruction)
{
    const reads = instruction.dataflow.reads;
    const read = reads.length === 1
        && reads[0].kind === "register-read"
        && reads[0].operandIndex === 0
        && reads[0].refs.length === 1
        ? reads[0]
        : null;
    return read
        ? `${read.refs[0].valueId}.${read.refs[0].component}`
        : `selection:${instruction.index}`;
}

function undefinedTraversalKey(valueId, constraints)
{
    return JSON.stringify([
        valueId,
        Array.from(constraints.entries()).sort(([ left ], [ right ]) => left.localeCompare(right))
    ]);
}

function undefinedPathMaskedByAnd(use, constraints)
{
    const { instruction, read, laneIndex } = use;
    if (read.kind !== "register-read" || instruction.opcodeName !== "and" || instruction.saturate
        || instruction.operands.length !== 3 || ![ 1, 2 ].includes(read.operandIndex))
    {
        return false;
    }
    const writes = instruction.dataflow.writes;
    if (writes.length !== 1 || writes[0].operandIndex !== 0 || writes[0].mask.length !== read.refs.length) return false;
    const regularReads = instruction.dataflow.reads.filter((entry) =>
        entry.kind === "register-read" && [ 1, 2 ].includes(entry.operandIndex));
    if (regularReads.length !== 2
        || regularReads.filter((entry) => entry.operandIndex === 1).length !== 1
        || regularReads.filter((entry) => entry.operandIndex === 2).length !== 1)
    {
        return false;
    }
    const operand = instruction.operands[read.operandIndex];
    const siblingOperandIndex = read.operandIndex === 1 ? 2 : 1;
    const siblingOperand = instruction.operands[siblingOperandIndex];
    if (!operand || !siblingOperand
        || (operand.modifierName || "none") !== "none"
        || (siblingOperand.modifierName || "none") !== "none"
        || (operand.minPrecisionName || "default") !== "default"
        || (siblingOperand.minPrecisionName || "default") !== "default")
    {
        return false;
    }
    const siblingRead = regularReads.find((entry) => entry.operandIndex === siblingOperandIndex);
    if (!siblingRead || siblingRead.refs.length !== writes[0].mask.length) return false;
    const siblingRef = siblingRead.refs[laneIndex];
    return Boolean(siblingRef)
        && constraints.get(`${siblingRef.valueId}.${siblingRef.component}`) === false;
}

function validateUndefinedMergePaths(program, live, values, plans, stage)
{
    const mergePlans = new Map();
    for (const plan of plans.values())
    {
        for (const merge of plan.merges) mergePlans.set(merge.id, { plan, merge });
        for (const merge of plan.exitMerges || []) mergePlans.set(merge.id, { plan, merge });
    }
    function hasUndefinedPath(valueId, constraints, visiting, use)
    {
        const value = values.get(valueId);
        if (value?.origin === "undefined-register")
        {
            return !undefinedPathMaskedByAnd(use, constraints);
        }
        if (value?.origin !== "control-flow-merge" || !live.has(valueId)) return false;
        const traversalKey = undefinedTraversalKey(valueId, constraints);
        if (visiting.has(traversalKey)) return false;
        const entry = mergePlans.get(valueId);
        if (!entry) throw new Error(`WGSL ${stage} merge ${valueId} has no selection plan`);
        visiting.add(traversalKey);
        const { plan, merge } = entry;
        let result = false;
        if (plan.kind === "switch")
        {
            result = merge.perClause.some((incoming) =>
                hasUndefinedPath(incoming.valueId, constraints, visiting, use));
        }
        else if (plan.kind === "loop" && merge.entryIncoming)
        {
            // Follow the exact entry and reaching backedge refs emitted by the
            // loop plan. A carried backedge may legitimately refer to this phi;
            // the per-traversal visiting set breaks that cycle without hiding
            // undefined ancestry on another carried value.
            result = hasUndefinedPath(merge.entryIncoming.valueId, constraints, visiting, use)
                || hasUndefinedPath(merge.backedgeIncoming.valueId, new Map(), visiting, use);
        }
        else if (plan.kind === "loop")
        {
            // Loop-exit phis are assigned from the actual reaching reference at
            // each break edge, not necessarily from the IR phi's raw incoming.
            result = Array.from(plan.exitEdges.values())
                .some((assignments) => assignments
                    .filter((assignment) => assignment.id === merge.id)
                    .some((assignment) => hasUndefinedPath(
                        assignment.ref.valueId, new Map(), visiting, use)));
        }
        else
        {
            const trueRequiresNonzero = plan.testBoolean !== "zero";
            const falseConstraints = withCondition(
                constraints, plan.conditionId, !trueRequiresNonzero);
            const trueInputs = merge.viaSwitch ? merge.perClause : [ merge.trueIncoming ];
            const trueConstraints = withCondition(
                constraints, plan.conditionId, trueRequiresNonzero);
            result = Boolean(falseConstraints)
                && hasUndefinedPath(merge.falseIncoming.valueId, falseConstraints, visiting, use);
            if (!result && trueConstraints)
            {
                result = trueInputs.some((incoming) =>
                    hasUndefinedPath(incoming.valueId, trueConstraints, visiting, use));
            }
        }
        visiting.delete(traversalKey);
        return result;
    }

    for (const instruction of program.instructions)
    {
        for (const read of instruction.dataflow.reads)
        {
            for (let laneIndex = 0; laneIndex < read.refs.length; laneIndex += 1)
            {
                const id = read.refs[laneIndex].valueId;
                if (!live.has(id)) continue;
                const use = { instruction, read, laneIndex };
                if (hasUndefinedPath(id, new Map(), new Set(), use))
                {
                    throw new Error(`WGSL ${stage} merge ${id} has an unsupported observable undefined path`);
                }
            }
        }
    }
}

function buildSwitchPlan(program, region, values, live, dominators, stage, sharedJoin = false)
{
    const header = blockForInstruction(program, region.startInstruction);
    const join = blockForInstruction(program, region.endInstruction + 1);
    if (!header || !join || header.endInstruction !== region.startInstruction || join.startInstruction !== region.endInstruction + 1)
    {
        throw new Error(`WGSL ${stage} switch at ${region.startInstruction} has malformed block boundaries`);
    }
    const markers = [ ...region.caseInstructions, ...(region.defaultInstruction !== null ? [ region.defaultInstruction ] : []) ]
        .sort((left, right) => left - right);
    if (!markers.length || markers[0] !== region.startInstruction + 1)
    {
        throw new Error(`WGSL ${stage} switch at ${region.startInstruction} has unsupported leading instructions`);
    }
    const clauses = [];
    for (let index = 0; index < markers.length;)
    {
        const group = [ markers[index] ];
        while (index + 1 < markers.length && markers[index + 1] === markers[index] + 1)
        {
            index += 1;
            group.push(markers[index]);
        }
        index += 1;
        const bodyEndMarker = index < markers.length ? markers[index] : region.endInstruction;
        clauses.push({ markerInstructions: group, bodyStart: group.at(-1) + 1, bodyEndMarker });
    }
    const seenSelectors = new Set();
    for (const clause of clauses)
    {
        const last = program.instructions[clause.bodyEndMarker - 1];
        if (last?.opcodeName === "break")
        {
            clause.terminator = "break";
            clause.bodyEnd = clause.bodyEndMarker - 1;
            clause.tailBlockId = blockForInstruction(program, last.index)?.id ?? null;
        }
        else if (last?.opcodeName === "ret")
        {
            clause.terminator = "ret";
            clause.bodyEnd = clause.bodyEndMarker;
            clause.tailBlockId = null;
        }
        else
        {
            throw new Error(`WGSL ${stage} switch case at ${clause.markerInstructions[0]} must end in break or return`);
        }
        clause.isDefault = clause.markerInstructions.includes(region.defaultInstruction);
        clause.selectors = clause.markerInstructions
            .filter((marker) => marker !== region.defaultInstruction)
            .map((marker) =>
            {
                const operand = program.instructions[marker].operands?.[0];
                const bits = operand?.immediateValues?.[0]?.uint32;
                if (operand?.typeName !== "immediate32" || !Number.isInteger(bits))
                {
                    throw new Error(`WGSL ${stage} switch case at ${marker} requires an immediate selector`);
                }
                const selector = bits >>> 0;
                if (seenSelectors.has(selector))
                {
                    throw new Error(`WGSL ${stage} switch at ${region.startInstruction} has duplicate selector ${selector}`);
                }
                seenSelectors.add(selector);
                return selector;
            });
    }
    const mergeIds = sharedJoin ? [] : (join.mergeSite?.valueIds || []).filter((id) => live.has(id));
    let merges = [];
    if (mergeIds.length)
    {
        if (region.defaultInstruction === null)
        {
            throw new Error(`WGSL ${stage} switch at ${region.startInstruction} carries merges without a default case`);
        }
        const reachableJoinPredecessors = join.predecessors.filter((edge) =>
            program.blocks.find((block) => block.id === edge.blockId)?.reachable !== false);
        if (clauses.some((clause) => clause.terminator !== "break") || reachableJoinPredecessors.length !== clauses.length)
        {
            throw new Error(`WGSL ${stage} switch at ${region.startInstruction} has unsupported merge predecessors`);
        }
        const tailBlockIds = new Set(clauses.map((clause) => clause.tailBlockId));
        merges = mergeIds.map((id) =>
        {
            const value = values.get(id);
            const type = value?.componentTypes?.[value.writeMask];
            const wgslType = scalarTypeName(type);
            if (!value || value.origin !== "control-flow-merge" || value.incoming.length > clauses.length
                || value.writeMask.length !== 1 || !wgslType || !zeroForType(type)
                || value.incoming.some((incoming) => incoming.kind !== "predecessor"))
            {
                throw new Error(`WGSL ${stage} merge ${id} is not a scalar switch phi`);
            }
            const passThrough = value.incoming.filter((incoming) => !tailBlockIds.has(incoming.blockId));
            if (passThrough.length > 1)
            {
                throw new Error(`WGSL ${stage} merge ${id} has unsupported switch incoming edges`);
            }
            const fallback = passThrough[0] || null;
            if (fallback)
            {
                const fallbackValue = values.get(fallback.valueId);
                if (mergeIds.includes(fallback.valueId) || fallbackValue?.origin === "undefined-register"
                    || !definitionDominates(fallbackValue, header.id, region.startInstruction, dominators))
                {
                    throw new Error(`WGSL ${stage} merge ${id} pass-through input does not dominate the switch`);
                }
            }
            const incomingByBlock = new Map(value.incoming.map((incoming) => [ incoming.blockId, incoming ]));
            const perClause = clauses.map((clause) =>
            {
                const incoming = incomingByBlock.get(clause.tailBlockId) || fallback;
                if (!incoming || mergeIds.includes(incoming.valueId))
                {
                    throw new Error(`WGSL ${stage} merge ${id} has unsupported switch incoming edges`);
                }
                if (incoming === fallback) return incoming;
                const incomingValue = values.get(incoming.valueId);
                const tailBlock = program.blocks.find((block) => block.id === clause.tailBlockId);
                if (incomingValue?.origin === "undefined-register"
                    || !definitionDominates(incomingValue, clause.tailBlockId, tailBlock.endInstruction + 1, dominators))
                {
                    throw new Error(`WGSL ${stage} merge ${id} case input does not dominate its edge`);
                }
                return incoming;
            });
            return { id, type: wgslType, zeroCode: zeroForType(type), perClause };
        });
    }
    return { kind: "switch", region, header, join, clauses, merges, sharedJoin, outerMerges: [] };
}

function buildLoopPlan(program, region, values, live, dominators, stage)
{
    const header = blockForInstruction(program, region.startInstruction);
    if (!header || header.startInstruction !== region.startInstruction)
    {
        throw new Error(`WGSL ${stage} loop at ${region.startInstruction} has malformed block boundaries`);
    }
    const backedgeBlock = blockForInstruction(program, region.endInstruction);
    const preheaderPredecessors = header.predecessors.filter((edge) => edge.blockId !== backedgeBlock?.id);
    if (!backedgeBlock || preheaderPredecessors.length !== 1)
    {
        throw new Error(`WGSL ${stage} loop at ${region.startInstruction} has unsupported header predecessors`);
    }
    const preheaderBlockId = preheaderPredecessors[0].blockId;
    const mergeIds = (header.mergeSite?.valueIds || []).filter((id) => live.has(id));
    const merges = mergeIds.map((id) =>
    {
        const value = values.get(id);
        const type = value?.componentTypes?.[value.writeMask];
        const wgslType = scalarTypeName(type);
        if (!value || value.origin !== "control-flow-merge" || value.incoming.length !== 2
            || value.writeMask.length !== 1 || !wgslType || !zeroForType(type)
            || value.incoming.some((incoming) => incoming.kind !== "predecessor"))
        {
            throw new Error(`WGSL ${stage} merge ${id} is not a scalar loop phi`);
        }
        // Canonical IR records the preheader edge directly. Retain a defensive
        // fallback for accepted prebuilt IR whose edge record is absent: resolve
        // the value actually reaching the preheader, and require a live plan if
        // that value is itself a merge.
        const entryIncoming = value.incoming.find((incoming) => incoming.blockId === preheaderBlockId)
            || reachingRef(program, preheaderBlockId, value.register, value.writeMask, dominators);
        if (!entryIncoming)
        {
            throw new Error(`WGSL ${stage} merge ${id} has unsupported loop incoming edges`);
        }
        const entryValue = values.get(entryIncoming.valueId);
        const entryIsLiveMerge = entryValue?.origin === "control-flow-merge"
            && live.has(entryIncoming.valueId);
        if (entryValue?.origin === "undefined-register"
            || (entryValue?.origin === "control-flow-merge" && !entryIsLiveMerge)
            || !definitionDominates(entryValue, preheaderBlockId,
                program.blocks.find((block) => block.id === preheaderBlockId).endInstruction + 1, dominators))
        {
            throw new Error(`WGSL ${stage} merge ${id} entry input does not dominate the loop`);
        }
        // Backedge (latch) value: the register's TRUE reaching definition at the
        // latch block's exit, resolved by dominator walk (see reachingRef). The
        // phi's own recorded backedge ref can name a redundant nested join phi,
        // rather than the value that actually flows back;
        // emitting that phi id yields an undeclared name because such a phi is not
        // live and no plan declares it. The resolved value is one of: an emittable
        // definition dominating the latch; this loop's own header phi (a no-op self
        // latch); or a live merge some enclosing plan declares (hoisted into scope).
        const backedgeIncoming = reachingRef(program, backedgeBlock.id, value.register, value.writeMask, dominators);
        const backedgeValue = backedgeIncoming && values.get(backedgeIncoming.valueId);
        const backedgeIsHeaderPhi = backedgeIncoming && mergeIds.includes(backedgeIncoming.valueId);
        const backedgeIsLiveMerge = backedgeValue?.origin === "control-flow-merge" && live.has(backedgeIncoming.valueId);
        if (!backedgeIncoming || !backedgeValue || backedgeValue.origin === "undefined-register"
            || (backedgeValue.id !== id && !backedgeIsHeaderPhi && !backedgeIsLiveMerge
                && (backedgeValue.origin === "control-flow-merge"
                    || !definitionDominates(backedgeValue, backedgeBlock.id, region.endInstruction + 1, dominators))))
        {
            throw new Error(`WGSL ${stage} merge ${id} has an unsupported loop backedge input`);
        }
        return { id, type: wgslType, zeroCode: zeroForType(type), entryIncoming, backedgeIncoming };
    });
    // Loop-exit (break-join) merges: a DXBC loop is exited only through `break`
    // edges, so registers holding different values along different break paths
    // become phis at the after-`endloop` join. Each such scalar phi becomes a
    // `var` declared before the loop and assigned right before each `break` with
    // the value the register actually holds on that edge — taken from the break
    // block's reaching definition. Canonical `incoming.blockId` does identify the
    // break-edge predecessor, but resolving from block state also handles inherited
    // values and avoids emitting a redundant/non-live nested merge ref.
    const exitJoin = blockForInstruction(program, region.endInstruction + 1);
    const exitMergeIds = (exitJoin?.mergeSite?.valueIds || []).filter((id) => live.has(id));
    let exitMerges = [];
    const exitEdges = new Map();
    if (exitMergeIds.length)
    {
        const breakEdges = (exitJoin.predecessors || []).filter((edge) =>
            program.blocks.find((block) => block.id === edge.blockId)?.reachable !== false);
        if (!breakEdges.length || breakEdges.some((edge) => edge.kind !== "break"))
        {
            throw new Error(`WGSL ${stage} loop at ${region.startInstruction} has unsupported loop-exit predecessors`);
        }
        const perMerge = exitMergeIds.map((id) =>
        {
            const value = values.get(id);
            const type = value?.componentTypes?.[value.writeMask];
            const wgslType = scalarTypeName(type);
            if (!value || value.origin !== "control-flow-merge" || value.writeMask.length !== 1
                || !wgslType || !zeroForType(type)
                || value.incoming.some((incoming) => incoming.kind !== "predecessor"))
            {
                throw new Error(`WGSL ${stage} merge ${id} is not a scalar loop-exit phi`);
            }
            return { id, type: wgslType, zeroCode: zeroForType(type), register: value.register, component: value.writeMask };
        });
        exitMerges = perMerge.map((merge) => ({ id: merge.id, type: merge.type, zeroCode: merge.zeroCode }));
        for (const edge of breakEdges)
        {
            const block = program.blocks.find((entry) => entry.id === edge.blockId);
            const assignments = perMerge.map((merge) =>
            {
                // Per-edge reaching value: walk the dominator chain from the break
                // predecessor to the nearest block that truly defines the register
                // (the break block usually inherits it — see reachingRef).
                const ref = reachingRef(program, edge.blockId, merge.register, merge.component, dominators);
                const incomingValue = ref && values.get(ref.valueId);
                // The value must be emitted as a declaration that is in scope where
                // the assignment is injected before the break. Safe shapes:
                //   (a) an emittable source (instruction result / program input)
                //       whose definition dominates the break edge;
                //   (b) this loop's own header phi — a `var` declared before the
                //       loop, in scope at every break; or
                //   (c) any other LIVE merge phi: some enclosing selection/switch/
                //       loop plan emits it as a `var`, and hoistEscapingValues lifts
                //       that declaration to function scope, so the cross-plan read
                //       resolves. A non-live phi is never declared → fail closed.
                const isLoopHeaderPhi = ref && mergeIds.includes(ref.valueId);
                const isLiveMerge = incomingValue?.origin === "control-flow-merge" && live.has(ref.valueId);
                if (!ref || !incomingValue || exitMergeIds.includes(ref.valueId)
                    || incomingValue.origin === "undefined-register"
                    || (!isLoopHeaderPhi && !isLiveMerge
                        && (incomingValue.origin === "control-flow-merge"
                            || !definitionDominates(incomingValue, edge.blockId, block.endInstruction + 1, dominators))))
                {
                    throw new Error(`WGSL ${stage} merge ${merge.id} has an unsupported loop-exit input`);
                }
                return { id: merge.id, type: merge.type, ref: { valueId: ref.valueId, component: ref.component } };
            });
            exitEdges.set(block.endInstruction, assignments);
        }
    }
    return { kind: "loop", region, header, preheaderBlockId, backedgeBlockId: backedgeBlock.id, merges, exitMerges, exitEdges };
}

/**
 * Plans every structured selection and switch region for WGSL emission. Each
 * selection plan records the header/join blocks, arm tail identities,
 * condition projection, and the scalar float merge values that must become
 * mutable variables; two-armed regions identify their arm tails through
 * selection-merge/fallthrough join edges, while no-else regions treat the
 * header fall-through as the false edge. Switch plans record grouped
 * break-terminated case clauses, immediate selectors, and per-clause merge
 * incoming values at the after-endswitch join.
 *
 * @param {object} program Frozen CJS shader IR.
 * @param {string} stage Stage label for diagnostics ("vertex" or "fragment").
 * @returns {Map<number, object>} Region plans keyed by region start instruction.
 */
export function buildSelectionPlans(program, stage)
{
    const values = new Map(program.values.map((value) => [ value.id, value ]));
    const loopMergeIds = loopHeaderMergeIds(program);
    const live = liveMergeIds(program, values, stage, loopMergeIds);
    const dominators = buildDominators(program);
    const plans = new Map();
    const sharedSwitchBySelection = new Map();
    const sharedSelectionBySwitch = new Map();
    for (const region of program.controlFlow.regions)
    {
        if (region.kind !== "switch") continue;
        const enclosing = program.controlFlow.regions
            .filter((candidate) => candidate.kind === "selection" && candidate.elseInstruction === null
                && candidate.startInstruction < region.startInstruction
                && candidate.endInstruction === region.endInstruction + 1)
            .sort((left, right) => right.startInstruction - left.startInstruction)[0];
        if (enclosing)
        {
            sharedSwitchBySelection.set(enclosing.startInstruction, region);
            sharedSelectionBySwitch.set(region.startInstruction, enclosing);
        }
    }
    for (const region of program.controlFlow.regions)
    {
        if (region.kind === "switch")
        {
            if (plans.has(region.startInstruction)) continue;
            plans.set(region.startInstruction, buildSwitchPlan(
                program, region, values, live, dominators, stage, sharedSelectionBySwitch.has(region.startInstruction)));
            continue;
        }
        if (region.kind === "loop")
        {
            plans.set(region.startInstruction, buildLoopPlan(program, region, values, live, dominators, stage));
            continue;
        }
        if (region.kind !== "selection")
        {
            throw new Error(`WGSL ${stage} body slice supports only selection, switch, and loop control flow`);
        }
        const hasElse = region.elseInstruction !== null;
        const header = blockForInstruction(program, region.startInstruction);
        const join = blockForInstruction(program, region.endInstruction);
        if (!header || !join || header.endInstruction !== region.startInstruction || join.startInstruction !== region.endInstruction)
        {
            throw new Error(`WGSL ${stage} selection at ${region.startInstruction} has malformed block boundaries`);
        }
        const mergeIds = (join.mergeSite?.valueIds || []).filter((id) => live.has(id));
        const sharedSwitch = !hasElse ? sharedSwitchBySelection.get(region.startInstruction) : undefined;
        if (sharedSwitch)
        {
            const switchPlan = buildSwitchPlan(program, sharedSwitch, values, live, dominators, stage, true);
            plans.set(sharedSwitch.startInstruction, switchPlan);
            const sharedIf = program.instructions[region.startInstruction];
            const sharedConditionId = selectionConditionId(sharedIf);
            if (![ "zero", "nonzero" ].includes(sharedIf.testBoolean))
            {
                throw new Error(`WGSL ${stage} if instruction ${sharedIf.index} has no supported condition projection`);
            }
            let sharedMerges = [];
            if (mergeIds.length)
            {
                const reachablePredecessors = join.predecessors.filter((edge) =>
                    program.blocks.find((block) => block.id === edge.blockId)?.reachable !== false);
                if (sharedSwitch.defaultInstruction === null
                    || switchPlan.clauses.some((clause) => clause.terminator !== "break")
                    || reachablePredecessors.length !== switchPlan.clauses.length + 1)
                {
                    throw new Error(`WGSL ${stage} selection at ${region.startInstruction} has unsupported merge predecessors`);
                }
                sharedMerges = mergeIds.map((id) =>
                {
                    const value = values.get(id);
                    const type = value?.componentTypes?.[value.writeMask];
                    const wgslType = scalarTypeName(type);
                    if (!value || value.origin !== "control-flow-merge"
                        || value.incoming.length !== switchPlan.clauses.length + 1
                        || value.writeMask.length !== 1 || !wgslType || !zeroForType(type)
                        || value.incoming.some((incoming) => incoming.kind !== "predecessor"))
                    {
                        throw new Error(`WGSL ${stage} merge ${id} is not a scalar shared-join phi`);
                    }
                    const falseIncoming = value.incoming.find((incoming) => incoming.blockId === header.id);
                    if (!falseIncoming || mergeIds.includes(falseIncoming.valueId))
                    {
                        throw new Error(`WGSL ${stage} merge ${id} has unsupported incoming edges`);
                    }
                    const falseValue = values.get(falseIncoming.valueId);
                    if (falseValue?.origin === "undefined-register"
                        || !definitionDominates(falseValue, header.id, region.startInstruction, dominators))
                    {
                        throw new Error(`WGSL ${stage} merge ${id} false input does not dominate its declaration`);
                    }
                    const incomingByBlock = new Map(value.incoming.map((incoming) => [ incoming.blockId, incoming ]));
                    const perClause = switchPlan.clauses.map((clause) =>
                    {
                        const incoming = incomingByBlock.get(clause.tailBlockId);
                        if (!incoming || mergeIds.includes(incoming.valueId))
                        {
                            throw new Error(`WGSL ${stage} merge ${id} has unsupported switch incoming edges`);
                        }
                        const incomingValue = values.get(incoming.valueId);
                        const tailBlock = program.blocks.find((block) => block.id === clause.tailBlockId);
                        if (incomingValue?.origin === "undefined-register"
                            || !definitionDominates(incomingValue, clause.tailBlockId, tailBlock.endInstruction + 1, dominators))
                        {
                            throw new Error(`WGSL ${stage} merge ${id} case input does not dominate its edge`);
                        }
                        return incoming;
                    });
                    return {
                        id,
                        type: wgslType,
                        zeroCode: zeroForType(type),
                        falseIncoming,
                        falseCode: undefined,
                        undefinedFallback: false,
                        viaSwitch: true,
                        perClause
                    };
                });
                switchPlan.outerMerges = sharedMerges;
            }
            plans.set(region.startInstruction, {
                kind: "selection",
                region,
                hasElse: false,
                header,
                join,
                trueBlockId: null,
                falseBlockId: header.id,
                conditionId: sharedConditionId,
                testBoolean: sharedIf.testBoolean,
                merges: sharedMerges
            });
            continue;
        }
        let trueBlockId = null;
        let falseBlockId = null;
        if (hasElse)
        {
            trueBlockId = join.predecessors.find((edge) => edge.kind === "selection-merge")?.blockId ?? null;
            falseBlockId = join.predecessors.find((edge) => edge.kind === "fallthrough")?.blockId ?? null;
            if (mergeIds.length && (join.predecessors.length !== 2 || !trueBlockId || !falseBlockId))
            {
                throw new Error(`WGSL ${stage} selection at ${region.startInstruction} has unsupported merge predecessors`);
            }
        }
        else
        {
            falseBlockId = header.id;
            const truePredecessors = join.predecessors.filter((edge) => edge.blockId !== header.id);
            if (mergeIds.length && (join.predecessors.length !== 2 || truePredecessors.length !== 1))
            {
                throw new Error(`WGSL ${stage} selection at ${region.startInstruction} has unsupported merge predecessors`);
            }
            trueBlockId = truePredecessors[0]?.blockId || null;
        }
        const ifInstruction = program.instructions[region.startInstruction];
        const conditionId = selectionConditionId(ifInstruction);
        if (![ "zero", "nonzero" ].includes(ifInstruction.testBoolean))
        {
            throw new Error(`WGSL ${stage} if instruction ${ifInstruction.index} has no supported condition projection`);
        }
        const testBoolean = ifInstruction.testBoolean;
        const merges = mergeIds.map((id) =>
        {
            const value = values.get(id);
            const type = value?.componentTypes?.[value.writeMask];
            const wgslType = scalarTypeName(type);
            if (!value || value.origin !== "control-flow-merge" || value.incoming.length !== 2
                || value.writeMask.length !== 1 || !wgslType || !zeroForType(type)
                || value.incoming.some((incoming) => incoming.kind !== "predecessor"))
            {
                throw new Error(`WGSL ${stage} merge ${id} is not a scalar float predecessor phi`);
            }
            // Canonical IR records both arm predecessors directly. For accepted
            // prebuilt IR where exactly one edge identity is missing, the other
            // incoming belongs to the remaining arm by elimination: a two-armed
            // join has exactly two edges and this phi exactly two inputs.
            const directFalse = value.incoming.find((incoming) => incoming.blockId === falseBlockId);
            const directTrue = value.incoming.find((incoming) => incoming.blockId === trueBlockId);
            let falseIncoming = directFalse;
            let trueIncoming = directTrue;
            if (directTrue && !directFalse) falseIncoming = value.incoming.find((incoming) => incoming !== directTrue);
            else if (directFalse && !directTrue) trueIncoming = value.incoming.find((incoming) => incoming !== directFalse);
            if (!falseIncoming || !trueIncoming || falseIncoming === trueIncoming
                || [ falseIncoming, trueIncoming ].some((incoming) => mergeIds.includes(incoming.valueId)))
            {
                throw new Error(`WGSL ${stage} merge ${id} has unsupported incoming edges`);
            }
            const falseValue = values.get(falseIncoming.valueId);
            const trueValue = values.get(trueIncoming.valueId);
            let falseCode;
            let undefinedFallback = false;
            if (falseValue?.origin === "undefined-register")
            {
                falseCode = zeroForType(type);
                undefinedFallback = true;
                if (!falseCode)
                {
                    throw new Error(`WGSL ${stage} merge ${id} has an observable undefined false input`);
                }
            }
            else if (hasElse
                // The else-arm false input is assigned inside the else body, so an
                // inherited (non-dominating) value is hoistable like the true arm.
                ? !armInputUsable(falseValue, falseBlockId, program.blocks.find((block) => block.id === falseBlockId).endInstruction + 1, dominators, live)
                // The no-else false input pre-initializes the merge var BEFORE the
                // `if`; it must genuinely dominate the header (hoisting cannot help —
                // the value may be unassigned on some path reaching the pre-init).
                : !definitionDominates(falseValue, header.id, region.startInstruction, dominators))
            {
                throw new Error(`WGSL ${stage} merge ${id} false input does not dominate its declaration`);
            }
            if (trueValue?.origin === "undefined-register"
                || !armInputUsable(trueValue, trueBlockId, program.blocks.find((block) => block.id === trueBlockId).endInstruction + 1, dominators, live))
            {
                throw new Error(`WGSL ${stage} merge ${id} true input does not dominate its edge`);
            }
            return { id, type: wgslType, zeroCode: zeroForType(type), falseIncoming, trueIncoming, falseCode, undefinedFallback };
        });
        plans.set(region.startInstruction, {
            kind: "selection",
            region,
            hasElse,
            header,
            join,
            trueBlockId,
            falseBlockId,
            conditionId,
            testBoolean,
            merges
        });
    }

    validateUndefinedMergePaths(program, live, values, plans, stage);

    for (const id of live)
    {
        const value = values.get(id);
        for (const instruction of program.instructions)
        {
            if (!instruction.dataflow.reads.some((read) => read.refs.some((ref) => ref.valueId === id))) continue;
            const useBlock = blockForInstruction(program, instruction.index);
            if (!dominators.get(useBlock.id)?.has(value.blockId))
            {
                throw new Error(`WGSL ${stage} merge ${id} does not dominate instruction ${instruction.index}`);
            }
        }
        for (const downstreamId of live)
        {
            const downstream = values.get(downstreamId);
            for (const incoming of downstream.incoming.filter((entry) => entry.valueId === id))
            {
                if (!dominators.get(incoming.blockId)?.has(value.blockId))
                {
                    throw new Error(`WGSL ${stage} merge ${id} does not dominate downstream edge ${incoming.blockId}`);
                }
            }
        }
    }
    return plans;
}
