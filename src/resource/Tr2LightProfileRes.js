// Source: trinity/trinity/Resources/Tr2LightProfileRes.h
import { exposure as be } from "#be";
import { CjsSchema, meta, blue } from "#schema";
import { CjsResource, ICacheable, blue as blueService } from "#blue";
import { assertResourcePayloadObject } from "./resourceBoundary.js";
import { HostBitmap, LoadParameters } from "#imageio";
import { PixelFormat, TextureType } from "#consts/render-context";
import { ResourceRequirement } from "#blue";
import { num } from "#math/num";
import { vec3 } from "#math/vec3";
import { mat4 } from "#math/mat4";
import { CjsIESFormat } from "./formats/ies/CjsIESFormat.js";
import { ImageIO } from "./imageio/ImageIO.js";

/** PROFILE_LIGHTMAP_SIZE (Tr2LightProfileRes.cpp:14): the profile strip's width. */
const PROFILE_LIGHTMAP_SIZE = 1024;

/** PROFILE_LIGHTMAP_FORMAT (Tr2LightProfileRes.cpp:15). */
const PROFILE_LIGHTMAP_FORMAT = PixelFormat.PIXEL_FORMAT_R16_FLOAT;

// GetThumbnail's constants and scratch (Tr2LightProfileRes.cpp:302-304). The rotation is
// Carbon's RotationMatrix( Vector3( 1, 0, 0 ), 0.3f ): the row-vector and column-vector
// rotation about X share their memory, so gl-matrix's matrix is it.
const THUMBNAIL_ROTATION = mat4.fromRotation(mat4.create(), 0.3, vec3.fromValues(1, 0, 0));
const THUMBNAIL_LIGHT = vec3.fromValues(0, 0.7, 0.98);
const THUMBNAIL_ORIGIN = vec3.create();
const THUMBNAIL_DIRECTION = vec3.create();
const THUMBNAIL_POINT_BACK = vec3.create();
const THUMBNAIL_POINT_BOTTOM = vec3.create();
const THUMBNAIL_LIGHT_DIR = vec3.create();

/**
 * IsCompatibleBitmap (Tr2LightProfileRes.cpp:17-24): a 2D, 1024x1, R16_FLOAT bitmap with
 * the full 11-level mip chain.
 *
 * @param {HostBitmap} bitmap The bitmap to test.
 * @returns {boolean} Whether it can be a light profile.
 */
function IsCompatibleBitmap(bitmap)
{
  return bitmap.GetType() === TextureType.TEX_TYPE_2D
    && bitmap.GetWidth() === PROFILE_LIGHTMAP_SIZE
    && bitmap.GetHeight() === 1
    && bitmap.GetFormat() === PROFILE_LIGHTMAP_FORMAT
    && bitmap.GetTrueMipCount() === 11;
}

/**
 * IsIesExtension (Tr2LightProfileRes.cpp:33-44): the path ends in `.ies`, any case.
 *
 * @param {string} path The path to test.
 * @returns {boolean} Whether it names an IES file.
 */
function IsIesExtension(path)
{
  return path.length >= 4 && path.slice(-4).toLowerCase() === ".ies";
}

/**
 * A `BlueStdResult` failure (BLUE_STD_RESULT_*) as an Error carrying the code.
 *
 * Adapted: Carbon answers a BlueStdResult and the exposure wrapper raises the Python
 * exception that matches its code; here the failure is the Error and `code` is the
 * Carbon enumerator name.
 *
 * @param {string} code The BLUE_STD_RESULT_* name.
 * @param {string} message The result's message.
 * @returns {Error} The error.
 */
function BlueStdResultError(code, message)
{
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * Runtime-owned light-profile resource.
 *
 * The attached plain payload may be richer than the data retained by the
 * resource or active engine adapter.
 */
export class Tr2LightProfileRes extends CjsResource
{
  // The light-profile array slice this resource occupies, or null before
  // registration. Carbon's DoPrepare acquires it (Tr2LightProfileRes.cpp:
  // 95-99: GetLightProfileArray().AddElement(m_bitmap)), but here the
  // resource layer cannot import trinity, so TRINITY registers the element
  // at first pack (Tr2LightManager._ProfileSlot) and hands the handle in
  // through RegisterProfileElement. Duck-typed on purpose: this class knows
  // only GetElementIndex/Release, never the array class.
  _element = null;

  /**
   * m_bitmap: the baked profile, a 1024x1 `PIXEL_FORMAT_R16_FLOAT` strip with a
   * full mip chain (Tr2LightProfileRes.cpp:13-15, 198-215). Invalid until loaded.
   */
  bitmap = new HostBitmap();

  /** Updates payload in the current resource payload lifecycle. */
  SetPayload(payload = null)
  {
    if (payload === null)
    {
      // Losing the payload releases the slice - Carbon's element handle
      // frees its slot when the resource lets go (Tr2TextureArray.cpp:
      // 233-236); with no destructors the unload path is the release site.
      if (this._element)
      {
        this._element.Release();
        this._element = null;
      }
      this.bitmap = new HostBitmap();
      super.SetPayload(null);
      return this;
    }
    assertResourcePayloadObject("Tr2LightProfileRes", payload);
    this.bitmap = Tr2LightProfileRes.bitmapFromBake(payload);
    super.SetPayload(payload);
    return this;
  }

  /**
   * Carbon's `m_bitmap`, which it hands to the light-profile array
   * (Tr2LightProfileRes.cpp:95-99).
   *
   * @returns {HostBitmap} The baked profile; invalid until loaded.
   */
  GetBitmap()
  {
    return this.bitmap;
  }

  /**
   * The baked profile as Carbon's bitmap. The IES bake already writes Carbon's
   * bytes - half floats, one mip after another - which is exactly a 1024x1
   * R16_FLOAT HostBitmap's memory, so this is a copy, not a conversion.
   *
   * @param {{width: number, samples: Uint16Array}} bake The IES reader's lightProfile output.
   * @returns {HostBitmap} The bitmap; invalid when the bake has no samples.
   */
  static bitmapFromBake(bake)
  {
    const bitmap = new HostBitmap();

    if (!(bake.samples instanceof Uint16Array)) return bitmap;
    if (!bitmap.Create(bake.width, 1, 0, PixelFormat.PIXEL_FORMAT_R16_FLOAT)) return bitmap;

    const raw = bitmap.GetRawData();
    raw.set(new Uint8Array(bake.samples.buffer, bake.samples.byteOffset, Math.min(bake.samples.byteLength, raw.byteLength)));
    return bitmap;
  }

  /**
   * Accepts the profile array slice handle from the trinity seam.
   *
   * @param {{GetElementIndex: Function, Release: Function}} element
   * @returns {Tr2LightProfileRes} this
   */
  RegisterProfileElement(element)
  {
    if (this._element && this._element !== element)
    {
      this._element.Release();
    }
    this._element = element ?? null;
    return this;
  }

  /**
   * The texture-array slice this profile occupies, or -1 when unregistered.
   *
   * Carbon returns the raw element index and an INVALID handle reports 0
   * (Tr2TextureArrayElement, cpp:216-219) - indistinguishable from slot 0,
   * with the +1 bias left to consumers. The -1 sentinel here is deliberate
   * (matching the proven ccpwgl port): the consumer maps negative to the
   * biased 0, and an unloaded profile can never alias slot 0.
   *
   * @returns {number} Slice index, or -1.
   */
  GetTextureIndex()
  {
    return this._element ? this._element.GetElementIndex() : -1;
  }


  /**
   * Carbon `IsMemoryUsageKnown` (Tr2LightProfileRes.cpp:53-56): known once loaded.
   *
   * @returns {boolean}
   */
  IsMemoryUsageKnown()
  {
    return !this.IsLoading();
  }

  /**
   * Carbon `GetMemoryUsage` (Tr2LightProfileRes.cpp:58-61): `PROFILE_LIGHTMAP_SIZE`
   * once good, otherwise 0.
   *
   * Adapted: asks `IsPrepared`, because `IsGood` here also renews the
   * resource, which would take it back out of the cache that is asking.
   *
   * @returns {number} Bytes.
   */
  GetMemoryUsage()
  {
    return this.IsPrepared() ? Tr2LightProfileRes.PROFILE_LIGHTMAP_SIZE : 0;
  }

  /** `PROFILE_LIGHTMAP_SIZE` (Tr2LightProfileRes.cpp:14): the profile strip's width. */
  static PROFILE_LIGHTMAP_SIZE = 1024;

  /**
   * Carbon: Tr2LightProfileRes::DoPrepare (Tr2LightProfileRes.cpp:95-99), protected:
   * `m_element = Tr2LightManager::GetLightProfileArray().AddElement( m_bitmap )`.
   *
   * Adapted: the resource layer cannot import trinity, so the array slice is acquired
   * by the first pack (Tr2LightManager._ProfileSlot), which hands it back through
   * RegisterProfileElement; nothing is left to prepare here.
   *
   * @returns {boolean} Always true, as Carbon's.
   */
  _DoPrepare()
  {
    return true;
  }

  /**
   * Parses the IES text into this resource's bitmap.
   *
   * Carbon: Tr2LightProfileRes::ParseIes() (Tr2LightProfileRes.cpp:101-107), private:
   * reads the whole `m_dataStream` and forwards it with `m_bitmap`.
   *
   * Adapted: the loader here owns the stream and hands decoded bytes to the resource,
   * so the contents arrive as an argument, as in Tr2EffectRes.DoLoad.
   *
   * @param {string} contents The IES file text.
   * @returns {boolean} Whether the contents parsed.
   */
  _ParseIes(contents)
  {
    return Tr2LightProfileRes._ParseIes__ContentsBitmap(contents, this.bitmap);
  }

  /**
   * Bakes IES text into a light-profile bitmap.
   *
   * Carbon: Tr2LightProfileRes::ParseIes( contents, bitmap ) (Tr2LightProfileRes.cpp:110-217),
   * private static. The bake itself (first horizontal slice, peak normalisation, the
   * 1024-texel cosine-uniform strip, the half-quantised mip chain) is
   * `CjsIESFormat`'s `lightProfile` output, ported from this function.
   *
   * Adapted: Carbon reads with an `istringstream`, which accepts any run of tokens and
   * leaves unread fields at zero. The format reader is strict (TILT=NONE, finite
   * numbers, complete tables, no trailing data), so some files Carbon would half-read
   * answer false here. Its TypeError becomes the false Carbon answers when the TILT line
   * is missing or not NONE.
   *
   * @param {string} contents The IES file text.
   * @param {HostBitmap} bitmap Receives the baked 1024x1 R16_FLOAT bitmap on success.
   * @returns {boolean} Whether the contents parsed.
   */
  static _ParseIes__ContentsBitmap(contents, bitmap)
  {
    let bake = null;

    try
    {
      bake = CjsIESFormat.read(new TextEncoder().encode(contents), { emit: "lightProfile" });
    }
    catch
    {
      return false;
    }

    bitmap.Swap(Tr2LightProfileRes.bitmapFromBake(bake));
    return true;
  }

  /**
   * Bakes the light profile of an IES file into a bitmap, for tools.
   *
   * Carbon: Tr2LightProfileRes::BakeLightProfile (Tr2LightProfileRes.cpp:219-247;
   * Tr2LightProfileRes.h), exposed as the module function "BakeLightProfile"
   * (Tr2LightProfileRes_Blue.cpp:19-23, MAP_FUNCTION_AND_WRAP, which the decorators
   * have no spelling for).
   *
   * Adapted: a Promise, because the read is asynchronous where
   * `BePaths->GetFileContentsWithYield` yields the tasklet. The output pointer is the
   * return value; a BlueStdResult failure is the rejection, with `code` set to
   * BLUE_STD_RESULT_VALUE_ERROR (not an .ies path), BLUE_STD_RESULT_IO_ERROR (no file)
   * or BLUE_STD_RESULT_RUNTIME_ERROR (parse failure). Tr2HostBitmap lives in trinity,
   * which this layer cannot import; the HostBitmap it derives from is returned.
   *
   * @param {string} path Path of the .ies file.
   * @returns {Promise<HostBitmap>} The baked bitmap.
   */
  static async BakeLightProfile(path)
  {
    if (!IsIesExtension(path))
    {
      throw BlueStdResultError("BLUE_STD_RESULT_VALUE_ERROR", "This function expects an .ies path");
    }

    const stream = await blueService.paths.GetStreamFromPath(path, { accept: [ "bytes" ] });
    if (stream === null)
    {
      throw BlueStdResultError("BLUE_STD_RESULT_IO_ERROR", `Unable to read ${path}`);
    }

    const output = new HostBitmap();
    const contents = new TextDecoder().decode(stream.data);

    if (!Tr2LightProfileRes._ParseIes__ContentsBitmap(contents, output))
    {
      throw BlueStdResultError("BLUE_STD_RESULT_RUNTIME_ERROR", "Failed to parse IES file");
    }

    return output;
  }

  /**
   * Renders a preview of the profile, for tools.
   *
   * Carbon: Tr2LightProfileRes::GetThumbnail (Tr2LightProfileRes.cpp:249-354;
   * Tr2LightProfileRes.h:25), exposed as "GetThumbnail" (Tr2LightProfileRes_Blue.cpp:34-38).
   * Re-reads the resource's own path, bakes it (IES) or decodes it (an image that must
   * satisfy IsCompatibleBitmap), then ray-casts a lit back wall and floor, lit from
   * (0, 0.7, 0.98), sampling the strip by the cosine of the angle below the light, and
   * writes the gamma-encoded grey into a B8G8R8X8 bitmap.
   *
   * Adapted: a Promise (the file read is asynchronous); the output pointer is the return
   * value and a BlueStdResult failure is the rejection with its `code`
   * (IO_ERROR, RUNTIME_ERROR, VALUE_ERROR). Tr2HostBitmap lives in trinity, so the
   * HostBitmap it derives from is returned. Carbon computes in float; this runs in
   * double precision, so a pixel on a rounding edge can differ by one level.
   *
   * Carbon quirk (cpp:288-292): the out-of-memory test is `!bitmap` on the smart pointer
   * just created, which is never null, so a failed Create is not reported and the pixel
   * loop would write through a null buffer. A failed Create throws on that write here.
   *
   * @param {number} width Thumbnail width.
   * @param {number} height Thumbnail height.
   * @returns {Promise<HostBitmap>} The thumbnail.
   */
  async GetThumbnail(width, height)
  {
    const stream = await blueService.paths.GetStreamFromPath(this.path, { accept: [ "bytes" ] });
    if (stream === null)
    {
      throw BlueStdResultError("BLUE_STD_RESULT_IO_ERROR", `Unable to read ${this.path}`);
    }

    const lightmap = new HostBitmap();

    if (IsIesExtension(this.path))
    {
      const contents = new TextDecoder().decode(stream.data);

      if (!Tr2LightProfileRes._ParseIes__ContentsBitmap(contents, lightmap))
      {
        throw BlueStdResultError("BLUE_STD_RESULT_RUNTIME_ERROR", "Failed to parse IES file");
      }
    }
    else
    {
      const result = await ImageIO.readImageAsync(stream.data, new LoadParameters(this.path), lightmap);

      if (!result.IsOk())
      {
        throw BlueStdResultError("BLUE_STD_RESULT_IO_ERROR", result.message);
      }
      if (!IsCompatibleBitmap(lightmap))
      {
        throw BlueStdResultError("BLUE_STD_RESULT_VALUE_ERROR", "The input texture has incompatible dimensions/format");
      }
    }

    const bitmap = new HostBitmap();
    bitmap.Create(width, height, 1, PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM);

    const rotation = THUMBNAIL_ROTATION;
    const light = THUMBNAIL_LIGHT;
    const aspectRatio = width / height;

    // Plane( 0, 0, 1, -1 ) and Plane( 0, 1, 0, 1 ): a, b, c, d.
    const back = { a: 0, b: 0, c: 1, d: -1 };
    const bottom = { a: 0, b: 1, c: 0, d: 1 };

    const origin = THUMBNAIL_ORIGIN;
    const direction = THUMBNAIL_DIRECTION;
    const pointBack = THUMBNAIL_POINT_BACK;
    const pointBottom = THUMBNAIL_POINT_BOTTOM;
    const lightDir = THUMBNAIL_LIGHT_DIR;

    // PlaneRay: the ray parameter, with the hit written into `point`.
    const planeRay = (plane, point) =>
    {
      const t = -(plane.d + origin[0] * plane.a + origin[1] * plane.b + origin[2] * plane.c)
        / (direction[0] * plane.a + direction[1] * plane.b + direction[2] * plane.c);
      vec3.scaleAndAdd(point, origin, direction, t);
      return t;
    };

    const lightmapData = lightmap.GetRawData();
    const lightmapView = new DataView(lightmapData.buffer, lightmapData.byteOffset, lightmapData.byteLength);
    const lightmapWidth = lightmap.GetWidth();
    const row = bitmap.GetRawData();

    for (let j = 0; j < height; ++j)
    {
      let offset = j * bitmap.GetPitch();

      for (let i = 0; i < width; ++i)
      {
        let x = i / width * 2 - 1;
        let y = -j / height * 2 + 1;

        x *= 1.3 * aspectRatio;
        y *= 1.3;

        vec3.set(origin, x, y - 0.2, -1);
        vec3.set(direction, 0, 0, 1);

        // TransformCoord and TransformNormal: a pure rotation, so w stays 1 and the
        // translation is zero for both.
        vec3.transformMat4(origin, origin, rotation);
        vec3.transformMat4(direction, direction, rotation);

        const t0 = planeRay(back, pointBack);
        const t1 = planeRay(bottom, pointBottom);
        const p = t0 < t1 ? pointBack : pointBottom;

        vec3.subtract(lightDir, p, light);
        vec3.normalize(lightDir, lightDir);

        const cs = -lightDir[1];

        const lmx = Math.max(0, (-cs * 0.5 + 0.5) * lightmapWidth);
        const weight = lmx - Math.floor(lmx);
        const coord0 = Math.min(Math.trunc(lmx), lightmapWidth - 1);
        const coord1 = Math.min(coord0 + 1, lightmapWidth - 1);

        const intensity0 = num.fromHalfFloat(lightmapView.getUint16(coord0 * 2, true));
        const intensity1 = num.fromHalfFloat(lightmapView.getUint16(coord1 * 2, true));

        let intensity = intensity0 * (1 - weight) + intensity1 * weight;
        intensity = Math.pow(intensity, 1 / 2.4);

        // uint8_t( intensity * 255 ): a Uint8Array store truncates and wraps the same way.
        row[offset++] = intensity * 255;
        row[offset++] = intensity * 255;
        row[offset++] = intensity * 255;
        row[offset++] = intensity * 255;
      }
    }

    return bitmap;
  }

  static payload = ResourceRequirement.LIGHT_PROFILE;
}


CjsSchema.decorateMethod(Tr2LightProfileRes, "GetTextureIndex", meta.adapted);
CjsSchema.decorateMethod(Tr2LightProfileRes, "IsMemoryUsageKnown", blue.method, meta.implemented);
CjsSchema.decorateMethod(Tr2LightProfileRes, "GetMemoryUsage", blue.method, meta.adapted);
CjsSchema.decorateMethod(Tr2LightProfileRes, "_DoPrepare", meta.adapted);
CjsSchema.decorateMethod(Tr2LightProfileRes, "_ParseIes", meta.adapted);
CjsSchema.decorateMethod(Tr2LightProfileRes, "_ParseIes__ContentsBitmap", meta.adapted);
CjsSchema.decorateMethod(Tr2LightProfileRes, "BakeLightProfile", meta.adapted);
CjsSchema.decorateMethod(Tr2LightProfileRes, "GetThumbnail", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.exposure.define("Tr2LightProfileRes")(Tr2LightProfileRes);
blue.inherit(ICacheable)(Tr2LightProfileRes, { kind: "class" });
CjsSchema.exposure.mapInterface(ICacheable)(Tr2LightProfileRes);
