// Wwise PTADPCM (RIFF format tag 0x8311, "Platinum ADPCM") decoder.
//
// Original CarbonEngineJS implementation of the publicly documented algorithm
// (community documentation of the codec: vgmstream/wwiser); no code copied.
// Verified against EVE Online media (turret/artillery SFX banks).
//
// Frame layout, per channel (frames externally interleaved channel-by-channel;
// frame size = fmt blockAlign / channels, typically 0x24 bytes):
//   0x00 int16 LE  hist2 (second-newest history sample, emitted first)
//   0x02 int16 LE  hist1 (newest history sample, emitted second)
//   0x04 u8        step table index (clamped to 12)
//   0x05...        4-bit codes, low nibble first
// Samples per frame = 2 + (frameSize - 5) * 2.
// Per code: sample = clamp16(step + 2*hist1 - hist2), then the index moves to
// the row's nextIndex - {step, nextIndex} from PTADPCM_TABLE[index][code].

// [index][code] -> [stepDelta, nextIndex]. Rows 12-15 are zero: the header
// index is clamped to 12 and no transition targets a row above 11.
const PTADPCM_TABLE = [
    [ [ -14, 2 ], [ -10, 2 ], [ -7, 1 ], [ -5, 1 ], [ -3, 0 ], [ -2, 0 ], [ -1, 0 ], [ 0, 0 ],
      [ 0, 0 ], [ 1, 0 ], [ 2, 0 ], [ 3, 0 ], [ 5, 1 ], [ 7, 1 ], [ 10, 2 ], [ 14, 2 ] ],
    [ [ -28, 3 ], [ -20, 3 ], [ -14, 2 ], [ -10, 2 ], [ -7, 1 ], [ -5, 1 ], [ -3, 1 ], [ -1, 0 ],
      [ 1, 0 ], [ 3, 1 ], [ 5, 1 ], [ 7, 1 ], [ 10, 2 ], [ 14, 2 ], [ 20, 3 ], [ 28, 3 ] ],
    [ [ -56, 4 ], [ -40, 4 ], [ -28, 3 ], [ -20, 3 ], [ -14, 2 ], [ -10, 2 ], [ -6, 2 ], [ -2, 1 ],
      [ 2, 1 ], [ 6, 2 ], [ 10, 2 ], [ 14, 2 ], [ 20, 3 ], [ 28, 3 ], [ 40, 4 ], [ 56, 4 ] ],
    [ [ -112, 5 ], [ -80, 5 ], [ -56, 4 ], [ -40, 4 ], [ -28, 3 ], [ -20, 3 ], [ -12, 3 ], [ -4, 2 ],
      [ 4, 2 ], [ 12, 3 ], [ 20, 3 ], [ 28, 3 ], [ 40, 4 ], [ 56, 4 ], [ 80, 5 ], [ 112, 5 ] ],
    [ [ -224, 6 ], [ -160, 6 ], [ -112, 5 ], [ -80, 5 ], [ -56, 4 ], [ -40, 4 ], [ -24, 4 ], [ -8, 3 ],
      [ 8, 3 ], [ 24, 4 ], [ 40, 4 ], [ 56, 4 ], [ 80, 5 ], [ 112, 5 ], [ 160, 6 ], [ 224, 6 ] ],
    [ [ -448, 7 ], [ -320, 7 ], [ -224, 6 ], [ -160, 6 ], [ -112, 5 ], [ -80, 5 ], [ -48, 5 ], [ -16, 4 ],
      [ 16, 4 ], [ 48, 5 ], [ 80, 5 ], [ 112, 5 ], [ 160, 6 ], [ 224, 6 ], [ 320, 7 ], [ 448, 7 ] ],
    [ [ -896, 8 ], [ -640, 8 ], [ -448, 7 ], [ -320, 7 ], [ -224, 6 ], [ -160, 6 ], [ -96, 6 ], [ -32, 5 ],
      [ 32, 5 ], [ 96, 6 ], [ 160, 6 ], [ 224, 6 ], [ 320, 7 ], [ 448, 7 ], [ 640, 8 ], [ 896, 8 ] ],
    [ [ -1792, 9 ], [ -1280, 9 ], [ -896, 8 ], [ -640, 8 ], [ -448, 7 ], [ -320, 7 ], [ -192, 7 ], [ -64, 6 ],
      [ 64, 6 ], [ 192, 7 ], [ 320, 7 ], [ 448, 7 ], [ 640, 8 ], [ 896, 8 ], [ 1280, 9 ], [ 1792, 9 ] ],
    [ [ -3584, 10 ], [ -2560, 10 ], [ -1792, 9 ], [ -1280, 9 ], [ -896, 8 ], [ -640, 8 ], [ -384, 8 ], [ -128, 7 ],
      [ 128, 7 ], [ 384, 8 ], [ 640, 8 ], [ 896, 8 ], [ 1280, 9 ], [ 1792, 9 ], [ 2560, 10 ], [ 3584, 10 ] ],
    [ [ -7168, 11 ], [ -5120, 11 ], [ -3584, 10 ], [ -2560, 10 ], [ -1792, 9 ], [ -1280, 9 ], [ -768, 9 ], [ -256, 8 ],
      [ 256, 8 ], [ 768, 9 ], [ 1280, 9 ], [ 1792, 9 ], [ 2560, 10 ], [ 3584, 10 ], [ 5120, 11 ], [ 7168, 11 ] ],
    [ [ -14336, 11 ], [ -10240, 11 ], [ -7168, 11 ], [ -5120, 11 ], [ -3584, 10 ], [ -2560, 10 ], [ -1536, 10 ], [ -512, 9 ],
      [ 512, 9 ], [ 1536, 10 ], [ 2560, 10 ], [ 3584, 10 ], [ 5120, 11 ], [ 7168, 11 ], [ 10240, 11 ], [ 14336, 11 ] ],
    [ [ -28672, 11 ], [ -20480, 11 ], [ -14336, 11 ], [ -10240, 11 ], [ -7168, 11 ], [ -5120, 11 ], [ -3072, 11 ], [ -1024, 10 ],
      [ 1024, 10 ], [ 3072, 11 ], [ 5120, 11 ], [ 7168, 11 ], [ 10240, 11 ], [ 14336, 11 ], [ 20480, 11 ], [ 28672, 11 ] ],
    [ [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ],
      [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ] ],
    [ [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ],
      [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ] ],
    [ [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ],
      [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ] ],
    [ [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ],
      [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ] ]
];

/**
 * Decode PTADPCM audio data to per-channel float32 samples.
 *
 * @param {Uint8Array} bytes Whole wem bytes.
 * @param {object} metadata `inspectWEM` result for those bytes (fmt + data chunk facts).
 * @returns {{channelData: Float32Array[], sampleCount: number, sampleRate: number, channels: number}} AudioBuffer-ready samples.
 */
export function decodePtadpcm(bytes, metadata)
{
    const channels = metadata.channels;
    const frameSize = channels > 0 ? Math.floor(metadata.blockAlign / channels) : 0;
    if (channels < 1 || frameSize < 6 || metadata.blockAlign !== frameSize * channels)
    {
        throw new Error(`wem: unsupported PTADPCM layout (channels ${channels}, blockAlign ${metadata.blockAlign})`);
    }

    const samplesPerFrame = 2 + (frameSize - 5) * 2;
    const frameGroups = Math.floor(metadata.dataBytes / metadata.blockAlign);
    const sampleCount = frameGroups * samplesPerFrame;
    const channelData = [];
    for (let channel = 0; channel < channels; channel++)
    {
        channelData.push(new Float32Array(sampleCount));
    }

    for (let group = 0; group < frameGroups; group++)
    {
        for (let channel = 0; channel < channels; channel++)
        {
            const frame = metadata.dataOffset + (group * channels + channel) * frameSize;
            const output = channelData[channel];
            let at = group * samplesPerFrame;

            let hist2 = readS16(bytes, frame);
            let hist1 = readS16(bytes, frame + 2);
            let index = Math.min(bytes[frame + 4], 12);

            output[at++] = hist2 / 32768;
            output[at++] = hist1 / 32768;

            for (let i = 0; i < samplesPerFrame - 2; i++)
            {
                const byte = bytes[frame + 5 + (i >> 1)];
                const code = (i & 1) === 0 ? byte & 0x0f : byte >> 4;
                const [ step, nextIndex ] = PTADPCM_TABLE[index][code];
                let sample = step + 2 * hist1 - hist2;
                if (sample > 32767) sample = 32767;
                else if (sample < -32768) sample = -32768;
                index = nextIndex;
                hist2 = hist1;
                hist1 = sample;
                output[at++] = sample / 32768;
            }
        }
    }

    return { channelData, sampleCount, sampleRate: metadata.sampleRate, channels };
}

function readS16(bytes, offset)
{
    const value = bytes[offset] | (bytes[offset + 1] << 8);
    return value >= 0x8000 ? value - 0x10000 : value;
}
