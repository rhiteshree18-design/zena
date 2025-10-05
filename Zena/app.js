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

// Start the camera
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
const triggerCooldown = 1000; // milliseconds

function detectGesture(landmarks) {
    const now = Date.now();
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];

    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // --- Tab Switching (swipe left/right based on hand movement) ---
    const palmBase = landmarks[0]; // wrist base
    const indexBase = landmarks[5]; // base of index finger
    const horizontalMove = indexBase.x - palmBase.x;

    if (horizontalMove > 0.2) {
        currentGesture = "next_tab"; // swipe right
    } else if (horizontalMove < -0.2) {
        currentGesture = "previous_tab"; // swipe left
    }

    let currentGesture = null;

    // --- Zoom Gestures ---
    if (distance > 0.1) {
        currentGesture = "zoom_in";
    } else if (distance < 0.05) {
        currentGesture = "zoom_out";
    }

    // --- Scroll Gestures (using index finger Y movement) ---
    const indexY = indexTip.y;
    // The canvas coordinate system has y=0 at top; moving hand up decreases y
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
        case "next_tab":
            switchTab(1);
            console.log("Next Tab");
            speak("Next tab");
            break;

        case "previous_tab":
            switchTab(-1);
            console.log("Previous Tab");
            speak("Previous tab");
            break;

    }
}

// Optional Voice Feedback
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

function switchTab(direction) {
    const tabs = document.querySelectorAll(".tab");
    let activeIndex = Array.from(tabs).findIndex(t => t.classList.contains("active"));
    activeIndex = (activeIndex + direction + tabs.length) % tabs.length;
    tabs.forEach(t => t.classList.remove("active"));
    tabs[activeIndex].classList.add("active");
}
