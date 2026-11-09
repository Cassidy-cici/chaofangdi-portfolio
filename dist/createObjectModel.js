import * as THREE from 'three';
import { populateCafeMemoryBoard } from './cafeMemoryBoard.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
export function createPortfolioHouseModel(spec, pass = 'blockout') {
    const root = new THREE.Group();
    root.name = 'portfolio-house';
    const nodes = {};
    const cache = new Map();
    const mats = {};
    const usePbr = ['material-pass', 'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass'].includes(pass);
    for (const [i, m] of spec.materials.entries()) {
        const mat = usePbr ? new THREE.MeshPhysicalMaterial({ color: m.previewAlbedo ?? m.color, roughness: ['steel', 'brass'].includes(m.id) ? .38 : .57, metalness: ['steel', 'brass'].includes(m.id) ? .35 : 0, clearcoat: ['glass', 'phone', 'roof', 'roof-edge'].includes(m.id) ? .22 : .06, clearcoatRoughness: .48 }) : new THREE.MeshStandardMaterial({ color: m.color, roughness: .65, metalness: 0 });
        if (usePbr && spec.__pbr) {
            for (const [channel, source] of [['roughnessMap', spec.__pbr.rough], ['bumpMap', spec.__pbr.height]]) {
                const t = source.clone();
                t.repeat.set(.195, .195);
                t.offset.set((i % 5) * .19921875 + .002, 1 - (Math.floor(i / 5) + 1) * .19921875 + .002);
                t.anisotropy = 4;
                mat[channel] = t;
            }
            mat.bumpScale = .0015;
        }
        if (usePbr && m.id === 'lavender') {
            mat.envMapIntensity = 1.18;
            mat.color.b *= 1.10;
        }
        mat.name = m.id;
        mats[m.id] = mat;
    }
    let current = root, serial = 0;
    function part(id) { current = new THREE.Group(); current.name = id; current.userData.componentId = id; root.add(current); nodes[id] = current; return current; }
    function mesh(g, m, p, scale) { const o = new THREE.Mesh(g, typeof m === 'string' ? mats[m] : m); o.position.fromArray(p); if (scale)
        o.scale.fromArray(scale); o.name = current.name + '-' + (++serial); o.userData = { componentId: current.name, explodeWithParent: true }; o.castShadow = true; o.receiveShadow = true; current.add(o); return o; }
    const architectural = () => /^(house-|dormer-|room-)/.test(current.name);
    function box(p, s, m = 'cream', r = .035) { const isArchitecture = architectural(); if (isArchitecture && m === 'cream')
        m = 'architecture-cream'; r = Math.min(isArchitecture ? Math.max(r, .045) : r, ...s.map(x => x * .35)); const segments = isArchitecture ? 5 : 2, key = 'b' + s.join(',') + ',' + r + ',' + segments; let g = cache.get(key); if (!g) {
        g = new RoundedBoxGeometry(s[0], s[1], s[2], segments, r);
        cache.set(key, g);
    } return mesh(g, m, p); }
    function sph(p, s, m) { let g = cache.get('sphere'); if (!g) {
        g = new THREE.SphereGeometry(1, 24, 16);
        cache.set('sphere', g);
    } return mesh(g, m, p, s); }
    function cyl(p, rt, rb, h, m, seg = 32) { const key = ['c', rt, rb, h, seg].join(','); let g = cache.get(key); if (!g) {
        g = new THREE.CylinderGeometry(rt, rb, h, seg);
        cache.set(key, g);
    } return mesh(g, m, p); }
    function rod(a, b, r, m) { const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va); const o = cyl(va.clone().add(vb).multiplyScalar(.5).toArray(), r, r, d.length(), m, 16); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return o; }
    function tube(points, r, m, closed = false, seg = 64) { const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed), g = new THREE.TubeGeometry(curve, seg, r, 8, closed); if (!closed) {
        const pos = Array.from(g.getAttribute('position').array), norm = Array.from(g.getAttribute('normal').array), uv = Array.from(g.getAttribute('uv').array), idx = Array.from(g.index.array);
        for (const end of [0, 1]) {
            const center = curve.getPointAt(end), normal = curve.getTangentAt(end).multiplyScalar(end ? 1 : -1), ci = pos.length / 3;
            pos.push(...center.toArray());
            norm.push(...normal.toArray());
            uv.push(.5, .5);
            const start = end * seg * 9;
            for (let j = 0; j < 8; j++) {
                const ai = start + j, bi = start + j + 1, a = new THREE.Vector3().fromArray(pos, ai * 3), b = new THREE.Vector3().fromArray(pos, bi * 3);
                if (a.clone().sub(center).cross(b.clone().sub(center)).dot(normal) > 0)
                    idx.push(ci, ai, bi);
                else
                    idx.push(ci, bi, ai);
            }
        }
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx);
    } return mesh(g, m, [0, 0, 0]); }
    function extrude(shape, depth, p, m, bevel = .025) { const g = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * bevel, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, steps: 1, curveSegments: 24 }); g.translate(0, 0, -depth / 2 + bevel); return mesh(g, m, p); }
    function poly(points, depth, p, m, b = .025) { const sh = new THREE.Shape(); points.forEach((q, i) => i ? sh.lineTo(q[0], q[1]) : sh.moveTo(q[0], q[1])); sh.closePath(); return extrude(sh, depth, p, m, b); }
    // Build a true beveled slab in its own roof plane. Shape triangulation also
    // handles the concave valley boundary; a triangle fan does not.
    function roofPanel(points, thickness = .12, bevel = .022, m = 'roof') {
        const origin = new THREE.Vector3(...points[0]), u = new THREE.Vector3(...points[1]).sub(origin).normalize();
        const normal = new THREE.Vector3(...points[2]).sub(origin).cross(u).normalize();
        if (normal.y < 0)
            normal.negate();
        const v = normal.clone().cross(u).normalize(), shape = new THREE.Shape();
        points.forEach((p, i) => { const delta = new THREE.Vector3(...p).sub(origin), x = delta.dot(u), y = delta.dot(v); if (i)
            shape.lineTo(x, y);
        else
            shape.moveTo(x, y); });
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: thickness - 2 * bevel, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, steps: 1 });
        g.translate(0, 0, -(thickness - bevel));
        g.applyMatrix4(new THREE.Matrix4().makeBasis(u, v, normal));
        g.translate(...origin.toArray());
        return mesh(g, m, [0, 0, 0]);
    }
    function roofBeam(a, b, width = .145, depth = width, m = 'roof-edge') {
        const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), o = box(va.clone().add(vb).multiplyScalar(.5).toArray(), [width, d.length() + .06, depth], m, .046);
        o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
        return o;
    }
    function arch(w, h) { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h - w / 2); sh.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); sh.lineTo(-w / 2, 0); sh.closePath(); return sh; }
    const body = spec.design.architecture, E = body.eaveY, R = body.mainRidgeY, C = body.crossRidgeY, roofDepth = body.roofHalfDepth, crossWidth = body.crossHalfWidth, wingWidth = body.roofHalfWidth;
    const ridgeWidth = body.roofRidgeHalfWidth ?? wingWidth;
    const wingAtY = (y) => wingWidth + (ridgeWidth - wingWidth) * (y - E) / (R - E);
    const valleyX = (y) => (C - y) / (C - E) * crossWidth;
    const mainY = (z) => R - (R - E) * Math.abs(z) / roofDepth;
    mats['architecture-cream'] = mats.cream.clone();
    mats['architecture-cream'].name = 'cream';
    mats['architecture-cream'].color.set('#fff1df');
    mats['architecture-cream'].roughness = .48;
    mats['dormer-glass'] = mats.glass.clone();
    mats['dormer-glass'].name = 'glass';
    mats['dormer-glass'].color.set('#128eca');
    mats['dormer-glass'].roughness = .23;
    mats['roof'].color.set('#842b19');
    mats['roof'].roughness = .46;
    mats['roof-edge'].color.set('#87351f');
    mats['roof-edge'].roughness = .40;
    part('house-base');
    box([0, .125, 0], [13.75, .25, 3.86]);
    part('house-floor');
    box([0, body.floorCenterY, 0], [13.5, .16, 3.77]);
    part('house-left');
    box([-6.72, 2.96, 0], [.22, 5.66, 3.7]);
    part('house-right');
    box([6.72, 2.96, 0], [.22, 5.66, 3.7]);
    part('house-rear');
    box([0, 2.985, -1.9], [13.48, 5.47, .17]);
    // The reference sides/back have quiet stiles at their outside joins.
    for (const id of ['house-left', 'house-right']) {
        current = nodes[id];
        for (const z of [-1.73, 1.73])
            box([id === 'house-left' ? -6.843 : 6.843, 2.95, z], [.022, 5.4, .12], 'cream', .008);
    }
    current = nodes['house-rear'];
    for (const x of [-6.61, 6.61])
        box([x, 2.95, -2.002], [.12, 5.4, .025], 'cream', .008);
    part('house-top');
    box([0, body.topCenterY, 0], [13.52, .15, 3.8]);
    box([0, body.aboutCeilingY, 0], [3.35, .14, 3.8]);
    part('house-upper-dividers');
    for (const x of [-1.77, 1.77])
        box([x, 4.18, 0], [.20, 2.8, 3.7]);
    part('house-lower-dividers');
    for (const x of [-3.35, 0, 3.35])
        box([x, 1.47, 0], [.19, 2.43, 3.7]);
    part('house-central-gable');
    poly([[-1.65, body.centralGableBottomY], [1.65, body.centralGableBottomY], [1.65, 5.72], [0, 7.81], [-1.65, 5.72]], .2, [0, 0, 1.98], 'architecture-cream', .04);
    part('house-rear-gable');
    poly([[-1.65, 5.70], [1.65, 5.70], [0, 7.81]], .17, [0, 0, -1.90], 'architecture-cream', .02);
    // Roof valleys follow the intersection of the two sloped roof systems.
    part('house-main-roof');
    for (const sign of [-1, 1])
        for (const side of [-1, 1]) {
            roofPanel([[side * wingWidth, E, sign * roofDepth], [side * crossWidth, E, sign * roofDepth], [side * valleyX(R), R, 0], [side * ridgeWidth, R, 0]]);
            roofBeam([side * wingWidth, E, sign * roofDepth], [side * ridgeWidth, R, 0]);
            roofBeam([side * wingWidth, E, sign * roofDepth], [side * crossWidth, E, sign * roofDepth], .14, .15);
        }
    // Closed red end gables: roof-color undersides, no cream layer at the eaves.
    for (const side of [-1, 1]) {
        roofPanel([[side * (wingWidth - .055), E, -roofDepth], [side * (wingWidth - .055), E, roofDepth], [side * (ridgeWidth - .055), R, 0]], .115, .025);
        for (let j = 0; j < body.courseCount; j++) {
            const ya = E + (R - E) * j / body.courseCount + .006, yb = E + (R - E) * (j + 1) / body.courseCount - .006, za = roofDepth * (R - ya) / (R - E), zb = roofDepth * (R - yb) / (R - E);
            roofPanel([[side * (wingAtY(ya) + .012), ya, -za], [side * (wingAtY(ya) + .012), ya, za], [side * (wingAtY(yb) + .012), yb, zb], [side * (wingAtY(yb) + .012), yb, -zb]], .024, .005);
        }
    }
    part('house-cross-roof');
    for (const side of [-1, 1]) {
        roofPanel([[0, C, -roofDepth], [side * crossWidth, E, -roofDepth], [side * valleyX(R), R, 0], [side * crossWidth, E, roofDepth], [0, C, roofDepth]]);
        for (const z of [-2.15, 2.15])
            roofBeam([0, C, z], [side * crossWidth, E, z], .17, .17);
    }
    for (const z of [-2.15, 2.15])
        sph([0, C + .025, z], [.105, .105, .102], 'roof-edge');
    for (let i = 0; i < 4; i++) {
        const x = [-5.15, -2.78, 2.78, 5.15][i], z = body.dormerFrontZ, y = body.dormerBaseY, w = body.dormerBodyHalfWidth * 2;
        const frontZ = z + .09, apex = body.dormerPeakY, dormerSlope = (apex - body.dormerEaveY) / body.dormerRoofHalfWidth, backFall = body.dormerBackFall, mainSlope = (R - E) / roofDepth;
        const roofY = (dx, dz) => apex + backFall * (dz - frontZ) - dormerSlope * Math.abs(dx), valleyZ = (dx, underside = 0) => (R - apex + underside + backFall * frontZ + dormerSlope * Math.abs(dx)) / (mainSlope + backFall);
        const h = roofY(0, z) - y - .10, shoulder = roofY(w / 2, z) - y - .10;
        part('dormer-' + i);
        const face = new THREE.Shape();
        face.moveTo(-w / 2, 0);
        face.lineTo(w / 2, 0);
        face.lineTo(w / 2, shoulder);
        face.lineTo(0, h);
        face.lineTo(-w / 2, shoulder);
        face.closePath();
        const opening = new THREE.Path(arch(.79, .91).getPoints(40).map(p => p.add(new THREE.Vector2(0, .11))));
        face.holes.push(opening);
        extrude(face, .22, [x, y, z], 'architecture-cream', .02);
        for (const side of [-1, 1]) {
            const rear = valleyZ(w / 2, .10), depth = z - rear, cheek = poly([[0, 0], [0, shoulder], [depth, mainY(rear) - y]], .065, [0, 0, 0], 'architecture-cream', .015);
            cheek.rotation.y = Math.PI / 2;
            cheek.position.set(x + side * (w / 2 - .025), y, z);
            const edge = body.dormerRoofHalfWidth, edgeZ = valleyZ(edge), ridgeZ = valleyZ(0);
            roofPanel([[x, apex, frontZ], [x + side * edge, body.dormerEaveY, frontZ], [x + side * edge, mainY(edgeZ), edgeZ], [x, mainY(ridgeZ), ridgeZ]], .10, .022);
            roofBeam([x, apex, z + .105], [x + side * edge, body.dormerEaveY, z + .105], .145, .14);
        }
        const ring = arch(.84, .96);
        ring.holes.push(new THREE.Path(arch(.72, .84).getPoints(40).map(p => p.add(new THREE.Vector2(0, .06)))));
        extrude(ring, .058, [x, y + .08, z + .127], 'architecture-cream', .008);
        extrude(arch(.75, .87), .025, [x, y + .12, z + .035], 'dormer-glass', .004);
        box([x, y + .55, z + .096], [.042, .85, .054], 'ivory', .01);
        box([x, y + .54, z + .096], [.75, .042, .054], 'ivory', .01);
    }
    for (const r of spec.design.rooms) {
        part('room-' + r.id);
        const floor = r.floorY + .02, y = floor + r.height / 2;
        box([r.x, y, -1.74], [r.width, r.height, .06], r.material, .015);
        box([r.x, floor, 0], [r.width, .035, 3.6], r.material, .01);
        box([r.x, floor + r.height - .01, 0], [r.width, .025, 3.6], r.material, .006);
        const boundaries = { music: [-6.59, -1.89], about: [-1.65, 1.65], cafe: [1.89, 6.59], monitor: [-6.59, -3.455], sculpture: [-3.245, -.105], schedule: [.105, 3.245], contact: [3.455, 6.59] };
        for (const side of [-1, 1])
            box([boundaries[r.id][side === -1 ? 0 : 1], y, -.02], [.025, r.height, 3.6], r.material, .008);
    }
    const passOrder = ['blockout', 'structural-pass', 'form-refinement', 'material-pass', 'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass'];
    const stage = passOrder.indexOf(pass);
    const stageAt = (id) => stage >= passOrder.indexOf(id);
    function torus(p, radius, thickness, m, rotation = [0, 0, 0], arc = Math.PI * 2) { const o = mesh(new THREE.TorusGeometry(radius, thickness, 8, 48, arc), m, p); o.rotation.fromArray([...rotation, 'XYZ']); return o; }
    function latteCup(x, y, z, m, size = .22) { cyl([x, y + .022, z], size * .6, size * .52, .038, m); cyl([x, y + .055 + size * .36, z], size * .45, size * .29, size * .72, m); torus([x, y + size * .77 + .052, z], size * .40, size * .042, m, [Math.PI / 2, 0, 0]); torus([x + size * .48, y + size * .46, z], size * .24, size * .055, m); cyl([x, y + size * .77 + .052, z], size * .37, size * .37, .007, 'dark'); }
    function tripod(x, y, z, height, m = 'steel') { rod([x, y, z], [x, y + height, z], .018, m); for (let i = 0; i < 3; i++) {
        const a = i * 2 * Math.PI / 3;
        const foot = [x + Math.cos(a) * .27, y, z + Math.sin(a) * .27];
        rod([x, y + .18, z], foot, .017, m);
        sph(foot, [.03, .035, .055], 'dark');
    } }
    function drum(x, y, z, r, h, rx = 0) { const start = current.children.length; const shell = cyl([0, 0, 0], r, r, h, 'wood'); for (const s of [-1, 1]) {
        cyl([0, s * h / 2, 0], r + .012, r + .012, .026, 'ivory');
        torus([0, s * h / 2, 0], r, .018, 'steel', [Math.PI / 2, 0, 0]);
    } for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        box([Math.cos(a) * (r + .018), 0, Math.sin(a) * (r + .018)], [.028, h * .60, .027], 'steel', .01);
    } for (const child of current.children.slice(start)) {
        child.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), rx).add(new THREE.Vector3(x, y, z));
        child.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rx));
    } return shell; }
    function cymbal(x, y, z, r) { cyl([x, y, z], r * .985, r, .013, 'brass', 48); sph([x, y + .011, z], [r, .019, r], 'brass'); sph([x, y + .033, z], [.076, .039, .076], 'brass'); sph([x, y + .065, z], [.025, .025, .025], 'dark'); }
    if (stage >= 1) {
        // MUSIC — reference-led amber kit, unified stands, ellipse and three room props.
        const music = spec.design.music;
        const musicMat = (id, base, color, roughness, metalness = 0) => { const m = mats[base].clone(); m.color.set(color); m.roughness = roughness; m.metalness = metalness; m.roughnessMap = null; m.bumpMap = null; m.map = null; mats[id] = m; return m; };
        const amber = musicMat('music-amber', 'wood', music.shellColor, .39);
        musicMat('music-head', 'ivory', music.headColor, .61);
        musicMat('music-metal', 'steel', music.hardwareColor, .34, .66);
        musicMat('music-gold', 'brass', '#a97325', .32, .65);
        musicMat('music-rubber', 'dark', '#352e26', .74);
        musicMat('music-rug-band', 'phone', '#b0754e', .82);
        musicMat('music-rug-edge', 'wood', '#815137', .8);
        musicMat('music-guitar-side', 'wood', '#8d421e', .45);
        musicMat('music-cabinet', 'ivory', '#ffedcf', .5);
        // Deterministic subtle natural wood variation; no albedo channel used as bump/roughness.
        const woodCanvas = document.createElement('canvas');
        woodCanvas.width = 128;
        woodCanvas.height = 256;
        const wc = woodCanvas.getContext('2d'), wi = wc.createImageData(128, 256);
        for (let y = 0; y < 256; y++)
            for (let x = 0; x < 128; x++) {
                const v = 244 + 5 * Math.sin(x * .31 + Math.sin(y * .035) * .6) + 3 * Math.sin(x * .91 + y * .011), i = (y * 128 + x) * 4;
                wi.data[i] = wi.data[i + 1] = wi.data[i + 2] = v;
                wi.data[i + 3] = 255;
            }
        wc.putImageData(wi, 0, 0);
        amber.map = new THREE.CanvasTexture(woodCanvas);
        amber.map.colorSpace = THREE.SRGBColorSpace;
        function ellipseBand(cx, y, cz, rx, rz, inner, outer, m) { const g = new THREE.RingGeometry(inner, outer, 96); g.rotateX(-Math.PI / 2); g.scale(rx, 1, rz); return mesh(g, m, [cx, y, cz]); }
        part('music-rug');
        const rug = cyl(music.rugCenter, 1, 1, .027, 'ivory', 96);
        rug.scale.set(music.rugRadii[0], 1, music.rugRadii[1]);
        const [rcx, rcy, rcz] = music.rugCenter;
        ellipseBand(rcx, rcy + music.rugBandHeight, rcz, ...music.rugRadii, .855, .925, 'music-rug-band');
        for (const radius of [.85, .929])
            ellipseBand(rcx, rcy + music.rugOutlineHeight, rcz, ...music.rugRadii, radius - .003, radius + .003, 'music-rug-edge');
        function detailedDrum(d) {
            const start = current.children.length, r = d.radius, h = d.depth;
            const shell = cyl([0, 0, 0], r, r, h, 'music-amber', 64);
            for (const end of [-1, 1]) {
                cyl([0, end * (h / 2 + .009), 0], r - .011, r - .011, .015, 'music-head', 64);
                const hoop = cyl([0, end * (h / 2 + .015), 0], r + .026, r + .026, .028, 'music-amber', 64); // hoop annulus replaces filled disk below
                hoop.geometry = new THREE.LatheGeometry([new THREE.Vector2(r + .012, -.014), new THREE.Vector2(r + .026, -.014), new THREE.Vector2(r + .026, .014), new THREE.Vector2(r + .012, .014), new THREE.Vector2(r + .012, -.014)], 64);
                torus([0, end * (h / 2 + .031), 0], r + .020, .010, 'music-metal', [Math.PI / 2, 0, 0]);
            }
            const lugCount = d.id === 'bass' ? 10 : 8;
            for (let i = 0; i < lugCount; i++) {
                const a = i * Math.PI * 2 / lugCount, radial = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
                for (const end of [-1, 1]) {
                    const yy = end * h * .27, o = box([radial.x * (r + .019), yy, radial.z * (r + .019)], [.035, .083, .034], 'music-metal', .015);
                    o.rotation.y = a;
                    rod([radial.x * (r + .022), yy, radial.z * (r + .022)], [radial.x * (r + .022), end * (h / 2 + .027), radial.z * (r + .022)], .006, 'music-metal');
                    sph([radial.x * (r + .024), end * (h / 2 + .030), radial.z * (r + .024)], [.014, .012, .014], 'music-metal');
                }
            }
            const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(d.tiltX, 0, d.tiltZ)), pos = new THREE.Vector3(...d.center);
            for (const child of current.children.slice(start)) {
                child.position.applyQuaternion(q).add(pos);
                child.quaternion.premultiply(q);
            }
            return shell;
        }
        part('music-drums');
        for (const d of music.drums)
            detailedDrum(d);
        current.position.fromArray(music.origin);
        current.rotation.y = music.yaw;
        current.scale.setScalar(music.kitScale);
        part('drum-hardware');
        function rubberFoot(p) { const o = cyl([p[0], p[1] + .02, p[2]], .031, .041, .06, 'music-rubber', 20); return o; }
        function stand(x, z, height, spread = .34) { rod([x, .07, z], [x, height, z], .018, 'music-metal'); for (const y of [.26, height * .58])
            cyl([x, y, z], .034, .034, .065, 'music-metal', 24); for (let i = 0; i < 3; i++) {
            const a = i * Math.PI * 2 / 3 + .30, foot = [x + Math.sin(a) * spread, .045, z + Math.cos(a) * spread];
            rod([x, .28, z], foot, .017, 'music-metal');
            rod([x, .18, z], [x + Math.sin(a) * spread * .62, .12, z + Math.cos(a) * spread * .62], .012, 'music-metal');
            rubberFoot(foot);
        } return [x, height, z]; }
        function cymbalModel(p, r, rx = 0, rz = 0) { const start = current.children.length, profile = [new THREE.Vector2(0, .049), new THREE.Vector2(.024, .049), new THREE.Vector2(r * .10, .046), new THREE.Vector2(r * .17, .035), new THREE.Vector2(r * .25, .017), new THREE.Vector2(r * .45, .010), new THREE.Vector2(r * .78, .003), new THREE.Vector2(r, 0), new THREE.Vector2(r, -.009), new THREE.Vector2(r * .78, -.007), new THREE.Vector2(r * .45, .001), new THREE.Vector2(r * .25, .008), new THREE.Vector2(r * .17, .025), new THREE.Vector2(r * .10, .036), new THREE.Vector2(0, .039)]; mesh(new THREE.LatheGeometry([...profile].reverse(), 80), 'music-gold', [0, 0, 0]); cyl([0, .07, 0], .027, .031, .028, 'music-rubber', 20); cyl([0, .095, 0], .011, .011, .035, 'music-metal', 16); box([0, .115, 0], [.047, .011, .012], 'music-metal', .004); const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)); for (const child of current.children.slice(start)) {
            child.position.applyQuaternion(q).add(new THREE.Vector3(...p));
            child.quaternion.premultiply(q);
        } }
        const boom = stand(-1.21, -.08, 1.26, .40), crash = [-1.04, 1.80, -.13];
        rod(boom, crash, .019, 'music-metal');
        rod(boom, [-1.38, 1.07, -.03], .015, 'music-metal');
        sph(boom, [.041, .035, .038], 'music-metal');
        cymbalModel(crash, .51, .14, -.17);
        stand(1.02, -.30, 1.38, .36);
        cymbalModel([1.02, 1.36, -.30], .29);
        cymbalModel([1.02, 1.40, -.30], .29);
        box([1.02, .055, .15], [.13, .035, .28], 'music-rubber', .02);
        rod([1.02, .07, .03], [1.02, .27, -.30], .013, 'music-metal');
        // Floor tom legs, snare cradle and tom mounts all share the kit transform.
        for (let i = 0; i < 3; i++) {
            const a = i * Math.PI * 2 / 3 + .7, x = -.94 + Math.sin(a) * .34, z = -.04 + Math.cos(a) * .34;
            rod([x, .56, z], [x, .20, z], .015, 'music-metal');
            const foot = [x + Math.sin(a) * .07, .05, z + Math.cos(a) * .07];
            rod([x, .20, z], foot, .015, 'music-metal');
            rubberFoot(foot);
            cyl([x, .52, z], .024, .024, .06, 'music-metal', 20);
        }
        stand(.76, -.30, .63, .25);
        for (let i = 0; i < 3; i++) {
            const a = i * Math.PI * 2 / 3;
            rod([.76, .64, -.30], [.76 + Math.sin(a) * .27, .74, -.30 + Math.cos(a) * .27], .014, 'music-metal');
        }
        rod([.12, .98, .06], [.12, 1.27, .06], .032, 'music-metal');
        for (const d of music.drums.slice(1, 3)) {
            rod([.12, 1.22, .06], [d.center[0], d.center[1] - .04, d.center[2]], .024, 'music-metal');
            sph([d.center[0], d.center[1] - .04, d.center[2]], [.042, .042, .042], 'music-metal');
        }
        for (const side of [-1, 1]) {
            const start = [.20 + side * .43, .34, .49], foot = [.20 + side * .50, .055, .75];
            rod(start, foot, .024, 'music-metal');
            sph(start, [.04, .037, .035], 'music-metal');
            rubberFoot(foot);
        }
        // User correction: omit the incorrectly placed front bass pedal and beater.
        const throne = stand(-.05, -.74, .78, .24);
        cyl([-.05, .83, -.74], .23, .22, .085, 'music-rubber', 48);
        torus([-.05, .855, -.74], .212, .012, 'music-rubber', [Math.PI / 2, 0, 0]);
        for (let i = 0; i < 2; i++) {
            rod([.54 + i * .09, 1.00, -.20], [.96 + i * .06, 1.03, -.45], .011, 'music-amber');
            sph([.96 + i * .06, 1.03, -.45], [.015, .012, .017], 'music-amber');
        }
        current.position.fromArray(music.origin);
        current.rotation.y = music.yaw;
        current.scale.setScalar(music.kitScale);
        // Acoustic guitar: warm soundboard, darker body depth, six strings and hardware.
        part('music-guitar');
        const guitar = new THREE.Shape();
        guitar.moveTo(-.07, .31);
        guitar.bezierCurveTo(-.27, .43, -.36, .25, -.28, .08);
        guitar.bezierCurveTo(-.19, -.045, -.27, -.10, -.36, -.26);
        guitar.bezierCurveTo(-.47, -.57, -.24, -.64, 0, -.64);
        guitar.bezierCurveTo(.24, -.64, .47, -.57, .36, -.26);
        guitar.bezierCurveTo(.27, -.10, .19, -.045, .28, .08);
        guitar.bezierCurveTo(.36, .25, .27, .43, .07, .31);
        guitar.closePath();
        const bodyWithCavity = guitar.clone(), bodyHole = new THREE.Path();
        bodyHole.absarc(0, .08, .104, 0, Math.PI * 2, true);
        bodyWithCavity.holes.push(bodyHole);
        extrude(bodyWithCavity, .18, [0, 0, 0], 'music-guitar-side', .008);
        extrude(guitar, .018, [0, 0, -.098], 'music-guitar-side', .004);
        const soundboard = guitar.clone(), hole = new THREE.Path();
        hole.absarc(0, .08, .104, 0, Math.PI * 2, true);
        soundboard.holes.push(hole);
        extrude(soundboard, .025, [0, 0, .11], 'music-amber', .004); // Dark backing is recessed 0.21 units behind the open soundboard, not painted over the mouth.
        const cavity = cyl([0, .08, -.086], .103, .103, .004, 'music-rubber', 64);
        cavity.rotation.x = Math.PI / 2;
        torus([0, .08, .129], .115, .004, 'music-rug-edge');
        torus([0, .08, .130], .108, .0025, 'ivory');
        box([0, -.22, .14], [.25, .041, .024], 'music-rubber', .008);
        box([0, .81, .035], [.095, 1.03, .055], 'music-guitar-side', .011);
        box([0, .82, .072], [.10, 1.04, .025], 'music-rubber', .008);
        box([0, 1.46, .045], [.135, .24, .065], 'music-guitar-side', .026);
        const pickguard = new THREE.Shape();
        pickguard.moveTo(.125, .16);
        pickguard.bezierCurveTo(.19, .14, .22, .08, .235, -.02);
        pickguard.bezierCurveTo(.25, -.12, .25, -.22, .20, -.25);
        pickguard.bezierCurveTo(.15, -.28, .085, -.25, .085, -.20);
        pickguard.bezierCurveTo(.085, -.13, .108, -.04, .108, .025);
        pickguard.quadraticCurveTo(.16, .085, .125, .16);
        pickguard.closePath();
        extrude(pickguard, .009, [0, 0, .13], 'music-rubber', .003);
        for (let i = 0; i < 6; i++) {
            const x = (i - 2.5) * .010;
            rod([x, -.23, .158], [x, 1.50, .095], .0013, 'music-metal');
            sph([x, -.245, .16], [.004, .004, .004], 'ivory');
        }
        for (let i = 0; i < 14; i++) {
            const y = 1.31 - 1.53 * (1 - Math.pow(2, -(i + 1) / 12));
            rod([-.050, y, .093], [.050, y, .093], .0027, 'music-metal');
        }
        for (const y of [1.38, 1.46, 1.53])
            for (const side of [-1, 1]) {
                rod([side * .05, y, .046], [side * .087, y, .046], .005, 'music-metal');
                sph([side * .097, y, .046], [.020, .018, .012], 'ivory');
            }
        current.position.fromArray(music.guitarOrigin);
        current.rotation.z = music.guitarLean;
        current.scale.setScalar(music.guitarScale);
        rod([-.20, -.59, -.08], [.20, -.59, -.08], .025, 'music-rubber');
        rod([0, -.58, -.09], [0, .35, -.14], .025, 'music-rubber');
        part('music-amplifier');
        const [ax, ay, az] = music.ampOrigin;
        box([ax, ay, az], [.67, .57, .39], 'music-cabinet', .060);
        box([ax, ay - .057, az + .202], [.565, .366, .015], 'music-rug-edge', .018);
        const grilleMat = musicMat('music-grille', 'wood', '#c39b62', .86), canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const gc = canvas.getContext('2d');
        gc.fillStyle = '#dcc398';
        gc.fillRect(0, 0, 256, 256);
        gc.lineWidth = 2;
        for (let i = 0; i < 256; i += 8) {
            gc.strokeStyle = '#655137';
            gc.beginPath();
            gc.moveTo(i, 0);
            gc.lineTo(i, 256);
            gc.stroke();
            gc.strokeStyle = '#96764d';
            gc.beginPath();
            gc.moveTo(0, i + 2);
            gc.lineTo(256, i + 2);
            gc.stroke();
        }
        grilleMat.map = new THREE.CanvasTexture(canvas);
        grilleMat.map.colorSpace = THREE.SRGBColorSpace;
        box([ax, ay - .057, az + .213], [.538, .345, .010], 'music-grille', .009);
        box([ax, ay + .191, az + .205], [.568, .115, .024], 'music-cabinet', .02);
        for (let i = 0; i < 3; i++) {
            const x = ax - .218 + i * .10, knob = cyl([x, ay + .19, az + .230], .027, .025, .021, 'ivory', 32);
            knob.rotation.x = Math.PI / 2;
            torus([x, ay + .19, az + .229], .029, .003, 'music-metal');
            rod([x, ay + .20, az + .242], [x, ay + .216, az + .242], .0028, 'music-rug-edge');
        }
        sph([ax + .22, ay + .19, az + .229], [.019, .023, .012], 'music-guitar-side');
        tube([[ax - .105, ay + .287, az], [ax - .09, ay + .323, az], [ax + .09, ay + .323, az], [ax + .105, ay + .287, az]], .012, 'music-rubber', false, 24);
        for (const x of [ax - .23, ax + .23])
            for (const z of [az - .13, az + .13])
                cyl([x, ay - .297, z], .025, .025, .035, 'music-rubber', 20);
        // Rotate the cabinet about its own center while retaining its reference location.
        for (const child of current.children)
            child.position.sub(new THREE.Vector3(ax, ay, az));
        current.position.set(ax, ay, az);
        current.rotation.y = music.ampYaw;
        part('music-lamp');
        const [lx, ly, lz] = music.lampCenter;
        musicMat('music-paper', 'ivory', '#fff0d4', .78);
        musicMat('music-paper-rib', 'ivory', '#edd8b7', .81);
        mats['music-paper'].emissive.set('#ffe3a3');
        mats['music-paper'].emissiveIntensity = music.lanternEmissiveIntensity;
        const profile = [];
        for (let i = 0; i <= 32; i++) {
            const a = .16 + (Math.PI - .32) * i / 32;
            profile.push(new THREE.Vector2(.273 * Math.sin(a), .275 * Math.cos(a)));
        }
        profile.reverse();
        profile.push(profile[0].clone());
        mesh(new THREE.LatheGeometry(profile, 64), 'music-paper', [lx, ly, lz]);
        for (let i = 1; i < 11; i++) {
            const y = -.25 + i * .05, r = .273 * Math.sqrt(1 - (y / .275) ** 2);
            torus([lx, ly + y, lz], r, .0028, 'music-paper-rib', [Math.PI / 2, 0, 0]);
        }
        rod([lx, ly + .27, lz], [lx, 5.44, lz], .014, 'music-metal');
        cyl([lx, 5.44, lz], .062, .062, .021, 'music-metal', 32);
        for (const y of [ly - .272, ly + .272])
            cyl([lx, y, lz], .043, .043, .008, 'music-paper', 32);
        // ABOUT ME — low legless sofa, organic pillows, framed art and slender lamp.
        const living = spec.design.living, aboutRoom = spec.design.rooms.find((r) => r.id === 'about');
        const aboutFloor = aboutRoom.floorY + .02 + .035 / 2 - body.upperFloorOffset;
        const livingMat = (id, base, color, roughness, metalness = 0) => { const m = mats[base].clone(); m.color.set(color); m.map = null; m.bumpMap = null; m.roughnessMap = null; m.roughness = roughness; m.metalness = metalness; m.name = base; mats[id] = m; return m; };
        livingMat('living-upholstery', 'ivory', living.upholsteryColor, .67);
        livingMat('living-seam', 'cream', '#d8c6a6', .78);
        livingMat('living-cloth', 'cream', living.blanketColor, .83);
        livingMat('living-sage', 'sage', living.pillowLeftColor, .77);
        livingMat('living-apricot', 'peach', living.pillowRightColor, .74);
        livingMat('living-wood', 'wood', '#af702d', .43);
        livingMat('living-gold', 'brass', '#ac751e', .32, .65);
        const shadeMaterial = livingMat('living-shade', 'ivory', '#ffedc7', .76);
        shadeMaterial.emissive.set('#ffdf91');
        shadeMaterial.emissiveIntensity = .12;
        function padded(p, size, r, m, swell = .015, axis = 'z') { const g = new RoundedBoxGeometry(size[0], size[1], size[2], 7, r), a = g.getAttribute('position'); for (let i = 0; i < a.count; i++) {
            const x = a.getX(i), y = a.getY(i), z = a.getZ(i), fall = Math.max(0, 1 - (x / (size[0] / 2)) ** 2) * Math.max(0, 1 - ((axis === 'y' ? z : y) / (size[axis === 'y' ? 2 : 1] / 2)) ** 2);
            if (axis === 'y')
                a.setY(i, y + Math.sign(y) * swell * fall * Math.min(1, Math.abs(y) / (size[1] * .35)));
            else
                a.setZ(i, z + Math.sign(z) * swell * fall * Math.min(1, Math.abs(z) / (size[2] * .35)));
        } g.computeVertexNormals(); return mesh(g, m, p); }
        function cushionPiping(x, y, z, w, h, r, m, rotation) { const shape = new THREE.Shape(); shape.moveTo(-w / 2 + r, -h / 2); shape.lineTo(w / 2 - r, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); shape.lineTo(-w / 2 + r, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); const pts = shape.getPoints(64).map(p => new THREE.Vector3(p.x, p.y, 0)); if (pts[0].distanceToSquared(pts[pts.length - 1]) < 1e-10)
            pts.pop(); if (rotation)
            for (const v of pts)
                v.applyEuler(rotation); const c = new THREE.CatmullRomCurve3(pts, true); return mesh(new THREE.TubeGeometry(c, 96, living.pipingRadius, 6, true), m, [x, y, z]); }
        part('about-sofa');
        const sx = living.sofaCenterX, sz = living.sofaZ, f = aboutFloor + living.groundGap;
        // The upholstered plinth itself contacts the floor: no hidden/visible leg primitives.
        padded([sx, f + living.baseHeight / 2, sz], [living.width - .10, living.baseHeight, .99], .105, 'living-upholstery', .025);
        padded([sx, f + living.rearCenterY, sz - .38], [living.width - .20, .68, .24], .11, 'living-upholstery');
        for (const side of [-1, 1]) {
            const sh = new THREE.Shape();
            sh.moveTo(-.08, .055);
            sh.lineTo(.08, .055);
            sh.quadraticCurveTo(.125, .055, .125, .11);
            sh.lineTo(.125, .51);
            sh.bezierCurveTo(.125, .77, -.125, .77, -.125, .51);
            sh.lineTo(-.125, .11);
            sh.quadraticCurveTo(-.125, .055, -.08, .055);
            sh.closePath();
            const arm = extrude(sh, 1.04, [sx + side * (living.width / 2 - .135), f, sz], 'living-upholstery', .045), ag = arm.geometry.clone();
            ag.deleteAttribute('normal');
            ag.deleteAttribute('uv');
            arm.geometry = mergeVertices(ag, 1e-6);
            arm.geometry.computeVertexNormals();
        }
        for (const side of [-1, 1]) {
            const x = sx + side * .485;
            padded([x, f + living.seatCenterY, sz + .055], [.945, .205, .79], .082, 'living-upholstery', living.cushionSwell, 'y');
            cushionPiping(x, f + living.seatCenterY, sz + .427, .897, .153, .047, 'living-seam');
            padded([x, f + living.backCenterY, sz - .285], [.945, living.backHeight, .24], .09, 'living-upholstery', living.cushionSwell);
            cushionPiping(x, f + living.backCenterY, sz - .156, .890, living.backHeight - .053, .07, 'living-seam');
        }
        // Closed polar surfaces make the pillows visibly plush, with a bowed outline.
        function plushPillow(cx, cy, cz, w, h, m, rz) {
            const sectors = 80, rings = 18, v = [], idx = [], outline = [];
            const contour = (a) => { const c = Math.cos(a), s = Math.sin(a), q = 1 + .025 * Math.sin(3 * a + .4) - .018 * Math.cos(5 * a); return new THREE.Vector2(w / 2 * Math.sign(c) * Math.abs(c) ** .64 * q, h / 2 * Math.sign(s) * Math.abs(s) ** .67 * q); };
            for (const side of [1, -1]) {
                const offset = v.length / 3;
                v.push(0, 0, side * .115);
                for (let r = 1; r <= rings; r++) {
                    const u = r / rings;
                    for (let k = 0; k < sectors; k++) {
                        const a = 2 * Math.PI * k / sectors, p = contour(a), z = side * (.014 + .101 * Math.max(0, 1 - u * u) ** .62) + .005 * Math.sin(5 * a + .7) * u ** 7;
                        v.push(p.x * u, p.y * u, z);
                    }
                }
                for (let k = 0; k < sectors; k++)
                    idx.push(...(side === 1 ? [offset, offset + 1 + k, offset + 1 + (k + 1) % sectors] : [offset, offset + 1 + (k + 1) % sectors, offset + 1 + k]));
                for (let r = 1; r < rings; r++)
                    for (let k = 0; k < sectors; k++) {
                        const a = offset + 1 + (r - 1) * sectors + k, b = offset + 1 + (r - 1) * sectors + (k + 1) % sectors, c = a + sectors, d = b + sectors;
                        idx.push(...(side === 1 ? [a, c, b, b, c, d] : [a, b, c, b, d, c]));
                    }
            }
            const span = 1 + rings * sectors, front = 1 + (rings - 1) * sectors, back = span + front;
            for (let k = 0; k < sectors; k++) {
                const n = (k + 1) % sectors;
                idx.push(front + k, back + k, front + n, front + n, back + k, back + n);
                const p = contour(2 * Math.PI * k / sectors);
                outline.push(new THREE.Vector3(p.x, p.y, .005 * Math.sin(5 * 2 * Math.PI * k / sectors + .7)));
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
            g.setIndex(idx);
            g.computeVertexNormals();
            const p = mesh(g, m, [cx, cy, cz]);
            p.rotation.set(-.14, 0, rz);
            const seam = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outline, true), 120, .0028, 6, true), m, [cx, cy, cz]);
            seam.rotation.copy(p.rotation);
        }
        plushPillow(sx - .61, f + living.pillowCenterY, sz + .04, .46, .415, 'living-sage', .20);
        plushPillow(sx + .62, f + living.pillowCenterY - .005, sz + .065, .48, .405, 'living-apricot', -.23);
        // No blanket or fringe: explicit user removal.
        part('about-portrait');
        const [px, py, pz] = living.portraitCenter, [pw, portraitH] = living.portraitSize, portraitY = aboutFloor + py;
        box([px, portraitY, pz], [pw, portraitH, .085], 'living-wood', .019);
        box([px, portraitY, pz + .055], [pw - .08, portraitH - .08, .038], 'living-gold', .011);
        box([px, portraitY, pz + .081], [pw - .115, portraitH - .115, .024], 'ivory', .009);
        box([px, portraitY, pz + .098], [pw - .17, portraitH - .17, .013], 'living-wood', .004);
        if (spec.__portrait)
            mesh(new THREE.PlaneGeometry(pw - .195, portraitH - .195), new THREE.MeshBasicMaterial({ map: spec.__portrait }), [px, portraitY, pz + .106]);
        part('about-lamp');
        const [lampX, , lampZ] = living.lampCenter;
        cyl([lampX, aboutFloor + .029, lampZ], .162, .177, .056, 'living-gold', 64);
        cyl([lampX, aboutFloor + .065, lampZ], .060, .075, .029, 'living-gold', 48);
        rod([lampX, aboutFloor + .06, lampZ], [lampX, aboutFloor + living.lampShadeCenterY + .025, lampZ], .0125, 'living-gold');
        cyl([lampX, aboutFloor + 1.175, lampZ], .025, .030, .070, 'living-gold', 32);
        const [topRadius, bottomRadius] = living.lampShadeRadii, halfShade = living.lampShadeHeight / 2;
        const shadeProfile = [new THREE.Vector2(topRadius, halfShade), new THREE.Vector2(bottomRadius, -halfShade), new THREE.Vector2(bottomRadius - .008, -halfShade), new THREE.Vector2(topRadius - .008, halfShade), new THREE.Vector2(topRadius, halfShade)];
        mesh(new THREE.LatheGeometry(shadeProfile.reverse(), 80), 'living-shade', [lampX, aboutFloor + living.lampShadeCenterY, lampZ]);
        for (const [y, r] of [[halfShade, topRadius], [-halfShade, bottomRadius]])
            torus([lampX, aboutFloor + living.lampShadeCenterY + y, lampZ], r, .0038, 'living-cloth', [Math.PI / 2, 0, 0]);
        sph([lampX, aboutFloor + living.lampShadeCenterY - .02, lampZ], [.045, .060, .045], 'living-shade');
        // CAFÉ — closed ceramic vessels, grounded stools and a personal memory board.
        const cafe = spec.design.cafe, cafeRoom = spec.design.rooms.find((r) => r.id === 'cafe'), cf = cafeRoom.floorY + .02 + .035 / 2 - body.upperFloorOffset + .002;
        const cafeMat = (id, base, color, roughness, metalness = 0) => { const m = mats[base].clone(); m.color.set(color); m.map = null; m.bumpMap = null; m.roughnessMap = null; m.roughness = roughness; m.metalness = metalness; m.name = base; mats[id] = m; return m; };
        for (const [id, base, col, r, metal] of [['cafe-cream', 'ivory', '#f8e7c7', .57, 0], ['cafe-body', 'cream', '#f0dcbb', .64, 0], ['cafe-wood', 'wood', '#b47134', .46, 0], ['cafe-gold', 'brass', '#b77e2e', .35, .45], ['cafe-pink', 'rose', '#d99e8f', .70, 0], ['cafe-sage', 'sage', '#829b76', .66, 0], ['cafe-blue', 'blue', '#a7bbc8', .66, 0], ['cafe-cork', 'cinnamon', '#b7783e', .88, 0], ['cafe-coffee', 'dark', '#6b432b', .39, 0], ['cafe-metal', 'steel', '#b7aca0', .36, .60], ['cafe-peach', 'peach', '#e0a47b', .67, 0], ['cafe-paper', 'ivory', '#f7e9cf', .88, 0], ['cafe-butter', 'butter', '#ead99b', .88, 0], ['cafe-lilac', 'lavender', '#beb7c9', .88, 0]])
            cafeMat(id, base, col, r, metal);
        cafeMat('cafe-room-paint', 'butter', cafe.roomPaint, .77);
        cafeMat('cafe-window-glass', 'glass', cafe.windowGlass, .22);
        nodes['room-cafe'].traverse(o => { if (o.isMesh)
            o.material = mats['cafe-room-paint']; });
        // Finely speckled cork. Deterministic grain affects finish, never the frame outline.
        const corkCanvas = document.createElement('canvas');
        corkCanvas.width = corkCanvas.height = 256;
        const cc = corkCanvas.getContext('2d');
        cc.fillStyle = '#b7783e';
        cc.fillRect(0, 0, 256, 256);
        let corkSeed = 741;
        for (let i = 0; i < 4200; i++) {
            corkSeed = (corkSeed * 1664525 + 1013904223) >>> 0;
            const x = corkSeed % 256;
            corkSeed = (corkSeed * 1664525 + 1013904223) >>> 0;
            const y = corkSeed % 256;
            cc.fillStyle = i % 3 ? '#b57b43' : '#a9713b';
            cc.fillRect(x, y, 1 + (i % 2), 1);
        }
        const corkMap = new THREE.CanvasTexture(corkCanvas);
        corkMap.colorSpace = THREE.SRGBColorSpace;
        mats['cafe-cork'].map = corkMap;
        mats['cafe-cork'].color.set('#ffffff');
        // One hollow porcelain form, including its foot and rolled rim, with a true D handle.
        function cupHandlePoints(h, side = 1) { return [[.49, .80], [.72, .84], [.88, .78], [.94, .58], [.89, .36], [.73, .24], [.44, .26]].map(([x, y]) => [side * x * h, y * h, 0]); }
        function ceramicCup(x, y, z, h, m, saucer = true, leftHandle = false) {
            const r = h * .55, baseY = y + (saucer ? .017 : 0), side = leftHandle ? -1 : 1;
            if (saucer) {
                const p = [[0, 0], [r * .56, 0], [r * 1.46, .002], [r * 1.61, .009], [r * 1.60, .018], [r * 1.45, .023], [r * .79, .016], [0, .012]];
                mesh(new THREE.LatheGeometry(p.map(v => new THREE.Vector2(...v)), 64), m, [x, y, z]);
            }
            const profile = [[0, 0], [.32, 0], [.365, .015], [.395, .055], [.44, .18], [.495, .39], [.53, .64], [.55, .91], [.546, .967], [.524, 1], [.497, .974], [.495, .91], [.476, .63], [.432, .37], [.32, .155], [0, .155]];
            mesh(new THREE.LatheGeometry(profile.map(v => new THREE.Vector2(v[0] * h, v[1] * h)), 72), m, [x, baseY, z]);
            tube(cupHandlePoints(h, side).map(p => [p[0] + x, p[1] + baseY, p[2] + z]), h * .060, m, false, 48);
            if (saucer)
                cyl([x, baseY + h * .87, z], h * .48, h * .48, .003, 'cafe-coffee', 64);
        }
        part('cafe-counter');
        box([cafe.counterCenterX, cf + .45, cafe.counterZ], [cafe.counterWidth, .90, cafe.counterDepth - .07], 'cafe-body', .065);
        box([cafe.counterCenterX, cf + cafe.counterHeight, cafe.counterZ], [cafe.counterWidth + .16, cafe.topThickness, cafe.counterDepth], 'cafe-wood', .049);
        const cafeTop = cf + cafe.counterHeight + cafe.topThickness / 2;
        part('cafe-stools');
        for (const [si, x] of cafe.stoolXs.entries()) {
            const m = si ? 'cafe-sage' : 'cafe-pink', z = cafe.stoolZ, y = cf + cafe.stoolSeatY;
            const profile = [[0, -.063], [.21, -.063], [.259, -.059], [.283, -.040], [.29, 0], [.283, .043], [.249, .070], [.16, .082], [0, .086]];
            mesh(new THREE.LatheGeometry(profile.map(v => new THREE.Vector2(...v)), 64), m, [x, y, z]);
            const feet = [];
            for (let i = 0; i < 4; i++) {
                const a = Math.PI / 4 + i * Math.PI / 2, foot = [x + Math.cos(a) * .28, cf + .015, z + Math.sin(a) * .28];
                feet.push(foot);
                const top = [x + Math.cos(a) * .16, y - .055, z + Math.sin(a) * .16];
                rod(top, foot, .033, 'cafe-wood');
                cyl([foot[0], cf + .006, foot[2]], .033, .035, .012, 'cafe-wood', 24);
            }
            for (let i = 0; i < 4; i++) {
                const a = feet[i], b = feet[(i + 1) % 4];
                rod([x + (a[0] - x) * .83, cf + .26, z + (a[2] - z) * .83], [x + (b[0] - x) * .83, cf + .26, z + (b[2] - z) * .83], .019, 'cafe-wood');
            }
        }
        part('cafe-machine');
        const mx = cafe.machineX, mz = cafe.machineZ, my = cafeTop;
        box([mx, my + .031, mz], [.57, .062, .41], 'cafe-cream', .024);
        box([mx, my + .315, mz - .145], [.55, .55, .10], 'cafe-cream', .033);
        for (const dx of [-.239, .239])
            box([mx + dx, my + .29, mz], [.082, .51, .41], 'cafe-cream', .029);
        box([mx, my + .511, mz + .004], [.57, .163, .42], 'cafe-cream', .045);
        for (const [dx, r] of [[-.174, .028], [0, .061], [.174, .035]]) {
            const k = cyl([mx + dx, my + .525, mz + .226], r, r, .025, 'cafe-gold', 40);
            k.rotation.x = Math.PI / 2;
            if (dx !== -.174) {
                const mark = box([mx + dx, my + .537, mz + .242], [.007, r * .74, .006], 'cafe-cream', .002);
            }
        }
        // Recessed brewing head: short components, no bulky projecting lever.
        cyl([mx, my + .397, mz + .025], .074, .071, .052, 'cafe-metal', 40);
        cyl([mx, my + .359, mz + .025], .047, .049, .032, 'cafe-gold', 32);
        for (const dx of [-.023, .023])
            cyl([mx + dx, my + .337, mz + .025], .009, .009, .018, 'cafe-gold', 20);
        rod([mx + .025, my + .368, mz + .027], [mx + .101, my + .371, mz + .092], .010, 'cafe-gold');
        sph([mx + .110, my + .371, mz + .098], [.026, .020, .035], 'cafe-wood');
        tube([[mx + .184, my + .428, mz + .11], [mx + .191, my + .383, mz + .13], [mx + .207, my + .370, mz + .15], [mx + .219, my + .295, mz + .155]], .0085, 'cafe-metal', false, 24);
        cyl([mx + .219, my + .281, mz + .155], .010, .010, .023, 'cafe-gold', 20);
        box([mx, my + .064, mz + .018], [.454, .014, .305], 'cafe-metal', .007);
        for (let i = 0; i < 11; i++)
            box([mx - .197 + i * .039, my + .073, mz + .018], [.019, .004, .276], 'cafe-cream', .001);
        ceramicCup(mx, my + .076, mz + .038, .132, 'cafe-pink', false);
        part('cafe-cup');
        ceramicCup(cafe.cupX, cafeTop + .001, cafe.cupZ, cafe.cupHeight, 'cafe-sage');
        part('cafe-mug-rail');
        const [railStart, railEnd] = cafe.railXRange, railY = cf + cafe.railY, railZ = cafe.railZ;
        rod([railStart, railY, railZ], [railEnd, railY, railZ], .023, 'cafe-wood');
        for (const x of [railStart, railEnd]) {
            sph([x, railY, railZ], [.044, .044, .044], 'cafe-wood');
            rod([x, railY, railZ], [x, railY, -1.60], .020, 'cafe-wood');
        }
        // Each short S hook seats against the upper INSIDE arc of its handle.
        // Balance the rigid cup about that bearing; don't arbitrarily tilt a floating vessel.
        const cafeSuspension = [];
        for (const [i, m] of ['cafe-peach', 'cafe-sage', 'cafe-blue', 'cafe-cream'].entries()) {
            const x = railStart + .10 + i * .39, h = cafe.hangingCupHeight, curve = new THREE.CatmullRomCurve3(cupHandlePoints(h, -1).map(v => new THREE.Vector3(...v))), loopCenter = new THREE.Vector3(-h * .73, h * .54, 0), com = new THREE.Vector3(0, h * .48, 0), inside = [];
            for (let j = 8; j <= 92; j++) {
                const p = curve.getPoint(j / 100);
                inside.push(p.clone().add(loopCenter.clone().sub(p).normalize().multiplyScalar(h * .060)));
            }
            let bestError = Infinity, bestAngle = 0, bestPoint = inside[0];
            for (let k = 0; k <= 750; k++) {
                const angle = -1.65 + k * .001, q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
                let top = inside[0], topY = -Infinity;
                for (const p of inside) {
                    const v = p.clone().sub(com).applyQuaternion(q);
                    if (v.y > topY) {
                        topY = v.y;
                        top = p;
                    }
                }
                const error = Math.abs(top.clone().sub(com).applyQuaternion(q).x);
                if (error < bestError) {
                    bestError = error;
                    bestAngle = angle;
                    bestPoint = top;
                }
            }
            const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), cafe.hangingCupYaw).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), bestAngle)), bearing = new THREE.Vector3(x, railY - cafe.hookDrop, railZ + .080), origin = bearing.clone().sub(bestPoint.clone().applyQuaternion(q)), start = current.children.length;
            ceramicCup(0, 0, 0, h, m, false, true);
            for (const child of current.children.slice(start)) {
                child.position.applyQuaternion(q).add(origin);
                child.quaternion.premultiply(q);
            }
            const hy = bearing.y - cafe.hookRadius, hz = bearing.z;
            tube([[x, railY - .008, railZ - .032], [x, railY + .043, railZ - .007], [x, railY + .036, railZ + .031], [x, railY - .025, railZ + .049], [x, hy + .040, hz - .018], [x, hy, hz], [x, hy + .012, hz + .029], [x, hy + .053, hz + .031]], cafe.hookRadius, 'cafe-gold', false, 48);
            const centerOfMass = com.clone().applyQuaternion(q).add(origin);
            cafeSuspension.push({ cup: i, tilt: bestAngle, handleInnerBearing: bearing.clone().add(new THREE.Vector3(0, body.upperFloorOffset, 0)).toArray(), hookCradleTop: [x, hy + cafe.hookRadius + body.upperFloorOffset, hz], estimatedCenterOfMass: centerOfMass.add(new THREE.Vector3(0, body.upperFloorOffset, 0)).toArray(), balanceHorizontalGap: bestError });
        }
        root.userData.cafeSuspension = cafeSuspension;
        part('cafe-corkboard');
        const [bx, by, bz] = cafe.boardCenter, boardY = cf + by, [bw, bh] = cafe.boardSize;
        box([bx, boardY, bz], [bw, bh, .115], 'cafe-wood', .047);
        box([bx, boardY, bz + .065], [bw - .090, bh - .090, .043], 'cafe-gold', .033);
        box([bx, boardY, bz + .090], [bw - .146, bh - .146, .033], 'cafe-cork', .019);
        populateCafeMemoryBoard(current, [bx, boardY, bz + .115], spec.__cafePhotos ?? {});
        part('cafe-window');
        const [wx, wy, wz] = cafe.windowCenter, windowY = cf + wy, [wh, ww] = cafe.windowSize;
        function windowRing(w, h, iw, ih, depth, x, m, bevel) { const sh = new THREE.Shape(); sh.moveTo(-w / 2, -h / 2); sh.lineTo(w / 2, -h / 2); sh.lineTo(w / 2, h / 2); sh.lineTo(-w / 2, h / 2); sh.closePath(); const hole = new THREE.Path(); hole.moveTo(-iw / 2, -ih / 2); hole.lineTo(-iw / 2, ih / 2); hole.lineTo(iw / 2, ih / 2); hole.lineTo(iw / 2, -ih / 2); hole.closePath(); sh.holes.push(hole); const o = extrude(sh, depth, [x, windowY, wz], m, bevel); o.rotation.y = -Math.PI / 2; }
        // Open joinery, recessed panes and a small reveal: no solid frame slab across the glazing.
        windowRing(ww + .16, wh + .16, ww - .04, wh - .04, .080, wx - .035, 'cafe-wood', .013);
        windowRing(ww - .015, wh - .015, ww - .09, wh - .09, .036, wx - .063, 'cafe-cream', .005);
        for (let row = 0; row < 3; row++)
            for (let col = 0; col < 2; col++) {
                const cellH = (wh - .11) / 3, cellW = (ww - .11) / 2, y = windowY + (1 - row) * cellH, z = wz + (col ? 1 : -1) * cellW / 2;
                box([wx - .049, y, z], [.017, cellH - .021, cellW - .024], 'cafe-window-glass', .004);
            }
        for (const y of [windowY - wh / 6, windowY + wh / 6])
            box([wx - .083, y, wz], [.040, .027, ww - .09], 'cafe-wood', .006);
        box([wx - .083, windowY, wz], [.040, wh - .09, .026], 'cafe-wood', .006);
        // MONITORING — scoped satin miniature: four wall-mounted displays and simple white desk.
        const mn = spec.design.monitor, groundY = mn.floorTop, x0 = mn.screenCenterX;
        const monitorMat = (id, base, color, roughness) => { mats[id] = mats[base].clone(); mats[id].name = base; mats[id].color.set(color); mats[id].roughness = roughness; mats[id].bumpScale = .0005; return id; };
        const white = monitorMat('monitor-white', 'ivory', mn.palette.white, .48), sage = monitorMat('monitor-sage', 'sage', mn.palette.sage, .63), bezel = monitorMat('monitor-bezel', 'dark', mn.palette.bezel, .42), display = monitorMat('monitor-display', 'navy', mn.palette.screen, .31), trim = monitorMat('monitor-trim', 'steel', '#52616a', .45);
        nodes['room-monitor'].traverse(o => { if (o.isMesh) {
            const m = o, mat = m.material.clone();
            mat.color.set(mn.roomPaint);
            mat.roughness = .61;
            m.material = mat;
        } });
        part('monitor-screens');
        // Rear bars and discrete stand-offs physically join the wall to each display.
        for (const y of mn.screenY) {
            box([x0, y, -1.671], [2.12, .056, .066], bezel, .011);
        }
        for (let i = 0; i < 4; i++) {
            const x = x0 + (i % 2 ? .55 : -.55), y = mn.screenY[Math.floor(i / 2)], z = mn.screenFrontZ;
            box([x, y, -1.619], [.17, .16, .07], bezel, .017);
            box([x, y, -1.529], [1.04, .61, .125], bezel, .045);
            box([x, y + .008, z - .052], [.948, .523, .027], trim, .030);
            box([x, y + .010, z - .030], [.922, .494, .024], display, .024);
            // Lower control chin and tiny status lamp, no bright glow outside the display.
            box([x, y - .271, z - .050], [.17, .012, .008], trim, .004);
            sph([x + .44, y - .265, z - .047], [.008, .005, .004], 'mint');
            const face = z - .014;
            if (i === 0) {
                box([x - .09, y - .186, face], [.57, .006, .004], trim, .002);
                box([x - .373, y - .03, face], [.005, .30, .004], trim, .001);
                for (let j = 0; j < 4; j++) {
                    const h = [.11, .18, .26, .34][j];
                    box([x - .303 + j * .137, y - .183 + h / 2, face + .004], [.099, h, .007], ['cream', 'glass', 'sage', 'pink'][j], .008);
                }
                for (let j = 0; j < 4; j++)
                    box([x + .334, y + .135 - j * .076, face], [.103 - j % 2 * .028, .014, .005], 'blue', .004);
            }
            else if (i === 1) {
                for (let j = 0; j < 3; j++) {
                    const yy = y + .145 - j * .145;
                    box([x - .332, yy, face + .003], [.105, .067, .009], ['mint', 'sage', 'pink'][j], .017);
                    const sh = new THREE.Shape();
                    sh.moveTo(0, 0);
                    sh.lineTo(.021, 0);
                    sh.lineTo(0, -.02);
                    sh.closePath();
                    extrude(sh, .008, [x - .36, yy - .029, face + .004], ['mint', 'sage', 'pink'][j], .001);
                    box([x + .052, yy + .012, face], [.47 - j % 2 * .08, .018, .004], 'blue', .005);
                    box([x - .017, yy - .024, face], [.33, .011, .004], 'cream', .003);
                }
            }
            else if (i === 2) {
                for (let j = 0; j < 3; j++) {
                    const yy = y + .143 - j * .144;
                    sph([x - .32, yy, face], [.046, .046, .009], ['cream', 'glass', 'sage'][j]);
                    sph([x - .32, yy + .014, face + .012], [.015, .015, .005], bezel);
                    sph([x - .32, yy - .020, face + .012], [.024, .014, .005], bezel);
                    box([x + .041, yy + .015, face], [.48, .016, .004], 'blue', .005);
                    box([x - .027, yy - .023, face], [.34, .010, .004], 'cream', .003);
                }
            }
            else {
                const shares = [.24, .17, .23, .22, .14], colors = ['sage', 'glass', 'pink', 'cream', 'mint'];
                let angle = .25;
                for (let j = 0; j < shares.length; j++) {
                    const arc = shares[j] * Math.PI * 2 - .033, sh = new THREE.Shape(), outer = .171, inner = .083;
                    sh.moveTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
                    sh.absarc(0, 0, outer, angle, angle + arc, false);
                    sh.lineTo(Math.cos(angle + arc) * inner, Math.sin(angle + arc) * inner);
                    sh.absarc(0, 0, inner, angle + arc, angle, true);
                    sh.closePath();
                    extrude(sh, .013, [x - .235, y + .008, face + .007], colors[j], .0025);
                    angle += shares[j] * Math.PI * 2;
                }
                for (let j = 0; j < 4; j++) {
                    const yy = y + .15 - j * .092;
                    sph([x + .044, yy, face], [.014, .014, .006], colors[j]);
                    box([x + .22, yy, face], [.25 - j % 2 * .04, .012, .004], 'blue', .003);
                }
            }
        }
        part('monitor-desk');
        const deskTop = 1.01, deskLegTop = deskTop - .046, deskBottom = groundY + .002;
        box([x0, deskTop, .12], [2.12, .105, .76], white, .029);
        for (const x of [x0 - .93, x0 + .93])
            for (const z of [-.15, .40])
                box([x, (deskLegTop + deskBottom) / 2, z], [.085, deskLegTop - deskBottom, .085], white, .018);
        for (const z of [-.15, .4])
            box([x0, deskLegTop - .037, z], [1.89, .075, .044], white, .010);
        part('monitor-chair');
        const cz = mn.chairZ, cy = groundY;
        // A continuous curved profile, tapered shoulders and deep bevels shape the upholstery.
        function chairCushion(p, width, height, depth, mat, seat = false) {
            // Closed convex superellipsoid: one surface, continuous bulge, no stacked shells.
            const g = new THREE.SphereGeometry(1, 64, 40), pos = g.getAttribute('position'), power = (v) => Math.sign(v) * Math.pow(Math.abs(v), .39);
            for (let i = 0; i < pos.count; i++) {
                const px = power(pos.getX(i)), py = power(pos.getY(i)), pz = power(pos.getZ(i));
                pos.setXYZ(i, px * width / 2 * (1 - .018 * Math.max(0, py)), py * height / 2, pz * depth / 2);
            }
            g.computeVertexNormals();
            const cushion = mesh(g, mat, p);
            if (seat)
                cushion.rotation.x = -Math.PI / 2;
            return cushion;
        }
        chairCushion([x0, .723, cz], .69, .61, .145, sage, true);
        const back = chairCushion([x0, .974, cz + .24], .68, .530, .175, sage);
        back.rotation.x = .075;
        box([x0, .661, cz], [.23, .043, .20], bezel, .018);
        cyl([x0, .538, cz], .031, .039, .218, 'steel', 24);
        cyl([x0, .455, cz], .064, .066, .10, bezel, 32);
        cyl([x0, cy + .127, cz], .091, .091, .105, white, 32);
        for (let i = 0; i < 5; i++) {
            const a = i * Math.PI * 2 / 5 + Math.PI / 10, rx = Math.cos(a), rz = Math.sin(a), end = [x0 + rx * .335, cy + .125, cz + rz * .335];
            rod([x0 + rx * .045, cy + .141, cz + rz * .045], end, .035, white);
            cyl([end[0], cy + .091, end[2]], .025, .025, .074, trim, 16);
            const wheelY = cy + .067, axle = new THREE.Vector3(rz, 0, -rx);
            for (const side of [-1, 1]) {
                const wheel = cyl([end[0] + axle.x * side * .021, wheelY, end[2] + axle.z * side * .021], .065, .065, .031, bezel, 24);
                wheel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axle);
            }
        }
        for (const side of [-1, 1]) {
            const xx = x0 + side * .382;
            tube([[x0 + side * .29, .690, cz + .11], [xx, .698, cz + .11], [xx, .860, cz + .11]], .022, white, false, 32);
            chairCushion([xx, .882, cz + .016], .135, .34, .087, sage, true);
        }
        {
            // SCULPTURE STUDIO — one continuous carved bust on a lower working plinth.
            const sc = spec.design.sculpture, sx = sc.centerX, sz = sc.centerZ, sg = sc.floorTop;
            function sculptMat(id, base, color, roughness) { mats[id] = mats[base].clone(); mats[id].name = base; mats[id].color.set(color); mats[id].roughness = roughness; mats[id].metalness = 0; mats[id].bumpScale = .0003; return id; }
            const stone = sculptMat('sculpt-stone', 'stone', sc.stoneAlbedo, .66), hairStone = sculptMat('sculpt-hair', 'stone', '#efdfc7', .61), ivory = sculptMat('sculpt-ivory', 'ivory', '#f7ead6', .53), honey = sculptMat('sculpt-wood', 'wood', sc.woodAlbedo, .47);
            nodes['room-sculpture'].traverse(o => { if (o.isMesh) {
                const m = o, mat = m.material.clone();
                mat.color.set(sc.roomPaint);
                m.material = mat;
            } });
            if (spec.__sculptureV2) {
                const source = spec.__sculptureV2;
                source.updateMatrixWorld(true);
                const meshes = {};
                source.traverse(o => { if (o.isMesh)
                    meshes[o.name.replace('sculpture-v2-', '')] = o; });
                const bustBounds = new THREE.Box3().setFromObject(meshes.bust, true), pedestalBounds = new THREE.Box3().setFromObject(meshes.pedestal, true), anchor = pedestalBounds.getCenter(new THREE.Vector3());
                const scale = 1.35 / (bustBounds.max.y - bustBounds.min.y), floorY = pedestalBounds.min.y, position = [sx, sg + .002, sz];
                const evidence = { path: sc.externalAsset.fullRoomPath, source: 'classical bust 3d model (2).glb', uniformScale: scale, anchor: [anchor.x, floorY, anchor.z], position, parts: {}, method: 'Complete new source styled in standalone GLB; bust/pedestal/table/tools/chips inserted into existing house room and frame' };
                for (const [sourceName, partName] of [['pedestal', 'sculpture-pedestal'], ['bust', 'sculpture-bust'], ['tools', 'sculpture-tools'], ['chips', 'sculpture-chips']]) {
                    part(partName);
                    const src = meshes[sourceName], g = src.geometry.clone();
                    g.applyMatrix4(src.matrixWorld);
                    g.translate(-anchor.x, -floorY, -anchor.z);
                    g.scale(scale, scale, scale);
                    const material = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: .66, metalness: 0, clearcoat: .035, clearcoatRoughness: .70, envMapIntensity: .35 });
                    material.name = 'sculpture-source-v2-palette';
                    g.computeBoundingBox();
                    const placed = position.slice();
                    if (sourceName === 'tools' || sourceName === 'chips')
                        placed[1] -= g.boundingBox.min.y;
                    const obj = mesh(g, material, placed);
                    obj.name = partName + '-source-v2-' + serial;
                    obj.userData.sourceAsset = sc.externalAsset.fullRoomPath;
                    evidence.parts[partName] = { sourceName, triangles: g.getIndex().count / 3 };
                }
                root.userData.sculptureAssetEvidence = evidence;
            }
            else {
                part('sculpture-pedestal');
                box([sx, sg + .052, sz], [.70, .10, .64], ivory, .019);
                box([sx, .711, sz], [.555, .742, .51], ivory, .014);
                box([sx, 1.034, sz], [.66, .070, .60], ivory, .016);
                cyl([sx, 1.095, sz], .37, .37, .055, honey, 64);
                // Raised quiet rectangular moulding and recessed centre panel.
                box([sx, .723, sz + .267], [.408, .534, .018], ivory, .009);
                for (const x of [sx - .214, sx + .214])
                    box([x, .723, sz + .278], [.017, .559, .015], ivory, .005);
                for (const y of [.4445, 1.0015])
                    box([sx, y, sz + .278], [.443, .017, .015], ivory, .005);
                part('sculpture-bust');
                if (spec.__sculptureAsset) {
                    // User-supplied bust with user-requested local chest smoothing; original placement anchor retained.
                    const source = spec.__sculptureAsset;
                    source.updateMatrixWorld(true);
                    const bounds = new THREE.Box3().setFromObject(source, true), size = bounds.getSize(new THREE.Vector3()), centre = bounds.getCenter(new THREE.Vector3()), scale = sc.externalAsset.targetHeight / size.y;
                    const assetMaterial = new THREE.MeshPhysicalMaterial({ color: sc.stoneAlbedo, roughness: .66, metalness: 0, clearcoat: .035, clearcoatRoughness: .70, envMapIntensity: .35 });
                    assetMaterial.name = 'stone';
                    source.traverse(o => { if (o.isMesh) {
                        const src = o, g = src.geometry.clone();
                        g.applyMatrix4(src.matrixWorld);
                        g.translate(-(sc.externalAsset.sourceCenter?.[0] ?? centre.x), -bounds.min.y, -(sc.externalAsset.sourceCenter?.[2] ?? centre.z));
                        g.scale(scale, scale, scale);
                        const statue = mesh(g, assetMaterial, [sx, sc.pedestalTopY, sz]);
                        statue.name = 'sculpture-bust-imported-' + serial;
                        statue.userData.sourceAsset = sc.externalAsset.path;
                    } });
                    root.userData.sculptureAssetEvidence = { path: sc.externalAsset.path, sourceDimensions: size.toArray(), uniformScale: scale, targetHeight: sc.externalAsset.targetHeight, position: [sx, sc.pedestalTopY, sz], albedo: sc.stoneAlbedo, roughness: .66, metalness: 0, clearcoat: .035, method: 'Explicitly user-provided GLB bust extraction, shape preserved; satin ivory material, uniform scale and height grounding' };
                }
                else {
                    const allHairPoints = [];
                    function weldedNormals(g) { const base = g.clone(); base.deleteAttribute('uv'); base.deleteAttribute('normal'); const welded = mergeVertices(base, 1e-6); welded.computeVertexNormals(); const wp = welded.getAttribute('position'), wn = welded.getAttribute('normal'), lookup = new Map(); const key = (x, y, z) => [x, y, z].map(v => Math.round(v * 1e6)).join(','); for (let i = 0; i < wp.count; i++)
                        lookup.set(key(wp.getX(i), wp.getY(i), wp.getZ(i)), [wn.getX(i), wn.getY(i), wn.getZ(i)]); const gp = g.getAttribute('position'), norm = []; for (let i = 0; i < gp.count; i++)
                        norm.push(...lookup.get(key(gp.getX(i), gp.getY(i), gp.getZ(i)))); g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3)); base.dispose(); welded.dispose(); }
                    // Smooth, capped ellipse-ring loft. Profile is (height, half-width, half-depth, z-centre).
                    function sculptLoft(profile, seg, rings, mat, p, deform) {
                        const curve = new THREE.CatmullRomCurve3(profile.map(q => new THREE.Vector3(q[1], q[0], q[2])), false, 'centripetal'), positions = [], uv = [], indices = [], samples = [];
                        for (let i = 0; i <= rings; i++) {
                            const t = i / rings, q = curve.getPoint(t), y = q.y, rx = Math.max(.0003, q.x), rz = Math.max(.0003, q.z), zc = profile[0][3] ?? 0;
                            samples.push([y, rx, rz, zc]);
                            for (let j = 0; j <= seg; j++) {
                                const angle = j / seg * Math.PI * 2;
                                let xyz = [rx * Math.cos(angle), y, zc + rz * Math.sin(angle)];
                                if (deform)
                                    xyz = deform(...xyz, angle);
                                positions.push(...xyz);
                                uv.push(j / seg, t);
                            }
                        }
                        for (let i = 0; i < rings; i++)
                            for (let j = 0; j < seg; j++) {
                                const a = i * (seg + 1) + j, b = a + seg + 1;
                                indices.push(a, b, a + 1, a + 1, b, b + 1);
                            }
                        for (const end of [0, 1]) {
                            const ring = end * rings * (seg + 1), center = positions.length / 3, base = samples[end * rings];
                            positions.push(0, base[0], base[3]);
                            uv.push(.5, end);
                            for (let j = 0; j < seg; j++)
                                if (end)
                                    indices.push(center, ring + j + 1, ring + j);
                                else
                                    indices.push(center, ring + j, ring + j + 1);
                        }
                        const g = new THREE.BufferGeometry();
                        g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
                        g.setIndex(indices);
                        weldedNormals(g);
                        const o = mesh(g, mat, p);
                        return { o, g, samples };
                    }
                    const torsoProfile = [[1.1225, .170, .123], [1.17, .225, .151], [1.29, .295, .180], [1.42, .385, .196], [1.52, .430, .181], [1.57, .388, .173], [1.635, .218, .135], [1.705, .116, .100], [1.79, .098, .091], [1.87, .091, .085]];
                    const ga = (x, y, cx, cy, wx, wy) => Math.exp(-(((x - cx) / wx) ** 2 + ((y - cy) / wy) ** 2));
                    const torso = sculptLoft(torsoProfile, 96, 78, stone, [sx, 0, sz], (x, y, z, a) => {
                        const front = Math.pow(Math.max(0, Math.sin(a)), 2), edge = 1.435 + .54 * x, cloth = 1 - THREE.MathUtils.smoothstep(y, edge - .018, edge + .023), d = edge - y;
                        const folds = cloth * (.014 + .012 * Math.cos(d * 47 + .7 * Math.sin(x * 6) + .25 * Math.sin(y * 17)) + .003 * Math.cos(d * 86 + x * 11)) * front * THREE.MathUtils.smoothstep(y, 1.1225, 1.22);
                        const collar = -.006 * (ga(x, y, -.115, 1.614, .12, .012) + ga(x, y, .114, 1.617, .11, .013));
                        const unfinished = THREE.MathUtils.smoothstep(y, 1.14, 1.19) * (1 - THREE.MathUtils.smoothstep(y, 1.20, 1.31)) * .008 * (Math.sin(a * 11 + y * 43) + .45 * Math.sin(a * 19 - y * 32));
                        return [x, y + .045 * Math.max(0, Math.cos(a)) * ga(0, y, 0, 1.53, 1, .12), z + folds + front * collar + unfinished];
                    });
                    torso.o.name = 'sculpture-bust-torso-' + serial;
                    // Face landmarks are sculpted into a coherent closed surface, with blank stone eyes.
                    const headProfile = [[-.295, .006, .014], [-.268, .061, .062], [-.225, .106, .104], [-.178, .150, .137], [-.095, .191, .170], [0, .212, .188], [.098, .218, .184], [.190, .191, .159], [.253, .120, .104], [.286, .035, .033], [.295, .001, .001]];
                    const relief = (x, y) => .043 * ga(x, y, 0, -.016, .025, .091) + .045 * ga(x, y, 0, -.079, .031, .022) + .014 * (ga(x, y, -.026, -.092, .017, .015) + ga(x, y, .026, -.092, .017, .015)) - .006 * (ga(x, y, -.020, -.105, .007, .007) + ga(x, y, .020, -.105, .007, .007)) + .012 * (ga(x, y, -.123, -.056, .064, .061) + ga(x, y, .123, -.056, .064, .061)) - .015 * (ga(x, y, -.076, .024, .048, .027) + ga(x, y, .076, .024, .048, .027)) + .008 * (ga(x, y, -.075, .075, .062, .014) + ga(x, y, .075, .075, .062, .014)) + .011 * (ga(x, y, -.016, -.140, .026, .008) + ga(x, y, .016, -.140, .026, .008)) + .012 * ga(x, y, 0, -.162, .050, .010) - .004 * ga(x, y, 0, -.152, .052, .007);
                    const head = sculptLoft(headProfile, 128, 96, stone, [sx, sc.headCenterY, sz], (x, y, z, a) => [x, y, z + relief(x, y) * Math.pow(Math.max(0, Math.sin(a)), .45)]);
                    head.o.name = 'sculpture-bust-head-' + serial;
                    const ringAt = (y) => { let best = head.samples[0]; for (const q of head.samples)
                        if (Math.abs(q[0] - y) < Math.abs(best[0] - y))
                            best = q; return best; };
                    const faceZ = (x, y) => { const q = ringAt(y); return q[2] * Math.sqrt(Math.max(0, 1 - (x / q[1]) ** 2)) + relief(x, y); };
                    for (const side of [-1, 1]) {
                        const ex = side * .076, ey = .021, z = faceZ(ex, ey);
                        sph([sx + ex, sc.headCenterY + ey, sz + z - .007], [.039, .019, .013], stone);
                        const upper = [], lower = [];
                        for (let j = 0; j <= 16; j++) {
                            const t = j / 16, x = ex - .039 + t * .078, y = ey + Math.sin(t * Math.PI) * .018;
                            upper.push([sx + x, sc.headCenterY + y, sz + faceZ(x, y) + .002]);
                            const ly = ey - Math.sin(t * Math.PI) * .011;
                            lower.push([sx + x, sc.headCenterY + ly, sz + faceZ(x, ly) + .001]);
                        }
                        tube(upper, .0032, stone, false, 32);
                        tube(lower, .0023, stone, false, 32);
                        const ear = sph([sx + side * .216, sc.headCenterY - .026, sz - .035], [.027, .054, .021], stone);
                        ear.rotation.z = side * .08;
                        tube([[sx + side * .228, sc.headCenterY + .012, sz - .026], [sx + side * .233, sc.headCenterY - .033, sz - .018], [sx + side * .218, sc.headCenterY - .063, sz - .011]], .004, stone, false, 24);
                    }
                    // Hair is a carved cap plus broad tapered wave volumes, all attached in head space.
                    const scalpProfile = [[.112, .223, .207, -.009], [.184, .225, .201, -.009], [.267, .175, .158, -.009], [.315, .081, .078, -.009], [.328, .001, .001, -.009]];
                    const scalp = sculptLoft(scalpProfile, 96, 40, hairStone, [sx, sc.headCenterY, sz], (x, y, z, a) => { const hem = (1 - THREE.MathUtils.smoothstep(y, .112, .235)) * Math.max(0, Math.sin(a)); return [x, y + hem * (.025 + .017 * Math.sin(a * 3 + .9)), z]; });
                    scalp.o.name = 'sculpture-bust-scalp-' + serial;
                    const addHairEvidence = (g, offset = [0, 0, 0]) => { const p = g.getAttribute('position'); for (let i = 0; i < p.count; i++)
                        allHairPoints.push([p.getX(i) + offset[0], p.getY(i) + offset[1], p.getZ(i) + offset[2]]); };
                    addHairEvidence(scalp.g);
                    const bun = sph([sx - .015, sc.headCenterY + .267, sz - .214], [.136, .087, .104], hairStone);
                    bun.name = 'sculpture-bust-bun-' + serial;
                    addHairEvidence(bun.geometry.clone().scale(.136, .087, .104), [-.015, .267, -.214]);
                    function carvedLock(points, width, depth, tendril = false) {
                        const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal'), n = 64, radial = 16, frames = curve.computeFrenetFrames(64, false), pos = [], uv = [], idx = [];
                        for (let i = 0; i <= n; i++) {
                            const t = i / n, p = curve.getPointAt(t), T = curve.getTangentAt(t).normalize(), N = frames.normals[i], B = frames.binormals[i], prev = curve.getTangentAt(Math.max(0, t - .0125)), next = curve.getTangentAt(Math.min(1, t + .0125)), arc = curve.getPointAt(Math.min(1, t + .0125)).distanceTo(curve.getPointAt(Math.max(0, t - .0125))), curvature = next.distanceTo(prev) / Math.max(arc, .00001), radiusLimit = .20 / Math.max(curvature, .01), taper = tendril ? (.95 - .88 * t) : (.62 + .35 * Math.sin(Math.PI * t)) * (1 - .86 * t ** 5);
                            for (let j = 0; j <= radial; j++) {
                                const a = j / radial * Math.PI * 2, ridge = 1, v = p.clone().addScaledVector(B, Math.cos(a) * Math.min(width, .028) * taper).addScaledVector(N, Math.sin(a) * Math.min(depth, .018) * taper * ridge);
                                pos.push(...v.toArray());
                                uv.push(j / radial, t);
                            }
                        }
                        for (let i = 0; i < n; i++)
                            for (let j = 0; j < radial; j++) {
                                const a = i * (radial + 1) + j, b = a + radial + 1;
                                idx.push(a, a + 1, b, a + 1, b + 1, b);
                            }
                        for (const end of [0, 1]) {
                            const center = pos.length / 3, p = curve.getPointAt(end);
                            pos.push(...p.toArray());
                            uv.push(.5, end);
                            const start = end * n * (radial + 1);
                            for (let j = 0; j < radial; j++)
                                if (end)
                                    idx.push(center, start + j, start + j + 1);
                                else
                                    idx.push(center, start + j + 1, start + j);
                        }
                        for (let k = 0; k < idx.length; k += 3) {
                            const swap = idx[k + 1];
                            idx[k + 1] = idx[k + 2];
                            idx[k + 2] = swap;
                        }
                        const g = new THREE.BufferGeometry();
                        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
                        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
                        g.setIndex(idx);
                        // Differential normals follow the actual section and longitudinal surface.
                        // The UV seam shares the same differential, avoiding normal bias at bent seams.
                        const normal = [], at = (i, j) => new THREE.Vector3().fromArray(pos, (i * (radial + 1) + (j + radial) % radial) * 3);
                        for (let i = 0; i <= n; i++)
                            for (let j = 0; j <= radial; j++) {
                                const along = at(Math.min(n, i + 1), j).sub(at(Math.max(0, i - 1), j)), around = at(i, j + 1).sub(at(i, j - 1)), out = new THREE.Vector3().crossVectors(along, around).normalize();
                                if (i === 0)
                                    out.addScaledVector(curve.getTangentAt(0), -.45).normalize();
                                if (i === n)
                                    out.addScaledVector(curve.getTangentAt(1), .45).normalize();
                                normal.push(...out.toArray());
                            }
                        normal.push(...curve.getTangentAt(0).negate().toArray(), ...curve.getTangentAt(1).toArray());
                        g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
                        const o = mesh(g, hairStone, [sx, sc.headCenterY, sz]);
                        o.name = 'sculpture-bust-hair-lock-' + serial;
                        addHairEvidence(g);
                        return o;
                    }
                    const waves = [
                        [[-.15, .265, -.06], [-.205, .21, .125], [-.155, .165, .199], [-.075, .225, .203], [.035, .23, .190], [.095, .21, .15]],
                        [[-.105, .31, -.07], [-.16, .295, .10], [-.055, .29, .173], [.075, .275, .183], [.145, .195, .169], [.20, .12, .102]],
                        [[.025, .319, -.025], [.115, .31, .076], [.192, .27, .09], [.225, .18, .065], [.211, .095, .04]],
                        [[-.10, .295, -.11], [-.18, .34, .02], [-.065, .348, .08], [.055, .335, .077], [.135, .30, .05]],
                        [[-.16, .25, -.10], [-.239, .22, 0], [-.253, .155, .081], [-.237, .050, .082], [-.205, .005, .028]],
                        [[.16, .25, -.12], [.241, .215, -.025], [.254, .16, .028], [.243, .06, .035], [.210, -.005, .012]],
                        [[-.12, .18, -.175], [-.228, .13, -.107], [-.25, .035, -.06], [-.20, -.053, -.10]],
                        [[.14, .18, -.175], [.235, .12, -.095], [.251, .032, -.053], [.207, -.06, -.103]],
                        [[-.11, .22, -.255], [-.092, .3, -.308], [.025, .317, -.31], [.118, .265, -.237]],
                        [[.085, .23, -.185], [.13, .27, -.221], [.072, .318, -.275], [-.052, .326, -.251]],
                    ];
                    for (const [i, points] of waves.entries())
                        carvedLock(points, i < 4 ? .040 : .035, i < 4 ? .024 : .022);
                    carvedLock([[-.215, .030, .006], [-.225, -.050, .031], [-.191, -.122, .029], [-.214, -.188, .039], [-.207, -.215, .037]], .012, .011, true);
                    carvedLock([[.219, .035, .006], [.239, -.047, .03], [.214, -.116, .031], [.225, -.176, .021]], .011, .010, true);
                    root.userData.sculptureScalpEvidence = { rings: head.samples, hairPoints: allHairPoints, band: [.75, 1], coordinates: 'Actual head-local generated mesh vertices; scalp cap and locks only, before statue rigid display pose' };
                    // Rigid gentle turn of the entire sculpture preserves all face/hair contacts.
                    for (const child of current.children)
                        child.position.sub(new THREE.Vector3(sx, 1.90, sz));
                    current.position.set(sx, 1.90, sz);
                    current.rotation.y = sc.poseYaw;
                }
                part('sculpture-tools');
                if (spec.__sculptureProps) {
                    const source = spec.__sculptureProps.tools;
                    source.updateMatrixWorld(true);
                    const b = new THREE.Box3().setFromObject(source, true), c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3()), scales = new THREE.Vector3(.90 / size.x, 4.70, .68 / size.z);
                    source.traverse(o => { if (o.isMesh) {
                        const src = o, g = src.geometry.clone();
                        g.applyMatrix4(src.matrixWorld);
                        g.translate(-c.x, -b.min.y, -c.z);
                        g.scale(scales.x, scales.y, scales.z);
                        const material = src.material.clone();
                        material.envMapIntensity = .35;
                        const obj = mesh(g, material, [-2.65, sg + .002, .23]);
                        obj.name = 'sculpture-tools-imported-' + serial;
                    } });
                    root.userData.sculpturePropsEvidence = { tools: { path: sc.externalAsset.toolsPath, sourceBounds: { min: b.min.toArray(), max: b.max.toArray() }, scales: scales.toArray(), position: [-2.65, sg + .002, .23] }, chips: [] };
                }
                else {
                    const tx = -2.65, topY = 1.025;
                    box([tx, topY, .23], [.88, .085, .60], honey, .025);
                    const legTop = topY - .040, legLow = sg + .002;
                    for (const x of [tx - .36, tx + .36])
                        for (const z of [-.005, .465])
                            box([x, (legTop + legLow) / 2, z], [.071, legTop - legLow, .071], ivory, .013);
                    for (const x of [tx - .36, tx + .36])
                        box([x, .53, .23], [.06, .055, .51], ivory, .009);
                    for (const z of [-.005, .465])
                        box([tx, .53, z], [.75, .055, .061], ivory, .009);
                    // Mallet rests diagonally with a gently rounded solid wood head.
                    rod([-2.95, 1.094, .45], [-2.76, 1.110, .065], .025, honey);
                    const mallet = box([-2.754, 1.143, .063], [.203, .151, .145], honey, .042);
                    mallet.rotation.y = .37;
                    for (let i = 0; i < 2; i++) {
                        const x = -2.54 + i * .17;
                        rod([x + .025, 1.090, .085], [x - .04, 1.090, .30], .022, honey);
                        rod([x - .04, 1.085, .30], [x - .071, 1.078, .419], .009, 'steel');
                        const blade = poly([[-.025, 0], [.025, 0], [.027, .10], [-.025, .10]], .012, [x - .071, 1.077, .419], 'steel', .002);
                        blade.rotation.x = Math.PI / 2;
                        blade.rotation.z = -.30;
                    }
                    rod([-2.43, 1.087, .09], [-2.37, 1.087, .25], .021, honey);
                    box([-2.360, 1.086, .282], [.106, .044, .086], honey, .012);
                    box([-2.358, 1.084, .345], [.111, .035, .073], ivory, .006);
                    for (let j = 0; j < 8; j++)
                        box([-2.405 + j * .0134, 1.105, .348], [.003, .004, .067], honey, .001);
                }
                // Four right and two left fragments retain accepted x/z centres.
                part('sculpture-chips');
                if (spec.__sculptureProps) {
                    const source = spec.__sculptureProps.chips;
                    source.updateMatrixWorld(true);
                    const parts = [];
                    source.traverse(o => { if (o.isMesh)
                        parts.push(o); });
                    const placements = [...sc.chipsRight.map((q) => ({ x: sx + q[0], z: sz + q[1], extent: q[2] * 2 })), ...sc.chipsLeft.map((q) => ({ x: sx + q[0], z: sz + q[1], extent: .085 }))];
                    parts.forEach((src, i) => { const target = placements[i], g = src.geometry.clone(); g.applyMatrix4(src.matrixWorld); g.computeBoundingBox(); const b = g.boundingBox, c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3()), scale = target.extent / Math.max(size.x, size.z); g.translate(-c.x, -b.min.y, -c.z); g.scale(scale, scale, scale); const material = src.material.clone(); material.envMapIntensity = .35; const obj = mesh(g, material, [target.x, sg + .002, target.z]); obj.name = 'sculpture-chips-imported-' + serial; root.userData.sculpturePropsEvidence.chips.push({ path: sc.externalAsset.chipsPath, index: i, sourceBounds: { min: b.min.toArray(), max: b.max.toArray() }, scale, position: [target.x, sg + .002, target.z] }); });
                }
                else {
                    for (const [dx, dz, size] of sc.chipsRight) {
                        const o = mesh(new THREE.DodecahedronGeometry(size, 0), stone, [sx + dx, 0, sz + dz]);
                        o.rotation.set(.3 + dx, .8, dz);
                        o.updateMatrix();
                        const p = o.geometry.getAttribute('position');
                        let low = Infinity;
                        for (let i = 0; i < p.count; i++)
                            low = Math.min(low, new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrix).y);
                        o.position.y = sg + .002 - low;
                    }
                    for (const [dx, dz] of sc.chipsLeft) {
                        const o = mesh(new THREE.DodecahedronGeometry(.045, 0), stone, [sx + dx, 0, sz + dz]);
                        o.updateMatrix();
                        const p = o.geometry.getAttribute('position');
                        let low = Infinity;
                        for (let i = 0; i < p.count; i++)
                            low = Math.min(low, new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrix).y);
                        o.position.y = sg + .002 - low;
                    }
                }
            }
        }
        {
            // SCHEDULE — rounded rolling whiteboard, attached supports and compact stationery table.
            const plan = spec.design.schedule;
            const planMat = (id, base, color, roughness, metalness = 0) => { const m = mats[base].clone(); m.color.set(color); m.map = null; m.bumpMap = null; m.roughnessMap = null; m.roughness = roughness; m.metalness = metalness; const physical = m; physical.clearcoat = .025; physical.clearcoatRoughness = .65; mats[id] = m; return id; };
            for (const [id, color] of Object.entries(plan.palette))
                planMat('schedule-' + id, id === 'rim' ? 'steel' : id === 'wood' ? 'wood' : 'ivory', color, id === 'rim' ? .48 : id === 'face' ? .59 : id === 'rubber' ? .82 : .67, id === 'rim' ? .18 : 0);
            const px = plan.boardCenter[0], py = plan.boardCenter[1], pz = plan.boardCenter[2], bw = plan.boardSize[0], bh = plan.boardSize[1], bd = plan.boardSize[2], pf = plan.floorY + plan.groundGap;
            function planContour(w, h, r) { const sh = new THREE.Shape(); sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); sh.closePath(); return sh; }
            part('schedule-board');
            const rim = planContour(bw, bh, plan.cornerRadius);
            rim.holes.push(new THREE.Path(planContour(bw - .078, bh - .078, plan.cornerRadius - .035).getPoints(24).reverse()));
            extrude(rim, bd, [px, py, pz], 'schedule-rim', .006);
            box([px, py, pz - .020], [bw - .028, bh - .028, .044], 'schedule-rim', .020);
            box([px, py, pz + .034], [bw - .080, bh - .080, .055], 'schedule-face', .033);
            // Turn-axis joints intersect the board rim and the upright posts.
            for (const x of plan.postX) {
                const side = x < px ? -1 : 1, edgeX = px + side * bw / 2;
                rod([edgeX - side * .024, py, pz], [x + side * .033, py, pz], .031, 'schedule-rim');
                const hub = cyl([x + side * .012, py, pz], .063, .063, .038, 'schedule-rim', 32);
                hub.rotation.z = Math.PI / 2;
                const knob = cyl([x + side * .038, py, pz], .041, .041, .017, 'schedule-ink', 32);
                knob.rotation.z = Math.PI / 2;
                box([x, (pf + .155 + py + .104) / 2, pz], [.044, py + .104 - (pf + .155), .048], 'schedule-rim', .012);
                // The foot spans fore/aft; rubber wheels rotate about their lateral axles.
                const [back, front] = plan.footZ, fy = pf + .161;
                box([x, fy, (back + front) / 2], [.126, .054, front - back + .090], 'schedule-rim', .018);
                for (const z of [back, front]) {
                    const wy = pf + .057;
                    cyl([x, fy - .035, z], .020, .020, .055, 'schedule-rim', 24);
                    for (const side of [-1, 1])
                        box([x + side * .029, wy + .031, z], [.012, .082, .073], 'schedule-rim', .008);
                    const tire = cyl([x, wy, z], .057, .057, .046, 'schedule-rubber', 32);
                    tire.rotation.z = Math.PI / 2;
                    rod([x - .044, wy, z], [x + .044, wy, z], .012, 'schedule-rim');
                    for (const side of [-1, 1]) {
                        const hub = cyl([x + side * .025, wy, z], .025, .025, .005, 'schedule-ink', 24);
                        hub.rotation.z = Math.PI / 2;
                    }
                }
            }
            // Rear stiffener joins the two posts, behind the board rather than the chart.
            box([px, py - .12, pz - .035], [plan.postX[1] - plan.postX[0], .046, .042], 'schedule-rim', .009);
            const trayX = px + .52, trayY = py - bh / 2 + .022, trayZ = pz + .100;
            box([trayX, trayY, trayZ], [.77, .024, .148], 'schedule-face', .010);
            box([trayX, trayY + .019, trayZ + .064], [.77, .014, .014], 'schedule-rim', .006);
            // A capped blue marker and dark eraser rest on the shallow tray.
            const marker = cyl([trayX - .16, trayY + .026, trayZ], .014, .014, .236, 'schedule-face', 24);
            marker.rotation.z = Math.PI / 2;
            for (const [x, m] of [[trayX - .264, 'schedule-blue'], [trayX - .041, 'schedule-ink']]) {
                const cap = cyl([x, trayY + .026, trayZ], .016, .016, .036, m, 24);
                cap.rotation.z = Math.PI / 2;
            }
            box([trayX + .204, trayY + .042, trayZ], [.198, .062, .073], 'schedule-rubber', .016);
            box([trayX + .204, trayY + .011, trayZ], [.18, .009, .064], 'schedule-ink', .003);
            part('schedule-side-table');
            const tx = plan.tableCenterX, ty = plan.tableTopY, tz = plan.tableZ, [tw, th, td] = plan.tableSize;
            box([tx, ty, tz], [tw, th, td], 'schedule-ivory', .026);
            for (const x of [tx - tw * .36, tx + tw * .36])
                for (const z of [tz - td * .36, tz + td * .36]) {
                    const h = ty - th / 2 - pf + .010;
                    cyl([x, pf + h / 2, z], .022, .021, h, 'schedule-ivory', 24);
                }
            for (const z of [tz - td * .36, tz + td * .36])
                box([tx, ty - th / 2 - .043, z], [tw * .78, .073, .026], 'schedule-ivory', .007);
            for (const x of [tx - tw * .36, tx + tw * .36])
                box([x, ty - th / 2 - .043, tz], [.026, .073, td * .78], 'schedule-ivory', .007);
            // Closed notebook: two independent covers, inset page block and a small spine.
            const nx = tx - .056, nz = tz + .087, nb = ty + th / 2 + .002;
            box([nx, nb + .007, nz], [.269, .014, .185], 'schedule-green', .006);
            box([nx, nb + .026, nz], [.252, .025, .169], 'schedule-face', .004);
            box([nx, nb + .047, nz], [.270, .017, .186], 'schedule-green', .007);
            box([nx - .128, nb + .027, nz], [.013, .045, .174], 'schedule-green', .003);
            for (const y of [nb + .021, nb + .030])
                box([nx + .004, y, nz + .085], [.244, .0015, .001], 'schedule-grid', .0002);
            // Hollow ceramic holder: bottom thickness, outer shell, open rim and inner wall.
            const hr = .058, hh = .148, hx = tx + .093, hz = tz - .118, hy = ty + th / 2 + .002 + hh / 2;
            const hp = [[0, -hh / 2], [hr - .009, -hh / 2], [hr, -hh / 2 + .009], [hr, hh / 2 - .006], [hr - .004, hh / 2], [hr - .013, hh / 2], [hr - .016, hh / 2 - .008], [hr - .016, -hh / 2 + .014], [0, -hh / 2 + .014], [0, -hh / 2]].map(p => new THREE.Vector2(p[0], p[1]));
            mesh(new THREE.LatheGeometry(hp, 48), 'schedule-ivory', [hx, hy, hz]);
            for (const [dx, dz, lean, m] of [[-.017, -.010, -.045, 'schedule-blue'], [.018, .008, .043, 'schedule-coral']]) {
                const a = [hx + dx, hy - hh / 2 + .027, hz + dz], b = [hx + dx + lean, hy + hh / 2 + .077, hz + dz - .012];
                rod(a, b, .012, m);
                sph(b, [.012, .012, .012], m);
                const v = new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), .88);
                sph(v.toArray(), [.013, .014, .013], m);
            }
        }
        // CONTACT — final reference: satin terracotta rotary phone, tripod table and thin ivory cutout.
        {
            const contact = spec.design.contact;
            const contactMat = (id, base, color, roughness) => { const m = mats[base].clone(); m.color.set(color); m.roughness = roughness; m.metalness = 0; m.map = null; m.bumpMap = null; m.roughnessMap = null; if (m instanceof THREE.MeshPhysicalMaterial) {
                m.clearcoat = .07;
                m.clearcoatRoughness = .65;
            } mats[id] = m; return m; };
            contactMat('contact-terracotta', 'phone', contact.phoneColor, .48);
            contactMat('contact-dial', 'ivory', contact.dialColor, .57);
            contactMat('contact-wood', 'wood', contact.tableColor, .52);
            contactMat('contact-ivory', 'ivory', '#fff3e7', .62);
            contactMat('contact-recess', 'phone', '#945540', .75);
            const ground = contact.groundY + .002;
            const roomMat = contactMat('contact-lavender', 'lavender', contact.roomColor, .65);
            nodes['room-contact'].traverse(o => { if (o.isMesh)
                o.material = roomMat; });
            if (spec.__contactAsset) {
                const source = spec.__contactAsset, asset = contact.externalAsset;
                source.updateMatrixWorld(true);
                const ids = { cutout: 'contact-cutout', table: 'contact-table', phone: 'contact-phone', cord: 'phone-cord' };
                const evidence = { path: asset.path, sourceSHA256: asset.sourceSHA256, uniformScale: asset.uniformScale, sourceFloorY: asset.sourceFloorY, anchor: asset.anchor, method: 'User-supplied merged GLB; spatially labelled source geometry, soft house materials, uniform placement; approved thin silhouette with uniform clean white face and edge; accepted phone and furniture retained', parts: {} };
                for (const [region, id] of Object.entries(ids)) {
                    part(id);
                    let serial = 0;
                    source.traverse(o => {
                        if (!o.isMesh || !o.name.startsWith('contact-source-' + region + '-'))
                            return;
                        const src = o, g = src.geometry.clone();
                        g.applyMatrix4(src.matrixWorld);
                        g.scale(asset.uniformScale, asset.uniformScale, asset.uniformScale);
                        const sourceMat = src.material, material = new THREE.MeshPhysicalMaterial({ color: sourceMat.color, roughness: sourceMat.roughness, metalness: 0, clearcoat: .025, clearcoatRoughness: .70, envMapIntensity: .35 });
                        material.name = sourceMat.name;
                        if (src.name.startsWith('contact-source-cutout-paper-')) {
                            const board = contact.repairs.paperboard;
                            material.color.set(board.faceColor);
                            material.roughness = board.faceRoughness;
                            material.clearcoat = 0;
                            material.envMapIntensity = .10;
                            material.map = null;
                            material.bumpMap = null;
                        }
                        const obj = mesh(g, material, [asset.anchor[0], ground - asset.sourceFloorY * asset.uniformScale, asset.anchor[2]]);
                        obj.name = id + '-source-' + serial++;
                        obj.userData.sourceAsset = asset.path;
                        // Prevent merged scan layers from casting jagged self-shadow bands across the smooth casing. Ground shadows and ambient occlusion stay active.
                        if ((src.name === 'contact-source-phone-4' && contact.repairs?.sourcePhoneSelfShadow === false) || src.name.startsWith('contact-source-cutout-paper-'))
                            obj.receiveShadow = false;
                    });
                    evidence.parts[id] = { sourceRegion: region, meshes: serial };
                }
                root.userData.contactAssetEvidence = evidence;
            }
            else {
                // One manufactured silhouette with a circular head, continuous arms and crossed legs.
                part('contact-cutout');
                const sh = new THREE.Shape();
                sh.moveTo(-.045, 1.72);
                sh.lineTo(-.045, 1.755);
                sh.absarc(.025, 1.962, .22, -Math.PI / 2 - .33, -Math.PI / 2 + .33, true);
                sh.lineTo(.096, 1.72);
                sh.bezierCurveTo(.30, 1.69, .39, 1.66, .425, 1.52);
                sh.lineTo(.665, 1.055);
                sh.quadraticCurveTo(.698, .977, .612, .977);
                sh.quadraticCurveTo(.541, .977, .517, 1.035);
                sh.lineTo(.331, 1.375);
                sh.lineTo(.246, .585);
                sh.quadraticCurveTo(.235, .47, .13, .37);
                sh.lineTo(-.042, .195);
                sh.lineTo(-.003, .037);
                sh.quadraticCurveTo(.014, 0, -.062, 0);
                sh.quadraticCurveTo(-.12, 0, -.147, .042);
                sh.lineTo(-.236, .238);
                sh.lineTo(-.302, .047);
                sh.quadraticCurveTo(-.32, 0, -.385, 0);
                sh.quadraticCurveTo(-.448, 0, -.445, .062);
                sh.lineTo(-.425, .27);
                sh.quadraticCurveTo(-.424, .32, -.375, .367);
                sh.lineTo(-.191, .616);
                sh.lineTo(-.202, 1.301);
                sh.lineTo(-.354, 1.057);
                sh.lineTo(-.259, .884);
                sh.quadraticCurveTo(-.219, .8, -.295, .791);
                sh.quadraticCurveTo(-.326, .792, -.365, .846);
                sh.lineTo(-.506, 1.066);
                sh.quadraticCurveTo(-.557, 1.167, -.486, 1.292);
                sh.lineTo(-.304, 1.584);
                sh.quadraticCurveTo(-.246, 1.703, -.045, 1.72);
                sh.closePath();
                // Narrow negative space at the crossed legs; a through opening, not a dark decal.
                const gap = new THREE.Path();
                gap.moveTo(-.166, .57);
                gap.lineTo(-.162, .385);
                gap.lineTo(-.092, .476);
                gap.lineTo(-.12, .694);
                gap.closePath();
                sh.holes.push(gap);
                const cut = extrude(sh, .066, [contact.cutoutOrigin[0], ground + .0107, contact.cutoutOrigin[2]], 'contact-ivory', .012);
                cut.scale.set(.88, .89, 1);
                // Rounded lathed rim; three symmetric legs with back leg centered behind the phone.
                part('contact-table');
                const [tx, ty, tz] = contact.tableCenter, Rt = contact.tableRadius, half = contact.tableThickness / 2;
                const rim = new THREE.LatheGeometry([new THREE.Vector2(0, -half), new THREE.Vector2(Rt - .018, -half), new THREE.Vector2(Rt - .005, -half + .006), new THREE.Vector2(Rt, -half + .018), new THREE.Vector2(Rt, half - .018), new THREE.Vector2(Rt - .005, half - .006), new THREE.Vector2(Rt - .018, half), new THREE.Vector2(0, half)], 96);
                mesh(rim, 'contact-wood', [tx, ty, tz]);
                for (let i = 0; i < 3; i++) {
                    const a = Math.PI / 6 + i * Math.PI * 2 / 3;
                    const bottom = new THREE.Vector3(tx + Math.cos(a) * .575, ground + .006, tz + Math.sin(a) * .575), top = new THREE.Vector3(tx + Math.cos(a) * .445, ty - half + .018, tz + Math.sin(a) * .445), axis = top.clone().sub(bottom), length = axis.length();
                    const profile = [new THREE.Vector2(0, -length / 2), new THREE.Vector2(.030, -length / 2), new THREE.Vector2(.041, -length / 2 + .01), new THREE.Vector2(.044, -length / 2 + .025), new THREE.Vector2(.053, length / 2 - .02), new THREE.Vector2(.051, length / 2), new THREE.Vector2(0, length / 2)];
                    const leg = mesh(new THREE.LatheGeometry(profile, 28), 'contact-wood', bottom.clone().add(top).multiplyScalar(.5).toArray());
                    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
                    leg.updateMatrixWorld(true);
                    leg.position.y += ground - new THREE.Box3().setFromObject(leg, true).min.y;
                }
                // Contact phone shell: front is +Z, high rear behind receiver. No box surrogate.
                part('contact-phone');
                const [px, py, pz] = contact.phoneCenter;
                const body = poly([[-.235, .034], [.235, .034], [.218, .333], [-.212, .108]], contact.bodyWidth, [px, py, pz], 'contact-terracotta', .027);
                body.rotation.y = Math.PI / 2;
                const bp = body.geometry.getAttribute('position');
                for (let i = 0; i < bp.count; i++)
                    bp.setZ(i, bp.getZ(i) * (1 - .13 * Math.max(0, bp.getY(i)) / .292));
                bp.needsUpdate = true;
                body.geometry.computeVertexNormals();
                for (const x of [-.205, .205])
                    box([px + x, ty + half + .013, pz + .135], [.089, .030, .07], 'contact-terracotta', .012);
                // Cradle tips overlap both shell and receiver's underside.
                for (const x of [-.147, .147])
                    box([px + x, py + .344, pz - .125], [.054, .178, .053], 'contact-terracotta', .012);
                // Swept elliptical receiver, with fuller earpiece bells continuous with the central arch.
                const receiverPath = new THREE.CatmullRomCurve3([[-.376, .34], [-.338, .396], [-.21, .449], [0, .465], [.21, .449], [.338, .396], [.376, .34]].map(q => new THREE.Vector3(px + q[0], py + q[1], pz - .15)));
                const rs = 96, radial = 24, pos = [], normal = [], uv = [], ix = [], frames = receiverPath.computeFrenetFrames(rs, false);
                for (let i = 0; i <= rs; i++) {
                    const t = i / rs, c = receiverPath.getPointAt(t), end = Math.pow(Math.abs(2 * t - 1), 3), ry = .050 + .038 * end, rz = .070 + .038 * end;
                    for (let j = 0; j <= radial; j++) {
                        const a = j / radial * Math.PI * 2, n = frames.normals[i].clone().multiplyScalar(Math.cos(a)), bn = frames.binormals[i].clone().multiplyScalar(Math.sin(a));
                        pos.push(...c.clone().addScaledVector(n, ry).addScaledVector(bn, rz).toArray());
                        normal.push(...n.clone().divideScalar(ry).add(bn.clone().divideScalar(rz)).normalize().toArray());
                        uv.push(t, j / radial);
                        if (i < rs && j < radial) {
                            const k = i * (radial + 1) + j;
                            ix.push(k, k + 1, k + radial + 1, k + 1, k + radial + 2, k + radial + 1);
                        }
                    }
                }
                for (const end of [0, rs]) {
                    const c = receiverPath.getPointAt(end / rs), ci = pos.length / 3, n = receiverPath.getTangentAt(end / rs).multiplyScalar(end ? 1 : -1);
                    pos.push(...c.toArray());
                    normal.push(...n.toArray());
                    uv.push(.5, .5);
                    for (let j = 0; j < radial; j++) {
                        const a = end * (radial + 1) + j, b = a + 1;
                        ix.push(ci, ...(end ? [a, b] : [b, a]));
                    }
                }
                const receiver = new THREE.BufferGeometry();
                receiver.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
                receiver.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
                receiver.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
                receiver.setIndex(ix);
                receiver.computeVertexNormals();
                mesh(receiver, 'contact-terracotta', [0, 0, 0]);
                for (const end of [0, rs]) {
                    const t = end / rs, c = receiverPath.getPointAt(t), ry = .088, rz = .108, g = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
                    g.scale(ry, .039, rz);
                    const cap = mesh(g, 'contact-terracotta', c.toArray());
                    cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), receiverPath.getTangentAt(t).multiplyScalar(end ? 1 : -1));
                }
                // Perforated cream dial, holes terminate on shallow terracotta recesses beneath.
                const dialShape = new THREE.Shape();
                dialShape.absarc(0, 0, contact.dialRadius, 0, Math.PI * 2, false);
                for (let i = 0; i < 10; i++) {
                    const a = .15 + i * Math.PI * 2 / 10, hole = new THREE.Path();
                    hole.absarc(Math.sin(a) * .106, Math.cos(a) * .106, contact.dialHoleRadius, 0, Math.PI * 2, true);
                    dialShape.holes.push(hole);
                }
                const dialAngle = -Math.PI / 2 + .47, dialCenter = new THREE.Vector3(px, py + .236, pz + .04), dialRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dialAngle);
                function dialPlace(o, local) { o.position.fromArray(local).applyQuaternion(dialRot).add(dialCenter); o.quaternion.premultiply(dialRot); return o; }
                const dial = extrude(dialShape, .020, [0, 0, 0], 'contact-dial', .0025);
                dialPlace(dial, [0, 0, 0]);
                const backing = cyl([0, 0, 0], .135, .135, .008, 'contact-recess', 64);
                backing.rotation.x = Math.PI / 2;
                dialPlace(backing, [0, 0, -.013]);
                const center = cyl([0, 0, 0], .066, .066, .01, 'contact-terracotta', 64);
                center.rotation.x = Math.PI / 2;
                dialPlace(center, [0, 0, .017]);
                const stop = box([0, 0, 0], [.045, .013, .016], 'contact-dial', .004);
                stop.rotation.z = -.65;
                dialPlace(stop, [.106, -.084, .018]);
                // A short cable with readable spacing and smooth leads at both attachment points.
                part('phone-cord');
                const path = new THREE.CatmullRomCurve3([[px - .412, py + .351, pz - .115], [px - .51, py + .20, pz + .10], [px - .52, ty + half + .038, pz + .16], [px - .36, ty + half + .029, pz + .17], [px - .278, py + .079, pz + .14]].map(q => new THREE.Vector3(...q)));
                const steps = 520, cf = path.computeFrenetFrames(steps, false), cord = [];
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps, theta = 2 * Math.PI * contact.cordTurns * t, fade = Math.min(1, t / .035, (1 - t) / .035), c = path.getPointAt(t);
                    c.addScaledVector(cf.normals[i], Math.cos(theta) * contact.cordCoilRadius * fade).addScaledVector(cf.binormals[i], Math.sin(theta) * contact.cordCoilRadius * fade);
                    cord.push(c.toArray());
                }
                tube(cord, contact.cordTubeRadius, 'contact-terracotta', false, steps);
                for (const id of ['contact-phone', 'phone-cord']) {
                    nodes[id].scale.x = contact.phoneLateralScale;
                    nodes[id].position.x = px * (1 - contact.phoneLateralScale);
                }
            }
        }
        part('portfolio-title');
        if (spec.__font) {
            for (const [text, y, size] of [['My', 6.34, .38], ['Portfolio', body.titlePortfolioY ?? 5.67, .43]]) {
                const g = new TextGeometry(text, { font: spec.__font, size, depth: .10, curveSegments: 12, bevelEnabled: true, bevelSize: .0035, bevelThickness: .005, bevelSegments: 2 });
                g.computeBoundingBox();
                g.translate(-(g.boundingBox.max.x + g.boundingBox.min.x) / 2, 0, 0);
                mesh(g, 'cinnamon', [0, y, 2.101]);
            }
        }
        part('roof-ridge');
        for (const side of [-1, 1])
            roofBeam([side * valleyX(R), R + .012, 0], [side * ridgeWidth, R + .012, 0], .13, .12);
        roofBeam([0, C + .015, -2.13], [0, C + .015, 2.13], .145, .14);
    }
    if (stageAt('form-refinement')) {
        // Flat diagrams are authored as actual face geometry, with no photographed scene planes.
        current = nodes['schedule-board'];
        const schedule = spec.design.schedule, faceZ = schedule.chartFaceZ;
        function chartMark(x, y, w, h, m, r = .012) { const sh = new THREE.Shape(); sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); sh.closePath(); const o = extrude(sh, .001, [x, y, faceZ + .0007], m, 0); o.castShadow = false; return o; }
        for (let j = 0; j <= 5; j++) {
            const o = box([1.95, 1.108 + j * .2024, faceZ], [1.98, .0035, .0008], 'schedule-grid', .0001);
            o.castShadow = false;
        }
        for (let j = 0; j <= 6; j++) {
            const x = 1.28 + j * .2767;
            if (j === 0) {
                const o = box([x, 1.697, faceZ], [.0035, 1.178, .0008], 'schedule-grid', .0001);
                o.castShadow = false;
            }
            else
                for (let y = 1.115; y < 2.28; y += .041) {
                    const o = box([x, y + .013, faceZ], [.003, .027, .0008], 'schedule-grid', .0001);
                    o.castShadow = false;
                }
        }
        for (let j = 0; j < 6; j++)
            chartMark(1.418 + j * .2767, 2.216, .158, .028, 'schedule-ink', .013);
        for (let j = 0; j < 5; j++)
            chartMark(1.085, 1.217 + j * .2024, .205, .029, 'schedule-ink', .014);
        for (const [x, y, w, m] of schedule.bars)
            chartMark(x, y, w, .085, 'schedule-' + m, .014);
        for (const [x, y, m] of schedule.milestones) {
            const o = box([x, y, faceZ + .001], [.060, .060, .001], 'schedule-' + m, .0002);
            o.rotation.z = Math.PI / 4;
            o.castShadow = false;
        }
        // Memory-board photos are owned by populateCafeMemoryBoard; no legacy overlays.
    }
    if (['surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass'].includes(pass)) {
        // Actual shallow, beveled courses replace the previous wire-like seam rods.
        const count = body.courseCount;
        current = nodes['house-main-roof'];
        for (const sign of [-1, 1])
            for (let j = 0; j < count; j++) {
                const za = j * roofDepth / count + .006, zb = (j + 1) * roofDepth / count - .006, ya = mainY(za) + .026, yb = mainY(zb) + .026;
                for (const side of [-1, 1])
                    roofPanel([[side * wingAtY(mainY(za)), ya, sign * za], [side * valleyX(mainY(za)), ya, sign * za], [side * valleyX(mainY(zb)), yb, sign * zb], [side * wingAtY(mainY(zb)), yb, sign * zb]], .036, .006);
            }
        current = nodes['house-cross-roof'];
        for (const side of [-1, 1])
            for (const sign of [-1, 1])
                for (let j = 0; j < count; j++) {
                    const xa = j * crossWidth / count + .006, xb = (j + 1) * crossWidth / count - .006, ya = C - (C - E) * xa / crossWidth, yb = C - (C - E) * xb / crossWidth, za = Math.max(0, (R - ya) / (R - E) * roofDepth), zb = Math.max(0, (R - yb) / (R - E) * roofDepth);
                    roofPanel([[side * xa, ya + .024, sign * roofDepth], [side * xb, yb + .024, sign * roofDepth], [side * xb, yb + .024, sign * zb], [side * xa, ya + .024, sign * za]], .034, .006);
                }
    }
    // Preserve prop shapes and relative positions as the upper floor moves.
    for (const [id, n] of Object.entries(nodes))
        if (/^(music-|about-|cafe-)/.test(id) || id === 'drum-hardware')
            n.position.y += id === 'music-lamp' ? .08 : body.upperFloorOffset;
    // Ground the complete leaning guitar/stand using its actual transformed bounds.
    if (nodes['music-guitar']) {
        root.updateMatrixWorld(true);
        const guitarBounds = new THREE.Box3().setFromObject(nodes['music-guitar'], true), room = spec.design.rooms.find((r) => r.id === 'music');
        const floorTop = room.floorY + .02 + .035 / 2;
        nodes['music-guitar'].position.y += floorTop + spec.design.music.guitarGroundGap - guitarBounds.min.y;
        root.updateMatrixWorld(true);
    }
    const anchors = { 'about-portrait': 'room-about', 'music-lamp': 'room-music', 'cafe-corkboard': 'room-cafe', 'cafe-window': 'room-cafe', 'contact-phone': 'contact-table', 'phone-cord': 'contact-phone', 'portfolio-title': 'house-central-gable' };
    if (stageAt('interaction-pass')) {
        // Give each component a real pivot while preserving all world geometry.
        root.updateMatrixWorld(true);
        for (const [id, n] of Object.entries(nodes)) {
            const bounds = new THREE.Box3().setFromObject(n), world = bounds.getCenter(new THREE.Vector3());
            if (['monitor-chair', 'sculpture-pedestal', 'schedule-board', 'contact-cutout', 'about-lamp'].includes(id))
                world.y = bounds.min.y;
            const local = n.worldToLocal(world.clone());
            for (const child of n.children)
                child.position.sub(local);
            n.position.add(local.clone().multiply(n.scale).applyQuaternion(n.quaternion));
            n.updateMatrixWorld(true);
        }
        for (const [id, parent] of Object.entries(anchors))
            nodes[parent].attach(nodes[id]);
        root.updateMatrixWorld(true);
    }
    if (stageAt('optimization-pass')) {
        root.updateMatrixWorld(true);
        for (const [id, n] of Object.entries(nodes)) {
            const buckets = new Map();
            n.traverse(o => { if (o.isMesh && o.userData.componentId === id) {
                const m = o, key = m.geometry.uuid + ':' + m.material.uuid;
                if (!buckets.has(key))
                    buckets.set(key, []);
                buckets.get(key).push(m);
            } });
            for (const group of buckets.values()) {
                if (group.length < 3)
                    continue;
                const first = group[0], inst = new THREE.InstancedMesh(first.geometry, first.material, group.length), inverse = n.matrixWorld.clone().invert();
                for (let j = 0; j < group.length; j++)
                    inst.setMatrixAt(j, inverse.clone().multiply(group[j].matrixWorld));
                inst.instanceMatrix.needsUpdate = true;
                inst.name = id + '-batch-' + (++serial);
                inst.userData = { componentId: id, explodeWithParent: true };
                inst.castShadow = true;
                inst.receiveShadow = true;
                inst.computeBoundingBox();
                inst.computeBoundingSphere();
                for (const m of group)
                    m.removeFromParent();
                n.add(inst);
            }
        }
        root.updateMatrixWorld(true);
    }
    const original = Object.fromEntries(Object.entries(nodes).map(([id, n]) => [id, { local: n.position.clone(), world: n.getWorldPosition(new THREE.Vector3()) }]));
    const center = new THREE.Vector3(0, 3.8, 0);
    const depth = (n) => { let d = 0; while (n.parent) {
        d++;
        n = n.parent;
    } return d; };
    const ordered = Object.entries(nodes).sort((a, b) => depth(a[1]) - depth(b[1]));
    const setExplode = (amount) => { for (const [id, n] of ordered) {
        const pos = original[id];
        if (amount === 0)
            n.position.copy(pos.local);
        else {
            const desired = pos.world.clone().add(pos.world.clone().sub(center).multiplyScalar(amount));
            n.position.copy(n.parent.worldToLocal(desired));
        }
        n.updateMatrixWorld(true);
    } root.updateMatrixWorld(true); };
    const pickPart = (raycaster) => { const h = raycaster.intersectObject(root, true).find(h => h.object.userData.componentId); return h ? nodes[h.object.userData.componentId] : null; };
    const sockets = {}, colliders = {};
    for (const [id, n] of Object.entries(nodes)) {
        const socket = new THREE.Object3D();
        socket.name = id + '-anchor';
        n.add(socket);
        sockets[socket.name] = socket;
        const bounds = new THREE.Box3();
        n.traverse(o => { if (o.isMesh && o.userData.componentId === id) {
            const b = new THREE.Box3().setFromObject(o);
            for (const x of [b.min.x, b.max.x])
                for (const y of [b.min.y, b.max.y])
                    for (const z of [b.min.z, b.max.z])
                        bounds.expandByPoint(n.worldToLocal(new THREE.Vector3(x, y, z)));
        } });
        colliders[id] = { shape: 'box', space: 'component-local', min: bounds.min.toArray(), max: bounds.max.toArray(), trigger: false };
    }
    root.userData.sculptRuntime = { nodes, pivots: nodes, sockets, colliders, anchors, destructionGroups: { architecture: Object.keys(nodes).filter(id => id.startsWith('house') || id.startsWith('dormer')), rooms: Object.keys(nodes).filter(id => id.startsWith('room')), furniture: Object.keys(nodes).filter(id => !id.startsWith('house') && !id.startsWith('dormer') && !id.startsWith('room')) }, setExplode, pickPart, pass };
    return root;
}
