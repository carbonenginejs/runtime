// Source: trinity/trinity/UI/Scancodes.h
// Source: trinity/trinity/UI/Scancodes.cpp

const DEFINITIONS = new Map();

function define(browserCode, virtualKey, name, description)
{
    DEFINITIONS.set(browserCode, { browserCode, virtualKey, name, description });
}

for (let index = 0; index <= 9; index++)
{
    define(`Digit${index}`, 0x30 + index, `VK_${index}`, `${index} key`);
    define(`Numpad${index}`, 0x60 + index, `VK_NUMPAD${index}`, `Numeric keypad ${index} key`);
}
for (let index = 0; index < 26; index++)
{
    const letter = String.fromCharCode(65 + index);
    define(`Key${letter}`, 0x41 + index, `VK_${letter}`, `${letter} key`);
}
for (let index = 1; index <= 24; index++) define(`F${index}`, 0x6f + index, `VK_F${index}`, `F${index} key`);

for (const [ browserCode, virtualKey, name, description ] of [
    [ "Backspace", 0x08, "VK_BACK", "BACKSPACE key" ],
    [ "Tab", 0x09, "VK_TAB", "TAB key" ],
    [ "Enter", 0x0d, "VK_RETURN", "ENTER key" ],
    [ "NumpadEnter", 0x0d, "VK_RETURN", "Numeric keypad ENTER key" ],
    [ "Pause", 0x13, "VK_PAUSE", "PAUSE key" ],
    [ "CapsLock", 0x14, "VK_CAPITAL", "CAPS LOCK key" ],
    [ "Escape", 0x1b, "VK_ESCAPE", "ESC key" ],
    [ "Space", 0x20, "VK_SPACE", "SPACEBAR" ],
    [ "PageUp", 0x21, "VK_PRIOR", "PAGE UP key" ],
    [ "PageDown", 0x22, "VK_NEXT", "PAGE DOWN key" ],
    [ "End", 0x23, "VK_END", "END key" ],
    [ "Home", 0x24, "VK_HOME", "HOME key" ],
    [ "ArrowLeft", 0x25, "VK_LEFT", "LEFT ARROW key" ],
    [ "ArrowUp", 0x26, "VK_UP", "UP ARROW key" ],
    [ "ArrowRight", 0x27, "VK_RIGHT", "RIGHT ARROW key" ],
    [ "ArrowDown", 0x28, "VK_DOWN", "DOWN ARROW key" ],
    [ "PrintScreen", 0x2c, "VK_SNAPSHOT", "PRINT SCREEN key" ],
    [ "Insert", 0x2d, "VK_INSERT", "INS key" ],
    [ "Delete", 0x2e, "VK_DELETE", "DEL key" ],
    [ "MetaLeft", 0x5b, "VK_LWIN", "Left platform key" ],
    [ "MetaRight", 0x5c, "VK_RWIN", "Right platform key" ],
    [ "ContextMenu", 0x5d, "VK_APPS", "Context menu key" ],
    [ "NumpadMultiply", 0x6a, "VK_MULTIPLY", "Multiply key" ],
    [ "NumpadAdd", 0x6b, "VK_ADD", "Add key" ],
    [ "NumpadSubtract", 0x6d, "VK_SUBTRACT", "Subtract key" ],
    [ "NumpadDecimal", 0x6e, "VK_DECIMAL", "Decimal key" ],
    [ "NumpadDivide", 0x6f, "VK_DIVIDE", "Divide key" ],
    [ "NumLock", 0x90, "VK_NUMLOCK", "NUM LOCK key" ],
    [ "ScrollLock", 0x91, "VK_SCROLL", "SCROLL LOCK key" ],
    [ "ShiftLeft", 0xa0, "VK_LSHIFT", "Left SHIFT key" ],
    [ "ShiftRight", 0xa1, "VK_RSHIFT", "Right SHIFT key" ],
    [ "ControlLeft", 0xa2, "VK_LCONTROL", "Left CONTROL key" ],
    [ "ControlRight", 0xa3, "VK_RCONTROL", "Right CONTROL key" ],
    [ "AltLeft", 0xa4, "VK_LMENU", "Left ALT key" ],
    [ "AltRight", 0xa5, "VK_RMENU", "Right ALT key" ],
    [ "BrowserBack", 0xa6, "VK_BROWSER_BACK", "Browser Back key" ],
    [ "BrowserForward", 0xa7, "VK_BROWSER_FORWARD", "Browser Forward key" ],
    [ "BrowserRefresh", 0xa8, "VK_BROWSER_REFRESH", "Browser Refresh key" ],
    [ "BrowserStop", 0xa9, "VK_BROWSER_STOP", "Browser Stop key" ],
    [ "BrowserSearch", 0xaa, "VK_BROWSER_SEARCH", "Browser Search key" ],
    [ "BrowserFavorites", 0xab, "VK_BROWSER_FAVORITES", "Browser Favorites key" ],
    [ "BrowserHome", 0xac, "VK_BROWSER_HOME", "Browser Home key" ],
    [ "AudioVolumeMute", 0xad, "VK_VOLUME_MUTE", "Volume Mute key" ],
    [ "AudioVolumeDown", 0xae, "VK_VOLUME_DOWN", "Volume Down key" ],
    [ "AudioVolumeUp", 0xaf, "VK_VOLUME_UP", "Volume Up key" ],
    [ "MediaTrackNext", 0xb0, "VK_MEDIA_NEXT_TRACK", "Next Track key" ],
    [ "MediaTrackPrevious", 0xb1, "VK_MEDIA_PREV_TRACK", "Previous Track key" ],
    [ "MediaStop", 0xb2, "VK_MEDIA_STOP", "Stop Media key" ],
    [ "MediaPlayPause", 0xb3, "VK_MEDIA_PLAY_PAUSE", "Play/Pause Media key" ],
    [ "Semicolon", 0xba, "VK_OEM_1", "Semicolon key" ],
    [ "Equal", 0xbb, "VK_OEM_PLUS", "Equals/plus key" ],
    [ "Comma", 0xbc, "VK_OEM_COMMA", "Comma key" ],
    [ "Minus", 0xbd, "VK_OEM_MINUS", "Minus key" ],
    [ "Period", 0xbe, "VK_OEM_PERIOD", "Period key" ],
    [ "Slash", 0xbf, "VK_OEM_2", "Slash key" ],
    [ "Backquote", 0xc0, "VK_OEM_3", "Backquote key" ],
    [ "BracketLeft", 0xdb, "VK_OEM_4", "Left bracket key" ],
    [ "Backslash", 0xdc, "VK_OEM_5", "Backslash key" ],
    [ "BracketRight", 0xdd, "VK_OEM_6", "Right bracket key" ],
    [ "Quote", 0xde, "VK_OEM_7", "Quote key" ],
    [ "IntlBackslash", 0xe2, "VK_OEM_102", "International backslash key" ]
]) define(browserCode, virtualKey, name, description);

/**
 * Carbon-compatible keyboard scancode record with browser code mapping.
 */
export class UIScancode
{
    /** Creates a Carbon-compatible keyboard scancode record. */
    constructor(mDIK = 0, mName = "", mDescription = "", browserCode = null)
    {
        this.mDIK = Number.isInteger(mDIK) ? mDIK & 0xff : 0;
        this.mName = String(mName || "");
        this.mDescription = String(mDescription || "");
        this.browserCode = browserCode ? String(browserCode) : null;
    }

    /** Creates a scancode from a KeyboardEvent-like object. */
    static fromKeyboardEvent(event)
    {
        if (!event || typeof event !== "object") throw new TypeError("UIScancode requires a KeyboardEvent-like object.");
        const known = DEFINITIONS.get(event.code);
        if (known) return new UIScancode(known.virtualKey, known.name, known.description, known.browserCode);

        const value = Number.isInteger(event.keyCode) ? event.keyCode : Number.isInteger(event.which) ? event.which : 0;
        const code = String(event.code || event.key || "Unidentified");
        return new UIScancode(value, code, String(event.key || code), code);
    }
}

export const SCANCODES = Object.freeze(Array.from(DEFINITIONS.values(), definition => new UIScancode(
        definition.virtualKey,
        definition.name,
        definition.description,
        definition.browserCode
    )));

const BY_VALUE = new Map();
const BY_NAME = new Map();
for (const scancode of SCANCODES)
{
    if (!BY_VALUE.has(scancode.mDIK)) BY_VALUE.set(scancode.mDIK, scancode);
    if (!BY_NAME.has(scancode.mName)) BY_NAME.set(scancode.mName, scancode);
}
const BY_CODE = new Map(SCANCODES.map(scancode => [ scancode.browserCode, scancode ]));

/** Resolves a scancode by record, numeric value, browser code, or Carbon name. */
export function GetUIScancode(value)
{
    if (value instanceof UIScancode) return value;
    if (typeof value === "number") return BY_VALUE.get(value & 0xff) ?? null;
    if (typeof value === "string") return BY_CODE.get(value) ?? BY_NAME.get(value) ?? null;
    return null;
}
