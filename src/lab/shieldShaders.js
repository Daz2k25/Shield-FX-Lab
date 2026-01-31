export const MAX_IMPACTS = 8;

export const shieldVert = `
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec3 vViewDirW;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDirW = normalize(cameraPosition - vWorldPos);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `;

export const shieldFrag = `
      precision highp float;

      #define MAX_IMPACTS ${MAX_IMPACTS}

      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec3 vViewDirW;
      varying vec2 vUv;

      uniform float uTime;
      uniform int uPreset;
      uniform vec3 uBaseColor;
      uniform vec3 uRimColor;
      uniform float uOpacity;
      uniform float uThickness;

      uniform float uFresnelPower;
      uniform float uFresnelIntensity;

      uniform float uNoiseScale;
      uniform float uNoiseSpeed;
      uniform float uNoiseIntensity;

      uniform float uHexDensity;

      uniform float uRippleStrength;
      uniform float uRippleSpeed;
      uniform float uRippleDecay;

      uniform float uOverload;
      uniform float uEnergy;
      uniform float uEmp;      // global emp flicker amount 0..1

      uniform samplerCube uEnv;

      uniform int uImpactCount;
      uniform vec3 uImpactPos[MAX_IMPACTS];   // local normalized (direction on sphere)
      uniform float uImpactTime[MAX_IMPACTS];
      uniform float uImpactStrength[MAX_IMPACTS];
      uniform float uImpactType[MAX_IMPACTS]; // 0..5

      // hash + noise
      float hash13(vec3 p){
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      float noise3(vec3 p){
        vec3 i = floor(p);
        vec3 f = fract(p);
        // smoothstep
        f = f*f*(3.0-2.0*f);

        float n000 = hash13(i + vec3(0,0,0));
        float n100 = hash13(i + vec3(1,0,0));
        float n010 = hash13(i + vec3(0,1,0));
        float n110 = hash13(i + vec3(1,1,0));
        float n001 = hash13(i + vec3(0,0,1));
        float n101 = hash13(i + vec3(1,0,1));
        float n011 = hash13(i + vec3(0,1,1));
        float n111 = hash13(i + vec3(1,1,1));

        float nx00 = mix(n000, n100, f.x);
        float nx10 = mix(n010, n110, f.x);
        float nx01 = mix(n001, n101, f.x);
        float nx11 = mix(n011, n111, f.x);
        float nxy0 = mix(nx00, nx10, f.y);
        float nxy1 = mix(nx01, nx11, f.y);
        return mix(nxy0, nxy1, f.z);
      }

      float fbm(vec3 p){
        float v = 0.0;
        float a = 0.55;
        for(int i=0;i<5;i++){
          v += a * noise3(p);
          p *= 2.02;
          a *= 0.55;
        }
        return v;
      }

      // Hex pattern in UV space
      float hexDist(vec2 p){
        // from iq
        p = abs(p);
        return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
      }
      float hexGrid(vec2 uv, float scale){
        vec2 p = uv * scale;
        // offset every other row
        p.y *= 1.1547005; // 2/sqrt(3)
        vec2 row = floor(vec2(p.x + 0.5*floor(p.y), p.y));
        vec2 f = p - vec2(row.x - 0.5*floor(row.y), row.y);
        f -= 0.5;
        float d = hexDist(f);
        // cell fill + edge
        float edge = smoothstep(0.48, 0.44, d);
        float fill = smoothstep(0.52, 0.40, d);
        return mix(fill, edge, 0.6);
      }

      vec3 envSample(vec3 dir){
        return textureCube(uEnv, dir).rgb;
      }

      // Triangle/Geodesic pattern
      float triGrid(vec2 uv, float scale) {
        float w = 0.05;
        // line 1 (horizontal)
        float d1 = abs(fract(uv.y * scale) - 0.5);
        // line 2 (60 deg)
        float c = 0.5; float s = 0.866025;
        vec2 uv2 = vec2(uv.x*c - uv.y*s, uv.x*s + uv.y*c);
        float d2 = abs(fract(uv2.y * scale) - 0.5);
        // line 3 (120 deg)
        vec2 uv3 = vec2(uv.x*c + uv.y*s, -uv.x*s + uv.y*c);
        float d3 = abs(fract(uv3.y * scale) - 0.5);

        float d = min(min(d1, d2), d3);
        return smoothstep(w, w*0.4, d);
      }

      // ring + hotspot from one impact
      void impactField(vec3 n, int idx, float tNow, out float ring, out float hot, out float crack){
        float t0 = uImpactTime[idx];
        float dt = max(0.0, tNow - t0);
        vec3 ip = normalize(uImpactPos[idx]);

        // angular distance on unit sphere
        float ang = acos(clamp(dot(n, ip), -1.0, 1.0));
        float d = ang; // radians ~ arc length on unit sphere

        float strength = uImpactStrength[idx];

        // ripple ring
        float r = dt * uRippleSpeed;
        float w = mix(0.015, 0.06, clamp(strength, 0.0, 1.0));
        float ringCore = exp(-pow((d - r) / w, 2.0));
        float decay = exp(-dt * uRippleDecay);

        ring = ringCore * decay * strength;

        // hotspot (heat / overcharge)
        float h = exp(-d * mix(10.0, 25.0, 1.0 - strength));
        hot = h * exp(-dt * mix(1.2, 2.8, strength)) * strength;

        // crackle / sparks (kinetic & rail-like)
        float type = uImpactType[idx];
        float crackMask = smoothstep(0.25, 1.0, type) * smoothstep(0.0, 0.5, dt) * exp(-dt*4.0);
        float n1 = fbm(n*40.0 + vec3(0.0, 0.0, tNow*3.0));
        float n2 = fbm(n*65.0 + vec3(0.0, tNow*5.0, 0.0));
        crack = crackMask * hot * smoothstep(0.78, 0.95, n1) * smoothstep(0.65, 0.9, n2);
      }

      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(vViewDirW);

        float ndv = clamp(dot(N, V), 0.0, 1.0);
        float fres = pow(1.0 - ndv, uFresnelPower) * uFresnelIntensity;

        // base flow noise
        vec3 flowP = N * uNoiseScale + vec3(uTime*uNoiseSpeed, -uTime*uNoiseSpeed*0.7, uTime*uNoiseSpeed*0.4);
        float nFlow = fbm(flowP) * 2.0 - 1.0;
        float flow = 0.5 + 0.5 * nFlow;
        float flowBoost = uNoiseIntensity * (0.25 + 0.75*flow);

        // global overload instability
        float overloadPulse = 0.0;
        if (uOverload > 0.0) {
          overloadPulse = (0.6 + 0.4*sin(uTime*8.0)) * uOverload;
        }

        // impacts accumulation
        float ringSum = 0.0;
        float hotSum  = 0.0;
        float crackSum= 0.0;
        float ionStreak = 0.0;
        float laserShimmer = 0.0;
        float empScan = 0.0;

        for(int i=0;i<MAX_IMPACTS;i++){
          if (i >= uImpactCount) break;

          float ring, hot, crack;
          impactField(N, i, uTime, ring, hot, crack);

          ringSum += ring;
          hotSum  += hot;
          crackSum+= crack;

          float type = uImpactType[i];
          // 0 laser: shimmer
          laserShimmer += (1.0 - smoothstep(0.0, 0.25, type)) * hot * (0.5 + 0.5*sin(uTime*28.0 + dot(N, vec3(9.0,7.0,11.0))));
          // 5 ion: streaks crawling
          float ionMask = smoothstep(4.5, 5.1, type);
          if (ionMask > 0.0) {
            float a = atan(N.z, N.x);
            float l = N.y;
            float lines = sin(a*18.0 + uTime*6.0 + fbm(N*12.0 + uTime)*2.0) * sin(l*22.0 - uTime*5.0);
            ionStreak += ionMask * hot * smoothstep(0.55, 0.95, abs(lines));
          }
          // 4 emp: global scan shimmer
          float empMask = smoothstep(3.7, 4.4, type);
          empScan += empMask * (0.5 + 0.5*sin((vUv.y*90.0) + uTime*18.0));
        }

        ringSum = clamp(ringSum * uRippleStrength, 0.0, 2.0);
        hotSum  = clamp(hotSum  * 1.4, 0.0, 2.0);
        crackSum= clamp(crackSum * 1.8, 0.0, 2.0);

        // preset features
        float hex = 0.0;
        float fieldLines = 0.0;
        float hardEdge = 0.0;
        float plasma = 0.0;
        float tri = 0.0;

        if (uPreset == 1) { // hex / cellular
          float h = hexGrid(vUv, uHexDensity);
          // light up near impact
          hex = h * (0.35 + 1.25*hotSum + 0.85*ringSum);
        } else if (uPreset == 2) { // magnetic field lines
          // spherical coords-ish
          float a = atan(N.z, N.x);
          float l = N.y;
          float w = fbm(N*8.0 + vec3(0.0, uTime*0.6, 0.0))*0.35;
          float linesA = sin(a*14.0 + uTime*1.2 + w);
          float linesL = sin(l*18.0 - uTime*1.1 + w);
          fieldLines = smoothstep(0.65, 0.98, abs(linesA*linesL)) * (0.35 + 1.35*ringSum + 0.6*hotSum);
        } else if (uPreset == 3) { // hard-light glass
          hardEdge = smoothstep(0.25, 0.85, fres) * 1.3;
        } else if (uPreset == 4) { // Plasma
          float p1 = fbm(N*3.0 + vec3(uTime*0.2));
          float p2 = fbm(N*6.0 - vec3(uTime*0.3));
          float mixP = sin(p1*10.0 + p2*5.0 + uTime);
          plasma = smoothstep(0.4, 0.6, mixP) * (0.5 + 0.5*sin(uTime + N.y*10.0));
        } else if (uPreset == 5) { // Geodesic
          float t = triGrid(vUv, uHexDensity);
          tri = t * (0.45 + 1.15*hotSum + 0.75*ringSum);
        }

        // fake refraction/reflection mix
        vec3 R = reflect(-V, N);
        vec3 refr = refract(-V, N, 0.92);
        vec3 envR = envSample(R);
        vec3 envT = envSample(refr);

        float energy = clamp(uEnergy, 0.0, 1.0);
        // lower energy -> noisier + more visible field
        float low = 1.0 - energy;

        // base color shifts under overload / emp
        vec3 base = uBaseColor;
        vec3 rimC = uRimColor;

        // EMP flicker overlay
        float emp = clamp(uEmp + 0.35*empScan, 0.0, 1.0);
        float empFlick = emp * (0.45 + 0.55*sin(uTime*42.0 + dot(N, vec3(3.0,5.0,7.0))));
        base = mix(base, vec3(0.75, 0.9, 1.0), 0.25*emp);
        rimC = mix(rimC, vec3(0.95, 0.98, 1.0), 0.35*emp);

        // Overload shifts toward hotter rim
        base = mix(base, vec3(0.75, 0.22, 0.25), 0.20*overloadPulse);
        rimC = mix(rimC, vec3(1.0, 0.35, 0.35), 0.25*overloadPulse);

        // thickness cue
        float thickness = uThickness;
        float depth = (0.35 + 0.65*fres) * thickness;

        // Compose intensity layers (readability first)
        float impactGlow = 0.0;
        impactGlow += 1.1*hotSum + 1.2*ringSum + 1.3*crackSum + 0.85*ionStreak + 0.55*laserShimmer;

        float field = 0.0;
        field += flowBoost * (0.30 + 0.70*fres);
        field += hex * 0.55;
        field += fieldLines * 0.70;
        field += hardEdge * 0.45;
        field += plasma * 0.60;
        field += tri * 0.55;

        // Overload instability
        float instab = 0.0;
        instab += overloadPulse * (0.35 + 0.65*fbm(N*22.0 + uTime*2.0));
        instab += low * (0.10 + 0.25*fbm(N*12.0 + uTime*0.6));

        // final opacity
        float alpha = uOpacity;
        alpha += 0.12*fres + 0.18*impactGlow;
        alpha += 0.06*field;
        alpha += 0.10*instab;
        alpha += 0.12*empFlick;
        alpha = clamp(alpha, 0.02, 0.96);

        // final color
        vec3 col = base;

        // Refraction tint: let background show through but with energy tint
        vec3 refrTint = mix(envT, envR, 0.35);
        col = mix(refrTint, col, 0.55);

        // Add field energy + rim
        col += base * (0.16 + 0.55*field);
        col += rimC * fres * (0.65 + 0.8*impactGlow);

        // Impact highlight (local bloom-ish)
        col += rimC * impactGlow * 1.35;

        // EMP scanlines are a bit desaturated/glassy
        col = mix(col, col*vec3(0.88,0.93,1.0), 0.30*emp);

        // Hard-light preset: glassier + sharper highlights
        if (uPreset == 3) {
          col = mix(col, refrTint, 0.35);
          col += vec3(1.0) * (0.18 + 0.25*hardEdge + 0.35*crackSum);
        }

        // Clamp to keep it from blowing out too hard
        col = clamp(col, vec3(0.0), vec3(6.0));

        gl_FragColor = vec4(col, alpha);
      }
    `;
