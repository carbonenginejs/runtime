// Source: trinity/shadercompiler/Platforms.h
//
// The compile target, which shaders see as the PLATFORM define.
//
// Not in Carbon: PLATFORM_WEBGPU and PLATFORM_WEBGL2, the browser targets.
// CCP owns the platform numbers; ours are far from CCP's 2, 6 and 10 so
// that a platform CCP adds cannot collide with them. These are our extensions.

/** Carbon's `Platform`. */
export const Platform = Object.freeze({
    PLATFORM_INVALID: 0,
    PLATFORM_DX11: 2,
    PLATFORM_DX12: 6,
    PLATFORM_METAL: 10,
    PLATFORM_WEBGPU: 100,
    PLATFORM_WEBGL2: 101,
    _PLATFORM_END: 102
});

const { PLATFORM_DX11, PLATFORM_DX12, PLATFORM_METAL, PLATFORM_WEBGPU, PLATFORM_WEBGL2, _PLATFORM_END, PLATFORM_INVALID } = Platform;

/**
 * Carbon's `IsValidPlatform`.
 *
 * @param {number} platform A `Platform` value.
 * @returns {boolean} Whether it names a target.
 */
export function IsValidPlatform(platform)
{
    switch (platform)
    {
        case PLATFORM_DX11:
        case PLATFORM_DX12:
        case PLATFORM_METAL:
        case PLATFORM_WEBGPU:
        case PLATFORM_WEBGL2:
            return true;
        default:
            return false;
    }
}

/**
 * Carbon's `GetPlatformShortName`.
 *
 * @param {number} platform A `Platform` value.
 * @returns {string} The short name, such as `dx11`.
 */
export function GetPlatformShortName(platform)
{
    switch (platform)
    {
        case PLATFORM_DX11:
            return "dx11";
        case PLATFORM_DX12:
            return "dx12";
        case PLATFORM_METAL:
            return "mtl";
        case PLATFORM_WEBGPU:
            return "webgpu";
        case PLATFORM_WEBGL2:
            return "webgl2";
        default:
            return "INVALID";
    }
}

/**
 * Carbon's `GetPlatformLongName`.
 *
 * @param {number} platform A `Platform` value.
 * @returns {string} The long name, such as `DirectX 11`.
 */
export function GetPlatformLongName(platform)
{
    switch (platform)
    {
        case PLATFORM_DX11:
            return "DirectX 11";
        case PLATFORM_DX12:
            return "DirectX 12";
        case PLATFORM_METAL:
            return "Metal";
        case PLATFORM_WEBGPU:
            return "WebGPU";
        case PLATFORM_WEBGL2:
            return "WebGL 2";
        default:
            return "INVALID";
    }
}

/**
 * Carbon's `GetPlatformIdString`: the number as text.
 *
 * @param {number} platform A `Platform` value.
 * @returns {string} The number, such as `2`.
 */
export function GetPlatformIdString(platform)
{
    return IsValidPlatform(platform) ? String(platform) : "INVALID";
}

/**
 * Carbon's `ParsePlatform`: a platform from its number or its short name,
 * ignoring case.
 *
 * @param {string} name The number or short name.
 * @returns {number} The `Platform` value, or `PLATFORM_INVALID`.
 */
export function ParsePlatform(name)
{
    for (let i = 0; i < _PLATFORM_END; ++i)
    {
        if (IsValidPlatform(i))
        {
            if (GetPlatformIdString(i) === name)
            {
                return i;
            }
            if (GetPlatformShortName(i).toLowerCase() === name.toLowerCase())
            {
                return i;
            }
        }
    }
    return PLATFORM_INVALID;
}
