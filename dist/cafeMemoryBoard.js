import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
/** Small physical keepsakes on the existing corkboard; the board stays one portal. */
export function populateCafeMemoryBoard(parent, center, photos) {
    const root = new THREE.Group();
    root.name = 'cafe-memory-collection';
    root.position.fromArray(center);
    parent.add(root);
    const paper = new THREE.MeshStandardMaterial({ color: '#fff6e8', roughness: .91 });
    paper.name = 'cafe-paper';
    const metal = new THREE.MeshStandardMaterial({ color: '#a9a39a', metalness: .74, roughness: .32 });
    metal.name = 'cafe-memory-metal';
    const ink = '#393d34';
    let serial = 0;
    function add(group, geometry, material, position, name) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.fromArray(position);
        mesh.name = 'cafe-memory-' + name + '-' + (++serial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { componentId: 'cafe-corkboard', explodeWithParent: true };
        group.add(mesh);
        return mesh;
    }
    function mat(color) { const m = new THREE.MeshStandardMaterial({ color, roughness: .79 }); m.name = 'cafe-memory-paper'; return m; }
    function canvasTexture(width, height, draw) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        draw(canvas.getContext('2d'));
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        return texture;
    }
    function overlay(group, width, height, texture, position, name) {
        const m = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
        m.name = 'cafe-memory-ink';
        const face = add(group, new THREE.PlaneGeometry(width, height), m, position, name);
        face.castShadow = false;
        return face;
    }
    function pen(c, points, width = 3, color = ink) {
        c.strokeStyle = color;
        c.lineWidth = width;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.beginPath();
        points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
        c.stroke();
    }
    function handwriting(c, text, x, y, size, color = ink) {
        c.font = `600 ${size}px 'Chalkboard SE','Bradley Hand',cursive`;
        c.fillStyle = color;
        let cursor = x;
        [...text].forEach((letter, i) => { c.save(); c.translate(cursor, y + Math.sin(i * 1.8) * 1.7); c.rotate(Math.sin(i * 2.2) * .035); c.fillText(letter, 0, 0); c.restore(); cursor += c.measureText(letter).width + size * .015; });
    }
    function pin(group, x, y, color) {
        const m = mat(color), stem = add(group, new THREE.CylinderGeometry(.004, .004, .019, 12), metal, [x, y, .015], 'pin-stem');
        stem.rotation.x = Math.PI / 2;
        add(group, new THREE.SphereGeometry(1, 20, 12), m, [x, y, .025], 'pin-head').scale.set(.017, .017, .011);
    }
    function tape(group, x, y, angle, color) {
        const strip = new THREE.Group();
        strip.position.set(x, y, .017);
        strip.rotation.z = angle;
        group.add(strip);
        const w = .145, h = .048, shape = new THREE.Shape();
        shape.moveTo(-w / 2, -h / 2);
        for (let i = 0; i <= 6; i++)
            shape.lineTo(-w / 2 + (i % 2 ? .009 : 0), -h / 2 + h * i / 6);
        shape.lineTo(w / 2, h / 2);
        for (let i = 0; i <= 6; i++)
            shape.lineTo(w / 2 - (i % 2 ? .009 : 0), h / 2 - h * i / 6);
        shape.closePath();
        const m = mat(color);
        m.transparent = true;
        m.opacity = .88;
        add(strip, new THREE.ExtrudeGeometry(shape, { depth: .002, bevelEnabled: false, steps: 1 }), m, [0, 0, 0], 'washi-tape');
    }
    // Three original photographs, kept close to the original small-print scale.
    const definitions = [
        ['studio', -.80, .365, .30, -.14, 'pin'],
        ['bamboo', .85, .47, .285, .08, 'clip'],
        ['neighbors', -.20, -.045, .31, 0, 'tape']
    ];
    for (const [key, x, y, iw, angle, fixing] of definitions) {
        const texture = photos[key];
        if (!texture)
            continue;
        const image = texture.image, ih = iw * image.height / image.width;
        const group = new THREE.Group();
        group.name = 'cafe-polaroid-' + key;
        group.position.set(x, y, .012);
        group.rotation.z = angle;
        root.add(group);
        const w = iw + .055, h = ih + .125;
        add(group, new RoundedBoxGeometry(w, h, .008, 2, .0017), paper, [0, 0, 0], 'polaroid-paper');
        const photoMat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
        photoMat.name = 'cafe-photo-' + key;
        add(group, new THREE.PlaneGeometry(iw, ih), photoMat, [0, .035, .0048], 'photo-' + key).castShadow = false;
        if (fixing === 'pin')
            pin(group, -.015, h / 2 - .014, '#c48c65');
        if (fixing === 'tape')
            tape(group, -w * .15, h / 2 - .014, .20, '#cfb58e');
        if (fixing === 'clip') {
            const curve = new THREE.CatmullRomCurve3([[-.014, .061], [-.022, .084], [-.007, .098], [.010, .091], [.015, .065], [.013, -.022], [-.002, -.038], [-.018, -.022], [-.018, .040], [-.008, .053], [.003, .043], [.003, -.013]].map(([px, py]) => new THREE.Vector3(px, py, .014)));
            add(group, new THREE.TubeGeometry(curve, 64, .0028, 8, false), metal, [-w / 2 + .020, h / 2 - .050, 0], 'paperclip').scale.setScalar(.70);
        }
        group.userData = { source: key, cropAspect: iw / ih, outerSize: [w, h] };
    }
    function note(kind, x, y, w, h, angle, color) {
        const group = new THREE.Group();
        group.name = 'cafe-handwritten-' + kind;
        group.position.set(x, y, .009);
        group.rotation.z = angle;
        root.add(group);
        // A gentle lifted lower edge gives the small sheets a paper silhouette.
        const geometry = new THREE.PlaneGeometry(w, h, 8, 12), p = geometry.getAttribute('position');
        for (let i = 0; i < p.count; i++) {
            const t = .5 - p.getY(i) / h;
            p.setZ(i, .004 + .009 * t * t * (.35 + .65 * Math.pow(p.getX(i) / w * 2, 2)));
        }
        geometry.computeVertexNormals();
        const m = mat(color);
        m.side = THREE.DoubleSide;
        add(group, geometry, m, [0, 0, 0], 'sticky-paper');
        const tx = canvasTexture(600, 600, c => {
            c.strokeStyle = ink;
            c.fillStyle = ink;
            c.lineWidth = 7;
            c.lineCap = 'round';
            c.lineJoin = 'round';
            const line = (text, y, size) => {
                c.font = `600 ${size}px 'Chalkboard SE','Bradley Hand',cursive`;
                handwriting(c, text, (600 - c.measureText(text).width - size * .015 * (text.length - 1)) / 2, y, size);
            };
            const stroke = (draw, width = 7) => { c.strokeStyle = ink; c.lineWidth = width; c.beginPath(); draw(); c.stroke(); };
            if (kind === 'bulb') {
                // Reference: the large hand-drawn lightbulb on the green square.
                stroke(() => { c.moveTo(257, 370); c.bezierCurveTo(247, 329, 191, 303, 196, 239); c.bezierCurveTo(196, 115, 389, 107, 400, 235); c.bezierCurveTo(409, 293, 353, 324, 348, 370); c.closePath(); }, 9);
                stroke(() => { c.moveTo(271, 369); c.lineTo(263, 290); c.bezierCurveTo(239, 260, 256, 241, 269, 263); c.bezierCurveTo(275, 231, 295, 239, 289, 263); c.bezierCurveTo(300, 227, 321, 239, 311, 263); c.bezierCurveTo(335, 230, 353, 255, 335, 277); c.lineTo(324, 368); }, 8);
                for (let i = 0; i < 4; i++)
                    pen(c, [[258 + i * 3, 389 + i * 18], [350 - i * 3, 378 + i * 18]], 8);
                stroke(() => { c.moveTo(272, 448); c.quadraticCurveTo(309, 480, 335, 439); }, 8);
                for (const [x, y, xx, yy] of [[142, 237, 103, 225], [174, 143, 144, 110], [251, 105, 244, 59], [339, 105, 358, 62], [413, 149, 447, 120], [446, 234, 489, 230]])
                    pen(c, [[x, y], [xx, yy]], 7);
            }
            else if (kind === 'products') {
                // Scalloped hand-drawn cloud, with the reference wording intact.
                stroke(() => { c.moveTo(99, 157); c.bezierCurveTo(56, 129, 89, 79, 137, 103); c.bezierCurveTo(149, 53, 201, 65, 222, 94); c.bezierCurveTo(259, 47, 308, 72, 321, 94); c.bezierCurveTo(365, 54, 410, 81, 415, 110); c.bezierCurveTo(477, 85, 507, 123, 485, 165); c.bezierCurveTo(548, 176, 552, 230, 518, 252); c.bezierCurveTo(556, 302, 528, 339, 501, 346); c.bezierCurveTo(542, 399, 497, 444, 450, 424); c.bezierCurveTo(424, 477, 371, 465, 351, 444); c.bezierCurveTo(309, 493, 264, 472, 246, 446); c.bezierCurveTo(202, 482, 157, 460, 154, 432); c.bezierCurveTo(100, 454, 73, 413, 96, 376); c.bezierCurveTo(51, 352, 60, 302, 93, 290); c.bezierCurveTo(48, 254, 59, 207, 97, 202); c.bezierCurveTo(71, 186, 79, 165, 99, 157); }, 6);
                line('PRODUCTS', 224, 55);
                line('&', 300, 62);
                line('SERVICE', 382, 57);
            }
            else if (kind === 'thinking') {
                // Reference: thinking person, pencil and a little checklist.
                c.fillStyle = ink;
                c.beginPath();
                c.moveTo(70, 276);
                c.bezierCurveTo(30, 137, 117, 83, 221, 134);
                c.bezierCurveTo(274, 151, 289, 216, 260, 260);
                c.lineTo(240, 217);
                c.quadraticCurveTo(200, 250, 157, 193);
                c.quadraticCurveTo(146, 239, 121, 242);
                c.lineTo(108, 294);
                c.closePath();
                c.fill();
                stroke(() => { c.moveTo(123, 220); c.bezierCurveTo(108, 256, 114, 315, 167, 331); c.quadraticCurveTo(210, 350, 243, 305); c.lineTo(260, 281); c.quadraticCurveTo(274, 267, 252, 257); c.lineTo(244, 218); }, 8);
                c.beginPath();
                c.arc(210, 254, 6, 0, Math.PI * 2);
                c.fill();
                stroke(() => { c.moveTo(213, 291); c.quadraticCurveTo(229, 300, 239, 286); }, 5);
                stroke(() => { c.moveTo(127, 343); c.lineTo(72, 380); c.lineTo(62, 514); c.lineTo(301, 514); c.lineTo(258, 397); c.lineTo(208, 359); }, 8);
                stroke(() => { c.moveTo(155, 497); c.lineTo(179, 405); c.lineTo(164, 368); c.lineTo(173, 327); c.quadraticCurveTo(181, 305, 189, 328); c.lineTo(195, 352); c.lineTo(205, 325); c.quadraticCurveTo(213, 310, 218, 327); c.lineTo(218, 370); c.lineTo(211, 397); c.lineTo(246, 474); }, 7);
                stroke(() => { c.moveTo(302, 180); c.lineTo(313, 137); c.lineTo(327, 139); c.lineTo(318, 185); c.lineTo(308, 198); c.closePath(); }, 5);
                pen(c, [[362, 157], [493, 168], [481, 359], [342, 341], [362, 157]], 7);
                for (let i = 0; i < 4; i++)
                    pen(c, [[371 - i * 3, 202 + i * 35], [465 - i * 3, 210 + i * 35]], 5);
                pen(c, [[401, 157], [403, 138], [464, 143], [465, 165]], 6);
            }
            else if (kind === 'startup') {
                for (let y = 78; y < 570; y += 55)
                    pen(c, [[24, y], [579, y - 3]], 2, '#8faab5');
                handwriting(c, 'START', 60, 253, 115);
                handwriting(c, 'UP', 91, 400, 119);
                c.save();
                c.translate(442, 345);
                c.rotate(.34);
                stroke(() => { c.moveTo(0, -153); c.bezierCurveTo(-43, -115, -39, -20, -29, 52); c.quadraticCurveTo(0, 65, 29, 52); c.bezierCurveTo(40, -20, 43, -115, 0, -153); c.closePath(); }, 7);
                stroke(() => { c.ellipse(0, -65, 17, 24, 0, 0, Math.PI * 2); }, 6);
                pen(c, [[-26, -20], [-62, 21], [-58, 69], [-27, 47]], 6);
                pen(c, [[26, -20], [62, 21], [58, 69], [27, 47]], 6);
                pen(c, [[-18, 69], [-25, 109], [-5, 90], [4, 122], [21, 71]], 6);
                c.restore();
            }
            else if (kind === 'plan') {
                for (let y = 80; y < 580; y += 62)
                    pen(c, [[20, y], [580, y - 3]], 2, '#b5b2b3');
                line('PLAN FOR', 146, 61);
                line('1 MONTH', 241, 66);
                pen(c, [[88, 266], [512, 265]], 5);
                for (let i = 0; i < 3; i++) {
                    const y = 337 + i * 71;
                    pen(c, [[70, y], [70, y + 28], [103, y + 28], [103, y], [70, y]], 4);
                    pen(c, [[73, y + 10], [85, y + 22], [114, y - 5]], 6);
                    pen(c, [[154, y + 15], [186, y + 8], [215, y + 20], [246, y + 8], [287, y + 14], [333, y + 11], [388, y + 15], [481, y + 9]], 5);
                }
            }
            else if (kind === 'marketing') {
                stroke(() => { c.ellipse(300, 151, 218, 72, -.10, 0, Math.PI * 2); }, 6);
                line('MARKETING', 175, 53);
                pen(c, [[115, 276], [113, 506], [145, 507]], 6);
                pen(c, [[114, 330], [151, 330]], 6);
                handwriting(c, 'WEBSITE', 169, 346, 57);
                handwriting(c, 'SOCIAL MEDIA', 163, 463, 43);
            }
        });
        overlay(group, w - .014, h - .014, tx, [0, 0, .017], 'handwriting');
        const pinColors = { bulb: '#b17e53', products: '#c4aa58', thinking: '#7e9faa', startup: '#ddd7c8', plan: '#789b89', marketing: '#b98b66' };
        pin(group, kind === 'thinking' ? -w * .24 : 0, h / 2 - .021, pinColors[kind]);
        group.userData = { reference: '留言板.jpg', artwork: kind };
    }
    // A staggered mix of six reference notes around a triangle of three small photos.
    note('bulb', -.28, .49, .32, .35, .10, '#9fbc9b');
    note('products', .32, .30, .36, .34, -.095, '#dfb8bd');
    note('thinking', -.855, -.16, .33, .37, .12, '#edcf81');
    note('startup', .28, -.425, .40, .36, .045, '#b7ced5');
    note('plan', -.42, -.50, .35, .34, -.12, '#c8bddc');
    note('marketing', .80, -.20, .37, .39, -.06, '#eddda5');
    // A miniature daisy fills the lower breathing space without adding another note.
    const daisy = new THREE.Group();
    daisy.name = 'cafe-daisy';
    daisy.position.set(.79, -.58, .018);
    daisy.rotation.z = .20;
    root.add(daisy);
    const ivory = mat('#fff2d7'), gold = mat('#d6ac5a');
    for (let i = 0; i < 9; i++) {
        const a = i * Math.PI * 2 / 9;
        const petal = add(daisy, new THREE.SphereGeometry(1, 16, 10), ivory, [Math.cos(a) * .035, Math.sin(a) * .035, .006], 'daisy-petal');
        petal.scale.set(.027, .012, .005);
        petal.rotation.z = a;
    }
    add(daisy, new THREE.SphereGeometry(1, 20, 12), gold, [0, 0, .013], 'daisy-center').scale.set(.019, .019, .008);
    // Trace the reference's uneven ten-ray burst inside the original star's footprint.
    const burstPoints = [[81, 13], [116, 49], [146, 6], [153, 65], [216, 39], [188, 91], [235, 111], [188, 133], [225, 189], [162, 173], [155, 235], [119, 194], [96, 235], [88, 178], [30, 198], [60, 152], [6, 130], [58, 107], [12, 50], [81, 69]];
    const starShape = new THREE.Shape();
    burstPoints.forEach(([x, y], i) => { const px = (x - 120) * .00042, py = (120 - y) * .00042; i ? starShape.lineTo(px, py) : starShape.moveTo(px, py); });
    starShape.closePath();
    const burstGreen = mat('#8fa77c');
    burstGreen.name = 'cafe-sage-starburst';
    add(root, new THREE.ExtrudeGeometry(starShape, { depth: .003, bevelEnabled: true, bevelSize: .001, bevelThickness: .001, bevelSegments: 1 }), burstGreen, [-.88, -.535, .018], 'green-starburst').scale.setScalar(1.10);
    const burstPurple = mat('#a28bb8');
    burstPurple.name = 'cafe-lavender-starburst';
    // The former bow's visual center; ten percent larger than the green burst.
    add(root, new THREE.ExtrudeGeometry(starShape, { depth: .003, bevelEnabled: true, bevelSize: .001, bevelThickness: .001, bevelSegments: 1 }), burstPurple, [.30, -.08, .018], 'purple-starburst').scale.setScalar(1.10 * 1.10);
    root.userData = { photos: 3, notes: 6, decorations: ['purple starburst', 'washi tape', 'paperclip', 'daisy', 'green starburst'], style: 'personal-photo-memory-board' };
    return root;
}
