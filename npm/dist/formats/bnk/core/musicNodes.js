// Wwise interactive-music node decoding: typed payloads for music-segment
// (10), music-track (11), music-switch-container (12), and
// music-playlist-container (13) HIRC entries. Exposed through
// `CjsBnkFormat.wwise` next to the event graph walk - interpretation over
// `inspect()` results, never part of the format read path.
//
// Verified against EVE soundbanks (bank generator version 150 / Wwise
// 2022.1): 2,484 tracks, 1,326 segments, 214 playlists, and 54 switch
// containers across music.bnk + music_essential.bnk all decode with the
// exact-end validation below (2026-07-19 corpus run).
//
// Approach: consumers of these nodes (music schedulers) only need the fields
// AFTER the variable-length NodeBaseParams block - children, meter, stingers,
// and each type's tail - so segment/playlist/switch payloads are parsed from
// a children+meter ANCHOR (a u32 child count and child ids that exist in the
// bank, followed by a plausible AkMeterInfo) and the parse is accepted only
// when it consumes the payload EXACTLY to its end. Track clips live at the
// head (before NodeBaseParams) and the track's type block is tail-validated
// the same way.

/**
 * Little-endian byte cursor over HIRC payload bytes used to decode Wwise
 * interactive-music node payloads with exact-end validation.
 */
class MusicCursor {
  constructor(bytes, offset = 0) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.bytes = bytes;
    this.at = offset;
  }
  get remaining() {
    return this.bytes.byteLength - this.at;
  }
  u8() {
    return this.view.getUint8(this.at++);
  }
  u16() {
    const value = this.view.getUint16(this.at, true);
    this.at += 2;
    return value;
  }
  s16() {
    const value = this.view.getInt16(this.at, true);
    this.at += 2;
    return value;
  }
  u32() {
    const value = this.view.getUint32(this.at, true);
    this.at += 4;
    return value;
  }
  s32() {
    const value = this.view.getInt32(this.at, true);
    this.at += 4;
    return value;
  }
  f32() {
    const value = this.view.getFloat32(this.at, true);
    this.at += 4;
    return value;
  }
  f64() {
    const value = this.view.getFloat64(this.at, true);
    this.at += 8;
    return value;
  }
  stringZ() {
    let end = this.at;
    while (end < this.bytes.byteLength && this.bytes[end] !== 0) end++;
    let value = "";
    for (let i = this.at; i < end; i++) value += String.fromCharCode(this.bytes[i]);
    this.at = end + 1;
    return value;
  }
}
function plausibleMeter(view, at, byteLength) {
  if (at + 22 > byteLength) return false;
  const grid = view.getFloat64(at, true);
  const offset = view.getFloat64(at + 8, true);
  const tempo = view.getFloat32(at + 16, true);
  const beats = view.getUint8(at + 20);
  const beatValue = view.getUint8(at + 21);
  return Number.isFinite(grid) && grid >= 0 && grid < 600000 && Number.isFinite(offset) && offset >= 0 && offset < 600000 && Number.isFinite(tempo) && tempo > 0 && tempo < 1000 && beats >= 1 && beats <= 64 && [1, 2, 4, 8, 16, 32].includes(beatValue);
}
function findAnchors(bytes, knownIds) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const anchors = [];
  for (let at = 1; at + 4 <= bytes.byteLength; at++) {
    const count = view.getUint32(at, true);
    if (count > 256 || at + 4 + count * 4 + 22 > bytes.byteLength) continue;
    let valid = true;
    for (let i = 0; i < count; i++) {
      if (!knownIds.has(view.getUint32(at + 4 + i * 4, true))) {
        valid = false;
        break;
      }
    }
    if (valid && plausibleMeter(view, at + 4 + count * 4, bytes.byteLength)) {
      anchors.push(at);
    }
  }
  return anchors;
}
function readMusicNodeTail(cursor) {
  const childCount = cursor.u32();
  const children = [];
  for (let i = 0; i < childCount; i++) children.push(cursor.u32());
  const meter = {
    gridPeriod: cursor.f64(),
    gridOffset: cursor.f64(),
    tempo: cursor.f32(),
    beatsPerBar: cursor.u8(),
    beatValue: cursor.u8()
  };
  const meterOverride = cursor.u8() !== 0;
  const stingerCount = cursor.u32();
  const stingers = [];
  for (let i = 0; i < stingerCount; i++) {
    stingers.push({
      triggerId: cursor.u32(),
      segmentId: cursor.u32(),
      syncPlayAt: cursor.u32(),
      cueFilterHash: cursor.u32(),
      dontRepeatTime: cursor.s32(),
      numSegmentLookAhead: cursor.u32()
    });
  }
  return {
    children,
    meter,
    meterOverride,
    stingers
  };
}

/** AkMusicTransNodeParams: transition rules shared by playlist + switch containers. */
function readTransRules(cursor) {
  const ruleCount = cursor.u32();
  if (ruleCount > 4096) throw new RangeError("rule count");
  const rules = [];
  for (let i = 0; i < ruleCount; i++) {
    const srcCount = cursor.u32();
    if (srcCount > 1024) throw new RangeError("src count");
    const srcIds = [];
    for (let j = 0; j < srcCount; j++) srcIds.push(cursor.s32());
    const dstCount = cursor.u32();
    if (dstCount > 1024) throw new RangeError("dst count");
    const dstIds = [];
    for (let j = 0; j < dstCount; j++) dstIds.push(cursor.s32());
    const src = {
      transitionTime: cursor.s32(),
      fadeCurve: cursor.u32(),
      fadeOffset: cursor.s32(),
      syncType: cursor.u32(),
      cueFilterHash: cursor.u32(),
      playPostExit: cursor.u8() !== 0
    };
    const dst = {
      transitionTime: cursor.s32(),
      fadeCurve: cursor.u32(),
      fadeOffset: cursor.s32(),
      cueFilterHash: cursor.u32(),
      jumpToId: cursor.u32(),
      jumpToType: cursor.u16(),
      entryType: cursor.u16(),
      playPreEntry: cursor.u8() !== 0,
      matchSourceCueName: cursor.u8() !== 0
    };
    let transitionSegment = null;
    if (cursor.u8() !== 0) {
      transitionSegment = {
        segmentId: cursor.u32(),
        fadeIn: {
          transitionTime: cursor.s32(),
          fadeCurve: cursor.u32(),
          fadeOffset: cursor.s32()
        },
        fadeOut: {
          transitionTime: cursor.s32(),
          fadeCurve: cursor.u32(),
          fadeOffset: cursor.s32()
        },
        playPreEntry: cursor.u8() !== 0,
        playPostExit: cursor.u8() !== 0
      };
    }
    rules.push({
      srcIds,
      dstIds,
      src,
      dst,
      transitionSegment
    });
  }
  return rules;
}

/**
 * Decode a music-segment (HIRC 10) payload: children, meter, stingers,
 * duration, and entry/exit markers.
 *
 * @param {Uint8Array} bytes Entry payload view from `inspect()`.
 * @param {Set<number>} knownIds Every HIRC object id in the same bank.
 * @returns {object|null} Decoded segment, or null when no anchored parse consumes the payload exactly.
 */
function parseMusicSegment(bytes, knownIds) {
  for (const anchor of findAnchors(bytes, knownIds)) {
    try {
      const cursor = new MusicCursor(bytes, anchor);
      const node = readMusicNodeTail(cursor);
      const duration = cursor.f64();
      if (!Number.isFinite(duration) || duration < 0 || duration > 36000000) continue;
      const markerCount = cursor.u32();
      if (markerCount > 1024) continue;
      const markers = [];
      for (let i = 0; i < markerCount; i++) {
        markers.push({
          id: cursor.u32(),
          position: cursor.f64(),
          name: cursor.stringZ()
        });
      }
      if (cursor.at !== bytes.byteLength) continue;
      if (markers.some(marker => !Number.isFinite(marker.position) || marker.position < 0)) continue;
      return {
        ...node,
        duration,
        markers
      };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Decode a music-track (HIRC 11) payload: sources, clips (play position and
 * trims per subtrack), track type, and switch parameters for switch tracks.
 *
 * @param {Uint8Array} bytes Entry payload view from `inspect()`.
 * @returns {object|null} Decoded track, or null when neither tail layout validates.
 */
function parseMusicTrack(bytes) {
  const cursor = new MusicCursor(bytes, 0);
  cursor.u8(); // uFlags (midi/override bits)
  const sourceCount = cursor.u32();
  if (sourceCount > 512) return null;
  const sources = [];
  for (let i = 0; i < sourceCount; i++) {
    const pluginId = cursor.u32();
    const streamType = cursor.u8();
    const sourceId = cursor.u32();
    const inMemoryMediaSize = cursor.u32();
    const sourceBits = cursor.u8();
    if ((pluginId & 0x0f) === 0x02) {
      const size = cursor.u32();
      cursor.at += size;
    }
    sources.push({
      pluginId,
      streamType,
      sourceId,
      inMemoryMediaSize,
      sourceBits
    });
  }
  const clipCount = cursor.u32();
  if (clipCount > 4096) return null;
  const clips = [];
  for (let i = 0; i < clipCount; i++) {
    clips.push({
      trackId: cursor.u32(),
      sourceId: cursor.u32(),
      eventId: cursor.u32(),
      playAt: cursor.f64(),
      beginTrimOffset: cursor.f64(),
      endTrimOffset: cursor.f64(),
      srcDuration: cursor.f64()
    });
  }
  const subTrackCount = clipCount > 0 ? cursor.u32() : 0;
  const autoCount = cursor.u32();
  if (autoCount > 4096) return null;
  for (let i = 0; i < autoCount; i++) {
    cursor.u32(); // clip index
    cursor.u32(); // automation type
    const points = cursor.u32();
    if (points > 65536) return null;
    cursor.at += points * 12;
  }
  const headEnd = cursor.at;

  // Tail: [NodeBaseParams...] u8 trackType, [switch+trans params when the
  // type is 3], f32 lookAheadTime. The switch layout is tried FIRST because
  // it validates every field to the exact payload end - the simple layout
  // only checks one byte, and a switch tail ending in zero bytes would
  // satisfy it falsely.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.byteLength;
  for (let typeAt = headEnd; typeAt <= end - 5; typeAt++) {
    if (view.getUint8(typeAt) !== 3) continue;
    const tail = new MusicCursor(bytes, typeAt + 1);
    try {
      const groupType = tail.u8();
      if (groupType > 1) continue;
      const groupId = tail.u32();
      const defaultSwitch = tail.u32();
      const assocCount = tail.u32();
      if (assocCount > 1024) continue;
      const assoc = [];
      for (let i = 0; i < assocCount; i++) assoc.push(tail.u32());
      const trans = {
        srcTransitionTime: tail.s32(),
        srcFadeCurve: tail.u32(),
        srcFadeOffset: tail.s32(),
        syncType: tail.u32(),
        cueFilterHash: tail.u32(),
        dstTransitionTime: tail.s32(),
        dstFadeCurve: tail.u32(),
        dstFadeOffset: tail.s32()
      };
      const lookAheadTime = tail.f32();
      if (tail.at !== end) continue;
      return {
        sources,
        clips,
        subTrackCount,
        trackType: 3,
        lookAheadTime,
        switchParams: {
          groupType,
          groupId,
          defaultSwitch,
          assoc,
          trans
        }
      };
    } catch {
      continue;
    }
  }
  const simpleAt = end - 5;
  if (simpleAt >= headEnd) {
    const type = view.getUint8(simpleAt);
    if (type <= 2) {
      return {
        sources,
        clips,
        subTrackCount,
        trackType: type,
        lookAheadTime: view.getFloat32(end - 4, true),
        switchParams: null
      };
    }
  }
  return null;
}

/**
 * Decode a music-playlist-container (HIRC 13) payload: children, meter,
 * stingers, transition rules, and the flat pre-order playlist tree.
 *
 * @param {Uint8Array} bytes Entry payload view from `inspect()`.
 * @param {Set<number>} knownIds Every HIRC object id in the same bank.
 * @returns {object|null} Decoded playlist container, or null when no anchored parse validates.
 */
function parseMusicPlaylist(bytes, knownIds) {
  for (const anchor of findAnchors(bytes, knownIds)) {
    try {
      const cursor = new MusicCursor(bytes, anchor);
      const node = readMusicNodeTail(cursor);
      const rules = readTransRules(cursor);
      const itemCount = cursor.u32();
      if (itemCount > 8192) continue;
      if (cursor.remaining !== itemCount * 30) continue;
      const items = [];
      for (let i = 0; i < itemCount; i++) {
        items.push({
          segmentId: cursor.u32(),
          playlistItemId: cursor.u32(),
          childCount: cursor.u32(),
          rsType: cursor.s32(),
          loop: cursor.s16(),
          loopMin: cursor.s16(),
          loopMax: cursor.s16(),
          weight: cursor.u32(),
          avoidRepeatCount: cursor.u16(),
          usingWeight: cursor.u8() !== 0,
          shuffle: cursor.u8() !== 0
        });
      }
      if (cursor.at !== bytes.byteLength) continue;
      return {
        ...node,
        rules,
        playlist: items
      };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Decode a music-switch-container (HIRC 12) payload: children, meter,
 * stingers, transition rules, argument groups, and the decision tree.
 *
 * @param {Uint8Array} bytes Entry payload view from `inspect()`.
 * @param {Set<number>} knownIds Every HIRC object id in the same bank.
 * @returns {object|null} Decoded switch container, or null when no anchored parse validates.
 */
function parseMusicSwitch(bytes, knownIds) {
  for (const anchor of findAnchors(bytes, knownIds)) {
    try {
      const cursor = new MusicCursor(bytes, anchor);
      const node = readMusicNodeTail(cursor);
      const rules = readTransRules(cursor);
      const continuePlayback = cursor.u8() !== 0;
      const treeDepth = cursor.u32();
      if (treeDepth > 16) continue;
      const argumentGroups = [];
      for (let i = 0; i < treeDepth; i++) argumentGroups.push({
        groupId: cursor.u32()
      });
      for (let i = 0; i < treeDepth; i++) argumentGroups[i].groupType = cursor.u8();
      const treeDataSize = cursor.u32();
      const mode = cursor.u8();
      if (cursor.remaining !== treeDataSize) continue;
      if (treeDataSize % 12 !== 0) continue;
      const treeNodes = [];
      const nodeCount = treeDataSize / 12;
      for (let i = 0; i < nodeCount; i++) {
        const key = cursor.u32();
        // 4-byte union: leaf = audioNodeId, internal = childrenIdx + count.
        const audioNodeId = cursor.view.getUint32(cursor.at, true);
        const childrenIdx = cursor.u16();
        const childrenCount = cursor.u16();
        const weight = cursor.u16();
        const probability = cursor.u16();
        treeNodes.push({
          key,
          audioNodeId,
          childrenIdx,
          childrenCount,
          weight,
          probability
        });
      }
      if (cursor.at !== bytes.byteLength) continue;
      return {
        ...node,
        rules,
        continuePlayback,
        argumentGroups,
        mode,
        treeNodes
      };
    } catch {
      continue;
    }
  }
  return null;
}
const MUSIC_PARSERS = Object.freeze({
  10: (payload, knownIds) => parseMusicSegment(payload, knownIds),
  11: payload => parseMusicTrack(payload),
  12: (payload, knownIds) => parseMusicSwitch(payload, knownIds),
  13: (payload, knownIds) => parseMusicPlaylist(payload, knownIds)
});
const MUSIC_TYPE_NAMES = Object.freeze({
  10: "music-segment",
  11: "music-track",
  12: "music-switch-container",
  13: "music-playlist-container"
});

/**
 * Decode every interactive-music node across one or more inspected banks.
 *
 * @param {Array<object>} inspections `CjsBnkFormat.inspect()` results for every related music bank.
 * @returns {{nodes: Map<number, object>, diagnostics: {parsed: number, failed: Array<{bank: string, type: string, id: number}>}}} Decoded nodes keyed by object id plus per-entry failures.
 */
function musicNodesFromBanks(inspections) {
  const banks = Array.isArray(inspections) ? inspections : [inspections];
  const nodes = new Map();
  const failed = [];
  let parsed = 0;
  for (const inspection of banks) {
    const knownIds = new Set();
    for (const entry of inspection.hirc ?? []) knownIds.add(entry.id);
    for (const entry of inspection.hirc ?? []) {
      const parser = MUSIC_PARSERS[entry.type];
      if (!parser) continue;
      const payload = entry.payload instanceof Uint8Array ? entry.payload : null;
      const decoded = payload ? parser(payload, knownIds) : null;
      if (!decoded) {
        failed.push({
          bank: inspection.source || "",
          type: MUSIC_TYPE_NAMES[entry.type],
          id: entry.id
        });
        continue;
      }
      parsed++;
      nodes.set(entry.id, {
        id: entry.id,
        type: MUSIC_TYPE_NAMES[entry.type],
        bank: inspection.source || "",
        ...decoded
      });
    }
  }
  return {
    nodes,
    diagnostics: {
      parsed,
      failed
    }
  };
}

export { musicNodesFromBanks, parseMusicPlaylist, parseMusicSegment, parseMusicSwitch, parseMusicTrack };
//# sourceMappingURL=musicNodes.js.map
