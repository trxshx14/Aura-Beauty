#  Aura Beauty — Immersive 3D Product Showcase

[![Framework: Next.js](https://img.shields.io/badge/Framework-Next.js%2014-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![3D Engine: R3F](https://img.shields.io/badge/3D%20Engine-React%20Three%20Fiber-blue?style=flat-square&logo=three.js)](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
[![Animation: GSAP](https://img.shields.io/badge/Animation-GSAP%20ScrollTrigger-green?style=flat-square)](https://gsap.com/)
[![Design: Figma](https://img.shields.io/badge/Design-Figma-F24E1E?style=flat-square&logo=figma)](https://www.figma.com/)

Aura Beauty is a high-performance, interactive 3D web experience built for a fictional premium minimalist cosmetics brand. This project serves as a portfolio showcase demonstrating the seamless intersection of advanced **Frontend Engineering** and intentional **UX/UI Design**.

Rather than relying on static images, the interface uses a full-screen WebGL canvas mapped to the browser's scroll depth. As the user navigates, a responsive 3D product asset transforms, rotates, and morphs dynamically to guide the user through the product’s formulation, texture, and application steps.

---

##  Core Features & UX Decisions

###  The Aesthetics & UI Design
* **Warm Minimalism & Editorial Layout:** Designed around a soft, accessible color palette—featuring Creamy Vanilla (`#FBF7F4`), Soft Blush (`#F3E1DC`), and Warm Charcoal (`#2B2927`).
* **Micro-Interactions:** Subtle mouse-tracking physics make the 3D asset dynamically tilt and catch studio reflections based on the user's cursor position.
* **Typographic Hierarchy:** Paired sophisticated serif headings with highly clean, legible sans-serif body copy to prioritize text accessibility alongside immersive visual storytelling.

###  Technical Frontend Execution
* **Decoupled Scrollytelling Layer Architecture:** Implemented a fixed full-screen WebGL canvas background perfectly synchronized with a semantic, high-performance HTML scroll container layer.
* **Buttery-Smooth Scrubbing:** Utilized GSAP `ScrollTrigger` with customized interpolation (`scrub: 1`) to eliminate browser scrolling jitter and bind complex 3D camera properties straight to the scroll track.
* **Shader Material Crafting:** Developed custom frosted-glass and liquid-ribbon simulation materials using Three.js `<meshPhysicalMaterial />`, keeping roughness, transmission, and thickness fully performant at 60 FPS.

---

##  Tech Stack & Dependencies

* **Framework:** Next.js (React / TypeScript)
* **Styling:** Tailwind CSS (Fluid typography and layout constraints)
* **3D Graphics:** React Three Fiber (R3F) & `@react-three/drei`
* **Animations:** GSAP (GreenSock Animation Platform) + `ScrollTrigger`

---

## 🚀 Getting Started

Follow these steps to run the development server locally:

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/aura-beauty.git](https://github.com/your-username/aura-beauty.git)
   cd aura-beauty
