const videoElement = document.querySelector('.input_video');
const canvasElement = document.querySelector('.output_canvas');
const canvasCtx = canvasElement.getContext('2d');

// Initialize MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

// Start camera
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});
camera.start();

// On detection result
hands.onResults((results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#0f0', lineWidth: 3 });
        drawLandmarks(canvasCtx, landmarks, { color: '#f00', radius: 2 });
        detectGesture(landmarks);
    }

    canvasCtx.restore();
});

// Gesture Detection with Cooldown
let lastGesture = null;
let lastTriggerTime = 0;
const triggerCooldown = 1500; // milliseconds

function detectGesture(landmarks) {
    const now = Date.now();
    let currentGesture = null;

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const indexBase = landmarks[5];
    const middleBase = landmarks[9];
    const ringBase = landmarks[13];
    const pinkyBase = landmarks[17];

    // --- Gesture 1: Open Palm 🖐️ ---
    // All fingers extended (tips above bases)
    const isOpenPalm =
        indexTip.y < indexBase.y &&
        middleTip.y < middleBase.y &&
        ringTip.y < ringBase.y &&
        pinkyTip.y < pinkyBase.y;

    // --- Gesture 2: Peace Sign ✌️ ---
    // Index + middle up, ring + pinky down
    const isPeaceSign =
        indexTip.y < indexBase.y &&
        middleTip.y < middleBase.y &&
        ringTip.y > ringBase.y &&
        pinkyTip.y > pinkyBase.y;

    if (isOpenPalm) {
        currentGesture = "open_youtube";
    } else if (isPeaceSign) {
        currentGesture = "open_atharva";
    }

    // --- Zoom Gestures ---
    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.1) {
        currentGesture = "zoom_in";
    } else if (distance < 0.05) {
        currentGesture = "zoom_out";
    }

    // --- Scroll Gestures ---
    const indexY = indexTip.y;
    if (indexY < 0.3) {
        currentGesture = "scroll_up";
    } else if (indexY > 0.7) {
        currentGesture = "scroll_down";
    }

    if (
        currentGesture &&
        (currentGesture !== lastGesture || (now - lastTriggerTime > triggerCooldown))
    ) {
        performAction(currentGesture);
        lastGesture = currentGesture;
        lastTriggerTime = now;
    }
}

// Perform Action
function performAction(action) {
    let currentZoom = parseFloat(document.body.style.zoom || 1);

    switch (action) {
        case "zoom_in":
            currentZoom += 0.1;
            if (currentZoom > 2) currentZoom = 2;
            document.body.style.zoom = currentZoom.toFixed(2);
            console.log("Zooming In");
            speak("Zooming in");
            break;

        case "zoom_out":
            currentZoom -= 0.1;
            if (currentZoom < 0.5) currentZoom = 0.5;
            document.body.style.zoom = currentZoom.toFixed(2);
            console.log("Zooming Out");
            speak("Zooming out");
            break;

        case "scroll_up":
            window.scrollBy({ top: -200, behavior: "smooth" });
            console.log("Scrolling Up");
            speak("Scrolling up");
            break;

        case "scroll_down":
            window.scrollBy({ top: 200, behavior: "smooth" });
            console.log("Scrolling Down");
            speak("Scrolling down");
            break;

        case "open_youtube":
            console.log("Opening YouTube");
            speak("Opening YouTube");
            window.location.href = "https://www.youtube.com";
            break;

        case "open_atharva":
            console.log("Opening Atharva College of Engineering");
            speak("Opening Atharva College of Engineering website");
            window.location.href = "https://www.atharvacoe.ac.in";
            break;
    }
}

// Voice Feedback
function speak(text) {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    utter.pitch = 1;
    utter.rate = 1;
    utter.volume = 1;
    synth.speak(utter);
}

window.onload = function () {
    speak("Hello, ZENA is ready to assist you");
};
