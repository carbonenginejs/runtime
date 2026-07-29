// Wwise soundbank object-graph interpretation: event -> media resolution over
// one or more inspected banks. Exposed as `CjsBnkFormat.eventMediaFromBanks`.
// This is NOT part of the format read path and is never used by the resource
// lifecycle - it exists so consumers can go from `inspect()` output to "what
// does event X play?" without writing their own graph walk.
//
// Inputs are plain inspect() results (formats/bnk): the typed HIRC fields
// (event actionIds, action actionType/targetId, sound/track sourceIds) plus
// per-object raw payload views for the structures that stay undecoded
// (container children, positioning, RTPC data).
//
// Verified against EVE soundbanks (bank generator version 150 / Wwise 2022.1):
// - Banks may split responsibilities: EVE keeps every event/action in one
//   bank (common.bnk) and the sounds/containers they target in the media
//   banks, so edges only resolve over the MERGED graph - always pass every
//   related bank to one call.
// - Walk policy: only play-family actions (actionType high byte 0x04) are
//   followed; sounds and music tracks are terminals (their typed sourceIds
//   are the media); actor-mixers and buses are never entered, because node
//   payloads carry parent/bus back-pointers that would otherwise drag every
//   sibling sound into the result.
// - Container children lists are undecoded, so references are recovered with
//   a validated id-scan: a u32 at ANY byte offset of a container payload
//   counts only when it matches a traversable object id or a known wem id.
//   Wwise ids are 32-bit hashes, making in-bank collisions vanishingly rare.

const HIRC_SOUND = 2;
const HIRC_ACTION = 3;
const HIRC_EVENT = 4;
const HIRC_MUSIC_TRACK = 11;

// Types the walk may traverse INTO from a play action or container:
// sound (2), random-sequence (5), switch (6), blend/layer (9),
// music segment/track/switch/playlist (10-13).
const TRAVERSABLE_TYPES = new Set([ 2, 5, 6, 9, 10, 11, 12, 13 ]);

// Media-bearing terminals: typed sourceIds are collected, no traversal out.
const TERMINAL_TYPES = new Set([ HIRC_SOUND, HIRC_MUSIC_TRACK ]);

const PLAY_ACTION_TYPES = new Set([ 0x0403, 0x0503 ]);

/**
 * Resolve event -> wem media edges over one or more inspected soundbanks.
 *
 * @param {Array<object>} inspections `CjsBnkFormat.inspect()` results for every related bank.
 * @param {object} [options] Optional settings.
 * @param {Iterable<number|string>} [options.knownWemIds] Streamed wem ids to validate media references against; every bank's embedded media ids are always included.
 * @returns {{eventMedia: Map<number, Set<number>>, diagnostics: object}} Event object id -> wem id set, plus walk diagnostics.
 */
export function eventMediaFromBanks(inspections, { knownWemIds = [] } = {})
{
    const objects = new Map();
    const diagnostics = { objectCount: 0, eventCount: 0 };

    for (const inspection of inspections)
    {
        for (const entry of inspection.hirc || [])
        {
            objects.set(entry.id, entry);
            diagnostics.objectCount++;
        }
    }

    const wemIdSet = new Set();
    for (const id of knownWemIds) wemIdSet.add(Number(id) >>> 0);
    for (const inspection of inspections)
    {
        for (const record of inspection.media || []) wemIdSet.add(record.id);
    }

    // Validated id-scan over a container payload, cached per object id -
    // containers are shared between many events.
    const scanCache = new Map();
    const scanObject = (entry) =>
    {
        let cached = scanCache.get(entry.id);
        if (cached) return cached;
        const nodeRefs = new Set();
        const mediaRefs = new Set();
        cached = { nodeRefs, mediaRefs };
        scanCache.set(entry.id, cached);
        const body = entry.payload;
        if (!body) return cached;
        for (let at = 0; at + 4 <= body.byteLength; at++)
        {
            const value = (body[at] | (body[at + 1] << 8) | (body[at + 2] << 16) | (body[at + 3] * 0x1000000)) >>> 0;
            if (value === entry.id) continue;
            if (wemIdSet.has(value)) mediaRefs.add(value);
            const target = objects.get(value);
            if (target && TRAVERSABLE_TYPES.has(target.type)) nodeRefs.add(value);
        }
        return cached;
    };

    const eventMedia = new Map();
    for (const entry of objects.values())
    {
        if (entry.type !== HIRC_EVENT) continue;
        diagnostics.eventCount++;
        const media = new Set();
        const visited = new Set();
        const stack = [];

        for (const actionId of entry.actionIds || [])
        {
            const action = objects.get(actionId);
            if (!action || action.type !== HIRC_ACTION) continue;
            if (!PLAY_ACTION_TYPES.has(action.actionType ?? 0)) continue;
            const target = objects.get(action.targetId);
            if (target && TRAVERSABLE_TYPES.has(target.type)) stack.push(target.id);
        }

        while (stack.length)
        {
            const node = objects.get(stack.pop());
            if (!node || visited.has(node.id)) continue;
            visited.add(node.id);

            const { nodeRefs, mediaRefs } = scanObject(node);
            for (const wemId of mediaRefs) media.add(wemId);
            if (node.type === HIRC_SOUND
                && node.pluginType === 1
                && node.sourceId !== undefined
                && wemIdSet.has(node.sourceId))
            {
                media.add(node.sourceId);
            }
            if (node.type === HIRC_MUSIC_TRACK)
            {
                for (const source of node.sources || [])
                {
                    if (wemIdSet.has(source.sourceId)) media.add(source.sourceId);
                }
            }
            if (!TERMINAL_TYPES.has(node.type))
            {
                for (const next of nodeRefs) stack.push(next);
            }
        }

        if (media.size) eventMedia.set(entry.id, media);
    }

    return { eventMedia, diagnostics };
}
