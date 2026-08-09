// CarbonEngineJS original (no Carbon counterpart). Internal admission-token
// owner for CjsAudioBackend's qualified authored-SFX Sound caps.

/** Owns backend SFX voice-limit reservations and their owner/key invariants. */
class CjsAudioBackendSfxVoiceLimitLedger {
  #isOwnerActive = null;
  #ownerReservations = new WeakMap();
  #reservationKeys = new Map();
  #reservations = new Map();
  #nextReservationID = 1;

  /** Creates one ledger against the backend's active-owner identity check. */
  constructor({
    isOwnerActive
  } = {}) {
    if (typeof isOwnerActive !== "function") {
      throw new TypeError("SFX voice-limit ledger requires an active-owner predicate");
    }
    this.#isOwnerActive = isOwnerActive;
  }

  /** Reserves one object-scoped counter or returns null when already held. */
  Reserve(owner, counterId) {
    const key = `o:${String(owner.gameObjID)}\0${String(counterId)}`;
    if (this.#reservationKeys.has(key)) {
      return null;
    }
    const id = this.#nextReservationID++;
    const reservation = {
      id,
      key,
      owner,
      voice: null
    };
    let ownerReservations = this.#ownerReservations.get(owner);
    if (!ownerReservations) {
      ownerReservations = new Set();
      this.#ownerReservations.set(owner, ownerReservations);
    }
    this.#reservations.set(id, reservation);
    this.#reservationKeys.set(key, id);
    ownerReservations.add(id);
    return id;
  }

  /** Binds one pending reservation to its realized physical voice. */
  Bind(voice, reservationID) {
    if (reservationID === undefined) {
      return;
    }
    const reservation = this.#reservations.get(Number(reservationID));
    if (!reservation || reservation.voice || reservation.owner.gameObjID !== voice.gameObjID || !this.#isOwnerActive(reservation.owner)) {
      throw new Error("SFX voice-limit reservation is no longer active");
    }
    reservation.voice = voice;
  }

  /** Releases one reservation owned by the expected playing record. */
  Release(owner, reservationID) {
    const id = Number(reservationID);
    const reservation = this.#reservations.get(id);
    if (!reservation || reservation.owner !== owner) {
      return false;
    }
    this.#reservations.delete(id);
    if (this.#reservationKeys.get(reservation.key) === id) {
      this.#reservationKeys.delete(reservation.key);
    }
    const ownerReservations = this.#ownerReservations.get(owner);
    ownerReservations?.delete(id);
    if (ownerReservations?.size === 0) {
      this.#ownerReservations.delete(owner);
    }
    return true;
  }

  /** Releases every unbound reservation referenced by selected metadata. */
  ReleasePending(owner, selections) {
    for (const selection of selections ?? []) {
      const id = selection.voiceLimitReservationId;
      const reservation = this.#reservations.get(Number(id));
      if (id !== undefined && reservation?.owner === owner && !reservation.voice) {
        this.Release(owner, id);
      }
    }
  }

  /** Releases every reservation still owned by one playing record. */
  ReleaseAll(owner) {
    for (const id of [...(this.#ownerReservations.get(owner) ?? [])]) {
      this.Release(owner, id);
    }
  }
}

export { CjsAudioBackendSfxVoiceLimitLedger };
//# sourceMappingURL=CjsAudioBackendSfxVoiceLimitLedger.js.map
