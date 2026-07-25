// Source: E:\carbonengine\trinity\trinity\Eve\EvePicking.h
// Source: E:\carbonengine\trinity\trinity\Eve\EvePicking.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\EvePicking_Blue.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";

@type.define({ className: "EvePickingContext", family: "eve/scene" })
export class EvePickingContext extends CjsModel
{
  @type.list("EvePendingPickingReadback")
  readbacks = [];

  @type.uint32
  lastPickedX = 0;

  @type.uint32
  lastPickedY = 0;

  @type.objectRef("IRoot")
  lastPickedObject = null;

  @type.uint32
  lastPickedArea = 0;

  @carbon.method
  @impl.implemented
  UpdateResult(x, y, object, area)
  {
    this.lastPickedX = Number(x) >>> 0;
    this.lastPickedY = Number(y) >>> 0;
    this.lastPickedObject = object ?? null;
    this.lastPickedArea = Number(area) >>> 0;
  }

  @carbon.method
  @impl.implemented
  GetObject()
  {
    return this.lastPickedObject;
  }

  @carbon.method
  @impl.implemented
  GetArea()
  {
    return this.lastPickedArea;
  }
}
