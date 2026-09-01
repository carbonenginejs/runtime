// Source: trinity/trinityal/Tr2RenderContextEnum.h
//   (CullMode, ColorWriteEnable, CompareFunc, FillMode, BlendMode, BlendOperation)
//
// The values a render state carries, beside the `RenderState` ids in
// presentation.js that name the states themselves. Shared because the resource
// layer interprets them and every engine layer projects them, so the two must
// agree on one object.
//
// The `*_FORCE_DWORD` padding members are not carried: they are C enum-width
// padding, not vocabulary, and a JavaScript consumer that met one would be
// reading a value Carbon never authors.

export const CullMode = Object.freeze({
    CULLMODE_NONE: 1,
    CULLMODE_CW: 2,
    CULLMODE_CCW: 3
});

export const ColorWriteEnable = Object.freeze({
    COLORWRITEENABLE_RED: 1 << 0,
    COLORWRITEENABLE_GREEN: 1 << 1,
    COLORWRITEENABLE_BLUE: 1 << 2,
    COLORWRITEENABLE_ALPHA: 1 << 3
});

export const CompareFunc = Object.freeze({
    CMP_NEVER: 1,
    CMP_LESS: 2,
    CMP_EQUAL: 3,
    CMP_LESSEQUAL: 4,
    CMP_GREATER: 5,
    CMP_NOTEQUAL: 6,
    CMP_GREATEREQUAL: 7,
    CMP_ALWAYS: 8
});

export const FillMode = Object.freeze({
    FM_POINT: 1,
    FM_WIREFRAME: 2,
    FM_SOLID: 3
});

export const BlendMode = Object.freeze({
    BM_ZERO: 1,
    BM_ONE: 2,
    BM_SRCCOLOR: 3,
    BM_INVSRCCOLOR: 4,
    BM_SRCALPHA: 5,
    BM_INVSRCALPHA: 6,
    BM_DESTALPHA: 7,
    BM_INVDESTALPHA: 8,
    BM_DESTCOLOR: 9,
    BM_INVDESTCOLOR: 10,
    BM_SRCALPHASAT: 11,
    BM_BOTHSRCALPHA: 12,
    BM_BOTHINVSRCALPHA: 13,
    BM_BLENDFACTOR: 14,
    BM_INVBLENDFACTOR: 15
});

export const BlendOperation = Object.freeze({
    BO_DISABLE: 0,
    BO_ADD: 1,
    BO_SUBTRACT: 2,
    BO_REVSUBTRACT: 3,
    BO_MIN: 4,
    BO_MAX: 5
});
