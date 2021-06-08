
 const VIDEO_WIDTH = 640;
 const VIDEO_HEIGHT = 500;
 
 const canvasElement = document.getElementById('output');
 const canvasCtx = canvasElement.getContext("2d");

 fingerLookupIndices = {
  thumb: [0, 1, 2, 3, 4],
  indexFinger: [0, 5, 6, 7, 8],
  middleFinger: [0, 9, 10, 11, 12],
  ringFinger: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20]
};

 function drawPoint(y, x, r) {
   ctx.beginPath();
   ctx.arc(x, y, r, 0, 2 * Math.PI);
   ctx.fill();
 }
 
 const jewelryImage = new Image();
 jewelryImage.src = "images/image-3.png";

 let exponentialSmoothing = 0.3; // 0.95 for Mozilla, 0.6 for Chrome, depends on web cam framerate
 // const exponentialSmoothingZ = 0.9; //Chrome
 const tooCloseRatio = 0.4;
 const tooFarRatio = 0.05;
 
 //Drawing conditions
 const ratio517 = 0.15;
 const ratioMCPPIPZ = 0.15;
 
 let i = 0;
 let totalCounts = 0;
 
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

 function drawKeypoints(keypoints) {
   const keypointsArray = keypoints;
 
   for (let i = 0; i < keypointsArray.length; i++) {
     const y = keypointsArray[i][0];
     const x = keypointsArray[i][1];
     drawPoint(x - 2, y - 2, 3);
   }
 
   const fingers = Object.keys(fingerLookupIndices);
   for (let i = 0; i < fingers.length; i++) {
     const finger = fingers[i];
     const points = fingerLookupIndices[finger].map(idx => keypoints[idx]);
     drawPath(points, false);
   }
 }
 
 function drawPath(points, closePath) {
   const region = new Path2D();
   region.moveTo(points[0][0], points[0][1]);
   for (let i = 1; i < points.length; i++) {
     const point = points[i];
     region.lineTo(point[0], point[1]);
   }
 
   if (closePath) {
     region.closePath();
   }
   ctx.stroke(region);
 }
 
 let model;
 
 async function setupCamera() {
   if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
     throw new Error(
         'Browser API navigator.mediaDevices.getUserMedia not available');
   }
 
   const video = document.getElementById('video');
   const stream = await navigator.mediaDevices.getUserMedia({
     'audio': false,
     'video': {
       facingMode: 'user',
       // Only setting the video to a specified size in order to accommodate a
       // point cloud, so on mobile devices accept the default size.
       width: VIDEO_WIDTH,
       height: VIDEO_HEIGHT
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
     let info = document.getElementById('info');
     info.textContent = e.message;
     info.style.display = 'block';
     throw e;
   }


 
   // These anchor points allow the hand pointcloud to resize according to its
   // position in the input.
   ANCHOR_POINTS = [
     [0, 0, 0], [0, -VIDEO_HEIGHT, 0], [-VIDEO_WIDTH, 0, 0],
     [-VIDEO_WIDTH, -VIDEO_HEIGHT, 0]
   ];
   
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
  
      let smoothedMCPX = smoothArray(fingerMCPX[i - 1], landmarks[mcpLandmark][0]);
      let smoothedPIPX = smoothArray(fingerPIPX[i - 1], landmarks[pipLandmark][0]);
      let smoothedMCPY = smoothArray(fingerMCPY[i - 1], landmarks[mcpLandmark][1]);
      let smoothedPIPY = smoothArray(fingerPIPY[i - 1], landmarks[pipLandmark][1]);
      let smoothedMCPZ = smoothArray(fingerMCPZ[i - 1], landmarks[mcpLandmark][2]);
      let smoothedPIPZ = smoothArray(fingerPIPZ[i - 1], landmarks[pipLandmark][2]);
      let smoothed5Z;
      let smoothed17Z;
      
      /*if (FINGER === "indexFinger") {
        smoothed5Z = smoothedMCPZ;
      } else {
        smoothed5Z = smoothArray(landmarks5Z[i - 1], landmarks[5][2]);
      }
  
      if (FINGER === "pinky") {
        smoothed17Z = smoothedMCPZ;
      } else {
        smoothed17Z = smoothArray(landmarks17Z[i - 1], landmarks[17][2]);
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
      */
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
      let width =
      mcpipDistance * ringFingerJewelryWidthCoef;
    let height = aspectRatio * width;

    let centerX =
      (smoothedMCPX + (smoothedPIPX - smoothedMCPX) * ringFingerCenterCoef);
    let centerY =
      (smoothedMCPY + (smoothedPIPY - smoothedMCPY) * ringFingerCenterCoef);

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
      
      
      //drawKeypoints(landmarks, predictions[0].annotations);
    i++;

    }
     rafID = requestAnimationFrame(frameLandmarks);
   };
 
   frameLandmarks();
 };
 
 navigator.getUserMedia = navigator.getUserMedia ||
     navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
 
 main();