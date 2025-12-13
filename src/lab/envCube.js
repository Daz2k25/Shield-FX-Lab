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

  const draw = (ctx, w, h, tintA, tintB, stars = true, nebula = true) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, tintA);
    g.addColorStop(1, tintB);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    if (nebula) {
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = (0.25 + Math.random() * 0.6) * w;

        const hue = Math.random();
        const c1 =
          hue < 0.33
            ? [90, 150, 255]
            : hue < 0.66
              ? [180, 110, 255]
              : [80, 255, 210];

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(${c1[0]},${c1[1]},${c1[2]},${0.10 + Math.random() * 0.08})`);
        grad.addColorStop(0.6, `rgba(${c1[0]},${c1[1]},${c1[2]},${0.02 + Math.random() * 0.03})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    if (stars) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 900; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random();
        const size = r < 0.92 ? 1 : r < 0.985 ? 2 : 3;

        const t = Math.random();
        const col =
          t < 0.72
            ? [245, 250, 255]
            : t < 0.86
              ? [170, 210, 255]
              : t < 0.94
                ? [255, 210, 170]
                : [190, 255, 220];

        const a = size === 1 ? 0.35 + Math.random() * 0.35 : 0.55 + Math.random() * 0.35;
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
        ctx.fillRect(x, y, size, size);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 1200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = `rgba(255,255,255,${Math.random()})`;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  };

  const t1 = '#050615',
    b1 = '#000004';
  const t2 = '#03040d',
    b2 = '#000003';

  faces.push(makeFaceCanvas((ctx, w, h) => draw(ctx, w, h, t1, b1, true, true))); // px
  faces.push(makeFaceCanvas((ctx, w, h) => draw(ctx, w, h, t1, b1, true, true))); // nx
  faces.push(makeFaceCanvas((ctx, w, h) => draw(ctx, w, h, t2, b2, true, true))); // py
  faces.push(makeFaceCanvas((ctx, w, h) => draw(ctx, w, h, '#02020a', '#000002', true, false))); // ny
  faces.push(makeFaceCanvas((ctx, w, h) => draw(ctx, w, h, t1, b1, true, true))); // pz
  faces.push(makeFaceCanvas((ctx, w, h) => draw(ctx, w, h, t1, b1, true, true))); // nz

  const cube = new THREE.CubeTexture(faces.map((t) => t.image));
  cube.needsUpdate = true;
  cube.encoding = THREE.sRGBEncoding;
  return cube;
}
