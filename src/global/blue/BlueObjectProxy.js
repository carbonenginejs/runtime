// Source: blue/src/BlueObjectProxy.h:11-50
// Source: blue/src/BlueObjectProxy.cpp:9-165
// Source: blue/src/BlueObjectProxy_Blue.cpp:8-74
//
// A holder for one object that is built on demand and dropped after a period
// of disuse. GetObject reloads an unloaded object or asks the builder for a new
// one, and stamps the time of use; Update drops the object once it has gone
// unused for longer than the timeout - through IUnloadable when the object
// supports it, so it keeps its identity and only sheds state, otherwise by
// letting go of it so the builder can make a new one later.
//
// THE CLOCK IS REAL TIME. Update receives simulation time and ignores it
// (BlueObjectProxy.cpp:79, "it's sim time and we're operating in real time
// here"); both the stamp and the comparison read `BeOS->GetInfo()->mRealTime`,
// which here is `be.os.GetInfo().realTime` in Blue ticks.
//
// NOTE ON DECORATORS: this folder cannot use `@` syntax (see CcpTime.js), so
// the declarations are made imperatively at the bottom of the file.
import { CjsSchema, meta } from "#schema";
import { be } from "./blue.js";
import { IBlueObjectProxy } from "./IBlueObjectProxy.js";
import { IUnloadable } from "./IUnloadable.js";


/** `BlueObjectProxy` - Carbon's lazily built, unloadable holder for one object. */
export class BlueObjectProxy extends IBlueObjectProxy
{
  /**
   * `m_builder` - builds the object on demand; let go by SetObject and Freeze.
   * @type {import("./IBlueObjectBuilder.js").IBlueObjectBuilder|null}
   */
  builder = null;

  /**
   * `m_objectMarker` - passed to the builder to identify this proxy's object.
   * @type {number}
   */
  objectMarker = 0;

  /** `m_object` - the held object. */
  _object = null;

  /** `m_lastTimeUsed` - real time of the last GetObject, in Blue ticks. */
  _lastTimeUsed = 0;

  /** `m_temporary` - the held object is only a placeholder. */
  _temporary = false;

  /** `m_isUnloaded` - the held object has released its state through IUnloadable. */
  _isUnloaded = false;

  /**
   * The Blue property `object` (`_Blue.cpp:17-23`): reads through GetObject.
   *
   * Not supported: Carbon also maps a PERSISTONLY attribute named `object`
   * onto `m_object` (`_Blue.cpp:25-31`), so writers persist the held object
   * without building it. JavaScript cannot give one name both an accessor and
   * a stored member, so the persisted form is not declared and a proxy is
   * written without its object. No EVE or Frontier `.black` or `.yaml` file
   * contains a BlueObjectProxy (tools-core scan, 2026-10-11).
   *
   * @returns {object|null} The object, built or reloaded first if needed.
   */
  get object()
  {
    return this.GetObject();
  }

  /**
   * The Blue property `object`: writes through SetObject.
   *
   * @param {object|null} value The object to hold.
   */
  set object(value)
  {
    this.SetObject(value);
  }

  /**
   * The Blue property `temporary` (`_Blue.cpp:46-52`).
   *
   * @returns {boolean} Whether the held object is a placeholder.
   */
  get temporary()
  {
    return this.IsTemporary();
  }

  /**
   * The Blue property `temporary`.
   *
   * @param {boolean} value Whether the held object is a placeholder.
   */
  set temporary(value)
  {
    this.SetTemporary(value);
  }

  /**
   * The read-only Blue property `isResident` (`_Blue.cpp:54-59`).
   *
   * @returns {boolean} Whether an object is held.
   */
  get isResident()
  {
    return this.IsResident();
  }

  /**
   * `OnObjectInvalidated` - tells the builder the held object is about to
   * change (cpp:22-28). Protected in Carbon.
   *
   * @returns {void}
   */
  _OnObjectInvalidated()
  {
    if (this._object && this.builder)
    {
      this.builder.OnObjectDestroyed(this.objectMarker, this);
    }
  }

  /**
   * `SetBuilder` - who builds the object, and its marker (cpp:30-36). The
   * previous builder is told first.
   *
   * @param {import("./IBlueObjectBuilder.js").IBlueObjectBuilder|null} builder The builder.
   * @param {number} objectMarker Marker passed back to the builder.
   * @returns {void}
   */
  SetBuilder(builder, objectMarker)
  {
    this._OnObjectInvalidated();

    this.builder = builder;
    this.objectMarker = objectMarker;
  }

  /**
   * `GetObject` - reloads an unloaded object, asks the builder for a missing
   * one, and stamps the real time of use (cpp:38-60).
   *
   * @returns {object|null} The object, or null when there is none and no builder.
   */
  GetObject()
  {
    if (this._isUnloaded && this._object)
    {
      // m_isUnloaded only becomes true when the object supports IUnloadable.
      CjsSchema.cast(this._object, IUnloadable).ReloadWhenReferenced();
      this._isUnloaded = false;
    }

    if (!this._object && this.builder)
    {
      this._object = this.builder.CreateObject(this.objectMarker, this);
    }

    this._lastTimeUsed = be.os.GetInfo().realTime;

    return this._object;
  }

  /**
   * `ClearObject` - drops the object, telling the builder (cpp:62-66).
   *
   * @returns {void}
   */
  ClearObject()
  {
    this._OnObjectInvalidated();
    this._object = null;
  }

  /**
   * `Update` - unloads the object once it has gone unused, in real time, for
   * longer than `timeout` (cpp:68-104). Nothing happens without an object, a
   * timeout or a builder to make it again.
   *
   * @param {number} _time Simulation time in Blue ticks; unused, as in Carbon.
   * @param {number} timeout Disuse period in Blue ticks; zero never unloads.
   * @returns {boolean} True when this call unloaded the object.
   */
  Update(_time, timeout)
  {
    if (this._isUnloaded)
    {
      return false;
    }

    if (this._object && timeout && this.builder)
    {
      const delta = be.os.GetInfo().realTime - this._lastTimeUsed;
      if (delta > timeout)
      {
        this._OnObjectInvalidated();

        const objectAsUnloadable = CjsSchema.cast(this._object, IUnloadable);
        if (objectAsUnloadable)
        {
          objectAsUnloadable.UnloadWhenUnreferenced();
          this._isUnloaded = true;
        }
        else
        {
          this._object = null;
        }

        return true;
      }
    }

    return false;
  }

  /**
   * `IsResident` - whether an object is held (cpp:106-109). An unloaded
   * IUnloadable object is still held.
   *
   * @returns {boolean} True while an object is held.
   */
  IsResident()
  {
    return this._object !== null;
  }

  /**
   * `SetTemporary` (cpp:111-114).
   *
   * @param {boolean} isTemporary Whether the held object is a placeholder.
   * @returns {void}
   */
  SetTemporary(isTemporary)
  {
    this._temporary = isTemporary;
  }

  /**
   * `IsTemporary` (cpp:116-119).
   *
   * @returns {boolean} Whether the held object is a placeholder.
   */
  IsTemporary()
  {
    return this._temporary;
  }

  /**
   * `OnSelected` - tells the builder its object is the active level of
   * detail (cpp:121-127).
   *
   * @returns {void}
   */
  OnSelected()
  {
    if (this.builder)
    {
      this.builder.OnSelected(this.objectMarker, this);
    }
  }

  /**
   * `SetObject` - holds this object and lets go of the builder (cpp:129-134).
   *
   * @param {object|null} obj The object.
   * @returns {void}
   */
  SetObject(obj)
  {
    this._OnObjectInvalidated();
    this._object = obj;
    this.builder = null;
  }

  /**
   * `SetObjectFromBuilder` - replaces the object without notifying the builder
   * or letting go of it (cpp:136-139).
   *
   * @param {object|null} obj The object.
   * @returns {void}
   */
  SetObjectFromBuilder(obj)
  {
    this._object = obj;
  }

  /**
   * `Freeze` - builds the object if missing, then lets go of the builder so it
   * is never unloaded (cpp:141-150).
   *
   * @returns {void}
   */
  Freeze()
  {
    if (!this._object && this.builder)
    {
      this._object = this.builder.CreateObject(this.objectMarker, this);
    }
    this.builder = null;
  }
}

CjsSchema.define(BlueObjectProxy, {
  className: "BlueObjectProxy",
  carbon: "BlueObjectProxy",
  family: "blue",
  fields: {
    object: [ meta.blue.readwrite, meta.type.rootRef("IRoot") ],
    builder: [ meta.blue.readwrite, meta.type.rootRef("IBlueObjectBuilder") ],
    objectMarker: [ meta.blue.readwrite, meta.type.uint32 ],
    temporary: [ meta.blue.readwrite, meta.type.boolean ],
    isResident: [ meta.blue.read, meta.type.boolean ]
  },
  methods: {
    SetBuilder: [ meta.implemented ],
    GetObject: [ meta.implemented ],
    ClearObject: [ meta.implemented ],
    Update: [ meta.implemented ],
    IsResident: [ meta.implemented ],
    SetTemporary: [ meta.implemented ],
    IsTemporary: [ meta.implemented ],
    OnSelected: [ meta.implemented ],
    SetObject: [ meta.implemented ],
    Freeze: [ meta.blue.method, meta.implemented ],
    SetObjectFromBuilder: [ meta.blue.method, meta.implemented ],
    _OnObjectInvalidated: [ meta.implemented ]
  }
});
meta.blue.interface(IBlueObjectProxy)(BlueObjectProxy);
