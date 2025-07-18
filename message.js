let isRecording = false;
let isLocked = false;
let isDeleteActive = false;
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

function toggleEmojiPicker() {
  const emojiPicker = document.getElementById('emojiPicker');
  const smileToggler = document.getElementById('smileToggler');
  const chatContainer = document.getElementById('chatContainer');
  const inputContainer = document.getElementById('inputContainer');
  const inputField = document.getElementById('inputField');
  const isActive = emojiPicker.classList.contains('active');

  if (isActive && !isRecording) {
    const containerHeight = inputContainer.offsetHeight;
    chatContainer.style.height = `calc(100vh - ${containerHeight}px)`;
    chatContainer.style.marginBottom = `${containerHeight}px`;
    inputContainer.style.bottom = '0';
    emojiPicker.classList.remove('active');
    smileToggler.classList.remove('fa-keyboard');
    smileToggler.classList.add('fa-smile');
    smileToggler.innerHTML = '';
    smileTogglerState = 'smile';
  } else if (!isRecording) {
    const containerHeight = inputContainer.offsetHeight;
    const maxPickerHeight = window.innerHeight - containerHeight;
    const pickerHeight = Math.min(maxPickerHeight * 0.5, 300);
    inputContainer.style.bottom = `${pickerHeight}px`;
    chatContainer.style.height = `calc(100vh - ${pickerHeight + containerHeight}px)`;
    chatContainer.style.marginBottom = `${pickerHeight + containerHeight}px`;
    emojiPicker.style.height = `${pickerHeight}px`;
    emojiPicker.classList.add('active');
    smileToggler.classList.remove('fa-smile', 'red-dot');
    smileToggler.classList.add('fa-keyboard');
    smileToggler.innerHTML = '';
    smileTogglerState = 'keyboard';
  }

  setTimeout(() => {
    scrollToLatestMessage();
  }, 50);
}

function scrollToLatestMessage() {
  const chatContainer = document.getElementById('chatContainer');
  chatContainer.scrollTo({
    top: chatContainer.scrollHeight,
    behavior: 'smooth'
  });
}

function getCurrentTimestamp() {
  const now = new Date();
  const hours = now.getHours() % 12 || 12;
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  return `${hours}:${minutes} ${ampm}`;
}

function sendMessage(messageText) {
  if (!messageText.trim()) return;

  const chatContainer = document.getElementById('chatContainer');
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', 'sent');
  messageDiv.innerHTML = `
    <div class="bubble-container">
      <div class="bubble">${messageText}</div>
    </div>
    <div class="profile">
      <span class="timestamp">${getCurrentTimestamp()}</span>
      <span class="check">✓</span>
    </div>
  `;
  chatContainer.appendChild(messageDiv);
  scrollToLatestMessage();
}

document.getElementById('inputField').addEventListener('click', function () {
  const emojiPicker = document.getElementById('emojiPicker');
  const smileToggler = document.getElementById('smileToggler');
  const chatContainer = document.getElementById('chatContainer');
  const inputContainer = document.getElementById('inputContainer');

  if (emojiPicker.classList.contains('active') && !isRecording) {
    const containerHeight = inputContainer.offsetHeight;
    chatContainer.style.height = `calc(100vh - ${containerHeight}px)`;
    chatContainer.style.marginBottom = `${containerHeight}px`;
    inputContainer.style.bottom = '0';
    emojiPicker.classList.remove('active');
    smileToggler.classList.remove('fa-keyboard');
    smileToggler.classList.add('fa-smile');
    smileToggler.innerHTML = '';
    smileTogglerState = 'smile';
  }
  this.disabled = false;
  this.focus();
});

document.getElementById('inputField').addEventListener('focus', function () {
  setTimeout(() => {
    scrollToLatestMessage();
  }, 300);
});

document.getElementById('inputField').addEventListener('input', function () {
  this.focus();
  const sendBtn = document.getElementById('sendBtn');
  const micIcon = document.getElementById('micIcon');
  const pinIcon = document.getElementById('pinIcon');
  
  if (this.value.trim()) {
    sendBtn.classList.add('active');
    sendBtn.style.display = 'inline-flex';
    sendBtn.style.color = '#749cbf'; // Ensure color is set
    micIcon.style.display = 'none';
    pinIcon.style.display = 'none';
  } else {
    sendBtn.classList.remove('active');
    sendBtn.style.display = 'none';
    micIcon.style.display = 'inline-flex';
    pinIcon.style.display = 'inline-flex';
  }
});

document.getElementById('inputField').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const message = this.value.trim();
    const sendBtn = document.getElementById('sendBtn');
    const micIcon = document.getElementById('micIcon');
    const pinIcon = document.getElementById('pinIcon');
    
    if (message) {
      sendMessage(message);
      this.value = '';
      sendBtn.classList.remove('active');
      sendBtn.style.display = 'none';
      micIcon.style.display = 'inline-flex';
      pinIcon.style.display = 'inline-flex';
      this.focus();
    }
  }
});

document.getElementById('sendBtn').addEventListener('click', function () {
  const inputField = document.getElementById('inputField');
  const message = inputField.value.trim();
  const micIcon = document.getElementById('micIcon');
  const pinIcon = document.getElementById('pinIcon');
  
  if (message) {
    sendMessage(message);
    inputField.value = '';
    this.classList.remove('active');
    this.style.display = 'none';
    micIcon.style.display = 'inline-flex';
    pinIcon.style.display = 'inline-flex';
    inputField.focus();
  }
});

document.addEventListener('click', function (event) {
  const emojiPicker = document.getElementById('emojiPicker');
  const inputContainer = document.getElementById('inputContainer');
  const smileToggler = document.getElementById('smileToggler');
  const chatContainer = document.getElementById('chatContainer');
  const inputField = document.getElementById('inputField');
  const pinIcon = document.getElementById('pinIcon');
  const micIcon = document.getElementById('micIcon');

  if (
    emojiPicker.classList.contains('active') &&
    !emojiPicker.contains(event.target) &&
    !inputContainer.contains(event.target) &&
    !isRecording
  ) {
    const containerHeight = inputContainer.offsetHeight;
    chatContainer.style.height = `calc(100vh - ${containerHeight}px)`;
    chatContainer.style.marginBottom = `${containerHeight}px`;
    inputContainer.style.bottom = '0';
    emojiPicker.classList.remove('active');
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
    !isRecording
  ) {
    inputField.blur();
  }
});

window.addEventListener('resize', () => {
  const emojiPicker = document.getElementById('emojiPicker');
  const chatContainer = document.getElementById('chatContainer');
  const inputContainer = document.getElementById('inputContainer');

  if (emojiPicker.classList.contains('active')) {
    const containerHeight = inputContainer.offsetHeight;
    const maxPickerHeight = window.innerHeight - containerHeight;
    const pickerHeight = Math.min(maxPickerHeight * 0.5, 300);
    emojiPicker.style.height = `${pickerHeight}px`;
    inputContainer.style.bottom = `${pickerHeight}px`;
    chatContainer.style.height = `calc(100vh - ${pickerHeight + containerHeight}px)`;
    chatContainer.style.marginBottom = `${pickerHeight + containerHeight}px`;
    document.documentElement.style.setProperty('--input-container-height', `${containerHeight + pickerHeight}px`);
    setTimeout(() => {
      scrollToLatestMessage();
    }, 50);
  } else {
    const containerHeight = inputContainer.offsetHeight;
    chatContainer.style.height = `calc(100vh - ${containerHeight}px)`;
    chatContainer.style.marginBottom = `${containerHeight}px`;
    inputContainer.style.bottom = '0';
    document.documentElement.style.setProperty('--input-container-height', `${containerHeight}px`);
    setTimeout(() => {
      scrollToLatestMessage();
    }, 50);
  }
});

const smileyTab = document.getElementById('smileyTab');
const gifTab = document.getElementById('gifTab');
const emojiPickerBody = document.getElementById('emojiPickerBody');
const inputField = document.getElementById('inputField');
const pinIcon = document.getElementById('pinIcon');
const micIcon = document.getElementById('micIcon');
const sendBtn = document.getElementById('sendBtn');
const inputContainer = document.getElementById('inputContainer');
const recordingInterface = document.getElementById('recordingInterface') || document.createElement('div');
if (!document.getElementById('recordingInterface')) {
  recordingInterface.id = 'recordingInterface';
  recordingInterface.classList.add('recording-interface');
  inputContainer.appendChild(recordingInterface);
}

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

window.addEventListener('load', () => {
  scrollToLatestMessage();
  inputField.blur();
  const inputContainer = document.getElementById('inputContainer');
  const containerHeight = inputContainer.offsetHeight;
  document.documentElement.style.setProperty('--input-container-height', `${containerHeight}px`);
  sendBtn.classList.remove('active');
  sendBtn.style.display = 'none';
  sendBtn.style.color = '#749cbf'; // Ensure color is set
  micIcon.style.display = 'inline-flex';
  pinIcon.style.display = 'inline-flex';
  // Check if Material Symbols font is loaded
  const fontLoaded = document.fonts.check('1em Material Symbols Outlined');
  if (!fontLoaded) {
    console.warn('Material Symbols Outlined font not loaded. Using fallback.');
    // Optional: Replace sendBtn with Font Awesome fallback
    // sendBtn.innerHTML = '<i class="fas fa-paper-plane" style="color: #749cbf;"></i>';
    // sendBtn.classList.remove('material-symbols-outlined');
    // sendBtn.classList.add('fas');
  }
});

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
        }
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
      } else {
        mediaRecorder.ondataavailable = (event) => {
          videoChunks.push(event.data);
        };
      }
      mediaRecorder.onstop = () => {
        if (recordingType === 'audio') {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          console.log('Voice note sent:', audioBlob);
        } else {
          const videoBlob = new Blob(videoChunks, { type: 'video/mp4' });
          console.log('Video note sent:', videoBlob);
        }
        isRecording = false;
        isLocked = false;
        isDeleteActive = false;
        elapsedTime = 0;
        clearInterval(timerInterval);
        clearInterval(dotBlinkInterval);
        hideRecordingInterface();
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          stream = null;
        }
      };
      return stream;
    })
    .catch(err => {
      console.error('Error accessing media device:', err);
      alert('Failed to access microphone or camera. Please check permissions.');
      return null;
    });
}

function setupVideoPreview() {
  const videoPreview = document.getElementById('videoPreview');
  if (recordingType === 'video' && stream && videoPreview) {
    videoPreview.srcObject = stream;
    videoPreview.play().catch(err => {
      console.error('Error playing video preview:', err);
    });
  }
}

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
        timerInterval = setInterval(updateTimer, 100);
        smileToggler.classList.remove('fa-smile', 'fa-keyboard');
        smileToggler.classList.add('red-dot');
        smileToggler.innerHTML = '';
        smileTogglerState = 'dot';
      }
    });
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    clearInterval(dotBlinkInterval);
  }
}

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
    const videoOverlay = document.getElementById('videoOverlay');
    const videoPreview = document.getElementById('videoPreview');
    if (videoOverlay) videoOverlay.classList.remove('active');
    if (videoPreview) videoPreview.srcObject = null;
    hideRecordingInterface();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    console.log(`${recordingType === 'audio' ? 'Voice' : 'Video'} note recording canceled and deleted.`);
  }
}

function startDotBlink() {
  if (dotBlinkInterval) clearInterval(dotBlinkInterval);
  const dotElement = recordingInterface.querySelector('.dot');
  if (dotElement) {
    dotBlinkInterval = setInterval(() => {
      if (!smileToggler.classList.contains('trash-icon')) {
        dotElement.innerHTML = dotElement.innerHTML === '•' ? '' : '•';
      }
    }, 300);
  }
}

function updateRecordingInterface() {
  const inputStyles = window.getComputedStyle(inputField);
  recordingInterface.style.width = inputStyles.width;
  recordingInterface.style.height = inputStyles.height;

  let cancelLabel = recordingInterface.querySelector('.cancel-label');
  if (!cancelLabel) {
    cancelLabel = document.createElement('span');
    cancelLabel.classList.add('cancel-label');
    const backArrow = document.createElement('i');
    backArrow.classList.add('fas', 'fa-chevron-left', 'back-arrow');
    cancelLabel.appendChild(backArrow);
    cancelLabel.appendChild(document.createTextNode('Slide to cancel'));
    recordingInterface.appendChild(cancelLabel);
  }
  cancelLabel.style.left = '8px';
  cancelLabel.style.fontSize = '12px';
  cancelLabel.style.marginRight = '31px';
  cancelLabel.style.position = 'relative';
  cancelLabel.style.top = '6px';
  cancelLabel.style.color = '#666';
  cancelLabel.style.opacity = '0.8';
  cancelLabel.style.whiteSpace = 'nowrap';
  cancelLabel.style.display = isLocked ? 'none' : 'flex';
  cancelLabel.style.alignItems = 'center';

  let cancelLink = recordingInterface.querySelector('.cancel-link');
  if (!cancelLink) {
    cancelLink = document.createElement('span');
    cancelLink.classList.add('cancel-link');
    cancelLink.appendChild(document.createTextNode('Cancel'));
    recordingInterface.appendChild(cancelLink);
  }
  cancelLink.style.left = '8px';
  cancelLink.style.fontSize = '12px';
  cancelLink.style.marginRight = '31px';
  cancelLink.style.position = 'relative';
  cancelLink.style.top = '6px';
  cancelLink.style.color = '#749cbf';
  cancelLink.style.opacity = '0.8';
  cancelLink.style.whiteSpace = 'nowrap';
  cancelLink.style.display = isLocked ? 'flex' : 'none';
  cancelLink.style.alignItems = 'center';
  cancelLink.style.cursor = 'pointer';
  cancelLink.onclick = (e) => {
    if (isRecording && isLocked) {
      e.preventDefault();
      cancelRecording();
    }
  };

  let timer = recordingInterface.querySelector('.timer');
  if (!timer) {
    timer = document.createElement('span');
    timer.classList.add('timer');
    timer.id = 'timer';
    recordingInterface.appendChild(timer);
  }
  timer.textContent = '0:00.0';
  timer.style.fontSize = '12px';
  timer.style.marginLeft = '-13px';
  timer.style.position = 'relative';
  timer.style.marginTop = '12.5px';
  timer.style.color = '#91959c';

  let dot = recordingInterface.querySelector('.dot');
  if (!dot) {
    dot = document.createElement('span');
    dot.classList.add('dot');
    recordingInterface.appendChild(dot);
  }
  dot.style.fontSize = '24px';
  dot.style.marginRight = '31px';
  dot.style.position = 'relative';
  dot.style.top = '6px';
  dot.style.color = '#749cbf';
  dot.style.opacity = '0.8';
  dot.style.whiteSpace = 'nowrap';
  dot.style.display = isRecording ? 'flex' : 'none';
  dot.classList.toggle('active', isRecording && !isDeleteActive);
}

function showRecordingInterface() {
  if (isRecording) {
    recordingInterface.style.display = 'flex';
    updateRecordingInterface();
    inputField.classList.add('recording');
    micIcon.classList.add('recording');
    pinIcon.style.display = 'none';
    sendBtn.classList.remove('active');
    sendBtn.style.display = 'none';
    const videoOverlay = document.getElementById('videoOverlay');
    if (videoOverlay && recordingType === 'video') {
      videoOverlay.classList.add('active');
      setupVideoPreview();
    }
  }
}

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
  pinIcon.style.display = inputField.value.trim() ? 'none' : 'inline-flex';
  inputField.disabled = false;
  const emojiPicker = document.getElementById('emojiPicker');
  const videoOverlay = document.getElementById('videoOverlay');
  const videoPreview = document.getElementById('videoPreview');
  if (videoOverlay) videoOverlay.classList.remove('active');
  if (videoPreview) videoPreview.srcObject = null;
  if (emojiPicker.classList.contains('active')) {
    smileToggler.classList.add('fa-keyboard');
    smileTogglerState = 'keyboard';
  } else {
    smileToggler.classList.add('fa-smile');
    smileTogglerState = 'smile';
  }
  smileToggler.classList.remove('red-dot', 'trash-icon');
  micIcon.innerHTML = micIcon.innerHTML.includes('fa-video') ? '<i class="fas fa-video"></i>' : '<i class="fas fa-microphone"></i>';
  sendBtn.classList.remove('active');
  sendBtn.style.display = inputField.value.trim() ? 'inline-flex' : 'none';
  sendBtn.style.color = '#749cbf'; // Ensure color is set
  micIcon.style.display = inputField.value.trim() ? 'none' : 'inline-flex';
}

function updateTimer() {
  const timerDisplay = document.getElementById('timer');
  if (timerDisplay && isRecording) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    elapsedTime = elapsed;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
    timerDisplay.textContent = `${minutes}:${formattedSeconds}.0`;
  }
}

micIcon.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const currentIcon = micIcon.querySelector('i');
  if (e.touches.length === 1 && !isRecording && currentIcon && (currentIcon.classList.contains('fa-microphone') || currentIcon.classList.contains('fa-video'))) {
    isHolding = false;
    touchTimeout = setTimeout(() => {
      isHolding = true;
      startRecording();
      initialTouchY = e.touches[0].clientY;
      initialTouchX = e.touches[0].clientX;
      micIconStartX = micIcon.getBoundingClientRect().left;
      startTime = Date.now();
      elapsedTime = 0;
      timerInterval = setInterval(updateTimer, 100);
      startDotBlink();
    }, 300);
  }
});

micIcon.addEventListener('touchmove', (e) => {
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
      const cappedDeltaX = Math.max(deltaX, -100);
      transformValue = `translate(${cappedDeltaX}px, ${deltaY > 0 ? -deltaY : 0}px)`;
    }
    micIcon.style.transform = transformValue || 'translate(0, 0)';

    if (deltaX < -50) {
      isDeleteActive = true;
      smileToggler.classList.remove('red-dot');
      smileToggler.classList.add('red-dot', 'trash-icon');
      smileToggler.innerHTML = '<i class="bx bxs-trash"></i>';
      smileTogglerState = 'waste';
      clearInterval(dotBlinkInterval);
      cancelRecording();
      isDeleteActive = false;
      elapsedTime = 0;
      clearInterval(timerInterval);
      micIcon.classList.remove('recording', 'dragging');
      hideRecordingInterface();
      const emojiPicker = document.getElementById('emojiPicker');
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
    } else if (deltaX >= -50 && smileTogglerState === 'waste') {
      isDeleteActive = false;
      smileToggler.classList.remove('trash-icon');
      smileToggler.classList.add('red-dot');
      smileToggler.innerHTML = '';
      smileTogglerState = 'dot';
      startDotBlink();
    }

    if (deltaY > 50 && !isDeleteActive) {
      isLocked = true;
      micIcon.classList.remove('dragging');
      micIcon.classList.add('locked');
      micIcon.style.transform = 'translate(0, 0)';
      micIcon.style.width = '36px';
      micIcon.style.height = '36px';
      micIcon.style.right = 'auto';
      micIcon.style.position = 'relative';
      micIcon.style.marginRight = '8px';
      updateRecordingInterface();
    }
  }
});

micIcon.addEventListener('touchend', (e) => {
  e.preventDefault();
  clearTimeout(touchTimeout);
  if (!isHolding && !isRecording && !isDeleteActive) {
    const currentIcon = micIcon.querySelector('i');
    if (currentIcon && currentIcon.classList.contains('fa-microphone')) {
      micIcon.innerHTML = '<i class="fas fa-video"></i>';
    } else if (currentIcon && currentIcon.classList.contains('fa-video')) {
      micIcon.innerHTML = '<i class="fas fa-microphone"></i>';
    }
  } else if (isRecording && !isDeleteActive) {
    if (isLocked) {
      // Do nothing; wait for tap outside micIcon to stop
    } else {
      stopRecording();
      isRecording = false;
      isLocked = false;
      clearInterval(timerInterval);
      micIcon.classList.remove('recording', 'dragging');
      micIcon.style.width = '36px';
      micIcon.style.height = '36px';
      micIcon.style.transform = 'translate(0, 0)';
      micIcon.style.position = 'relative';
      micIcon.style.right = 'auto';
      micIcon.style.marginRight = '8px';
      hideRecordingInterface();
      const emojiPicker = document.getElementById('emojiPicker');
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
      sendBtn.style.display = inputField.value.trim() ? 'inline-flex' : 'none';
      sendBtn.style.color = '#749cbf'; // Ensure color is set
      micIcon.style.display = inputField.value.trim() ? 'none' : 'inline-flex';
    }
  }
  isHolding = false;
});

document.addEventListener('touchend', (e) => {
  if (isRecording && isLocked && !micIcon.contains(e.target)) {
    stopRecording();
    isRecording = false;
    isLocked = false;
    elapsedTime = 0;
    clearInterval(timerInterval);
    micIcon.classList.remove('locked');
    hideRecordingInterface();
  }
});

pinIcon.addEventListener('click', (e) => {
  e.preventDefault();
  inputField.blur();
});
