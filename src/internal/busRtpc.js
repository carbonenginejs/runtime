import {
    evaluateWwiseRtpcCurve,
    wwiseDbRtpcValueToDb,
} from "./wwiseRtpc.js";

const BUS_VOLUME_PROPERTY = "bus-volume";
const VOICE_VOLUME_PROPERTY = "voice-volume";

/** Indexes an installed bus-RTPC catalog by authored bus id. */
export function indexBusRtpcCatalog(catalog)
{
    const result = new Map();

    for (const [ busId, curves ] of Object.entries(catalog?.buses ?? {}))
    {
        result.set(String(busId), curves);
    }
    return result;
}

/** Returns whether any authored bus curve consumes one global parameter. */
export function busRtpcCatalogUsesControl(catalog, name)
{
    if (!(catalog instanceof Map)) return false;

    const control = String(name);

    for (const curves of catalog.values())
    {
        if (curves.some(curve => curve.rtpc === control)) return true;
    }
    return false;
}

/** Returns whether one bus ancestry uses the selected RTPC gain property. */
export function busRtpcPathUses(catalog, busPathIds, property)
{
    if (!(catalog instanceof Map)) return false;
    const selected = String(property);
    const seen = new Set();

    for (const rawBusId of busPathIds ?? [])
    {
        const busId = String(rawBusId);

        if (seen.has(busId)) continue;
        seen.add(busId);
        if ((catalog.get(busId) ?? []).some(curve =>
            CurveProperty(curve) === selected))
        {
            return true;
        }
    }
    return false;
}

/** Evaluates additive Bus Volume RTPC gain across one dry bus ancestry. */
export function evaluateBusRtpcGainDb(
    catalog,
    busPathIds,
    readGlobalRtpc,
    at = undefined,
)
{
    return EvaluateBusRtpcPropertyGainDb(
        catalog,
        busPathIds,
        readGlobalRtpc,
        BUS_VOLUME_PROPERTY,
        at,
    );
}

/** Evaluates additive Voice Volume RTPC gain across one bus ancestry. */
export function evaluateBusVoiceRtpcGainDb(
    catalog,
    busPathIds,
    readGlobalRtpc,
    at = undefined,
)
{
    return EvaluateBusRtpcPropertyGainDb(
        catalog,
        busPathIds,
        readGlobalRtpc,
        VOICE_VOLUME_PROPERTY,
        at,
    );
}

function EvaluateBusRtpcPropertyGainDb(
    catalog,
    busPathIds,
    readGlobalRtpc,
    property,
    at,
)
{
    if (!(catalog instanceof Map) || typeof readGlobalRtpc !== "function")
    {
        return 0;
    }

    let gainDb = 0;
    const seen = new Set();

    for (const rawBusId of busPathIds ?? [])
    {
        const busId = String(rawBusId);

        if (seen.has(busId)) continue;
        seen.add(busId);

        for (const curve of catalog.get(busId) ?? [])
        {
            if (CurveProperty(curve) !== property) continue;
            const current = readGlobalRtpc(curve.rtpc, at);
            const input = current === undefined || current === null
                ? curve.defaultValue
                : Number(current);
            const output = evaluateWwiseRtpcCurve(
                curve.points,
                Number.isFinite(input) ? input : curve.points[0].x,
            );

            gainDb += wwiseDbRtpcValueToDb(output);
        }
    }
    return gainDb;
}

function CurveProperty(curve)
{
    // Version 1 catalogs predate property tagging and contain only Bus Volume.
    return curve?.property === undefined
        ? BUS_VOLUME_PROPERTY
        : String(curve.property);
}
