export function enableMarkdown(text, options = {}) {
    const {allowHeading = true, isHtmlMode = false, setHighlighterTags = [], globalFontSize = 38} = options;
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
            headingSizeBonus = isHtmlMode ? baseHeadingBonus : baseHeadingBonus + 1;
            sourceText = headingMatch[2];
        }
    }

    const tagMap = {};
    const quotePairs = {'"': '"', "“": "”", "「": "」", "『": "』"};
    setHighlighterTags.forEach((tag) => {
        if (tag.name) tagMap[tag.name.toLowerCase()] = tag;
    });

    while (i < sourceText.length) {
        if (sourceText[i] === "<") {
            const tagMatch = sourceText.slice(i).match(/^<(\w+)>/);
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
                    const innerContents = enableMarkdown(tagContent, {allowHeading: false, isHtmlMode, setHighlighterTags, globalFontSize});

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
                                fontSize: tagSet.useTagFontSize ? tagSet.fontSize || null : null,
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
                const innerSpans = enableMarkdown(innerText, {allowHeading: false, isHtmlMode, setHighlighterTags, globalFontSize});

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
        return spans.map((span) => ({
            ...span,
            fontSize: (parseInt(span.fontSize, 10) || globalFontSize) + headingSizeBonus,
        }));
    }
    return spans;
}

export function escapeHTML(text = "") {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function escapeCSSURL(url = "") {
    return String(url).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function toRGBA(hex, alpha = 1) {
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

export function normalizeHexColor(color = "#000000") {
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

export function mixHexColors(colorA, colorB, ratio = 0.5) {
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

export function buildSmoothGradientCSS(colorA, colorB, angle = "135deg") {
    const c1 = normalizeHexColor(colorA) || colorA;
    const c2 = normalizeHexColor(colorB) || colorB;
    const c25 = mixHexColors(c1, c2, 0.25);
    const c50 = mixHexColors(c1, c2, 0.5);
    const c75 = mixHexColors(c1, c2, 0.75);
    return `linear-gradient(${angle}, ${c1} 0%, ${c25} 35%, ${c50} 60%, ${c75} 80%, ${c2} 100%)`;
}

export function addSmoothGradientStops(gradient, colorA, colorB) {
    const c1 = normalizeHexColor(colorA) || colorA;
    const c2 = normalizeHexColor(colorB) || colorB;
    gradient.addColorStop(0, c1);
    gradient.addColorStop(0.35, mixHexColors(c1, c2, 0.25));
    gradient.addColorStop(0.6, mixHexColors(c1, c2, 0.5));
    gradient.addColorStop(0.8, mixHexColors(c1, c2, 0.75));
    gradient.addColorStop(1, c2);
}
