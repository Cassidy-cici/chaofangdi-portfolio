import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createPortfolioHouseModel } from 'house-model';
import { createGarden } from './garden.js';
import { createMiniatureGarden } from './miniatureGarden.js';
import { createRoomNavigation, swapMiddleRooms } from './roomNavigation.js';
import { createInteractiveObjects } from './interactiveObjects.js';
import { intro, loadSceneJson, assetProgress } from './loadingProgress.js';
async function initialize() {
    intro?.started();
    const spec = await loadSceneJson('./object-sculpt-spec.json');
    const params = new URLSearchParams(location.search), pass = params.get('pass') ?? 'optimization-pass';
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e9e9ec');
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    document.body.append(renderer.domElement);
    const env = new THREE.PMREMGenerator(renderer);
    scene.environment = env.fromScene(new RoomEnvironment(), .04).texture;
    scene.environmentIntensity = .35;
    const camera = new THREE.PerspectiveCamera(17, innerWidth / innerHeight, .1, 150), target = new THREE.Vector3(0, 3.5, 0);
    const key = new THREE.DirectionalLight('#fff5e5', 2.8);
    key.position.set(-6, 11, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -8, near: .1, far: 45 });
    key.shadow.bias = -.0002;
    key.shadow.normalBias = .012;
    key.shadow.radius = 4;
    scene.add(key);
    const hemi = new THREE.HemisphereLight('#fff9f0', '#d5c3aa', 1.35);
    scene.add(hemi);
    const fill = new THREE.DirectionalLight('#eaf2ff', 1.15);
    fill.position.set(8, 7, 12);
    scene.add(fill);
    const assetManager = new THREE.LoadingManager();
    assetManager.onProgress = (url) => intro?.complete(url);
    assetManager.onError = () => intro?.fail();
    const sculptureConfig = spec.design.sculpture.externalAsset, contactConfig = spec.design.contact.externalAsset;
    const configPath = params.get('environment') === 'legacy' ? './garden-scene.json' : params.get('gardenStyle') === 'rich' ? './reference/before-garden-r53/miniature-garden-scene.json' : './miniature-garden-scene.json';
    intro?.plan(['./object-sculpt-spec.json', './reference/helvetiker_bold.typeface.json', './reference/roughness-atlas.png', './reference/height-atlas.png', './reference/avatar-acnh-6034-frame-fit.png', './reference/cafe-memories/studio.jpg', './reference/cafe-memories/bamboo.jpg', './reference/cafe-memories/neighbors.jpg', configPath, './reference/room-name-contours.json', './room-destinations.json', ...(sculptureConfig?.fullRoomPath ? [sculptureConfig.fullRoomPath] : sculptureConfig ? [sculptureConfig.path, ...(sculptureConfig.toolsPath ? [sculptureConfig.toolsPath, sculptureConfig.chipsPath] : [])] : []), ...(contactConfig?.path ? [contactConfig.path] : [])]);
    spec.__font = new FontLoader().parse(await loadSceneJson('./reference/helvetiker_bold.typeface.json'));
    const loader = new THREE.TextureLoader(assetManager);
    const [rough, height, portrait] = await Promise.all([loader.loadAsync('./reference/roughness-atlas.png'), loader.loadAsync('./reference/height-atlas.png'), loader.loadAsync('./reference/avatar-acnh-6034-frame-fit.png?v=2')]);
    spec.__pbr = { rough, height };
    portrait.colorSpace = THREE.SRGBColorSpace;
    portrait.anisotropy = 4;
    portrait.name = 'animal-crossing-6034-frame-fit';
    spec.__portrait = portrait;
    const cafePhotoKeys = ['studio', 'bamboo', 'neighbors'];
    spec.__cafePhotos = Object.fromEntries(await Promise.all(cafePhotoKeys.map(async (key) => { const texture = await loader.loadAsync(`./reference/cafe-memories/${key}.jpg`); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; return [key, texture]; })));
    if (spec.design.sculpture.externalAsset?.fullRoomPath) {
        spec.__sculptureV2 = (await new GLTFLoader(assetManager).loadAsync(spec.design.sculpture.externalAsset.fullRoomPath, assetProgress(spec.design.sculpture.externalAsset.fullRoomPath))).scene;
    }
    else if (spec.design.sculpture.externalAsset) {
        const gltfLoader = new GLTFLoader(assetManager), asset = sculptureAssetConfig();
        const loaded = await Promise.all([gltfLoader.loadAsync(asset.path, assetProgress(asset.path)), ...(asset.toolsPath ? [gltfLoader.loadAsync(asset.toolsPath, assetProgress(asset.toolsPath)), gltfLoader.loadAsync(asset.chipsPath, assetProgress(asset.chipsPath))] : [])]);
        spec.__sculptureAsset = loaded[0].scene;
        if (loaded[1])
            spec.__sculptureProps = { tools: loaded[1].scene, chips: loaded[2].scene };
    }
    function sculptureAssetConfig() { return spec.design.sculpture.externalAsset; }
    if (spec.design.contact.externalAsset?.path) {
        spec.__contactAsset = (await new GLTFLoader(assetManager).loadAsync(spec.design.contact.externalAsset.path, assetProgress(spec.design.contact.externalAsset.path))).scene;
    }
    const legacyGarden = params.get('environment') === 'legacy';
    const gardenConfig = await loadSceneJson(configPath);
    const gardenEnabled = params.get('environment') !== 'studio';
    const treeStyle = params.get('treeStyle');
    const garden = legacyGarden ? createGarden(gardenConfig, { treeStyle: treeStyle === 'handmade' || treeStyle === 'reference' ? treeStyle : undefined, shrubStyle: params.get('shrubStyle') === 'reference' ? 'reference' : undefined }) : createMiniatureGarden(gardenConfig);
    if (gardenEnabled) {
        scene.add(garden.root);
        scene.background = garden.sky;
        scene.fog = new THREE.Fog('#a7cbd7', 65, 115);
    }
    intro?.stage('正在整理小屋里的每个角落…');
    await new Promise(resolve => requestAnimationFrame(() => resolve()));
    const model = createPortfolioHouseModel(spec, pass);
    swapMiddleRooms(model);
    scene.add(model);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#e9e9ec', roughness: .85 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.015;
    ground.receiveShadow = true;
    ground.visible = !gardenEnabled;
    scene.add(ground);
    // Soft rear fill makes the closed side/back surfaces readable during review.
    const shellFill = new THREE.DirectionalLight('#fff1df', 1.2);
    shellFill.position.set(-12, 9, -14);
    scene.add(shellFill);
    const finished = ['lighting-pass', 'interaction-pass', 'optimization-pass'].includes(pass);
    let diagnostic = false;
    let composer, ao;
    if (finished) {
        key.position.set(-8, 12, 25);
        fill.intensity = .65;
        hemi.intensity = .75;
        renderer.shadowMap.type = THREE.VSMShadowMap;
        key.shadow.radius = 9;
        key.shadow.blurSamples = 8;
        key.shadow.normalBias = .008;
        const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
        composer = new EffectComposer(renderer, rt);
        composer.addPass(new RenderPass(scene, camera));
        ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
        ao.updateGtaoMaterial({ radius: .45, thickness: .16, distanceExponent: 1.2, distanceFallOff: 1, scale: 1.0, samples: 32 });
        ao.blendIntensity = 1.0;
        ao.updatePdMaterial({ radius: 12, lumaPhi: 16, depthPhi: 4, normalPhi: 5, samples: 32 });
        composer.addPass(ao);
        composer.addPass(new OutputPass());
        if (!legacyGarden)
            ao.setSceneClipBox(new THREE.Box3(new THREE.Vector3(-7.3, -.3, -2.5), new THREE.Vector3(7.3, 8.7, 2.5)));
        const musicGlow = new THREE.PointLight('#fff2d0', spec.design.music.lanternLightIntensity, 2.7, 2);
        musicGlow.position.set(spec.design.music.lampCenter[0], spec.design.music.lampCenter[1] + .08, spec.design.music.lampCenter[2]);
        scene.add(musicGlow);
        const readingGlow = new THREE.PointLight('#fff1c2', 1.1, 2.2, 2);
        readingGlow.position.set(spec.design.living.lampCenter[0], spec.design.rooms.find((r) => r.id === 'about').floorY + .02 + .035 / 2 + spec.design.living.lampShadeCenterY - .015, spec.design.living.lampCenter[2]);
        scene.add(readingGlow);
    }
    let updateRoomOverlay = () => { };
    let renders = 0;
    renderer.info.autoReset = false;
    function renderScene() { updateRoomOverlay(); renderer.info.reset(); renders++; if (composer && !diagnostic)
        composer.render();
    else
        renderer.render(scene, camera); }
    function lookdev(mode) { key.color.set(mode === 'neutral' ? '#ffffff' : '#fff5e5'); fill.color.set(mode === 'neutral' ? '#ffffff' : '#eaf2ff'); key.position.set(...(mode === 'grazing' ? [-12, 6, 3] : (finished ? [-8, 12, 25] : [-6, 11, 12]))); key.intensity = mode === 'grazing' ? 3.2 : 2.8; fill.intensity = mode === 'grazing' ? .55 : (finished ? .65 : 1.15); hemi.intensity = mode === 'grazing' ? .9 : (finished ? .75 : 1.35); view(0); }
    const angle = Number(params.get('reviewAngle') ?? 0) * Math.PI / 180;
    target.set(0, gardenEnabled ? gardenConfig.camera.target[1] : 3.5, 0);
    camera.position.set(35 * Math.sin(angle), gardenEnabled ? gardenConfig.camera.eyeY : 5.95, 35 * Math.cos(angle));
    camera.lookAt(target);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enableDamping = false;
    controls.rotateSpeed = .7;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.update();
    const labelContours = await loadSceneJson('./reference/room-name-contours.json?v=garden-r34-cafe-label');
    const destinations = await loadSceneJson('./room-destinations.json?v=garden-r34-cafe-label');
    const interactions = createInteractiveObjects({ model, scene, camera, canvas: renderer.domElement, composer, render: renderScene, destinations });
    const navigation = createRoomNavigation({ interactions, labelContours, model, garden: garden.root, ground, scene, camera, controls, canvas: renderer.domElement, spec, gardenEnabled, gardenConfig, render: renderScene, initialAngle: angle });
    updateRoomOverlay = navigation.updateOverlay;
    let pendingFrame = false;
    controls.addEventListener('change', () => { if (document.body.dataset.cameraMoving === 'true' || pendingFrame)
        return; pendingFrame = true; requestAnimationFrame(() => { pendingFrame = false; renderScene(); }); });
    function resize() { camera.aspect = innerWidth / innerHeight; renderer.setSize(innerWidth, innerHeight); composer?.setSize(innerWidth, innerHeight); navigation.resize(); }
    resize();
    window.addEventListener('resize', resize);
    function view(angle) { navigation.returnHome(); const rad = angle * Math.PI / 180; camera.position.set(35 * Math.sin(rad), gardenEnabled ? gardenConfig.camera.eyeY : 5.95, 35 * Math.cos(rad)); controls.target.copy(target); controls.update(); navigation.resize(); }
    const focusMusic = () => navigation.focusRoom('music'), focusLiving = () => navigation.focusRoom('about'), focusCafe = () => navigation.focusRoom('cafe'), focusMonitor = () => navigation.focusRoom('monitor'), focusSculpture = () => navigation.focusRoom('sculpture'), focusSchedule = () => navigation.focusRoom('schedule'), focusContact = () => navigation.focusRoom('contact');
    function setArchitectureOnly(value) { for (const [id, n] of Object.entries(model.userData.sculptRuntime.nodes))
        n.visible = !value || /^(house-|dormer-|room-)/.test(id) || ['roof-ridge', 'portfolio-title'].includes(id); renderScene(); }
    function eachVisual(id, n, fn) { n.traverse(o => { if (!o.isMesh || o.userData.componentId !== id)
        return; const m = o; if (m.isInstancedMesh) {
        const inst = m;
        for (let i = 0; i < inst.count; i++) {
            const local = new THREE.Matrix4();
            inst.getMatrixAt(i, local);
            fn(m, m.matrixWorld.clone().multiply(local), m.name + '-instance-' + i);
        }
    }
    else
        fn(m, m.matrixWorld, m.name); }); }
    function manifest() { const parts = [], meshes = []; model.updateMatrixWorld(true); for (const [id, n] of Object.entries(model.userData.sculptRuntime.nodes)) {
        let triangles = 0;
        eachVisual(id, n, (m, matrix, name) => { const g = m.geometry, p = g.getAttribute('position'), count = (g.index ? g.index.count : p.count) / 3; triangles += count; g.computeBoundingBox(); const b = g.boundingBox.clone().applyMatrix4(matrix); meshes.push({ name, part: id, triangles: count, bounds: [b.min.toArray(), b.max.toArray()] }); });
        parts.push({ name: id, kind: 'part', module: id, triangles });
    } let drawObjects = 0, instancedBatches = 0; model.traverse(o => { if (o.isMesh) {
        drawObjects++;
        if (o.isInstancedMesh)
            instancedBatches++;
    } }); return { model: 'portfolio-house', parts, unnamedMeshes: meshes.filter(m => !m.name).length, meshes, drawObjects, instancedBatches }; }
    function geometryEvidence() { model.updateMatrixWorld(true); const meshes = [], measured = {}; for (const [id, n] of Object.entries(model.userData.sculptRuntime.nodes)) {
        measured[id] = new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3()).toArray();
        eachVisual(id, n, (m, matrix, name) => { const g = m.geometry, p = g.getAttribute('position'), norm = g.getAttribute('normal'), vertices = [], normals = [], nm = new THREE.Matrix3().getNormalMatrix(matrix); for (let i = 0; i < p.count; i++) {
            vertices.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(matrix).toArray());
            normals.push(new THREE.Vector3().fromBufferAttribute(norm, i).applyMatrix3(nm).normalize().toArray());
        } const welded = new Map(); for (let i = 0; i < vertices.length; i++) {
            const k = vertices[i].map(v => v.toFixed(6)).join(',');
            if (!welded.has(k))
                welded.set(k, new THREE.Vector3());
            welded.get(k).add(new THREE.Vector3(...normals[i]));
        } for (let i = 0; i < vertices.length; i++) {
            const k = vertices[i].map(v => v.toFixed(6)).join(',');
            normals[i] = welded.get(k).clone().normalize().toArray();
        } meshes.push({ name, normalEvidence: 'full actual geometry; instances expanded with actual per-instance matrices; welded coincident corner normal bisectors', vertices, normals, indices: g.index ? Array.from(g.index.array) : Array.from({ length: p.count }, (_, i) => i) }); });
    } return { meshes, measured }; }
    function silhouette(enabled) { diagnostic = enabled; if (enabled) {
        window.__restore = [];
        model.traverse(o => { if (o.isMesh) {
            const m = o;
            window.__restore.push([m, m.material]);
            m.material = new THREE.MeshBasicMaterial({ color: '#111111', side: THREE.DoubleSide });
        } });
        ground.visible = false;
        scene.background = new THREE.Color('#ffffff');
    }
    else {
        for (const [m, mat] of window.__restore) {
            m.material.dispose();
            m.material = mat;
        }
        ground.visible = true;
        scene.background = new THREE.Color('#e9e9ec');
    } view(0); }
    function materialMask(enabled) { diagnostic = enabled; if (enabled) {
        window.__matRestore = [];
        model.traverse(o => { if (o.isMesh) {
            const m = o;
            window.__matRestore.push([m, m.material]);
            const original = m.material, id = spec.materials.findIndex((s) => s.id === original.name), code = id < 0 ? 0 : (id + 1) * 9, c = new THREE.Color();
            c.setRGB(code / 255, code / 255, code / 255, THREE.SRGBColorSpace);
            m.material = new THREE.MeshBasicMaterial({ color: c, side: original.side });
        } });
        ground.visible = false;
        scene.background = new THREE.Color(0);
        window.__tone = renderer.toneMapping;
        renderer.toneMapping = THREE.NoToneMapping;
    }
    else {
        for (const [m, mat] of window.__matRestore) {
            m.material.dispose();
            m.material = mat;
        }
        ground.visible = true;
        scene.background = new THREE.Color('#e9e9ec');
        renderer.toneMapping = window.__tone;
    } view(0); }
    const roomForPart = { 'music-drums': '版本资讯', 'about-portrait': 'About Me', 'cafe-corkboard': '促活内容&UGC创作', 'monitor-screens': '趣味内容&AI生图', 'schedule-board': 'SNS排期', 'sculpture-bust': '社区工具', 'contact-phone': 'Connect' };
    let selected = null;
    function pickAt(x, y) { return navigation.pickRoom(x, y); }
    function activate(id) { const roomId = id.startsWith('about-') ? 'about' : id.split('-')[0]; selected = id; navigation.focusRoom(roomId); }
    Object.assign(window, { __ready: true, __IMG2THREEJS_READY__: true, __house: { interactions, navigation, garden, gardenEnabled, model, scene, camera, renderer, controls, view, focusMusic, focusLiving, focusCafe, focusMonitor, focusSculpture, focusSchedule, focusContact, lookdev, activate, pickAt, roomForPart, getSelected: () => selected, metrics: () => ({ renders, drawCalls: renderer.info.render.calls, renderedTriangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, continuousAnimation: gardenEnabled && !legacyGarden && !document.hidden && navigation.getActive() === null, pixelRatio: renderer.getPixelRatio() }), manifest, geometryEvidence, materialMask, silhouette, setArchitectureOnly, pass }, __IMG2THREEJS_CAPTURE__: { setCamera: (c) => view(c.azimuthDegrees ?? c.angle ?? 0) }, __interactive: true });
    // Direct room links use the same isolated-room navigation.
    if (params.get("room"))
        navigation.focusRoom(params.get("room"));
    // Use the asset library's original branch sway and falling-petal animation.
    // Interior pages keep their event-driven rendering; background tabs do no work.
    if (gardenEnabled && 'update' in garden && typeof garden.update === 'function') {
        let previous = 0;
        const updateGarden = garden.update;
        function gardenFrame(now) {
            requestAnimationFrame(gardenFrame);
            if (document.hidden || navigation.getActive() !== null || document.body.dataset.cameraMoving === 'true') {
                previous = 0;
                renderer.domElement.dataset.gardenMotion = 'paused';
                return;
            }
            if (previous && now - previous < 1000 / 30)
                return;
            const delta = previous ? Math.min((now - previous) / 1000, .05) : 0;
            previous = now;
            updateGarden(now / 1000, delta);
            renderer.domElement.dataset.gardenMotion = 'playing';
            renderScene();
        }
        requestAnimationFrame(gardenFrame);
    }
    renderScene();
    void window.portfolioLoader.ready();
}
void initialize().catch(error => { console.error('House initialization failed', error); intro?.fail(); });
