// FT-02 wordmark fills, drawn live in WebGL in the brand palette with film grain (from the locked mock).
// Windows (locked): the city's towers with lights coming on. Also Sky, Lake, Traffic and Flap for review.
// Animates only while visible; reduced motion draws one still frame; no WebGL → returns null (flat fill).
const FS = `precision mediump float;uniform vec2 r;uniform float t;uniform int m;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
const vec3 PA=vec3(.969,.949,.906),CA=vec3(.706,.604,.471),RU=vec3(.663,.314,.243),CB=vec3(.125,.145,.129),YE=vec3(.894,.733,.247);
void main(){vec2 px=gl_FragCoord.xy;vec2 uv=px/r.y;vec3 c;
 if(m==0){
  float q=fb(uv*vec2(1.2,2.2)+vec2(t*.03,0.));float w=fb(uv*2.6+q+vec2(t*.05,0.));
  c=mix(vec3(.47,.47,.45),vec3(.86,.84,.8),smoothstep(.3,.78,w));c=mix(c,CA,smoothstep(.7,.95,q)*.25);
 } else if(m==1){
  float d=fb(vec2(uv.x*1.5-t*.04,uv.y*6.));float b=sin(uv.y*90.+d*9.+t*.6);
  c=mix(vec3(.17,.2,.19),vec3(.32,.33,.3),.5+.5*b);float gl=smoothstep(.93,1.,b)*smoothstep(.55,.8,fb(uv*3.+t*.05));c=mix(c,PA,gl*.7);
 } else if(m==2){
  float L=14.;float ln=floor(uv.y*L);float dir=mod(ln,2.)<1.?1.:-1.;float sp=.08+h(vec2(ln,3.))*.12;
  float x=uv.x*(1.2+h(vec2(ln,7.)))-t*sp*dir+h(vec2(ln,1.))*9.;float cell=floor(x*3.);float f=fract(x*3.);
  float on=step(.45,h(vec2(cell,ln)));float s=on*smoothstep(0.,.05,f)*smoothstep(.55,.2,f);
  float lane=smoothstep(.0,.12,fract(uv.y*L))*smoothstep(1.,.88,fract(uv.y*L));
  c=CB+vec3(.04);c=mix(c,dir>0.?YE:RU,s*lane);c=mix(c,PA,s*lane*smoothstep(.15,.05,f)*.6);
 } else if(m==3){
  vec2 g=vec2(26.,9.);vec2 id=floor(uv*g);vec2 f=fract(uv*g);float ph=t*.35+h(id)*6.;float k=floor(ph);float tr=fract(ph);
  float pick=h(id+k);vec3 a=pick<.4?CB:pick<.7?CA:pick<.9?PA:RU;
  float fl=smoothstep(.0,.12,tr);float sq=abs(f.y-.5)*2.;float closing=1.-fl;c=mix(CB,a,step(sq,1.-closing*.9));
  c*=1.-smoothstep(.04,.0,abs(f.y-.5))*.5;c*=1.-(step(f.x,.06)+step(.94,f.x)+step(f.y,.06)+step(.94,f.y))*.6;
 } else {
  vec2 g=vec2(64.,30.);vec2 id=floor(uv*g);vec2 f=fract(uv*g);float col=floor(id.x/4.);float bld=step(.25,h(vec2(col,2.)));
  float lit=step(.62,h(id+floor(t*.12+h(id)*5.)));float win=step(.18,f.x)*step(f.x,.82)*step(.2,f.y)*step(f.y,.8);
  c=CB+vec3(.03);c=mix(c,mix(CA,YE,h(id*1.3)),win*lit*bld);c=mix(c,vec3(.2,.22,.21),win*(1.-lit)*bld);
 }
 c+=(h(px+fract(t)*91.)-.5)*.08;gl_FragColor=vec4(c,1.);}`;
const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}';
export const FILLS = { sky: 0, lake: 1, traffic: 2, flap: 3, windows: 4 };

/**
 * Draws a fill into canvas. Returns { setFill(name), stop() } or null without WebGL.
 * `still` draws a single frame (reduced motion).
 */
export function windowShader(canvas, { fill = 'windows', still = false } = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(program, 'r');
  const uT = gl.getUniformLocation(program, 't');
  const uM = gl.getUniformLocation(program, 'm');

  let mode = FILLS[fill] ?? FILLS.windows;
  let raf = 0;
  let visible = false;
  const t0 = performance.now();

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uR, w / dpr, h / dpr);
    gl.uniform1f(uT, still ? 20 : (performance.now() - t0) / 1000 + 20);
    gl.uniform1i(uM, mode);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function loop() {
    draw();
    raf = visible && !still ? requestAnimationFrame(loop) : 0;
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) loop();
  });
  io.observe(canvas);
  new ResizeObserver(() => draw()).observe(canvas);
  draw();

  return {
    setFill(name) {
      mode = FILLS[name] ?? mode;
      draw();
    },
    stop() {
      cancelAnimationFrame(raf);
      io.disconnect();
    },
  };
}
