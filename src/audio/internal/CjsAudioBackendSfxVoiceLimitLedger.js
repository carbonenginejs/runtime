// CarbonEngineJS original (no Carbon counterpart). Internal admission-token
// owner for CjsAudioBackend's qualified authored-SFX Sound caps.

/** Owns backend SFX voice-limit reservations and their owner/key invariants. */
export class CjsAudioBackendSfxVoiceLimitLedger
{
    _isOwnerActive = null;

    _ownerReservations = new WeakMap();

    _reservationKeys = new Map();

    _reservations = new Map();

    _nextReservationID = 1;

    /** Creates one ledger against the backend's active-owner identity check. */
    constructor({ isOwnerActive } = {})
    {
        if (typeof isOwnerActive !== "function")
        {
            throw new TypeError(
                "SFX voice-limit ledger requires an active-owner predicate",
            );
        }
        this._isOwnerActive = isOwnerActive;
    }

    /** Reserves one object-scoped counter or returns null when already held. */
    Reserve(owner, counterId)
    {
        const key = `o:${String(owner.gameObjID)}\0${String(counterId)}`;

        if (this._reservationKeys.has(key))
        {
            return null;
        }

        const id = this._nextReservationID++;
        const reservation = {
            id,
            key,
            owner,
            voice: null,
        };
        let ownerReservations = this._ownerReservations.get(owner);

        if (!ownerReservations)
        {
            ownerReservations = new Set();
            this._ownerReservations.set(owner, ownerReservations);
        }
        this._reservations.set(id, reservation);
        this._reservationKeys.set(key, id);
        ownerReservations.add(id);
        return id;
    }

    /** Binds one pending reservation to its realized physical voice. */
    Bind(voice, reservationID)
    {
        if (reservationID === undefined)
        {
            return;
        }
        const reservation = this._reservations.get(Number(reservationID));

        if (!reservation
            || reservation.voice
            || reservation.owner.gameObjID !== voice.gameObjID
            || !this._isOwnerActive(reservation.owner))
        {
            throw new Error("SFX voice-limit reservation is no longer active");
        }
        reservation.voice = voice;
    }

    /** Releases one reservation owned by the expected playing record. */
    Release(owner, reservationID)
    {
        const id = Number(reservationID);
        const reservation = this._reservations.get(id);

        if (!reservation || reservation.owner !== owner)
        {
            return false;
        }
        this._reservations.delete(id);
        if (this._reservationKeys.get(reservation.key) === id)
        {
            this._reservationKeys.delete(reservation.key);
        }
        const ownerReservations = this._ownerReservations.get(owner);

        ownerReservations?.delete(id);
        if (ownerReservations?.size === 0)
        {
            this._ownerReservations.delete(owner);
        }
        return true;
    }

    /** Releases every unbound reservation referenced by selected metadata. */
    ReleasePending(owner, selections)
    {
        for (const selection of selections ?? [])
        {
            const id = selection.voiceLimitReservationId;
            const reservation = this._reservations.get(Number(id));

            if (id !== undefined
                && reservation?.owner === owner
                && !reservation.voice)
            {
                this.Release(owner, id);
            }
        }
    }

    /** Releases every reservation still owned by one playing record. */
    ReleaseAll(owner)
    {
        for (const id of [ ...(this._ownerReservations.get(owner) ?? []) ])
        {
            this.Release(owner, id);
        }
    }
}
