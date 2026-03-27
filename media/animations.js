// ══════════════════════════════════════════════════════════════
// Shared animation helpers for rustdyno webviews
// ══════════════════════════════════════════════════════════════

const Anim = (() => {
    const EXPAND_MS  = 180;
    const SNAP_MS    = 90;

    /** Show tooltip with left-to-right expand from anchor element */
    function tooltipIn(el) {
        el.style.display = 'block';
        el.getAnimations().forEach(a => a.cancel());
        el.animate([
            { opacity: 0, transform: 'scaleX(0)',   transformOrigin: 'left top' },
            { opacity: 1, transform: 'scaleX(1)',   transformOrigin: 'left top' }
        ], { duration: EXPAND_MS, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' });
    }

    /** Hide tooltip with a fast snap-out */
    function tooltipOut(el) {
        const anim = el.animate([
            { opacity: 1, transform: 'scaleX(1)',   transformOrigin: 'left top' },
            { opacity: 0, transform: 'scaleX(0.6)', transformOrigin: 'left top' }
        ], { duration: SNAP_MS, easing: 'ease-in', fill: 'forwards' });
        anim.onfinish = () => { el.style.display = 'none'; };
    }

    // ── Native title-attribute replacement ──────────────────────
    // Intercepts all [title] elements and replaces the browser's
    // default tooltip with the same animated .btn-tooltip style.

    function initTitleTooltips() {
        const tip = document.createElement('div');
        tip.className = 'btn-tooltip';
        document.body.appendChild(tip);

        let activeEl = null;
        let hoverTimer = null;

        // Stash title into data-title so the browser doesn't show its own tooltip
        function stash(el) {
            if (el.title && !el.dataset.titleStashed) {
                el.dataset.title = el.title;
                el.dataset.titleStashed = '1';
                el.title = '';
            }
        }

        document.addEventListener('mouseover', e => {
            // Skip elements handled by the data-tip-cmd system
            const target = e.target.closest('[data-tip-cmd]');
            if (target) return;

            const el = e.target.closest('[title], [data-title]');
            if (!el) return;

            stash(el);
            const text = el.dataset.title;
            if (!text) return;

            if (activeEl === el) return;
            activeEl = el;

            const rect = el.getBoundingClientRect();
            tip.textContent = text;
            tip.style.left = rect.left + 'px';
            tip.style.top = (rect.bottom + 6) + 'px';
            tooltipIn(tip);
        });

        document.addEventListener('mouseout', e => {
            const el = e.target.closest('[data-title]');
            if (!el || el !== activeEl) return;
            activeEl = null;
            clearTimeout(hoverTimer);
            tooltipOut(tip);
        });
    }

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTitleTooltips);
    } else {
        initTitleTooltips();
    }

    return { tooltipIn, tooltipOut };
})();
