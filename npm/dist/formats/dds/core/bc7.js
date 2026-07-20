// BC7 is defined as a little-endian 128-bit block format. The mode and
// partition constants below are the fixed tables from the Khronos Data Format
// Specification, section 20.1. The decoder itself is CarbonEngineJS code.

const MODE = Object.freeze([{
  subsets: 3,
  partitionBits: 4,
  rotationBits: 0,
  selectionBits: 0,
  colorBits: 4,
  alphaBits: 0,
  endpointPBits: 1,
  sharedPBits: 0,
  indexBits: 3,
  secondaryIndexBits: 0
}, {
  subsets: 2,
  partitionBits: 6,
  rotationBits: 0,
  selectionBits: 0,
  colorBits: 6,
  alphaBits: 0,
  endpointPBits: 0,
  sharedPBits: 1,
  indexBits: 3,
  secondaryIndexBits: 0
}, {
  subsets: 3,
  partitionBits: 6,
  rotationBits: 0,
  selectionBits: 0,
  colorBits: 5,
  alphaBits: 0,
  endpointPBits: 0,
  sharedPBits: 0,
  indexBits: 2,
  secondaryIndexBits: 0
}, {
  subsets: 2,
  partitionBits: 6,
  rotationBits: 0,
  selectionBits: 0,
  colorBits: 7,
  alphaBits: 0,
  endpointPBits: 1,
  sharedPBits: 0,
  indexBits: 2,
  secondaryIndexBits: 0
}, {
  subsets: 1,
  partitionBits: 0,
  rotationBits: 2,
  selectionBits: 1,
  colorBits: 5,
  alphaBits: 6,
  endpointPBits: 0,
  sharedPBits: 0,
  indexBits: 2,
  secondaryIndexBits: 3
}, {
  subsets: 1,
  partitionBits: 0,
  rotationBits: 2,
  selectionBits: 0,
  colorBits: 7,
  alphaBits: 8,
  endpointPBits: 0,
  sharedPBits: 0,
  indexBits: 2,
  secondaryIndexBits: 2
}, {
  subsets: 1,
  partitionBits: 0,
  rotationBits: 0,
  selectionBits: 0,
  colorBits: 7,
  alphaBits: 7,
  endpointPBits: 1,
  sharedPBits: 0,
  indexBits: 4,
  secondaryIndexBits: 0
}, {
  subsets: 2,
  partitionBits: 6,
  rotationBits: 0,
  selectionBits: 0,
  colorBits: 5,
  alphaBits: 5,
  endpointPBits: 1,
  sharedPBits: 0,
  indexBits: 2,
  secondaryIndexBits: 0
}]);
const WEIGHTS = Object.freeze({
  2: new Uint8Array([0, 21, 43, 64]),
  3: new Uint8Array([0, 9, 18, 27, 37, 46, 55, 64]),
  4: new Uint8Array([0, 4, 9, 13, 17, 21, 26, 30, 34, 38, 43, 47, 51, 55, 60, 64])
});

// One bit per texel, in y-major order.
const PARTITIONS_2 = new Uint16Array([0xcccc, 0x8888, 0xeeee, 0xecc8, 0xc880, 0xfeec, 0xfec8, 0xec80, 0xc800, 0xffec, 0xfe80, 0xe800, 0xffe8, 0xff00, 0xfff0, 0xf000, 0xf710, 0x008e, 0x7100, 0x08ce, 0x008c, 0x7310, 0x3100, 0x8cce, 0x088c, 0x3110, 0x6666, 0x366c, 0x17e8, 0x0ff0, 0x718e, 0x399c, 0xaaaa, 0xf0f0, 0x5a5a, 0x33cc, 0x3c3c, 0x55aa, 0x9696, 0xa55a, 0x73ce, 0x13c8, 0x324c, 0x3bdc, 0x6996, 0xc33c, 0x9966, 0x0660, 0x0272, 0x04e4, 0x4e40, 0x2720, 0xc936, 0x936c, 0x39c6, 0x639c, 0x9336, 0x9cc6, 0x817e, 0xe718, 0xccf0, 0x0fcc, 0x7744, 0xee22]);

// Two bits per texel, in y-major order.
const PARTITIONS_3 = new Uint32Array([0xaa685050, 0x6a5a5040, 0x5a5a4200, 0x5450a0a8, 0xa5a50000, 0xa0a05050, 0x5555a0a0, 0x5a5a5050, 0xaa550000, 0xaa555500, 0xaaaa5500, 0x90909090, 0x94949494, 0xa4a4a4a4, 0xa9a59450, 0x2a0a4250, 0xa5945040, 0x0a425054, 0xa5a5a500, 0x55a0a0a0, 0xa8a85454, 0x6a6a4040, 0xa4a45000, 0x1a1a0500, 0x0050a4a4, 0xaaa59090, 0x14696914, 0x69691400, 0xa08585a0, 0xaa821414, 0x50a4a450, 0x6a5a0200, 0xa9a58000, 0x5090a0a8, 0xa8a09050, 0x24242424, 0x00aa5500, 0x24924924, 0x24499224, 0x50a50a50, 0x500aa550, 0xaaaa4444, 0x66660000, 0xa5a0a5a0, 0x50a050a0, 0x69286928, 0x44aaaa44, 0x66666600, 0xaa444444, 0x54a854a8, 0x95809580, 0x96969600, 0xa85454a8, 0x80959580, 0xaa141414, 0x96960000, 0xaaaa1414, 0xa05050a0, 0xa0a5a5a0, 0x96000000, 0x40804080, 0xa9a8a9a8, 0xaaaaaa44, 0x2a4a5254]);
const ANCHOR_2 = new Uint8Array([15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 8, 2, 2, 8, 8, 15, 2, 8, 2, 2, 8, 8, 2, 2, 15, 15, 6, 8, 2, 8, 15, 15, 2, 8, 2, 2, 2, 15, 15, 6, 6, 2, 6, 8, 15, 15, 2, 2, 15, 15, 15, 15, 15, 2, 2, 15]);
const ANCHOR_3_SECOND = new Uint8Array([3, 3, 15, 15, 8, 3, 15, 15, 8, 8, 6, 6, 6, 5, 3, 3, 3, 3, 8, 15, 3, 3, 6, 10, 5, 8, 8, 6, 8, 5, 15, 15, 8, 15, 3, 5, 6, 10, 8, 15, 15, 3, 15, 5, 15, 15, 15, 15, 3, 15, 5, 5, 5, 8, 5, 10, 5, 10, 8, 13, 15, 12, 3, 3]);
const ANCHOR_3_THIRD = new Uint8Array([15, 8, 8, 3, 15, 15, 3, 8, 15, 15, 15, 15, 15, 15, 15, 8, 15, 8, 15, 3, 15, 8, 15, 8, 3, 15, 6, 10, 15, 15, 10, 8, 15, 3, 15, 10, 10, 8, 9, 10, 6, 15, 8, 15, 3, 6, 6, 8, 15, 3, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 15, 15, 8]);
function decodeBc7(source, width, height, rowPitch = Math.ceil(width / 4) * 16) {
  const rgba = new Uint8Array(width * height * 4);
  const blockRows = Math.ceil(height / 4);
  const blockColumns = Math.ceil(width / 4);
  for (let blockY = 0; blockY < blockRows; blockY++) {
    for (let blockX = 0; blockX < blockColumns; blockX++) {
      const blockOffset = blockY * rowPitch + blockX * 16;
      const pixels = decodeBc7Block(source.subarray(blockOffset, blockOffset + 16));
      copyBlock(pixels, rgba, width, height, blockX, blockY);
    }
  }
  return rgba;
}
function decodeBc7Block(block) {
  if (block.byteLength < 16) throw new RangeError("BC7 block must contain 16 bytes");
  if (block[0] === 0) return new Uint8Array(16 * 4);
  const reader = new BitReader(block);
  let mode = 0;
  while (mode < 8 && reader.read(1) === 0) mode++;
  if (mode === 8) return new Uint8Array(16 * 4);
  const info = MODE[mode];
  const partition = reader.read(info.partitionBits);
  const rotation = reader.read(info.rotationBits);
  const selection = reader.read(info.selectionBits);
  const endpointCount = info.subsets * 2;
  const endpoints = Array.from({
    length: endpointCount
  }, () => [0, 0, 0, 255]);
  for (let channel = 0; channel < 3; channel++) {
    for (let endpoint = 0; endpoint < endpointCount; endpoint++) {
      endpoints[endpoint][channel] = reader.read(info.colorBits);
    }
  }
  if (info.alphaBits) {
    for (let endpoint = 0; endpoint < endpointCount; endpoint++) {
      endpoints[endpoint][3] = reader.read(info.alphaBits);
    }
  }
  const pBits = new Uint8Array(endpointCount);
  if (info.endpointPBits) {
    for (let endpoint = 0; endpoint < endpointCount; endpoint++) pBits[endpoint] = reader.read(1);
  } else if (info.sharedPBits) {
    for (let subset = 0; subset < info.subsets; subset++) {
      const pBit = reader.read(1);
      pBits[subset * 2] = pBit;
      pBits[subset * 2 + 1] = pBit;
    }
  }
  const colorPrecision = info.colorBits + (info.endpointPBits || info.sharedPBits ? 1 : 0);
  const alphaPrecision = info.alphaBits + (info.alphaBits && (info.endpointPBits || info.sharedPBits) ? 1 : 0);
  for (let endpoint = 0; endpoint < endpointCount; endpoint++) {
    for (let channel = 0; channel < 3; channel++) {
      const value = info.endpointPBits || info.sharedPBits ? endpoints[endpoint][channel] << 1 | pBits[endpoint] : endpoints[endpoint][channel];
      endpoints[endpoint][channel] = expandEndpoint(value, colorPrecision);
    }
    if (info.alphaBits) {
      const value = info.endpointPBits || info.sharedPBits ? endpoints[endpoint][3] << 1 | pBits[endpoint] : endpoints[endpoint][3];
      endpoints[endpoint][3] = expandEndpoint(value, alphaPrecision);
    }
  }
  const primary = readIndices(reader, info.indexBits, info.subsets, partition);
  const secondary = info.secondaryIndexBits ? readIndices(reader, info.secondaryIndexBits, info.subsets, partition) : primary;
  const colorUsesSecondary = info.selectionBits && selection === 1;
  const alphaUsesSecondary = info.secondaryIndexBits && (!info.selectionBits || selection === 0);
  const colorIndices = colorUsesSecondary ? secondary : primary;
  const alphaIndices = alphaUsesSecondary ? secondary : primary;
  const colorIndexBits = colorUsesSecondary ? info.secondaryIndexBits : info.indexBits;
  const alphaIndexBits = alphaUsesSecondary ? info.secondaryIndexBits : info.indexBits;
  const pixels = new Uint8Array(16 * 4);
  for (let pixel = 0; pixel < 16; pixel++) {
    const subset = getSubset(info.subsets, partition, pixel);
    const first = endpoints[subset * 2];
    const second = endpoints[subset * 2 + 1];
    const output = pixel * 4;
    for (let channel = 0; channel < 3; channel++) {
      pixels[output + channel] = interpolate(first[channel], second[channel], colorIndices[pixel], colorIndexBits);
    }
    pixels[output + 3] = interpolate(first[3], second[3], alphaIndices[pixel], alphaIndexBits);
    if (rotation) {
      const channel = rotation - 1;
      const value = pixels[output + channel];
      pixels[output + channel] = pixels[output + 3];
      pixels[output + 3] = value;
    }
  }
  return pixels;
}
function readIndices(reader, bitCount, subsets, partition) {
  const indices = new Uint8Array(16);
  for (let pixel = 0; pixel < 16; pixel++) {
    const subset = getSubset(subsets, partition, pixel);
    const isAnchor = pixel === getAnchor(subsets, partition, subset);
    indices[pixel] = reader.read(bitCount - (isAnchor ? 1 : 0));
  }
  return indices;
}
function getSubset(subsets, partition, pixel) {
  if (subsets === 1) return 0;
  if (subsets === 2) return PARTITIONS_2[partition] >>> pixel & 1;
  return PARTITIONS_3[partition] >>> pixel * 2 & 3;
}
function getAnchor(subsets, partition, subset) {
  if (subset === 0) return 0;
  if (subsets === 2) return ANCHOR_2[partition];
  return subset === 1 ? ANCHOR_3_SECOND[partition] : ANCHOR_3_THIRD[partition];
}
function expandEndpoint(value, bitCount) {
  if (bitCount === 8) return value;
  return value << 8 - bitCount | value >>> 2 * bitCount - 8;
}
function interpolate(first, second, index, bitCount) {
  const weight = WEIGHTS[bitCount][index];
  return (64 - weight) * first + weight * second + 32 >>> 6;
}
function copyBlock(block, output, width, height, blockX, blockY) {
  for (let y = 0; y < 4; y++) {
    const outputY = blockY * 4 + y;
    if (outputY >= height) continue;
    for (let x = 0; x < 4; x++) {
      const outputX = blockX * 4 + x;
      if (outputX >= width) continue;
      const sourceOffset = (y * 4 + x) * 4;
      output.set(block.subarray(sourceOffset, sourceOffset + 4), (outputY * width + outputX) * 4);
    }
  }
}
class BitReader {
  constructor(bytes) {
    this.bytes = bytes;
    this.offset = 0;
  }
  read(bitCount) {
    let value = 0;
    for (let bit = 0; bit < bitCount; bit++) {
      if (this.offset >= 128) throw new RangeError("BC7 block bitstream exceeds 128 bits");
      value |= (this.bytes[this.offset >>> 3] >>> (this.offset & 7) & 1) << bit;
      this.offset++;
    }
    return value;
  }
}

export { decodeBc7, decodeBc7Block };
//# sourceMappingURL=bc7.js.map
