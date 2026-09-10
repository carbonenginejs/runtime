# BitKnit2 section format

Status: Evolving  
Scope: `@carbonenginejs/runtime` — the GR2 reader under `src/resource/formats/gr2`  
Audience: Implementers and maintainers  
Summary: Normative decoding specification for Granny .gr2 section-compression format 4 (BitKnit2), stated as format facts and validated byte-exact against the EVE .gr2 corpus.

This page specifies the BitKnit2 bitstream as interoperability facts so a
decoder can be implemented from this document alone. It was derived by
analyzing the behavior of the package's working decoder and is validated by a
differential corpus harness (536 real streams, EVE build 3444265, byte-exact).
BitKnit is a RAD Game Tools codec; this document records the on-disk format
only and contains no RAD source material.

## Container framing (.gr2 sections)

A `.gr2` file's section directory entries are 44 bytes each. Entries with
`format = 4` are BitKnit2:

- the section payload occupies `dataSize` bytes at `dataOffset` and
  decompresses to exactly `expandedSize` bytes;
- when the section's pointer-fixup count is non-zero, its fixup block at
  `pFixOff` begins with one little-endian `uint32` compressed length,
  followed by that many bytes of a second, independent BitKnit2 stream that
  decompresses to exactly `pointerFixupCount * 12` bytes.

## Stream model

A BitKnit2 stream is a sequence of little-endian `uint16` words consumed
strictly in order. Reading past the final word is a fatal error
("source underflow").

- Word 0 of the stream MUST be the magic value `0x75B1`.
- Output is produced in **quanta** of 65,536 bytes: quantum *k* covers output
  offsets `[k * 0x10000, min(expandedSize, (k + 1) * 0x10000))`.
- An `expandedSize` of zero produces an empty output without consuming any
  words beyond none at all (the magic is not read).

### Decoder state and its lifetime

| State | Initial value | Lifetime |
|---|---|---|
| Adaptive models (all nine) | see "Adaptive model" | persists across quanta |
| Recent-offset cache (8 entries + order) | entries all `1`, order `0x76543210` | persists across quanta |
| Literal delta distance `deltaOffset` | `1` | persists across quanta |
| Entropy states `A`, `B` | re-initialized per coded quantum | per quantum |

Model adaptation, cache promotion, and the literal delta distance therefore
carry forward from one quantum to the next; only the two entropy states are
re-seeded at each coded quantum's start.

## Quantum kinds

At the start of every quantum, the decoder peeks at the next word:

**Raw quantum** — if the next word is `0`, consume it. Then copy
`L = min(remainingWords * 2, quantumRemaining)` bytes directly from the word
stream (interpreted as bytes in stream order) to the output, where
`remainingWords` counts words after the consumed zero and `quantumRemaining`
is the quantum's uncovered byte count. Advance the word index by
`floor(L / 2)`: when `L` is odd, the final byte is the low byte of a word
whose high byte is NOT consumed — the next quantum begins at that same word.

**Coded quantum** — otherwise the quantum is entropy-coded with two
interleaved 32-bit range states, described next.

## Entropy state initialization (per coded quantum)

Let `w0, w1, …` be the next words consumed in order.

1. `merged = w0 * 0x10000 + w1` (note: the FIRST word supplies the high
   16 bits).
2. `split = merged & 15`; then `merged = floor(merged / 16)`.
3. If `merged < 0x10000`: `merged = merged * 0x10000 + w2` (consume another
   word).
4. `A = split == 0 ? merged : floor(merged / 2^split)`.
5. If `A < 0x10000`: `A = A * 0x10000 + wNext` (consume another word).
6. `B = ((merged mod 0x10000) * 0x10000 + wNext) mod 2^(16+split)
   + 2^(16+split)` (consume another word).

All state arithmetic is unsigned; states range over `[0x10000, 2^32)`.
Implementations in environments with signed 32-bit shift semantics must use
floor division by powers of two for values `≥ 2^31`.

## Entropy operations

Both operations end by **swapping** the two states, so `A` and `B` strictly
alternate as the active state.

**Renormalize** (used inside both operations): if the active state is below
`0x10000`, multiply it by `0x10000` and add the next word.

**popBits(n)** — read `n` raw bits:

```text
value  = A & (2^n - 1)
A      = floor(A / 2^n)
renormalize A;  swap(A, B)
```

**popSymbol(model)** — decode one adaptive-model symbol with 15-bit
frequency precision (`TOTAL = 0x8000`):

```text
code = A & (TOTAL - 1)
sym  = smallest s such that code < cum[s + 1]        (see lookup note)
A    = floor(A / TOTAL) * (cum[sym + 1] - cum[sym]) + code - cum[sym]
renormalize A;  observe sym (see adaptation);  swap(A, B)
```

The reference search starts from a 1024-entry lookup table indexed by
`code >> 5` (a lower bound on the symbol) and scans upward; any search
producing the same smallest `s` is conformant.

## Adaptive model

A model has `V` symbols of which the last `M` are "minimum-probability"
symbols, and maintains a cumulative table `cum[0 .. V]` with
`cum[0] = 0`-anchored semantics below and `cum[V] = TOTAL = 0x8000`.

**Initialization** (`E = V - M` equiprobable symbols):

```text
cum[i] = floor((TOTAL - M) * i / E)        for 0 <= i < E
cum[i] = TOTAL - V + i                     for E <= i <= V
```

Per-symbol accumulators `acc[0 .. V-1]` start at `1`, and an observation
counter starts at `0`. Two increments are fixed at construction:

```text
inc     = floor((TOTAL - V) / 1024)
lastInc = 1 + TOTAL - V - inc * 1024
```

**observe(sym)** — called once per decoded symbol, after the state update:

1. `acc[sym] += inc`.
2. Increment the counter modulo 1024. When it wraps to zero:
   - `acc[sym] += lastInc`;
   - rebuild cumulative sums: with `run = 0`, for `i = 1 .. V`:
     `run += acc[i-1]`, then `cum[i] += (run - cum[i]) >> 1`
     (arithmetic shift; all values non-negative), then `acc[i-1] = 1`;
   - rebuild the lookup table: `lookup[k] = smallest s such that
     (k * 32) < cum[s + 1]`, for `k = 0 .. 1023`.

**Model inventory** (nine models total, all created at stream start):

| Model | Count | V | M | Selector |
|---|---|---|---|---|
| command | 4 | 300 | 36 | `outputOffset & 3` |
| cache-reference | 4 | 40 | 0 | `outputOffset & 3` |
| copy-offset exponent | 1 | 21 | 0 | — |

## Decoding a coded quantum

If the quantum begins at output offset `0` (start of the whole output), the
first output byte is `popBits(8)`; this happens at most once per stream and
only when the first quantum is coded.

Then, until the quantum's end offset is reached:

1. `command = popSymbol(command model for phase = offset & 3)`.
2. **Literal** — if `command < 256`:
   `output[offset] = (command + output[offset - deltaOffset]) & 0xFF`;
   advance `offset` by 1. (`deltaOffset` starts at 1 and is replaced by every
   match's distance; a literal is a byte delta against the byte one
   last-match-distance behind.)
3. **Match** — otherwise:
   - length: if `command < 288`: `copyLength = command - 254`
     (values 2 … 33); else `n = command - 287` and
     `copyLength = 2^n + popBits(n) + 32`.
   - distance: `ref = popSymbol(cache-reference model for the same phase)`.
     - `ref < 8`: `copyOffset` = recent-offset cache hit at rank `ref`
       (see cache semantics).
     - `ref >= 8`: `n = popSymbol(copy-offset exponent model)`;
       `extra = popBits(n & 15)`; if `n >= 16`, `extra = extra * 0x10000 +
       nextWord` (one raw word, appended as the LOW 16 bits);
       `copyOffset = 32 * 2^n + extra * 32 + ref - 39`; insert `copyOffset`
       into the recent-offset cache. (`ref` ranges 8 … 39, so `ref - 39`
       ranges −31 … 0. The exponent model bounds `n` at 20, but
       `extra * 32` alone can exceed 32-bit range when a raw word is
       appended, so the distance computation must use floating-point or
       64-bit arithmetic, never 32-bit shifts.)
   - set `deltaOffset = copyOffset`; copy `copyLength` bytes byte-by-byte
     ascending from `offset - copyOffset` (self-overlap is meaningful and
     must replicate); a source position before output offset 0 is a fatal
     error. Matches may reach back across quantum boundaries.

**End-of-quantum check** — after the quantum's last byte, at least one of
the two entropy states MUST equal exactly `0x10000`; otherwise the stream is
corrupt.

## Recent-offset cache

Eight `uint32` entries, all initialized to `1`, plus a 32-bit order word
initialized to `0x76543210`. The order word packs eight 4-bit slot indices;
the nibble at bit position `4r` is the slot holding rank `r` (rank 0 = most
recent).

**Hit at rank `r`** — read the slot nibble `s` at rank `r`; the result is
`entries[s]`. Then promote: ranks `0 … r-1` shift up one nibble and slot `s`
becomes rank 0. Equivalently, with `mask = (r == 7) ? 0xFFFFFFFF :
(16 << 4r) - 1`: `order = (order & ~mask) | ((order * 16 + s) & mask)`.

**Insert (new distance `d`)** — the slot at rank 7 receives the VALUE of the
slot at rank 6, then the slot at rank 6 receives `d`. The order word does not
change on insert.

## Error conditions

A conformant decoder rejects: a first word other than `0x75B1`; word-stream
exhaustion during any read; a match source before output offset 0; and a
coded quantum ending with neither entropy state equal to `0x10000`.

## Validation

The normative oracle is the differential corpus harness: byte-exact equality
over every BitKnit2 section payload and pointer-fixup stream extracted from
the EVE `.gr2` corpus, plus synthetic raw-quantum streams. A decoder is not
conformant until it matches the corpus byte-for-byte.
