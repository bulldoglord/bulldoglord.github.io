const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 500;

const canvasElement = document.getElementById("output");
const canvasCtx = canvasElement.getContext("2d");

canvasElement.style.cssText =
  "-moz-transform: scale(-1, 1); \
-webkit-transform: scale(-1, 1); -o-transform: scale(-1, 1); \
transform: scale(-1, 1); filter: FlipH;";

function isMobile() {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isAndroid || isiOS;
}

const mobile = isMobile();

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

let exponentialSmoothing = 0.3;
const tooCloseRatio = 0.4;
const tooFarRatio = 0.05;

//Drawing conditions
const ratio517 = 0.15;
const ratioMCPPIPZ = 0.15;

let i = 0;

let dropDownList = document.getElementById("myList");
let FINGER;

let fingerMCPX = [];
let fingerPIPX = [];
let fingerMCPY = [];
let fingerPIPY = [];
let fingerMCPZ = [];
let fingerPIPZ = [];

let landmarks5Z = [];
let landmarks17Z = [];

let ringFingerCenterCoef = 0.5;
let ringFingerJewelryWidthCoef = 0.42;

let aspectRatio;
jewelryImage.addEventListener("load", () => {
  aspectRatio = jewelryImage.naturalHeight / jewelryImage.naturalWidth;
});

function smoothArray(previousValue, currentValue) {
  return (
    previousValue * exponentialSmoothing +
    currentValue * (1 - exponentialSmoothing)
  );
}

function pointsDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

let model;

async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      "Browser API navigator.mediaDevices.getUserMedia not available"
    );
  }

  const video = document.getElementById("video");
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      // Only setting the video to a specified size in order to accommodate a
      // point cloud, so on mobile devices accept the default size.
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();
  return video;
}

async function main() {
  model = await handpose.load();
  let video;

  try {
    video = await loadVideo();
  } catch (e) {
    console.log(e.message);
    throw e;
  }

  landmarksRealTime(video);
}

const landmarksRealTime = async (video) => {
  async function frameLandmarks() {
    canvasCtx.save();
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

    const predictions = await model.estimateHands(video);

    if (predictions.length > 0) {
      const landmarks = predictions[0].landmarks;

      console.log(predictions[0].annotations);

      const option = imagesList.options[imagesList.selectedIndex];
      const imageId = option && option.dataset.id;
      selectedImageId = imageId;
      const image = images.find((elem) => elem.id === imageId) || {};
      jewelryImage.src = image.src || "";

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

      let smoothedMCPX = smoothArray(
        fingerMCPX[i - 1],
        landmarks[mcpLandmark][0]
      );
      let smoothedPIPX = smoothArray(
        fingerPIPX[i - 1],
        landmarks[pipLandmark][0]
      );
      let smoothedMCPY = smoothArray(
        fingerMCPY[i - 1],
        landmarks[mcpLandmark][1]
      );
      let smoothedPIPY = smoothArray(
        fingerPIPY[i - 1],
        landmarks[pipLandmark][1]
      );
      let smoothedMCPZ = smoothArray(
        fingerMCPZ[i - 1],
        landmarks[mcpLandmark][2]
      );
      let smoothedPIPZ = smoothArray(
        fingerPIPZ[i - 1],
        landmarks[pipLandmark][2]
      );
      let smoothed5Z;
      let smoothed17Z;

      if (FINGER === "indexFinger") {
        smoothed5Z = smoothedMCPZ;
      } else {
        smoothed5Z = smoothArray(landmarks5Z[i - 1], landmarks[5][2]);
      }

      if (FINGER === "pinky") {
        smoothed17Z = smoothedMCPZ;
      } else {
        smoothed17Z = smoothArray(landmarks17Z[i - 1], landmarks[17][2]);
      }

      if (Math.abs(smoothed5Z - smoothed17Z) > ratio517) {
        console.log("Palm should be perpendicular to the camera");
      }
      /*
      if (results.multiHandedness[0].label === "Right") {
        if (landmarks[17][0] > landmarks[5][0]) {
          console.log("The outside of the palm shoud be facing the camera");
          return;
        }
      }
  
      if (results.multiHandedness[0].label === "Left") {
        if (landmarks[5][0] > landmarks[17][0]) {
          console.log("The outside of the palm shoud be facing the camera");
          return;
        }
      }*/

      let distance517 = pointsDistance(
        landmarks[5][0],
        landmarks[5][1],
        landmarks[17][0],
        landmarks[17][1]
      );

      if (distance517 > tooCloseRatio) {
        console.log("Palm is too close to  the camera");
      }

      if (distance517 < tooFarRatio) {
        console.log("Palm is too far from the camera");
      }

      if (Math.abs(smoothedMCPZ - smoothedPIPZ) > ratioMCPPIPZ) {
        console.log("please straighten your fingers");
      }

      if (i === 0) {
        fingerMCPX.push(landmarks[mcpLandmark][0]);
        fingerPIPX.push(landmarks[pipLandmark][0]);
        fingerMCPY.push(landmarks[mcpLandmark][1]);
        fingerPIPY.push(landmarks[pipLandmark][1]);
        fingerMCPZ.push(landmarks[mcpLandmark][2]);
        fingerPIPZ.push(landmarks[pipLandmark][2]);
        landmarks5Z.push(landmarks[5][2]);
        landmarks17Z.push(landmarks[17][2]);
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

      let width = mcpipDistance * ringFingerJewelryWidthCoef;
      let height = aspectRatio * width;
      let centerX =
        smoothedMCPX + (smoothedPIPX - smoothedMCPX) * ringFingerCenterCoef;
      let centerY =
        smoothedMCPY + (smoothedPIPY - smoothedMCPY) * ringFingerCenterCoef;

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

      //console.log('Width: ', width);
      //console.log('Height: ', height);

      canvasCtx.restore();
      i++;
    }
    rafID = requestAnimationFrame(frameLandmarks);
  }

  frameLandmarks();
};

navigator.getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

main();
