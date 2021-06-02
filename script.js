const videoElement = document.getElementsByClassName("input_video")[0];

videoElement.style.cssText =
  "-moz-transform: scale(-1, 1); \
-webkit-transform: scale(-1, 1); -o-transform: scale(-1, 1); \
transform: scale(-1, 1); filter: FlipH;";

const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");

const jewelryImage = new Image();
// jewelryImage.src =
//   "https://media-pipe.s3.amazonaws.com/rings/wo_background_resized.png";

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

const exponentialSmoothing = 0.3; // 0.95 for Mozilla, 0.6 for Chrome, depends on web cam framerate
// const exponentialSmoothingZ = 0.9; //Chrome
const tooCloseRatio = 0.4;
const tooFarRatio = 0.05;

//Drawing conditions
const ratio517 = 0.15;
const ratioMCPPIPZ = 0.15;

let i = 0;
let fingerMCPX = [];
let fingerPIPX = [];
let fingerMCPY = [];
let fingerPIPY = [];
let fingerMCPZ = [];
let fingerPIPZ = [];

let landmarks5Z = [];
let landmarks17Z = [];

let ringFingerCenterCoef = 0.5;
let ringFingerJewelryWidthCoef = 0.35;

let aspectRatio;
jewelryImage.addEventListener("load", () => {
  aspectRatio = jewelryImage.naturalHeight / jewelryImage.naturalWidth;
});

let dropDownList = document.getElementById("myList");
let FINGER;

function smoothArray(previousValue, currentValue) {
  return (
    previousValue * exponentialSmoothing +
    currentValue * (1 - exponentialSmoothing)
  );
}

function pointsDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

const spinner = document.querySelector(".loading");
spinner.ontransitionend = () => {
  spinner.style.display = "none";
};

function onResults(results) {
  // Hide the spinner.
  document.body.classList.add("loaded");

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

    for (let index = 0; index < results.multiHandLandmarks.length; index++) {
      //// Draw connectors
      //const classification = results.multiHandedness[index];
      // const isRightHand = classification.label === "Right";
      // const landmarks = results.multiHandLandmarks[index];
      // drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
      //   color: isRightHand ? "#00FF00" : "#FF0000",
      // }),
      //   drawLandmarks(canvasCtx, landmarks, {
      //     color: isRightHand ? "#00FF00" : "#FF0000",
      //     fillColor: isRightHand ? "#FF0000" : "#00FF00",
      //     radius: (x) => {
      //       return lerp(x.from.z, -0.15, 0.1, 10, 1);
      //     },
      //   });
    }

    FINGER = dropDownList.options[dropDownList.selectedIndex].text;

    switch (FINGER) {
      case "pinky":
        mcpLandmark = 17;
        pipLandmark = 18;
        break;
      case "ring finger":
        mcpLandmark = 13;
        pipLandmark = 14;
        break;
      case "middle finger":
        mcpLandmark = 9;
        pipLandmark = 10;
        break;
      case "index finger":
        mcpLandmark = 5;
        pipLandmark = 6;
        break;
    }

    console.log(FINGER);

    console.log(results.multiHandedness[0].label);

    let landmarks = results.multiHandLandmarks[0];

    //SMOOTHED COORDINATES
    let smoothedMCPX = smoothArray(fingerMCPX[i - 1], landmarks[mcpLandmark].x);

    let smoothedPIPX = smoothArray(fingerPIPX[i - 1], landmarks[pipLandmark].x);

    let smoothedMCPY = smoothArray(fingerMCPY[i - 1], landmarks[mcpLandmark].y);

    let smoothedPIPY = smoothArray(fingerPIPY[i - 1], landmarks[pipLandmark].y);

    let smoothedMCPZ = smoothArray(fingerMCPZ[i - 1], landmarks[mcpLandmark].z);

    let smoothedPIPZ = smoothArray(fingerPIPZ[i - 1], landmarks[pipLandmark].z);

    let smoothed5Z;

    let smoothed17Z;

    if (FINGER === "indexFinger") {
      smoothed5Z = smoothedMCPZ;
    } else {
      smoothed5Z = smoothArray(landmarks5Z[i - 1], landmarks[5].z);
    }

    if (FINGER === "pinky") {
      smoothed17Z = smoothedMCPZ;
    } else {
      smoothed17Z = smoothArray(landmarks17Z[i - 1], landmarks[17].z);
    }

    //DRAWING CONDITIONS
    if (Math.abs(smoothed5Z - smoothed17Z) > ratio517) {
      console.log("Palm should be perpendicular to the camera");
      return;
    }

    if (results.multiHandedness[0].label === "Right") {
      if (landmarks[17].x > landmarks[5].x) {
        console.log("The outside of the palm shoud be facing the camera");
        return;
      }
    }

    if (results.multiHandedness[0].label === "Left") {
      if (landmarks[5].x > landmarks[17].x) {
        console.log("The outside of the palm shoud be facing the camera");
        return;
      }
    }

    let distance517 = pointsDistance(
      landmarks[5].x,
      landmarks[5].y,
      landmarks[17].x,
      landmarks[17].y
    );

    if (distance517 > tooCloseRatio) {
      console.log("Palm is too close to  the camera");
      return;
    }

    if (distance517 < tooFarRatio) {
      console.log("Palm is too far from the camera");
      return;
    }

    if (Math.abs(smoothedMCPZ - smoothedPIPZ) > ratioMCPPIPZ) {
      console.log("please straighten your fingers");
      return;
    }

    if (i === 0) {
      //PUSHING TO ARRAYS
      fingerMCPX.push(landmarks[mcpLandmark].x);
      fingerPIPX.push(landmarks[pipLandmark].x);
      fingerMCPY.push(landmarks[mcpLandmark].y);
      fingerPIPY.push(landmarks[pipLandmark].y);
      fingerMCPZ.push(landmarks[mcpLandmark].z);
      fingerPIPZ.push(landmarks[pipLandmark].z);
      landmarks5Z.push(landmarks[5].z);
      landmarks17Z.push(landmarks[17].z);
    } else {
      fingerMCPX.push(smoothedMCPX);
      fingerPIPX.push(smoothedPIPX);
      fingerMCPY.push(smoothedMCPY);
      fingerPIPY.push(smoothedPIPY);
      fingerMCPZ.push(smoothedMCPZ);
      fingerPIPZ.push(smoothedPIPZ);
      landmarks5Z.push(smoothed5Z);
      landmarks17Z.push(smoothed17Z);
    }

    let angle = -Math.atan(
      (smoothedPIPX - smoothedMCPX) / (smoothedPIPY - smoothedMCPY)
    );

    let mcpipDistance = pointsDistance(
      smoothedMCPX,
      smoothedMCPY,
      smoothedPIPX,
      smoothedPIPY
    );
    let width =
      mcpipDistance * canvasElement.width * ringFingerJewelryWidthCoef;
    let height = aspectRatio * width;

    let centerX =
      (smoothedMCPX + (smoothedPIPX - smoothedMCPX) * ringFingerCenterCoef) *
      canvasElement.width;
    let centerY =
      (smoothedMCPY + (smoothedPIPY - smoothedMCPY) * ringFingerCenterCoef) *
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
camera.start();
