import * as THREE from 'three';
import { addRoomLabels } from './roomLabels.js';
import { createWoodenNavigation } from './woodenNavigation.js';
/** Room identities stay with their complete shells and furnishings when moved. */
export function swapMiddleRooms(model) {
    const nodes = model.userData.sculptRuntime.nodes;
    for (const [id, node] of Object.entries(nodes)) {
        if (id === 'room-sculpture' || id.startsWith('sculpture-'))
            node.position.x += 3.34;
        if (id === 'room-schedule' || id.startsWith('schedule-'))
            node.position.x -= 3.34;
    }
    model.updateMatrixWorld(true);
}
export function createRoomNavigation(o) {
    const { model, garden, ground, scene, camera, controls, canvas, spec, render, interactions } = o;
    const names = { music: '版本资讯', about: 'About Me', cafe: '促活内容&UGC创作', monitor: '趣味内容&AI生图', schedule: 'SNS排期', sculpture: '社区工具', contact: 'Connect' };
    const rooms = spec.design.rooms.map((r) => ({ ...r, x: r.x + (r.id === 'sculpture' ? 3.34 : r.id === 'schedule' ? -3.34 : 0), label: names[r.id] })).sort((a, b) => b.floorY - a.floorY || a.x - b.x);
    const lettering = addRoomLabels(model, rooms, o.labelContours);
    const initialTarget = controls.target.clone();
    const initialPosition = new THREE.Vector3(0, camera.position.y, Math.hypot(camera.position.x, camera.position.z));
    const initialDistance = initialPosition.distanceTo(initialTarget);
    const reset = document.getElementById('view-reset');
    const back = document.getElementById('room-back'), heading = document.getElementById('room-heading');
    const wooden = createWoodenNavigation(scene);
    for (const [action, button] of [['back', back]]) {
        const feedback = (on, pressed = false) => { wooden.highlight(action, on, pressed); render(); };
        button.addEventListener('pointerenter', () => feedback(true));
        button.addEventListener('pointerleave', () => feedback(false));
        button.addEventListener('pointerdown', () => feedback(true, true));
        button.addEventListener('pointerup', () => feedback(true));
        button.addEventListener('pointercancel', () => feedback(false));
        button.addEventListener('focus', () => feedback(true));
        button.addEventListener('blur', () => feedback(false));
    }
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), hit = new THREE.Vector3();
    let active = null, dragged = false, start = null, orbiting = false, lastFocus = null;
    let homePose = null;
    // Interior views retain their approved shallow front-facing angle.
    const phi = Math.atan2(35, 3.4);
    function orbitLimits(room) {
        controls.minPolarAngle = room ? phi : 0;
        controls.maxPolarAngle = room ? phi : Math.PI;
        controls.minAzimuthAngle = room ? -Math.PI / 4 : -Infinity;
        controls.maxAzimuthAngle = room ? Math.PI / 4 : Infinity;
        controls.enableZoom = !room;
        controls.minDistance = room ? .1 : initialDistance / 1.15;
        controls.maxDistance = room ? 150 : initialDistance / .85;
    }
    orbitLimits(false);
    controls.zoomSpeed = .45;
    controls.enablePan = false;
    let animation = 0, moving = false;
    let pressedItem = null;
    function frameHeight(room) {
        // The front wall is closer to the camera than the room centre; wide rooms need
        // a little more space so the wooden controls and their hit areas stay in view.
        return room ? Math.max(room.height + .95, (room.width + (room.width > 4 ? 1.3 : 1)) / camera.aspect) : (o.gardenEnabled ? Math.max(o.gardenConfig.camera.height, o.gardenConfig.camera.width / camera.aspect) / (o.gardenConfig.camera.magnification ?? 1) : Math.max(10.8, 16.2 / camera.aspect));
    }
    function fovFor(position, target, room) {
        // A fixed overview lens preserves the approved framing and lets wheel dolly zoom work.
        const tangent = frameHeight(room) / 2 / (room ? position.distanceTo(target) : initialDistance);
        return THREE.MathUtils.radToDeg(2 * Math.atan(tangent));
    }
    function animateCamera(position, target, fov, complete) {
        interactions.clear(true);
        cancelAnimationFrame(animation);
        const fromPosition = camera.position.clone(), fromTarget = controls.target.clone(), fromFov = camera.fov;
        const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 680, startTime = performance.now();
        moving = true;
        controls.enabled = false;
        controls.minDistance = .1;
        controls.maxDistance = 150;
        document.body.dataset.cameraMoving = 'true';
        function tick(now) {
            const progress = duration ? Math.min((now - startTime) / duration, 1) : 1, ease = progress < .5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2;
            camera.position.lerpVectors(fromPosition, position, ease);
            controls.target.lerpVectors(fromTarget, target, ease);
            camera.fov = THREE.MathUtils.lerp(fromFov, fov, ease);
            camera.updateProjectionMatrix();
            controls.update();
            render();
            if (progress < 1)
                animation = requestAnimationFrame(tick);
            else {
                animation = 0;
                moving = false;
                controls.enabled = true;
                document.body.dataset.cameraMoving = 'false';
                complete?.();
            }
        }
        animation = requestAnimationFrame(tick);
    }
    function fit() { camera.fov = fovFor(camera.position, controls.target, active); camera.updateProjectionMatrix(); }
    function focusRoom(id, focusBack = false) {
        const r = rooms.find(r => r.id === id);
        if (!r)
            return;
        if (!active)
            homePose = { position: camera.position.clone(), target: controls.target.clone() };
        orbitLimits(false);
        active = r;
        reset.hidden = true;
        wooden.show();
        interactions.setFocused(true);
        const center = new THREE.Vector3(r.x, r.floorY + r.height / 2, 0), position = center.clone().add(new THREE.Vector3(0, 18 / Math.tan(phi), 18));
        heading.textContent = r.label;
        heading.hidden = true;
        back.hidden = false;
        document.body.dataset.activeRoom = id;
        syncNavigation();
        canvas.style.cursor = 'grab';
        const address = new URL(location.href);
        address.searchParams.set('room', id);
        history.replaceState(history.state, '', address);
        window.dispatchEvent(new CustomEvent('portfolio:room-focus', { detail: { roomId: id, section: r.label } }));
        animateCamera(position, center, fovFor(position, center, r), () => orbitLimits(true));
        // Only keyboard activation transfers focus; pointer/direct room entry must not show a focus ring.
        if (focusBack)
            back.focus({ preventScroll: true });
    }
    function returnHome() {
        if (!active || !homePose)
            return;
        active = null;
        orbitLimits(false);
        reset.hidden = false;
        wooden.hide();
        interactions.setFocused(false);
        back.hidden = heading.hidden = true;
        delete document.body.dataset.activeRoom;
        syncNavigation();
        const address = new URL(location.href);
        address.searchParams.delete('room');
        history.replaceState(history.state, '', address);
        animateCamera(homePose.position, homePose.target, fovFor(homePose.position, homePose.target, null), () => { orbitLimits(false); lastFocus?.focus({ preventScroll: true }); });
    }
    function resetView() {
        active = null;
        wooden.hide();
        interactions.setFocused(false);
        back.hidden = heading.hidden = true;
        reset.hidden = false;
        lastFocus = null;
        homePose = null;
        delete document.body.dataset.activeRoom;
        syncNavigation();
        const address = new URL(location.href);
        address.searchParams.delete('room');
        address.searchParams.delete('reviewAngle');
        history.replaceState(history.state, '', address);
        orbitLimits(false);
        animateCamera(initialPosition, initialTarget, fovFor(initialPosition, initialTarget, null), () => orbitLimits(false));
    }
    reset.addEventListener('click', resetView);
    // Room views retain their fixed lens: wheel gestures neither zoom nor leave.
    canvas.addEventListener('wheel', event => { if (active || moving) {
        event.preventDefault();
        event.stopImmediatePropagation();
    } }, { capture: true, passive: false });
    function pickRoom(x, y) {
        if (!active && camera.position.z < 1.96)
            return null;
        const rect = canvas.getBoundingClientRect();
        pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        let nearest = null, distance = Infinity;
        for (const r of rooms) {
            const box = new THREE.Box3(new THREE.Vector3(r.x - r.width / 2, r.floorY + .035, -1.72), new THREE.Vector3(r.x + r.width / 2, r.floorY + r.height, 1.96));
            if (raycaster.ray.intersectBox(box, hit)) {
                const d = hit.distanceTo(raycaster.ray.origin);
                if (d < distance) {
                    distance = d;
                    nearest = r;
                }
            }
        }
        return nearest;
    }
    function hover(x, y) {
        if (moving)
            return;
        const room = pickRoom(x, y), item = (!active && camera.position.z < 1.96) ? null : interactions.pick(x, y);
        const allowed = item && (!active || item.id === active.id) ? item : null;
        interactions.hover(allowed);
        if (allowed) {
            canvas.style.cursor = 'pointer';
            return;
        }
        canvas.style.cursor = active ? (room?.id === active.id ? 'grab' : 'zoom-out') : (room ? 'pointer' : 'grab');
    }
    function updateOverlay() {
        if (!active && !moving) {
            fit();
            return;
        }
        if (!active || back.hidden)
            return;
        camera.updateMatrixWorld();
        const rect = canvas.getBoundingClientRect();
        // Keep the return arrow inside the upper-left corner of each room opening.
        const wallEdges = { music: [-6.72, -1.77], about: [-1.77, 1.77], cafe: [1.77, 6.72], monitor: [-6.72, -3.35], schedule: [-3.35, 0], sculpture: [0, 3.35], contact: [3.35, 6.72] };
        const [left] = wallEdges[active.id];
        function place(action, button, x, y) {
            wooden.place(action, x, y);
            const point = new THREE.Vector3(x, y, 1.96).project(camera), edgeX = new THREE.Vector3(x + .12, y, 1.96).project(camera), edgeY = new THREE.Vector3(x, y + .12, 1.96).project(camera);
            button.style.width = Math.max(44, Math.abs(edgeX.x - point.x) * rect.width + 8) + 'px';
            button.style.height = Math.max(44, Math.abs(edgeY.y - point.y) * rect.height + 8) + 'px';
            button.style.left = Math.round(rect.left + (point.x + 1) * rect.width / 2) + 'px';
            const roomTop = new THREE.Vector3(x, active.floorY + active.height, 1.96).project(camera);
            const hitTop = rect.top + (1 - roomTop.y) * rect.height / 2;
            button.style.top = (hitTop + parseFloat(button.style.height) / 2) + 'px';
            button.dataset.roomAnchor = active.id;
        }
        place('back', back, left + .30, active.floorY + active.height - .12);
    }
    canvas.addEventListener('pointerdown', e => { if (e.button !== 0)
        return; start = { x: e.clientX, y: e.clientY }; dragged = false; pressedItem = (!active && camera.position.z < 1.96) ? null : interactions.pick(e.clientX, e.clientY); }, true);
    canvas.addEventListener('pointermove', e => { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5)
        dragged = true; if (orbiting || dragged && start) {
        return;
    } hover(e.clientX, e.clientY); });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
        canvas.addEventListener(name, () => { start = null; }, true);
    canvas.addEventListener('pointerleave', () => interactions.clear());
    canvas.addEventListener('click', e => {
        const item = pressedItem ?? ((!active && camera.position.z < 1.96) ? null : interactions.pick(e.clientX, e.clientY));
        pressedItem = null;
        if (dragged || moving)
            return;
        if (item) {
            if (!active) {
                lastFocus = null;
                focusRoom(item.id);
            }
            else if (active.id === item.id)
                interactions.open(item);
            else
                returnHome();
            return;
        }
        const room = pickRoom(e.clientX, e.clientY);
        if (active) {
            if (room?.id !== active.id)
                returnHome();
            return;
        }
        if (room) {
            lastFocus = null;
            focusRoom(room.id);
        }
    });
    controls.addEventListener('start', () => { orbiting = true; interactions.clear(true); canvas.style.cursor = 'grabbing'; });
    controls.addEventListener('end', () => { orbiting = false; canvas.style.cursor = 'grab'; });
    back.addEventListener('click', returnHome);
    document.addEventListener('keydown', e => { if (e.key === 'Escape')
        returnHome(); });
    const access = document.createElement('nav');
    access.className = 'house-navigation';
    access.setAttribute('aria-label', '房间导航');
    const navigationRooms = [rooms.find(room => room.id === 'about'), ...rooms.filter(room => room.id !== 'about')];
    for (const room of navigationRooms) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'house-navigation__link';
        button.textContent = room.label;
        button.dataset.room = room.id;
        button.onclick = event => { if (active?.id === room.id)
            return; lastFocus = button; focusRoom(room.id, event.detail === 0); };
        access.append(button);
    }
    function placeOverviewReset() {
        if (active || access.hidden)
            return;
        const bounds = access.getBoundingClientRect();
        reset.style.left = Math.max(48, Math.round(bounds.left - reset.offsetWidth - 32)) + 'px';
        reset.style.top = Math.round(bounds.top + (bounds.height - reset.offsetHeight) / 2) + 'px';
    }
    function syncNavigation() {
        access.hidden = active !== null;
        placeOverviewReset();
        for (const button of Array.from(access.querySelectorAll('button'))) {
            const current = button.dataset.room === active?.id;
            button.classList.toggle('is-current', current);
            if (current)
                button.setAttribute('aria-current', 'location');
            else
                button.removeAttribute('aria-current');
        }
    }
    document.body.append(access);
    syncNavigation();
    canvas.setAttribute('aria-label', '小屋三维场景，可自由旋转、滚轮缩放，点击房间查看细节');
    canvas.style.cursor = 'grab';
    return { rooms, lettering, wooden, updateOverlay, focusRoom, returnHome, resetView, pickRoom, resize: () => { placeOverviewReset(); if (moving) {
            cancelAnimationFrame(animation);
            animation = 0;
            moving = false;
            controls.enabled = true;
            document.body.dataset.cameraMoving = 'false';
            if (active) {
                controls.target.set(active.x, active.floorY + active.height / 2, 0);
                camera.position.copy(controls.target).add(new THREE.Vector3(0, 18 / Math.tan(phi), 18));
            }
            else if (homePose) {
                controls.target.copy(homePose.target);
                camera.position.copy(homePose.position);
            }
            controls.update();
            orbitLimits(!!active);
        } fit(); render(); }, getActive: () => active?.id ?? null };
}
