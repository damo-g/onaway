// FT-02 wordmark fills, drawn live in WebGL in the brand palette with film grain (from the locked mock).
// Windows (locked): the city's towers with lights coming on. For review (Nov 2026; lake, traffic, flap, platform, kraft,
// route and the scrolling dots retired): Sky; dots-stars (single amber dots light and fade inside the letters); and the
// Board, a dot-matrix board like the Services facts (src/js/dotmatrix.js): a grey board the full width of the section,
// the wordmark's own height, every dot unlit but those that make up the wordmark (and the yellow square, as yellow
// dots): board (lit Paper) · board-amber (lit amber) · board-update (Paper; every 11 s a wipe runs left to right, the
// dots flipping as a departures board updates) · board-fine (a finer board, 46 rows) · board-glow (lit dots with a soft
// halo, like LEDs) · board-square (square pixels). The board itself is barely off the footer's Carbon; unlit dots at 4.5%.
// The board's dots sit on whole device pixels (no moiré) and take no film grain (it made the unlit dots shimmer); the
// yellow square arrives as the CSS one does (from the left, holds, steps on and out, 7 s), dot by dot, after the Y. The board fills unmask the wordmark (main.css) and read its shape
// from /svg/wordmark.svg, drawn into a texture.
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
 } else if(m==2){
  float rows=29.;float pit=R.y/rows;vec2 q=vec2(gl_FragCoord.x,R.y-gl_FragCoord.y)/pit;vec2 cell=floor(q);vec2 f=fract(q)-.5;
  float k=h(cell+floor(t*.25+h(cell)*7.));float on=smoothstep(.93,1.,k)*(.6+.4*sin(t*1.3+h(cell)*6.3));
  float dt=smoothstep(.44,.34,length(f));
  c=CB*.9;c=mix(c,mix(CB+vec3(.075),YE,on),dt);
 } else if(m==3){
  float rows=pal==3?46.:30.;float pit=max(1.,floor(R.y/rows));float cols=floor(R.x/pit);
  vec2 o=floor((R-vec2(cols,rows)*pit)*.5);
  vec2 q=vec2(gl_FragCoord.x-o.x,R.y-gl_FragCoord.y-o.y)/pit;vec2 cell=floor(q);vec2 f=fract(q)-.5;
  float wh=rows-4.;float ww=wh*ts.x/ts.y;
  vec2 wu=vec2((cell.x-2.+.5)/ww,(cell.y-2.+.5)/wh);
  float on=0.;
  if(wu.x>=0.&&wu.x<=1.&&wu.y>=0.&&wu.y<=1.)on=step(.5,texture2D(tx,wu).a);
  float sz=pal==3?6.:4.;float p=mod(t,7.)/7.;float e=1.-pow(1.-clamp(p/.22,0.,1.),3.);
  float dx=p<.86?floor(mix(-14.,0.,e)):floor(mix(0.,3.,clamp((p-.86)/.08,0.,1.)));
  float vis=p<.86?clamp(p/.06,0.,1.):1.-clamp((p-.86)/.08,0.,1.);
  float sx=2.+ceil(ww)+3.+dx;
  float sig=vis*step(sx,cell.x)*step(cell.x,sx+sz-1.)*step(rows-2.-sz,cell.y)*step(cell.y,rows-3.);
  if(pal==2){float ph=mod(t,11.);float fr=(ph-9.4)/1.4*(cols+12.);on*=1.-step(fr-10.,cell.x)*step(cell.x,fr)*step(.35,h(cell+floor(t*12.)));}
  vec3 lit=pal==1?YE:PA;
  float dd=pal==5?max(abs(f.x),abs(f.y)):length(f);
  float dt=pal==5?smoothstep(.4,.34,dd):smoothstep(.42,.3,dd);
  vec3 bd=CB+vec3(.012);
  c=mix(bd,mix(mix(bd,PA,.045),lit,on),dt);
  c=mix(c,YE,sig*dt);
  if(pal==4){c+=lit*on*smoothstep(.7,.25,dd)*.18;c+=YE*sig*smoothstep(.7,.25,dd)*.18;}
 } else {
  vec2 g=vec2(64.,30.);vec2 id=floor(uv*g);vec2 f=fract(uv*g);float col=floor(id.x/4.);float bld=step(.25,h(vec2(col,2.)));
  float lit=step(.62,h(id+floor(t*.12+h(id)*5.)));float win=step(.18,f.x)*step(f.x,.82)*step(.2,f.y)*step(f.y,.8);
  c=CB+vec3(.03);c=mix(c,mix(CA,YE,h(id*1.3)),win*lit*bld);c=mix(c,vec3(.2,.22,.21),win*(1.-lit)*bld);
 }
 if(m!=3)c+=(h(px+fract(t)*91.)-.5)*.08;gl_FragColor=vec4(c,1.);}`;
const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}';
export const FILLS = { sky: [0, 0], 'dots-stars': [2, 0], board: [3, 0], 'board-amber': [3, 1], 'board-update': [3, 2], 'board-fine': [3, 3], 'board-glow': [3, 4], 'board-square': [3, 5], windows: [4, 0] };
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
  // The board fills read the wordmark's shape from a texture: the SVG drawn once into a canvas (empty until it loads)
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR));
  [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
  gl.uniform1i(gl.getUniformLocation(program, 'tx'), 0);
  const uTs = gl.getUniformLocation(program, 'ts');
  gl.uniform2f(uTs, 298.46, 56);
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = 1194;
    cv.height = 224;
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    draw();
  };
  img.src = '/svg/wordmark.svg';

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
