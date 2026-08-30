// CarbonEngineJS original (no Carbon counterpart). Internal state owners for
// CjsAudioBackend's realized authored-SFX continuation slots and batches.

/** Owns one backend SFX program slot and its cancellation state. */
export class CjsAudioBackendSfxProgramSlot
{
    /** Creates one ordinary or continuing program slot with stable defaults. */
    constructor({
        id,
        playingID,
        actionIndex,
        leafIndex,
        actionTime,
        continuousMatchIds = [],
        matchIds = [],
        selections = [],
        cancelledSelectionKeys = new Set(),
        pauseDepths = new Map(),
        selectionControllers = new Map(),
        state = "pending",
        voice = null,
        voices = new Set(),
        controller = new AbortController(),
        continuation = null,
        continuousNodeId = "",
        advanceMode = "completion",
        switchGroups = [],
        switchGeneration = 0,
        crossfadeMode = null,
        completionBarrier = false,
        transitionDelayMs = 0,
        generation = 0,
        broken = false,
        exhausted = false,
        nextTriggerContextTime = null,
        batches = null,
        currentBatch = null,
        preparedBatch = null,
        preparingCrossfade = false,
        batchSerial = 0,
    } = {})
    {
        this.id = id;
        this.playingID = playingID;
        this.actionIndex = actionIndex;
        this.leafIndex = leafIndex;
        this.actionTime = actionTime;
        this.continuousMatchIds = continuousMatchIds;
        this.matchIds = matchIds;
        this.selections = selections;
        this.cancelledSelectionKeys = cancelledSelectionKeys;
        this.pauseDepths = pauseDepths;
        this.selectionControllers = selectionControllers;
        this.state = state;
        this.voice = voice;
        this.voices = voices;
        this.controller = controller;
        this.continuation = continuation;
        this.continuousNodeId = continuousNodeId;
        this.advanceMode = advanceMode;
        this.switchGroups = switchGroups;
        this.switchGeneration = switchGeneration;
        this.crossfadeMode = crossfadeMode;
        this.completionBarrier = completionBarrier;
        this.transitionDelayMs = transitionDelayMs;
        this.generation = generation;
        this.broken = broken;
        this.exhausted = exhausted;
        this.nextTriggerContextTime = nextTriggerContextTime;
        this.batches = batches;
        this.currentBatch = currentBatch;
        this.preparedBatch = preparedBatch;
        this.preparingCrossfade = preparingCrossfade;
        this.batchSerial = batchSerial;
    }

    /** Allocates the next overlapping batch under this slot's identity. */
    CreateBatch(overrides = {})
    {
        return new CjsAudioBackendSfxProgramBatch(this, overrides);
    }

    /** Aborts this slot and all per-selection controllers idempotently. */
    Abort()
    {
        this.controller?.abort();
        for (const controller of this.selectionControllers?.values?.() ?? [])
        {
            controller.abort();
        }
    }
}

/** Owns one overlapping Trigger-Rate or Crossfade batch within a program slot. */
export class CjsAudioBackendSfxProgramBatch
{
    /** Creates one batch while advancing its owning slot's serial exactly once. */
    constructor(slot, overrides = {})
    {
        const selections = overrides.selections ?? slot.selections;
        const serial = Number(slot.batchSerial) || 0;

        slot.batchSerial = serial + 1;
        this.id = String(
            overrides.id
            ?? selections?.[0]?.programBatchId
            ?? `${slot.id}:b${serial}`,
        );
        this.actionTime = overrides.actionTime ?? slot.actionTime;
        this.selections = selections;
        this.selectionControllers = overrides.selectionControllers
            ?? slot.selectionControllers;
        this.cancelledSelectionKeys = overrides.cancelledSelectionKeys
            ?? slot.cancelledSelectionKeys;
        this.controller = overrides.controller ?? slot.controller;
        this.voices = new Set();
        this.state = overrides.state ?? slot.state;
        this.continuation = overrides.continuation ?? slot.continuation;
        this.exhausted = overrides.exhausted ?? slot.exhausted;
        this.completionBarrier = overrides.completionBarrier
            ?? slot.completionBarrier;
        this.transitionDelayMs = overrides.transitionDelayMs
            ?? slot.transitionDelayMs;
        this.crossfadeMode = overrides.crossfadeMode ?? slot.crossfadeMode;
        this.transaction = overrides.transaction ?? null;
    }

    /** Rolls back speculative selection and aborts every batch controller. */
    Abort()
    {
        this.transaction?.rollback?.();
        this.transaction = null;
        this.controller?.abort();
        for (const controller of this.selectionControllers?.values?.() ?? [])
        {
            controller.abort();
        }
    }
}
