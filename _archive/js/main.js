/* ================================================
   T.STUDIO — SHARED RUNTIME
   Lenis + GSAP/ScrollTrigger + cursor + reveals
   ================================================ */

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- SMOOTH SCROLL — LENIS ---- */
let lenis;

if (!prefersReducedMotion && typeof Lenis !== 'undefined') {
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

/* ---- CUSTOM CURSOR ---- */
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
        rx += (mx - rx) * 0.13;
        ry += (my - ry) * 0.13;
        cursorRing.style.left = rx + 'px';
        cursorRing.style.top  = ry + 'px';
        requestAnimationFrame(ringLoop);
    })();

    document.querySelectorAll('a, button, .project').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('is-hovering'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('is-hovering'));
    });
}

/* ---- NAVIGATION SCROLL STATE ---- */
const nav = document.querySelector('.nav');
if (nav) {
    ScrollTrigger.create({
        start: 'top -60',
        onUpdate: (self) => {
            nav.classList.toggle('is-scrolled', self.scroll() > 60);
        },
    });
}

/* ---- PAGE INTRO ---- */
window.addEventListener('DOMContentLoaded', () => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    tl.to('.page-transition', {
        scaleY: 0,
        duration: 1.1,
        ease: 'power4.inOut',
        transformOrigin: 'top',
    });

    tl.from('.nav', {
        y: -24,
        opacity: 0,
        duration: 0.9,
    }, '-=0.35');

    // Hero intro — variations call window.heroIntro(tl) if they want custom
    if (typeof window.heroIntro === 'function') {
        window.heroIntro(tl);
    }
});

/* ---- SHARED SCROLL REVEALS ---- */
gsap.utils.toArray('.section-header').forEach(el => {
    gsap.from(el, {
        y: 28,
        opacity: 0,
        duration: 0.85,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
    });
});

gsap.utils.toArray('.project').forEach((card) => {
    gsap.from(card, {
        y: 60,
        opacity: 0,
        duration: 1.0,
        ease: 'expo.out',
        scrollTrigger: { trigger: card, start: 'top 88%' },
    });
});

gsap.from('.studio-quote', {
    y: 45,
    opacity: 0,
    duration: 1.3,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.studio-quote', start: 'top 82%' },
});

gsap.from('.studio-rule', {
    scaleX: 0,
    duration: 0.7,
    ease: 'power3.out',
    transformOrigin: 'left',
    scrollTrigger: { trigger: '.studio-grid', start: 'top 82%' },
});

gsap.from('.studio-body', {
    y: 30,
    opacity: 0,
    duration: 0.9,
    stagger: 0.15,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.studio-grid', start: 'top 82%' },
});

gsap.from('.studio-item', {
    y: 20,
    opacity: 0,
    duration: 0.65,
    stagger: 0.1,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.studio-list', start: 'top 85%' },
});

gsap.from('.contact-line', {
    y: '108%',
    duration: 1.1,
    stagger: 0.14,
    ease: 'power4.out',
    scrollTrigger: { trigger: '.contact-title', start: 'top 82%' },
});

gsap.from('.contact-aside', {
    y: 30,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.contact-aside', start: 'top 88%' },
});

/* ---- SMOOTH ANCHOR SCROLLING ---- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        const id = anchor.getAttribute('href');
        if (id === '#') return;
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
