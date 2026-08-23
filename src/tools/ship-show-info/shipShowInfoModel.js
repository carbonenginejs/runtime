const AU_METERS = 149597870700;
const ALIGN_THRESHOLD = -Math.log(0.25);

/** Returns a positive EVE identifier without accepting decimal coercion. */
export function shipShowInfoID(value)
{
    const normalized = typeof value === "string" ? value.trim() : value;
    const id = Number(normalized);

    return /^\d+$/.test(String(normalized)) && Number.isSafeInteger(id) && id > 0
        ? id
        : null;
}

/** Formats an EVE market estimate without changing the source value. */
export function formatShipISK(value, { compact = false } = {})
{
    if (!Number.isFinite(Number(value))) return "\u2014";

    const number = Number(value);

    if (compact)
    {
        return `${new Intl.NumberFormat("en", {
            maximumFractionDigits: number >= 1_000_000 ? 2 : 0,
            notation: "compact"
        }).format(number)} ISK`;
    }

    return `${new Intl.NumberFormat("en", {
        maximumFractionDigits: 2,
        minimumFractionDigits: Number.isInteger(number) ? 0 : 2
    }).format(number)} ISK`;
}

/** Converts a Dogma resonance multiplier into the resistance shown in game. */
export function resistancePercent(resonance)
{
    const value = Number(resonance);

    return Number.isFinite(value) ? (1 - value) * 100 : null;
}

/** Base omni-damage EHP using the arithmetic mean of four resonances. */
export function effectiveHitpoints(hitpoints, resonances)
{
    const hp = Number(hitpoints);

    if (!Number.isFinite(hp) || !Array.isArray(resonances) || resonances.length === 0) return null;

    let total = 0;

    for (const resonance of resonances)
    {
        const value = Number(resonance);

        if (!Number.isFinite(value)) return null;
        total += value;
    }

    const average = total / resonances.length;

    return average > 0 ? hp / average : null;
}

/** Base align time from mass (kg) and the Dogma inertia modifier. */
export function alignTimeSeconds(mass, inertiaModifier)
{
    const normalizedMass = Number(mass);
    const agility = Number(inertiaModifier);

    if (!Number.isFinite(normalizedMass) || !Number.isFinite(agility)) return null;
    return ALIGN_THRESHOLD * normalizedMass * agility / 1_000_000;
}

/** Converts meters to astronomical units for directional-scan presentation. */
export function metersToAU(meters)
{
    const value = Number(meters);

    return Number.isFinite(value) ? value / AU_METERS : null;
}

/** Stable label helper shared by the UI and tests. */
export function formatShipValue(value, unit = "")
{
    if (value === null || value === undefined || value === "") return "\u2014";
    if (typeof value === "string") return unit ? `${value} ${unit}` : value;

    const number = Number(value);

    if (!Number.isFinite(number)) return "\u2014";

    const digits = Math.abs(number) >= 100 ? 0 : Math.abs(number) >= 10 ? 1 : 2;
    const formatted = new Intl.NumberFormat("en", { maximumFractionDigits: digits }).format(number);

    return unit ? `${formatted} ${unit}` : formatted;
}
