/*! © 2026 hi.jessie (hijessie.space). All rights reserved. 未经许可请勿复制、转载或商用。 */

// Vegetation excerpt reused with author permission reported by the user, 2026-11-08.

// Source: https://hijessie.space/js/garden.js?v=fd9fa57b5d

import * as n from "three";

const F=o=>{let t=o>>>0;return()=>(t=t*1664525+1013904223>>>0)/4294967296};

function D(o,t,s,e){const a=document.createElement("canvas");a.width=o,a.height=t,s(a.getContext("2d"),o,t);const r=new n.CanvasTexture(a);return r.colorSpace=n.SRGBColorSpace,e&&(r.wrapS=r.wrapT=n.RepeatWrapping,r.repeat.set(...e)),r}

const P=(o,t,s)=>D(256,256,e=>{const a=F(s);e.fillStyle=o,e.fillRect(0,0,256,256);for(let r=0;r<2600;r++)e.fillStyle=t[Math.floor(a()*t.length)],e.save(),e.translate(a()*256,a()*256),e.rotate(a()*6.3),e.beginPath(),e.ellipse(0,0,3+a()*2.5,1.6+a()*1.2,0,0,7),e.fill(),e.restore()},[3,2]);

function G(o,t=20,s=14,e=.09){const a=new n.SphereGeometry(1,t,s),r=a.attributes.position,l=new n.Vector3;for(let i=0;i<r.count;i++)l.fromBufferAttribute(r,i),l.multiplyScalar(1+Math.sin(l.x*4.1+o)*Math.sin(l.y*3.7+o*1.3)*Math.sin(l.z*4.4+o*.7)*e),r.setXYZ(i,l.x,l.y,l.z);return a.computeVertexNormals(),a}

let A=null;

function m(){return A||(A={ball:G(2.3),ballMat:new n.MeshStandardMaterial({map:P("#5E8A45",["#4E7A3A","#6F9A50","#86AE5E","#557F40","#9CBF6E"],41),roughness:.95})});}

const p=(o,t,s=0)=>{const e=new n.Mesh(o,t);return e.position.y=s,e.castShadow=e.receiveShadow=!0,e};

const PLANTS={ball:{name:"圆灌木球",variants:{l:"大",m:"中",s:"小"},build(o,t){const s=m(),e={l:1.35,m:1,s:.7}[o]||1,a=new n.Group,r=p(s.ball,s.ballMat,e*.62);return r.scale.set(e*(1+t()*.1),e*(.82+t()*.1),e*(1+t()*.1)),r.rotation.y=t()*6.3,a.add(r),a}}};

export function createAuthorizedShrub(variant,seed){return PLANTS.ball.build(variant,F(seed));}