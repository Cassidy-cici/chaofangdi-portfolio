import * as THREE from 'three';
/** Original illustrated portrait, drawn in code; not an inferred likeness. */
export function createPortraitTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 960;
    const c = canvas.getContext('2d');
    c.scale(.768, .96);
    const path = (d, color) => { c.fillStyle = color; c.fill(new Path2D(d)); };
    const line = (d, color, width) => { c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(new Path2D(d)); };
    const bg = c.createLinearGradient(0, 0, 1000, 1000);
    bg.addColorStop(0, '#f7edda');
    bg.addColorStop(1, '#e2cead');
    c.fillStyle = bg;
    c.fillRect(0, 0, 1000, 1000);
    // Sage shoulder silhouette and ivory collar.
    path('M 103 1000 C 102 843 215 806 383 776 L 622 776 C 802 807 894 858 914 1000 Z', '#7e9678');
    path('M 412 665 L 409 796 C 456 866 554 866 601 795 L 585 654 Z', '#e9bd9a');
    path('M 367 787 L 411 775 Q 453 859 505 855 Q 566 853 602 776 L 651 793 Q 603 908 504 916 Q 414 907 367 787 Z', '#f5e9d4');
    // Continuous bob mass. Ends meet the chin rather than the shoulders.
    const hair = c.createLinearGradient(200, 180, 790, 650);
    hair.addColorStop(0, '#6c4232');
    hair.addColorStop(.50, '#815039');
    hair.addColorStop(1, '#563427');
    c.fillStyle = hair;
    c.fill(new Path2D('M 239 552 C 204 405 224 198 414 161 C 525 123 705 177 749 309 C 784 415 756 590 723 682 Q 663 712 617 678 L 377 680 Q 294 712 245 675 Q 230 622 239 552 Z'));
    // Warm face with a softly tapered jaw.
    const skin = c.createLinearGradient(300, 260, 690, 675);
    skin.addColorStop(0, '#f5d8b8');
    skin.addColorStop(1, '#e9bf9e');
    c.fillStyle = skin;
    c.fill(new Path2D('M 327 307 Q 420 232 596 266 Q 686 309 682 436 C 680 567 627 682 516 704 C 401 692 327 586 320 465 Q 308 373 327 307 Z'));
    // Side part, rounded fringe, and tucked face-framing sides.
    path('M 278 430 Q 252 232 415 185 Q 513 153 581 211 C 545 283 451 337 331 346 Q 321 408 318 465 Q 286 455 278 430 Z', '#75472f');
    path('M 572 209 Q 689 228 719 351 L 710 562 Q 696 653 656 680 L 614 674 Q 663 555 670 447 C 671 340 608 312 572 209 Z', '#69412e');
    path('M 321 361 Q 300 450 317 563 Q 329 629 371 678 Q 316 695 279 675 Q 261 579 274 458 Z', '#764b34');
    line('M 319 319 Q 343 226 455 204', '#9c6d49', 9);
    line('M 286 431 Q 275 571 311 646', '#976542', 6);
    line('M 706 394 Q 722 525 683 643', '#8d5d3e', 6);
    // Small calm features, deliberately understated at whole-house scale.
    line('M 383 444 Q 416 427 449 442', '#805846', 7);
    line('M 556 443 Q 588 430 620 446', '#805846', 7);
    line('M 388 478 Q 416 463 445 479', '#634b3f', 6);
    line('M 560 479 Q 586 465 613 480', '#634b3f', 6);
    path('M 411 474 Q 408 491 417 493 Q 426 491 423 474 Z', '#493f35');
    path('M 580 475 Q 577 492 586 494 Q 595 492 592 475 Z', '#493f35');
    line('M 508 484 Q 502 526 488 546 Q 502 556 517 549', '#c59578', 4);
    const blush = (x) => { const g = c.createRadialGradient(x, 550, 2, x, 550, 42); g.addColorStop(0, '#e7ac98aa'); g.addColorStop(1, '#e7ac9800'); c.fillStyle = g; c.beginPath(); c.ellipse(x, 550, 43, 21, 0, 0, Math.PI * 2); c.fill(); };
    blush(383);
    blush(623);
    line('M 455 594 Q 502 620 548 592', '#af796c', 6);
    line('M 483 628 Q 506 635 527 627', '#d6a588', 3);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    t.name = 'chin-length-bob-portrait';
    return t;
}
