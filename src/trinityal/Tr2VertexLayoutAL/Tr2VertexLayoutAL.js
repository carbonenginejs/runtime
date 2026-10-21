// Source: trinity/trinityal/include/Tr2VertexLayoutAL.h
// Source: trinity/trinityal/src/Tr2VertexLayoutAL.cpp
//
// The backend-neutral vertex layout: Carbon's PIMPL value. The effect state
// manager interns one per vertex declaration (`s_vertexLayoutMap`,
// `Tr2EffectStateManager.cpp:875`), it is invalid until `Create` fills it on
// first apply (`:899-906`), and a render context holds the bound one by value
// (`Tr2RenderContextDx11.h:252`, `Tr2RenderContextMetal.h:305`).
//
// Carbon declares no accessor for the implementation: the render contexts and
// `PSODescription` read `m_layout` as friends (`Tr2VertexLayoutAL.h:35-37`).
// Ours read `_layout.implementation` the same way.
//
// The render context allocates the implementation where Carbon includes the
// platform's `TrinityALImpl::Tr2VertexLayoutAL` at compile time
// (`TRINITY_AL_PLATFORM_INCLUDE`, `Tr2VertexLayoutAL.cpp:5`): we ship every
// backend at once, so the context that knows its backend is the factory
// (`CreateVertexLayout(definition, true)`).
import { CjsSchema, meta, blue, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult, Failed } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";


/**
 * Carbon's `NullLayout()` (`Tr2VertexLayoutAL.cpp:9-13`): the one shared
 * default implementation every uncreated handle points at. Carbon's is the
 * platform impl default-constructed; the handle here is backend-neutral, so
 * this answers as the stub's default-constructed impl does - no definition,
 * so invalid, managed memory (`Tr2VertexLayoutALStub.h:16-32`). Its share count
 * is unbounded, so releasing a default handle never destroys it.
 */
const nullLayout = {
  owners: Infinity,
  implementation: {
    IsValid: () => false,
    GetMemoryClass: () => Tr2ALMemoryType.AL_MEMORY_MANAGED,
    SetName: () => ALResult.S_OK,
    Destroy: () => undefined
  }
};


/** A vertex layout value sharing one backend implementation. */
export class Tr2VertexLayoutAL
{
  /** m_layout: the shared implementation record; `nullLayout` until created. */
  _layout = nullLayout;

  /**
   * Carbon's default constructor (`Tr2VertexLayoutAL.cpp:16-19`) leaves the
   * value on `NullLayout()`. A `copy` replaces C++'s implicit copy
   * construction, sharing the implementation; plain JavaScript assignment
   * aliases instead.
   *
   * @param {object} [options] Copy construction.
   * @param {Tr2VertexLayoutAL|null} [options.copy] The value to share.
   */
  constructor({ copy = null } = {})
  {
    if (copy)
    {
      this._layout = copy._layout;
      this._layout.owners += 1;
    }
  }

  /**
   * Carbon's Create( definition, renderContext ) (`Tr2VertexLayoutAL.h:24`,
   * `Tr2VertexLayoutAL.cpp:21-30`): a fresh implementation replaces this
   * value's; a failure leaves it on the null implementation. That reset is
   * why the stub impl's "stored before checked" oddity never reaches a caller
   * through the handle.
   *
   * Adapted: the render context allocates the implementation instead of a
   * compile-time platform include. The previous share is released explicitly
   * because JavaScript has no shared_ptr; existing copies keep it alive.
   *
   * @param {object} definition A `Tr2VertexDefinition`, or its element list.
   * @param {object} renderContext The primary context to create against.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.adapted
  Create(definition, renderContext)
  {
    this.Destroy();

    const { result, implementation } = RenderContextALOf(renderContext).CreateVertexLayout(definition, true);
    if (Failed(result)) return result;

    this._layout = { implementation, owners: 1 };
    return result;
  }

  /**
   * Whether the implementation exists (`Tr2VertexLayoutAL.cpp:32-35`).
   *
   * @returns {boolean} True once created.
   */
  @blue.method
  @meta.implemented
  IsValid()
  {
    return this._layout.implementation.IsValid();
  }

  /**
   * Compares implementation identity (`Tr2VertexLayoutAL.cpp:37-40`).
   *
   * Adapted: JavaScript has no overloadable equality operator.
   *
   * @param {Tr2VertexLayoutAL} other The value to compare.
   * @returns {boolean} Whether both share one implementation.
   */
  @blue.method
  @meta.adapted
  Equals(other)
  {
    return this._layout === other._layout;
  }

  /**
   * The implementation's memory class (`Tr2VertexLayoutAL.cpp:42-45`).
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  @blue.method
  @meta.implemented
  GetMemoryClass()
  {
    return this._layout.implementation.GetMemoryClass();
  }

  /**
   * Names valid storage; an invalid value or an absent name keeps Carbon's
   * errors (`Tr2VertexLayoutAL.cpp:47-58`).
   *
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;
    if (name === null || name === undefined) return ALResult.E_INVALIDARG;
    return this._layout.implementation.SetName(name);
  }

  /**
   * Resets this value to the null implementation, Carbon's
   * `m_lastSetVertexLayout = Tr2VertexLayoutAL()` (`Tr2RenderContextDx11.cpp:866`).
   *
   * Ours (no blue stamp): JavaScript has no scope destructor or shared_ptr, so
   * the share is released explicitly; the implementation is destroyed with its
   * last share.
   */
  Destroy()
  {
    const owned = this._layout;
    this._layout = nullLayout;
    if (--owned.owners === 0) owned.implementation.Destroy();
  }
}

CjsSchema.decorateField(Tr2VertexLayoutAL, "_layout", type.unknown);
CjsSchema.decorateMethod(Tr2VertexLayoutAL, "Equals", meta.renamed("operator=="));
CjsSchema.meta.carbon("Tr2VertexLayoutAL")(Tr2VertexLayoutAL);
