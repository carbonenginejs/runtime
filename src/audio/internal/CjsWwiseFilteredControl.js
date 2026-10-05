// CarbonEngineJS original (no Carbon counterpart). Per-voice Web Audio
// realization of already-qualified Wwise source-effect RTPC curves.
const FILTER_SETTLE_MULTIPLIER = 2;
const FILTER_REMAINING_AT_AUTHORED_TIME = 0.005;

/** Owns one voice-local approximation of a filtered Wwise control timeline. */
export class CjsWwiseFilteredControl
{
    _from;

    _to;

    _startTime;

    _timeConstant = 0;

    _settleTime;

    /** Creates a settled control at one initial value and context time. */
    constructor(value, at)
    {
        this._from = value;
        this._to = value;
        this._startTime = at;
        this._settleTime = at;
    }

    /** Returns the context time at which the current filter settles exactly. */
    GetSettleTime()
    {
        return this._settleTime;
    }

    /** Rebases the filter toward a new target using authored ramp timing. */
    SetTarget(value, at, transition)
    {
        if (!Number.isFinite(value) || value === this._to) return;
        const current = this.Evaluate(at);
        const duration = value > current
            ? transition.rampUpSeconds
            : transition.rampDownSeconds;

        this._from = current;
        this._to = value;
        this._startTime = at;
        this._timeConstant = duration
            / -Math.log(FILTER_REMAINING_AT_AUTHORED_TIME);
        this._settleTime = at + duration * FILTER_SETTLE_MULTIPLIER;
    }

    /** Evaluates the filtered control at one context time. */
    Evaluate(at)
    {
        const time = Number(at);

        if (!Number.isFinite(time)
            || this._timeConstant <= 0
            || time >= this._settleTime)
        {
            return this._to;
        }
        const elapsed = Math.max(0, time - this._startTime);

        return this._to
            + (this._from - this._to)
                * Math.exp(-elapsed / this._timeConstant);
    }
}
