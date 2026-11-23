import {setupMobileEditor} from "./modules/mobile-ui.js";
import {escapeRegExp, replaceWordsWithRules} from "./modules/replace-words.js";
import {generateTextImage as renderTextImageCanvas, revokePreviewObjectURLs, wrappingTexts as wrapTextChunks} from "./modules/canvas-renderer.js";
import {createHTMLSnippet as buildHTMLSnippet, generateHTMLPreview as buildHTMLPreview} from "./modules/html-export.js";

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
    const scriptSrc = import.meta.url;
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
    fontSize: 38,
    fontSizeImage: 38,
    fontSizeHtml: 14,
    fontSpacing: 0,
    fontLineHeight: 1.5,
    fontAlign: "left",
    textIndent: false,
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
    layoutTemplate: "default",
    sillybooksTheme: "light",
    templateStash: null,
};
let defaultBackgroundUrlMap = new Map();
let defaultBackgroundBasenameMap = new Map();
const CUSTOM_BG_STORAGE_IMAGE_KEY = "textToImageCustomBgsImage";
const CUSTOM_BG_STORAGE_HTML_KEY = "textToImageCustomBgsHTML";
const HTML_FONT_FACE_OPTIONS = new Set(["Ridibatang", "Nanum Gothic", "OngleipParkDahyeon", "GangwonEducationModuche"]);

const TEMPLATE_STASH_KEYS = ["fontFamily", "htmlFontFace", "fontColor", "backgroundColor", "chatTitleMode", "charNameMode", "useQuotesColor", "quotesFontColor", "useItalicColor", "italicFontColor", "blockquoteFontColor", "blockquoteBgColor", "blockquoteBorderColor"];
const SILLYBOOKS_THEMES = {
    light: {fontColor: "#25272b", backgroundColor: "#fcfcfc", quotesFontColor: "#46536a", italicFontColor: "#727984"},
    beige: {fontColor: "#403b36", backgroundColor: "#fffdf9", quotesFontColor: "#785948", italicFontColor: "#746a62"},
    dark: {fontColor: "#e0e0e0", backgroundColor: "#1d2026", quotesFontColor: "#f0d8d8", italicFontColor: "#aeb2ba"},
};
const SILLYBOOKS_DEFAULTS = {
    fontFamily: "RIDIBatang",
    htmlFontFace: "Ridibatang",
    chatTitleMode: "custom",
    charNameMode: "custom",
    ...SILLYBOOKS_THEMES.light,
};
function getSillybooksTheme(settings = extension_settings[extensionName]) {
    return Object.prototype.hasOwnProperty.call(SILLYBOOKS_THEMES, settings?.sillybooksTheme) ? settings.sillybooksTheme : "light";
}
function getSillybooksThemeValues(theme) {
    const colors = SILLYBOOKS_THEMES[theme] || SILLYBOOKS_THEMES.light;
    return {
        ...colors,
        useQuotesColor: true,
        useItalicColor: true,
        blockquoteFontColor: colors.fontColor,
        blockquoteBgColor: colors.backgroundColor,
        blockquoteBorderColor: colors.italicFontColor,
    };
}
function getLayoutTemplate(settings = extension_settings[extensionName]) {
    return settings?.layoutTemplate === "sillybooks" ? "sillybooks" : "default";
}
function isSillybooksTemplate(settings = extension_settings[extensionName]) {
    return getLayoutTemplate(settings) === "sillybooks";
}
function getImageRatio(settings = extension_settings[extensionName]) {
    return isSillybooksTemplate(settings) ? "full" : settings?.imageRatio;
}

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
const SHARE_LAYOUT = {
    paddingTop: 200,
    paddingBottom: 200,
    paddingBottomMeta: 200,
    metaGap: 0,
};
function getMetaMetrics(width) {
    const scale = width / SHARE_REFERENCE_WIDTH;
    return {
        fontSize: Math.round(28 * scale),
        lineStep: Math.round(42 * scale),
        watermarkSize: Math.round(42 * scale),
        watermarkInset: Math.round(45 * scale),
        paddingTop: Math.round(SHARE_LAYOUT.paddingTop * scale),
        paddingBottom: Math.round(SHARE_LAYOUT.paddingBottom * scale),
        paddingBottomMeta: Math.round(SHARE_LAYOUT.paddingBottomMeta * scale),
        metaGap: Math.round(SHARE_LAYOUT.metaGap * scale),
    };
}
function getVerticalReserve(width, metaLineCount, fontSize) {
    const metrics = getMetaMetrics(width);
    const metaGap = fontSize + metrics.metaGap;
    const metaHeight = metaLineCount ? metaGap + metaLineCount * metrics.lineStep : 0;
    const bottom = metaLineCount ? metrics.paddingBottomMeta : metrics.paddingBottom;
    return {top: metrics.paddingTop, metaGap, metaHeight, bottom, total: metrics.paddingTop + metaHeight + bottom};
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
    const {fontFamily, fontSizeImage, fontSizeHtml, htmlFontFace, fontSpacing, fontLineHeight, fontAlign, textIndent, fontColor, useItalicColor, italicFontColor, useBoldColor, boldFontColor, useBoldItalicColor, boldItalicFontColor, useStrikethroughColor, strikethroughFontColor, useUnderlineColor, underlineFontColor, useQuotesColor, quotesFontColor, blockquoteFontColor, blockquoteBgColor, blockquoteBorderColor, strokeWidth, lineBreak, imageRatio, imageFillMode, useBackgroundColor, backgroundColor, useSecondBackgroundColor, secondBackgroundColor, bgBlur, bgBrightness, bgHue, bgGrayscale, bgNoise, overlayOpacity, overlayColor, currentPreset, footerLayoutMode, footerWidth, footerHeight, autoPreview, htmlMode, letterCase, unitControl} = extension_settings[extensionName];

    $("#tti_font_family").val(fontFamily);
    $("#tti_font_size_image").val(fontSizeImage);
    $("#tti_font_size_html").val(fontSizeHtml);
    $("#tti_html_font_face").val(normalizeHtmlFontFace(htmlFontFace));
    $("#tti_letter_spacing").val(fontSpacing);
    $("#tti_line_height").val(fontLineHeight);
    $("#tti_font_align").val(fontAlign);
    $("#tti_text_indent").prop("checked", !!textIndent);
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
    applyTemplateUIState();
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
        $("#tti_text_indent").prop("checked", defaultSettings.textIndent);
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
        applyTemplateUIState();
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
        $("#tti_text_indent").prop("checked", defaultSettings.textIndent);
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
        applyTemplateUIState();
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
            case "textIndent":
                $("#tti_text_indent").prop("checked", !!value);
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
    if (!Object.prototype.hasOwnProperty.call(preset, "layoutTemplate")) {
        extension_settings[extensionName].layoutTemplate = defaultSettings.layoutTemplate;
        extension_settings[extensionName].templateStash = null;
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
    applyTemplateUIState();
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
    const ratio = getImageRatio();
    const width = SHARE_REFERENCE_WIDTH;
    switch (ratio) {
        case "square":
            return {width, height: width};
        case "rectangular":
            return {width, height: Math.round((width * 1100) / 700)};
        case "longer":
            return {width, height: Math.round((width * 2000) / 700)};
        case "full":
            return {width, height: null};
        default:
            return {width, height: width};
    }
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
    refreshPreview();
}
function unitControl(event) {
    extension_settings[extensionName].unitControl = event.target.checked;
    debouncedSaveSettings();
    refreshPreview();
}
function replaceWords(inputText) {
    const settings = extension_settings[extensionName];
    return replaceWordsWithRules(inputText, getReplaceRules(), {
        letterCase: !!settings.letterCase,
        unitControl: !!settings.unitControl,
    });
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
function textIndent(event) {
    extension_settings[extensionName].textIndent = event.target.checked;
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
    if (!event.target.checked && activeHtmlPageIndex !== 0) {
        switchHtmlPage(0, {skipPreview: true});
    }
    extension_settings[extensionName].htmlMode = event.target.checked;
    extension_settings[extensionName].fontSize = getActiveFontSize();
    saveSettings();
    applyHtmlModeUIState();
    renderHtmlPageTabs();
    updateTextLengthBadge();
    updateFooterLayoutUIState();
    loadCustomBG();
    syncSelectedBackgroundUI();
    refreshPreview();
}
function applyTemplateUIState() {
    const sillybooks = isSillybooksTemplate();
    $("#sillybooks_toggle").prop("checked", sillybooks);
    $("[data-sb-hide]").toggleClass("sb-mode-hidden", sillybooks);
    $("[data-sb-only]").toggleClass("sb-mode-only", !sillybooks);
    const theme = getSillybooksTheme();
    $(".tti-segment[data-sb-theme]").toggleClass("disabled", !sillybooks);
    $(".tti-segment[data-sb-theme] button").each(function () {
        $(this).toggleClass("active", $(this).data("theme") === theme).prop("disabled", !sillybooks);
    });
    if (sillybooks && $(".tab-btn.active").is("[data-sb-hide]")) {
        $(".tab-btn").first().trigger("click");
    }
}
function syncTemplateInputs() {
    const settings = extension_settings[extensionName];
    $("#tti_font_family").val(currentCustomFont ? oriFontFamily : settings.fontFamily);
    settings.htmlFontFace = normalizeHtmlFontFace(settings.htmlFontFace);
    $("#tti_html_font_face").val(settings.htmlFontFace);
    $("#tti_font_color").val(settings.fontColor);
    $("#background_color").val(settings.backgroundColor);
    $("#use_quotes_color").prop("checked", !!settings.useQuotesColor);
    $("#tti_quotes_font_color").val(settings.quotesFontColor);
    $("#use_italic_color").prop("checked", !!settings.useItalicColor);
    $("#tti_italic_font_color").val(settings.italicFontColor);
    $("#tti_blockquote_font_color").val(settings.blockquoteFontColor || defaultSettings.blockquoteFontColor);
    $("#tti_blockquote_bg_color").val(settings.blockquoteBgColor || defaultSettings.blockquoteBgColor);
    $("#tti_blockquote_border_color").val(settings.blockquoteBorderColor || defaultSettings.blockquoteBorderColor);
    settings.chatTitleMode = normalizeMetaMode(settings.chatTitleMode);
    settings.charNameMode = normalizeMetaMode(settings.charNameMode);
    syncMetaUIState();
}
async function setLayoutTemplate(nextTemplate) {
    const settings = extension_settings[extensionName];
    const current = getLayoutTemplate(settings);
    const next = nextTemplate === "sillybooks" ? "sillybooks" : "default";
    if (current !== next) {
        const stash = settings.templateStash && typeof settings.templateStash === "object" ? settings.templateStash : {};
        const fallback = next === "sillybooks" ? {...SILLYBOOKS_DEFAULTS, ...getSillybooksThemeValues(getSillybooksTheme(settings))} : defaultSettings;
        const outgoing = {};
        TEMPLATE_STASH_KEYS.forEach((key) => {
            outgoing[key] = key === "fontFamily" && currentCustomFont ? oriFontFamily : settings[key];
            const value = stash[next]?.[key] ?? fallback[key];
            if (key === "fontFamily" && currentCustomFont) {
                oriFontFamily = value;
            } else {
                settings[key] = value;
            }
        });
        settings.templateStash = {...stash, [current]: outgoing};
        settings.layoutTemplate = next;
        syncTemplateInputs();
    }
    applyTemplateUIState();
    saveSettings();
    await ensurePreviewFontsLoaded();
    refreshPreview();
}
function setSillybooksTheme(theme) {
    const settings = extension_settings[extensionName];
    settings.sillybooksTheme = Object.prototype.hasOwnProperty.call(SILLYBOOKS_THEMES, theme) ? theme : "light";
    if (isSillybooksTemplate(settings)) {
        Object.assign(settings, getSillybooksThemeValues(settings.sillybooksTheme));
        syncTemplateInputs();
    }
    applyTemplateUIState();
    saveSettings();
    refreshPreview();
}
function sillybooksTemplate(event) {
    setLayoutTemplate(event.target.checked ? "sillybooks" : "default");
}
function getPreviewChunks() {
    if (isHtmlModeEnabled()) {
        syncActiveHtmlPageFromInput();
        return [getHtmlMainText()];
    }

    const text = $("#text_to_image").val() || "";
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
function updateTallPreviewLayout() {
    const stage = document.querySelector(".tti-preview-stage");
    const preview = document.getElementById("image_preview_container");
    if (!stage || !preview) return;
    const isMobile = matchMedia("(max-width: 1000px)").matches;
    const stageWidth = Math.min(430, Math.max(0, preview.clientWidth));
    const rawHeight = Math.max(0, stage.clientHeight - (isMobile ? 30 : 34));
    const stageHeight = isMobile ? rawHeight : Math.min(Math.round(window.innerHeight * 0.64), 660, rawHeight || 660);
    const squareWidth = Math.min(stageWidth, stageHeight);

    preview.querySelectorAll(".image-preview-item:not(.html-preview-item)").forEach((item) => {
        const img = item.querySelector("img");
        const w = Number(item.dataset.imgWidth) || img?.naturalWidth || 0;
        const h = Number(item.dataset.imgHeight) || img?.naturalHeight || 0;
        if (!w || !h || !squareWidth || !stageHeight) {
            item.classList.remove("is-tall-scroll");
            item.style.removeProperty("--tti-scroll-width");
            item.style.removeProperty("--tti-scroll-height");
            return;
        }
        const isTall = h > w && squareWidth * (h / w) > stageHeight * 1.12;
        item.classList.toggle("is-tall-scroll", isTall);
        if (isTall) {
            item.style.setProperty("--tti-scroll-width", `${Math.round(squareWidth)}px`);
            item.style.setProperty("--tti-scroll-height", `${Math.round(stageHeight)}px`);
        } else {
            item.style.removeProperty("--tti-scroll-width");
            item.style.removeProperty("--tti-scroll-height");
        }
    });
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
    updateTallPreviewLayout();
}
function setupPreviewCarousel() {
    $(document).on("click", ".tti-preview-arrow.previous", () => setPreviewIndex(previewIndex - 1));
    $(document).on("click", ".tti-preview-arrow.next", () => setPreviewIndex(previewIndex + 1));

    const stageEl = document.querySelector(".tti-preview-stage");
    if (stageEl) {
        new ResizeObserver(updateTallPreviewLayout).observe(stageEl);
    }
    window.addEventListener("resize", updateTallPreviewLayout);

    let swipeStartX = null;
    let swipeStartY = null;
    const stageSelector = ".tti-preview-stage";
    $(document).on("pointerdown", stageSelector, function (event) {
        if ($(event.target).closest(".tti-preview-arrow, .download-btn, .html-render-preview").length) return;
        swipeStartX = event.clientX;
        swipeStartY = event.clientY;
    });
    $(document).on("pointercancel", stageSelector, function () {
        swipeStartX = null;
        swipeStartY = null;
    });
    $(document).on("pointerup", stageSelector, function (event) {
        if (swipeStartX === null) return;
        const dx = event.clientX - swipeStartX;
        const dy = event.clientY - swipeStartY;
        swipeStartX = null;
        swipeStartY = null;
        if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        setPreviewIndex(previewIndex + (dx < 0 ? 1 : -1));
    });
}
let previewRenderGeneration = 0;
let lastPreviewReadyPromise = Promise.resolve();
function renderPreviewContent() {
    const mobileScroll = document.querySelector(".tti-mobile-ready .tti-mobile-scroll");
    const mobileScrollTop = mobileScroll?.scrollTop;
    const chunks = getPreviewChunks();
    const keepIndex = previewIndex;
    const generation = ++previewRenderGeneration;
    revokePreviewObjectURLs();
    const $container = $("#image_preview_container").empty();
    const readyPromises = [];

    chunks.forEach((chunk, i) => {
        const $item = isHtmlModeEnabled() ? generateHTMLPreview(chunk, i) : generateTextImage(chunk, i, generation);
        const ready = $item.data("ttiReady");
        if (ready) readyPromises.push(ready);
        $container.append($item);
    });

    updatePreviewDownloadAllButton(chunks.length);
    setPreviewIndex(keepIndex);
    if (mobileScroll && mobileScrollTop !== undefined) {
        mobileScroll.scrollTop = mobileScrollTop;
        requestAnimationFrame(() => {
            mobileScroll.scrollTop = mobileScrollTop;
        });
    }
    lastPreviewReadyPromise = Promise.all(readyPromises);
    return lastPreviewReadyPromise;
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
            revokePreviewObjectURLs();
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
let htmlPages = [""];
let activeHtmlPageIndex = 0;
let htmlPagesUndoSnapshot = null;

function syncActiveHtmlPageFromInput() {
    const value = String($("#text_to_image").val() || "");
    if (!Array.isArray(htmlPages) || htmlPages.length === 0) {
        htmlPages = [""];
        activeHtmlPageIndex = 0;
    }
    htmlPages[activeHtmlPageIndex] = value;
}
function captureHtmlPagesUndoState() {
    syncActiveHtmlPageFromInput();
    htmlPagesUndoSnapshot = {
        pages: [...htmlPages],
        activeIndex: activeHtmlPageIndex,
    };
}
function getHtmlMainText() {
    syncActiveHtmlPageFromInput();
    return String(htmlPages[0] || "");
}
function getHtmlSwitcherTexts() {
    syncActiveHtmlPageFromInput();
    return htmlPages.slice(1).filter((value) => String(value || "").trim().length > 0);
}
function getActivePreviewPageIndex() {
    if (activeHtmlPageIndex <= 0) return 0;
    let previewIndex = 0;
    for (let i = 1; i <= activeHtmlPageIndex && i < htmlPages.length; i++) {
        if (String(htmlPages[i] || "").trim().length > 0) {
            previewIndex++;
        }
    }
    return String(htmlPages[activeHtmlPageIndex] || "").trim().length > 0 ? previewIndex : 0;
}
function syncPreviewActiveHtmlPage() {
    const previewIndex = getActivePreviewPageIndex();
    const $radios = $("#image_preview_container .html-render-preview .tti-switch-input");
    if ($radios.length > previewIndex) {
        $radios.prop("checked", false).eq(previewIndex).prop("checked", true);
    }
}
function renderHtmlPageTabs() {
    const $tabs = $("#tti_html_page_tabs");
    if (!$tabs.length) return;
    $tabs.empty();
    htmlPages.forEach((_, idx) => {
        const $btn = $("<button>", {
            type: "button",
            class: `tti-page-tab${idx === activeHtmlPageIndex ? " active" : ""}`,
            title: `${idx + 1}페이지`,
            "data-page-index": idx,
            text: String(idx + 1),
        });
        $tabs.append($btn);
    });
    const $addBtn = $("<button>", {
        type: "button",
        id: "add_html_switcher_text",
        class: "tti-page-tab add-btn",
        title: "페이지 추가",
        "aria-label": "페이지 추가",
        html: '<i class="fa-solid fa-plus"></i>',
    });
    $tabs.append($addBtn);
    $("#tti_page_move_left").prop("disabled", activeHtmlPageIndex <= 0);
    $("#tti_page_move_right").prop("disabled", activeHtmlPageIndex >= htmlPages.length - 1);
    $("#tti_page_delete").prop("disabled", htmlPages.length <= 1);
}
function switchHtmlPage(index, options = {}) {
    if (!options.skipSaveCurrent) {
        syncActiveHtmlPageFromInput();
    }
    const clamped = Math.min(Math.max(0, Number(index) || 0), Math.max(0, htmlPages.length - 1));
    activeHtmlPageIndex = clamped;
    $("#text_to_image").val(htmlPages[activeHtmlPageIndex] || "");
    if (!options.skipEditorSync) {
        syncRichEditorFromSource();
    }
    updateTextLengthBadge();
    renderHtmlPageTabs();
    if (!options.skipPreview) {
        syncPreviewActiveHtmlPage();
    }
}
function setHtmlPagesState(pages = [""], activeIndex = 0, options = {}) {
    const normalized = Array.isArray(pages) && pages.length > 0 ? pages.map((value) => String(value ?? "")) : [""];
    htmlPages = normalized;
    activeHtmlPageIndex = Math.min(Math.max(0, Number(activeIndex) || 0), htmlPages.length - 1);
    $("#text_to_image").val(htmlPages[activeHtmlPageIndex] || "");
    if (!options.skipEditorSync) {
        syncRichEditorFromSource();
    }
    updateTextLengthBadge();
    renderHtmlPageTabs();
    if (!options.skipPreview) {
        syncPreviewActiveHtmlPage();
    }
}
function addHtmlPage() {
    syncActiveHtmlPageFromInput();
    htmlPages.push("");
    switchHtmlPage(htmlPages.length - 1);
    $("#tti_rich_text_editor").trigger("focus");
}
function moveActiveHtmlPage(delta) {
    syncActiveHtmlPageFromInput();
    const target = activeHtmlPageIndex + delta;
    if (target < 0 || target >= htmlPages.length) return;
    [htmlPages[activeHtmlPageIndex], htmlPages[target]] = [htmlPages[target], htmlPages[activeHtmlPageIndex]];
    activeHtmlPageIndex = target;
    renderHtmlPageTabs();
    refreshPreview();
}
function deleteActiveHtmlPage() {
    if (htmlPages.length <= 1) return;
    captureHtmlPagesUndoState();
    htmlPages.splice(activeHtmlPageIndex, 1);
    const nextIndex = Math.min(activeHtmlPageIndex, htmlPages.length - 1);
    switchHtmlPage(nextIndex, {skipSaveCurrent: true, skipPreview: true});
    refreshPreview();
}
function setupHtmlSwitcherInputs() {
    $(document).on("click", "#tti_html_page_tabs .tti-page-tab:not(.add-btn)", function () {
        switchHtmlPage(Number($(this).data("page-index")));
    });
    $(document).on("click", "#add_html_switcher_text", addHtmlPage);
    $(document).on("click", "#tti_page_move_left", () => moveActiveHtmlPage(-1));
    $(document).on("click", "#tti_page_move_right", () => moveActiveHtmlPage(1));
    $(document).on("click", "#tti_page_delete", deleteActiveHtmlPage);
    $(document).on("input change", "#text_to_image", syncActiveHtmlPageFromInput);
    renderHtmlPageTabs();
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
    let openedAt = 0;
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
                    openedAt = performance.now();
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
            if (!menu.hidden && performance.now() - openedAt > 120 && !menu.contains(e.target)) close();
        },
        true,
    );
    window.addEventListener("resize", close);
    const selectObserver = new MutationObserver((records) => {
        if (records.some((r) => r.target instanceof Element && (r.target.matches("select,option,optgroup") || Array.from(r.addedNodes).some((n) => n instanceof Element && (n.matches("select") || n.querySelector("select")))))) refresh();
    });
    document.querySelectorAll(".text-to-image-converter-settings, .tti-modal-backdrop").forEach((rootNode) => {
        selectObserver.observe(rootNode, {subtree: true, childList: true, attributes: true, attributeFilter: ["disabled", "class", "selected", "hidden"]});
    });
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
    let stepperDelay = null;
    let stepperInterval = null;
    let stepperHandledPointer = false;
    const stopStepperRepeat = () => {
        clearTimeout(stepperDelay);
        clearInterval(stepperInterval);
        stepperDelay = null;
        stepperInterval = null;
    };
    $(document).on("pointerdown", ".option-stepper .stepper-btn", function (event) {
        if (event.button !== 0) return;
        stopStepperRepeat();
        stepperHandledPointer = true;
        const $stepper = $(this).closest(".option-stepper");
        const dir = Number($(this).data("dir"));
        stepStepper($stepper, dir);
        stepperDelay = setTimeout(() => {
            stepperInterval = setInterval(() => stepStepper($stepper, dir), 75);
        }, 380);
    });
    $(document).on("pointerup pointercancel pointerleave", ".option-stepper .stepper-btn", stopStepperRepeat);
    $(window).on("blur", stopStepperRepeat);
    $(document).on("click", ".option-stepper .stepper-btn", function () {
        if (stepperHandledPointer) {
            stepperHandledPointer = false;
            return;
        }
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
    syncActiveHtmlPageFromInput();
    if (isHtmlModeEnabled() && htmlPages.length > 1) {
        const totalLength = htmlPages.reduce((sum, page) => sum + String(page || "").length, 0);
        $("#tti_text_length_badge").text(`${totalLength.toLocaleString()}자 · ${htmlPages.length}p`);
        return;
    }
    const length = ($("#text_to_image").val() || "").length;
    $("#tti_text_length_badge").text(`${length.toLocaleString()}자`);
}
function openTextModal() {
    ensureFloatingHighlightTags();
    renderHtmlPageTabs();
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
        fontSize: isHtmlModeEnabled() ? 14 : 38,
        useTagFontSize: false,
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
let pressingHighlightMenu = false;

function showFloatingHighlightMenu(range) {
    if (!richRangeIsValid(range)) return;
    savedRichEditorRange = range.cloneRange();
    const touchesHighlight = selectionTouchesHighlight(range);
    $("#tti_highlight_remove").toggle(touchesHighlight);
    $("#tti_editor_highlight_menu").addClass("has-selection");
}
function hideFloatingHighlightMenu() {
    savedRichEditorRange = null;
    $("#tti_editor_highlight_menu").removeClass("has-selection");
    $("#tti_highlight_remove").hide();
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
}
function setupRichTextHighlighter() {
    setupPreviewEditDeferral();
    $(document).on("click", "#tti_theme_toggle", function () {
        extension_settings[extensionName].uiTheme = extension_settings[extensionName].uiTheme === "dark" ? "light" : "dark";
        applyExtensionTheme();
        saveSettings();
    });
    $(document).on("input", "#tti_rich_text_editor", syncSourceFromRichEditor);
    const syncHighlightFromSelection = () => {
        if (pressingHighlightMenu || !$("#tti_text_modal_backdrop").hasClass("open")) return;
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        if (richRangeIsValid(range)) showFloatingHighlightMenu(range);
        else hideFloatingHighlightMenu();
    };
    let highlightSelectionFrame = null;
    document.addEventListener("selectionchange", () => {
        if (!$("#tti_text_modal_backdrop").hasClass("open")) return;
        if (highlightSelectionFrame !== null) return;
        highlightSelectionFrame = requestAnimationFrame(() => {
            highlightSelectionFrame = null;
            syncHighlightFromSelection();
        });
    });
    $(document).on("pointerup keyup", "#tti_rich_text_editor", function () {
        window.setTimeout(syncHighlightFromSelection, 0);
    });
    $(document).on("pointerdown", "#tti_editor_highlight_menu", (event) => {
        pressingHighlightMenu = true;
        event.preventDefault();
    });
    $(document).on("pointerup pointercancel", () => {
        pressingHighlightMenu = false;
    });
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
    $(document).on("click", "#tti_highlight_remove", removeFloatingHighlight);
    $(document).on("click", "#tti_highlight_palette button", function () {
        applyFloatingHighlight($(this).data("tag"));
    });
    $(document).on("pointerdown", function (event) {
        if (!$(event.target).closest("#tti_rich_text_editor, #tti_editor_highlight_menu").length) hideFloatingHighlightMenu();
    });
    $("#tti_highlight_remove").hide();
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
        const useCustomSize = !!tag.useTagFontSize;
        const sizeValue = parseInt(tag.fontSize, 10) || (isHtmlModeEnabled() ? 14 : 38);
        const highlightTagItem = $(`
      <div class="tag-item" data-index="${index}">
        <div class="tag-card-preview"><span></span></div>
        <button type="button" class="buttons tti-manage-pen">관리</button>
        <div class="tag-item-left">
          <div class="tti-field">
            <span>이름</span>
            <input type="text" class="tag-name" placeholder="펜 이름 (예: 강조)" />
          </div>
          <div class="tti-field">
            <span>글꼴</span>
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
          </div>
          <div class="tti-field">
            <span>두께</span>
            <select class="tag-stroke-width" title="두께">
              <option value="inherit" ${!tag.strokeWidth || tag.strokeWidth === "inherit" ? "selected" : ""}>현재 두께</option>
              <option value="0" ${tag.strokeWidth === "0" ? "selected" : ""}>기본</option>
              <option value="0.8" ${tag.strokeWidth === "0.8" ? "selected" : ""}>세미 볼드</option>
              <option value="1.5" ${tag.strokeWidth === "1.5" ? "selected" : ""}>볼드</option>
            </select>
          </div>
          <div class="tti-field">
            <span>크기</span>
            <div class="tag-size-control">
              <div class="tti-segment tag-size-mode">
                <button type="button" data-size-mode="global" class="${!useCustomSize ? "active" : ""}">전역</button>
                <button type="button" data-size-mode="custom" class="${useCustomSize ? "active" : ""}">개별</button>
              </div>
              <input type="number" class="tag-font-size" value="${sizeValue}" min="10" max="80" title="글자 크기" ${!useCustomSize ? "hidden" : ""} />
            </div>
          </div>
          <div class="tti-field">
            <span>글자색</span>
            <div class="tti-inline-color">
              <input type="checkbox" class="use-tag-font-color" ${tag.useTagFontColor ? "checked" : ""} />
              <input type="color" class="tag-font-color" value="${tag.fontColor}" ${!tag.useTagFontColor ? "disabled" : ""} />
            </div>
          </div>
          <div class="tti-field">
            <span>형광색</span>
            <div class="tti-inline-color">
              <input type="checkbox" class="use-tag-bg-color" ${tag.useTagBgColor ? "checked" : ""} />
              <input type="color" class="tag-bg-color" value="${tag.bgColor}" ${!tag.useTagBgColor ? "disabled" : ""} />
            </div>
          </div>
        </div>
        <button type="button" class="delete-tag-btn buttons clear"><i class="fa-solid fa-trash"></i> 형광펜 삭제</button>
      </div>
    `);

        highlightTagItem.find(".tag-name").val(tag.label || tag.name || "");
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
        fontSize: isHtmlModeEnabled() ? 14 : 38,
        useTagFontSize: false,
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
        if (tag.useTagFontSize === undefined) tag.useTagFontSize = false;
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

function getSillybooksHeaderTexts(settings = extension_settings[extensionName]) {
    return {
        title: resolveMetaText(settings?.chatTitleMode, settings?.chatTitleCustom),
        name: resolveMetaText(settings?.charNameMode, settings?.charNameCustom),
    };
}
function getRenderDeps(generation = previewRenderGeneration) {
    return {
        getSettings: () => extension_settings[extensionName],
        defaultSettings,
        SILLYBOOKS_DEFAULTS,
        SHARE_REFERENCE_WIDTH,
        WATERMARK_MARK,
        getCanvasSize,
        getActiveFontSize,
        getImageRatio,
        getMetaLines,
        getMetaMetrics,
        getVerticalReserve,
        isWatermarkEnabled,
        isSillybooksTemplate,
        isHtmlModeEnabled,
        getCSSFontFamily,
        getSillybooksHeaderTexts,
        getHtmlFontFace,
        normalizeHtmlFontFace,
        getHtmlPreviewFontFamily,
        getWebFonts,
        webFontStyleMarkup,
        getFooterLayoutMode,
        parsePositiveInt,
        resolveBackgroundURLForHTML,
        getHtmlSwitcherTexts,
        getActivePreviewPageIndex,
        replaceWords,
        saveImage,
        copyToClipboard,
        isRenderStale: () => generation !== previewRenderGeneration,
    };
}

// 텍스트 정리
function wrappingTexts(text, mode = "word") {
    return wrapTextChunks(text, mode, getRenderDeps());
}

// 텍스트를 이미지로
function generateTextImage(chunk, index, generation = previewRenderGeneration) {
    return renderTextImageCanvas(chunk, index, getRenderDeps(generation));
}
function createHTMLSnippet(text, index) {
    return buildHTMLSnippet(text, index, getRenderDeps());
}
function generateHTMLPreview(text, index) {
    return buildHTMLPreview(text, index, getRenderDeps());
}

// 일괄 다운 zip
async function autoDownload(allDLbuttons, delay = 0) {
    await lastPreviewReadyPromise;
    if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const DLbuttons = $(allDLbuttons);
    if (DLbuttons.length > 1) {
        await zipDL(DLbuttons);
    } else if (DLbuttons.length === 1) {
        await downloadSingleButton(DLbuttons[0], 0);
    }
}
async function downloadSingleButton(button, index) {
    const getBlob = $(button).data("ttiGetBlob");
    if (typeof getBlob === "function") {
        const blob = await getBlob();
        if (blob) {
            await saveImage(blob, `${index + 1}.png`);
            return;
        }
    }
    $(button).trigger("click");
}
async function getBlobFromDownloadButton(button) {
    const getBlob = $(button).data("ttiGetBlob");
    if (typeof getBlob === "function") {
        const blob = await getBlob();
        if (blob) return blob;
    }
    const imgSrc = $(button).closest(".image-preview-item").find("img").attr("src");
    if (!imgSrc) return null;
    if (imgSrc.startsWith("blob:")) {
        return (await fetch(imgSrc)).blob();
    }
    const base64ori = imgSrc.split(",")[1];
    if (!base64ori) return null;
    const imageData = atob(base64ori);
    const imgArray = new Uint8Array(imageData.length);
    for (let j = 0; j < imageData.length; j++) {
        imgArray[j] = imageData.charCodeAt(j);
    }
    return new Blob([imgArray], {type: "image/png"});
}
function buildLogDateString() {
    const now = new Date();
    return `[Log] ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${now.getHours()}-${now.getMinutes()}`;
}
async function zipDL(DLbuttons) {
    await lastPreviewReadyPromise;
    if (typeof JSZip === "undefined") {
        await loadScript(JSZipLocal, JSZipCDN);
    }
    if (typeof saveAs === "undefined") {
        await loadScript(FileSaverLocal, FileSaverCDN);
    }

    const zip = new JSZip();
    const zipper = buildLogDateString();

    for (let i = 0; i < DLbuttons.length; i++) {
        const blob = await getBlobFromDownloadButton(DLbuttons[i]);
        if (!blob) continue;
        zip.file(`${zipper} (${i + 1}).png`, blob);
    }
    const content = await zip.generateAsync({type: "blob"});
    saveAs(content, `${zipper}.zip`);
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
async function saveImage(blobOrDataUrl, filename) {
    if (typeof saveAs === "undefined") {
        await loadScript(FileSaverLocal, FileSaverCDN);
    }

    const dateString = buildLogDateString();
    const index = filename.replace(".png", "");

    let blob = blobOrDataUrl;
    if (!(blob instanceof Blob)) {
        const base64ori = String(blobOrDataUrl || "").split(",")[1];
        const binary = atob(base64ori);
        const imgArray = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            imgArray[i] = binary.charCodeAt(i);
        }
        blob = new Blob([imgArray], {type: "image/png"});
    }

    saveAs(blob, `${dateString} (${index}).png`);
}
async function shareCurrentPreviewImage() {
    await lastPreviewReadyPromise;
    const $btn = $("#image_preview_container .image-preview-item.current .download-btn");
    if (!$btn.length) return false;
    const blob = await getBlobFromDownloadButton($btn[0]);
    if (!blob) return false;
    const fileName = `${buildLogDateString()} (${previewIndex + 1}).png`;
    const file = new File([blob], fileName, {type: "image/png"});
    if (navigator.canShare?.({files: [file]}) && navigator.share) {
        try {
            await navigator.share({files: [file]});
            return true;
        } catch (error) {
            if (error?.name === "AbortError") return true;
        }
    }
    await saveImage(blob, `${previewIndex + 1}.png`);
    return true;
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
jQuery(() => {
    try {
        setupReplaceRuleUI();
        setupMetaUI();
        setupCompositeControls();
        setupModals();
        setupRichTextHighlighter();
        setupPreviewCarousel();
        initSettings();
        presetUI();
        presetBackupSys();
        setupHtmlSwitcherInputs();
        bindingFunctions();
        restoreButtons();
        tabButtons();
        setupMobileEditor({
            isHtmlMode: isHtmlModeEnabled,
            downloadAll: () => autoDownload("#image_preview_container .download-btn", 0),
            shareCurrent: shareCurrentPreviewImage,
        });
        highlighterOption();
        setupSettingsPopup();
        customBG().catch((error) => {
            console.warn("[txt-to-img] 커스텀 배경 로드 실패:", error);
        });
    } catch (error) {
        console.error("[txt-to-img] 초기화 실패:", error);
        setupSettingsPopup();
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
    $("#tti_text_indent").on("change", textIndent);
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
    $("#sillybooks_toggle").on("change", sillybooksTemplate);
    $(document).on("click", ".tti-segment[data-sb-theme] button", function () {
        if (!isSillybooksTemplate()) return;
        setSillybooksTheme($(this).data("theme"));
    });
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
    $("#clear_text_btn").on("click", () => {
        captureHtmlPagesUndoState();
        $("#text_to_image").val("");
        syncActiveHtmlPageFromInput();
        syncRichEditorFromSource();
        updateTextLengthBadge();
        refreshPreview();
    });
    $("#restore_text_btn").on("click", () => {
        if (htmlPagesUndoSnapshot !== null) {
            syncActiveHtmlPageFromInput();
            const current = {pages: [...htmlPages], activeIndex: activeHtmlPageIndex};
            setHtmlPagesState(htmlPagesUndoSnapshot.pages, htmlPagesUndoSnapshot.activeIndex, {skipPreview: true});
            refreshPreview();
            htmlPagesUndoSnapshot = current;
        }
    });
    $("#organize_text_btn").on("click", () => {
        captureHtmlPagesUndoState();
        htmlPages = htmlPages.map((page) => organizeDialogueText(page));
        $("#text_to_image").val(htmlPages[activeHtmlPageIndex] || "");
        syncRichEditorFromSource();
        updateTextLengthBadge();
        refreshPreview();
    });
    $("#apply_replace_btn").on("click", () => {
        captureHtmlPagesUndoState();
        const current = $("#text_to_image").val();
        const replaced = replaceWords(current);
        $("#text_to_image").val(replaced);
        syncActiveHtmlPageFromInput();
        syncRichEditorFromSource();
        updateTextLengthBadge();
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
        $(this).closest(".tti-field").find(".tag-font-color").prop("disabled", !checked);
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
        $(this).closest(".tti-field").find(".tag-bg-color").prop("disabled", !checked);
        syncTagSwatch($(this).closest(".tag-item"));
    });
    $(document).on("change", ".tag-bg-color", function () {
        const index = $(this).closest(".tag-item").data("index");
        updateHighlightTag(index, "bgColor", $(this).val());
        syncTagSwatch($(this).closest(".tag-item"));
    });

    $(document).on("click", ".tag-size-mode button", function () {
        const $item = $(this).closest(".tag-item");
        const index = $item.data("index");
        const useCustom = $(this).data("size-mode") === "custom";
        $(this).addClass("active").siblings("button").removeClass("active");
        const $sizeInput = $item.find(".tag-font-size");
        $sizeInput.prop("hidden", !useCustom);
        updateHighlightTag(index, "useTagFontSize", useCustom);
        if (useCustom) {
            const value = $sizeInput[0]?.valueAsNumber;
            if (Number.isFinite(value)) updateHighlightTag(index, "fontSize", value);
            $sizeInput.trigger("focus");
        }
    });

    $(document).on("input", ".tag-font-size", function () {
        const index = $(this).closest(".tag-item").data("index");
        const value = this.valueAsNumber;
        if (Number.isFinite(value) && value >= Number(this.min) && value <= Number(this.max)) updateHighlightTag(index, "fontSize", value);
    });
}
