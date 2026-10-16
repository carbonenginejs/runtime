import { CjsSchema } from "#schema";

// CarbonEngineJS original (no Carbon counterpart). Internal state owners for
// CjsWebAudioSoundEngine's realized authored-SFX continuation slots and batches.

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
        for (const controller of this.selectionControllers?.values() ?? [])
        {
            controller.abort();
        }
    }
}

CjsSchema.meta.define(CjsAudioBackendSfxProgramBatch, { className: "CjsAudioBackendSfxProgramBatch" });
