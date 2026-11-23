const SPECIAL_CHAR_RE = /[\s.,;:!?()[\]{}"'<>\/\\\-_=+*&^%$#@~`|“”‘’「」『』]/;
const TRAILING_WRAPPER_RE = /(?:<\/\w+>|\s|[.,;:!?()[\]{}"'“”‘’「」『』<>\/\\*_~`])+$/g;
const PARTICLE_BOUNDARY_SOURCE = `(?=$|[\\s.,!?;:~…·—–\\-()\\[\\]{}"'“”‘’「」『』<>\\/\\\\*_\`])`;
const WRAPPER_BETWEEN_SOURCE = `(?:<\\/\\w+>|[*"'”’」』)\\]\`_~])*`;

const PARTICLE_PAIRS = [
    ["이었으므로", "였으므로"],
    ["이었지만", "였지만"],
    ["이었기에", "였기에"],
    ["이었는지", "였는지"],
    ["이었으면", "였으면"],
    ["이었으니", "였으니"],
    ["이었으나", "였으나"],
    ["이잖아요", "잖아요"],
    ["이거든요", "거든요"],
    ["으로부터", "로부터", "로부터"],
    ["이었다", "였다"],
    ["이었던", "였던"],
    ["이었어", "였어"],
    ["이었지", "였지"],
    ["이었네", "였네"],
    ["이었나", "였나"],
    ["이었을", "였을"],
    ["이었고", "였고"],
    ["이에요", "예요"],
    ["이잖아", "잖아"],
    ["이거든", "거든"],
    ["이니까", "니까"],
    ["이라면", "라면"],
    ["이라고", "라고"],
    ["이라는", "라는"],
    ["이라도", "라도"],
    ["이라서", "라서"],
    ["이라니", "라니"],
    ["이나마", "나마"],
    ["이든지", "든지"],
    ["이시여", "시여"],
    ["이구나", "구나"],
    ["이래요", "래요"],
    ["이랬어", "랬어"],
    ["으로서", "로서", "로서"],
    ["으로써", "로써", "로써"],
    ["으로는", "로는", "로는"],
    ["으로도", "로도", "로도"],
    ["으로만", "로만", "로만"],
    ["으로의", "로의", "로의"],
    ["이랑은", "랑은"],
    ["이랑도", "랑도"],
    ["이랑", "랑"],
    ["으로", "로", "로"],
    ["이란", "란"],
    ["이나", "나"],
    ["이든", "든"],
    ["이여", "여"],
    ["이네", "네"],
    ["이냐", "냐"],
    ["이니", "니"],
    ["이군", "군"],
    ["이래", "래"],
    ["이다", "다"],
    ["이야", "야"],
    ["은", "는"],
    ["이", "가"],
    ["을", "를"],
    ["과", "와"],
    ["아", "야"],
];

const PARTICLE_LOOKUP = new Map();
const PARTICLE_TOKENS = [];

for (const [withJong, withoutJong, rieulForm] of PARTICLE_PAIRS) {
    if (!PARTICLE_LOOKUP.has(withJong)) {
        PARTICLE_LOOKUP.set(withJong, {withJong, withoutJong, rieulForm: rieulForm ?? withJong});
        PARTICLE_TOKENS.push(withJong);
    }
    if (!PARTICLE_LOOKUP.has(withoutJong)) {
        const pair = withoutJong === "야" ? {withJong: "아", withoutJong: "야", rieulForm: "아"} : {withJong, withoutJong, rieulForm: rieulForm ?? withJong};
        PARTICLE_LOOKUP.set(withoutJong, pair);
        PARTICLE_TOKENS.push(withoutJong);
    }
}

PARTICLE_TOKENS.sort((a, b) => b.length - a.length);
const PARTICLE_ALT_SOURCE = PARTICLE_TOKENS.map(escapeRegExp).join("|");

export function escapeRegExp(string) {
    return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeFullwidth(str) {
    return str.replace(/[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}

export function analyzeWordEnding(word) {
    const cleaned = normalizeFullwidth(String(word ?? "").replace(TRAILING_WRAPPER_RE, "").trim());
    if (!cleaned) {
        return {hasJongseong: false, isRieul: false, isEmpty: true};
    }

    const lastChar = cleaned.charAt(cleaned.length - 1);

    if (/[가-힣]/.test(lastChar)) {
        const jong = (lastChar.charCodeAt(0) - 0xac00) % 28;
        return {hasJongseong: jong !== 0, isRieul: jong === 8, isEmpty: false};
    }

    if (/[0-9]/.test(lastChar)) {
        if (lastChar === "1" || lastChar === "7" || lastChar === "8") {
            return {hasJongseong: true, isRieul: true, isEmpty: false};
        }
        if (lastChar === "0" || lastChar === "3" || lastChar === "6") {
            return {hasJongseong: true, isRieul: false, isEmpty: false};
        }
        return {hasJongseong: false, isRieul: false, isEmpty: false};
    }

    if (/[A-Za-z]/.test(lastChar)) {
        const latinMatch = cleaned.match(/[A-Za-z]+$/);
        const token = latinMatch ? latinMatch[0].toLowerCase() : lastChar.toLowerCase();
        if (token.length === 1) {
            if (token === "l" || token === "r") return {hasJongseong: true, isRieul: true, isEmpty: false};
            if (token === "m" || token === "n") return {hasJongseong: true, isRieul: false, isEmpty: false};
            return {hasJongseong: false, isRieul: false, isEmpty: false};
        }
        if (token.endsWith("l") || /[bcdfghjklmnpqrstvwxyz]le$/.test(token) || /[aiouy]le$/.test(token)) {
            return {hasJongseong: true, isRieul: true, isEmpty: false};
        }
        if (/[mn]$/.test(token) || /ng$/.test(token) || /[aeiouy][mn]e$/.test(token)) {
            return {hasJongseong: true, isRieul: false, isEmpty: false};
        }
        if (/[aeiouy](?:ck|c|k|p|b)$/.test(token)) {
            return {hasJongseong: true, isRieul: false, isEmpty: false};
        }
        return {hasJongseong: false, isRieul: false, isEmpty: false};
    }

    if (lastChar === "ㄹ" || lastChar === "\u1105" || lastChar === "\u11AF") {
        return {hasJongseong: true, isRieul: true, isEmpty: false};
    }
    if (/[ㄱ-ㅎ\uFFA1-\uFFBE\u3165-\u3186\u1100-\u115E\u11A8-\u11FF]/.test(lastChar)) {
        return {hasJongseong: true, isRieul: false, isEmpty: false};
    }

    return {hasJongseong: false, isRieul: false, isEmpty: false};
}

export function hasConsonantLetter(word) {
    return analyzeWordEnding(word).hasJongseong;
}

function selectParticle(particle, ending) {
    const rule = PARTICLE_LOOKUP.get(particle);
    if (!rule) return particle;
    if (!ending.hasJongseong) return rule.withoutJong;
    if (ending.isRieul) return rule.rieulForm;
    return rule.withJong;
}

function replaceString(text, original, replacement, letterCase, unitControl) {
    const origLen = original.length;
    const origLower = letterCase ? original : original.toLowerCase();
    const containSymbols = /[^\wa-zA-Z]/.test(original);
    let result = "";

    for (let i = 0; i < text.length; i++) {
        if (i <= text.length - origLen) {
            const slice = text.slice(i, i + origLen);
            if (letterCase ? slice === original : slice.toLowerCase() === origLower) {
                const isStartBoundary = i === 0 || SPECIAL_CHAR_RE.test(text[i - 1]);
                const endPos = i + origLen;
                const nextChar = text[endPos] || "";

                if (!unitControl || containSymbols || (isStartBoundary && (endPos === text.length || SPECIAL_CHAR_RE.test(nextChar) || !/[a-zA-Z0-9]/.test(nextChar)))) {
                    result += replacement;
                    i = endPos - 1;
                    continue;
                }
            }
        }
        result += text[i];
    }

    return result;
}

function findKoreanWord(text, originalWord, replacementWord, unitControl) {
    const origLen = originalWord.length;
    let result = "";

    for (let i = 0; i < text.length; i++) {
        if (i <= text.length - origLen && text.slice(i, i + origLen) === originalWord) {
            const endPos = i + origLen;
            if (!unitControl) {
                result += replacementWord;
                i = endPos - 1;
                continue;
            }
            const isStartBoundary = i === 0 || SPECIAL_CHAR_RE.test(text[i - 1]);
            const nextChar = text[endPos] || "";
            const isEndBoundary = endPos === text.length || SPECIAL_CHAR_RE.test(nextChar) || !/[가-힣0-9]/.test(nextChar);
            if (isStartBoundary && isEndBoundary) {
                result += replacementWord;
                i = endPos - 1;
                continue;
            }
        }
        result += text[i];
    }

    return result;
}

export function replaceWordsWithRules(inputText, rules, options = {}) {
    const {letterCase = false, unitControl = false} = options;
    const wordGroup = (Array.isArray(rules) ? rules : [])
        .filter((rule) => rule && rule.enabled)
        .map((rule) => ({
            original: String(rule.original || "").trim(),
            replacement: rule.replacement !== undefined ? String(rule.replacement) : "",
        }))
        .filter((group) => group.original);

    if (wordGroup.length === 0) {
        return String(inputText ?? "");
    }

    let text = String(inputText ?? "");
    const tokens = wordGroup.map((_, index) => `\uE000TTI_REP_${index}\uE001`);

    const targets = [];
    wordGroup.forEach((group, ruleIndex) => {
        group.original
            .split("||")
            .map((word) => word.trim())
            .filter(Boolean)
            .forEach((origWord) => {
                targets.push({origWord, token: tokens[ruleIndex]});
            });
    });

    targets.sort((a, b) => b.origWord.length - a.origWord.length);

    for (const {origWord, token} of targets) {
        if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(origWord)) {
            text = findKoreanWord(text, origWord, token, unitControl);
        } else {
            text = replaceString(text, origWord, token, letterCase, unitControl);
        }
    }

    for (let i = 0; i < wordGroup.length; i++) {
        const replacementText = wordGroup[i].replacement;
        const token = tokens[i];
        const ending = analyzeWordEnding(replacementText);

        if (ending.isEmpty) {
            const deleteRegex = new RegExp(`([ \\t]*)${escapeRegExp(token)}(${WRAPPER_BETWEEN_SOURCE})(?:(${PARTICLE_ALT_SOURCE})${PARTICLE_BOUNDARY_SOURCE})?([ \\t]*)`, "g");
            text = text.replace(deleteRegex, (_, lead, wrapper, _particle, trail) => {
                if (wrapper) return `${lead}${wrapper}${trail}`;
                if (lead && trail) return " ";
                return "";
            });
        } else {
            const regex = new RegExp(`${escapeRegExp(token)}(${WRAPPER_BETWEEN_SOURCE})(?:(${PARTICLE_ALT_SOURCE})${PARTICLE_BOUNDARY_SOURCE})?`, "g");
            text = text.replace(regex, (_, wrapper, particle) => {
                if (!particle) return replacementText + (wrapper || "");
                return replacementText + (wrapper || "") + selectParticle(particle, ending);
            });
        }
    }

    return text;
}
