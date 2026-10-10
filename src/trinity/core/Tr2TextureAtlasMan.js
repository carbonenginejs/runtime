// Source: trinity/trinity/Tr2TextureAtlasMan.h
// Source: trinity/trinity/Tr2TextureAtlasMan.cpp
// Maintained per-realm atlas registry.
import { meta } from "#schema";
import { Tr2TextureAtlas } from "./Tr2TextureAtlas.js";

/** Holds the collection of texture atlases exposed through Carbon's atlas allocation service. */
@meta.define({ className: "Tr2TextureAtlasMan", family: "trinityCore", purpose: "Holds the collection of texture atlases exposed through Carbon's atlas allocation service." })
export class Tr2TextureAtlasMan
{

  /** m_atlases (PTr2TextureAtlasVectorRO) [READ] */
  @meta.blue.read
  @meta.type.list("Tr2TextureAtlas")
  atlases = [];

  /** Finds the first atlas of the requested format, as native. */
  @meta.implemented
  FindAtlas(format) { return this.atlases.find(atlas => atlas.GetFormat() === format) ?? null; }

  /** Adds and prepares the single atlas for this pixel format. */
  @meta.blue.method
  @meta.implemented
  AddAtlas(format, width, height)
  {
    if (this.FindAtlas(format)) throw new Error("An atlas for this pixel format already exists.");
    const atlas = new Tr2TextureAtlas();
    atlas.Initialize(format, width, height);
    this.atlases.push(atlas);
  }

  /** Removes manager ownership; existing texture views retain their atlas. */
  @meta.blue.method
  @meta.implemented
  RemoveAtlas(format)
  {
    const index = this.atlases.findIndex(atlas => atlas.GetFormat() === format);
    if (index !== -1) this.atlases.splice(index, 1);
  }
}

/** Native global service, isolated per JavaScript realm. */
export const g_textureAtlasMan = new Tr2TextureAtlasMan();
