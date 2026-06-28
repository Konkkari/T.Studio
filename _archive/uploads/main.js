/* ================================================
   T.STUDIO — MAIN SCRIPT
   GSAP + ScrollTrigger + Lenis
   ================================================ */

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------
   CONFIG
   ------------------------------------------------ */
const CONFIG = {
    fluidBackground: false,   // set to false to disable the WebGL shader background
};

/* ------------------------------------------------
   FLUID METAL BACKGROUND — Three.js / WebGL shader
   ------------------------------------------------ */
(function initFluidBackground() {
    if (!CONFIG.fluidBackground) return;
    const canvas = document.getElementById('fluid-bg');
    if (!canvas || typeof THREE === 'undefined') return;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false });
    } catch (e) {
        return; // WebGL unavailable — CSS body bg shows through
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const scene    = new THREE.Scene();
    const camera   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
        uTime:       { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    };

    // ── Vertex shader: bypass all transforms, fill clip space directly ──
    const vertexShader = /* glsl */`
void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

    // ── Fragment shader: domain-warped FBM → Blinn-Phong on dark fluid ──
    const fragmentShader = /* glsl */`
uniform float uTime;
uniform vec2  uResolution;

// Gradient noise ────────────────────────────────────────────────────
vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}

float gnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // quintic
    return mix(
        mix(dot(hash2(i),             f),
            dot(hash2(i + vec2(1,0)), f - vec2(1,0)), u.x),
        mix(dot(hash2(i + vec2(0,1)), f - vec2(0,1)),
            dot(hash2(i + vec2(1,1)), f - vec2(1,1)), u.x),
        u.y
    );
}

// FBM with rotation to suppress axis-aligned artefacts
float fbm(vec2 p) {
    float v = 0.0, a = 0.55;
    mat2  R = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 2; i++) {
        v += a * gnoise(p);
        p  = R * p * 2.0;
        a *= 0.5;
    }
    return v;
}

float surface(vec2 p, float t) {
    vec2 q = vec2(
        fbm(p + vec2(0.00, 0.00) + t * 0.013),
        fbm(p + vec2(5.20, 1.30) + t * 0.010)
    );
    return fbm(p + 1.2 * q + vec2(1.7, 9.2) + t * 0.008);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec2 p  = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0) * 1.6;
    float t = uTime;

    float eps = 0.003;
    float h   = surface(p, t);
    float hx  = surface(p + vec2(eps, 0.0), t);
    float hy  = surface(p + vec2(0.0, eps), t);
    vec3 N = normalize(vec3(
        -(hx - h) / eps * 0.50,
        -(hy - h) / eps * 0.50,
        1.0
    ));

    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 col = vec3(0.0);

    vec3 L1 = normalize(vec3(0.9, 0.7, 0.7));
    vec3 H1 = normalize(L1 + V);
    col += pow(max(dot(N, H1), 0.0),  80.0) * vec3(1.00, 1.00, 1.00) * 0.70;

    vec3 L2 = normalize(vec3(-0.8, 0.6, 0.7));
    vec3 H2 = normalize(L2 + V);
    col += pow(max(dot(N, H2), 0.0), 120.0) * vec3(0.95, 0.95, 1.00) * 0.35;

    vec3 L3 = normalize(vec3(0.1, -1.1, 0.55));
    vec3 H3 = normalize(L3 + V);
    col += pow(max(dot(N, H3), 0.0), 160.0) * vec3(0.85, 0.90, 1.00) * 0.15;

    float dither = fract(dot(gl_FragCoord.xy, vec2(0.5))) / 255.0;
    col = max(col + dither, vec3(0.0));

    gl_FragColor = vec4(col, 1.0);
}`;

    const material = new THREE.ShaderMaterial({
        uniforms:       uniforms,
        vertexShader:   vertexShader,
        fragmentShader: fragmentShader,
        precision:      'highp',
    });

    scene.add(new THREE.Mesh(geometry, material));

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock = new THREE.Clock();
    let rafId;

    function render() {
        uniforms.uTime.value = clock.getElapsedTime();
        renderer.render(scene, camera);
        if (!reducedMotion) rafId = requestAnimationFrame(render);
    }

    rafId = requestAnimationFrame(render);

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(rafId);
            clock.stop();
        } else if (!reducedMotion) {
            clock.start();
            rafId = requestAnimationFrame(render);
        }
    });
})();

/* ------------------------------------------------
   GRAIN (canvas-generated for cross-browser reliability)
   ------------------------------------------------ */
(function generateGrain() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(256, 256);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255 | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    document.querySelector('.grain').style.backgroundImage = `url(${canvas.toDataURL()})`;
})();

/* ------------------------------------------------
   SMOOTH SCROLL — LENIS
   ------------------------------------------------ */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis;

if (!prefersReducedMotion) {
    lenis = new Lenis({
        duration: 1.25,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
    });

    function raf(time) {
        lenis.raf(time);
        ScrollTrigger.update();
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
}

/* ------------------------------------------------
   CUSTOM CURSOR
   ------------------------------------------------ */
const cursorDot  = document.querySelector('.cursor-dot');
const cursorRing = document.querySelector('.cursor-ring');

if (cursorDot && cursorRing && window.matchMedia('(pointer: fine)').matches) {
    let mx = 0, my = 0;
    let rx = 0, ry = 0;

    window.addEventListener('mousemove', (e) => {
        mx = e.clientX;
        my = e.clientY;
        cursorDot.style.left = mx + 'px';
        cursorDot.style.top  = my + 'px';
    });

    (function ringLoop() {
        rx += (mx - rx) * 0.11;
        ry += (my - ry) * 0.11;
        cursorRing.style.left = rx + 'px';
        cursorRing.style.top  = ry + 'px';
        requestAnimationFrame(ringLoop);
    })();

    document.querySelectorAll('a, button, .project').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('is-hovering'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('is-hovering'));
    });
}

/* ------------------------------------------------
   PAGE INTRO ANIMATION
   ------------------------------------------------ */
window.addEventListener('DOMContentLoaded', () => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    // Slide the transition panel away
    tl.to('.page-transition', {
        scaleY: 0,
        duration: 1.1,
        ease: 'power4.inOut',
        transformOrigin: 'top',
    });


    // Nav slides in
    tl.from('.nav', {
        y: -24,
        opacity: 0,
        duration: 0.9,
    }, '-=0.35');

    // Eyebrow
    tl.to('.hero-eyebrow-line', {
        scaleX: 1,
        duration: 0.55,
        ease: 'power3.out',
    }, '-=0.5');

    tl.from('.hero-eyebrow-text', {
        y: 18,
        opacity: 0,
        duration: 0.55,
    }, '<+0.1');

    // Hero title words
    tl.to('.hero-word', {
        y: 0,
        duration: 1.15,
        stagger: 0.07,
    }, '-=0.25');

    // Hero footer
    tl.from('.hero-tagline', {
        y: 22,
        opacity: 0,
        duration: 0.8,
    }, '-=0.5');

    tl.from('.hero-scroll-indicator', {
        y: 22,
        opacity: 0,
        duration: 0.7,
    }, '<+0.1');
});

/* ------------------------------------------------
   NAVIGATION — SCROLL INDICATOR
   ------------------------------------------------ */
const nav = document.querySelector('.nav');

ScrollTrigger.create({
    start: 'top -60',
    onUpdate: (self) => {
        nav.classList.toggle('is-scrolled', self.scroll() > 60);
    },
});

/* ------------------------------------------------
   SCROLL REVEAL ANIMATIONS
   ------------------------------------------------ */
const revealDefaults = {
    ease: 'power3.out',
    toggleActions: 'play none none none',
};

// Section headers
gsap.utils.toArray('.section-header').forEach(el => {
    gsap.from(el, {
        y: 28,
        opacity: 0,
        duration: 0.85,
        ...revealDefaults,
        scrollTrigger: { trigger: el, start: 'top 88%', ...revealDefaults },
    });
});

// Project cards — one-by-one on scroll
gsap.utils.toArray('.project').forEach((card, i) => {
    gsap.from(card, {
        y: 60,
        opacity: 0,
        scale: 0.98,
        duration: 1.0,
        ease: 'expo.out',
        scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            toggleActions: 'play none none none',
        },
    });
});

// Studio quote
gsap.from('.studio-quote', {
    y: 45,
    opacity: 0,
    duration: 1.3,
    ease: 'power3.out',
    scrollTrigger: {
        trigger: '.studio-quote',
        start: 'top 82%',
        toggleActions: 'play none none none',
    },
});

// Studio rule + text columns
gsap.from('.studio-rule', {
    scaleX: 0,
    duration: 0.7,
    ease: 'power3.out',
    transformOrigin: 'left',
    scrollTrigger: {
        trigger: '.studio-grid',
        start: 'top 82%',
        toggleActions: 'play none none none',
    },
});

gsap.from('.studio-body', {
    y: 30,
    opacity: 0,
    duration: 0.9,
    stagger: 0.15,
    ease: 'power3.out',
    scrollTrigger: {
        trigger: '.studio-grid',
        start: 'top 82%',
        toggleActions: 'play none none none',
    },
});

gsap.from('.studio-item', {
    y: 20,
    opacity: 0,
    duration: 0.65,
    stagger: 0.1,
    ease: 'power3.out',
    scrollTrigger: {
        trigger: '.studio-list',
        start: 'top 85%',
        toggleActions: 'play none none none',
    },
});

// Contact title — line reveal
gsap.from('.contact-line', {
    y: '108%',
    duration: 1.1,
    stagger: 0.14,
    ease: 'power4.out',
    scrollTrigger: {
        trigger: '.contact-title',
        start: 'top 82%',
        toggleActions: 'play none none none',
    },
});

gsap.from('.contact-aside', {
    y: 30,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
    scrollTrigger: {
        trigger: '.contact-aside',
        start: 'top 88%',
        toggleActions: 'play none none none',
    },
});

/* ------------------------------------------------
   HERO PARALLAX
   ------------------------------------------------ */
if (!prefersReducedMotion) {
    gsap.to('.hero-glow', {
        y: -90,
        ease: 'none',
        scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 1.5,
        },
    });

}

/* ------------------------------------------------
   SMOOTH ANCHOR SCROLLING
   ------------------------------------------------ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        const id = anchor.getAttribute('href');
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) {
            lenis.scrollTo(target, { offset: -80, duration: 1.4 });
        } else {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
