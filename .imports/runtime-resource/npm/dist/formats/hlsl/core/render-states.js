import { cjsUint32ToFloat32 } from './HlslBinaryUtils.js';

/**
 * Human-readable names for Carbon/D3D render-state key/value pairs.
 *
 * The numeric state ids match Carbon's `HlslRenderContextEnum::RenderState`
 * / `TriD3DRenderState` values, which mirror D3D9 render-state constants.
 */

const RENDER_STATE_NAMES = Object.freeze({
  7: "RS_ZENABLE",
  8: "RS_FILLMODE",
  9: "RS_SHADEMODE",
  14: "RS_ZWRITEENABLE",
  15: "RS_ALPHATESTENABLE",
  16: "RS_LASTPIXEL",
  19: "RS_SRCBLEND",
  20: "RS_DESTBLEND",
  22: "RS_CULLMODE",
  23: "RS_ZFUNC",
  24: "RS_ALPHAREF",
  25: "RS_ALPHAFUNC",
  26: "RS_DITHERENABLE",
  27: "RS_ALPHABLENDENABLE",
  28: "RS_FOGENABLE",
  29: "RS_SPECULARENABLE",
  34: "RS_FOGCOLOR",
  35: "RS_FOGTABLEMODE",
  36: "RS_FOGSTART",
  37: "RS_FOGEND",
  38: "RS_FOGDENSITY",
  48: "RS_RANGEFOGENABLE",
  52: "RS_STENCILENABLE",
  53: "RS_STENCILFAIL",
  54: "RS_STENCILZFAIL",
  55: "RS_STENCILPASS",
  56: "RS_STENCILFUNC",
  57: "RS_STENCILREF",
  58: "RS_STENCILMASK",
  59: "RS_STENCILWRITEMASK",
  60: "RS_TEXTUREFACTOR",
  128: "RS_WRAP0",
  129: "RS_WRAP1",
  130: "RS_WRAP2",
  131: "RS_WRAP3",
  132: "RS_WRAP4",
  133: "RS_WRAP5",
  134: "RS_WRAP6",
  135: "RS_WRAP7",
  136: "RS_CLIPPING",
  137: "RS_LIGHTING",
  139: "RS_AMBIENT",
  140: "RS_FOGVERTEXMODE",
  141: "RS_COLORVERTEX",
  142: "RS_LOCALVIEWER",
  143: "RS_NORMALIZENORMALS",
  145: "RS_DIFFUSEMATERIALSOURCE",
  146: "RS_SPECULARMATERIALSOURCE",
  147: "RS_AMBIENTMATERIALSOURCE",
  148: "RS_EMISSIVEMATERIALSOURCE",
  151: "RS_VERTEXBLEND",
  152: "RS_CLIPPLANEENABLE",
  154: "RS_POINTSIZE",
  155: "RS_POINTSIZE_MIN",
  156: "RS_POINTSPRITEENABLE",
  157: "RS_POINTSCALEENABLE",
  158: "RS_POINTSCALE_A",
  159: "RS_POINTSCALE_B",
  160: "RS_POINTSCALE_C",
  161: "RS_MULTISAMPLEANTIALIAS",
  162: "RS_MULTISAMPLEMASK",
  163: "RS_PATCHEDGESTYLE",
  165: "RS_DEBUGMONITORTOKEN",
  166: "RS_POINTSIZE_MAX",
  167: "RS_INDEXEDVERTEXBLENDENABLE",
  168: "RS_COLORWRITEENABLE",
  170: "RS_TWEENFACTOR",
  171: "RS_BLENDOP",
  172: "RS_POSITIONDEGREE",
  173: "RS_NORMALDEGREE",
  174: "RS_SCISSORTESTENABLE",
  175: "RS_SLOPESCALEDEPTHBIAS",
  176: "RS_ANTIALIASEDLINEENABLE",
  185: "RS_TWOSIDEDSTENCILMODE",
  186: "RS_CCW_STENCILFAIL",
  187: "RS_CCW_STENCILZFAIL",
  188: "RS_CCW_STENCILPASS",
  189: "RS_CCW_STENCILFUNC",
  190: "RS_COLORWRITEENABLE1",
  191: "RS_COLORWRITEENABLE2",
  192: "RS_COLORWRITEENABLE3",
  193: "RS_BLENDFACTOR",
  194: "RS_SRGBWRITEENABLE",
  195: "RS_DEPTHBIAS",
  206: "RS_SEPARATEALPHABLENDENABLE",
  207: "RS_SRCBLENDALPHA",
  208: "RS_DESTBLENDALPHA",
  209: "RS_BLENDOPALPHA"
});
const BOOL_NAMES = Object.freeze({
  0: "FALSE",
  1: "TRUE"
});
const ZBUFFER_NAMES = Object.freeze({
  0: "D3DZB_FALSE",
  1: "D3DZB_TRUE",
  2: "D3DZB_USEW"
});
const FILL_MODE_NAMES = Object.freeze({
  1: "D3DFILL_POINT",
  2: "D3DFILL_WIREFRAME",
  3: "D3DFILL_SOLID"
});
const SHADE_MODE_NAMES = Object.freeze({
  1: "D3DSHADE_FLAT",
  2: "D3DSHADE_GOURAUD",
  3: "D3DSHADE_PHONG"
});
const BLEND_NAMES = Object.freeze({
  1: "BLEND_ZERO",
  2: "BLEND_ONE",
  3: "BLEND_SRCCOLOR",
  4: "BLEND_INVSRCCOLOR",
  5: "BLEND_SRCALPHA",
  6: "BLEND_INVSRCALPHA",
  7: "BLEND_DESTALPHA",
  8: "BLEND_INVDESTALPHA",
  9: "BLEND_DESTCOLOR",
  10: "BLEND_INVDESTCOLOR",
  11: "BLEND_SRCALPHASAT",
  12: "BLEND_BOTHSRCALPHA",
  13: "BLEND_BOTHINVSRCALPHA",
  14: "BLEND_BLENDFACTOR",
  15: "BLEND_INVBLENDFACTOR"
});
const CULL_NAMES = Object.freeze({
  1: "CULL_NONE",
  2: "CULL_CW",
  3: "CULL_CCW"
});
const COMPARE_NAMES = Object.freeze({
  1: "CMP_NEVER",
  2: "CMP_LESS",
  3: "CMP_EQUAL",
  4: "CMP_LEQUAL",
  5: "CMP_GREATER",
  6: "CMP_NOTEQUAL",
  7: "CMP_GREATEREQUAL",
  8: "CMP_ALWAYS"
});
const FOG_MODE_NAMES = Object.freeze({
  0: "D3DFOG_NONE",
  1: "D3DFOG_EXP",
  2: "D3DFOG_EXP2",
  3: "D3DFOG_LINEAR"
});
const STENCIL_OP_NAMES = Object.freeze({
  1: "D3DSTENCILOP_KEEP",
  2: "D3DSTENCILOP_ZERO",
  3: "D3DSTENCILOP_REPLACE",
  4: "D3DSTENCILOP_INCRSAT",
  5: "D3DSTENCILOP_DECRSAT",
  6: "D3DSTENCILOP_INVERT",
  7: "D3DSTENCILOP_INCR",
  8: "D3DSTENCILOP_DECR"
});
const MATERIAL_SOURCE_NAMES = Object.freeze({
  0: "D3DMCS_MATERIAL",
  1: "D3DMCS_COLOR1",
  2: "D3DMCS_COLOR2"
});
const VERTEX_BLEND_NAMES = Object.freeze({
  0: "D3DVBF_DISABLE",
  1: "D3DVBF_1WEIGHTS",
  2: "D3DVBF_2WEIGHTS",
  3: "D3DVBF_3WEIGHTS",
  255: "D3DVBF_TWEENING",
  256: "D3DVBF_0WEIGHTS"
});
const BLEND_OP_NAMES = Object.freeze({
  1: "BLENDOP_ADD",
  2: "BLENDOP_SUBTRACT",
  3: "BLENDOP_REVSUBTRACT",
  4: "BLENDOP_MIN",
  5: "BLENDOP_MAX"
});
const DEGREE_NAMES = Object.freeze({
  1: "D3DDEGREE_LINEAR",
  2: "D3DDEGREE_QUADRATIC",
  3: "D3DDEGREE_CUBIC",
  5: "D3DDEGREE_QUINTIC"
});
const PATCH_EDGE_STYLE_NAMES = Object.freeze({
  0: "D3DPATCHEDGE_DISCRETE",
  1: "D3DPATCHEDGE_CONTINUOUS"
});
const VALUE_NAME_BY_STATE = new Map([[7, ZBUFFER_NAMES], [8, FILL_MODE_NAMES], [9, SHADE_MODE_NAMES], [19, BLEND_NAMES], [20, BLEND_NAMES], [22, CULL_NAMES], [23, COMPARE_NAMES], [25, COMPARE_NAMES], [35, FOG_MODE_NAMES], [53, STENCIL_OP_NAMES], [54, STENCIL_OP_NAMES], [55, STENCIL_OP_NAMES], [56, COMPARE_NAMES], [140, FOG_MODE_NAMES], [145, MATERIAL_SOURCE_NAMES], [146, MATERIAL_SOURCE_NAMES], [147, MATERIAL_SOURCE_NAMES], [148, MATERIAL_SOURCE_NAMES], [151, VERTEX_BLEND_NAMES], [163, PATCH_EDGE_STYLE_NAMES], [171, BLEND_OP_NAMES], [172, DEGREE_NAMES], [173, DEGREE_NAMES], [186, STENCIL_OP_NAMES], [187, STENCIL_OP_NAMES], [188, STENCIL_OP_NAMES], [189, COMPARE_NAMES], [207, BLEND_NAMES], [208, BLEND_NAMES], [209, BLEND_OP_NAMES]]);
const BOOL_STATES = new Set([14, 15, 16, 26, 27, 28, 29, 48, 52, 136, 137, 141, 142, 143, 152, 156, 157, 161, 167, 174, 176, 185, 194, 206]);
const FLOAT_STATES = new Set([36, 37, 38, 154, 155, 158, 159, 160, 166, 170, 175, 195]);
const COLOR_STATES = new Set([34, 60, 139, 193]);
const COLOR_WRITE_STATES = new Set([168, 190, 191, 192]);

/**
 * Converts a D3D color write mask into channel names.
 *
 * @param {number} value Raw color-write mask.
 * @returns {string[]} Enabled color channels.
 */
function colorWriteChannels(value) {
  const channels = [];
  if (value & 1) channels.push("RED");
  if (value & 2) channels.push("GREEN");
  if (value & 4) channels.push("BLUE");
  if (value & 8) channels.push("ALPHA");
  return channels;
}

/**
 * Converts an ARGB D3DCOLOR value into channel bytes.
 *
 * @param {number} value Raw D3DCOLOR value.
 * @returns {{a:number,r:number,g:number,b:number}} Color channels.
 */
function d3dColor(value) {
  const unsigned = value >>> 0;
  return {
    a: unsigned >>> 24 & 0xff,
    r: unsigned >>> 16 & 0xff,
    g: unsigned >>> 8 & 0xff,
    b: unsigned & 0xff
  };
}

/**
 * Emits a human-readable render-state record without dropping raw values.
 *
 * @param {{key:number,value:number}} entry Raw render-state key/value pair.
 * @returns {object} Enriched render-state metadata.
 */
function emitRenderState(entry) {
  const key = Number(entry.key);
  const value = Number(entry.value);
  const out = {
    key,
    name: RENDER_STATE_NAMES[key] || `RS_${key}`,
    value
  };
  const valueNames = VALUE_NAME_BY_STATE.get(key);
  if (valueNames?.[value] !== undefined) {
    out.valueName = valueNames[value];
  } else if (BOOL_STATES.has(key)) {
    out.valueName = BOOL_NAMES[value] || `BOOL_${value}`;
  }
  if (FLOAT_STATES.has(key)) {
    out.valueFloat = cjsUint32ToFloat32(value);
  }
  if (COLOR_STATES.has(key)) {
    out.valueHex = `0x${(value >>> 0).toString(16).padStart(8, "0").toUpperCase()}`;
    out.valueColor = d3dColor(value);
  }
  if (COLOR_WRITE_STATES.has(key)) {
    const channels = colorWriteChannels(value);
    out.valueName = channels.length ? channels.join("|") : "NONE";
    out.valueFlags = channels;
  }
  return out;
}

/**
 * Emits a render-state setup as enriched records.
 *
 * @param {object|null} setup HlslRenderStateSetup-like object.
 * @returns {object[]} Enriched render-state records.
 */
function emitRenderStates(setup) {
  return (setup?.entries || []).map(emitRenderState);
}

export { RENDER_STATE_NAMES, emitRenderState, emitRenderStates };
//# sourceMappingURL=render-states.js.map
