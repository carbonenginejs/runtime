// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Utils\EveLocator2.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Utils\EveLocator2.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


@type.define({
  className: "EveLocator2",
  family: "eve/utils"
})
export class EveLocator2 extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.mat4
  transform = mat4.create();

  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name);
  }
  @carbon.method
  @impl.implemented
  GetTransform()
  {
    return this.transform;
  }
  @carbon.method
  @impl.implemented
  SetTransform(value)
  {
    mat4.copy(this.transform, value);
  }
}
