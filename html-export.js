import {buildSmoothGradientCSS, enableMarkdown, escapeCSSURL, escapeHTML, toRGBA} from "./render-utils.js";

export function mapHtmlStrokeWidth(value) {
    const numeric = parseFloat(value) || 0;
    if (numeric === 0.8) return 0.1;
    if (numeric === 1.5) return 0.3;
    return numeric;
}

export function getSpanColor(span, settings, defaultSettings) {
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

export function getSpanStrokeWidth(span, settings) {
    if (span.strokeWidth !== undefined && span.strokeWidth !== null) {
        if (span.strokeWidth === "inherit") {
            return mapHtmlStrokeWidth(settings.strokeWidth);
        }
        return mapHtmlStrokeWidth(span.strokeWidth);
    }
    return mapHtmlStrokeWidth(settings.strokeWidth);
}

export function buildSpanStyle(span, settings, defaultSettings) {
    const style = [];
    const decorations = [];
    const strokeWidth = getSpanStrokeWidth(span, settings);
    const textColor = getSpanColor(span, settings, defaultSettings);
    const baseColor = span.isBlockquote ? settings.blockquoteFontColor || defaultSettings.blockquoteFontColor : settings.fontColor || "#000000";
    const inheritColor = textColor === baseColor;

    style.push(`color:${inheritColor ? "inherit" : textColor} !important`);
    if (!inheritColor) style.push(`-webkit-text-fill-color:${textColor} !important`);
    style.push("line-height:inherit !important");
    style.push("letter-spacing:inherit !important");
    style.push("font-size:inherit !important");
    if (span.bold) style.push("font-weight:700 !important");
    if (span.italic) style.push("font-style:italic !important");
    if (span.underline) decorations.push("underline");
    if (span.strikethrough) decorations.push("line-through");
    if (decorations.length) {
        style.push(`text-decoration:${decorations.join(" ")} !important`);
        if (!inheritColor) style.push(`text-decoration-color:${textColor} !important`);
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
        style.push(`-webkit-text-stroke:${strokeWidth}px ${inheritColor ? "currentColor" : textColor} !important`);
    }
    return style.join("; ");
}

export function renderMarkdownHTML(text, settings, deps) {
    const lines = String(text || "").split(/\n/);
    const htmlFontFace = deps.getHtmlFontFace(settings);
    const indentHTML = settings.textIndent ? `<span style="display:inline-block !important;width:1em !important;height:0 !important;"></span>` : "";
    const mdOptions = {
        allowHeading: true,
        isHtmlMode: deps.isHtmlModeEnabled(),
        setHighlighterTags: settings.setHighlighterTags || [],
        globalFontSize: deps.getActiveFontSize(settings),
    };
    const renderLineHTML = (lineText, isBlockquoteLine = false) => {
        let spans = enableMarkdown(lineText, mdOptions);
        if (isBlockquoteLine) {
            spans = spans.map((span) => ({...span, isBlockquote: true}));
        }
        if (!spans.length) return `<font face="${htmlFontFace}"></font>`;

        const groups = [];
        let currentGroup = {face: htmlFontFace, parts: []};
        spans.forEach((span) => {
            const spanFace = span.htmlFontFamily && span.htmlFontFamily !== "useGlobal" ? deps.normalizeHtmlFontFace(span.htmlFontFamily) : htmlFontFace;
            if (spanFace !== currentGroup.face) {
                if (currentGroup.parts.length) groups.push(currentGroup);
                currentGroup = {face: spanFace, parts: []};
            }
            const spanText = escapeHTML(span.text || "");
            const spanStyle = buildSpanStyle(span, settings, deps.defaultSettings);
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
            const fontColor = settings.blockquoteFontColor || deps.defaultSettings.blockquoteFontColor;
            const borderColor = settings.blockquoteBorderColor || deps.defaultSettings.blockquoteBorderColor;
            const bgColor = toRGBA(settings.blockquoteBgColor || deps.defaultSettings.blockquoteBgColor, 0.3);
            const quoteHTML = quoteLines.map((quoteLine) => `<div style="margin:0 !important;">${renderLineHTML(quoteLine, true)}</div>`).join("");
            htmlLines.push(`<div class="blockquote" style="width:auto !important;color:${fontColor} !important;-webkit-text-fill-color:${fontColor} !important;border-radius:5px !important;border-left:5px solid ${borderColor} !important;padding:8px !important;background:${bgColor} !important;-webkit-backdrop-filter:blur(10px) !important;backdrop-filter:blur(10px) !important;margin:8px 0 !important;"><div style="display:flex !important;flex-direction:column !important;gap:0 !important;margin:0 !important;">${quoteHTML}</div></div>`);
            i = j - 1;
            continue;
        }
        htmlLines.push(`${trimmedLine ? indentHTML : ""}${renderLineHTML(line)}`);
    }

    return htmlLines.join("\n");
}

export function createHTMLSnippet(text, index, deps) {
    const settings = deps.getSettings();
    const sillybooks = deps.isSillybooksTemplate(settings);
    const htmlSelectedBackground = settings.selectedBackgroundImageHtml || settings.selectedBackgroundImage;
    const bgURL = sillybooks ? "" : deps.resolveBackgroundURLForHTML(htmlSelectedBackground);
    const markdownHTML = renderMarkdownHTML(deps.replaceWords(text), settings, deps);
    const switcherTexts = deps.getHtmlSwitcherTexts();
    const switcherRenderedHTML = switcherTexts.map((itemText) => renderMarkdownHTML(deps.replaceWords(itemText), settings, deps));
    const switcherUid = `tti-switch-${index}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1679616).toString(36)}`;
    const switcherBaseId = `${switcherUid}-base`;

    const backgroundColor = settings.backgroundColor || "#ffffff";
    const secondColor = settings.secondBackgroundColor || backgroundColor;
    const smoothGradient = buildSmoothGradientCSS(backgroundColor, secondColor);
    const useBgColor = sillybooks || !!settings.useBackgroundColor;
    const useSecondBgColor = !sillybooks && !!settings.useSecondBackgroundColor;
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
    const bgFilter = sillybooks ? "none" : filterEffects.join(" ");

    const overlayOpacity = sillybooks ? 0 : Math.min(1, Math.max(0, Number(settings.overlayOpacity) || 0));
    const blurStrength = sillybooks ? 0 : Math.max(0, Number(settings.bgBlur) || 0);
    const lineBreakByChar = (settings.lineBreak || "byWord") === "byChar";
    const globalStrokeWidth = mapHtmlStrokeWidth(settings.strokeWidth);
    const globalTextColor = settings.fontColor || "#000000";
    const htmlFontSize = parseInt(settings.fontSizeHtml, 10) || deps.defaultSettings.fontSizeHtml;
    const footerLayoutMode = deps.getFooterLayoutMode(settings);
    const footerWidthPx = deps.parsePositiveInt(settings.footerWidth, deps.defaultSettings.footerWidth);
    const footerHeightPx = deps.parsePositiveInt(settings.footerHeight, deps.defaultSettings.footerHeight);
    const metaLines = sillybooks ? [] : deps.getMetaLines(settings);
    const showWatermark = deps.isWatermarkEnabled(settings);
    const hasMeta = metaLines.length > 0;
    const isScrollFooterLayout = footerLayoutMode === "scroll";
    const contentMaxHeightValue = "none";
    const containerInlineStyle = ["background:transparent !important", "box-sizing:border-box !important", "width:100% !important", `max-width:${footerWidthPx}px !important`, "display:grid !important", "grid-template-rows:minmax(0,1fr) !important", isScrollFooterLayout ? `aspect-ratio:${footerWidthPx} / ${Math.max(footerWidthPx, footerHeightPx)} !important` : "aspect-ratio:auto !important", isScrollFooterLayout || sillybooks ? "min-height:0 !important" : `min-height:min(${footerWidthPx}px, 100vw) !important`, "height:auto !important", "max-height:none !important", "margin:0 auto !important", sillybooks ? "padding:30px 28px !important" : "padding:24px !important", "border-radius:5px !important", "overflow:hidden !important", "isolation:isolate !important"].join(";");
    const bgInlineStyle = ["border-radius:5px !important", `background:${useBgColor ? colorBackground : "transparent"} !important`, `background-image:${bgLayerImage} !important`, "background-size:cover !important", "background-position:center !important", "background-repeat:no-repeat !important", `filter:${bgFilter || "none"} !important`].join(";");
    const overlayInlineStyle = ["border-radius:5px !important", `background:${toRGBA(settings.overlayColor || "#ffffff", overlayOpacity)} !important`, `-webkit-backdrop-filter:blur(${blurStrength}px) !important`, `backdrop-filter:blur(${blurStrength}px) !important`, "pointer-events:none !important"].join(";");
    const contentInlineStyle = ["grid-area:1 / 1 !important", ...(sillybooks ? ["flex:1 1 auto !important"] : []), `min-height:${isScrollFooterLayout ? "0" : "min-content"} !important`, "box-sizing:border-box !important", "width:100% !important", "margin-left:0 !important", "margin-right:0 !important", "padding:0 !important", `max-height:${contentMaxHeightValue} !important`, `overflow-y:${isScrollFooterLayout ? "auto" : "visible"} !important`, `color:${globalTextColor} !important`, `font-size:${htmlFontSize}px !important`, "font-weight:400 !important", `letter-spacing:${settings.fontSpacing || 0}em !important`, `line-height:${settings.fontLineHeight || 1.5} !important`, `text-align:${settings.fontAlign || "left"} !important`, "white-space:pre-wrap !important", `word-break:${lineBreakByChar ? "break-all" : "break-word"} !important`, "overflow-wrap:anywhere !important", "margin-bottom:0 !important", `-webkit-text-stroke:${globalStrokeWidth}px ${globalTextColor} !important`, `-webkit-text-fill-color:${globalTextColor} !important`].join(";");
    const htmlFontFace = deps.getHtmlFontFace(settings);
    const metaLineStyle = ["display:block !important", "margin:0 !important", `color:${globalTextColor} !important`, `-webkit-text-fill-color:${globalTextColor} !important`, `font-size:${Math.max(10, Math.round((htmlFontSize * 28) / 38))}px !important`, "line-height:1.6 !important", "text-align:left !important"].join(";");
    const metaLinesHTML = metaLines.map((line) => `<span style="${metaLineStyle}opacity:${line.alpha} !important"><font face="${htmlFontFace}">${escapeHTML(line.text)}</font></span>`).join("");
    const hasSwitcher = switcherRenderedHTML.length > 0;
    const watermarkStyle = ["position:relative !important", "right:0px !important", "left:auto !important", "display:block !important", hasSwitcher ? "width:auto !important" : "width:100% !important", hasSwitcher ? "margin:0 !important" : "margin:30px 0 0 0 !important", "text-align:right !important", "bottom:0px !important", `color:${globalTextColor} !important`, `-webkit-text-fill-color:${globalTextColor} !important`, "opacity:0.32 !important", "font-family:Paperozi, Pretendard-Regular, sans-serif !important", `font-size:${Math.round((htmlFontSize * 42) / 38)}px !important`, "font-weight:900 !important", "letter-spacing:-0.01em !important", "line-height:1 !important"].join(";");
    const watermarkSpanHTML = showWatermark ? `<span class="tti-watermark" style="${watermarkStyle}">${deps.WATERMARK_MARK}</span>` : "";
    const footerInlineStyle = ["position:relative !important", "flex:0 0 auto !important", "display:flex !important", "flex-direction:column !important", "gap:2px !important", "width:100% !important", "box-sizing:border-box !important", "padding:0 !important", "margin:18px 0 14px 0 !important", "z-index:3 !important"].join(";");
    const stackInlineStyle = ["grid-area:1 / 1 !important", "position:relative !important", "display:flex !important", "flex-direction:column !important", ...(sillybooks ? ["justify-content:flex-start !important"] : ["justify-content:center !important", "justify-content:safe center !important"]), "box-sizing:border-box !important", "width:100% !important", "min-height:0 !important", "margin:0 !important", "padding:0 !important", "z-index:3 !important"].join(";");
    const footerHTML =
        hasMeta ?
            `
    <div class="tti-footer" style="${footerInlineStyle}">${metaLinesHTML}</div>`
        :   "";
    const sbTexts = sillybooks ? deps.getSillybooksHeaderTexts(settings) : {title: "", name: ""};
    const sbHeadStyle = ["position:relative !important", "flex:0 0 auto !important", "display:block !important", "box-sizing:border-box !important", "width:100% !important", "margin:0 0 2em 0 !important", "padding:0 !important", `color:${globalTextColor} !important`, `-webkit-text-fill-color:${globalTextColor} !important`, `font-size:${htmlFontSize}px !important`, "text-align:left !important", "white-space:normal !important", "word-break:keep-all !important", "overflow-wrap:anywhere !important", "-webkit-text-stroke:0 !important", "z-index:3 !important"].join(";");
    const sbTitleStyle = ["display:block !important", "margin:0 !important", "font-size:1.55em !important", "font-weight:700 !important", "line-height:1.3 !important", "letter-spacing:0 !important"].join(";");
    const sbNameStyle = ["display:block !important", `margin:${sbTexts.title ? "0.35em" : "0"} 0 0 0 !important`, "font-size:0.78em !important", "line-height:1.4 !important", "opacity:0.56 !important"].join(";");
    const sbHeadHTML =
        sbTexts.title || sbTexts.name ?
            `
    <div class="tti-sb-head" style="${sbHeadStyle}">${sbTexts.title ? `<span style="${sbTitleStyle}"><font face="${htmlFontFace}">${escapeHTML(sbTexts.title)}</font></span>` : ""}${sbTexts.name ? `<span style="${sbNameStyle}"><font face="${htmlFontFace}">${escapeHTML(sbTexts.name)}</font></span>` : ""}</div>`
        :   "";
    const shouldRenderBg = escapedURL || useBgColor;
    const backgroundHTML =
        shouldRenderBg ?
            `
  <div class="tti-bg" style="${bgInlineStyle}"></div>`
        :   "";
    const allPages = [
        {id: switcherBaseId, panelClass: "tti-panel-0", html: markdownHTML},
        ...switcherRenderedHTML.map((html, itemIndex) => ({
            id: `${switcherUid}-${itemIndex}`,
            panelClass: `tti-panel-${itemIndex + 1}`,
            html,
        })),
    ];
    const totalPages = allPages.length;
    const switcherRadiosHTML =
        hasSwitcher ?
            `
${allPages.map((page, pageIndex) => `  <input type="radio" class="tti-switch-input" name="${switcherUid}" id="${page.id}"${pageIndex === 0 ? " checked" : ""}>`).join("\n")}`
        :   "";
    const overlayHTML = `
  <div class="tti-overlay" style="${overlayInlineStyle}"></div>`;
    const panelsWrapStyle = ["display:flex !important", "flex-direction:column !important", sillybooks ? "flex:1 1 auto !important" : "flex:0 1 auto !important", "min-height:0 !important", "width:100% !important", "margin:0 !important", "padding:0 !important"].join(";");
    const contentHTML =
        hasSwitcher ?
            `
    <div class="tti-panels" style="${panelsWrapStyle}">
${allPages.map((page) => `      <div class="tti-content tti-panel ${page.panelClass}" style="${contentInlineStyle}">${page.html}</div>`).join("\n")}
    </div>`
        :   `
    <div class="tti-content" style="${contentInlineStyle}">${markdownHTML}</div>`;
    let bottomAreaHTML = "";
    if (hasSwitcher) {
        const prevLabels = allPages
            .map((_, pageIndex) => (pageIndex > 0 ? `<label class="tti-tbtn tti-prev-${pageIndex}" for="${allPages[pageIndex - 1].id}" title="이전 페이지">‹</label>` : `<span class="tti-tbtn tti-prev-0 is-off">‹</span>`))
            .join("");
        const nextLabels = allPages
            .map((_, pageIndex) => (pageIndex < totalPages - 1 ? `<label class="tti-tbtn tti-next-${pageIndex}" for="${allPages[pageIndex + 1].id}" title="다음 페이지">›</label>` : `<span class="tti-tbtn tti-next-${totalPages - 1} is-off">›</span>`))
            .join("");
        const counters = allPages.map((_, pageIndex) => `<span class="tti-tcnt tti-cnt-${pageIndex}">${pageIndex + 1}<span style="opacity:0.45 !important;margin:0 3px !important;">/</span>${totalPages}</span>`).join("");
        const typoNavStyle = ["display:inline-flex !important", "align-items:center !important", "gap:4px !important", `color:${globalTextColor} !important`, `-webkit-text-fill-color:${globalTextColor} !important`, 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Apple SD Gothic Neo","Noto Sans KR",sans-serif !important', "user-select:none !important", "font-variant-numeric:tabular-nums !important", "-webkit-text-stroke:0 !important"].join(";");
        const bottomBarStyle = ["grid-area:2 / 1 !important", "position:relative !important", "z-index:4 !important", "display:flex !important", "align-items:center !important", showWatermark ? "justify-content:space-between !important" : "justify-content:center !important", "gap:12px !important", "width:100% !important", "margin:20px 0 0 0 !important", "padding:0 !important"].join(";");
        bottomAreaHTML = `
  <div class="tti-bottom-bar" style="${bottomBarStyle}"><div class="tti-typo-nav" style="${typoNavStyle}">${prevLabels}<span class="tti-tcnt-box">${counters}</span>${nextLabels}</div>${watermarkSpanHTML}</div>`;
    } else if (showWatermark) {
        bottomAreaHTML = `
  ${watermarkSpanHTML}`;
    }
    const switcherRuleStyle =
        hasSwitcher ?
            [
                `.tti-switch-input{position:absolute !important;opacity:0 !important;pointer-events:none !important;}`,
                `.tti-panels{position:relative !important;z-index:3 !important;}`,
                `.tti-panel{display:none !important;}`,
                `.tti-tbtn{display:none !important;width:22px !important;height:22px !important;text-align:center !important;margin:0 !important;padding:0 !important;border:0 !important;background:transparent !important;color:${globalTextColor} !important;-webkit-text-fill-color:${globalTextColor} !important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Apple SD Gothic Neo","Noto Sans KR",sans-serif !important;font-size:18px !important;font-weight:600 !important;line-height:20px !important;cursor:pointer !important;opacity:0.85 !important;vertical-align:middle !important;}`,
                `.tti-tbtn:hover{opacity:1 !important;}`,
                `.tti-tbtn.is-off{opacity:0.28 !important;cursor:default !important;pointer-events:none !important;}`,
                `.tti-tcnt-box{display:inline-block !important;min-width:30px !important;text-align:center !important;color:${globalTextColor} !important;-webkit-text-fill-color:${globalTextColor} !important;font-size:11px !important;font-weight:600 !important;letter-spacing:0.06em !important;line-height:22px !important;opacity:0.75 !important;vertical-align:middle !important;}`,
                `.tti-tcnt{display:none !important;}`,
                ...allPages.map((page) => `#${page.id}:checked ~ .tti-stack .tti-panels .${page.panelClass}{display:block !important;}`),
                ...allPages.map((page, pageIndex) => `#${page.id}:checked ~ .tti-bottom-bar .tti-prev-${pageIndex}{display:inline-block !important;}`),
                ...allPages.map((page, pageIndex) => `#${page.id}:checked ~ .tti-bottom-bar .tti-next-${pageIndex}{display:inline-block !important;}`),
                ...allPages.map((page, pageIndex) => `#${page.id}:checked ~ .tti-bottom-bar .tti-cnt-${pageIndex}{display:inline !important;}`),
            ].join("")
        :   "";
    const scopedStyle = `.tti{position:relative !important;}.tti-bg{position:absolute !important;inset:0 !important;z-index:0 !important;}.tti-overlay{position:absolute !important;inset:0 !important;margin:0 !important;padding:0 !important;z-index:2 !important;}.tti-content{position:relative !important;z-index:3 !important;}.tti-footer{position:relative !important;z-index:4 !important;scrollbar-width:none !important;}.tti-footer::-webkit-scrollbar{height:0 !important;}.tti-watermark{z-index:4 !important;}${switcherRuleStyle}`;

    return `${deps.webFontStyleMarkup()}<div>
<style>${scopedStyle}</style>
<div class="tti" style="${containerInlineStyle}">
${backgroundHTML}${switcherRadiosHTML}${overlayHTML}
  <div class="tti-stack" style="${stackInlineStyle}">${sbHeadHTML}${contentHTML}${footerHTML}
  </div>${bottomAreaHTML}
</div>
</div>`;
}

export function generateHTMLPreview(text, index, deps) {
    const htmlCode = createHTMLSnippet(text, index, deps);
    const previewFontFamily = deps.getHtmlPreviewFontFamily();
    const fontFaceMap = {
        Ridibatang: "RIDIBatang",
        "Nanum Gothic": "Pretendard-Regular",
        GangwonEducationModuche: "GangwonEducationModuche",
        OngleipParkDahyeon: "OngleipParkDahyeon",
    };
    deps
        .getWebFonts()
        .filter((font) => font.html)
        .forEach((font) => {
            fontFaceMap[font.family] = deps.getCSSFontFamily(font.family);
        });
    const perFontFaceRules = Object.entries(fontFaceMap)
        .map(([face, family]) => `.html-render-preview .tti-content font[face="${face}"],.html-render-preview .tti-content font[face="${face}"] span[style]{font-family:${family} !important;}`)
        .join("");
    const previewOnlyStyle = `<style>.html-render-preview .tti-content,.html-render-preview .tti-content span[style],.html-render-preview .tti-footer,.html-render-preview .tti-footer *,.html-render-preview .tti-sb-head,.html-render-preview .tti-sb-head *{font-family:${previewFontFamily} !important;}${perFontFaceRules}</style>`;

    const $preview = $("<div>").addClass("image-preview-item html-preview-item");
    const $rendered = $("<div>")
        .addClass("html-render-preview")
        .html(htmlCode + previewOnlyStyle);
    const activePreviewPage = typeof deps.getActivePreviewPageIndex === "function" ? deps.getActivePreviewPageIndex() : 0;
    if (activePreviewPage > 0) {
        const radios = $rendered.find(".tti-switch-input");
        if (radios.length > activePreviewPage) {
            radios.prop("checked", false).eq(activePreviewPage).prop("checked", true);
        }
    }
    const $copyBtn = $("<button>")
        .addClass("download-btn")
        .text("코드 복사")
        .on("click", async () => {
            const copied = await deps.copyToClipboard(htmlCode);
            if (copied) {
                if (typeof toastr !== "undefined" && toastr?.success) {
                    toastr.success("코드 복사 완료!");
                }
            } else if (typeof toastr !== "undefined" && toastr?.warning) {
                toastr.warning("코드 복사에 실패했습니다.");
            } else {
                alert("코드 복사에 실패했습니다.");
            }
        });

    $preview.append($rendered, $copyBtn);
    return $preview;
}
