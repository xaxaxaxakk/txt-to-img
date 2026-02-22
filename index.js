const extension_settings = JSON.parse(localStorage.getItem("txt-to-img") || "{}");
const JSZipCDN = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
const FileSaverCDN = "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js";

const extensionName = "txt-to-img";
const extensionFolderPath = `https://xaxaxaxakk.github.io/${extensionName}`;
const defaultSettings = {
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
  footerText: "",
  footerLayoutMode: "scroll",
  footerWidth: 750,
  footerHeight: 750,
  footerColor: "#000000",
  footerBgColor: "#ffffff",
  autoPreview: true,
  htmlMode: false,
  letterCase: false,
  unitControl: false,
  setHighlighterTags: [],
};
let defaultBackgroundUrlMap = new Map();
let defaultBackgroundBasenameMap = new Map();
const CUSTOM_BG_STORAGE_IMAGE_KEY = "textToImageCustomBgsImage";
const CUSTOM_BG_STORAGE_HTML_KEY = "textToImageCustomBgsHTML";
const HTML_FONT_FACE_OPTIONS = new Set(["Ridibatang", "Nanum Gothic"]);

function saveSettings() {
  localStorage.setItem(extensionName, JSON.stringify(extension_settings[extensionName]));
}

function isHtmlModeEnabled() {
  return !!extension_settings[extensionName]?.htmlMode;
}
function getFooterLayoutMode(settings = extension_settings[extensionName]) {
  return settings?.footerLayoutMode === "full" ? "full" : "scroll";
}
function normalizeHtmlFontFace(value) {
  return HTML_FONT_FACE_OPTIONS.has(value) ? value : defaultSettings.htmlFontFace;
}
function getHtmlFontFace(settings = extension_settings[extensionName]) {
  return normalizeHtmlFontFace(settings?.htmlFontFace);
}
function getHtmlPreviewFontFamily(settings = extension_settings[extensionName]) {
  return getHtmlFontFace(settings) === "Nanum Gothic" ? "Pretendard-Regular" : "RIDIBatang";
}
function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function updateFooterLayoutUIState() {
  const isScroll = $("#footer_layout_mode").val() !== "full";
  $("#footer .footer-scroll-only").toggleClass("footer-scroll-only-hidden", !isScroll);
}
function ensureFontSizeSettings() {
  const settings = extension_settings[extensionName];
  const legacyFontSize = parseInt(settings.fontSize, 10);
  const imageSize = parseInt(settings.fontSizeImage, 10);
  const htmlSize = parseInt(settings.fontSizeHtml, 10);

  settings.fontSizeImage = Number.isFinite(imageSize)
    ? imageSize
    : (Number.isFinite(legacyFontSize) ? legacyFontSize : defaultSettings.fontSizeImage);
  settings.fontSizeHtml = Number.isFinite(htmlSize)
    ? htmlSize
    : defaultSettings.fontSizeHtml;
  settings.fontSize = isHtmlModeEnabled() ? settings.fontSizeHtml : settings.fontSizeImage;
}
function getActiveFontSize(settings = extension_settings[extensionName]) {
  return isHtmlModeEnabled()
    ? (parseInt(settings.fontSizeHtml, 10) || defaultSettings.fontSizeHtml)
    : (parseInt(settings.fontSizeImage, 10) || defaultSettings.fontSizeImage);
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
  const x = rect.left + (rect.width * percentage) + window.scrollX;
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
  const selector = [
    "#tti_font_size_image",
    "#tti_font_size_html",
    "#tti_letter_spacing",
    "#tti_line_height",
    "#bg_blur",
    "#bg_brightness",
    "#bg_hue",
    "#bg_grayscale",
    "#bg_noise",
    "#overlay_opacity",
  ].join(", ");
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
  const savedSettings = JSON.parse(localStorage.getItem(extensionName) || "{}");
  extension_settings[extensionName] = {
    ...defaultSettings,
    ...savedSettings,
    ...extension_settings[extensionName],
  };
  ensureFontSizeSettings();
  const {
    fontFamily,
    fontSizeImage,
    fontSizeHtml,
    htmlFontFace,
    fontSpacing,
    fontLineHeight,
    fontAlign,
    fontColor,
    useItalicColor,
    italicFontColor,
    useBoldColor,
    boldFontColor,
    useBoldItalicColor,
    boldItalicFontColor,
    useStrikethroughColor,
    strikethroughFontColor,
    useUnderlineColor,
    underlineFontColor,
    blockquoteFontColor,
    blockquoteBgColor,
    blockquoteBorderColor,
    strokeWidth,
    lineBreak,
    imageRatio,
    imageFillMode,
    useBackgroundColor,
    backgroundColor,
    useSecondBackgroundColor,
    secondBackgroundColor,
    bgBlur,
    bgBrightness,
    bgHue,
    bgGrayscale,
    bgNoise,
    overlayOpacity,
    overlayColor,
    currentPreset,
    footerText,
    footerLayoutMode,
    footerWidth,
    footerHeight,
    footerColor,
    footerBgColor,
    autoPreview,
    htmlMode,
    letterCase,
    unitControl,
  } = extension_settings[extensionName];

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
  $("#footer_text").val(footerText);
  $("#footer_layout_mode").val(getFooterLayoutMode(extension_settings[extensionName]));
  $("#footer_width").val(parsePositiveInt(footerWidth, defaultSettings.footerWidth));
  $("#footer_height").val(parsePositiveInt(footerHeight, defaultSettings.footerHeight));
  $("#footer_color").val(footerColor);
  $("#footer_bg_color").val(footerBgColor || defaultSettings.footerBgColor);
  $("#preview_toggle").prop("checked", autoPreview);
  $("#html_toggle").prop("checked", htmlMode);
  $("#letter_control").prop("checked", letterCase);
  $("#unit_control").prop("checked", unitControl);

  await loadFonts();
  await loadBG();
  await loadBackgroundURLMap();
  highlighterTags();
  applyHtmlModeUIState();
  updateFooterLayoutUIState();

  if (currentPreset && extension_settings[extensionName].presets[currentPreset]) {
    applyPreset(currentPreset);
  } else {
    refreshPreview();
  }
}

// 프리셋
function presetUI() {
  $("#create_preset").on("click", createPreset);
  $("#save_preset").on("click", savePreset);
  $("#delete_preset").on("click", deletePreset);
  $("#rename_preset").on("click", renamePreset);
  $("#preset_selector").on("change", selectPreset);

  loadPresetList();
}
function getPresetSettings() {
  const settings = {...extension_settings[extensionName]};
  delete settings.presets;
  delete settings.currentPreset;
  const imageFontSize = parseInt($("#tti_font_size_image").val(), 10);
  const htmlFontSize = parseInt($("#tti_font_size_html").val(), 10);
  settings.fontSizeImage = Number.isFinite(imageFontSize) ? imageFontSize : (settings.fontSizeImage || defaultSettings.fontSizeImage);
  settings.fontSizeHtml = Number.isFinite(htmlFontSize) ? htmlFontSize : (settings.fontSizeHtml || defaultSettings.fontSizeHtml);
  settings.fontSize = settings.htmlMode ? settings.fontSizeHtml : settings.fontSizeImage;
  settings.htmlFontFace = normalizeHtmlFontFace($("#tti_html_font_face").val());

  if (currentCustomFont && oriFontFamily) {
    settings.fontFamily = oriFontFamily;
  }
  
  settings.originalWord1 = $("#original_word_1").val();
  settings.replacementWord1 = $("#replacement_word_1").val();
  settings.originalWord2 = $("#original_word_2").val();
  settings.replacementWord2 = $("#replacement_word_2").val();
  settings.originalWord3 = $("#original_word_3").val();
  settings.replacementWord3 = $("#replacement_word_3").val();
  settings.originalWord4 = $("#original_word_4").val();
  settings.replacementWord4 = $("#replacement_word_4").val();
  settings.useBackgroundColor = $("#use_background_color").prop("checked");
  settings.backgroundColor = $("#background_color").val();
  settings.useSecondBackgroundColor = $("#use_second_background_color").prop("checked");
  settings.secondBackgroundColor = $("#second_background_color").val();
  settings.blockquoteFontColor = $("#tti_blockquote_font_color").val();
  settings.blockquoteBgColor = $("#tti_blockquote_bg_color").val();
  settings.blockquoteBorderColor = $("#tti_blockquote_border_color").val();
  settings.footerText = $("#footer_text").val();
  settings.footerLayoutMode = $("#footer_layout_mode").val();
  settings.footerWidth = parsePositiveInt($("#footer_width").val(), defaultSettings.footerWidth);
  settings.footerHeight = parsePositiveInt($("#footer_height").val(), defaultSettings.footerHeight);
  settings.footerColor = $("#footer_color").val();
  settings.footerBgColor = $("#footer_bg_color").val();
  settings.autoPreview = $("#preview_toggle").prop("checked");
  settings.htmlMode = $("#html_toggle").prop("checked");
  settings.fontSize = settings.htmlMode ? settings.fontSizeHtml : settings.fontSizeImage;
  settings.letterCase = $("#letter_control").is(":checked");
  settings.unitControl = $("#unit_control").is(":checked");
  settings.setHighlighterTags = JSON.parse(
    JSON.stringify(extension_settings[extensionName].setHighlighterTags || [])
  );
  
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

    extension_settings[extensionName] = {
      ...defaultSettings,
      presets: extension_settings[extensionName].presets,
      currentPreset: null,
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
    $("#original_word_1").val("");
    $("#replacement_word_1").val("");
    $("#original_word_2").val("");
    $("#replacement_word_2").val("");
    $("#original_word_3").val("");
    $("#replacement_word_3").val("");
    $("#original_word_4").val("");
    $("#replacement_word_4").val("");
    $("#use_background_color").prop("checked", defaultSettings.useBackgroundColor);
    $("#background_color").val(defaultSettings.backgroundColor);
    $("#use_second_background_color").prop("checked", defaultSettings.useSecondBackgroundColor);
    $("#second_background_color").val(defaultSettings.secondBackgroundColor);
    syncSelectedBackgroundUI();
    $("#footer_text").val("");
    $("#footer_layout_mode").val(defaultSettings.footerLayoutMode);
    $("#footer_width").val(defaultSettings.footerWidth);
    $("#footer_height").val(defaultSettings.footerHeight);
    $("#footer_color").val(defaultSettings.footerColor);
    $("#footer_bg_color").val(defaultSettings.footerBgColor);
    $("#preview_toggle").prop("checked", defaultSettings.autoPreview);
    $("#html_toggle").prop("checked", defaultSettings.htmlMode);
    $("#letter_control").prop("checked", defaultSettings.letterCase);
    $("#unit_control").prop("checked", defaultSettings.unitControl);
    extension_settings[extensionName].setHighlighterTags = [];

    highlighterTags();
    applyHtmlModeUIState();
    updateFooterLayoutUIState();
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
    extension_settings[extensionName] = {
      ...defaultSettings,
      presets: extension_settings[extensionName].presets,
      currentPreset: null,
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
    $("#original_word_1").val("");
    $("#replacement_word_1").val("");
    $("#original_word_2").val("");
    $("#replacement_word_2").val("");
    $("#original_word_3").val("");
    $("#replacement_word_3").val("");
    $("#original_word_4").val("");
    $("#replacement_word_4").val("");
    $("#use_background_color").prop("checked", defaultSettings.useBackgroundColor);
    $("#background_color").val(defaultSettings.backgroundColor);
    $("#use_second_background_color").prop("checked", defaultSettings.useSecondBackgroundColor);
    $("#second_background_color").val(defaultSettings.secondBackgroundColor);
    syncSelectedBackgroundUI();
    $("#footer_text").val("");
    $("#footer_layout_mode").val(defaultSettings.footerLayoutMode);
    $("#footer_width").val(defaultSettings.footerWidth);
    $("#footer_height").val(defaultSettings.footerHeight);
    $("#footer_color").val(defaultSettings.footerColor);
    $("#footer_bg_color").val(defaultSettings.footerBgColor);
    $("#preview_toggle").prop("checked", defaultSettings.autoPreview);
    $("#html_toggle").prop("checked", defaultSettings.htmlMode);
    $("#letter_control").prop("checked", defaultSettings.letterCase);
    $("#unit_control").prop("checked", defaultSettings.unitControl);

    extension_settings[extensionName].setHighlighterTags = [];
    highlighterTags();
    applyHtmlModeUIState();
    updateFooterLayoutUIState();

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

  const wordPairs = [
    {original: "originalWord1", replacement: "replacementWord1", id: "1"},
    {original: "originalWord2", replacement: "replacementWord2", id: "2"},
    {original: "originalWord3", replacement: "replacementWord3", id: "3"},
    {original: "originalWord4", replacement: "replacementWord4", id: "4"},
  ];
  wordPairs.forEach(({original, replacement, id}) => {
    if (preset[original] !== undefined) $("#original_word_" + id).val(preset[original]);
    if (preset[replacement] !== undefined) $("#replacement_word_" + id).val(preset[replacement]);
  });

  for (const [key, value] of Object.entries(preset)) {
    if (
      [
        "originalWord1",
        "replacementWord1",
        "originalWord2",
        "replacementWord2",
        "originalWord3",
        "replacementWord3",
        "originalWord4",
        "replacementWord4",
        "setHighlighterTags",
        "fontSize",
        "fontSizeImage",
        "fontSizeHtml",
      ].includes(key)
    ) {
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
      case "footerText":
        $("#footer_text").val(value);
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
      case "footerColor":
        $("#footer_color").val(value);
        break;
      case "footerBgColor":
        $("#footer_bg_color").val(value || defaultSettings.footerBgColor);
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
  extension_settings[extensionName].fontSizeImage = Number.isFinite(presetImageFontSize)
    ? presetImageFontSize
    : (Number.isFinite(legacyPresetFontSize) ? legacyPresetFontSize : defaultSettings.fontSizeImage);
  extension_settings[extensionName].fontSizeHtml = Number.isFinite(presetHtmlFontSize)
    ? presetHtmlFontSize
    : defaultSettings.fontSizeHtml;
  extension_settings[extensionName].fontSize = isHtmlModeEnabled()
    ? extension_settings[extensionName].fontSizeHtml
    : extension_settings[extensionName].fontSizeImage;
  $("#tti_font_size_image").val(extension_settings[extensionName].fontSizeImage);
  $("#tti_font_size_html").val(extension_settings[extensionName].fontSizeHtml);

  if (preset.setHighlighterTags) {
    extension_settings[extensionName].setHighlighterTags = JSON.parse(JSON.stringify(preset.setHighlighterTags));
  } else {
    extension_settings[extensionName].setHighlighterTags = [];
  }

  highlighterTags();
  applyHtmlModeUIState();
  updateFooterLayoutUIState();
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

// 봇카드
const cardDataTab = {};
let oriCard = null;
let oriCardType = null;

function loadBotCard(dataType) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".png,.json";

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    oriCard = file;
    oriCardType = file.name.endsWith(".json") ? "json" : "png";

    const botData = file.name.endsWith(".json")
      ? await MDFromJSON(file)
      : await MDFromPNG(file);
    if (botData) botDataClass(botData, dataType);
  };

  input.click();
}
async function MDFromJSON(file) {
  const text = await file.text();
  return JSON.parse(text);
}
async function MDFromPNG(file) {
  const arrayBuffer = await file.arrayBuffer();
  const dataView = new DataView(arrayBuffer);
  let offset = 8;

  while (offset < arrayBuffer.byteLength) {
    const chunkLength = dataView.getUint32(offset);
    offset += 4;
    const chunkType = String.fromCharCode(
      dataView.getUint8(offset),
      dataView.getUint8(offset + 1),
      dataView.getUint8(offset + 2),
      dataView.getUint8(offset + 3)
    );
    offset += 4;

    if (chunkType === "tEXt") {
      let textData = "";
      for (let i = 0; i < chunkLength; i++) {
        textData += String.fromCharCode(dataView.getUint8(offset + i));
      }
      const [key, text] = textData.split("\0");
      if (key.toLowerCase() === "chara" || key.toLowerCase() === "ccv3") {
        const binary = atob(text.trim());
        const uint8Array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          uint8Array[i] = binary.charCodeAt(i);
        }
        const decoded = new TextDecoder("utf-8").decode(uint8Array);
        return JSON.parse(decoded);
      }
    }
    if (chunkType === "iTXt") {
      let textData = "";
      for (let i = 0; i < chunkLength; i++) {
        textData += String.fromCharCode(dataView.getUint8(offset + i));
      }
      const parts = textData.split("\0");
      const key = parts[0];
      if (key.toLowerCase() === "chara" || key.toLowerCase() === "ccv3") {
        const compressionFlag = parts[1] ? parts[1].charCodeAt(0) : 0;
        const text = parts[parts.length - 1];
        
        if (compressionFlag === 0) {
          const binary = atob(text.trim());
          const uint8Array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            uint8Array[i] = binary.charCodeAt(i);
          }
          const decoded = new TextDecoder("utf-8").decode(uint8Array);
          return JSON.parse(decoded);
        }
      }
    }

    offset += chunkLength;
    offset += 4;
  }
  return null;
}
function botDataClass(data) {
  const oriCardData = data.data || data;
  
  cardDataTab.description = (oriCardData.description || "").trim();
  cardDataTab.greeting = (oriCardData.first_mes || "").trim();
  cardDataTab.scenario = (oriCardData.scenario || "").trim();
  cardDataTab.json = JSON.stringify(oriCardData, null, 2);
  cardDataTab.oriData = oriCardData;
  cardDataTab.fullData = data;
  
  $(".bot-data[data-type]").removeClass("active");
  $(`.bot-data[data-type="description"]`).addClass("active");
  const activeTab = $(".bot-data[data-type].active").data("type") || "description";
  $("#text_to_image").val(cardDataTab[activeTab] || "");
  
  $(".bot-data.botImporter").addClass("remover");
  $(".bot-data:not(.botImporter)").prop("disabled", false);
  refreshPreview();  
}
async function botCardSaver() {
  if (!oriCard || !cardDataTab.oriData) {
    return;
  }
  const currentTab = $(".bot-data[data-type].active").data("type");
  if (currentTab) {
    cardDataTab[currentTab] = $("#text_to_image").val();
  }
  const modifiedData = JSON.parse(JSON.stringify(cardDataTab.oriData));
  modifiedData.description = cardDataTab.description;
  modifiedData.first_mes = cardDataTab.greeting;
  modifiedData.scenario = cardDataTab.scenario;

  let latestData;
  if (cardDataTab.fullData && cardDataTab.fullData.data) {
    latestData = JSON.parse(JSON.stringify(cardDataTab.fullData));
    latestData.data = modifiedData;
    if (latestData.description !== undefined) latestData.description = modifiedData.description;
    if (latestData.first_mes !== undefined) latestData.first_mes = modifiedData.first_mes;
    if (latestData.scenario !== undefined) latestData.scenario = modifiedData.scenario;
  } else {
    latestData = modifiedData;
  }
  if (oriCardType === "json") {
    cardToJSON(latestData, oriCard.name);
  } else {
    await cardToPNG(latestData, oriCard);
  }
}
function cardToJSON(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
async function cardToPNG(oriCardData, oriCard) {
  const arrayBuffer = await oriCard.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const jsonStr = JSON.stringify(oriCardData);
  const utf8Bytes = new TextEncoder().encode(jsonStr);
  let binary = "";
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  const encoded = btoa(binary);
  const newChunks = [];
  newChunks.push(textChunk("chara", encoded));
  newChunks.push(textChunk("ccv3", encoded));
  newChunks.push(ITxtChunk("chara", encoded));
  const finalPNG = replaceChunks(uint8Array, newChunks);
  const blob = new Blob([finalPNG], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = oriCard.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function textChunk(key, encoded) {
  const textContent = key + "\0" + encoded;
  const textBytes = [];
  for (let i = 0; i < textContent.length; i++) {
    textBytes.push(textContent.charCodeAt(i));
  }
  const chunkType = [0x74, 0x45, 0x58, 0x74];
  const chunkDataForCRC = [...chunkType, ...textBytes];
  const crc = crc32(new Uint8Array(chunkDataForCRC));
  
  const chunkLength = textBytes.length;
  const chunk = new Uint8Array(12 + chunkLength);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, chunkLength, false);
  chunk.set(chunkType, 4);
  chunk.set(textBytes, 8);
  view.setUint32(8 + chunkLength, crc, false);
  
  return chunk;
}
function ITxtChunk(key, encoded) {
  const textContent = key + "\0\0\0\0\0" + encoded;
  const textBytes = [];
  for (let i = 0; i < textContent.length; i++) {
    textBytes.push(textContent.charCodeAt(i));
  }
  const chunkType = [0x69, 0x54, 0x58, 0x74];
  const chunkDataForCRC = [...chunkType, ...textBytes];
  const crc = crc32(new Uint8Array(chunkDataForCRC));
  const chunkLength = textBytes.length;
  const chunk = new Uint8Array(12 + chunkLength);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, chunkLength, false);
  chunk.set(chunkType, 4);
  chunk.set(textBytes, 8);
  view.setUint32(8 + chunkLength, crc, false);
  
  return chunk;
}
function replaceChunks(uint8Array, newChunks) {
  const chunks = [];
  let offset = 0;
  chunks.push(uint8Array.slice(0, 8));
  offset = 8;
  const view = new DataView(uint8Array.buffer, uint8Array.byteOffset);
  while (offset < uint8Array.length) {
    if (offset + 8 > uint8Array.length) break;
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(
      uint8Array[offset + 4],
      uint8Array[offset + 5],
      uint8Array[offset + 6],
      uint8Array[offset + 7]
    );
    const chunkTotalSize = 12 + length;
    if (offset + chunkTotalSize > uint8Array.length) break;
    let isChunk = false;
    if (type === "tEXt" || type === "iTXt" || type === "zTXt") {
      let key = "";
      let i = 0;
      while (offset + 8 + i < uint8Array.length && uint8Array[offset + 8 + i] !== 0) {
        key += String.fromCharCode(uint8Array[offset + 8 + i]);
        i++;
      }
      key = key.toLowerCase();
      
      if (key === "chara" || key === "ccv3") {
        isChunk = true;
      }
    }
    if (isChunk) {
    } else {
      chunks.push(uint8Array.slice(offset, offset + chunkTotalSize));
    }
    offset += chunkTotalSize;
  }
  let iendIndex = -1;
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (chunk.length >= 8) {
      const type = String.fromCharCode(chunk[4], chunk[5], chunk[6], chunk[7]);
      if (type === "IEND") {
        iendIndex = i;
        break;
      }
    }
  }
  if (iendIndex !== -1) {
    for (const newChunk of newChunks) {
      chunks.splice(iendIndex, 0, newChunk);
      iendIndex++;
    }
  } else {
    chunks.push(...newChunks);
  }
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let position = 0;
  for (const chunk of chunks) {
    result.set(chunk, position);
    position += chunk.length;
  }
  return result;
}
function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = crc ^ data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// 폰트 패밀리
function fontFamily(event) {
  extension_settings[extensionName].fontFamily = event.target.value;
  saveSettings();
  refreshPreview();
}

// 폰트 로드
async function loadFonts() {
  const response = await fetch(`${extensionFolderPath}/font-family.json`);
  const fonts = await response.json();
  fonts.sort((a, b) => a.label.localeCompare(b.label));
  const select = $("#tti_font_family").empty();

  const fontPromises = fonts.map(font => document.fonts.load(`1em ${font.value}`));
  await Promise.all(fontPromises);
  
  fonts.forEach(font => {
    select.append(`<option value="${font.value}">${font.label}</option>`);
  });

  select.val(extension_settings[extensionName].fontFamily);
  refreshPreview();
}

// 로컬 폰트 로드
let currentCustomFont = null;
let oriFontFamily = null;
function addLocalFont() {
  if (isHtmlModeEnabled()) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.ttf,.otf,.woff,.woff2';
  
  input.onchange = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const checkFontFormat = ['.ttf', '.otf', '.woff', '.woff2'];
    const fontFormat = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!checkFontFormat.includes(fontFormat)) {
      alert('.ttf, .otf, .woff, .woff2 형식의 파일만 등록할 수 있습니다.');
      return;
    }
    
    const fontReader = new FileReader();
    fontReader.onload = function(e) {
      const fontData = e.target.result;
      const fontName = 'CustomFont_' + Date.now();
      
      const fontFace = new FontFace(fontName, fontData);
      
      fontFace.load().then(function(loadedFont) {
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
      }).catch(function(error) {
        console.error('폰트 로드 실패:', error);
        alert('폰트 파일을 등록할 수 없습니다.');
      });
    };
    
    fontReader.onerror = function() {
      alert('파일을 읽을 수 없습니다.');
    };
    
    fontReader.readAsArrayBuffer(file);
  };
  
  input.click();
}
function deleteLocalFont() {
  if (!currentCustomFont) return;
  
  if (document.fonts && currentCustomFont) {
    const fonts = Array.from(document.fonts);
    const customFontFamily = fonts.find(font => font.family === currentCustomFont);
    if (customFontFamily) {
      document.fonts.delete(customFontFamily);
    }
  }

  extension_settings[extensionName].fontFamily = oriFontFamily || extension_settings[extensionName].fontFamily || 'Pretendard-Regular';

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
}

// 배경이미지 로드
async function loadBackgroundURLMap() {
  try {
    const response = await fetch(`${extensionFolderPath}/backgrounds-list-url.json`);
    if (!response.ok) return;
    const backgroundURLs = await response.json();

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
    console.warn("[text-to-image-converter] backgrounds-list-url.json load failed", error);
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
  const response = await fetch(`${extensionFolderPath}/backgrounds-list.json`);
  const backgrounds = await response.json();
  const gallery = $("#background_image_gallery").empty();
  const selectedBackground = getSelectedBackgroundForCurrentMode();
  const galleryHtml = backgrounds.map((bg) => {
    const bgPath = `${extensionFolderPath}/default-backgrounds/${bg}`;
    const isSelected = selectedBackground === bgPath;
    return `
      <div class="bg-image-item ${isSelected ? "selected" : ""}" data-path="${bgPath}">
        <img src="${bgPath}" alt="${bg}" loading="lazy" decoding="async" />
      </div>
    `;
  }).join("");
  gallery.html(galleryHtml);
  $(".bg-image-item").on("click", selectCanvasBG);
}
function storeBackground(name, imageData, storageKey = getCustomBackgroundStorageKey()) {
  const customBackgrounds = JSON.parse(localStorage.getItem(storageKey) || "{}");
  customBackgrounds[name] = imageData;
  localStorage.setItem(storageKey, JSON.stringify(customBackgrounds));
}
function deleteBackground(name, storageKey = getCustomBackgroundStorageKey()) {
  const customBackgrounds = JSON.parse(localStorage.getItem(storageKey) || "{}");
  delete customBackgrounds[name];
  localStorage.setItem(storageKey, JSON.stringify(customBackgrounds));
}

// 커스텀 배경이미지 로드
function loadCustomBG(storageKey = getCustomBackgroundStorageKey()) {
  const customBackgrounds = JSON.parse(localStorage.getItem(storageKey) || "{}");
  const gallery = $("#custom_background_gallery").empty();
  Object.entries(customBackgrounds).forEach(([name, imageData]) => addBGtoGallery(name, imageData, storageKey));
}
function customBG() {
  $("#bg_image_upload").on("change", uploadImage);
  $("#bg_url_btn").on("click", uploadImageFromURL);
  loadCustomBG();
}
function uploadImageFromURL() {
  if (!isHtmlModeEnabled()) return;

  const url = $("#bg_image_url").val().trim();
  if (!url) return;

  const fileName = url.split('/').pop().split('?')[0] || 'url-image-' + Date.now();
  const storageKey = getCustomBackgroundStorageKey();

  storeBackground(fileName, url, storageKey);
  addBGtoGallery(fileName, url, storageKey);
  $("#bg_image_url").val("");
}
function addBGtoGallery(name, imageData, storageKey = getCustomBackgroundStorageKey()) {
  const isSelected = getSelectedBackgroundForCurrentMode() === imageData;
  const bgElement = $(`
    <div class="bg-image-item ${
      isSelected ? "selected" : ""
    }" data-path="${imageData}" data-name="${name}" data-storage-key="${storageKey}">
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
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  img.onload = () => {
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
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    storeBackground(file.name, imageData, storageKey);
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
  deleteBackground(bgItem.data("name"), bgItem.data("storage-key"));
  bgItem.remove();
  if (bgItem.hasClass("selected")) {
    setSelectedBackgroundForCurrentMode(null);
    saveSettings();
    refreshPreview();
  }
}

// 배경 & 이미지 편집
function useBackgroundColor(event) {
  extension_settings[extensionName].useBackgroundColor = event.target.checked;
  saveSettings();
  refreshPreview();
}
function backgroundColor(event) {
  extension_settings[extensionName].backgroundColor = event.target.value;
  saveSettings();
  refreshPreview();
}
function useSecondBackgroundColor(event) {
  extension_settings[extensionName].useSecondBackgroundColor = event.target.checked;
  saveSettings();
  refreshPreview();
}
function secondBackgroundColor(event) {
  extension_settings[extensionName].secondBackgroundColor = event.target.value;
  saveSettings();
  refreshPreview();
}
function addBlur(event) {
  extension_settings[extensionName].bgBlur = parseFloat(event.target.value);
  saveSettings();
  refreshPreview();
}
function brightness(event) {
  extension_settings[extensionName].bgBrightness = parseFloat(event.target.value);
  saveSettings();
  refreshPreview();
}
function hue(event) {
  extension_settings[extensionName].bgHue = parseFloat(event.target.value);
  saveSettings();
  refreshPreview();
}
function grayScale(event) {
  extension_settings[extensionName].bgGrayscale = parseFloat(event.target.value);
  saveSettings();
  refreshPreview();
}
function addNoise(event) {
  extension_settings[extensionName].bgNoise = parseInt(event.target.value);
  saveSettings();
  refreshPreview();
}
function addOverlay(event) {
  extension_settings[extensionName].overlayOpacity = parseFloat(event.target.value);
  saveSettings();
  refreshPreview();
}
function overlayColor(event) {
  extension_settings[extensionName].overlayColor = event.target.value;
  saveSettings();
  refreshPreview();
}
function selectCanvasBG(event) {
  if ($(event.target).hasClass("delete-bg-btn")) return;
  const path = $(this).data("path");
  $(".bg-image-item").removeClass("selected");
  $(this).addClass("selected");
  setSelectedBackgroundForCurrentMode(path);
  saveSettings();
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
function aspectRatio(event) {
  extension_settings[extensionName].imageRatio = event.target.value;
  saveSettings();
  refreshPreview();
}
function bgFillMode(event) {
  extension_settings[extensionName].imageFillMode = event.target.value;
  saveSettings();
  refreshPreview();
}

// 단어 치환
function letterCase(event) {
  extension_settings[extensionName].letterCase = event.target.checked;
  saveSettings();
}
function unitControl(event) {
  extension_settings[extensionName].unitControl = event.target.checked;
  saveSettings();
}
function setupWordReplacer() {
  let originalSnapshot = null;
  $("#apply_replacement").on("click", () => {
    originalSnapshot = {
      mainText: $("#text_to_image").val(),
      switcherTexts: $("#tti_html_switcher_list .tti-html-switcher-text").map(function () {
        return $(this).val();
      }).get(),
    };
    replaceWords();
  });
  $("#restore_text").on("click", () => {
    if (!originalSnapshot) return;

    $("#text_to_image").val(originalSnapshot.mainText ?? "");

    const $switcherList = $("#tti_html_switcher_list");
    if ($switcherList.length) {
      $switcherList.empty();
      (originalSnapshot.switcherTexts || []).forEach((value) => {
        if (typeof appendHtmlSwitcherInput === "function") {
          appendHtmlSwitcherInput(value);
        }
      });
      if (typeof syncHtmlSwitcherInputUIState === "function") {
        syncHtmlSwitcherInputUIState();
      }
    }

    refreshPreview();
  });
}
function replaceWords() {
  letterCase = extension_settings[extensionName].letterCase;
  unitControl = extension_settings[extensionName].unitControl;

  const wordGroup = [
    {
      original: $("#original_word_1").val().trim(),
      replacement: $("#replacement_word_1").val(),
    },
    {
      original: $("#original_word_2").val().trim(),
      replacement: $("#replacement_word_2").val(),
    },
    {
      original: $("#original_word_3").val().trim(),
      replacement: $("#replacement_word_3").val(),
    },
    {
      original: $("#original_word_4").val().trim(),
      replacement: $("#replacement_word_4").val(),
    },
  ].filter(group => group.original);

  if (wordGroup.length === 0) {
    return;
  }

  const applyWordReplacement = (inputText) => {
    let text = String(inputText ?? "");
    const originalTemp = wordGroup.map((_, index) => `__REPLACE_${Date.now()}_${index}__`);

    for (let i = 0; i < wordGroup.length; i++) {
      const { original } = wordGroup[i];
      const temp = originalTemp[i];
      const oriMulWord = original.split('||').map(word => word.trim()).filter(word => word);

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

  $("#text_to_image").val(applyWordReplacement($("#text_to_image").val()));
  $("#tti_html_switcher_list .tti-html-switcher-text").each(function () {
    $(this).val(applyWordReplacement($(this).val()));
  });
  refreshPreview();
}
function replaceString(text, original, replacement, letterCase, unitControl) {
  const specialChar = /[\s\.,;:!?\(\)\[\]{}"'<>\/\\\-_=\+\*&\^%\$#@~`|]/;
  let result = "";
  
  for (let i = 0; i < text.length; i++) {
    if (
      i <= text.length - original.length &&
      (letterCase 
        ? text.slice(i, i + original.length) === original
        : text.slice(i, i + original.length).toLowerCase() === original.toLowerCase())
    ) {
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
    if (
      i <= text.length - originalWord.length &&
      text.slice(i, i + originalWord.length) === originalWord
    ) {
      const endPos = i + originalWord.length;

      if (unitControl) {
        const isStartBoundary = i === 0 || specialChar.test(text[i - 1]);
        const nextChar = text[endPos] || "";
        const isEndBoundary =
          endPos === text.length ||
          specialChar.test(nextChar) ||
          !/[가-힣0-9]/.test(nextChar);

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
  saveSettings();
  refreshPreview();
}
function lineBreak(event) {
  extension_settings[extensionName].lineBreak = event.target.value;
  saveSettings();
  refreshPreview();
}
function fontSizeImage(event) {
  const value = parseInt(event.target.value, 10) || defaultSettings.fontSizeImage;
  extension_settings[extensionName].fontSizeImage = value;
  if (!isHtmlModeEnabled()) {
    extension_settings[extensionName].fontSize = value;
  }
  saveSettings();
  refreshPreview();
}
function fontSizeHtml(event) {
  const value = parseInt(event.target.value, 10) || defaultSettings.fontSizeHtml;
  extension_settings[extensionName].fontSizeHtml = value;
  if (isHtmlModeEnabled()) {
    extension_settings[extensionName].fontSize = value;
  }
  saveSettings();
  refreshPreview();
}
function htmlFontFace(event) {
  extension_settings[extensionName].htmlFontFace = normalizeHtmlFontFace(event.target.value);
  saveSettings();
  refreshPreview();
}
function fontSpacing(event) {
  extension_settings[extensionName].fontSpacing = event.target.value;
  saveSettings();
  refreshPreview();
}
function fontLineHeight(event) {
  extension_settings[extensionName].fontLineHeight = event.target.value;
  saveSettings();
  refreshPreview();
}
function fontAlign(event) {
  extension_settings[extensionName].fontAlign = event.target.value;
  saveSettings();
  refreshPreview();
}
function fontColor(event) {
  extension_settings[extensionName].fontColor = event.target.value;
  saveSettings();
  refreshPreview();
}
function useItalicColor(event) {
  extension_settings[extensionName].useItalicColor = event.target.checked;
  saveSettings();
  refreshPreview();
}
function italicFontColor(event) {
  extension_settings[extensionName].italicFontColor = event.target.value;
  saveSettings();
  refreshPreview();
}
function useBoldColor(event) {
  extension_settings[extensionName].useBoldColor = event.target.checked;
  saveSettings();
  refreshPreview();
}
function boldFontColor(event) {
  extension_settings[extensionName].boldFontColor = event.target.value;
  saveSettings();
  refreshPreview();
}
function useBoldItalicColor(event) {
  extension_settings[extensionName].useBoldItalicColor = event.target.checked;
  saveSettings();
  refreshPreview();
}
function boldItalicFontColor(event) {
  extension_settings[extensionName].boldItalicFontColor = event.target.value;
  saveSettings();
  refreshPreview();
}
function useStrikethroughColor(event) {
  extension_settings[extensionName].useStrikethroughColor = event.target.checked;
  saveSettings();
  refreshPreview();
}
function strikethroughFontColor(event) {
  extension_settings[extensionName].strikethroughFontColor = event.target.value;
  saveSettings();
  refreshPreview();
}
function useUnderlineColor(event) {
  extension_settings[extensionName].useUnderlineColor = event.target.checked;
  saveSettings();
  refreshPreview();
}
function underlineFontColor(event) {
  extension_settings[extensionName].underlineFontColor = event.target.value;
  saveSettings();
  refreshPreview();
}
function blockquoteFontColor(event) {
  extension_settings[extensionName].blockquoteFontColor = event.target.value;
  saveSettings();
  refreshPreview();
}
function blockquoteBgColor(event) {
  extension_settings[extensionName].blockquoteBgColor = event.target.value;
  saveSettings();
  refreshPreview();
}
function blockquoteBorderColor(event) {
  extension_settings[extensionName].blockquoteBorderColor = event.target.value;
  saveSettings();
  refreshPreview();
}
// 바닥글
function footerText(event) {
  extension_settings[extensionName].footerText = event.target.value;
  saveSettings();
  refreshPreview();
}
function footerColor(event) {
  extension_settings[extensionName].footerColor = event.target.value;
  saveSettings();
  refreshPreview();
}
function footerBgColor(event) {
  extension_settings[extensionName].footerBgColor = event.target.value;
  saveSettings();
  refreshPreview();
}
function footerLayoutMode(event) {
  extension_settings[extensionName].footerLayoutMode = event.target.value === "full" ? "full" : "scroll";
  updateFooterLayoutUIState();
  saveSettings();
  refreshPreview();
}
function footerWidth(event) {
  extension_settings[extensionName].footerWidth = parsePositiveInt(event.target.value, defaultSettings.footerWidth);
  saveSettings();
  refreshPreview();
}
function footerHeight(event) {
  extension_settings[extensionName].footerHeight = parsePositiveInt(event.target.value, defaultSettings.footerHeight);
  saveSettings();
  refreshPreview();
}

// 미리보기
function autoPreview(event) {
  extension_settings[extensionName].autoPreview = event.target.checked;
  saveSettings();
  if (event.target.checked) {
    refreshPreview();
  }
  else {
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
  return wrappingTexts(text, lineBreak === "byWord" ? "word" : "char");
}
function updatePreviewDownloadAllButton(itemCount) {
  const $previewTitle = $("#image_preview_box h4");
  const $dlAllBtn = $previewTitle.find(".dl_all");

  if (itemCount >= 2 && !isHtmlModeEnabled()) {
    if ($dlAllBtn.length === 0) {
      const $newDlAllBtn = $(
        '<div class="dl_all"><i class="fa-solid fa-circle-down"></i> 전체 다운로드</div>'
      );
      $previewTitle.append($newDlAllBtn);
      $newDlAllBtn.on("click", () => {
        autoDownload("#image_preview_container .download-btn", 500);
      });
    }
    return;
  }

  $dlAllBtn.remove();
}
function renderPreviewContent() {
  const chunks = getPreviewChunks();
  const $container = $("#image_preview_container").empty();

  chunks.forEach((chunk, i) => {
    $container.append(isHtmlModeEnabled() ? generateHTMLPreview(chunk, i) : generateTextImage(chunk, i));
  });

  updatePreviewDownloadAllButton(chunks.length);
}
function refreshPreview() {
  $(".refresh-preview").removeClass("shown");

  if (!extension_settings[extensionName].autoPreview) {
    $(".refresh-preview").addClass("shown");
    $("#image_preview_container").empty();
    $("#image_preview_box h4 .dl_all").remove();
    return;
  }

  renderPreviewContent();
}
function manualRefresh() {
  if (!extension_settings[extensionName].autoPreview) {
    renderPreviewContent();
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

// 하이라이터 태그
function highlighterTags() {
  const highlightContainer = $("#custom-highlighter .highlighter-lists");
  highlightContainer.empty();
  const highlightTags = extension_settings[extensionName].setHighlighterTags || [];
  highlightTags.forEach((tag, index) => {
    const highlightTagItem = $(`
      <div class="tag-item" data-index="${index}">
        <div class="tag-item-left">
          <input type="text" class="tag-name" placeholder="태그이름" value="${tag.name}" />
          <div>            
            <select class="tag-font-family" data-html-hide="tag_font_family">
              <option value="useGlobal" ${(!tag.fontFamily || tag.fontFamily === "useGlobal") ? "selected" : ""}>전역 폰트 사용</option>
            </select>
            <input type="number" class="tag-font-size" value="${tag.fontSize}" min="12" max="50" />
            <select class="tag-stroke-width">
              <option value="inherit" ${(!tag.strokeWidth || tag.strokeWidth === "inherit") ? "selected" : ""}>전역</option>
              <option value="0" ${tag.strokeWidth === "0" ? "selected" : ""}>기본</option>
              <option value="0.8" ${tag.strokeWidth === "0.8" ? "selected" : ""}>세미 볼드</option>
              <option value="1.5" ${tag.strokeWidth === "1.5" ? "selected" : ""}>볼드</option>
            </select>
          </div>
          <div>
            <div class="font-color-container">
              <input type="checkbox" class="use-tag-font-color" ${tag.useTagFontColor ? 'checked' : ""} />
              <input type="color" class="tag-font-color" value="${tag.fontColor}" ${!tag.useTagFontColor ? 'disabled' : ""} />
            </div>
            <div class="bg-color-container">
              <input type="checkbox" class="use-tag-bg-color" ${tag.useTagBgColor ? 'checked' : ""} />
              <input type="color" class="tag-bg-color" value="${tag.bgColor}" ${!tag.useTagBgColor ? 'disabled' : ""} />       
            </div>
          </div>
          </div>
        <button class="delete-tag-btn buttons clear"><i class="fa-solid fa-eraser"></i></button>
      </div>
    `);
    
    highlighterFonts(highlightTagItem.find('.tag-font-family'), tag.fontFamily);
    
    highlightContainer.append(highlightTagItem);
  });
  const addBtn = $('<button class="add-tag-btn buttons">추가</button>');
  highlightContainer.append(addBtn);
  applyHtmlModeUIState();
}
async function highlighterFonts(fontOption, selectedFont) {
  const fontFamilyName = await fetch(`${extensionFolderPath}/font-family.json`);
  const fonts = await fontFamilyName.json();
  fonts.sort((a, b) => a.label.localeCompare(b.label));
  
  fontOption.empty();
  fontOption.append(`<option value="useGlobal">전역 폰트 사용</option>`);  
  fonts.forEach(font => {
    fontOption.append(`<option value="${font.value}">${font.label}</option>`);
  });
  if (selectedFont) {
    fontOption.val(selectedFont);
  }
}
function addHighlightTag() {
  if (!extension_settings[extensionName].setHighlighterTags) {
    extension_settings[extensionName].setHighlighterTags = [];
  }
  extension_settings[extensionName].setHighlighterTags.push({
    name: "",
    fontFamily: "useGlobal",
    fontColor: "#000000",
    bgColor: "#ffffff",
    fontSize: isHtmlModeEnabled() ? 14 : 24,
    strokeWidth: "inherit",
    useTagFontColor: false,
    useTagBgColor: false,
  });
  highlighterTags();
  saveSettings();
}
function deleteHighlightTag(index) {
  extension_settings[extensionName].setHighlighterTags.splice(index, 1);
  highlighterTags();
  saveSettings();
  refreshPreview();
}
function updateHighlightTag(index, field, value) {
  extension_settings[extensionName].setHighlighterTags[index][field] = value;
  saveSettings();
  refreshPreview();
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
      headingSizeBonus = isHtmlModeEnabled() ? baseHeadingBonus : (baseHeadingBonus + 1);
      sourceText = headingMatch[2];
    }
  }

  const setHighlighterTags = extension_settings[extensionName].setHighlighterTags || [];
  const tagMap = {};
  setHighlighterTags.forEach(tag => {
    if (tag.name) tagMap[tag.name.toLowerCase()] = tag;
  });

  while (i < sourceText.length) {
    if (sourceText[i] === '<') {
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
          
          innerContents.forEach(innerContent => {
            if (innerContent.fontFamily || innerContent.fontSize) {
              spans.push(innerContent);
            } else {
              spans.push({
                text: innerContent.text,
                bold: innerContent.bold,
                italic: innerContent.italic,
                strikethrough: innerContent.strikethrough,
                underline: innerContent.underline,
                fontColor: tagSet.useTagFontColor ? tagSet.fontColor : (innerContent.fontColor || null),
                bgColor: tagSet.useTagBgColor ? tagSet.bgColor : (innerContent.bgColor || null),
                fontFamily: tagSet.fontFamily || null,
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
  const { width, height } = getCanvasSize();
  const maxWidth = width - 80;
  const fontSize = getActiveFontSize(settings);
  const lineHeight = fontSize * parseFloat(settings.fontLineHeight);

  const fullSize = settings.imageRatio === "full";
  const maxLines = fullSize ? Infinity : Math.floor((height - 80 - lineHeight) / lineHeight);

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
          currentPage.push([{ text: "", bold: false, italic: false, strikethrough: false, underline: false, fontColor: null, bgColor: null }]);
        } else {
          currentPage.push({
            spans: [{ text: "", bold: false, italic: false, strikethrough: false, underline: false }],
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
      const units = mode === "word"
        ? (span.text.match(/\S+\s*|\s+/g) || [])
        : Array.from(span.text);

      units.forEach((unit) => {
        if (mode === "char" && (unit === " " || unit === "\t") && currentLine.length === 0) return;

        const fontWeight = span.bold ? "bold" : settings.fontWeight;
        const fontStyle = span.italic ? "italic" : "normal";
        const fontFamily = (span.fontFamily && span.fontFamily !== "useGlobal") 
          ? span.fontFamily 
          : settings.fontFamily;
        const setFontSize = span.fontSize || fontSize;
        ctx.font = `${fontStyle} ${fontWeight} ${setFontSize}px ${fontFamily}`;
        ctx.letterSpacing = `${settings.fontSpacing}em`;

        let currentLineWidth = 0;
        currentLine.forEach(item => {
          const itemFontWeight = item.bold ? "bold" : settings.fontWeight;
          const itemFontStyle = item.italic ? "italic" : "normal";
          const itemFontFamily = item.fontFamily || settings.fontFamily;
          const itemFontSize = item.fontSize || fontSize;
          ctx.font = `${itemFontStyle} ${itemFontWeight} ${itemFontSize}px ${itemFontFamily}`;
          ctx.letterSpacing = `${settings.fontSpacing}em`;
          currentLineWidth += ctx.measureText(item.text).width;
        });
        
        ctx.font = `${fontStyle} ${fontWeight} ${setFontSize}px ${fontFamily}`;
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

          currentLine = [{
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
          }];
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
  const calcHeight = isFullSize
    ? Math.max(700, chunk.length * lineHeight + 160)
    : height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = calcHeight;
  const ctx = canvas.getContext("2d");

  const drawText = () => {
    const strokeWidth = parseFloat(settings.strokeWidth) || 0;

    const totalTextHeight = chunk.length * lineHeight;
    const footerHeight = 30;
    let y = Math.max((calcHeight - totalTextHeight - footerHeight) / 2 + lineHeight, 40 + lineHeight / 2);
    const setAlign = settings.fontAlign || "left";

    const lineBreak = settings.lineBreak || "byWord";
    const maxLineWidth = width - 80;

    function setFont(span) {
      const fontWeight = span.bold ? "bold" : settings.fontWeight;
      const fontStyle = span.italic ? "italic" : "normal";
      const fontFamily = (span.fontFamily && span.fontFamily !== "useGlobal") 
        ? span.fontFamily 
        : settings.fontFamily;
      const setFontSize = span.fontSize || fontSize;
      ctx.font = `${fontStyle} ${fontWeight} ${setFontSize}px ${fontFamily}`;
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
        if (span.strikethrough && settings.useStrikethroughColor) {
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
      if (setAlign === "right") return width - totalTextWidth - 40;
      return 40;
    }
    function isHrRenderLine(lineData) {
      if (!lineData) return false;
      if (Array.isArray(lineData)) {
        return lineData.length === 1 && !!lineData[0]?.isHr;
      }
      return Array.isArray(lineData.spans) && lineData.spans.length === 1 && !!lineData.spans[0]?.isHr;
    }
    function renderHrLine(yPos) {
      const startX = 40;
      const endX = width - 40;
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
        line.forEach((span) => {
          renderSpan(span, x, textY, "background");
          x += measuredWidths[line.indexOf(span)];
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
        tempCanvas.width = width;
        tempCanvas.height = img.height * scale;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
        
        ctx.fillStyle = ctx.createPattern(tempCanvas, "repeat");
        ctx.fillRect(0, 0, width, calcHeight);
      }
    } else if (fillMode === "mix-top" || fillMode === "mix-bottom") {
      drawBackground();
      
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
      const gradient = tempCtx.createLinearGradient(
        0, 
        fillMode === "mix-top" ? offsetY + drawHeight - gradientHeight : offsetY + gradientHeight,
        0, 
        fillMode === "mix-top" ? offsetY + drawHeight : offsetY
      );
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      tempCtx.globalCompositeOperation = 'destination-in';
      tempCtx.fillStyle = gradient;
      tempCtx.fillRect(0, 0, width, calcHeight);
      
      ctx.drawImage(tempCanvas, 0, 0);
    } else {
      if (useBgColor) {
        drawBackground();
      } else {
        const imgRatio = img.width / img.height;
        const canvasRatio = width / calcHeight;
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

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
    if (settings.bgBlur > 0) filterEffects.push(`blur(${settings.bgBlur}px)`);
    if (settings.bgBrightness !== undefined)
      filterEffects.push(`brightness(${settings.bgBrightness}%)`);
    if (settings.bgHue !== undefined) filterEffects.push(`hue-rotate(${settings.bgHue}deg)`);

    if (filterEffects.length > 0) {
      ctx.filter = filterEffects.join(" ");
      ctx.drawImage(canvas, 0, 0, width, calcHeight);
      ctx.filter = "none";
    }

    if (settings.bgGrayscale > 0) {
      const imageData = ctx.getImageData(0, 0, width, calcHeight);
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
      const imageData = ctx.getImageData(0, 0, width, calcHeight);
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
      ctx.fillRect(20, 20, width - 40, calcHeight - 40);
    }
  };

  const drawFooter = () => {
    const footerText = settings.footerText;
    if (footerText) {
      const footerColor = settings.footerColor || "#000000";
      ctx.font = "14px Pretendard-Regular";
      ctx.fillStyle = footerColor;
      ctx.textAlign = "right";
      const footerY = calcHeight - 35;
      ctx.fillText(footerText, width - 35, footerY);
    }
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
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeCSSURL(url = "") {
  return String(url).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function toRGBA(hex, alpha = 1) {
  const fallback = `rgba(255,255,255,${alpha})`;
  if (!hex || typeof hex !== "string") return fallback;

  const cleanHex = hex.replace("#", "").trim();
  if (![3, 6].includes(cleanHex.length)) return fallback;

  const fullHex = cleanHex.length === 3
    ? cleanHex.split("").map((ch) => ch + ch).join("")
    : cleanHex;

  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);

  if ([r, g, b].some(Number.isNaN)) return fallback;
  return `rgba(${r},${g},${b},${alpha})`;
}
function normalizeHexColor(color = "#000000") {
  const normalized = String(color || "").trim().toLowerCase();
  if (!normalized) return null;
  let hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  if (hex.length === 3) {
    hex = hex.split("").map((ch) => ch + ch).join("");
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
  let textColor = span.isBlockquote
    ? (settings.blockquoteFontColor || defaultSettings.blockquoteFontColor)
    : (settings.fontColor || "#000000");
  if (span.fontColor) {
    textColor = span.fontColor;
  } else {
    if (span.strikethrough && settings.useStrikethroughColor) {
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

    const lineHtml = spans.map((span) => {
      const spanText = escapeHTML(span.text || "");
      const spanStyle = buildSpanStyle(span, settings);
      if (!spanStyle) return spanText;
      return `<span style="${spanStyle}">${spanText}</span>`;
    }).join("");
    return `<font face="${htmlFontFace}">${lineHtml}</font>`;
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
      const quoteHTML = quoteLines
        .map((quoteLine) => `<div style="margin:0 !important;">${renderLineHTML(quoteLine, true)}</div>`)
        .join("");
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
  const markdownHTML = renderMarkdownHTML(text, settings);
  const switcherTexts = getHtmlSwitcherTexts();
  const switcherRenderedHTML = switcherTexts.map((itemText) => renderMarkdownHTML(itemText, settings));
  const switcherUid = `tti-switch-${index}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1679616).toString(36)}`;
  const switcherBaseId = `${switcherUid}-base`;

  const backgroundColor = settings.backgroundColor || "#ffffff";
  const secondColor = settings.secondBackgroundColor || backgroundColor;
  const smoothGradient = buildSmoothGradientCSS(backgroundColor, secondColor);
  const useBgColor = !!settings.useBackgroundColor;
  const useSecondBgColor = !!settings.useSecondBackgroundColor;
  const escapedURL = bgURL ? escapeCSSURL(bgURL) : "";
  const colorBackground = useBgColor
    ? (useSecondBgColor
      ? smoothGradient
      : backgroundColor)
    : "transparent";
  const colorBackgroundImage = useBgColor
    ? (useSecondBgColor
      ? smoothGradient
      : `linear-gradient(${backgroundColor}, ${backgroundColor})`)
    : "none";
  const bgLayerImage = escapedURL ? (useBgColor ? `${colorBackgroundImage}, url('${escapedURL}')` : `url('${escapedURL}')`) : "none";

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
  const rawFooterText = String(settings.footerText || "").trim();
  const hasFooter = rawFooterText.length > 0;
  const isScrollFooterLayout = footerLayoutMode === "scroll";
  const contentMaxHeightValue = isScrollFooterLayout
    ? (hasFooter ? `calc(${footerHeightPx}px - 100px)` : `${footerHeightPx}px`)
    : "none";
  const containerInlineStyle = [
    "background:transparent !important",
    "box-sizing:border-box !important",
    "width:100% !important",
    `max-width:${footerWidthPx}px !important`,
    isScrollFooterLayout ? `max-height:${footerHeightPx}px !important` : "max-height:none !important",
    "margin:0 auto !important",
    "padding:32px !important",
    "border-radius:15px !important",
    "overflow:hidden !important",
    "isolation:isolate !important",
  ].join(";");
  const bgInlineStyle = [
    "border-radius:15px !important",
    `background:${useBgColor ? colorBackground : "transparent"} !important`,
    `background-image:${bgLayerImage} !important`,
    "background-size:cover !important",
    "background-position:center !important",
    "background-repeat:no-repeat !important",
    `filter:${bgFilter || "none"} !important`,
  ].join(";");
  const overlayInlineStyle = [
    "border-radius:15px !important",
    `background:${toRGBA(settings.overlayColor || "#ffffff", overlayOpacity)} !important`,
    `-webkit-backdrop-filter:blur(${blurStrength}px) !important`,
    `backdrop-filter:blur(${blurStrength}px) !important`,
    "pointer-events:none !important",
  ].join(";");
  const switcherDotsWrapStyle = [
    "display:flex !important",
    "justify-content:flex-end !important",
    "margin:6px 10px 0 0 !important",
    "gap:6px !important",
    "z-index:1 !important",
    "pointer-events:auto !important",
  ].join(";");
  const switcherDotStyle = [
    "display:block !important",
    "width:15px !important",
    "height:10px !important",
    "border-radius:999px !important",
    "background:rgba(255,255,255,0.55) !important",
    "border:1px solid rgba(0,0,0,0.18) !important",
    "cursor:pointer !important",
    "transition:transform .15s ease, background-color .15s ease !important",
  ].join(";");
  const contentInlineStyle = [
    `max-height:${contentMaxHeightValue} !important`,
    `overflow-y:${isScrollFooterLayout ? "auto" : "visible"} !important`,
    `color:${globalTextColor} !important`,
    `font-size:${htmlFontSize}px !important`,
    "font-weight:400 !important",
    `letter-spacing:${settings.fontSpacing || 0}em !important`,
    `line-height:${settings.fontLineHeight || 1.5} !important`,
    `text-align:${settings.fontAlign || "left"} !important`,
    "white-space:pre-wrap !important",
    `word-break:${lineBreakByChar ? "break-all" : "break-word"} !important`,
    "overflow-wrap:anywhere !important",
    `margin-bottom:${hasFooter ? 44 : 0}px !important`,
    `-webkit-text-stroke:${globalStrokeWidth}px ${globalTextColor} !important`,
  ].join(";");
  const footerInlineStyle = [
    "display:flex !important",
    "flex-wrap:wrap !important",
    "justify-content:flex-end !important",
    "gap:6px !important",
    "right:35px !important",
    "bottom:35px !important",
    "font-size:12px !important",
    "text-align:right !important",
  ].join(";");
  const footerItemStyle = [
    "display:inline-block !important",
    "padding:2px 8px !important",
    "border-radius:999px !important",
    `color:${settings.footerColor || "#000000"} !important`,
    `background:${toRGBA(settings.footerBgColor || "#ffffff", 0.2)} !important`,
    "line-height:1.4 !important",
  ].join(";");
  const footerTokens = rawFooterText
    ? rawFooterText.split(",").map((token) => token.trim()).filter(Boolean)
    : [];
  const htmlFontFace = getHtmlFontFace(settings);
  const footerItemsHTML = footerTokens.length
    ? footerTokens.map((token) => `<span style="${footerItemStyle}"><font face="${htmlFontFace}">${escapeHTML(token)}</font></span>`).join("")
    : (rawFooterText
      ? `<span style="${footerItemStyle}"><font face="${htmlFontFace}">${escapeHTML(rawFooterText)}</font></span>`
      : "");
  const footerHTML = hasFooter
    ? `
  <div class="tti-footer" style="${footerInlineStyle}">${footerItemsHTML}</div>`
    : "";
  const shouldRenderBg = escapedURL || useBgColor;
  const backgroundHTML = shouldRenderBg
    ? `
  <div class="tti-bg" style="${bgInlineStyle}"></div>`
    : "";
  const hasSwitcher = switcherRenderedHTML.length > 0;
  const switcherItems = switcherRenderedHTML.map((html, itemIndex) => ({
    id: `${switcherUid}-${itemIndex}`,
    panelClass: `tti-panel-${itemIndex}`,
    html,
    itemIndex,
  }));
  const switcherRadiosHTML = hasSwitcher
    ? `
  <input type="radio" class="tti-switch-input" name="${switcherUid}" id="${switcherBaseId}" checked>
${switcherItems.map((item) => `  <input type="radio" class="tti-switch-input" name="${switcherUid}" id="${item.id}">`).join("\n")}`
    : "";
  const switcherDotsHTML = hasSwitcher
    ? `<div class="tti-switcher-dots" style="${switcherDotsWrapStyle}"><label style="${switcherDotStyle}" title="기본 텍스트" for="${switcherBaseId}"></label>${switcherItems.map((item) => `<label style="${switcherDotStyle}" title="텍스트 ${item.itemIndex + 1}" for="${item.id}"></label>`).join("")}</div>`
    : "";
  const overlayHTML = `
  <div class="tti-overlay" style="${overlayInlineStyle}">${switcherDotsHTML}</div>`;
  const contentHTML = hasSwitcher
    ? `
  <div class="tti-panels" style="margin-top: 10px;">
    <div class="tti-content tti-panel tti-panel-base" style="${contentInlineStyle}">${markdownHTML}</div>
${switcherItems.map((item) => `    <div class="tti-content tti-panel ${item.panelClass}" style="${contentInlineStyle}">${item.html}</div>`).join("\n")}
  </div>`
    : `
  <div class="tti-content" style="${contentInlineStyle}">${markdownHTML}</div>`;
  const switcherRuleStyle = hasSwitcher
    ? [
      `.tti-switch-input{position:absolute !important;opacity:0 !important;pointer-events:none !important;}`,
      `.tti-panels{position:relative !important;z-index:3 !important;}`,
      `.tti-panel{display:none !important;}`,
      `#${switcherBaseId}:checked ~ .tti-panels .tti-panel-base{display:block !important;}`,
      `#${switcherBaseId}:checked ~ .tti-overlay .tti-switcher-dots label[for="${switcherBaseId}"]{background:rgba(255,255,255,0.95) !important;transform:scale(1.12) !important;}`,
      ...switcherItems.map((item) => `#${item.id}:checked ~ .tti-panels .${item.panelClass}{display:block !important;}`),
      ...switcherItems.map((item) => `#${item.id}:checked ~ .tti-overlay .tti-switcher-dots label[for="${item.id}"]{background:rgba(255,255,255,0.95) !important;transform:scale(1.12) !important;}`),
    ].join("")
    : "";
  const scopedStyle = `.tti{position:relative !important;}.tti-bg{position:absolute !important;inset:0 !important;z-index:0 !important;}.tti-overlay{position:absolute !important;inset:16px !important;z-index:2 !important;}.tti-content{position:relative !important;z-index:3 !important;}.tti-footer{position:absolute !important;z-index:4 !important;}${switcherRuleStyle}`;

  return `<div>
<style>${scopedStyle}</style>
<div class="tti" style="${containerInlineStyle}">
${backgroundHTML}${switcherRadiosHTML}${overlayHTML}
${contentHTML}${footerHTML}
</div>
</div>`;
}
function generateHTMLPreview(text, index) {
  const htmlCode = createHTMLSnippet(text, index);
  const previewFontFamily = getHtmlPreviewFontFamily();
  const previewOnlyStyle = `<style>.html-render-preview .tti-content,.html-render-preview .tti-content span[style],.html-render-preview .tti-footer,.html-render-preview .tti-footer *{font-family:${previewFontFamily} !important;}</style>`;

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
  if (typeof JSZip === 'undefined') {
    await loadScript(JSZipCDN);
  }
  if (typeof saveAs === 'undefined') {
    await loadScript(FileSaverCDN);
  }

  const zip = new JSZip();
  const now = new Date();
  const dateString = `[Log] ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}-${now.getHours()}-${now.getMinutes()}`;
  
  const zipper = `${dateString}`;
  const zipFormat = '.zip';
  const promises = [];

  for (let i = 0; i < DLbuttons.length; i++) {
    const $img = $(DLbuttons[i]).siblings("img");
    const imgSrc = $img.attr("src");
    const imageName = `${zipper} (${i+1}).png`;
  
    const base64ori = imgSrc.split(',')[1];
    const imageData = atob(base64ori);
    const imgArray = new Uint8Array(imageData.length);
    
    for (let j = 0; j < imageData.length; j++) {
      imgArray[j] = imageData.charCodeAt(j);
    }
    
    zip.file(imageName, imgArray);
  }
  Promise.all(promises).then(() => {
    zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, zipper + zipFormat);
    });
  });
}
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
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
function saveImage(dataUrl, filename) {
  const now = new Date();
  const dateString = `[Log] ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}-${now.getHours()}-${now.getMinutes()}`;
  const index = filename.replace(".png", "");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${dateString} (${index}).png`;
  link.click();
}
async function copyToClipboard(content) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.warn("[text-to-image-converter] clipboard write failed", error);
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

jQuery(async () => {
  await initSettings();
  presetUI();
  presetBackupSys();
  customBG();
  setupWordReplacer();
  setupHtmlSwitcherInputs();
  bindingFunctions();
  setupRangeValueTooltips();
  restoreButtons();
  tabButtons();
  botCardButtons();
  highlighterOption();
});

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
  $("#tti_blockquote_font_color").on("change", blockquoteFontColor);
  $("#tti_blockquote_bg_color").on("change", blockquoteBgColor);
  $("#tti_blockquote_border_color").on("change", blockquoteBorderColor);
  $("#tti_stroke_width").on("change", strokeWidth);
  $("#tti_line_break").on("change", lineBreak);
  $("#tti_ratio").on("change", aspectRatio);
  $("#tti_fill_mode").on("change", bgFillMode);
  $("#text_to_image").on("change", refreshPreview);
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
  $("#footer_text").on("change", footerText);
  $("#footer_color").on("change", footerColor);
  $("#footer_bg_color").on("change", footerBgColor);
  $("#upload-local-font").on("click", addLocalFont);
  $("#delete-local-font").on("click", deleteLocalFont);
  $("#preview_toggle").on("change", autoPreview);
  $("#html_toggle").on("change", htmlMode);
  $(".refresh-preview").on("click", manualRefresh);
  $("#letter_control").on("change", letterCase);
  $("#unit_control").on("change", unitControl);

  $("#how_to_use").on("click", () => {
    $(".how_to_use_box").slideToggle();
  });
  $("#create_preset").on("click", () => {
    $("#preset_name").val("");
  });
  $("#clear_replace").on("click", () => {
    $(".replacer_box").val("");
  });
}
function restoreButtons() {
  let deletedText = "";
  $("#clear_text_btn").on("click", () => {
    deletedText = $("#text_to_image").val();
    $("#text_to_image").val("");
    refreshPreview();
  });
  $("#restore_text_btn").on("click", () => {
    if (deletedText !== "") {
      $("#text_to_image").val(deletedText);
      refreshPreview();
      deletedText = "";
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

  $("#custom-font-color > h4 > span").on("click", function () {
    const CFC = $("#custom-font-color");
    const lists = CFC.find(".font-color-lists");
    const toggleButton = $(this);
    lists.slideUp();

    if (CFC.hasClass("hide")) {
      lists.stop().slideDown(200);
      CFC.removeClass("hide").addClass("opened");
      toggleButton.text("닫기");
    } else {
      lists.stop().slideUp(200);
      CFC.removeClass("opened").addClass("hide");
      toggleButton.text("열기");
    }
  });
}
function botCardButtons() {
  $(`.bot-data[data-type]`).on("click", function () {
    const dataType = $(this).data("type");
    const currentTab = $(".bot-data[data-type].active").data("type");
    if (currentTab) {
      cardDataTab[currentTab] = $("#text_to_image").val();
    }
    $(".bot-data[data-type]").removeClass("active");
    $(this).addClass("active");
    $("#text_to_image").val(cardDataTab[dataType] || "");
    refreshPreview();
  });
  $(".bot-data.botImporter").on("click", function () {
    if ($(this).hasClass("remover")) {
      oriCard = null;
      oriCardType = null;
      Object.keys(cardDataTab).forEach(key => delete cardDataTab[key]);
      $("#text_to_image").val("");
      $(".bot-data[data-type]").removeClass("active");
      $(this).removeClass("remover");  
      $(".bot-data:not(.botImporter)").prop("disabled", true);  
    } else {
      loadBotCard();
      refreshPreview();
    }
  });
  $(".bot-data.botSaver").on("click", function () {
    botCardSaver();
    refreshPreview();
  });
}
function highlighterOption() {
  $(document).on("click", ".add-tag-btn", addHighlightTag);
  $(document).on("click", ".delete-tag-btn", function() {
    const index = $(this).closest(".tag-item").data("index");
    deleteHighlightTag(index);
  });

  $(document).on("input", ".tag-name", function() {
    const index = $(this).closest(".tag-item").data("index");
    updateHighlightTag(index, "name", $(this).val());
  });

  $(document).on("change", ".tag-font-family", function() {
    const index = $(this).closest(".tag-item").data("index");
    updateHighlightTag(index, "fontFamily", $(this).val());
    refreshPreview();
  });
  $(document).on("change", ".tag-stroke-width", function() {
    const index = $(this).closest(".tag-item").data("index");
    updateHighlightTag(index, "strokeWidth", $(this).val());
  });
  $(document).on("change", ".use-tag-font-color", function() {
    const index = $(this).closest(".tag-item").data("index");
    const checked = $(this).prop("checked");
    updateHighlightTag(index, "useTagFontColor", checked);
    $(this).siblings(".tag-font-color").prop("disabled", !checked);
  });
  $(document).on("change", ".tag-font-color", function() {
    const index = $(this).closest(".tag-item").data("index");
    updateHighlightTag(index, "fontColor", $(this).val());
  });

  $(document).on("change", ".use-tag-bg-color", function() {
    const index = $(this).closest(".tag-item").data("index");
    const checked = $(this).prop("checked");
    updateHighlightTag(index, "useTagBgColor", checked);
    $(this).siblings(".tag-bg-color").prop("disabled", !checked);
  });
  $(document).on("change", ".tag-bg-color", function() {
    const index = $(this).closest(".tag-item").data("index");
    updateHighlightTag(index, "bgColor", $(this).val());
  });

  $(document).on("input", ".tag-font-size", function() {
    const index = $(this).closest(".tag-item").data("index");
    updateHighlightTag(index, "fontSize", parseInt($(this).val()));
  });
}
