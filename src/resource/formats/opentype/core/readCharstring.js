// The Type 2 charstring interpreter, from Adobe Technical Note #5177 ("The
// Type 2 Charstring Format", 2000). Runs one glyph's charstring, following
// local and global subroutines, and records what a rasteriser and a hinter
// need: the outline, the advance width, the declared stems, and where each
// hintmask changes the active stems along the outline.
//
// Coordinates stay in font units, y up. Contours are closed implicitly, as the
// format defines: each moveto and the final endchar close the open contour.

// One-byte operators (TN #5177 appendix A).
const OP_HSTEM = 1;
const OP_VSTEM = 3;
const OP_VMOVETO = 4;
const OP_RLINETO = 5;
const OP_HLINETO = 6;
const OP_VLINETO = 7;
const OP_RRCURVETO = 8;
const OP_CALLSUBR = 10;
const OP_RETURN = 11;
const OP_ESCAPE = 12;
const OP_ENDCHAR = 14;
const OP_HSTEMHM = 18;
const OP_HINTMASK = 19;
const OP_CNTRMASK = 20;
const OP_RMOVETO = 21;
const OP_HMOVETO = 22;
const OP_VSTEMHM = 23;
const OP_RCURVELINE = 24;
const OP_RLINECURVE = 25;
const OP_VVCURVETO = 26;
const OP_HHCURVETO = 27;
const OP_SHORTINT = 28;
const OP_CALLGSUBR = 29;
const OP_VHCURVETO = 30;
const OP_HVCURVETO = 31;

// Two-byte operators, after OP_ESCAPE.
const OP2_DOTSECTION = 0;
const OP2_AND = 3;
const OP2_OR = 4;
const OP2_NOT = 5;
const OP2_ABS = 9;
const OP2_ADD = 10;
const OP2_SUB = 11;
const OP2_DIV = 12;
const OP2_NEG = 14;
const OP2_EQ = 15;
const OP2_DROP = 18;
const OP2_PUT = 20;
const OP2_GET = 21;
const OP2_IFELSE = 22;
const OP2_RANDOM = 23;
const OP2_MUL = 24;
const OP2_SQRT = 26;
const OP2_DUP = 27;
const OP2_EXCH = 28;
const OP2_INDEX = 29;
const OP2_ROLL = 30;
const OP2_HFLEX = 34;
const OP2_FLEX = 35;
const OP2_HFLEX1 = 36;
const OP2_FLEX1 = 37;

/** Implementation limits (TN #5177 appendix B). */
const MAX_STACK = 48;
// TN #5177 gives 10; FreeType's CFF engine allows 16 (CF2_MAX_SUBR, psfont.h:53), and Carbon draws through FreeType.
const MAX_SUBR_DEPTH = 16;
const TRANSIENT_SIZE = 32;

/**
 * One outline command, in font units. "M" starts a contour, "L" a line to
 * (x, y), "C" a cubic through (x1, y1) and (x2, y2) to (x, y).
 *
 * @typedef {object} CjsCffPathCommand
 * @property {"M"|"L"|"C"} type Command type.
 * @property {number} x End point x.
 * @property {number} y End point y.
 * @property {number} [x1] First control point x ("C" only).
 * @property {number} [y1] First control point y ("C" only).
 * @property {number} [x2] Second control point x ("C" only).
 * @property {number} [y2] Second control point y ("C" only).
 */

/**
 * A declared stem: `edge` is the left or bottom edge and `width` the distance
 * to the other edge. Ghost stems (a single edge) have width -20 (top edge at
 * edge + width) or -21 (bottom edge at edge), as TN #5177 defines.
 *
 * @typedef {object} CjsCffStem
 * @property {number} edge Position of the first edge.
 * @property {number} width Signed width.
 */

/**
 * A hintmask: from the path command at `commandIndex` onwards, the stems whose
 * bits are set are active. Bits number the horizontal stems first, then the
 * vertical stems, most significant bit first.
 *
 * @typedef {object} CjsCffHintMask
 * @property {number} commandIndex Index of the first path command the mask applies to.
 * @property {Uint8Array} mask One bit per stem.
 */

/**
 * One glyph as its charstring draws it.
 *
 * @typedef {object} CjsCffGlyph
 * @property {number} advanceWidth Advance width in font units.
 * @property {Array<CjsCffPathCommand>} path Outline commands.
 * @property {Array<CjsCffStem>} hStems Horizontal stems (edges are y values).
 * @property {Array<CjsCffStem>} vStems Vertical stems (edges are x values).
 * @property {Array<CjsCffHintMask>} hintMasks Hintmask changes in path order; empty means every stem is active throughout.
 * @property {Array<CjsCffHintMask>} counterMasks Counter control groups (cntrmask), in path order: the stems of each group are placed together before later hint maps.
 * @property {number} fontDictIndex Index into the font's `fontDicts` of the Private DICT this glyph uses.
 */

/**
 * Runs a glyph's charstring.
 *
 * @param {import("./readCff.js").CjsCffFont} cff The parsed CFF font.
 * @param {number} glyphId Glyph ID.
 * @param {string} [source="CFF font"] Source label used in error messages.
 * @returns {CjsCffGlyph} The glyph.
 * @throws {RangeError} For a glyph ID outside the font.
 * @throws {Error} For a malformed charstring, or the deprecated seac form of endchar.
 */
export function readCharstring(cff, glyphId, source = "CFF font")
{
    if (!Number.isInteger(glyphId) || glyphId < 0 || glyphId >= cff.charStrings.length)
    {
        throw new RangeError(`${source}: glyph ${glyphId} is outside 0..${cff.charStrings.length - 1}.`);
    }

    const label = `${source}: glyph ${glyphId}`;
    const fontDictIndex = cff.fdSelect ? cff.fdSelect[glyphId] : 0;
    const { localSubrs, private: { defaultWidthX, nominalWidthX } } = cff.fontDicts[fontDictIndex];
    const globalSubrs = cff.globalSubrs;
    const globalBias = subroutineBias(globalSubrs.length);
    const localBias = subroutineBias(localSubrs.length);

    const stack = [];
    const transient = new Array(TRANSIENT_SIZE).fill(0);
    const path = [];
    const hStems = [];
    const vStems = [];
    const hintMasks = [];
    const counterMasks = [];
    let advanceWidth = defaultWidthX;
    let haveWidth = false;
    let x = 0;
    let y = 0;
    let depth = 0;
    let ended = false;

    // The first stack-clearing operator may carry the width as an extra
    // leading operand; the caller says whether the operand count reveals it
    // (an odd count for stems, an excess over the fixed count for movetos).
    const TakeWidth = hasExtra =>
    {
        if (haveWidth) return;
        haveWidth = true;
        if (hasExtra) advanceWidth = nominalWidthX + stack.shift();
    };

    const Stems = list =>
    {
        TakeWidth(stack.length % 2 === 1);
        let position = 0;
        for (let i = 0; i + 1 < stack.length; i += 2)
        {
            const edge = position + stack[i];
            const width = stack[i + 1];
            list.push({ edge, width });
            position = edge + width;
        }
        stack.length = 0;
    };

    const MoveTo = (dx, dy) =>
    {
        x += dx;
        y += dy;
        path.push({ type: "M", x, y });
    };

    const LineTo = (dx, dy) =>
    {
        x += dx;
        y += dy;
        path.push({ type: "L", x, y });
    };

    const CurveTo = (dx1, dy1, dx2, dy2, dx3, dy3) =>
    {
        const x1 = x + dx1;
        const y1 = y + dy1;
        const x2 = x1 + dx2;
        const y2 = y1 + dy2;
        x = x2 + dx3;
        y = y2 + dy3;
        path.push({ type: "C", x1, y1, x2, y2, x, y });
    };

    const Pop = () =>
    {
        if (stack.length === 0) throw new Error(`${label}: stack underflow.`);
        return stack.pop();
    };

    const Run = charstring =>
    {
        if (++depth > MAX_SUBR_DEPTH) throw new Error(`${label}: subroutines nest deeper than ${MAX_SUBR_DEPTH}.`);
        let i = 0;
        while (i < charstring.length && !ended)
        {
            const b0 = charstring[i++];

            // 1. Operands.
            if (b0 >= 32 || b0 === OP_SHORTINT)
            {
                let value;
                if (b0 === OP_SHORTINT)
                {
                    value = ((charstring[i] << 8) | charstring[i + 1]) << 16 >> 16;
                    i += 2;
                }
                else if (b0 <= 246)
                {
                    value = b0 - 139;
                }
                else if (b0 <= 250)
                {
                    value = (b0 - 247) * 256 + charstring[i++] + 108;
                }
                else if (b0 <= 254)
                {
                    value = -(b0 - 251) * 256 - charstring[i++] - 108;
                }
                else
                {
                    value = ((charstring[i] << 24) | (charstring[i + 1] << 16) | (charstring[i + 2] << 8) | charstring[i + 3]) / 65536;
                    i += 4;
                }
                if (stack.length >= MAX_STACK) throw new Error(`${label}: argument stack overflow.`);
                stack.push(value);
                continue;
            }

            // 2. Operators.
            const n = stack.length;
            switch (b0)
            {
                case OP_HSTEM:
                case OP_HSTEMHM:
                    Stems(hStems);
                    break;

                case OP_VSTEM:
                case OP_VSTEMHM:
                    Stems(vStems);
                    break;

                case OP_HINTMASK:
                case OP_CNTRMASK:
                {
                    // Operands left on the stack are an implied vstemhm.
                    if (n > 0) Stems(vStems);
                    else TakeWidth(false);
                    const byteCount = (hStems.length + vStems.length + 7) >> 3;
                    if (i + byteCount > charstring.length) throw new Error(`${label}: hint mask is truncated.`);
                    const mask = charstring.slice(i, i + byteCount);
                    i += byteCount;
                    if (b0 === OP_HINTMASK) hintMasks.push({ commandIndex: path.length, mask });
                    else counterMasks.push({ commandIndex: path.length, mask });
                    break;
                }

                case OP_RMOVETO:
                    TakeWidth(n > 2);
                    MoveTo(stack[stack.length - 2], stack[stack.length - 1]);
                    stack.length = 0;
                    break;

                case OP_HMOVETO:
                    TakeWidth(n > 1);
                    MoveTo(stack[stack.length - 1], 0);
                    stack.length = 0;
                    break;

                case OP_VMOVETO:
                    TakeWidth(n > 1);
                    MoveTo(0, stack[stack.length - 1]);
                    stack.length = 0;
                    break;

                case OP_RLINETO:
                    for (let k = 0; k + 1 < n; k += 2) LineTo(stack[k], stack[k + 1]);
                    stack.length = 0;
                    break;

                case OP_HLINETO:
                case OP_VLINETO:
                {
                    let horizontal = b0 === OP_HLINETO;
                    for (let k = 0; k < n; k++)
                    {
                        if (horizontal) LineTo(stack[k], 0);
                        else LineTo(0, stack[k]);
                        horizontal = !horizontal;
                    }
                    stack.length = 0;
                    break;
                }

                case OP_RRCURVETO:
                    for (let k = 0; k + 5 < n; k += 6) CurveTo(stack[k], stack[k + 1], stack[k + 2], stack[k + 3], stack[k + 4], stack[k + 5]);
                    stack.length = 0;
                    break;

                case OP_RCURVELINE:
                {
                    let k = 0;
                    for (; k + 6 < n - 1; k += 6) CurveTo(stack[k], stack[k + 1], stack[k + 2], stack[k + 3], stack[k + 4], stack[k + 5]);
                    LineTo(stack[k], stack[k + 1]);
                    stack.length = 0;
                    break;
                }

                case OP_RLINECURVE:
                {
                    let k = 0;
                    for (; k + 6 < n; k += 2) LineTo(stack[k], stack[k + 1]);
                    CurveTo(stack[k], stack[k + 1], stack[k + 2], stack[k + 3], stack[k + 4], stack[k + 5]);
                    stack.length = 0;
                    break;
                }

                case OP_VVCURVETO:
                {
                    let k = 0;
                    let dx1 = 0;
                    if (n % 2 === 1) dx1 = stack[k++];
                    for (; k + 3 < n; k += 4)
                    {
                        CurveTo(dx1, stack[k], stack[k + 1], stack[k + 2], 0, stack[k + 3]);
                        dx1 = 0;
                    }
                    stack.length = 0;
                    break;
                }

                case OP_HHCURVETO:
                {
                    let k = 0;
                    let dy1 = 0;
                    if (n % 2 === 1) dy1 = stack[k++];
                    for (; k + 3 < n; k += 4)
                    {
                        CurveTo(stack[k], dy1, stack[k + 1], stack[k + 2], stack[k + 3], 0);
                        dy1 = 0;
                    }
                    stack.length = 0;
                    break;
                }

                case OP_HVCURVETO:
                case OP_VHCURVETO:
                {
                    // Curves alternate between starting horizontal and
                    // starting vertical; a fifth operand on the last one
                    // gives its final, otherwise zero, cross-axis delta.
                    let horizontal = b0 === OP_HVCURVETO;
                    for (let k = 0; k + 3 < n; k += 4)
                    {
                        const last = n - k === 5 ? stack[k + 4] : 0;
                        if (horizontal) CurveTo(stack[k], 0, stack[k + 1], stack[k + 2], last, stack[k + 3]);
                        else CurveTo(0, stack[k], stack[k + 1], stack[k + 2], stack[k + 3], last);
                        horizontal = !horizontal;
                    }
                    stack.length = 0;
                    break;
                }

                case OP_CALLSUBR:
                case OP_CALLGSUBR:
                {
                    const subrs = b0 === OP_CALLSUBR ? localSubrs : globalSubrs;
                    const index = Pop() + (b0 === OP_CALLSUBR ? localBias : globalBias);
                    if (index < 0 || index >= subrs.length) throw new Error(`${label}: subroutine ${index} is outside 0..${subrs.length - 1}.`);
                    Run(subrs[index]);
                    break;
                }

                case OP_RETURN:
                    depth--;
                    return;

                case OP_ENDCHAR:
                    if (n === 4 || n === 5) throw new Error(`${label}: the deprecated seac form of endchar is not supported.`);
                    TakeWidth(n > 0);
                    stack.length = 0;
                    ended = true;
                    break;

                case OP_ESCAPE:
                    i = Escape(charstring, i);
                    break;

                default:
                    throw new Error(`${label}: reserved operator ${b0}.`);
            }
        }
        depth--;
    };

    const Escape = (charstring, i) =>
    {
        const b1 = charstring[i++];
        const s = stack;
        switch (b1)
        {
            case OP2_DOTSECTION:
                s.length = 0;
                break;

            case OP2_AND: { const b = Pop(); const a = Pop(); s.push(a && b ? 1 : 0); break; }
            case OP2_OR: { const b = Pop(); const a = Pop(); s.push(a || b ? 1 : 0); break; }
            case OP2_NOT: s.push(Pop() ? 0 : 1); break;
            case OP2_ABS: s.push(Math.abs(Pop())); break;
            case OP2_ADD: { const b = Pop(); const a = Pop(); s.push(a + b); break; }
            case OP2_SUB: { const b = Pop(); const a = Pop(); s.push(a - b); break; }
            case OP2_DIV: { const b = Pop(); const a = Pop(); s.push(a / b); break; }
            case OP2_NEG: s.push(-Pop()); break;
            case OP2_EQ: { const b = Pop(); const a = Pop(); s.push(a === b ? 1 : 0); break; }
            case OP2_DROP: Pop(); break;
            case OP2_PUT: { const index = Pop(); transient[index] = Pop(); break; }
            case OP2_GET: s.push(transient[Pop()] ?? 0); break;
            case OP2_IFELSE:
            {
                const v2 = Pop();
                const v1 = Pop();
                const s2 = Pop();
                const s1 = Pop();
                s.push(v1 <= v2 ? s1 : s2);
                break;
            }
            // TN #5177: a random number in (0, 1]; no client glyph is known to use it.
            case OP2_RANDOM: s.push(1 - Math.random()); break;
            case OP2_MUL: { const b = Pop(); const a = Pop(); s.push(a * b); break; }
            case OP2_SQRT: s.push(Math.sqrt(Pop())); break;
            case OP2_DUP: { const a = Pop(); s.push(a, a); break; }
            case OP2_EXCH: { const b = Pop(); const a = Pop(); s.push(b, a); break; }
            case OP2_INDEX:
            {
                let index = Pop();
                if (index < 0) index = 0;
                s.push(s[s.length - 1 - index] ?? 0);
                break;
            }
            case OP2_ROLL:
            {
                const shift = Pop();
                const count = Pop();
                if (count > 0 && count <= s.length)
                {
                    const items = s.splice(s.length - count, count);
                    const by = ((shift % count) + count) % count;
                    s.push(...items.slice(count - by), ...items.slice(0, count - by));
                }
                break;
            }

            case OP2_HFLEX:
            {
                const startY = y;
                CurveTo(s[0], 0, s[1], s[2], s[3], 0);
                CurveTo(s[4], 0, s[5], startY - y, s[6], 0);
                s.length = 0;
                break;
            }

            case OP2_FLEX:
                // s[12] is the flex depth: below it a flex may be drawn as a
                // straight line. Outlines are kept as curves here.
                CurveTo(s[0], s[1], s[2], s[3], s[4], s[5]);
                CurveTo(s[6], s[7], s[8], s[9], s[10], s[11]);
                s.length = 0;
                break;

            case OP2_HFLEX1:
            {
                const startY = y;
                CurveTo(s[0], s[1], s[2], s[3], s[4], 0);
                CurveTo(s[5], 0, s[6], s[7], s[8], startY - (y + s[7]));
                s.length = 0;
                break;
            }

            case OP2_FLEX1:
            {
                const startX = x;
                const startY = y;
                let dx = 0;
                let dy = 0;
                for (let k = 0; k < 10; k += 2)
                {
                    dx += s[k];
                    dy += s[k + 1];
                }
                CurveTo(s[0], s[1], s[2], s[3], s[4], s[5]);
                const horizontal = Math.abs(dx) > Math.abs(dy);
                const x2 = x + s[6] + s[8];
                const y2 = y + s[7] + s[9];
                CurveTo(s[6], s[7], s[8], s[9], horizontal ? s[10] : startX - x2, horizontal ? startY - y2 : s[10]);
                s.length = 0;
                break;
            }

            default:
                throw new Error(`${label}: reserved operator 12 ${b1}.`);
        }
        return i;
    };

    Run(cff.charStrings[glyphId]);
    if (!ended) throw new Error(`${label}: charstring has no endchar.`);

    return { advanceWidth, path, hStems, vStems, hintMasks, counterMasks, fontDictIndex };
}

/**
 * The subroutine number bias (TN #5177 section 4.7).
 *
 * @param {number} count Number of subroutines in the INDEX.
 * @returns {number} The bias added to a callsubr or callgsubr operand.
 */
export function subroutineBias(count)
{
    if (count < 1240) return 107;
    if (count < 33900) return 1131;
    return 32768;
}
