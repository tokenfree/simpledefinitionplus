// Initialize Quill editor
const quill = new Quill('#definitionEditor', {
    theme: 'snow',
    placeholder: 'Enter definition here...',
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline'],
            ['link'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['clean']
        ]
    }
});

let definitions = [];
let currentSlide = 0;
let autoAdvanceInterval = null;
let autoAdvanceSeconds = 0;
let autoAdvanceDuration = 30;
let isAutoAdvanceRunning = false;
let isFullscreen = false;

// DOM elements
const matterNumber = document.getElementById('matterNumber');
const definitionText = document.getElementById('definitionText');
const slideIndicator = document.getElementById('slideIndicator');
const inputPanel = document.getElementById('inputPanel');
const matterInput = document.getElementById('matterInput');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const timerDisplay = document.getElementById('timerDisplay');
const timerBtn = document.getElementById('timerBtn');
const timerControls = document.getElementById('timerControls');
const timerDuration = document.getElementById('timerDuration');
const timerProgressBar = document.getElementById('timerProgressBar');
const bgControls = document.getElementById('bgControls');
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const fullscreenMatter = document.getElementById('fullscreenMatter');
const fullscreenDefinition = document.getElementById('fullscreenDefinition');
const fullscreenPrevBtn = document.getElementById('fullscreenPrevBtn');
const fullscreenNextBtn = document.getElementById('fullscreenNextBtn');

function renderCurrentSlide() {
    if (definitions.length === 0) {
        matterNumber.textContent = 'Matter 1';
        definitionText.innerHTML = '<div class="empty-state">No definitions yet. Click "Add Definition" to get started.</div>';
        slideIndicator.textContent = '0 / 0';
        
        // Update fullscreen content
        fullscreenMatter.textContent = 'Matter 1';
        fullscreenDefinition.innerHTML = '<div class="empty-state">No definitions yet</div>';
        
        updateNavigationButtons();
        return;
    }
    
    const current = definitions[currentSlide];
    matterNumber.textContent = `Matter ${current.number}`;
    definitionText.innerHTML = current.text;
    slideIndicator.textContent = `${currentSlide + 1} / ${definitions.length}`;
    
    // Update fullscreen content
    fullscreenMatter.textContent = `Matter ${current.number}`;
    fullscreenDefinition.innerHTML = current.text;
    
    updateNavigationButtons();
}

function updateNavigationButtons() {
    const isEmpty = definitions.length === 0;
    const isFirst = currentSlide === 0;
    const isLast = currentSlide === definitions.length - 1;
    
    prevBtn.disabled = isFirst || isEmpty;
    nextBtn.disabled = isLast || isEmpty;
    fullscreenPrevBtn.disabled = isFirst || isEmpty;
    fullscreenNextBtn.disabled = isLast || isEmpty;
}

function addDefinition() {
    const number = parseInt(matterInput.value);
    const text = quill.root.innerHTML.trim();
    
    if (!number || text === '<p><br></p>' || !text) {
        alert('Please enter both matter number and definition');
        return;
    }
    
    // Check if matter number already exists
    const existingIndex = definitions.findIndex(def => def.number === number);
    if (existingIndex !== -1) {
        // Update existing definition
        definitions[existingIndex].text = text.replace(/color:\s*[^;]+;?/gi, '');
        alert('Definition updated');
    } else {
        // Add new definition
        definitions.push({ number, text: text.replace(/color:\s*[^;]+;?/gi, '') });
        definitions.sort((a, b) => a.number - b.number);
        alert('Definition added');
    }
    
    // Find the current slide position after sorting
    currentSlide = definitions.findIndex(def => def.number === number);
    
    // Clear inputs
    matterInput.value = '';
    quill.setContents([]);
    
    renderCurrentSlide();
    toggleInputPanel();
}

function parseAndAddDefinitions() {
    const text = quill.getText().trim();
    
    if (!text) {
        alert('Please paste content to parse');
        return;
    }
    
    const lines = text.split('\n');
    let matterCount = 1;
    let currentDefinition = '';
    
    for (let line of lines) {
        line = line.trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // If we have accumulated a definition, add it
        if (currentDefinition) {
            definitions.push({
                number: matterCount,
                text: `<p>${currentDefinition}</p>`.replace(/color:\s*[^;]+;?/gi, '')
            });
            matterCount++;
            currentDefinition = '';
        }
        
        // Start new definition with current line
        currentDefinition = line;
    }
    
    // Add the last definition if exists
    if (currentDefinition) {
        definitions.push({
            number: matterCount,
            text: `<p>${currentDefinition}</p>`.replace(/color:\s*[^;]+;?/gi, '')
        });
    }
    
    // Sort definitions and reset to first slide
    definitions.sort((a, b) => a.number - b.number);
    currentSlide = 0;
    
    // Clear input
    quill.setContents([]);
    
    renderCurrentSlide();
    toggleInputPanel();
    
    alert(`${definitions.length} definitions added successfully!`);
}

function clearCurrent() {
    matterInput.value = '';
    quill.setContents([]);
}

function deleteCurrentDefinition() {
    if (definitions.length === 0) {
        alert('No definitions to delete');
        return;
    }
    
    if (confirm('Are you sure you want to delete this definition?')) {
        definitions.splice(currentSlide, 1);
        
        // Adjust current slide
        if (currentSlide >= definitions.length) {
            currentSlide = Math.max(0, definitions.length - 1);
        }
        
        renderCurrentSlide();
        toggleInputPanel();
    }
}

function clearAllDefinitions() {
    if (definitions.length === 0) {
        alert('No definitions to clear');
        return;
    }
    
    if (confirm('Are you sure you want to clear all definitions?')) {
        definitions = [];
        currentSlide = 0;
        renderCurrentSlide();
        toggleInputPanel();
    }
}

function toggleInputPanel() {
    inputPanel.classList.toggle('show');
}

function previousSlide() {
    if (currentSlide > 0) {
        currentSlide--;
        renderCurrentSlide();
        
        // Reset auto-advance timer when manually navigating
        if (isAutoAdvanceRunning) {
            autoAdvanceSeconds = autoAdvanceDuration;
            updateAutoAdvanceDisplay();
            updateProgressBar();
        }
    }
}

function nextSlide() {
    if (currentSlide < definitions.length - 1) {
        currentSlide++;
        renderCurrentSlide();
        
        // Reset auto-advance timer when manually navigating
        if (isAutoAdvanceRunning) {
            autoAdvanceSeconds = autoAdvanceDuration;
            updateAutoAdvanceDisplay();
            updateProgressBar();
        }
    }
}

// Auto-advance timer functions
function toggleTimerControls() {
    timerControls.classList.toggle('show');
}

function startAutoAdvance() {
    if (definitions.length === 0) {
        alert('Please add some definitions first!');
        return;
    }
    
    autoAdvanceDuration = parseInt(timerDuration.value);
    autoAdvanceSeconds = autoAdvanceDuration;
    isAutoAdvanceRunning = true;
    
    timerDisplay.classList.add('running');
    timerDisplay.classList.remove('paused');
    
    autoAdvanceInterval = setInterval(() => {
        autoAdvanceSeconds--;
        updateAutoAdvanceDisplay();
        updateProgressBar();
        
        if (autoAdvanceSeconds <= 0) {
            // Auto advance to next slide
            if (currentSlide < definitions.length - 1) {
                nextSlide();
                autoAdvanceSeconds = autoAdvanceDuration;
            } else {
                // Reached the end, stop auto-advance
                stopAutoAdvance();
            }
        }
    }, 1000);
    
    timerControls.classList.remove('show');
}

function stopAutoAdvance() {
    isAutoAdvanceRunning = false;
    timerDisplay.classList.remove('running', 'paused');
    
    if (autoAdvanceInterval) {
        clearInterval(autoAdvanceInterval);
        autoAdvanceInterval = null;
    }
    
    autoAdvanceSeconds = 0;
    updateAutoAdvanceDisplay();
    updateProgressBar();
}

function updateAutoAdvanceDisplay() {
    if (isAutoAdvanceRunning) {
        timerDisplay.textContent = `Next: ${autoAdvanceSeconds}s`;
    } else {
        timerDisplay.textContent = 'Auto: OFF';
    }
}

function updateProgressBar() {
    if (isAutoAdvanceRunning && autoAdvanceDuration > 0) {
        const progress = ((autoAdvanceDuration - autoAdvanceSeconds) / autoAdvanceDuration) * 100;
        timerProgressBar.style.width = `${progress}%`;
    } else {
        timerProgressBar.style.width = '0%';
    }
}

// Background functions
function toggleBgControls() {
    bgControls.classList.toggle('show');
}

function handleBackgroundUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.body.style.backgroundImage = `url(${e.target.result})`;
            document.getElementById('fullscreenOverlay').style.backgroundImage = `url(${e.target.result})`;
            document.getElementById('fullscreenOverlay').style.backgroundSize = 'cover';
            document.getElementById('fullscreenOverlay').style.backgroundPosition = 'center';
            document.getElementById('fullscreenOverlay').style.backgroundRepeat = 'no-repeat';
        };
        reader.readAsDataURL(file);
    }
    bgControls.classList.remove('show');
}

function removeBackground() {
    document.body.style.backgroundImage = 'none';
    document.getElementById('fullscreenOverlay').style.backgroundImage = 'none';
    bgControls.classList.remove('show');
}

// Fullscreen functions
function toggleFullscreen() {
    if (isFullscreen) {
        exitFullscreen();
    } else {
        enterFullscreen();
    }
}

function enterFullscreen() {
    isFullscreen = true;
    fullscreenOverlay.classList.add('show');
    document.getElementById('fullscreenBtn').textContent = 'Exit Fullscreen';
}

function exitFullscreen() {
    isFullscreen = false;
    fullscreenOverlay.classList.remove('show');
    document.getElementById('fullscreenBtn').textContent = 'Fullscreen';
}

// Close controls when clicking outside
document.addEventListener('click', function(e) {
    if (!bgControls.contains(e.target) && !document.getElementById('bgBtn').contains(e.target)) {
        bgControls.classList.remove('show');
    }
    
    if (!timerControls.contains(e.target) && !document.getElementById('timerBtn').contains(e.target)) {
        timerControls.classList.remove('show');
    }
});

// Load saved background on page load
function loadSavedBackground() {
    const savedBg = localStorage.getItem('backgroundImage');
    if (savedBg) {
        document.body.style.backgroundImage = `url(${savedBg})`;
        document.getElementById('fullscreenOverlay').style.backgroundImage = `url(${savedBg})`;
        document.getElementById('fullscreenOverlay').style.backgroundSize = 'cover';
        document.getElementById('fullscreenOverlay').style.backgroundPosition = 'center';
        document.getElementById('fullscreenOverlay').style.backgroundRepeat = 'no-repeat';
    }
}

// Enhanced keyboard navigation
document.addEventListener('keydown', function(e) {
    if (inputPanel.classList.contains('show')) return;
    
    switch(e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
            previousSlide();
            break;
        case 'ArrowRight':
        case 'ArrowDown':
            nextSlide();
            break;
        case 'a':
        case 'A':
            toggleInputPanel();
            break;
        case 'f':
        case 'F':
            toggleFullscreen();
            break;
        case 't':
        case 'T':
            toggleTimerControls();
            break;
        case 's':
        case 'S':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (isAutoAdvanceRunning) {
                    stopAutoAdvance();
                } else {
                    startAutoAdvance();
                }
            }
            break;
        case 'b':
        case 'B':
            toggleBgControls();
            break;
        case 'Escape':
            if (isFullscreen) {
                exitFullscreen();
            } else if (inputPanel.classList.contains('show')) {
                toggleInputPanel();
            } else if (bgControls.classList.contains('show')) {
                bgControls.classList.remove('show');
            } else if (timerControls.classList.contains('show')) {
                timerControls.classList.remove('show');
            }
            break;
    }
});

// Initialize
loadSavedBackground();
renderCurrentSlide();

function updateBackgroundBlur(value) {
    const blurValue = `blur(${value}px)`;
    
    // Apply blur only to the background pseudo-elements
    const style = document.createElement('style');
    style.textContent = `
        body::before { filter: ${blurValue}; }
        .fullscreen-overlay::before { filter: ${blurValue}; }
    `;
    
    // Remove previous blur style if exists
    const existingStyle = document.getElementById('blur-style');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    style.id = 'blur-style';
    document.head.appendChild(style);
    
    document.getElementById('blurValue').textContent = `${value}px`;
}

// Update handleBackgroundUpload function:
function handleBackgroundUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.body.style.backgroundImage = `url(${e.target.result})`;
            document.getElementById('fullscreenOverlay').style.backgroundImage = `url(${e.target.result})`;
            document.getElementById('fullscreenOverlay').style.backgroundSize = 'cover';
            document.getElementById('fullscreenOverlay').style.backgroundPosition = 'center';
            document.getElementById('fullscreenOverlay').style.backgroundRepeat = 'no-repeat';
            
            // Reset blur when new image is uploaded
            document.getElementById('blurSlider').value = 0;
            updateBackgroundBlur(0);
        };
        reader.readAsDataURL(file);
    }
    bgControls.classList.remove('show');
}

// Update removeBackground function:
function removeBackground() {
    document.body.style.backgroundImage = 'none';
    document.getElementById('fullscreenOverlay').style.backgroundImage = 'none';
    
    // Remove blur style
    const blurStyle = document.getElementById('blur-style');
    if (blurStyle) {
        blurStyle.remove();
    }
    
    document.getElementById('blurSlider').value = 0;
    document.getElementById('blurValue').textContent = '0px';
    bgControls.classList.remove('show');
}