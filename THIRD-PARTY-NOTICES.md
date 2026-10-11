# Third-Party Notices

## gl-matrix

This package depends on `gl-matrix` and extends its vector, quaternion, and
matrix containers with CarbonEngineJS helpers.

- Project: <https://github.com/toji/gl-matrix>
- License: MIT

## DirectXMath decomposition

`src/global/math/mat4.js` adapts `XMMatrixDecompose` and its scalar quaternion
extraction from DirectXMath for `decomposeDirectX`.

- Project: <https://github.com/microsoft/DirectXMath>
- Copyright (c) Microsoft Corporation.
- License: MIT; terms reproduced below

## Resource format dependencies and retained notices

The CMF reader depends on `meshoptimizer`, and the YAML reader depends on
`yaml`. Format-specific licenses, behavioral-reference attribution, and copied
data notices are retained under `format-notices/`; this includes the
black-reader-js reference notice.

## ww2ogg

The WEM reader's Wwise Vorbis to Ogg repacker (`wemToOgg.js`,
`codebookLibrary.js`, `OggPageWriter` in `bitStream.js`) is a JavaScript
translation of ww2ogg, and its packed codebook data is a byte-identical copy of
ww2ogg's `packed_codebooks_aoTuV_603.bin`.

- Project: <https://github.com/hcs64/ww2ogg>
- Copyright (c) 2002, Xiph.org Foundation; Copyright (c) 2009-2016, Adam Gashlin
- License: BSD 3-clause; full text in `format-notices/wem/LICENSE`

## vgmstream

The WEM reader's PTADPCM decoder (`ptadpcm.js`), including its step table, is a
JavaScript translation of vgmstream's `src/coding/ptadpcm_decoder.c`.

- Project: <https://github.com/vgmstream/vgmstream>
- Copyright (c) 2008-2025 Adam Gashlin, Fastelbja, Ronny Elfert, bnnm,
  Christopher Snowhill, NicknineTheEagle, bxaimc, Thealexbarney, CyberBotX,
  EdnessP, et al
- License: vgmstream license (ISC-style); full text in `format-notices/wem/LICENSE`

## stb_vorbis

The Ogg reader's `Codebook.buildHuffman` translates stb_vorbis's
`compute_codewords`, and its fast lookup table follows stb_vorbis's design.

- Project: <https://github.com/nothings/stb>
- Copyright (c) 2017 Sean Barrett
- License: MIT or public domain (Unlicense), at the user's option; full text in
  `format-notices/ogg/LICENSE`

## ccpwgl math extraction

Most container modules in `src/global/math` were extracted from ccpwgl's
`src/global/math` library and converted to standalone ESM with package-local
imports. The code remains MIT-licensed under the CarbonEngineJS/ccpwgl project
license.

- Project: <https://github.com/cppctamber/ccpwgl2>
- Copyright: 2020 ccpgames rawrafox cppctamber
- License: MIT; terms reproduced below

## Mapbox earcut helper

`src/global/math/geometry/helpers/earcut.js` is an embedded copy of an Earcut-style
triangulation helper from the ccpwgl math tree.

- Copyright: 2016, Mapbox
- License: ISC
- Local license copy: `src/global/math/geometry/helpers/LICENSE`

## ccpwgl historical Incarna curve adaptations

The historical compatibility classes `Tr2ColorCurve`, `Tr2ColorKey`,
`Tr2ScalarCurve`, and `Tr2ScalarKey` under `src/character/incarna/curves` are
compact adaptations of CCPWGL curve implementations.

- Project: <https://github.com/cppctamber/ccpwgl2>
- Copyright: 2020 ccpgames rawrafox cppctamber
- License: MIT; terms reproduced below

## Three.js-derived geometry helpers

Math and geometry helpers in the extracted ccpwgl tree retain source comments
attributing conversions to Three.js authors.

- Project: <https://github.com/mrdoob/three.js>
- Copyright: 2010-2026 three.js authors
- License: MIT; terms reproduced below

## Fenris Creations / CCP Games tangent behavior

`src/global/math/tangent.js` implements CarbonEngineJS/GR2 packed tangent-frame behavior
derived from observed EVE/Carbon shader behavior and generated test vectors.
No Fenris Creations (CCP Games) shader source, tools, or assets are included.

## MIT terms for ccpwgl, Three.js and DirectXMath material

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notices and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## libsquish 1.15

Our JavaScript port lives in `src/resource/formats/dds/core/libsquish.js`, with
its single-colour lookup tables in `squishSingleColourLookup.js`. All ten
Carbon compressor modes use this MIT implementation. No id Software encoder
code is included.

Source: https://sourceforge.net/projects/libsquish/files/libsquish-1.15.tgz

Copyright (c) 2006 Simon Brown <si@sjbrown.co.uk>
Copyright (c) 2007 Ignacio Castano <icastano@nvidia.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

## CarbonEngine Trinity shader compiler

`src/shadercompiler` is a JavaScript port of Carbon's HLSL effect compiler,
`trinity/shadercompiler` in CarbonEngine. The HLSL and preprocessor grammars
under `src/shadercompiler` are transcribed from its `HLSLParser.y` and
`Preprocessor.y`. Each ported file names its Carbon source in its header.

- Project: <https://github.com/carbonengine>
- License: MIT

```text
MIT License

Copyright (c) 2026 Fenris Creations

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## CarbonEngine fsd

`src/resource/formats/fsd/32` is a JavaScript port of CarbonEngine's
open-source legacy FSD loader, the `fsd` repository. Each ported file names
its Carbon source in its header.

- Project: <https://github.com/carbonengine/fsd>
- License: MIT

```text
MIT License

Copyright (c) 2026 CCP Games

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## MD5 by Stephan Brumme

`src/shadercompiler/MD5.js` is an altered source version: a JavaScript
translation of CarbonEngine's modified copy of Stephan Brumme's MD5
(`trinity/shadercompiler/md5.cpp`, `md5.h`). It is not the original software.

- Original: md5.cpp, Copyright (c) 2014,2015 Stephan Brumme. All rights reserved.
  md5.h, Copyright (c) 2014 Stephan Brumme. All rights reserved.
- Project: <http://create.stephan-brumme.com/>
- License: the author's zlib-like license, from
  <http://create.stephan-brumme.com/disclaimer.html>:

```text
This software is provided 'as-is', without any express or implied warranty.
In no event will the author be held liable for any damages arising from the use of this software.
Permission is granted to anyone to use this software for any purpose, including commercial applications,
and to alter it and redistribute it freely, subject to the following restrictions:
 The origin of this software must not be misrepresented; you must not claim that you wrote the original software.
 If you use this software in a product, an acknowledgment in the product documentation would be appreciated but is not required.
 Altered source versions must be plainly marked as such, and must not be misrepresented as being the original software.
```

## LEMON parser generator by D. Richard Hipp

`src/shadercompiler/lemon` rebuilds LEMON's LALR(1) parse tables (`CjsFxLemon.js`, after
`tool/lemon.c`) and runs LEMON's parse loop (`CjsFxLemonParser.js`, after the
driver template `lempar.c`), so Carbon's grammars parse as Carbon's
LEMON-generated parsers do. LEMON was written by D. Richard Hipp and is
distributed with SQLite.

- Project: <https://sqlite.org/src/doc/trunk/doc/lemon.html>
- License: public domain.

`tool/lemon.c` (SQLite 3.39.3):

```text
The author of this program disclaims copyright.
```

`lempar.c`:

```text
2000-05-29

The author disclaims copyright to this source code.  In place of
a legal notice, here is a blessing:

   May you do good and not evil.
   May you find forgiveness for yourself and forgive others.
   May you share freely, never taking more than you give.
```
