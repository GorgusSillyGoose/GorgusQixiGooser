import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createDialogSystem } from "https://gorgussillygoose.github.io/SillyGooser/src/js/dialog.js";

const reasons = [
  "I love that even on your most tired days, you still make space for me — from sleepy little messages to waiting up for me when you really should be asleep. It makes the distance feel a lot smaller.",
  "I love your cute chaos. The soil bags, the grow lights, the new plants, and your ever-expanding Audrey jungle somehow all feel exactly right on you.",
  "I love our stupid little language — bao bao, grandma, nerd, gorgus, silly goose — and how we can go from being sweet to completely ridiculous in about three seconds.",
  "I love how natural it feels to care for each other, even from far away. In all the tiny daily ways, serious or silly, you make me feel trusted, close to you, and part of your life.",
  "I love making future plans with you, even when we overanalyse everything. Comparing cave hotels, arguing about the better room and the better view, and you accusing me of choosing one because of the bathtub 😜 — I love all of it.",
  "I love that when I think about us, I can already picture Göreme — cave rooms, good views, probably too much teasing, and finally no screen between us. Thinking about that trip makes me ridiculously happy.",
  "And I love that our future already feels real to me. Maybe Göreme first, maybe one day a home that slowly turns into Audrey's jungle — whatever it looks like, the best part of it is simply that it would be with you.",
];

const finalLines = [
  "七夕快乐, bao bao ❤️",
  "Göreme is getting closer. And I hope it's only one of many places we'll find ourselves together.",
  "One trip, one home, one ridiculous plant jungle at a time. 🪿❤️🐶",
];

const leavesVS = /*glsl*/`
  uniform sampler2D uNoiseMap;
  uniform vec3 uBoxMin, uBoxSize, uRaycast;
  uniform float uTime;
  varying vec3 vObjectPos, vNormal, vWorldNormal;
  varying float vCloseToGround;
  vec4 getTriplanar(sampler2D tex){
    vec4 xPixel = texture(tex, (vObjectPos.xy + uTime) / 3.);
    vec4 yPixel = texture(tex, (vObjectPos.yz + uTime) / 3.);
    vec4 zPixel = texture(tex, (vObjectPos.zx + uTime) / 3.);
    vec4 combined = (xPixel + yPixel + zPixel) / 6.0;
    combined.xyz = combined.xyz * vObjectPos;
    return combined;
  }
  void main(){
    mat4 mouseDisplace = mat4(1.);
    vec3 vWorldPos = vec3(modelMatrix * instanceMatrix * mouseDisplace * vec4(position, 1.));
    vCloseToGround = clamp(vWorldPos.y, 0., 1.);
    vNormal = normalMatrix * mat3(instanceMatrix) * mat3(mouseDisplace) * normalize(normal);
    vWorldNormal = vec3(modelMatrix * instanceMatrix * mouseDisplace * vec4(normal, 0.));
    vObjectPos = ((vWorldPos - uBoxMin) * 2.) / uBoxSize - vec3(1.0);
    vec4 noiseOffset = getTriplanar(uNoiseMap) * vCloseToGround;
    vec4 newPos = instanceMatrix * mouseDisplace * vec4(position, 1.);
    newPos.xyz = newPos.xyz + noiseOffset.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * newPos;
  }
`;

const leavesFS = /*glsl*/`
  #include <common>
  #include <lights_pars_begin>
  uniform vec3 uColorA, uColorB, uColorC;
  uniform float uTime;
  varying vec3 vObjectPos, vNormal, vWorldNormal;
  varying float vCloseToGround;
  vec3 mix3 (vec3 v1, vec3 v2, vec3 v3, float fa){
    vec3 m;
    fa > 0.7 ? m = mix(v2, v3, (fa - .5) * 2.) : m = mix(v1, v2, fa * 2.);
    return m;
  }
  float getPosColors(){
    float p = 0.;
    p = smoothstep(0.2, 0.8, distance(vec3(0.), vObjectPos));
    p = p * (-(vWorldNormal.g / 2.) + 0.5) * (- vObjectPos.y / 9. + 0.5);
    return p;
  }
  float getDiffuse(){
    float intensity = 0.;
    for (int i = 0; i < directionalLights.length(); i++){
      intensity = dot(directionalLights[i].direction, vNormal);
      intensity = smoothstep(0.55, 1., intensity) * 0.2 + pow(smoothstep(0.55, 1., intensity), 0.5);
    }
    return intensity;
  }
  void main(){
    float gradMap = (getPosColors() + getDiffuse()) * vCloseToGround / 2.;
    vec4 c = vec4(mix3(uColorA, uColorB, uColorC, gradMap), 1.0);
    gl_FragColor = vec4(pow(c.xyz, vec3(0.454545)), c.w);
  }
`;

const canvas = document.querySelector("#scene");
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
camera.position.set(-7, 1.4, -12);
camera.lookAt(0.55, 0.65, 0.35);

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const clock = new THREE.Clock();
const mixers = [];
const dummy = new THREE.Object3D();

const dlight = new THREE.DirectionalLight(0xcccccc, 1.8);
dlight.position.set(4, 8, -4);
dlight.castShadow = true;
dlight.shadow.mapSize.set(1024, 1024);
scene.add(dlight);
scene.add(new THREE.HemisphereLight(0xf4ecd8, 0x6f6558, 0.55));
scene.add(new THREE.AmbientLight(0xffffff, 0.12));
const warmLight = new THREE.PointLight(0xff866e, 0, 10, 2);
warmLight.position.set(1.0, 1.2, 0.0);
scene.add(warmLight);

const dialogSystem = createDialogSystem({ camera, talkDistance: 0 });
const dialogGif = "https://gorgussillygoose.github.io/SillyGooser/src/assets/ui/Dog_talk_102x102.gif";

const state = {
  bench: null,
  dog: null,
  goose: null,
  tree: new THREE.Group(),
  leaves: null,
  leafGeometry: null,
  fallingLeaves: [],
  fireflies: [],
  found: new Set(),
  locked: true,
  finaleStarted: false,
  ambienceStarted: false,
};

// Old ground texture, unchanged from SillyGooser.
const groundTexture = textureLoader.load("https://gorgussillygoose.github.io/SillyGooser/src/assets/textures/GroundTexture.png");
groundTexture.colorSpace = THREE.SRGBColorSpace;
groundTexture.minFilter = THREE.NearestFilter;
groundTexture.magFilter = THREE.NearestFilter;
groundTexture.generateMipmaps = false;
groundTexture.center.set(0.5, 0.5);
groundTexture.rotation = -135 * Math.PI / 180;
groundTexture.wrapS = THREE.ClampToEdgeWrapping;
groundTexture.wrapT = THREE.ClampToEdgeWrapping;
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(5.8, 96),
  new THREE.MeshLambertMaterial({ map: groundTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.07;
ground.renderOrder = -10;
ground.receiveShadow = true;
scene.add(ground);

const noiseMap = textureLoader.load("https://gorgussillygoose.github.io/SillyGooser/src/assets/textures/noise.png");
const leavesMat = new THREE.ShaderMaterial({
  lights: true,
  side: THREE.DoubleSide,
  uniforms: {
    ...THREE.UniformsLib.lights,
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(0xb45252) },
    uColorB: { value: new THREE.Color(0xd3a068) },
    uColorC: { value: new THREE.Color(0xede19e) },
    uBoxMin: { value: new THREE.Vector3() },
    uBoxSize: { value: new THREE.Vector3(10, 10, 10) },
    uRaycast: { value: new THREE.Vector3() },
    uNoiseMap: { value: noiseMap },
  },
  vertexShader: leavesVS,
  fragmentShader: leavesFS,
});

function toonify(root) {
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
}

function seededRandom(seed = 1) {
  let x = seed >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

function createGrassSprite(texture, { x, z, scale, opacity, renderOrder }) {
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity, depthWrite: false, alphaTest: 0.02 });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0);
  sprite.position.set(x, 0, z);
  sprite.renderOrder = renderOrder;
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

function createGroundGrassLayer() {
  const group = new THREE.Group();
  const rng = seededRandom(1919);
  for (let i = 1; i <= 10; i++) {
    const texture = textureLoader.load(`https://gorgussillygoose.github.io/SillyGooser/src/assets/textures/Grass_sprites/Grass_Sprite_${i}.png`);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    const angle = rng() * Math.PI * 2;
    const radius = 0.9 + Math.sqrt(rng()) * (5.45 - 0.9);
    const scale = 0.70 + rng() * 0.24;
    group.add(createGrassSprite(texture, {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      scale,
      opacity: 0.88 + rng() * 0.1,
      renderOrder: -9 - (i % 2),
    }));
  }
  return group;
}
scene.add(createGroundGrassLayer());

const bushLayers = [
  { radius: 6, count: 17, scale: 1.86, y: 0.34, opacity: 0.37, angleOffset: 0.05, prefix: "back" },
  { radius: 5.8, count: 15, scale: 1.54, y: 0.26, opacity: 0.52, angleOffset: 0.21, prefix: "mid" },
  { radius: 5.6, count: 14, scale: 1.18, y: 0.13, opacity: 0.60, angleOffset: -0.14, prefix: "front" },
];
const bushRing = new THREE.Group();
bushLayers.forEach((layer, layerIndex) => {
  for (let i = 0; i < layer.count; i++) {
    const asset = `bg_bush_${layer.prefix}_0${(i % 3) + 1}.png`;
    const texture = textureLoader.load(`https://gorgussillygoose.github.io/SillyGooser/src/assets/textures/Bush_Sprites/${asset}`);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: layer.opacity, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const angle = layer.angleOffset + (i / layer.count) * Math.PI * 2;
    const sprite = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    sprite.position.set(Math.cos(angle) * layer.radius, layer.y + ((i % 3) - 1) * .025, Math.sin(angle) * layer.radius);
    const scaleJitter = .9 + ((i * 19 + layerIndex * 7) % 9) * .025;
    sprite.scale.set(layer.scale * scaleJitter, layer.scale * .7 * scaleJitter, 1);
    sprite.lookAt(0, sprite.position.y, 0);
    sprite.renderOrder = -7 - layerIndex;
    bushRing.add(sprite);
  }
});
scene.add(bushRing);

async function loadTree() {
  const obj = await loader.loadAsync("./assets/models/tree.glb");
  const pole = obj.scene.getObjectByName("Pole");
  const crown = obj.scene.getObjectByName("Leaves");
  const leaf = obj.scene.getObjectByName("Leaf");
  if (!pole || !crown || !leaf) {
    toonify(obj.scene);
    scene.add(obj.scene);
    return;
  }
  pole.material = new THREE.MeshToonMaterial({ map: pole.material?.map || null });
  pole.position.y -= .1;
  pole.castShadow = true;
  pole.receiveShadow = true;
  const bbox = new THREE.Box3().setFromObject(crown);
  leavesMat.uniforms.uBoxMin.value.copy(bbox.min);
  leavesMat.uniforms.uBoxSize.value.copy(bbox.getSize(new THREE.Vector3()));
  const count = crown.geometry.attributes.position.count;
  const leaves = new THREE.InstancedMesh(leaf.geometry, leavesMat, count);
  leaves.castShadow = true;
  for (let i = 0; i < count; i++) {
    dummy.position.set(
      crown.geometry.attributes.position.array[i * 3],
      crown.geometry.attributes.position.array[i * 3 + 1],
      crown.geometry.attributes.position.array[i * 3 + 2]
    );
    dummy.lookAt(
      dummy.position.x + crown.geometry.attributes.normal.array[i * 3],
      dummy.position.y + crown.geometry.attributes.normal.array[i * 3 + 1],
      dummy.position.z + crown.geometry.attributes.normal.array[i * 3 + 2]
    );
    const s = .82 + ((i * 17) % 20) / 100;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
  }
  state.tree.add(pole, leaves);
  state.leaves = leaves;
  state.leafGeometry = leaf.geometry;
  scene.add(state.tree);
}

async function loadBench() {
  const obj = await loader.loadAsync("./assets/models/bench.glb");
  state.bench = obj.scene;
  state.bench.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
  const box = new THREE.Box3().setFromObject(state.bench);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 1.4 / Math.max(size.x, size.y, size.z);
  state.bench.scale.setScalar(scale);
  state.bench.position.x = .9 - center.x * scale;
  state.bench.rotation.y = 300 * Math.PI / 180;
  state.bench.position.y = -.05 - box.min.y * scale;
  state.bench.position.z = .5 - center.z * scale;
  scene.add(state.bench);
  trySeatCharacters();
}

async function loadDog() {
  const obj = await loader.loadAsync("./assets/models/dog.glb");
  state.dog = obj.scene;
  toonify(state.dog);
  const box = new THREE.Box3().setFromObject(state.dog);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = .68 * 3.5 / Math.max(size.x, size.y, size.z);
  state.dog.scale.set(scale * 1.1, scale, scale);
  state.dog.position.set(1 - center.x * scale, -.35 - box.min.y * scale, -1.4 - center.z * scale);
  state.dog.rotation.y = 220 * Math.PI / 180;
  if (obj.animations?.length) {
    const mixer = new THREE.AnimationMixer(state.dog);
    mixer.clipAction(obj.animations[0]).play();
    mixer.timeScale = .8;
    mixers.push(mixer);
  }
  trySeatCharacters();
}

async function loadGoose() {
  const obj = await loader.loadAsync("./assets/models/Goose.glb");
  state.goose = obj.scene;
  toonify(state.goose);
  const box = new THREE.Box3().setFromObject(state.goose);
  const size = box.getSize(new THREE.Vector3());
  const scale = .65 / Math.max(size.x, size.y, size.z);
  state.goose.scale.set(scale * .9, scale, scale);
  const mixer = new THREE.AnimationMixer(state.goose);
  const sitClip = obj.animations.find((clip) => /sit|seat|perch|rest/i.test(clip.name));
  const idleClip = obj.animations.find((clip) => /idle/i.test(clip.name));
  const clip = sitClip || idleClip || obj.animations[0];
  if (clip) {
    const action = mixer.clipAction(clip);
    action.play();
    mixer.timeScale = .5;
    mixers.push(mixer);
  }
  trySeatCharacters();
}

function trySeatCharacters() {
  if (!state.bench) return;
  if (state.dog && state.dog.parent !== state.bench) {
    if (state.dog.parent) state.dog.removeFromParent();
    state.bench.add(state.dog);
  }
  if (state.goose && state.goose.parent !== state.bench) {
    if (state.goose.parent) state.goose.removeFromParent();
    state.bench.add(state.goose);
    state.goose.position.set(-.58, -.1, -.5);
    state.goose.rotation.y = 210 * Math.PI / 180;
  }
}

function createFireflies() {
  for (let i = 0; i < 28; i++) {
    const material = new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? 0xff9bac : 0xffd59c, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(.015 + (i % 3) * .004, 6, 6), material);
    const angle = (i / 28) * Math.PI * 2;
    const r = 1.3 + (i % 7) * .35;
    mesh.position.set(Math.cos(angle) * r, .25 + ((i * 37) % 120) / 100, Math.sin(angle) * r * .5);
    mesh.userData.baseY = mesh.position.y;
    mesh.userData.phase = i * .7;
    scene.add(mesh);
    state.fireflies.push(mesh);
  }
}
createFireflies();

function createFallingLeaves() {
  if (!state.leafGeometry || state.fallingLeaves.length) return;
  for (let i = 0; i < 26; i++) {
    const mat = new THREE.MeshToonMaterial({ color: [0xb45252, 0xd06b5d, 0xd3a068, 0xe3b879][i % 4], side: THREE.DoubleSide, transparent: true, opacity: 0 });
    const leaf = new THREE.Mesh(state.leafGeometry, mat);
    leaf.scale.setScalar(.75 + (i % 4) * .09);
    leaf.position.set(-2 + ((i * 41) % 400) / 100, 1.0 + ((i * 53) % 300) / 100, -.7 + ((i * 31) % 220) / 100);
    leaf.userData.speed = .13 + (i % 5) * .025;
    leaf.userData.phase = i * .63;
    scene.add(leaf);
    state.fallingLeaves.push(leaf);
  }
}

function buildAmbientStars() {
  const holder = document.querySelector("#ambientStars");
  for (let i = 0; i < 58; i++) {
    const dot = document.createElement("i");
    dot.style.left = `${4 + ((i * 37) % 92)}%`;
    dot.style.top = `${6 + ((i * 53) % 48)}%`;
    dot.style.animationDelay = `${(i % 11) * .17}s`;
    dot.style.transform = `scale(${.65 + (i % 4) * .18})`;
    holder.appendChild(dot);
  }
}
buildAmbientStars();

function buildQixiBridge() {
  const holder = document.querySelector("#qixiBridge");
  for (let i = 0; i < 25; i++) {
    const t = i / 24;
    const dot = document.createElement("i");
    dot.style.left = `${27 + t * 46}%`;
    dot.style.top = `${30 - Math.sin(t * Math.PI) * 9}%`;
    dot.style.animationDelay = `${i * .08}s`;
    holder.appendChild(dot);
  }
}
buildQixiBridge();

const music = new Audio("https://gorgussillygoose.github.io/SillyGooser/src/assets/Audio/Background_song.mp3");
music.loop = true;
music.volume = .22;
function startAmbience() {
  if (state.ambienceStarted) return;
  state.ambienceStarted = true;
  music.play().catch(() => {});
}

const clickableStars = document.querySelector("#clickableStars");
clickableStars.classList.add("is-loading");
const stars = [...document.querySelectorAll(".love-star")];
const counterValue = document.querySelector("#counterValue");
const hintText = document.querySelector("#hintText");
const warmHalo = document.querySelector("#warmHalo");
const ambientStars = document.querySelector("#ambientStars");
const qixiBridge = document.querySelector("#qixiBridge");
const balloons = document.querySelector("#balloons");
const finalBadge = document.querySelector("#finalBadge");
const title = document.querySelector("#qixiTitle");

stars.forEach((star) => {
  star.addEventListener("click", () => {
    const index = Number(star.dataset.index);
    if (state.locked || state.found.has(index) || state.finaleStarted) return;
    startAmbience();
    state.locked = true;
    state.found.add(index);
    star.classList.add("is-found");
    counterValue.textContent = String(state.found.size);
    applyStage(state.found.size);

    dialogSystem.openDogDialog(reasons[index], {
      npcName: "DOGGO",
      gifSrc: dialogGif,
      postCloseAction: () => {
        state.locked = false;
        hintText.textContent = state.found.size < 7 ? "Find another star ✦" : "one more thing... ♥";
        if (state.found.size === 7) startFinale();
      },
    });
  });
});

function applyStage(stage) {
  if (stage >= 2) {
    state.fireflies.forEach((fly) => { fly.material.opacity = .72; });
  }
  if (stage >= 3) {
    createFallingLeaves();
    state.fallingLeaves.forEach((leaf) => { leaf.material.opacity = .9; });
  }
  if (stage >= 4) ambientStars.classList.add("is-visible");
  if (stage >= 5) {
    warmHalo.classList.add("is-visible");
    warmLight.intensity = 2.0;
  }
  if (stage >= 6) qixiBridge.classList.add("is-visible");
}

function startFinale() {
  if (state.finaleStarted) return;
  state.finaleStarted = true;
  balloons.classList.add("is-visible");
  finalBadge.hidden = false;
  title.classList.add("is-final");
  warmLight.intensity = 2.6;
  window.setTimeout(() => {
    dialogSystem.openDogDialog(finalLines, {
      npcName: "DOGGO",
      gifSrc: dialogGif,
      postCloseAction: () => {
        hintText.textContent = "Happy Qixi, bao bao ❤️";
      },
    });
  }, 700);
}

window.addEventListener("keydown", (event) => dialogSystem.handleKeyDown(event));
window.addEventListener("keyup", (event) => dialogSystem.handleKeyUp(event));

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / Math.max(window.innerHeight, 1);
  camera.updateProjectionMatrix();
  if (window.innerWidth < window.innerHeight) {
    camera.position.set(-8.6, 2.2, -15.6);
    camera.lookAt(.45, .75, .2);
  } else {
    camera.position.set(-7, 1.4, -12);
    camera.lookAt(.55, .65, .35);
  }
}
window.addEventListener("resize", resize);
resize();

Promise.allSettled([loadTree(), loadBench(), loadDog(), loadGoose()]).then(() => {
  createFallingLeaves();
  state.fallingLeaves.forEach((leaf) => { leaf.material.opacity = 0; });
  state.locked = false;
  clickableStars.classList.remove("is-loading");
  hintText.textContent = "Find the seven stars ✦";
  const loading = document.querySelector("#loading");
  loading.classList.add("is-done");
  window.setTimeout(() => { loading.hidden = true; }, 400);
});

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  const elapsed = clock.elapsedTime;
  mixers.forEach((m) => m.update(delta));
  leavesMat.uniforms.uTime.value = elapsed * .015;

  state.fireflies.forEach((fly, i) => {
    fly.position.y = fly.userData.baseY + Math.sin(elapsed * .75 + fly.userData.phase) * .07;
    if (fly.material.opacity > 0) fly.material.opacity = .52 + Math.sin(elapsed * 1.45 + i) * .22;
  });

  state.fallingLeaves.forEach((leaf, i) => {
    if (leaf.material.opacity <= 0) return;
    leaf.position.y -= delta * leaf.userData.speed;
    leaf.position.x += Math.sin(elapsed * .65 + leaf.userData.phase) * delta * .07;
    leaf.rotation.x += delta * (.15 + (i % 3) * .05);
    leaf.rotation.z += delta * (.22 + (i % 4) * .04);
    if (leaf.position.y < .05) leaf.position.y = 3.2 + (i % 7) * .18;
  });

  renderer.render(scene, camera);
}
animate();
