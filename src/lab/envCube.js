import { THREE } from '../vendor/three.js';

function makeFaceCanvas(drawFn) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  drawFn(ctx, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  tex.needsUpdate = true;
  return tex;
}

export function createEnvCube() {
  const faces = [];

  const draw = (ctx, w, h, top, bottom, stars = true) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    if (stars) {
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < 120; i++) {
        const x = Math.random() * w,
          y = Math.random() * h;
        const r = Math.random() < 0.92 ? 1 : 2;
        ctx.fillStyle = `rgba(220,240,255,${Math.random() * 0.6})`;
        ctx.fillRect(x, y, r, r);
      }
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = `rgba(120,170,255,${0.05 + Math.random() * 0.05})`;
      ctx.fillRect(0, (i / 10) * h + Math.random() * 6, w, 1);
    }
    ctx.globalAlpha = 1;
  };

  const t1 = '#0b1430',
    b1 = '#020308';
  const t2 = '#081024',
    b2 = '#05060a';

  faces.push(makeFaceCanvas((ctx, w, h) => draw(ctx, w, h, t1, b1, true))); // px
  faces.push(makeFaceCanvas((ctx, w, h) => draw(ctx, w, h, t1, b1, true))); // nx
  faces.push(makeFaceCanvas((ctx, w, h) => draw(ctx, w, h, t2, b2, false))); // py
  faces.push(
    makeFaceCanvas((ctx, w, h) => draw(ctx, w, h, '#05060a', '#020207', false))
  ); // ny
  faces.push(makeFaceCanvas((ctx, w, h) => draw(ctx, w, h, t1, b1, true))); // pz
  faces.push(makeFaceCanvas((ctx, w, h) => draw(ctx, w, h, t1, b1, true))); // nz

  const cube = new THREE.CubeTexture(faces.map((t) => t.image));
  cube.needsUpdate = true;
  cube.encoding = THREE.sRGBEncoding;
  return cube;
}

