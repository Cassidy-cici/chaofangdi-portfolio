import * as THREE from 'three';
import { createTreeStyleModel } from './treeStyleModels.js';
import { createReferenceShrub } from './referenceShrubs.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
/** Independent environment: the approved house never enters this factory. */
export function createGarden(config, options = {}) {
    const root = new THREE.Group();
    root.name = 'portfolio-garden';
    const palette = config.palette, materials = {};
    for (const [id, color] of Object.entries(palette))
        materials[id] = new THREE.MeshStandardMaterial({ color, roughness: .91, metalness: 0 });
    const parts = {};
    function part(id) { const p = new THREE.Group(); p.name = id; parts[id] = p; root.add(p); return p; }
    function add(parent, g, mat, name) { const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
    const gaussian = (x, z, cx, cz, rx, rz, h) => h * Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
    function terrainY(x, z) {
        const elevation = gaussian(x, z, -16, -13, 11, 10, 3.1) + gaussian(x, z, 19, -22, 13, 11, 4.1) + gaussian(x, z, 6, -33, 13, 12, 1.8) + gaussian(x, z, -13, 7, 6.5, 9, 1.2) + gaussian(x, z, 13, 5, 7, 10, 1.1);
        const houseClear = THREE.MathUtils.smoothstep(Math.abs(x), 6.9, 10.2), rear = THREE.MathUtils.smoothstep(-z, 2.4, 7.8);
        return -.065 + elevation * Math.max(houseClear, rear);
    }
    const terrain = part('garden-terrain'), g = new THREE.PlaneGeometry(180, 180, 220, 220);
    g.rotateX(-Math.PI / 2);
    const pos = g.getAttribute('position'), colors = [], c = new THREE.Color(), grass = new THREE.Color(palette.grass), hill = new THREE.Color(palette.hill);
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), y = terrainY(x, z);
        pos.setY(i, y);
        c.copy(grass).lerp(hill, THREE.MathUtils.clamp(y / 3, 0, .7));
        c.multiplyScalar(1 + .016 * Math.sin(x * 2.1 + z * .8) * Math.cos(z * 1.4));
        colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    add(terrain, g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .97 }), 'continuous-grass-hills').castShadow = false;
    // Warm irregular ribbon and staggered fitted stones, following the exact terrain surface.
    const path = part('garden-path'), verts = [], indices = [], segments = 58;
    function pathCenter(z) { return .30 * Math.sin((z - 2) * .27) + .035 * (z - 2); }
    function pathWidth(z) { return 1.55 + .10 * (z - 1.95); }
    for (let j = 0; j <= segments; j++) {
        const z = 1.94 + j / segments * 26, x = pathCenter(z), w = pathWidth(z) / 2;
        for (const side of [-1, 1]) {
            const px = x + side * (w + .045 * Math.sin(j * 1.91));
            verts.push(px, terrainY(px, z) + .016, z);
        }
    }
    for (let j = 0; j < segments; j++) {
        let a = j * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const bed = new THREE.BufferGeometry();
    bed.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    bed.setIndex(indices);
    bed.computeVertexNormals();
    add(path, bed, materials.sand, 'sand-path-bed').castShadow = false;
    let seed = 5620;
    const rand = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
    const stoneGeoms = [[], [], []];
    for (let row = 0; row < 34; row++) {
        const z = 2.05 + row * .56, w = pathWidth(z), cols = config.pathColumns;
        for (let col = 0; col < cols; col++) {
            const sx = w / cols, xc = pathCenter(z) - w / 2 + (col + .5) * sx, zc = z + (rand() - .5) * .055;
            const points = [[-.48, -.46], [-.08, -.51], [.44, -.43], [.49, .02], [.42, .45], [-.04, .49], [-.47, .41]];
            const sh = new THREE.Shape();
            points.forEach((p, i) => { const x = p[0] * sx * (.90 + rand() * .05), zz = p[1] * .54 * (.90 + rand() * .05); i ? sh.lineTo(x, zz) : sh.moveTo(x, zz); });
            sh.closePath();
            const stone = new THREE.ExtrudeGeometry(sh, { depth: .025, bevelEnabled: true, bevelSize: .016, bevelThickness: .009, bevelSegments: 2, steps: 1 });
            stone.rotateX(-Math.PI / 2);
            stone.translate(xc, terrainY(xc, zc) + .019, zc);
            stoneGeoms[Math.floor(rand() * 3)].push(stone);
        }
    }
    stoneGeoms.forEach((geoms, i) => { const mat = materials.stone.clone(); mat.color.offsetHSL(.003 * (i - 1), -.015, .025 * (i - 1)); const merged = mergeGeometries(geoms); if (merged)
        add(path, merged, mat, 'sandstone-pavers-' + i); geoms.forEach(x => x.dispose()); });
    // Keep vegetation variations stable when paving geometry changes.
    seed = 5620;
    for (let i = 0; i < 1968; i++)
        rand();
    // Single continuous crowns with a low-frequency displacement; no disconnected leaf beads.
    function crownGeometry(pine) {
        let geo;
        if (pine) {
            const points = [new THREE.Vector2(0, 0), new THREE.Vector2(.35, .01), new THREE.Vector2(.53, .09), new THREE.Vector2(.58, .24), new THREE.Vector2(.54, .44), new THREE.Vector2(.45, .76), new THREE.Vector2(.35, 1.08), new THREE.Vector2(.24, 1.40), new THREE.Vector2(.14, 1.68), new THREE.Vector2(.065, 1.89), new THREE.Vector2(0, 2.03)];
            geo = new THREE.LatheGeometry(points, 40);
        }
        else {
            geo = new THREE.SphereGeometry(1, 48, 32);
            geo.scale(.90, 1.03, .83);
        }
        const p = geo.getAttribute('position');
        for (let i = 0; i < p.count; i++) {
            const x = p.getX(i), y = p.getY(i), z = p.getZ(i), angle = Math.atan2(z, x);
            const wave = 1 + .038 * Math.sin(angle * 5 + y * 5) + .022 * Math.cos(angle * 7 - y * 8);
            p.setXYZ(i, x * wave, y + (pine ? .012 : .027) * Math.sin(x * 7 + z * 4) * Math.sin(y * 3), z * wave);
        }
        geo.computeVertexNormals();
        return geo;
    }
    const roundGeo = crownGeometry(false), pineGeo = crownGeometry(true);
    function tree(x, z, h, kind, matId, id) {
        const p = part(id), y = terrainY(x, z);
        p.position.set(x, y - .015, z);
        const pine = kind === 'pine', trunkH = h * (pine ? .32 : .43), radius = h * .055;
        const profile = [[0, 0], [radius * 1.43, 0], [radius * 1.24, trunkH * .10], [radius * .94, trunkH * .35], [radius * .72, trunkH * .72], [radius * .62, trunkH], [0, trunkH]];
        const trunk = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 20);
        const tp = trunk.getAttribute('position');
        for (let i = 0; i < tp.count; i++) {
            const yy = tp.getY(i);
            tp.setX(i, tp.getX(i) + h * .018 * Math.sin(yy / trunkH * 2));
        }
        trunk.computeVertexNormals();
        add(p, trunk, materials.bark, 'continuous-flared-trunk');
        const canopy = add(p, pine ? pineGeo : roundGeo, materials[matId], pine ? 'tapered-evergreen-crown' : 'lobed-broadleaf-crown');
        if (pine) {
            const s = h * .77 / 2.03;
            canopy.scale.set(s * 1.02, s, s * 1.02);
            canopy.position.y = h * .24;
        }
        else {
            canopy.scale.set(h * .30, h * .34, h * .30);
            canopy.position.set(h * .014, h * .68, 0);
        }
        p.traverse(o => { if (o.isMesh)
            o.receiveShadow = false; });
        p.rotation.y = (rand() - .5) * .9;
        p.userData = { rootedAt: [x, y, z], height: h, kind };
        return p;
    }
    config.foregroundTrees.forEach(([x, z, h, k, m], i) => {
        if (i === 0 && options.treeStyle) {
            const model = createTreeStyleModel(options.treeStyle, h), y = terrainY(x, z);
            model.name = 'garden-tree-near-0';
            model.position.set(x, y - .015, z);
            model.rotation.y = (rand() - .5) * .9;
            model.userData = { ...model.userData, rootedAt: [x, y, z], height: h, kind: k };
            root.add(model);
            parts[model.name] = model;
        }
        else
            tree(x, z, h, k, m, 'garden-tree-near-' + i);
    });
    // Smaller farther trees establish depth behind the open-front house, leaving its silhouette clear.
    for (let i = 0; i < 21; i++) {
        const x = -28 + i * 2.8, z = -20 - (i % 4) * 2.1, h = 1.15 + rand() * .9;
        tree(x, z, h, i % 3 === 0 ? 'pine' : 'round', i % 4 === 0 ? 'olive' : i % 3 === 0 ? 'pine' : 'sage', 'garden-tree-far-' + i);
    }
    const shrubs = part('garden-shrubs'), shrubGeo = new THREE.SphereGeometry(1, 16, 10), shrubMat = materials.deepGrass;
    const sites = [[-10, 4.3, .44], [-7.5, 4.9, .32], [7.8, 4.4, .39], [11, -1, .3], [-12, -4, .33], [16, 5, .4], [-16, 8, .4], [8.6, 8, .25], [-3.95, 8, .22], [4.3, 5.2, .18], [13, -11, .3], [-17, -8, .27], ...config.additionalShrubs];
    const inst = new THREE.InstancedMesh(shrubGeo, shrubMat, sites.length * 3), dummy = new THREE.Object3D();
    let n = 0;
    for (const [siteIndex, [x, z, s]] of sites.entries()) {
        // Only the overlapping pair on the front-left lawn is part of this study.
        if (options.shrubStyle === 'reference' && (siteIndex === 8 || siteIndex === 12)) {
            const shrub = createReferenceShrub(x, z, s, terrainY(x, z));
            shrub.name = 'garden-reference-shrub-' + siteIndex;
            shrubs.add(shrub);
            continue;
        }
        for (let j = 0; j < 3; j++) {
            const px = x + (j - 1) * s * .65, pz = z + Math.abs(j - 1) * s * .15;
            dummy.position.set(px, terrainY(px, pz) + s * .43, pz);
            dummy.scale.set(s * (j === 1 ? 1 : .72), s * (j === 1 ? .92 : .65), s * .85);
            dummy.rotation.y = j;
            dummy.updateMatrix();
            inst.setMatrixAt(n++, dummy.matrix);
        }
    }
    inst.count = n;
    inst.name = 'rooted-shrub-clusters';
    inst.castShadow = true;
    inst.receiveShadow = true;
    shrubs.add(inst);
    // Volumetric off-white clouds: broad flat-bottom body with unequal convex puff volumes.
    const cloudPart = part('garden-clouds'), cloudGeo = new THREE.SphereGeometry(1, 28, 20), cloudMat = materials.cloud;
    config.clouds.forEach(([x, y, z, s], i) => {
        const group = new THREE.Group();
        group.name = 'cloud-' + i;
        group.position.set(x, y, z);
        group.scale.setScalar(s);
        cloudPart.add(group);
        const puffs = [[-1.15, 0, 0, .72, .39, .53], [-.54, .12, .07, .85, .53, .6], [.35, .13, 0, .94, .56, .64], [1.05, 0, .04, .69, .35, .48], [-.63, .47, -.07, .58, .61, .51], [.12, .73, -.03, .69, .72, .56], [.73, .47, .03, .53, .55, .46], [-.12, -.13, -.16, 1.18, .24, .47]];
        puffs.forEach(([px, py, pz, sx, sy, sz], j) => { const mesh = add(group, cloudGeo, cloudMat, 'cloud-puff-' + j); mesh.position.set(px, py, pz); mesh.scale.set(sx, sy, sz); mesh.castShadow = false; mesh.receiveShadow = false; });
    });
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 8;
    skyCanvas.height = 512;
    const ctx = skyCanvas.getContext('2d'), gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, palette.skyTop);
    gradient.addColorStop(.64, '#bfd7dc');
    gradient.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 8, 512);
    const sky = new THREE.CanvasTexture(skyCanvas);
    sky.colorSpace = THREE.SRGBColorSpace;
    root.userData = { kind: 'independent-environment', parts: Object.keys(parts), seed: 5620, terrainY };
    return { root, sky, terrainY, parts };
}
