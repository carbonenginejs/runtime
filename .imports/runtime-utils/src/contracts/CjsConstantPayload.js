/**
 * Terminal constant-buffer bytes with an explicit upload dirty lifecycle.
 *
 * Logical layout, matrix packing, allocation, upload, and binding remain with
 * their owning runtime or engine layers.
 */
export class CjsConstantPayload
{

    /**
     * Gets the terminal packed data without reinterpreting its layout.
     *
     * @returns {ArrayBufferView} Packed constant data.
     */
    GetData()
    {
        throw new Error(
            "CjsConstantPayload.GetData must be overridden by a concrete constant payload."
        );
    }

    /**
     * Checks whether the payload has changed since its last successful upload.
     *
     * @returns {boolean} True when the terminal data needs uploading.
     */
    IsDirty()
    {
        throw new Error(
            "CjsConstantPayload.IsDirty must be overridden by a concrete constant payload."
        );
    }

    /**
     * Marks the current terminal data as successfully uploaded.
     *
     * @returns {CjsConstantPayload} This payload.
     */
    ClearDirty()
    {
        throw new Error(
            "CjsConstantPayload.ClearDirty must be overridden by a concrete constant payload."
        );
    }

}
