import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
// Independent review models. Public reference observations/palette are documented
// in reference/tree-style-study; no downloaded site code or model runs here.
const flowerPalette = ['#9f8be0', '#9380d8', '#ae9ce8', '#bcaeee', '#8875cf', '#c7b9f0', '#b59be0', '#c4a6e6'];
function rng(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
function mesh(parent, geometry, material, name) {
    const m = new THREE.Mesh(geometry, material);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.componentId = name;
    parent.add(m);
    return m;
}
function branch(a, b, r0, r1, sides) {
    const g = new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), sides, 1), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.applyQuaternion(q);
    g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());
    return g;
}
function fitted(model, height, style) {
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3()), s = height / size.y;
    model.scale.setScalar(s);
    model.position.y = -bounds.min.y * s;
    const root = new THREE.Group();
    root.name = 'tree-study-' + style;
    root.add(model);
    root.userData = { style, height, parts: ['trunk', 'branches', 'leaves', 'flowers'], source: 'independent procedural style study' };
    return root;
}
function instances(parent, geometry, material, items, name) {
    const m = new THREE.InstancedMesh(geometry, material, items.length), dummy = new THREE.Object3D();
    items.forEach((it, i) => { dummy.position.copy(it.p); dummy.scale.copy(it.s); dummy.rotation.copy(it.r); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, new THREE.Color(it.c)); });
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.componentId = name;
    parent.add(m);
    return m;
}
function handmade(height) {
    const r = rng(4182), root = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: '#896b50', roughness: .88 }), branches = [];
    const trunkPoints = [[0, 0, 0], [-.025, .23, .01], [.025, .47, .015], [.01, .67, 0]].map(p => new THREE.Vector3(...p));
    trunkPoints.slice(0, -1).forEach((p, i) => branches.push(branch(p, trunkPoints[i + 1], [.051, .038, .025][i], [.038, .025, .014][i], 18)));
    for (const [x, y, z] of [[-.25, .69, .03], [.23, .67, .03], [-.13, .86, -.09], [.10, .88, .05]])
        branches.push(branch(trunkPoints[2], new THREE.Vector3(x, y, z), .022, .009, 14));
    for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        branches.push(branch(new THREE.Vector3(0, .09, 0), new THREE.Vector3(Math.cos(a) * .084, .006, Math.sin(a) * .084), .024, .008, 12));
    }
    const merged = mergeGeometries(branches);
    if (merged)
        mesh(root, merged, wood, 'handmade-trunk-and-forks');
    branches.forEach(g => g.dispose());
    const lobes = [[-.23, .70, .03, .245, .235, .235], [.12, .72, .04, .29, .25, .26], [-.13, .88, -.035, .225, .20, .23], [.12, .91, .00, .20, .165, .19], [.29, .67, -.045, .18, .20, .19], [-.03, .70, -.19, .245, .24, .20]];
    const crownGeo = new THREE.SphereGeometry(1, 36, 24), p = crownGeo.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = 1 + .026 * Math.sin(x * 5 + z * 3) * Math.cos(y * 4) + .012 * Math.sin(z * 9 - x * 4);
        p.setXYZ(i, x * d, y * d, z * d);
    }
    crownGeo.computeVertexNormals();
    const colors = ['#8d9f75', '#99ab80', '#a6b58b', '#8fa57c', '#93a478', '#80986f'];
    const foliage = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .95 });
    instances(root, crownGeo, foliage, lobes.map((v, i) => ({ p: new THREE.Vector3(v[0], v[1], v[2]), s: new THREE.Vector3(v[3], v[4], v[5]), r: new THREE.Euler(0, i * .8, .08 * Math.sin(i)), c: colors[i] })), 'handmade-rounded-canopy').receiveShadow = false;
    const petals = [], centers = [], leaves = [];
    // Rounded petal clusters sit on, rather than float beyond, the canopy surface.
    for (let i = 0; i < 90; i++) {
        const l = lobes[i % lobes.length], a = r() * Math.PI * 2, vy = .12 + r() * .77, rad = Math.sqrt(1 - vy * vy), normal = new THREE.Vector3(Math.cos(a) * rad, vy, Math.sin(a) * rad);
        const center = new THREE.Vector3(l[0] + normal.x * l[3], l[1] + normal.y * l[4], l[2] + normal.z * l[5]);
        if (lobes.some(other => other !== l && ((center.x - other[0]) / other[3]) ** 2 + ((center.y - other[1]) / other[4]) ** 2 + ((center.z - other[2]) / other[5]) ** 2 < 1.02))
            continue;
        const tangent = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 1, 0)).normalize(), bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
        for (let k = 0; k < 5; k++) {
            const angle = k * Math.PI * 2 / 5, at = center.clone().addScaledVector(tangent, Math.cos(angle) * .012).addScaledVector(bitangent, Math.sin(angle) * .012);
            petals.push({ p: at, s: new THREE.Vector3(.015, .009, .015), r: new THREE.Euler(r(), r(), r()), c: ['#b4a2cf', '#c7b8da', '#d1c3df'][i % 3] });
        }
        centers.push({ p: center.clone().addScaledVector(normal, .007), s: new THREE.Vector3(.006, .006, .006), r: new THREE.Euler(), c: '#e7d29f' });
        if (i % 2 === 0)
            leaves.push({ p: center.clone().addScaledVector(tangent, .025), s: new THREE.Vector3(.031, .009, .014), r: new THREE.Euler(a, 0, a + .5), c: '#768e68' });
    }
    const soft = new THREE.MeshStandardMaterial({ color: '#fff', roughness: .92 });
    instances(root, new THREE.SphereGeometry(1, 12, 8), soft, petals, 'handmade-soft-petals');
    instances(root, new THREE.SphereGeometry(1, 10, 6), soft, centers, 'handmade-flower-centers');
    instances(root, new THREE.SphereGeometry(1, 16, 8), soft, leaves, 'handmade-edge-leaves');
    return fitted(root, height, 'handmade');
}
function reference(height) {
    const r = rng(20261103), root = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: '#76665c', roughness: .95 }), trunk = [], twigs = [];
    const path = [[0, 0, 0], [.012, .12, .006], [-.006, .23, -.008], [.01, .33, 0], [.002, .46, .006], [.008, .57, -.002], [0, .69, .003], [.005, .80, 0]].map(p => new THREE.Vector3(...p));
    const radii = [.034, .029, .024, .020, .014, .0095, .006, .0035];
    for (let i = 0; i < path.length - 1; i++) {
        trunk.push(branch(path[i], path[i + 1], radii[i], radii[i + 1], 12));
        const joint = new THREE.SphereGeometry(radii[i + 1] * 1.01, 12, 8);
        joint.translate(...path[i + 1].toArray());
        trunk.push(joint);
    }
    for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + r() * .3;
        trunk.push(branch(new THREE.Vector3(0, .03, 0), new THREE.Vector3(Math.cos(a) * .075, .002, Math.sin(a) * .075), .013, .0035, 6));
    }
    function stemAt(y) { for (let i = 0; i < path.length - 1; i++)
        if (y <= path[i + 1].y)
            return path[i].clone().lerp(path[i + 1], (y - path[i].y) / (path[i + 1].y - path[i].y)); return path[path.length - 1].clone(); }
    function radiusAt(y, a) {
        const u = THREE.MathUtils.clamp((y - .17) / .86, 0, 1), envelope = .415 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, 1.2))), .86);
        return envelope * (1 + .12 * Math.sin(3 * a + 1.2 + u * 2) + .07 * Math.sin(5 * a - .6 + u * 5));
    }
    const sites = [];
    function split(start, direction, length, radius, depth) {
        const end = start.clone().addScaledVector(direction, length).add(new THREE.Vector3((r() - .5) * .012, (r() - .4) * .009, (r() - .5) * .012));
        const a = Math.atan2(end.z, end.x), limit = radiusAt(end.y, a), rad = Math.hypot(end.x, end.z);
        if (end.y > .99 || end.y < .20 || limit < .015)
            return;
        if (rad > limit) {
            end.x *= limit / rad;
            end.z *= limit / rad;
        }
        if (start.distanceTo(end) < .011)
            return;
        twigs.push(branch(start, end, radius, Math.max(.0008, radius * .66), depth === 0 ? 6 : 4));
        if (depth === 0) {
            for (let k = 1; k < 5; k++)
                sites.push({ p: start.clone().lerp(end, .4 + k * .12), flower: r() < .35 });
        }
        if (depth > 0) {
            sites.push({ p: start.clone().lerp(end, .55), flower: r() < .30 });
            sites.push({ p: end.clone(), flower: r() < .38 });
        }
        if (depth === 3)
            return;
        const outward = new THREE.Vector3(end.x, 0, end.z).normalize();
        for (let i = 0; i < 3; i++) {
            const dir = direction.clone().multiplyScalar(.65).addScaledVector(outward, depth === 0 ? .30 : .08).add(new THREE.Vector3((r() - .5) * 1.1, .22 + (r() - .3) * .65, (r() - .5) * 1.1)).normalize();
            split(end, dir, length * (.64 + r() * .18), Math.max(.0008, radius * .60), depth + 1);
        }
    }
    for (let i = 0; i < 10; i++) {
        const y = .27 + i / 9 * .44 + (r() - .5) * .025, origin = stemAt(y), a = i * 2.39996 + .5 + (r() - .5) * .3, targetY = y + .12 + r() * .065, rad = radiusAt(targetY, a) * .75;
        const delta = new THREE.Vector3(Math.cos(a) * rad, targetY - y, Math.sin(a) * rad);
        split(origin, delta.clone().normalize(), delta.length() * .62, .006, 0);
    }
    const trunkMerged = mergeGeometries(trunk), twigMerged = mergeGeometries(twigs);
    if (trunkMerged)
        mesh(root, trunkMerged, wood, 'reference-tapered-trunk');
    if (twigMerged)
        mesh(root, twigMerged, wood, 'reference-fine-branch-hierarchy');
    trunk.concat(twigs).forEach(g => g.dispose());
    const leaves = [], flowers = [];
    sites.forEach(({ p, flower }) => {
        for (let k = 0; k < 3; k++)
            leaves.push({ p: p.clone().add(new THREE.Vector3((r() - .5) * .045, (r() - .5) * .020, (r() - .5) * .045)), s: new THREE.Vector3(.013, .0028, .0078).multiplyScalar(.8 + r() * .45), r: new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28), c: k % 2 ? '#8db27c' : '#7ea36f' });
        if (flower)
            for (let k = 0; k < 10; k++)
                flowers.push({ p: p.clone().add(new THREE.Vector3((r() - .5) * .052, (r() - .6) * .035, (r() - .5) * .052)), s: new THREE.Vector3(1, 1, 1).multiplyScalar(.0065 * (.75 + r() * .7)), r: new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28), c: flowerPalette[Math.floor(r() * flowerPalette.length)] });
    });
    instances(root, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .90 }), leaves, 'reference-individual-faceted-leaves');
    instances(root, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff', roughness: .8, emissive: '#3a2c5c', emissiveIntensity: .20 }), flowers, 'reference-lavender-flower-beads');
    root.userData.detailCounts = { branchSegments: twigs.length, leaves: leaves.length, flowers: flowers.length };
    return fitted(root, height, 'reference');
}
export function createTreeStyleModel(style, height = 3.05) { return style === 'handmade' ? handmade(height) : reference(height); }
