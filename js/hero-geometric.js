/**
 * Hero Geometric WebGL Shader (Fullscreen Homepage Edition)
 * Directly ported from @componentry/hero-geometric (https://componentry.dev/docs/components/hero-geometric)
 * Features Simplex Noise + Bayer Dither 4x4 + Dynamic Gradient Plane across entire homepage
 */
(function() {
  function initHeroGeometric() {
    const canvas = document.getElementById('heroGeometricCanvas');
    if (!canvas) return;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) {
      const resume = () => {
        if (!reducedMotion.matches) {
          reducedMotion.removeEventListener('change', resume);
          initHeroGeometric();
        }
      };
      reducedMotion.addEventListener('change', resume);
      return;
    }

    const gl = canvas.getContext('webgl', { antialias: false, alpha: true }) || 
               canvas.getContext('experimental-webgl', { antialias: false, alpha: true });
    
    if (!gl) {
      console.warn('WebGL not supported for hero geometric shader');
      return;
    }

    const vertexShaderSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = (aPosition + 1.0) * 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // Exact fragment shader from @componentry/hero-geometric with subtle scroll awareness
    const fragmentShaderSource = `
      precision highp float;
      uniform float uTime;
      uniform float uScroll;
      uniform vec2 uResolution;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      varying vec2 vUv;

      vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                 -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
          + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
        m = m * m;
        m = m * m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
        vec3 g;
        g.x  = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      float bayerDither4x4(vec2 coord) {
        int x = int(mod(coord.x, 4.0));
        int y = int(mod(coord.y, 4.0));
        int idx = y * 4 + x;
        if (idx == 0) return 0.0 / 16.0;
        if (idx == 1) return 8.0 / 16.0;
        if (idx == 2) return 2.0 / 16.0;
        if (idx == 3) return 10.0 / 16.0;
        if (idx == 4) return 12.0 / 16.0;
        if (idx == 5) return 4.0 / 16.0;
        if (idx == 6) return 14.0 / 16.0;
        if (idx == 7) return 6.0 / 16.0;
        if (idx == 8) return 3.0 / 16.0;
        if (idx == 9) return 11.0 / 16.0;
        if (idx == 10) return 1.0 / 16.0;
        if (idx == 11) return 9.0 / 16.0;
        if (idx == 12) return 15.0 / 16.0;
        if (idx == 13) return 7.0 / 16.0;
        if (idx == 14) return 13.0 / 16.0;
        return 5.0 / 16.0;
      }

      void main() {
        vec2 uv = vUv;
        vec2 coord = gl_FragCoord.xy;
        
        // Subtle scroll influence across the page
        float scrollInfluence = uScroll * 0.0002;
        
        // Enhanced noise with time and scroll
        float noise = snoise(uv * 1.5 + vec2(uTime * 0.05, uTime * 0.03 + scrollInfluence)) * 0.25;
        
        // Diagonal gradient from bottom-left to top-right
        float diagonal = (uv.x + uv.y) * 0.5 + scrollInfluence * 0.15;
        
        // Combine for gradient - emphasize corners
        float gradient = diagonal * 1.2 + noise;
        
        // Interpolate colors based on gradient
        vec3 deepBlue = uColor1;
        vec3 paleBlue = uColor2;
        vec3 softBlue = mix(deepBlue, paleBlue, 0.33);
        vec3 lightBlue = mix(deepBlue, paleBlue, 0.66);
        
        // Map to colors with more distinct steps
        vec3 color;
        if (gradient < 0.3) {
          color = deepBlue;
        } else if (gradient < 0.55) {
          color = softBlue;
        } else if (gradient < 0.8) {
          color = lightBlue;
        } else {
          color = paleBlue;
        }
        
        // Enhanced dithering at boundaries
        float dither = bayerDither4x4(coord);
        float threshold = fract(gradient * 4.0);
        
        if (gradient < 0.3 && threshold > dither * 0.5) {
          color = softBlue;
        } else if (gradient >= 0.3 && gradient < 0.55 && threshold > dither * 0.5) {
          color = lightBlue;
        } else if (gradient >= 0.55 && gradient < 0.8 && threshold > dither * 0.5) {
          color = paleBlue;
        }
        
        // Softer fade to white - only at extreme bottom-left
        vec2 cornerDist = vec2(uv.x, uv.y);
        float fadeMask = smoothstep(0.0, 0.25, length(cornerDist));
        color = mix(vec3(1.0), color, fadeMask);
        
        // Add subtle vignette to emphasize corners
        float vignette = smoothstep(1.2, 0.3, length(uv - 0.5));
        color = mix(color, color * 0.95, (1.0 - vignette) * 0.3);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function createShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Quad geometry (2 triangles covering clip space)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
       1.0,  1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPositionLocation = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPositionLocation);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uTimeLocation = gl.getUniformLocation(program, 'uTime');
    const uScrollLocation = gl.getUniformLocation(program, 'uScroll');
    const uResolutionLocation = gl.getUniformLocation(program, 'uResolution');
    const uColor1Location = gl.getUniformLocation(program, 'uColor1');
    const uColor2Location = gl.getUniformLocation(program, 'uColor2');

    // Default Componentry colors (#3B82F6 and #F0F9FF)
    gl.uniform3f(uColor1Location, 29 / 255, 78 / 255, 216 / 255); // #1d4ed8 primary blue
    gl.uniform3f(uColor2Location, 240 / 255, 249 / 255, 255 / 255);

    function resize() {
      const dpr = 1; // Componentry explicitly uses dpr={[1, 1]} for optimal performance
      const width = Math.floor(window.innerWidth * dpr);
      const height = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        gl.uniform2f(uResolutionLocation, width, height);
      }
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    let targetScroll = window.scrollY || 0;
    let currentScroll = targetScroll;

    window.addEventListener('scroll', () => {
      targetScroll = window.scrollY || 0;
    }, { passive: true });

    const startTime = performance.now();

    function render(now) {
      if (!document.hidden && !reducedMotion.matches) {
        resize();
        const elapsedTime = (now - startTime) * 0.001 * 1.0; // speed = 1.0
        
        // Smooth scroll damping
        currentScroll += (targetScroll - currentScroll) * 0.08;

        gl.uniform1f(uTimeLocation, elapsedTime);
        gl.uniform1f(uScrollLocation, currentScroll);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroGeometric);
  } else {
    initHeroGeometric();
  }
})();
