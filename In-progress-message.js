let isRecording = false;
let isLocked = false;
let isDeleteActive = false;
let isToggling = false;
let smileTogglerState = 'smile';
let mediaRecorder;
let audioChunks = [];
let videoChunks = [];
let audioContext;
let analyser;
let dataArray;
let stream = null;
let startTime;
let timerInterval;
let dotBlinkInterval;
let initialTouchY;
let initialTouchX;
let micIconStartX;
let elapsedTime = 0;
let touchTimeout;
let isHolding = false;
let recordingType = 'audio';
let activeMessageElement = null;
let startX = 0;
let currentX = 0;
let isSliding = false;
const replyThreshold = 40;
let repliedToMessageId = null;
let repliedToMessageText = '';
let repliedToMessageSender = '';
let isReplyActive = false;
let audioBlob = null;
let audioUrl = null;
let isAudioPreviewActive = false;
let voiceWaveInterval = null;

let micIcon = document.getElementById('micIcon');
let recordingInterface = document.getElementById('recordingInterface');
let lockedTimer = document.getElementById('lockedTimer');
let sendBtn = document.getElementById('sendBtn');
let inputField = document.getElementById('inputField');
let smileToggler = document.getElementById('smileToggler');
const emojiPicker = document.getElementById('emojiPicker');
let pinIcon = document.getElementById('pinIcon');
const chatContainer = document.getElementById('chatContainer');
const inputContainer = document.getElementById('inputContainer');
const videoOverlay = document.getElementById('videoOverlay');
const videoPreview = document.getElementById('videoPreview');
const replyPreviewContainer = document.getElementById('replyPreviewContainer');
const replySenderName = document.getElementById('replySenderName');
const replyMessageText = document.getElementById('replyMessageText');
const closeReplyBtn = document.getElementById('closeReplyBtn');
const smileyTab = document.getElementById('smileyTab');
const gifTab = document.getElementById('gifTab');
const emojiPickerBody = document.getElementById('emojiPickerBody');
let voiceWave = document.getElementById('voice-wave');

// Hold state detector for voice wave
function holdStateDetector() {
    if (isRecording && !isLocked && recordingType === 'audio' && voiceWave) {
        console.log('Hold state detected: Starting voice wave');
        startVoiceWave();
    } else {
        console.log('Hold state ended or not applicable:', { isRecording, isLocked, recordingType, voiceWave: !!voiceWave });
        clearInterval(voiceWaveInterval);
        voiceWaveInterval = null;
        if (voiceWave) {
            voiceWave.style.display = 'none';
            console.log('Voice wave stopped by holdStateDetector');
        }
    }
}

// Initialize MediaRecorder and AudioContext
function initializeRecorder(type) {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    return navigator.mediaDevices.getUserMedia(type === 'audio' ? { audio: true } : { video: true, audio: true })
        .then(s => {
            stream = s;
            mediaRecorder = new MediaRecorder(stream);
            if (type === 'audio') {
                if (!audioContext) {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log('AudioContext initialized');
                }
                analyser = audioContext.createAnalyser();
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                analyser.fftSize = 256;
                dataArray = new Uint8Array(analyser.frequencyBinCount);
                console.log('Analyser and dataArray initialized');
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };
            } else {
                mediaRecorder.ondataavailable = (event) => {
                    videoChunks.push(event.data);
                };
            }
            mediaRecorder.onstop = () => {
                if (type === 'audio') {
                    audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    audioUrl = URL.createObjectURL(audioBlob);
                } else {
                    const videoBlob = new Blob(videoChunks, { type: 'video/mp4' });
                    console.log('Video note sent:', videoBlob);
                }
                audioChunks = [];
                videoChunks = [];
                isRecording = false;
                isLocked = false;
                isDeleteActive = false;
                elapsedTime = 0;
                clearInterval(timerInterval);
                clearInterval(dotBlinkInterval);
                clearInterval(voiceWaveInterval);
                voiceWaveInterval = null;
                if (voiceWave) {
                    voiceWave.style.display = 'none';
                    console.log('Voice wave stopped in mediaRecorder.onstop');
                }
                hideRecordingInterface();
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    stream = null;
                }
                holdStateDetector();
            };
            return stream;
        })
        .catch(err => {
            console.error('Error accessing media device:', err);
            alert('Failed to access microphone or camera. Please check permissions.');
            return null;
        });
}

// Start voice wave animation
function startVoiceWave() {
    if (recordingType !== 'audio' || !analyser || isLocked || !voiceWave) {
        console.log('Voice wave not started:', { recordingType, analyser: !!analyser, isLocked, voiceWave: !!voiceWave });
        return;
    }
    console.log('Starting voice wave animation');
    voiceWave.style.display = 'block';
    clearInterval(voiceWaveInterval);
    voiceWaveInterval = setInterval(() => {
        if (!isRecording || isLocked || !voiceWave) {
            voiceWave.style.display = 'none';
            clearInterval(voiceWaveInterval);
            voiceWaveInterval = null;
            console.log('Voice wave stopped:', { isRecording, isLocked });
            return;
        }
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const val = (dataArray[i] - 128) / 128;
            sum += val * val;
        }
        const volume = Math.sqrt(sum / dataArray.length);
        const scale = 1 + volume * 10;
        voiceWave.style.transform = `translate(-50%, -50%) scale(${scale})`;
        voiceWave.style.opacity = volume > 0.02 ? 0.6 : 0.1;
        console.log('Voice wave updated:', { volume, scale, opacity: voiceWave.style.opacity });
    }, 100);
}

// Setup video preview
function setupVideoPreview() {
    if (recordingType === 'video' && stream && videoPreview) {
        videoPreview.srcObject = stream;
        videoPreview.play().catch(err => {
            console.error('Error playing video preview:', err);
        });
    }
}

// Create audio preview
function createAudioPreview() {
    if (!audioBlob || isAudioPreviewActive) return;
    isAudioPreviewActive = true;
    
    const isInputFocused = document.activeElement === inputField;

    let tempInput = null;
    if (isInputFocused) {
        tempInput = document.createElement('input');
        tempInput.style.position = 'absolute';
        tempInput.style.opacity = '0';
        tempInput.style.height = '0';
        tempInput.style.width = '0';
        tempInput.style.pointerEvents = 'none';
        document.body.appendChild(tempInput);
        tempInput.focus();
    }

    const audioMessage = document.createElement('div');
    audioMessage.className = 'audio-message';
    
    audioMessage.style.position = 'absolute';
    audioMessage.style.top = '0';
    audioMessage.style.left = '0';
    audioMessage.style.width = '100%';
    audioMessage.style.zIndex = '10';
    audioMessage.style.boxSizing = 'border-box';
    
    const totalElements = 30;
    const numBars = Math.random() < 0.5 ? 2 : 3;
    const barIndices = [];
    while (barIndices.length < numBars) {
        const index = Math.floor(Math.random() * totalElements);
        if (!barIndices.includes(index)) {
            barIndices.push(index);
        }
    }
    let waveformHTML = '<div class="waveform" id="waveform">';
    for (let i = 0; i < totalElements; i++) {
        const isBar = barIndices.includes(i);
        waveformHTML += `<div class="bar${isBar ? ' is-bar' : ''}"></div>`;
    }
    waveformHTML += '</div>';

    audioMessage.innerHTML = `
        <div class="x-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        </div>
        <button class="play-button" id="audioPlayButton">
            <i class="fas fa-play" id="play-icon"></i>
        </button>
        ${waveformHTML}
        <div class="duration" id="audioDuration">${formatDuration(elapsedTime)}</div>
        <button class="send-button">
            <i class="fas fa-arrow-up"></i>
        </button>
    `;
    
    inputContainer.appendChild(audioMessage);
    
    if (smileToggler) smileToggler.style.display = 'none';
    if (pinIcon) pinIcon.style.display = 'none';
    if (micIcon) micIcon.style.display = 'none';

    if (inputField) inputField.style.display = 'block';
    if (sendBtn) sendBtn.style.display = isLocked ? 'none' : (inputField.value.trim() ? 'inline-flex' : 'none');

    if (isInputFocused) {
        requestAnimationFrame(() => {
            setTimeout(() => {
                inputField.focus();
                const focusEvent = new Event('focus', { bubbles: true });
                const inputEvent = new Event('input', { bubbles: true });
                inputField.dispatchEvent(focusEvent);
                inputField.dispatchEvent(inputEvent);
                if (tempInput) {
                    document.body.removeChild(tempInput);
                    tempInput = null;
                }
                console.log('Keyboard focus restored to inputField');
            }, 100);
        });
    }

    inputContainer.style.height = 'auto';
    const currentInputContainerHeight = inputContainer.offsetHeight;
    chatContainer.style.height = `calc(100vh - ${currentInputContainerHeight}px)`;
    chatContainer.style.marginBottom = `${currentInputContainerHeight}px`;
    document.documentElement.style.setProperty('--input-container-height', `${currentInputContainerHeight}px`);

    const waveform = audioMessage.querySelector('#waveform');
    const bars = waveform.querySelectorAll('.bar');
    const audio = new Audio(audioUrl);
    const playButton = audioMessage.querySelector('#audioPlayButton');
    const playIcon = audioMessage.querySelector('#play-icon');
    let isPlaying = false;
    let interval;
    let index = 0;
    function resetWaveform() {
        bars.forEach(bar => bar.classList.remove('active'));
        clearInterval(interval);
        index = 0;
        isPlaying = false;
        playIcon.classList.replace('fa-pause', 'fa-play');
    }
    playButton.addEventListener('click', (e) => {
        if (isInputFocused) {
            e.preventDefault();
            inputField.focus();
        }
        if (isPlaying) {
            audio.pause();
            resetWaveform();
        } else {
            audio.currentTime = 0;
            audio.play().catch(err => {
                console.error('Error playing audio:', err);
                alert('Failed to play audio.');
            });
            playIcon.classList.replace('fa-play', 'fa-pause');
            isPlaying = true;
            const duration = elapsedTime;
            const intervalTime = (duration * 1000) / bars.length;
            interval = setInterval(() => {
                if (index >= bars.length) {
                    resetWaveform();
                    audio.pause();
                    return;
                }
                bars.forEach((bar, i) => {
                    bar.classList.toggle('active', i === index);
                });
                index++;
            }, intervalTime);
        }
    });
    audio.onended = () => {
        resetWaveform();
    };
    audioMessage.querySelector('.x-icon').addEventListener('click', () => {
        if (isPlaying) audio.pause();
        URL.revokeObjectURL(audioUrl);
        audioBlob = null;
        audioUrl = null;
        isAudioPreviewActive = false;
        resetInputContainer();
    });
    audioMessage.querySelector('.send-button').addEventListener('click', () => {
        if (isPlaying) audio.pause();
        console.log('Audio note sent:', audioBlob);
        URL.revokeObjectURL(audioUrl);
        audioBlob = null;
        audioUrl = null;
        isAudioPreviewActive = false;
        resetInputContainer();
    });
}

// Reset input container to original state
function resetInputContainer() {
    const audioMessage = inputContainer.querySelector('.audio-message');
    if (audioMessage) {
        inputContainer.removeChild(audioMessage);
    }
    isAudioPreviewActive = false;
    
    if (smileToggler) {
        smileToggler.style.display = 'inline-flex';
        smileToggler.classList.remove('disabled');
    }
    if (pinIcon) {
        pinIcon.style.display = inputField.value.trim() && !isLocked ? 'none' : 'inline-flex';
    }
    if (micIcon) {
        micIcon.style.display = inputField.value.trim() && !isLocked ? 'none' : 'inline-flex';
    }
    if (inputField) inputField.style.display = 'block';
    if (sendBtn) sendBtn.style.display = isLocked ? 'none' : (inputField.value.trim() ? 'inline-flex' : 'none');

    const currentInputContainerHeight = inputContainer.offsetHeight;
    chatContainer.style.height = `calc(100vh - ${currentInputContainerHeight}px)`;
    chatContainer.style.marginBottom = `${currentInputContainerHeight}px`;
    document.documentElement.style.setProperty('--input-container-height', `${currentInputContainerHeight}px`);
    scrollToLatestMessage();
    voiceWave = document.getElementById('voice-wave');
    if (voiceWave) {
        voiceWave.style.display = 'none';
        console.log('Voice wave reset in resetInputContainer');
    } else {
        console.warn('voiceWave element not found in resetInputContainer');
    }
    holdStateDetector();
}

// Reassign DOM elements after resetting input container
function assignDOMElements() {
    inputField = document.getElementById('inputField');
    sendBtn = document.getElementById('sendBtn');
    smileToggler = document.getElementById('smileToggler');
    pinIcon = document.getElementById('pinIcon');
    micIcon = document.getElementById('micIcon');
    recordingInterface = document.getElementById('recordingInterface');
    lockedTimer = document.getElementById('lockedTimer');
    voiceWave = document.getElementById('voice-wave');
    inputField.addEventListener('click', inputFieldClickHandler);
    inputField.addEventListener('focus', inputFieldFocusHandler);
    inputField.addEventListener('blur', inputFieldBlurHandler);
    inputField.addEventListener('input', inputFieldInputHandler);
    inputField.addEventListener('keydown', inputFieldKeydownHandler);
    sendBtn.addEventListener('click', sendBtnClickHandler);
    smileToggler.addEventListener('click', toggleEmojiPicker);
    pinIcon.addEventListener('click', pinIconClickHandler);
    micIcon.addEventListener('touchstart', micIconTouchstartHandler);
    micIcon.addEventListener('touchmove', micIconTouchmoveHandler);
    micIcon.addEventListener('touchend', micIconTouchendHandler);
}

// Format duration for display
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Start recording
function startRecording() {
    const currentIcon = micIcon.querySelector('i');
    if (!isRecording && currentIcon) {
        recordingType = currentIcon.classList.contains('fa-video') ? 'video' : 'audio';
        initializeRecorder(recordingType).then(s => {
            if (s) {
                stream = s;
                audioChunks = [];
                videoChunks = [];
                mediaRecorder.start();
                isRecording = true;
                startTime = Date.now();
                startDotBlink();
                showRecordingInterface();
                micIcon.style.width = '72px';
                micIcon.style.height = '72px';
                micIcon.style.right = '-20px';
                micIcon.style.position = 'absolute';
                micIcon.style.marginRight = '0';
                micIcon.style.transition = 'none';
                timerInterval = setInterval(startTimer, 100);
                smileToggler.classList.remove('fa-smile', 'fa-keyboard');
                smileToggler.classList.add('red-dot');
                smileToggler.innerHTML = '';
                smileTogglerState = 'dot';
                if (recordingType === 'audio') {
                    voiceWave = document.getElementById('voice-wave');
                    if (voiceWave) {
                        holdStateDetector();
                    } else {
                        console.error('voiceWave element not found in startRecording');
                    }
                }
            }
        });
    }
}

// Stop recording
function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        clearInterval(dotBlinkInterval);
        clearInterval(voiceWaveInterval);
        voiceWaveInterval = null;
        if (voiceWave) {
            voiceWave.style.display = 'none';
            console.log('Voice wave stopped in stopRecording');
        }
        const lockedCircle = recordingInterface.querySelector('.locked-circle');
        if (lockedCircle) {
            lockedCircle.classList.remove('locked');
        }
        const holdCircle = recordingInterface.querySelector('.hold-circle');
        if (holdCircle) {
            holdCircle.classList.remove('active');
            holdCircle.style.display = 'none'; // Explicitly hide in stopRecording
        }
        if (recordingType === 'audio') {
            setTimeout(() => {
                createAudioPreview();
            }, 0);
        }
        holdStateDetector();
    }
}

// Cancel recording
function cancelRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        audioChunks = [];
        videoChunks = [];
        isRecording = false;
        isLocked = false;
        isDeleteActive = false;
        elapsedTime = 0;
        clearInterval(timerInterval);
        clearInterval(dotBlinkInterval);
        clearInterval(voiceWaveInterval);
        voiceWaveInterval = null;
        if (voiceWave) {
            voiceWave.style.display = 'none';
            console.log('Voice wave stopped in cancelRecording');
        } else {
            console.warn('voiceWave element not found in cancelRecording');
        }
        if (videoOverlay) videoOverlay.classList.remove('active');
        if (videoPreview) videoPreview.srcObject = null;
        hideRecordingInterface();
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        console.log(`${recordingType === 'audio' ? 'Voice' : 'Video'} note recording canceled and deleted.`);
        resetInputContainer();
    }
}

// Timer function
function startTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    elapsedTime = elapsed;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
    const timeString = `${minutes}:${formattedSeconds}.0`;
    lockedTimer.textContent = timeString;
}

// Start dot blink
function startDotBlink() {
    if (dotBlinkInterval) clearInterval(dotBlinkInterval);
    const lockedCircle = recordingInterface.querySelector('.locked-circle');
    const holdCircle = document.querySelector('.hold-circle');
    if (holdCircle) {
        if (isRecording && !isLocked) {
            holdCircle.classList.add('active');
            holdCircle.style.display = 'inline-flex'; // Show in hold state
        } else {
            holdCircle.classList.remove('active');
            holdCircle.style.display = 'none'; // Hide in locked state or not recording
        }
    }
    if (lockedCircle && isRecording && isLocked) {
        lockedCircle.classList.add('locked');
        lockedCircle.style.display = 'inline-flex'; // Ensure locked-circle is visible
    }
}

// Show recording interface
function showRecordingInterface() {
    if (isRecording) {
        recordingInterface.style.display = 'flex';
        updateRecordingInterface();
        inputField.classList.add('recording');
        micIcon.classList.add('recording');
        pinIcon.style.display = 'none';
        sendBtn.classList.remove('active');
        sendBtn.style.display = 'none';
        if (recordingType === 'video' && videoOverlay) {
            videoOverlay.classList.add('active');
            if (emojiPicker.classList.contains('active')) {
                videoOverlay.classList.add('emoji-picker-active');
                videoOverlay.classList.remove('keyboard-active');
                const pickerHeight = emojiPicker.offsetHeight;
                document.documentElement.style.setProperty('--emoji-picker-height', `${pickerHeight}px`);
            } else if (document.activeElement === inputField) {
                videoOverlay.classList.add('keyboard-active');
                videoOverlay.classList.remove('emoji-picker-active');
                const estimatedKeyboardHeight = Math.min(window.innerHeight * 0.4, 200);
                document.documentElement.style.setProperty('--emoji-picker-height', `${estimatedKeyboardHeight}px`);
            }
            setupVideoPreview();
        }
        lockedTimer.style.display = 'inline-block';
    }
}

// Hide recording interface
function hideRecordingInterface() {
    recordingInterface.style.display = 'none';
    inputField.classList.remove('recording');
    micIcon.classList.remove('recording', 'dragging', 'locked');
    micIcon.style.width = '36px';
    micIcon.style.height = '36px';
    micIcon.style.transform = 'translate(0, 0)';
    micIcon.style.position = 'relative';
    micIcon.style.right = 'auto';
    micIcon.style.marginRight = '8px';
    pinIcon.style.display = inputField.value.trim() && !isLocked ? 'none' : 'inline-flex';
    inputField.disabled = false;
    if (videoOverlay) videoOverlay.classList.remove('active', 'emoji-picker-active', 'keyboard-active');
    if (videoPreview) videoPreview.srcObject = null;
    document.documentElement.style.removeProperty('--emoji-picker-height');
    if (emojiPicker.classList.contains('active')) {
        smileToggler.classList.remove('fa-smile', 'red-dot', 'trash-icon');
        smileToggler.classList.add('fa-keyboard');
        smileToggler.innerHTML = '';
        smileTogglerState = 'keyboard';
    } else {
        smileToggler.classList.remove('fa-keyboard', 'red-dot', 'trash-icon');
        smileToggler.classList.add('fa-smile');
        smileToggler.innerHTML = '';
        smileTogglerState = 'smile';
    }
    micIcon.innerHTML = recordingType === 'video' ? '<i class="fas fa-video"></i><div id="voice-wave" style="display: none;"></div>' : '<i class="fas fa-microphone"></i><div id="voice-wave" style="display: none;"></div>';
    voiceWave = document.getElementById('voice-wave');
    sendBtn.classList.remove('active');
    sendBtn.style.display = isLocked ? 'none' : (inputField.value.trim() ? 'inline-flex' : 'none');
    sendBtn.style.color = '#749cbf';
    micIcon.style.display = inputField.value.trim() && !isLocked ? 'none' : 'inline-flex';
    const lockedCircle = recordingInterface.querySelector('.locked-circle');
    if (lockedCircle) {
        lockedCircle.classList.remove('locked');
        lockedCircle.style.display = 'none'; // Hide when not recording
    }
    const holdCircle = recordingInterface.querySelector('.hold-circle');
    if (holdCircle) {
        holdCircle.classList.remove('active');
        holdCircle.style.display = 'none'; // Hide when not recording
    }
    const cancelLabel = recordingInterface.querySelector('.cancel-label');
    if (cancelLabel) {
        cancelLabel.style.left = '8px';
        cancelLabel.style.opacity = '0.8';
        cancelLabel.style.transition = '';
    }
    lockedTimer.style.display = 'none';
    if (voiceWave) {
        voiceWave.style.display = 'none';
        console.log('Voice wave hidden in hideRecordingInterface');
    }
    holdStateDetector();
}

// Update recording interface
function updateRecordingInterface() {
    const inputStyles = window.getComputedStyle(inputField);
    recordingInterface.style.width = inputStyles.width;
    recordingInterface.style.height = inputStyles.height;
    const cancelLabel = recordingInterface.querySelector('.cancel-label');
    if (cancelLabel) {
        cancelLabel.style.left = '8px';
        cancelLabel.style.fontSize = '12px';
        cancelLabel.style.marginRight = '10px';
        cancelLabel.style.position = 'relative';
        cancelLabel.style.top = '6px';
        cancelLabel.style.color = '#666';
        cancelLabel.style.opacity = '0.8';
        cancelLabel.style.whiteSpace = 'nowrap';
        cancelLabel.style.display = isLocked ? 'none' : 'flex';
        cancelLabel.style.alignItems = 'center';
        cancelLabel.style.transition = 'left 0.3s ease-out, opacity 0.3s ease-out';
    }
    const cancelLink = recordingInterface.querySelector('.cancel-link');
    if (cancelLink) {
        cancelLink.style.left = '8px';
        cancelLink.style.fontSize = '28px';
        cancelLink.style.marginRight = '15px';
        cancelLink.style.position = 'relative';
        cancelLink.style.top = '2px';
        cancelLink.style.color = '#749cbf';
        cancelLink.style.opacity = '0.8';
        cancelLink.style.whiteSpace = 'nowrap';
        cancelLink.style.display = isLocked ? 'flex' : 'none';
        cancelLink.style.alignItems = 'center';
        cancelLink.style.cursor = 'pointer';
        cancelLink.onclick = (e) => {
            e.preventDefault();
            if (isRecording) {
                if (recordingType === 'audio') {
                    stopRecording();
                } else {
                    cancelRecording();
                }
            }
        };
    }
    const holdCircle = recordingInterface.querySelector('.hold-circle');
    if (holdCircle) {
        holdCircle.classList.toggle('active', isRecording && !isLocked && !isDeleteActive);
        holdCircle.style.display = isRecording && !isLocked ? 'inline-flex' : 'none'; // Show only in hold state
    }
    const lockedCircle = recordingInterface.querySelector('.locked-circle');
    if (lockedCircle) {
        lockedCircle.classList.toggle('locked', isRecording && isLocked);
        lockedCircle.style.display = isRecording && isLocked ? 'inline-flex' : 'none'; // Show only in locked state
        if (isLocked) {
            sendBtn.style.display = 'none'; // Hide default sendBtn
        }
    }
    lockedTimer.style.fontSize = '22.5px';
    lockedTimer.style.marginLeft = '-13px';
    lockedTimer.style.position = 'relative';
    lockedTimer.style.marginTop = '12.5px';
    lockedTimer.style.color = '#91959c';
    lockedTimer.style.display = isRecording ? 'inline-block' : 'none';
}

// Toggle emoji picker
function toggleEmojiPicker() {
    if (isToggling || isAudioPreviewActive || isRecording) {
        console.log('Toggle blocked:', { isToggling, isAudioPreviewActive, isRecording });
        return;
    }
    isToggling = true;
    setTimeout(() => { isToggling = false; }, 300);
    const isActive = emojiPicker.classList.contains('active');
    const containerHeight = inputContainer.offsetHeight;
    const maxPickerHeight = window.innerHeight - containerHeight;
    const pickerHeight = Math.min(maxPickerHeight * 0.5, 300);
    if (isActive) {
        chatContainer.style.height = `calc(100vh - ${containerHeight}px)`;
        chatContainer.style.marginBottom = `${containerHeight}px`;
        inputContainer.style.bottom = '0';
        emojiPicker.classList.remove('active');
        videoOverlay.classList.remove('emoji-picker-active', 'keyboard-active');
        document.documentElement.style.removeProperty('--emoji-picker-height');
        smileToggler.classList.remove('fa-keyboard');
        smileToggler.classList.add('fa-smile');
        smileToggler.innerHTML = '';
        smileTogglerState = 'smile';
    } else {
        emojiPicker.style.height = `${pickerHeight}px`;
        inputContainer.style.bottom = `${pickerHeight}px`;
        chatContainer.style.height = `calc(100vh - ${pickerHeight + containerHeight}px)`;
        chatContainer.style.marginBottom = `${pickerHeight + containerHeight}px`;
        emojiPicker.classList.add('active');
        videoOverlay.classList.add('emoji-picker-active');
        videoOverlay.classList.remove('keyboard-active');
        document.documentElement.style.setProperty('--emoji-picker-height', `${pickerHeight}px`);
        smileToggler.classList.remove('fa-smile', 'red-dot');
        smileToggler.classList.add('fa-keyboard');
        smileToggler.innerHTML = '';
        smileTogglerState = 'keyboard';
    }
    console.log('Emoji picker toggled:', emojiPicker.classList.contains('active') ? 'Shown' : 'Hidden');
    setTimeout(() => {
        scrollToLatestMessage();
    }, 50);
}

// Scroll to latest message
function scrollToLatestMessage() {
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
}

// Get current timestamp
function getCurrentTimestamp() {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    return `${hours}:${minutes} ${ampm}`;
}

// Send message with link preview support
function sendMessage(messageText) {
    if (!messageText.trim()) return;

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'sent');
    messageDiv.setAttribute('data-message-id', `msg${Date.now()}`);

    let replyHtml = '';
    if (isReplyActive) {
        const senderClass = repliedToMessageSender === 'You' ? 'reply-sent' : 'reply-received';
        const barColor = repliedToMessageSender === 'You' ? '#7c3aed' : '#749cbf';
        replyHtml = `
            <div class="replied-message-preview ${senderClass}">
                <div class="reply-bar" style="background-color: ${barColor};"></div>
                <div class="reply-content">
                    <p class="reply-sender">${repliedToMessageSender}</p>
                    <p class="reply-text">${repliedToMessageText}</p>
                </div>
            </div>
        `;
    }

    // Check if the message contains a URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = messageText.match(urlRegex);
    if (urls && urls.length > 0) {
        // Handle URL with preview
        const url = urls[0]; // Process the first URL for simplicity
        fetchLinkPreview(url).then(previewData => {
            let previewHtml = '';
            if (previewData && previewData.title && previewData.image) {
                // Truncate title and description to fit typical preview lengths
                const truncatedTitle = previewData.title.length > 60 ? previewData.title.substring(0, 57) + '...' : previewData.title;
                const truncatedDescription = previewData.description && previewData.description.length > 80 ? previewData.description.substring(0, 77) + '...' : (previewData.description || '');
                previewHtml = `
                    <a href="${url}" target="_blank" class="link-preview">
                        <div class="link-preview-container">
                            <img src="${previewData.image}" alt="Link Preview" class="link-preview-image" onerror="this.style.display='none';" />
                            <div class="link-preview-content">
                                <p class="link-preview-title">${truncatedTitle}</p>
                                ${truncatedDescription ? `<p class="link-preview-description">${truncatedDescription}</p>` : ''}
                                <p class="link-preview-url">${new URL(url).hostname}</p>
                            </div>
                        </div>
                    </a>
                `;
            }
            // Remove the URL from the message text to avoid duplication
            const displayText = messageText.replace(url, '').trim() || ' ';
            messageDiv.innerHTML = `
                <div class="bubble-container">
                    <div class="reply-indicator"></div>
                    ${replyHtml}
                    <div class="bubble">${displayText}${previewHtml}</div>
                </div>
                <div class="profile">
                    <span class="timestamp">${getCurrentTimestamp()}</span>
                    <span class="check">✓</span>
                </div>
            `;
            chatContainer.appendChild(messageDiv);
            scrollToLatestMessage();
            if (isReplyActive) {
                closeReply();
            }
        }).catch(err => {
            console.error('Error fetching link preview:', err);
            // Fallback to plain message if preview fails
            messageDiv.innerHTML = `
                <div class="bubble-container">
                    <div class="reply-indicator"></div>
                    ${replyHtml}
                    <div class="bubble">${messageText}</div>
                </div>
                <div class="profile">
                    <span class="timestamp">${getCurrentTimestamp()}</span>
                    <span class="check">✓</span>
                </div>
            `;
            chatContainer.appendChild(messageDiv);
            scrollToLatestMessage();
            if (isReplyActive) {
                closeReply();
            }
        });
    } else {
        // No URL, send plain message
        messageDiv.innerHTML = `
            <div class="bubble-container">
                <div class="reply-indicator"></div>
                ${replyHtml}
                <div class="bubble">${messageText}</div>
            </div>
            <div class="profile">
                <span class="timestamp">${getCurrentTimestamp()}</span>
                <span class="check">✓</span>
            </div>
        `;
        chatContainer.appendChild(messageDiv);
        scrollToLatestMessage();
        if (isReplyActive) {
            closeReply();
        }
    }
}

// Fetch link preview data using a server-side proxy
async function fetchLinkPreview(url) {
    try {
        // Replace with your server-side endpoint
        const response = await fetch(`https://your-proxy-api.com/get-preview?url=${encodeURIComponent(url)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; YourChatApp/1.0)'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch preview');
        const data = await response.json();
        return {
            title: data.ogTitle || data.title || 'Untitled',
            description: data.ogDescription || data.description || '',
            image: data.ogImage || data.image || ''
        };
    } catch (err) {
        console.error('Error fetching link preview:', err);
        return null;
    }
}

// Get current timestamp
function getCurrentTimestamp() {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    return `${hours}:${minutes} ${ampm}`;
}

// Scroll to latest message
function scrollToLatestMessage() {
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
}

// Close reply
function closeReply() {
    isReplyActive = false;
    repliedToMessageId = null;
    repliedToMessageText = '';
    repliedToMessageSender = '';
    replyPreviewContainer.classList.remove('active');
    setTimeout(() => {
        replyPreviewContainer.style.display = 'none';
    }, 200);
    document.querySelectorAll('.message').forEach(msg => msg.classList.remove('highlighted'));
    const currentInputContainerHeight = inputContainer.offsetHeight;
    chatContainer.style.height = `calc(100vh - ${currentInputContainerHeight}px)`;
    chatContainer.style.marginBottom = `${currentInputContainerHeight}px`;
    inputField.value = '';
    sendBtn.classList.remove('active');
    sendBtn.style.display = isLocked ? 'none' : 'inline-flex';
    micIcon.style.display = inputField.value.trim() && !isLocked ? 'none' : 'inline-flex';
    pinIcon.style.display = inputField.value.trim() && !isLocked ? 'none' : 'inline-flex';
    smileToggler.style.display = 'inline-flex';
    inputField.blur();
}

// Activate reply
function activateReply(messageElement) {
    if (isAudioPreviewActive) return;
    isReplyActive = true;
    repliedToMessageId = messageElement.getAttribute('data-message-id');
    repliedToMessageText = messageElement.querySelector('.bubble').textContent;
    if (messageElement.classList.contains('received')) {
        repliedToMessageSender = 'Sarah Johnson';
        replyPreviewContainer.classList.remove('sent-reply');
    } else {
        repliedToMessageSender = 'You';
        replyPreviewContainer.classList.add('sent-reply');
    }
    replySenderName.textContent = repliedToMessageSender;
    replyMessageText.textContent = repliedToMessageText;
    replyPreviewContainer.style.display = 'flex';
    replyPreviewContainer.classList.add('active');
    document.querySelectorAll('.message').forEach(msg => msg.classList.remove('highlighted'));
    messageElement.classList.add('highlighted');
    const currentInputContainerHeight = inputContainer.offsetHeight;
    chatContainer.style.height = `calc(100vh - ${currentInputContainerHeight}px)`;
    chatContainer.style.marginBottom = `${currentInputContainerHeight}px`;
    inputField.focus();
    scrollToLatestMessage();
}

// Close reply
function closeReply() {
    isReplyActive = false;
    repliedToMessageId = null;
    repliedToMessageText = '';
    repliedToMessageSender = '';
    replyPreviewContainer.classList.remove('active');
    setTimeout(() => {
        replyPreviewContainer.style.display = 'none';
    }, 200);
    document.querySelectorAll('.message').forEach(msg => msg.classList.remove('highlighted'));
    const currentInputContainerHeight = inputContainer.offsetHeight;
    chatContainer.style.height = `calc(100vh - ${currentInputContainerHeight}px)`;
    chatContainer.style.marginBottom = `${currentInputContainerHeight}px`;
    inputField.value = '';
    sendBtn.classList.remove('active');
    sendBtn.style.display = isLocked ? 'none' : 'inline-flex';
    micIcon.style.display = inputField.value.trim() && !isLocked ? 'none' : 'inline-flex';
    pinIcon.style.display = inputField.value.trim() && !isLocked ? 'none' : 'inline-flex';
    smileToggler.style.display = 'inline-flex';
    inputField.blur();
}

// Event handler functions for reattachment
const inputFieldClickHandler = function () {
    if (isAudioPreviewActive) return;
    if (emojiPicker.classList.contains('active') && !isRecording) {
        const containerHeight = inputContainer.offsetHeight;
        chatContainer.style.height = `calc(100vh - ${containerHeight}px)`;
        chatContainer.style.marginBottom = `${containerHeight}px`;
        inputContainer.style.bottom = '0';
        emojiPicker.classList.remove('active');
        videoOverlay.classList.remove('emoji-picker-active');
        document.documentElement.style.removeProperty('--emoji-picker-height');
        smileToggler.classList.remove('fa-keyboard');
        smileToggler.classList.add('fa-smile');
        smileToggler.innerHTML = '';
        smileTogglerState = 'smile';
    }
    this.disabled = false;
    this.focus();
};

const inputFieldFocusHandler = function () {
    if (isRecording && recordingType === 'video' && videoOverlay) {
        videoOverlay.classList.add('keyboard-active');
        videoOverlay.classList.remove('emoji-picker-active');
        const estimatedKeyboardHeight = Math.min(window.innerHeight * 0.4, 200);
        document.documentElement.style.setProperty('--emoji-picker-height', `${estimatedKeyboardHeight}px`);
    }
    setTimeout(() => {
        scrollToLatestMessage();
    }, 300);
};

const inputFieldBlurHandler = function () {
    if (isRecording && recordingType === 'video' && videoOverlay) {
        videoOverlay.classList.remove('keyboard-active');
        if (emojiPicker.classList.contains('active')) {
            videoOverlay.classList.add('emoji-picker-active');
            const pickerHeight = emojiPicker.offsetHeight;
            document.documentElement.style.setProperty('--emoji-picker-height', `${pickerHeight}px`);
        } else {
            document.documentElement.style.removeProperty('--emoji-picker-height');
        }
    }
};

const inputFieldInputHandler = function () {
    this.focus();
    if (isLocked) {
        const lockedCircle = recordingInterface.querySelector('.locked-circle');
        if (lockedCircle) {
            lockedCircle.style.display = 'inline-flex';
        }
        sendBtn.style.display = 'none';
    } else {
        sendBtn.classList.toggle('active', this.value.trim());
        sendBtn.style.display = this.value.trim() ? 'inline-flex' : 'none';
        sendBtn.style.color = '#749cbf';
        micIcon.style.display = this.value.trim() ? 'none' : 'inline-flex';
        pinIcon.style.display = this.value.trim() ? 'none' : 'inline-flex';
    }
    if (!isAudioPreviewActive) {
        smileToggler.style.display = 'inline-flex';
    }
};

const inputFieldKeydownHandler = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = this.value.trim();
        if (message) {
            sendMessage(message);
            this.value = '';
            sendBtn.classList.remove('active');
            sendBtn.style.display = isLocked ? 'none' : 'none';
            micIcon.style.display = isLocked ? 'none' : 'inline-flex';
            pinIcon.style.display = isLocked ? 'none' : 'inline-flex';
            smileToggler.style.display = 'inline-flex';
            this.focus();
        }
    }
};

const sendBtnClickHandler = function () {
    const message = inputField.value.trim();
    if (message) {
        sendMessage(message);
        inputField.value = '';
        this.classList.remove('active');
        this.style.display = isLocked ? 'none' : 'none';
        micIcon.style.display = isLocked ? 'none' : 'inline-flex';
        pinIcon.style.display = isLocked ? 'none' : 'inline-flex';
        smileToggler.style.display = 'inline-flex';
        inputField.focus();
    }
};

const pinIconClickHandler = function (e) {
    e.preventDefault();
    inputField.blur();
};

const micIconTouchstartHandler = function (e) {
    e.preventDefault();
    const currentIcon = micIcon.querySelector('i');
    if (e.touches.length === 1 && !isRecording && currentIcon && (currentIcon.classList.contains('fa-microphone') || currentIcon.classList.contains('fa-video'))) {
        isHolding = true;
        touchTimeout = setTimeout(() => {
            isHolding = true;
            startRecording();
            initialTouchY = e.touches[0].clientY;
            initialTouchX = e.touches[0].clientX;
            micIconStartX = micIcon.getBoundingClientRect().left;
            startTime = Date.now();
            elapsedTime = 0;
            timerInterval = setInterval(startTimer, 100);
            startDotBlink();
        }, 300);
    }
};

const micIconTouchmoveHandler = function (e) {
    e.preventDefault();
    if (isRecording && !isLocked) {
        clearTimeout(touchTimeout);
        const currentTouchY = e.touches[0].clientY;
        const currentTouchX = e.touches[0].clientX;
        const deltaY = initialTouchY - currentTouchY;
        const deltaX = currentTouchX - initialTouchX;
        micIcon.classList.add('dragging');
        let transformValue = '';
        if (deltaY > 0) {
            transformValue = `translate(0, ${-deltaY}px)`;
        }
        if (deltaX < 0) {
            const cappedDeltaX = Math.max(deltaX, -150);
            transformValue = `translate(${cappedDeltaX}px, ${deltaY > 0 ? -deltaY : 0}px)`;
        }
        micIcon.style.transform = transformValue || 'translate(0, 0)';
        const cancelLabel = recordingInterface.querySelector('.cancel-label');
        if (cancelLabel && !isLocked) {
            if (deltaX <= -60) {
                cancelLabel.style.left = '-8px';
                cancelLabel.style.opacity = '0';
            } else if (deltaX <= -20) {
                const progress = Math.min((-deltaX - 20) / 40, 1);
                cancelLabel.style.left = `${8 - progress * 16}px`;
                cancelLabel.style.opacity = `${0.8 - progress * 0.8}`;
            } else {
                cancelLabel.style.left = '8px';
                cancelLabel.style.opacity = '0.8';
            }
        }
        if (deltaX < -100) {
            isDeleteActive = true;
            smileToggler.classList.remove('red-dot');
            smileToggler.classList.add('red-dot', 'trash-icon');
            smileToggler.innerHTML = '<i class="bx bxs-trash"></i>';
            smileTogglerState = 'waste';
            clearInterval(dotBlinkInterval);
            clearInterval(voiceWaveInterval);
            voiceWaveInterval = null;
            if (voiceWave) {
                voiceWave.style.display = 'none';
                console.log('Voice wave stopped on cancel (slide left)');
            }
            cancelRecording();
            isDeleteActive = false;
            elapsedTime = 0;
            clearInterval(timerInterval);
            micIcon.classList.remove('recording', 'dragging');
            hideRecordingInterface();
            if (emojiPicker.classList.contains('active')) {
                smileToggler.classList.remove('red-dot', 'trash-icon');
                smileToggler.classList.add('fa-keyboard');
                smileToggler.innerHTML = '';
                smileTogglerState = 'keyboard';
            } else {
                smileToggler.classList.remove('red-dot', 'trash-icon');
                smileToggler.classList.add('fa-smile');
                smileToggler.innerHTML = '';
                smileTogglerState = 'smile';
            }
        } else if (deltaX >= -100 && smileTogglerState === 'waste') {
            isDeleteActive = false;
            smileToggler.classList.remove('trash-icon');
            smileToggler.classList.add('red-dot');
            smileToggler.innerHTML = '';
            smileTogglerState = 'dot';
            startDotBlink();
            holdStateDetector();
        }
        if (deltaY > 50 && !isDeleteActive) {
            isLocked = true;
            micIcon.classList.remove('dragging');
            micIcon.classList.add('locked');
            micIcon.style.transform = 'translate(0, 0)';
            micIcon.style.width = '72px';
            micIcon.style.height = '72px';
            micIcon.style.right = '-20px';
            micIcon.style.position = 'absolute';
            micIcon.style.marginRight = '0';
            micIcon.innerHTML = '<i class="fas fa-arrow-up"></i><div id="voice-wave" style="display: none;"></div>';
            voiceWave = document.getElementById('voice-wave');
            clearInterval(voiceWaveInterval);
            voiceWaveInterval = null;
            if (voiceWave) {
                voiceWave.style.display = 'none';
                console.log('Voice wave stopped on lock (slide up)');
            }
            updateRecordingInterface(); // Update to hide hold-circle
            holdStateDetector();
        }
    }
};

const micIconTouchendHandler = function (e) {
    e.preventDefault();
    clearTimeout(touchTimeout);
    if (e.target !== micIcon && !micIcon.contains(e.target) && !isRecording) {
        return;
    }
    if (!isHolding && !isRecording && !isDeleteActive) {
        const currentIcon = micIcon.querySelector('i');
        if (currentIcon && currentIcon.classList.contains('fa-microphone')) {
            micIcon.innerHTML = '<i class="fas fa-video"></i><div id="voice-wave" style="display: none;"></div>';
        } else if (currentIcon && currentIcon.classList.contains('fa-video')) {
            micIcon.innerHTML = '<i class="fas fa-microphone"></i><div id="voice-wave" style="display: none;"></div>';
        }
        voiceWave = document.getElementById('voice-wave');
    } else if (isRecording && !isDeleteActive) {
        if (isLocked) {
            // Do nothing; wait for tap outside
        } else {
            stopRecording();
            isRecording = false;
            isLocked = false;
            clearInterval(timerInterval);
            clearInterval(voiceWaveInterval);
            voiceWaveInterval = null;
            if (voiceWave) {
                voiceWave.style.display = 'none';
                console.log('Voice wave stopped on touchend');
            }
            micIcon.classList.remove('recording', 'dragging');
            micIcon.style.width = '36px';
            micIcon.style.height = '36px';
            micIcon.style.transform = 'translate(0, 0)';
            micIcon.style.position = 'relative';
            micIcon.style.right = 'auto';
            micIcon.style.marginRight = '8px';
            hideRecordingInterface();
            if (emojiPicker.classList.contains('active')) {
                smileToggler.classList.remove('red-dot', 'trash-icon');
                smileToggler.classList.add('fa-keyboard');
                smileToggler.innerHTML = '';
                smileTogglerState = 'keyboard';
            } else {
                smileToggler.classList.remove('red-dot', 'trash-icon');
                smileToggler.classList.add('fa-smile');
                smileToggler.innerHTML = '';
                smileTogglerState = 'smile';
            }
            sendBtn.classList.remove('active');
            sendBtn.style.display = isLocked ? 'none' : (inputField.value.trim() ? 'inline-flex' : 'none');
            sendBtn.style.color = '#749cbf';
            micIcon.style.display = inputField.value.trim() && !isLocked ? 'none' : 'inline-flex';
            holdStateDetector();
        }
    }
    isHolding = false;
};

// Document touchend for locked recording
document.addEventListener('touchend', (e) => {
    if (isRecording && isLocked && !micIcon.contains(e.target)) {
        stopRecording();
        isRecording = false;
        isLocked = false;
        elapsedTime = 0;
        clearInterval(timerInterval);
        clearInterval(voiceWaveInterval);
        voiceWaveInterval = null;
        if (voiceWave) {
            voiceWave.style.display = 'none';
            console.log('Voice wave stopped on document touchend');
        }
        micIcon.classList.remove('locked');
        hideRecordingInterface();
        holdStateDetector();
    }
});

// Attach initial event listeners
inputField.addEventListener('click', inputFieldClickHandler);
inputField.addEventListener('focus', inputFieldFocusHandler);
inputField.addEventListener('blur', inputFieldBlurHandler);
inputField.addEventListener('input', inputFieldInputHandler);
inputField.addEventListener('keydown', inputFieldKeydownHandler);
sendBtn.addEventListener('click', sendBtnClickHandler);
smileToggler.addEventListener('click', toggleEmojiPicker);
pinIcon.addEventListener('click', pinIconClickHandler);
micIcon.addEventListener('touchstart', micIconTouchstartHandler);
micIcon.addEventListener('touchmove', micIconTouchmoveHandler);
micIcon.addEventListener('touchend', micIconTouchendHandler);

// Document click to close emoji picker
document.addEventListener('click', function (event) {
    if (
        emojiPicker.classList.contains('active') &&
        !emojiPicker.contains(event.target) &&
        !inputContainer.contains(event.target) &&
        event.target !== smileToggler &&
        !smileToggler.contains(event.target) &&
        !isRecording &&
        !isAudioPreviewActive
    ) {
        const containerHeight = inputContainer.offsetHeight;
        chatContainer.style.height = `calc(100vh - ${containerHeight}px)`;
        chatContainer.style.marginBottom = `${containerHeight}px`;
        inputContainer.style.bottom = '0';
        emojiPicker.classList.remove('active');
        videoOverlay.classList.remove('emoji-picker-active');
        document.documentElement.style.removeProperty('--emoji-picker-height');
        smileToggler.classList.remove('fa-keyboard');
        smileToggler.classList.add('fa-smile');
        smileToggler.innerHTML = '';
        smileTogglerState = 'smile';
        inputField.blur();
    }
    if (
        !inputField.contains(event.target) &&
        !micIcon.contains(event.target) &&
        event.target !== pinIcon &&
        !isRecording &&
        !isAudioPreviewActive
    ) {
        inputField.blur();
    }
});

// Window resize handler
window.addEventListener('resize', () => {
    const currentInputContainerHeight = inputContainer.offsetHeight;
    if (emojiPicker.classList.contains('active')) {
        const maxPickerHeight = window.innerHeight - currentInputContainerHeight;
        const pickerHeight = Math.min(maxPickerHeight * 0.5, 300);
        emojiPicker.style.height = `${pickerHeight}px`;
        inputContainer.style.bottom = `${pickerHeight}px`;
        chatContainer.style.height = `calc(100vh - ${pickerHeight + currentInputContainerHeight}px)`;
        chatContainer.style.marginBottom = `${pickerHeight + currentInputContainerHeight}px`;
        document.documentElement.style.setProperty('--emoji-picker-height', `${pickerHeight}px`);
        if (videoOverlay.classList.contains('active')) {
            videoOverlay.classList.add('emoji-picker-active');
        }
    } else {
        inputContainer.style.bottom = '0';
        chatContainer.style.height = `calc(100vh - ${currentInputContainerHeight}px)`;
        chatContainer.style.marginBottom = `${currentInputContainerHeight}px`;
        videoOverlay.classList.remove('emoji-picker-active');
        document.documentElement.style.removeProperty('--emoji-picker-height');
    }
    document.documentElement.style.setProperty('--input-container-height', `${currentInputContainerHeight}px`);
    setTimeout(() => {
        scrollToLatestMessage();
    }, 50);
});

// Emoji picker tab switching
smileyTab.classList.add('active');
const smileyContent = `
    <img src="https://i.ibb.co/274qJhs1/2504250629535218541.png" alt="2504250629535218541" class="sticker" />
`;
const gifContent = `
    <div class="gif-placeholder">GIFs will be displayed here (placeholder)</div>
`;
smileyTab.addEventListener('click', () => {
    smileyTab.classList.add('active');
    gifTab.classList.remove('active');
    emojiPickerBody.innerHTML = smileyContent;
});
gifTab.addEventListener('click', () => {
    gifTab.classList.add('active');
    smileyTab.classList.remove('active');
    emojiPickerBody.innerHTML = gifContent;
});

// Sticker sending to chatContainer
emojiPickerBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('sticker')) {
        const stickerUrl = e.target.src;
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'sent');
        messageDiv.setAttribute('data-message-id', `msg${Date.now()}`);
        let replyHtml = '';
        if (isReplyActive) {
            const senderClass = repliedToMessageSender === 'You' ? 'reply-sent' : 'reply-received';
            const barColor = repliedToMessageSender === 'You' ? '#7c3aed' : '#749cbf';
            replyHtml = `
                <div class="replied-message-preview ${senderClass}">
                    <div class="reply-bar" style="background-color: ${barColor};"></div>
                    <div class="reply-content">
                        <p class="reply-sender">${repliedToMessageSender}</p>
                        <p class="reply-text">${repliedToMessageText}</p>
                    </div>
                </div>
            `;
        }
        messageDiv.innerHTML = `
            <div class="bubble-container">
                <div class="reply-indicator"></div>
                ${replyHtml}
                <div class="bubble">
                    <img src="${stickerUrl}" alt="Sticker" class="sticker" style="width: 56px; height: 56px;" />
                </div>
            </div>
            <div class="profile">
                <span class="timestamp">${getCurrentTimestamp()}</span>
                <span class="check">✓</span>
            </div>
        `;
        chatContainer.appendChild(messageDiv);
        scrollToLatestMessage();
        if (isReplyActive) {
            closeReply();
        }
        toggleEmojiPicker();
    }
});

// Window load initialization
window.addEventListener('load', () => {
    const currentInputContainerHeight = inputContainer.offsetHeight;
    chatContainer.style.height = `calc(100vh - ${currentInputContainerHeight}px)`;
    chatContainer.style.marginBottom = `${currentInputContainerHeight}px`;
    document.documentElement.style.setProperty('--input-container-height', `${currentInputContainerHeight}px`);
    scrollToLatestMessage();
    document.querySelectorAll('.message').forEach(message => {
        message.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1 && !isRecording && !isAudioPreviewActive) {
                activeMessageElement = message;
                startX = e.touches[0].clientX;
                isSliding = false;
            }
        });
        message.addEventListener('touchmove', (e) => {
            if (activeMessageElement === message && !isRecording && !isAudioPreviewActive) {
                currentX = e.touches[0].clientX;
                const deltaX = currentX - startX;
                if (deltaX > replyThreshold && !isSliding) {
                    isSliding = true;
                    activeMessageElement.classList.add('sliding');
                } else if (deltaX <= replyThreshold && isSliding) {
                    isSliding = false;
                    activeMessageElement.classList.remove('sliding');
                }
            }
        });
        message.addEventListener('touchend', (e) => {
            if (activeMessageElement === message && !isRecording && !isAudioPreviewActive) {
                const deltaX = currentX - startX;
                if (deltaX > replyThreshold) {
                    activateReply(message);
                }
                activeMessageElement.classList.remove('sliding');
                isSliding = false;
                activeMessageElement = null;
                startX = 0;
                currentX = 0;
            }
        });
    });
});

// Close reply button
closeReplyBtn.addEventListener('click', closeReply);
