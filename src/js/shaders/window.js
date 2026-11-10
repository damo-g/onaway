// FT-02 wordmark fills, drawn live in WebGL in the brand palette with film grain (from the locked mock).
// Windows (locked): the city's towers with lights coming on. For review (Nov 2026; lake, traffic and flap retired):
// Sky; Route (a transit map: coloured lines with 45° jogs, stations, trains running); Platform (a subway station's tile
// wall, a camel band, a train's light passing); Kraft (a moving box: corrugated card and a strip of tape catching light).
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
  c=PA*(.96+.04*fb(uv*6.));
  for(int i=0;i<4;i++){float fi=float(i);
   float base=.2+fi*.2;float x0=.4+h(vec2(fi,4.))*2.;float d=(h(vec2(fi,8.))-.5)*.36;float sd=sign(d);
   float yl=base+clamp((uv.x-x0)*sd,0.,abs(d))*sd;float jog=step(x0,uv.x)*step(uv.x,x0+abs(d));
   float dist=abs(uv.y-yl)*mix(1.,.7071,jog);
   vec3 lc=i==0?YE:i==1?RU:i==2?CB:CA;
   c=mix(c,lc,smoothstep(.034,.026,dist));
   float sx=(fract(uv.x*1.6+fi*.37)-.5)/1.6;float st=length(vec2(sx,uv.y-yl));
   c=mix(c,CB,smoothstep(.034,.027,st)*step(dist,.04));c=mix(c,PA,smoothstep(.02,.014,st)*step(dist,.04));
   float tx=mod(t*(.08+fi*.025)+h(vec2(fi,2.))*6.,r.x/r.y+.4)-.2;float ty=base+clamp((tx-x0)*sd,0.,abs(d))*sd;
   float tr=length((uv-vec2(tx,ty))*vec2(.35,1.));c=mix(c,CB,smoothstep(.03,.02,tr));
  }
 } else if(m==2){
  float rows=9.;vec2 p=uv*rows;vec2 id=floor(p);vec2 f=fract(p);
  float tile=step(.06,f.x)*step(f.x,.94)*step(.06,f.y)*step(f.y,.94);
  float band=step(abs(uv.y-.5),.12);
  vec3 tc=mix(PA*.94,CA,band)*(.95+.07*h(id));
  float pass=smoothstep(.5,0.,abs(fract(uv.x*.12-t*.05)-.5)*3.);tc+=pass*.07;
  tc*=1.-.06*smoothstep(.2,.9,f.y);
  c=mix(mix(CA,CB,.45),tc,tile);
 } else if(m==3){
  float fl=.5+.5*sin(uv.x*150.);float fib=fb(uv*vec2(34.,7.));
  c=CA*(.84+.1*fl+.16*(fib-.5));
  float tp=abs(uv.y-.52);float tape=step(tp,.13);
  vec3 tcol=mix(CA,PA,.42)*(.94+.06*fb(uv*vec2(5.,46.)));
  float sheen=smoothstep(.3,0.,abs(fract(uv.x*.1-t*.03)-.5))*.14;
  c=mix(c,tcol+sheen,tape);c*=1.-.18*smoothstep(.006,0.,abs(tp-.13));
 } else {
  vec2 g=vec2(64.,30.);vec2 id=floor(uv*g);vec2 f=fract(uv*g);float col=floor(id.x/4.);float bld=step(.25,h(vec2(col,2.)));
  float lit=step(.62,h(id+floor(t*.12+h(id)*5.)));float win=step(.18,f.x)*step(f.x,.82)*step(.2,f.y)*step(f.y,.8);
  c=CB+vec3(.03);c=mix(c,mix(CA,YE,h(id*1.3)),win*lit*bld);c=mix(c,vec3(.2,.22,.21),win*(1.-lit)*bld);
 }
 c+=(h(px+fract(t)*91.)-.5)*.08;gl_FragColor=vec4(c,1.);}`;
const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}';
export const FILLS = { sky: 0, route: 1, platform: 2, kraft: 3, windows: 4 };

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
