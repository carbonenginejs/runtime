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
 * IT LIVES HERE RATHER THAN ON ITS OWNER. The enum-placement rule makes a
 * static on `IListNotify` the default, and that is where the vocabulary
 * belongs - but `global/model` may not import `global/blue`, and `CjsModel` is
 * what fires these. So the one frozen object is declared in the layer every
 * consumer may reach, and `IListNotify.BLUELISTEVENT` points at this exact
 * object rather than a copy.
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
