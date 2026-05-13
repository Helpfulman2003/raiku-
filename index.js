var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 0, 80);
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0x050505);
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

var pointLight = new THREE.PointLight(0xccff00, 1, 100);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);


var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.maxDistance = 150;
controls.enableDamping = true;

// Dragon (Raiku)

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
        let action = mixer.clipAction(gltf.animations[0]);
        action.play();
    }

    // Path setup
    let cPts = [];
    let cSegments = 12;
    for (let i = 0; i < cSegments; i++) {
        let angle = (i / cSegments) * Math.PI * 2;
        let radius = 50;
        cPts.push(
            new THREE.Vector3(
                Math.cos(angle) * radius,
                Math.sin(angle * 2) * 10,
                Math.sin(angle) * radius
            )
        );
    }
    curve = new THREE.CatmullRomCurve3(cPts);
    curve.closed = true;

    // Scale model
    model.scale.set(0.08, 0.08, 0.08);
    
    // Materials
    model.traverse(child => {
        if (child.isMesh) {
            child.material.wireframe = true;
            child.material.color.set(0xccff00);
            child.material.emissive = new THREE.Color(0xccff00);
            child.material.emissiveIntensity = 1.0;
        }
    });

    scene.add(model);
});

var clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    controls.update();
    let dt = clock.getDelta();
    let t = clock.getElapsedTime();
    
    if (mixer) mixer.update(dt);
    
    if (model && curve) {
        let progress = (t * 0.02) % 1; 
        let pos = curve.getPointAt(progress);
        let tangent = curve.getTangentAt(progress);
        
        model.position.copy(pos);
        model.lookAt(pos.clone().add(tangent));
    }
    
    renderer.render(scene, camera);
});

