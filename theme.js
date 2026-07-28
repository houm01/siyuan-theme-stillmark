(() => {
    "use strict";

    const GLOBAL_KEY = "__stillmarkLinkFavicons";
    const STYLE_ID = "stillmark-link-favicon-rules";
    const LINK_SELECTOR = [
        ".b3-typography a[href]",
        ".b3-typography span[data-type~='a'][data-href]",
        ".protyle-wysiwyg a[href]",
        ".protyle-wysiwyg span[data-type~='a'][data-href]",
    ].join(",");

    window[GLOBAL_KEY]?.destroy?.();

    const state = {
        disposed: false,
        entries: new Map(),
        faviconByOrigin: new Map(),
        observer: null,
        pendingImages: new Set(),
        raf: 0,
        ruleSignature: "",
        style: null,
    };

    const normalizeUrl = (rawValue) => {
        const value = rawValue.trim();
        if (!value) {
            return null;
        }

        try {
            const url = value.startsWith("//")
                ? new URL(`https:${value}`)
                : new URL(value);
            return url.protocol === "http:" || url.protocol === "https:" ? url : null;
        } catch {
            return null;
        }
    };

    const getEntry = (element) => {
        const attribute = element.matches("a[href]") ? "href" : "data-href";
        const value = element.getAttribute(attribute) || "";
        const url = normalizeUrl(value);
        if (!url) {
            return null;
        }

        const escapedValue = CSS.escape(value);
        const selector = attribute === "href"
            ? `:is(.b3-typography, .protyle-wysiwyg) a[href="${escapedValue}"]`
            : `:is(.b3-typography, .protyle-wysiwyg) span[data-type~="a"][data-href="${escapedValue}"]`;

        return {
            faviconUrl: `${url.origin}/favicon.ico`,
            key: `${attribute}\u0000${value}`,
            origin: url.origin,
            selector,
        };
    };

    const renderRules = () => {
        if (state.disposed) {
            return;
        }

        const selectorsByFavicon = new Map();
        state.entries.forEach((entry) => {
            const favicon = state.faviconByOrigin.get(entry.origin);
            if (!favicon || favicon.status !== "loaded") {
                return;
            }

            const selectors = selectorsByFavicon.get(favicon.url) || [];
            selectors.push(entry.selector);
            selectorsByFavicon.set(favicon.url, selectors);
        });

        const rules = Array.from(selectorsByFavicon.entries())
            .sort(([firstUrl], [secondUrl]) => firstUrl.localeCompare(secondUrl))
            .map(([faviconUrl, selectors]) => {
                const uniqueSelectors = Array.from(new Set(selectors)).sort();
                return `${uniqueSelectors.join(",\n")} {\n    --stillmark-link-favicon: url(${JSON.stringify(faviconUrl)});\n}`;
            })
            .join("\n");

        if (rules === state.ruleSignature) {
            return;
        }

        state.ruleSignature = rules;
        if (!rules) {
            state.style?.remove();
            state.style = null;
            return;
        }

        if (!state.style) {
            state.style = document.createElement("style");
            state.style.id = STYLE_ID;
            document.head.appendChild(state.style);
        }
        state.style.textContent = rules;
    };

    const loadFavicon = (entry) => {
        if (state.faviconByOrigin.has(entry.origin)) {
            return;
        }

        state.faviconByOrigin.set(entry.origin, {status: "loading", url: entry.faviconUrl});
        const image = new Image();
        const pending = {image, timer: 0};
        state.pendingImages.add(pending);

        const finish = (status) => {
            if (!state.pendingImages.delete(pending)) {
                return;
            }
            window.clearTimeout(pending.timer);
            image.onload = null;
            image.onerror = null;
            state.faviconByOrigin.set(entry.origin, {status, url: entry.faviconUrl});
            renderRules();
        };

        image.decoding = "async";
        image.referrerPolicy = "no-referrer";
        image.onload = () => finish(image.naturalWidth > 0 ? "loaded" : "failed");
        image.onerror = () => finish("failed");
        pending.timer = window.setTimeout(() => finish("failed"), 5000);
        image.src = entry.faviconUrl;
    };

    const scanLinks = () => {
        state.raf = 0;
        if (state.disposed) {
            return;
        }

        const entries = new Map();
        document.querySelectorAll(LINK_SELECTOR).forEach((element) => {
            const entry = getEntry(element);
            if (entry) {
                entries.set(entry.key, entry);
            }
        });

        state.entries = entries;
        entries.forEach(loadFavicon);
        renderRules();
    };

    const scheduleScan = () => {
        if (!state.disposed && !state.raf) {
            state.raf = window.requestAnimationFrame(scanLinks);
        }
    };

    const containsLink = (node) => node.nodeType === Node.ELEMENT_NODE
        && (node.matches(LINK_SELECTOR) || node.querySelector(LINK_SELECTOR));

    const mutationTouchesLinks = (mutation) => {
        if (mutation.type === "attributes") {
            return mutation.target.matches(LINK_SELECTOR);
        }

        return [...mutation.addedNodes, ...mutation.removedNodes].some(containsLink);
    };

    const init = () => {
        if (state.disposed || state.observer || !document.body) {
            return;
        }

        state.observer = new MutationObserver((mutations) => {
            if (mutations.some(mutationTouchesLinks)) {
                scheduleScan();
            }
        });
        state.observer.observe(document.body, {
            attributeFilter: ["data-href", "href"],
            attributes: true,
            childList: true,
            subtree: true,
        });
        scheduleScan();
    };

    const destroy = () => {
        if (state.disposed) {
            return;
        }

        state.disposed = true;
        document.removeEventListener("DOMContentLoaded", init);
        state.observer?.disconnect();
        if (state.raf) {
            window.cancelAnimationFrame(state.raf);
        }
        state.pendingImages.forEach(({image, timer}) => {
            window.clearTimeout(timer);
            image.onload = null;
            image.onerror = null;
            image.src = "";
        });
        state.pendingImages.clear();
        state.style?.remove();
        if (window[GLOBAL_KEY]?.destroy === destroy) {
            delete window[GLOBAL_KEY];
        }
        if (window.destroyTheme === destroy) {
            window.destroyTheme = undefined;
        }
    };

    window[GLOBAL_KEY] = {destroy};
    window.destroyTheme = destroy;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, {once: true});
    } else {
        init();
    }
})();
