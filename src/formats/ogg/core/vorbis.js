import { imdct, vorbisWindowSlope } from "./imdct.js";

/**
 * Pure-JS Ogg Vorbis PCM decoder.
 *
 * Implements Vorbis I decode: setup-header codebooks (huffman + VQ), floor
 * type 1 with the spec's exact integer line rendering, residue types 0/1/2,
 * square-polar channel de-coupling, IMDCT, and windowed center-aligned
 * overlap-add with final granule trimming. Behavior follows the Vorbis I
 * specification with stb_vorbis (public domain) consulted as a reference;
 * floor type 0 streams are rejected (never produced by modern encoders).
 */

const NO_CODE = 255;
const FAST_BITS = 10;
const FAST_SIZE = 1 << FAST_BITS;

/**
 * The floor1 amplitude table from the Vorbis I specification
 * (inverse_db_table); indexed by the integer floor curve value.
 */
const INVERSE_DB_TABLE = new Float32Array([
    1.0649863e-07, 1.1341951e-07, 1.2079015e-07, 1.2863978e-07,
    1.3699951e-07, 1.4590251e-07, 1.5538408e-07, 1.6548181e-07,
    1.7623575e-07, 1.8768855e-07, 1.9988561e-07, 2.1287530e-07,
    2.2670913e-07, 2.4144197e-07, 2.5713223e-07, 2.7384213e-07,
    2.9163793e-07, 3.1059021e-07, 3.3077411e-07, 3.5226968e-07,
    3.7516214e-07, 3.9954229e-07, 4.2550680e-07, 4.5315863e-07,
    4.8260743e-07, 5.1396998e-07, 5.4737065e-07, 5.8294187e-07,
    6.2082472e-07, 6.6116941e-07, 7.0413592e-07, 7.4989464e-07,
    7.9862701e-07, 8.5052630e-07, 9.0579828e-07, 9.6466216e-07,
    1.0273513e-06, 1.0941144e-06, 1.1652161e-06, 1.2409384e-06,
    1.3215816e-06, 1.4074654e-06, 1.4989305e-06, 1.5963394e-06,
    1.7000785e-06, 1.8105592e-06, 1.9282195e-06, 2.0535261e-06,
    2.1869758e-06, 2.3290978e-06, 2.4804557e-06, 2.6416497e-06,
    2.8133190e-06, 2.9961443e-06, 3.1908506e-06, 3.3982101e-06,
    3.6190449e-06, 3.8542308e-06, 4.1047004e-06, 4.3714470e-06,
    4.6555282e-06, 4.9580707e-06, 5.2802740e-06, 5.6234160e-06,
    5.9888572e-06, 6.3780469e-06, 6.7925283e-06, 7.2339451e-06,
    7.7040476e-06, 8.2047000e-06, 8.7378876e-06, 9.3057248e-06,
    9.9104632e-06, 1.0554501e-05, 1.1240392e-05, 1.1970856e-05,
    1.2748789e-05, 1.3577278e-05, 1.4459606e-05, 1.5399272e-05,
    1.6400004e-05, 1.7465768e-05, 1.8600792e-05, 1.9809576e-05,
    2.1096914e-05, 2.2467911e-05, 2.3928002e-05, 2.5482978e-05,
    2.7139006e-05, 2.8902651e-05, 3.0780908e-05, 3.2781225e-05,
    3.4911534e-05, 3.7180282e-05, 3.9596466e-05, 4.2169667e-05,
    4.4910090e-05, 4.7828601e-05, 5.0936773e-05, 5.4246931e-05,
    5.7772202e-05, 6.1526565e-05, 6.5524908e-05, 6.9783085e-05,
    7.4317983e-05, 7.9147585e-05, 8.4291040e-05, 8.9768747e-05,
    9.5602426e-05, 0.00010181521, 0.00010843174, 0.00011547824,
    0.00012298267, 0.00013097477, 0.00013948625, 0.00014855085,
    0.00015820453, 0.00016848555, 0.00017943469, 0.00019109536,
    0.00020351382, 0.00021673929, 0.00023082423, 0.00024582449,
    0.00026179955, 0.00027881276, 0.00029693158, 0.00031622787,
    0.00033677814, 0.00035866388, 0.00038197188, 0.00040679456,
    0.00043323036, 0.00046138411, 0.00049136745, 0.00052329927,
    0.00055730621, 0.00059352311, 0.00063209358, 0.00067317058,
    0.00071691700, 0.00076350630, 0.00081312324, 0.00086596457,
    0.00092223983, 0.00098217216, 0.0010459992, 0.0011139742,
    0.0011863665, 0.0012634633, 0.0013455702, 0.0014330129,
    0.0015261382, 0.0016253153, 0.0017309374, 0.0018434235,
    0.0019632195, 0.0020908006, 0.0022266726, 0.0023713743,
    0.0025254795, 0.0026895994, 0.0028643847, 0.0030505286,
    0.0032487691, 0.0034598925, 0.0036847358, 0.0039241906,
    0.0041792066, 0.0044507950, 0.0047400328, 0.0050480668,
    0.0053761186, 0.0057254891, 0.0060975636, 0.0064938176,
    0.0069158225, 0.0073652516, 0.0078438871, 0.0083536271,
    0.0088964928, 0.0094746370, 0.0100903520, 0.0107460800,
    0.0114444210, 0.0121881440, 0.0129801980, 0.0138237250,
    0.0147220680, 0.0156787910, 0.0166976870, 0.0177827970,
    0.0189384230, 0.0201691490, 0.0214798540, 0.0228757350,
    0.0243623300, 0.0259455310, 0.0276316180, 0.0294272760,
    0.0313396260, 0.0333762520, 0.0355452280, 0.0378551570,
    0.0403151990, 0.0429351080, 0.0457252730, 0.0486967580,
    0.0518613480, 0.0552315910, 0.0588208500, 0.0626433610,
    0.0667142790, 0.0710497490, 0.0756669620, 0.0805842270,
    0.0858210440, 0.0913981790, 0.0973377470, 0.1036633000,
    0.1103999300, 0.1175743400, 0.1252149800, 0.1333521500,
    0.1420181300, 0.1512472700, 0.1610761700, 0.1715438000,
    0.1826916800, 0.1945640200, 0.2072078800, 0.2206734200,
    0.2350140200, 0.2502865600, 0.2665515900, 0.2838736100,
    0.3023213200, 0.3219678600, 0.3428911400, 0.3651741400,
    0.3889052100, 0.4141784700, 0.4410941200, 0.4697589000,
    0.5002864800, 0.5327979100, 0.5674221200, 0.6042964000,
    0.6435669900, 0.6853895900, 0.7299300700, 0.7773650400,
    0.8278826000, 0.8816830700, 0.9389798000, 1.0
]);

function decodeError(message)
{
    const error = new Error(`ogg: ${message}`);
    error.code = "CJS_FORMAT_PARSE_ERROR";
    return error;
}

function ilog(value)
{
    let result = 0;
    let v = value | 0;
    if (v < 0) return 0;
    while (v)
    {
        result++;
        v >>= 1;
    }
    return result;
}

function float32Unpack(x)
{
    const mantissa = x & 0x1fffff;
    const sign = x & 0x80000000;
    const exponent = (x & 0x7fe00000) >>> 21;
    const value = sign ? -mantissa : mantissa;
    return value * Math.pow(2, exponent - 788);
}

function lookup1Values(entries, dimensions)
{
    if (dimensions === 0) return 0;
    const bits = ilog(entries);
    let vals = entries >>> Math.floor(((bits - 1) * (dimensions - 1)) / dimensions);
    for (;;)
    {
        let acc = 1;
        let acc1 = 1;
        for (let i = 0; i < dimensions; i++)
        {
            acc *= vals;
            acc1 *= vals + 1;
        }
        if (acc <= entries && acc1 > entries) return vals;
        if (acc > entries) vals--;
        else vals++;
    }
}

/**
 * LSB-first bit reader over one Vorbis packet; reading past the end sets
 * `eop` instead of throwing (end-of-packet is a defined decode condition).
 */
class PacketReader
{
    constructor(bytes)
    {
        this.bytes = bytes;
        this.position = 0;
        this.bitBuffer = 0;
        this.bitsLeft = 0;
        this.eop = false;
    }

    readBits(count)
    {
        let value = 0;
        for (let i = 0; i < count; i++)
        {
            if (this.bitsLeft === 0)
            {
                if (this.position >= this.bytes.length)
                {
                    this.eop = true;
                    return -1;
                }
                this.bitBuffer = this.bytes[this.position++];
                this.bitsLeft = 8;
            }
            value |= (this.bitBuffer & 1) << i;
            this.bitBuffer >>= 1;
            this.bitsLeft--;
        }
        return value >>> 0;
    }
}

class Codebook
{
    constructor()
    {
        this.dimensions = 0;
        this.entries = 0;
        this.lookupType = 0;
        this.sequenceP = false;
        this.quantvals = 0;
        this.values = null;
        this.fastTable = null;
        this.treeNodes = null;
        this.maxLength = 0;
    }

    buildHuffman(lengths)
    {
        const available = new Uint32Array(33);
        this.fastTable = new Int32Array(FAST_SIZE).fill(-1);
        // flat binary trie: two child slots per node; negative = -(symbol+1)
        const nodes = [ 0, 0 ];

        let assigned = false;
        for (let symbol = 0; symbol < lengths.length; symbol++)
        {
            const length = lengths[symbol];
            if (length === NO_CODE) continue;
            if (length > this.maxLength) this.maxLength = length;

            let code;
            if (!assigned)
            {
                code = 0;
                assigned = true;
                for (let i = 1; i <= length; i++) available[i] = (1 << (32 - i)) >>> 0;
            }
            else
            {
                let z = length;
                while (z > 0 && !available[z]) z--;
                if (z === 0) throw decodeError("over-specified huffman codebook");
                code = available[z];
                available[z] = 0;
                if (z !== length)
                {
                    for (let y = length; y > z; y--)
                    {
                        available[y] = (code + (1 << (32 - y))) >>> 0;
                    }
                }
            }

            // reversed code: first stream bit in bit 0
            let reversed = 0;
            for (let i = 0; i < length; i++)
            {
                reversed |= ((code >>> (31 - i)) & 1) << i;
            }
            reversed >>>= 0;

            if (length <= FAST_BITS)
            {
                for (let z = reversed; z < FAST_SIZE; z += 1 << length)
                {
                    this.fastTable[z] = (symbol << 6) | length;
                }
            }
            else
            {
                let node = 0;
                for (let i = 0; i < length; i++)
                {
                    const bit = (reversed >>> i) & 1;
                    const slot = node * 2 + bit;
                    if (i === length - 1)
                    {
                        nodes[slot] = -(symbol + 1);
                    }
                    else
                    {
                        if (!nodes[slot])
                        {
                            nodes[slot] = nodes.length / 2;
                            nodes.push(0, 0);
                        }
                        node = nodes[slot];
                    }
                }
            }
        }

        this.treeNodes = nodes;
    }

    decode(reader)
    {
        // fast path: peek up to FAST_BITS without consuming
        let peek = 0;
        let peekBits = 0;
        const savedPosition = reader.position;
        const savedBuffer = reader.bitBuffer;
        const savedLeft = reader.bitsLeft;
        while (peekBits < FAST_BITS)
        {
            const bit = reader.readBits(1);
            if (bit < 0) break;
            peek |= bit << peekBits;
            peekBits++;
        }
        reader.position = savedPosition;
        reader.bitBuffer = savedBuffer;
        reader.bitsLeft = savedLeft;
        reader.eop = false;

        if (peekBits === FAST_BITS)
        {
            const hit = this.fastTable[peek];
            if (hit >= 0)
            {
                reader.readBits(hit & 63);
                return hit >> 6;
            }
        }
        else
        {
            // short remainder: try fast table over what's left
            const hit = this.fastTable[peek];
            if (hit >= 0 && (hit & 63) <= peekBits)
            {
                reader.readBits(hit & 63);
                return hit >> 6;
            }
        }

        // slow path: walk the trie bit by bit
        let node = 0;
        for (let i = 0; i < this.maxLength; i++)
        {
            const bit = reader.readBits(1);
            if (bit < 0) return -1;
            const value = this.treeNodes[node * 2 + bit];
            if (value < 0) return -value - 1;
            if (value === 0) throw decodeError("invalid huffman code in stream");
            node = value;
        }
        throw decodeError("huffman walk exceeded max code length");
    }

    vqValue(symbol, element)
    {
        if (this.lookupType === 1)
        {
            let index = symbol;
            for (let i = 0; i < element; i++) index = Math.floor(index / this.quantvals);
            return this.values[index % this.quantvals];
        }
        return this.values[symbol * this.dimensions + element];
    }
}

function parseCodebook(reader)
{
    const sync = reader.readBits(24);
    if (sync !== 0x564342) throw decodeError("invalid codebook sync pattern");

    const book = new Codebook();
    book.dimensions = reader.readBits(16);
    book.entries = reader.readBits(24);

    const lengths = new Uint8Array(book.entries);
    const ordered = reader.readBits(1);
    if (ordered)
    {
        let currentEntry = 0;
        let currentLength = reader.readBits(5) + 1;
        while (currentEntry < book.entries)
        {
            const number = reader.readBits(ilog(book.entries - currentEntry));
            if (reader.eop) throw decodeError("codebook lengths truncated");
            for (let i = 0; i < number; i++) lengths[currentEntry + i] = currentLength;
            currentEntry += number;
            currentLength++;
            if (currentEntry > book.entries) throw decodeError("codebook entry overflow");
        }
    }
    else
    {
        const sparse = reader.readBits(1);
        for (let i = 0; i < book.entries; i++)
        {
            const present = sparse ? reader.readBits(1) : 1;
            lengths[i] = present ? reader.readBits(5) + 1 : NO_CODE;
        }
    }
    if (reader.eop) throw decodeError("codebook lengths truncated");

    book.buildHuffman(lengths);

    book.lookupType = reader.readBits(4);
    if (book.lookupType > 2) throw decodeError(`invalid codebook lookup type ${book.lookupType}`);
    if (book.lookupType > 0)
    {
        const minimum = float32Unpack(reader.readBits(32));
        const delta = float32Unpack(reader.readBits(32));
        const valueBits = reader.readBits(4) + 1;
        book.sequenceP = reader.readBits(1) === 1;
        const count = book.lookupType === 1
            ? lookup1Values(book.entries, book.dimensions)
            : book.entries * book.dimensions;
        book.quantvals = book.lookupType === 1 ? count : 0;
        book.values = new Float32Array(count);
        for (let i = 0; i < count; i++)
        {
            book.values[i] = minimum + reader.readBits(valueBits) * delta;
        }
        if (reader.eop) throw decodeError("codebook lookup values truncated");
    }
    return book;
}

function parseFloor(reader, codebooks)
{
    const type = reader.readBits(16);
    if (type !== 1)
    {
        throw decodeError(`floor type ${type} is not supported (only floor 1)`);
    }

    const floor = {
        partitions: reader.readBits(5),
        partitionClassList: [],
        classDimensions: [],
        classSubclasses: [],
        classMasterbooks: [],
        subclassBooks: [],
        multiplier: 0,
        rangebits: 0,
        xList: [ 0, 0 ]
    };

    let maximumClass = -1;
    for (let i = 0; i < floor.partitions; i++)
    {
        const partitionClass = reader.readBits(4);
        floor.partitionClassList.push(partitionClass);
        if (partitionClass > maximumClass) maximumClass = partitionClass;
    }
    for (let i = 0; i <= maximumClass; i++)
    {
        floor.classDimensions.push(reader.readBits(3) + 1);
        const subclasses = reader.readBits(2);
        floor.classSubclasses.push(subclasses);
        floor.classMasterbooks.push(subclasses ? reader.readBits(8) : -1);
        const books = [];
        for (let j = 0; j < (1 << subclasses); j++)
        {
            books.push(reader.readBits(8) - 1);
        }
        floor.subclassBooks.push(books);
    }
    floor.multiplier = reader.readBits(2) + 1;
    floor.rangebits = reader.readBits(4);
    floor.xList = [ 0, 1 << floor.rangebits ];
    for (let i = 0; i < floor.partitions; i++)
    {
        for (let j = 0; j < floor.classDimensions[floor.partitionClassList[i]]; j++)
        {
            floor.xList.push(reader.readBits(floor.rangebits));
        }
    }
    if (reader.eop) throw decodeError("floor configuration truncated");
    for (const bookIndex of [ ...floor.classMasterbooks, ...floor.subclassBooks.flat() ])
    {
        if (bookIndex >= codebooks.length) throw decodeError("floor references invalid codebook");
    }

    // sorted render order over unique X positions, computed once
    floor.sortedIndex = floor.xList
        .map((x, index) => ({ x, index }))
        .sort((a, b) => a.x - b.x || a.index - b.index)
        .map((entry) => entry.index);

    // neighbor tables (over original ordering) computed once
    floor.lowNeighbors = [];
    floor.highNeighbors = [];
    for (let i = 2; i < floor.xList.length; i++)
    {
        let low = 0;
        let high = 1;
        for (let j = 0; j < i; j++)
        {
            if (floor.xList[j] < floor.xList[i] && floor.xList[j] >= floor.xList[low]) low = j;
            if (floor.xList[j] > floor.xList[i] && floor.xList[j] <= floor.xList[high]) high = j;
        }
        floor.lowNeighbors.push(low);
        floor.highNeighbors.push(high);
    }

    return floor;
}

function parseResidue(reader, codebooks)
{
    const type = reader.readBits(16);
    if (type > 2) throw decodeError(`invalid residue type ${type}`);
    const residue = {
        type,
        begin: reader.readBits(24),
        end: reader.readBits(24),
        partSize: reader.readBits(24) + 1,
        classifications: reader.readBits(6) + 1,
        classbook: reader.readBits(8),
        books: []
    };
    if (residue.classbook >= codebooks.length) throw decodeError("residue classbook out of range");

    const cascades = [];
    for (let i = 0; i < residue.classifications; i++)
    {
        const lowBits = reader.readBits(3);
        const flag = reader.readBits(1);
        const highBits = flag ? reader.readBits(5) : 0;
        cascades.push(highBits * 8 + lowBits);
    }
    for (let i = 0; i < residue.classifications; i++)
    {
        const passBooks = [];
        for (let pass = 0; pass < 8; pass++)
        {
            if (cascades[i] & (1 << pass))
            {
                const bookIndex = reader.readBits(8);
                if (bookIndex >= codebooks.length) throw decodeError("residue book out of range");
                if (codebooks[bookIndex].lookupType === 0) throw decodeError("residue book has no lookup values");
                passBooks.push(bookIndex);
            }
            else
            {
                passBooks.push(-1);
            }
        }
        residue.books.push(passBooks);
    }
    if (reader.eop) throw decodeError("residue configuration truncated");
    return residue;
}

function parseMapping(reader, channels, floorCount, residueCount)
{
    const type = reader.readBits(16);
    if (type !== 0) throw decodeError(`invalid mapping type ${type}`);
    const mapping = { submaps: 1, couplingSteps: [], mux: new Array(channels).fill(0), submapFloor: [], submapResidue: [] };

    if (reader.readBits(1)) mapping.submaps = reader.readBits(4) + 1;
    if (reader.readBits(1))
    {
        const steps = reader.readBits(8) + 1;
        const bits = ilog(channels - 1);
        for (let i = 0; i < steps; i++)
        {
            const magnitude = reader.readBits(bits);
            const angle = reader.readBits(bits);
            if (magnitude === angle || magnitude >= channels || angle >= channels)
            {
                throw decodeError("invalid channel coupling");
            }
            mapping.couplingSteps.push({ magnitude, angle });
        }
    }
    if (reader.readBits(2) !== 0) throw decodeError("mapping reserved bits nonzero");
    if (mapping.submaps > 1)
    {
        for (let i = 0; i < channels; i++)
        {
            mapping.mux[i] = reader.readBits(4);
            if (mapping.mux[i] >= mapping.submaps) throw decodeError("mapping mux out of range");
        }
    }
    for (let i = 0; i < mapping.submaps; i++)
    {
        reader.readBits(8);
        const floorIndex = reader.readBits(8);
        const residueIndex = reader.readBits(8);
        if (floorIndex >= floorCount || residueIndex >= residueCount)
        {
            throw decodeError("mapping references invalid floor or residue");
        }
        mapping.submapFloor.push(floorIndex);
        mapping.submapResidue.push(residueIndex);
    }
    return mapping;
}

const FLOOR1_RANGES = [ 256, 128, 86, 64 ];

function renderPoint(x0, y0, x1, y1, x)
{
    const dy = y1 - y0;
    const adx = x1 - x0;
    const err = Math.floor((Math.abs(dy) * (x - x0)) / adx);
    return dy < 0 ? y0 - err : y0 + err;
}

function decodeFloor1Posts(reader, floor, codebooks)
{
    if (reader.readBits(1) !== 1) return null;

    const range = FLOOR1_RANGES[floor.multiplier - 1];
    const posts = new Int32Array(floor.xList.length);
    const yBits = ilog(range - 1);
    posts[0] = reader.readBits(yBits);
    posts[1] = reader.readBits(yBits);

    let offset = 2;
    for (let i = 0; i < floor.partitions; i++)
    {
        const partitionClass = floor.partitionClassList[i];
        const cdim = floor.classDimensions[partitionClass];
        const cbits = floor.classSubclasses[partitionClass];
        const csub = (1 << cbits) - 1;
        let cval = 0;
        if (cbits)
        {
            cval = codebooks[floor.classMasterbooks[partitionClass]].decode(reader);
            if (cval < 0) return null;
        }
        for (let j = 0; j < cdim; j++)
        {
            const bookIndex = floor.subclassBooks[partitionClass][cval & csub];
            cval >>= cbits;
            if (bookIndex >= 0)
            {
                const value = codebooks[bookIndex].decode(reader);
                if (value < 0) return null;
                posts[offset + j] = value;
            }
            else
            {
                posts[offset + j] = 0;
            }
        }
        offset += cdim;
    }
    if (reader.eop) return null;
    return posts;
}

function computeFloor1Curve(floor, posts, n2, output)
{
    const range = FLOOR1_RANGES[floor.multiplier - 1];
    const count = floor.xList.length;
    const finalY = new Int32Array(count);
    const step2 = new Uint8Array(count);

    step2[0] = 1;
    step2[1] = 1;
    finalY[0] = posts[0];
    finalY[1] = posts[1];

    for (let i = 2; i < count; i++)
    {
        const low = floor.lowNeighbors[i - 2];
        const high = floor.highNeighbors[i - 2];
        const predicted = renderPoint(floor.xList[low], finalY[low], floor.xList[high], finalY[high], floor.xList[i]);
        const value = posts[i];
        const highroom = range - predicted;
        const lowroom = predicted;
        const room = (highroom < lowroom ? highroom : lowroom) * 2;
        if (value)
        {
            step2[low] = 1;
            step2[high] = 1;
            step2[i] = 1;
            if (value >= room)
            {
                finalY[i] = highroom > lowroom ? value - lowroom + predicted : predicted - value + highroom - 1;
            }
            else
            {
                finalY[i] = value & 1 ? predicted - ((value + 1) >> 1) : predicted + (value >> 1);
            }
        }
        else
        {
            step2[i] = 0;
            finalY[i] = predicted;
        }
    }

    output.fill(0);
    let lx = 0;
    let ly = finalY[floor.sortedIndex[0]] * floor.multiplier;
    for (const index of floor.sortedIndex)
    {
        if (!step2[index]) continue;
        const hx = floor.xList[index];
        const hy = finalY[index] * floor.multiplier;
        if (hx > lx) renderLine(lx, ly, hx, hy, output, n2);
        if (hx >= n2) return;
        lx = hx;
        ly = hy;
    }
    if (lx < n2)
    {
        for (let i = lx; i < n2; i++) output[i] = INVERSE_DB_TABLE[ly & 255];
    }
}

function renderLine(x0, y0, x1, y1, output, n)
{
    const dy = y1 - y0;
    const adx = x1 - x0;
    let ady = Math.abs(dy);
    const base = (dy / adx) | 0;
    const sy = dy < 0 ? base - 1 : base + 1;
    let x = x0;
    let y = y0;
    let err = 0;
    ady -= Math.abs(base) * adx;
    const limit = x1 > n ? n : x1;

    if (x < limit) output[x] = INVERSE_DB_TABLE[y & 255];
    for (x++; x < limit; x++)
    {
        err += ady;
        if (err >= adx)
        {
            err -= adx;
            y += sy;
        }
        else
        {
            y += base;
        }
        output[x] = INVERSE_DB_TABLE[y & 255];
    }
}

function decodeResidue(residue, reader, codebooks, buffers, doNotDecode, n2)
{
    const channelCount = buffers.length;
    const classbook = codebooks[residue.classbook];
    const classwords = classbook.dimensions;
    const actualSize = residue.type === 2 ? n2 * channelCount : n2;
    const limitBegin = Math.min(residue.begin, actualSize);
    const limitEnd = Math.min(residue.end, actualSize);
    const nRead = limitEnd - limitBegin;
    const partRead = Math.floor(nRead / residue.partSize);
    if (partRead <= 0) return;

    if (residue.type === 2 && channelCount > 1)
    {
        if (doNotDecode.every(Boolean)) return;
        const classifications = new Int32Array(partRead + classwords);
        for (let pass = 0; pass < 8; pass++)
        {
            let pcount = 0;
            while (pcount < partRead)
            {
                if (pass === 0)
                {
                    let symbol = classbook.decode(reader);
                    if (symbol < 0) return;
                    for (let i = classwords - 1; i >= 0; i--)
                    {
                        classifications[i + pcount] = symbol % residue.classifications;
                        symbol = Math.floor(symbol / residue.classifications);
                    }
                }
                for (let i = 0; i < classwords && pcount < partRead; i++, pcount++)
                {
                    const z = residue.begin + pcount * residue.partSize;
                    const bookIndex = residue.books[classifications[pcount]][pass];
                    if (bookIndex < 0) continue;
                    const book = codebooks[bookIndex];
                    let cInter = z % channelCount;
                    let pInter = Math.floor(z / channelCount);
                    let decoded = 0;
                    while (decoded < residue.partSize)
                    {
                        const symbol = book.decode(reader);
                        if (symbol < 0) return;
                        let last = 0;
                        for (let e = 0; e < book.dimensions; e++)
                        {
                            const value = book.vqValue(symbol, e) + (book.sequenceP ? last : 0);
                            if (book.sequenceP) last = value;
                            buffers[cInter][pInter] += value;
                            cInter++;
                            if (cInter === channelCount)
                            {
                                cInter = 0;
                                pInter++;
                            }
                        }
                        decoded += book.dimensions;
                    }
                }
            }
        }
        return;
    }

    const classifications = [];
    for (let j = 0; j < channelCount; j++) classifications.push(new Int32Array(partRead + classwords));

    for (let pass = 0; pass < 8; pass++)
    {
        let pcount = 0;
        while (pcount < partRead)
        {
            if (pass === 0)
            {
                for (let j = 0; j < channelCount; j++)
                {
                    if (doNotDecode[j]) continue;
                    let symbol = classbook.decode(reader);
                    if (symbol < 0) return;
                    for (let i = classwords - 1; i >= 0; i--)
                    {
                        classifications[j][i + pcount] = symbol % residue.classifications;
                        symbol = Math.floor(symbol / residue.classifications);
                    }
                }
            }
            for (let i = 0; i < classwords && pcount < partRead; i++, pcount++)
            {
                for (let j = 0; j < channelCount; j++)
                {
                    if (doNotDecode[j]) continue;
                    const bookIndex = residue.books[classifications[j][pcount]][pass];
                    if (bookIndex < 0) continue;
                    const book = codebooks[bookIndex];
                    const target = buffers[j];
                    const offset = residue.begin + pcount * residue.partSize;
                    if (residue.type === 0)
                    {
                        const step = Math.floor(residue.partSize / book.dimensions);
                        for (let k = 0; k < step; k++)
                        {
                            const symbol = book.decode(reader);
                            if (symbol < 0) return;
                            let last = 0;
                            for (let e = 0; e < book.dimensions; e++)
                            {
                                const value = book.vqValue(symbol, e) + (book.sequenceP ? last : 0);
                                if (book.sequenceP) last = value;
                                target[offset + k + e * step] += value;
                            }
                        }
                    }
                    else
                    {
                        let k = 0;
                        while (k < residue.partSize)
                        {
                            const symbol = book.decode(reader);
                            if (symbol < 0) return;
                            let last = 0;
                            for (let e = 0; e < book.dimensions; e++)
                            {
                                const value = book.vqValue(symbol, e) + (book.sequenceP ? last : 0);
                                if (book.sequenceP) last = value;
                                target[offset + k + e] += value;
                            }
                            k += book.dimensions;
                        }
                    }
                }
            }
        }
    }
}

function buildWindow(n, blockflag, prevFlag, nextFlag, blocksize0)
{
    const window = new Float32Array(n);
    const center = n >> 1;
    let leftStart = 0;
    let leftEnd = center;
    let leftN = center;
    let rightStart = center;
    let rightEnd = n;
    let rightN = center;
    if (blockflag && !prevFlag)
    {
        leftStart = (n >> 2) - (blocksize0 >> 2);
        leftEnd = (n >> 2) + (blocksize0 >> 2);
        leftN = blocksize0 >> 1;
    }
    if (blockflag && !nextFlag)
    {
        rightStart = n - (n >> 2) - (blocksize0 >> 2);
        rightEnd = n - (n >> 2) + (blocksize0 >> 2);
        rightN = blocksize0 >> 1;
    }
    const leftSlope = vorbisWindowSlope(leftN);
    const rightSlope = vorbisWindowSlope(rightN);
    for (let i = leftStart; i < leftEnd; i++) window[i] = leftSlope[i - leftStart];
    for (let i = leftEnd; i < rightStart; i++) window[i] = 1;
    for (let i = rightStart; i < rightEnd; i++) window[i] = rightSlope[rightN - 1 - (i - rightStart)];
    return window;
}

const windowVariantCache = new Map();

function getWindow(n, blockflag, prevFlag, nextFlag, blocksize0)
{
    const key = `${n}:${blockflag ? 1 : 0}${prevFlag ? 1 : 0}${nextFlag ? 1 : 0}:${blocksize0}`;
    let window = windowVariantCache.get(key);
    if (!window)
    {
        window = buildWindow(n, blockflag, prevFlag, nextFlag, blocksize0);
        windowVariantCache.set(key, window);
    }
    return window;
}

/**
 * Split an Ogg stream into the first logical stream's packets.
 *
 * @param {Uint8Array} bytes Ogg bytes (already CRC-validated by inspection).
 * @returns {object} `{ packets, lastGranule }` for the first stream.
 */
export function extractOggPackets(bytes)
{
    const packets = [];
    let pending = [];
    let serial = null;
    let lastGranule = 0;
    let offset = 0;

    while (offset + 27 <= bytes.length)
    {
        if (bytes[offset] !== 0x4f || bytes[offset + 1] !== 0x67 || bytes[offset + 2] !== 0x67 || bytes[offset + 3] !== 0x53)
        {
            throw decodeError(`invalid page at byte ${offset}`);
        }
        const headerType = bytes[offset + 5];
        let granule = 0;
        for (let i = 7; i >= 0; i--) granule = granule * 256 + bytes[offset + 6 + i];
        const pageSerial = (bytes[offset + 14] | (bytes[offset + 15] << 8) | (bytes[offset + 16] << 16) | (bytes[offset + 17] * 0x1000000)) >>> 0;
        const segmentCount = bytes[offset + 26];
        const tableOffset = offset + 27;
        let cursor = tableOffset + segmentCount;

        const isBos = (headerType & 0x02) !== 0;
        if (serial === null && isBos) serial = pageSerial;
        const ours = pageSerial === serial;

        for (let i = 0; i < segmentCount; i++)
        {
            const length = bytes[tableOffset + i];
            if (ours && length > 0) pending.push(bytes.subarray(cursor, cursor + length));
            cursor += length;
            if (length < 255 && ours)
            {
                packets.push(concatChunks(pending));
                pending = [];
            }
        }
        if (ours && granule !== 0xffffffffffffffff && Number.isSafeInteger(granule))
        {
            lastGranule = granule;
        }
        offset = cursor;
    }

    if (pending.length) packets.push(concatChunks(pending));
    return { packets, lastGranule };
}

function concatChunks(chunks)
{
    if (chunks.length === 1) return chunks[0];
    let total = 0;
    for (const chunk of chunks) total += chunk.length;
    const bytes = new Uint8Array(total);
    let cursor = 0;
    for (const chunk of chunks)
    {
        bytes.set(chunk, cursor);
        cursor += chunk.length;
    }
    return bytes;
}

function expectHeader(packet, type)
{
    if (packet.length < 7 || packet[0] !== type ||
        packet[1] !== 0x76 || packet[2] !== 0x6f || packet[3] !== 0x72 ||
        packet[4] !== 0x62 || packet[5] !== 0x69 || packet[6] !== 0x73)
    {
        throw decodeError(`missing vorbis header packet type ${type}`);
    }
    const reader = new PacketReader(packet);
    reader.readBits(8);
    for (let i = 0; i < 6; i++) reader.readBits(8);
    return reader;
}

function parseComments(packet)
{
    const reader = new PacketReader(packet);
    reader.readBits(8);
    for (let i = 0; i < 6; i++) reader.readBits(8);
    const readString = () =>
    {
        const length = reader.readBits(32);
        let text = "";
        for (let i = 0; i < length; i++) text += String.fromCharCode(reader.readBits(8));
        return text;
    };
    const vendor = readString();
    const count = reader.readBits(32);
    const comments = [];
    for (let i = 0; i < count && !reader.eop; i++) comments.push(readString());

    let loop = null;
    let loopStart = null;
    let loopEnd = null;
    for (const comment of comments)
    {
        const match = /^(loopstart|loopend)=(\d+)$/iu.exec(comment);
        if (!match) continue;
        if (match[1].toLowerCase() === "loopstart") loopStart = Number(match[2]);
        else loopEnd = Number(match[2]);
    }
    if (loopStart !== null && loopEnd !== null) loop = { start: loopStart, end: loopEnd };
    return { vendor, comments, loop };
}

/**
 * Decode an Ogg Vorbis stream to planar float PCM.
 *
 * @param {Uint8Array} bytes Complete Ogg Vorbis stream bytes.
 * @returns {object} `{ channels, sampleRate, sampleCount, channelData, vendor, comments, loop, packetCount }`.
 */
export function decodeVorbis(bytes)
{
    const { packets, lastGranule } = extractOggPackets(bytes);
    if (packets.length < 3) throw decodeError("stream has no audio packets");

    // identification header
    const identReader = expectHeader(packets[0], 1);
    if (identReader.readBits(32) !== 0) throw decodeError("unsupported vorbis version");
    const channels = identReader.readBits(8);
    const sampleRate = identReader.readBits(32);
    identReader.readBits(32);
    identReader.readBits(32);
    identReader.readBits(32);
    const blocksize0 = 1 << identReader.readBits(4);
    const blocksize1 = 1 << identReader.readBits(4);
    if (!channels || !sampleRate) throw decodeError("invalid identification header");
    if (blocksize0 > blocksize1 || blocksize0 < 64 || blocksize1 > 8192)
    {
        throw decodeError("invalid blocksizes");
    }

    const { vendor, comments, loop } = parseComments(packets[1]);

    // setup header
    const setup = expectHeader(packets[2], 5);
    const codebooks = [];
    const codebookCount = setup.readBits(8) + 1;
    for (let i = 0; i < codebookCount; i++) codebooks.push(parseCodebook(setup));

    const timeCount = setup.readBits(6) + 1;
    for (let i = 0; i < timeCount; i++)
    {
        if (setup.readBits(16) !== 0) throw decodeError("nonzero time-domain transform");
    }

    const floors = [];
    const floorCount = setup.readBits(6) + 1;
    for (let i = 0; i < floorCount; i++) floors.push(parseFloor(setup, codebooks));

    const residues = [];
    const residueCount = setup.readBits(6) + 1;
    for (let i = 0; i < residueCount; i++) residues.push(parseResidue(setup, codebooks));

    const mappings = [];
    const mappingCount = setup.readBits(6) + 1;
    for (let i = 0; i < mappingCount; i++) mappings.push(parseMapping(setup, channels, floorCount, residueCount));

    const modes = [];
    const modeCount = setup.readBits(6) + 1;
    for (let i = 0; i < modeCount; i++)
    {
        const blockflag = setup.readBits(1) === 1;
        if (setup.readBits(16) !== 0 || setup.readBits(16) !== 0)
        {
            throw decodeError("nonzero mode window/transform type");
        }
        const mapping = setup.readBits(8);
        if (mapping >= mappingCount) throw decodeError("mode references invalid mapping");
        modes.push({ blockflag, mapping });
    }
    if (setup.readBits(1) !== 1) throw decodeError("missing setup framing bit");
    const modeBits = ilog(modeCount - 1);

    // synthesis state
    const n1 = blocksize1;
    const spectrum = [];
    const floorCurves = [];
    const imdctOut = [];
    for (let j = 0; j < channels; j++)
    {
        spectrum.push(new Float32Array(n1 >> 1));
        floorCurves.push(new Float32Array(n1 >> 1));
        imdctOut.push(new Float32Array(n1));
    }
    const zeroChannel = new Array(channels).fill(false);
    const floorPosts = new Array(channels).fill(null);
    const tails = [];
    for (let j = 0; j < channels; j++) tails.push(new Float32Array(n1 >> 1));
    let prevN = 0;

    const outputChunks = [];
    let totalSamples = 0;
    let packetCount = 0;

    for (let p = 3; p < packets.length; p++)
    {
        const reader = new PacketReader(packets[p]);
        if (reader.readBits(1) !== 0) continue;
        const modeNumber = reader.readBits(modeBits);
        if (modeNumber < 0 || modeNumber >= modeCount) continue;
        const mode = modes[modeNumber];
        const mapping = mappings[mode.mapping];
        const n = mode.blockflag ? blocksize1 : blocksize0;
        const n2 = n >> 1;

        let prevFlag = false;
        let nextFlag = false;
        if (mode.blockflag)
        {
            prevFlag = reader.readBits(1) === 1;
            nextFlag = reader.readBits(1) === 1;
        }

        // floors
        for (let j = 0; j < channels; j++)
        {
            const floor = floors[mapping.submapFloor[mapping.mux[j]]];
            floorPosts[j] = decodeFloor1Posts(reader, floor, codebooks);
            zeroChannel[j] = floorPosts[j] === null;
        }

        // coupling keeps partners decoding together
        const reallyZero = zeroChannel.slice();
        for (const step of mapping.couplingSteps)
        {
            if (!zeroChannel[step.magnitude] || !zeroChannel[step.angle])
            {
                zeroChannel[step.magnitude] = false;
                zeroChannel[step.angle] = false;
            }
        }

        // residues per submap
        for (let j = 0; j < channels; j++) spectrum[j].fill(0);
        for (let s = 0; s < mapping.submaps; s++)
        {
            const submapChannels = [];
            const doNotDecode = [];
            for (let j = 0; j < channels; j++)
            {
                if (mapping.mux[j] !== s) continue;
                submapChannels.push(spectrum[j]);
                doNotDecode.push(zeroChannel[j]);
            }
            if (!submapChannels.length) continue;
            decodeResidue(residues[mapping.submapResidue[s]], reader, codebooks, submapChannels, doNotDecode, n2);
        }

        // inverse coupling (reverse order)
        for (let i = mapping.couplingSteps.length - 1; i >= 0; i--)
        {
            const { magnitude, angle } = mapping.couplingSteps[i];
            const magnitudeVector = spectrum[magnitude];
            const angleVector = spectrum[angle];
            for (let k = 0; k < n2; k++)
            {
                const m = magnitudeVector[k];
                const a = angleVector[k];
                let newM;
                let newA;
                if (m > 0)
                {
                    if (a > 0) { newM = m; newA = m - a; }
                    else { newA = m; newM = m + a; }
                }
                else if (a > 0)
                {
                    newM = m;
                    newA = m + a;
                }
                else
                {
                    newA = m;
                    newM = m - a;
                }
                magnitudeVector[k] = newM;
                angleVector[k] = newA;
            }
        }

        // floor curve multiply + IMDCT + window
        const window = getWindow(n, mode.blockflag, prevFlag, nextFlag, blocksize0);
        for (let j = 0; j < channels; j++)
        {
            const out = imdctOut[j];
            if (reallyZero[j])
            {
                out.fill(0, 0, n);
                continue;
            }
            const floor = floors[mapping.submapFloor[mapping.mux[j]]];
            computeFloor1Curve(floor, floorPosts[j], n2, floorCurves[j]);
            const curve = floorCurves[j];
            const spec = spectrum[j];
            for (let k = 0; k < n2; k++) spec[k] *= curve[k];
            imdct(spec.subarray(0, n2), out, n);
            for (let k = 0; k < n; k++) out[k] *= window[k];
        }

        // center-aligned overlap-add
        if (prevN)
        {
            const outCount = ((prevN + n) >> 2);
            const curStart = (prevN >> 2) - (n >> 2);
            const chunk = [];
            for (let j = 0; j < channels; j++)
            {
                const samples = new Float32Array(outCount);
                const tail = tails[j];
                const cur = imdctOut[j];
                for (let i = 0; i < outCount; i++)
                {
                    let value = i < (prevN >> 1) ? tail[i] : 0;
                    const curIndex = i - curStart;
                    if (curIndex >= 0) value += cur[curIndex];
                    samples[i] = value;
                }
                chunk.push(samples);
            }
            outputChunks.push(chunk);
            totalSamples += outCount;
        }
        for (let j = 0; j < channels; j++)
        {
            tails[j].set(imdctOut[j].subarray(n >> 1, n));
        }
        prevN = n;
        packetCount++;
    }

    // assemble planar output, trimmed to the stream's final granule
    const finalCount = lastGranule && lastGranule < totalSamples ? lastGranule : totalSamples;
    const channelData = [];
    for (let j = 0; j < channels; j++) channelData.push(new Float32Array(finalCount));
    let cursor = 0;
    for (const chunk of outputChunks)
    {
        const copyCount = Math.min(chunk[0].length, finalCount - cursor);
        if (copyCount <= 0) break;
        for (let j = 0; j < channels; j++)
        {
            channelData[j].set(chunk[j].subarray(0, copyCount), cursor);
        }
        cursor += copyCount;
    }

    return {
        channels,
        sampleRate,
        sampleCount: finalCount,
        channelData,
        vendor,
        comments,
        loop,
        packetCount,
        declaredGranule: lastGranule
    };
}
