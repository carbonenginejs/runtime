// CarbonEngineJS original (no Carbon counterpart). Internal realized-voice
// state owner for CjsAudioBackend's authored SFX playback.

/** Owns one realized SFX voice's authored, runtime, and Web Audio state. */
class CjsAudioBackendSfxVoice {
  /** Initializes one voice from its resolved descriptor and owned nodes. */
  constructor({
    gameObjID,
    descriptor,
    emitterNodes,
    busGraphRoute,
    emitterRouteBranch,
    sharedBusFilters,
    usesBusPitch,
    getBusStateProperties,
    rtpcTransitionEnd,
    controlTransitionBoundaries,
    nodes
  }) {
    this.gameObjID = gameObjID;
    this.busGraphRoute = busGraphRoute;
    this.emitterRouteBranch = emitterRouteBranch;
    this.sharedBusFaders = emitterRouteBranch?.sharedBusFaders === true;
    this.sharedBusFilters = sharedBusFilters;
    this.sharedBusDucking = emitterRouteBranch?.sharedBusDucking === true;
    this.buffer = descriptor.buffer;
    this.silenceDurationSeconds = descriptor.silenceDurationSeconds;
    this.loop = descriptor.loop;
    this.playCount = descriptor.playCount;
    this.playbackRate = descriptor.playbackRate;
    this.getPlaybackRate = descriptor.getPlaybackRate;
    this.getPlaybackRateAtVoicePitchCents = descriptor.getPlaybackRateAtVoicePitchCents;
    this.spatial = descriptor.spatial;
    this.dryVolumeCurve = descriptor.dryVolumeCurve;
    this.distanceGainValue = 1;
    this.getGain = descriptor.getGain;
    this.getGainAtVoiceVolumeDb = descriptor.getGainAtVoiceVolumeDb;
    this.voiceVolumeStates = emitterNodes.voiceVolumes;
    this.busVoiceVolumeStates = emitterNodes.busVoiceVolumes;
    this.voicePitchStates = emitterNodes.voicePitches;
    this.voiceLowPassStates = emitterNodes.voiceLowPasses;
    this.voiceHighPassStates = emitterNodes.voiceHighPasses;
    this.busVolumeStates = emitterNodes.busVolumes;
    this.usesBusPitch = usesBusPitch;
    this.getBusStateProperties = getBusStateProperties;
    this.authoredBusVolumeDb = descriptor.authoredBusVolumeDb;
    this.authoredBusMakeUpGainDb = descriptor.authoredBusMakeUpGainDb;
    this.authoredOutputBusVolumeDb = descriptor.authoredOutputBusVolumeDb;
    this.rtpcTransitionEnd = rtpcTransitionEnd;
    this.controlTransitionBoundaries = controlTransitionBoundaries;
    this.getLowPass = descriptor.getLowPass;
    this.getHighPass = descriptor.getHighPass;
    this.getLowPassAtAdditionalPercent = descriptor.getLowPassAtAdditionalPercent;
    this.getHighPassAtAdditionalPercent = descriptor.getHighPassAtAdditionalPercent;
    this.delayMs = descriptor.delayMs;
    this.fadeInMs = descriptor.fadeInMs;
    this.switchFadeInMs = descriptor.switchFadeInMs;
    this.fadeCurve = descriptor.fadeCurve;
    this.actionIndex = descriptor.actionIndex;
    this.leafIndex = descriptor.leafIndex;
    this.actionTime = descriptor.actionTime;
    this.matchIds = descriptor.matchIds;
    this.busPathIds = descriptor.busPathIds;
    this.switchPath = descriptor.switchPath ?? Object.freeze([]);
    this.switchGeneration = Math.max(0, Number(descriptor.switchGeneration) || 0);
    this.programBatchId = descriptor.programBatchId;
    this.voiceLimitReservationId = descriptor.voiceLimitReservationId;
    this.crossfadeMode = descriptor.crossfadeMode ?? null;
    this.gain = nodes.gain;
    this.busVoiceActionGain = nodes.busVoiceActionGain;
    this.busVoiceGain = nodes.busVoiceGain;
    this.busGain = nodes.busGain;
    this.fadeGain = nodes.fadeGain;
    this.transitionGain = nodes.transitionGain;
    this.stopGain = nodes.stopGain;
    this.lowPassFilter = nodes.lowPassFilter;
    this.highPassFilter = nodes.highPassFilter;
    this.sourceEffectInput = nodes.sourceEffectInput;
    this.sourceEffectNodes = nodes.sourceEffectNodes;
    this.busEffectNodes = nodes.busEffectNodes;
    this.fadeScheduled = false;
    this.fadeStartContextTime = null;
    this.transitionFadeScheduled = false;
    this.transitionFadeStartContextTime = null;
    this.transitionFadeDuration = 0;
    this.transitionFadeFrom = 1;
    this.transitionFadeTo = 1;
    this.transitionFadeMode = null;
    this.switchFadeScheduled = false;
    this.source = null;
    this.sourceStarted = false;
    this.cancelledBeforeStart = false;
    this.ended = false;
    this.stopping = false;
    this.pauseDepth = 0;
    this.paused = false;
    this.pausing = false;
    this.pauseContextTime = null;
    this.pauseSource = null;
    this.startContextTime = null;
    this.positionAnchorContextTime = null;
    this.scheduledEndContextTime = null;
    this.repeatRemainingSeconds = null;
    this.repeatAnchorContextTime = null;
    this.stopContextTime = null;
    this.duckActivity = null;
    this.offsetSeconds = 0;
  }

  /** Disconnects every disposable Web Audio node owned by this voice. */
  DisconnectNodes() {
    this.source?.disconnect?.();
    for (const node of this.sourceEffectNodes ?? []) {
      node.disconnect?.();
    }
    this.lowPassFilter?.disconnect?.();
    this.highPassFilter?.disconnect?.();
    this.gain?.disconnect?.();
    this.busVoiceActionGain?.disconnect?.();
    this.busVoiceGain?.disconnect?.();
    this.fadeGain?.disconnect?.();
    this.transitionGain?.disconnect?.();
    this.busGain?.disconnect?.();
    for (const node of this.busEffectNodes ?? []) {
      node.disconnect?.();
    }
    this.stopGain?.disconnect?.();
  }
}

export { CjsAudioBackendSfxVoice };
//# sourceMappingURL=CjsAudioBackendSfxVoice.js.map
