const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");

videoElement.style.cssText =
  "-moz-transform: scale(-1, 1); \
-webkit-transform: scale(-1, 1); -o-transform: scale(-1, 1); \
transform: scale(-1, 1); filter: FlipH;";

const jewelryImage = new Image();

const imagesList = document.querySelector("#imageList");
const imageInput = document.querySelector("#imageInput");
let selectedImageId = "";
const images = [];

function updateSelectOptions(data) {
  imagesList.textContent = "";

  data.forEach((image) => {
    const option = document.createElement("option");
    option.setAttribute("data-id", image.id);
    option.textContent = image.name;

    if (image.id === selectedImageId) option.selected = true;

    imagesList.append(option);
  });
}

function onFileSelected(event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onloadend = function (e) {
    const {
      target: { result },
    } = e;
    const { name } = file;

    images.push({ id: `${images.length}-${name}`, name, src: result });

    updateSelectOptions(images);
  };
  reader.readAsDataURL(file);
}

imageInput.addEventListener("change", onFileSelected);

function drawPoint(x, y, label, color, size) {
  if (color == null) {
    color = "#000";
  }

  if (size == null) {
    size = 5;
  }

  let radius = 0.5 * size;

  // to increase smoothing for numbers with decimal part
  let pointX = Math.round(x - radius);
  let pointY = Math.round(y - radius);

  canvasCtx.beginPath();
  canvasCtx.fillStyle = color;
  canvasCtx.fillRect(pointX, pointY, size, size);
  canvasCtx.fill();

  if (label) {
    let textX = Math.round(x);
    let textY = Math.round(pointY - 5);

    canvasCtx.font = "Italic 14px Arial";
    canvasCtx.fillStyle = color;
    canvasCtx.textAlign = "center";
    canvasCtx.fillText(label, textX, textY);
  }
}

const palmJewelryWidthCoef = 0.7;
const centerCoef = 0.5;

let exponentialSmoothing = 0.3; //depends on web cam framerate

const tooCloseRatio = 0.4;
const tooFarRatio = 0.05;

//Drawing conditions

let i = 0;
let totalCounts = 0;

let landmarks0X = [];
let landmarks5X = [];
let landmarks17X = [];
let landmarks0Y = [];
let landmarks5Y = [];
let landmarks17Y = [];
let landmarks0Z = [];
let landmarks5Z = [];
let landmarks17Z = [];

let JewelryWidthCoef = 0.35;

let aspectRatio;
jewelryImage.addEventListener("load", () => {
  aspectRatio = jewelryImage.naturalHeight / jewelryImage.naturalWidth;
});

let dropDownList = document.getElementById("myList");
let HAND;

function smoothArray(previousValue, currentValue) {
  return (
    previousValue * exponentialSmoothing +
    currentValue * (1 - exponentialSmoothing)
  );
}

function pointsDistance2D(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function pointsDistance3D(x1, y1, z1, x2, y2, z2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
}

function onResults(results) {
  canvasCtx.save();

  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );

  if (results.multiHandLandmarks && results.multiHandedness) {
    const option = imagesList.options[imagesList.selectedIndex];
    const imageId = option && option.dataset.id;
    selectedImageId = imageId;
    const image = images.find((elem) => elem.id === imageId) || {};

    jewelryImage.src = image.src || "";

    let outputPalm = results.multiHandLandmarks[0];

    console.log("results.multiHandedness", results.multiHandedness[0].label);

    // Draw connectors
    // for (let index = 0; index < results.multiHandLandmarks.length; index++) {
    //   const classification = results.multiHandedness[index];
    //   const isRightHand = classification.label === "Right";
    //   const landmarks = results.multiHandLandmarks[index];
    //   drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
    //     color: isRightHand ? "#00FF00" : "#FF0000",
    //   }),
    //     drawLandmarks(canvasCtx, landmarks, {
    //       color: isRightHand ? "#00FF00" : "#FF0000",
    //       fillColor: isRightHand ? "#FF0000" : "#00FF00",
    //       radius: (x) => {
    //         return lerp(x.from.z, -0.15, 0.1, 10, 1);
    //       },
    //     });
    // }

    // drawPoint(centerX, centerY, `CENTER`, "orange", 5);

    //SMOOTHED COORDINATES
    smoothed0X = smoothArray(landmarks0X[i - 1], outputPalm[0].x);
    smoothed5X = smoothArray(landmarks5X[i - 1], outputPalm[5].x);
    smoothed17X = smoothArray(landmarks17X[i - 1], outputPalm[17].x);
    smoothed0Y = smoothArray(landmarks0Y[i - 1], outputPalm[0].y);
    smoothed5Y = smoothArray(landmarks5Y[i - 1], outputPalm[5].y);
    smoothed17Y = smoothArray(landmarks17Y[i - 1], outputPalm[17].y);
    smoothed0Z = smoothArray(landmarks0Z[i - 1], outputPalm[0].z);
    smoothed5Z = smoothArray(landmarks5Z[i - 1], outputPalm[5].z);
    smoothed17Z = smoothArray(landmarks17Z[i - 1], outputPalm[17].z);

    //DRAWING CONDITIONS
    let distance517 = pointsDistance2D(
      smoothed5X,
      smoothed5Y,
      smoothed17X,
      smoothed17Y
    );

    // let distanceWristElbow = pointsDistance2D(
    //   smoothed0X,
    //   smoothed0Y,
    //   smoothedElbowX,
    //   smoothedElbowY
    // );

    if (Math.abs(smoothed5Z - smoothed17Z) > distance517) {
      console.log("Palm should be perpendicular to the camera");
      return;
    }

    if (
      Math.abs((smoothed5Z + smoothed17Z) / 2 - smoothed0Z) >
      distance517 * 1.5
    ) {
      console.log("Palm should be at the same distance from camera as wrist");
      return;
    }

    if (results.multiHandedness[0].label === "Left") {
      if (smoothed17X - smoothed5X < -distance517 * 0.5) {
        console.log("Outside of the palm should be facing the camera");
        return;
      }
    }

    if (results.multiHandedness[0].label === "Right") {
      if (smoothed5X - smoothed17X < -distance517 * 0.5) {
        console.log("Outside of the palm should be facing the camera");
        return;
      }
    }

    // if (Math.abs(smoothed0Z - smoothedElbowZ) > distanceWristElbow * 0.25) {
    //   console.log("Wrist should be at the same distance from camera as elbow");
    //   return;
    // }

    // let distance517 = pointsDistance3D(
    //   smoothed5X,
    //   smoothed5Y,
    //   smoothed5Z,
    //   smoothed17X,
    //   smoothed17Y,
    //   smoothed17Z
    // );

    //PUSHING TO ARRAYS
    if (i == 0) {
      landmarks0X.push(outputPalm[0].x);
      landmarks5X.push(outputPalm[5].x);
      landmarks17X.push(outputPalm[17].x);
      landmarks0Y.push(outputPalm[0].y);
      landmarks5Y.push(outputPalm[5].y);
      landmarks17Y.push(outputPalm[17].y);
      landmarks0Z.push(outputPalm[0].z);
      landmarks5Z.push(outputPalm[5].z);
      landmarks17Z.push(outputPalm[17].z);
    } else {
      landmarks0X.push(smoothed0X);
      landmarks5X.push(smoothed5X);
      landmarks17X.push(smoothed17X);
      landmarks0Y.push(smoothed0Y);
      landmarks5Y.push(smoothed5Y);
      landmarks17Y.push(smoothed17Y);
      landmarks0Z.push(smoothed0Z);
      landmarks5Z.push(smoothed5Z);
      landmarks17Z.push(smoothed17Z);
    }

    let centerX517 = (smoothed5X + smoothed17X) / 2;
    let centerY517 = (smoothed5Y + smoothed17Y) / 2;

    let angle =
      Math.atan2(centerY517 - smoothed0Y, centerX517 - smoothed0X) -
      Math.PI / 2;

    let distance5173D = pointsDistance3D(
      smoothed5X,
      smoothed5Y,
      smoothed5Z,
      smoothed17X,
      smoothed17Y,
      smoothed17Z
    );

    let distance503D = pointsDistance3D(
      smoothed5X,
      smoothed5Y,
      smoothed5Z,
      smoothed0X,
      smoothed0Y,
      smoothed0Z
    );

    let distance1703D = pointsDistance3D(
      smoothed17X,
      smoothed17Y,
      smoothed17Z,
      smoothed0X,
      smoothed0Y,
      smoothed0Z
    );

    let triangularDistance = (distance5173D + distance503D + distance1703D) / 3;

    let width = triangularDistance * canvasElement.width * palmJewelryWidthCoef;

    let height = aspectRatio * width;

    let centerX =
      (smoothed0X - (centerX517 - smoothed0X) * centerCoef) *
      canvasElement.width;

    let centerY =
      (smoothed0Y - (centerY517 - smoothed0Y) * centerCoef) *
      canvasElement.height;

    canvasCtx.translate(centerX, centerY);

    canvasCtx.rotate(angle);

    canvasCtx.translate(-centerX, -centerY);

    canvasCtx.drawImage(
      jewelryImage,
      centerX - width / 2,
      centerY - height / 2,
      width,
      height
    );

    canvasCtx.restore();
    i++;
    console.log(i);
  }

  totalCounts++;
  console.log(totalCounts);
  let currentTime = Date.now();

  let FPS = (totalCounts / (currentTime - startTime)) * 1000; //time in miliseconds
  console.log("FPS", FPS);

  exponentialSmoothing = Math.min(0.02 * FPS + 0.32, 0.99);

  // exponentialSmoothing = 0.6;

  console.log("exponentialSmoothing", exponentialSmoothing);
}

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.3/${file}`;
  },
});
hands.setOptions({
  selfieMode: true,
  maxNumHands: 1,
  minDetectionConfidence: 0.8,
  minTrackingConfidence: 0.8,
});
hands.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
});

startTime = Date.now();
camera.start();
