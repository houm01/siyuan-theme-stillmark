(() => {
    "use strict";

    const GLOBAL_KEY = "__stillmarkThemeEnhancements";
    const LEGACY_GLOBAL_KEY = "__stillmarkLinkFavicons";
    const STYLE_ID = "stillmark-link-favicon-rules";
    const LINK_SELECTOR = [
        ".b3-typography a[href]",
        ".b3-typography span[data-type~='a'][data-href]",
        ".protyle-wysiwyg a[href]",
        ".protyle-wysiwyg span[data-type~='a'][data-href]",
    ].join(",");
    const BOOKMARK_SELECTOR = ".sy__bookmark li[data-treetype='bookmark'][data-node-id]";
    const BOOKMARK_DUPLICATE_CLASS = "stillmark-bookmark--duplicate";

    window[GLOBAL_KEY]?.destroy?.();
    window[LEGACY_GLOBAL_KEY]?.destroy?.();

    const state = {
        bookmarkAbortController: new AbortController(),
        bookmarkCache: new Map(),
        bookmarkPending: new Map(),
        bookmarkRaf: 0,
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

    const postJson = async (path, payload) => {
        const response = await fetch(path, {
            body: JSON.stringify(payload),
            credentials: "same-origin",
            headers: {"Content-Type": "application/json"},
            method: "POST",
            signal: state.bookmarkAbortController.signal,
        });
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const result = await response.json();
        if (result.code !== 0) {
            throw new Error(result.msg || "Request failed");
        }
        return result.data;
    };

    const getNotebookName = (notebookId) => window.siyuan?.notebooks
        ?.find((notebook) => notebook.id === notebookId)?.name || "";

    const loadBookmarkLocation = (nodeId) => {
        if (state.bookmarkCache.has(nodeId)) {
            return Promise.resolve(state.bookmarkCache.get(nodeId));
        }
        if (state.bookmarkPending.has(nodeId)) {
            return state.bookmarkPending.get(nodeId);
        }

        const request = (async () => {
            try {
                const file = await postJson("/api/filetree/getPathByID", {id: nodeId});
                if (!file?.notebook || !file.path) {
                    return null;
                }

                const humanPath = await postJson("/api/filetree/getHPathByPath", {
                    notebook: file.notebook,
                    path: file.path,
                });
                if (typeof humanPath !== "string") {
                    return null;
                }

                const parentSegments = humanPath.split("/").filter(Boolean);
                parentSegments.pop();
                const notebookName = getNotebookName(file.notebook);
                const parentLabel = parentSegments.join(" / ") || "根目录";
                return {
                    parentLabel,
                    scopedLabel: [notebookName, parentLabel].filter(Boolean).join(" / "),
                };
            } catch {
                return null;
            }
        })();

        state.bookmarkPending.set(nodeId, request);
        request.then((location) => {
            state.bookmarkPending.delete(nodeId);
            if (!state.disposed) {
                state.bookmarkCache.set(nodeId, location);
                scheduleBookmarkScan();
            }
        });
        return request;
    };

    const formatNodeTimestamp = (nodeId) => {
        const match = nodeId.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})\d{2}/);
        return match ? `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}` : nodeId;
    };

    const countLabels = (labels) => labels.reduce((counts, label) => {
        counts.set(label, (counts.get(label) || 0) + 1);
        return counts;
    }, new Map());

    const clearBookmarkAnnotation = (row) => {
        row.classList.remove(BOOKMARK_DUPLICATE_CLASS);
        const text = row.querySelector(":scope > .b3-list-item__text");
        if (text) {
            delete text.dataset.stillmarkBookmarkPath;
        }
    };

    const renderBookmarkGroup = (rows) => {
        const locations = rows.map((row) => state.bookmarkCache.get(row.dataset.nodeId));
        const parentLabels = locations.map((location) => location?.parentLabel || "未知位置");
        const parentCounts = countLabels(parentLabels);
        const scopedLabels = locations.map((location, index) => parentCounts.get(parentLabels[index]) > 1
            ? location?.scopedLabel || parentLabels[index]
            : parentLabels[index]);
        const scopedCounts = countLabels(scopedLabels);

        rows.forEach((row, index) => {
            const text = row.querySelector(":scope > .b3-list-item__text");
            if (!text) {
                return;
            }

            const label = scopedCounts.get(scopedLabels[index]) > 1
                ? `${formatNodeTimestamp(row.dataset.nodeId)} · ${scopedLabels[index]}`
                : scopedLabels[index];
            row.classList.add(BOOKMARK_DUPLICATE_CLASS);
            text.dataset.stillmarkBookmarkPath = label;
        });
    };

    const scanBookmarks = () => {
        state.bookmarkRaf = 0;
        if (state.disposed) {
            return;
        }

        const rows = [...document.querySelectorAll(BOOKMARK_SELECTOR)];
        const groupsByList = new Map();
        rows.forEach((row) => {
            const title = row.querySelector(":scope > .b3-list-item__text")?.textContent
                ?.replace(/\s+/g, " ").trim().toLocaleLowerCase();
            if (!title) {
                clearBookmarkAnnotation(row);
                return;
            }
            const groups = groupsByList.get(row.parentElement) || new Map();
            const group = groups.get(title) || [];
            group.push(row);
            groups.set(title, group);
            groupsByList.set(row.parentElement, groups);
        });

        groupsByList.forEach((groups) => {
            groups.forEach((group) => {
                if (group.length < 2) {
                    clearBookmarkAnnotation(group[0]);
                    return;
                }

                group.forEach((row) => loadBookmarkLocation(row.dataset.nodeId));
                if (group.every((row) => state.bookmarkCache.has(row.dataset.nodeId))) {
                    renderBookmarkGroup(group);
                } else {
                    group.forEach(clearBookmarkAnnotation);
                }
            });
        });
    };

    function scheduleBookmarkScan() {
        if (!state.disposed && !state.bookmarkRaf) {
            state.bookmarkRaf = window.requestAnimationFrame(scanBookmarks);
        }
    }

    const containsBookmarkPanel = (node) => node.nodeType === Node.ELEMENT_NODE
        && (node.matches(".sy__bookmark") || node.querySelector(".sy__bookmark"));

    const mutationTouchesBookmarks = (mutation) => mutation.target.nodeType === Node.ELEMENT_NODE
        && (mutation.target.closest(".sy__bookmark")
            || [...mutation.addedNodes, ...mutation.removedNodes].some(containsBookmarkPanel));

    const init = () => {
        if (state.disposed || state.observer || !document.body) {
            return;
        }

        state.observer = new MutationObserver((mutations) => {
            if (mutations.some(mutationTouchesLinks)) {
                scheduleScan();
            }
            if (mutations.some(mutationTouchesBookmarks)) {
                state.bookmarkCache.clear();
                scheduleBookmarkScan();
            }
        });
        state.observer.observe(document.body, {
            attributeFilter: ["data-href", "href"],
            attributes: true,
            childList: true,
            subtree: true,
        });
        scheduleScan();
        scheduleBookmarkScan();
    };

    const destroy = () => {
        if (state.disposed) {
            return;
        }

        state.disposed = true;
        document.removeEventListener("DOMContentLoaded", init);
        state.observer?.disconnect();
        state.bookmarkAbortController.abort();
        state.bookmarkPending.clear();
        document.querySelectorAll(BOOKMARK_SELECTOR).forEach(clearBookmarkAnnotation);
        if (state.raf) {
            window.cancelAnimationFrame(state.raf);
        }
        if (state.bookmarkRaf) {
            window.cancelAnimationFrame(state.bookmarkRaf);
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
        if (window[LEGACY_GLOBAL_KEY]?.destroy === destroy) {
            delete window[LEGACY_GLOBAL_KEY];
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
