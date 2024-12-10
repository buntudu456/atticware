const SPRITE_WIDTH = 807;
const SPRITE_HEIGHT = 807;
const BORDER_WIDTH = 0;
const SPACING_WIDTH = 0;
const ANIMATION_INTERVAL = 250;

let sentenceSets = [];
let currentSet = [];
let currentIndex = 0;
let isSpeaking = false;
let spriteSheetURL = '/img/spritesheet.png';
let audio = new Audio();
let spriteSheet = new Image();
spriteSheet.src = spriteSheetURL;

const canvas = document.getElementById('clownCanvas');
const context = canvas.getContext('2d');

function spritePositionToImagePosition(row, col) {
    return {
        x: BORDER_WIDTH + col * (SPACING_WIDTH + SPRITE_WIDTH),
        y: BORDER_WIDTH + row * (SPACING_WIDTH + SPRITE_HEIGHT)
    };
}

const walkCycle = [
    spritePositionToImagePosition(0, 1),
    spritePositionToImagePosition(0, 2),
    spritePositionToImagePosition(0, 3),
    spritePositionToImagePosition(0, 4),
    spritePositionToImagePosition(0, 5)
];

function drawFrame(frame, scale = 1) {
    const scaledWidth = 250 * scale;
    const scaledHeight = 250 * scale;
    const centerX = (canvas.width - scaledWidth) / 2;
    const centerY = (canvas.height - scaledHeight) / 2;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
        spriteSheet,
        frame.x, frame.y,
        SPRITE_WIDTH, SPRITE_HEIGHT,
        centerX, centerY,
        scaledWidth, scaledHeight
    );
}

function drawIdleFrame() {
    const idleFrame = walkCycle[4];
    drawFrame(idleFrame);
}

drawIdleFrame();

function drawRandomFrame() {
    const randomIndex = Math.floor(Math.random() * walkCycle.length);
    const randomFrame = walkCycle[randomIndex];
    drawFrame(randomFrame);
}

spriteSheet.onload = () => drawIdleFrame();

fetch('sentences.txt')
    .then(response => response.text())
    .then(data => {
        sentenceSets = data
            .split('\n\n')
            .map(set => {
                let parts = set.split('\n').filter(line => line.trim() !== '');
                let speed = parseInt(parts[0]);
                let audioSpeed = parseFloat(parts[1]);
                let sentences = parts.slice(2);
                return { speed, audioSpeed, sentences };
            });
    })
    .catch(error => console.error('Error loading sentences:', error));

canvas.addEventListener('click', () => {
    if (isSpeaking || sentenceSets.length === 0) return;

    isSpeaking = true;
    currentSet = sentenceSets[Math.floor(Math.random() * sentenceSets.length)];
    currentIndex = 0;

    if (currentSet.sentences.length > 0) {
        document.getElementById('speechText').textContent = currentSet.sentences[currentIndex];
        currentIndex++;
        speakWords(currentSet.sentences[0], currentSet.speed, currentSet.audioSpeed);
    }
});

function speakWords(sentence, speed, audioSpeed) {
    let words = sentence.split(' ');
    let wordIndex = 0;
    let textElement = document.getElementById('speechText');
    let lastTimestamp = 0;

    function playNextWord(timestamp) {
        if (wordIndex < words.length) {
            let timeElapsed = timestamp - lastTimestamp;
            if (timeElapsed >= speed) {
                let word = words[wordIndex];
                playWordSound(word, audioSpeed);
                drawRandomFrame();
                wordIndex++;
                textElement.textContent = words.slice(0, wordIndex).join(' ');
                lastTimestamp = timestamp;
            }
            requestAnimationFrame(playNextWord);
        } else {
            if (currentIndex < currentSet.sentences.length) {
                setTimeout(() => {
                    document.getElementById('speechText').textContent = currentSet.sentences[currentIndex];
                    currentIndex++;
                    speakWords(currentSet.sentences[currentIndex - 1], currentSet.speed, currentSet.audioSpeed);
                }, 1000);
            } else {
                isSpeaking = false;
                drawIdleFrame();
            }
        }
    }

    requestAnimationFrame(playNextWord);
}

function tweenScale(fromScale, toScale, duration, callback) {
    let startTime = null;

    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        let progress = (timestamp - startTime) / duration;
        if (progress < 1) {
            let scale = fromScale + (toScale - fromScale) * progress;
            callback(scale);
            requestAnimationFrame(animate);
        } else {
            callback(toScale);
        }
    }
    requestAnimationFrame(animate);
}

function playWordSound(word, audioSpeed) {
    // Skip if the word is empty or consists only of punctuation marks
    if (!word || /^[\W_]+$/.test(word)) return;

    let soundFile = `/sub/clown/speak/${word[0].toUpperCase()}.wav`;
    audio.volume = 0.08;
    audio.src = soundFile;
    audio.load();

    // Random frame for each word
    const randomFrame = walkCycle[Math.floor(Math.random() * walkCycle.length)];

    // Expand the sprite when the word starts
    tweenScale(1, 1.03, 200, scale => drawFrame(randomFrame, scale));

    audio.oncanplaythrough = () => {
        audio.play();

        // Shrink back to the original size when the word ends
        setTimeout(() => {
            tweenScale(1.03, 1, 150, scale => drawFrame(randomFrame, scale));
        }, (audio.duration || 0.5) * 1000); // Use 0.5s if audio duration is unavailable
    };
}