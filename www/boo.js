function startFaceDetect() {
    faceapi.loadTinyFaceDetectorModel("tiny_face_detector_model-weights_manifest.json").then(x => {
        navigator.mediaDevices.getUserMedia(
            // constraints
            {
                video: true,
                audio: false
            }).then(localMediaStream => {
            console.log(localMediaStream);
            let video = document.querySelector('video');
            const canvas = document.querySelector('canvas');
            video.onloadedmetadata = () => grabFrame(video, canvas);
            video.srcObject = localMediaStream;
        }).catch(err => {
            console.log("The following error occured: " + err);
        });

        function grabFrame(video, canvas) {
            console.log("grabbing frame...")
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            canvas.getContext('2d').drawImage(video, 0, 0);
            faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions()).then(x => {
                stop = !!x;
                setTimeout(() => grabFrame(video, canvas), 1000);
            });
            // let change = !(Math.ceil(Math.random() * 100) % 50);
            // console.log(change);
            // stop = change ? !stop : stop;
            // setTimeout(() => grabFrame(video, canvas), 1000);
        }
    });
}

class Quadrant {
    constructor(index, x, y, width, height) {
        this.index = index;
        this.quadrant = document.createElement("div");
        this.quadrant.style.top = y;
        this.quadrant.style.left = x;
        this.quadrant.style.width = width;
        this.quadrant.style.height = height;
        this.quadrant.style.position = "absolute";
        this.quadrant.style.boxSizing = "border-box";
        this.quadrant.style.border = "1px solid red";

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        document.getElementById("quadrants").appendChild(this.quadrant);

        this.boos = [];
    }

    containsX(x) {
        return x > this.x && x < (this.x + this.width);
    }

    containsY(y) {
        return y > this.y && y < (this.y + this.height);
    }

    boosCount() {
        return this.boos.length;
    }

    addBoo(boo) {
        this.boos.push(boo);
    }

    removeBoo(boo) {
        this.boos.filter(arrayBoo => arrayBoo !== boo);
    }
}

let stop = false;
let quadrantsAmountX = 5;
let quadrantsAmountY = 3;
let quadrants = [];
let freeQuadrants = [];
let busyQuadrants = [];

function makeQuadrants() {
    let {
        left: x,
        top: y,
        right,
        bottom
    } = document.body.getBoundingClientRect();

    let width = right - x;
    let height = bottom - y;

    // Note: we could assume x & y are always (0, 0), but why do that?
    let quadrantsWidth = width / quadrantsAmountX;
    let quadrantsHeight = height / quadrantsAmountY;

    for (let i = 0; i < quadrantsAmountX * quadrantsAmountY; i++) {
        let quadrantX = (i % quadrantsAmountX) * quadrantsWidth + x;
        let quadrantY = (i % quadrantsAmountY) * quadrantsHeight + y;
        let newQuadrant = new Quadrant(i, quadrantX, quadrantY, quadrantsWidth, quadrantsHeight);
        quadrants.push(newQuadrant);
        freeQuadrants.push(newQuadrant);
    }
}

makeQuadrants();

class Boo {
    constructor(x, y) {
        this.container = document.createElement("div");
        this.container.style.top = y;
        this.container.style.left = x;
        this.container.style.position = "absolute";

        this.image = document.createElement("div");
        this.image.style.backgroundImage = "url('boo_awake.png')";
        this.image.style.width = "50px";
        this.image.style.height = "50px";
        this.image.style.backgroundSize = "contain";
        this.image.style.backgroundRepeat = "no-repeat";

        this.container.appendChild(this.image);
        document.body.appendChild(this.container);

        this.directionX = +1;
        this.directionY = +1;
        this.width = 50;
        this.height = 50;

        this.makeShy(stop);
    }

    setCurrentQuadrant(quadrant) {
        this.currentQuadrant = quadrant;
    }

    move() {
        let newX = parseInt(this.container.style.left) + (this.directionX * 1);
        let newY = parseInt(this.container.style.top) + (this.directionY * 1);
        // We need to check both newX and newX + the width of the boo
        // since it has to be contained fully. Same for Y.
        if (!this.currentQuadrant.containsX(newX) ||
            !this.currentQuadrant.containsX(newX + this.width)) {
            this.directionX = this.directionX * -1;
            this.move();
            return;
        }
        if (!this.currentQuadrant.containsY(newY) ||
            !this.currentQuadrant.containsY(newY + this.height)) {
            this.directionY = this.directionY * -1;
            this.move();
            return;
        }
        this.container.style.top = newY + "px";
        this.container.style.left = newX + "px";
    }

    getSize() {
        return 50;
    }

    makeShy(shy) {
        this.image.style.backgroundImage = `url(${shy ? 'boo_shy.png' : 'boo_awake.png'})`;
    }
}

startFaceDetect();

let boos = [];
let max = 95;
let min = 5;

let fps = 1 * 1000;
let now = Date.now();
let then = Date.now();

function maybeCreateBoo() {
    if (freeQuadrants.length == 0) {
        return;
    }
    now = Date.now();
    elapsed = now - then;
    if (elapsed < fps) {
        requestAnimationFrame(maybeCreateBoo);
        return;
    }
    console.log("spawn!!");
    then = now - (elapsed % fps);
    // Decide a random free quadrant!
    let quadrantIndex = getRandomInt(0, freeQuadrants.length - 1);
    // Remove that quadrant from the index of free quadrants
    // and add it to the busy ones
    let quadrant = freeQuadrants[quadrantIndex];
    freeQuadrants.splice(quadrantIndex, 1);
    busyQuadrants.push(quadrant);

    console.log(freeQuadrants);
    console.log(busyQuadrants);

    let margin = 50;
    let x = getRandomInt(0, quadrant.width - margin);
    let y = getRandomInt(0, quadrant.height - margin);
    let newBoo = new Boo(`${quadrant.x + x}px`, `${quadrant.y + y}px`);

    quadrant.addBoo(newBoo);
    newBoo.setCurrentQuadrant(quadrant);
    boos.push(newBoo);

    requestAnimationFrame(maybeCreateBoo);
}

requestAnimationFrame(maybeCreateBoo);

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


let boosFps = 1 * 3000;
let boosNow = Date.now();
let boosThen = Date.now();

function moveBoos() {
    boos.forEach(boo => boo.makeShy(stop));
    if (stop) {
        requestAnimationFrame(moveBoos);
        return;
    }
    boosNow = Date.now();
    if (boosNow - boosThen < boosFps) {
        requestAnimationFrame(moveBoos);
        return;
    }
    boos.forEach(boo => boo.move());
    requestAnimationFrame(moveBoos);
}
requestAnimationFrame(moveBoos);