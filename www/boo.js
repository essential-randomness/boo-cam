function startFaceDetect(callback) {
  faceapi
    .loadTinyFaceDetectorModel(
      "./tiny_face_detector_model-weights_manifest.json"
    )
    .then(x => {
      navigator.mediaDevices
        .getUserMedia(
          // constraints
          {
            video: true,
            audio: false
          }
        )
        .then(localMediaStream => {
          console.log(localMediaStream);
          let video = document.querySelector("video");
          const canvas = document.querySelector("canvas");
          video.onloadedmetadata = () => grabFrame(video, canvas);
          video.srcObject = localMediaStream;
        })
        .catch(err => {
          console.log("The following error occured: " + err);
        });

      function grabFrame(video, canvas) {
        console.log("grabbing frame...");
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        canvas.getContext("2d").drawImage(video, 0, 0);
        faceapi
          .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
          .then(x => {
            callback(!!x);
            console.log(!!x);
            setTimeout(() => grabFrame(video, canvas), 5000);
          });
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
    return x > this.x && x < this.x + this.width;
  }

  containsY(y) {
    return y > this.y && y < this.y + this.height;
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
    let newQuadrant = new Quadrant(
      i,
      quadrantX,
      quadrantY,
      quadrantsWidth,
      quadrantsHeight
    );
    quadrants.push(newQuadrant);
    freeQuadrants.push(newQuadrant);
  }
}

makeQuadrants();

class Boo {
  constructor(x, y, shy) {
    this.container = document.createElement("div");
    this.container.style.top = y;
    this.container.style.left = x;
    this.container.style.position = "absolute";
    this.container.style.transition = "opacity 2s";

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

    this.makeShy(shy);
    this.dead = false;
  }

  getCurrentQuadrant() {
    return this.currentQuadrant;
  }

  setCurrentQuadrant(quadrant) {
    this.currentQuadrant = quadrant;
  }

  animateNextFrame() {
    if (this.shy) {
      return;
    }
    if (this.dead) {
      if (this.container.style.opacity === "0") {
        this.container.remove();
        return;
      }
      let currentOpacity = getComputedStyle(this.container).opacity;
      this.container.style.opacity = currentOpacity - 0.1;
    }
    let newX = parseInt(this.container.style.left) + this.directionX * 1;
    let newY = parseInt(this.container.style.top) + this.directionY * 1;
    // We need to check both newX and newX + the width of the boo
    // since it has to be contained fully. Same for Y.
    if (
      !this.currentQuadrant.containsX(newX) ||
      !this.currentQuadrant.containsX(newX + this.width)
    ) {
      this.directionX = this.directionX * -1;
      this.animateNextFrame();
      return;
    }
    if (
      !this.currentQuadrant.containsY(newY) ||
      !this.currentQuadrant.containsY(newY + this.height)
    ) {
      this.directionY = this.directionY * -1;
      this.animateNextFrame();
      return;
    }
    this.container.style.top = newY + "px";
    this.container.style.left = newX + "px";
  }

  getSize() {
    return 50;
  }

  makeShy(shy) {
    this.image.style.backgroundImage = `url(${
      shy ? "boo_shy.png" : "boo_awake.png"
    })`;
    this.shy = shy;
  }

  startDisappear() {
    this.dead = true;
  }
}

class FrameManager {
  constructor() {
    // How many frames of animation are going to be shown
    // for each second passing IRL.
    const FPS = 60;

    // How many milliseconds need to pass before a new frame
    // is triggered.
    this.millisecondsPerFrame = 1000 / FPS;
    this.then = Date.now();
    this.currentFrame = 0;

    // All subscribers should have a "animateNextFrame" method.
    this.subscribers = [];

    requestAnimationFrame(this.maybeTriggerNextFrame.bind(this));
  }

  addSubscriber(subscriber) {
    // TODO: add checking that method exists
    this.subscribers.push(subscriber);
  }

  maybeTriggerNextFrame() {
    let now = Date.now();
    // Elapsed contains how many milliseconds have passed since the last
    // time this method was called.
    let elapsed = this.then - now;
    let framesToShow = Math.floor(elapsed / this.millisecondsPerFrame);

    if (framesToShow > 1) {
      console.log(
        `Computation took more than one frame (${framesToShow} frames).`
      );
    }

    if (framesToShow) {
      this.currentFrame++;
      this.subscribers.forEach(subscriber => subscriber.animateNextFrame());
    }

    // TODO: maybe only bind once
    requestAnimationFrame(this.maybeTriggerNextFrame.bind(this));
  }
}

class BoosManager {
  constructor() {
    this.MAX_BOOS = 5;
    this.boos = [];
    // Create a boo every 60 frames (i.e. 1 second)
    this.BOO_RATE = 60;
    // Disappear a boo every half minute.
    this.BOO_DISAPPEREANCE_RATE = 60 * 30;
  }

  animateNextFrame() {
    if (FRAME_MANAGER.currentFrame % this.BOO_RATE == 0) {
      this.maybeCreateBoo();
    }
    if (FRAME_MANAGER.currentFrame % this.BOO_DISAPPEREANCE_RATE == 0) {
      this.maybeDisappearBoo();
    }
  }

  maybeDisappearBoo() {
    if (this.boos.length === 0) {
      return;
    }
    let boo = this.boos.pop();
    boo.getCurrentQuadrant().removeBoo(boo);
    boo.startDisappear();
  }

  makeShy(shy) {
    this.boos.forEach(boo => boo.makeShy(shy));
  }

  maybeCreateBoo() {
    if (this.boos.length === this.MAX_BOOS) {
      return;
    }

    // Decide a random free quadrant!
    let quadrantIndex = getRandomInt(0, freeQuadrants.length - 1);
    // Remove that quadrant from the index of free quadrants
    // and add it to the busy ones
    let quadrant = freeQuadrants[quadrantIndex];
    freeQuadrants.splice(quadrantIndex, 1);
    busyQuadrants.push(quadrant);

    let margin = 50;
    let x = getRandomInt(0, quadrant.width - margin);
    let y = getRandomInt(0, quadrant.height - margin);
    let newBoo = new Boo(
      `${quadrant.x + x}px`,
      `${quadrant.y + y}px`,
      this.shy
    );

    quadrant.addBoo(newBoo);
    newBoo.setCurrentQuadrant(quadrant);
    this.boos.push(newBoo);
    FRAME_MANAGER.addSubscriber(newBoo);
  }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const FRAME_MANAGER = new FrameManager();
let boosManager = new BoosManager();
FRAME_MANAGER.addSubscriber(boosManager);
let facing = false;
startFaceDetect(currentlyFacing => {
  if (currentlyFacing != facing) {
    boosManager.makeShy(currentlyFacing);
  }
  facing = currentlyFacing;
});
