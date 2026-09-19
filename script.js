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
        this.syntaxMap = []; // Character index to syntax token mapping
        
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
            container.setAttribute('role', 'status');
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }
    }

    showNotification(message, type = 'info', duration = 4000) {
        const container = document.getElementById('notificationContainer');
        if (!container) return null;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = type === 'success' ? '✅' : 
                    type === 'error' ? '❌' : 
                    type === 'warning' ? '⚠️' : 'ℹ️';
        
        const content = document.createElement('div');
        content.className = 'notification-content';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'notification-icon';
        iconSpan.textContent = icon;

        const msgSpan = document.createElement('span');
        msgSpan.className = 'notification-message';
        msgSpan.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Dismiss notification');
        closeBtn.addEventListener('click', () => notification.remove());

        content.appendChild(iconSpan);
        content.appendChild(msgSpan);
        content.appendChild(closeBtn);
        notification.appendChild(content);
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
        // Remove existing overlay if present
        const existing = document.querySelector('.completion-modal-overlay');
        if (existing) existing.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'completion-modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'completion-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'completionTitle');
        
        modal.innerHTML = `
            <div class="completion-header">
                <h2 id="completionTitle">🎉 Congratulations!</h2>
                <button class="completion-close" id="modalCloseBtn" aria-label="Close dialog">×</button>
            </div>
            <div class="completion-content">
                <div class="completion-message">
                    <p>Practice complete! Ready to tackle your next DSA problem?</p>
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
                    <button class="btn btn-primary btn-medium" id="modalTryAgainBtn">Try Again (Enter)</button>
                    <button class="btn btn-outline btn-medium" id="modalNewTextBtn">New Problem (Esc)</button>
                </div>
            </div>
        `;
        
        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);

        const closeModal = () => {
            modalOverlay.remove();
            document.removeEventListener('keydown', handleModalKeys);
        };

        const tryAgain = () => {
            closeModal();
            this.resetTyping();
        };

        const newProblem = () => {
            closeModal();
            this.goBackToTextInput();
        };

        modal.querySelector('#modalCloseBtn')?.addEventListener('click', closeModal);
        modal.querySelector('#modalTryAgainBtn')?.addEventListener('click', tryAgain);
        modal.querySelector('#modalNewTextBtn')?.addEventListener('click', newProblem);
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
        
        // Keyboard shortcuts inside modal
        const handleModalKeys = (e) => {
            if (e.key === 'Escape') {
                newProblem();
            } else if (e.key === 'Enter') {
                tryAgain();
            }
        };
        document.addEventListener('keydown', handleModalKeys);
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
        
        // Core buttons with safe checks
        if (this.startButton) {
            this.startButton.addEventListener('click', () => this.startTypingPractice());
        }
        if (this.backButton) {
            this.backButton.addEventListener('click', () => this.goBackToTextInput());
        }
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => this.resetTyping());
        }
        if (this.textDisplay) {
            this.textDisplay.addEventListener('keydown', (e) => this.handleKeydown(e));
            this.textDisplay.addEventListener('click', () => this.textDisplay.focus());
        }
        
        // Sample button event
        if (this.sampleButton) {
            this.sampleButton.addEventListener('click', () => this.loadSampleCode());
        }

        // ESC key to close setup modal
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

        // Code area scroll listener
        const codeArea = document.querySelector('.code-area');
        if (codeArea) {
            codeArea.addEventListener('scroll', () => {
                if (this.skipButton && this.skipButton.style.display !== 'none') {
                    this.positionSkipButton();
                }
            });
        }
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
        const rawText = this.practiceTextArea ? this.practiceTextArea.value : '';
        // Normalize CRLF and CR line endings to LF
        const normalizedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
        
        if (!normalizedText) {
            this.showNotification('Please enter some text to practice!', 'warning');
            return;
        }

        // Strip lines that contain only spaces (but keep truly empty lines and lines with content)
        const cleanedText = this.stripSpaceOnlyLines(normalizedText);
        
        if (!cleanedText.trim()) {
            this.showNotification('No content found after removing empty lines!', 'warning');
            return;
        }

        this.practiceText = cleanedText;
        
        // Reset timer state for a fresh session
        this.stopTimer();
        this.startTime = null;
        
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
            // 1. It has actual non-whitespace content
            // 2. It is completely empty (intentional blank line)
            // Discard lines that contain only spaces/tabs
            if (line.length === 0 || line.trim().length > 0) {
                cleanedLines.push(line);
            }
        }
        
        return cleanedLines.join('\n');
    }

    updateFileDisplayName() {
        const fileNameDisplay = document.getElementById('fileName');
        if (fileNameDisplay) {
            const language = this.languageSelect ? this.languageSelect.value : 'auto';
            let extension = '.txt';
            
            let detectedLang = language;
            if (language === 'auto') {
                detectedLang = this.detectLanguage(this.practiceText);
            }
            
            switch (detectedLang) {
                case 'python':
                    extension = '.py';
                    break;
                case 'cpp':
                    extension = '.cpp';
                    break;
                case 'go':
                    extension = '.go';
                    break;
                case 'plain':
                default:
                    extension = '.txt';
                    break;
            }
            
            fileNameDisplay.textContent = `solution${extension}`;
        }
    }

    setupTypingInterface() {
        this.textDisplay.innerHTML = '';
        this.skipPositions.clear();
        this.leadingWhitespacePositions.clear();
        this.currentPosition = 0;
        
        // Detect and mark comment positions and leading whitespace
        this.detectComments();
        
        // Build syntax map for dynamic syntax highlighting
        const language = this.languageSelect ? this.languageSelect.value : 'auto';
        let detectedLang = language;
        if (language === 'auto') {
            detectedLang = this.detectLanguage(this.practiceText);
        }
        this.syntaxMap = this.buildSyntaxMap(this.practiceText, detectedLang);
        
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
        this.startTime = null;
        if (this.practiceTextArea) {
            this.practiceTextArea.focus();
        }
        
        // Clean up skip button
        if (this.skipButton) {
            this.skipButton.remove();
            this.skipButton = null;
        }
    }

    detectComments() {
        const text = this.practiceText;
        const language = this.languageSelect ? this.languageSelect.value : 'auto';
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
            case 'go':
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
        
        // Skip entire lines that are comment-only or start with comments
        let currentIndex = 0;
        lines.forEach((line) => {
            let isCommentLine = false;
            
            switch (detectedLang) {
                case 'cpp':
                case 'go':
                    // Skip entire line if it starts with // or /* (after any whitespace)
                    if (/^\s*(\/\/|\/\*)/.test(line)) {
                        isCommentLine = true;
                    }
                    break;
                case 'python':
                    // Skip entire line if it starts with # or docstring delimiter
                    if (/^\s*#/.test(line) || /^\s*("""|''')/.test(line)) {
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
                // For non-comment lines, mark leading whitespace as skippable (auto-bypass indentation)
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
        let pythonScore = 0;
        let cppScore = 0;
        let goScore = 0;

        // Go specific syntax patterns
        if (/\bpackage\s+\w+/.test(text)) goScore += 6;
        if (/\bfunc\s+(\([^)]+\)\s+)?\w+\s*\(/.test(text)) goScore += 5;
        if (/\bfmt\.(Print|Println|Printf|Sprintf|Errorf)/.test(text)) goScore += 4;
        if (/:=/.test(text)) goScore += 3;
        if (/\bimport\s*\([\s\S]*?\)/.test(text)) goScore += 4;
        if (/\bchan\b|\bgo\s+\w+\(/.test(text)) goScore += 3;
        if (/\btype\s+\w+\s+struct\b/.test(text)) goScore += 4;
        if (/\bmake\s*\(/.test(text)) goScore += 2;

        // C++ specific syntax patterns
        if (/#include\s*<[\w.]+>/.test(text)) cppScore += 6;
        if (/\bstd::/.test(text)) cppScore += 5;
        if (/\b(cout|cin)\s*(<<|>>)/.test(text)) cppScore += 4;
        if (/\bvector\s*<|\bunordered_map\s*<|\bqueue\s*<|\bstack\s*</.test(text)) cppScore += 4;
        if (/\bclass\s+Solution\b/.test(text)) cppScore += 3;
        if (/\bnullptr\b/.test(text)) cppScore += 3;
        if (/\btemplate\s*</.test(text)) cppScore += 3;

        // Python specific syntax patterns
        if (/\bdef\s+\w+\s*\(/.test(text)) pythonScore += 6;
        if (/\belif\b/.test(text)) pythonScore += 5;
        if (/\bself\.\w+/.test(text)) pythonScore += 4;
        if (/("""[\s\S]*?"""|'''[\s\S]*?''')/.test(text)) pythonScore += 4;
        if (/\bimport\s+\w+|\bfrom\s+\w+\s+import/.test(text)) pythonScore += 4;
        if (/\bprint\s*\(/.test(text)) pythonScore += 2;
        if (/\blambda\b|\bin\s+range\s*\(/.test(text)) pythonScore += 3;
        if (/\bif\s+__name__\s*==\s*['"]__main__['"]/.test(text)) pythonScore += 5;

        // If no distinctive patterns match, fallback to plain text
        if (goScore === 0 && cppScore === 0 && pythonScore === 0) {
            return 'plain';
        }

        if (goScore >= cppScore && goScore >= pythonScore) return 'go';
        if (cppScore >= pythonScore) return 'cpp';
        return 'python';
    }
    
    buildSyntaxMap(text, language) {
        const syntaxMap = new Array(text.length).fill(null);
        if (typeof Prism === 'undefined' || !Prism.languages) {
            return syntaxMap;
        }
        
        const grammar = Prism.languages[language] || Prism.languages.plain;
        if (!grammar) {
            return syntaxMap;
        }

        try {
            const tokens = Prism.tokenize(text, grammar);
            let offset = 0;

            const walk = (tokenList, parentType = null) => {
                for (const token of tokenList) {
                    if (typeof token === 'string') {
                        if (parentType) {
                            for (let j = 0; j < token.length; j++) {
                                if (offset + j < text.length) {
                                    syntaxMap[offset + j] = parentType;
                                }
                            }
                        }
                        offset += token.length;
                    } else if (token && typeof token === 'object') {
                        const tokenType = token.type || parentType;
                        if (typeof token.content === 'string') {
                            for (let j = 0; j < token.content.length; j++) {
                                if (offset + j < text.length) {
                                    syntaxMap[offset + j] = tokenType;
                                }
                            }
                            offset += token.content.length;
                        } else if (Array.isArray(token.content)) {
                            walk(token.content, tokenType);
                        } else if (token.content && typeof token.content === 'object') {
                            walk([token.content], tokenType);
                        } else {
                            const str = String(token.content || '');
                            for (let j = 0; j < str.length; j++) {
                                if (offset + j < text.length) {
                                    syntaxMap[offset + j] = tokenType;
                                }
                            }
                            offset += str.length;
                        }
                    }
                }
            };

            walk(tokens);
        } catch (e) {
            console.warn('Syntax highlighting mapping failed:', e);
        }

        return syntaxMap;
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
        this.skipButton.setAttribute('type', 'button');
        this.skipButton.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 8L8 14M14 8H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Skip line</span>
            <kbd class="skip-key-badge">Tab</kbd>
        `;
        this.skipButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.skipCurrentLine();
        });
        
        // Prevent button from taking focus away from editor
        this.skipButton.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
        
        document.body.appendChild(this.skipButton);
        return this.skipButton;
    }
    
    updateSkipButton() {
        if (this.currentPosition >= this.practiceText.length) {
            if (this.skipButton) {
                this.skipButton.style.display = 'none';
            }
            return;
        }

        // Check if there is remaining typable content on the current line
        let hasRemainingContent = false;
        for (let i = this.currentPosition; i < this.currentLineEndPos; i++) {
            if (!this.skipPositions.has(i)) {
                hasRemainingContent = true;
                break;
            }
        }
        
        // Show button whenever cursor is on a line with typable content
        if (hasRemainingContent) {
            if (!this.skipButton) {
                this.createSkipButton();
            }
            this.positionSkipButton();
            this.skipButton.style.display = 'inline-flex';
        } else {
            if (this.skipButton) {
                this.skipButton.style.display = 'none';
            }
        }
    }
    
    positionSkipButton() {
        if (!this.skipButton) return;
        
        const chars = this.textDisplay?.children;
        if (!chars || chars.length === 0) return;

        const targetIndex = Math.min(Math.max(0, this.currentLineEndPos - 1), chars.length - 1);
        const charElem = chars[targetIndex];
        if (charElem) {
            const rect = charElem.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            
            let leftPos = rect.right + 12;
            if (leftPos + 130 > viewportWidth) {
                leftPos = Math.max(10, viewportWidth - 140);
            }

            this.skipButton.style.position = 'fixed';
            this.skipButton.style.left = `${leftPos}px`;
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
                this.typedText += this.practiceText[i];
                skippedCount++;
                this.correctCharacters++;
            }
        }
        
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
            if (this.textDisplay) {
                this.textDisplay.focus();
            }
        }, 10);
        
        this.showNotification(`Line skipped (${skippedCount} characters)`, 'info', 1500);
        
        // Check completion
        if (this.currentPosition >= this.practiceText.length) {
            this.completeTyping();
        }
    }
    
    resetTyping() {
        this.setupTypingInterface();
        this.stopTimer();
        this.startTime = null;
        if (this.textDisplay) {
            this.textDisplay.focus();
        }
        
        // Clean up skip button
        if (this.skipButton) {
            this.skipButton.remove();
            this.skipButton = null;
        }
    }

    handleKeydown(e) {
        // Tab shortcut: skip remainder of current line
        if (e.key === 'Tab') {
            e.preventDefault();
            if (!this.startTime) {
                this.startTime = Date.now();
                this.startTimer();
            }
            this.skipCurrentLine();
            return;
        }

        // Standard typing keys
        if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
            e.preventDefault();
            
            if (!this.startTime && (e.key.length === 1 || e.key === 'Enter')) {
                this.startTime = Date.now();
                this.startTimer();
            }
            
            if (e.key === 'Backspace') {
                this.handleBackspace();
            } else if (e.key === 'Enter') {
                this.handleEnterKey();
            } else if (e.key.length === 1) {
                this.handleCharacterInput(e.key);
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
                // Check if this is leading whitespace or a comment
                if (this.leadingWhitespacePositions.has(i)) {
                    char.classList.add('leading-whitespace', 'skipped');
                } else {
                    char.classList.add('comment', 'skipped');
                }
            } else if (i < this.currentPosition) {
                // This position has been passed
                if (typedIndex < this.typedText.length) {
                    if (this.typedText[typedIndex] === this.practiceText[i]) {
                        char.classList.add('correct');
                        if (this.syntaxMap && this.syntaxMap[i]) {
                            char.classList.add(`token-${this.syntaxMap[i]}`);
                        }
                    } else {
                        char.classList.add('incorrect');
                    }
                    typedIndex++;
                } else {
                    char.classList.add('correct');
                    if (this.syntaxMap && this.syntaxMap[i]) {
                        char.classList.add(`token-${this.syntaxMap[i]}`);
                    }
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
        const wordsTyped = this.manuallyTypedCharacters / 5; // standard 5 chars per word
        const wpm = timeElapsed > 0 ? Math.round(wordsTyped / timeElapsed) : 0;
        
        // Calculate accuracy based on manually typed characters only
        const accuracy = this.manuallyTypedCharacters > 0 ? 
            Math.round((this.correctManualCharacters / this.manuallyTypedCharacters) * 100) : 100;
        
        this.wpmDisplay.textContent = wpm;
        this.accuracyDisplay.textContent = `${accuracy}%`;
    }

    startTimer() {
        this.stopTimer(); // Ensure no overlapping intervals
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
        this.stopTimer();
        this.startTime = null;
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
            // Python DSA: Two Sum (Hash Map)
            `def two_sum(nums, target):
    """
    Find indices of two numbers that add up to target.
    Time Complexity: O(n), Space Complexity: O(n)
    """
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,

            // C++ DSA: Binary Search
            `#include <vector>
using namespace std;

class Solution {
public:
    // Binary Search - Find target index in sorted array
    // Time Complexity: O(log n), Space: O(1)
    int search(vector<int>& nums, int target) {
        int left = 0;
        int right = nums.size() - 1;
        
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) {
                return mid;
            } else if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return -1;
    }
};`,

            // Go DSA: Binary Search
            `package main

// BinarySearch finds target index in sorted slice
// Time: O(log n), Space: O(1)
func BinarySearch(nums []int, target int) int {
	left, right := 0, len(nums)-1

	for left <= right {
		mid := left + (right-left)/2
		if nums[mid] == target {
			return mid
		} else if nums[mid] < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}
	return -1
}`
        ];
        
        const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
        this.practiceTextArea.value = randomText;
        
        // Auto-set language based on sample
        const detected = this.detectLanguage(randomText);
        if (this.languageSelect) {
            this.languageSelect.value = detected;
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
