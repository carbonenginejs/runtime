// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Utils\EveThrottleable.cpp

/**
 * The next-update clock behind EveThrottleable, held outside the schema so
 * throttling state is never serialized or exported.
 */
class CjsEveThrottleableState {
  #nextUpdateTime = 0;

  /**
   * Reports whether the host should skip this update; when it should not, the host's update frequency is recomputed from the detail level and the next allowed time is scheduled.
   * @param {Object} host - the EveThrottleable supplying updateThrottle and the min/max frequency bounds, and receiving currentUpdateFrequency
   * @param {Number} [normalizedUpdateFrequency] - 0..1 detail level interpolating between the host's min and max frequency
   * @returns {Boolean} true to skip this update
   */
  ShouldSkipUpdate(host, normalizedUpdateFrequency = 0.5, currentTime) {
    if (!host.updateThrottle) {
      return false;
    }
    if (currentTime < this.#nextUpdateTime) {
      return true;
    }
    const updateFrequency = normalizedUpdateFrequency * (host.maxUpdateFrequency - host.minUpdateFrequency) + host.minUpdateFrequency;
    host.currentUpdateFrequency = Math.max(updateFrequency, 0.1);
    this.#nextUpdateTime = currentTime + 1 / host.currentUpdateFrequency;
    return false;
  }
}

export { CjsEveThrottleableState };
//# sourceMappingURL=CjsEveThrottleableState.js.map
