// Source: blueexposure/include/IList.h:38-53
// Source: blue/include/IBlueOS.h:48-53

/**
 * `BLUELISTEVENT` - what happened to a Blue list.
 *
 * A list holds ONE observer (`IListNotify* mNotify`, installed with SetNotify)
 * and calls `OnListModified` on it. This is Carbon's wiring bus, not an event
 * system: the observer is the owner reacting to its own list.
 *
 * The first seven are events; the last three are flags OR-ed on top, so mask
 * with `BELIST_EVENTMASK` before comparing.
 *
 * Shared list producers and observers import this single declaration from
 * global/consts. IListNotify does not declare a separate BLUELISTEVENT static.
 */
export const BLUELISTEVENT = Object.freeze({
    /** After a read has filled the list - the one notification a load produces. */
    BELIST_LOADFINISHED: 0x06,
    /** Before a list is torn down. */
    BELIST_UNLOADSTART: 0x07,
    /** After insertion. */
    BELIST_INSERTED: 0x08,
    /** After removal. */
    BELIST_REMOVED: 0x09,
    /** After a swap. */
    BELIST_SWAPPED: 0x0a,
    /** After a move. */
    BELIST_MOVED: 0x0c,
    /** Masks the event out of a value carrying flags. */
    BELIST_EVENTMASK: 0x0f,

    // Flags. An owner that must ignore notifications during a load tests for
    // BELIST_LOADING (EveEffectRoot2.cpp:90).
    BELIST_LOADING: 0x10,
    BELIST_UNLOADING: 0x20,
    BELIST_FLAGMASK: 0xf0
});


/**
 * `BLUEERROR` - the sentinel values `BeOS->SetError` accepts in place of an
 * HRESULT.
 *
 * Three of the four are COMMANDS rather than errors: clear the log, flush it,
 * or go and read the platform's own last error. Only `BEDEF` means "an error
 * with nothing more specific to say".
 *
 * THE VOCABULARY IS PORTED, THE MECHANISM IS NOT. `IBlueOS.SetError` refuses
 * here - error reporting is a real operating-system service with no consumer
 * in this runtime - but a shared enum belongs in `global/consts` whether or
 * not the verb that takes it is implemented, and declaring it is what makes
 * the refusal reviewable rather than a blank.
 *
 * NEGATIVE ON PURPOSE. They share the space with HRESULT values, which is why
 * they are small negatives Carbon's error codes cannot collide with.
 */
export const BLUEERROR = Object.freeze({
    /** Clears the error log. */
    BECLEAR: 0,
    /** No particular error value; the default. */
    BEDEF: -1,
    /** Go and call the platform's GetLastError. */
    BE32: -2,
    /** Flush the error log to the logger, then clear it. */
    BEFLUSH: -3
});

/**
 * `Be::EDITFLAGS`: a member's access, serialization and editor bits, one integer per member.
 *
 * Carbon: Be::EDITFLAGS (blueexposure/include/BlueTypes.h:283-311)
 */
export const EDITFLAGS = Object.freeze({
    NONE: 0x000,
    /** Value is accessible. */
    READ: 0x001,
    /** Value is modifiable. */
    WRITE: 0x002,
    READWRITE: 0x003,
    NOTIFY: 0x004,
    /** Value is hidden. */
    HIDDEN: 0x008,
    MODMASK: 0x00f,
    /** Serialize automatically. */
    PERSIST: 0x010,
    /** Like PERSIST, but only unserialize. */
    RPERSIST: 0x020,
    SERMASK: 0x0f0,
    /** Value is a flag or mask. */
    FLAGS: 0x100,
    /** Value is an enumeration. */
    ENUM: 0x200,
    EDMASK: 0xf00,
    /** For hidden attributes: HIDDEN | PERSIST. */
    PERSISTONLY: 0x018,
    EDIT_FORCELONG: 0xffffffff
});

// Source: blueexposure/include/BlueTypes.h:216-262 (Be::VARTYPE)
/**
 * Carbon's storage-type identifiers, including reserved gaps and sentinels.
 * Python entries retain their native identities; declaring them does not
 * provide Python value handling in JavaScript.
 *
 * Carbon: Be::VARTYPE (blueexposure/include/BlueTypes.h:216-262)
 */
export const VARTYPE = Object.freeze({
  INVALID: 0,
  LONG: 1,
  FLOAT: 2,
  DOUBLE: 3,
  BOOL: 4,
  IROOT: 5,
  IROOTPTR: 6,
  CHARARRAY: 7,
  CSTRING: 8,
  INT64: 9,
  PYOBJECT: 10,
  PYOBJECTPTR: 11,
  REFERENCE: 12,
  WCSTRING: 13,
  WREFERENCE: 14,
  FLOATARRAY: 15,
  DOUBLEARRAY: 16,
  INTARRAY: 17,
  ROTREFERENCE: 20,
  IROOTWEAKREF: 21,
  _PYPROPERTY: 22,
  STDSTRING: 23,
  STDWSTRING: 24,
  BINARYBLOCK: 25,
  BYTE: 31,
  SHORT: 32,
  SCRIPTCALLBACK: 33,
  SHAREDSTRING: 34,
  SHAREDSTRINGW: 35,
  ULONG: 36,
  UINT64: 37,
  VARTYPE_MAX: 37,
  VARTYPE_FORCELONG: 0xFFFFFFFF
});

// Source: blueexposure/include/BlueTypes.h:421-425 (Be::LOADOBJECT_INIT_FLAG)
/**
 * Whether `BlueResMan.LoadObject` initializes the object it builds: the reader's `SetDoInitialize`
 * (BlueResMan.cpp:776-780).
 *
 * Carbon: Be::LOADOBJECT_INIT_FLAG (blueexposure/include/BlueTypes.h:421-425)
 */
export const LOADOBJECT_INIT_FLAG = Object.freeze({
  LDOBJ_INITIALIZE: 0,
  LDOBJ_DONT_INITIALIZE: 1
});
