(function () {
    'use strict';

    // ── Config ─────────────────────────────────────────────────────
    const SLIDE_DUR = 8000;
    const TRANS_MS  = 700;
    const QUEUE_SIZE = 6;
    const CELL_MIN  = 5000;
    const CELL_MAX  = 9000;

    // Brand colours for each outlet
    const SOURCE_COLORS = {
        'ABC News':              '#00833e',
        'Sydney Morning Herald': '#003087',
        'The Age':               '#003087',
        'The Guardian AU':       '#052962',
        'Sky News Australia':    '#e31e24',
        'news.com.au':           '#d0021b',
        'Herald Sun':            '#d0021b',
        'The Australian':        '#1a1a1a',
        'BBC News':              '#bb1919',
        'The Guardian':          '#052962',
        'The Independent':       '#e9423a',
        'The Telegraph':         '#1a305f',
        'Reuters':               '#ff8000',
        'AP News':               '#cc2929',
        'Google News':           '#4285f4',
        'CNN':                   '#cc0000',
        'NPR':                   '#4a76a8',
        'NY Times':              '#1a1a1a',
        'Al Jazeera':            '#d4a437',
    };

    const REGION_COLORS = {
        'Australia': '#00843d',
        'UK':        '#012169',
        'USA':       '#b22234',
        'Global':    '#4285f4',
    };

    const CAT_GRADIENTS = {
        'Australia':     'linear-gradient(135deg,#005c2e,#003087)',
        'World':         'linear-gradient(135deg,#141e30,#243b55)',
        'Politics':      'linear-gradient(135deg,#1a1a2e,#2c2c54)',
        'Business':      'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
        'Technology':    'linear-gradient(135deg,#0f0c29,#302b63)',
        'Science':       'linear-gradient(135deg,#0f2027,#2c5364)',
        'Sports':        'linear-gradient(135deg,#1d4350,#a43931)',
        'Entertainment': 'linear-gradient(135deg,#200122,#6f0000)',
        'News':          'linear-gradient(135deg,#232526,#414345)',
        'default':       'linear-gradient(135deg,#1a1a2e,#16213e)',
    };

    // ── State ──────────────────────────────────────────────────────
    let items          = [];
    let currentIdx     = 0;
    let activeLayer    = 'A';
    let slideTimer     = null;
    let paused         = false;
    let layout         = 1;
    let activeSource   = '';
    let activeCategory = '';
    let activeRegion   = '';
    let cellTimers     = [];
    let cellIndices    = [];

    // ── DOM ────────────────────────────────────────────────────────
    const $ = id => document.getElementById(id);
    const loadingScreen  = $('loadingScreen');
    const loadingBarFill = $('loadingBarFill');
    const errorScreen    = $('errorScreen');
    const tv             = $('tv');
    const modeSingle     = $('modeSingle');
    const modeGrid       = $('modeGrid');
    const gridCells      = $('gridCells');
    const slideA         = $('slideA');
    const slideB         = $('slideB');
    const slideOverlay   = $('slideOverlay');
    const slideSource    = $('slideSource');
    const slideRegion    = $('slideRegion');
    const slideCategory  = $('slideCategory');
    const slideTitle     = $('slideTitle');
    const slideDesc      = $('slideDesc');
    const slideRank      = $('slideRank');
    const slideAge       = $('slideAge');
    const progressFill   = $('progressFill');
    const queue          = $('queue');
    const pauseIndicator = $('pauseIndicator');
    const navPrev        = $('navPrev');
    const navNext        = $('navNext');
    const filterToggle   = $('filterToggle');
    const filterPanel    = $('filterPanel');
    const layoutPicker   = $('layoutPicker');

    // ── Load ───────────────────────────────────────────────────────
    async function load(forceRefresh = false) {
        setLoading(true);
        if (forceRefresh) {
            try { await fetch('/api/trends/refresh', { method: 'POST' }); } catch (_) {}
        }
        animateLoadingBar();

        const params = new URLSearchParams();
        if (activeSource)   params.set('source', activeSource);
        if (activeCategory) params.set('category', activeCategory);

        try {
            const res = await fetch('/api/trends?' + params.toString());
            if (!res.ok) throw new Error();
            const data = await res.json();

            let loaded = (data.items || []).filter(i => i.title);

            // Client-side region filter (region stored in sourceIcon field)
            if (activeRegion) {
                loaded = loaded.filter(i => i.sourceIcon === activeRegion);
            }

            items = loaded;
            if (!items.length) { showError('No stories found for this filter.'); return; }

            buildSourceChips(data.sourceCounts || {});
            setLoading(false);
            tv.style.display = 'flex';
            applyLayout(layout);
        } catch (e) {
            showError();
        }
    }

    function buildSourceChips(counts) {
        const container = $('sourceFilters');
        // Keep only the "All sources" chip, then rebuild the rest
        const allChip = container.querySelector('[data-source=""]');
        container.innerHTML = '';
        container.appendChild(allChip);

        // Sort sources by article count descending
        const sorted = Object.entries(counts)
            .sort((a, b) => b[1] - a[1]);

        sorted.forEach(([source, count]) => {
            const btn = document.createElement('button');
            btn.className = 'chip' + (source === activeSource ? ' active' : '');
            btn.dataset.source = source;
            const dot = document.createElement('span');
            dot.className = 'chip-dot';
            dot.style.background = SOURCE_COLORS[source] || '#888';
            btn.appendChild(dot);
            btn.appendChild(document.createTextNode(source + ' (' + count + ')'));
            btn.addEventListener('click', () => {
                activeSource = btn.dataset.source;
                container.querySelectorAll('.chip').forEach(c =>
                    c.classList.toggle('active', c.dataset.source === activeSource));
                filterPanel.classList.add('hidden');
                load(false);
            });
            container.appendChild(btn);
        });
    }

    function animateLoadingBar() {
        let w = 0;
        loadingBarFill.style.width = '0%';
        const iv = setInterval(() => {
            w = Math.min(w + Math.random() * 14, 88);
            loadingBarFill.style.width = w + '%';
        }, 220);
        setTimeout(() => { clearInterval(iv); loadingBarFill.style.width = '100%'; }, 2000);
    }

    function setLoading(show) {
        loadingScreen.style.display = show ? 'flex' : 'none';
        errorScreen.classList.add('hidden');
    }

    function showError(msg) {
        loadingScreen.style.display = 'none';
        errorScreen.classList.remove('hidden');
        tv.style.display = 'none';
        if (msg) errorScreen.querySelector('p').textContent = msg;
    }

    // ── Layout ─────────────────────────────────────────────────────
    function applyLayout(n) {
        layout = n;
        stopSlideTimer();
        clearGridTimers();

        if (n === 1) {
            modeSingle.classList.remove('hidden');
            modeGrid.classList.add('hidden');
            currentIdx  = Math.floor(Math.random() * Math.min(items.length, 10));
            activeLayer = 'A';
            showSlide(currentIdx, false);
            buildQueue();
            startSlideTimer();
        } else {
            modeSingle.classList.add('hidden');
            modeGrid.classList.remove('hidden');
            buildGrid(n);
        }
    }

    // ── Single mode ────────────────────────────────────────────────
    function showSlide(idx, animate) {
        const item = items[idx];
        if (!item) return;

        const incoming = activeLayer === 'A' ? slideB : slideA;
        const outgoing = activeLayer === 'A' ? slideA : slideB;

        applyBgStyle(incoming, item);

        if (animate) slideOverlay.classList.add('out');

        incoming.classList.remove('active', 'kb');
        void incoming.offsetWidth;
        incoming.classList.add('active', 'kb');
        outgoing.classList.remove('active', 'kb');

        activeLayer = activeLayer === 'A' ? 'B' : 'A';

        setTimeout(() => {
            const color = SOURCE_COLORS[item.source] || '#ccc';
            slideOverlay.href = item.url || '#';

            slideSource.textContent = item.source;
            slideSource.style.setProperty('--source-color', color);

            slideRegion.textContent   = item.sourceIcon || '';  // sourceIcon holds region
            slideCategory.textContent = item.category   || '';

            slideRank.textContent  = '#' + (idx + 1) + ' · ' + relativeTime(item.publishedAt);
            slideTitle.textContent = item.title;
            slideDesc.textContent  = item.description || '';
            slideAge.textContent   = '';

            slideOverlay.classList.remove('out');
        }, animate ? TRANS_MS / 2 : 0);

        updateQueueHighlight(idx);
    }

    function advance(dir) {
        currentIdx = (currentIdx + dir + items.length) % items.length;
        showSlide(currentIdx, true);
        startSlideTimer();
    }

    function startSlideTimer() {
        stopSlideTimer();
        if (paused) return;
        progressFill.style.transition = 'none';
        progressFill.style.width = '0%';
        void progressFill.offsetWidth;
        progressFill.style.transition = `width ${SLIDE_DUR}ms linear`;
        progressFill.style.width = '100%';
        slideTimer = setTimeout(() => advance(1), SLIDE_DUR);
    }

    function stopSlideTimer() {
        clearTimeout(slideTimer);
        slideTimer = null;
        progressFill.style.transition = 'none';
    }

    function buildQueue() {
        queue.innerHTML = '';
        const count = Math.min(QUEUE_SIZE, items.length);
        for (let i = 0; i < count; i++) {
            const item = items[i];
            const el   = document.createElement('div');
            el.className = 'queue-item' + (i === currentIdx ? ' active' : '');
            el.dataset.i = i;

            const bg = document.createElement('div');
            bg.className = 'queue-item-bg';
            applyBgStyle(bg, item);

            const ov  = document.createElement('div');
            ov.className = 'queue-item-overlay';
            const dot = document.createElement('div');
            dot.className = 'queue-item-dot';
            dot.style.setProperty('--source-color', SOURCE_COLORS[item.source] || '#fff');
            ov.appendChild(dot);

            el.appendChild(bg);
            el.appendChild(ov);
            el.addEventListener('click', () => {
                currentIdx = i;
                showSlide(currentIdx, true);
                startSlideTimer();
            });
            queue.appendChild(el);
        }
    }

    function updateQueueHighlight(idx) {
        queue.querySelectorAll('.queue-item').forEach((el, i) =>
            el.classList.toggle('active', i === idx % QUEUE_SIZE));
    }

    modeSingle.addEventListener('mouseenter', () => {
        if (!paused) { paused = true; stopSlideTimer(); pauseIndicator.classList.remove('hidden'); }
    });
    modeSingle.addEventListener('mouseleave', () => {
        if (paused) { paused = false; pauseIndicator.classList.add('hidden'); startSlideTimer(); }
    });

    navPrev.addEventListener('click', e => { e.stopPropagation(); advance(-1); });
    navNext.addEventListener('click', e => { e.stopPropagation(); advance(1); });

    document.addEventListener('keydown', e => {
        if (layout !== 1) return;
        if (e.key === 'ArrowLeft')  advance(-1);
        if (e.key === 'ArrowRight') advance(1);
        if (e.key === ' ') {
            e.preventDefault();
            paused = !paused;
            if (paused) { stopSlideTimer(); pauseIndicator.classList.remove('hidden'); }
            else        { pauseIndicator.classList.add('hidden'); startSlideTimer(); }
        }
    });

    // ── Grid mode ──────────────────────────────────────────────────
    function buildGrid(n) {
        clearGridTimers();
        gridCells.innerHTML = '';
        gridCells.className = `grid-cells layout-${n}`;
        cellIndices = [];

        const pool = shuffled(items.map((_, i) => i));
        for (let c = 0; c < n; c++) {
            const idx  = pool[c % pool.length];
            cellIndices.push(idx);
            gridCells.appendChild(buildCell(c, idx));
            const delay = c * Math.floor(CELL_MIN / n);
            cellTimers.push(setTimeout(() => scheduleCell(c), delay));
        }
    }

    function buildCell(cellIdx, itemIdx) {
        const item = items[itemIdx];
        const cell = document.createElement('div');
        cell.className    = 'grid-cell';
        cell.dataset.cell = cellIdx;

        const bgA = document.createElement('div');
        bgA.className    = 'cell-bg active kb';
        bgA.dataset.layer = 'A';
        applyBgStyle(bgA, item);

        const bgB = document.createElement('div');
        bgB.className    = 'cell-bg';
        bgB.dataset.layer = 'B';

        const rank       = document.createElement('div');
        rank.className   = 'cell-rank';
        rank.textContent = '#' + (itemIdx + 1) + ' · ' + relativeTime(item.publishedAt);

        const hint       = document.createElement('div');
        hint.className   = 'cell-open-hint';
        hint.textContent = 'Open ↗';

        const content    = document.createElement('a');
        content.className = 'cell-content';
        content.href      = item.url || '#';
        content.target    = '_blank';
        content.rel       = 'noopener noreferrer';

        const badge  = document.createElement('div');
        badge.className = 'cell-source-badge';
        const dot    = document.createElement('span');
        dot.className = 'cell-source-dot';
        dot.style.setProperty('--source-color', SOURCE_COLORS[item.source] || '#fff');
        badge.appendChild(dot);
        badge.appendChild(document.createTextNode(item.source));

        const title      = document.createElement('div');
        title.className  = 'cell-title';
        title.textContent = item.title;

        const meta       = document.createElement('div');
        meta.className   = 'cell-meta';
        meta.textContent = relativeTime(item.fetchedAt);

        content.appendChild(badge);
        content.appendChild(title);
        content.appendChild(meta);
        cell.appendChild(bgA);
        cell.appendChild(bgB);
        cell.appendChild(rank);
        cell.appendChild(hint);
        cell.appendChild(content);
        return cell;
    }

    function refreshCell(cellIdx) {
        const inUse      = new Set(cellIndices);
        let candidates   = items.map((_, i) => i).filter(i => !inUse.has(i));
        if (!candidates.length) candidates = items.map((_, i) => i);

        const newIdx     = candidates[Math.floor(Math.random() * candidates.length)];
        cellIndices[cellIdx] = newIdx;

        const item    = items[newIdx];
        const cellEl  = gridCells.querySelector(`[data-cell="${cellIdx}"]`);
        if (!cellEl) return;

        const bgA = cellEl.querySelector('[data-layer="A"]');
        const bgB = cellEl.querySelector('[data-layer="B"]');
        const outgoing = bgA.classList.contains('active') ? bgA : bgB;
        const incoming = bgA.classList.contains('active') ? bgB : bgA;

        applyBgStyle(incoming, item);
        incoming.classList.remove('kb');
        void incoming.offsetWidth;

        setTimeout(() => {
            incoming.classList.add('active', 'kb');
            outgoing.classList.remove('active', 'kb');

            const content = cellEl.querySelector('.cell-content');
            content.href  = item.url || '#';

            const dot = cellEl.querySelector('.cell-source-dot');
            dot.style.setProperty('--source-color', SOURCE_COLORS[item.source] || '#fff');
            cellEl.querySelector('.cell-source-badge').lastChild.textContent = item.source;
            cellEl.querySelector('.cell-title').textContent = item.title;
            cellEl.querySelector('.cell-meta').textContent  = relativeTime(item.fetchedAt);
            cellEl.querySelector('.cell-rank').textContent  = '#' + (newIdx + 1) + ' · ' + relativeTime(item.publishedAt);

            cellEl.classList.add('refreshing');
            setTimeout(() => cellEl.classList.remove('refreshing'), 800);
        }, 50);
    }

    function scheduleCell(cellIdx) {
        const delay = CELL_MIN + Math.random() * (CELL_MAX - CELL_MIN);
        cellTimers.push(setTimeout(() => {
            refreshCell(cellIdx);
            scheduleCell(cellIdx);
        }, delay));
    }

    function clearGridTimers() {
        cellTimers.forEach(clearTimeout);
        cellTimers = [];
    }

    // ── Background helpers ─────────────────────────────────────────
    function applyBgStyle(el, item) {
        if (item.imageUrl && item.imageUrl.startsWith('http')) {
            el.style.backgroundImage = `url("${item.imageUrl}")`;
            el.style.backgroundSize  = 'cover';
            el.style.background      = '';
        } else {
            el.style.background      = CAT_GRADIENTS[item.category] || CAT_GRADIENTS['default'];
            el.style.backgroundImage = '';
        }
    }

    // ── Filters ────────────────────────────────────────────────────
    filterToggle.addEventListener('click', e => {
        e.stopPropagation();
        filterPanel.classList.toggle('hidden');
    });

    document.addEventListener('click', e => {
        if (!filterPanel.contains(e.target) && e.target !== filterToggle) {
            filterPanel.classList.add('hidden');
        }
    });

    document.querySelectorAll('#regionFilters .chip').forEach(btn => {
        btn.addEventListener('click', () => {
            activeRegion = btn.dataset.region || '';
            document.querySelectorAll('#regionFilters .chip').forEach(c =>
                c.classList.toggle('active', (c.dataset.region || '') === activeRegion));
            filterPanel.classList.add('hidden');
            load(false);
        });
    });

    document.querySelectorAll('#categoryFilters .chip').forEach(btn => {
        btn.addEventListener('click', () => {
            activeCategory = btn.dataset.category || '';
            document.querySelectorAll('#categoryFilters .chip').forEach(c =>
                c.classList.toggle('active', (c.dataset.category || '') === activeCategory));
            filterPanel.classList.add('hidden');
            load(false);
        });
    });

    layoutPicker.querySelectorAll('.layout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const n = parseInt(btn.dataset.layout, 10);
            layoutPicker.querySelectorAll('.layout-btn').forEach(b =>
                b.classList.toggle('active', b === btn));
            applyLayout(n);
        });
    });

    // ── Utilities ──────────────────────────────────────────────────
    function relativeTime(ts) {
        if (!ts) return '';
        const diffMs = Date.now() - new Date(ts).getTime();
        const mins   = Math.floor(diffMs / 60000);
        if (mins < 1)  return 'Just now';
        if (mins < 60) return mins + 'm ago';
        const hrs = Math.floor(mins / 60);
        if (hrs < 24)  return hrs + 'h ago';
        return Math.floor(hrs / 24) + 'd ago';
    }

    function shuffled(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // ── Auto-refresh every 10 min ──────────────────────────────────
    setInterval(() => load(false), 10 * 60 * 1000);

    window.tv = { load };
    load(false);

})();
