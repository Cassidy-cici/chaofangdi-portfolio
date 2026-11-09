import * as THREE from 'three';
function treeToolkit() {
    const t = THREE, D = false;
    const TREE_AT = [-3.9, .9];
    const _e = 7759452, ze = [10456032, 9666776, 11443432, 12365550, 8943055, 13089264, 11901920, 12887782], Pe = [9286268, 8299375], Ve = 1;
    const WIND = new t.Vector3(1, 0, .35).normalize();
    const je = 1.5;
    function Se(i) { let c = i >>> 0; return () => (c = c * 1664525 + 1013904223 >>> 0, c / 4294967296); }
    function merge(i) { let c = 0, a = 0; for (const s of i)
        c += s.attributes.position.count, a += s.index.count; const o = new Float32Array(c * 3), n = new Float32Array(c * 3), x = new Float32Array(c * 2), f = new Uint32Array(a); let p = 0, k = 0; for (const s of i) {
        o.set(s.attributes.position.array, p * 3), n.set(s.attributes.normal.array, p * 3), x.set(s.attributes.uv.array, p * 2);
        const e = s.index.array;
        for (let d = 0; d < e.length; d++)
            f[k + d] = e[d] + p;
        p += s.attributes.position.count, k += e.length, s.dispose();
    } const M = new t.BufferGeometry; return M.setAttribute("position", new t.BufferAttribute(o, 3)), M.setAttribute("normal", new t.BufferAttribute(n, 3)), M.setAttribute("uv", new t.BufferAttribute(x, 2)), M.setIndex(new t.BufferAttribute(f, 1)), M; }
    const Ne = new t.Vector3(0, 1, 0), be = new t.Matrix4, ke = new t.Quaternion, Je = new t.Vector3(1, 1, 1);
    function Q(i, c, a, o, n = 6) { const x = new t.CylinderGeometry(o, a, i.distanceTo(c), n, 1); return ke.setFromUnitVectors(Ne, c.clone().sub(i).normalize()), be.compose(i.clone().add(c).multiplyScalar(.5), ke, Je), x.applyMatrix4(be), x; }
    function Oe() { const i = document.createElement("canvas"); i.width = 64, i.height = 128; const c = i.getContext("2d"); c.scale(3.2, 3.2); const a = new Path2D("M10 2C17 10 19 24 14 33C11 38 8 38 6 33C1 24 3 10 10 2Z"), o = c.createLinearGradient(0, 0, 0, 40); o.addColorStop(0, "#E6DAF8"), o.addColorStop(.5, "#BFA3EA"), o.addColorStop(1, "#8E6BD0"), c.fillStyle = o, c.fill(a), c.strokeStyle = "rgba(125,93,192,.55)", c.lineWidth = .8, c.stroke(a); const n = new t.CanvasTexture(i); return n.colorSpace = t.SRGBColorSpace, n; }
    function buildJacTree(i, c, a = TREE_AT, o = [je, 0]) { const n = Se(20261103), x = 1.42, f = new t.Group; f.position.set(a[0], Ve, a[1]), f.scale.setScalar(x), f.userData.gardenItem = "__tree", i.add(f); const p = { x1: o[0] - 3.25 - .5, x2: o[0] + 4.1 + .4, z1: o[1] - 2 - .5, z2: o[1] + 2 + .5, top: 8.3 + .8 }, k = r => { const l = r.x * x + a[0], u = r.z * x + a[1], z = r.y * x + Ve; return l > p.x1 && l < p.x2 && u > p.z1 && u < p.z2 && z < p.top; }, M = new t.MeshStandardMaterial({ color: _e, roughness: .95 }), s = [], e = [[0, 0, 0, .34], [.12, 1.2, .05, .29], [-.06, 2.3, -.08, .24], [.1, 3.3, 0, .2], [.02, 4.6, .06, .14], [.08, 5.7, -.02, .095], [0, 6.9, .03, .06], [.05, 8, 0, .035]]; for (let r = 0; r < e.length - 1; r++) {
        s.push(Q(new t.Vector3(...e[r].slice(0, 3)), new t.Vector3(...e[r + 1].slice(0, 3)), e[r][3], e[r + 1][3], 12));
        const l = new t.SphereGeometry(e[r + 1][3] * 1.02, 12, 8);
        l.translate(...e[r + 1].slice(0, 3)), s.push(l);
    } for (let r = 0; r < 6; r++) {
        const l = r / 6 * Math.PI * 2 + n() * .5;
        s.push(Q(new t.Vector3(0, .3, 0), new t.Vector3(Math.cos(l) * .75, .02, Math.sin(l) * .75), .13, .035, 6));
    } const d = new t.Mesh(merge(s), M); d.castShadow = d.receiveShadow = !0, f.add(d); const C = r => { for (let l = 0; l < e.length - 1; l++)
        if (r <= e[l + 1][1]) {
            const u = (r - e[l][1]) / (e[l + 1][1] - e[l][1]);
            return new t.Vector3(t.MathUtils.lerp(e[l][0], e[l + 1][0], u), r, t.MathUtils.lerp(e[l][2], e[l + 1][2], u));
        } return new t.Vector3(...e[e.length - 1].slice(0, 3)); }, re = 1.7, Z = 10.2, Ee = 4.15, ae = (r, l) => { const u = (r - re) / (Z - re); return u <= 0 || u >= 1 ? .05 : Ee * Math.pow(Math.sin(Math.PI * Math.pow(u, .62)), .85) * (1 + .13 * Math.sin(3 * l + 1.3 + u * 2) + .08 * Math.sin(5 * l - .7 + u * 5)); }, Te = r => r.y > Z || Math.hypot(r.x, r.z) > ae(r.y, Math.atan2(r.z, r.x)), Ce = new t.IcosahedronGeometry(.07, 0), Ie = new t.IcosahedronGeometry(.09, 0), Be = new t.MeshStandardMaterial({ roughness: .8, emissive: 3812444, emissiveIntensity: .28 }), Fe = new t.MeshStandardMaterial({ roughness: .9 }), g = new t.Matrix4, I = new t.Quaternion, B = new t.Euler, F = new t.Vector3, ce = new t.Color, ie = [], R = [], Ge = D ? 3 : 4, le = D ? 8 : 10; for (let r = 0; r < le; r++) {
        const l = 2.7 + r / (le - 1) * 4.4 + (n() - .5) * .3, u = C(l), z = new t.Group;
        z.position.copy(u), f.add(z);
        const V = [], v = [], J = [], $ = r * 2.39996 + .6 + (n() - .5) * .4, fe = Math.min(Z - .4, l + .9 + n() * .9), we = ae(fe, $) * .92, Me = new t.Vector3(Math.cos($) * we, fe, Math.sin($) * we).clone().sub(u), xe = (h, S, L, b, m) => { const E = m >= Ge, te = w => Te(w) || k(w), Ae = new t.Vector3((n() - .5) * .12, (n() - .4) * .1, (n() - .5) * .12); let H = S.clone(), ne = L, y = h.clone().addScaledVector(H, ne).add(Ae); for (let w = 0; w < 7 && te(u.clone().add(y)); w++) {
            const A = u.clone().add(h), T = new t.Vector3(-A.x * .5, 1, -A.z * .5).normalize();
            H.lerp(T, .35).normalize(), ne *= .85, y = h.clone().addScaledVector(H, ne).add(Ae);
        } if (te(u.clone().add(y)) || y.distanceTo(h) < .1)
            return; if (S = H, V.push(Q(h, y, b, b * .7, m < 2 ? 6 : 4)), m < 1) {
            const w = new t.SphereGeometry(b * .72, 6, 4);
            w.translate(y.x, y.y, y.z), V.push(w);
        } if (m >= 1) {
            const w = E ? 2 : 1 + (n() < .5 ? 1 : 0);
            for (let A = 0; A < w; A++) {
                const T = E ? .45 + A * .25 : .4 + n() * .6;
                (n() < .26 ? v : J).push(h.clone().lerp(y, T));
            }
        } if (m <= 1) {
            const w = m === 0 ? 4 : 2;
            for (let A = 0; A < w; A++) {
                const T = h.clone().lerp(y, .25 + n() * .7), Ue = new t.Vector3((n() - .5) * 2, .4 + n() * .8, (n() - .5) * 2).normalize(), oe = T.clone().addScaledVector(Ue, .3 + n() * .45);
                if (!te(u.clone().add(oe))) {
                    V.push(Q(T, oe, .014, .008, 4));
                    for (let se = 0; se < 2; se++)
                        (n() < .3 ? v : J).push(T.clone().lerp(oe, .55 + se * .4));
                }
            }
        } if (E)
            return; const Le = m === 3 ? 2 : 3, ge = u.clone().add(y), De = new t.Vector3(ge.x, 0, ge.z).normalize(); for (let w = 0; w < Le; w++) {
            const A = S.clone().add(new t.Vector3((n() - .5) * 1.1, (n() - .3) * .7, (n() - .5) * 1.1)).addScaledVector(De, m === 0 ? .25 : .05).add(new t.Vector3(0, .3, 0)).normalize();
            xe(y, A, m === 3 ? .25 + n() * .3 : Math.max(.35, L * (.72 + n() * .14)), Math.max(.008, b * .62), m + 1);
        } };
        xe(new t.Vector3, Me.clone().normalize(), Me.length() * .5, .06, 0);
        const ee = new t.Mesh(merge(V), M);
        ee.castShadow = !0, ee.receiveShadow = !0, z.add(ee);
        const me = D ? 7 : 10, j = new t.InstancedMesh(Ce, Be, v.length * me);
        let O = 0;
        for (const h of v) {
            R.push({ at: u.clone().add(h), r: .3 });
            const S = 6 + Math.floor(n() * 7), L = .18 + n() * .14;
            for (let b = 0; b < me; b++) {
                if (b >= S) {
                    g.makeScale(0, 0, 0), j.setMatrixAt(O++, g);
                    continue;
                }
                const m = new t.Vector3((n() - .5) * 2 * L, (n() - .65) * L * 1.4, (n() - .5) * 2 * L).add(h);
                B.set(n() * 6.3, n() * 6.3, n() * 6.3), I.setFromEuler(B);
                const E = .75 + n() * .7;
                F.set(E, E, E), g.compose(m, I, F), j.setMatrixAt(O, g), j.setColorAt(O, ce.setHex(ze[Math.floor(n() * ze.length)])), O++;
            }
        }
        const q = new t.InstancedMesh(Ie, Fe, J.length * 3 + v.length);
        let X = 0;
        const ye = h => { B.set(n() * 6.3, n() * 6.3, n() * 6.3), I.setFromEuler(B), F.set(1.4, .3, .8), g.compose(h, I, F), q.setMatrixAt(X, g), q.setColorAt(X, ce.setHex(Pe[X % 2])), X++; };
        for (const h of J)
            for (let S = 0; S < 3; S++)
                ye(h.clone().add(new t.Vector3((n() - .5) * .45, (n() - .5) * .2, (n() - .5) * .45)));
        for (const h of v)
            ye(h.clone().add(new t.Vector3((n() - .5) * .4, -.08, (n() - .5) * .4)));
        j.castShadow = !0, q.castShadow = !0, z.add(j, q), ie.push({ g: z, phase: n() * 6.3, k: .6 + n() * .6, lag: .04 + (l - 2.7) * .02 });
    } const P = D ? 7 : 14, de = D ? 30 : 60, ve = new t.MeshStandardMaterial({ map: Oe(), alphaTest: .4, side: t.DoubleSide, roughness: .8, emissive: 3811930, emissiveIntensity: .2 }), N = D ? 14 : 30, G = new t.InstancedMesh(new t.PlaneGeometry(.16, .3), ve, P + N + de); G.frustumCulled = !1, f.add(G); const ue = Se(7), pe = []; for (let r = 0; r < P; r++)
        pe.push(K(ue, R, !0)); for (let r = 0; r < de; r++) {
        const l = n() * Math.PI * 2, u = .5 + Math.pow(n(), .7) * 4.2, z = new t.Vector3(Math.cos(l) * u + WIND.x * .8, .02, Math.sin(l) * u + WIND.z * .8);
        B.set(-Math.PI / 2, 0, n() * 6.3), I.setFromEuler(B);
        const V = .8 + n() * .5;
        F.set(V, V, V), g.compose(z, I, F), G.setMatrixAt(P + N + r, g);
    } G.instanceMatrix.setUsage(t.DynamicDrawUsage); const he = []; g.makeScale(0, 0, 0); for (let r = 0; r < N; r++)
        he.push(null), G.setMatrixAt(P + r, g); return c.jacTree = { tree: f, branches: ie, petals: G, fall: pe, spots: R, rnd: ue, FALLING: P, BURST: N, burst: he, shake: 0, shakeT: 0 }, f; }
    function K(i, c, a = !1) { const o = c[Math.floor(i() * c.length)], n = o.at.clone().add(new t.Vector3((i() - .5) * o.r * 1.6, (i() - .7) * .5, (i() - .5) * o.r * 1.6)); return a && (n.y = .3 + i() * (n.y - .3)), { p: n, vy: .5 + i() * .45, spin: new t.Vector3(i() * 6, i() * 6, i() * 6), spinV: new t.Vector3(1 + i() * 2.5, .6 + i() * 1.5, 1 + i() * 2), drift: .6 + i() * .8, landed: 0, size: .8 + i() * .5 }; }
    const U = new t.Matrix4, W = new t.Quaternion, _ = new t.Euler, Y = new t.Vector3;
    function shakeJacTree(i, c) { const a = i.jacTree; if (a) {
        a.shake = 1, a.shakeT = c;
        for (let o = 0; o < a.BURST; o++)
            a.burst[o] = K(a.rnd, a.spots);
    } }
    function tickJacTree(i, c, a) { const o = i.jacTree; if (!o)
        return; a = Math.min(a, .05); const n = .5 + .5 * Math.sin(c * .42) * Math.sin(c * .17 + 1.3), x = Math.sin(c * 2.3) * .5 + Math.sin(c * 3.7 + .8) * .3, f = s => s <= 0 ? 0 : Math.exp(-s * 1.25) * Math.sin(s * 6.2), p = o.shakeT ? c - o.shakeT : 99, k = p < 6 ? .03 * f(p) : 0; o.tree.rotation.z = -WIND.x * k, o.tree.rotation.x = WIND.z * k; for (const s of o.branches) {
        const e = (.016 + .04 * n) * s.k, d = p < 6 ? .07 * s.k * f(p - s.lag) : 0, C = .003 * s.k * Math.sin(c * 2.1 + s.phase) + .006 * x;
        s.g.rotation.z = -WIND.x * (e + d) + C, s.g.rotation.x = WIND.z * (e + d) + C * .6;
    } const M = .35 + 1.1 * n; for (let s = 0; s < o.FALLING; s++) {
        const e = o.fall[s];
        e.landed > 0 ? (e.landed += a, e.landed > 2.5 && (o.fall[s] = K(o.rnd, o.spots))) : (e.p.y -= e.vy * a, e.p.x += (WIND.x * M * e.drift + Math.sin(c * 1.7 + s) * .25) * a, e.p.z += (WIND.z * M * e.drift + Math.cos(c * 1.3 + s * .7) * .25) * a, e.spin.x += e.spinV.x * a, e.spin.y += e.spinV.y * a, e.spin.z += e.spinV.z * a, e.p.y <= .03 && (e.p.y = .03, e.landed = .001), (Math.abs(e.p.x) > 16 || Math.abs(e.p.z) > 14) && (o.fall[s] = K(o.rnd, o.spots)));
        const d = o.fall[s];
        d.landed > 0 ? _.set(-Math.PI / 2, 0, d.spin.z) : _.set(d.spin.x, d.spin.y, d.spin.z), W.setFromEuler(_);
        const C = d.landed > 0 ? Math.max(0, 1 - Math.max(0, d.landed - 1.2) / 1.3) : 1;
        Y.setScalar(d.size * C), U.compose(d.p, W, Y), o.petals.setMatrixAt(s, U);
    } for (let s = 0; s < o.BURST; s++) {
        const e = o.burst[s];
        if (!e)
            continue;
        if (e.landed > 0) {
            if (e.landed += a, e.landed > 2.5) {
                o.burst[s] = null, U.makeScale(0, 0, 0), o.petals.setMatrixAt(o.FALLING + s, U);
                continue;
            }
        }
        else
            e.p.y -= e.vy * 1.15 * a, e.p.x += (WIND.x * M * e.drift + Math.sin(c * 1.7 + s) * .35) * a, e.p.z += (WIND.z * M * e.drift + Math.cos(c * 1.3 + s * .7) * .35) * a, e.spin.x += e.spinV.x * a, e.spin.y += e.spinV.y * a, e.spin.z += e.spinV.z * a, e.p.y <= .03 && (e.p.y = .03, e.landed = .001);
        e.landed > 0 ? _.set(-Math.PI / 2, 0, e.spin.z) : _.set(e.spin.x, e.spin.y, e.spin.z), W.setFromEuler(_);
        const d = e.landed > 0 ? Math.max(0, 1 - Math.max(0, e.landed - 1.2) / 1.3) : 1;
        Y.setScalar(e.size * d), U.compose(e.p, W, Y), o.petals.setMatrixAt(o.FALLING + s, U);
    } o.petals.instanceMatrix.needsUpdate = !0; }
    return { merge, buildJacTree, tickJacTree, shakeJacTree };
}
const tree = treeToolkit();
function plantToolkit() {
    const n = THREE, S = false, I = tree.merge;
    const C = S ? 4 : 5, B = S ? 20 : 34, k = S ? 40 : 70, T = 1, F = o => { let t = o >>> 0; return () => (t = t * 1664525 + 1013904223 >>> 0) / 4294967296; };
    function D(o, t, s, e) { const a = document.createElement("canvas"); a.width = o, a.height = t, s(a.getContext("2d"), o, t); const r = new n.CanvasTexture(a); return r.colorSpace = n.SRGBColorSpace, e && (r.wrapS = r.wrapT = n.RepeatWrapping, r.repeat.set(...e)), r; }
    const P = (o, t, s) => D(256, 256, e => { const a = F(s); e.fillStyle = o, e.fillRect(0, 0, 256, 256); for (let r = 0; r < 2600; r++)
        e.fillStyle = t[Math.floor(a() * t.length)], e.save(), e.translate(a() * 256, a() * 256), e.rotate(a() * 6.3), e.beginPath(), e.ellipse(0, 0, 3 + a() * 2.5, 1.6 + a() * 1.2, 0, 0, 7), e.fill(), e.restore(); }, [3, 2]), H = () => D(64, 256, (o, t, s) => { o.strokeStyle = "#4F7D3B", o.lineWidth = 2, o.beginPath(), o.moveTo(t / 2, s), o.lineTo(t / 2, 4), o.stroke(); for (let e = s - 10; e > 8; e -= 9) {
        const a = e / s, r = 6 + a * 22;
        o.fillStyle = a > .5 ? "#6C9F4E" : "#7DAF5B";
        for (const l of [-1, 1])
            o.beginPath(), o.ellipse(t / 2 + l * r / 2, e - 2, r / 2, 3.2, l * -.35, 0, 7), o.fill();
    } }), O = () => D(128, 256, (o, t, s) => { const e = new Path2D(`M${t / 2} ${s - 4} C${t * .05} ${s * .7} ${t * .02} ${s * .25} ${t / 2} 6 C${t * .98} ${s * .25} ${t * .95} ${s * .7} ${t / 2} ${s - 4}Z`); o.fillStyle = "#F2F0DA", o.fill(e), o.save(), o.translate(t / 2, s / 2), o.scale(.82, .9), o.translate(-t / 2, -s / 2), o.fillStyle = "#5E8F4A", o.fill(e), o.restore(), o.strokeStyle = "rgba(40,80,40,.35)", o.lineWidth = 1.5; for (const a of [-26, -13, 0, 13, 26])
        o.beginPath(), o.moveTo(t / 2, s - 10), o.quadraticCurveTo(t / 2 + a * 1.2, s / 2, t / 2 + a * .4, 20), o.stroke(); });
    function G(o, t = 20, s = 14, e = .09) { const a = new n.SphereGeometry(1, t, s), r = a.attributes.position, l = new n.Vector3; for (let i = 0; i < r.count; i++)
        l.fromBufferAttribute(r, i), l.multiplyScalar(1 + Math.sin(l.x * 4.1 + o) * Math.sin(l.y * 3.7 + o * 1.3) * Math.sin(l.z * 4.4 + o * .7) * e), r.setXYZ(i, l.x, l.y, l.z); return a.computeVertexNormals(), a; }
    function _(o, t, s) { const e = new n.PlaneGeometry(o, t, 1, 8); e.translate(0, t / 2, 0); const a = e.attributes.position; for (let r = 0; r < a.count; r++) {
        const l = a.getY(r) / t;
        a.setXYZ(r, a.getX(r), Math.sin(l * Math.PI * .62) * t * s, l * t * .95);
    } return e.computeVertexNormals(), e; }
    function W(o) { const t = []; for (let s = 0; s < 8; s++) {
        const e = .25 + o() * .3, a = new n.ConeGeometry(.035, e, 3);
        a.translate(0, e / 2, 0);
        const r = o() * Math.PI * 2;
        a.rotateZ(.25 + o() * .45), a.rotateY(r), a.translate(Math.cos(r) * .05, 0, Math.sin(r) * .05), t.push(a);
    } return I(t); }
    function Q(o) { const t = []; for (let l = 0; l < 34; l++) {
        const i = .9 + o() * .7, c = new n.PlaneGeometry(.05, i, 1, 6);
        c.translate(0, i / 2, 0);
        const d = c.attributes.position, u = .6 + o() * .9, h = [];
        for (let f = 0; f < d.count; f++) {
            const M = d.getY(f) / i;
            d.setXYZ(f, d.getX(f) * (1 - M * .7), d.getY(f) * (1 - M * M * .45), M * M * u);
            const x = new n.Color(8366168).lerp(new n.Color(14274460), Math.pow(M, 1.6));
            h.push(x.r, x.g, x.b);
        }
        c.setAttribute("color", new n.Float32BufferAttribute(h, 3)), c.rotateY(o() * Math.PI * 2), t.push(c);
    } const s = t.map(l => l.attributes.color.array), e = I(t), a = new Float32Array(e.attributes.position.count * 3); let r = 0; for (const l of s)
        a.set(l, r), r += l.length; return e.setAttribute("color", new n.BufferAttribute(a, 3)), e.computeVertexNormals(), e; }
    let A = null;
    function m() { if (A)
        return A; const o = F(77); return A = { ball: G(2.3), ballMat: new n.MeshStandardMaterial({ map: P("#5E8A45", ["#4E7A3A", "#6F9A50", "#86AE5E", "#557F40", "#9CBF6E"], 41), roughness: .95 }), cone: (() => { const t = new n.ConeGeometry(.62, 1, 16, 8); t.translate(0, .5, 0); const s = t.attributes.position, e = new n.Vector3; for (let a = 0; a < s.count; a++) {
            e.fromBufferAttribute(s, a);
            const r = 1 + Math.sin(e.y * 19 + Math.atan2(e.z, e.x) * 5) * .05;
            s.setXYZ(a, e.x * r, e.y, e.z * r);
        } return t.computeVertexNormals(), t; })(), coneMat: new n.MeshStandardMaterial({ map: P("#3F6B3A", ["#355F33", "#4C7A45", "#2F5530", "#5A8850"], 52), roughness: .95 }), trunk: new n.CylinderGeometry(.06, .08, .3, 6).translate(0, .15, 0), trunkMat: new n.MeshStandardMaterial({ color: 7232074, roughness: 1 }), floret: new n.IcosahedronGeometry(.075, 0), floretMat: new n.MeshStandardMaterial({ roughness: .75, emissive: 2367546, emissiveIntensity: .2 }), leaf: new n.IcosahedronGeometry(.22, 0), leafMat: new n.MeshStandardMaterial({ roughness: .85 }), stem: new n.CylinderGeometry(.012, .016, 1, 4).translate(0, .5, 0), stemMat: new n.MeshStandardMaterial({ color: 9414522, roughness: .9 }), spike: new n.CylinderGeometry(.018, .04, 1, 6).translate(0, .5, 0), spikeMat: new n.MeshStandardMaterial({ roughness: .8, emissive: 2760776, emissiveIntensity: .25 }), mound: G(5.1, 12, 8), moundMat: t => new n.MeshStandardMaterial({ color: t, roughness: .95 }), bell: new n.ConeGeometry(.06, .13, 7, 1, !0).rotateX(Math.PI).translate(0, -.06, 0), bellMat: new n.MeshStandardMaterial({ roughness: .7, side: n.DoubleSide, emissive: 2760240, emissiveIntensity: .2 }), grass: Q(o), grassMat: new n.MeshStandardMaterial({ vertexColors: !0, roughness: .9, side: n.DoubleSide }), rose: new n.IcosahedronGeometry(.075, 1), roseMat: new n.MeshStandardMaterial({ roughness: .7, emissive: 4208696, emissiveIntensity: .25 }), frond: _(.32, 1.1, .55), frondMat: new n.MeshStandardMaterial({ map: H(), alphaTest: .4, side: n.DoubleSide, roughness: .9 }), hostaLeaf: _(.42, .75, .45), hostaMat: new n.MeshStandardMaterial({ map: O(), alphaTest: .4, side: n.DoubleSide, roughness: .85 }), daisy: new n.IcosahedronGeometry(.045, 0), daisyMat: new n.MeshStandardMaterial({ roughness: .7, emissive: 4209736, emissiveIntensity: .25 }), pebble: G(9.3, 12, 8, .12), pebbleMat: new n.MeshStandardMaterial({ roughness: .9 }), tuft: W(o), tuftMat: new n.MeshStandardMaterial({ roughness: .9, side: n.DoubleSide }), tuftGreen: new n.MeshStandardMaterial({ color: 8828246, roughness: .9, side: n.DoubleSide }), stone: new n.CylinderGeometry(.46, .5, .1, 18), stoneMat: new n.MeshStandardMaterial({ color: 15854300, roughness: .95, emissive: 15854300, emissiveIntensity: .12 }) }, A; }
    const V = new n.Matrix4, L = new n.Quaternion, $ = new n.Euler, Y = new n.Vector3, N = new n.Vector3, U = new n.Color;
    function y(o, t, s) { const e = new n.InstancedMesh(o, t, s); return e.count = 0, e.castShadow = !0, e.receiveShadow = !0, e.add1 = (a, r, l, i, c, d, u, h, f, M) => { N.set(a, r, l), $.set(i, c, d), L.setFromEuler($), Y.set(u, h, f), V.compose(N, L, Y), e.setMatrixAt(e.count, V), M != null && e.setColorAt(e.count, U.setHex(M)), e.count++; }, e; }
    const p = (o, t, s = 0) => { const e = new n.Mesh(o, t); return e.position.y = s, e.castShadow = e.receiveShadow = !0, e; }, X = { blue: [8294368, 9214952, 7307222, 10135532], lilac: [10783709, 11771366, 9730514, 12693484], white: [16052984, 15592437, 16777215, 14935795] };
    const PLANTS = { ball: { name: "圆灌木球", variants: { l: "大", m: "中", s: "小" }, build(o, t) { const s = m(), e = { l: 1.35, m: 1, s: .7 }[o] || 1, a = new n.Group, r = p(s.ball, s.ballMat, e * .62); return r.scale.set(e * (1 + t() * .1), e * (.82 + t() * .1), e * (1 + t() * .1)), r.rotation.y = t() * 6.3, a.add(r), a; } }, cone: { name: "尖塔小柏树", variants: { tall: "高", short: "矮" }, build(o) { const t = m(), s = o === "short" ? 1.5 : 2.4, e = new n.Group, a = p(t.cone, t.coneMat, .22); return a.scale.set(o === "short" ? .85 : 1, s, o === "short" ? .85 : 1), e.add(p(t.trunk, t.trunkMat), a), e; } }, hydrangea: { name: "绣球", variants: { blue: "蓝紫", lilac: "淡紫", white: "白" }, build(o, t) { const s = m(), e = X[o] || X.blue, a = new n.Group, r = y(s.leaf, s.leafMat, 16), l = y(s.floret, s.floretMat, C * B); for (let i = 0; i < 16; i++) {
                const c = t() * 6.3, d = t() * .55;
                r.add1(Math.cos(c) * d, .18 + t() * .45, Math.sin(c) * d, (t() - .5) * .9, c, (t() - .5) * .9, 1.5, .28, .95, t() < .5 ? 6130247 : 7248981);
            } for (let i = 0; i < C; i++) {
                const c = i / C * 6.3 + t(), d = .15 + t() * .4, u = Math.cos(c) * d, h = Math.sin(c) * d, f = .55 + t() * .45, M = .24 + t() * .1, x = e[Math.floor(t() * 4)];
                for (let v = 0; v < B; v++) {
                    const g = .75 + t() * .25, z = t() * 6.3, b = Math.acos(1 - t() * 1.6), w = .8 + t() * .5;
                    l.add1(u + Math.sin(b) * Math.cos(z) * M * g, f + Math.cos(b) * M * g, h + Math.sin(b) * Math.sin(z) * M * g, t() * 6.3, t() * 6.3, t() * 6.3, w, w * .7, w, t() < .75 ? x : e[Math.floor(t() * 4)]);
                }
            } return a.add(r, l), a; } }, lavender: { name: "薰衣草", build(o, t) { const s = m(), e = new n.Group, a = 22, r = p(s.mound, s.moundMat(10137222), .12); r.scale.set(.42, .24, .42); const l = y(s.stem, s.stemMat, a), i = y(s.spike, s.spikeMat, a); for (let c = 0; c < a; c++) {
                const d = t() * 6.3, u = t() * .28, h = .08 + t() * .28, f = .55 + t() * .3, M = Math.cos(d) * u, x = Math.sin(d) * u;
                l.add1(M, .1, x, Math.sin(d) * h, 0, -Math.cos(d) * h, 1, f, 1), i.add1(M + Math.cos(d) * Math.sin(h) * f, .1 + Math.cos(h) * f, x + Math.sin(d) * Math.sin(h) * f, Math.sin(d) * h, 0, -Math.cos(d) * h, 1, .2 + t() * .1, 1, [9337289, 10258644, 8350654, 11114204][Math.floor(t() * 4)]);
            } return e.add(r, l, i), e; } }, foxglove: { name: "毛地黄", variants: { pink: "紫粉", white: "白" }, build(o, t) { const s = m(), e = new n.Group, a = 5, r = 16, l = o === "white" ? [16249850, 15591154, 16777215] : [13209545, 12025538, 14132180, 11106232], i = y(s.leaf, s.leafMat, 12), c = y(s.stem, s.stemMat, a), d = y(s.bell, s.bellMat, a * r); for (let u = 0; u < 12; u++) {
                const h = t() * 6.3;
                i.add1(Math.cos(h) * .25, .1, Math.sin(h) * .25, .3, h, 0, 1.6, .25, .8, 6986320);
            } for (let u = 0; u < a; u++) {
                const h = t() * 6.3, f = t() * .22, M = 1.1 + t() * .55, x = Math.cos(h) * f, v = Math.sin(h) * f;
                c.add1(x, 0, v, 0, 0, 0, 1.2, M, 1.2);
                for (let g = 0; g < r; g++) {
                    const z = M * (.42 + g / r * .55), b = g * 2.4, w = .07, E = 1 - g / r * .55;
                    d.add1(x + Math.cos(b) * w, z, v + Math.sin(b) * w, .5 * Math.sin(b), 0, -.5 * Math.cos(b), E, E, E, l[Math.floor(t() * l.length)]);
                }
            } return e.add(i, c, d), e; } }, grass: { name: "观赏草", build(o, t) { const s = m(), e = new n.Group, a = p(s.grass, s.grassMat); return a.rotation.y = t() * 6.3, e.add(a), e; } }, rose: { name: "白色小月季", build(o, t) { const s = m(), e = new n.Group, a = p(s.ball, s.ballMat, .3); a.scale.set(.5, .42, .5); const r = y(s.rose, s.roseMat, 10); for (let l = 0; l < 10; l++) {
                const i = t() * 6.3, c = t() * 1.2;
                r.add1(Math.cos(i) * Math.sin(c) * .5, .3 + Math.cos(c) * .42, Math.sin(i) * Math.sin(c) * .5, 0, t() * 6.3, 0, 1, .8, 1, [16777215, 16511987, 16247276][Math.floor(t() * 3)]);
            } return e.add(a, r), e; } }, hosta: { name: "玉簪", build(o, t) { const s = m(), e = new n.Group, a = y(s.hostaLeaf, s.hostaMat, 12); for (let r = 0; r < 12; r++) {
                const l = r / 12 * 6.3 + t() * .3, i = .8 + t() * .4;
                a.add1(0, .02, 0, -.2 + t() * .3, l, 0, i, i, i);
            } return e.add(a), e; } }, fern: { name: "蕨", build(o, t) { const s = m(), e = new n.Group, a = y(s.frond, s.frondMat, 9); for (let r = 0; r < 9; r++) {
                const l = r / 9 * 6.3 + t() * .4;
                a.add1(0, .02, 0, -.15 + t() * .3, l, 0, .85 + t() * .3, .8 + t() * .4, .85 + t() * .3);
            } return e.add(a), e; } }, daisy: { name: "小白花", build(o, t) { const s = m(), e = new n.Group, a = .55, r = p(s.mound, s.moundMat(6262344), .04); r.scale.set(a, .16, a * .85); const l = y(s.leaf, s.leafMat, 10), i = y(s.daisy, s.daisyMat, k); for (let c = 0; c < 10; c++) {
                const d = t() * 6.3, u = t() * a * .9;
                l.add1(Math.cos(d) * u, .08, Math.sin(d) * u, 0, d, 0, .7, .15, .5, 6986320);
            } for (let c = 0; c < k; c++) {
                const d = t() * 6.3, u = Math.sqrt(t()) * a;
                i.add1(Math.cos(d) * u, .06 + .16 * Math.sqrt(Math.max(0, 1 - (u / a) ** 2)), Math.sin(d) * u * .85, 0, t() * 6.3, 0, 1, .6, 1, t() < .85 ? 16777215 : 16182182);
            } return e.add(r, l, i), e; } }, pebbles: { name: "卵石", build(o, t) { const s = m(), e = new n.Group, a = y(s.pebble, s.pebbleMat, 3); return [[0, 0, .32], [.42, .18, .22], [-.2, .38, .17]].forEach(([r, l, i]) => a.add1(r, i * .35, l, 0, t() * 6.3, 0, i * 1.3, i * .7, i, [14275270, 13222325, 15130838][Math.floor(t() * 3)])), e.add(a), e; } }, tuft: { name: "小草丛", build(o, t) { const s = m(), e = new n.Group; return e.add(p(s.tuft, s.tuftGreen)), e; } }, stone: { name: "踏脚石", build(o, t) { const s = m(), e = new n.Group, a = p(s.stone, s.stoneMat, .05); return a.scale.set(1.15, 1, .9), a.castShadow = !1, e.add(a), e; } } };
    function spawnPlant(o) { const t = PLANTS[o.t]; if (!t)
        return null; const s = F(Math.round((o.x + 50) * 997 + (o.z + 50) * 131)), e = t.build(o.v, s); return e.position.set(o.x, T, o.z), e.rotation.y = o.ry || 0, e.scale.setScalar(o.s || 1), e.userData.gardenItem = o.t, e; }
    return { PLANTS, spawnPlant };
}
const plants = plantToolkit();
const animated = new WeakMap();
export function createVegetation(type, { variant, seed = 77, x = 0, y = 0, z = 0, scale = 1 } = {}) {
    let model;
    if (type === 'jacaranda') {
        const holder = new THREE.Group(), state = {};
        model = tree.buildJacTree(holder, state);
        holder.remove(model);
        model.position.set(0, 0, 0);
        animated.set(model, state);
        tree.tickJacTree(state, 0, 0);
    }
    else {
        const asset = plants.PLANTS[type];
        if (!asset)
            throw new Error('Unknown vegetation: ' + type);
        let value = seed >>> 0;
        const random = () => ((value = (value * 1664525 + 1013904223) >>> 0) / 4294967296);
        model = asset.build(variant, random);
    }
    model.name = 'vegetation-' + type + (variant ? '-' + variant : '');
    model.position.set(x, y, z);
    model.scale.multiplyScalar(scale);
    return model;
}
export function animateVegetation(model, time, delta) { const state = animated.get(model); if (state)
    tree.tickJacTree(state, time, delta); }
export function shakeVegetation(model, time) { const state = animated.get(model); if (state)
    tree.shakeJacTree(state, time); }
export const plantTypes = plants.PLANTS;
