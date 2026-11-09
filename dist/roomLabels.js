import * as THREE from 'three';
export function addRoomLabels(model, rooms, contours) {
    const root = new THREE.Group();
    root.name = 'room-name-lettering';
    model.add(root);
    // Reuse the roof title's brown satin color and its fine material grain.
    let labelMaterial;
    const title = model.userData.sculptRuntime?.nodes['portfolio-title'];
    title?.traverse(o => { if (!labelMaterial && o.isMesh) {
        const material = o.material;
        labelMaterial = (Array.isArray(material) ? material[0] : material).clone();
    } });
    labelMaterial ??= new THREE.MeshPhysicalMaterial({ color: '#653114', roughness: .57, clearcoat: .06 });
    labelMaterial.color.set('#572A11');
    for (const room of rooms) {
        const contour = contours.find(c => c.text === room.label);
        if (!contour)
            throw new Error('Missing room name contour: ' + room.label);
        const path = new THREE.ShapePath();
        for (const [op, ...values] of contour.commands) {
            const v = values;
            switch (op) {
                case 'M':
                    path.moveTo(v[0], v[1]);
                    break;
                case 'L':
                    path.lineTo(v[0], v[1]);
                    break;
                case 'Q':
                    path.quadraticCurveTo(v[0], v[1], v[2], v[3]);
                    break;
                case 'C':
                    path.bezierCurveTo(v[0], v[1], v[2], v[3], v[4], v[5]);
                    break;
                case 'Z':
                    path.currentPath?.closePath();
                    break;
            }
        }
        const shapes = path.toShapes(false);
        const geo = new THREE.ExtrudeGeometry(shapes, { depth: 130, bevelEnabled: true, bevelThickness: 3, bevelSize: 3, bevelSegments: 2, curveSegments: 5, steps: 1 });
        geo.computeBoundingBox();
        const bounds = geo.boundingBox, size = bounds.getSize(new THREE.Vector3()), scale = .9 * (room.id === 'about' || room.id === 'contact' ? .92 : 1) * Math.min(.20 / size.y, (room.width - .36) / size.x);
        geo.translate(-bounds.min.x, -bounds.min.y, -bounds.min.z);
        geo.scale(scale, scale, scale);
        const mesh = new THREE.Mesh(geo, labelMaterial);
        mesh.name = 'room-name-' + room.id;
        mesh.position.set(room.x - room.width / 2 + .13, room.floorY + .060, 1.87);
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        mesh.userData = { roomId: room.id, text: room.label, style: 'solid-extruded-roof-title-grain', colorMatches: '#572A11 (one tone darker than roof title)', sizeRatio: .9 * (room.id === 'about' || room.id === 'contact' ? .92 : 1) };
        root.add(mesh);
    }
    return root;
}
