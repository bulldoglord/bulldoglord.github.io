
 const VIDEO_WIDTH = 640;
 const VIDEO_HEIGHT = 500;
 
 const canvasElement = document.getElementById('output');
 const canvasCtx = canvasElement.getContext("2d");
 
 canvasElement.style.cssText =
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

 let exponentialSmoothing = 0.3;
 const widthCoef = 0.9;
 const posCoef = 0.5;

 
 let i = 0;
 

 let wrist_x = [];
 let wrist_y = [];
 let ring_mpc_x = [];
 let ring_mpc_y = [];
 
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
         'Browser API navigator.mediaDevices.getUserMedia not available');
   }
 
   const video = document.getElementById('video');
   const stream = await navigator.mediaDevices.getUserMedia({
     'audio': false,
     'video': {
       facingMode: 'user',
       // Only setting the video to a specified size in order to accommodate a
       // point cloud, so on mobile devices accept the default size.
       width: undefined,
       height: undefined
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
    
    console.log("predictions", predictions)

    if (predictions.length > 0) {
      const landmarks = predictions[0].landmarks;

      const option = imagesList.options[imagesList.selectedIndex];
      const imageId = option && option.dataset.id;
      selectedImageId = imageId;
      const image = images.find((elem) => elem.id === imageId) || {};
      jewelryImage.src = image.src || "";

      let smoothedWristX = smoothArray(wrist_x[i - 1], landmarks[0][0]);
      let smoothedRingX = smoothArray(ring_mpc_x[i - 1], landmarks[13][0]);
      let smoothedWristY = smoothArray(wrist_y[i - 1], landmarks[0][1]);
      let smoothedRingY = smoothArray(ring_mpc_y[i - 1], landmarks[13][1]);
      
      if (i === 0) {
        wrist_x.push(landmarks[0][0]);
        wrist_y.push(landmarks[0][1]);
        ring_mpc_x.push(landmarks[13][0]);
        ring_mpc_y.push(landmarks[13][1]);
      } else {
        wrist_x.push(smoothedWristX);
        wrist_y.push(smoothedWristY);
        ring_mpc_x.push(smoothedRingX);
        ring_mpc_y.push(smoothedRingY);
      }
  
      let x_angle = -Math.atan((wrist_x[i]-ring_mpc_x[i])/(wrist_y[i] - ring_mpc_y[i]));
      let distance = pointsDistance(wrist_x[i], wrist_y[i], ring_mpc_x[i], ring_mpc_y[i]);
      let width = distance * widthCoef;
      let height = width * aspectRatio; 
      let x = (wrist_x[i] - (ring_mpc_x[i] - wrist_x[i]) * posCoef);
      let y = (wrist_y[i] - (ring_mpc_y[i] - wrist_y[i]) * posCoef);
    

      canvasCtx.translate(x, y);
      canvasCtx.rotate(x_angle);
      canvasCtx.translate(-x, -y);
      canvasCtx.drawImage(jewelryImage,x - width / 2, y - height / 2, width, height);

      canvasCtx.restore();
      i++;

    }
     rafID = requestAnimationFrame(frameLandmarks);
   };
 
   frameLandmarks();
 };
 
 navigator.getUserMedia = navigator.getUserMedia ||
     navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
 
 main();
