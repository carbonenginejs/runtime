// Source: trinity/trinity/Resources/Tr2LodResource.h

/**
 * Shared Trinity level-of-detail values.
 */
export const Tr2Lod = Object.freeze({
    TR2_LOD_UNSPECIFIED: -1,
    TR2_LOD_LOW: 0,
    TR2_LOD_MEDIUM: 1,
    TR2_LOD_HIGH: 2,
    TR2_LOD_ULTRA: 3,
    TR2_LOD_COUNT: 4
});

// Source: blueexposure/include/IList.h:38-53
//
// Blue's list notifications. A list holds ONE observer (IListNotify* mNotify,
// installed with SetNotify) and calls OnListModified(event, key, key2, value,
// list) on it; the event is one of these values, optionally carrying a flag.
// This is Carbon's wiring bus, not an event system: the observer is the owner
// reacting to its own list.
export const BlueListEvent = Object.freeze({
    /** After a read has filled the list - the one notification a load produces. */
    LOADFINISHED: 0x06,
    /** Before a list is torn down. */
    UNLOADSTART: 0x07,
    /** After insertion. */
    INSERTED: 0x08,
    /** After removal. */
    REMOVED: 0x09,
    /** After a swap. */
    SWAPPED: 0x0a,
    /** After a move. */
    MOVED: 0x0c,
    /** Masks the event out of a value carrying flags. */
    EVENTMASK: 0x0f,

    // Flags, OR-ed into the event. An owner that must ignore notifications
    // during a load tests for LOADING (EveEffectRoot2.cpp:90).
    LOADING: 0x10,
    UNLOADING: 0x20,
    FLAGMASK: 0xf0
});
