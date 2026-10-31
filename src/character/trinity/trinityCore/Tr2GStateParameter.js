import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2GStateParameter.h
import { type } from "#schema";
import { IInitialize } from "#blueexposure/IInitialize";

/** Named, node-scoped scalar value for a character GState animation. */
@be.define("Tr2GStateParameter")
@be.mapInterface(IInitialize)
export class Tr2GStateParameter extends IInitialize
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  name = "";

  /** m_value (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.float32
  value = 0;

  /** m_nodeName (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  nodename = "";

  /**
   * Carbon method GetName (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  GetName()
  {
    return this.name;
  }

  /**
   * Carbon method GetNodeName (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  GetNodeName()
  {
    return this.nodename;
  }

  /**
   * Carbon method GetValue (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  GetValue()
  {
    return this.value;
  }

  /**
   * Carbon method SetName (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Carbon method SetNodeName (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  SetNodeName(name)
  {
    this.nodename = String(name ?? "");
  }

  /**
   * Carbon method SetValue (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  SetValue(value)
  {
    this.value = Number(value);
  }

  /**
   * Reports successful portable initialization for the persisted parameter
   * record.
   *
   * @implemented
   */
  Initialize()
  {
    return true;
  }

}

