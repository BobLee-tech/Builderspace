/** Compiles and links a shader pair; returns null so callers can fall back. */
export function createProgram(
  gl: WebGLRenderingContext,
  vertSrc: string,
  fragSrc: string,
): WebGLProgram | null {
  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("[webgl]", gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, vertSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("[webgl]", gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}
