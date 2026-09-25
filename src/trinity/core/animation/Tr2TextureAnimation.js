// Source: trinity/trinity/Tr2TextureAnimation.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";

/** Advances a multi-channel texture flipbook, tracking frame and restart state per channel. */
@type.define({ className: "Tr2TextureAnimation", family: "trinityCore" })
export class Tr2TextureAnimation extends CjsModel
{

  #channels = new Map();

  /** m_fps (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  fps = 1;

  /** m_frame (uint32_t) [READ] */
  @edit.read
  @type.uint32
  frame = 0;

  /** m_time (float) [READ] */
  @edit.read
  @type.float32
  time = 0;

  /** m_paused (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  paused = false;

  /** m_updateOnlyWhenRendered (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  updateOnlyWhenRendered = true;

  /** m_filename (std::wstring) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  resPath = "";

  /** m_looped (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  looped = true;

  /** Carbon method GetChannelNames (MAP_METHOD_AND_WRAP). */
  /**
   * The names of the animated texture channels.
   */
  @carbon.method
  @impl.adapted
  GetChannelNames()
  {
    return Array.from(this.#channels.keys());
  }

  /** Carbon method RestartAnimation (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("The browser resets its CPU frame clock and delegates decoder rewind to attached channel adapters instead of Carbon's VTA worker thread.")
  RestartAnimation()
  {
    this.frame = 0;
    this.time = 0;
    for (const channel of this.#channels.values())
    {
      if (typeof channel?.Restart === "function")
      {
        channel.Restart();
      }
      else
      {
        channel?.Reset?.();
      }
    }
  }

  /** Attaches already-decoded browser VTA channel adapters. */
  @impl.adapted
  SetChannels(channels)
  {
    this.#channels.clear();
    if (channels instanceof Map)
    {
      for (const [name, channel] of channels)
      {
        this.#channels.set(String(name), channel);
      }
    }
    else if (channels && typeof channels === "object")
    {
      for (const [name, channel] of Object.entries(channels))
      {
        this.#channels.set(name, channel);
      }
    }
  }

  /**
   * The texture currently showing on one animated channel.
   */
  @impl.adapted
  GetTexture(channel)
  {
    const value = this.#channels.get(String(channel ?? ""));
    return value?.texture ?? value ?? null;
  }

  static RestartState = Object.freeze({
    NotRestarting: 0,
    WaitingToRestart: 1,
    WaitingForFrame: 2,
  });

}
