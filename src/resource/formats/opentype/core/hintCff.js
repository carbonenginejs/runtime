import { CjsSchema } from "#schema/CjsSchema";

// CFF glyph hinting: ported from FreeType's Adobe CFF engine (src/psaux/
// psblues.c, pshints.c, and the hint parts of psintrp.c and psft.c), the
// engine FreeType uses for CFF fonts by default and so the one behind Carbon's
// text (Tr2FontManager loads glyphs with FT_LOAD_DEFAULT). Those files are
//
//     Copyright 2007-2014 Adobe Systems Incorporated.
//
// made available under the FreeType Project License; FTL.TXT in this folder
// carries the licence, and the README the credit it requires.
//
// Changes from the original, as the licence asks us to record:
//   - stem darkening is left out: FreeType's CFF driver turns it off by
//     default (cffobjs.c, `no_stem_darkening = TRUE`), so every darkening
//     amount is 0, and with it the outline offsets and their intersections;
//   - seac accents (`hintOrigin`), Type 1 fonts and font matrices other than
//     the font's own em scale are not handled;
//   - the path is mapped after the charstring has run, from the recorded
//     hintmask and cntrmask positions, instead of while it runs (see
//     hintCffGlyph).
//
// The arithmetic stays the engine's: 16.16 fixed-point integers held in
// JavaScript numbers, with FT_MulFix, FT_DivFix and FT_MulDiv rounding, so
// stems that sit exactly between two pixel positions break the same way. Points
// leave in 26.6, as FreeType's outline builder stores them.
//
// What the engine does: it hints along y only. Each hint map is a sorted list
// of horizontal stem edges with a character-space and a device-space position;
// a point's y is moved linearly between the edges around it. Edges inside a
// blue zone are captured and snapped to the zone; the remaining stems are moved
// so one edge sits on a pixel boundary without overlapping their neighbours.
// x is only scaled (pshints.c, cf2_glyphpath_hintPoint), and vertical stems
// matter only to darkening.

/** Edge flags (psblues.h). */
const GHOST_BOTTOM = 0x1;
const GHOST_TOP = 0x2;
const PAIR_BOTTOM = 0x4;
const PAIR_TOP = 0x8;
const LOCKED = 0x10;
const SYNTHETIC = 0x20;

/** 1.0 in 16.16. */
const ONE = 0x10000;

/** Minimum counter between adjusted edges: 0.5 pixel (psblues.h CF2_MIN_COUNTER). */
const MIN_COUNTER = 0x8000;

/** Ideographic character face bounds for the synthetic em box hints (psblues.h). */
const ICF_TOP = 880 * ONE;
const ICF_BOTTOM = -120 * ONE;

/** cf2_doubleToFixed(.6), the overshoot boost at size 0 (psblues.c). */
const BOOST_LIMIT = 39322;

/** Most stem hints a glyph may declare before the engine gives up hinting it (pshints.h CF2_MAX_HINTS). */
const MAX_HINTS = 96;

/**
 * A hinted glyph: its outline in pixels (multiples of 1/64), y up, origin on
 * the baseline at the pen position, and its advance rounded to whole pixels.
 *
 * @typedef {object} CjsHintedGlyph
 * @property {Array<import("./readCharstring.js").CjsCffPathCommand>} path Outline commands in pixels.
 * @property {number} advanceWidth Advance in whole pixels.
 */

/**
 * A pixel size's scales, quantised as FreeType quantises them.
 *
 * @typedef {object} CjsFreeTypeScales
 * @property {number} xScale26Dot6 FT_Size_Metrics x_scale: 16.16 fixed, 26.6 pixels per font unit.
 * @property {number} yScale26Dot6 FT_Size_Metrics y_scale.
 * @property {number} xScale The engine's x scale: 16.16 fixed pixels per font unit.
 * @property {number} yScale The engine's y scale: 16.16 fixed pixels per font unit.
 */

/**
 * One hint map edge (CF2_HintRec); coordinates in 16.16.
 *
 * @typedef {object} HintEdge
 * @property {number} flags Edge flags.
 * @property {number} csCoord Character-space position.
 * @property {number} dsCoord Device-space position.
 * @property {number} scale Device units per character unit from this edge up to the next.
 * @property {number} index The stem this edge came from.
 */

/**
 * FT_MulFix: a * b / 65536, rounded half away from zero (ftcalc.c).
 *
 * @param {number} a Integer.
 * @param {number} b Integer.
 * @returns {number} The rounded product.
 */
function MulFix(a, b)
{
    const product = a * b;
    return Math.floor((product + 0x8000 - (product < 0 ? 1 : 0)) / 65536);
}

/**
 * FT_DivFix: a / b in 16.16, rounded half away from zero; 0x7FFFFFFF for b = 0 (ftcalc.c).
 *
 * @param {number} a Integer.
 * @param {number} b Integer.
 * @returns {number} The 16.16 quotient.
 */
function DivFix(a, b)
{
    const negative = (a < 0) !== (b < 0);
    const ua = Math.abs(a);
    const ub = Math.abs(b);
    const q = ub === 0 ? 0x7fffffff : Math.floor((ua * 65536 + Math.floor(ub / 2)) / ub);
    return negative ? -q : q;
}

/**
 * FT_MulDiv: a * b / c, rounded half away from zero (ftcalc.c).
 *
 * @param {number} a Integer.
 * @param {number} b Integer.
 * @param {number} c Integer.
 * @returns {number} The rounded result.
 */
function MulDiv(a, b, c)
{
    const negative = (a < 0) !== (b < 0) !== (c < 0);
    const uc = Math.abs(c);
    const q = uc === 0 ? 0x7fffffff : Math.floor((Math.abs(a) * Math.abs(b) + Math.floor(uc / 2)) / uc);
    return negative ? -q : q;
}

/** cf2_fixedRound: to the nearest whole pixel, halves up. @param {number} x 16.16. @returns {number} 16.16. */
function Round(x)
{
    return Math.floor((x + 0x8000) / ONE) * ONE;
}

/** cf2_fixedFraction: the part above the floor, in [0, 1). @param {number} x 16.16. @returns {number} 16.16. */
function Fraction(x)
{
    return x - Math.floor(x / ONE) * ONE;
}

/** A charstring coordinate in 16.16; the interpreter's values are exact multiples of 1/65536. @param {number} v Font units. @returns {number} 16.16. */
function ToFixed(v)
{
    return Math.round(v * ONE);
}

/** @returns {HintEdge} An invalid edge (cf2_hint_initZero). */
function ZeroEdge()
{
    return { flags: 0, csCoord: 0, dsCoord: 0, scale: 0, index: 0 };
}

const IsPair = edge => (edge.flags & (PAIR_BOTTOM | PAIR_TOP)) !== 0;
const IsTop = edge => (edge.flags & (PAIR_TOP | GHOST_TOP)) !== 0;
const IsBottom = edge => (edge.flags & (PAIR_BOTTOM | GHOST_BOTTOM)) !== 0;
const IsLocked = edge => (edge.flags & LOCKED) !== 0;

/**
 * The scales FreeType uses at a pixel size: FT_Set_Pixel_Sizes stores
 * `FT_DivFix(ppem * 64, unitsPerEm)` (ftobjs.c, FT_Request_Metrics), and the
 * CFF engine hints with that value brought to 16.16 by `(scale + 32) / 64`
 * (psft.c, cf2_getScaleAndHintFlag). At 8 px and 1000 units per em the
 * engine scale is 524/65536, not 0.008, and advances round accordingly.
 *
 * @param {number} xPpem Pixels per em along x.
 * @param {number} yPpem Pixels per em along y.
 * @param {number} unitsPerEm The font's units per em (head).
 * @returns {CjsFreeTypeScales} The scales.
 */
export function freetypeScales(xPpem, yPpem, unitsPerEm)
{
    const xScale26Dot6 = DivFix(xPpem * 64, unitsPerEm);
    const yScale26Dot6 = DivFix(yPpem * 64, unitsPerEm);
    return {
        xScale26Dot6,
        yScale26Dot6,
        xScale: Math.floor((xScale26Dot6 + 32) / 64),
        yScale: Math.floor((yScale26Dot6 + 32) / 64)
    };
}

/**
 * Builds the blue zones for one Private DICT at one y scale (psblues.c,
 * cf2_blues_init), without darkening. BlueScale is taken as FreeType stores
 * it: the DICT value times 1000 in 16.16 (cffparse.c), divided by 1000
 * (psft.c, cf2_getBlueMetrics).
 *
 * @param {import("./readCff.js").CjsCffPrivate} hints The Private DICT values.
 * @param {number} scale The engine's y scale, 16.16.
 * @returns {object} The zones and their capture settings, in 16.16.
 */
function InitBlues(hints, scale)
{
    const blues = {
        scale,
        blueScale: DivFix(Math.round(hints.blueScale * 1000 * ONE), 1000 * ONE),
        blueShift: hints.blueShift * ONE,
        blueFuzz: hints.blueFuzz * ONE,
        zones: [],
        suppressOvershoot: false,
        boost: 0,
        doEmBoxHints: false,
        emBoxBottomEdge: null,
        emBoxTopEdge: null
    };
    const blueValues = hints.blueValues.map(ToFixed);
    const otherBlues = hints.otherBlues.map(ToFixed);
    const familyBlues = hints.familyBlues.map(ToFixed);
    const familyOtherBlues = hints.familyOtherBlues.map(ToFixed);

    // 1. Ideographic fonts without real zones get synthetic em box edges instead.
    if (hints.languageGroup === 1 && (blueValues.length === 0 || (blueValues.length === 4
        && blueValues[0] < ICF_BOTTOM && blueValues[1] < ICF_BOTTOM && blueValues[2] > ICF_TOP && blueValues[3] > ICF_TOP)))
    {
        const bottom = ICF_BOTTOM - 1;
        const top = ICF_TOP + 1;
        blues.emBoxBottomEdge = { flags: GHOST_BOTTOM | LOCKED | SYNTHETIC, csCoord: bottom, dsCoord: Round(MulFix(bottom, scale)) - MIN_COUNTER, scale, index: 0 };
        blues.emBoxTopEdge = { flags: GHOST_TOP | LOCKED | SYNTHETIC, csCoord: top, dsCoord: Round(MulFix(top, scale)) + MIN_COUNTER, scale, index: 0 };
        blues.doEmBoxHints = true;
        return blues;
    }

    // 2. BlueValues (first pair bottom, the rest top) and OtherBlues (all bottom).
    let maxZoneHeight = 0;
    const AddZones = (values, isBlueValues) =>
    {
        for (let i = 0; i + 1 < values.length; i += 2)
        {
            const csBottomEdge = values[i];
            const csTopEdge = values[i + 1];
            const zoneHeight = csTopEdge - csBottomEdge;
            if (zoneHeight < 0) continue;
            if (zoneHeight > maxZoneHeight) maxZoneHeight = zoneHeight;
            const bottomZone = !isBlueValues || i === 0;
            blues.zones.push({ csBottomEdge, csTopEdge, bottomZone, csFlatEdge: bottomZone ? csTopEdge : csBottomEdge, dsFlatEdge: 0 });
        }
    };
    AddZones(blueValues, true);
    AddZones(otherBlues, false);

    // 3. Snap each flat edge to the nearest family edge within one pixel.
    const csUnitsPerPixel = DivFix(ONE, scale);
    for (const zone of blues.zones)
    {
        const flatEdge = zone.csFlatEdge;
        let minDiff = Infinity;
        if (zone.bottomZone)
        {
            for (let j = 0; j + 1 < familyOtherBlues.length; j += 2)
            {
                const diff = Math.abs(flatEdge - familyOtherBlues[j + 1]);
                if (diff < minDiff && diff < csUnitsPerPixel)
                {
                    zone.csFlatEdge = familyOtherBlues[j + 1];
                    minDiff = diff;
                    if (diff === 0) break;
                }
            }
            if (familyBlues.length >= 2)
            {
                const diff = Math.abs(flatEdge - familyBlues[1]);
                if (diff < minDiff && diff < csUnitsPerPixel) zone.csFlatEdge = familyBlues[1];
            }
        }
        else
        {
            for (let j = 2; j < familyBlues.length; j += 2)
            {
                const diff = Math.abs(flatEdge - familyBlues[j]);
                if (diff < minDiff && diff < csUnitsPerPixel)
                {
                    zone.csFlatEdge = familyBlues[j];
                    minDiff = diff;
                    if (diff === 0) break;
                }
            }
        }
    }

    // 4. Clamp BlueScale, then suppress overshoot and boost zones below it.
    if (maxZoneHeight > 0 && blues.blueScale > DivFix(ONE, maxZoneHeight)) blues.blueScale = DivFix(ONE, maxZoneHeight);
    if (scale < blues.blueScale)
    {
        blues.suppressOvershoot = true;
        blues.boost = Math.min(BOOST_LIMIT - MulDiv(BOOST_LIMIT, scale, blues.blueScale), 0x7fff);
    }

    // 5. Device-space flat edges, boosted outward before rounding.
    for (const zone of blues.zones)
    {
        zone.dsFlatEdge = Round(MulFix(zone.csFlatEdge, scale) + (zone.bottomZone ? -blues.boost : blues.boost));
    }
    return blues;
}

/**
 * Captures a stem's edges in a blue zone and moves both to the zone's pixel
 * position (psblues.c, cf2_blues_capture).
 *
 * @param {object} blues The zones from InitBlues.
 * @param {HintEdge} bottom The stem's bottom edge, or an invalid edge.
 * @param {HintEdge} top The stem's top edge, or an invalid edge.
 * @returns {boolean} Whether a zone captured the stem.
 */
function CaptureBlues(blues, bottom, top)
{
    const fuzz = blues.blueFuzz;
    let dsMove = 0;
    let captured = false;

    for (const zone of blues.zones)
    {
        if (zone.bottomZone && IsBottom(bottom))
        {
            if (zone.csBottomEdge - fuzz <= bottom.csCoord && bottom.csCoord <= zone.csTopEdge + fuzz)
            {
                let dsNew;
                if (blues.suppressOvershoot) dsNew = zone.dsFlatEdge;
                else if (zone.csTopEdge - bottom.csCoord >= blues.blueShift) dsNew = Math.min(Round(bottom.dsCoord), zone.dsFlatEdge - ONE);
                else dsNew = Round(bottom.dsCoord);
                dsMove = dsNew - bottom.dsCoord;
                captured = true;
                break;
            }
        }
        if (!zone.bottomZone && IsTop(top))
        {
            if (zone.csBottomEdge - fuzz <= top.csCoord && top.csCoord <= zone.csTopEdge + fuzz)
            {
                let dsNew;
                if (blues.suppressOvershoot) dsNew = zone.dsFlatEdge;
                else if (top.csCoord - zone.csBottomEdge >= blues.blueShift) dsNew = Math.max(Round(top.dsCoord), zone.dsFlatEdge + ONE);
                else dsNew = Round(top.dsCoord);
                dsMove = dsNew - top.dsCoord;
                captured = true;
                break;
            }
        }
    }

    if (captured)
    {
        if (bottom.flags)
        {
            bottom.dsCoord += dsMove;
            bottom.flags |= LOCKED;
        }
        if (top.flags)
        {
            top.dsCoord += dsMove;
            top.flags |= LOCKED;
        }
    }
    return captured;
}

/**
 * One edge of a stem (pshints.c, cf2_hint_init). A stem used by an earlier
 * hint map keeps the position it had there.
 *
 * @param {Array<object>} stems The glyph's horizontal stems in 16.16, with their used positions.
 * @param {number} index Stem index.
 * @param {number} scale The engine's y scale.
 * @param {boolean} bottom Whether to build the bottom edge.
 * @returns {HintEdge} The edge; invalid when the stem has no such edge.
 */
function InitEdge(stems, index, scale, bottom)
{
    const stem = stems[index];
    const edge = ZeroEdge();
    const width = stem.max - stem.min;

    if (width === -21 * ONE)
    {
        if (bottom)
        {
            edge.csCoord = stem.max;
            edge.flags = GHOST_BOTTOM;
        }
    }
    else if (width === -20 * ONE)
    {
        if (!bottom)
        {
            edge.csCoord = stem.min;
            edge.flags = GHOST_TOP;
        }
    }
    else if (width < 0)
    {
        // An inverted pair: CoolType negates it, and so does the engine.
        edge.csCoord = bottom ? stem.max : stem.min;
        edge.flags = bottom ? PAIR_BOTTOM : PAIR_TOP;
    }
    else
    {
        edge.csCoord = bottom ? stem.min : stem.max;
        edge.flags = bottom ? PAIR_BOTTOM : PAIR_TOP;
    }

    edge.scale = scale;
    edge.index = index;
    if (edge.flags !== 0 && stem.used)
    {
        edge.dsCoord = IsTop(edge) ? stem.maxDS : stem.minDS;
        edge.flags |= LOCKED;
    }
    else
    {
        edge.dsCoord = MulFix(edge.csCoord, scale);
    }
    return edge;
}

/**
 * A hint map (CF2_HintMapRec).
 */
class HintMap
{
    /** @type {Array<HintEdge>} */
    edges = [];

    /** The engine's y scale, used where there are no hints. */
    scale = 0;

    /** Whether the map has been built. */
    isValid = false;

    /** The map whose captured edges place the unlocked stems, or null for the initial map itself. @type {HintMap|null} */
    initialMap = null;

    /**
     * @param {number} scale The engine's y scale, 16.16.
     * @param {HintMap|null} initialMap The initial map, or null when this is it.
     */
    constructor(scale, initialMap)
    {
        this.scale = scale;
        this.initialMap = initialMap;
    }

    /**
     * Maps a character-space y to device space (cf2_hintmap_map).
     *
     * @param {number} csCoord y, 16.16 font units.
     * @returns {number} y, 16.16 pixels.
     */
    Map(csCoord)
    {
        const edges = this.edges;
        if (edges.length === 0) return MulFix(csCoord, this.scale);

        let i = 0;
        while (i < edges.length - 1 && csCoord >= edges[i + 1].csCoord) i++;
        if (i === 0 && csCoord < edges[0].csCoord) return MulFix(csCoord - edges[0].csCoord, this.scale) + edges[0].dsCoord;
        return MulFix(csCoord - edges[i].csCoord, edges[i].scale) + edges[i].dsCoord;
    }

    /**
     * Inserts a stem's edges in character-space order, skipping any that
     * overlap edges already in the map (cf2_hintmap_insertHint).
     *
     * @param {HintEdge} bottom Bottom edge, or an invalid edge.
     * @param {HintEdge} top Top edge, or an invalid edge.
     */
    InsertHint(bottom, top)
    {
        const edges = this.edges;
        let isPair = true;
        let first = bottom;
        const second = top;
        if (!bottom.flags)
        {
            first = top;
            isPair = false;
        }
        else if (!top.flags)
        {
            isPair = false;
        }
        if (isPair && top.csCoord < bottom.csCoord) return;

        let at = 0;
        while (at < edges.length && edges[at].csCoord < first.csCoord) at++;

        // Overlaps in character space, including edges that touch.
        if (at < edges.length)
        {
            if (edges[at].csCoord === first.csCoord) return;
            if (isPair && edges[at].csCoord <= second.csCoord) return;
            if (edges[at].flags & PAIR_TOP) return;
        }

        // Unlocked edges are placed from the initial map: a pair by its centre,
        // keeping its scaled width.
        if (this.initialMap && this.initialMap.isValid && !IsLocked(first))
        {
            if (isPair)
            {
                const half = Math.trunc((second.csCoord - first.csCoord) / 2);
                const midpoint = this.initialMap.Map(first.csCoord + half);
                const halfWidth = MulFix(half, this.scale);
                first.dsCoord = midpoint - halfWidth;
                second.dsCoord = midpoint + halfWidth;
            }
            else
            {
                first.dsCoord = this.initialMap.Map(first.csCoord);
            }
        }

        // Overlaps in device space, which captured edges can cause.
        if (at > 0 && first.dsCoord < edges[at - 1].dsCoord) return;
        if (at < edges.length && (isPair ? second.dsCoord : first.dsCoord) > edges[at].dsCoord) return;
        if (edges.length + (isPair ? 1 : 0) >= MAX_HINTS * 2) return;

        if (isPair) edges.splice(at, 0, { ...first }, { ...second });
        else edges.splice(at, 0, { ...first });
    }

    /**
     * Moves each unlocked edge or pair so one edge lands on a pixel boundary,
     * keeping half a pixel between neighbours: bottom-up, then a top-down pass
     * for edges that could not take their best move (cf2_hintmap_adjustHints).
     */
    AdjustHints()
    {
        const edges = this.edges;
        const moves = [];

        for (let i = 0; i < edges.length; i++)
        {
            const isPair = IsPair(edges[i]);
            const j = isPair ? i + 1 : i;
            const dsCoordI = edges[i].dsCoord;
            const dsCoordJ = edges[j].dsCoord;

            if (!IsLocked(edges[i]))
            {
                const fracDown = Fraction(dsCoordI);
                const fracUp = Fraction(dsCoordJ);
                const downMoveDown = -fracDown;
                const upMoveDown = -fracUp;
                const downMoveUp = fracDown === 0 ? 0 : ONE - fracDown;
                const upMoveUp = fracUp === 0 ? 0 : ONE - fracUp;
                const moveUp = Math.min(downMoveUp, upMoveUp);
                const moveDown = Math.max(downMoveDown, upMoveDown);
                let move;
                let saveEdge = false;

                const roomUp = j >= edges.length - 1 || edges[j + 1].dsCoord >= dsCoordJ + moveUp + MIN_COUNTER;
                const roomDown = i === 0 || edges[i - 1].dsCoord <= dsCoordI + moveDown - MIN_COUNTER;
                if (roomUp)
                {
                    move = roomDown && -moveDown < moveUp ? moveDown : moveUp;
                }
                else if (roomDown)
                {
                    move = moveDown;
                    saveEdge = moveUp < -moveDown;
                }
                else
                {
                    move = 0;
                    saveEdge = true;
                }

                if (saveEdge && j < edges.length - 1 && !IsLocked(edges[j + 1])) moves.push({ j, moveUp: moveUp - move });

                edges[i].dsCoord = dsCoordI + move;
                if (isPair) edges[j].dsCoord = dsCoordJ + move;
            }

            // Scales between this edge and the one below, and across the pair.
            if (i > 0 && edges[i].csCoord !== edges[i - 1].csCoord)
            {
                edges[i - 1].scale = DivFix(edges[i].dsCoord - edges[i - 1].dsCoord, edges[i].csCoord - edges[i - 1].csCoord);
            }
            if (isPair)
            {
                if (edges[j].csCoord !== edges[j - 1].csCoord)
                {
                    edges[j - 1].scale = DivFix(edges[j].dsCoord - edges[j - 1].dsCoord, edges[j].csCoord - edges[j - 1].csCoord);
                }
                i++;
            }
        }

        // Second pass, top-down; as in the original, scales are not recomputed.
        for (let k = moves.length - 1; k >= 0; k--)
        {
            const { j, moveUp } = moves[k];
            if (edges[j + 1].dsCoord >= edges[j].dsCoord + moveUp + MIN_COUNTER)
            {
                edges[j].dsCoord += moveUp;
                if (IsPair(edges[j])) edges[j - 1].dsCoord += moveUp;
            }
        }
    }

    /**
     * Builds the map from the stems a mask enables (cf2_hintmap_build).
     *
     * @param {object} blues Zones from InitBlues.
     * @param {Array<object>} stems Horizontal stems with their used positions.
     * @param {Uint8Array|null} mask Mask bits (horizontal stems first), or null for all stems.
     * @param {boolean} initialMap Whether this is the initial map: captured stems only.
     */
    Build(blues, stems, mask, initialMap)
    {
        if (!initialMap && !this.initialMap.isValid) this.initialMap.Build(blues, stems, null, true);

        this.edges = [];
        const enabled = stems.map((_, i) => !mask || (mask[i >> 3] & (0x80 >> (i & 7))) !== 0);

        // 1. Synthetic em box edges first.
        if (blues.doEmBoxHints)
        {
            this.InsertHint({ ...blues.emBoxBottomEdge }, ZeroEdge());
            this.InsertHint(ZeroEdge(), { ...blues.emBoxTopEdge });
        }

        // 2. Captured or already placed stems.
        for (let i = 0; i < stems.length; i++)
        {
            if (!enabled[i]) continue;
            const bottom = InitEdge(stems, i, this.scale, true);
            const top = InitEdge(stems, i, this.scale, false);
            if (IsLocked(bottom) || IsLocked(top) || CaptureBlues(blues, bottom, top))
            {
                this.InsertHint(bottom, top);
                enabled[i] = false;
            }
        }

        if (initialMap)
        {
            // 3a. Lock the baseline when no edge spans it.
            const edges = this.edges;
            if (edges.length === 0 || edges[0].csCoord > 0 || edges[edges.length - 1].csCoord < 0)
            {
                this.InsertHint({ flags: GHOST_BOTTOM | LOCKED | SYNTHETIC, csCoord: 0, dsCoord: 0, scale: this.scale, index: 0 }, ZeroEdge());
            }
        }
        else
        {
            // 3b. The remaining enabled stems.
            for (let i = 0; i < stems.length; i++)
            {
                if (enabled[i]) this.InsertHint(InitEdge(stems, i, this.scale, true), InitEdge(stems, i, this.scale, false));
            }
        }

        // 4. Pixel-align the unlocked edges.
        this.AdjustHints();

        // 5. Remember where each stem went, so later maps place it the same.
        if (!initialMap)
        {
            for (const edge of this.edges)
            {
                if (edge.flags & SYNTHETIC) continue;
                const stem = stems[edge.index];
                if (IsTop(edge)) stem.maxDS = edge.dsCoord;
                else stem.minDS = edge.dsCoord;
                stem.used = true;
            }
        }
        this.isValid = true;
    }
}

/**
 * Hints a CFF glyph at a pixel size, as FreeType's Adobe engine does with
 * FT_LOAD_DEFAULT: y follows the hint maps, x is only scaled, and the advance
 * is rounded to whole pixels (ftobjs.c, ft_glyphslot_grid_fit_metrics).
 *
 * Masks are replayed in path order. A cntrmask builds a map on the spot, only
 * to place and lock its stems for the maps after it (psintrp.c,
 * cf2_cmdCNTRMASK). A hintmask applies from the path command after it. Each
 * contour's start point, and a closing line that returns to it, use the map in
 * effect at the contour's moveto, as the engine's queued elements do
 * (pshints.c, cf2_glyphpath_pushPrevElem with `close`).
 *
 * @param {import("./readCff.js").CjsCffFont} cff The parsed CFF font.
 * @param {import("./readCharstring.js").CjsCffGlyph} glyph The glyph from readCharstring.
 * @param {CjsFreeTypeScales} scales The size's scales, from freetypeScales.
 * @param {Map<number, object>} [bluesCache] Blue zones by font DICT, reused across glyphs at this size.
 * @returns {CjsHintedGlyph} The hinted outline and advance.
 */
export function hintCffGlyph(cff, glyph, scales, bluesCache)
{
    const { path, hStems, vStems, hintMasks, counterMasks } = glyph;
    const { xScale, yScale } = scales;
    const advanceWidth = (MulFix(glyph.advanceWidth, scales.xScale26Dot6) + 32) >> 6;

    // 1. Blue zones for this glyph's font DICT.
    let blues = bluesCache ? bluesCache.get(glyph.fontDictIndex) : undefined;
    if (!blues)
    {
        blues = InitBlues(cff.fontDicts[glyph.fontDictIndex].private, yScale);
        if (bluesCache) bluesCache.set(glyph.fontDictIndex, blues);
    }

    // 2. Too many stems: the engine leaves the glyph unhinted.
    const hinted = hStems.length + vStems.length <= MAX_HINTS;
    const stems = hStems.map(stem => ({ min: ToFixed(stem.edge), max: ToFixed(stem.edge + stem.width), used: false, minDS: 0, maxDS: 0 }));
    const initialMap = new HintMap(yScale, null);
    let counterIndex = 0;
    let maskIndex = 0;
    let current = null;
    const MapFor = commandIndex =>
    {
        if (!hinted) return null;
        while (counterIndex < counterMasks.length && counterMasks[counterIndex].commandIndex <= commandIndex)
        {
            new HintMap(yScale, initialMap).Build(blues, stems, counterMasks[counterIndex++].mask, false);
        }
        let mask = null;
        let isNew = current === null;
        while (maskIndex < hintMasks.length && hintMasks[maskIndex].commandIndex <= commandIndex)
        {
            mask = hintMasks[maskIndex++].mask;
            isNew = true;
        }
        if (isNew)
        {
            current = new HintMap(yScale, initialMap);
            current.Build(blues, stems, mask, false);
        }
        return current;
    };

    // Device-space points in 16.16; they leave in 26.6, floored as FreeType's
    // outline builder shifts them.
    const X = x => MulFix(xScale, ToFixed(x));
    const Y = (map, y) => map ? map.Map(ToFixed(y)) : MulFix(ToFixed(y), yScale);
    const Pixels = v => Math.floor(v / 1024) / 64;

    // 3. Map the outline, contour by contour. Lines with no length in device
    // space are dropped, as the engine drops them (cf2_glyphpath_pushPrevElem).
    const out = [];
    let lastX = 0;
    let lastY = 0;
    let firstMap = null;
    let startX = 0;
    let startY = 0;
    for (let i = 0; i < path.length; i++)
    {
        const command = path[i];
        const map = MapFor(i);
        if (command.type === "M")
        {
            firstMap = map;
            startX = command.x;
            startY = command.y;
            lastX = X(command.x);
            lastY = Y(map, command.y);
            out.push({ type: "M", x: Pixels(lastX), y: Pixels(lastY) });
            continue;
        }

        const closes = (i + 1 === path.length || path[i + 1].type === "M") && command.x === startX && command.y === startY;
        const endX = X(command.x);
        const endY = closes && command.type === "L" ? Y(firstMap, command.y) : Y(map, command.y);
        if (command.type === "L")
        {
            if (endX === lastX && endY === lastY) continue;
            out.push({ type: "L", x: Pixels(endX), y: Pixels(endY) });
        }
        else
        {
            out.push({
                type: "C",
                x1: Pixels(X(command.x1)),
                y1: Pixels(Y(map, command.y1)),
                x2: Pixels(X(command.x2)),
                y2: Pixels(Y(map, command.y2)),
                x: Pixels(endX),
                y: Pixels(endY)
            });
        }
        lastX = endX;
        lastY = endY;
    }
    return { path: out, advanceWidth };
}

CjsSchema.meta.define("HintMap")(HintMap);
