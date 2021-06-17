const canvasElement = document.getElementById("output");
const canvasCtx = canvasElement.getContext("2d");

canvasElement.style.cssText =
  "-moz-transform: scale(-1, 1); \
  -webkit-transform: scale(-1, 1); -o-transform: scale(-1, 1); \
  transform: scale(-1, 1); filter: FlipH;";

const jewelryImage = new Image();
const imagesList = document.querySelector("#imageList");
const imageInput = document.querySelector("#imageInput");
const images = [];

imageInput.addEventListener("change", onFileSelected);

let exponentialSmoothing = 0.5;
const relativeJewelryWidth = 0.35;

let i = 0;
let totalCounts = 0;

let model;

let leftX = [];
let rightX = [];
let leftY = [];
let rightY = [];

let aspectRatio;
jewelryImage.addEventListener("load", () => {
  aspectRatio = jewelryImage.naturalHeight / jewelryImage.naturalWidth;
});

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

    images.unshift({ id: `${images.length}-${name}`, name, src: result });

    updateSelectOptions(images);
  };
  reader.readAsDataURL(file);
}

function smoothArray(smoothedArray, previousValue, currentValue) {
  return smoothedArray.push(
    previousValue * exponentialSmoothing +
      currentValue * (1 - exponentialSmoothing)
  );
}

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
      facingMode: "user"
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

const landmarksRealTime = async (video, detector) => {
  async function frameLandmarks() {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

    const option = imagesList.options[imagesList.selectedIndex];
    const imageId = option && option.dataset.id;
    selectedImageId = imageId;
    const image = images.find((elem) => elem.id === imageId) || {};
    jewelryImage.src = image.src || "";

    // const estimationConfig = {
    //   maxPoses: 5,
    //   flipHorizontal: false,
    //   scoreThreshold: 0.5,
    //   nmsRadius: 20,
    // };
    // const poses = await detector.estimatePoses(video, estimationConfig);

    const poses = await detector.estimatePoses(video); //working

    if (poses.length > 0) {
      const landmarks = poses[0].keypoints;

      // console.log("landmarks", landmarks);

      // // Draw keypoints
      // for (let i = 9; i < 11; i++) {
      //   const x = landmarks[i].x;
      //   const y = landmarks[i].y;
      //   canvasCtx.beginPath();
      //   canvasCtx.arc(x, y, 5 /* radius */, 0, 2 * Math.PI);
      //   canvasCtx.fill();
      // }

      if (i === 0) {
        leftX.push(landmarks[5].x);
        leftY.push(landmarks[5].y);
        rightX.push(landmarks[6].x);
        rightY.push(landmarks[6].y);
      } else {
        smoothArray(leftX, leftX[i - 1], landmarks[5].x);
        smoothArray(leftY, leftY[i - 1], landmarks[5].y);
        smoothArray(rightX, rightX[i - 1], landmarks[6].x);
        smoothArray(rightY, rightY[i - 1], landmarks[6].y);
      }

      // //DRAWING CONDITIONS
      // if (
      //   (rightX[i] < landmarks[10].x && landmarks[10].y < landmarks[8].y) ||
      //   (leftX[i] > landmarks[9].x && landmarks[9].y < landmarks[7].y)
      // ) {
      //   console.log("Necklace is occluded by hand");
      //   return;
      // }

      let xCenter = (leftX[i] + rightX[i]) / 2;
      let yCenter = (leftY[i] + rightY[i]) / 2;

      let xDistanceShoulders = Math.abs(leftX[i] - rightX[i]);

      let dWidth = xDistanceShoulders * relativeJewelryWidth;
      let dHeight = dWidth * aspectRatio;

      let dx = xCenter - (relativeJewelryWidth / 2) * xDistanceShoulders;
      let dy = yCenter - 0.5 * dHeight;

      canvasCtx.drawImage(jewelryImage, dx, dy, dWidth, dHeight);

      canvasCtx.restore();
      i++;
      console.log("i", i);
      totalCounts++;
      console.log(totalCounts);
      let currentTime = Date.now();
      let FPS = (totalCounts / (currentTime - startTime)) * 1000; //time in miliseconds
      console.log("FPS", FPS);
      exponentialSmoothing = Math.min(0.01 * FPS + 0.16, 0.9);
    }
    rafID = requestAnimationFrame(frameLandmarks);
  }
  frameLandmarks();
};

async function main() {
  // await tf.setBackend("webgl");

  // model = await faceLandmarksDetection.load(
  //   faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
  //   { shouldLoadIrisModel: false, maxFaces: 1 }
  // );

  ////tfjs
  // const model = poseDetection.SupportedModels.BlazePose;

  // console.log("model", model);

  // const detectorConfig = {
  //   runtime: "tfjs",
  //   enableSmoothing: true,
  //   modelType: "full", //heavy
  // };
  // detector = await poseDetection.createDetector(model, detectorConfig);

  // console.log("detector", detector);

  // //mediapipe
  // const model = poseDetection.SupportedModels.BlazePose;

  // console.log("model", model);

  // const detectorConfig = {
  //   runtime: "mediapipe",
  //   solutionPath: "base/node_modules/@mediapipe/pose",
  // };
  // detector = await poseDetection.createDetector(model, detectorConfig);

  // console.log("detector", detector);

  // let video;

  // MoveNet
  const detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
  };
  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    detectorConfig
  );

  // // PoseNet
  // const detectorConfig = {
  //   architecture: "ResNet50",
  //   outputStride: 16,
  //   inputResolution: { width: 257, height: 200 },
  //   quantBytes: 4,
  // };

  // const detector = await poseDetection.createDetector(
  //   poseDetection.SupportedModels.PoseNet,
  //   detectorConfig
  // );

  // const detectorConfig = {
  //   architecture: "MobileNetV1",
  //   outputStride: 16,
  //   inputResolution: { width: 640, height: 480 },
  //   multiplier: 0.75,
  // };
  // const detector = await poseDetection.createDetector(
  //   poseDetection.SupportedModels.PoseNet,
  //   detectorConfig
  // );

  try {
    video = await loadVideo();
  } catch (e) {
    console.log(e.message);
    throw e;
  }

  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;

  startTime = Date.now();
  landmarksRealTime(video, detector);
}

navigator.getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

main();
