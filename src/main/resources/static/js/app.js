(function () {
    'use strict';

    // ── Config ─────────────────────────────────────────────────────
    const SLIDE_DUR  = 8000;   // ms per slide (single mode)
    const TRANS_MS   = 700;    // crossfade (must match CSS --transition)
    const QUEUE_SIZE = 6;      // thumbnails in single-mode queue
    const CELL_MIN   = 5000;   // min ms between grid cell refreshes
    const CELL_MAX   = 9000;   // max ms between grid cell refreshes

    const SOURCE_COLORS = {
        'Reddit':       '#ff4500',
        'Hacker News':  '#ff6600',
        'GitHub':       '#58a6ff',
        'Product Hunt': '#da552f'
    };

    const CAT_GRADIENTS = {
        'Technology':    'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
        'News':          'linear-gradient(135deg,#141e30,#243b55)',
        'Science':       'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
        'Gaming':        'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
        'Entertainment': 'linear-gradient(135deg,#200122,#6f0000)',
        'Music':         'linear-gradient(135deg,#16222a,#3a6073)',
        'Sports':        'linear-gradient(135deg,#1d4350,#a43931)',
        'Business':      'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
        'Trending':      'linear-gradient(135deg,#232526,#414345)'
    };

    // ── State ──────────────────────────────────────────────────────
    let items          = [];
    let currentIdx     = 0;
    let activeLayer    = 'A';
    let slideTimer     = null;
    let paused         = false;
    let layout         = 1;     // 1, 4, or 9
    let activeSource   = '';
    let activeCategory = '';
    let cellTimers     = [];    // per-cell interval refs (grid mode)
    let cellIndices    = [];    // which item each cell is currently showing

    // ── DOM refs ───────────────────────────────────────────────────
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
    const slideCategory  = $('slideCategory');
    const slideTitle     = $('slideTitle');
    const slideDesc      = $('slideDesc');
    const slideRank      = $('slideRank');
    const slideMeta1     = $('slideMeta1');
    const slideMeta2     = $('slideMeta2');
    const progressFill   = $('progressFill');
    const queue          = $('queue');
    const pauseIndicator = $('pauseIndicator');
    const navPrev        = $('navPrev');
    const navNext        = $('navNext');
    const filterToggle   = $('filterToggle');
    const filterPanel    = $('filterPanel');
    const layoutPicker   = $('layoutPicker');

    // ── Load / API ─────────────────────────────────────────────────
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
            if (!res.ok) throw new Error('bad');
            const data = await res.json();
            items = (data.items || []).filter(i => i.title);

            if (!items.length) { showError('No trends found for this filter.'); return; }

            setLoading(false);
            tv.style.display = 'flex';
            applyLayout(layout);
        } catch (e) {
            showError();
        }
    }

    function animateLoadingBar() {
        let w = 0;
        loadingBarFill.style.width = '0%';
        const iv = setInterval(() => {
            w = Math.min(w + Math.random() * 16, 88);
            loadingBarFill.style.width = w + '%';
        }, 200);
        setTimeout(() => { clearInterval(iv); loadingBarFill.style.width = '100%'; }, 1800);
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

    // ── Layout switching ───────────────────────────────────────────
    function applyLayout(n) {
        layout = n;

        // Tear down old mode
        stopSlideTimer();
        clearGridTimers();

        if (n === 1) {
            modeSingle.classList.remove('hidden');
            modeGrid.classList.add('hidden');
            currentIdx = 0;
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

    // ── SINGLE MODE ────────────────────────────────────────────────
    function showSlide(idx, animate) {
        const item = items[idx];
        if (!item) return;

        const incoming = activeLayer === 'A' ? slideB : slideA;
        const outgoing = activeLayer === 'A' ? slideA : slideB;

        setBg(incoming, item);

        if (animate) {
            slideOverlay.classList.add('out');
        }

        incoming.classList.remove('active', 'kb');
        void incoming.offsetWidth;
        incoming.classList.add('active', 'kb');
        outgoing.classList.remove('active', 'kb');

        activeLayer = activeLayer === 'A' ? 'B' : 'A';

        const delay = animate ? TRANS_MS / 2 : 0;
        setTimeout(() => {
            const color = SOURCE_COLORS[item.source] || '#fff';
            slideOverlay.href         = item.url || '#';
            slideSource.textContent   = item.source;
            slideSource.style.setProperty('--source-color', color);
            slideCategory.textContent = item.category || 'Trending';
            slideRank.textContent     = '#' + (idx + 1);
            slideTitle.textContent    = item.title;
            slideDesc.textContent     = item.description || '';
            slideMeta1.textContent    = fmt(item.score) + ' pts';
            slideMeta2.textContent    = fmt(item.commentCount) + ' comments';
            slideOverlay.classList.remove('out');
        }, delay);

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
            el.className  = 'queue-item' + (i === currentIdx ? ' active' : '');
            el.dataset.i  = i;

            const bg  = document.createElement('div');
            bg.className  = 'queue-item-bg';
            applyBgStyle(bg, item);

            const ov  = document.createElement('div');
            ov.className  = 'queue-item-overlay';
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
        const vis = idx % QUEUE_SIZE;
        queue.querySelectorAll('.queue-item').forEach((el, i) =>
            el.classList.toggle('active', i === vis));
    }

    // Pause on hover over single mode
    modeSingle.addEventListener('mouseenter', () => {
        if (!paused) {
            paused = true; stopSlideTimer();
            pauseIndicator.classList.remove('hidden');
        }
    });
    modeSingle.addEventListener('mouseleave', () => {
        if (paused) {
            paused = false;
            pauseIndicator.classList.add('hidden');
            startSlideTimer();
        }
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

    // ── GRID MODE ──────────────────────────────────────────────────
    function buildGrid(n) {
        clearGridTimers();
        gridCells.innerHTML = '';
        gridCells.className = `grid-cells layout-${n}`;

        cellIndices = [];

        // Assign each cell a different starting item, shuffled
        const pool = shuffled(items.map((_, i) => i));

        for (let c = 0; c < n; c++) {
            const itemIdx = pool[c % pool.length];
            cellIndices.push(itemIdx);

            const cell = buildCell(c, itemIdx);
            gridCells.appendChild(cell);

            // Stagger each cell's refresh timer
            const delay = c * (CELL_MIN / n);
            const t = setTimeout(() => scheduleCell(c), delay);
            cellTimers.push(t);
        }
    }

    function buildCell(cellIdx, itemIdx) {
        const item = items[itemIdx];
        const cell = document.createElement('div');
        cell.className   = 'grid-cell';
        cell.dataset.cell = cellIdx;

        // Two background layers for crossfade
        const bgA = document.createElement('div');
        bgA.className = 'cell-bg active kb';
        bgA.dataset.layer = 'A';
        applyBgStyle(bgA, item);

        const bgB = document.createElement('div');
        bgB.className = 'cell-bg';
        bgB.dataset.layer = 'B';

        const rank = document.createElement('div');
        rank.className = 'cell-rank';
        rank.textContent = '#' + (itemIdx + 1);

        const hint = document.createElement('div');
        hint.className   = 'cell-open-hint';
        hint.textContent = 'Open ↗';

        const content = document.createElement('a');
        content.className  = 'cell-content';
        content.href       = item.url || '#';
        content.target     = '_blank';
        content.rel        = 'noopener noreferrer';

        const sourceBadge = document.createElement('div');
        sourceBadge.className = 'cell-source-badge';
        const dot = document.createElement('span');
        dot.className = 'cell-source-dot';
        dot.style.setProperty('--source-color', SOURCE_COLORS[item.source] || '#fff');
        sourceBadge.appendChild(dot);
        sourceBadge.appendChild(document.createTextNode(item.source));

        const title = document.createElement('div');
        title.className = 'cell-title';
        title.textContent = item.title;

        const meta = document.createElement('div');
        meta.className = 'cell-meta';
        meta.textContent = fmt(item.score) + ' pts · ' + fmt(item.commentCount) + ' comments';

        content.appendChild(sourceBadge);
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
        if (!items.length) return;

        // Pick a new item not currently shown in any cell
        const inUse = new Set(cellIndices);
        let candidates = items.map((_, i) => i).filter(i => !inUse.has(i));
        if (!candidates.length) candidates = items.map((_, i) => i);

        const newIdx  = candidates[Math.floor(Math.random() * candidates.length)];
        cellIndices[cellIdx] = newIdx;

        const item = items[newIdx];
        const cellEl = gridCells.querySelector(`[data-cell="${cellIdx}"]`);
        if (!cellEl) return;

        // Find active/inactive layers
        const bgA = cellEl.querySelector('[data-layer="A"]');
        const bgB = cellEl.querySelector('[data-layer="B"]');
        const activeLayerEl   = bgA.classList.contains('active') ? bgA : bgB;
        const inactiveLayerEl = bgA.classList.contains('active') ? bgB : bgA;

        // Load new image on inactive layer then crossfade
        applyBgStyle(inactiveLayerEl, item);
        inactiveLayerEl.classList.remove('kb');
        void inactiveLayerEl.offsetWidth;

        setTimeout(() => {
            inactiveLayerEl.classList.add('active', 'kb');
            activeLayerEl.classList.remove('active', 'kb');

            // Update text content
            const content = cellEl.querySelector('.cell-content');
            content.href  = item.url || '#';

            const dot = cellEl.querySelector('.cell-source-dot');
            dot.style.setProperty('--source-color', SOURCE_COLORS[item.source] || '#fff');

            cellEl.querySelector('.cell-source-badge').childNodes[1].textContent = item.source;
            cellEl.querySelector('.cell-title').textContent = item.title;
            cellEl.querySelector('.cell-meta').textContent =
                fmt(item.score) + ' pts · ' + fmt(item.commentCount) + ' comments';
            cellEl.querySelector('.cell-rank').textContent = '#' + (newIdx + 1);

            // Flash ring
            cellEl.classList.add('refreshing');
            setTimeout(() => cellEl.classList.remove('refreshing'), 800);
        }, 50);
    }

    function scheduleCell(cellIdx) {
        const delay = CELL_MIN + Math.random() * (CELL_MAX - CELL_MIN);
        const t = setTimeout(() => {
            refreshCell(cellIdx);
            scheduleCell(cellIdx); // reschedule
        }, delay);
        cellTimers.push(t);
    }

    function clearGridTimers() {
        cellTimers.forEach(clearTimeout);
        cellTimers = [];
    }

    // ── Background helpers ─────────────────────────────────────────
    function setBg(el, item) {
        applyBgStyle(el, item);
    }

    function applyBgStyle(el, item) {
        if (item.imageUrl && item.imageUrl.startsWith('http')) {
            el.style.backgroundImage = `url("${item.imageUrl}")`;
            el.style.backgroundSize  = 'cover';
            el.style.background      = '';
        } else {
            el.style.background      = CAT_GRADIENTS[item.category] || CAT_GRADIENTS['Trending'];
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

    document.querySelectorAll('#sourceFilters .chip').forEach(btn => {
        btn.addEventListener('click', () => {
            activeSource = btn.dataset.source || '';
            document.querySelectorAll('#sourceFilters .chip').forEach(c =>
                c.classList.toggle('active', (c.dataset.source || '') === activeSource));
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

    // ── Layout picker ──────────────────────────────────────────────
    layoutPicker.querySelectorAll('.layout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const n = parseInt(btn.dataset.layout, 10);
            layoutPicker.querySelectorAll('.layout-btn').forEach(b =>
                b.classList.toggle('active', b === btn));
            applyLayout(n);
        });
    });

    // ── Utilities ──────────────────────────────────────────────────
    function fmt(n) {
        if (!n) return '0';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return String(n);
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

    // ── Public API ─────────────────────────────────────────────────
    window.tv = { load };

    load(false);

})();
