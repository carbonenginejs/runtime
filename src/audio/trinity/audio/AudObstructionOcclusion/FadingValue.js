// Source: audio/src/AudObstructionOcclusion.h + AudObstructionOcclusion.cpp
// Headless behavior port. The host supplies blockage; this class performs no
// ray casting and leaves the audible obstruction/occlusion law to the backend.

// Nested AudObstructionOcclusion::FadingValue, split for class findability.
function ClampUnit(value)
{
  return Math.max(0, Math.min(1, Number(value)));
}

/** One obstruction or occlusion value fading towards an authored target. */
export class FadingValue
{
  currentValue = 0;

  targetValue = 0;

  /** Clamps and stores the next fade target. */
  SetTarget(target)
  {
    this.targetValue = ClampUnit(target);
  }

  /** Advances linearly by one clock delta and reports a live-value change. */
  Advance(deltaSeconds, fadeRate)
  {
    if (this.currentValue === this.targetValue)
    {
      return false;
    }
    if (fadeRate <= 0)
    {
      this.currentValue = this.targetValue;
      return true;
    }

    const previous = this.currentValue;
    const step = fadeRate * deltaSeconds;

    if (previous > this.targetValue)
    {
      this.currentValue = Math.max(this.targetValue, previous - step);
    }
    else
    {
      this.currentValue = Math.min(this.targetValue, previous + step);
    }
    return this.currentValue !== previous;
  }

  /** Applies the target immediately for a newly tracked emitter. */
  SnapToTarget()
  {
    this.currentValue = this.targetValue;
  }
}
