(function () {
    'use strict';

    const PAGE_SIZE = 24;
    let allItems = [];
    let displayedCount = 0;
    let activeSource = '';
    let activeCategory = '';
    let isLoading = false;

    const grid = document.getElementById('trendsGrid');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const errorState = document.getElementById('errorState');
    const loadMoreWrap = document.getElementById('loadMoreWrap');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const lastUpdatedEl = document.getElementById('lastUpdated');
    const statsBar = document.getElementById('statsBar');
    const refreshBtn = document.getElementById('refreshBtn');

    const SOURCE_COLORS = {
        'Reddit': '#ff4500',
        'Hacker News': '#ff6600',
        'GitHub': '#e0e0e0',
        'Product Hunt': '#da552f'
    };

    const SOURCE_ICONS = {
        'Reddit': '🔴',
        'Hacker News': '🟠',
        'GitHub': '⚫',
        'Product Hunt': '🟤'
    };

    const CATEGORY_ICONS = {
        'Technology': '💻',
        'News': '📰',
        'Science': '🔬',
        'Gaming': '🎮',
        'Entertainment': '🎬',
        'Music': '🎵',
        'Sports': '⚽',
        'Business': '📈',
        'Trending': '🔥'
    };

    async function loadTrends(refresh = false) {
        if (isLoading) return;
        isLoading = true;

        showLoading(true);
        hideError();

        if (refresh) {
            refreshBtn.classList.add('spinning');
            try { await fetch('/api/trends/refresh', { method: 'POST' }); } catch (e) {}
        }

        const params = new URLSearchParams();
        if (activeSource) params.set('source', activeSource);
        if (activeCategory) params.set('category', activeCategory);

        try {
            const res = await fetch('/api/trends?' + params.toString());
            if (!res.ok) throw new Error('Network error');
            const data = await res.json();

            allItems = data.items || [];
            displayedCount = 0;
            grid.innerHTML = '';

            updateStats(data.sourceCounts || {});
            updateLastUpdated(data.lastUpdated);

            renderNextPage();
        } catch (e) {
            showError();
        } finally {
            isLoading = false;
            showLoading(false);
            refreshBtn.classList.remove('spinning');
        }
    }

    function renderNextPage() {
        const slice = allItems.slice(displayedCount, displayedCount + PAGE_SIZE);
        slice.forEach((item, i) => renderCard(item, displayedCount + i + 1));
        displayedCount += slice.length;

        if (displayedCount < allItems.length) {
            loadMoreWrap.style.display = 'block';
            loadMoreBtn.textContent = `Load more trends (${allItems.length - displayedCount} remaining)`;
        } else {
            loadMoreWrap.style.display = 'none';
        }

        if (allItems.length === 0) {
            grid.innerHTML = `<div class="empty-state"><p>No trends found for this filter.</p></div>`;
        }
    }

    function renderCard(item, rank) {
        const template = document.getElementById('cardTemplate');
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.trend-card');

        card.dataset.source = item.source;

        const link = card.querySelector('.card-link');
        link.href = item.url || '#';

        const imgEl = card.querySelector('.card-image');
        const placeholder = card.querySelector('.card-image-placeholder');
        const placeholderIcon = card.querySelector('.placeholder-icon');

        placeholderIcon.textContent = CATEGORY_ICONS[item.category] || '🔥';

        if (item.imageUrl && item.imageUrl.startsWith('http')) {
            imgEl.src = item.imageUrl;
            imgEl.alt = item.title;
            imgEl.onerror = () => {
                imgEl.style.display = 'none';
                placeholder.style.display = 'flex';
            };
            placeholder.style.display = 'none';
        } else {
            imgEl.style.display = 'none';
            placeholder.style.display = 'flex';
        }

        const sourceDot = card.querySelector('.source-dot');
        const sourceName = card.querySelector('.source-name');
        sourceDot.style.background = SOURCE_COLORS[item.source] || '#888';
        sourceName.textContent = item.source;

        card.querySelector('.rank-num').textContent = rank;
        card.querySelector('.card-category').textContent = item.category || 'Trending';
        card.querySelector('.card-title').textContent = item.title;
        card.querySelector('.card-desc').textContent = item.description || '';
        card.querySelector('.score-val').textContent = formatNumber(item.score);
        card.querySelector('.comments-val').textContent = formatNumber(item.commentCount);

        grid.appendChild(clone);
    }

    function updateStats(sourceCounts) {
        statsBar.innerHTML = '';
        const total = Object.values(sourceCounts).reduce((a, b) => a + b, 0);

        const totalPill = document.createElement('div');
        totalPill.className = 'stat-pill';
        totalPill.innerHTML = `<span style="font-weight:600;color:#f0f0f5">${total}</span> trends`;
        statsBar.appendChild(totalPill);

        Object.entries(sourceCounts).forEach(([source, count]) => {
            const pill = document.createElement('div');
            pill.className = 'stat-pill';
            pill.innerHTML = `
                <span class="stat-dot" style="background:${SOURCE_COLORS[source] || '#888'}"></span>
                ${source}
                <span class="stat-count">${count}</span>
            `;
            pill.addEventListener('click', () => {
                setSourceFilter(source === activeSource ? '' : source);
            });
            statsBar.appendChild(pill);
        });
    }

    function updateLastUpdated(ts) {
        if (!ts) return;
        const d = new Date(ts);
        lastUpdatedEl.textContent = 'Updated ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function formatNumber(n) {
        if (n === undefined || n === null) return '0';
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return String(n);
    }

    function showLoading(show) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
        if (show) grid.style.opacity = '0';
        else grid.style.opacity = '1';
    }

    function showError() {
        errorState.classList.remove('hidden');
        loadingOverlay.style.display = 'none';
    }

    function hideError() {
        errorState.classList.add('hidden');
    }

    function setSourceFilter(source) {
        activeSource = source;
        document.querySelectorAll('#sourceFilters .chip').forEach(c => {
            c.classList.toggle('active', (c.dataset.source || '') === source);
        });
        loadTrends();
    }

    function setCategoryFilter(category) {
        activeCategory = category;
        document.querySelectorAll('#categoryFilters .chip').forEach(c => {
            c.classList.toggle('active', (c.dataset.category || '') === category);
        });
        loadTrends();
    }

    // Wire up filter chips
    document.querySelectorAll('#sourceFilters .chip').forEach(btn => {
        btn.addEventListener('click', () => setSourceFilter(btn.dataset.source || ''));
    });

    document.querySelectorAll('#categoryFilters .chip').forEach(btn => {
        btn.addEventListener('click', () => setCategoryFilter(btn.dataset.category || ''));
    });

    loadMoreBtn.addEventListener('click', renderNextPage);

    refreshBtn.addEventListener('click', () => loadTrends(true));

    // Auto-refresh every 10 minutes
    setInterval(() => loadTrends(false), 10 * 60 * 1000);

    // Initial load
    loadTrends();

    // Expose for retry button
    window.loadTrends = loadTrends;
})();
