uniform sampler2D map;
uniform float clipX;
uniform float clipY;
uniform float clipWidthX;
uniform float clipWidthY;
uniform float time; // unused
uniform float hue;
uniform float saturation;
varying vec2 vUv;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {

  vec4 color = texture2D(map, vUv);

  vec3 lineColorRgb = hsv2rgb(vec3(hue, saturation, 1.));
  vec4 lineColor = vec4(lineColorRgb, (color.r + color.g + color.b) / 3.);

  color *= step(clipX, vUv.x);
  color *= step(clipY, vUv.y);

  bool isClipXEdge = (vUv.x >= clipX) && (vUv.x <= clipX + clipWidthX - 0.001);
  bool isClipYEdge = (vUv.y >= clipY) && (vUv.y <= clipY + clipWidthY - 0.001);
  color = isClipXEdge || isClipYEdge ? lineColor : color;

  gl_FragColor = color;

}