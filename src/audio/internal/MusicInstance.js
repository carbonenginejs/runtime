// CarbonEngineJS original (no Carbon counterpart).

/** One posted music event's selection, scheduling, and transport state. */
export class MusicInstance
{
    /** Creates the scheduling state for one posted music event. */
    constructor({ playingID, gameObjID, rootId, group, busVolumeStates })
    {
        this.playingID = playingID;
        this.gameObjID = gameObjID;
        this.rootId = rootId;
        this.group = group;
        this.busVolumeStates = busVolumeStates ?? null;
        this.key = Symbol(`music:${playingID}:${rootId}`);
        this.gain = null;
        this.routeMixerGains = new Map();
        this.resolvedTargetId = null;
        this.resolvedRoute = null;
        this.pendingTargetId = null;
        this.pendingRoute = null;
        this.unavailableTargetId = null;
        this.pendingGeneration = 0;
        this.nextSegmentPlan = null;
        this.nextSegmentPlayPreEntry = null;
        this.iterator = null;
        this.boundary = 0;
        this.scheduledThrough = 0;
        this.active = [];
        this.stopped = false;
        this.stopAt = null;
        this.finished = false;
        this.exhausted = false;
        this.trackSequencePositions = new Map();
        // Latest scheduled segment's musical timeline (for sync quantization):
        // { startCtx (ctx time of segment position 0), meter }.
        this.timeline = null;
        this.targetMeter = null;
        this.playlistPreviousSegmentId = null;
        this.playlistPreviousScheduled = null;
        // Browser transport state is deliberately separate from authored
        // Wwise play/stop actions. Web Audio cannot resume a stopped buffer,
        // so transport resumes by replaying this authored item.
        this.transportPaused = false;
        this.transportChoice = null;
        this.transportPendingChoice = null;
        this.transportGeneration = 0;
        this.authoredPauseDepth = 0;
        this.authoredPause = null;
        this.authoredOutputEnvelope = null;
        this.authoredReevaluate = false;
        this.authoredPrepared = null;
    }
}
