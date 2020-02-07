var scene, camera, renderer, light;
var earthRotY = 0,
    moonRotY = 0;
var radY = 0,
    radZ = -0.3;
var moonDist = 70;
var earthRadius = 35;
var earthMesh, tmpMesh;
var moonMesh;
var positionHistory = [];
var lastPos, diffMove, lastEarthScale;
var ping = 0;
var counter = 0;

function init(width, height) {


    width = widthScene;
    height = heightScene;
    scene = new THREE.Scene();
    counter += 1;
    if (counter < 2) return
        // Setup cameta with 45 deg field of view and same aspect ratio
    var aspect = width / height;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    // Set the camera to 400 units along `z` axis
    camera.position.set(0, 0, 400);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.domElement.style.position = 'absolute'; // required
    renderer.domElement.style.top = "0px";
    renderer.domElement.style.left = "0px";
    renderer.domElement.style.zIndex = "1"; // required
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
}

function initLight() {
    light = new THREE.SpotLight(0xffffff);
    // Position the light slightly to a side to make 
    // shadows look better.
    light.position.set(400, 100, 1000);
    light.castShadow = true;
    scene.add(light);
}

function initEarth() {
    // Load Earth texture and create material from it
    var earthTexture = THREE.ImageUtils.loadTexture("./images/earthmap1k.jpg");
    earthTexture.minFilter = THREE.NearestFilter;
    var earthMaterial = new THREE.MeshLambertMaterial({
        map: earthTexture,
    });
    // Create a sphere 25 units in radius and 16 segments
    // both horizontally and vertically.
    var earthGeometry = new THREE.SphereGeometry(earthRadius, 16, 16);
    earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMesh.receiveShadow = true;
    earthMesh.castShadow = true;
    // Add Earth to the scene
    scene.add(earthMesh);
}

function initMoon() {
    var moonTexture = THREE.ImageUtils.loadTexture("./images/moonmap1k-lowres.jpg");
    moonTexture.minFilter = THREE.NearestFilter;
    var moonMaterial = new THREE.MeshLambertMaterial({
        map: moonTexture,
    });
    var moonGeometry = new THREE.SphereGeometry(earthRadius * 0.273, 10, 10);
    moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMesh.receiveShadow = true;
    moonMesh.castShadow = true;
    scene.add(moonMesh);
}

function initPlane() {
    // The plane needs to be large to be sure it'll always intersect
    var tmpGeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
    tmpGeometry.position = new THREE.Vector3(0, 0, 0);
    tmpMesh = new THREE.Mesh(tmpGeometry);
}

// Update position of objects in the scene
function update() {
    if (positionHistory.length === 0) {
        return;
    }

    if (diffMove.length === 0) {
        return;
    }


    earthRotY += 0.014;

    ping++;
    if (ping < 10) {
        lastPos[0] += diffMove[0];
        lastPos[1] += diffMove[1];
        lastPos[2] += diffMove[2];
    }

    var vector = new THREE.Vector3(parseFloat(lastPos[0]), parseFloat(lastPos[1]), parseFloat(0.5));

    var intersects = checkIntersect(vector);

    earthMesh.rotation.y = earthRotY;
    //With position from OpenCV I could possibly move the Earth outside of the window
    if (intersects) {
        var point = intersects[0].point;
        // earthMesh.position.x = 0;
        // earthMesh.position.y = 0;
        earthMesh.position.x = point.x;
        earthMesh.position.y = point.y;

        // X pos + radius
        var vector = new THREE.Vector3(lastPos[0] + lastPos[2], lastPos[1], 0.5);
        var intersect = checkIntersect(vector);

        var newEarthRadius = Math.abs(intersect[0].point.x - earthMesh.position.x);
        var earthScale = newEarthRadius / earthRadius;

        earthMesh.scale.set(earthScale, earthScale, earthScale);
        moonMesh.scale.set(earthScale, earthScale, earthScale);

        lastEarthScale = earthScale;
    }

    moonRotY += 0.005;
    radY += 0.03;
    radZ += 0.005;

    // Update Moon position
    x = lastEarthScale * moonDist * Math.cos(radZ) * Math.sin(radY);
    y = lastEarthScale * moonDist * Math.sin(radZ) * Math.sin(radY);
    z = lastEarthScale * moonDist * Math.cos(radY);

    moonMesh.position.set(x + earthMesh.position.x, y + earthMesh.position.y, z);
    moonMesh.rotation.y = moonRotY;

}

function checkIntersect(vector) {
    // Unproject camera distortion (fov, aspect ratio)
    vector.unproject(camera);
    var norm = vector.sub(camera.position).normalize();

    var ray = new THREE.Raycaster(camera.position, norm);
    //ray.setFromCamera(vector, camera);
    tmpMesh.updateMatrixWorld(true);
    ray.setFromCamera(vector, this.camera);
    let intersect = ray.intersectObject(tmpMesh);
    // Cast a line from our camera to the tmpMesh and see where these
    // two intersect. That's our 2D position in 3D coordinates.
    //var intersect = ray.intersectObject(tmpMesh);
    var intersects = [{ point: intersect[0].point }]

    return intersects;
}

// Redraw entire scene
function render() {
    update();

    renderer.setClearColor(0x000000, 0);
    renderer.render(scene, camera);
    // Schedule another frame
    requestAnimationFrame(render);
}

document.addEventListener('DOMContentLoaded', function(event) {
    // Initialize everything and start rendering

    navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

    var video = document.querySelector('video');

    var constrains = {
        video: {
            mandatory: {
                minWidth: window.innerWidth,
            }
        }
    };

    if (navigator.getUserMedia) {
        navigator.getUserMedia(constrains, function(stream) {
            video.srcObject = stream;
            //video.src = window.URL.createObjectURL(stream);
            video.oncanplay = function() {
                setTimeout(function() {
                    init(video.clientWidth, video.clientHeight);
                    initEarth();
                    initMoon();
                    initLight();
                    initPlane();
                    requestAnimationFrame(render);
                }, 3000)

            }

        }, function() {});
    }
});