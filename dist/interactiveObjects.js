import * as THREE from 'three';
import { ObjectOutlinePass } from './objectOutline.js';
export function createInteractiveObjects(o) {
    const { model, scene, camera, canvas, composer, render } = o, nodes = model.userData.sculptRuntime.nodes;
    const definitions = { music: ['music-drums', 'drum-hardware'], about: ['about-portrait'], cafe: ['cafe-corkboard'], monitor: ['monitor-screens'], schedule: ['schedule-board'], sculpture: ['sculpture-bust', 'sculpture-pedestal'], contact: ['contact-phone'] };
    model.updateMatrixWorld(true);
    const entries = Object.entries(definitions).filter(([id]) => o.destinations[id]?.enabled !== false).map(([id, parts]) => {
        const targets = parts.map(p => nodes[p]), box = new THREE.Box3();
        for (const target of targets)
            box.union(new THREE.Box3().setFromObject(target));
        const center = box.getCenter(new THREE.Vector3());
        center.y = box.min.y;
        const parent = targets.every(n => n.parent === targets[0].parent) ? targets[0].parent : model;
        const wrapper = new THREE.Group();
        wrapper.name = 'interactive-' + id;
        wrapper.userData.portalRoom = id;
        wrapper.position.copy(parent.worldToLocal(center));
        parent.add(wrapper);
        wrapper.updateMatrixWorld(true);
        for (const target of targets)
            wrapper.attach(target);
        let outlineProxy;
        if (id === 'monitor') {
            const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
            center.z = box.max.z + .008;
            outlineProxy = new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.y), new THREE.MeshBasicMaterial({ color: '#000000', side: THREE.DoubleSide, toneMapped: false }));
            outlineProxy.name = 'four-screen-outer-envelope';
            outlineProxy.position.copy(wrapper.worldToLocal(center));
            outlineProxy.visible = false;
            wrapper.add(outlineProxy);
        }
        return { id, parts: id === 'contact' ? [...parts, 'phone-cord'] : parts, wrapper, home: wrapper.position.clone(), box: new THREE.Box3().setFromObject(wrapper), progress: 0, from: 0, goal: 0, started: 0, destination: o.destinations[id], outlineProxy };
    });
    canvas.dataset.itemAnimating = 'false';
    const byPart = new Map();
    entries.forEach(entry => entry.parts.forEach(id => byPart.set(id, entry)));
    const outline = new ObjectOutlinePass(scene, camera);
    if (composer)
        composer.addPass(outline);
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), point = new THREE.Vector3();
    let active = null, frame = 0;
    function apply(entry) { entry.wrapper.scale.setScalar(1 + .08 * entry.progress); entry.wrapper.position.copy(entry.home); entry.wrapper.position.z += .12 * entry.progress; entry.wrapper.updateMatrixWorld(true); entry.box.setFromObject(entry.wrapper); }
    function animate(now) {
        let pending = false;
        for (const entry of entries) {
            if (entry.progress === entry.goal)
                continue;
            const t = Math.min((now - entry.started) / 170, 1), ease = 1 - (1 - t) ** 3;
            entry.progress = THREE.MathUtils.lerp(entry.from, entry.goal, ease);
            if (t === 1)
                entry.progress = entry.goal;
            else
                pending = true;
            apply(entry);
        }
        render();
        frame = pending ? requestAnimationFrame(animate) : 0;
        if (!pending)
            canvas.dataset.itemAnimating = 'false';
    }
    function hover(entry) {
        if (entry === active)
            return;
        active = entry;
        const now = performance.now();
        for (const e of entries) {
            const goal = e === entry ? 1 : 0;
            if (e.goal !== goal) {
                e.from = e.progress;
                e.goal = goal;
                e.started = now;
            }
        }
        outline.selectedObjects = entry ? [entry.wrapper] : [];
        outline.maskProxy = entry?.outlineProxy ?? null;
        outline.enabled = !!entry;
        if (entry) {
            canvas.dataset.hoveredItem = entry.id;
            canvas.setAttribute('aria-description', '点击' + entry.destination.object + '，打开' + entry.destination.title);
        }
        else {
            delete canvas.dataset.hoveredItem;
            canvas.removeAttribute('aria-description');
        }
        canvas.dataset.itemAnimating = 'true';
        if (!frame)
            frame = requestAnimationFrame(animate);
    }
    function clear(immediate = false) { hover(null); if (immediate) {
        cancelAnimationFrame(frame);
        frame = 0;
        canvas.dataset.itemAnimating = 'false';
        for (const entry of entries) {
            entry.progress = entry.from = entry.goal = 0;
            apply(entry);
        }
        outline.enabled = false;
        outline.selectedObjects = [];
        outline.maskProxy = null;
        render();
    } }
    function pick(x, y) {
        const rect = canvas.getBoundingClientRect();
        pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
        camera.updateMatrixWorld();
        model.updateMatrixWorld(true);
        raycaster.setFromCamera(pointer, camera);
        const candidates = entries.filter(e => raycaster.ray.intersectBox(e.box, point));
        if (!candidates.length)
            return null;
        const first = raycaster.intersectObject(model, true).find(h => { let p = h.object; while (p) {
            if (!p.visible)
                return false;
            p = p.parent;
        } return true; });
        if (first) {
            const direct = byPart.get(first.object.userData.componentId);
            if (direct)
                return direct;
        }
        // Every interactive prop uses its complete occupied volume, including all gaps.
        for (const area of candidates)
            if (raycaster.ray.intersectBox(area.box, point)) {
                if (!first || point.distanceTo(raycaster.ray.origin) <= first.distance + .025)
                    return area;
            }
        return null;
    }
    function open(entry) { if (entry.destination.enabled === false || !entry.destination.url)
        return; const url = new URL(entry.destination.url, location.href); clear(true); window.dispatchEvent(new CustomEvent('portfolio:item-activate', { detail: { roomId: entry.id, partIds: entry.parts, url: url.href } })); location.assign(url.href); }
    return { entries, outline, pick, hover, clear, open, setFocused: (focused) => { outline.strokeWidth = focused ? 9 : 5; }, getHovered: () => active?.id ?? null };
}
