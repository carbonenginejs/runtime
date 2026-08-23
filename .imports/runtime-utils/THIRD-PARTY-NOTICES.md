# Third-Party Notices

## gl-matrix

This package depends on `gl-matrix` and extends its vector, quaternion, and
matrix containers with CarbonEngineJS helpers.

- Project: <https://github.com/toji/gl-matrix>
- License: MIT

## ccpwgl math extraction

Most container modules in `src` were extracted from ccpwgl's
`src/global/math` library and converted to standalone ESM with package-local
imports. The code remains MIT-licensed under the CarbonEngineJS/ccpwgl project
license.

- Project: <https://github.com/cppctamber/ccpwgl2>
- Copyright: 2020 ccpgames rawrafox cppctamber
- License: MIT; terms reproduced below

## Mapbox earcut helper

`src/geometry/helpers/earcut.js` is an embedded copy of an Earcut-style
triangulation helper from the ccpwgl math tree.

- Copyright: 2016, Mapbox
- License: ISC
- Local license copy: `src/geometry/helpers/LICENSE`

## Three.js-derived geometry helpers

Math and geometry helpers in the extracted ccpwgl tree retain source comments
attributing conversions to Three.js authors.

- Project: <https://github.com/mrdoob/three.js>
- Copyright: 2010-2026 three.js authors
- License: MIT; terms reproduced below

## Fenris Creations / CCP Games tangent behavior

`src/tangent.js` implements CarbonEngineJS/GR2 packed tangent-frame behavior
derived from observed EVE/Carbon shader behavior and generated test vectors.
No Fenris Creations (CCP Games) shader source, tools, or assets are included.

## MIT terms for ccpwgl and Three.js material

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
