// Exact Wwise v150 STMG Global Settings decoding. The container reader keeps
// the raw chunk entry and attaches this typed view only when the whole payload
// is valid and consumed.

import { WwiseCursor } from "./nodeBase.js";

export const WWISE_GLOBAL_SETTINGS_VERSION = 150;

const FILTER_BEHAVIORS = new Set([ 0, 1 ]);
const SWITCH_CONTROL_TYPES = new Set([ 0, 1, 2, 3, 4 ]);
const INTERPOLATIONS = new Set([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]);
const RAMP_TYPES = new Set([ 0, 1, 2 ]);
const BUILT_IN_PARAMETERS = new Set([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]);

/**
 * Decodes one exact Wwise v150 STMG Global Settings payload.
 *
 * Other versions, truncated tables, invalid enums or floats, impossible
 * counts, and trailing bytes return null. Numeric enum values are retained so
 * the runtime resource layer remains a lossless typed reader rather than a policy layer.
 *
 * @param {Uint8Array} payload STMG payload bytes after the chunk header.
 * @param {object} [options] Decode options.
 * @param {number} [options.bankVersion=150] Wwise bank generator version.
 * @returns {object|null} Typed global settings, or null when not exact.
 */
export function parseGlobalSettings(
    payload,
    { bankVersion = WWISE_GLOBAL_SETTINGS_VERSION } = {},
)
{
    if (!(payload instanceof Uint8Array)
        || Number(bankVersion) !== WWISE_GLOBAL_SETTINGS_VERSION)
    {
        return null;
    }

    try
    {
        const cursor = new WwiseCursor(payload);
        const filterBehavior = ReadEnum(
            cursor.u16(),
            FILTER_BEHAVIORS,
            "filter behavior",
        );
        const result = {
            filterBehavior,
            volumeThreshold: cursor.finiteF32(),
            maxVoices: cursor.u16(),
            maxDangerousVirtualVoices: cursor.u16(),
            stateGroups: ReadStateGroups(cursor),
            switchGroups: ReadSwitchGroups(cursor),
            rtpcParameters: ReadRtpcParameters(cursor),
            acousticTextures: ReadAcousticTextures(cursor),
        };

        return cursor.remaining === 0 ? result : null;
    }
    catch (error)
    {
        if (error instanceof RangeError)
        {
            return null;
        }
        throw error;
    }
}

function ReadStateGroups(cursor)
{
    const count = cursor.readBoundedCount(12);
    const groups = [];

    for (let index = 0; index < count; index++)
    {
        const id = cursor.u32();
        const defaultTransitionTimeMs = cursor.u32();
        const transitionCount = cursor.readBoundedCount(12);
        const transitions = [];

        for (let transitionIndex = 0;
            transitionIndex < transitionCount;
            transitionIndex++)
        {
            transitions.push({
                fromId: cursor.u32(),
                toId: cursor.u32(),
                transitionTimeMs: cursor.u32(),
            });
        }
        groups.push({ id, defaultTransitionTimeMs, transitions });
    }
    return groups;
}

function ReadSwitchGroups(cursor)
{
    const count = cursor.readBoundedCount(13);
    const groups = [];

    for (let index = 0; index < count; index++)
    {
        const id = cursor.u32();
        const controlId = cursor.u32();
        const controlType = ReadEnum(
            cursor.u8(),
            SWITCH_CONTROL_TYPES,
            "switch control type",
        );
        const pointCount = cursor.readBoundedCount(12);
        const points = [];

        for (let pointIndex = 0; pointIndex < pointCount; pointIndex++)
        {
            points.push({
                from: cursor.finiteF32(),
                to: cursor.finiteF32(),
                interpolation: ReadEnum(
                    cursor.u32(),
                    INTERPOLATIONS,
                    "switch interpolation",
                ),
            });
        }
        groups.push({ id, controlId, controlType, points });
    }
    return groups;
}

function ReadRtpcParameters(cursor)
{
    const count = cursor.readBoundedCount(21);
    const parameters = [];

    for (let index = 0; index < count; index++)
    {
        parameters.push({
            id: cursor.u32(),
            defaultValue: cursor.finiteF32(),
            rampType: ReadEnum(
                cursor.u32(),
                RAMP_TYPES,
                "RTPC ramp type",
            ),
            rampUp: cursor.finiteF32(),
            rampDown: cursor.finiteF32(),
            builtInParameter: ReadEnum(
                cursor.u8(),
                BUILT_IN_PARAMETERS,
                "built-in parameter",
            ),
        });
    }
    return parameters;
}

function ReadAcousticTextures(cursor)
{
    const count = cursor.readBoundedCount(28);
    const textures = [];

    for (let index = 0; index < count; index++)
    {
        textures.push({
            id: cursor.u32(),
            absorptionOffset: cursor.finiteF32(),
            absorptionLow: cursor.finiteF32(),
            absorptionMidLow: cursor.finiteF32(),
            absorptionMidHigh: cursor.finiteF32(),
            absorptionHigh: cursor.finiteF32(),
            scattering: cursor.finiteF32(),
        });
    }
    return textures;
}

function ReadEnum(value, allowed, label)
{
    if (!allowed.has(value))
    {
        throw new RangeError(`Invalid Wwise ${label} ${value}`);
    }
    return value;
}

