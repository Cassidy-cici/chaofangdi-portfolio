import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
/** A depth-tested visible silhouette mask, expanded into an opaque ink contour. */
export class ObjectOutlinePass extends Pass {
    scene;
    camera;
    selectedObjects = [];
    maskProxy = null;
    strokeWidth = 5;
    mask = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    materials = new Map();
    overlay;
    quad;
    constructor(scene, camera) {
        super();
        this.scene = scene;
        this.camera = camera;
        this.needsSwap = true;
        this.enabled = false;
        this.overlay = new THREE.ShaderMaterial({ uniforms: { maskTexture: { value: this.mask.texture }, texel: { value: new THREE.Vector2(1 / innerWidth, 1 / innerHeight) }, ink: { value: new THREE.Color('#FFFFFF') }, sceneTexture: { value: null }, stroke: { value: 5 } }, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: `varying vec2 vUv;uniform sampler2D maskTexture;uniform sampler2D sceneTexture;uniform vec2 texel;uniform vec3 ink;uniform float stroke;void main(){float here=texture2D(maskTexture,vUv).r;float edge=here;for(int i=0;i<20;i++){float angle=float(i)*6.28318530718/20.0;vec2 direction=vec2(cos(angle),sin(angle))*texel*stroke;edge=min(edge,texture2D(maskTexture,vUv+direction).r);edge=min(edge,texture2D(maskTexture,vUv+direction*.5).r);}float alpha=clamp((1.0-edge)*here,0.0,1.0);vec4 base=texture2D(sceneTexture,vUv);gl_FragColor=vec4(mix(base.rgb,ink,alpha),base.a);}`, transparent: false, blending: THREE.NoBlending, depthTest: false, depthWrite: false, toneMapped: false });
        this.quad = new FullScreenQuad(this.overlay);
    }
    material(selected, side) {
        const key = String(selected) + side;
        let m = this.materials.get(key);
        if (!m) {
            m = new THREE.MeshBasicMaterial({ color: selected ? '#000000' : '#ffffff', side, toneMapped: false });
            // Instance/vertex colors describe the asset, never its selection state. In
            // particular, foliage instance colors must not darken the unselected mask.
            m.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', ''); };
            m.customProgramCacheKey = () => 'object-selection-mask-v2';
            this.materials.set(key, m);
        }
        return m;
    }
    setSize(width, height) { this.mask.setSize(width, height); this.overlay.uniforms.texel.value.set(1 / width, 1 / height); }
    render(renderer, write, read) {
        if (!this.selectedObjects.length)
            return;
        this.overlay.uniforms.stroke.value = this.strokeWidth * renderer.getPixelRatio();
        const selected = new Set();
        if (this.maskProxy)
            selected.add(this.maskProxy);
        else
            for (const root of this.selectedObjects)
                root.traverse(o => { if (o.isMesh)
                    selected.add(o); });
        const saved = [], background = this.scene.background, fog = this.scene.fog, override = this.scene.overrideMaterial;
        const clearColor = renderer.getClearColor(new THREE.Color()), clearAlpha = renderer.getClearAlpha(), auto = renderer.autoClear, shadows = renderer.shadowMap.enabled;
        const proxyVisibility = this.maskProxy?.visible;
        if (this.maskProxy)
            this.maskProxy.visible = true;
        try {
            this.scene.traverse(o => { if (!o.isMesh)
                return; const mesh = o, material = mesh.material; saved.push([mesh, material]); const first = Array.isArray(material) ? material[0] : material; mesh.material = this.material(selected.has(mesh), first.side); });
            this.scene.background = null;
            this.scene.fog = null;
            this.scene.overrideMaterial = null;
            renderer.shadowMap.enabled = false;
            renderer.autoClear = true;
            renderer.setClearColor('#ffffff', 1);
            renderer.setRenderTarget(this.mask);
            renderer.clear();
            renderer.render(this.scene, this.camera);
        }
        finally {
            if (this.maskProxy)
                this.maskProxy.visible = proxyVisibility ?? false;
            for (const [mesh, material] of saved)
                mesh.material = material;
            this.scene.background = background;
            this.scene.fog = fog;
            this.scene.overrideMaterial = override;
            renderer.shadowMap.enabled = shadows;
            renderer.autoClear = auto;
            renderer.setClearColor(clearColor, clearAlpha);
        }
        // Composite after OutputPass so white stays #FFFFFF instead of being greyed by tone mapping.
        this.overlay.uniforms.sceneTexture.value = read.texture;
        renderer.setRenderTarget(this.renderToScreen ? null : write);
        renderer.autoClear = false;
        this.quad.render(renderer);
        renderer.autoClear = auto;
    }
    dispose() { this.mask.dispose(); this.materials.forEach(m => m.dispose()); this.overlay.dispose(); this.quad.dispose(); }
}
