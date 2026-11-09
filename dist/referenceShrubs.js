// Author permission for this vegetation excerpt was confirmed by the user.
// @ts-expect-error Plain JavaScript excerpt preserves the authorized original functions.
import { createAuthorizedShrub } from '../reference/authorized-vegetation/shrub.js';
export function createReferenceShrub(x, z, size, groundY) {
    const seed = Math.round((x + 50) * 997 + (z + 50) * 131);
    const model = createAuthorizedShrub('m', seed);
    model.name = 'authorized-reference-shrub';
    model.scale.setScalar(size * 1.15);
    model.position.set(x, groundY + .012, z);
    model.userData = { source: 'hi.jessie authorized vegetation excerpt', originalSite: [x, z, size], scaleOnly: true };
    model.traverse(object => { if (object.isMesh)
        object.name = 'reference-leaf-textured-shrub'; });
    return model;
}
