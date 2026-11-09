import * as THREE from 'three';
// @ts-expect-error The existing asset library exposes a plain JavaScript factory.
import { createVegetation, animateVegetation } from '../vegetation-library/vegetation.js';
export function createMiniatureGarden(config) {
    const root = new THREE.Group();
    root.name = 'portfolio-miniature-garden';
    const parts = {};
    const animatedTrees = [];
    const styledMaterials = new Map();
    const topY = config.terrain.baseY;
    const gaussian = (x, z, cx, cz, rx, rz, h) => h * Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
    // The original low rolling hills keep the house footprint level.
    function terrainY(x, z) {
        const elevation = gaussian(x, z, -16, -13, 11, 10, 3.1) + gaussian(x, z, 19, -22, 13, 11, 4.1) + gaussian(x, z, 6, -33, 13, 12, 1.8) + gaussian(x, z, -13, 7, 6.5, 9, 1.2) + gaussian(x, z, 13, 5, 7, 10, 1.1);
        const houseClear = THREE.MathUtils.smoothstep(Math.abs(x), 6.9, 10.2), rear = THREE.MathUtils.smoothstep(-z, 2.4, 7.8);
        return topY + elevation * Math.max(houseClear, rear);
    }
    function part(name) { const group = new THREE.Group(); group.name = name; parts[name] = group; root.add(group); return group; }
    const platform = part('garden-platform');
    const random = (() => { let seed = 4747; return () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296); })();
    const canvas = document.createElement('canvas');
    canvas.width = 1536;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = config.palette.grass;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 26; i++) {
        const x = random() * canvas.width, y = random() * canvas.height, r = 120 + random() * 230, g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, i % 2 ? 'rgba(202,221,163,.22)' : 'rgba(91,126,63,.12)');
        g.addColorStop(1, 'rgba(152,179,111,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 15000; i++) {
        const x = random() * canvas.width, y = random() * canvas.height;
        ctx.strokeStyle = i % 3 ? 'rgba(198,215,157,.16)' : 'rgba(93,126,64,.14)';
        ctx.lineWidth = .6 + random() * .7;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (random() - .5) * 2, y - 2 - random() * 4);
        ctx.stroke();
    }
    const grassTexture = new THREE.CanvasTexture(canvas);
    grassTexture.colorSpace = THREE.SRGBColorSpace;
    grassTexture.anisotropy = 4;
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(12, 12);
    const geometry = new THREE.PlaneGeometry(config.terrain.size, config.terrain.size, config.terrain.segments, config.terrain.segments);
    geometry.rotateX(-Math.PI / 2);
    const vertices = geometry.getAttribute('position'), colors = [], grass = new THREE.Color('#ffffff'), hill = new THREE.Color('#e4edcc');
    for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i), z = vertices.getZ(i), y = terrainY(x, z);
        vertices.setY(i, y);
        const color = grass.clone().lerp(hill, THREE.MathUtils.clamp((y - topY) / 4, 0, .6));
        colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const lawn = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: grassTexture, vertexColors: true, roughness: .99 }));
    lawn.name = 'continuous-sloping-lawn';
    lawn.receiveShadow = true;
    platform.add(lawn);
    const vegetation = part('garden-planting'), hillside = part('garden-hillside-planting'), rear = part('garden-rear-planting'), path = part('garden-stepping-stones');
    function create(entry, index, parent) {
        const seed = Math.round((entry.x + 50) * 997 + (entry.z + 50) * 131);
        const model = createVegetation(entry.type, { variant: entry.variant, seed });
        if (entry.lowGrowing && entry.type === 'hydrangea') {
            // Lower each flower head as a whole so its petals keep their rounded volume.
            const flowers = model.children.find(o => o.isInstancedMesh && o.count > 16);
            const leaves = model.children.find(o => o.isInstancedMesh && o.count === 16);
            const matrix = new THREE.Matrix4();
            if (flowers) {
                const perHead = flowers.count / 5;
                for (let head = 0; head < 5; head++) {
                    let centerY = 0;
                    for (let i = head * perHead; i < (head + 1) * perHead; i++) {
                        flowers.getMatrixAt(i, matrix);
                        centerY += matrix.elements[13] / perHead;
                    }
                    for (let i = head * perHead; i < (head + 1) * perHead; i++) {
                        flowers.getMatrixAt(i, matrix);
                        matrix.elements[13] -= centerY * .42;
                        flowers.setMatrixAt(i, matrix);
                    }
                }
                flowers.instanceMatrix.needsUpdate = true;
                flowers.computeBoundingBox();
                flowers.computeBoundingSphere();
            }
            if (leaves) {
                for (let i = 0; i < leaves.count; i++) {
                    leaves.getMatrixAt(i, matrix);
                    matrix.elements[13] *= .65;
                    leaves.setMatrixAt(i, matrix);
                }
                leaves.instanceMatrix.needsUpdate = true;
                leaves.computeBoundingBox();
                leaves.computeBoundingSphere();
            }
        }
        if (entry.height) {
            model.updateMatrixWorld(true);
            const height = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y;
            model.scale.multiplyScalar(entry.height / height);
        }
        else
            model.scale.multiplyScalar(entry.scale);
        if (entry.scaleXYZ)
            model.scale.multiply(new THREE.Vector3(...entry.scaleXYZ));
        model.rotation.y = entry.rotation;
        const groundY = terrainY(entry.x, entry.z);
        model.position.set(entry.x, groundY + .006 - (entry.type === 'grass' ? .04 * entry.scale : 0), entry.z);
        model.name = `garden-${entry.type}-${index}`;
        if ((parent === hillside || parent === rear) && ['daisy', 'pebbles'].includes(entry.type)) {
            const step = .12, normal = new THREE.Vector3(-(terrainY(entry.x + step, entry.z) - terrainY(entry.x - step, entry.z)) / (2 * step), 1, -(terrainY(entry.x, entry.z + step) - terrainY(entry.x, entry.z - step)) / (2 * step)).normalize();
            model.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal));
        }
        if (entry.grounded) {
            model.updateMatrixWorld(true);
            const bounds = new THREE.Box3().setFromObject(model);
            model.position.y += groundY + .004 - bounds.min.y;
            model.updateMatrixWorld(true);
        }
        if (entry.type === 'jacaranda')
            animatedTrees.push({ model, phase: (seed % 997) / 997 * 8 });
        model.userData = { ...model.userData, zone: entry.zone, plantedAt: [entry.x, groundY, entry.z], asset: entry.type, variant: entry.variant };
        model.traverse(object => {
            if (object.isMesh) {
                const mesh = object, look = config.appearance;
                if (look) {
                    function style(original) {
                        const surface = original;
                        const foliage = (entry.type === 'cone' || entry.type === 'ball') && !!surface.map;
                        const stone = entry.type === 'stone';
                        if (!foliage && !stone)
                            return original;
                        const key = original.uuid + entry.type;
                        let styled = styledMaterials.get(key);
                        if (styled)
                            return styled;
                        const material = surface.clone();
                        material.roughness = .98;
                        if (foliage) {
                            const base = new THREE.Color(entry.type === 'cone' ? look.coneColor : look.shrubColor), weight = look.foliageTextureStrength;
                            material.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;', `sampledDiffuseColor.rgb=mix(vec3(${base.r.toFixed(6)},${base.g.toFixed(6)},${base.b.toFixed(6)}),sampledDiffuseColor.rgb,${weight.toFixed(3)});diffuseColor *= sampledDiffuseColor;`)); };
                            material.customProgramCacheKey = () => `airy-foliage-${entry.type}-${weight}`;
                        }
                        else {
                            material.color.set(look.stoneColor);
                            material.emissive.set(look.stoneColor);
                            material.emissiveIntensity = .04;
                        }
                        styledMaterials.set(key, material);
                        return material;
                    }
                    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(style) : style(mesh.material);
                }
                object.castShadow = entry.type !== 'grass' && parent !== hillside && parent !== rear;
                object.receiveShadow = entry.type === 'stone';
            }
        });
        parent.add(model);
    }
    config.plants.forEach((entry, index) => create(entry, index, vegetation));
    config.hillsidePlants?.forEach((entry, index) => create(entry, index, hillside));
    config.rearPlants?.forEach((entry, index) => create(entry, index, rear));
    config.stones.forEach((entry, index) => create({ ...entry, type: 'stone' }, index, path));
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 8;
    skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d'), gradient = skyCtx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, config.palette.skyTop);
    gradient.addColorStop(1, config.palette.skyBottom);
    skyCtx.fillStyle = gradient;
    skyCtx.fillRect(0, 0, 8, 512);
    const sky = new THREE.CanvasTexture(skyCanvas);
    sky.colorSpace = THREE.SRGBColorSpace;
    root.userData = { kind: 'miniature-garden', terrainY, plantGroups: config.plants.length, hillsideGroups: config.hillsidePlants?.length ?? 0, rearGroups: config.rearPlants?.length ?? 0, steppingStones: config.stones.length, layout: config };
    function update(time, delta) { for (const tree of animatedTrees)
        animateVegetation(tree.model, time + tree.phase, delta); }
    return { root, parts, sky, terrainY, update, animatedTreeCount: animatedTrees.length };
}
