import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// -----------------------------------------------------------------------------
// EDIT THESE 7 LINES. Keep them specific to her where you can.
// The page works immediately with these defaults, so you can personalize later.
// -----------------------------------------------------------------------------
const reasons = [
  "I love that even on your most tired days, you still make space for me — from sleepy little messages to waiting up for me when you really should be asleep. It makes the distance feel a lot smaller.",
  "I love your cute chaos. The soil bags, the grow lights, the new plants, and your ever-expanding Audrey jungle somehow all feel exactly right on you.",
  "I love our stupid little language — bao bao, grandma, nerd, gorgus, silly goose — and how we can go from being sweet to completely ridiculous in about three seconds.",
  "I love how natural it feels to care for each other, even from far away. In all the tiny daily ways, serious or silly, you make me feel trusted, close to you, and part of your life.",
  "I love making future plans with you, even when we overanalyse everything. Comparing cave hotels, arguing about the better room and the better view, and you accusing me of choosing one because of the bathtub 😜 — I love all of it.",
  "I love that when I think about us, I can already picture Göreme — cave rooms, good views, probably too much teasing, and finally no screen between us. Thinking about that trip makes me ridiculously happy.",
  "And I love that our future already feels real to me. Maybe Göreme first, maybe one day a home that slowly turns into Audrey's jungle — whatever it looks like, the best part of it is simply that it would be with you.",
];

const sceneHost = document.querySelector("#scene");
const intro = document.querySelector("#intro");
const startButton = document.querySelector("#startButton");
const starsWrap = document.querySelector("#stars");
const stars = [...document.querySelectorAll(".love-star")];
const reasonPanel = document.querySelector("#reasonPanel");
const reasonNumber = document.querySelector("#reasonNumber");
const reasonText = document.querySelector("#reasonText");
const progressLabel = document.querySelector("#progressLabel");
const progressDots = document.querySelector("#progressDots");
const closeReason = document.querySelector("#closeReason");
const ending = document.querySelector("#ending");
const loading = document.querySelector("#loading");

const found = new Set();
let currentReason = null;
let endingStarted = false;

for (let i = 0; i < reasons.length; i += 1) {
  const dot = document.createElement("span");
  dot.className = "progress-dot";
  progressDots.appendChild(dot);
}

startButton.addEventListener("click", () => {
  intro.classList.add("is-leaving");
  window.setTimeout(() => {
    intro.hidden = true;
    starsWrap.hidden = false;
  }, 430);
});

stars.forEach((star) => {
  star.addEventListener("click", () => {
    const index = Number(star.dataset.index);
    if (!Number.isInteger(index) || found.has(index) || endingStarted) return;

    currentReason = index;
    found.add(index);
    star.classList.add("is-found");
    showReason(index);
  });
});

closeReason.addEventListener("click", () => {
  reasonPanel.hidden = true;
  reasonPanel.classList.remove("is-entering");
  currentReason = null;

  if (found.size === reasons.length) {
    startEnding();
  }
});

function showReason(index) {
  reasonNumber.textContent = `little thing ${index + 1}`;
  reasonText.textContent = reasons[index];
  progressLabel.textContent = `${found.size} / ${reasons.length}`;

  [...progressDots.children].forEach((dot, dotIndex) => {
    dot.classList.toggle("is-found", found.has(dotIndex));
  });

  closeReason.textContent = found.size === reasons.length ? "one more thing... ♥" : "keep looking ✦";
  reasonPanel.hidden = false;
  reasonPanel.classList.remove("is-entering");
  requestAnimationFrame(() => reasonPanel.classList.add("is-entering"));
}

function startEnding() {
  if (endingStarted) return;
  endingStarted = true;
  starsWrap.hidden = true;
  ending.hidden = false;
  finalPose.active = true;
  burstTinyStars();
}

function burstTinyStars() {
  const shell = document.querySelector(".qixi-shell");
  for (let i = 0; i < 26; i += 1) {
    const sparkle = document.createElement("span");
    sparkle.textContent = i % 4 === 0 ? "♥" : "✦";
    sparkle.style.position = "absolute";
    sparkle.style.zIndex = "8";
    sparkle.style.left = `${44 + Math.random() * 12}%`;
    sparkle.style.top = `${44 + Math.random() * 12}%`;
    sparkle.style.color = i % 4 === 0 ? "#ff8ca1" : "#ffd9a7";
    sparkle.style.fontFamily = "Georgia, serif";
    sparkle.style.fontSize = `${10 + Math.random() * 12}px`;
    sparkle.style.pointerEvents = "none";
    sparkle.style.transition = "transform 1400ms ease-out, opacity 1400ms ease-out";
    shell.appendChild(sparkle);

    requestAnimationFrame(() => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 90 + Math.random() * 180;
      sparkle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) rotate(${Math.random() * 160 - 80}deg)`;
      sparkle.style.opacity = "0";
    });

    window.setTimeout(() => sparkle.remove(), 1500);
  }
}

// -----------------------------------------------------------------------------
// Tiny Three.js scene. It deliberately reuses only Goose.glb + dog.glb so this
// stays much lighter than the birthday world.
// -----------------------------------------------------------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(0, 1.65, 5.4);
camera.lookAt(0, 0.72, 0);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute("aria-hidden", "true");
sceneHost.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const loader = new GLTFLoader();
const mixers = [];

const hemi = new THREE.HemisphereLight(0xffe5d1, 0x1a0a24, 1.55);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xffb785, 2.15);
keyLight.position.set(-3.5, 6, 4.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const rimLight = new THREE.PointLight(0xb47cff, 4.5, 10, 2);
rimLight.position.set(2.4, 2.6, 1.4);
scene.add(rimLight);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(3.4, 48),
  new THREE.MeshToonMaterial({ color: 0x2b1732, transparent: true, opacity: 0.88 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.015;
ground.receiveShadow = true;
scene.add(ground);

// Soft rings on the floor make it feel like a tiny stage rather than an empty void.
for (const radius of [1.7, 2.25, 2.85]) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius, radius + 0.014, 80),
    new THREE.MeshBasicMaterial({ color: 0x8d4a63, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.005;
  scene.add(ring);
}

const fireflies = new THREE.Group();
scene.add(fireflies);
for (let i = 0; i < 25; i += 1) {
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.012 + Math.random() * 0.012, 6, 6),
    new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xff92a5 : 0xffd49c })
  );
  const a = Math.random() * Math.PI * 2;
  const r = 1.4 + Math.random() * 2.6;
  dot.position.set(Math.cos(a) * r, 0.2 + Math.random() * 1.6, Math.sin(a) * r * 0.35 - 0.35);
  dot.userData.baseY = dot.position.y;
  dot.userData.phase = Math.random() * Math.PI * 2;
  fireflies.add(dot);
}

const characterState = {
  goose: null,
  dog: null,
  gooseStartX: -1.35,
  dogStartX: 1.35,
};

const finalPose = { active: false, amount: 0 };

Promise.allSettled([
  loadCharacter("./assets/models/Goose.glb", "goose"),
  loadCharacter("./assets/models/dog.glb", "dog"),
]).then(() => {
  loading.classList.add("is-done");
  window.setTimeout(() => { loading.hidden = true; }, 300);
});

async function loadCharacter(path, kind) {
  const gltf = await loader.loadAsync(path);
  const root = gltf.scene;

  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;

    const source = child.material || {};
    child.material = new THREE.MeshToonMaterial({
      map: source.map || null,
      color: source.color || 0xffffff,
      skinning: child.isSkinnedMesh,
      morphTargets: Boolean(child.morphTargetInfluences),
      morphNormals: Boolean(child.morphTargetInfluences),
      flatShading: true,
    });
  });

  normalizeToGround(root, kind === "goose" ? 1.08 : 1.2);

  if (kind === "goose") {
    root.position.x = characterState.gooseStartX;
    root.position.z = 0.05;
    root.rotation.y = Math.PI * 0.18;
    characterState.goose = root;
  } else {
    root.position.x = characterState.dogStartX;
    root.position.z = 0;
    root.rotation.y = Math.PI * 1.18;
    characterState.dog = root;
  }

  scene.add(root);

  if (gltf.animations?.length) {
    const mixer = new THREE.AnimationMixer(root);
    const idle = gltf.animations.find((clip) => /idle/i.test(clip.name)) || gltf.animations[0];
    const action = mixer.clipAction(idle);
    action.play();
    mixer.timeScale = kind === "goose" ? 0.55 : 0.8;
    mixers.push(mixer);
  }
}

function normalizeToGround(root, targetSize) {
  root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxSize;
  root.scale.setScalar(scale);

  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
}

function resize() {
  const { clientWidth, clientHeight } = sceneHost;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / Math.max(clientHeight, 1);
  camera.updateProjectionMatrix();

  // Pull the camera back a little on portrait phones so both characters remain visible.
  if (clientWidth < clientHeight) {
    camera.position.set(0, 1.68, 6.25);
  } else {
    camera.position.set(0, 1.65, 5.4);
  }
  camera.lookAt(0, 0.72, 0);
}

window.addEventListener("resize", resize);
resize();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  mixers.forEach((mixer) => mixer.update(delta));

  fireflies.children.forEach((dot, index) => {
    dot.position.y = dot.userData.baseY + Math.sin(elapsed * 0.8 + dot.userData.phase) * 0.05;
    dot.material.opacity = 0.7 + Math.sin(elapsed * 1.5 + index) * 0.2;
    dot.material.transparent = true;
  });

  if (finalPose.active) {
    finalPose.amount = Math.min(1, finalPose.amount + delta * 0.62);
    const smooth = finalPose.amount * finalPose.amount * (3 - 2 * finalPose.amount);

    if (characterState.goose) {
      characterState.goose.position.x = THREE.MathUtils.lerp(characterState.gooseStartX, -0.5, smooth);
      characterState.goose.rotation.y = THREE.MathUtils.lerp(Math.PI * 0.18, Math.PI * 0.34, smooth);
    }
    if (characterState.dog) {
      characterState.dog.position.x = THREE.MathUtils.lerp(characterState.dogStartX, 0.5, smooth);
      characterState.dog.rotation.y = THREE.MathUtils.lerp(Math.PI * 1.18, Math.PI * 1.08, smooth);
    }
  }

  renderer.render(scene, camera);
}

animate();
