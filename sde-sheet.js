// SDE Sheet Page Interactive Logic
document.addEventListener('DOMContentLoaded', () => {
    if (!window.SDE_SHEET_DATA) {
        console.error('SDE_SHEET_DATA not found. Please ensure sde_sheet_data.js is loaded.');
        return;
    }

    const { patterns, problems, totalPatterns, totalProblems } = window.SDE_SHEET_DATA;

    // App State
    let currentPatternId = 1;
    let currentProblemSeq = 1;
    let currentLang = 'py'; // Python is default
    let searchQuery = '';
    let difficultyFilter = 'all';

    // Parse URL query params if user navigated with parameters (e.g. ?pattern=1&problem=2&lang=py)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('pattern')) {
        const p = parseInt(urlParams.get('pattern'), 10);
        if (p >= 1 && p <= totalPatterns) currentPatternId = p;
    }
    if (urlParams.has('problem')) {
        const q = parseInt(urlParams.get('problem'), 10);
        if (q >= 1) currentProblemSeq = q;
    }
    if (urlParams.has('lang')) {
        const l = urlParams.get('lang').toLowerCase();
        if (l === 'cpp' || l === 'py') currentLang = l;
    }

    // DOM Elements
    const patternSelect = document.getElementById('patternSelect');
    const problemSelect = document.getElementById('problemSelect');
    const langPyBtn = document.getElementById('langPyBtn');
    const langCppBtn = document.getElementById('langCppBtn');
    const loadPracticeBtn = document.getElementById('loadPracticeBtn');
    const startPracticeFooterBtn = document.getElementById('startPracticeFooterBtn');
    const patternStrip = document.getElementById('patternStrip');
    
    // Problem Showcase Elements
    const seqBadge = document.getElementById('seqBadge');
    const patternTitleTag = document.getElementById('patternTitleTag');
    const diffBadge = document.getElementById('diffBadge');
    const problemMainTitle = document.getElementById('problemMainTitle');
    const problemSummaryText = document.getElementById('problemSummaryText');
    const boundsContent = document.getElementById('boundsContent');
    const mantraCallout = document.getElementById('mantraCallout');
    const mantraText = document.getElementById('mantraText');
    const lcLink = document.getElementById('lcLink');
    const tufLink = document.getElementById('tufLink');
    const prevProbBtn = document.getElementById('prevProbBtn');
    const nextProbBtn = document.getElementById('nextProbBtn');

    // Code Preview Elements
    const codePreview = document.getElementById('codePreview');
    const editorFileName = document.getElementById('editorFileName');
    const codeStatsPill = document.getElementById('codeStatsPill');
    const copyCodeBtn = document.getElementById('copyCodeBtn');

    // Curriculum List Elements
    const curriculumPatternTitle = document.getElementById('curriculumPatternTitle');
    const curriculumPatternDesc = document.getElementById('curriculumPatternDesc');
    const searchProblemInput = document.getElementById('searchProblemInput');
    const filterPills = document.querySelectorAll('.filter-pill');
    const problemsTableBody = document.getElementById('problemsTableBody');

    // Helper: Find pattern by ID
    function getPattern(pid) {
        return patterns.find(p => p.id === pid) || patterns[0];
    }

    // Helper: Get problems for a pattern
    function getProblemsForPattern(pid) {
        return problems.filter(p => p.patternId === pid);
    }

    // Helper: Get currently active problem
    function getCurrentProblem() {
        const patternProbs = getProblemsForPattern(currentPatternId);
        const match = patternProbs.find(p => p.problemSeq === currentProblemSeq);
        return match || patternProbs[0] || problems[0];
    }

    // Populate Pattern Dropdown and Pattern Chips
    function initPatterns() {
        patternSelect.innerHTML = '';
        patternStrip.innerHTML = '';

        patterns.forEach(pat => {
            // Select option
            const opt = document.createElement('option');
            opt.value = pat.id;
            opt.textContent = `Pattern ${String(pat.id).padStart(2, '0')}: ${pat.name} (${pat.count} Problems)`;
            if (pat.id === currentPatternId) opt.selected = true;
            patternSelect.appendChild(opt);

            // Strip chip
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = `pattern-chip ${pat.id === currentPatternId ? 'active' : ''}`;
            chip.innerHTML = `<span>${String(pat.id).padStart(2, '0')}. ${pat.name}</span><span class="chip-count">${pat.count}</span>`;
            chip.addEventListener('click', () => {
                selectPattern(pat.id);
            });
            patternStrip.appendChild(chip);
        });
    }

    // Update Problem Dropdown for Active Pattern
    function updateProblemSelect() {
        problemSelect.innerHTML = '';
        const patternProbs = getProblemsForPattern(currentPatternId);

        patternProbs.forEach(prob => {
            const opt = document.createElement('option');
            opt.value = prob.problemSeq;
            opt.textContent = `Problem ${String(prob.problemSeq).padStart(2, '0')}: ${prob.canonicalName} [${prob.difficulty}]`;
            if (prob.problemSeq === currentProblemSeq) opt.selected = true;
            problemSelect.appendChild(opt);
        });
    }

    // Switch Pattern
    function selectPattern(pid) {
        currentPatternId = pid;
        patternSelect.value = pid;
        
        // Update chip active states
        document.querySelectorAll('.pattern-chip').forEach((chip, idx) => {
            if (patterns[idx] && patterns[idx].id === pid) {
                chip.classList.add('active');
                chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } else {
                chip.classList.remove('active');
            }
        });

        // Reset to first problem in this pattern
        currentProblemSeq = 1;
        updateProblemSelect();
        renderProblemView();
        renderCurriculumList();
    }

    // Switch Problem
    function selectProblem(seq) {
        currentProblemSeq = seq;
        problemSelect.value = seq;
        renderProblemView();
        renderCurriculumList();
    }

    // Switch Language
    function selectLanguage(lang) {
        currentLang = lang;
        if (lang === 'py') {
            langPyBtn.classList.add('active');
            langCppBtn.classList.remove('active');
        } else {
            langCppBtn.classList.add('active');
            langPyBtn.classList.remove('active');
        }
        renderCodePreview();
    }

    // Render Active Problem Details
    function renderProblemView() {
        const prob = getCurrentProblem();
        const pat = getPattern(currentPatternId);

        // Header badges
        seqBadge.textContent = `Problem #${String(prob.problemSeq).padStart(2, '0')} of ${pat.count}`;
        patternTitleTag.textContent = `Pattern ${String(pat.id).padStart(2, '0')}: ${pat.name}`;
        
        diffBadge.textContent = prob.difficulty;
        diffBadge.className = `diff-badge diff-${prob.difficulty.toLowerCase()}`;

        // Titles
        problemMainTitle.textContent = prob.canonicalName;
        problemSummaryText.textContent = prob.title;

        // Bounds
        if (prob.bounds) {
            boundsContent.innerHTML = `<strong>Complexity:</strong> <code>${prob.bounds}</code>`;
            boundsContent.style.display = 'flex';
        } else {
            boundsContent.style.display = 'none';
        }

        // Mantra
        if (prob.mantra && prob.mantra.trim()) {
            mantraText.textContent = prob.mantra;
            mantraCallout.style.display = 'block';
        } else {
            mantraCallout.style.display = 'none';
        }

        // External Links
        if (prob.leetcode) {
            lcLink.href = prob.leetcode;
            lcLink.style.display = 'inline-flex';
        } else {
            lcLink.style.display = 'none';
        }

        if (prob.tuf) {
            tufLink.href = prob.tuf;
            tufLink.style.display = 'inline-flex';
        } else {
            tufLink.style.display = 'none';
        }

        // Navigation state
        prevProbBtn.disabled = (prob.problemSeq <= 1);
        nextProbBtn.disabled = (prob.problemSeq >= pat.count);

        // Render code preview
        renderCodePreview();
    }

    // Render Code in the Preview IDE
    function renderCodePreview() {
        const prob = getCurrentProblem();
        const code = currentLang === 'cpp' ? prob.cpp : prob.py;
        const fileExt = currentLang === 'cpp' ? 'cpp' : 'py';
        const prismLang = currentLang === 'cpp' ? 'cpp' : 'python';

        editorFileName.textContent = `solution.${fileExt}`;
        
        // Lines and characters count
        const lines = code ? code.split('\n').length : 0;
        const chars = code ? code.length : 0;
        codeStatsPill.textContent = `${lines} lines • ${chars} chars`;

        // Highlight with Prism
        if (window.Prism && window.Prism.languages[prismLang]) {
            codePreview.innerHTML = Prism.highlight(code, Prism.languages[prismLang], prismLang);
        } else {
            codePreview.textContent = code;
        }
    }

    // Render Curriculum Problems Table
    function renderCurriculumList() {
        const pat = getPattern(currentPatternId);
        curriculumPatternTitle.textContent = `Pattern ${String(pat.id).padStart(2, '0')}: ${pat.name}`;
        curriculumPatternDesc.textContent = `Showing problems for this pattern (${pat.count} total). Click any problem to preview and practice.`;

        let listToRender = getProblemsForPattern(currentPatternId);

        // If searching across all problems or within current pattern
        if (searchQuery.trim().length > 0) {
            const q = searchQuery.toLowerCase().trim();
            // Search all problems across curriculum
            listToRender = problems.filter(p => 
                p.canonicalName.toLowerCase().includes(q) ||
                p.title.toLowerCase().includes(q) ||
                p.patternName.toLowerCase().includes(q)
            );
            curriculumPatternTitle.textContent = `Search Results (${listToRender.length} found)`;
            curriculumPatternDesc.textContent = `Query: "${searchQuery}"`;
        }

        // Filter by difficulty
        if (difficultyFilter !== 'all') {
            listToRender = listToRender.filter(p => p.difficulty.toLowerCase() === difficultyFilter);
        }

        problemsTableBody.innerHTML = '';

        if (listToRender.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5" style="text-align: center; padding: 2rem; color: var(--gray-500);">No problems match your search or filter criteria.</td>`;
            problemsTableBody.appendChild(tr);
            return;
        }

        listToRender.forEach(p => {
            const isActive = (p.patternId === currentPatternId && p.problemSeq === currentProblemSeq);
            const tr = document.createElement('tr');
            if (isActive) tr.className = 'active-row';

            tr.innerHTML = `
                <td style="font-family: var(--font-mono); font-weight: 600; width: 60px;">
                    #${String(p.problemSeq).padStart(2, '0')}
                </td>
                <td>
                    <div class="prob-title-col">
                        <span class="prob-title-main">${p.canonicalName}</span>
                        <span class="prob-pattern-sub">Pattern ${String(p.patternId).padStart(2, '0')}: ${p.patternName}</span>
                    </div>
                </td>
                <td style="width: 100px;">
                    <span class="diff-badge diff-${p.difficulty.toLowerCase()}">${p.difficulty}</span>
                </td>
                <td style="color: var(--gray-600); font-size: 0.8125rem;">
                    ${p.bounds ? `<code>${p.bounds.replace('Time Complexity:', 'T:').replace('Space Complexity:', 'S:')}</code>` : '—'}
                </td>
                <td style="text-align: right; width: 140px;">
                    <button class="btn btn-outline btn-small btn-type-row" data-pid="${p.patternId}" data-seq="${p.problemSeq}">
                        Type Now ⚡
                    </button>
                </td>
            `;

            // Click row to view problem
            tr.addEventListener('click', (e) => {
                if (e.target.closest('.btn-type-row')) {
                    // Type button clicked directly
                    const pid = parseInt(e.target.closest('.btn-type-row').dataset.pid, 10);
                    const seq = parseInt(e.target.closest('.btn-type-row').dataset.seq, 10);
                    currentPatternId = pid;
                    currentProblemSeq = seq;
                    loadActiveProblemIntoTypeMyCode();
                    return;
                }
                
                // Switch to this problem and pattern
                if (currentPatternId !== p.patternId) {
                    currentPatternId = p.patternId;
                    patternSelect.value = p.patternId;
                    document.querySelectorAll('.pattern-chip').forEach((chip, idx) => {
                        chip.classList.toggle('active', patterns[idx].id === p.patternId);
                    });
                    updateProblemSelect();
                }
                selectProblem(p.problemSeq);
                window.scrollTo({ top: 180, behavior: 'smooth' });
            });

            problemsTableBody.appendChild(tr);
        });
    }

    // Core Action: Load Active Problem into typeMyCode practice engine!
    function loadActiveProblemIntoTypeMyCode() {
        const prob = getCurrentProblem();
        const pat = getPattern(currentPatternId);
        const code = currentLang === 'cpp' ? prob.cpp : prob.py;
        const fileExt = currentLang === 'cpp' ? 'cpp' : 'py';
        const cleanTitle = prob.canonicalName.replace(/[^a-zA-Z0-9_-]/g, '_');

        const sessionPayload = {
            fromSde: true,
            patternId: prob.patternId,
            patternName: pat.name,
            problemSeq: prob.problemSeq,
            title: prob.canonicalName,
            fullTitle: prob.title,
            difficulty: prob.difficulty,
            bounds: prob.bounds,
            language: currentLang === 'cpp' ? 'cpp' : 'python',
            fileName: `P${String(prob.patternId).padStart(2, '0')}_Q${String(prob.problemSeq).padStart(2, '0')}_${cleanTitle}.${fileExt}`,
            code: code,
            timestamp: Date.now()
        };

        // Save to localStorage for instant synchronous retrieval
        try {
            localStorage.setItem('sde_active_problem', JSON.stringify(sessionPayload));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }

        // Navigate to index.html with query params
        const redirectUrl = `index.html?from=sde&p=${prob.patternId}&q=${prob.problemSeq}&lang=${currentLang}`;
        window.location.href = redirectUrl;
    }

    // Event Bindings
    patternSelect.addEventListener('change', (e) => {
        selectPattern(parseInt(e.target.value, 10));
    });

    problemSelect.addEventListener('change', (e) => {
        selectProblem(parseInt(e.target.value, 10));
    });

    langPyBtn.addEventListener('click', () => selectLanguage('py'));
    langCppBtn.addEventListener('click', () => selectLanguage('cpp'));

    loadPracticeBtn.addEventListener('click', loadActiveProblemIntoTypeMyCode);
    startPracticeFooterBtn.addEventListener('click', loadActiveProblemIntoTypeMyCode);

    prevProbBtn.addEventListener('click', () => {
        if (currentProblemSeq > 1) {
            selectProblem(currentProblemSeq - 1);
        }
    });

    nextProbBtn.addEventListener('click', () => {
        const pat = getPattern(currentPatternId);
        if (currentProblemSeq < pat.count) {
            selectProblem(currentProblemSeq + 1);
        }
    });

    // Copy Code Button
    copyCodeBtn.addEventListener('click', () => {
        const prob = getCurrentProblem();
        const code = currentLang === 'cpp' ? prob.cpp : prob.py;
        navigator.clipboard.writeText(code).then(() => {
            const originalText = copyCodeBtn.innerHTML;
            copyCodeBtn.innerHTML = '✓ Copied!';
            setTimeout(() => {
                copyCodeBtn.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Copy failed:', err);
        });
    });

    // Search and Filters
    let searchDebounceTimer;
    searchProblemInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            searchQuery = e.target.value;
            renderCurriculumList();
        }, 200);
    });

    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            difficultyFilter = pill.dataset.filter;
            renderCurriculumList();
        });
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Ignore if user is inside search input
        if (document.activeElement === searchProblemInput) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            loadActiveProblemIntoTypeMyCode();
        } else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
            if (currentProblemSeq > 1) {
                selectProblem(currentProblemSeq - 1);
            }
        } else if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
            const pat = getPattern(currentPatternId);
            if (currentProblemSeq < pat.count) {
                selectProblem(currentProblemSeq + 1);
            }
        }
    });

    // Initialize UI
    initPatterns();
    updateProblemSelect();
    selectLanguage(currentLang);
    renderProblemView();
    renderCurriculumList();
});
