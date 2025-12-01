const extension_settings = JSON.parse(localStorage.getItem("txt-to-img") || "{}");
const JSZipCDN = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
const FileSaverCDN = "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js";

const extensionName = "txt-to-img";
const extensionFolderPath = `https://xaxaxaxakk.github.io/${extensionName}`;
const defaultSettings = {
  fontFamily: "Pretendard-Regular",
  fontWeight: "normal",
  fontSize: "24px",
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
  strokeWidth: "0",
  lineBreak: "byWord",
  selectedBackgroundImage: `${extensionFolderPath}/default-backgrounds/bg40.png`,
  useBackgroundColor: false,
  backgroundColor: "#ffffff",
  useSecondBackgroundColor: false,
  secondBackgroundColor: "#ffffff",
  imageRatio: "square",
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
  footerColor: "#000000",
  autoPreview: true,
  letterCase: false,
  unitControl: false,
};

function saveSettings() {
  localStorage.setItem(extensionName, JSON.stringify(extension_settings[extensionName]));
}
async function initSettings() {
  const savedSettings = JSON.parse(localStorage.getItem(extensionName));

  extension_settings[extensionName] = {
    ...defaultSettings,
    ...(savedSettings || {}),
    ...extension_settings[extensionName],
  };

  const {
    fontFamily,
    fontSize,
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
    strokeWidth,
    lineBreak,
    imageRatio,
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
    footerColor,
    autoPreview,
    letterCase,
    unitControl,
  } = extension_settings[extensionName];

  $("#tti_font_family").val(fontFamily);
  $("#tti_font_size").val(fontSize);
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
  $("#tti_stroke_width").val(strokeWidth);
  $("#tti_line_break").val(lineBreak);
  $("#tti_ratio").val(imageRatio);
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
  $("#footer_color").val(footerColor);
  $("#preview_toggle").prop("checked", autoPreview);
  $("#letter_control").prop("checked", letterCase);
  $("#unit_control").prop("checked", unitControl);

  await loadFonts();
  await loadBG();

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
  settings.footerText = $("#footer_text").val();
  settings.footerColor = $("#footer_color").val();
  settings.autoPreview = $("#preview_toggle").prop("checked");
  settings.letterCase = $("#letter_control").is(":checked");
  settings.unitControl = $("#unit_control").is(":checked");
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
  presets[presetName] = currentSettings;
  extension_settings[extensionName].presets = presets;
  extension_settings[extensionName].currentPreset = presetName;
  updatePresetSelector(presetName);
  saveSettings();
}
function savePreset() {
  const presetName = $("#preset_selector").val();
  const currentSettings = getPresetSettings();
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
    $("#tti_font_size").val(defaultSettings.fontSize);
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
    $("#tti_stroke_width").val(defaultSettings.strokeWidth);
    $("#tti_line_break").val(defaultSettings.lineBreak);
    $("#tti_ratio").val(defaultSettings.imageRatio);
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
    $(".bg-image-item").removeClass("selected");
    $(`.bg-image-item[data-path="${defaultSettings.selectedBackgroundImage}"]`).addClass(
      "selected"
    );
    $("#footer_text").val("");
    $("#footer_color").val(defaultSettings.footerColor);
    $("#preview_toggle").prop("checked", defaultSettings.autoPreview);
    $("#letter_control").prop("checked", defaultSettings.letterCase);
    $("#unit_control").prop("checked", defaultSettings.unitControl);
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
    $("#tti_font_size").val(defaultSettings.fontSize);
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
    $("#tti_stroke_width").val(defaultSettings.strokeWidth);
    $("#tti_line_break").val(defaultSettings.lineBreak);
    $("#tti_ratio").val(defaultSettings.imageRatio);
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
    $(".bg-image-item").removeClass("selected");
    $(`.bg-image-item[data-path="${defaultSettings.selectedBackgroundImage}"]`).addClass(
      "selected"
    );
    $("#footer_text").val("");
    $("#footer_color").val(defaultSettings.footerColor);
    $("#preview_toggle").prop("checked", defaultSettings.autoPreview);
    $("#letter_control").prop("checked", defaultSettings.letterCase);
    $("#unit_control").prop("checked", defaultSettings.unitControl);

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

  const wordGroup = [
    {original: "originalWord1", replacement: "replacementWord1", id: "1"},
    {original: "originalWord2", replacement: "replacementWord2", id: "2"},
    {original: "originalWord3", replacement: "replacementWord3", id: "3"},
    {original: "originalWord4", replacement: "replacementWord4", id: "4"},
  ];
  wordGroup.forEach(({original, replacement, id}) => {
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
      case "fontSize":
        $("#tti_font_size").val(value);
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
      case "strokeWidth":
        $("#tti_stroke_width").val(value);
        break;
      case "lineBreak":
        $("#tti_line_break").val(value);
        break;
      case "imageRatio":
        $("#tti_ratio").val(value);
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
        $(".bg-image-item").removeClass("selected");
        $(`.bg-image-item[data-path="${value}"]`).addClass("selected");
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
      case "SecondBackgroundColor":
        $("#second_background_color").val(value);
        break;
      case "footerText":
        $("#footer_text").val(value);
        break;
      case "footerColor":
        $("#footer_color").val(value);
        break;
      case "autoPreview":
        $("#preview_toggle").prop("checked", value);
        break;
      case "letterCase":
        $("#letter_control").prop("checked", value);
        break;
      case "unitControl":
        $("#unit_control").prop("checked", value);
        break;
    }
  }
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
    try {
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
    } catch (error) {}
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

    try {
      const botData = file.name.endsWith(".json")
        ? await MDFromJSON(file)
        : await MDFromPNG(file);
      if (botData) botDataClass(botData, dataType);
    } catch (error) {
    }
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
        try {
          const binary = atob(text.trim());
          const uint8Array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            uint8Array[i] = binary.charCodeAt(i);
          }
          const decoded = new TextDecoder("utf-8").decode(uint8Array);
          return JSON.parse(decoded);
        } catch (error) {
        }
      }
    }
    if (chunkType === "iTXt") {
      try {
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
      } catch (error) {
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
  $(".bot-data.botSaver").prop("disabled", false);  
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
  try {
    const arrayBuffer = await oriCard.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const jsonStr = JSON.stringify(oriCardData);
    const utf8Bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
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
  } catch (error) {
  }
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
  const replacedWords = new Set();
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
  try {
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
  } catch (error) {}
}

// 로컬 폰트 로드
let currentCustomFont = null;
let oriFontFamily = null;

function addLocalFont() {
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
        
        refreshPreview();
      }).catch(function(error) {
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

  saveSettings();
  refreshPreview();
}

// 배경이미지 로드
async function loadBG() {
  try {
    const response = await fetch(`${extensionFolderPath}/backgrounds-list.json`);
    const backgrounds = await response.json();
    const gallery = $("#background_image_gallery").empty();
    backgrounds.forEach((bg) => {
      const bgPath = `${extensionFolderPath}/default-backgrounds/${bg}`;
      const isSelected = extension_settings[extensionName].selectedBackgroundImage === bgPath;
      gallery.append(`
        <div class="bg-image-item ${isSelected ? "selected" : ""}" data-path="${bgPath}">
          <img src="${bgPath}" alt="${bg}" />
        </div>
      `);
    });
    $(".bg-image-item").on("click", selectCanvasBG);
  } catch (error) {}
}
function storeBackground(name, imageData) {
  const customBackgrounds = JSON.parse(localStorage.getItem("textToImageCustomBgs") || "{}");
  customBackgrounds[name] = imageData;
  localStorage.setItem("textToImageCustomBgs", JSON.stringify(customBackgrounds));
}
function deleteBackground(name) {
  const customBackgrounds = JSON.parse(localStorage.getItem("textToImageCustomBgs") || "{}");
  delete customBackgrounds[name];
  localStorage.setItem("textToImageCustomBgs", JSON.stringify(customBackgrounds));
}

// 커스텀 배경이미지 로드
function loadCustomBG() {
  const customBackgrounds = JSON.parse(localStorage.getItem("textToImageCustomBgs") || "{}");
  const gallery = $("#custom_background_gallery").empty();
  Object.entries(customBackgrounds).forEach(([name, imageData]) => addBGtoGallery(name, imageData));
}
function customBG() {
  $("#bg_image_upload").on("change", uploadImage);
  loadCustomBG();
}
function addBGtoGallery(name, imageData) {
  const isSelected = extension_settings[extensionName].selectedBackgroundImage === imageData;
  const bgElement = $(`
    <div class="bg-image-item ${
      isSelected ? "selected" : ""
    }" data-path="${imageData}" data-name="${name}">
      <img src="${imageData}" alt="${name}" />
      <div class="delete-bg-btn">×</div>
    </div>
  `);
  $("#custom_background_gallery").append(bgElement);
  bgElement.on("click", selectCanvasBG);
  bgElement.find(".delete-bg-btn").on("click", removeCustomBg);
}
function uploadImage(event) {
  const file = event.target.files[0];
  if (!file) return;
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
    storeBackground(file.name, imageData);
    addBGtoGallery(file.name, imageData);
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
  deleteBackground(bgItem.data("name"));
  bgItem.remove();
  if (bgItem.hasClass("selected")) {
    extension_settings[extensionName].selectedBackgroundImage = null;
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
  extension_settings[extensionName].selectedBackgroundImage = path;
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
  let originalText = "";
  $("#apply_replacement").on("click", () => {
    originalText = $("#text_to_image").val();
    replaceWords();
  });
  $("#restore_text").on("click", () => {
    if (originalText !== "") {
      $("#text_to_image").val(originalText);
      refreshPreview();
    }
  });
}
function replaceWords() {
  let text = $("#text_to_image").val();
  letterCase = extension_settings[extensionName].letterCase;
  unitControl = extension_settings[extensionName].unitControl;

  const wordGroup = [
    {
      original: $("#original_word_1").val().trim(),
      replacement: $("#replacement_word_1").val().trim(),
    },
    {
      original: $("#original_word_2").val().trim(),
      replacement: $("#replacement_word_2").val().trim(),
    },
    {
      original: $("#original_word_3").val().trim(),
      replacement: $("#replacement_word_3").val().trim(),
    },
    {
      original: $("#original_word_4").val().trim(),
      replacement: $("#replacement_word_4").val().trim(),
    },
  ].filter(group => group.original);

  if (wordGroup.length === 0) {
    return;
  }

  const originalTemp = wordGroup.map((_, index) => `_temp_${index}_`);

  for (let i = 0; i < wordGroup.length; i++) {
    const { original, replacement } = wordGroup[i];
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
    const replacementText = replacement || "";

    const regex = new RegExp(`${temp}([은는이가를과와이랑랑으로로아야]*)`, "g");

    text = text.replace(regex, (_, particle) => {
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

  $("#text_to_image").val(text);
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
  const verbEndingPattern = /^[자고며다요네죠게서써도구나군요까봐서라지거든만큼]/;
  const particlePattern = /^(?:[은|는|이|가|아|야|의|을|를|로|으로|과|와|께|에게|에서|한테|하고|랑|이랑|도|이도|만|까지|마저|조차|부터|밖에|야말로|서|처럼|보다|였])/;

  const specialChar = /[\s\.,;:!?\(\)\[\]{}"'<>\/\\\-_=\+\*&\^%\$#@~`|]/;
  let result = "";

  for (let i = 0; i < text.length; i++) {
    if (
      i <= text.length - originalWord.length &&
      text.slice(i, i + originalWord.length) === originalWord
    ) {
      const isStartBoundary = i === 0 || specialChar.test(text[i - 1]);

      const endPos = i + originalWord.length;
      const nextChar = text[endPos] || "";

      if (unitControl) {
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
        const isVerbEnding = verbEndingPattern.test(nextChar);
        const isEndBoundary =
          endPos === text.length ||
          specialChar.test(nextChar) ||
          particlePattern.test(nextChar) ||
          !/[가-힣0-9]/.test(nextChar);

        const containSymbols = /[^\w가-힣]/.test(originalWord);
        const toReplace = containSymbols || (isStartBoundary && isEndBoundary && !isVerbEnding);

        if (toReplace) {
          let particle = "";
          let nextPart = text.slice(endPos);

          const particleMatch = nextPart.match(particlePattern);
          if (particleMatch && nextPart.startsWith(particleMatch[0])) {
            particle = particleMatch[0];
            const hasEndConsonant = hasConsonantLetter(replacementWord);

            if (particle === "가" && hasEndConsonant) particle = "이";
            else if (particle === "이" && !hasEndConsonant) particle = "가";
            else if (particle === "는" && hasEndConsonant) particle = "은";
            else if (particle === "은" && !hasEndConsonant) particle = "는";
            else if (particle === "를" && hasEndConsonant) particle = "을";
            else if (particle === "을" && !hasEndConsonant) particle = "를";
            else if (particle === "아" && !hasEndConsonant) particle = "야";
            else if (particle === "야" && hasEndConsonant) particle = "아";
            else if (particle === "와" && hasEndConsonant) particle = "과";
            else if (particle === "과" && !hasEndConsonant) particle = "와";
            else if (particle === "랑" && hasEndConsonant) particle = "이랑";
            else if (particle === "이랑" && !hasEndConsonant) particle = "랑";
            else if (particle === "로" && hasEndConsonant) particle = "으로";
            else if (particle === "으로" && !hasEndConsonant) particle = "로";
          }

          result += replacementWord + particle;
          i = endPos + particle.length - 1;
          continue;
        }
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
function fontSize(event) {
  extension_settings[extensionName].fontSize = event.target.value;
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
function refreshPreview() {
  $(".refresh-preview").removeClass("shown");

  if (!extension_settings[extensionName].autoPreview) {
    $(".refresh-preview").addClass("shown");
    $("#image_preview_container").empty();
    $("#image_preview_box h4 .dl_all").remove();
    return;
  }

  const text = $("#text_to_image").val() || "";
  const lineBreak = extension_settings[extensionName].lineBreak || "byWord";

  const chunks = wrappingTexts(text, lineBreak === "byWord" ? "word" : "char");

  const $container = $("#image_preview_container").empty();

  chunks.forEach((chunk, i) => {
    $container.append(generateTextImage(chunk, i));
  });

  const imageCount = chunks.length;
  const $previewTitle = $("#image_preview_box h4");
  const $dlAllBtn = $previewTitle.find(".dl_all");

  if (imageCount >= 2) {
    if ($dlAllBtn.length === 0) {
      const $newDlAllBtn = $(
        '<div class="dl_all"><i class="fa-solid fa-circle-down"></i> 전체 다운로드</div>'
      );
      $previewTitle.append($newDlAllBtn);
      $newDlAllBtn.on("click", () => {
        autoDownload("#image_preview_container .download-btn", 500);
      });
    }
  } else {
    $dlAllBtn.remove();
  }
}
function manualRefresh() {
  if (!extension_settings[extensionName].autoPreview) {
    const text = $("#text_to_image").val() || "";
    const lineBreak = extension_settings[extensionName].lineBreak || "byWord";

    const chunks = wrappingTexts(text, lineBreak === "byWord" ? "word" : "char");

    const $container = $("#image_preview_container").empty();

    chunks.forEach((chunk, i) => {
      $container.append(generateTextImage(chunk, i));
    });

    const imageCount = chunks.length;
    const $previewTitle = $("#image_preview_box h4");
    const $dlAllBtn = $previewTitle.find(".dl_all");

    if (imageCount >= 2) {
      if ($dlAllBtn.length === 0) {
        const $newDlAllBtn = $(
          '<div class="dl_all"><i class="fa-solid fa-circle-down"></i> 전체 다운로드</div>'
        );
        $previewTitle.append($newDlAllBtn);
        $newDlAllBtn.on("click", () => {
          autoDownload("#image_preview_container .download-btn", 500);
        });
      }
    } else {
      $dlAllBtn.remove();
    }
  }
}

// 마크다운
function enableMarkdown(text) {
  const spans = [];
  let currentText = "";
  let bold = false;
  let italic = false;
  let strikethrough = false;
  let underline = false;
  let fontColor = null;
  let bgColor = null;
  let i = 0;
  let colorHighlight = false;

  while (i < text.length) {
    if (text.slice(i, i + 3) === "***") {
      if (currentText) spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor, bgColor});
      bold = !bold;
      italic = !italic;
      currentText = "";
      i += 3;
    } else if (text.slice(i, i + 2) === "**") {
      if (currentText) spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor, bgColor});
      bold = !bold;
      currentText = "";
      i += 2;
    } else if (text.slice(i, i + 2) === "__") {
      if (currentText) spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor, bgColor});
      underline = !underline;
      currentText = "";
      i += 2;
    } else if (text.slice(i, i + 2) === "~~") {
      if (currentText) spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor, bgColor});
      strikethrough = !strikethrough;
      currentText = "";
      i += 2;
    } else if (text[i] === "*" && (i + 1 >= text.length || text[i + 1] !== "*")) {
      if (currentText) spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor, bgColor});
      italic = !italic;
      currentText = "";
      i++;
    } else if (text.slice(i, i + 2) === "=(" && i + 2 < text.length) {
      if (currentText) spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor, bgColor});
      currentText = "";
      colorHighlight = true;

      i += 2;
      let colorPick = "";
      while (i < text.length && text[i] !== ")") {
        colorPick += text[i];
        i++;
      }
      if (i < text.length) i++;

      const colorMatch = colorPick.match(/^(#[0-9a-fA-F]{6})?(?:\|(#[0-9a-fA-F]{6})?)?$/);
      if (colorMatch) {
        fontColor = colorMatch[1] || null;
        bgColor = colorMatch[2] || null;
      } else {
        currentText += "=(" + colorPick + ")";
        colorHighlight = false;
      }
    } else if (text[i] === "=" && colorHighlight) {
      if (currentText) spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor, bgColor});
      fontColor = null;
      bgColor = null;
      currentText = "";
      colorHighlight = false;
      i++;
    } else {
      currentText += text[i];
      i++;
    }
  }

  if (currentText) spans.push({text: currentText, bold, italic, strikethrough, underline, fontColor, bgColor});
  return spans;
}

// 텍스트 정리
function wrappingTexts(text, mode = "word") {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const { width, height } = getCanvasSize();
  const maxWidth = width - 80;
  const fontSize = parseInt(extension_settings[extensionName].fontSize);
  const lineHeight = fontSize * 1.5;

  const fullSize = extension_settings[extensionName].imageRatio === "full";
  const maxLines = fullSize ? Infinity : Math.floor((height - 80 - lineHeight) / lineHeight);

  const pages = [];
  let currentPage = [];
  let lineCount = 0;

  const lines = text.split(/\n/);

  lines.forEach((lineText) => {
    const isBlank = lineText.trim() === "";

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
    const spans = enableMarkdown(lineText);
    let currentLine = [];
    let currentLineText = "";

    spans.forEach((span) => {
      const units = mode === "word"
        ? (span.text.match(/\S+\s*|\s+/g) || [])
        : Array.from(span.text);

      units.forEach((unit) => {
        if (mode === "char" && (unit === " " || unit === "\t") && currentLine.length === 0) return;

        const fontWeight = span.bold ? "bold" : extension_settings[extensionName].fontWeight;
        const fontStyle = span.italic ? "italic" : "normal";
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${extension_settings[extensionName].fontFamily}`;

        const testText = currentLineText + unit;
        if (ctx.measureText(testText).width <= maxWidth) {
          currentLineText = testText;
          currentLine.push({
            text: unit,
            bold: span.bold,
            italic: span.italic,
            strikethrough: span.strikethrough,
            underline: span.underline,
            fontColor: span.fontColor,
            bgColor: span.bgColor,
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
          }];
          currentLineText = unit.trimStart();
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
  const fontSize = parseInt(extension_settings[extensionName].fontSize);
  const lineHeight = fontSize * 1.5;
  const settings = extension_settings[extensionName];

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

    const lineBreak = extension_settings[extensionName].lineBreak || "byWord";
    const maxLineWidth = width - 80;

    function setFont(span) {
      const fontWeight = span.bold ? "bold" : settings.fontWeight;
      const fontStyle = span.italic ? "italic" : "normal";
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${settings.fontFamily}`;
    }

    function renderSpan(span, x, y) {
      setFont(span);
      const metrics = ctx.measureText(span.text);
      const textWidth = metrics.width;
      const textHeight = fontSize;

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

      ctx.fillStyle = textColor;
      if (strokeWidth > 0) {
        ctx.strokeStyle = textColor;
        ctx.lineWidth = strokeWidth;
      }

      if (span.bgColor) {
        const paddingX = 2;
        const paddingY = 2;
        ctx.fillStyle = span.bgColor;
        ctx.fillRect(x - paddingX, y - textHeight + paddingY, textWidth + 2 * paddingX, textHeight + 2 * paddingY);
        ctx.fillStyle = textColor;
      }

      if (strokeWidth > 0) ctx.strokeText(span.text, x, y);
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

      return textWidth;
    }

    if (lineBreak === "byWord") {
      chunk.forEach((line) => {
        let totalTextWidth = 0;
        const measuredWidths = [];

        line.forEach((span) => {
          setFont(span);
          const width = ctx.measureText(span.text).width;
          measuredWidths.push(width);
          totalTextWidth += width;
        });

        let alignX = 40;
        if (setAlign === "center") {
          alignX = width / 2 - totalTextWidth / 2;
        } else if (setAlign === "right") {
          alignX = width - totalTextWidth - 40;
        }

        ctx.textAlign = "left";
        let x = alignX;

        line.forEach((span, i) => {
          x += renderSpan(span, x, y);
        });

        y += lineHeight;
      });
    } else {
      chunk.forEach((lineObj, index) => {
        const line = lineObj.spans;
        const isLastLine = index === chunk.length - 1;
        const isBlankLine = line.every((span) => span.text.trim() === "");
        const shouldJustify = setAlign === "left" && !isLastLine && lineObj.softBreak && !isBlankLine;

        let totalTextWidth = 0;
        const measuredWidths = [];

        line.forEach((span) => {
          setFont(span);
          const width = ctx.measureText(span.text).width;
          measuredWidths.push(width);
          totalTextWidth += width;
        });

        let alignX = 40;
        if (setAlign === "center") {
          alignX = width / 2 - totalTextWidth / 2;
        } else if (setAlign === "right") {
          alignX = width - totalTextWidth - 40;
        }

        const gapCount = line.length - 1;
        const spacing = gapCount > 0 && shouldJustify ? (maxLineWidth - totalTextWidth) / gapCount : 0;

        let x = alignX;

        line.forEach((span, i) => {
          x += renderSpan(span, x, y);
          if (i < line.length - 1) x += spacing;
        });

        y += lineHeight;
      });
    }
  };

  const textWallpaper = (img) => {
    if (isFullSize) {
      const pattern = ctx.createPattern(img, 'repeat');
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, calcHeight);
    } else {
      let drawWidth,
        drawHeight,
        offsetX = 0,
        offsetY = 0;
      const imgRatio = img.width / img.height;
      const canvasRatio = width / calcHeight;

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

  const bgImage = settings.selectedBackgroundImage;
  const useBgColor = settings.useBackgroundColor;
  const bgColor = settings.backgroundColor;
  const useSecondBgColor = settings.useSecondBackgroundColor;
  const secondBgColor = settings.secondBackgroundColor;
  if (useBgColor) {
    if (useSecondBgColor) {
      const gradient = ctx.createLinearGradient(0, 0, width, calcHeight);
      gradient.addColorStop(0, bgColor);
      gradient.addColorStop(1, secondBgColor);
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

// 일괄 다운 zip
function autoDownload(allDLbuttons, delay = 1500) {
  setTimeout(() => {
    const DLbuttons = $(allDLbuttons);
    if (DLbuttons.length > 1) {
      zipDL(DLbuttons);
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
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
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

jQuery(async () => {
  try {
    await initSettings();

    presetUI();
    presetBackupSys();
    customBG();
    setupWordReplacer();
    bindingFunctions();
    restoreButtons();
    tabButtons();
    botCardButtons();
  } catch (error) {
    console.error("에러", error);
  }
});
function bindingFunctions() {
  $("#tti_font_family").on("change", fontFamily);
  $("#tti_font_size").on("change", fontSize);
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
  $("#tti_stroke_width").on("change", strokeWidth);
  $("#tti_line_break").on("change", lineBreak);
  $("#tti_ratio").on("change", aspectRatio);
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
  $("#footer_text").on("change", footerText);
  $("#footer_color").on("change", footerColor);
  $("#upload-local-font").on("click", addLocalFont);
  $("#delete-local-font").on("click", deleteLocalFont);
  $("#preview_toggle").on("change", autoPreview);
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
  });
  $(".bot-data.botImporter").on("click", function () {
    if ($(this).hasClass("remover")) {
      oriCard = null;
      oriCardType = null;
      Object.keys(cardDataTab).forEach(key => delete cardDataTab[key]);
      $("#text_to_image").val("");
      $(".bot-data[data-type]").removeClass("active");
      $(this).removeClass("remover");  
      $(".bot-data.botSaver").prop("disabled", true);  
    } else {
      loadBotCard();
    }
  });
  $(".bot-data.botSaver").on("click", function () {
    botCardSaver();
  });
}