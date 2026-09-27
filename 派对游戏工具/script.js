const MAX_DICE = 6;
const DIE_COLORS = [0xff6f69, 0xffc84e, 0x55a8f5, 0x8bcf9f, 0xb396ef, 0xff94b6];

const state = {
  sides: 6,
  count: 2,
  history: [],
  rolling: false,
  scene: null,
};

const countOutput = document.querySelector("#dice-count");
const rollButton = document.querySelector("#roll-button");
const resultDice = document.querySelector("#result-dice");
const resultTotal = document.querySelector("#result-total");
const resultMessage = document.querySelector("#result-message");
const historySection = document.querySelector(".history");
const historyList = document.querySelector("#history-list");
const stageCaption = document.querySelector("#stage-caption");

document.querySelectorAll(".die-type").forEach((button) => {
  button.addEventListener("click", () => {
    if (state.rolling) return;
    state.sides = Number(button.dataset.sides);
    document.querySelectorAll(".die-type").forEach((option) => {
      const selected = option === button;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
    state.scene?.setDice(state.count, state.sides);
    resetResult();
  });
});

document.querySelector("#decrease-count").addEventListener("click", () => changeCount(-1));
document.querySelector("#increase-count").addEventListener("click", () => changeCount(1));
rollButton.addEventListener("click", rollDice);

function changeCount(amount) {
  if (state.rolling) return;
  state.count = Math.max(1, Math.min(MAX_DICE, state.count + amount));
  countOutput.textContent = String(state.count);
  document.querySelector("#decrease-count").disabled = state.count === 1;
  document.querySelector("#increase-count").disabled = state.count === MAX_DICE;
  state.scene?.setDice(state.count, state.sides);
  resetResult();
}

function resetResult() {
  resultDice.replaceChildren();
  resultTotal.textContent = "？";
  resultTotal.classList.remove("has-results");
  resultMessage.textContent = "准备好了就摇一摇吧！";
  stageCaption.textContent = "点一下，让好运滚出来！";
}

function rollDice() {
  if (state.rolling) return;
  state.rolling = true;
  rollButton.disabled = true;
  rollButton.querySelector("span:last-child").textContent = "摇呀摇…";
  stageCaption.textContent = "骰子们正在翻跟头！";
  resultMessage.textContent = "马上就知道啦！";

  const values = Array.from({ length: state.count }, () => 1 + Math.floor(Math.random() * state.sides));
  const finish = () => finishRoll(values);

  if (state.scene) {
    state.scene.roll(values).then(finish);
  } else {
    window.setTimeout(finish, 900);
  }
}

function finishRoll(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  resultDice.replaceChildren(...values.map((value, index) => {
    const badge = document.createElement("span");
    badge.className = "result-die";
    badge.textContent = `第 ${index + 1} 颗：${value}`;
    return badge;
  }));
  resultTotal.textContent = String(total);
  resultTotal.classList.remove("has-results");
  void resultTotal.offsetWidth;
  resultTotal.classList.add("has-results");
  resultMessage.textContent = values.length === 1
    ? `这颗骰子掷出了 ${values[0]} 点！`
    : `${values.length} 颗骰子，一共 ${total} 点！`;
  stageCaption.textContent = "好棒的结果！再来一局吧！";

  state.history.unshift({ sides: state.sides, values, total });
  state.history.length = Math.min(state.history.length, 5);
  renderHistory();

  state.rolling = false;
  rollButton.disabled = false;
  rollButton.querySelector("span:last-child").textContent = "再摇一次！";
}

function renderHistory() {
  historyList.replaceChildren(...state.history.map(({ sides, values, total }) => {
    const item = document.createElement("li");
    item.textContent = `D${sides} × ${values.length} · ${values.join(" + ")} = ${total}`;
    return item;
  }));
  historySection.hidden = state.history.length === 0;
}

document.querySelector("#decrease-count").disabled = state.count === 1;
document.querySelector("#increase-count").disabled = state.count === MAX_DICE;

loadThreeScene();

async function loadThreeScene() {
  const loading = document.querySelector("#dice-loading");
  try {
    const [THREE, { RoundedBoxGeometry }] = await Promise.all([
      import("three"),
      import("three/addons/geometries/RoundedBoxGeometry.js"),
    ]);
    state.scene = createDiceScene(THREE, RoundedBoxGeometry);
    state.scene.setDice(state.count, state.sides);
    loading.remove();
  } catch (error) {
    loading.textContent = "3D 骰子没加载好，请联网并用本地服务器打开页面。";
    console.error("Unable to load the Three.js dice scene.", error);
  }
}

function createDiceScene(THREE, RoundedBoxGeometry) {
  const container = document.querySelector("#dice-render");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(0, 5.6, 11.8);
  camera.lookAt(0, 0.45, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.append(renderer.domElement);

  const hemisphere = new THREE.HemisphereLight(0xffffff, 0x8ab0d6, 2.15);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
  keyLight.position.set(-4, 8, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  keyLight.shadow.bias = -0.0002;
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0xffe2a2, 17, 20);
  fillLight.position.set(5, 2, 4);
  scene.add(fillLight);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4.8, 64),
    new THREE.MeshStandardMaterial({ color: 0x86c8fb, roughness: 0.65, metalness: 0.02 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.48;
  floor.receiveShadow = true;
  scene.add(floor);

  const dice = [];
  const clock = new THREE.Clock();
  const rollAnimations = [];
  const spinQuaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const rendererElement = renderer.domElement;

  function buildDie(sides, index) {
    const group = new THREE.Group();
    const color = DIE_COLORS[index % DIE_COLORS.length];
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.27,
      metalness: 0.015,
      clearcoat: 0.48,
      clearcoatRoughness: 0.22,
      flatShading: sides !== 6,
    });

    let geometry;
    if (sides === 4) geometry = new THREE.TetrahedronGeometry(0.91, 0);
    else if (sides === 6) geometry = new RoundedBoxGeometry(1.68, 1.68, 1.68, 6, 0.2);
    else if (sides === 8) geometry = new THREE.OctahedronGeometry(1, 0);
    else if (sides === 10) geometry = createD10Geometry(THREE);
    else if (sides === 12) geometry = new THREE.DodecahedronGeometry(1, 0);
    else geometry = new THREE.IcosahedronGeometry(1, 0);

    const body = new THREE.Mesh(geometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const faceNormals = sides === 6
      ? addPips(THREE, group)
      : addFaceLabels(THREE, group, geometry, sides);

    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, sides === 6 ? 36 : 5),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 }),
    );
    group.add(edge);
    group.scale.setScalar(state.count <= 2 ? 1.22 : state.count <= 3 ? 1.08 : 0.92);
    const spacing = state.count <= 2 ? 2.75 : state.count <= 3 ? 2.4 : 1.85;
    group.position.set((index - (state.count - 1) / 2) * spacing, 0.72, 0);
    group.rotation.set(-0.2 + index * 0.08, 0.15 * index, -0.2 + index * 0.1);
    scene.add(group);

    return { group, faceNormals, index, sides };
  }

  function addPips(THREE, group) {
    const pips = new THREE.Group();
    const pipMaterial = new THREE.MeshStandardMaterial({ color: 0x304b72, roughness: 0.3 });
    const pipGeometry = new THREE.SphereGeometry(0.082, 16, 12);
    const faceLayout = [
      { normal: new THREE.Vector3(0, 0, 1), value: 1 },
      { normal: new THREE.Vector3(0, 0, -1), value: 6 },
      { normal: new THREE.Vector3(0, 1, 0), value: 2 },
      { normal: new THREE.Vector3(0, -1, 0), value: 5 },
      { normal: new THREE.Vector3(1, 0, 0), value: 3 },
      { normal: new THREE.Vector3(-1, 0, 0), value: 4 },
    ];
    const offsetsByValue = {
      1: [[0, 0]],
      2: [[-0.23, 0.23], [0.23, -0.23]],
      3: [[-0.23, 0.23], [0, 0], [0.23, -0.23]],
      4: [[-0.23, 0.23], [0.23, 0.23], [-0.23, -0.23], [0.23, -0.23]],
      5: [[-0.23, 0.23], [0.23, 0.23], [0, 0], [-0.23, -0.23], [0.23, -0.23]],
      6: [[-0.23, 0.25], [-0.23, 0], [-0.23, -0.25], [0.23, 0.25], [0.23, 0], [0.23, -0.25]],
    };

    faceLayout.forEach(({ normal, value }) => {
      const face = new THREE.Group();
      face.position.copy(normal).multiplyScalar(0.835);
      face.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      offsetsByValue[value].forEach(([x, y]) => {
        const pip = new THREE.Mesh(pipGeometry, pipMaterial);
        pip.position.set(x, y, 0.012);
        pip.scale.set(1, 1, 0.38);
        face.add(pip);
      });
      pips.add(face);
    });
    group.add(pips);
    return faceLayout;
  }

  function addFaceLabels(THREE, group, geometry, sides) {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    const positions = flat.getAttribute("position");
    const faces = new Map();

    for (let offset = 0; offset < positions.count; offset += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(positions, offset);
      const b = new THREE.Vector3().fromBufferAttribute(positions, offset + 1);
      const c = new THREE.Vector3().fromBufferAttribute(positions, offset + 2);
      const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
      if (normal.dot(a) < 0) normal.negate();
      const key = `${normal.x.toFixed(3)},${normal.y.toFixed(3)},${normal.z.toFixed(3)}`;
      const center = a.add(b).add(c).multiplyScalar(1 / 3);
      const face = faces.get(key) ?? { normal, center: new THREE.Vector3(), count: 0 };
      face.center.add(center);
      face.count += 1;
      faces.set(key, face);
    }

    const faceList = [...faces.values()].map((face) => ({
      normal: face.normal,
      center: face.center.multiplyScalar(1 / face.count),
    }));

    faceList.forEach((face, index) => {
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.38, 0.38),
        makeNumberMaterial(THREE, index + 1, sides),
      );
      label.position.copy(face.center).addScaledVector(face.normal, 0.025);
      label.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), face.normal);
      label.renderOrder = 2;
      group.add(label);
    });

    return faceList;
  }

  function makeNumberMaterial(THREE, value, sides) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, 128, 128);
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(64, 64, 57, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#304b72";
    context.font = `900 ${sides > 9 ? 53 : 66}px Nunito, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(value), 64, 66);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
  }

  function setDice(count, sides) {
    dice.forEach(({ group }) => {
      scene.remove(group);
      group.traverse((child) => {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
        else child.material?.dispose();
        child.material?.map?.dispose();
      });
    });
    dice.length = 0;
    rollAnimations.length = 0;

    for (let index = 0; index < count; index += 1) {
      dice.push(buildDie(sides, index));
    }
    resize();
  }

  function roll(values) {
    const startedAt = performance.now();
    const duration = 1280;
    rollAnimations.length = 0;

    dice.forEach((die, index) => {
      const face = die.sides === 6
        ? die.faceNormals.find((candidate) => candidate.value === values[index])
        : die.faceNormals[values[index] - 1];
      const target = new THREE.Quaternion().setFromUnitVectors(face.normal, up);
      target.premultiply(new THREE.Quaternion().setFromAxisAngle(up, Math.random() * Math.PI * 2));
      rollAnimations.push({
        die,
        startedAt: startedAt + index * 65,
        duration: duration + index * 65,
        start: die.group.quaternion.clone(),
        target,
      });
    });

    return new Promise((resolve) => {
      const checkComplete = () => {
        if (rollAnimations.every((animation) => animation.done)) resolve();
        else requestAnimationFrame(checkComplete);
      };
      checkComplete();
    });
  }

  function createD10Geometry(THREE) {
    const positions = [];
    const ring = Array.from({ length: 5 }, (_, index) => {
      const angle = (index / 5) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * 0.83, 0, Math.sin(angle) * 0.83);
    });
    const top = new THREE.Vector3(0, 1, 0);
    const bottom = new THREE.Vector3(0, -1, 0);

    function addOutwardTriangle(a, b, c) {
      const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
      const center = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
      if (normal.dot(center) < 0) [b, c] = [c, b];
      positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    }

    for (let index = 0; index < ring.length; index += 1) {
      addOutwardTriangle(top, ring[index], ring[(index + 1) % ring.length]);
      addOutwardTriangle(bottom, ring[(index + 1) % ring.length], ring[index]);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.position.x = width < 440 ? 0 : width < 700 ? -0.25 : 0;
    camera.position.z = state.count <= 3
      ? (width < 650 ? 9.8 : 9.5)
      : (width < 650 ? 13.2 : 11.8);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const elapsed = clock.getElapsedTime();

    dice.forEach((die) => {
      const animation = rollAnimations.find((item) => item.die === die);
      if (animation && !animation.done) {
        const progress = Math.max(0, Math.min(1, (now - animation.startedAt) / animation.duration));
        const eased = 1 - Math.pow(1 - progress, 3);
        die.group.quaternion.copy(animation.start).slerp(animation.target, eased);
        spinQuaternion.setFromEuler(new THREE.Euler(progress * Math.PI * 6, progress * Math.PI * 8, progress * Math.PI * 4));
        die.group.quaternion.multiply(spinQuaternion);
        die.group.position.y = 0.76 + Math.sin(progress * Math.PI * 5) * (1 - progress) * 0.74;
        if (progress === 1) {
          die.group.quaternion.copy(animation.target);
          die.group.position.y = 0.76;
          animation.done = true;
        }
      } else if (!animation) {
        die.group.position.y = 0.74 + Math.sin(elapsed * 1.6 + die.index) * 0.045;
        die.group.rotation.z += Math.sin(elapsed + die.index) * 0.00025;
      }
    });

    renderer.render(scene, camera);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  animate();

  return { setDice, roll };
}
