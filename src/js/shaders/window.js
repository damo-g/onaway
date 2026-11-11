// FT-02 wordmark fills, drawn live in WebGL in the brand palette with film grain (from the locked mock).
// Windows (locked): the city's towers with lights coming on. For review (Nov 2026; lake, traffic, flap, platform and
// kraft retired): Sky; Route (a transit map: coloured lines with 45° jogs, stations, trains running) in four colourways
// (paper ground · carbon · camel · one ink with yellow trains); Dots (an arrival board: three lines in the site's 5×7
// dot-matrix font, src/js/dotmatrix.js, stepping past in amber, the unlit dots faint).
// Animates only while visible; reduced motion draws one still frame; no WebGL → returns null (flat fill).
const FS = `precision mediump float;uniform vec2 r;uniform vec2 R;uniform float t;uniform int m;uniform int pal;uniform sampler2D tx;uniform vec2 ts;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
const vec3 PA=vec3(.969,.949,.906),CA=vec3(.706,.604,.471),RU=vec3(.663,.314,.243),CB=vec3(.125,.145,.129),YE=vec3(.894,.733,.247);
void main(){vec2 px=gl_FragCoord.xy;vec2 uv=px/r.y;vec3 c;
 if(m==0){
  float q=fb(uv*vec2(1.2,2.2)+vec2(t*.03,0.));float w=fb(uv*2.6+q+vec2(t*.05,0.));
  c=mix(vec3(.47,.47,.45),vec3(.86,.84,.8),smoothstep(.3,.78,w));c=mix(c,CA,smoothstep(.7,.95,q)*.25);
 } else if(m==1){
  vec3 g0=PA,l0=YE,l1=RU,l2=CB,l3=CA,ink=CB,hole=PA,tr=CB;
  if(pal==1){g0=CB+vec3(.03);l0=YE;l1=RU;l2=PA;l3=CA;ink=PA;hole=CB;tr=PA;}
  else if(pal==2){g0=CA;l0=CB;l1=RU;l2=PA;l3=YE;ink=CB;hole=CA;tr=CB;}
  else if(pal==3){l0=CB;l1=CB;l2=CB;l3=CB;tr=YE;}
  c=g0*(.96+.04*fb(uv*6.));
  for(int i=0;i<4;i++){float fi=float(i);
   float base=.2+fi*.2;float x0=.4+h(vec2(fi,4.))*2.;float d=(h(vec2(fi,8.))-.5)*.36;float sd=sign(d);
   float yl=base+clamp((uv.x-x0)*sd,0.,abs(d))*sd;float jog=step(x0,uv.x)*step(uv.x,x0+abs(d));
   float dist=abs(uv.y-yl)*mix(1.,.7071,jog);
   vec3 lc=i==0?l0:i==1?l1:i==2?l2:l3;
   c=mix(c,lc,smoothstep(.034,.026,dist));
   float sx=(fract(uv.x*1.6+fi*.37)-.5)/1.6;float st=length(vec2(sx,uv.y-yl));
   c=mix(c,ink,smoothstep(.034,.027,st)*step(dist,.04));c=mix(c,hole,smoothstep(.02,.014,st)*step(dist,.04));
   float tx=mod(t*(.08+fi*.025)+h(vec2(fi,2.))*6.,r.x/r.y+.4)-.2;float ty=base+clamp((tx-x0)*sd,0.,abs(d))*sd;
   float trn=length((uv-vec2(tx,ty))*vec2(.35,1.));c=mix(c,tr,smoothstep(.03,.02,trn));
  }
 } else if(m==2){
  float rows=29.;float pit=R.y/rows;vec2 q=vec2(gl_FragCoord.x,R.y-gl_FragCoord.y)/pit;vec2 cell=floor(q);vec2 f=fract(q)-.5;
  float li=-1.;float ly=0.;
  if(cell.y>=1.&&cell.y<8.){li=0.;ly=cell.y-1.;}else if(cell.y>=11.&&cell.y<18.){li=1.;ly=cell.y-11.;}else if(cell.y>=21.&&cell.y<28.){li=2.;ly=cell.y-21.;}
  float on=0.;
  if(li>=0.){float sp=li==1.?-2.:3.;float col=mod(cell.x+floor(t*sp)+li*17.,ts.x);on=step(.5,texture2D(tx,vec2((col+.5)/ts.x,(li*7.+ly+.5)/ts.y)).r);}
  float dt=smoothstep(.44,.34,length(f));
  c=CB*.9;c=mix(c,mix(CB+vec3(.075),YE*(1.+.06*sin(t*3.+cell.x)),on),dt);
 } else {
  vec2 g=vec2(64.,30.);vec2 id=floor(uv*g);vec2 f=fract(uv*g);float col=floor(id.x/4.);float bld=step(.25,h(vec2(col,2.)));
  float lit=step(.62,h(id+floor(t*.12+h(id)*5.)));float win=step(.18,f.x)*step(f.x,.82)*step(.2,f.y)*step(f.y,.8);
  c=CB+vec3(.03);c=mix(c,mix(CA,YE,h(id*1.3)),win*lit*bld);c=mix(c,vec3(.2,.22,.21),win*(1.-lit)*bld);
 }
 c+=(h(px+fract(t)*91.)-.5)*.08;gl_FragColor=vec4(c,1.);}`;
const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}';
import { DM_FONT } from '../dotmatrix.js';
// fill → [mode, palette]
export const FILLS = { sky: [0, 0], route: [1, 0], 'route-dark': [1, 1], 'route-camel': [1, 2], 'route-ink': [1, 3], dots: [2, 0], windows: [4, 0] };
// The arrival board's three lines (dots), each a row of the 5×7 font, padded to one width
const BOARD = ['CLEANING · MOVING · DELIVERY · ', 'TORONTO · PEEL · YORK · DURHAM · HALTON · ', 'ON YOUR DATE · SAME CREW · SAME PROMISES · '];
function boardBitmap() {
  const lines = BOARD.map((text) => {
    const cols = [];
    [...text].forEach((ch, i) => {
      const g = (DM_FONT[ch] ?? DM_FONT[' ']).split(' ');
      if (i) cols.push(null);
      for (let x = 0; x < g[0].length; x++) cols.push(g.map((row) => row[x] === '1'));
    });
    return cols;
  });
  const w = Math.max(...lines.map((l) => l.length));
  const px = new Uint8Array(w * 21);
  lines.forEach((cols, li) => cols.forEach((col, x) => col?.forEach((on, y) => { if (on) px[(li * 7 + y) * w + x] = 255; })));
  return { w, px };
}

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
  const uPal = gl.getUniformLocation(program, 'pal');
  const uRD = gl.getUniformLocation(program, 'R');
  // The arrival board's letters, as a texture (one byte a dot)
  const board = boardBitmap();
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, board.w, 21, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, board.px);
  [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST));
  [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
  gl.uniform1i(gl.getUniformLocation(program, 'tx'), 0);
  gl.uniform2f(gl.getUniformLocation(program, 'ts'), board.w, 21);

  let [mode, pal] = FILLS[fill] ?? FILLS.windows;
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
    gl.uniform1i(uPal, pal);
    gl.uniform2f(uRD, w, h);
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
      [mode, pal] = FILLS[name] ?? [mode, pal];
      draw();
    },
    stop() {
      cancelAnimationFrame(raf);
      io.disconnect();
    },
  };
}
