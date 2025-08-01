class TypingSpeedApp {
    constructor() {
        this.practiceText = '';
        this.typedText = '';
        this.startTime = null;
        this.timerInterval = null;
        this.totalCharacters = 0;
        this.correctCharacters = 0;
        this.skipPositions = new Set(); // Positions to skip (comments)
        this.leadingWhitespacePositions = new Set(); // Positions that are leading whitespace
        this.currentPosition = 0;
        this.skipButton = null; // Reference to the skip button
        this.currentLineStartPos = 0; // Start position of current line
        this.currentLineEndPos = 0; // End position of current line
        this.skippedCharacters = 0; // Count of characters skipped via button
        this.manuallyTypedCharacters = 0; // Count of characters manually typed
        this.correctManualCharacters = 0; // Count of correctly manually typed characters
        
        this.initializeElements();
        this.bindEvents();
        this.createNotificationContainer();
    }

    createNotificationContainer() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notificationContainer')) {
            const container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
    }

    showNotification(message, type = 'info', duration = 4000) {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = type === 'success' ? '✅' : 
                    type === 'error' ? '❌' : 
                    type === 'warning' ? '⚠️' : 'ℹ️';
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('notification-fade-out');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
        
        return notification;
    }

    showCompletionModal(stats) {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'completion-modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'completion-modal';
        
        modal.innerHTML = `
            <div class="completion-header">
                <h2>🎉 Congratulations!</h2>
                <button class="completion-close" onclick="this.closest('.completion-modal-overlay').remove()">×</button>
            </div>
            <div class="completion-content">
                <div class="completion-message">
                    <p>You've successfully completed the typing practice!</p>
                </div>
                <div class="completion-stats">
                    <div class="stat-item">
                        <div class="stat-value">${stats.time}</div>
                        <div class="stat-label">Time</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.wpm}</div>
                        <div class="stat-label">WPM</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.accuracy}</div>
                        <div class="stat-label">Accuracy</div>
                    </div>
                </div>
                <div class="completion-actions">
                    <button class="btn btn-primary btn-medium" onclick="this.closest('.completion-modal-overlay').remove(); app.resetTyping();">Try Again</button>
                    <button class="btn btn-outline btn-medium" onclick="this.closest('.completion-modal-overlay').remove(); app.goBackToTextInput();">New Text</button>
                </div>
            </div>
        `;
        
        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
        
        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modalOverlay.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    initializeElements() {
        // Sections
        this.textInputSection = document.getElementById('textInputSection');
        this.typingSection = document.getElementById('typingSection');
        this.practiceSetupModal = document.getElementById('practiceSetupModal');
        
        // Input elements
        this.practiceTextArea = document.getElementById('practiceText');
        this.languageSelect = document.getElementById('languageSelect');
        
        // Display elements
        this.textDisplay = document.getElementById('textDisplay');
        this.lineNumbers = document.getElementById('lineNumbers');
        this.wpmDisplay = document.getElementById('wpm');
        this.accuracyDisplay = document.getElementById('accuracy');
        this.timerDisplay = document.getElementById('timer');
        this.progressFill = document.getElementById('progressFill');
        this.progressPercent = document.getElementById('progressPercent');
        
        // Buttons
        this.heroStartButton = document.getElementById('heroStartButton');
        this.navStartButton = document.getElementById('navStartButton');
        this.startButton = document.getElementById('startButton');
        this.backButton = document.getElementById('backButton');
        this.resetButton = document.getElementById('resetButton');
        this.sampleButton = document.getElementById('sampleButton');
        this.closeModal = document.getElementById('closeModal');
        this.modalOverlay = document.querySelector('.modal-overlay');
    }

    bindEvents() {
        // Hero and nav buttons to open modal
        if (this.heroStartButton) {
            this.heroStartButton.addEventListener('click', () => this.openModal());
        }
        if (this.navStartButton) {
            this.navStartButton.addEventListener('click', () => this.openModal());
        }
        
        // Modal events
        if (this.closeModal) {
            this.closeModal.addEventListener('click', () => this.closeModalHandler());
        }
        if (this.modalOverlay) {
            this.modalOverlay.addEventListener('click', () => this.closeModalHandler());
        }
        
        // Existing events
        this.startButton.addEventListener('click', () => this.startTypingPractice());
        this.backButton.addEventListener('click', () => this.goBackToTextInput());
        this.resetButton.addEventListener('click', () => this.resetTyping());
        this.textDisplay.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.textDisplay.addEventListener('click', () => this.textDisplay.focus());
        
        // Add sample button event if it exists
        if (this.sampleButton) {
            this.sampleButton.addEventListener('click', () => this.loadSampleCode());
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.practiceSetupModal && !this.practiceSetupModal.classList.contains('hidden')) {
                this.closeModalHandler();
            }
        });
        
        // Window resize and scroll events for skip button positioning
        window.addEventListener('resize', () => {
            if (this.skipButton && this.skipButton.style.display !== 'none') {
                this.positionSkipButton();
            }
        });
        
        window.addEventListener('scroll', () => {
            if (this.skipButton && this.skipButton.style.display !== 'none') {
                this.positionSkipButton();
            }
        });
    }

    openModal() {
        if (this.practiceSetupModal) {
            this.practiceSetupModal.classList.remove('hidden');
            // Focus the textarea for better UX
            if (this.practiceTextArea) {
                setTimeout(() => this.practiceTextArea.focus(), 100);
            }
        }
    }

    closeModalHandler() {
        if (this.practiceSetupModal) {
            this.practiceSetupModal.classList.add('hidden');
        }
    }

    startTypingPractice() {
        const text = this.practiceTextArea.value.trim();
        
        if (!text) {
            this.showNotification('Please enter some text to practice!', 'warning');
            return;
        }

        // Strip lines that contain only spaces (but keep truly empty lines and lines with content)
        const cleanedText = this.stripSpaceOnlyLines(text);
        
        if (!cleanedText.trim()) {
            this.showNotification('No content found after removing empty lines!', 'warning');
            return;
        }

        this.practiceText = cleanedText;
        
        // Close modal
        this.closeModalHandler();
        
        // Update file display name with correct extension
        this.updateFileDisplayName();
        
        this.setupTypingInterface();
        this.showTypingSection();
    }
    
    stripSpaceOnlyLines(text) {
        const lines = text.split('\n');
        const cleanedLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Keep line if:
            // 1. It has actual content (non-whitespace)
            // 2. It's completely empty (intentional blank line)
            // Remove only if it has spaces/tabs but no content
            
            if (line.length === 0 || line.trim().length > 0) {
                // Keep empty lines and lines with content
                cleanedLines.push(line);
            }
            // Skip lines that are only spaces/tabs (line.length > 0 && line.trim().length === 0)
        }
        
        return cleanedLines.join('\n');
    }

    updateFileDisplayName() {
        const fileNameDisplay = document.getElementById('fileName');
        if (fileNameDisplay) {
            const language = this.languageSelect.value;
            let extension = '.txt';
            
            switch (language) {
                case 'cpp':
                    extension = '.cpp';
                    break;
                case 'python':
                    extension = '.py';
                    break;
                case 'javascript':
                    extension = '.js';
                    break;
                case 'java':
                    extension = '.java';
                    break;
                case 'auto':
                    // Auto-detect based on content
                    const detectedLang = this.detectLanguage(this.practiceText);
                    switch (detectedLang) {
                        case 'cpp':
                            extension = '.cpp';
                            break;
                        case 'python':
                            extension = '.py';
                            break;
                        case 'javascript':
                            extension = '.js';
                            break;
                        case 'java':
                            extension = '.java';
                            break;
                        default:
                            extension = '.txt';
                    }
                    break;
                default:
                    extension = '.txt';
            }
            
            fileNameDisplay.textContent = `practice${extension}`;
        }
    }

    setupTypingInterface() {
        this.textDisplay.innerHTML = '';
        this.skipPositions.clear();
        this.leadingWhitespacePositions.clear();
        this.currentPosition = 0;
        
        // Detect and mark comment positions and leading whitespace
        this.detectComments();
        
        this.practiceText.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.className = 'char';
            span.setAttribute('data-index', index);
            
            if (this.skipPositions.has(index)) {
                // Check if this is leading whitespace or a comment
                if (this.leadingWhitespacePositions.has(index)) {
                    span.classList.add('leading-whitespace', 'skipped');
                } else {
                    span.classList.add('comment', 'skipped');
                }
            } else {
                span.classList.add('untyped');
            }
            
            this.textDisplay.appendChild(span);
        });
        
        // Generate line numbers
        this.generateLineNumbers();
        
        // Find first non-skipped position
        this.currentPosition = this.findNextTypablePosition(0);
        this.updateCurrentPosition();
        
        this.resetStats();
        this.typedText = '';
        this.textDisplay.focus();
    }
    
    isLeadingWhitespace(index) {
        // Check if this index is part of leading whitespace on a line
        const textUpToIndex = this.practiceText.substring(0, index + 1);
        const lines = textUpToIndex.split('\n');
        const currentLine = lines[lines.length - 1];
        const charInCurrentLine = currentLine.length - 1;
        
        // Check if we're still in the leading whitespace part of the line
        const leadingWhitespaceMatch = this.practiceText.split('\n')[lines.length - 1]?.match(/^[\s\t]*/);
        const leadingWhitespaceLength = leadingWhitespaceMatch ? leadingWhitespaceMatch[0].length : 0;
        
        return charInCurrentLine < leadingWhitespaceLength && /[\s\t]/.test(this.practiceText[index]);
    }
    
    generateLineNumbers() {
        const lines = this.practiceText.split('\n');
        this.lineNumbers.innerHTML = '';
        
        lines.forEach((_, index) => {
            const lineDiv = document.createElement('div');
            lineDiv.textContent = (index + 1).toString();
            this.lineNumbers.appendChild(lineDiv);
        });
    }

    showTypingSection() {
        document.getElementById('textInputSection').classList.add('hidden');
        document.getElementById('typingSection').classList.remove('hidden');
        
        // Auto-focus the typing area
        setTimeout(() => {
            if (this.textDisplay) {
                this.textDisplay.focus();
            }
        }, 100);
    }

    goBackToTextInput() {
        document.getElementById('typingSection').classList.add('hidden');
        document.getElementById('textInputSection').classList.remove('hidden');
        this.stopTimer();
        this.practiceTextArea.focus();
        
        // Clean up skip button
        if (this.skipButton) {
            this.skipButton.remove();
            this.skipButton = null;
        }
    }

    detectComments() {
        const text = this.practiceText;
        const language = this.languageSelect.value;
        const commentRanges = [];
        const lines = text.split('\n');
        
        // Auto-detect language if set to auto
        let detectedLang = language;
        if (language === 'auto') {
            detectedLang = this.detectLanguage(text);
        }
        
        let match;
        
        switch (detectedLang) {
            case 'cpp':
            case 'javascript':
            case 'java':
                // Single-line comments: //
                const cppSingleLineRegex = /\/\/.*?$/gm;
                while ((match = cppSingleLineRegex.exec(text)) !== null) {
                    commentRanges.push({
                        start: match.index,
                        end: match.index + match[0].length - 1
                    });
                }
                
                // Multi-line comments: /* */
                const cppMultiLineRegex = /\/\*[\s\S]*?\*\//g;
                while ((match = cppMultiLineRegex.exec(text)) !== null) {
                    commentRanges.push({
                        start: match.index,
                        end: match.index + match[0].length - 1
                    });
                }
                break;
                
            case 'python':
                // Single-line comments: #
                const pythonSingleLineRegex = /#.*?$/gm;
                while ((match = pythonSingleLineRegex.exec(text)) !== null) {
                    commentRanges.push({
                        start: match.index,
                        end: match.index + match[0].length - 1
                    });
                }
                
                // Docstrings: """ """ or ''' '''
                const docstringRegex = /("""[\s\S]*?"""|'''[\s\S]*?''')/g;
                while ((match = docstringRegex.exec(text)) !== null) {
                    commentRanges.push({
                        start: match.index,
                        end: match.index + match[0].length - 1
                    });
                }
                break;
                
            case 'plain':
            default:
                // No comment detection for plain text
                break;
        }
        
        // Mark all positions within comment ranges as skippable
        commentRanges.forEach(range => {
            for (let i = range.start; i <= range.end; i++) {
                this.skipPositions.add(i);
            }
        });
        
        // Enhanced feature: Skip entire lines that are comment-only or start with comments
        let currentIndex = 0;
        lines.forEach((line, lineNum) => {
            let isCommentLine = false;
            const trimmedLine = line.trim();
            
            switch (detectedLang) {
                case 'cpp':
                case 'javascript':
                case 'java':
                    // Skip entire line if it starts with // or /* (after any whitespace)
                    if (/^\s*(\/\/|\/\*)/.test(line)) {
                        isCommentLine = true;
                    }
                    break;
                case 'python':
                    // Skip entire line if it starts with # (after any whitespace)
                    // Also check for docstring lines (lines that only contain """ or ''')
                    if (/^\s*#/.test(line) || /^\s*(""".*"""|\'''.*\'\'')?\s*$/.test(line) || 
                        /^\s*("""|''')/.test(line)) {
                        isCommentLine = true;
                    }
                    break;
            }
            
            // If this is a comment line, skip the entire line including whitespace
            if (isCommentLine) {
                for (let i = currentIndex; i < currentIndex + line.length; i++) {
                    this.skipPositions.add(i);
                }
                // Also skip the newline character if it exists
                if (currentIndex + line.length < text.length && text[currentIndex + line.length] === '\n') {
                    this.skipPositions.add(currentIndex + line.length);
                }
            } else {
                // For non-comment lines, mark leading whitespace as skippable (auto-type)
                const leadingWhitespaceMatch = line.match(/^[\s\t]*/);
                if (leadingWhitespaceMatch && leadingWhitespaceMatch[0].length > 0) {
                    const leadingWhitespace = leadingWhitespaceMatch[0];
                    for (let i = 0; i < leadingWhitespace.length; i++) {
                        this.skipPositions.add(currentIndex + i);
                        this.leadingWhitespacePositions.add(currentIndex + i);
                    }
                }
            }
            
            // Move to next line (including the newline character)
            currentIndex += line.length + 1;
        });
    }
    
    detectLanguage(text) {
        // Simple language detection based on common patterns
        if (text.includes('#include') || text.includes('std::') || text.includes('cout') || text.includes('//')) {
            return 'cpp';
        } else if (text.includes('def ') || text.includes('import ') || text.includes('print(') || text.includes('#')) {
            return 'python';
        } else if (text.includes('function') || text.includes('const ') || text.includes('let ') || text.includes('var ')) {
            return 'javascript';
        } else if (text.includes('public class') || text.includes('System.out')) {
            return 'java';
        }
        return 'plain';
    }
    
    findNextTypablePosition(startPos) {
        for (let i = startPos; i < this.practiceText.length; i++) {
            if (!this.skipPositions.has(i)) {
                return i;
            }
        }
        return this.practiceText.length;
    }
    
    findPrevTypablePosition(startPos) {
        for (let i = startPos - 1; i >= 0; i--) {
            if (!this.skipPositions.has(i)) {
                return i;
            }
        }
        return -1;
    }
    
    updateCurrentPosition() {
        const chars = this.textDisplay.children;
        
        // Remove current class from all characters
        for (let i = 0; i < chars.length; i++) {
            chars[i].classList.remove('current');
        }
        
        // Add current class to current position
        if (this.currentPosition < chars.length) {
            chars[this.currentPosition].classList.add('current');
        }
        
        // Update current line boundaries
        this.updateCurrentLineBoundaries();
        
        // Show/hide skip button
        this.updateSkipButton();
    }
    
    updateCurrentLineBoundaries() {
        // Find the start and end of the current line
        let lineStart = this.currentPosition;
        let lineEnd = this.currentPosition;
        
        // Find line start (go back to last newline or beginning)
        while (lineStart > 0 && this.practiceText[lineStart - 1] !== '\n') {
            lineStart--;
        }
        
        // Find line end (go forward to next newline or end)
        while (lineEnd < this.practiceText.length && this.practiceText[lineEnd] !== '\n') {
            lineEnd++;
        }
        
        this.currentLineStartPos = lineStart;
        this.currentLineEndPos = lineEnd;
    }
    
    createSkipButton() {
        if (this.skipButton) {
            this.skipButton.remove();
        }
        
        this.skipButton = document.createElement('button');
        this.skipButton.className = 'skip-line-button';
        this.skipButton.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 8L8 14M14 8H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Skip this line
        `;
        this.skipButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.skipCurrentLine();
        });
        
        // Prevent the button from taking focus
        this.skipButton.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
        
        document.body.appendChild(this.skipButton);
        return this.skipButton;
    }
    
    updateSkipButton() {
        // Check if we're in the middle of typing a line (not at the start)
        const isTypingLine = this.currentPosition > this.currentLineStartPos;
        
        // Check if the current line has non-comment content to type
        let hasTypableContent = false;
        for (let i = this.currentLineStartPos; i < this.currentLineEndPos; i++) {
            if (!this.skipPositions.has(i)) {
                hasTypableContent = true;
                break;
            }
        }
        
        if (isTypingLine && hasTypableContent && this.currentPosition < this.practiceText.length) {
            if (!this.skipButton) {
                this.createSkipButton();
            }
            this.positionSkipButton();
            this.skipButton.style.display = 'flex';
        } else {
            if (this.skipButton) {
                this.skipButton.style.display = 'none';
            }
        }
    }
    
    positionSkipButton() {
        if (!this.skipButton) return;
        
        const chars = this.textDisplay.children;
        if (this.currentLineEndPos - 1 >= 0 && this.currentLineEndPos - 1 < chars.length) {
            const lastCharInLine = chars[this.currentLineEndPos - 1];
            const rect = lastCharInLine.getBoundingClientRect();
            const editorBodyRect = this.textDisplay.closest('.editor-body').getBoundingClientRect();
            
            // Position the button to the right of the last character in the line
            // relative to the editor body
            this.skipButton.style.position = 'fixed';
            this.skipButton.style.left = `${rect.right + 10}px`;
            this.skipButton.style.top = `${rect.top}px`;
            this.skipButton.style.zIndex = '1000';
        }
    }
    
    skipCurrentLine() {
        if (this.currentPosition >= this.practiceText.length) return;
        
        let skippedCount = 0;
        
        // Add each character from current position to end of line exactly as it appears
        for (let i = this.currentPosition; i < this.currentLineEndPos; i++) {
            if (!this.skipPositions.has(i)) {
                // Add the exact character from practice text
                this.typedText += this.practiceText[i];
                skippedCount++;
                // Since we're adding the exact character, it's always correct
                this.correctCharacters++;
            }
        }
        
        // Track skipped characters for statistics (don't count toward manual typing)
        this.skippedCharacters += skippedCount;
        
        // Move position to end of current line
        this.currentPosition = this.currentLineEndPos;
        
        // Handle newline if present
        if (this.currentPosition < this.practiceText.length && 
            this.practiceText[this.currentPosition] === '\n') {
            this.currentPosition++;
            this.typedText += '\n';
        }
        
        // Find next typable position
        this.currentPosition = this.findNextTypablePosition(this.currentPosition);
        
        // Update display and stats
        this.updateCurrentPosition();
        this.updateDisplay();
        this.updateStats();
        
        // Hide skip button and refocus
        if (this.skipButton) {
            this.skipButton.style.display = 'none';
        }
        
        setTimeout(() => {
            this.textDisplay.focus();
        }, 10);
        
        this.showNotification(`Line skipped (${skippedCount} characters)`, 'success', 2000);
        
        // Check completion
        if (this.currentPosition >= this.practiceText.length) {
            this.completeTyping();
        }
    }
    
    resetTyping() {
        this.setupTypingInterface();
        this.stopTimer();
        this.startTime = null;
        this.textDisplay.focus();
        
        // Clean up skip button
        if (this.skipButton) {
            this.skipButton.remove();
            this.skipButton = null;
        }
    }

    handleKeydown(e) {
        // Prevent default behavior for most keys to handle them manually
        if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            
            if (!this.startTime && (e.key.length === 1 || e.key === 'Enter')) {
                this.startTime = Date.now();
                this.startTimer();
            }
            
            if (e.key === 'Backspace') {
                this.handleBackspace();
            } else if (e.key === 'Enter') {
                this.handleEnterKey();
            } else if (e.key.length === 1 || e.key === 'Tab') {
                const char = e.key === 'Tab' ? '\t' : e.key;
                this.handleCharacterInput(char);
            }
            
            this.updateDisplay();
            this.updateStats();
            
            // Check if typing is complete
            if (this.currentPosition >= this.practiceText.length) {
                this.completeTyping();
            }
        }
    }
    
    handleEnterKey() {
        if (this.currentPosition < this.practiceText.length && 
            this.practiceText[this.currentPosition] === '\n') {
            
            // Move past the newline character
            this.currentPosition++;
            this.typedText += '\n';
            this.manuallyTypedCharacters++;
            this.correctCharacters++;
            this.correctManualCharacters++;
            
            // Find next typable position (leading whitespace will be auto-skipped)
            this.currentPosition = this.findNextTypablePosition(this.currentPosition);
            this.updateCurrentPosition();
        }
    }
    
    handleCharacterInput(char) {
        if (this.currentPosition < this.practiceText.length && 
            !this.skipPositions.has(this.currentPosition)) {
            
            this.typedText += char;
            this.manuallyTypedCharacters++;
            
            // Check if character matches
            if (this.practiceText[this.currentPosition] === char) {
                this.correctCharacters++;
                this.correctManualCharacters++;
            }
            // Note: We don't mark as incorrect here, we just don't increment correct counters
            
            // Always move to next typable position, regardless of correctness
            this.currentPosition = this.findNextTypablePosition(this.currentPosition + 1);
            this.updateCurrentPosition();
        }
    }
    
    handleBackspace() {
        if (this.currentPosition > 0) {
            // Find previous typable position
            const prevPosition = this.findPrevTypablePosition(this.currentPosition);
            
            if (prevPosition >= 0) {
                this.currentPosition = prevPosition;
                
                // Remove last character from typed text
                if (this.typedText.length > 0) {
                    const removedChar = this.typedText[this.typedText.length - 1];
                    this.typedText = this.typedText.slice(0, -1);
                    this.manuallyTypedCharacters = Math.max(0, this.manuallyTypedCharacters - 1);
                    
                    // Adjust correct characters count
                    if (this.practiceText[this.currentPosition] === removedChar) {
                        this.correctCharacters = Math.max(0, this.correctCharacters - 1);
                        this.correctManualCharacters = Math.max(0, this.correctManualCharacters - 1);
                    }
                }
                
                this.updateCurrentPosition();
            }
        }
    }

    updateDisplay() {
        const chars = this.textDisplay.children;
        let typedIndex = 0;
        
        for (let i = 0; i < this.practiceText.length; i++) {
            const char = chars[i];
            
            // Reset classes
            char.className = 'char';
            
            if (this.skipPositions.has(i)) {
                // This is a comment or skipped position
                char.classList.add('comment', 'skipped');
            } else if (i < this.currentPosition) {
                // This position has been passed
                if (typedIndex < this.typedText.length) {
                    // Compare the typed character with the expected character
                    if (this.typedText[typedIndex] === this.practiceText[i]) {
                        char.classList.add('correct');
                    } else {
                        char.classList.add('incorrect');
                    }
                    typedIndex++;
                } else {
                    // This shouldn't happen if logic is correct, but mark as correct to be safe
                    char.classList.add('correct');
                }
            } else if (i === this.currentPosition) {
                char.classList.add('current');
            } else {
                char.classList.add('untyped');
            }
        }
        
        // Update progress bar based on position, not typed text length
        const progress = (this.currentPosition / this.practiceText.length) * 100;
        this.progressFill.style.width = `${progress}%`;
        this.progressPercent.textContent = `${Math.round(progress)}%`;
        
        // Update skip button position if it's visible
        if (this.skipButton && this.skipButton.style.display !== 'none') {
            this.positionSkipButton();
        }
    }

    updateStats() {
        if (!this.startTime) return;
        
        const timeElapsed = (Date.now() - this.startTime) / 1000 / 60; // in minutes
        // Use only manually typed characters for WPM calculation
        const wordsTyped = this.manuallyTypedCharacters / 5; // assuming average word length of 5
        const wpm = timeElapsed > 0 ? Math.round(wordsTyped / timeElapsed) : 0;
        
        // Calculate accuracy based on manually typed characters only
        const accuracy = this.manuallyTypedCharacters > 0 ? 
            Math.round((this.correctManualCharacters / this.manuallyTypedCharacters) * 100) : 100;
        
        this.wpmDisplay.textContent = wpm;
        this.accuracyDisplay.textContent = `${accuracy}%`;
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.startTime) {
                const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
                const seconds = (elapsed % 60).toString().padStart(2, '0');
                this.timerDisplay.textContent = `${minutes}:${seconds}`;
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    resetStats() {
        this.wpmDisplay.textContent = '0';
        this.accuracyDisplay.textContent = '100%';
        this.timerDisplay.textContent = '00:00';
        this.progressFill.style.width = '0%';
        this.progressPercent.textContent = '0%';
        this.correctCharacters = 0;
        this.typedText = '';
        this.skippedCharacters = 0;
        this.manuallyTypedCharacters = 0;
        this.correctManualCharacters = 0;
    }
    
    loadSampleCode() {
        const sampleTexts = [
            // C++ Example
            `#include <iostream>
#include <vector>
using namespace std;

int main() {
    // This is a comment that won't be typed
    vector<int> numbers = {1, 2, 3, 4, 5};
    
    /* Multi-line comment
       that spans multiple lines */
    for (int num : numbers) {
        cout << "Number: " << num << endl;
    }
    
    return 0;
}`,
            
            // Python Example
            `def fibonacci(n):
    """
    Calculate the nth Fibonacci number
    This docstring won't be typed
    """
    # Base cases - this comment is skipped
    if n <= 1:
        return n
    
    # Recursive case
    return fibonacci(n-1) + fibonacci(n-2)

# Main execution
if __name__ == "__main__":
    for i in range(10):
        print(f"F({i}) = {fibonacci(i)}")`,
        
        // JavaScript Example
        `function quickSort(arr) {
            // Base case: arrays with 0 or 1 element are sorted
            if (arr.length <= 1) {
                return arr;
            }
            
            /* Choose pivot and partition array */
            const pivot = arr[Math.floor(arr.length / 2)];
            const left = arr.filter(x => x < pivot);
            const middle = arr.filter(x => x === pivot);
            const right = arr.filter(x => x > pivot);
            
            // Recursively sort and combine
            return [...quickSort(left), ...middle, ...quickSort(right)];
        }`
        ];
        
        const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
        this.practiceTextArea.value = randomText;
        
        // Auto-set language based on sample
        if (randomText.includes('#include')) {
            this.languageSelect.value = 'cpp';
        } else if (randomText.includes('def ') && randomText.includes('"""')) {
            this.languageSelect.value = 'python';
        } else if (randomText.includes('function') && randomText.includes('const')) {
            this.languageSelect.value = 'javascript';
        } else {
            this.languageSelect.value = 'auto';
        }
    }

    completeTyping() {
        this.stopTimer();
        
        const timeElapsed = (Date.now() - this.startTime) / 1000;
        const minutes = Math.floor(timeElapsed / 60);
        const seconds = Math.floor(timeElapsed % 60);
        const wpm = this.wpmDisplay.textContent;
        const accuracy = this.accuracyDisplay.textContent;
        
        setTimeout(() => {
            this.showCompletionModal({
                time: `${minutes}:${seconds.toString().padStart(2, '0')}`,
                wpm: wpm,
                accuracy: accuracy
            });
        }, 100);
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TypingSpeedApp();
});
