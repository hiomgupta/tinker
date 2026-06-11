import { gsap } from "gsap";
import * as THREE from "three";
let projects = [];

const gallery = document.querySelector("#gallery");
const detail = document.querySelector("#detail");
const closeDetail = document.querySelector("#closeDetail");
const detailMedia = document.querySelector(".detail-media");
const zoomImage = document.querySelector("#zoomImage");

const cards = [];
const radius = 880;
const state = {
  yaw: -0.22,
  pitch: -0.05,
  targetYaw: -0.22,
  targetPitch: -0.05,
  dragging: false,
  dragMoved: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  velocityX: 0,
  velocityY: 0
};

function buildCards() {
  const columns = 22;
  const rows = 7;
  const latitudeMin = -0.78;
  const latitudeMax = 0.78;

  for (let row = 0; row < rows; row++) {
    const rowRatio = row / (rows - 1);
    const phi = latitudeMin + (latitudeMax - latitudeMin) * rowRatio;
    const rowOffset = (row % 2) * (Math.PI / columns);

    for (let column = 0; column < columns; column++) {
      const index = row * columns + column;
      const project = projects[index % projects.length];
      const theta = (column / columns) * Math.PI * 2 - Math.PI + rowOffset;
      const jitterTheta = Math.sin(index * 2.17) * 0.035;
      const jitterPhi = Math.cos(index * 1.31) * 0.026;

      createCard(project, theta + jitterTheta, phi + jitterPhi);
    }
  }
}

function createCard(project, theta, phi) {
  const button = document.createElement("button");
  button.className = "card";
  button.type = "button";
  button.innerHTML = `
    <span class="card-shell">
      <span class="card-image"><img alt="" src="${project.image}" loading="eager"></span>
    </span>
  `;
  button.addEventListener("click", () => {
    if (!state.dragMoved) openProject(project, button);
  });
  gallery.appendChild(button);
  cards.push({ element: button, project, theta, phi });
}

function projectPoint(theta, phi) {
  let x = Math.sin(theta) * Math.cos(phi) * radius;
  let y = Math.sin(phi) * radius;
  let z = Math.cos(theta) * Math.cos(phi) * radius;

  const cosy = Math.cos(state.yaw);
  const siny = Math.sin(state.yaw);
  const cosp = Math.cos(state.pitch*0.72);
  const sinp = Math.sin(state.pitch*0.72);

  const x1 = x * cosy - z * siny;
  const z1 = x * siny + z * cosy;
  const y1 = y * cosp - z1 * sinp;
  const z2 = y * sinp + z1 * cosp;

  return { x: x1, y: y1, z: z2 };
}

function renderCards() {
  const width = innerWidth;
  const height = innerHeight;
  const focal = Math.min(width, height) * 0.82;

  cards.forEach((card) => {
    const p = projectPoint(card.theta, card.phi);
    const visible = p.z > 120;
    const scale = visible ? Math.min(1.24, Math.max(0.22, focal / p.z)) : 0.2;
    const x = width / 2 + (p.x * focal) / p.z;
    const y = height / 2 - (p.y * focal) / p.z;
    const edgeFade = Math.max(0, 1 - Math.abs(x - width / 2) / (width * 0.67));
    const opacity = visible ? Math.min(1, edgeFade * 1.25) : 0;
    const bend = Math.max(-27, Math.min(27, (x - width / 2) / width * -42));

    card.element.style.opacity = opacity.toFixed(3);
    card.element.style.filter = `blur(${visible ? Math.max(0, (1 - edgeFade) * 1.7) : 3}px)`;
    card.element.style.pointerEvents = opacity > 0.18 ? "auto" : "none";
    card.element.style.zIndex = `${Math.round(scale * 1000)}`;
    card.element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotateY(${bend}deg) scale(${scale})`;
  });
}

function openProject(project, origin) {
  const rect = origin.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  zoomImage.src = project.image;
  zoomImage.alt = project.title;
  detail.classList.add("is-open");
  detail.setAttribute("aria-hidden", "false");

  gsap.killTweensOf([detail, detailMedia, zoomImage]);
  gsap.fromTo(
    detail,
    { opacity: 0, backgroundColor: "rgba(0, 0, 0, 0)", backdropFilter: "blur(0px)" },
    { opacity: 1, backgroundColor: "rgba(0, 0, 0, 0.82)", backdropFilter: "blur(10px)", duration: 0.45, ease: "power2.out" }
  );
  gsap.fromTo(
    detailMedia,
    {
      x: x - innerWidth / 2,
      y: y - innerHeight / 2,
      scale: 0.42,
      opacity: 0.35
    },
    {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      duration: 0.8,
      ease: "expo.out"
    }
  );
  gsap.fromTo(zoomImage, { scale: 1.04 }, { scale: 1, duration: 1.1, ease: "power3.out" });
}

function closeProject() {
  gsap.killTweensOf([detail, detailMedia, zoomImage]);
  gsap.to(detailMedia, {
    scale: 0.96,
    opacity: 0,
    duration: 0.28,
    ease: "power2.in"
  });
  gsap.to(detail, {
    opacity: 0,
    backgroundColor: "rgba(0, 0, 0, 0)",
    backdropFilter: "blur(0px)",
    duration: 0.34,
    ease: "power2.inOut",
    onComplete: () => {
      detail.classList.remove("is-open");
      detail.setAttribute("aria-hidden", "true");
      zoomImage.removeAttribute("src");
      gsap.set(detailMedia, { clearProps: "transform,opacity" });
    }
  });
}

function setupDrag() {
  window.addEventListener("pointerdown", (event) => {
    if (detail.classList.contains("is-open")) return;
    state.dragging = true;
    state.dragMoved = false;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    document.body.classList.add("dragging");
  });

  window.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.velocityX = dx;
    state.velocityY = dy;
    state.targetYaw += dx * 0.0038;
    state.targetPitch = gsap.utils.clamp(-0.82, 0.82, state.targetPitch - dy * 0.0028);
    state.dragMoved = Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > 8;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
  });

  window.addEventListener("pointerup", () => {
    if (!state.dragging) return;
    state.dragging = false;
    document.body.classList.remove("dragging");
    gsap.to(state, {
      targetYaw: state.targetYaw + state.velocityX * 0.018,
      targetPitch: gsap.utils.clamp(-0.82, 0.82, state.targetPitch - state.velocityY * 0.012),
      duration: 1.1,
      ease: "power3.out"
    });
    setTimeout(() => {
      state.dragMoved = false;
    }, 80);
  });

  window.addEventListener(
    "wheel",
    (event) => {
      state.targetYaw += event.deltaY * 0.0009 + event.deltaX * 0.0012;
      state.targetPitch = gsap.utils.clamp(-0.82, 0.82, state.targetPitch - event.deltaX * 0.00015);
    },
    { passive: true }
  );
}

function setupThree() {
  const canvas = document.querySelector("#sphere");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020202, 0.045);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xd9d3c4,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending
  });

  for (let i = 0; i < 18; i++) {
    const curve = new THREE.EllipseCurve(0, 0, 24, 24, 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(160).map((point) => new THREE.Vector3(point.x, point.y, 0));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.LineLoop(geometry, lineMaterial);
    line.rotation.y = (i / 18) * Math.PI;
    group.add(line);
  }

  for (let i = 0; i < 7; i++) {
    const curve = new THREE.EllipseCurve(0, 0, 24, 24 * Math.cos((i - 3) * 0.18), 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(160).map((point) => new THREE.Vector3(point.x, (i - 3) * 4.3, point.y));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.LineLoop(geometry, lineMaterial);
    group.add(line);
  }

  const starGeometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 700; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 31 + Math.random() * 15;
    positions.push(Math.sin(phi) * Math.cos(theta) * r, Math.cos(phi) * r, Math.sin(phi) * Math.sin(theta) * r);
  }
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.58 })
  );
  scene.add(stars);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(26, 64, 64),
    new THREE.MeshBasicMaterial({
      color: 0x23164a,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide
    })
  );
  scene.add(glow);

  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();

  gsap.ticker.add(() => {
    state.yaw = gsap.utils.interpolate(state.yaw, state.targetYaw, 0.075);
    state.pitch = gsap.utils.interpolate(state.pitch, state.targetPitch, 0.075);
    group.rotation.y = -state.yaw;
    group.rotation.x = state.pitch * 0.72;
    stars.rotation.y = -state.yaw * 0.45;
    stars.rotation.x = state.pitch * 0.35;
    renderCards();
    renderer.render(scene, camera);
  });
}

closeDetail.addEventListener("click", closeProject);
detail.addEventListener("click", (event) => {
  if (event.target === detail) closeProject();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && detail.classList.contains("is-open")) closeProject();
});
// Remove the old execution lines at the bottom and replace them with this:

async function initGallery() {
  try {
    // Load the JSON file we just generated
    const response = await fetch('./projects.json');
    projects = await response.json();

    // Now that we have the data, build the 3D world!
    buildCards();
    setupDrag();
    setupThree();

    // Run your opening animation
    gsap.from(".brandbar > *", {
      y: -12,
      opacity: 0,
      duration: 0.9,
      stagger: 0.06,
      ease: "power3.out"
    });
    
  } catch (error) {
    console.error("Error loading gallery data:", error);
  }
}

// Start everything
initGallery();

gsap.from(".brandbar > *", {
  y: -12,
  opacity: 0,
  duration: 0.9,
  stagger: 0.06,
  ease: "power3.out"
});
