export function setupMobileEditor(options = {}) {
    const {isHtmlMode = () => false, downloadAll = null, shareCurrent = null} = options;
    const root = document.querySelector(".text-to-image-converter-settings");
    const controls = root?.querySelector(".tti-editor-controls");
    const body = root?.querySelector(".tti-editor-body");
    if (!controls || !body || root.classList.contains("tti-mobile-ready")) return;
    const media = matchMedia("(max-width: 1000px)");
    const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
    const replaceButton = document.getElementById("tti_open_replace_modal");
    const lengthBadge = document.getElementById("tti_text_length_badge");
    const textModal = document.getElementById("tti_text_modal_backdrop");
    const mobileMoves = [[replaceButton, textModal?.querySelector(".text-field-buttons")], [lengthBadge, textModal?.querySelector("header > div")], ...Array.from(controls.querySelectorAll("#image-style > section"), (section) => [section, controls.querySelector("#background")])]
        .filter(([node, destination]) => node && destination)
        .map(([node, destination]) => {
            const anchor = document.createComment("desktop control position");
            node.before(anchor);
            return {node, destination, anchor};
        });
    const scroll = document.createElement("div");
    scroll.className = "tti-mobile-scroll";
    scroll.append(...controls.childNodes);
    controls.append(scroll);
    controls.id = "tti-mobile-settings";
    const header = document.createElement("div");
    header.className = "tti-mobile-sheet-header";
    header.innerHTML = `<button type="button" class="tti-mobile-handle" aria-label="편집 패널 확대 또는 축소"><span></span></button>
    <div class="tti-mobile-sheet-heading"><strong>글꼴</strong><div>
    <button type="button" class="tti-mobile-expand" aria-label="패널 확대">확대</button>
    <button type="button" class="tti-mobile-close" aria-label="편집 패널 닫기">닫기</button></div></div>`;
    controls.prepend(header);
    const saveMenu = document.createElement("div");
    saveMenu.className = "tti-mobile-save-menu";
    saveMenu.setAttribute("role", "menu");
    saveMenu.hidden = true;
    root.append(saveMenu);
    const bar = document.createElement("nav");
    bar.className = "tti-mobile-bar";
    bar.setAttribute("aria-label", "편집 도구");
    bar.innerHTML = [
        ["text", "pen-to-square", "본문"],
        ["font", "font", "글꼴"],
        ["background", "image", "배경"],
        ["other", "sliders", "기타"],
        ["save", "download", "저장"],
    ]
        .map(([key, icon, label]) => `<button type="button" data-mobile-tool="${key}" aria-label="${key === "save" ? "현재 미리보기 저장 또는 복사" : label}"><i class="fa-solid fa-${icon}" aria-hidden="true"></i><span>${label}</span></button>`)
        .join("");
    root.append(bar);
    let shareHeaderBtn = null;
    const previewHeader = root.querySelector(".tti-preview-pane h4");
    if (canShare && shareCurrent && previewHeader) {
        shareHeaderBtn = document.createElement("button");
        shareHeaderBtn.type = "button";
        shareHeaderBtn.className = "tti-mobile-share-btn";
        shareHeaderBtn.setAttribute("aria-label", "현재 이미지 공유");
        shareHeaderBtn.innerHTML = `<i class="fa-solid fa-share-nodes" aria-hidden="true"></i>`;
        shareHeaderBtn.addEventListener("click", () => {
            shareCurrent();
        });
        previewHeader.append(shareHeaderBtn);
    }
    root.classList.add("tti-mobile-ready");
    let category = "font";
    let state = "closed";
    let otherTab = "footer";
    const positions = {};
    const titles = {font: "글꼴", background: "배경", other: "기타 설정"};
    const toolButton = (key) => bar.querySelector(`[data-mobile-tool="${key}"]`);
    for (const key of Object.keys(titles)) {
        toolButton(key).setAttribute("aria-controls", controls.id);
    }
    const stage = root.querySelector(".tti-preview-stage");
    const preview = root.querySelector("#image_preview_container");
    function closeSaveMenu() {
        saveMenu.hidden = true;
        toolButton("save").setAttribute("aria-expanded", "false");
    }
    function openSaveMenu(totalCount) {
        saveMenu.replaceChildren();
        const items = [
            {
                icon: "download",
                label: `현재 장 저장`,
                action: () => root.querySelector(".image-preview-item.current .download-btn")?.click(),
            },
            {
                icon: "file-zipper",
                label: `전체 ZIP 저장 (${totalCount}장)`,
                action: () => downloadAll?.(),
            },
        ];
        if (canShare && shareCurrent) {
            items.push({
                icon: "share-nodes",
                label: "현재 장 공유",
                action: () => shareCurrent(),
            });
        }
        items.forEach(({icon, label, action}) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.setAttribute("role", "menuitem");
            btn.innerHTML = `<i class="fa-solid fa-${icon}" aria-hidden="true"></i><span>${label}</span>`;
            btn.addEventListener("click", () => {
                closeSaveMenu();
                action();
            });
            saveMenu.append(btn);
        });
        saveMenu.hidden = false;
        toolButton("save").setAttribute("aria-expanded", "true");
    }
    function sync() {
        for (const {node, destination, anchor} of mobileMoves) {
            if (media.matches) destination.append(node);
            else anchor.after(node);
        }
        if (!media.matches) closeSaveMenu();
        root.dataset.mobileSheet = state;
        root.dataset.mobileCategory = category;
        controls.inert = media.matches && state === "closed";
        header.querySelector("strong").textContent = titles[category];
        header.querySelector(".tti-mobile-expand").textContent = state === "expanded" ? "축소" : "확대";
        header.querySelector(".tti-mobile-expand").setAttribute("aria-label", state === "expanded" ? "패널 축소" : "패널 확대");
        header.querySelector(".tti-mobile-handle").setAttribute("aria-expanded", String(state === "expanded"));
        for (const key of Object.keys(titles)) {
            toolButton(key).setAttribute("aria-expanded", String(state !== "closed" && key === category));
        }
    }
    function close() {
        positions[category] = scroll.scrollTop;
        state = "closed";
        sync();
        toolButton(category).focus({preventScroll: true});
    }
    function toggleSize() {
        state = state === "expanded" ? "half" : "expanded";
        sync();
    }
    function selectCategory(key) {
        closeSaveMenu();
        positions[category] = scroll.scrollTop;
        if (category === key && state !== "closed") return close();
        category = key;
        state = "half";
        const tab =
            key === "font" ? "text-style"
            : key === "background" ? "background"
            : otherTab;
        scroll.querySelector(`[data-tab="${tab}"]`)?.click();
        sync();
        scroll.scrollTop = positions[category] || 0;
    }
    bar.addEventListener("click", (event) => {
        const key = event.target.closest("[data-mobile-tool]")?.dataset.mobileTool;
        if (!key) return;
        if (key === "text") {
            closeSaveMenu();
            document.getElementById("tti_open_text_modal")?.click();
        } else if (key === "save") {
            const htmlMode = isHtmlMode();
            const totalCount = preview.querySelectorAll(".image-preview-item .download-btn").length;
            if (!htmlMode && totalCount > 1 && downloadAll) {
                if (saveMenu.hidden) openSaveMenu(totalCount);
                else closeSaveMenu();
            } else {
                closeSaveMenu();
                root.querySelector(".image-preview-item.current .download-btn")?.click();
            }
        } else selectCategory(key);
    });
    document.addEventListener("pointerdown", (event) => {
        if (!saveMenu.hidden && !saveMenu.contains(event.target) && !toolButton("save").contains(event.target)) {
            closeSaveMenu();
        }
    });
    scroll.addEventListener("click", (event) => {
        const tab = event.target.closest("[data-tab]")?.dataset.tab;
        if (tab && !["text-style", "background"].includes(tab)) otherTab = tab;
    });
    header.querySelector(".tti-mobile-close").addEventListener("click", close);
    header.querySelector(".tti-mobile-expand").addEventListener("click", toggleSize);
    const handle = header.querySelector(".tti-mobile-handle");
    let drag = null;
    let suppressClick = false;
    handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        const bodyHeight = body.clientHeight || window.innerHeight;
        drag = {
            y: event.clientY,
            id: event.pointerId,
            startHeight: controls.getBoundingClientRect().height,
            bodyHeight,
            moved: false,
        };
        suppressClick = false;
        handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener("pointermove", (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        const dy = event.clientY - drag.y;
        if (!drag.moved && Math.abs(dy) > 8) {
            drag.moved = true;
            controls.classList.add("tti-dragging");
        }
        if (drag.moved) {
            const nextHeight = Math.max(0, Math.min(drag.bodyHeight * 0.9, drag.startHeight - dy));
            controls.style.height = `${nextHeight}px`;
        }
    });
    function finishDrag(event, cancelled) {
        if (!drag || drag.id !== event.pointerId) return;
        const distance = event.clientY - drag.y;
        const finalRatio = (drag.startHeight - distance) / drag.bodyHeight;
        const moved = drag.moved;
        drag = null;
        controls.classList.remove("tti-dragging");
        controls.style.height = "";
        if (cancelled) return;
        suppressClick = moved || Math.abs(distance) > 30;
        if (!suppressClick) return;
        if (finalRatio > 0.65 || (distance < -40 && state === "half")) {
            state = "expanded";
            sync();
        } else if (finalRatio < 0.24 || (distance > 60 && state === "half")) {
            close();
        } else {
            state = "half";
            sync();
        }
    }
    handle.addEventListener("pointerup", (event) => finishDrag(event, false));
    handle.addEventListener("pointercancel", (event) => finishDrag(event, true));
    handle.addEventListener("click", () => {
        if (!suppressClick) toggleSize();
        suppressClick = false;
    });
    let stageTap = null;
    stage.addEventListener("pointerdown", (event) => {
        if (!media.matches || state === "closed") return;
        if (event.target.closest(".tti-preview-arrow, .download-btn, .html-render-preview")) return;
        stageTap = {x: event.clientX, y: event.clientY};
    });
    stage.addEventListener("pointerup", (event) => {
        if (!stageTap) return;
        const dx = Math.abs(event.clientX - stageTap.x);
        const dy = Math.abs(event.clientY - stageTap.y);
        stageTap = null;
        if (dx < 10 && dy < 10 && media.matches && state !== "closed") {
            close();
        }
    });
    stage.addEventListener("pointercancel", () => {
        stageTap = null;
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !saveMenu.hidden) {
            closeSaveMenu();
            return;
        }
        if (event.key === "Escape" && media.matches && state !== "closed" && !document.querySelector(".tti-modal-backdrop.open")) close();
    });
    media.addEventListener("change", sync);
    const fit = () => {
        const space = Math.max(0, stage.clientHeight - 30);
        root.style.setProperty("--tti-mobile-preview-height", `${space}px`);
    };
    new ResizeObserver(fit).observe(stage);
    const syncViewportHeight = () => {
        const vv = window.visualViewport;
        const height = vv ? vv.height : window.innerHeight;
        document.documentElement.style.setProperty("--tti-vvh", `${Math.round(height)}px`);
    };
    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", syncViewportHeight);
    }
    window.addEventListener("resize", syncViewportHeight);
    syncViewportHeight();
    const updateSave = () => {
        const saveBtn = toolButton("save");
        const hasAction = !!preview.querySelector(".current .download-btn");
        const htmlMode = isHtmlMode();
        saveBtn.disabled = !hasAction;
        saveBtn.querySelector("i").className = `fa-solid fa-${htmlMode ? "clipboard" : "download"}`;
        saveBtn.querySelector("span").textContent = htmlMode ? "복사" : "저장";
        saveBtn.setAttribute("aria-label", htmlMode ? "HTML 코드 복사" : "현재 미리보기 저장");
        if (shareHeaderBtn) {
            shareHeaderBtn.hidden = htmlMode || !hasAction;
        }
        if (!hasAction) closeSaveMenu();
    };
    new MutationObserver(updateSave).observe(preview, {childList: true, subtree: true, attributes: true, attributeFilter: ["class"]});
    document.getElementById("html_toggle")?.addEventListener("change", updateSave);
    updateSave();
    sync();
}
