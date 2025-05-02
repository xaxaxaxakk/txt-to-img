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
  strokeWidth: "0",
  selectedBackgroundImage: `${extensionFolderPath}/default-backgrounds/bg40.png`,
  useBackgroundColor: false,
  backgroundColor: "#ffffff",
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
    strokeWidth,
    imageRatio,
    useBackgroundColor,
    backgroundColor,
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
  } = extension_settings[extensionName];

  $("#text_image_font_family").val(fontFamily);
  $("#text_image_font_size").val(fontSize);
  $("#text_image_font_align").val(fontAlign);
  $("#text_image_font_color").val(fontColor);
  $("#text_image_stroke_width").val(strokeWidth);
  $("#text_image_ratio").val(imageRatio);
  $("#use_background_color").prop("checked", useBackgroundColor);
  $("#background_color").val(backgroundColor);
  $("#bg_blur").val(bgBlur);
  $("#bg_brightness").val(bgBrightness);
  $("#bg_hue").val(bgHue);
  $("#bg_grayscale").val(bgGrayscale);
  $("#bg_noise").val(bgNoise);
  $("#overlay_opacity").val(overlayOpacity);
  $("#overlay_color").val(overlayColor);
  $("#footer_text").val(footerText);
  $("#footer_color").val(footerColor);

  await loadFonts();
  await loadBG();

  if (currentPreset && extension_settings[extensionName].presets[currentPreset]) {
    applyPreset(currentPreset);
  } else {
    refreshPreview();
  }
}


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
  settings.footerText = $("#footer_text").val();
  settings.footerColor = $("#footer_color").val();
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

    $("#text_image_font_family").val(defaultSettings.fontFamily);
    $("#text_image_font_size").val(defaultSettings.fontSize);
    $("#text_image_font_align").val(defaultSettings.fontAlign);
    $("#text_image_font_color").val(defaultSettings.fontColor);
    $("#text_image_stroke_width").val(defaultSettings.strokeWidth);
    $("#text_image_ratio").val(defaultSettings.imageRatio);
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
    $(".bg-image-item").removeClass("selected");
    $(`.bg-image-item[data-path="${defaultSettings.selectedBackgroundImage}"]`).addClass(
      "selected"
    );
    $("#footer_text").val("");
    $("#footer_color").val(defaultSettings.footerColor);
  }
  saveSettings();
  updatePresetSelector();
}
function selectPreset() {
  const presetName = $(this).val();
  if (presetName === "nonePreset") {
    extension_settings[extensionName] = {
      ...defaultSettings,
      presets: extension_settings[extensionName].presets,
      currentPreset: null,
    };

    $("#text_image_font_family").val(defaultSettings.fontFamily);
    $("#text_image_font_size").val(defaultSettings.fontSize);
    $("#text_image_font_align").val(defaultSettings.fontAlign);
    $("#text_image_font_color").val(defaultSettings.fontColor);
    $("#text_image_stroke_width").val(defaultSettings.strokeWidth);
    $("#text_image_ratio").val(defaultSettings.imageRatio);
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
    $(".bg-image-item").removeClass("selected");
    $(`.bg-image-item[data-path="${defaultSettings.selectedBackgroundImage}"]`).addClass(
      "selected"
    );
    $("#footer_text").val("");
    $("#footer_color").val(defaultSettings.footerColor);

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
    extension_settings[extensionName][key] = value;

    switch (key) {
      case "fontFamily":
        $("#text_image_font_family").val(value);
        break;
      case "fontSize":
        $("#text_image_font_size").val(value);
        break;
      case "fontAlign":
        $("#text_image_font_align").val(value);
        break;
      case "fontColor":
        $("#text_image_font_color").val(value);
        break;
      case "strokeWidth":
        $("#text_image_stroke_width").val(value);
        break;
      case "imageRatio":
        $("#text_image_ratio").val(value);
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
      case "footerText":
        $("#footer_text").val(value);
        break;
      case "footerColor":
        $("#footer_color").val(value);
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


async function loadFonts() {
  try {
    const response = await fetch(`${extensionFolderPath}/font-family.json`);
    const fonts = await response.json();
    const select = $("#text_image_font_family").empty();

    const fontPromises = fonts.map(async (font) => {
      const option = document.createElement("option");
      option.value = font.value;
      option.textContent = font.label;
      await document.fonts.load(`1em ${font.value}`);
      select.append(`<option value="${font.value}">${font.label}</option>`);
    });

    await Promise.all(fontPromises);
    select.val(extension_settings[extensionName].fontFamily);
    refreshPreview();
  } catch (error) {}
}


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
  const ImageReader = new FileReader();
  ImageReader.onload = (e) => {
    const imageData = e.target.result;
    storeBackground(file.name, imageData);
    addBGtoGallery(file.name, imageData);
    $("#bg_image_upload").val("");
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
    const {original} = wordGroup[i];
    const temp = originalTemp[i];
    
    const containsKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(original);
    if (containsKorean) {
      text = findKoreanWord(text, original, temp);
    } else {
      text = replaceString(text, original, temp);
    }
  }
  
  for (let i = 0; i < wordGroup.length; i++) {
    const {replacement} = wordGroup[i];
    const temp = originalTemp[i];
    const replacementText = replacement || "";
    
    text = text.split(temp).join(replacementText);
  }

  $("#text_to_image").val(text);
  refreshPreview();
}
function replaceString(text, original, replacement) {
  const parts = text.split(new RegExp(escapeRegExp(original), "i"));
  if (parts.length === 1) return text;
  let result = parts[0];
  let searchStartPos = parts[0].length;

  for (let i = 1; i < parts.length; i++) {
    const matchedOriginal = text.substring(searchStartPos, searchStartPos + original.length);
    result += replacement + parts[i];
    searchStartPos += matchedOriginal.length + parts[i].length;
  }

  return result;
}
function findKoreanWord(text, originalWord, replacementWord) {
  const originalLower = originalWord.toLowerCase();
  const verbEndingPattern = /^[자고며다요네죠게서써도구나군요까봐서라지거든만큼]/;
  const particlePattern = /^(?:[은|는|이|가|아|야|의|을|를|로|으로|과|와|께|에게|에서|한테|하고|랑|이랑|도|이도|만|까지|마저|조차|부터|밖에|야말로|서|처럼|보다|였])/;

  const wordBoundary = /[\s\.,;:!?\(\)\[\]{}"'<>\/\\\-_=\+\*&\^%\$#@~`|]/;
  let result = "";

  for (let i = 0; i < text.length; i++) {
    if (
      i <= text.length - originalWord.length &&
      text.slice(i, i + originalWord.length).toLowerCase() === originalLower
    ) {
      const isStartBoundary = i === 0 || wordBoundary.test(text[i - 1]);

      const endPos = i + originalWord.length;
      const nextChar = text[endPos] || "";

      const isVerbEnding = verbEndingPattern.test(nextChar);

      const isEndBoundary =
        endPos === text.length ||
        wordBoundary.test(nextChar) ||
        particlePattern.test(nextChar) ||
        !/[가-힣a-zA-Z0-9]/.test(nextChar);

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


function fontFamily(event) {
  extension_settings[extensionName].fontFamily = event.target.value;
  saveSettings();
  refreshPreview();
}

function strokeWidth(event) {
  extension_settings[extensionName].strokeWidth = event.target.value;
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
function aspectRatio(event) {
  extension_settings[extensionName].imageRatio = event.target.value;
  saveSettings();
  refreshPreview();
}
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
    default:
      return {width: 700, height: 700};
  }
}

function refreshPreview() {
  const text = $("#text_to_image").val() || "";
  const chunks = wrappingTexts(text);
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

function enableMarkdown(text) {
  const spans = [];
  let currentText = "";
  let bold = false;
  let italic = false;
  let fontColor = null;
  let bgColor = null;
  let i = 0;
  let colorHighlight = false;

  while (i < text.length) {
    if (text.slice(i, i + 2) === "**") {
      if (currentText) spans.push({text: currentText, bold, italic, fontColor, bgColor});
      bold = !bold;
      currentText = "";
      i += 2;
    } else if (text[i] === "*" && (i + 1 >= text.length || text[i + 1] !== "*")) {
      if (currentText) spans.push({text: currentText, bold, italic, fontColor, bgColor});
      italic = !italic;
      currentText = "";
      i++;
    } else if (text.slice(i, i + 2) === "=(" && i + 2 < text.length) {
      if (currentText) spans.push({text: currentText, bold, italic, fontColor, bgColor});
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
      if (currentText) spans.push({text: currentText, bold, italic, fontColor, bgColor});
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

  if (currentText) spans.push({text: currentText, bold, italic, fontColor, bgColor});
  return spans;
}


function wrappingTexts(text) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const {width, height} = getCanvasSize();
  const maxWidth = width - 80;
  const fontSize = parseInt(extension_settings[extensionName].fontSize);
  const lineHeight = fontSize * 1.5;
  const maxLines = Math.floor((height - 80 - lineHeight) / lineHeight);

  const pages = [];
  let currentPage = [];
  let lineCount = 0;

  const lines = text.split(/\n/);

  lines.forEach((line) => {
    if (line.trim() === "") {
      if (lineCount >= maxLines) {
        pages.push(currentPage);
        currentPage = [];
        lineCount = 0;
      } else if (currentPage.length > 0) {
        currentPage.push([{text: "", bold: false, italic: false, fontColor: null, bgColor: null}]);
        lineCount++;
      }
      return;
    }

    const wrapLine = [];
    const spans = enableMarkdown(line);
    let currentLine = [];
    let currentLineText = "";

    spans.forEach((span) => {
      const words = span.text.match(/\S+\s*|\s+/g) || [];

      words.forEach((word) => {
        const testText = currentLineText + word;
        ctx.font = `${
          span.bold ? "bold" : span.italic ? "italic" : extension_settings[extensionName].fontWeight
        } ${fontSize}px ${extension_settings[extensionName].fontFamily}`;

        if (ctx.measureText(testText).width <= maxWidth) {
          currentLineText = testText;
          currentLine.push({
            text: word,
            bold: span.bold,
            italic: span.italic,
            fontColor: span.fontColor,
            bgColor: span.bgColor,
          });
        } else {
          if (currentLine.length) {
            wrapLine.push(currentLine);
          }
          currentLine = [
            {
              text: word,
              bold: span.bold,
              italic: span.italic,
              fontColor: span.fontColor,
              bgColor: span.bgColor,
            },
          ];
          currentLineText = word;
        }
      });
    });

    if (currentLine.length) {
      wrapLine.push(currentLine);
    }
    const wrapLineCount = wrapLine.length;
    if (lineCount + wrapLineCount > maxLines && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      lineCount = 0;
    }

    currentPage = currentPage.concat(wrapLine);
    lineCount += wrapLineCount;
  });

  if (currentPage.length) {
    pages.push(currentPage);
  }

  return pages
    .map((page) => {
      while (page.length > 0 && page[0].every((span) => span.text.trim() === "")) {
        page.shift();
      }
      while (page.length > 0 && page[page.length - 1].every((span) => span.text.trim() === "")) {
        page.pop();
      }
      return page;
    })
    .filter((page) => page.length > 0);
}
function generateTextImage(chunk, index) {
  const {width, height} = getCanvasSize();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const fontSize = parseInt(extension_settings[extensionName].fontSize);
  const lineHeight = fontSize * 1.5;
  const settings = extension_settings[extensionName];

  const drawText = () => {
    const strokeWidth = parseFloat(settings.strokeWidth) || 0;

    const totalTextHeight = chunk.length * lineHeight;
    const footerHeight = 30;
    let y = Math.max(
      (height - totalTextHeight - footerHeight) / 2 + lineHeight,
      40 + lineHeight / 2
    );

    ctx.textAlign = settings.fontAlign || "left";

    chunk.forEach((line) => {
      let totalTextWidth = 0;
      line.forEach((span) => {
        ctx.font = `${
          span.bold ? "bold" : span.italic ? "italic" : settings.fontWeight
        } ${fontSize}px ${settings.fontFamily}`;
        totalTextWidth += ctx.measureText(span.text + " ").width;
      });

      let x;
      if (settings.fontAlign === "center") {
        x = (width - totalTextWidth) / 2;
      } else if (settings.fontAlign === "right") {
        const rightMargin = 40;
        x = width - totalTextWidth - rightMargin;
      } else {
        x = 40;
      }

      line.forEach((span) => {
        ctx.font = `${
          span.bold ? "bold" : span.italic ? "italic" : settings.fontWeight
        } ${fontSize}px ${settings.fontFamily}`;

        ctx.fillStyle = span.fontColor || settings.fontColor || "#000000";
        if (strokeWidth > 0) {
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = strokeWidth;
        }

        if (span.bgColor) {
          ctx.fillStyle = span.bgColor;
          const hightTexts = ctx.measureText(span.text);
          const textWidth = hightTexts.width;
          const textHeight = fontSize;

          const paddingX = 2;
          const paddingY = 2;
          ctx.fillRect(
            x - paddingX,
            y - textHeight + paddingY,
            textWidth + 2 * paddingX,
            textHeight + 2 * paddingY
          );

          ctx.fillStyle = span.fontColor || settings.fontColor || "#000000";
        }

        if (strokeWidth > 0) ctx.strokeText(span.text, x, y);
        ctx.fillText(span.text, x, y);

        x += ctx.measureText(span.text).width;
      });

      y += lineHeight;
    });
  };

  const textWallpaper = (img) => {
    let drawWidth,
      drawHeight,
      offsetX = 0,
      offsetY = 0;
    const imgRatio = img.width / img.height;
    const canvasRatio = width / height;

    if (imgRatio > canvasRatio) {
      drawHeight = height;
      drawWidth = img.width * (height / img.height);
      offsetX = (width - drawWidth) / 2;
    } else {
      drawWidth = width;
      drawHeight = img.height * (width / img.width);
      offsetY = (height - drawHeight) / 2;
    }
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    let filterEffects = [];
    if (settings.bgBlur > 0) filterEffects.push(`blur(${settings.bgBlur}px)`);
    if (settings.bgBrightness !== undefined)
      filterEffects.push(`brightness(${settings.bgBrightness}%)`);
    if (settings.bgHue !== undefined) filterEffects.push(`hue-rotate(${settings.bgHue}deg)`);

    if (filterEffects.length > 0) {
      ctx.filter = filterEffects.join(" ");
      ctx.drawImage(canvas, 0, 0, width, height);
      ctx.filter = "none";
    }

    if (settings.bgGrayscale > 0) {
      const imageData = ctx.getImageData(0, 0, width, height);
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
      const imageData = ctx.getImageData(0, 0, width, height);
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
      ctx.fillRect(20, 20, width - 40, height - 40);
    }
  };

  const drawFooter = () => {
    const footerText = settings.footerText;
    if (footerText) {
      const footerColor = settings.footerColor || "#000000";
      ctx.font = "14px Pretendard-Regular";
      ctx.fillStyle = footerColor;
      ctx.textAlign = "right";
      const footerY = height - 35;
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
  if (useBgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
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
    ctx.fillRect(0, 0, width, height);
    drawOverlay();
    drawText();
    drawFooter();
    $img.attr("src", canvas.toDataURL("image/png"));
  }

  if (settings.imageRatio === "rectangular") $img.addClass("rectangular");
  $preview.append($img, $downloadBtn);
  return $preview;
}



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
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

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
  await initSettings();

  presetUI();
  presetBackupSys();
  customBG();
  setupWordReplacer();

  $("#text_image_font_family").on("change", fontFamily);
  $("#text_image_font_size").on("change", fontSize);
  $("#text_image_font_align").on("change", fontAlign);
  $("#text_image_font_color").on("change", fontColor);
  $("#text_image_stroke_width").on("change", strokeWidth);
  $("#text_image_ratio").on("change", aspectRatio);
  $("#text_to_image").on("change", refreshPreview);
  $("#use_background_color").on("change", useBackgroundColor);
  $("#background_color").on("change", backgroundColor);
  $("#bg_blur").on("change", addBlur);
  $("#bg_brightness").on("change", brightness);
  $("#bg_hue").on("change", hue);
  $("#bg_grayscale").on("change", grayScale);
  $("#bg_noise").on("change", addNoise);
  $("#overlay_color").on("change", overlayColor);
  $("#overlay_opacity").on("change", addOverlay);
  $("#footer_text").on("change", footerText);
  $("#footer_color").on("change", footerColor);

  $("#clear_text_btn").on("click", () => {
    $("#text_to_image").val("");
    refreshPreview();
  });
  $("#create_preset").on("click", () => {
    $("#preset_name").val("");
  });
  $("#clear_replace").on("click", () => {
    $(".replacer_box").val("");
  });

  $("#how_to_use").on("click", () => {
    $(".how_to_use_box").slideToggle();
  });
});
