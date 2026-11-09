import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createReferenceShrub } from './referenceShrubs.js';
function createPair(reference) {
    const pair = new THREE.Group();
    const sites = [[-3.95, 8, .22], [-4.21, 7.58, .4]];
    for (const [x, z, size] of sites) {
        if (reference) {
            const shrub = createReferenceShrub(x, z, size, 0);
            shrub.position.x += 4.08;
            shrub.position.z -= 7.79;
            pair.add(shrub);
        }
        else
            for (let j = 0; j < 3; j++) {
                const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ color: '#5b7d4d', roughness: .91 }));
                ball.position.set(x + 4.08 + (j - 1) * size * .65, size * .43, z - 7.79 + Math.abs(j - 1) * size * .15);
                ball.scale.set(size * (j === 1 ? 1 : .72), size * (j === 1 ? .92 : .65), size * .85);
                ball.rotation.y = j;
                ball.castShadow = true;
                ball.receiveShadow = true;
                pair.add(ball);
            }
    }
    return pair;
}
const canvas = document.querySelector('#trees'), stage = canvas.parentElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
const pmrem = new THREE.PMREMGenerator(renderer), environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
const scenes = ([false, true]).map(style => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f9f8f6');
    scene.environment = environment;
    scene.environmentIntensity = .35;
    const key = new THREE.DirectionalLight('#fff5e5', 2.8);
    key.position.set(-8, 12, 25);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 4, bottom: -1, near: .1, far: 45 });
    key.shadow.normalBias = .008;
    key.shadow.bias = -.0002;
    key.shadow.radius = 5;
    key.shadow.blurSamples = 8;
    scene.add(key);
    scene.add(new THREE.HemisphereLight('#fff9f0', '#d5c3aa', .75));
    const fill = new THREE.DirectionalLight('#eaf2ff', .65);
    fill.position.set(8, 7, 12);
    scene.add(fill);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(.94, .93, .05, 80), new THREE.MeshStandardMaterial({ color: '#8aa66c', roughness: .95 }));
    pad.position.y = -.03;
    pad.receiveShadow = true;
    scene.add(pad);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#f9f8f6', roughness: .98 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -.06;
    floor.receiveShadow = true;
    scene.add(floor);
    const model = createPair(style);
    scene.add(model);
    return { scene, model };
});
const camera = new THREE.PerspectiveCamera(34, 1, .05, 100);
camera.position.set(0, 1.25, 2.9);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, .28, 0);
controls.enableDamping = false;
controls.enablePan = false;
controls.minDistance = 2;
controls.maxDistance = 5;
controls.minPolarAngle = .45;
controls.maxPolarAngle = 1.55;
controls.update();
function render() {
    const width = stage.clientWidth, height = stage.clientHeight, half = width / 2;
    renderer.setScissorTest(true);
    scenes.forEach(({ scene }, i) => { renderer.setViewport(i * half, 0, half, height); renderer.setScissor(i * half, 0, half, height); renderer.render(scene, camera); });
    document.body.dataset.ready = 'true';
}
function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / 2 / h; camera.fov = Math.max(34, THREE.MathUtils.radToDeg(2 * Math.atan(1.0 / (2.9 * camera.aspect)))); camera.updateProjectionMatrix(); render(); }
controls.addEventListener('change', render);
window.addEventListener('resize', resize);
for (const button of Array.from(document.querySelectorAll('[data-view]')))
    button.onclick = () => {
        const view = button.dataset.view;
        camera.position.set(...(view === 'back' ? [0, 1.25, -2.9] : view === 'quarter' ? [2.05, 1.25, 2.05] : [0, 1.25, 2.9]));
        controls.update();
        render();
        document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    };
resize();
Object.assign(window, { shrubStyleReview: { styles: ['original', 'authorized reference'], models: scenes.map(s => s.model), render } });
