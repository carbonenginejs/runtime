import { CjsGraph } from "../../../global/model/graph/CjsGraph.js";
import { exposure as be } from "#be";
import { ITr2TextureProvider } from "../ITr2TextureProvider.js";
import { IRoot } from "../../../blue/exposure/IRoot.js";
import { Tr2DeviceResource } from "../device/Tr2DeviceResource.js";
import { Tr2DeviceResourceState } from "../device/deviceResourceState.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { Tr2SubresourceData } from "../../../trinityal/Tr2HalHelperStructures/Tr2SubresourceData.js";
// Source: trinity/trinity/Tr2TextureArray.h
//   trinity/trinity/Tr2TextureArray.cpp
//
// DEVICE RESIDENCY. Carbon builds the array's texture inside AddElement. Ours builds it on the device tick:
// AddElement drops the stale texture and registers the array, and OnPrepareResources creates the texture from
// the elements, as Carbon's own prepare does (cpp:136-144). Nothing here creates GPU storage outside the tick.

import { type } from "#schema";
import { Tr2Event } from "../Tr2Event.js";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { BitmapDimensions, HostBitmap } from "#imageio";
import { Tr2TextureArrayElement } from "./Tr2TextureArrayElement.js";
import "#consts/renderContext/resources";

/**
 * Describes a texture array's elements, dimensions, resource usage, upload increment, backing texture, and change callback.
 * Carbon: Tr2TextureArray (trinity/trinity/Tr2TextureArray.h:36-38)
 */
@be.define("Tr2TextureArray")
@be.inherit(ITr2TextureProvider, Tr2DeviceResource)
@be.mapInterface(ITr2TextureProvider)
export class Tr2TextureArray extends IRoot
{

    /** m_elements (std::vector<ImageIO::HostBitmap>) */
    @type.array("ImageIO::HostBitmap")
    elements = [];

    /** m_texture (Tr2TextureAL) */
    @type.rawStruct("Tr2TextureAL")
    texture = null;

    /** m_dimensions (Tr2BitmapDimensions) */
    @type.rawStruct("Tr2BitmapDimensions")
    dimensions = null;

    /** m_onTextureChange (OnTextureChangeEvent) */
    @type.rawStruct("OnTextureChangeEvent")
    onTextureChange = new Tr2Event();

    /** m_increment (uint32_t) */
    @type.uint32
    increment = 16;

    /** m_cpuUsage (Tr2CpuUsage::Type - enum Tr2CpuUsage) */
    @type.int32
    @type.enum("trinity.Tr2CpuUsage")
    cpuUsage = 0;

    /** m_gpuUsage (Tr2GpuUsage::Type - enum Tr2GpuUsage) */
    @type.int32
    @type.enum("trinity.Tr2GpuUsage")
    gpuUsage = 16;


    #revision = 0;

    /**
     * Pins the dimension gate before the first element arrives
     * (Tr2TextureArray.cpp:9-15): ignored once a texture exists.
     *
     * @param {BitmapDimensions} dimensions The dimensions every element must have.
     */
    SetExpectedElementDimensions(dimensions)
    {
        if (this.texture) return;
        this.dimensions = dimensions;
    }

    /**
     * Adds one element (Tr2TextureArray.cpp:18-79).
     *
     * Carbon's dimension gate REJECTS a bitmap whose type, format, width,
     * height, depth or true mip count differs from the array's - silently, with
     * an invalid handle - which is how a wrong-mip-count light profile fails to
     * register. Slots are reused first-fit over released elements, the bitmap
     * is copied in, and the array size rounds up to a multiple of `increment`.
     *
     * @adapted Carbon rebuilds the GPU texture here (`CreateTexture`, cpp:66-72), and on failure takes the element back out and returns an invalid handle. Ours drops the stale texture, registers the array and lets the device tick rebuild it, so a failed creation is not seen here.
     * @param {HostBitmap} bitmap The element's bitmap.
     * @returns {Tr2TextureArrayElement} A valid handle, or an invalid one.
     */
    AddElement(bitmap)
    {
        if (!bitmap || !bitmap.IsValid()) return new Tr2TextureArrayElement();

        const gate = this.dimensions;
        if (gate && (
            gate.GetType() !== bitmap.GetType()
            || gate.GetFormat() !== bitmap.GetFormat()
            || gate.GetWidth() !== bitmap.GetWidth()
            || gate.GetHeight() !== bitmap.GetHeight()
            || gate.GetDepth() !== bitmap.GetDepth()
            || gate.GetTrueMipCount() !== bitmap.GetTrueMipCount()))
        {
            return new Tr2TextureArrayElement();
        }

        let index = this.elements.length;
        for (let i = 0; i < this.elements.length; i++)
        {
            if (!this.elements[i].IsValid())
            {
                index = i;
                break;
            }
        }
        if (index === this.elements.length) this.elements.push(new HostBitmap());

        const element = this.elements[index];
        element.CreateFromBitmapDimensions(bitmap);
        element.GetRawData().set(bitmap.GetRawData());

        this.dimensions = BitmapDimensions.create__AllFields(bitmap.GetType(), bitmap.GetFormat(), bitmap.GetWidth(), bitmap.GetHeight(), bitmap.GetDepth(), bitmap.GetTrueMipCount(), Math.ceil(this.elements.length / this.increment) * this.increment);

        // The texture no longer holds every element. Drop it, mark the array not prepared, and let the device tick
        // build the new one.
        if (this.texture) this.texture.Destroy();
        this.texture = null;
        if (!CjsGraph.isDestructed(this)) this._state = Tr2DeviceResourceState.NONE;
        this.KeepAlive();

        this.#revision += 1;
        this.onTextureChange.Broadcast();
        return new Tr2TextureArrayElement(this, index);
    }

    /**
     * Carbon GetTexture (cpp:81-84): the array's texture.
     *
     * @adapted Carbon returns its member, invalid until created; here that is null. Reading renews device residency and creates nothing.
     * @returns {object|null} The `Tr2TextureAL`, or null until the device tick has prepared it.
     */
    GetTexture()
    {
        this.KeepAlive();
        return this.texture && this.texture.IsValid() ? this.texture : null;
    }

    /**
     * Carbon: Tr2TextureArray::ReleaseResources (trinity/trinity/Tr2TextureArray.cpp:132-134).
     * @implemented Carbon leaves this hook empty, including for TRISTORAGE_ALL.
     * @param {number} _storage Storage flags, unused by Carbon.
     */
    ReleaseResources(_storage)
    {
    }

    /**
     * Carbon: Tr2TextureArray::OnPrepareResources (trinity/trinity/Tr2TextureArray.cpp:136-144): creates the
     * texture when there is none and there are elements, then raises the change event.
     *
     * @implemented
     * @returns {boolean} Always true, as Carbon's.
     */
    _OnPrepareResources()
    {
        if (!(this.texture && this.texture.IsValid()) && this.elements.length !== 0)
        {
            this.texture = this._CreateTexture();
            this.onTextureChange.Broadcast();
        }
        return true;
    }

    /**
     * Carbon: Tr2TextureArray::CreateTexture (trinity/trinity/Tr2TextureArray.cpp:146-199), on the main-thread
     * context: one subresource per mip of every slice up to the array size, in slice order.
     *
     * Carbon quirk, reproduced: a released or unused slice is filled with the LAST valid element's mip 0 data,
     * pitch and size at every mip level (cpp:155-159, 185-191), not that element's own smaller mips.
     *
     * @adapted Returns null where Carbon returns an invalid Tr2TextureAL.
     * @returns {object|null} The new `Tr2TextureAL`, or null when the backend refused it.
     */
    _CreateTexture()
    {
        const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
        const mipCount = this.dimensions.GetTrueMipCount();
        const initialData = [];
        let filler = null;

        for (let e = 0; e < this.elements.length; e++)
        {
            const element = this.elements[e];
            if (element.IsValid())
            {
                filler = element;
                for (let i = 0; i < mipCount; i++)
                {
                    initialData.push(new Tr2SubresourceData(element.GetMipRawData(i), element.GetMipPitch(i), element.GetMipSize(i)));
                }
            }
            else
            {
                for (let i = 0; i < mipCount; i++) initialData.push(null);
            }
        }

        for (let slice = this.elements.length; slice < this.dimensions.GetArraySize(); slice++)
        {
            for (let i = 0; i < mipCount; i++) initialData.push(null);
        }

        if (filler === null)
        {
            return renderContext.CreateTexture(this.dimensions, { gpuUsage: this.gpuUsage, cpuUsage: this.cpuUsage });
        }

        for (let i = 0; i < initialData.length; i++)
        {
            if (initialData[i] === null)
            {
                initialData[i] = new Tr2SubresourceData(filler.GetMipRawData(0), filler.GetMipPitch(0), filler.GetMipSize(0));
            }
        }
        return renderContext.CreateTexture(this.dimensions, { gpuUsage: this.gpuUsage, cpuUsage: this.cpuUsage, initialData });
    }

    /**
     * Carbon: ~Tr2TextureArray, implicit: m_texture (trinity/trinity/Tr2TextureArray.h:72).
     * @adapted Explicit Destroy replaces the member destructor. Graph dispatch handles bases.
     */
    _Destructor()
    {
        if (this.texture) this.texture.Destroy();
        this.texture = null;
    }

    /**
     * Frees one slice (cpp:127-130): the slot becomes reusable; dimensions
     * and array size are deliberately untouched, exactly as Carbon leaves
     * the vector sized and the slot invalid.
     *
     * @param {number} index Slice index.
     */
    RemoveElement(index)
    {
        if (index >= 0 && index < this.elements.length)
        {
            this.elements[index] = new HostBitmap();
            this.#revision += 1;
            this.onTextureChange.Broadcast();
        }
    }

    /**
     * Carbon OnTextureChange (ITr2TextureProvider.h:16): the event fired when
     * the array's texture changes. Listeners register an owner and an unbound
     * method; the event holds owners weakly.
     *
     * @implemented
     * @returns {Tr2Event} m_onTextureChange.
     */
    OnTextureChange()
    {
        return this.onTextureChange;
    }

    /** An element's bitmap, or null for a released or missing slot. */
    GetElement(index)
    {
        const element = this.elements[index];
        return element && element.IsValid() ? element : null;
    }

    /**
     * Slots in the array, released ones included - Carbon returns
     * `m_elements.size()` (cpp:91-94).
     */
    GetElementCount()
    {
        return this.elements.length;
    }

    /** Current dimensions, or null before the first element. */
    GetDimensions()
    {
        return this.dimensions;
    }

    /** Element width; 0 before the first element (Carbon cpp:101-104). */
    GetWidth()
    {
        return this.dimensions ? this.dimensions.GetWidth() : 0;
    }

    /** Element height; 0 before the first element. */
    GetHeight()
    {
        return this.dimensions ? this.dimensions.GetHeight() : 0;
    }

    /** Slice capacity rounded to the increment; 0 before the first element. */
    GetArraySize()
    {
        return this.dimensions ? this.dimensions.GetArraySize() : 0;
    }

    /** Element pixel format, or null before the first element. */
    GetFormat()
    {
        return this.dimensions ? this.dimensions.GetFormat() : null;
    }

    /** Element mip count; 0 before the first element. */
    GetMipCount()
    {
        return this.dimensions ? this.dimensions.GetTrueMipCount() : 0;
    }

    /** Monotonic change counter for AL-side re-upload decisions. */
    GetRevision()
    {
        return this.#revision;
    }

    static Tr2CpuUsage = Tr2CpuUsage;

    static Tr2GpuUsage = Tr2GpuUsage;

}
