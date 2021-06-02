const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");

videoElement.style.cssText =
  "-moz-transform: scale(-1, 1); \
-webkit-transform: scale(-1, 1); -o-transform: scale(-1, 1); \
transform: scale(-1, 1); filter: FlipH;";

let jewelryImage = new Image();

const imagesList = document.querySelector("#imageList");

const imageInput = document.querySelector("#imageInput");

let selectedImageId = "";

const images = [];

const canvasWidth = canvasElement.width;
const canvasHeight = canvasElement.height;
// const canvasData = canvasCtx.getImageData(0, 0, canvasWidth, canvasHeight);

// jewelryImageLeft.src =
//   "https://media-pipe.s3.amazonaws.com/earrings/a4fea16e-3ffb-462a-a71f-6d6e7b03e4e3-mask_left.png";

// jewelryImageRight.src =
//   "https://media-pipe.s3.amazonaws.com/earrings/a4fea16e-3ffb-462a-a71f-6d6e7b03e4e3-mask_right.png";

// jewelryImageRight.src =
//   "https://media-pipe.s3.amazonaws.com/earrings/a4fea16e-3ffb-462a-a71f-6d6e7b03e4e3-mask_left.png";

// jewelryImageLeft.src =
//   "https://media-pipe.s3.amazonaws.com/earrings/9034ef50-ee6b-4e82-a8cd-8a756fad99a2-mask_left.png";

// jewelryImageRight.src =
//   "https://media-pipe.s3.amazonaws.com/earrings/9034ef50-ee6b-4e82-a8cd-8a756fad99a2-mask_right.png";

function updateSelectOptions(data) {
  imagesList.textContent = "";

  data.forEach((image) => {
    const option = document.createElement("option");
    option.setAttribute("data-id", image.id);
    option.textContent = image.name;

    if (image.id === selectedImageId) option.selected = true;

    imagesList.append(option);
  });
  updateSelectOptions;
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

//Aspect ratio
let aspectRatio;
jewelryImage.addEventListener("load", () => {
  aspectRatio = jewelryImage.naturalHeight / jewelryImage.naturalWidth;
});

let exponentialSmoothing = 0.5;

const jewelryWidthRatio = 0.1;

const finalVideoRatio = 1;

const elongationX = 0.7;
const elongationY = 1;

let i = 0;
let totalCounts = 0;

let poseLandmarks93SmoothedX = [];
let poseLandmarks93SmoothedY = [];
let poseLandmarks137SmoothedX = [];
let poseLandmarks137SmoothedY = [];
let poseLandmarks123SmoothedX = [];
let poseLandmarks123SmoothedY = [];
let poseLandmarks352SmoothedX = [];
let poseLandmarks352SmoothedY = [];
let poseLandmarks366SmoothedX = [];
let poseLandmarks366SmoothedY = [];
let poseLandmarks323SmoothedX = [];
let poseLandmarks323SmoothedY = [];

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

function drawEarring(
  outterLandMarkX,
  middleLandmarkX,
  innerLandMarkX,
  outterLandMarkY,
  middleLandmarkY,
  innerLandMarkY,
  jewelryImage,
  side
) {
  let drawCondition;
  if (side === "left") {
    drawCondition = innerLandMarkX > outterLandMarkX;
  } else if (side === "right") {
    drawCondition = outterLandMarkX > innerLandMarkX;
  }

  if (drawCondition) {
    let CenterX =
      outterLandMarkX + (outterLandMarkX - middleLandmarkX) * elongationX;

    let dy;

    if (middleLandmarkY - outterLandMarkY > 0) {
      dy = outterLandMarkY - (middleLandmarkY - outterLandMarkY) * elongationY;
    } else {
      dy = outterLandMarkY + (outterLandMarkY - innerLandMarkY) * elongationY;
    }

    let dx = CenterX - JewelryWidth / 2;

    console.log();

    canvasCtx.drawImage(
      jewelryImage,
      dx * canvasElement.width,
      dy * canvasElement.height,
      JewelryWidth * canvasElement.width,
      JewelryHeight * canvasElement.width
    );
  }
}

//Draw keypoints
function drawKeyPoint(num, color = "orange", radius = 5) {
        drawPoint(
          landmarks[num].x * videoElement.videoWidth * finalVideoRatio,
          landmarks[num].y * videoElement.videoHeight * finalVideoRatio,
          String(num),
          color,
          radius
        );
      }

function smoothArray(smoothedArray, previousValue, currentValue) {
  return smoothedArray.push(
    previousValue * exponentialSmoothing +
      currentValue * (1 - exponentialSmoothing)
  );
}

function onResults(results) {
  document.body.classList.add("loaded");

  canvasCtx.save();

  canvasElement.width = videoElement.videoWidth * finalVideoRatio;
  canvasElement.height = videoElement.videoHeight * finalVideoRatio;

  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );

  if (results.multiFaceLandmarks) {
    const option = imagesList.options[imagesList.selectedIndex];
    const imageId = option && option.dataset.id;
    selectedImageId = imageId;
    const image = images.find((elem) => elem.id === imageId) || {};

    jewelryImage.src = image.src || "";

    for (const landmarks of results?.multiFaceLandmarks) {
      //drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
      //  color: "#C0C0C070",
      //  lineWidth: 1,
      //});
      //   drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {
      //     color: "#FF3030",
      //   });
      //   drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW, {
      //     color: "#FF3030",
      //   });
      //   drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, {
      //     color: "#30FF30",
      //   });
      //   drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW, {
      //     color: "#30FF30",
      //   });
      //   drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, {
      //     color: "#E0E0E0",
      //   });
      //   drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, {
      //     color: "#E0E0E0",
      //   });

      if (i == 0) {
        poseLandmarks93SmoothedX.push(landmarks[93].x);
        poseLandmarks93SmoothedY.push(landmarks[93].y);
        poseLandmarks137SmoothedX.push(landmarks[137].x);
        poseLandmarks137SmoothedY.push(landmarks[137].y);
        poseLandmarks123SmoothedX.push(landmarks[123].x);
        poseLandmarks123SmoothedY.push(landmarks[123].y);
        poseLandmarks352SmoothedX.push(landmarks[352].x);
        poseLandmarks352SmoothedY.push(landmarks[352].y);
        poseLandmarks366SmoothedX.push(landmarks[366].x);
        poseLandmarks366SmoothedY.push(landmarks[366].y);
        poseLandmarks323SmoothedX.push(landmarks[323].x);
        poseLandmarks323SmoothedY.push(landmarks[323].y);
      } else {
        smoothArray(
          poseLandmarks93SmoothedX,
          poseLandmarks93SmoothedX[i - 1],
          landmarks[93].x
        );

        smoothArray(
          poseLandmarks93SmoothedY,
          poseLandmarks93SmoothedY[i - 1],
          landmarks[93].y
        );

        smoothArray(
          poseLandmarks137SmoothedX,
          poseLandmarks137SmoothedX[i - 1],
          landmarks[137].x
        );

        smoothArray(
          poseLandmarks137SmoothedY,
          poseLandmarks137SmoothedY[i - 1],
          landmarks[137].y
        );

        smoothArray(
          poseLandmarks123SmoothedX,
          poseLandmarks123SmoothedX[i - 1],
          landmarks[123].x
        );

        smoothArray(
          poseLandmarks123SmoothedY,
          poseLandmarks123SmoothedY[i - 1],
          landmarks[123].y
        );

        smoothArray(
          poseLandmarks352SmoothedX,
          poseLandmarks352SmoothedX[i - 1],
          landmarks[352].x
        );

        smoothArray(
          poseLandmarks352SmoothedY,
          poseLandmarks352SmoothedY[i - 1],
          landmarks[352].y
        );

        smoothArray(
          poseLandmarks366SmoothedX,
          poseLandmarks366SmoothedX[i - 1],
          landmarks[366].x
        );

        smoothArray(
          poseLandmarks366SmoothedY,
          poseLandmarks366SmoothedY[i - 1],
          landmarks[366].y
        );

        smoothArray(
          poseLandmarks323SmoothedX,
          poseLandmarks323SmoothedX[i - 1],
          landmarks[323].x
        );

        smoothArray(
          poseLandmarks323SmoothedY,
          poseLandmarks323SmoothedY[i - 1],
          landmarks[323].y
        );
      }

      JewelryWidth =
        (Math.max(
          poseLandmarks352SmoothedX[i],
          poseLandmarks366SmoothedX[i],
          poseLandmarks323SmoothedX[i]
        ) -
          Math.min(
            poseLandmarks123SmoothedX[i],
            poseLandmarks137SmoothedX[i],
            poseLandmarks93SmoothedX[i]
          )) *
        jewelryWidthRatio;
      JewelryHeight = JewelryWidth * aspectRatio;

      drawEarring(
        poseLandmarks93SmoothedX[i],
        poseLandmarks137SmoothedX[i],
        poseLandmarks123SmoothedX[i],
        poseLandmarks93SmoothedY[i],
        poseLandmarks137SmoothedY[i],
        poseLandmarks123SmoothedY[i],
        jewelryImage,
        "left"
      );

      drawEarring(
        poseLandmarks323SmoothedX[i],
        poseLandmarks366SmoothedX[i],
        poseLandmarks352SmoothedX[i],
        poseLandmarks323SmoothedY[i],
        poseLandmarks366SmoothedY[i],
        poseLandmarks352SmoothedY[i],
        jewelryImage,
        "right"
      );

      //drawKeyPoint(93);
      //drawKeyPoint(137);
      //drawKeyPoint(323);
      //drawKeyPoint(366);
      //drawKeyPoint(123);
      //drawKeyPoint(352);
    }
    i++;
    console.log(i);
  }
  canvasCtx.restore();

  totalCounts++;
  console.log(totalCounts);
  let currentTime = Date.now();

  let FPS = (totalCounts / (currentTime - startTime)) * 1000; //time in miliseconds
  console.log("FPS", FPS);

  exponentialSmoothing = 0.01 * FPS + 0.16;
  console.log("exponentialSmoothing", exponentialSmoothing);
}

const faceMesh = new FaceMesh({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.3/${file}`;
  },
});
faceMesh.setOptions({
  selfieMode: true,
  maxNumFaces: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
faceMesh.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
  },
  // width: canvasWidth,
  // height: canvasHeight,
});

startTime = Date.now();
camera.start();
