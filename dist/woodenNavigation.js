import * as THREE from 'three';
/** A small ivory return relief, with no plaque or surrounding frame. */
export function createWoodenNavigation(scene) {
    const root = new THREE.Group();
    root.name = 'room-return-relief';
    root.visible = false;
    scene.add(root);
    const shape = new THREE.Shape();
    shape.moveTo(-.10, .035);
    shape.lineTo(-.032, .105);
    shape.lineTo(-.032, .062);
    shape.lineTo(.015, .062);
    shape.bezierCurveTo(.11, .062, .13, -.08, .035, -.095);
    shape.lineTo(.02, -.058);
    shape.bezierCurveTo(.08, -.048, .07, .025, .012, .025);
    shape.lineTo(-.032, .025);
    shape.lineTo(-.032, -.015);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: .009, bevelEnabled: true, bevelThickness: .002, bevelSize: .002, bevelSegments: 3, curveSegments: 18, steps: 1 });
    geometry.scale(.8, .8, 1);
    geometry.translate(-.002, -.004, 0);
    const face = new THREE.MeshStandardMaterial({ color: '#FFF5DF', roughness: .72, emissive: '#FFF1D2', emissiveIntensity: .06 });
    const side = new THREE.MeshStandardMaterial({ color: '#C4A47C', roughness: .82 });
    const body = new THREE.Mesh(geometry, [face, side]);
    body.name = 'ivory-curved-return-arrow';
    body.castShadow = true;
    body.receiveShadow = true;
    const shadow = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#765235', transparent: true, opacity: .18, depthWrite: false }));
    shadow.name = 'soft-warm-arrow-shadow';
    shadow.position.set(.003, -.004, -.005);
    shadow.scale.set(1.025, 1.025, .2);
    const group = new THREE.Group();
    group.name = 'return-arrow-back';
    group.add(shadow, body);
    root.add(group);
    const buttons = { back: { group, body, face } };
    function highlight(_action, on, pressed = false) {
        group.scale.setScalar(pressed ? .98 : on ? 1.08 : 1);
        face.color.set(on ? '#FFFAEF' : '#FFF5DF');
        body.position.z = pressed ? -.003 : 0;
    }
    return { root, buttons, highlight, place(_action, x, y) { group.position.set(x, y, 1.912); }, hide() { root.visible = false; }, show() { root.visible = true; } };
}
