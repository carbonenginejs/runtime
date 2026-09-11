// Source: trinity/trinity/Tr2TextureArray.h
//   trinity/trinity/Tr2TextureArray.cpp



/**
 * Element handle returned by {@link Tr2TextureArray.AddElement}.
 *
 * Carbon's handle is a shared_ptr whose Data destructor calls
 * `RemoveElement` (Tr2TextureArray.cpp:233-236). JavaScript has no
 * destructors, so release is EXPLICIT: the owner calls `Release()` when the
 * slice is done (the lifecycle ruling - Destroy/Release verbs, never
 * finalizers). Carbon quirk kept and documented: an invalid handle reports
 * element index 0, the same value as a valid slot 0 (cpp:216-219), which is
 * why every consumer applies the +1 bias itself.
 */
export class Tr2TextureArrayElement
{

    #array = null;

    #index = 0;

    /** Creates a handle; internal - only AddElement constructs valid ones. */
    constructor(array = null, index = 0)
    {
        this.#array = array;
        this.#index = index;
    }

    /** Reports whether this handle names a live slice. */
    IsValid()
    {
        return this.#array !== null;
    }

    /** The slice index inside the array; 0 when invalid (Carbon cpp:216-219). */
    GetElementIndex()
    {
        return this.#array !== null ? this.#index : 0;
    }

    /** The owning array, or null for an invalid handle. */
    GetArray()
    {
        return this.#array;
    }

    /**
     * The owning array's realized texture (Carbon cpp:222-229), or null -
     * realization is the abstraction layer's; it parks the AL object on the
     * array's `texture` field and every live handle sees it.
     */
    GetTexture()
    {
        return this.#array ? this.#array.texture : null;
    }

    /**
     * Frees the slice (Carbon's Data destructor, cpp:233-236). Idempotent.
     */
    Release()
    {
        if (this.#array === null) return;
        this.#array.RemoveElement(this.#index);
        this.#array = null;
        this.#index = 0;
    }

}
