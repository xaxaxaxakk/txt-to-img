import {addSmoothGradientStops, enableMarkdown} from "./render-utils.js";

const MAX_IMAGE_CACHE = 24;
const imageCache = new Map();
const activeObjectURLs = new Set();
let measureCtx = null;
let noiseCache = {level: -1, canvas: null};

function getMeasureContext() {
    if (!measureCtx) {
        measureCtx = document.createElement("canvas").getContext("2d");
    }
    return measureCtx;
}

export function loadImageCached(src) {
    if (!src) return Promise.reject(new Error("Empty image src"));
    if (imageCache.has(src)) {
        const cached = imageCache.get(src);
        imageCache.delete(src);
        imageCache.set(src, cached);
        return cached;
    }
    const promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => {
            imageCache.delete(src);
            reject(err);
        };
        img.src = src;
    });
    imageCache.set(src, promise);
    if (imageCache.size > MAX_IMAGE_CACHE) {
        const oldestKey = imageCache.keys().next().value;
        imageCache.delete(oldestKey);
    }
    return promise;
}

export function revokePreviewObjectURLs() {
    activeObjectURLs.forEach((url) => URL.revokeObjectURL(url));
    activeObjectURLs.clear();
}

function createTrackedObjectURL(blob) {
    const url = URL.createObjectURL(blob);
    activeObjectURLs.add(url);
    return url;
}

function getNoiseTileCanvas(noiseValue) {
    const level = Math.max(0, Math.min(100, Number(noiseValue) || 0));
    if (noiseCache.canvas && noiseCache.level === level) {
        return noiseCache.canvas;
    }
    const size = 192;
    const tile = document.createElement("canvas");
    tile.width = size;
    tile.height = size;
    const tileCtx = tile.getContext("2d");
    const imageData = tileCtx.createImageData(size, size);
    const data = imageData.data;
    const factor = (level / 100) * 255;
    for (let i = 0; i < data.length; i += 4) {
        const delta = (Math.random() - 0.5) * factor;
        const v = delta >= 0 ? 255 : 0;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = Math.min(255, Math.abs(delta));
    }
    tileCtx.putImageData(imageData, 0, 0);
    noiseCache = {level, canvas: tile};
    return tile;
}

function canvasToBlob(canvas) {
    return new Promise((resolve) => {
        if (typeof canvas.toBlob === "function") {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                    return;
                }
                const dataUrl = canvas.toDataURL("image/png");
                const binary = atob(dataUrl.split(",")[1]);
                const arr = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
                resolve(new Blob([arr], {type: "image/png"}));
            }, "image/png");
            return;
        }
        const dataUrl = canvas.toDataURL("image/png");
        const binary = atob(dataUrl.split(",")[1]);
        const arr = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
        resolve(new Blob([arr], {type: "image/png"}));
    });
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
    }
    return line.spans.every((span) => span.text.trim() === "");
}

export function wrapCanvasText(ctx, text, maxWidth) {
    const lines = [];
    let current = "";
    String(text)
        .split(/(\s+)/)
        .forEach((token) => {
            if (!token) return;
            const candidate = current + token;
            if (!current.trim() || ctx.measureText(candidate.trimEnd()).width <= maxWidth) {
                current = candidate;
                return;
            }
            lines.push(current.trimEnd());
            current = token.trimStart();
        });
    if (current.trim()) lines.push(current.trimEnd());
    return lines.flatMap((line) => {
        if (ctx.measureText(line).width <= maxWidth) return [line];
        const parts = [];
        let part = "";
        Array.from(line).forEach((char) => {
            if (part && ctx.measureText(part + char).width > maxWidth) {
                parts.push(part);
                part = char;
            } else {
                part += char;
            }
        });
        if (part) parts.push(part);
        return parts;
    });
}

export function layoutSillybooksHeader(width, fontSize, settings, deps) {
    const scale = width / deps.SHARE_REFERENCE_WIDTH;
    const paddingTop = Math.round(150 * scale);
    const paddingBottom = Math.round(160 * scale);
    const {title, name} = deps.getSillybooksHeaderTexts(settings);
    const family = deps.getCSSFontFamily(settings.fontFamily);
    const titleSize = Math.round(fontSize * 1.55);
    const nameSize = Math.round(fontSize * 0.78);
    const titleStep = Math.round(titleSize * 1.3);
    const measure = getMeasureContext();
    measure.letterSpacing = "0em";
    measure.font = `bold ${titleSize}px ${family}`;
    const titleLines = title ? wrapCanvasText(measure, title, width * 0.8) : [];
    let y = paddingTop;
    const titleTop = y;
    y += titleLines.length * titleStep;
    if (titleLines.length && name) y += Math.round(fontSize * 0.35);
    const nameTop = y;
    if (name) y += Math.round(nameSize * 1.4);
    if (titleLines.length || name) y += fontSize * 2;
    return {family, titleSize, nameSize, titleStep, titleLines, titleTop, name, nameTop, bodyTop: y, paddingBottom};
}

export function drawSillybooksHeader(ctx, header, settings, deps) {
    const x = ctx.canvas.width * 0.1;
    const color = settings.fontColor || deps.SILLYBOOKS_DEFAULTS.fontColor;
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = color;
    ctx.letterSpacing = "0em";
    ctx.font = `bold ${header.titleSize}px ${header.family}`;
    header.titleLines.forEach((line, index) => {
        ctx.fillText(line, x, header.titleTop + index * header.titleStep + (header.titleStep - header.titleSize) / 2);
    });
    if (header.name) {
        ctx.font = `${header.nameSize}px ${header.family}`;
        ctx.globalAlpha = 0.56;
        ctx.fillText(header.name, x, header.nameTop);
    }
    ctx.restore();
}

export function wrappingTexts(text, mode = "word", deps) {
    const settings = deps.getSettings();
    const ctx = getMeasureContext();
    const {width, height} = deps.getCanvasSize();
    const maxWidth = width * 0.8;
    const fontSize = deps.getActiveFontSize(settings);
    const lineHeight = fontSize * parseFloat(settings.fontLineHeight);
    const indentSize = settings.textIndent ? fontSize : 0;
    const spacingStr = `${settings.fontSpacing}em`;

    const fullSize = deps.getImageRatio(settings) === "full";
    const reserve = deps.getVerticalReserve(width, deps.getMetaLines(settings).length, fontSize);
    const maxLines = fullSize ? Infinity : Math.max(1, Math.floor((height - reserve.total) / lineHeight));

    const pages = [];
    let currentPage = [];
    let lineCount = 0;

    let lastFont = "";
    ctx.letterSpacing = spacingStr;

    const lines = text.split(/\n/);
    const mdOptions = {
        allowHeading: true,
        isHtmlMode: deps.isHtmlModeEnabled(),
        setHighlighterTags: settings.setHighlighterTags || [],
        globalFontSize: fontSize,
    };

    lines.forEach((lineText) => {
        const trimmedLine = lineText.trim();
        const isHrLine = /^-{3,}$/.test(trimmedLine) || /^<hr\s*\/?>$/i.test(trimmedLine);
        const isBlank = trimmedLine === "";

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
        const spans = enableMarkdown(lineText, mdOptions);
        let currentLine = [];
        let currentLineWidth = 0;

        spans.forEach((span) => {
            const units = mode === "word" ? span.text.match(/\S+\s*|\s+/g) || [] : Array.from(span.text);
            const fontWeight = span.bold ? "bold" : settings.fontWeight;
            const fontStyle = span.italic ? "italic" : "normal";
            const fontFamily = span.fontFamily && span.fontFamily !== "useGlobal" ? span.fontFamily : settings.fontFamily;
            const setFontSize = span.fontSize || fontSize;
            const fontStr = `${fontStyle} ${fontWeight} ${setFontSize}px ${deps.getCSSFontFamily(fontFamily)}`;
            if (lastFont !== fontStr) {
                ctx.font = fontStr;
                lastFont = fontStr;
            }

            units.forEach((unit) => {
                if (mode === "char" && (unit === " " || unit === "\t") && currentLine.length === 0) return;

                const unitWidth = ctx.measureText(unit).width;
                const availableWidth = maxWidth - (wrapLine.length === 0 ? indentSize : 0);

                if (currentLineWidth + unitWidth <= availableWidth) {
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
                    currentLineWidth += unitWidth;
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

                    const nextText = unit.trimStart();
                    currentLine = [
                        {
                            text: nextText,
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
                    currentLineWidth = nextText === unit ? unitWidth : nextText ? ctx.measureText(nextText).width : 0;
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

        if (wrapLine.length) wrapLine[0].paraStart = true;

        if (!fullSize && wrapLine.length > maxLines) {
            if (currentPage.length > 0 && maxLines - lineCount < 2) {
                pages.push(currentPage);
                currentPage = [];
                lineCount = 0;
            }
            let offset = 0;
            while (offset < wrapLine.length) {
                const space = maxLines - lineCount;
                const slice = wrapLine.slice(offset, offset + space);
                currentPage = currentPage.concat(slice);
                lineCount += slice.length;
                offset += slice.length;
                if (offset < wrapLine.length) {
                    pages.push(currentPage);
                    currentPage = [];
                    lineCount = 0;
                }
            }
            return;
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

export function generateTextImage(chunk, index, deps) {
    const {width, height} = deps.getCanvasSize();
    const settings = deps.getSettings();

    const fontSize = deps.getActiveFontSize(settings);
    const lineHeight = fontSize * parseFloat(settings.fontLineHeight);
    const bgImage = settings.selectedBackgroundImage;
    const useBgColor = settings.useBackgroundColor;
    const bgColor = settings.backgroundColor;
    const useSecondBgColor = settings.useSecondBackgroundColor;
    const secondBgColor = settings.secondBackgroundColor;
    const spacingStr = `${settings.fontSpacing}em`;

    const sillybooks = deps.isSillybooksTemplate(settings);
    const isFullSize = deps.getImageRatio(settings) === "full";
    const metaLines = sillybooks ? [] : deps.getMetaLines(settings);
    const metaMetrics = deps.getMetaMetrics(width);
    const sbHeader = sillybooks ? layoutSillybooksHeader(width, fontSize, settings, deps) : null;
    const reserve = sbHeader ? {top: sbHeader.bodyTop, total: sbHeader.bodyTop + sbHeader.paddingBottom} : deps.getVerticalReserve(width, metaLines.length, fontSize);
    let metaStartY = 0;
    const calcHeight =
        sbHeader ? Math.ceil(chunk.length * lineHeight + reserve.total)
        : isFullSize ? Math.ceil(Math.max(width, chunk.length * lineHeight + reserve.total))
        : height;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = calcHeight;
    const ctx = canvas.getContext("2d");
    ctx.textRendering = "geometricPrecision";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    const drawText = () => {
        const strokeWidth = parseFloat(settings.strokeWidth) || 0;

        const totalTextHeight = chunk.length * lineHeight;
        const spare = Math.max(0, calcHeight - reserve.total - totalTextHeight);
        let y = reserve.top + spare / 2 + fontSize;
        const setAlign = settings.fontAlign || "left";
        const indentSize = settings.textIndent ? fontSize : 0;

        const lineBreak = settings.lineBreak || "byWord";
        const maxLineWidth = width * 0.8;
        let lastFont = "";

        ctx.letterSpacing = spacingStr;

        function setFont(span) {
            const fontWeight = span.bold ? "bold" : settings.fontWeight;
            const fontStyle = span.italic ? "italic" : "normal";
            const fontFamily = span.fontFamily && span.fontFamily !== "useGlobal" ? span.fontFamily : settings.fontFamily;
            const setFontSize = span.fontSize || fontSize;
            const fontStr = `${fontStyle} ${fontWeight} ${setFontSize}px ${deps.getCSSFontFamily(fontFamily)}`;
            if (lastFont !== fontStr) {
                ctx.font = fontStr;
                lastFont = fontStr;
            }
        }

        function renderSpan(span, x, yPos, textWidth, drawMode = "both") {
            const setFontSize = span.fontSize || fontSize;
            const textHeight = setFontSize;

            if ((drawMode === "both" || drawMode === "background") && span.bgColor) {
                const paddingX = 2;
                const paddingY = 2;
                ctx.fillStyle = span.bgColor;
                const bgHeight = fontSize;
                const bgY = yPos - fontSize + paddingY;
                ctx.fillRect(x - paddingX, bgY, textWidth + 2 * paddingX, bgHeight);
            }

            if (drawMode === "both" || drawMode === "text") {
                setFont(span);

                let currentStrokeWidth = strokeWidth;
                if (span.strokeWidth !== undefined && span.strokeWidth !== null) {
                    currentStrokeWidth = span.strokeWidth === "inherit" ? parseFloat(settings.strokeWidth) || 0 : parseFloat(span.strokeWidth) || 0;
                }

                let textColor = settings.fontColor || "#000000";
                if (span.fontColor) {
                    textColor = span.fontColor;
                } else if (span.quote && settings.useQuotesColor) {
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

                ctx.fillStyle = textColor;
                if (currentStrokeWidth > 0) {
                    ctx.strokeStyle = textColor;
                    ctx.lineWidth = currentStrokeWidth;
                    ctx.strokeText(span.text, x, yPos);
                }
                ctx.fillText(span.text, x, yPos);

                if (span.strikethrough) {
                    ctx.beginPath();
                    ctx.moveTo(x, yPos - textHeight / 3);
                    ctx.lineTo(x + textWidth, yPos - textHeight / 3);
                    ctx.strokeStyle = textColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

                if (span.underline) {
                    ctx.beginPath();
                    ctx.moveTo(x, yPos + 4);
                    ctx.lineTo(x + textWidth, yPos + 4);
                    ctx.strokeStyle = textColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }

            return textWidth;
        }

        function getAlignedX(totalTextWidth, indent = 0) {
            if (setAlign === "center") return width / 2 - totalTextWidth / 2 + indent / 2;
            if (setAlign === "right") return width * 0.9 - totalTextWidth;
            return width * 0.1 + indent;
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
                const measuredWidths = new Array(line.length);

                for (let i = 0; i < line.length; i++) {
                    setFont(line[i]);
                    const w = ctx.measureText(line[i].text).width;
                    measuredWidths[i] = w;
                    totalTextWidth += w;
                }

                const alignX = getAlignedX(totalTextWidth, line.paraStart ? indentSize : 0);

                ctx.textAlign = "left";
                let x = alignX;
                for (let i = 0; i < line.length; i++) {
                    renderSpan(line[i], x, textY, measuredWidths[i], "background");
                    x += measuredWidths[i];
                }

                x = alignX;
                for (let i = 0; i < line.length; i++) {
                    x += renderSpan(line[i], x, textY, measuredWidths[i], "text");
                }

                y += lineHeight;
            }
        } else {
            for (let lineIndex = 0; lineIndex < chunk.length; lineIndex++) {
                const lineObj = chunk[lineIndex];
                if (isHrRenderLine(lineObj)) {
                    renderHrLine(y);
                    y += lineHeight;
                    continue;
                }
                const textY = y;
                const line = lineObj.spans;
                const isLastLine = lineIndex === chunk.length - 1;
                const isBlank = line.every((span) => span.text.trim() === "");
                const shouldJustify = setAlign === "left" && !isLastLine && lineObj.softBreak && !isBlank;

                let totalTextWidth = 0;
                const measuredWidths = new Array(line.length);

                for (let i = 0; i < line.length; i++) {
                    setFont(line[i]);
                    const w = ctx.measureText(line[i].text).width;
                    measuredWidths[i] = w;
                    totalTextWidth += w;
                }

                const lineIndent = lineObj.paraStart ? indentSize : 0;
                const alignX = getAlignedX(totalTextWidth, lineIndent);

                const gapCount = line.length - 1;
                const spacing = gapCount > 0 && shouldJustify ? (maxLineWidth - lineIndent - totalTextWidth) / gapCount : 0;

                ctx.textAlign = "left";
                let x = alignX;
                for (let i = 0; i < line.length; i++) {
                    renderSpan(line[i], x, textY, measuredWidths[i], "background");
                    x += measuredWidths[i];
                    if (i < line.length - 1) x += spacing;
                }

                x = alignX;
                for (let i = 0; i < line.length; i++) {
                    x += renderSpan(line[i], x, textY, measuredWidths[i], "text");
                    if (i < line.length - 1) x += spacing;
                }

                y += lineHeight;
            }
        }

        metaStartY = y - fontSize;
    };

    const drawSolidOrGradientBackground = () => {
        if (useSecondBgColor) {
            const gradient = ctx.createLinearGradient(0, 0, width, calcHeight);
            addSmoothGradientStops(gradient, bgColor, secondBgColor);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = bgColor;
        }
        ctx.fillRect(0, 0, width, calcHeight);
    };

    const textWallpaper = (img) => {
        const fillMode = settings.imageFillMode || "cover";

        const drawBackground = () => {
            if (!useBgColor) return;
            drawSolidOrGradientBackground();
        };

        if (fillMode === "pattern") {
            if (useBgColor || !img) {
                drawBackground();
            } else {
                const scale = width / img.width;
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = width;
                tempCanvas.height = Math.round(img.height * scale);
                const tempCtx = tempCanvas.getContext("2d");
                tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

                const pattern = ctx.createPattern(tempCanvas, "repeat");
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, width, calcHeight);
            }
        } else if (fillMode === "mix-top" || fillMode === "mix-bottom") {
            drawBackground();

            if (img) {
                const scale = width / img.width;
                const drawWidth = width;
                const drawHeight = img.height * scale;
                const offsetY = fillMode === "mix-top" ? 0 : calcHeight - drawHeight;

                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = width;
                tempCanvas.height = calcHeight;
                const tempCtx = tempCanvas.getContext("2d");
                tempCtx.drawImage(img, 0, offsetY, drawWidth, drawHeight);

                const gradientHeight = Math.min(drawHeight * 0.4, calcHeight * 0.3);
                const gradient = tempCtx.createLinearGradient(0, fillMode === "mix-top" ? offsetY + drawHeight - gradientHeight : offsetY + gradientHeight, 0, fillMode === "mix-top" ? offsetY + drawHeight : offsetY);
                gradient.addColorStop(0, "rgba(0,0,0,1)");
                gradient.addColorStop(1, "rgba(0,0,0,0)");

                tempCtx.globalCompositeOperation = "destination-in";
                tempCtx.fillStyle = gradient;
                tempCtx.fillRect(0, 0, width, calcHeight);

                ctx.drawImage(tempCanvas, 0, 0, width, calcHeight);
            }
        } else {
            if (useBgColor || !img) {
                drawBackground();
            } else {
                const imgRatio = img.width / img.height;
                const canvasRatio = width / calcHeight;
                let drawWidth;
                let drawHeight;
                let offsetX = 0;
                let offsetY = 0;

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

        const filterEffects = [];
        const blurVal = Number(settings.bgBlur) || 0;
        const brightVal = settings.bgBrightness !== undefined ? Number(settings.bgBrightness) : 100;
        const hueVal = settings.bgHue !== undefined ? Number(settings.bgHue) : 0;
        const grayVal = Number(settings.bgGrayscale) || 0;

        if (blurVal > 0) filterEffects.push(`blur(${blurVal}px)`);
        if (brightVal !== 100) filterEffects.push(`brightness(${brightVal}%)`);
        if (hueVal !== 0) filterEffects.push(`hue-rotate(${hueVal}deg)`);
        if (grayVal > 0) filterEffects.push(`grayscale(${grayVal}%)`);

        if (filterEffects.length > 0) {
            const blurPad = Math.ceil(blurVal * 3);
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

        if ((Number(settings.bgNoise) || 0) > 0) {
            const tile = getNoiseTileCanvas(settings.bgNoise);
            const pattern = ctx.createPattern(tile, "repeat");
            if (pattern) {
                ctx.save();
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, width, calcHeight);
                ctx.restore();
            }
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
        ctx.letterSpacing = "0em";

        if (metaLines.length) {
            let y = metaStartY + reserve.metaGap + metaMetrics.fontSize;
            ctx.font = `${metaMetrics.fontSize}px ${deps.getCSSFontFamily("Pretendard-Regular")}`;
            ctx.textAlign = "left";
            ctx.fillStyle = textColor;
            metaLines.forEach((line) => {
                ctx.globalAlpha = line.alpha;
                ctx.fillText(line.text, width * 0.1, y);
                y += metaMetrics.lineStep;
            });
            ctx.globalAlpha = 1;
        }

        if (deps.isWatermarkEnabled(settings)) {
            ctx.font = `900 ${metaMetrics.watermarkSize}px ${deps.getCSSFontFamily("Paperozi")}`;
            ctx.textAlign = "right";
            ctx.fillStyle = textColor;
            ctx.globalAlpha = 0.32;
            ctx.fillText(deps.WATERMARK_MARK, width - metaMetrics.watermarkInset, calcHeight - metaMetrics.watermarkInset);
            ctx.globalAlpha = 1;
        }

        ctx.textAlign = "left";
    };

    const $preview = $("<div>")
        .addClass("image-preview-item")
        .attr({"data-img-width": String(width), "data-img-height": String(calcHeight)});
    const $scrollWrap = $("<div>").addClass("tti-image-scroll");
    const $img = $("<img>").attr({alt: `Generated Image ${index + 1}`, draggable: "false"});
    let renderedBlob = null;

    const finalizeCanvas = async () => {
        const blob = await canvasToBlob(canvas);
        renderedBlob = blob;
        if (deps.isRenderStale?.()) return blob;
        $img.attr("src", createTrackedObjectURL(blob));
        return blob;
    };

    const fillMode = settings.imageFillMode || "cover";
    const needsBgImage = !sbHeader && !!bgImage && (!useBgColor || fillMode === "mix-top" || fillMode === "mix-bottom");

    let readyPromise;
    if (sbHeader) {
        ctx.fillStyle = settings.backgroundColor || deps.SILLYBOOKS_DEFAULTS.backgroundColor;
        ctx.fillRect(0, 0, width, calcHeight);
        drawSillybooksHeader(ctx, sbHeader, settings, deps);
        drawText();
        drawFooter();
        readyPromise = finalizeCanvas();
    } else if (needsBgImage) {
        readyPromise = loadImageCached(bgImage)
            .then((img) => {
                textWallpaper(img);
                drawOverlay();
                drawText();
                drawFooter();
                return finalizeCanvas();
            })
            .catch(() => {
                drawOverlay();
                drawText();
                drawFooter();
                return finalizeCanvas();
            });
    } else if (useBgColor) {
        textWallpaper(null);
        drawOverlay();
        drawText();
        drawFooter();
        readyPromise = finalizeCanvas();
    } else {
        ctx.fillRect(0, 0, width, calcHeight);
        drawOverlay();
        drawText();
        drawFooter();
        readyPromise = finalizeCanvas();
    }

    const getBlob = async () => {
        if (renderedBlob) return renderedBlob;
        return readyPromise;
    };

    const $downloadBtn = $("<button>")
        .addClass("download-btn")
        .text("Download")
        .data("ttiGetBlob", getBlob)
        .on("click", async () => {
            const blob = await getBlob();
            deps.saveImage(blob, `${index + 1}.png`);
        });

    if (deps.getImageRatio(settings) === "rectangular") $img.addClass("rectangular");
    if (isFullSize) $img.addClass("full");
    $preview.data("ttiReady", readyPromise);
    $preview.data("ttiGetBlob", getBlob);
    $scrollWrap.append($img);
    $preview.append($scrollWrap, $downloadBtn);
    return $preview;
}
