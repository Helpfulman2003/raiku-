var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, -25, 80);
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0x181005);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);


window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
})

var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

var hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
scene.add(hemisphereLight);

var directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);


var pointLight = new THREE.PointLight(0xff6600, 1, 100);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);


var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.maxDistance = 150;
controls.enableDamping = true;

// lanterns

let geoms = [];
let pts = [
    new THREE.Vector2(0, 1. - 0),
    new THREE.Vector2(0.25, 1. - 0),
    new THREE.Vector2(0.25, 1. - 0.125),
    new THREE.Vector2(0.45, 1. - 0.125),
    new THREE.Vector2(0.45, 1. - 0.95)
];
var geom = new THREE.LatheBufferGeometry(pts, 20);
geoms.push(geom);

var geomLight = new THREE.CylinderBufferGeometry(0.1, 0.1, 0.05, 20);
//geomLight.rotateX(Math.PI * 0.5);
geoms.push(geomLight);

var fullGeom = THREE.BufferGeometryUtils.mergeBufferGeometries(geoms);

var instGeom = new THREE.InstancedBufferGeometry().copy(fullGeom);

var num = 500;
let instPos = []; //3
let instSpeed = []; //1
let instLight = []; // 2 (initial intensity, frequency)
for (let i = 0; i < num; i++) {
    instPos.push(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
    instSpeed.push(Math.random() * 0.25 + 1);
    instLight.push(Math.PI + (Math.PI * Math.random()), Math.random() + 5);
}
instGeom.setAttribute("instPos", new THREE.InstancedBufferAttribute(new Float32Array(instPos), 3));
instGeom.setAttribute("instSpeed", new THREE.InstancedBufferAttribute(new Float32Array(instSpeed), 1));
instGeom.setAttribute("instLight", new THREE.InstancedBufferAttribute(new Float32Array(instLight), 2));

var mat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uLight: { value: new THREE.Color(0xccff00).multiplyScalar(1.5) },
        uColor: { value: new THREE.Color(0x334400).multiplyScalar(1) },
        uFire: { value: new THREE.Color(0xffff00) }

    },

    vertexShader: `
    uniform float uTime;

    attribute vec3 instPos;
    attribute float instSpeed;
    attribute vec2 instLight;

    varying vec2 vInstLight;
    varying float vY;
    
    void main() {
      
      vInstLight = instLight;
      vY = position.y;

      vec3 pos = vec3(position) * 2.;
      vec3 iPos = instPos * 200.;
      
      iPos.xz += vec2(
        cos(instLight.x + instLight.y * uTime),
        sin(instLight.x + instLight.y * uTime * fract(sin(instLight.x)))
      );

      iPos.y = mod(iPos.y + 100. + (uTime * instSpeed), 200.) - 100.;
      pos += iPos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
    }
`,
    fragmentShader: `
    uniform float uTime;
    uniform vec3 uLight;
    uniform vec3 uColor;
    uniform vec3 uFire;

    varying vec2 vInstLight;
    varying float vY;
    
    void main() {
      
      vec3 col = vec3(0);
      float t = vInstLight.x + (vInstLight.y * uTime * 10.);
      float ts = sin(t * 3.14) * 0.5 + 0.5;
      float tc = cos(t * 2.7) * 0.5 + 0.5;
      float f = smoothstep(0.12, 0.12 + (ts + tc) * 0.25, vY);
      float li = (0.5 + smoothstep(0., 1., ts * ts + tc * tc) * 0.5);
      col = mix(uLight * li, uColor * (0.75 + li * 0.25), f);

      col = mix(col, uFire, step(vY, 0.05) * (0.75 + li * 0.25));

      gl_FragColor = vec4(col, 1);
    }
`,
    side: THREE.DoubleSide
});

var lantern = new THREE.Mesh(instGeom, mat);
scene.add(lantern);

// Koi

let mixer;
let model;
let curve;





let loader = new THREE.GLTFLoader();
loader.load("dragon_fly.glb", gltf => {
    model = gltf.scene;
    console.log("GLB loaded", gltf);

    // Setup animations
    if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        // Play only the first clip (usually the main one) to avoid conflicts
        let action = mixer.clipAction(gltf.animations[0]);
        action.play();
    }

    // Complex random path setup
    let cPts = [];
    let cSegments = 12; // More segments for a more complex "random" orbit
    for (let i = 0; i < cSegments; i++) {
        let angle = (i / cSegments) * Math.PI * 2;
        let radius = THREE.MathUtils.randFloat(30, 60); // Reverted radius
        cPts.push(
            new THREE.Vector3(
                Math.cos(angle) * radius,
                THREE.MathUtils.randFloat(-20, 20), // Reverted vertical variety
                Math.sin(angle) * radius
            )
        );


    }
    curve = new THREE.CatmullRomCurve3(cPts);
    curve.closed = true;

    // Scale model
    model.scale.set(0.05, 0.05, 0.05);
    
    // Ensure materials are visible and set to wireframe
    model.traverse(child => {
        if (child.isMesh) {
            child.material.wireframe = true;
            child.material.color.set(0xccff00); // Specific lime neon green
            child.material.emissive = new THREE.Color(0xccff00);

            child.material.emissiveIntensity = 0.5;
        }
    });





    scene.add(model);
});

var clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    controls.update();
    let dt = clock.getDelta();
    let t = clock.getElapsedTime();
    
    mat.uniforms.uTime.value = t;
    
    if (mixer) mixer.update(dt);
    
    if (model && curve) {
        // Slow movement speed (0.02 instead of 0.05)
        let progress = (t * 0.015) % 1; 
        let pos = curve.getPointAt(progress);
        let tangent = curve.getTangentAt(progress);
        
        model.position.copy(pos);
        model.lookAt(pos.clone().add(tangent));
    }
    
    renderer.render(scene, camera);
});
