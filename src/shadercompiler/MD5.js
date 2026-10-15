import { CjsSchema, blue, meta } from "#schema";
// Source: trinity/shadercompiler/md5.h
// Source: trinity/shadercompiler/md5.cpp
//
// Carbon's MD5, which hashes an effect's sources and defines into the
// container header (ShaderCompiler.cpp:827; ModifiedTime.cpp:143-164).
//
// ALTERED SOURCE VERSION. This is a JavaScript translation of Carbon's
// modified copy of Stephan Brumme's MD5; it is not the original software.
// Original: md5.cpp, Copyright (c) 2014,2015 Stephan Brumme. All rights
// reserved. md5.h, Copyright (c) 2014 Stephan Brumme. All rights reserved.
// http://create.stephan-brumme.com/disclaimer.html
// Used under the author's zlib-like license, reproduced in
// THIRD-PARTY-NOTICES.md.

/** Per-round left rotations. */
const SHIFTS = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
];

/** floor(abs(sin(i + 1)) * 2^32). */
const CONSTANTS = Array.from({ length: 64 }, (unused, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0);

/**
 * Carbon's `MD5`: an incremental MD5 over bytes, read as hex.
 */
export class MD5
{
    /** Carbon's `m_numBytes`: bytes hashed so far. */
    _numBytes = 0;

    /** Carbon's `m_buffer`: bytes not yet in a full block. */
    _buffer = new Uint8Array(MD5.blockSize);

    /** Carbon's `m_bufferSize`. */
    _bufferSize = 0;

    /** Carbon's `m_hash`. */
    _hash = new Uint32Array(4);

    /** Initializes an empty hash with the standard MD5 state. */
    constructor()
    {
        this.reset();
    }

    /**
     * Carbon's `MD5::reset`: starts a new hash.
     */
    reset()
    {
        this._numBytes = 0;
        this._bufferSize = 0;
        this._hash.set([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]);
    }

    /**
     * Carbon's `MD5::add`: hashes more bytes.
     *
     * @param {Uint8Array} data The bytes.
     */
    add(data)
    {
        let current = 0;
        let numBytes = data.length;
        if (this._bufferSize > 0)
        {
            while (numBytes > 0 && this._bufferSize < MD5.blockSize)
            {
                this._buffer[this._bufferSize++] = data[current++];
                numBytes--;
            }
        }
        if (this._bufferSize === MD5.blockSize)
        {
            this._processBlock(this._buffer, 0);
            this._numBytes += MD5.blockSize;
            this._bufferSize = 0;
        }
        if (numBytes === 0)
        {
            return;
        }
        while (numBytes >= MD5.blockSize)
        {
            this._processBlock(data, current);
            current += MD5.blockSize;
            this._numBytes += MD5.blockSize;
            numBytes -= MD5.blockSize;
        }
        while (numBytes > 0)
        {
            this._buffer[this._bufferSize++] = data[current++];
            numBytes--;
        }
    }

    /**
     * Carbon's `MD5::getHash()`: the hash so far as 32 lower-case hex
     * characters. Hashing can continue afterwards, as in Carbon.
     *
     * @returns {string} The hash.
     */
    getHash()
    {
        let result = "";
        for (const byte of this.getHash__Bytes())
        {
            result += byte.toString(16).padStart(2, "0");
        }
        return result;
    }

    /**
     * Carbon's `MD5::getHash( unsigned char[HashBytes] )`: the hash so far as
     * bytes, without changing the running state.
     *
     * @returns {Uint8Array} 16 bytes.
     */
    getHash__Bytes()
    {
        const saved = this._hash.slice();
        const savedBuffer = this._buffer.slice();
        const savedSize = this._bufferSize;
        this._processBuffer();
        const out = new Uint8Array(MD5.hashBytes);
        const view = new DataView(out.buffer);
        for (let i = 0; i < 4; ++i)
        {
            view.setUint32(i * 4, this._hash[i], true);
        }
        this._hash.set(saved);
        this._buffer.set(savedBuffer);
        this._bufferSize = savedSize;
        return out;
    }

    /**
     * Carbon's private `processBuffer`: pads the buffered bytes with 0x80,
     * zeros and the bit length, and hashes the final block or two.
     */
    _processBuffer()
    {
        const paddedLength = this._bufferSize * 8 + 1 + 64;
        const blocks = paddedLength > MD5.blockSize * 8 ? 2 : 1;
        const extra = new Uint8Array(blocks * MD5.blockSize);
        extra.set(this._buffer.subarray(0, this._bufferSize));
        extra[this._bufferSize] = 0x80;
        const bits = (this._numBytes + this._bufferSize) * 8;
        const view = new DataView(extra.buffer);
        view.setUint32(extra.length - 8, bits >>> 0, true);
        view.setUint32(extra.length - 4, Math.floor(bits / 4294967296), true);
        for (let block = 0; block < blocks; ++block)
        {
            this._processBlock(extra, block * MD5.blockSize);
        }
    }

    /**
     * Carbon's private `processBlock`: one 64-byte block.
     *
     * @param {Uint8Array} data The bytes.
     * @param {number} offset Where the block starts.
     */
    _processBlock(data, offset)
    {
        const words = new Uint32Array(16);
        for (let i = 0; i < 16; ++i)
        {
            const at = offset + i * 4;
            words[i] = (data[at] | (data[at + 1] << 8) | (data[at + 2] << 16) | (data[at + 3] << 24)) >>> 0;
        }
        let a = this._hash[0];
        let b = this._hash[1];
        let c = this._hash[2];
        let d = this._hash[3];
        for (let i = 0; i < 64; ++i)
        {
            let f;
            let g;
            if (i < 16)
            {
                f = (b & c) | (~b & d);
                g = i;
            }
            else if (i < 32)
            {
                f = (d & b) | (~d & c);
                g = (5 * i + 1) % 16;
            }
            else if (i < 48)
            {
                f = b ^ c ^ d;
                g = (3 * i + 5) % 16;
            }
            else
            {
                f = c ^ (b | ~d);
                g = (7 * i) % 16;
            }
            const sum = (a + f + CONSTANTS[i] + words[g]) >>> 0;
            a = d;
            d = c;
            c = b;
            b = (b + ((sum << SHIFTS[i]) | (sum >>> (32 - SHIFTS[i])))) >>> 0;
        }
        this._hash[0] = (this._hash[0] + a) >>> 0;
        this._hash[1] = (this._hash[1] + b) >>> 0;
        this._hash[2] = (this._hash[2] + c) >>> 0;
        this._hash[3] = (this._hash[3] + d) >>> 0;
    }

    /** Carbon's `BlockSize`: 64 bytes. */
    static blockSize = 64;

    /** Carbon's `HashBytes`: 16 bytes. */
    static hashBytes = 16;
}

CjsSchema.blue.define(MD5, {
    className: "MD5",
    methods: {
        reset: [blue.method],
        add: [blue.method],
        getHash: [blue.method],
        getHash__Bytes: [meta.renamed("getHash")],
        _processBuffer: [meta.renamed("processBuffer")],
        _processBlock: [meta.renamed("processBlock")]
    }
});
