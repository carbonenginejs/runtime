import { CjsSchema, meta } from "../schema/index.js";

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
    GetData() {}

    /**
     * Checks whether the payload has changed since its last successful upload.
     *
     * @returns {boolean} True when the terminal data needs uploading.
     */
    IsDirty() {}

    /**
     * Marks the current terminal data as successfully uploaded.
     *
     * @returns {CjsConstantPayload} This payload.
     */
    ClearDirty() {}

}

CjsSchema.decorateMethod(CjsConstantPayload, "GetData", meta.abstract);
CjsSchema.decorateMethod(CjsConstantPayload, "IsDirty", meta.abstract);
CjsSchema.decorateMethod(CjsConstantPayload, "ClearDirty", meta.abstract);

CjsSchema.meta.define(CjsConstantPayload, { className: "CjsConstantPayload" });
