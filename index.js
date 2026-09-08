if (typeof toastr === "undefined") {
    window.toastr = (function () {
        let container = null;
        function getContainer() {
            if (!container || !document.body.contains(container)) {
                container = document.createElement("div");
                container.className = "txt-toast-container";
                document.body.appendChild(container);
            }
            return container;
        }
        function show(type, message) {
            const el = document.createElement("div");
            el.className = `txt-toast txt-toast-${type}`;
            el.textContent = message;
            getContainer().appendChild(el);
            requestAnimationFrame(() => el.classList.add("show"));
            setTimeout(() => {
                el.classList.remove("show");
                setTimeout(() => el.remove(), 250);
            }, 4000);
        }
        return {
            success: (msg) => show("success", msg),
            warning: (msg) => show("warning", msg),
            error: (msg) => show("error", msg),
            info: (msg) => show("info", msg),
        };
    })();
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function safeGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}
function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn("[txt-to-img] localStorage 저장 실패:", e);
    }
}
function safeRemoveItem(key) {
    try {
        localStorage.removeItem(key);
    } catch {}
}
function safeParseJSON(value, fallback) {
    if (!value) return fallback;
    try {
        return JSON.parse(value);
    } catch (e) {
        console.warn("[txt-to-img] 저장된 JSON 파싱 실패:", e);
        return fallback;
    }
}
function fetchWithTimeout(url, options = {}, timeout = 6000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, {...options, signal: controller.signal}).finally(() => clearTimeout(timer));
}
async function fetchExtensionResource(fileName) {
    const localURL = `${extensionFolderPath}/${fileName}`;
    try {
        const response = await fetchWithTimeout(localURL);
        if (response.ok) return response;
        throw new Error(`HTTP ${response.status}`);
    } catch (localError) {
        if (extensionFolderPath === fallbackExtensionFolderPath) throw localError;
        console.warn(`[txt-to-img] ${localURL} 로드 실패, fallback 사용`, localError);
        const fallbackResponse = await fetchWithTimeout(`${fallbackExtensionFolderPath}/${fileName}`);
        if (!fallbackResponse.ok) throw new Error(`HTTP ${fallbackResponse.status}`);
        return fallbackResponse;
    }
}
async function fetchExtensionText(fileName) {
    return (await fetchExtensionResource(fileName)).text();
}
async function fetchExtensionJSON(fileName) {
    return (await fetchExtensionResource(fileName)).json();
}

const JSZipLocal = "libs/jszip.min.js";
const JSZipCDN = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
const FileSaverLocal = "libs/FileSaver.min.js";
const FileSaverCDN = "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js";

const extensionName = "txt-to-img";
const fallbackExtensionFolderPath = `https://xaxaxaxakk.github.io/${extensionName}`;
const extensionFolderPath = (() => {
    const scriptSrc = document.currentScript?.src;
    if (!scriptSrc) return ".";
    return new URL(".", scriptSrc).href.replace(/\/$/, "");
})();
const extension_settings = {[extensionName]: safeParseJSON(safeGetItem(extensionName), {})};
function _saveSettingsNow() {
    safeSetItem(extensionName, JSON.stringify(extension_settings[extensionName]));
}
const saveSettings = debounce(_saveSettingsNow, 200);
const debouncedSaveSettings = saveSettings;
window.addEventListener("beforeunload", _saveSettingsNow);
const defaultSettings = {
    uiTheme: "light",
    fontFamily: "Pretendard-Regular",
    fontWeight: "normal",
    htmlFontFace: "Ridibatang",
    fontSize: 24,
    fontSizeImage: 24,
    fontSizeHtml: 14,
    fontSpacing: 0,
    fontLineHeight: 1.5,
    fontAlign: "left",
    fontColor: "#000000",
    useItalicColor: false,
    italicFontColor: "#000000",
    useBoldColor: false,
    boldFontColor: "#000000",
    useBoldItalicColor: false,
    boldItalicFontColor: "#000000",
    useStrikethroughColor: false,
    strikethroughFontColor: "#000000",
    useUnderlineColor: false,
    underlineFontColor: "#000000",
    useQuotesColor: false,
    quotesFontColor: "#000000",
    blockquoteFontColor: "#000000",
    blockquoteBgColor: "#ffffff",
    blockquoteBorderColor: "#000000",
    strokeWidth: "0",
    lineBreak: "byWord",
    selectedBackgroundImage: `${extensionFolderPath}/default-backgrounds/bg40.png`,
    selectedBackgroundImageHtml: `${extensionFolderPath}/default-backgrounds/bg40.png`,
    useBackgroundColor: false,
    backgroundColor: "#ffffff",
    useSecondBackgroundColor: false,
    secondBackgroundColor: "#ffffff",
    imageRatio: "square",
    imageFillMode: "cover",
    bgBlur: 0,
    bgBrightness: 100,
    bgHue: 0,
    bgGrayscale: 0,
    bgNoise: 0,
    overlayOpacity: 0,
    overlayColor: "#ffffff",
    presets: {},
    currentPreset: null,
    footerLayoutMode: "scroll",
    footerWidth: 500,
    footerHeight: 500,
    chatTitleMode: "off",
    chatTitleCustom: "",
    charNameMode: "off",
    charNameCustom: "",
    useWatermark: false,
    replaceRules: [],
    autoPreview: true,
    htmlMode: false,
    letterCase: false,
    unitControl: false,
    setHighlighterTags: [],
    dragOnlyFloat: true,
    extMenuShortcut: false,
    mesButtonEnabled: true,
    autoOrganize: false,
};
let defaultBackgroundUrlMap = new Map();
let defaultBackgroundBasenameMap = new Map();
const CUSTOM_BG_STORAGE_IMAGE_KEY = "textToImageCustomBgsImage";
const CUSTOM_BG_STORAGE_HTML_KEY = "textToImageCustomBgsHTML";
const HTML_FONT_FACE_OPTIONS = new Set(["Ridibatang", "Nanum Gothic", "OngleipParkDahyeon", "GangwonEducationModuche"]);

function isHtmlModeEnabled() {
    return !!extension_settings[extensionName]?.htmlMode;
}
function getFooterLayoutMode(settings = extension_settings[extensionName]) {
    return settings?.footerLayoutMode === "full" ? "full" : "scroll";
}

function getWebFonts() {
    return extension_settings[extensionName]?.webFonts || [];
}
function webFontAvailable(family, mode) {
    return getWebFonts().some((font) => font.family === family && font[mode]);
}
async function parseWebFontCSS(source, base = location.href, depth = 0) {
    if (typeof source !== "string" || source.length > 500000 || depth > 4 || /<\/?(?:style|script|link)\b/i.test(source)) throw new Error("웹폰트 CSS를 붙여넣어 주세요.");
    const imports = [...source.matchAll(/@import\s+(?:url\(\s*["']?([^\s"')]+)["']?\s*\)|["']([^"']+)["'])[^;]*;/gi)];
    let imported = [];
    for (const match of imports) {
        const url = new URL(match[1] || match[2], base);
        if (!/^https?:$/.test(url.protocol)) throw new Error("웹폰트 주소는 HTTP 또는 HTTPS여야 합니다.");
        const response = await fetchWithTimeout(url.href);
        if (!response.ok) throw new Error("웹폰트 CSS를 가져오지 못했습니다.");
        imported.push(await parseWebFontCSS(await response.text(), response.url || url.href, depth + 1));
    }
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(source.replace(/@import\s+(?:url\([^)]*\)|["'][^"']+["'])[^;]*;/gi, ""));
    const faces = [];
    const families = new Set(imported.map((item) => item.family));
    for (const rule of sheet.cssRules) {
        if (rule.type !== 5) continue;
        const family = rule.style
            .getPropertyValue("font-family")
            .trim()
            .replace(/^['"]|['"]$/g, "");
        if (!family || /[<>"'\\;{}\r\n]/.test(family) || !rule.style.getPropertyValue("src")) throw new Error("font-family와 src가 있는 @font-face CSS가 필요합니다.");
        families.add(family);
        const src = rule.style.getPropertyValue("src").replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi, (_, quote, value) => {
            const url = new URL(value, base);
            if (!/^https?:$/.test(url.protocol) && !/^data:font\//i.test(url.href) && !/^data:application\/(?:font|x-font|octet-stream)/i.test(url.href)) throw new Error("지원하지 않는 폰트 주소입니다.");
            return 'url("' + url.href.replace(/"/g, "%22") + '")';
        });
        rule.style.setProperty("src", src);
        faces.push(rule.cssText);
    }
    if (families.size !== 1) throw new Error("한 번에 한 글꼴의 CSS를 등록해 주세요. @font-face 또는 @import CSS가 필요합니다.");
    return {family: [...families][0], css: [...imported.map((item) => item.css), ...faces].join("\n")};
}
function webFontStyleMarkup() {
    const css = getWebFonts()
        .filter((font) => font.html)
        .map((font) => font.css)
        .join("\n");
    return css ? "<style>" + css.replace(/</g, "\\3c ") + "</style>" : "";
}
function prependWebFontOptions(select, mode, value = select.value) {
    select.querySelectorAll("option[data-web-font]").forEach((option) => option.remove());
    const options = getWebFonts()
        .filter((font) => font[mode])
        .map((font) => {
            const option = new Option(font.name, font.family);
            option.dataset.webFont = font.id;
            return option;
        });
    select.prepend(...options);
    select.value = value;
    if (select.selectedIndex < 0)
        select.value =
            select.classList.contains("tag-font-family") || select.classList.contains("tag-html-font-family") ? "useGlobal"
            : mode === "html" ? defaultSettings.htmlFontFace
            : defaultSettings.fontFamily;
}
function applyWebFonts() {
    let style = document.getElementById("tti_web_font_styles");
    if (!style) {
        style = document.createElement("style");
        style.id = "tti_web_font_styles";
        document.head.append(style);
    }
    style.textContent = getWebFonts()
        .map((font) => font.css)
        .join("\n");
    const settings = extension_settings[extensionName];
    document.querySelectorAll("#tti_font_family, .tag-font-family, #tti_html_font_face, .tag-html-font-family").forEach((select) => {
        const mode = select.matches("#tti_html_font_face, .tag-html-font-family") ? "html" : "image";
        const key = mode === "html" ? "htmlFontFace" : "fontFamily";
        prependWebFontOptions(select, mode, select.id ? settings[key] : select.value);
        if (select.id && select.options.length) settings[key] = select.value;
    });
}
function setupWebFontManager() {
    if (document.getElementById("tti_web_font_dialog")) return;
    const dialog = document.createElement("div");
    dialog.id = "tti_web_font_dialog";
    dialog.className = "tti-modal-backdrop";
    dialog.innerHTML = `<div class="tti-modal tti-web-font-manager" role="dialog" aria-modal="true" aria-labelledby="tti_web_font_title">
    <header>
        <div><small>WEB FONT</small><h3 id="tti_web_font_title">웹폰트 관리</h3></div>
        <button type="button" class="tti-modal-close" aria-label="닫기"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    </header>
    <div class="tti-web-font-list"></div>
    <h4 class="tti-modal-subhead">백업</h4>
    <div class="tti-preset-actions tti-web-font-backup">
        <button type="button" class="buttons" data-action="export"><i class="fa-solid fa-file-export" aria-hidden="true"></i> 저장</button>
        <button type="button" class="buttons" data-action="import"><i class="fa-solid fa-file-import" aria-hidden="true"></i> 불러오기</button>
    </div>
    <p class="tti-section-desc tti-web-font-status" role="status"></p>
    <footer>
        <button type="button" class="primary" data-action="add"><i class="fa-solid fa-plus" aria-hidden="true"></i> 웹폰트 추가</button>
    </footer>
    <input type="file" accept="application/json,.json" hidden>
</div>`;
    document.body.append(dialog);
    const editorDialog = document.createElement("div");
    editorDialog.id = "tti_web_font_editor_dialog";
    editorDialog.className = "tti-modal-backdrop";
    editorDialog.innerHTML = `<form class="tti-modal tti-web-font-form" role="dialog" aria-modal="true" aria-labelledby="tti_web_font_editor_title">
    <header>
        <div><small>WEB FONT</small><h3 id="tti_web_font_editor_title">웹폰트 추가</h3></div>
        <button type="button" class="tti-modal-close" aria-label="닫기"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    </header>
    <label class="tti-modal-subhead" for="tti_web_font_name">표시할 이름</label>
    <input type="text" id="tti_web_font_name" name="name" required maxlength="100" placeholder="폰트 이름">
    <label class="tti-modal-subhead" for="tti_web_font_css">웹폰트 CSS</label>
    <textarea id="tti_web_font_css" class="tti-web-font-css" name="css" required rows="6" spellcheck="false" placeholder="@font-face { font-family: ...; src: url(...); } 또는 @import url(...);"></textarea>
    <h4 class="tti-modal-subhead">추가 대상</h4>
    <div>
        <label class="tti-option-label"><span>이미지</span><input type="checkbox" name="image" checked><i class="tti-toggle-slider" aria-hidden="true"><b></b></i></label>
        <label class="tti-option-label"><span>HTML</span><input type="checkbox" name="html" checked><i class="tti-toggle-slider" aria-hidden="true"><b></b></i></label>
    </div>
    <p class="tti-section-desc tti-web-font-status" role="status"></p>
    <footer><button type="submit" class="primary">등록</button></footer>
</form>`;
    document.body.append(editorDialog);
    const form = editorDialog.querySelector("form");
    const managerStatus = dialog.querySelector('[role="status"]');
    const editorStatus = editorDialog.querySelector('[role="status"]');
    let editing = null;
    let busy = false;
    const reset = () => {
        editing = null;
        form.reset();
        editorDialog.querySelector("h3").textContent = "웹폰트 추가";
        form.querySelector('[type="submit"]').textContent = "등록";
        editorStatus.textContent = "";
    };
    const render = () => {
        const list = dialog.querySelector(".tti-web-font-list");
        list.replaceChildren();
        getWebFonts().forEach((font) => {
            const row = document.createElement("div");
            row.className = "tti-field";
            const label = document.createElement("div");
            label.className = "tti-web-font-label";
            const name = document.createElement("span");
            name.className = "tti-web-font-name";
            name.textContent = font.name;
            label.append(name);
            if (font.image) label.insertAdjacentHTML("beforeend", '<span class="tti-web-font-type" title="이미지" aria-label="이미지"><i class="fa-solid fa-image" aria-hidden="true"></i></span>');
            if (font.html) label.insertAdjacentHTML("beforeend", '<span class="tti-web-font-type" title="HTML" aria-label="HTML"><i class="fa-solid fa-code" aria-hidden="true"></i></span>');
            const edit = document.createElement("button");
            edit.type = "button";
            edit.className = "buttons";
            edit.innerHTML = '<i class="fa-solid fa-pen" aria-hidden="true"></i>';
            edit.title = "수정";
            edit.setAttribute("aria-label", font.name + " 수정");
            edit.onclick = () => {
                if (busy) return;
                editing = font.id;
                form.elements.name.value = font.name;
                form.elements.css.value = font.source || font.css;
                form.elements.image.checked = font.image;
                form.elements.html.checked = font.html;
                editorDialog.querySelector("h3").textContent = "웹폰트 수정";
                form.querySelector('[type="submit"]').textContent = "수정 저장";
                editorStatus.textContent = "";
                openModal(editorDialog.id);
                form.elements.name.focus();
            };
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "buttons clear";
            remove.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
            remove.title = "삭제";
            remove.setAttribute("aria-label", font.name + " 삭제");
            remove.onclick = () => {
                if (busy) return;
                commit(getWebFonts().filter((item) => item.id !== font.id));
                if (editing === font.id) reset();
            };
            row.append(label, edit, remove);
            list.append(row);
        });
        if (!list.children.length) {
            const empty = document.createElement("p");
            empty.className = "tti-section-desc";
            empty.textContent = "등록한 웹폰트가 없습니다.";
            list.append(empty);
        }
    };
    const commit = (fonts) => {
        const previous = getWebFonts();
        const removed = (family, mode) => previous.some((font) => font.family === family && font[mode]) && !fonts.some((font) => font.family === family && font[mode]);
        const settings = extension_settings[extensionName];
        settings.webFonts = fonts;
        if (removed(settings.fontFamily, "image")) settings.fontFamily = defaultSettings.fontFamily;
        if (removed(settings.htmlFontFace, "html")) settings.htmlFontFace = defaultSettings.htmlFontFace;
        (settings.setHighlighterTags || []).forEach((tag) => {
            if (removed(tag.fontFamily, "image")) tag.fontFamily = "useGlobal";
            if (removed(tag.htmlFontFamily, "html")) tag.htmlFontFamily = "useGlobal";
        });
        applyWebFonts();
        saveSettings();
        render();
        refreshPreview();
    };
    form.onsubmit = async (event) => {
        event.preventDefault();
        if (busy) return;
        busy = true;
        editorStatus.textContent = "CSS 확인 중…";
        try {
            const name = form.elements.name.value.trim();
            const source = form.elements.css.value.trim();
            const image = form.elements.image.checked;
            const html = form.elements.html.checked;
            if (!name || (!image && !html)) throw new Error("표시할 이름과 추가 대상을 선택해 주세요.");
            const parsed = await parseWebFontCSS(source);
            if (getWebFonts().some((font) => font.id !== editing && font.family === parsed.family)) throw new Error("이미 등록된 글꼴입니다. 기존 항목을 수정해 주세요.");
            const font = {id: editing || crypto.randomUUID(), name, source, ...parsed, image, html};
            commit(editing ? getWebFonts().map((item) => (item.id === editing ? font : item)) : [...getWebFonts(), font]);
            reset();
            managerStatus.textContent = "저장했습니다.";
            closeModal($(editorDialog));
        } catch (error) {
            editorStatus.textContent = error.message;
        } finally {
            busy = false;
        }
    };
    dialog.querySelector('[data-action="add"]').onclick = () => {
        if (busy) return;
        reset();
        openModal(editorDialog.id);
        form.elements.name.focus();
    };
    dialog.querySelector('[data-action="export"]').onclick = () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify({version: 1, webFonts: getWebFonts()}, null, 2)], {type: "application/json"}));
        const link = document.createElement("a");
        link.href = url;
        link.download = "web-fonts-backup.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const input = dialog.querySelector('[type="file"]');
    dialog.querySelector('[data-action="import"]').onclick = () => {
        if (!busy) input.click();
    };
    input.onchange = async () => {
        if (!input.files[0] || busy) return;
        busy = true;
        try {
            if (input.files[0].size > 10000000) throw new Error("백업 파일은 10MB 이하여야 합니다.");
            const data = JSON.parse(await input.files[0].text());
            if (data.version !== 1 || !Array.isArray(data.webFonts)) throw new Error("올바른 웹폰트 백업 파일이 아닙니다.");
            const fonts = [...getWebFonts()];
            for (const item of data.webFonts) {
                if (typeof item.name !== "string" || !item.name.trim() || (!item.image && !item.html)) throw new Error("백업의 글꼴 정보가 올바르지 않습니다.");
                const parsed = await parseWebFontCSS(item.css);
                const index = fonts.findIndex((font) => font.family === parsed.family);
                const font = {id: index < 0 ? crypto.randomUUID() : fonts[index].id, name: item.name.trim().slice(0, 100), source: parsed.css, ...parsed, image: !!item.image, html: !!item.html};
                if (index < 0) fonts.push(font);
                else fonts[index] = font;
            }
            commit(fonts);
            reset();
            managerStatus.textContent = "백업을 불러왔습니다. 같은 글꼴은 백업 내용으로 갱신했습니다.";
        } catch (error) {
            managerStatus.textContent = error.message;
        } finally {
            busy = false;
            input.value = "";
        }
    };
    document.querySelectorAll("#tti_font_family, #tti_html_font_face").forEach((select) => {
        const wrapper = document.createElement("div");
        wrapper.className = "preset-control tti-web-font-control";
        select.before(wrapper);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "buttons tti-web-font-open";
        button.innerHTML = '<i class="fa-solid fa-gear" aria-hidden="true"></i>';
        button.title = "웹폰트 관리";
        button.setAttribute("aria-label", "웹폰트 관리");
        wrapper.append(button, select);
        button.onclick = () => {
            render();
            openModal(dialog.id);
        };
    });
}

function normalizeHtmlFontFace(value) {
    return HTML_FONT_FACE_OPTIONS.has(value) || webFontAvailable(value, "html") ? value : defaultSettings.htmlFontFace;
}
function getHtmlFontFace(settings = extension_settings[extensionName]) {
    return normalizeHtmlFontFace(settings?.htmlFontFace);
}
function getHtmlPreviewFontFamily(settings = extension_settings[extensionName]) {
    const face = getHtmlFontFace(settings);
    const fallback = "RIDIBatang";

    const overrides = {
        "Nanum Gothic": "Pretendard-Regular",
    };

    return webFontAvailable(face, "html") ? getCSSFontFamily(face) : (overrides[face] ?? (HTML_FONT_FACE_OPTIONS.has(face) ? face : fallback));
}
function parsePositiveInt(value, fallback) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function updateFooterLayoutUIState() {
    const isScroll = $("#footer_layout_mode").val() !== "full";
    $("#footer .footer-scroll-only").toggleClass("footer-scroll-only-hidden", !isScroll);
}

/* ---------- 형광펜 팔레트 ---------- */
const HIGHLIGHT_PALETTE = [
    {name: "노랑", bg: "#f7e8b4"},
    {name: "연두", bg: "#d0e3cc"},
    {name: "하늘", bg: "#d2e1eb"},
    {name: "분홍", bg: "#efccd8"},
    {name: "보라", bg: "#e5dcf2"},
    {name: "주황", bg: "#f5d9c0"},
    {name: "흰색", bg: "#ffffff"},
    {name: "검은색", bg: "#000000"},
];

/* ---------- 이미지 정보 ---------- */
const META_MODES = new Set(["off", "custom"]);
function normalizeMetaMode(value) {
    return META_MODES.has(value) ? value : "off";
}
function resolveMetaText(mode, customValue) {
    if (normalizeMetaMode(mode) === "off") return "";
    return String(customValue || "").trim();
}
const WATERMARK_MARK = "READER.";
const SHARE_REFERENCE_WIDTH = 1080;
function getMetaMetrics(width) {
    const scale = width / SHARE_REFERENCE_WIDTH;
    return {
        fontSize: Math.round(28 * scale),
        lineStep: Math.round(42 * scale),
        gapBefore: Math.round(18 * scale),
        blockPadding: Math.round(24 * scale),
        watermarkSize: Math.round(42 * scale),
        watermarkInset: Math.round(45 * scale),
    };
}
function getMetaBlockHeight(width, lineCount) {
    if (!lineCount) lineCount = 2;
    const metrics = getMetaMetrics(width);
    return lineCount * metrics.lineStep + metrics.blockPadding;
}
function isWatermarkEnabled(settings = extension_settings[extensionName]) {
    return !!settings?.useWatermark;
}

function getMetaLines(settings = extension_settings[extensionName]) {
    const lines = [];
    const title = resolveMetaText(settings?.chatTitleMode, settings?.chatTitleCustom);
    if (title) lines.push({text: title, alpha: 0.9});
    const characterName = resolveMetaText(settings?.charNameMode, settings?.charNameCustom);
    if (characterName) lines.push({text: characterName, alpha: 0.68});
    return lines;
}

/* ---------- 단어 치환 규칙 ---------- */
function normalizeReplaceRules(value) {
    if (!Array.isArray(value)) return [];
    return value
        .filter((rule) => rule && typeof rule === "object")
        .map((rule) => ({
            original: String(rule.original ?? ""),
            replacement: String(rule.replacement ?? ""),
            enabled: rule.enabled !== false,
        }));
}
function migrateLegacyReplaceRules(source) {
    const migrated = [];
    for (let index = 1; index <= 4; index++) {
        const original = source[`originalWord${index}`];
        const replacement = source[`replacementWord${index}`];
        if (original === undefined && replacement === undefined) continue;
        if (!String(original ?? "").trim()) continue;
        migrated.push({original: String(original), replacement: String(replacement ?? "")});
    }
    return migrated;
}
function getReplaceRules(settings = extension_settings[extensionName]) {
    return normalizeReplaceRules(settings?.replaceRules);
}
function setReplaceRules(rules) {
    extension_settings[extensionName].replaceRules = normalizeReplaceRules(rules);
}
function ensureFontSizeSettings() {
    const settings = extension_settings[extensionName];
    const legacyFontSize = parseInt(settings.fontSize, 10);
    const imageSize = parseInt(settings.fontSizeImage, 10);
    const htmlSize = parseInt(settings.fontSizeHtml, 10);

    settings.fontSizeImage =
        Number.isFinite(imageSize) ? imageSize
        : Number.isFinite(legacyFontSize) ? legacyFontSize
        : defaultSettings.fontSizeImage;
    settings.fontSizeHtml = Number.isFinite(htmlSize) ? htmlSize : defaultSettings.fontSizeHtml;
    settings.fontSize = isHtmlModeEnabled() ? settings.fontSizeHtml : settings.fontSizeImage;
}
function getActiveFontSize(settings = extension_settings[extensionName]) {
    return isHtmlModeEnabled() ? parseInt(settings.fontSizeHtml, 10) || defaultSettings.fontSizeHtml : parseInt(settings.fontSizeImage, 10) || defaultSettings.fontSizeImage;
}
function getCustomBackgroundStorageKey() {
    return isHtmlModeEnabled() ? CUSTOM_BG_STORAGE_HTML_KEY : CUSTOM_BG_STORAGE_IMAGE_KEY;
}
function getSelectedBackgroundForCurrentMode() {
    const settings = extension_settings[extensionName];
    if (isHtmlModeEnabled()) {
        return settings.selectedBackgroundImageHtml || settings.selectedBackgroundImage;
    }
    return settings.selectedBackgroundImage;
}
function setSelectedBackgroundForCurrentMode(path) {
    if (isHtmlModeEnabled()) {
        extension_settings[extensionName].selectedBackgroundImageHtml = path;
    } else {
        extension_settings[extensionName].selectedBackgroundImage = path;
    }
}
function syncSelectedBackgroundUI() {
    const selectedPath = getSelectedBackgroundForCurrentMode();
    $(".bg-image-item").removeClass("selected");
    if (selectedPath) {
        $(`.bg-image-item[data-path="${selectedPath}"]`).addClass("selected");
    }
}
let rangeValueTooltip = null;
function ensureRangeValueTooltip() {
    if (rangeValueTooltip && document.body.contains(rangeValueTooltip)) {
        return rangeValueTooltip;
    }
    rangeValueTooltip = document.createElement("div");
    rangeValueTooltip.className = "range-value-tooltip";
    document.body.appendChild(rangeValueTooltip);
    return rangeValueTooltip;
}
function formatRangeValue(value, step) {
    const stepValue = parseFloat(step || "1");
    if (!Number.isFinite(stepValue) || stepValue >= 1) {
        return String(parseInt(value, 10));
    }
    const fixed = stepValue.toString().split(".")[1]?.length || 2;
    return Number(value).toFixed(fixed).replace(/0+$/, "").replace(/\.$/, "");
}
function showRangeTooltip(input) {
    const tooltip = ensureRangeValueTooltip();
    const min = parseFloat(input.min || "0");
    const max = parseFloat(input.max || "100");
    const value = parseFloat(input.value || "0");
    const percentage = max > min ? (value - min) / (max - min) : 0;
    const rect = input.getBoundingClientRect();
    const x = rect.left + rect.width * percentage + window.scrollX;
    const y = rect.top + window.scrollY - 30;

    tooltip.textContent = formatRangeValue(input.value, input.step);
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.classList.add("shown");
}
function hideRangeTooltip() {
    if (!rangeValueTooltip) return;
    rangeValueTooltip.classList.remove("shown");
}
function setupRangeValueTooltips() {
    const selector = ["#tti_font_size_image", "#tti_font_size_html", "#tti_letter_spacing", "#tti_line_height", "#bg_blur", "#bg_brightness", "#bg_hue", "#bg_grayscale", "#bg_noise", "#overlay_opacity"].join(", ");
    $(document).on("input", selector, function () {
        showRangeTooltip(this);
    });
    $(document).on("pointerdown focus mouseenter", selector, function () {
        showRangeTooltip(this);
    });
    $(document).on("pointerup blur mouseleave", selector, function () {
        hideRangeTooltip();
    });
}

async function initSettings() {
    extension_settings[extensionName] = {...defaultSettings, ...extension_settings[extensionName]};
    applyWebFonts();
    applyExtensionTheme();
    ensureFontSizeSettings();
    ensureHighlightTagNames();
    {
        const store = extension_settings[extensionName];
        const existingRules = normalizeReplaceRules(store.replaceRules);
        store.replaceRules = existingRules.length ? existingRules : migrateLegacyReplaceRules(store);
        store.chatTitleMode = normalizeMetaMode(store.chatTitleMode);
        store.charNameMode = normalizeMetaMode(store.charNameMode);
    }
    const {fontFamily, fontSizeImage, fontSizeHtml, htmlFontFace, fontSpacing, fontLineHeight, fontAlign, fontColor, useItalicColor, italicFontColor, useBoldColor, boldFontColor, useBoldItalicColor, boldItalicFontColor, useStrikethroughColor, strikethroughFontColor, useUnderlineColor, underlineFontColor, useQuotesColor, quotesFontColor, blockquoteFontColor, blockquoteBgColor, blockquoteBorderColor, strokeWidth, lineBreak, imageRatio, imageFillMode, useBackgroundColor, backgroundColor, useSecondBackgroundColor, secondBackgroundColor, bgBlur, bgBrightness, bgHue, bgGrayscale, bgNoise, overlayOpacity, overlayColor, currentPreset, footerLayoutMode, footerWidth, footerHeight, autoPreview, htmlMode, letterCase, unitControl} = extension_settings[extensionName];

    $("#tti_font_family").val(fontFamily);
    $("#tti_font_size_image").val(fontSizeImage);
    $("#tti_font_size_html").val(fontSizeHtml);
    $("#tti_html_font_face").val(normalizeHtmlFontFace(htmlFontFace));
    $("#tti_letter_spacing").val(fontSpacing);
    $("#tti_line_height").val(fontLineHeight);
    $("#tti_font_align").val(fontAlign);
    $("#tti_font_color").val(fontColor);
    $("#use_italic_color").prop("checked", useItalicColor);
    $("#tti_italic_font_color").val(italicFontColor);
    $("#use_bold_color").prop("checked", useBoldColor);
    $("#tti_bold_font_color").val(boldFontColor);
    $("#use_boldItalic_color").prop("checked", useBoldItalicColor);
    $("#tti_boldItalic_font_color").val(boldItalicFontColor);
    $("#use_strikethrough_color").prop("checked", useStrikethroughColor);
    $("#tti_strikethrough_font_color").val(strikethroughFontColor);
    $("#use_underline_color").prop("checked", useUnderlineColor);
    $("#tti_underline_font_color").val(underlineFontColor);
    $("#use_quotes_color").prop("checked", useQuotesColor);
    $("#tti_quotes_font_color").val(quotesFontColor);
    $("#tti_blockquote_font_color").val(blockquoteFontColor || defaultSettings.blockquoteFontColor);
    $("#tti_blockquote_bg_color").val(blockquoteBgColor || defaultSettings.blockquoteBgColor);
    $("#tti_blockquote_border_color").val(blockquoteBorderColor || defaultSettings.blockquoteBorderColor);
    $("#tti_stroke_width").val(strokeWidth);
    $("#tti_line_break").val(lineBreak);
    $("#tti_ratio").val(imageRatio);
    $("#tti_fill_mode").val(imageFillMode);
    $("#use_background_color").prop("checked", useBackgroundColor);
    $("#background_color").val(backgroundColor);
    $("#use_second_background_color").prop("checked", useSecondBackgroundColor);
    $("#second_background_color").val(secondBackgroundColor);
    $("#bg_blur").val(bgBlur);
    $("#bg_brightness").val(bgBrightness);
    $("#bg_hue").val(bgHue);
    $("#bg_grayscale").val(bgGrayscale);
    $("#bg_noise").val(bgNoise);
    $("#overlay_opacity").val(overlayOpacity);
    $("#overlay_color").val(overlayColor);
    $("#footer_layout_mode").val(getFooterLayoutMode(extension_settings[extensionName]));
    $("#footer_width").val(parsePositiveInt(footerWidth, defaultSettings.footerWidth));
    $("#footer_height").val(parsePositiveInt(footerHeight, defaultSettings.footerHeight));
    $("#preview_toggle").prop("checked", autoPreview);
    $("#html_toggle").prop("checked", htmlMode);
    $("#letter_control").prop("checked", letterCase);
    $("#unit_control").prop("checked", unitControl);

    highlighterTags();
    renderReplaceRules();
    syncMetaUIState();
    applyHtmlModeUIState();
    updateFooterLayoutUIState();
    syncSteppers();
    syncRatioButtons();
    syncOverlayColorButtons();
    updateTextLengthBadge();

    if (currentPreset && extension_settings[extensionName].presets[currentPreset]) {
        applyPreset(currentPreset);
    } else {
        refreshPreview();
    }
    loadStartupAssets();
}
function loadStartupAssets() {
    Promise.allSettled([loadFonts(), loadBG(), loadBackgroundURLMap()]).then(() => {
        syncSelectedBackgroundUI();
        refreshPreview();
    });
}

// 프리셋
function presetUI() {
    $("#create_preset").on("click", createPreset);
    $("#save_preset, #save_preset_modal").on("click", savePreset);
    $("#delete_preset").on("click", deletePreset);
    $("#rename_preset").on("click", renamePreset);
    $("#preset_selector").on("change", selectPreset);

    loadPresetList();
}
function syncPresetModalState() {
    const selected = $("#preset_selector").val();
    const hasPreset = !!selected && selected !== "nonePreset";
    $("#tti_preset_current_name").text(hasPreset ? selected : "선택된 프리셋 없음");
    $("#save_preset_modal, #rename_preset, #delete_preset, #backup_preset").prop("disabled", !hasPreset);
    $("#save_preset").prop("disabled", !hasPreset);
}
function getPresetSettings() {
    const settings = {...extension_settings[extensionName]};
    delete settings.presets;
    delete settings.currentPreset;
    delete settings.dragOnlyFloat;
    delete settings.mesButtonEnabled;
    delete settings.extMenuShortcut;
    delete settings.autoOrganize;
    delete settings.uiTheme;
    const imageFontSize = parseInt($("#tti_font_size_image").val(), 10);
    const htmlFontSize = parseInt($("#tti_font_size_html").val(), 10);
    settings.fontSizeImage = Number.isFinite(imageFontSize) ? imageFontSize : settings.fontSizeImage || defaultSettings.fontSizeImage;
    settings.fontSizeHtml = Number.isFinite(htmlFontSize) ? htmlFontSize : settings.fontSizeHtml || defaultSettings.fontSizeHtml;
    settings.fontSize = settings.htmlMode ? settings.fontSizeHtml : settings.fontSizeImage;
    settings.htmlFontFace = normalizeHtmlFontFace($("#tti_html_font_face").val());

    if (currentCustomFont && oriFontFamily) {
        settings.fontFamily = oriFontFamily;
    }

    settings.replaceRules = normalizeReplaceRules($("#tti_replace_list .replacement-rule").length ? collectReplaceRulesFromUI() : settings.replaceRules);
    delete settings.originalWord1;
    delete settings.replacementWord1;
    delete settings.originalWord2;
    delete settings.replacementWord2;
    delete settings.originalWord3;
    delete settings.replacementWord3;
    delete settings.originalWord4;
    delete settings.replacementWord4;
    settings.useBackgroundColor = $("#use_background_color").prop("checked");
    settings.backgroundColor = $("#background_color").val();
    settings.useSecondBackgroundColor = $("#use_second_background_color").prop("checked");
    settings.secondBackgroundColor = $("#second_background_color").val();
    settings.blockquoteFontColor = $("#tti_blockquote_font_color").val();
    settings.blockquoteBgColor = $("#tti_blockquote_bg_color").val();
    settings.blockquoteBorderColor = $("#tti_blockquote_border_color").val();
    settings.footerLayoutMode = $("#footer_layout_mode").val();
    settings.footerWidth = parsePositiveInt($("#footer_width").val(), defaultSettings.footerWidth);
    settings.footerHeight = parsePositiveInt($("#footer_height").val(), defaultSettings.footerHeight);
    settings.autoPreview = $("#preview_toggle").prop("checked");
    settings.htmlMode = $("#html_toggle").prop("checked");
    settings.fontSize = settings.htmlMode ? settings.fontSizeHtml : settings.fontSizeImage;
    settings.setHighlighterTags = JSON.parse(JSON.stringify(extension_settings[extensionName].setHighlighterTags || []));

    return settings;
}
function createPreset() {
    const presetName = $("#preset_name").val().trim();
    if (!presetName) {
        alert("프리셋 이름을 입력하세요.");
        return;
    }

    const presets = extension_settings[extensionName].presets || {};
    if (presets[presetName]) {
        const confirmOverwrite = confirm("같은 이름의 프리셋이 이미 존재합니다. 덮어쓰시겠습니까?");
        if (!confirmOverwrite) return;
    }
    const currentSettings = getPresetSettings();
    currentSettings.htmlMode = $("#html_toggle").prop("checked");
    presets[presetName] = currentSettings;
    extension_settings[extensionName].presets = presets;
    extension_settings[extensionName].currentPreset = presetName;
    updatePresetSelector(presetName);
    saveSettings();
}
function savePreset() {
    const presetName = $("#preset_selector").val();
    const currentSettings = getPresetSettings();
    currentSettings.htmlMode = $("#html_toggle").prop("checked");
    extension_settings[extensionName].presets[presetName] = currentSettings;
    saveSettings();
    toastr.success("프리셋이 저장되었습니다");
}
function renamePreset() {
    const oldName = $("#preset_selector").val();
    if (oldName === "nonePreset") {
        return;
    }

    let newName = prompt("프리셋 이름 재설정", oldName);
    if (!newName || newName.trim() === "") {
        return;
    }
    newName = newName.trim();
    const presets = extension_settings[extensionName].presets;
    if (newName === oldName) {
        return;
    }
    if (presets[newName]) {
        const confirmOverwrite = confirm("같은 이름의 프리셋이 이미 존재합니다. 덮어쓰시겠습니까?");
        if (!confirmOverwrite) return;
    }
    presets[newName] = {...presets[oldName]};
    delete presets[oldName];
    if (extension_settings[extensionName].currentPreset === oldName) {
        extension_settings[extensionName].currentPreset = newName;
    }
    saveSettings();
    updatePresetSelector(newName);
}
function deletePreset() {
    const presetName = $("#preset_selector").val();
    const presets = extension_settings[extensionName].presets;
    delete presets[presetName];

    if (extension_settings[extensionName].currentPreset === presetName) {
        extension_settings[extensionName].currentPreset = null;

        const _dragOnlyFloat = extension_settings[extensionName].dragOnlyFloat;
        const _mesButtonEnabled = extension_settings[extensionName].mesButtonEnabled;
        const _extMenuShortcut = extension_settings[extensionName].extMenuShortcut;
        const _autoOrganize = extension_settings[extensionName].autoOrganize;
        extension_settings[extensionName] = {
            ...defaultSettings,
            uiTheme: extension_settings[extensionName].uiTheme,
            presets: extension_settings[extensionName].presets,
            webFonts: getWebFonts(),
            currentPreset: null,
            dragOnlyFloat: _dragOnlyFloat,
            mesButtonEnabled: _mesButtonEnabled,
            extMenuShortcut: _extMenuShortcut,
            autoOrganize: _autoOrganize,
        };

        $("#tti_font_family").val(defaultSettings.fontFamily);
        $("#tti_font_size_image").val(defaultSettings.fontSizeImage);
        $("#tti_font_size_html").val(defaultSettings.fontSizeHtml);
        $("#tti_html_font_face").val(defaultSettings.htmlFontFace);
        $("#tti_letter_spacing").val(defaultSettings.fontSpacing);
        $("#tti_line_height").val(defaultSettings.fontLineHeight);
        $("#tti_font_align").val(defaultSettings.fontAlign);
        $("#tti_font_color").val(defaultSettings.fontColor);
        $("#use_italic_color").prop("checked", defaultSettings.useItalicColor);
        $("#tti_italic_font_color").val(defaultSettings.italicFontColor);
        $("#use_bold_color").prop("checked", defaultSettings.useBoldColor);
        $("#tti_bold_font_color").val(defaultSettings.boldFontColor);
        $("#use_boldItalic_color").prop("checked", defaultSettings.useBoldItalicColor);
        $("#tti_boldItalic_font_color").val(defaultSettings.boldItalicFontColor);
        $("#use_strikethrough_color").prop("checked", defaultSettings.useStrikethroughColor);
        $("#tti_strikethrough_font_color").val(defaultSettings.strikethroughFontColor);
        $("#use_underline_color").prop("checked", defaultSettings.useUnderlineColor);
        $("#tti_underline_font_color").val(defaultSettings.underlineFontColor);
        $("#use_quotes_color").prop("checked", defaultSettings.useQuotesColor);
        $("#tti_quotes_font_color").val(defaultSettings.quotesFontColor);
        $("#tti_quotes_font_color").val(defaultSettings.quotesFontColor);
        $("#tti_blockquote_font_color").val(defaultSettings.blockquoteFontColor);
        $("#tti_blockquote_bg_color").val(defaultSettings.blockquoteBgColor);
        $("#tti_blockquote_border_color").val(defaultSettings.blockquoteBorderColor);
        $("#tti_stroke_width").val(defaultSettings.strokeWidth);
        $("#tti_line_break").val(defaultSettings.lineBreak);
        $("#tti_ratio").val(defaultSettings.imageRatio);
        $("#tti_fill_mode").val(defaultSettings.imageFillMode);
        $("#bg_blur").val(defaultSettings.bgBlur);
        $("#bg_brightness").val(defaultSettings.bgBrightness);
        $("#bg_hue").val(defaultSettings.bgHue);
        $("#bg_grayscale").val(defaultSettings.bgGrayscale);
        $("#bg_noise").val(defaultSettings.bgNoise);
        $("#overlay_opacity").val(defaultSettings.overlayOpacity);
        $("#overlay_color").val(defaultSettings.overlayColor);
        setReplaceRules([]);
        renderReplaceRules();
        $("#use_background_color").prop("checked", defaultSettings.useBackgroundColor);
        $("#background_color").val(defaultSettings.backgroundColor);
        $("#use_second_background_color").prop("checked", defaultSettings.useSecondBackgroundColor);
        $("#second_background_color").val(defaultSettings.secondBackgroundColor);
        syncSelectedBackgroundUI();
        $("#footer_layout_mode").val(defaultSettings.footerLayoutMode);
        $("#footer_width").val(defaultSettings.footerWidth);
        $("#footer_height").val(defaultSettings.footerHeight);
        $("#preview_toggle").prop("checked", defaultSettings.autoPreview);
        $("#html_toggle").prop("checked", defaultSettings.htmlMode);
        $("#letter_control").prop("checked", defaultSettings.letterCase);
        $("#unit_control").prop("checked", defaultSettings.unitControl);
        extension_settings[extensionName].setHighlighterTags = [];
        extension_settings[extensionName].replaceRules = [];
        extension_settings[extensionName].chatTitleMode = defaultSettings.chatTitleMode;
        extension_settings[extensionName].chatTitleCustom = defaultSettings.chatTitleCustom;
        extension_settings[extensionName].charNameMode = defaultSettings.charNameMode;
        extension_settings[extensionName].charNameCustom = defaultSettings.charNameCustom;
        extension_settings[extensionName].useWatermark = defaultSettings.useWatermark;

        highlighterTags();
        renderReplaceRules();
        syncMetaUIState();
        applyHtmlModeUIState();
        loadCustomBG();
        updateFooterLayoutUIState();
        syncSteppers();
        syncRatioButtons();
        syncOverlayColorButtons();
    }
    saveSettings();
    updatePresetSelector();
}
function selectPreset() {
    const presetName = $(this).val();
    if (currentCustomFont && presetName && presetName !== "nonePreset") {
        const presets = extension_settings[extensionName].presets;
        const preset = presets[presetName];
        if (preset && preset.fontFamily) {
            oriFontFamily = preset.fontFamily;
        }
    }

    if (presetName === "nonePreset") {
        const _dragOnlyFloat = extension_settings[extensionName].dragOnlyFloat;
        const _mesButtonEnabled = extension_settings[extensionName].mesButtonEnabled;
        const _extMenuShortcut = extension_settings[extensionName].extMenuShortcut;
        const _autoOrganize = extension_settings[extensionName].autoOrganize;
        extension_settings[extensionName] = {
            ...defaultSettings,
            uiTheme: extension_settings[extensionName].uiTheme,
            presets: extension_settings[extensionName].presets,
            webFonts: getWebFonts(),
            currentPreset: null,
            dragOnlyFloat: _dragOnlyFloat,
            mesButtonEnabled: _mesButtonEnabled,
            extMenuShortcut: _extMenuShortcut,
            autoOrganize: _autoOrganize,
        };

        if (currentCustomFont) {
            extension_settings[extensionName].fontFamily = currentCustomFont;
            oriFontFamily = defaultSettings.fontFamily;
        }
        $("#tti_font_family").val(defaultSettings.fontFamily);
        $("#tti_font_size_image").val(defaultSettings.fontSizeImage);
        $("#tti_font_size_html").val(defaultSettings.fontSizeHtml);
        $("#tti_html_font_face").val(defaultSettings.htmlFontFace);
        $("#tti_letter_spacing").val(defaultSettings.fontSpacing);
        $("#tti_line_height").val(defaultSettings.fontLineHeight);
        $("#tti_font_align").val(defaultSettings.fontAlign);
        $("#tti_font_color").val(defaultSettings.fontColor);
        $("#use_italic_color").prop("checked", defaultSettings.useItalicColor);
        $("#tti_italic_font_color").val(defaultSettings.italicFontColor);
        $("#use_bold_color").prop("checked", defaultSettings.useBoldColor);
        $("#tti_bold_font_color").val(defaultSettings.boldFontColor);
        $("#use_boldItalic_color").prop("checked", defaultSettings.useBoldItalicColor);
        $("#tti_boldItalic_font_color").val(defaultSettings.boldItalicFontColor);
        $("#use_strikethrough_color").prop("checked", defaultSettings.useStrikethroughColor);
        $("#tti_strikethrough_font_color").val(defaultSettings.strikethroughFontColor);
        $("#use_underline_color").prop("checked", defaultSettings.useUnderlineColor);
        $("#tti_underline_font_color").val(defaultSettings.underlineFontColor);
        $("#tti_blockquote_font_color").val(defaultSettings.blockquoteFontColor);
        $("#tti_blockquote_bg_color").val(defaultSettings.blockquoteBgColor);
        $("#tti_blockquote_border_color").val(defaultSettings.blockquoteBorderColor);
        $("#tti_stroke_width").val(defaultSettings.strokeWidth);
        $("#tti_line_break").val(defaultSettings.lineBreak);
        $("#tti_ratio").val(defaultSettings.imageRatio);
        $("#tti_fill_mode").val(defaultSettings.imageFillMode);
        $("#bg_blur").val(defaultSettings.bgBlur);
        $("#bg_brightness").val(defaultSettings.bgBrightness);
        $("#bg_hue").val(defaultSettings.bgHue);
        $("#bg_grayscale").val(defaultSettings.bgGrayscale);
        $("#bg_noise").val(defaultSettings.bgNoise);
        $("#overlay_opacity").val(defaultSettings.overlayOpacity);
        $("#overlay_color").val(defaultSettings.overlayColor);
        setReplaceRules([]);
        renderReplaceRules();
        $("#use_background_color").prop("checked", defaultSettings.useBackgroundColor);
        $("#background_color").val(defaultSettings.backgroundColor);
        $("#use_second_background_color").prop("checked", defaultSettings.useSecondBackgroundColor);
        $("#second_background_color").val(defaultSettings.secondBackgroundColor);
        syncSelectedBackgroundUI();
        $("#footer_layout_mode").val(defaultSettings.footerLayoutMode);
        $("#footer_width").val(defaultSettings.footerWidth);
        $("#footer_height").val(defaultSettings.footerHeight);
        $("#preview_toggle").prop("checked", defaultSettings.autoPreview);
        $("#html_toggle").prop("checked", defaultSettings.htmlMode);
        $("#letter_control").prop("checked", defaultSettings.letterCase);
        $("#unit_control").prop("checked", defaultSettings.unitControl);

        extension_settings[extensionName].setHighlighterTags = [];
        highlighterTags();
        renderReplaceRules();
        syncMetaUIState();
        applyHtmlModeUIState();
        loadCustomBG();
        updateFooterLayoutUIState();
        syncSteppers();
        syncRatioButtons();
        syncOverlayColorButtons();

        refreshPreview();
    } else if (presetName) {
        extension_settings[extensionName].currentPreset = presetName;
        applyPreset(presetName);
    } else {
        extension_settings[extensionName].currentPreset = null;
    }
    saveSettings();
}
function applyPreset(presetName) {
    const presets = extension_settings[extensionName].presets;
    const preset = presets[presetName];
    if (!preset) return;
    const presetHtmlMode = !!preset.htmlMode;

    extension_settings[extensionName].htmlMode = presetHtmlMode;
    $("#html_toggle").prop("checked", presetHtmlMode);

    const presetRules = normalizeReplaceRules(preset.replaceRules);
    setReplaceRules(presetRules.length ? presetRules : migrateLegacyReplaceRules(preset));
    renderReplaceRules();

    for (const [key, value] of Object.entries(preset)) {
        if (["originalWord1", "replacementWord1", "originalWord2", "replacementWord2", "originalWord3", "replacementWord3", "originalWord4", "replacementWord4", "replaceRules", "setHighlighterTags", "fontSize", "fontSizeImage", "fontSizeHtml", "dragOnlyFloat", "mesButtonEnabled", "extMenuShortcut", "autoOrganize"].includes(key)) {
            continue;
        }

        if (key === "fontFamily" && currentCustomFont) {
            oriFontFamily = value;
            $("#tti_font_family").val(value);
            continue;
        }
        extension_settings[extensionName][key] = value;

        switch (key) {
            case "fontFamily":
                $("#tti_font_family").val(value);
                break;
            case "htmlFontFace":
                extension_settings[extensionName].htmlFontFace = normalizeHtmlFontFace(value);
                $("#tti_html_font_face").val(extension_settings[extensionName].htmlFontFace);
                break;
            case "fontSpacing":
                $("#tti_letter_spacing").val(value);
                break;
            case "fontLineHeight":
                $("#tti_line_height").val(value);
                break;
            case "fontAlign":
                $("#tti_font_align").val(value);
                break;
            case "fontColor":
                $("#tti_font_color").val(value);
                break;
            case "useItalicColor":
                $("#use_italic_color").prop("checked", value);
                break;
            case "italicFontColor":
                $("#tti_italic_font_color").val(value);
                break;
            case "useBoldColor":
                $("#use_bold_color").prop("checked", value);
                break;
            case "boldFontColor":
                $("#tti_bold_font_color").val(value);
                break;
            case "useBoldItalicColor":
                $("#use_boldItalic_color").prop("checked", value);
                break;
            case "boldItalicFontColor":
                $("#tti_boldItalic_font_color").val(value);
                break;
            case "useStrikethroughColor":
                $("#use_strikethrough_color").prop("checked", value);
                break;
            case "strikethroughFontColor":
                $("#tti_strikethrough_font_color").val(value);
                break;
            case "useUnderlineColor":
                $("#use_underline_color").prop("checked", value);
                break;
            case "underlineFontColor":
                $("#tti_underline_font_color").val(value);
                break;
            case "useQuotesColor":
                $("#use_quotes_color").prop("checked", value);
                break;
            case "quotesFontColor":
                $("#tti_quotes_font_color").val(value);
                break;
            case "blockquoteFontColor":
                $("#tti_blockquote_font_color").val(value || defaultSettings.blockquoteFontColor);
                break;
            case "blockquoteBgColor":
                $("#tti_blockquote_bg_color").val(value || defaultSettings.blockquoteBgColor);
                break;
            case "blockquoteBorderColor":
                $("#tti_blockquote_border_color").val(value || defaultSettings.blockquoteBorderColor);
                break;
            case "strokeWidth":
                $("#tti_stroke_width").val(value);
                break;
            case "lineBreak":
                $("#tti_line_break").val(value);
                break;
            case "imageRatio":
                $("#tti_ratio").val(value);
                break;
            case "imageFillMode":
                $("#tti_fill_mode").val(value);
                break;
            case "bgBlur":
                $("#bg_blur").val(value);
                break;
            case "bgBrightness":
                $("#bg_brightness").val(value);
                break;
            case "bgHue":
                $("#bg_hue").val(value);
                break;
            case "bgGrayscale":
                $("#bg_grayscale").val(value);
                break;
            case "bgNoise":
                $("#bg_noise").val(value);
                break;
            case "overlayOpacity":
                $("#overlay_opacity").val(value);
                break;
            case "overlayColor":
                $("#overlay_color").val(value);
                break;
            case "selectedBackgroundImage":
                syncSelectedBackgroundUI();
                break;
            case "selectedBackgroundImageHtml":
                syncSelectedBackgroundUI();
                break;
            case "useBackgroundColor":
                $("#use_background_color").prop("checked", value);
                break;
            case "backgroundColor":
                $("#background_color").val(value);
                break;
            case "useSecondBackgroundColor":
                $("#use_second_background_color").prop("checked", value);
                break;
            case "secondBackgroundColor":
                $("#second_background_color").val(value);
                break;
            case "footerLayoutMode":
                $("#footer_layout_mode").val(getFooterLayoutMode({footerLayoutMode: value}));
                updateFooterLayoutUIState();
                break;
            case "footerWidth":
                $("#footer_width").val(parsePositiveInt(value, defaultSettings.footerWidth));
                break;
            case "footerHeight":
                $("#footer_height").val(parsePositiveInt(value, defaultSettings.footerHeight));
                break;
            case "autoPreview":
                $("#preview_toggle").prop("checked", value);
                break;
            case "htmlMode":
                $("#html_toggle").prop("checked", value);
                break;
            case "letterCase":
                $("#letter_control").prop("checked", value);
                break;
            case "unitControl":
                $("#unit_control").prop("checked", value);
                break;
            case "chatTitleMode":
            case "charNameMode":
                extension_settings[extensionName][key] = normalizeMetaMode(value);
                break;
        }
    }

    if (!Object.prototype.hasOwnProperty.call(preset, "blockquoteFontColor")) {
        extension_settings[extensionName].blockquoteFontColor = defaultSettings.blockquoteFontColor;
        $("#tti_blockquote_font_color").val(defaultSettings.blockquoteFontColor);
    }
    if (!Object.prototype.hasOwnProperty.call(preset, "blockquoteBgColor")) {
        extension_settings[extensionName].blockquoteBgColor = defaultSettings.blockquoteBgColor;
        $("#tti_blockquote_bg_color").val(defaultSettings.blockquoteBgColor);
    }
    if (!Object.prototype.hasOwnProperty.call(preset, "blockquoteBorderColor")) {
        extension_settings[extensionName].blockquoteBorderColor = defaultSettings.blockquoteBorderColor;
        $("#tti_blockquote_border_color").val(defaultSettings.blockquoteBorderColor);
    }
    if (!Object.prototype.hasOwnProperty.call(preset, "htmlFontFace")) {
        extension_settings[extensionName].htmlFontFace = defaultSettings.htmlFontFace;
        $("#tti_html_font_face").val(defaultSettings.htmlFontFace);
    }

    const presetImageFontSize = parseInt(preset.fontSizeImage, 10);
    const presetHtmlFontSize = parseInt(preset.fontSizeHtml, 10);
    const legacyPresetFontSize = parseInt(preset.fontSize, 10);
    extension_settings[extensionName].fontSizeImage =
        Number.isFinite(presetImageFontSize) ? presetImageFontSize
        : Number.isFinite(legacyPresetFontSize) ? legacyPresetFontSize
        : defaultSettings.fontSizeImage;
    extension_settings[extensionName].fontSizeHtml = Number.isFinite(presetHtmlFontSize) ? presetHtmlFontSize : defaultSettings.fontSizeHtml;
    extension_settings[extensionName].fontSize = isHtmlModeEnabled() ? extension_settings[extensionName].fontSizeHtml : extension_settings[extensionName].fontSizeImage;
    $("#tti_font_size_image").val(extension_settings[extensionName].fontSizeImage);
    $("#tti_font_size_html").val(extension_settings[extensionName].fontSizeHtml);

    if (preset.setHighlighterTags) {
        extension_settings[extensionName].setHighlighterTags = JSON.parse(JSON.stringify(preset.setHighlighterTags));
    } else {
        extension_settings[extensionName].setHighlighterTags = [];
    }

    ensureHighlightTagNames();
    highlighterTags();
    syncMetaUIState();
    applyHtmlModeUIState();
    updateFooterLayoutUIState();
    syncSteppers();
    syncRatioButtons();
    syncOverlayColorButtons();
    loadCustomBG();
    syncSelectedBackgroundUI();
    saveSettings();
    refreshPreview();
}
function loadPresetList() {
    if (!extension_settings[extensionName].presets) {
        extension_settings[extensionName].presets = {};
    }
    const presets = extension_settings[extensionName].presets;
    updatePresetSelector(extension_settings[extensionName].currentPreset);
}
function updatePresetSelector(selectedPreset = null) {
    const presets = extension_settings[extensionName].presets || {};
    const $selector = $("#preset_selector").empty();

    $selector.append('<option value="nonePreset">선택된 프리셋 없음</option>');

    Object.keys(presets)
        .sort()
        .forEach((name) => {
            $selector.append(`<option value="${name}">${name}</option>`);
        });

    if (selectedPreset && presets[selectedPreset]) {
        $selector.val(selectedPreset);
    } else if (extension_settings[extensionName].currentPreset) {
        $selector.val(extension_settings[extensionName].currentPreset);
    }
    syncPresetModalState();
}
function backupPreset() {
    const presetName = $("#preset_selector").val();
    const presets = extension_settings[extensionName].presets;
    const presetData = {
        name: presetName,
        settings: presets[presetName],
    };
    const dataStr = JSON.stringify(presetData, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileName = `${presetName}.json`;
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileName);
    linkElement.click();
}
function importPreset(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    const fileReader = new FileReader();
    fileReader.onload = function (e) {
        const presetData = JSON.parse(e.target.result);
        let importName = presetData.name;
        const presets = extension_settings[extensionName].presets;
        if (presets[importName]) {
            let counter = 1;
            let newName = `${importName}_${counter}`;
            while (presets[newName]) {
                counter++;
                newName = `${importName}_${counter}`;
            }
            importName = newName;
        }
        presets[importName] = presetData.settings;
        extension_settings[extensionName].currentPreset = importName;
        saveSettings();
        updatePresetSelector(importName);
        applyPreset(importName);
        event.target.value = "";
    };
    fileReader.readAsText(file);
}
function presetBackupSys() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "presetBackupSys";
    fileInput.accept = ".json";
    fileInput.style.display = "none";
    fileInput.addEventListener("change", importPreset);
    document.body.appendChild(fileInput);
    $("#backup_preset").on("click", backupPreset);
    $("#import_preset").on("click", function () {
        $("#presetBackupSys").click();
    });
}

// 폰트 패밀리
async function fontFamily(event) {
    extension_settings[extensionName].fontFamily = event.target.value;
    debouncedSaveSettings();
    await ensureFontFamilyLoaded(extension_settings[extensionName].fontFamily);
    refreshPreview();
}

const fontLoadCache = new Map();
function getCSSFontFamily(fontFamily) {
    return `"${String(fontFamily || defaultSettings.fontFamily)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')}"`;
}
function getFontLoadDescriptor(fontFamily) {
    return `1em ${getCSSFontFamily(fontFamily)}`;
}
async function ensureFontFamilyLoaded(fontFamily) {
    if (!fontFamily || fontFamily === "useGlobal" || !document.fonts?.load) return;
    const descriptor = getFontLoadDescriptor(fontFamily);
    if (document.fonts.check?.(descriptor)) return;

    if (!fontLoadCache.has(fontFamily)) {
        const loadPromise = Promise.race([document.fonts.load(descriptor), new Promise((resolve) => setTimeout(resolve, 2500))])
            .catch((error) => {
                console.warn("[txt-to-img] 폰트 로드 대기 실패:", fontFamily, error);
            })
            .finally(() => {
                fontLoadCache.delete(fontFamily);
            });
        fontLoadCache.set(fontFamily, loadPromise);
    }

    await fontLoadCache.get(fontFamily);
}
async function ensurePreviewFontsLoaded() {
    const settings = extension_settings[extensionName] || {};
    const families = new Set([settings.fontFamily, getHtmlFontFace(settings)]);

    (settings.setHighlighterTags || []).forEach((tag) => {
        if (tag?.fontFamily && tag.fontFamily !== "useGlobal") {
            families.add(tag.fontFamily);
        }
        if (tag?.htmlFontFamily && tag.htmlFontFamily !== "useGlobal") {
            families.add(tag.htmlFontFamily);
        }
    });

    await Promise.all(Array.from(families).map(ensureFontFamilyLoaded));
}
function warmupFonts(fonts) {
    if (!document.fonts?.load || !Array.isArray(fonts)) return;
    fonts.forEach((font, index) => {
        setTimeout(() => {
            ensureFontFamilyLoaded(font.value).catch(() => {});
        }, index * 80);
    });
}

// 폰트 로드
async function loadFonts() {
    try {
        const fonts = await fetchExtensionJSON("font-family.json");
        fonts.sort((a, b) => a.label.localeCompare(b.label));
        const select = $("#tti_font_family").empty();

        fonts.forEach((font) => {
            select.append(`<option value="${font.value}">${font.label}</option>`);
        });

        prependWebFontOptions(select[0], "image", extension_settings[extensionName].fontFamily);
        select.val(extension_settings[extensionName].fontFamily);
        await ensureFontFamilyLoaded(extension_settings[extensionName].fontFamily);
        warmupFonts(fonts);
        refreshPreview();
    } catch (e) {
        console.warn("[txt-to-img] 폰트 로드 실패:", e);
    }
}

// 로컬 폰트 로드
let currentCustomFont = null;
let oriFontFamily = null;
function addLocalFont() {
    if (isHtmlModeEnabled()) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ttf,.otf,.woff,.woff2";

    input.onchange = function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const checkFontFormat = [".ttf", ".otf", ".woff", ".woff2"];
        const fontFormat = "." + file.name.split(".").pop().toLowerCase();

        if (!checkFontFormat.includes(fontFormat)) {
            alert(".ttf, .otf, .woff, .woff2 형식의 파일만 등록할 수 있습니다.");
            return;
        }

        const fontReader = new FileReader();
        fontReader.onload = function (e) {
            const fontData = e.target.result;
            const fontName = "CustomFont_" + Date.now();

            const fontFace = new FontFace(fontName, fontData);

            fontFace
                .load()
                .then(function (loadedFont) {
                    document.fonts.add(loadedFont);

                    if (!oriFontFamily) {
                        oriFontFamily = extension_settings[extensionName].fontFamily;
                    }

                    currentCustomFont = fontName;
                    extension_settings[extensionName].fontFamily = fontName;

                    $("#tti_font_family").prop("disabled", true);

                    $("#upload-local-font").text("로컬 폰트 변경");
                    $("#delete-local-font").prop("disabled", false);

                    applyHtmlModeUIState();
                    refreshPreview();
                })
                .catch(function (error) {
                    console.error("폰트 로드 실패:", error);
                    alert("폰트 파일을 등록할 수 없습니다.");
                });
        };

        fontReader.onerror = function () {
            alert("파일을 읽을 수 없습니다.");
        };

        fontReader.readAsArrayBuffer(file);
    };

    input.click();
}
function deleteLocalFont() {
    if (!currentCustomFont) return;

    if (document.fonts && currentCustomFont) {
        const fonts = Array.from(document.fonts);
        const customFontFamily = fonts.find((font) => font.family === currentCustomFont);
        if (customFontFamily) {
            document.fonts.delete(customFontFamily);
        }
    }

    extension_settings[extensionName].fontFamily = oriFontFamily || extension_settings[extensionName].fontFamily || "Pretendard-Regular";

    $("#tti_font_family").val(extension_settings[extensionName].fontFamily).prop("disabled", false);

    currentCustomFont = null;
    oriFontFamily = null;

    $("#upload-local-font").text("로컬 폰트 등록");
    $("#delete-local-font").prop("disabled", true);

    applyHtmlModeUIState();
    saveSettings();
    refreshPreview();
}
function applyHtmlModeUIState() {
    const htmlMode = isHtmlModeEnabled();

    $("[data-html-hide]").toggleClass("html-mode-hidden", htmlMode);
    $("[data-html-only]").toggleClass("html-mode-only", !htmlMode);

    $("#tti_font_family").prop("disabled", htmlMode || !!currentCustomFont);
    $("#upload-local-font").prop("disabled", htmlMode);
    $("#delete-local-font").prop("disabled", htmlMode || !currentCustomFont);
    $("#tti_ratio").prop("disabled", htmlMode);
    $("#tti_fill_mode").prop("disabled", htmlMode);
    $("#bg_image_upload").prop("disabled", htmlMode);
    $("#bg_noise").prop("disabled", htmlMode);
    $("#bg_image_url").prop("disabled", !htmlMode);
    $("#bg_url_btn").prop("disabled", !htmlMode);
    $(".tag-font-family").prop("disabled", htmlMode);
    $(".tag-html-font-family").prop("disabled", !htmlMode);
    syncSteppers();
}

// 배경이미지 로드
async function loadBackgroundURLMap() {
    try {
        const backgroundURLs = await fetchExtensionJSON("backgrounds-list-url.json");

        defaultBackgroundUrlMap = new Map();
        defaultBackgroundBasenameMap = new Map();

        backgroundURLs.forEach((url) => {
            if (!url || typeof url !== "string") return;
            const fileName = getBackgroundFilename(url);
            if (!fileName) return;

            defaultBackgroundUrlMap.set(fileName, url);
            const baseName = fileName.replace(/\.[^/.]+$/, "");
            if (!defaultBackgroundBasenameMap.has(baseName)) {
                defaultBackgroundBasenameMap.set(baseName, url);
            }
        });
    } catch (error) {
        console.warn("[txt-to-img] backgrounds-list-url.json load failed", error);
    }
}
function getBackgroundFilename(pathLike) {
    if (!pathLike || typeof pathLike !== "string") return "";
    const filePart = pathLike.split("/").pop() || "";
    return decodeURIComponent(filePart.split("?")[0].trim()).toLowerCase();
}
function resolveBackgroundURLForHTML(backgroundValue) {
    if (!backgroundValue || typeof backgroundValue !== "string") return "";
    if (/^(https?:|data:|blob:)/i.test(backgroundValue)) {
        return backgroundValue;
    }

    const fileName = getBackgroundFilename(backgroundValue);
    if (!fileName) return backgroundValue;
    if (defaultBackgroundUrlMap.has(fileName)) {
        return defaultBackgroundUrlMap.get(fileName);
    }

    const baseName = fileName.replace(/\.[^/.]+$/, "");
    if (defaultBackgroundBasenameMap.has(baseName)) {
        return defaultBackgroundBasenameMap.get(baseName);
    }
    return backgroundValue;
}
async function loadBG() {
    try {
        const backgrounds = await fetchExtensionJSON("backgrounds-list.json");
        const gallery = $("#background_image_gallery").empty();
        const selectedBackground = getSelectedBackgroundForCurrentMode();
        const galleryHtml = backgrounds
            .map((bg) => {
                const bgPath = `${extensionFolderPath}/default-backgrounds/${bg}`;
                const isSelected = selectedBackground === bgPath;
                return `
        <div class="bg-image-item ${isSelected ? "selected" : ""}" data-path="${bgPath}">
          <img src="${bgPath}" alt="${bg}" loading="lazy" decoding="async" />
        </div>
      `;
            })
            .join("");
        gallery.html(galleryHtml);
        $(".bg-image-item").on("click", selectCanvasBG);
    } catch (e) {
        console.warn("[txt-to-img] 배경 목록 로드 실패:", e);
    }
}

const BG_DB_NAME = "txtToImgBackgrounds";
const BG_DB_VERSION = 1;
const BG_STORE_NAME = "backgrounds";

function openBgDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(BG_DB_NAME, BG_DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(BG_STORE_NAME)) {
                db.createObjectStore(BG_STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function migrateLocalStorageBgToIDB() {
    if (safeGetItem("txtToImg_bgMigrated") === "1") return;
    for (const key of [CUSTOM_BG_STORAGE_IMAGE_KEY, CUSTOM_BG_STORAGE_HTML_KEY]) {
        const raw = safeGetItem(key);
        if (!raw) continue;
        try {
            const entries = safeParseJSON(raw, null);
            if (!entries || typeof entries !== "object") continue;
            const db = await openBgDB();
            const tx = db.transaction(BG_STORE_NAME, "readwrite");
            const store = tx.objectStore(BG_STORE_NAME);
            for (const [name, data] of Object.entries(entries)) {
                store.put(data, `${key}::${name}`);
            }
            await new Promise((res, rej) => {
                tx.oncomplete = res;
                tx.onerror = rej;
            });
            db.close();
            safeRemoveItem(key);
        } catch (e) {
            console.warn("[txt-to-img] IndexedDB 마이그레이션 실패:", e);
        }
    }
    safeSetItem("txtToImg_bgMigrated", "1");
}

async function storeBackground(name, imageData, storageKey = getCustomBackgroundStorageKey()) {
    try {
        const db = await openBgDB();
        const tx = db.transaction(BG_STORE_NAME, "readwrite");
        tx.objectStore(BG_STORE_NAME).put(imageData, `${storageKey}::${name}`);
        await new Promise((res, rej) => {
            tx.oncomplete = res;
            tx.onerror = rej;
        });
        db.close();
    } catch (e) {
        console.warn("[txt-to-img] 배경 저장 실패:", e);
    }
}

async function deleteBackground(name, storageKey = getCustomBackgroundStorageKey()) {
    try {
        const db = await openBgDB();
        const tx = db.transaction(BG_STORE_NAME, "readwrite");
        tx.objectStore(BG_STORE_NAME).delete(`${storageKey}::${name}`);
        await new Promise((res, rej) => {
            tx.oncomplete = res;
            tx.onerror = rej;
        });
        db.close();
    } catch (e) {
        console.warn("[txt-to-img] 배경 삭제 실패:", e);
    }
}

// 커스텀 배경이미지 로드
let _loadCustomBGId = 0;
async function loadCustomBG(storageKey = getCustomBackgroundStorageKey()) {
    const loadId = ++_loadCustomBGId;
    const gallery = $("#custom_background_gallery").empty();
    try {
        const db = await openBgDB();
        if (loadId !== _loadCustomBGId) {
            db.close();
            return;
        }
        const tx = db.transaction(BG_STORE_NAME, "readonly");
        const store = tx.objectStore(BG_STORE_NAME);
        const prefix = `${storageKey}::`;
        const req = store.openCursor();
        req.onsuccess = function () {
            const cursor = this.result;
            if (!cursor) return;
            if (loadId === _loadCustomBGId && cursor.key.startsWith(prefix)) {
                const name = cursor.key.slice(prefix.length);
                addBGtoGallery(name, cursor.value, storageKey);
            }
            cursor.continue();
        };
        await new Promise((res, rej) => {
            tx.oncomplete = res;
            tx.onerror = rej;
        });
        db.close();
    } catch (e) {
        console.warn("[txt-to-img] 배경 로드 실패:", e);
    }
}
async function customBG() {
    $("#bg_image_upload").on("change", uploadImage);
    $("#bg_url_btn").on("click", uploadImageFromURL);
    await migrateLocalStorageBgToIDB();
    await loadCustomBG();
}
function uploadImageFromURL() {
    if (!isHtmlModeEnabled()) return;

    const url = $("#bg_image_url").val().trim();
    if (!url) return;

    const fileName = url.split("/").pop().split("?")[0] || "url-image-" + Date.now();
    const storageKey = getCustomBackgroundStorageKey();

    storeBackground(fileName, url, storageKey).then(() => {
        addBGtoGallery(fileName, url, storageKey);
        $("#bg_image_url").val("");
    });
}
function addBGtoGallery(name, imageData, storageKey = getCustomBackgroundStorageKey()) {
    const isSelected = getSelectedBackgroundForCurrentMode() === imageData;
    const bgElement = $(`
    <div class="bg-image-item ${isSelected ? "selected" : ""}" data-path="${imageData}" data-name="${name}" data-storage-key="${storageKey}">
      <img src="${imageData}" alt="${name}" loading="lazy" decoding="async" />
      <div class="delete-bg-btn">×</div>
    </div>
  `);
    $("#custom_background_gallery").append(bgElement);
    bgElement.on("click", selectCanvasBG);
    bgElement.find(".delete-bg-btn").on("click", removeCustomBg);
}

function uploadImage(event) {
    if (isHtmlModeEnabled()) return;

    const file = event.target.files[0];
    if (!file) return;
    const storageKey = getCustomBackgroundStorageKey();
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    img.onload = async () => {
        const max_size = 800;
        let width = img.width;
        let height = img.height;
        if (width > height && width > max_size) {
            height *= max_size / width;
            width = max_size;
        } else if (height > max_size) {
            width *= max_size / height;
            height = max_size;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        await storeBackground(file.name, imageData, storageKey);
        addBGtoGallery(file.name, imageData, storageKey);
        $("#bg_image_upload").val("");
    };
    const ImageReader = new FileReader();
    ImageReader.onload = (e) => {
        img.src = e.target.result;
    };
    ImageReader.readAsDataURL(file);
}
function removeCustomBg(event) {
    event.stopPropagation();
    const bgItem = $(this).closest(".bg-image-item");
    deleteBackground(bgItem.data("name"), bgItem.data("storage-key")).then(() => {
        bgItem.remove();
        if (bgItem.hasClass("selected")) {
            setSelectedBackgroundForCurrentMode(null);
            saveSettings();
            refreshPreview();
        }
    });
}

// 배경 & 이미지 편집
function useBackgroundColor(event) {
    extension_settings[extensionName].useBackgroundColor = event.target.checked;
    debouncedSaveSettings();
    refreshPreview();
}
function backgroundColor(event) {
    extension_settings[extensionName].backgroundColor = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function useSecondBackgroundColor(event) {
    extension_settings[extensionName].useSecondBackgroundColor = event.target.checked;
    debouncedSaveSettings();
    refreshPreview();
}
function secondBackgroundColor(event) {
    extension_settings[extensionName].secondBackgroundColor = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function addBlur(event) {
    extension_settings[extensionName].bgBlur = parseFloat(event.target.value);
    debouncedSaveSettings();
    refreshPreview();
}
function brightness(event) {
    extension_settings[extensionName].bgBrightness = parseFloat(event.target.value);
    debouncedSaveSettings();
    refreshPreview();
}
function hue(event) {
    extension_settings[extensionName].bgHue = parseFloat(event.target.value);
    debouncedSaveSettings();
    refreshPreview();
}
function grayScale(event) {
    extension_settings[extensionName].bgGrayscale = parseFloat(event.target.value);
    debouncedSaveSettings();
    refreshPreview();
}
function addNoise(event) {
    extension_settings[extensionName].bgNoise = parseInt(event.target.value);
    debouncedSaveSettings();
    refreshPreview();
}
function addOverlay(event) {
    extension_settings[extensionName].overlayOpacity = parseFloat(event.target.value);
    debouncedSaveSettings();
    refreshPreview();
}
function overlayColor(event) {
    extension_settings[extensionName].overlayColor = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function selectCanvasBG(event) {
    if ($(event.target).hasClass("delete-bg-btn")) return;
    const path = $(this).data("path");
    $(".bg-image-item").removeClass("selected");
    $(this).addClass("selected");
    setSelectedBackgroundForCurrentMode(path);
    debouncedSaveSettings();
    refreshPreview();
}
function getCanvasSize() {
    const ratio = extension_settings[extensionName].imageRatio;
    switch (ratio) {
        case "square":
            return {width: 700, height: 700};
        case "rectangular":
            return {width: 700, height: 1100};
        case "longer":
            return {width: 700, height: 2000};
        case "full":
            return {width: 700, height: null};
        default:
            return {width: 700, height: 700};
    }
}

function getRenderScale(width, height) {
    const MAX_AREA = 16000000;
    const MAX_SIDE = 8192;
    let scale = 2;
    while (scale > 1 && (width * scale * height * scale > MAX_AREA || Math.max(width, height) * scale > MAX_SIDE)) {
        scale -= 0.5;
    }
    return scale;
}
function aspectRatio(event) {
    extension_settings[extensionName].imageRatio = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function bgFillMode(event) {
    extension_settings[extensionName].imageFillMode = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}

// 단어 치환
function letterCase(event) {
    extension_settings[extensionName].letterCase = event.target.checked;
    debouncedSaveSettings();
}
function unitControl(event) {
    extension_settings[extensionName].unitControl = event.target.checked;
    debouncedSaveSettings();
}
function replaceWords(inputText) {
    const letterCase = extension_settings[extensionName].letterCase;
    const unitControl = extension_settings[extensionName].unitControl;

    const wordGroup = getReplaceRules()
        .filter((rule) => rule.enabled)
        .map((rule) => ({original: String(rule.original || "").trim(), replacement: rule.replacement}))
        .filter((group) => group.original);

    if (wordGroup.length === 0) {
        return String(inputText ?? "");
    }

    const applyWordReplacement = (inputText) => {
        let text = String(inputText ?? "");
        const originalTemp = wordGroup.map((_, index) => `__REPLACE_${Date.now()}_${index}__`);

        for (let i = 0; i < wordGroup.length; i++) {
            const {original} = wordGroup[i];
            const temp = originalTemp[i];
            const oriMulWord = original
                .split("||")
                .map((word) => word.trim())
                .filter((word) => word);

            for (const origWord of oriMulWord) {
                const containsKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(origWord);
                if (containsKorean) {
                    text = findKoreanWord(text, origWord, temp, unitControl);
                } else {
                    text = replaceString(text, origWord, temp, letterCase, unitControl);
                }
            }
        }

        for (let i = 0; i < wordGroup.length; i++) {
            const {replacement} = wordGroup[i];
            const temp = originalTemp[i];
            const replacementText = replacement !== undefined ? replacement : "";
            const regex = new RegExp(`${escapeRegExp(temp)}(은|는|이|가|을|를|과|와|이랑|랑|으로|로|아|야)?`, "g");

            text = text.replace(regex, (match, particle) => {
                if (!particle) {
                    return replacementText;
                }

                let newParticle = particle;
                const hasEndConsonant = hasConsonantLetter(replacementText);

                if (particle === "는" && hasEndConsonant) newParticle = "은";
                else if (particle === "은" && !hasEndConsonant) newParticle = "는";
                else if (particle === "가" && hasEndConsonant) newParticle = "이";
                else if (particle === "이" && !hasEndConsonant) newParticle = "가";
                else if (particle === "를" && hasEndConsonant) newParticle = "을";
                else if (particle === "을" && !hasEndConsonant) newParticle = "를";
                else if (particle === "아" && !hasEndConsonant) newParticle = "야";
                else if (particle === "야" && hasEndConsonant) newParticle = "아";
                else if (particle === "와" && hasEndConsonant) newParticle = "과";
                else if (particle === "과" && !hasEndConsonant) newParticle = "와";
                else if (particle === "랑" && hasEndConsonant) newParticle = "이랑";
                else if (particle === "이랑" && !hasEndConsonant) newParticle = "랑";
                else if (particle === "로" && hasEndConsonant) newParticle = "으로";
                else if (particle === "으로" && !hasEndConsonant) newParticle = "로";

                return replacementText + newParticle;
            });
        }

        return text;
    };

    return applyWordReplacement(inputText);
}
function replaceString(text, original, replacement, letterCase, unitControl) {
    const specialChar = /[\s\.,;:!?\(\)\[\]{}"'<>\/\\\-_=\+\*&\^%\$#@~`|]/;
    let result = "";

    for (let i = 0; i < text.length; i++) {
        if (i <= text.length - original.length && (letterCase ? text.slice(i, i + original.length) === original : text.slice(i, i + original.length).toLowerCase() === original.toLowerCase())) {
            const isStartBoundary = i === 0 || specialChar.test(text[i - 1]);
            const endPos = i + original.length;
            const nextChar = text[endPos] || "";
            const containSymbols = /[^\wa-zA-Z]/.test(original);

            if (unitControl) {
                const isEndBoundary = endPos === text.length || specialChar.test(nextChar) || !/[a-zA-Z0-9]/.test(nextChar);

                if (containSymbols || (isStartBoundary && isEndBoundary)) {
                    result += replacement;
                    i = endPos - 1;
                    continue;
                }
            } else {
                result += replacement;
                i = endPos - 1;
                continue;
            }
        }

        result += text[i];
    }

    return result;
}
function findKoreanWord(text, originalWord, replacementWord, unitControl) {
    const specialChar = /[\s\.,;:!?\(\)\[\]{}"'<>\/\\\-_=\+\*&\^%\$#@~`|]/;
    let result = "";

    for (let i = 0; i < text.length; i++) {
        if (i <= text.length - originalWord.length && text.slice(i, i + originalWord.length) === originalWord) {
            const endPos = i + originalWord.length;

            if (unitControl) {
                const isStartBoundary = i === 0 || specialChar.test(text[i - 1]);
                const nextChar = text[endPos] || "";
                const isEndBoundary = endPos === text.length || specialChar.test(nextChar) || !/[가-힣0-9]/.test(nextChar);

                if (isStartBoundary && isEndBoundary) {
                    result += replacementWord;
                    i = endPos - 1;
                    continue;
                }
            } else {
                result += replacementWord;
                i = endPos - 1;
                continue;
            }
        }
        result += text[i];
    }
    return result;
}
function hasConsonantLetter(word) {
    if (!word || word.length === 0) return false;
    const lastChar = word.charAt(word.length - 1);
    if (/[가-힣]/.test(lastChar)) {
        const charCode = lastChar.charCodeAt(0) - 44032;
        return charCode % 28 !== 0;
    }
    const hasJong = /[0136-8０１３６-８L-NRl-nrＬ-ＮＲㄱ-ㅎ\uFFA1-\uFFBE\u3165-\u3186\u1100-\u115E\u11A8-\u11FF]/;
    if (hasJong.test(lastChar)) {
        return true;
    }
    const noJong = /[2459２４５９A-KO-QS-Za-ko-qs-zＡ-ＫＯ-ＱＳ-Ｚㅏ-ㅣ\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC\u3187-\u318E\u1161-\u11A7]/;
    if (noJong.test(lastChar)) {
        return false;
    }
    return false;
}
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 텍스트 커스텀
function strokeWidth(event) {
    extension_settings[extensionName].strokeWidth = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function lineBreak(event) {
    extension_settings[extensionName].lineBreak = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function fontSizeImage(event) {
    const value = parseInt(event.target.value, 10) || defaultSettings.fontSizeImage;
    extension_settings[extensionName].fontSizeImage = value;
    if (!isHtmlModeEnabled()) {
        extension_settings[extensionName].fontSize = value;
    }
    debouncedSaveSettings();
    refreshPreview();
}
function fontSizeHtml(event) {
    const value = parseInt(event.target.value, 10) || defaultSettings.fontSizeHtml;
    extension_settings[extensionName].fontSizeHtml = value;
    if (isHtmlModeEnabled()) {
        extension_settings[extensionName].fontSize = value;
    }
    debouncedSaveSettings();
    refreshPreview();
}
function htmlFontFace(event) {
    extension_settings[extensionName].htmlFontFace = normalizeHtmlFontFace(event.target.value);
    debouncedSaveSettings();
    refreshPreview();
}
function fontSpacing(event) {
    extension_settings[extensionName].fontSpacing = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function fontLineHeight(event) {
    extension_settings[extensionName].fontLineHeight = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function fontAlign(event) {
    extension_settings[extensionName].fontAlign = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function fontColor(event) {
    extension_settings[extensionName].fontColor = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function useItalicColor(event) {
    extension_settings[extensionName].useItalicColor = event.target.checked;
    debouncedSaveSettings();
    refreshPreview();
}
function italicFontColor(event) {
    extension_settings[extensionName].italicFontColor = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function useBoldColor(event) {
    extension_settings[extensionName].useBoldColor = event.target.checked;
    debouncedSaveSettings();
    refreshPreview();
}
function boldFontColor(event) {
    extension_settings[extensionName].boldFontColor = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function useBoldItalicColor(event) {
    extension_settings[extensionName].useBoldItalicColor = event.target.checked;
    debouncedSaveSettings();
    refreshPreview();
}
function boldItalicFontColor(event) {
    extension_settings[extensionName].boldItalicFontColor = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function useStrikethroughColor(event) {
    extension_settings[extensionName].useStrikethroughColor = event.target.checked;
    debouncedSaveSettings();
    refreshPreview();
}
function strikethroughFontColor(event) {
    extension_settings[extensionName].strikethroughFontColor = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function useUnderlineColor(event) {
    extension_settings[extensionName].useUnderlineColor = event.target.checked;
    debouncedSaveSettings();
    refreshPreview();
}
function underlineFontColor(event) {
    extension_settings[extensionName].underlineFontColor = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function useQuotesColor(event) {
    extension_settings[extensionName].useQuotesColor = event.target.checked;
    saveSettings();
    refreshPreview();
}
function quotesFontColor(event) {
    extension_settings[extensionName].quotesFontColor = event.target.value;
    saveSettings();
    refreshPreview();
}
function blockquoteFontColor(event) {
    extension_settings[extensionName].blockquoteFontColor = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function blockquoteBgColor(event) {
    extension_settings[extensionName].blockquoteBgColor = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
function blockquoteBorderColor(event) {
    extension_settings[extensionName].blockquoteBorderColor = event.target.value;
    debouncedSaveSettings();
    refreshPreview();
}
// HTML 컨테이너
function footerLayoutMode(event) {
    extension_settings[extensionName].footerLayoutMode = event.target.value === "full" ? "full" : "scroll";
    updateFooterLayoutUIState();
    debouncedSaveSettings();
    refreshPreview();
}
function footerWidth(event) {
    extension_settings[extensionName].footerWidth = parsePositiveInt(event.target.value, defaultSettings.footerWidth);
    debouncedSaveSettings();
    refreshPreview();
}
function footerHeight(event) {
    extension_settings[extensionName].footerHeight = parsePositiveInt(event.target.value, defaultSettings.footerHeight);
    debouncedSaveSettings();
    refreshPreview();
}

// 미리보기
function autoPreview(event) {
    extension_settings[extensionName].autoPreview = event.target.checked;
    debouncedSaveSettings();
    if (event.target.checked) {
        refreshPreview();
    } else {
        $(".refresh-preview").addClass("shown");
    }
}
function htmlMode(event) {
    extension_settings[extensionName].htmlMode = event.target.checked;
    extension_settings[extensionName].fontSize = getActiveFontSize();
    saveSettings();
    applyHtmlModeUIState();
    updateFooterLayoutUIState();
    loadCustomBG();
    syncSelectedBackgroundUI();
    refreshPreview();
}
function getPreviewChunks() {
    const text = $("#text_to_image").val() || "";
    if (isHtmlModeEnabled()) {
        return [text];
    }

    const lineBreak = extension_settings[extensionName].lineBreak || "byWord";
    return wrappingTexts(replaceWords(text), lineBreak === "byWord" ? "word" : "char");
}
function updatePreviewDownloadAllButton(itemCount) {
    const $previewTitle = $("#image_preview_box h4");
    const $dlAllBtn = $previewTitle.find(".dl_all");

    if (itemCount >= 2 && !isHtmlModeEnabled()) {
        if ($dlAllBtn.length === 0) {
            const $newDlAllBtn = $('<div class="dl_all"><i class="fa-solid fa-circle-down"></i> 전체 다운로드</div>');
            $previewTitle.append($newDlAllBtn);
            $newDlAllBtn.on("click", () => {
                autoDownload("#image_preview_container .download-btn", 500);
            });
        }
        return;
    }

    $dlAllBtn.remove();
}
let previewIndex = 0;
function previewItemCount() {
    return $("#image_preview_container .image-preview-item").length;
}
function setPreviewIndex(index) {
    const total = previewItemCount();
    const $stage = $(".tti-preview-stage");
    if (!total) {
        previewIndex = 0;
        $stage.removeClass("has-multiple");
        $(".tti-preview-count").text("");
        return;
    }
    previewIndex = Math.min(Math.max(0, index), total - 1);
    const $items = $("#image_preview_container .image-preview-item");
    $items.removeClass("current").eq(previewIndex).addClass("current");
    $stage.toggleClass("has-multiple", total > 1);
    $(".tti-preview-count").text(total > 1 ? `${previewIndex + 1} / ${total}` : "");
    $(".tti-preview-arrow.previous").prop("disabled", previewIndex === 0);
    $(".tti-preview-arrow.next").prop("disabled", previewIndex === total - 1);
}
function setupPreviewCarousel() {
    $(document).on("click", ".tti-preview-arrow.previous", () => setPreviewIndex(previewIndex - 1));
    $(document).on("click", ".tti-preview-arrow.next", () => setPreviewIndex(previewIndex + 1));

    let swipeStartX = null;
    const stageSelector = ".tti-preview-stage";
    $(document).on("pointerdown", stageSelector, function (event) {
        if ($(event.target).closest(".tti-preview-arrow, .download-btn, .html-render-preview").length) return;
        swipeStartX = event.clientX;
    });
    $(document).on("pointerup pointercancel", stageSelector, function (event) {
        if (swipeStartX === null) return;
        const delta = event.clientX - swipeStartX;
        swipeStartX = null;
        if (Math.abs(delta) < 45) return;
        setPreviewIndex(previewIndex + (delta < 0 ? 1 : -1));
    });
}
function renderPreviewContent() {
    const mobileScroll = document.querySelector(".tti-mobile-ready .tti-mobile-scroll");
    const mobileScrollTop = mobileScroll?.scrollTop;
    const chunks = getPreviewChunks();
    const keepIndex = previewIndex;
    const $container = $("#image_preview_container").empty();

    chunks.forEach((chunk, i) => {
        $container.append(isHtmlModeEnabled() ? generateHTMLPreview(chunk, i) : generateTextImage(chunk, i));
    });

    updatePreviewDownloadAllButton(chunks.length);
    setPreviewIndex(keepIndex);
    if (mobileScroll && mobileScrollTop !== undefined) {
        mobileScroll.scrollTop = mobileScrollTop;
        requestAnimationFrame(() => {
            mobileScroll.scrollTop = mobileScrollTop;
        });
    }
}
const _debouncedRender = debounce(async () => {
    if (isPreviewEditing()) {
        previewEditPending = true;
        return;
    }
    await ensurePreviewFontsLoaded();
    if (isPreviewEditing()) {
        previewEditPending = true;
        return;
    }
    if (!extension_settings[extensionName].autoPreview) return;
    renderPreviewContent();
}, 150);
let previewEditPending = false;
function isPreviewEditing() {
    const element = document.activeElement;
    return !!element?.closest(".text-to-image-converter-settings, .tti-modal-backdrop") && (element.matches('textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"])') || element.isContentEditable);
}
function setupPreviewEditDeferral() {
    document.addEventListener("focusout", () => {
        setTimeout(() => {
            if (previewEditPending && !isPreviewEditing()) {
                previewEditPending = false;
                refreshPreview();
            }
        }, 0);
    });
}
function applyExtensionTheme() {
    const theme = extension_settings[extensionName].uiTheme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-tti-theme", theme);
    const label = theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환";
    $("#tti_theme_toggle")
        .attr({title: label, "aria-label": label})
        .find("i")
        .toggleClass("fa-sun", theme === "dark")
        .toggleClass("fa-moon", theme === "light");
}
function refreshPreview() {
    const autoPreviewEnabled = !!extension_settings[extensionName].autoPreview;
    if (autoPreviewEnabled && isPreviewEditing()) {
        previewEditPending = true;
        return;
    }
    previewEditPending = false;
    const $refreshNotice = $(".refresh-preview");

    if (!autoPreviewEnabled) {
        const $previewContainer = $("#image_preview_container");
        const $dlAllButtons = $("#image_preview_box h4 .dl_all");
        const isAlreadyManualState = $refreshNotice.hasClass("shown") && $previewContainer.children().length === 0 && $dlAllButtons.length === 0;

        if (isAlreadyManualState) return;

        $refreshNotice.addClass("shown");
        if ($previewContainer.children().length > 0) {
            $previewContainer.empty();
            setPreviewIndex(0);
        }
        if ($dlAllButtons.length > 0) {
            $dlAllButtons.remove();
        }
        return;
    }

    if ($refreshNotice.hasClass("shown")) {
        $refreshNotice.removeClass("shown");
    }

    _debouncedRender();
}
function manualRefresh() {
    if (!extension_settings[extensionName].autoPreview) {
        ensurePreviewFontsLoaded().then(renderPreviewContent);
    }
}
function syncHtmlSwitcherInputUIState() {
    const hasItems = $("#tti_html_switcher_list .tti-html-switcher-text").length > 0;
    $(".html-switcher-inputs").toggleClass("has-items", hasItems);
}
function appendHtmlSwitcherInput(value = "") {
    const itemCount = $("#tti_html_switcher_list .html-switcher-input-item").length + 1;
    const $item = $(`
    <div class="html-switcher-input-item">
      <textarea class="tti-html-switcher-text" placeholder="전환 텍스트 ${itemCount}"></textarea>
      <button type="button" class="html-switcher-remove-btn buttons clear" title="삭제"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `);
    $item.find(".tti-html-switcher-text").val(value);
    $("#tti_html_switcher_list").append($item);
    syncHtmlSwitcherInputUIState();
    return $item;
}
function getHtmlSwitcherTexts() {
    return $("#tti_html_switcher_list .tti-html-switcher-text")
        .map(function () {
            const value = String($(this).val() || "");
            return value;
        })
        .get()
        .filter((value) => value.trim().length > 0);
}
function setupHtmlSwitcherInputs() {
    $("#add_html_switcher_text").on("click", () => {
        const $item = appendHtmlSwitcherInput("");
        $item.find(".tti-html-switcher-text").trigger("focus");
        refreshPreview();
    });
    $(document).on("input change", "#tti_html_switcher_list .tti-html-switcher-text", refreshPreview);
    $(document).on("click", "#tti_html_switcher_list .html-switcher-remove-btn", function () {
        $(this).closest(".html-switcher-input-item").remove();
        syncHtmlSwitcherInputUIState();
        refreshPreview();
    });
    syncHtmlSwitcherInputUIState();
}

/* =========================================================
    UI: 단어 치환 목록
========================================================= */
function renderReplaceRules() {
    const $list = $("#tti_replace_list");
    if (!$list.length) return;
    const rules = getReplaceRules();
    $list.empty();
    rules.forEach((rule, index) => {
        const $row = $(`
      <div class="replacement-rule" data-index="${index}">
        <span class="rule-index">${index + 1}</span>
        <label>
          <small>원래 단어</small>
          <input type="text" class="replacer_box rule-original" placeholder="예: 김뫄뫄||뫄뫄" />
        </label>
        <i class="rule-arrow">→</i>
        <label>
          <small>바꿀 단어</small>
          <input type="text" class="replacer_box rule-replacement" placeholder="예: 깡캐" />
        </label>
        <button type="button" class="rule-delete" aria-label="${index + 1}번 규칙 삭제"><i class="fa-solid fa-xmark"></i></button>
        <button type="button" class="rule-toggle" role="switch" aria-checked="${rule.enabled}" aria-label="${index + 1}번 치환 사용">${rule.enabled ? "ON" : "OFF"}</button>
      </div>
    `);
        $row.find(".rule-original").val(rule.original);
        $row.find(".rule-replacement").val(rule.replacement);
        $row.toggleClass("is-disabled", !rule.enabled);
        $list.append($row);
    });
}
function collectReplaceRulesFromUI() {
    const rules = [];
    $("#tti_replace_list .replacement-rule").each(function () {
        rules.push({
            original: $(this).find(".rule-original").val() ?? "",
            replacement: $(this).find(".rule-replacement").val() ?? "",
            enabled: $(this).find(".rule-toggle").attr("aria-checked") === "true",
        });
    });
    return rules;
}
function commitReplaceRulesFromUI() {
    setReplaceRules(collectReplaceRulesFromUI());
    debouncedSaveSettings();
    refreshPreview();
}
function setupReplaceRuleUI() {
    $(document).on("click", "#add_replace_rule", () => {
        setReplaceRules([...collectReplaceRulesFromUI(), {original: "", replacement: ""}]);
        renderReplaceRules();
        saveSettings();
        $("#tti_replace_list .replacement-rule:last-child .rule-original").trigger("focus");
    });
    $(document).on("click", "#tti_replace_list .rule-delete", function () {
        const index = $(this).closest(".replacement-rule").data("index");
        const rules = collectReplaceRulesFromUI();
        rules.splice(index, 1);
        setReplaceRules(rules);
        renderReplaceRules();
        saveSettings();
        refreshPreview();
    });
    $(document).on("click", "#tti_replace_list .rule-toggle", function () {
        const enabled = $(this).attr("aria-checked") !== "true";
        $(this)
            .attr("aria-checked", String(enabled))
            .text(enabled ? "ON" : "OFF");
        $(this).closest(".replacement-rule").toggleClass("is-disabled", !enabled);
        commitReplaceRulesFromUI();
    });
    $(document).on("input", "#tti_replace_list .replacer_box", commitReplaceRulesFromUI);
}

/* =========================================================
    UI: 이미지 정보 표시
========================================================= */
const META_FIELDS = {
    chat_title: {modeKey: "chatTitleMode", customKey: "chatTitleCustom", inputId: "chat_title_custom"},
    char_name: {modeKey: "charNameMode", customKey: "charNameCustom", inputId: "char_name_custom"},
};
function syncMetaUIState() {
    const settings = extension_settings[extensionName];
    Object.entries(META_FIELDS).forEach(([key, field]) => {
        const mode = normalizeMetaMode(settings[field.modeKey]);
        const $segment = $(`.tti-segment[data-meta="${key}"]`);
        $segment.find("button").removeClass("active");
        $segment.find(`button[data-mode="${mode}"]`).addClass("active");
        $segment.closest(".tti-meta-row").toggleClass("custom", mode === "custom");
        $(`#${field.inputId}`).val(settings[field.customKey] || "");
    });
    $("#use_watermark").prop("checked", !!settings.useWatermark);
}
function setupMetaUI() {
    $(document).on("click", ".tti-segment[data-meta] button", function () {
        const key = $(this).closest(".tti-segment").data("meta");
        const field = META_FIELDS[key];
        if (!field) return;
        extension_settings[extensionName][field.modeKey] = normalizeMetaMode($(this).data("mode"));
        syncMetaUIState();
        saveSettings();
        refreshPreview();
    });
    $(document).on("input", "#chat_title_custom", function () {
        extension_settings[extensionName].chatTitleCustom = $(this).val();
        debouncedSaveSettings();
        refreshPreview();
    });
    $(document).on("input", "#char_name_custom", function () {
        extension_settings[extensionName].charNameCustom = $(this).val();
        debouncedSaveSettings();
        refreshPreview();
    });
    $(document).on("change", "#use_watermark", function () {
        const mobileScroll = this.closest(".tti-mobile-scroll");
        const mobileScrollTop = mobileScroll?.scrollTop;
        extension_settings[extensionName].useWatermark = $(this).prop("checked");
        syncMetaUIState();
        saveSettings();
        refreshPreview();
        if (mobileScroll && mobileScrollTop !== undefined) {
            requestAnimationFrame(() => {
                mobileScroll.scrollTop = mobileScrollTop;
            });
        }
    });
}

/* =========================================================
    UI: 조절 / 비율 버튼 / 오버레이 색
========================================================= */
const STEPPER_FORMATS = {
    tti_font_size_image: (value) => `${Math.round(value)}`,
    tti_font_size_html: (value) => `${Math.round(value)}`,
    tti_line_height: (value) => value.toFixed(2),
    tti_letter_spacing: (value) => `${Math.round(value * 100)}%`,
    bg_brightness: (value) => `${Math.round(value)}%`,
    bg_blur: (value) => `${Number(value.toFixed(1))}px`,
    bg_grayscale: (value) => `${Math.round(value)}%`,
    bg_hue: (value) => `${Math.round(value)}°`,
    bg_noise: (value) => `${Math.round(value)}%`,
    overlay_opacity: (value) => `${Math.round(value * 100)}%`,
};
function syncSteppers() {
    $(".option-stepper[data-target]").each(function () {
        const $stepper = $(this);
        const targetId = $stepper.data("target");
        const input = document.getElementById(targetId);
        if (!input) return;
        const value = parseFloat(input.value);
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const format = STEPPER_FORMATS[targetId] || ((raw) => String(raw));
        const locked = !!input.disabled;
        $stepper.find(".stepper-display").text(Number.isFinite(value) ? format(value) : "-");
        $stepper.find('.stepper-btn[data-dir="-1"]').prop("disabled", locked || !(value > min));
        $stepper.find('.stepper-btn[data-dir="1"]').prop("disabled", locked || !(value < max));
        $stepper.toggleClass("disabled", locked);
    });
}
function stepStepper($stepper, direction) {
    const targetId = $stepper.data("target");
    const input = document.getElementById(targetId);
    if (!input || input.disabled) return;
    const step = parseFloat(input.step) || 1;
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const current = parseFloat(input.value);
    if (!Number.isFinite(current)) return;
    const next = Number(Math.min(max, Math.max(min, current + direction * step)).toFixed(4));
    if (next === current) return;
    input.value = String(next);
    $(input).trigger("change");
    syncSteppers();
}
function syncRatioButtons() {
    const ratio = $("#tti_ratio").val() || defaultSettings.imageRatio;
    $(".tti-ratio-btn").each(function () {
        $(this).toggleClass("active", $(this).data("ratio") === ratio);
    });
}
function syncOverlayColorButtons() {
    const color = String($("#overlay_color").val() || "").toLowerCase();
    $(".overlay-color").each(function () {
        $(this).toggleClass("active", String($(this).data("color")).toLowerCase() === color);
    });
}
function setupCustomSelects() {
    const selector = ".text-to-image-converter-settings select, .tti-modal-backdrop select";
    const menu = $('<div class="tti-select-menu" role="listbox" hidden></div>').appendTo(document.body)[0];
    let active = null;
    function close() {
        menu.hidden = true;
        active?.nextElementSibling?.setAttribute("aria-expanded", "false");
        active = null;
    }
    function refresh() {
        document.querySelectorAll(selector).forEach((select) => {
            let button = select.nextElementSibling;
            if (!button?.classList.contains("tti-select-trigger")) {
                button = document.createElement("button");
                button.type = "button";
                button.className = "tti-select-trigger";
                button.setAttribute("aria-haspopup", "listbox");
                button.setAttribute("aria-expanded", "false");
                select.classList.add("tti-custom-select-source");
                select.after(button);
                button.addEventListener("click", () => {
                    if (active === select) {
                        close();
                        return;
                    }
                    close();
                    active = select;
                    menu.replaceChildren();
                    Array.from(select.options)
                        .filter((o) => !o.hidden)
                        .forEach((option) => {
                            const item = document.createElement("button");
                            item.type = "button";
                            item.textContent = option.textContent;
                            item.setAttribute("role", "option");
                            item.setAttribute("aria-selected", String(option.selected));
                            item.disabled = option.disabled || !!option.parentElement.disabled;
                            item.addEventListener("click", () => {
                                select.value = option.value;
                                $(select).trigger("change");
                                refresh();
                                close();
                                button.focus({preventScroll: true});
                            });
                            menu.append(item);
                        });
                    button.setAttribute("aria-expanded", "true");
                    menu.hidden = false;
                    const rect = button.getBoundingClientRect();
                    const below = innerHeight - rect.bottom - 8;
                    const up = below < 180 && rect.top > below;
                    const width = Math.min(Math.max(rect.width, 180), innerWidth - 16);
                    Object.assign(menu.style, {width: width + "px", left: Math.max(8, Math.min(rect.left, innerWidth - width - 8)) + "px", top: up ? "auto" : rect.bottom + 4 + "px", bottom: up ? innerHeight - rect.top + 4 + "px" : "auto", maxHeight: Math.max(60, Math.min(300, up ? rect.top - 8 : below)) + "px"});
                    (menu.querySelector('[aria-selected="true"]:not(:disabled)') || menu.querySelector("button:not(:disabled)"))?.focus({preventScroll: true});
                });
            }
            const text = select.selectedOptions[0]?.textContent || "선택";
            if (button.textContent !== text) button.textContent = text;
            if (button.disabled !== select.disabled) button.disabled = select.disabled;
            const hidden = select.hidden || select.classList.contains("tti-hidden-native") || select.classList.contains("html-mode-hidden") || select.classList.contains("html-mode-only");
            if (button.hidden !== hidden) button.hidden = hidden;
        });
    }
    menu.addEventListener("keydown", (e) => {
        if (["Escape", "Tab"].includes(e.key)) {
            const button = active?.nextElementSibling;
            close();
            button?.focus({preventScroll: true});
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
            }
            return;
        }
        const items = Array.from(menu.querySelectorAll("button:not(:disabled)"));
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) && items.length) {
            e.preventDefault();
            const i = items.indexOf(document.activeElement);
            items[
                e.key === "Home" ? 0
                : e.key === "End" ? items.length - 1
                : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length
            ].focus();
        }
    });
    document.addEventListener("pointerdown", (e) => {
        if (!menu.contains(e.target) && e.target !== active?.nextElementSibling) close();
    });
    document.addEventListener(
        "scroll",
        (e) => {
            if (!menu.contains(e.target)) close();
        },
        true,
    );
    window.addEventListener("resize", close);
    new MutationObserver((records) => {
        if (records.some((r) => r.target instanceof Element && (r.target.matches("select,option,optgroup") || Array.from(r.addedNodes).some((n) => n instanceof Element && (n.matches("select") || n.querySelector("select")))))) refresh();
    }).observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ["disabled", "class", "selected", "hidden"]});
    $(document).on("change click", ".text-to-image-converter-settings, .tti-modal-backdrop", () => queueMicrotask(refresh));
    refresh();
}
function setupCompositeControls() {
    setupWebFontManager();
    setupCustomSelects();
    $(".stepper-display").attr({role: "button", tabindex: "0", title: "클릭하여 숫자 입력"});
    $(document).on("click keydown", ".stepper-display", function (event) {
        if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        const $display = $(this);
        const input = document.getElementById($display.closest(".option-stepper").data("target"));
        if (!input || input.disabled || $display.next(".tti-stepper-input").length) return;
        const scale = ["tti_letter_spacing", "overlay_opacity"].includes(input.id) ? 100 : 1;
        const $edit = $('<input type="number" class="tti-stepper-input" aria-label="직접 숫자 입력" />')
            .attr({min: Number(input.min) * scale, max: Number(input.max) * scale, step: Number(input.step) * scale})
            .val(Number((Number(input.value) * scale).toFixed(4)));
        $display.hide().after($edit);
        let cancelled = false;
        $edit
            .on("keydown", (e) => {
                if (e.key === "Escape") {
                    cancelled = true;
                    $edit.trigger("blur");
                }
                if (e.key === "Enter") {
                    e.preventDefault();
                    $edit.trigger("blur");
                }
            })
            .one("blur", () => {
                const value = $edit[0].valueAsNumber / scale;
                if (!cancelled && Number.isFinite(value)) {
                    const min = Number(input.min),
                        max = Number(input.max),
                        step = Number(input.step) || 1;
                    input.value = String(Math.min(max, Math.max(min, min + Math.round((value - min) / step) * step)));
                    $(input).trigger("change");
                }
                $edit.remove();
                $display.show();
                syncSteppers();
            });
        $edit[0].focus({preventScroll: true});
        $edit[0].select();
    });
    $(document).on("click", ".tti-basic-color", function () {
        const $input = $(this).closest(".tti-color-input-group").find('input[type="color"]');
        if (!$input.prop("disabled")) $input.val($(this).data("color")).trigger("input").trigger("change");
    });
    $(document).on("click", ".option-stepper .stepper-btn", function () {
        stepStepper($(this).closest(".option-stepper"), Number($(this).data("dir")));
    });
    $(document).on("change", ".option-stepper input[type='range']", syncSteppers);
    $(document).on("click", ".tti-ratio-btn", function () {
        if ($("#tti_ratio").prop("disabled")) return;
        $("#tti_ratio").val($(this).data("ratio")).trigger("change");
        syncRatioButtons();
    });
    $(document).on("click", ".overlay-color", function () {
        $("#overlay_color").val($(this).data("color")).trigger("change");
        syncOverlayColorButtons();
    });
    $(document).on("change", "#tti_ratio", syncRatioButtons);
    $(document).on("change", "#overlay_color", syncOverlayColorButtons);
}

/* =========================================================
    UI: 내용 편집 하단 패널
========================================================= */
function updateTextLengthBadge() {
    const length = ($("#text_to_image").val() || "").length;
    $("#tti_text_length_badge").text(`${length.toLocaleString()}자`);
}
function openTextModal() {
    ensureFloatingHighlightTags();
    syncRichEditorFromSource();
    $("#tti_text_modal_backdrop").addClass("open");
}
function closeTextModal() {
    closeModal($("#tti_text_modal_backdrop"));
}
function renderPenBar() {
    const $list = $("#tti_pen_list");
    if (!$list.length) return;
    const tags = extension_settings[extensionName].setHighlighterTags || [];
    $list.empty();
    const usable = tags.filter((tag) => tag && tag.name);
    if (!usable.length) {
        $list.append('<span class="tti-pen-empty">형광펜 탭에서 펜을 먼저 만들어 주세요.</span>');
        return;
    }
    usable.forEach((tag) => {
        const swatchColor =
            tag.useTagBgColor ? tag.bgColor
            : tag.useTagFontColor ? tag.fontColor
            : "transparent";
        const $pen = $('<button type="button" class="tti-pen"></button>')
            .attr("data-tag", tag.name)
            .attr("title", `${tag.label || tag.name} 형광펜 적용`);
        $pen.append($('<i class="tti-pen-dot"></i>').css("background", swatchColor || "transparent"));
        $pen.append($("<span></span>").text(tag.label || tag.name));
        $list.append($pen);
    });
}
function applyPenToSelection(tagName) {
    const textarea = document.getElementById("text_to_image");
    if (!textarea || !tagName) return;
    const {selectionStart: start, selectionEnd: end, value} = textarea;
    if (start === end) {
        toastLikeAlert("칠할 문장을 먼저 드래그해 주세요.");
        return;
    }
    const selected = stripHighlightTags(value.slice(start, end));
    const wrapped = `<${tagName}>${selected}</${tagName}>`;
    textarea.value = value.slice(0, start) + wrapped + value.slice(end);
    textarea.focus();
    textarea.setSelectionRange(start, start + wrapped.length);
    $(textarea).trigger("change");
    updateTextLengthBadge();
}
function stripHighlightTags(text) {
    const tags = (extension_settings[extensionName].setHighlighterTags || [])
        .map((tag) => tag?.name)
        .filter(Boolean)
        .map((name) => escapeRegExp(name));
    if (!tags.length) return text;
    const pattern = new RegExp(`</?(?:${tags.join("|")})>`, "gi");
    return text.replace(pattern, "");
}
function erasePenFromSelection() {
    const textarea = document.getElementById("text_to_image");
    if (!textarea) return;
    const {selectionStart: start, selectionEnd: end, value} = textarea;
    const hasSelection = start !== end;
    const target = hasSelection ? value.slice(start, end) : value;
    const cleaned = stripHighlightTags(target);
    textarea.value = hasSelection ? value.slice(0, start) + cleaned + value.slice(end) : cleaned;
    textarea.focus();
    if (hasSelection) textarea.setSelectionRange(start, start + cleaned.length);
    $(textarea).trigger("change");
    updateTextLengthBadge();
}
function toastLikeAlert(message) {
    if (typeof toastr !== "undefined" && toastr?.info) {
        toastr.info(message);
        return;
    }
    alert(message);
}

let savedRichEditorRange = null;
let recentHighlightTagName = null;

function getUsableHighlightTags() {
    return (extension_settings[extensionName].setHighlighterTags || []).filter((tag) => tag?.name);
}
function ensureFloatingHighlightTags() {
    if (getUsableHighlightTags().length) return;
    extension_settings[extensionName].setHighlighterTags = HIGHLIGHT_PALETTE.map((item, index) => ({
        name: `hl${index + 1}`,
        label: item.name,
        fontFamily: "useGlobal",
        htmlFontFamily: "useGlobal",
        fontColor: item.bg === "#000000" ? "#ffffff" : "#000000",
        bgColor: item.bg,
        fontSize: isHtmlModeEnabled() ? 14 : 24,
        strokeWidth: "inherit",
        useTagFontColor: item.bg === "#000000",
        useTagBgColor: true,
    }));
    saveSettings();
}
function getHighlightTag(tagName) {
    return getUsableHighlightTags().find((tag) => tag.name.toLowerCase() === String(tagName || "").toLowerCase());
}
function getHighlightSwatch(tag) {
    if (!tag) return "#f7e8b4";
    return (
        tag.useTagBgColor ? tag.bgColor
        : tag.useTagFontColor ? tag.fontColor
        : "#f7e8b4"
    );
}
function createEditorHighlight(tagName) {
    const tag = getHighlightTag(tagName);
    const span = document.createElement("span");
    span.className = "tti-editor-highlight";
    span.dataset.tag = tag?.name || tagName;
    if (tag?.useTagBgColor) span.style.backgroundColor = tag.bgColor;
    if (tag?.useTagFontColor) span.style.color = tag.fontColor;
    return span;
}
function appendEditorTextWithHighlights(container, source) {
    const tags = getUsableHighlightTags();
    if (!tags.length) {
        container.append(document.createTextNode(source));
        return;
    }
    const names = tags.map((tag) => escapeRegExp(tag.name)).join("|");
    const pattern = new RegExp(`<(${names})>([\\s\\S]*?)<\\/\\1>`, "gi");
    let cursor = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
        if (match.index > cursor) container.append(document.createTextNode(source.slice(cursor, match.index)));
        const span = createEditorHighlight(match[1]);
        appendEditorTextWithHighlights(span, match[2]);
        container.append(span);
        cursor = match.index + match[0].length;
    }
    if (cursor < source.length) container.append(document.createTextNode(source.slice(cursor)));
}
function syncRichEditorFromSource() {
    const editor = document.getElementById("tti_rich_text_editor");
    if (!editor) return;
    editor.replaceChildren();
    appendEditorTextWithHighlights(editor, String($("#text_to_image").val() || ""));
    renderFloatingHighlightPalette();
    hideFloatingHighlightMenu();
}
function isFillerBR(element) {
    const parent = element.parentElement;
    if (!parent) return false;
    if (parent.id === "tti_rich_text_editor") return !element.nextSibling;
    return (parent.tagName === "DIV" || parent.tagName === "P") && parent.childNodes.length === 1;
}
function serializeRichEditorNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const element = /** @type {HTMLElement} */ (node);
    if (element.tagName === "BR") return isFillerBR(element) ? "" : "\n";
    const content = Array.from(element.childNodes).map(serializeRichEditorNode).join("");
    if (element.classList.contains("tti-editor-highlight")) {
        const tagName = element.dataset.tag;
        return tagName ?
                stripHighlightTags(content)
                    .split("\n")
                    .map((line) => (line ? `<${tagName}>${line}</${tagName}>` : ""))
                    .join("\n")
            :   content;
    }
    if (element.tagName === "DIV" || element.tagName === "P") return `${element.previousSibling ? "\n" : ""}${content}`;
    return content;
}
function syncSourceFromRichEditor() {
    const editor = document.getElementById("tti_rich_text_editor");
    if (!editor) return;
    const source = Array.from(editor.childNodes).map(serializeRichEditorNode).join("");
    $("#text_to_image").val(source).trigger("input");
}
function unwrapEditorHighlights(root) {
    if (root.nodeType === Node.ELEMENT_NODE && root.classList?.contains("tti-editor-highlight")) {
        root.replaceWith(...Array.from(root.childNodes));
    }
    root.querySelectorAll?.(".tti-editor-highlight").forEach((span) => span.replaceWith(...Array.from(span.childNodes)));
}
function richRangeIsValid(range) {
    const editor = document.getElementById("tti_rich_text_editor");
    return !!editor && !!range && editor.contains(range.commonAncestorContainer) && !range.collapsed;
}
function getCurrentRichRange() {
    const selection = window.getSelection();
    if (selection?.rangeCount) {
        const range = selection.getRangeAt(0);
        if (richRangeIsValid(range)) return range.cloneRange();
    }
    return richRangeIsValid(savedRichEditorRange) ? savedRichEditorRange.cloneRange() : null;
}
function selectionTouchesHighlight(range) {
    const editor = document.getElementById("tti_rich_text_editor");
    return !!editor && Array.from(editor.querySelectorAll(".tti-editor-highlight")).some((span) => range.intersectsNode(span));
}
function showFloatingHighlightMenu(range) {
    if (!richRangeIsValid(range)) return;
    savedRichEditorRange = range.cloneRange();
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    const $menu = $("#tti_editor_highlight_menu");
    const touchesHighlight = selectionTouchesHighlight(range);
    $("#tti_highlight_apply").toggle(!touchesHighlight);
    $("#tti_highlight_remove").toggle(touchesHighlight);
    $menu.addClass("is-visible");
    const menuRect = $menu[0].getBoundingClientRect();
    const useTop = rect.top >= menuRect.height + 16;
    const halfWidth = menuRect.width / 2;
    const x = Math.max(halfWidth + 8, Math.min(window.innerWidth - halfWidth - 8, rect.left + rect.width / 2));
    $menu
        .toggleClass("placement-top", useTop)
        .toggleClass("placement-bottom", !useTop)
        .css({left: `${x}px`, top: `${useTop ? rect.top - 8 : rect.bottom + 8}px`})
        .addClass("is-visible");
}
function hideFloatingHighlightMenu() {
    savedRichEditorRange = null;
    $("#tti_editor_highlight_menu").removeClass("is-visible palette-open");
    $("#tti_highlight_color").attr("aria-expanded", "false");
}
function splitEditorHighlightAtMarker(marker) {
    let wrapper = marker.parentElement?.closest(".tti-editor-highlight");
    while (wrapper) {
        const right = wrapper.cloneNode(false);
        while (marker.nextSibling) right.append(marker.nextSibling);
        wrapper.after(marker);
        if (right.hasChildNodes()) marker.after(right);
        if (!wrapper.hasChildNodes()) wrapper.remove();
        wrapper = marker.parentElement?.closest(".tti-editor-highlight");
    }
}
function replaceRichRangeHighlight(tagName = null) {
    const range = getCurrentRichRange();
    if (!range) return false;
    const startMarker = document.createElement("i");
    const endMarker = document.createElement("i");
    startMarker.className = "tti-editor-range-marker";
    endMarker.className = "tti-editor-range-marker";
    const endRange = range.cloneRange();
    endRange.collapse(false);
    endRange.insertNode(endMarker);
    const startRange = range.cloneRange();
    startRange.collapse(true);
    startRange.insertNode(startMarker);
    splitEditorHighlightAtMarker(startMarker);
    splitEditorHighlightAtMarker(endMarker);

    const cleanRange = document.createRange();
    cleanRange.setStartAfter(startMarker);
    cleanRange.setEndBefore(endMarker);
    const fragment = cleanRange.extractContents();
    unwrapEditorHighlights(fragment);
    if (tagName) {
        const span = createEditorHighlight(tagName);
        span.append(fragment);
        cleanRange.insertNode(span);
    } else {
        cleanRange.insertNode(fragment);
    }
    startMarker.remove();
    endMarker.remove();
    document.getElementById("tti_rich_text_editor")?.normalize();
    return true;
}
function applyFloatingHighlight(tagName) {
    const tag = getHighlightTag(tagName || recentHighlightTagName) || getUsableHighlightTags()[0];
    if (!tag || !replaceRichRangeHighlight(tag.name)) return;
    recentHighlightTagName = tag.name;
    syncSourceFromRichEditor();
    renderFloatingHighlightPalette();
    window.getSelection()?.removeAllRanges();
    hideFloatingHighlightMenu();
}
function removeFloatingHighlight() {
    if (!replaceRichRangeHighlight()) return;
    syncSourceFromRichEditor();
    window.getSelection()?.removeAllRanges();
    hideFloatingHighlightMenu();
}
function renderFloatingHighlightPalette() {
    const tags = getUsableHighlightTags();
    if (!tags.length) return;
    if (!getHighlightTag(recentHighlightTagName)) recentHighlightTagName = tags[0].name;
    const $palette = $("#tti_highlight_palette").empty();
    tags.forEach((tag) => {
        $('<button type="button"></button>')
            .attr({"data-tag": tag.name, "aria-label": `${tag.label || tag.name} 선택`, title: tag.label || tag.name})
            .toggleClass("active", tag.name === recentHighlightTagName)
            .css("--palette-color", getHighlightSwatch(tag))
            .appendTo($palette);
    });
    $("#tti_highlight_color").css("--palette-color", getHighlightSwatch(getHighlightTag(recentHighlightTagName)));
}
function setupRichTextHighlighter() {
    setupPreviewEditDeferral();
    $(document).on("click", "#tti_theme_toggle", function () {
        extension_settings[extensionName].uiTheme = extension_settings[extensionName].uiTheme === "dark" ? "light" : "dark";
        applyExtensionTheme();
        saveSettings();
    });
    $("#tti_editor_highlight_menu").appendTo("#tti_text_modal_backdrop");
    document.getElementById("tti_rich_text_editor")?.addEventListener("scroll", hideFloatingHighlightMenu, {passive: true});
    document.querySelector(".tti-bottom-sheet")?.addEventListener("scroll", hideFloatingHighlightMenu, {passive: true});
    window.addEventListener("resize", hideFloatingHighlightMenu);
    $(document).on("input", "#tti_rich_text_editor", syncSourceFromRichEditor);
    $(document).on("pointerup keyup", "#tti_rich_text_editor", function () {
        window.setTimeout(() => {
            const selection = window.getSelection();
            const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
            if (richRangeIsValid(range)) showFloatingHighlightMenu(range);
            else hideFloatingHighlightMenu();
        }, 0);
    });
    $(document).on("pointerdown", "#tti_editor_highlight_menu", (event) => event.preventDefault());
    $(document).on("mousedown", "#tti_editor_highlight_menu", (event) => event.preventDefault());
    $(document).on("paste", "#tti_rich_text_editor", function (event) {
        event.preventDefault();
        const text = event.originalEvent.clipboardData?.getData("text/plain") || "";
        document.execCommand("insertText", false, text);
        syncSourceFromRichEditor();
    });
    $(document).on("keydown", "#tti_rich_text_editor", function (event) {
        if (event.key === "Enter" && !event.originalEvent.isComposing) {
            event.preventDefault();
            document.execCommand("insertText", false, "\n");
            syncSourceFromRichEditor();
        }
    });
    $(document).on("click", "#tti_rich_text_editor .tti-editor-highlight", function () {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) return;
        const range = document.createRange();
        range.selectNodeContents(this);
        selection?.removeAllRanges();
        selection?.addRange(range);
        showFloatingHighlightMenu(range);
    });
    $(document).on("click", "#tti_highlight_apply", () => applyFloatingHighlight());
    $(document).on("click", "#tti_highlight_remove", removeFloatingHighlight);
    $(document).on("click", "#tti_highlight_color", function () {
        const open = !$("#tti_editor_highlight_menu").hasClass("palette-open");
        $("#tti_editor_highlight_menu").toggleClass("palette-open", open);
        $(this).attr("aria-expanded", String(open));
    });
    $(document).on("click", "#tti_highlight_palette button", function () {
        applyFloatingHighlight($(this).data("tag"));
    });
    $(document).on("pointerdown", function (event) {
        if (!$(event.target).closest("#tti_rich_text_editor, #tti_editor_highlight_menu").length) hideFloatingHighlightMenu();
    });
}
function openModal(id) {
    $(`#${id}`).addClass("open");
}
function closeModal($backdrop) {
    if (!$backdrop.length) return;
    const wasText = $backdrop.is("#tti_text_modal_backdrop");
    $backdrop.removeClass("open");
    if ($backdrop.is("#tti_pen_settings_backdrop")) {
        $("#tti_pen_settings_body").empty();
        highlighterTags();
    }
    if (wasText) {
        hideFloatingHighlightMenu();
        updateTextLengthBadge();
        refreshPreview();
    }
}
function closeTopModal() {
    const $open = $(".tti-modal-backdrop.open").last();
    closeModal($open);
}
function setupModals() {
    $(document).on("click", "#tti_open_text_modal", openTextModal);
    $(document).on("click", "#tti_open_replace_modal", () => openModal("tti_replace_modal_backdrop"));
    $(document).on("click", "#tti_open_md_modal", () => openModal("tti_md_modal_backdrop"));
    $(document).on("click", "#tti_open_preset_modal", () => {
        syncPresetModalState();
        openModal("tti_preset_modal_backdrop");
    });
    $(document).on("change", "#preset_selector", syncPresetModalState);
    $(document).on("click", "#how_to_use", () => openModal("tti_help_modal_backdrop"));
    $(document).on("click", ".tti-modal-close", function () {
        closeModal($(this).closest(".tti-modal-backdrop"));
    });
    $(document).on("mousedown", ".tti-modal-backdrop", function (event) {
        if (event.target === this) closeModal($(this));
    });
    $(document).on("keydown", function (event) {
        if (event.key === "Escape" && $(".tti-modal-backdrop.open").length) closeTopModal();
    });
    $(document).on("input", "#text_to_image", updateTextLengthBadge);
    $(document).on("click", "#tti_pen_list .tti-pen", function () {
        applyPenToSelection($(this).data("tag"));
    });
    $(document).on("click", "#tti_pen_erase", erasePenFromSelection);
}

// 하이라이터 태그
function nextHighlightTagName() {
    const used = new Set((extension_settings[extensionName].setHighlighterTags || []).map((tag) => String(tag?.name || "").toLowerCase()).filter(Boolean));
    for (let index = 1; index < 999; index++) {
        const candidate = `hl${index}`;
        if (!used.has(candidate)) return candidate;
    }
    return `hl${Date.now()}`;
}
function highlighterTags() {
    const highlightContainer = $("#custom-highlighter .highlighter-lists");
    highlightContainer.empty();
    const highlightTags = extension_settings[extensionName].setHighlighterTags || [];
    highlightTags.forEach((tag, index) => {
        const swatchColor =
            tag.useTagBgColor ? tag.bgColor
            : tag.useTagFontColor ? tag.fontColor
            : "transparent";
        const swatchTextColor = tag.useTagFontColor ? tag.fontColor : "inherit";
        const highlightTagItem = $(`
      <div class="tag-item" data-index="${index}">
        <div class="tag-card-preview"><span></span></div>
        <button type="button" class="buttons tti-manage-pen">관리</button>
        <div class="tag-item-left">
          <div class="tag-item-head">
            <span class="tag-swatch">가</span>
            <input type="text" class="tag-name" placeholder="펜 이름 (예: 강조)" />
          </div>
          <div class="tag-item-row">
            <select class="tag-font-family" data-html-hide="tag_font_family">
              <option value="useGlobal" ${!tag.fontFamily || tag.fontFamily === "useGlobal" ? "selected" : ""}>전역 폰트 사용</option>
            </select>
            <select class="tag-html-font-family" data-html-only="tag_html_font_family">
              <option value="useGlobal" ${!tag.htmlFontFamily || tag.htmlFontFamily === "useGlobal" ? "selected" : ""}>전역 폰트 사용</option>
              <option value="Ridibatang" ${tag.htmlFontFamily === "Ridibatang" ? "selected" : ""}>리디바탕</option>
              <option value="Nanum Gothic" ${tag.htmlFontFamily === "Nanum Gothic" ? "selected" : ""}>나눔고딕</option>
              <option value="GangwonEducationModuche" ${tag.htmlFontFamily === "GangwonEducationModuche" ? "selected" : ""}>강원교육모두체</option>
              <option value="OngleipParkDahyeon" ${tag.htmlFontFamily === "OngleipParkDahyeon" ? "selected" : ""}>온글잎 박다현체</option>
            </select>
            <input type="number" class="tag-font-size" value="${tag.fontSize}" min="12" max="50" title="글자 크기" />
            <select class="tag-stroke-width" title="두께">
              <option value="inherit" ${!tag.strokeWidth || tag.strokeWidth === "inherit" ? "selected" : ""}>전역</option>
              <option value="0" ${tag.strokeWidth === "0" ? "selected" : ""}>기본</option>
              <option value="0.8" ${tag.strokeWidth === "0.8" ? "selected" : ""}>세미 볼드</option>
              <option value="1.5" ${tag.strokeWidth === "1.5" ? "selected" : ""}>볼드</option>
            </select>
          </div>
          <div class="tag-item-row">
            <label class="tag-color-chip">
              <input type="checkbox" class="use-tag-font-color" ${tag.useTagFontColor ? "checked" : ""} />
              글자색
              <input type="color" class="tag-font-color" value="${tag.fontColor}" ${!tag.useTagFontColor ? "disabled" : ""} />
            </label>
            <label class="tag-color-chip">
              <input type="checkbox" class="use-tag-bg-color" ${tag.useTagBgColor ? "checked" : ""} />
              형광색
              <input type="color" class="tag-bg-color" value="${tag.bgColor}" ${!tag.useTagBgColor ? "disabled" : ""} />
            </label>
          </div>
        </div>
        <button class="delete-tag-btn buttons clear" title="삭제"><i class="fa-solid fa-trash"></i></button>
      </div>
    `);

        highlightTagItem.find(".tag-name").val(tag.label || tag.name || "");
        highlightTagItem.find(".tag-swatch").css({
            background: swatchColor || "transparent",
            color: swatchTextColor,
        });
        prependWebFontOptions(highlightTagItem.find(".tag-html-font-family")[0], "html", tag.htmlFontFamily || "useGlobal");
        highlighterFonts(highlightTagItem.find(".tag-font-family"), tag.fontFamily);

        highlightContainer.append(highlightTagItem);
        syncTagSwatch(highlightTagItem);
    });
    const addBtn = $('<button class="add-tag-btn buttons"><i class="fa-solid fa-plus"></i> 형광펜 추가</button>');
    highlightContainer.append(addBtn);
    renderPenBar();
    applyHtmlModeUIState();
    installBasicColorPalettes();
}
function installBasicColorPalettes() {
    $('.text-to-image-converter-settings input[type="color"], .tti-modal input[type="color"]').each(function () {
        if ($(this).parent().hasClass("tti-color-input-group") || this.id === "overlay_color") return;
        $(this).wrap('<span class="tti-color-input-group"></span>');
        $(this).after('<button type="button" class="tti-basic-color" data-color="#ffffff" style="--swatch:#fff" aria-label="흰색"></button><button type="button" class="tti-basic-color" data-color="#000000" style="--swatch:#000" aria-label="검은색"></button>');
    });
}
async function highlighterFonts(fontOption, selectedFont) {
    const fonts = await fetchExtensionJSON("font-family.json");
    fonts.sort((a, b) => a.label.localeCompare(b.label));

    fontOption.empty();
    fontOption.append(`<option value="useGlobal">전역 폰트 사용</option>`);
    fonts.forEach((font) => {
        fontOption.append(`<option value="${font.value}">${font.label}</option>`);
    });
    prependWebFontOptions(fontOption[0], "image", selectedFont || "useGlobal");
    if (selectedFont) {
        fontOption.val(selectedFont);
    }
}
function addHighlightTag() {
    if (!extension_settings[extensionName].setHighlighterTags) {
        extension_settings[extensionName].setHighlighterTags = [];
    }
    const tags = extension_settings[extensionName].setHighlighterTags;
    const palette = HIGHLIGHT_PALETTE[tags.length % HIGHLIGHT_PALETTE.length];
    tags.push({
        name: nextHighlightTagName(),
        label: palette.name,
        fontFamily: "useGlobal",
        htmlFontFamily: "useGlobal",
        fontColor: palette.bg === "#000000" ? "#ffffff" : "#000000",
        bgColor: palette.bg,
        fontSize: isHtmlModeEnabled() ? 14 : 24,
        strokeWidth: "inherit",
        useTagFontColor: palette.bg === "#000000",
        useTagBgColor: true,
    });
    highlighterTags();
    saveSettings();
    refreshPreview();
}
function ensureHighlightTagNames() {
    const tags = extension_settings[extensionName].setHighlighterTags;
    if (!Array.isArray(tags)) {
        extension_settings[extensionName].setHighlighterTags = [];
        return;
    }
    tags.forEach((tag) => {
        if (!tag || typeof tag !== "object") return;
        if (!tag.name) tag.name = nextHighlightTagName();
        if (tag.label === undefined) tag.label = tag.name;
    });
}
function deleteHighlightTag(index) {
    extension_settings[extensionName].setHighlighterTags.splice(index, 1);
    $("#tti_pen_settings_backdrop").removeClass("open");
    $("#tti_pen_settings_body").empty();
    highlighterTags();
    saveSettings();
    refreshPreview();
}
function updateHighlightTag(index, field, value) {
    extension_settings[extensionName].setHighlighterTags[index][field] = value;
    $(".tag-item")
        .filter(function () {
            return Number($(this).data("index")) === Number(index);
        })
        .each(function () {
            syncTagSwatch($(this));
        });
    saveSettings();
    refreshPreview();
}
function syncTagSwatch($item) {
    const index = $item.data("index");
    const tag = (extension_settings[extensionName].setHighlighterTags || [])[index];
    if (!tag) return;
    const settings = extension_settings[extensionName];
    const family = isHtmlModeEnabled() ? tag.htmlFontFamily : tag.fontFamily;
    const resolvedFamily =
        !family || family === "useGlobal" ?
            isHtmlModeEnabled() ? getHtmlFontFace(settings)
            :   settings.fontFamily
        :   family;
    const stroke = tag.strokeWidth === "inherit" ? settings.strokeWidth : tag.strokeWidth;
    $item
        .find(".tag-card-preview > span")
        .text(tag.label || tag.name || "형광펜 미리보기")
        .css({
            background: tag.useTagBgColor ? tag.bgColor : "transparent",
            color: tag.useTagFontColor ? tag.fontColor : settings.fontColor,
            fontFamily: getCSSFontFamily(resolvedFamily),
            webkitTextStroke: `${Number(stroke) || 0}px currentColor`,
        });
    $item.find(".tag-swatch").css({
        background:
            tag.useTagBgColor ? tag.bgColor
            : tag.useTagFontColor ? tag.fontColor
            : "transparent",
        color: tag.useTagFontColor ? tag.fontColor : "inherit",
    });
    renderPenBar();
}

// 마크다운
function enableMarkdown(text, options = {}) {
    const {allowHeading = true} = options;
    const spans = [];
    let currentText = "";
    let bold = false;
    let italic = false;
    let strikethrough = false;
    let underline = false;
    let i = 0;
    let headingSizeBonus = 0;
    let sourceText = text;

    if (allowHeading) {
        const headingMatch = text.match(/^\s*(#{1,3})\s+(.+)$/);
        if (headingMatch) {
            const hashCount = headingMatch[1].length;
            const baseHeadingBonus = (4 - hashCount) * 2;
            headingSizeBonus = isHtmlModeEnabled() ? baseHeadingBonus : baseHeadingBonus + 1;
            sourceText = headingMatch[2];
        }
    }

    const setHighlighterTags = extension_settings[extensionName].setHighlighterTags || [];
    const tagMap = {};
    const quotePairs = {'"': '"', "“": "”", "「": "」", "『": "』"};
    setHighlighterTags.forEach((tag) => {
        if (tag.name) tagMap[tag.name.toLowerCase()] = tag;
    });

    while (i < sourceText.length) {
        if (sourceText[i] === "<") {
            let tagMatch = sourceText.slice(i).match(/^<(\w+)>/);
            if (tagMatch && tagMap[tagMatch[1].toLowerCase()]) {
                const tagName = tagMatch[1].toLowerCase();
                const tagSet = tagMap[tagName];
                const closeTag = `</${tagName}>`;
                const closeIndex = sourceText.indexOf(closeTag, i + tagMatch[0].length);

                if (closeIndex !== -1) {
                    if (currentText) {
                        spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor: null, bgColor: null});
                        currentText = "";
                    }
                    const tagContent = sourceText.slice(i + tagMatch[0].length, closeIndex);
                    const innerContents = enableMarkdown(tagContent, {allowHeading: false});

                    innerContents.forEach((innerContent) => {
                        if (innerContent.fontFamily || innerContent.fontSize) {
                            spans.push(innerContent);
                        } else {
                            spans.push({
                                text: innerContent.text,
                                bold: innerContent.bold,
                                italic: innerContent.italic,
                                strikethrough: innerContent.strikethrough,
                                underline: innerContent.underline,
                                fontColor: tagSet.useTagFontColor ? tagSet.fontColor : innerContent.fontColor || null,
                                bgColor: tagSet.useTagBgColor ? tagSet.bgColor : innerContent.bgColor || null,
                                fontFamily: tagSet.fontFamily || null,
                                htmlFontFamily: tagSet.htmlFontFamily || null,
                                fontSize: tagSet.fontSize,
                                strokeWidth: tagSet.strokeWidth || null,
                            });
                        }
                    });

                    i = closeIndex + closeTag.length;
                    continue;
                }
            }
        }

        if (quotePairs[sourceText[i]]) {
            const openChar = sourceText[i];
            const closeChar = quotePairs[openChar];
            const closeIndex = sourceText.indexOf(closeChar, i + 1);
            if (closeIndex !== -1) {
                if (currentText) {
                    spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor: null, bgColor: null, fontFamily: null});
                    currentText = "";
                }
                const innerText = sourceText.slice(i + 1, closeIndex);
                const innerSpans = enableMarkdown(innerText, {allowHeading: false});

                spans.push({text: openChar, bold, italic, strikethrough, underline, fontColor: null, bgColor: null, fontFamily: null, quote: true});
                innerSpans.forEach((innerSpan) => spans.push({...innerSpan, quote: true}));
                spans.push({text: closeChar, bold, italic, strikethrough, underline, fontColor: null, bgColor: null, fontFamily: null, quote: true});

                i = closeIndex + 1;
                continue;
            }
        }
        if (sourceText.slice(i, i + 3) === "***") {
            if (currentText) spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor: null, bgColor: null, fontFamily: null});
            bold = !bold;
            italic = !italic;
            currentText = "";
            i += 3;
        } else if (sourceText.slice(i, i + 2) === "**") {
            if (currentText) spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor: null, bgColor: null, fontFamily: null});
            bold = !bold;
            currentText = "";
            i += 2;
        } else if (sourceText.slice(i, i + 2) === "__") {
            if (currentText) spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor: null, bgColor: null, fontFamily: null});
            underline = !underline;
            currentText = "";
            i += 2;
        } else if (sourceText.slice(i, i + 2) === "~~") {
            if (currentText) spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor: null, bgColor: null, fontFamily: null});
            strikethrough = !strikethrough;
            currentText = "";
            i += 2;
        } else if (sourceText[i] === "*" && (i + 1 >= sourceText.length || sourceText[i + 1] !== "*")) {
            if (currentText) spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor: null, bgColor: null, fontFamily: null});
            italic = !italic;
            currentText = "";
            i++;
        } else {
            currentText += sourceText[i];
            i++;
        }
    }

    if (currentText) spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor: null, bgColor: null, fontFamily: null});
    if (headingSizeBonus > 0) {
        const globalFontSize = getActiveFontSize(extension_settings[extensionName]);
        return spans.map((span) => ({
            ...span,
            fontSize: (parseInt(span.fontSize, 10) || globalFontSize) + headingSizeBonus,
        }));
    }
    return spans;
}

// 텍스트 정리
function wrappingTexts(text, mode = "word") {
    const settings = extension_settings[extensionName];

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const {width, height} = getCanvasSize();
    const maxWidth = width * 0.8;
    const fontSize = getActiveFontSize(settings);
    const lineHeight = fontSize * parseFloat(settings.fontLineHeight);

    const fullSize = settings.imageRatio === "full";
    const metaReserve = getMetaBlockHeight(width, getMetaLines(settings).length);
    const maxLines = fullSize ? Infinity : Math.floor((height - 80 - lineHeight - metaReserve) / lineHeight);

    const pages = [];
    let currentPage = [];
    let lineCount = 0;

    const lines = text.split(/\n/);

    lines.forEach((lineText) => {
        const trimmedLine = lineText.trim();
        const isHrLine = /^-{3,}$/.test(trimmedLine) || /^<hr\s*\/?>$/i.test(trimmedLine);
        const parsedLineText = lineText;
        const isBlank = lineText.trim() === "";

        if (isHrLine) {
            if (!fullSize && lineCount >= maxLines && currentPage.length > 0) {
                pages.push(currentPage);
                currentPage = [];
                lineCount = 0;
            }

            if (mode === "word") {
                currentPage.push([{text: "", isHr: true}]);
            } else {
                currentPage.push({
                    spans: [{text: "", isHr: true}],
                    softBreak: false,
                });
            }
            lineCount++;
            return;
        }

        if (isBlank) {
            if (!fullSize && lineCount >= maxLines) {
                pages.push(currentPage);
                currentPage = [];
                lineCount = 0;
            } else {
                if (mode === "word") {
                    currentPage.push([{text: "", bold: false, italic: false, strikethrough: false, underline: false, fontColor: null, bgColor: null}]);
                } else {
                    currentPage.push({
                        spans: [{text: "", bold: false, italic: false, strikethrough: false, underline: false}],
                        softBreak: false,
                    });
                }
                lineCount++;
            }
            return;
        }

        const wrapLine = [];
        const spans = enableMarkdown(parsedLineText);
        const lineMaxWidth = maxWidth;
        let currentLine = [];

        spans.forEach((span) => {
            const units = mode === "word" ? span.text.match(/\S+\s*|\s+/g) || [] : Array.from(span.text);

            units.forEach((unit) => {
                if (mode === "char" && (unit === " " || unit === "\t") && currentLine.length === 0) return;

                const fontWeight = span.bold ? "bold" : settings.fontWeight;
                const fontStyle = span.italic ? "italic" : "normal";
                const fontFamily = span.fontFamily && span.fontFamily !== "useGlobal" ? span.fontFamily : settings.fontFamily;
                const setFontSize = span.fontSize || fontSize;
                ctx.font = `${fontStyle} ${fontWeight} ${setFontSize}px ${getCSSFontFamily(fontFamily)}`;
                ctx.letterSpacing = `${settings.fontSpacing}em`;

                let currentLineWidth = 0;
                currentLine.forEach((item) => {
                    const itemFontWeight = item.bold ? "bold" : settings.fontWeight;
                    const itemFontStyle = item.italic ? "italic" : "normal";
                    const itemFontFamily = item.fontFamily || settings.fontFamily;
                    const itemFontSize = item.fontSize || fontSize;
                    ctx.font = `${itemFontStyle} ${itemFontWeight} ${itemFontSize}px ${getCSSFontFamily(itemFontFamily)}`;
                    ctx.letterSpacing = `${settings.fontSpacing}em`;
                    currentLineWidth += ctx.measureText(item.text).width;
                });

                ctx.font = `${fontStyle} ${fontWeight} ${setFontSize}px ${getCSSFontFamily(fontFamily)}`;
                ctx.letterSpacing = `${settings.fontSpacing}em`;
                const unitWidth = ctx.measureText(unit).width;

                if (currentLineWidth + unitWidth <= lineMaxWidth) {
                    currentLine.push({
                        text: unit,
                        bold: span.bold,
                        italic: span.italic,
                        strikethrough: span.strikethrough,
                        underline: span.underline,
                        fontColor: span.fontColor,
                        bgColor: span.bgColor,
                        fontFamily: span.fontFamily,
                        fontSize: span.fontSize,
                        strokeWidth: span.strokeWidth,
                        quote: span.quote,
                    });
                } else {
                    if (currentLine.length) {
                        if (mode === "word") {
                            wrapLine.push(currentLine);
                        } else {
                            wrapLine.push({
                                spans: currentLine,
                                softBreak: true,
                            });
                        }
                    }

                    currentLine = [
                        {
                            text: unit.trimStart(),
                            bold: span.bold,
                            italic: span.italic,
                            strikethrough: span.strikethrough,
                            underline: span.underline,
                            fontColor: span.fontColor,
                            bgColor: span.bgColor,
                            fontFamily: span.fontFamily,
                            fontSize: span.fontSize,
                            strokeWidth: span.strokeWidth,
                            quote: span.quote,
                        },
                    ];
                }
            });
        });

        if (currentLine.length) {
            if (mode === "word") {
                wrapLine.push(currentLine);
            } else {
                wrapLine.push({
                    spans: currentLine,
                    softBreak: true,
                });
            }
        }

        if (mode === "char" && wrapLine.length > 0) {
            wrapLine.forEach((line, idx) => {
                const isLast = idx === wrapLine.length - 1;
                if (line.softBreak && !isLast) {
                    line.spans = trimLineEdges(line.spans);
                }
            });
            wrapLine[wrapLine.length - 1].softBreak = false;
        }

        if (!fullSize && lineCount + wrapLine.length > maxLines && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            lineCount = 0;
        }

        currentPage = currentPage.concat(wrapLine);
        lineCount += wrapLine.length;
    });

    if (currentPage.length) pages.push(currentPage);

    return pages
        .map((page) => {
            while (page.length && isBlankLine(page[0], mode)) page.shift();
            while (page.length && isBlankLine(page[page.length - 1], mode)) page.pop();
            return page;
        })
        .filter((page) => page.length > 0);
}
function trimLineEdges(spans) {
    let first = 0;
    let last = spans.length - 1;

    while (first <= last && spans[first].text.trim() === "") first++;
    while (last >= first && spans[last].text.trim() === "") last--;

    return spans.slice(first, last + 1);
}
function isBlankLine(line, mode) {
    if (mode === "word") {
        return line.every((span) => span.text.trim() === "");
    } else {
        return line.spans.every((span) => span.text.trim() === "");
    }
}

// 텍스트를 이미지로
function generateTextImage(chunk, index) {
    const {width, height} = getCanvasSize();
    const settings = extension_settings[extensionName];

    const fontSize = getActiveFontSize(settings);
    const lineHeight = fontSize * parseFloat(settings.fontLineHeight);
    const bgImage = settings.selectedBackgroundImage;
    const useBgColor = settings.useBackgroundColor;
    const bgColor = settings.backgroundColor;
    const useSecondBgColor = settings.useSecondBackgroundColor;
    const secondBgColor = settings.secondBackgroundColor;

    const isFullSize = settings.imageRatio === "full";
    const metaLines = getMetaLines(settings);
    const metaMetrics = getMetaMetrics(width);
    const metaBlockHeight = getMetaBlockHeight(width, metaLines.length);
    let metaStartY = 0;
    const calcHeight = isFullSize ? Math.max(700, chunk.length * lineHeight + 160 + metaBlockHeight) : height;

    const renderScale = getRenderScale(width, calcHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * renderScale);
    canvas.height = Math.round(calcHeight * renderScale);
    const ctx = canvas.getContext("2d");
    ctx.scale(renderScale, renderScale);
    ctx.textRendering = "geometricPrecision";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    const drawText = () => {
        const strokeWidth = parseFloat(settings.strokeWidth) || 0;

        const totalTextHeight = chunk.length * lineHeight;
        const visibleMetaHeight = metaLines.length ? metaBlockHeight : 0;
        let y = Math.max((calcHeight - totalTextHeight - visibleMetaHeight) / 2 + fontSize, 40 + fontSize);
        const setAlign = settings.fontAlign || "left";

        const lineBreak = settings.lineBreak || "byWord";
        const maxLineWidth = width * 0.8;

        function setFont(span) {
            const fontWeight = span.bold ? "bold" : settings.fontWeight;
            const fontStyle = span.italic ? "italic" : "normal";
            const fontFamily = span.fontFamily && span.fontFamily !== "useGlobal" ? span.fontFamily : settings.fontFamily;
            const setFontSize = span.fontSize || fontSize;
            ctx.font = `${fontStyle} ${fontWeight} ${setFontSize}px ${getCSSFontFamily(fontFamily)}`;
        }

        function renderSpan(span, x, y, drawMode = "both") {
            setFont(span);
            ctx.letterSpacing = `${settings.fontSpacing}em`;
            const metrics = ctx.measureText(span.text);
            const textWidth = metrics.width;
            const setFontSize = span.fontSize || fontSize;
            const textHeight = setFontSize;

            let currentStrokeWidth = strokeWidth;
            if (span.strokeWidth !== undefined && span.strokeWidth !== null) {
                if (span.strokeWidth === "inherit") {
                    currentStrokeWidth = parseFloat(settings.strokeWidth) || 0;
                } else {
                    currentStrokeWidth = parseFloat(span.strokeWidth) || 0;
                }
            }

            let textColor = settings.fontColor || "#000000";
            if (span.fontColor) {
                textColor = span.fontColor;
            } else {
                if (span.quote && settings.useQuotesColor) {
                    textColor = settings.quotesFontColor || textColor;
                } else if (span.strikethrough && settings.useStrikethroughColor) {
                    textColor = settings.strikethroughFontColor || textColor;
                } else if (span.underline && settings.useUnderlineColor) {
                    textColor = settings.underlineFontColor || textColor;
                } else if (span.bold && span.italic && settings.useBoldItalicColor) {
                    textColor = settings.boldItalicFontColor || textColor;
                } else if (span.bold && !span.italic && settings.useBoldColor) {
                    textColor = settings.boldFontColor || textColor;
                } else if (!span.bold && span.italic && settings.useItalicColor) {
                    textColor = settings.italicFontColor || textColor;
                }
            }

            if ((drawMode === "both" || drawMode === "background") && span.bgColor) {
                const paddingX = 2;
                const paddingY = 2;
                ctx.fillStyle = span.bgColor;
                const bgHeight = fontSize;
                const bgY = y - fontSize + paddingY;
                ctx.fillRect(x - paddingX, bgY, textWidth + 2 * paddingX, bgHeight);
            }

            if (drawMode === "both" || drawMode === "text") {
                ctx.fillStyle = textColor;
                if (currentStrokeWidth > 0) {
                    ctx.strokeStyle = textColor;
                    ctx.lineWidth = currentStrokeWidth;
                    ctx.strokeText(span.text, x, y);
                }
                ctx.fillText(span.text, x, y);

                if (span.strikethrough) {
                    ctx.beginPath();
                    ctx.moveTo(x, y - textHeight / 3);
                    ctx.lineTo(x + textWidth, y - textHeight / 3);
                    ctx.strokeStyle = textColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

                if (span.underline) {
                    ctx.beginPath();
                    ctx.moveTo(x, y + 4);
                    ctx.lineTo(x + textWidth, y + 4);
                    ctx.strokeStyle = textColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }

            return textWidth;
        }
        function getAlignedX(totalTextWidth) {
            if (setAlign === "center") return width / 2 - totalTextWidth / 2;
            if (setAlign === "right") return width * 0.9 - totalTextWidth;
            return width * 0.1;
        }
        function isHrRenderLine(lineData) {
            if (!lineData) return false;
            if (Array.isArray(lineData)) {
                return lineData.length === 1 && !!lineData[0]?.isHr;
            }
            return Array.isArray(lineData.spans) && lineData.spans.length === 1 && !!lineData.spans[0]?.isHr;
        }
        function renderHrLine(yPos) {
            const startX = width * 0.1;
            const endX = width * 0.9;
            const centerY = yPos - lineHeight * 0.45;
            const lineColor = settings.fontColor || "#000000";
            const gradient = ctx.createLinearGradient(startX, centerY, endX, centerY);
            gradient.addColorStop(0, "rgba(0,0,0,0)");
            gradient.addColorStop(0.5, lineColor);
            gradient.addColorStop(1, "rgba(0,0,0,0)");
            ctx.beginPath();
            ctx.moveTo(startX, centerY);
            ctx.lineTo(endX, centerY);
            ctx.strokeStyle = gradient;
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        if (lineBreak === "byWord") {
            for (let lineIndex = 0; lineIndex < chunk.length; lineIndex++) {
                const line = chunk[lineIndex];
                if (isHrRenderLine(line)) {
                    renderHrLine(y);
                    y += lineHeight;
                    continue;
                }
                const textY = y;
                let totalTextWidth = 0;
                const measuredWidths = [];

                line.forEach((span) => {
                    setFont(span);
                    const width = ctx.measureText(span.text).width;
                    ctx.letterSpacing = `${settings.fontSpacing}em`;
                    measuredWidths.push(width);
                    totalTextWidth += width;
                });

                let alignX = getAlignedX(totalTextWidth);

                ctx.textAlign = "left";
                let x = alignX;
                line.forEach((span, i) => {
                    renderSpan(span, x, textY, "background");
                    x += measuredWidths[i];
                });

                x = alignX;
                line.forEach((span, i) => {
                    x += renderSpan(span, x, textY, "text");
                });

                y += lineHeight;
            }
        } else {
            for (let index = 0; index < chunk.length; index++) {
                const lineObj = chunk[index];
                if (isHrRenderLine(lineObj)) {
                    renderHrLine(y);
                    y += lineHeight;
                    continue;
                }
                const textY = y;
                const line = lineObj.spans;
                const isLastLine = index === chunk.length - 1;
                const isBlankLine = line.every((span) => span.text.trim() === "");
                const shouldJustify = setAlign === "left" && !isLastLine && lineObj.softBreak && !isBlankLine;

                let totalTextWidth = 0;
                const measuredWidths = [];

                line.forEach((span) => {
                    setFont(span);
                    const width = ctx.measureText(span.text).width;
                    ctx.letterSpacing = `${settings.fontSpacing}em`;
                    measuredWidths.push(width);
                    totalTextWidth += width;
                });

                let alignX = getAlignedX(totalTextWidth);

                const gapCount = line.length - 1;
                const spacing = gapCount > 0 && shouldJustify ? (maxLineWidth - totalTextWidth) / gapCount : 0;

                let x = alignX;
                line.forEach((span, i) => {
                    renderSpan(span, x, textY, "background");
                    x += measuredWidths[i];
                    if (i < line.length - 1) x += spacing;
                });

                x = alignX;
                line.forEach((span, i) => {
                    x += renderSpan(span, x, textY, "text");
                    if (i < line.length - 1) x += spacing;
                });

                y += lineHeight;
            }
        }

        metaStartY = y;
    };

    const textWallpaper = (img) => {
        const fillMode = settings.imageFillMode || "cover";

        const drawBackground = () => {
            if (!useBgColor) return;

            if (useSecondBgColor) {
                const gradient = ctx.createLinearGradient(0, 0, width, calcHeight);
                addSmoothGradientStops(gradient, bgColor, secondBgColor);
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = bgColor;
            }
            ctx.fillRect(0, 0, width, calcHeight);
        };

        if (fillMode === "pattern") {
            if (useBgColor) {
                drawBackground();
            } else {
                const scale = width / img.width;
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = Math.round(width * renderScale);
                tempCanvas.height = Math.round(img.height * scale * renderScale);
                const tempCtx = tempCanvas.getContext("2d");
                tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

                const pattern = ctx.createPattern(tempCanvas, "repeat");
                pattern.setTransform?.(new DOMMatrix().scale(1 / renderScale));
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, width, calcHeight);
            }
        } else if (fillMode === "mix-top" || fillMode === "mix-bottom") {
            drawBackground();

            const scale = width / img.width;
            const drawWidth = width;
            const drawHeight = img.height * scale;
            const offsetY = fillMode === "mix-top" ? 0 : calcHeight - drawHeight;

            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = Math.round(width * renderScale);
            tempCanvas.height = Math.round(calcHeight * renderScale);
            const tempCtx = tempCanvas.getContext("2d");
            tempCtx.scale(renderScale, renderScale);
            tempCtx.drawImage(img, 0, offsetY, drawWidth, drawHeight);

            const gradientHeight = Math.min(drawHeight * 0.4, calcHeight * 0.3);
            const gradient = tempCtx.createLinearGradient(0, fillMode === "mix-top" ? offsetY + drawHeight - gradientHeight : offsetY + gradientHeight, 0, fillMode === "mix-top" ? offsetY + drawHeight : offsetY);
            gradient.addColorStop(0, "rgba(0,0,0,1)");
            gradient.addColorStop(1, "rgba(0,0,0,0)");

            tempCtx.globalCompositeOperation = "destination-in";
            tempCtx.fillStyle = gradient;
            tempCtx.fillRect(0, 0, width, calcHeight);

            ctx.drawImage(tempCanvas, 0, 0, width, calcHeight);
        } else {
            if (useBgColor) {
                drawBackground();
            } else {
                const imgRatio = img.width / img.height;
                const canvasRatio = width / calcHeight;
                let drawWidth,
                    drawHeight,
                    offsetX = 0,
                    offsetY = 0;

                if (imgRatio > canvasRatio) {
                    drawHeight = calcHeight;
                    drawWidth = img.width * (calcHeight / img.height);
                    offsetX = (width - drawWidth) / 2;
                } else {
                    drawWidth = width;
                    drawHeight = img.height * (width / img.width);
                    offsetY = (calcHeight - drawHeight) / 2;
                }
                ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            }
        }

        let filterEffects = [];
        if (settings.bgBlur > 0) filterEffects.push(`blur(${settings.bgBlur * renderScale}px)`);
        if (settings.bgBrightness !== undefined) filterEffects.push(`brightness(${settings.bgBrightness}%)`);
        if (settings.bgHue !== undefined) filterEffects.push(`hue-rotate(${settings.bgHue}deg)`);

        if (filterEffects.length > 0) {
            const blurPad = Math.ceil((Number(settings.bgBlur) || 0) * 3);
            const snapshot = document.createElement("canvas");
            snapshot.width = canvas.width;
            snapshot.height = canvas.height;
            snapshot.getContext("2d").drawImage(canvas, 0, 0);
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            ctx.filter = filterEffects.join(" ");
            ctx.drawImage(snapshot, -blurPad, -blurPad, width + blurPad * 2, calcHeight + blurPad * 2);
            ctx.filter = "none";
        }

        if (settings.bgGrayscale > 0) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const grayscaleFactor = settings.bgGrayscale / 100;
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = data[i] + (avg - data[i]) * grayscaleFactor;
                data[i + 1] = data[i + 1] + (avg - data[i + 1]) * grayscaleFactor;
                data[i + 2] = data[i + 2] + (avg - data[i + 2]) * grayscaleFactor;
            }
            ctx.putImageData(imageData, 0, 0);
        }

        if (settings.bgNoise > 0) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const noiseLevel = settings.bgNoise / 100;
            for (let i = 0; i < data.length; i += 4) {
                const noise = (Math.random() - 0.5) * 255 * noiseLevel;
                data[i] = Math.min(255, Math.max(0, data[i] + noise));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
            }
            ctx.putImageData(imageData, 0, 0);
        }
    };

    const drawOverlay = () => {
        if (settings.overlayOpacity > 0) {
            ctx.fillStyle = `${settings.overlayColor}${Math.round(settings.overlayOpacity * 255)
                .toString(16)
                .padStart(2, "0")}`;
            ctx.fillRect(0, 0, width, calcHeight);
        }
    };

    const drawFooter = () => {
        const textColor = settings.fontColor || "#000000";
        ctx.textBaseline = "alphabetic";

        if (metaLines.length) {
            let y = metaStartY + metaMetrics.gapBefore;
            ctx.font = `${metaMetrics.fontSize}px ${getCSSFontFamily("Pretendard-Regular")}`;
            ctx.textAlign = "left";
            ctx.fillStyle = textColor;
            metaLines.forEach((line) => {
                ctx.globalAlpha = line.alpha;
                ctx.fillText(line.text, width * 0.1, y);
                y += metaMetrics.lineStep;
            });
            ctx.globalAlpha = 1;
        }

        if (isWatermarkEnabled(settings)) {
            ctx.font = `900 ${metaMetrics.watermarkSize}px ${getCSSFontFamily("Paperozi")}`;
            ctx.textAlign = "right";
            ctx.fillStyle = textColor;
            ctx.globalAlpha = 0.32;
            ctx.fillText(WATERMARK_MARK, width - metaMetrics.watermarkInset, calcHeight - metaMetrics.watermarkInset);
            ctx.globalAlpha = 1;
        }

        ctx.textAlign = "left";
    };

    const $preview = $("<div>").addClass("image-preview-item");
    const $img = $("<img>").attr({alt: `Generated Image ${index + 1}`});
    const $downloadBtn = $("<button>")
        .addClass("download-btn")
        .text("Download")
        .on("click", () => saveImage(canvas.toDataURL("image/png"), `${index + 1}.png`));

    if (useBgColor && !bgImage) {
        if (useSecondBgColor) {
            const gradient = ctx.createLinearGradient(0, 0, width, calcHeight);
            addSmoothGradientStops(gradient, bgColor, secondBgColor);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = bgColor;
        }
        ctx.fillRect(0, 0, width, calcHeight);
        drawOverlay();
        drawText();
        drawFooter();
        $img.attr("src", canvas.toDataURL("image/png"));
    } else if (bgImage) {
        const img = new Image();
        img.onload = () => {
            textWallpaper(img);
            drawOverlay();
            drawText();
            drawFooter();
            $img.attr("src", canvas.toDataURL("image/png"));
        };
        img.onerror = () => {
            drawOverlay();
            drawText();
            drawFooter();
            $img.attr("src", canvas.toDataURL("image/png"));
        };
        img.src = bgImage;
    } else {
        ctx.fillRect(0, 0, width, calcHeight);
        drawOverlay();
        drawText();
        drawFooter();
        $img.attr("src", canvas.toDataURL("image/png"));
    }

    if (settings.imageRatio === "rectangular") $img.addClass("rectangular");
    if (isFullSize) $img.addClass("full");
    $preview.append($img, $downloadBtn);
    return $preview;
}
function escapeHTML(text = "") {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeCSSURL(url = "") {
    return String(url).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function toRGBA(hex, alpha = 1) {
    const fallback = `rgba(255,255,255,${alpha})`;
    if (!hex || typeof hex !== "string") return fallback;

    const cleanHex = hex.replace("#", "").trim();
    if (![3, 6].includes(cleanHex.length)) return fallback;

    const fullHex =
        cleanHex.length === 3 ?
            cleanHex
                .split("")
                .map((ch) => ch + ch)
                .join("")
        :   cleanHex;

    const r = parseInt(fullHex.slice(0, 2), 16);
    const g = parseInt(fullHex.slice(2, 4), 16);
    const b = parseInt(fullHex.slice(4, 6), 16);

    if ([r, g, b].some(Number.isNaN)) return fallback;
    return `rgba(${r},${g},${b},${alpha})`;
}
function normalizeHexColor(color = "#000000") {
    const normalized = String(color || "")
        .trim()
        .toLowerCase();
    if (!normalized) return null;
    let hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
    if (hex.length === 3) {
        hex = hex
            .split("")
            .map((ch) => ch + ch)
            .join("");
    }
    if (!/^[0-9a-f]{6}$/.test(hex)) return null;
    return `#${hex}`;
}
function mixHexColors(colorA, colorB, ratio = 0.5) {
    const a = normalizeHexColor(colorA);
    const b = normalizeHexColor(colorB);
    if (!a || !b) return a || b || "#000000";

    const clampRatio = Math.max(0, Math.min(1, Number(ratio)));
    const ar = parseInt(a.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16);
    const bg = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);

    const r = Math.round(ar + (br - ar) * clampRatio);
    const g = Math.round(ag + (bg - ag) * clampRatio);
    const bl = Math.round(ab + (bb - ab) * clampRatio);
    const toHex = (n) => n.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}
function buildSmoothGradientCSS(colorA, colorB, angle = "135deg") {
    const c1 = normalizeHexColor(colorA) || colorA;
    const c2 = normalizeHexColor(colorB) || colorB;
    const c25 = mixHexColors(c1, c2, 0.25);
    const c50 = mixHexColors(c1, c2, 0.5);
    const c75 = mixHexColors(c1, c2, 0.75);
    return `linear-gradient(${angle}, ${c1} 0%, ${c25} 35%, ${c50} 60%, ${c75} 80%, ${c2} 100%)`;
}
function addSmoothGradientStops(gradient, colorA, colorB) {
    const c1 = normalizeHexColor(colorA) || colorA;
    const c2 = normalizeHexColor(colorB) || colorB;
    gradient.addColorStop(0, c1);
    gradient.addColorStop(0.35, mixHexColors(c1, c2, 0.25));
    gradient.addColorStop(0.6, mixHexColors(c1, c2, 0.5));
    gradient.addColorStop(0.8, mixHexColors(c1, c2, 0.75));
    gradient.addColorStop(1, c2);
}
function mapHtmlStrokeWidth(value) {
    const numeric = parseFloat(value) || 0;
    if (numeric === 0.8) return 0.1;
    if (numeric === 1.5) return 0.3;
    return numeric;
}
function getSpanColor(span, settings) {
    let textColor = span.isBlockquote ? settings.blockquoteFontColor || defaultSettings.blockquoteFontColor : settings.fontColor || "#000000";
    if (span.fontColor) {
        textColor = span.fontColor;
    } else {
        if (span.quote && settings.useQuotesColor) {
            textColor = settings.quotesFontColor || textColor;
        } else if (span.strikethrough && settings.useStrikethroughColor) {
            textColor = settings.strikethroughFontColor || textColor;
        } else if (span.underline && settings.useUnderlineColor) {
            textColor = settings.underlineFontColor || textColor;
        } else if (span.bold && span.italic && settings.useBoldItalicColor) {
            textColor = settings.boldItalicFontColor || textColor;
        } else if (span.bold && !span.italic && settings.useBoldColor) {
            textColor = settings.boldFontColor || textColor;
        } else if (!span.bold && span.italic && settings.useItalicColor) {
            textColor = settings.italicFontColor || textColor;
        }
    }
    return textColor;
}
function getSpanStrokeWidth(span, settings) {
    if (span.strokeWidth !== undefined && span.strokeWidth !== null) {
        if (span.strokeWidth === "inherit") {
            return mapHtmlStrokeWidth(settings.strokeWidth);
        }
        return mapHtmlStrokeWidth(span.strokeWidth);
    }
    return mapHtmlStrokeWidth(settings.strokeWidth);
}
function buildSpanStyle(span, settings) {
    const style = [];
    const decorations = [];
    const strokeWidth = getSpanStrokeWidth(span, settings);
    const textColor = getSpanColor(span, settings);

    style.push(`color:${textColor} !important`);
    style.push("line-height:inherit !important");
    style.push("letter-spacing:inherit !important");
    style.push("font-size:inherit !important");
    if (span.bold) style.push("font-weight:700 !important");
    if (span.italic) style.push("font-style:italic !important");
    if (span.underline) decorations.push("underline");
    if (span.strikethrough) decorations.push("line-through");
    if (decorations.length) {
        style.push(`text-decoration:${decorations.join(" ")} !important`);
    }
    if (span.bgColor) {
        style.push(`background-color:${span.bgColor} !important`);
        const isGangwon = span.htmlFontFamily === "GangwonEducationModuche" || ((!span.htmlFontFamily || span.htmlFontFamily === "useGlobal") && settings?.htmlFontFace === "GangwonEducationModuche");
        if (isGangwon) {
            style.push("padding: 0.23em 0 0.1em 0 !important");
        }
        style.push("-webkit-box-decoration-break:clone !important");
        style.push("box-decoration-break:clone !important");
    }
    if (span.fontSize) {
        style.push(`font-size:${span.fontSize}px !important`);
    }
    if (strokeWidth > 0) {
        style.push(`-webkit-text-stroke:${strokeWidth}px ${textColor} !important`);
    }
    return style.join("; ");
}
function renderMarkdownHTML(text, settings) {
    const lines = String(text || "").split(/\n/);
    const htmlFontFace = getHtmlFontFace(settings);
    const renderLineHTML = (lineText, isBlockquoteLine = false) => {
        let spans = enableMarkdown(lineText);
        if (isBlockquoteLine) {
            spans = spans.map((span) => ({...span, isBlockquote: true}));
        }
        if (!spans.length) return `<font face="${htmlFontFace}"></font>`;

        const groups = [];
        let currentGroup = {face: htmlFontFace, parts: []};
        spans.forEach((span) => {
            const spanFace = span.htmlFontFamily && span.htmlFontFamily !== "useGlobal" ? normalizeHtmlFontFace(span.htmlFontFamily) : htmlFontFace;
            if (spanFace !== currentGroup.face) {
                if (currentGroup.parts.length) groups.push(currentGroup);
                currentGroup = {face: spanFace, parts: []};
            }
            const spanText = escapeHTML(span.text || "");
            const spanStyle = buildSpanStyle(span, settings);
            currentGroup.parts.push(spanStyle ? `<span style="${spanStyle}">${spanText}</span>` : spanText);
        });
        if (currentGroup.parts.length) groups.push(currentGroup);

        return groups.map((g) => `<font face="${g.face}">${g.parts.join("")}</font>`).join("");
    };

    const htmlLines = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (/^-{3,}$/.test(trimmedLine) || /^<hr\s*\/?>$/i.test(trimmedLine)) {
            htmlLines.push(`<hr style="display: block !important; opacity: 0.4 !important; border:0 !important;height:1px !important;background-image:linear-gradient(90deg, transparent, ${settings.fontColor || "#000000"}, transparent) !important;margin:28px auto calc(28px - 1rem) !important;" />`);
            continue;
        }

        const quoteMatch = line.match(/^\s*>\s?(.*)$/);
        if (quoteMatch) {
            const quoteLines = [];
            let j = i;
            while (j < lines.length) {
                const m = lines[j].match(/^\s*>\s?(.*)$/);
                if (!m) break;
                quoteLines.push(m[1] ?? "");
                j++;
            }
            const fontColor = settings.blockquoteFontColor || defaultSettings.blockquoteFontColor;
            const borderColor = settings.blockquoteBorderColor || defaultSettings.blockquoteBorderColor;
            const bgColor = toRGBA(settings.blockquoteBgColor || defaultSettings.blockquoteBgColor, 0.3);
            const quoteHTML = quoteLines.map((quoteLine) => `<div style="margin:0 !important;">${renderLineHTML(quoteLine, true)}</div>`).join("");
            htmlLines.push(`<div class="blockquote" style="width:auto !important;color:${fontColor} !important;border-radius:5px !important;border-left:5px solid ${borderColor} !important;padding:8px !important;background:${bgColor} !important;-webkit-backdrop-filter:blur(10px) !important;backdrop-filter:blur(10px) !important;margin:8px 0 !important;"><div style="display:flex !important;flex-direction:column !important;gap:0 !important;margin:0 !important;">${quoteHTML}</div></div>`);
            i = j - 1;
            continue;
        }
        htmlLines.push(renderLineHTML(line));
    }

    return htmlLines.join("\n");
}
function createHTMLSnippet(text, index) {
    const settings = extension_settings[extensionName];
    const htmlSelectedBackground = settings.selectedBackgroundImageHtml || settings.selectedBackgroundImage;
    const bgURL = resolveBackgroundURLForHTML(htmlSelectedBackground);
    const markdownHTML = renderMarkdownHTML(replaceWords(text), settings);
    const switcherTexts = getHtmlSwitcherTexts();
    const switcherRenderedHTML = switcherTexts.map((itemText) => renderMarkdownHTML(replaceWords(itemText), settings));
    const switcherUid = `tti-switch-${index}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1679616).toString(36)}`;
    const switcherBaseId = `${switcherUid}-base`;

    const backgroundColor = settings.backgroundColor || "#ffffff";
    const secondColor = settings.secondBackgroundColor || backgroundColor;
    const smoothGradient = buildSmoothGradientCSS(backgroundColor, secondColor);
    const useBgColor = !!settings.useBackgroundColor;
    const useSecondBgColor = !!settings.useSecondBackgroundColor;
    const escapedURL = bgURL ? escapeCSSURL(bgURL) : "";
    const colorBackground =
        useBgColor ?
            useSecondBgColor ? smoothGradient
            :   backgroundColor
        :   "transparent";
    const colorBackgroundImage =
        useBgColor ?
            useSecondBgColor ? smoothGradient
            :   `linear-gradient(${backgroundColor}, ${backgroundColor})`
        :   "none";
    const bgLayerImage =
        escapedURL ?
            useBgColor ? `${colorBackgroundImage}, url('${escapedURL}')`
            :   `url('${escapedURL}')`
        :   "none";

    const filterEffects = [];
    filterEffects.push(`brightness(${settings.bgBrightness ?? 100}%)`);
    filterEffects.push(`hue-rotate(${settings.bgHue ?? 0}deg)`);
    if (settings.bgGrayscale > 0) filterEffects.push(`grayscale(${settings.bgGrayscale}%)`);
    const bgFilter = filterEffects.join(" ");

    const overlayOpacity = Math.min(1, Math.max(0, Number(settings.overlayOpacity) || 0));
    const blurStrength = Math.max(0, Number(settings.bgBlur) || 0);
    const lineBreakByChar = (settings.lineBreak || "byWord") === "byChar";
    const globalStrokeWidth = mapHtmlStrokeWidth(settings.strokeWidth);
    const globalTextColor = settings.fontColor || "#000000";
    const htmlFontSize = parseInt(settings.fontSizeHtml, 10) || defaultSettings.fontSizeHtml;
    const footerLayoutMode = getFooterLayoutMode(settings);
    const footerWidthPx = parsePositiveInt(settings.footerWidth, defaultSettings.footerWidth);
    const footerHeightPx = parsePositiveInt(settings.footerHeight, defaultSettings.footerHeight);
    const metaLines = getMetaLines(settings);
    const showWatermark = isWatermarkEnabled(settings);
    const hasMeta = metaLines.length > 0;
    const hasFooter = hasMeta || showWatermark;
    const isScrollFooterLayout = footerLayoutMode === "scroll";
    const contentMaxHeightValue = "none";
    const containerInlineStyle = ["background:transparent !important", "box-sizing:border-box !important", "width:100% !important", `max-width:${footerWidthPx}px !important`, "display:grid !important", "grid-template-rows:minmax(0,1fr) !important", isScrollFooterLayout ? `aspect-ratio:${footerWidthPx} / ${Math.max(footerWidthPx, footerHeightPx)} !important` : "aspect-ratio:auto !important", isScrollFooterLayout ? "min-height:0 !important" : `min-height:min(${footerWidthPx}px, 100vw) !important`, "height:auto !important", "max-height:none !important", "margin:0 auto !important", "padding:32px !important", "border-radius:5px !important", "overflow:hidden !important", "isolation:isolate !important"].join(";");
    const bgInlineStyle = ["border-radius:5px !important", `background:${useBgColor ? colorBackground : "transparent"} !important`, `background-image:${bgLayerImage} !important`, "background-size:cover !important", "background-position:center !important", "background-repeat:no-repeat !important", `filter:${bgFilter || "none"} !important`].join(";");
    const overlayInlineStyle = ["border-radius:5px !important", `background:${toRGBA(settings.overlayColor || "#ffffff", overlayOpacity)} !important`, `-webkit-backdrop-filter:blur(${blurStrength}px) !important`, `backdrop-filter:blur(${blurStrength}px) !important`, "pointer-events:none !important"].join(";");
    const switcherDotsWrapStyle = ["display:flex !important", "justify-content:flex-end !important", "margin:6px 10px 0 0 !important", "gap:6px !important", "z-index:1 !important", "pointer-events:auto !important"].join(";");
    const switcherDotStyle = ["display:block !important", "width:15px !important", "height:10px !important", "border-radius:999px !important", "background:rgba(255,255,255,0.55) !important", "border:1px solid rgba(0,0,0,0.18) !important", "cursor:pointer !important", "transition:transform .15s ease, background-color .15s ease !important"].join(";");
    const contentInlineStyle = ["grid-area:1 / 1 !important", `min-height:${isScrollFooterLayout ? "0" : "min-content"} !important`, "box-sizing:border-box !important", "width:100% !important", "margin-left:0 !important", "margin-right:0 !important", "padding:0 !important", `max-height:${contentMaxHeightValue} !important`, `overflow-y:${isScrollFooterLayout ? "auto" : "visible"} !important`, `color:${globalTextColor} !important`, `font-size:${htmlFontSize}px !important`, "font-weight:400 !important", `letter-spacing:${settings.fontSpacing || 0}em !important`, `line-height:${settings.fontLineHeight || 1.5} !important`, `text-align:${settings.fontAlign || "left"} !important`, "white-space:pre-wrap !important", `word-break:${lineBreakByChar ? "break-all" : "break-word"} !important`, "overflow-wrap:anywhere !important", "margin-bottom:0 !important", `-webkit-text-stroke:${globalStrokeWidth}px ${globalTextColor} !important`].join(";");
    const htmlFontFace = getHtmlFontFace(settings);
    const metaLineStyle = ["display:block !important", "margin:0 !important", `color:${globalTextColor} !important`, `font-size:${Math.max(10, Math.round((htmlFontSize * 28) / 38))}px !important`, "line-height:1.6 !important", "text-align:left !important"].join(";");
    const metaLinesHTML = metaLines.map((line) => `<span style="${metaLineStyle}opacity:${line.alpha} !important"><font face="${htmlFontFace}">${escapeHTML(line.text)}</font></span>`).join("");
    const watermarkStyle = ["position:absolute !important", "right:10px !important", "left:auto !important", "display:block !important", "width:100% !important", "margin:0 !important", "text-align:right !important", "bottom:10px !important", `color:${globalTextColor} !important`, "opacity:0.32 !important", "font-family:Paperozi, Pretendard-Regular, sans-serif !important", `font-size:${Math.round((htmlFontSize * 42) / 38)}px !important`, "font-weight:900 !important", "letter-spacing:-0.01em !important", "line-height:1 !important"].join(";");
    const watermarkHTML =
        showWatermark ?
            `
  <span class="tti-watermark" style="${watermarkStyle}">${WATERMARK_MARK}</span>`
        :   "";
    const footerInlineStyle = ["position:relative !important", "flex:0 0 auto !important", "display:flex !important", "flex-direction:column !important", "gap:2px !important", "width:100% !important", "box-sizing:border-box !important", "margin-left:0 !important", "margin-right:0 !important", "padding:0 !important", "margin-top:18px !important", "z-index:3 !important"].join(";");
    const stackInlineStyle = ["grid-area:1 / 1 !important", "position:relative !important", "display:flex !important", "flex-direction:column !important", "justify-content:center !important", "justify-content:safe center !important", "box-sizing:border-box !important", "width:100% !important", "min-height:0 !important", "margin:0 !important", "padding:0 !important", "z-index:3 !important"].join(";");
    const footerHTML =
        hasMeta ?
            `
    <div class="tti-footer" style="${footerInlineStyle}">${metaLinesHTML}</div>`
        :   "";
    const shouldRenderBg = escapedURL || useBgColor;
    const backgroundHTML =
        shouldRenderBg ?
            `
  <div class="tti-bg" style="${bgInlineStyle}"></div>`
        :   "";
    const hasSwitcher = switcherRenderedHTML.length > 0;
    const switcherItems = switcherRenderedHTML.map((html, itemIndex) => ({
        id: `${switcherUid}-${itemIndex}`,
        panelClass: `tti-panel-${itemIndex}`,
        html,
        itemIndex,
    }));
    const switcherRadiosHTML =
        hasSwitcher ?
            `
  <input type="radio" class="tti-switch-input" name="${switcherUid}" id="${switcherBaseId}" checked>
${switcherItems.map((item) => `  <input type="radio" class="tti-switch-input" name="${switcherUid}" id="${item.id}">`).join("\n")}`
        :   "";
    const switcherDotsHTML = hasSwitcher ? `<div class="tti-switcher-dots" style="${switcherDotsWrapStyle}"><label style="${switcherDotStyle}" title="기본 텍스트" for="${switcherBaseId}"></label>${switcherItems.map((item) => `<label style="${switcherDotStyle}" title="텍스트 ${item.itemIndex + 1}" for="${item.id}"></label>`).join("")}</div>` : "";
    const overlayHTML = `
  <div class="tti-overlay" style="${overlayInlineStyle}">${switcherDotsHTML}</div>`;
    const contentHTML =
        hasSwitcher ?
            `
    <div class="tti-panels" style="margin-top: 10px;">
      <div class="tti-content tti-panel tti-panel-base" style="${contentInlineStyle}">${markdownHTML}</div>
${switcherItems.map((item) => `    <div class="tti-content tti-panel ${item.panelClass}" style="${contentInlineStyle}">${item.html}</div>`).join("\n")}
    </div>`
        :   `
    <div class="tti-content" style="${contentInlineStyle}">${markdownHTML}</div>`;
    const switcherRuleStyle = hasSwitcher ? [".tti .tti-panels{display:grid !important;min-height:0 !important;margin:0 !important;}", `.tti-switch-input{position:absolute !important;opacity:0 !important;pointer-events:none !important;}`, `.tti-panels{position:relative !important;z-index:3 !important;}`, `.tti-panel{display:none !important;}`, `#${switcherBaseId}:checked ~ .tti-stack .tti-panels .tti-panel-base{display:block !important;}`, `#${switcherBaseId}:checked ~ .tti-overlay .tti-switcher-dots label[for="${switcherBaseId}"]{background:rgba(255,255,255,0.95) !important;transform:scale(1.12) !important;}`, ...switcherItems.map((item) => `#${item.id}:checked ~ .tti-stack .tti-panels .${item.panelClass}{display:block !important;}`), ...switcherItems.map((item) => `#${item.id}:checked ~ .tti-overlay .tti-switcher-dots label[for="${item.id}"]{background:rgba(255,255,255,0.95) !important;transform:scale(1.12) !important;}`)].join("") : "";
    const scopedStyle = `.tti{position:relative !important;}.tti-bg{position:absolute !important;inset:0 !important;z-index:0 !important;}.tti-overlay{position:absolute !important;inset:0 !important;margin:0 !important;padding:0 !important;z-index:2 !important;}.tti-content{position:relative !important;z-index:3 !important;}.tti-footer{position:relative !important;z-index:4 !important;scrollbar-width:none !important;}.tti-footer::-webkit-scrollbar{height:0 !important;}.tti-watermark{z-index:4 !important;}${switcherRuleStyle}`;

    return `${webFontStyleMarkup()}<div>
<style>${scopedStyle}</style>
<div class="tti" style="${containerInlineStyle}">
${backgroundHTML}${switcherRadiosHTML}${overlayHTML}
  <div class="tti-stack" style="${stackInlineStyle}">${contentHTML}${footerHTML}
  </div>${watermarkHTML}
</div>
</div>`;
}
function generateHTMLPreview(text, index) {
    const htmlCode = createHTMLSnippet(text, index);
    const previewFontFamily = getHtmlPreviewFontFamily();
    const fontFaceMap = {
        Ridibatang: "RIDIBatang",
        "Nanum Gothic": "Pretendard-Regular",
        GangwonEducationModuche: "GangwonEducationModuche",
        OngleipParkDahyeon: "OngleipParkDahyeon",
    };
    getWebFonts()
        .filter((font) => font.html)
        .forEach((font) => {
            fontFaceMap[font.family] = getCSSFontFamily(font.family);
        });
    const perFontFaceRules = Object.entries(fontFaceMap)
        .map(([face, family]) => `.html-render-preview .tti-content font[face="${face}"],.html-render-preview .tti-content font[face="${face}"] span[style]{font-family:${family} !important;}`)
        .join("");
    const previewOnlyStyle = `<style>.html-render-preview .tti-content,.html-render-preview .tti-content span[style],.html-render-preview .tti-footer,.html-render-preview .tti-footer *{font-family:${previewFontFamily} !important;}${perFontFaceRules}</style>`;

    const $preview = $("<div>").addClass("image-preview-item html-preview-item");
    const $rendered = $("<div>")
        .addClass("html-render-preview")
        .html(htmlCode + previewOnlyStyle);
    const $copyBtn = $("<button>")
        .addClass("download-btn")
        .text("코드 복사")
        .on("click", async () => {
            const copied = await copyToClipboard(htmlCode);
            if (!copied) {
                alert("코드 복사에 실패했습니다.");
            }
        });

    $preview.append($rendered, $copyBtn);
    return $preview;
}

// 일괄 다운 zip
function autoDownload(allDLbuttons, delay = 1500) {
    setTimeout(() => {
        const DLbuttons = $(allDLbuttons);
        if (DLbuttons.length > 1) {
            zipDL(DLbuttons);
        } else {
            let index = 0;
            controlDL(DLbuttons, index);
        }
    }, delay);
}
async function zipDL(DLbuttons) {
    if (typeof JSZip === "undefined") {
        await loadScript(JSZipLocal, JSZipCDN);
    }
    if (typeof saveAs === "undefined") {
        await loadScript(FileSaverLocal, FileSaverCDN);
    }

    const zip = new JSZip();
    const now = new Date();
    const dateString = `[Log] ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${now.getHours()}-${now.getMinutes()}`;

    const zipper = `${dateString}`;
    const zipFormat = ".zip";
    const promises = [];

    for (let i = 0; i < DLbuttons.length; i++) {
        const $img = $(DLbuttons[i]).siblings("img");
        const imgSrc = $img.attr("src");
        const imageName = `${zipper} (${i + 1}).png`;

        const base64ori = imgSrc.split(",")[1];
        const imageData = atob(base64ori);
        const imgArray = new Uint8Array(imageData.length);

        for (let j = 0; j < imageData.length; j++) {
            imgArray[j] = imageData.charCodeAt(j);
        }

        zip.file(imageName, imgArray);
    }
    Promise.all(promises).then(() => {
        zip.generateAsync({type: "blob"}).then((content) => {
            saveAs(content, zipper + zipFormat);
        });
    });
}
function loadScript(src, fallbackSrc) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => {
            if (fallbackSrc) {
                console.warn(`[txt-to-img] ${src} 로드 실패, fallback: ${fallbackSrc}`);
                const fb = document.createElement("script");
                fb.src = fallbackSrc;
                fb.onload = resolve;
                fb.onerror = reject;
                document.head.appendChild(fb);
            } else {
                reject(new Error(`Script load failed: ${src}`));
            }
        };
        document.head.appendChild(script);
    });
}
function controlDL(DLbuttons, index) {
    if (index < DLbuttons.length) {
        $(DLbuttons[index]).trigger("click");
        index++;
        setTimeout(() => controlDL(DLbuttons, index), 1000);
    }
}

// 저장 이미지 형식
async function saveImage(dataUrl, filename) {
    if (typeof saveAs === "undefined") {
        await loadScript(FileSaverLocal, FileSaverCDN);
    }

    const now = new Date();
    const dateString = `[Log] ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${now.getHours()}-${now.getMinutes()}`;
    const index = filename.replace(".png", "");

    const base64ori = dataUrl.split(",")[1];
    const binary = atob(base64ori);
    const imgArray = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        imgArray[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([imgArray], {type: "image/png"});

    saveAs(blob, `${dateString} (${index}).png`);
}
async function copyToClipboard(content) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(content);
            return true;
        } catch (error) {
            console.warn("[txt-to-img] clipboard write failed", error);
        }
    }

    const temp = document.createElement("textarea");
    temp.value = content;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    temp.style.pointerEvents = "none";
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(temp);
    return copied;
}

// 추가 다운로드 버튼
jQuery(async () => {
    try {
        setupReplaceRuleUI();
        setupMetaUI();
        setupCompositeControls();
        setupModals();
        setupRichTextHighlighter();
        setupPreviewCarousel();
        await initSettings();
        presetUI();
        presetBackupSys();
        await customBG();
        setupHtmlSwitcherInputs();
        bindingFunctions();
        restoreButtons();
        tabButtons();
        highlighterOption();
        setupSettingsPopup();
    } catch (error) {
        console.error("[txt-to-img] 초기화 실패:", error);
    }
});

function openSettingsPopup() {
    $(".text-to-image-converter-settings").addClass("tti-popup-open");
    $("#tti_popup_backdrop").addClass("tti-popup-open");
}

function closeSettingsPopup() {
    $(".tti-modal-backdrop").removeClass("open");
}

function setupSettingsPopup() {
    openSettingsPopup();
}

function bindingFunctions() {
    $("#tti_font_family").on("change", fontFamily);
    $("#tti_font_size_image").on("change", fontSizeImage);
    $("#tti_font_size_html").on("change", fontSizeHtml);
    $("#tti_html_font_face").on("change", htmlFontFace);
    $("#tti_letter_spacing").on("change", fontSpacing);
    $("#tti_line_height").on("change", fontLineHeight);
    $("#tti_font_align").on("change", fontAlign);
    $("#tti_font_color").on("change", fontColor);
    $("#use_italic_color").on("change", useItalicColor);
    $("#tti_italic_font_color").on("change", italicFontColor);
    $("#use_bold_color").on("change", useBoldColor);
    $("#tti_bold_font_color").on("change", boldFontColor);
    $("#use_boldItalic_color").on("change", useBoldItalicColor);
    $("#tti_boldItalic_font_color").on("change", boldItalicFontColor);
    $("#use_strikethrough_color").on("change", useStrikethroughColor);
    $("#tti_strikethrough_font_color").on("change", strikethroughFontColor);
    $("#use_underline_color").on("change", useUnderlineColor);
    $("#tti_underline_font_color").on("change", underlineFontColor);
    $("#use_quotes_color").on("change", useQuotesColor);
    $("#tti_quotes_font_color").on("change", quotesFontColor);
    $("#tti_blockquote_font_color").on("change", blockquoteFontColor);
    $("#tti_blockquote_bg_color").on("change", blockquoteBgColor);
    $("#tti_blockquote_border_color").on("change", blockquoteBorderColor);
    $("#tti_stroke_width").on("change", strokeWidth);
    $("#tti_line_break").on("change", lineBreak);
    $("#tti_ratio").on("change", aspectRatio);
    $("#tti_fill_mode").on("change", bgFillMode);
    $("#text_to_image").on("input change", refreshPreview);
    $("#use_background_color").on("change", useBackgroundColor);
    $("#background_color").on("change", backgroundColor);
    $("#use_second_background_color").on("change", useSecondBackgroundColor);
    $("#second_background_color").on("change", secondBackgroundColor);
    $("#bg_blur").on("change", addBlur);
    $("#bg_brightness").on("change", brightness);
    $("#bg_hue").on("change", hue);
    $("#bg_grayscale").on("change", grayScale);
    $("#bg_noise").on("change", addNoise);
    $("#overlay_color").on("change", overlayColor);
    $("#overlay_opacity").on("change", addOverlay);
    $("#footer_layout_mode").on("change", footerLayoutMode);
    $("#footer_width").on("change", footerWidth);
    $("#footer_height").on("change", footerHeight);
    $("#upload-local-font").on("click", addLocalFont);
    $("#delete-local-font").on("click", deleteLocalFont);
    $("#preview_toggle").on("change", autoPreview);
    $("#html_toggle").on("change", htmlMode);
    $(".refresh-preview").on("click", manualRefresh);
    $("#letter_control").on("change", letterCase);
    $("#unit_control").on("change", unitControl);

    $("#create_preset").on("click", () => {
        $("#preset_name").val("");
    });
    $("#clear_replace").on("click", () => {
        $("#tti_replace_list .replacer_box").val("");
        commitReplaceRulesFromUI();
    });
}

function organizeDialogueText(rawText) {
    if (!rawText) return rawText;

    const INVISIBLE_RE = /[\u200B-\u200D\uFEFF\u00A0]/g;
    const cleanEmpty = (s) => s.replace(INVISIBLE_RE, "").trim();

    const quoteRegex = /"[^"]*"|“[^”]*”|「[^」]*」|『[^』]*』/g;
    const lines = rawText.split(/\r\n|\n/);
    const rawSegments = [];

    lines.forEach((line) => {
        if (!cleanEmpty(line)) {
            rawSegments.push({type: "blank"});
            return;
        }

        let lastIndex = 0;
        let match;
        let hasQuote = false;
        quoteRegex.lastIndex = 0;

        while ((match = quoteRegex.exec(line)) !== null) {
            hasQuote = true;
            const before = line.slice(lastIndex, match.index).trim();
            if (cleanEmpty(before)) rawSegments.push({text: before, type: "narration"});
            rawSegments.push({text: match[0].trim(), type: "quote"});
            lastIndex = quoteRegex.lastIndex;
        }

        if (hasQuote) {
            const after = line.slice(lastIndex).trim();
            if (cleanEmpty(after)) rawSegments.push({text: after, type: "narration"});
        } else {
            rawSegments.push({text: line.trim(), type: "narration"});
        }
    });

    const segments = [];
    let pendingBlank = false;
    rawSegments.forEach((seg) => {
        if (seg.type === "blank") {
            pendingBlank = true;
            return;
        }
        segments.push({...seg, precededByBlank: pendingBlank});
        pendingBlank = false;
    });

    if (!segments.length) return "";

    const resultLines = [segments[0].text];
    for (let i = 1; i < segments.length; i++) {
        const prev = segments[i - 1];
        const cur = segments[i];

        let insertBlank;
        if (prev.type === "quote" && cur.type === "quote") {
            insertBlank = true;
        } else if (prev.type !== cur.type) {
            insertBlank = true;
        } else {
            insertBlank = true;
        }

        if (insertBlank) resultLines.push("");
        resultLines.push(cur.text);
    }

    return resultLines.join("\n");
}
function restoreButtons() {
    let lastText = null;

    const saveUndoState = () => {
        lastText = $("#text_to_image").val();
    };

    $("#clear_text_btn").on("click", () => {
        saveUndoState();
        $("#text_to_image").val("");
        syncRichEditorFromSource();
        refreshPreview();
    });
    $("#restore_text_btn").on("click", () => {
        if (lastText !== null) {
            const current = $("#text_to_image").val();
            $("#text_to_image").val(lastText);
            syncRichEditorFromSource();
            refreshPreview();
            lastText = current;
        }
    });
    $("#organize_text_btn").on("click", () => {
        saveUndoState();
        const current = $("#text_to_image").val();
        const organized = organizeDialogueText(current);
        $("#text_to_image").val(organized);
        syncRichEditorFromSource();

        $("#tti_html_switcher_list .tti-html-switcher-text").each(function () {
            const $this = $(this);
            $this.val(organizeDialogueText($this.val()));
        });

        refreshPreview();
    });
    $("#apply_replace_btn").on("click", () => {
        saveUndoState();
        const current = $("#text_to_image").val();
        const replaced = replaceWords(current);
        $("#text_to_image").val(replaced);
        syncRichEditorFromSource();
        refreshPreview();
    });
    $(".text-field-copy").on("click", async () => {
        const current = $("#text_to_image").val();
        const copied = await copyToClipboard(current);
        if (copied) {
            toastr.success("클립보드에 복사되었습니다");
        } else {
            toastr.warning("클립보드 복사에 실패했습니다");
        }
    });
}
function tabButtons() {
    $(".tab-btn").click(function () {
        $(".tab-btn").removeClass("active");
        $(".tab-content").removeClass("active");

        $(this).addClass("active");
        const tabId = $(this).data("tab");
        $("#" + tabId).addClass("active");
    });
    $(".tab-btn").first().click();
}
function highlighterOption() {
    $(document).on("click", ".tti-manage-pen", function () {
        const $item = $(this).closest(".tag-item");
        $("#tti_pen_settings_body").empty().append($item);
        openModal("tti_pen_settings_backdrop");
    });
    $(document).on("click", ".add-tag-btn", addHighlightTag);
    $(document).on("click", ".delete-tag-btn", function () {
        const index = $(this).closest(".tag-item").data("index");
        deleteHighlightTag(index);
    });

    $(document).on("input", ".tag-name", function () {
        const index = $(this).closest(".tag-item").data("index");
        updateHighlightTag(index, "label", $(this).val());
        renderPenBar();
    });

    $(document).on("change", ".tag-font-family", function () {
        const index = $(this).closest(".tag-item").data("index");
        updateHighlightTag(index, "fontFamily", $(this).val());
        refreshPreview();
    });
    $(document).on("change", ".tag-html-font-family", function () {
        const index = $(this).closest(".tag-item").data("index");
        updateHighlightTag(index, "htmlFontFamily", $(this).val());
        refreshPreview();
    });
    $(document).on("change", ".tag-stroke-width", function () {
        const index = $(this).closest(".tag-item").data("index");
        updateHighlightTag(index, "strokeWidth", $(this).val());
    });
    $(document).on("change", ".use-tag-font-color", function () {
        const index = $(this).closest(".tag-item").data("index");
        const checked = $(this).prop("checked");
        updateHighlightTag(index, "useTagFontColor", checked);
        $(this).closest(".tag-color-chip").find(".tag-font-color").prop("disabled", !checked);
        syncTagSwatch($(this).closest(".tag-item"));
    });
    $(document).on("change", ".tag-font-color", function () {
        const index = $(this).closest(".tag-item").data("index");
        updateHighlightTag(index, "fontColor", $(this).val());
        syncTagSwatch($(this).closest(".tag-item"));
    });

    $(document).on("change", ".use-tag-bg-color", function () {
        const index = $(this).closest(".tag-item").data("index");
        const checked = $(this).prop("checked");
        updateHighlightTag(index, "useTagBgColor", checked);
        $(this).closest(".tag-color-chip").find(".tag-bg-color").prop("disabled", !checked);
        syncTagSwatch($(this).closest(".tag-item"));
    });
    $(document).on("change", ".tag-bg-color", function () {
        const index = $(this).closest(".tag-item").data("index");
        updateHighlightTag(index, "bgColor", $(this).val());
        syncTagSwatch($(this).closest(".tag-item"));
    });

    $(document).on("input", ".tag-font-size", function () {
        const index = $(this).closest(".tag-item").data("index");
        const value = this.valueAsNumber;
        if (Number.isFinite(value) && value >= Number(this.min) && value <= Number(this.max)) updateHighlightTag(index, "fontSize", value);
    });
}
