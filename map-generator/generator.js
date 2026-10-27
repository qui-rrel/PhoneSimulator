(function initMapGeneratorUi() {
  "use strict";

  const core = window.MapGeneratorCore;
  if (!core) throw new Error("地图生成核心加载失败。");

  const form = document.querySelector("#map-form");
  const fields = {
    placeName: document.querySelector("#place-name"),
    city: document.querySelector("#city"),
    district: document.querySelector("#district"),
    mainRoad: document.querySelector("#main-road"),
    streetNumber: document.querySelector("#street-number"),
    address: document.querySelector("#address"),
    preset: document.querySelector("#preset"),
    palette: document.querySelector("#palette"),
    density: document.querySelector("#density"),
    regularity: document.querySelector("#regularity"),
    river: document.querySelector("#river"),
    subway: document.querySelector("#subway"),
    subwayLine: document.querySelector("#subway-line"),
    stationName: document.querySelector("#station-name"),
    seed: document.querySelector("#seed"),
  };
  const filenameInput = document.querySelector("#filename");
  const preview = document.querySelector("#map-preview");
  const previewTitle = document.querySelector("#preview-title");
  const pinLabel = document.querySelector("#pin-label");
  const activeSeed = document.querySelector("#active-seed");
  const candidateSection = document.querySelector("#candidate-section");
  const candidateGrid = document.querySelector("#candidate-grid");
  const status = document.querySelector("#status");
  const statusText = document.querySelector("#status-text");
  const chooseFolderButton = document.querySelector("#choose-folder");
  const saveButton = document.querySelector("#save-svg");
  const loadInput = document.querySelector("#load-svg");
  const subwayFields = document.querySelector("#subway-fields");

  let currentSvg = "";
  let currentSettings = core.normalizeSettings(core.DEFAULTS);
  let previewUrl = "";
  let candidateUrls = [];
  let outputDirectoryHandle = null;
  let filenameCustomized = false;
  let addressCustomized = false;
  let previewTimer = null;

  function setStatus(message, isError) {
    statusText.textContent = message;
    status.classList.toggle("error", Boolean(isError));
  }

  function collectSettings() {
    return core.normalizeSettings({
      placeName: fields.placeName.value,
      city: fields.city.value,
      district: fields.district.value,
      mainRoad: fields.mainRoad.value,
      streetNumber: fields.streetNumber.value,
      address: fields.address.value,
      preset: fields.preset.value,
      palette: fields.palette.value,
      density: fields.density.value,
      regularity: fields.regularity.value,
      river: fields.river.checked,
      subway: fields.subway.checked,
      subwayLine: fields.subwayLine.value,
      stationName: fields.stationName.value,
      seed: fields.seed.value,
    });
  }

  function fillSettings(input) {
    const settings = core.normalizeSettings(input);
    for (const [name, element] of Object.entries(fields)) {
      if (element.type === "checkbox") element.checked = Boolean(settings[name]);
      else element.value = settings[name];
    }
    document.querySelector("#density-value").value = settings.density;
    document.querySelector("#regularity-value").value = settings.regularity;
    subwayFields.hidden = !settings.subway;
    addressCustomized = true;
    filenameCustomized = false;
    updateSuggestedFilename(settings);
  }

  function makeFilename(settings) {
    const place = settings.placeName.replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "-").replace(/[. ]+$/gu, "");
    const seed = settings.seed.replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "-").replace(/[. ]+$/gu, "");
    return `map-${place || "地点"}-${seed || "seed"}.svg`;
  }

  function normalizeFilename(value, settings) {
    let filename = String(value || "").trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "-")
      .replace(/[. ]+$/gu, "");
    if (!filename) filename = makeFilename(settings);
    if (!filename.toLowerCase().endsWith(".svg")) filename += ".svg";
    return filename;
  }

  function updateSuggestedFilename(settings) {
    if (!filenameCustomized) filenameInput.value = makeFilename(settings || collectSettings());
  }

  function updateAddressSuggestion() {
    if (addressCustomized) return;
    fields.address.value = `${fields.city.value.trim()}${fields.district.value.trim()}${fields.mainRoad.value.trim()}${fields.streetNumber.value.trim()}`;
  }

  function svgObjectUrl(svg) {
    return URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  }

  function applyGeneratedMap(svg, settings, options) {
    const config = options || {};
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = svgObjectUrl(svg);
    currentSvg = svg;
    currentSettings = core.normalizeSettings(settings);
    preview.src = previewUrl;
    preview.alt = `${currentSettings.placeName}示意地图预览`;
    previewTitle.textContent = currentSettings.placeName;
    pinLabel.textContent = currentSettings.placeName;
    activeSeed.textContent = `种子 ${currentSettings.seed}`;
    if (config.syncForm) {
      fields.seed.value = currentSettings.seed;
      updateSuggestedFilename(currentSettings);
    }
    document.querySelectorAll(".candidate-card").forEach((card) => {
      card.classList.toggle("selected", card.dataset.seed === currentSettings.seed);
      card.setAttribute("aria-pressed", String(card.dataset.seed === currentSettings.seed));
    });
  }

  function generateCurrent(options) {
    const config = options || {};
    try {
      const settings = collectSettings();
      const svg = core.generateMapSvg(settings);
      applyGeneratedMap(svg, settings, { syncForm: false });
      if (!config.quiet) setStatus(`已生成“${settings.placeName}”，种子 ${settings.seed}。`, false);
      return { svg, settings };
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "地图生成失败。", true);
      return null;
    }
  }

  function schedulePreview() {
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => generateCurrent({ quiet: true }), 160);
  }

  function clearCandidateUrls() {
    for (const url of candidateUrls) URL.revokeObjectURL(url);
    candidateUrls = [];
  }

  function generateCandidates() {
    const base = collectSettings();
    const seeds = core.candidateSeeds(base.seed, 9);
    clearCandidateUrls();
    candidateGrid.replaceChildren();
    const fragment = document.createDocumentFragment();
    const candidates = seeds.map((seed) => {
      const settings = core.normalizeSettings({ ...base, seed });
      return { settings, svg: core.generateMapSvg(settings) };
    });

    candidates.forEach((candidate, index) => {
      const url = svgObjectUrl(candidate.svg);
      candidateUrls.push(url);
      const button = document.createElement("button");
      button.className = `candidate-card${index === 0 ? " selected" : ""}`;
      button.type = "button";
      button.dataset.seed = candidate.settings.seed;
      button.setAttribute("aria-label", `选择种子 ${candidate.settings.seed} 的地图`);
      button.setAttribute("aria-pressed", String(index === 0));
      const image = document.createElement("img");
      image.src = url;
      image.alt = "";
      const label = document.createElement("span");
      label.textContent = candidate.settings.seed;
      button.append(image, label);
      button.addEventListener("click", () => {
        applyGeneratedMap(candidate.svg, candidate.settings, { syncForm: true });
        setStatus(`已选择候选种子 ${candidate.settings.seed}。`, false);
      });
      fragment.append(button);
    });
    candidateGrid.append(fragment);
    candidateSection.hidden = false;
    applyGeneratedMap(candidates[0].svg, candidates[0].settings, { syncForm: true });
    setStatus("已生成 9 个确定性候选。点击缩略图选择，再保存 SVG。", false);
    candidateSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function createFreshSeed() {
    const values = new Uint32Array(2);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(values);
      return `${values[0].toString(36)}${values[1].toString(36)}`.slice(0, 12);
    }
    return String(Date.now());
  }

  async function chooseOutputFolder() {
    if (!("showDirectoryPicker" in window)) {
      setStatus("当前浏览器不支持选择输出文件夹。保存时会使用浏览器的普通下载功能。", true);
      return;
    }
    try {
      outputDirectoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      chooseFolderButton.innerHTML = `<span aria-hidden="true">✓</span> 输出：${escapeHtml(outputDirectoryHandle.name)}`;
      setStatus(`已选择输出文件夹“${outputDirectoryHandle.name}”。`, false);
    } catch (error) {
      if (error && error.name === "AbortError") {
        setStatus("未更改输出文件夹。", false);
      } else {
        setStatus("无法访问所选文件夹，保存时将使用浏览器下载。", true);
      }
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/gu, "&amp;")
      .replace(/</gu, "&lt;")
      .replace(/>/gu, "&gt;")
      .replace(/"/gu, "&quot;")
      .replace(/'/gu, "&#39;");
  }

  async function writeToSelectedFolder(filename, svg) {
    if (!outputDirectoryHandle) return false;
    const permission = await outputDirectoryHandle.queryPermission({ mode: "readwrite" });
    const granted = permission === "granted"
      ? permission
      : await outputDirectoryHandle.requestPermission({ mode: "readwrite" });
    if (granted !== "granted") throw new Error("没有获得输出文件夹的写入权限。");
    const fileHandle = await outputDirectoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(svg);
    await writable.close();
    return true;
  }

  function browserDownload(filename, svg) {
    const url = svgObjectUrl(svg);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function saveSvg() {
    const generated = generateCurrent({ quiet: true });
    if (!generated) return;
    const filename = normalizeFilename(filenameInput.value, generated.settings);
    filenameInput.value = filename;
    saveButton.disabled = true;
    try {
      if (await writeToSelectedFolder(filename, generated.svg)) {
        setStatus(`已保存到“${outputDirectoryHandle.name}/${filename}”。`, false);
      } else {
        browserDownload(filename, generated.svg);
        setStatus(`已交给浏览器下载“${filename}”。如需直接写入 outputs，请先选择输出文件夹。`, false);
      }
    } catch (error) {
      browserDownload(filename, generated.svg);
      setStatus(`文件夹写入失败，已改用普通下载：${error instanceof Error ? error.message : "未知错误"}`, true);
    } finally {
      saveButton.disabled = false;
    }
  }

  async function loadSvgFile(file) {
    if (!file) return;
    try {
      const source = await file.text();
      const metadata = core.extractMetadata(source);
      fillSettings(metadata.settings);
      currentSvg = source;
      generateCurrent({ quiet: true });
      candidateSection.hidden = true;
      clearCandidateUrls();
      setStatus(`已从“${file.name}”恢复地图参数和种子。`, false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "无法读取这个 SVG。", true);
    } finally {
      loadInput.value = "";
    }
  }

  for (const input of [fields.city, fields.district, fields.mainRoad, fields.streetNumber]) {
    input.addEventListener("input", () => {
      updateAddressSuggestion();
      schedulePreview();
    });
  }
  fields.address.addEventListener("input", () => {
    addressCustomized = true;
    schedulePreview();
  });
  fields.placeName.addEventListener("input", () => {
    updateSuggestedFilename();
    schedulePreview();
  });
  fields.seed.addEventListener("input", () => {
    updateSuggestedFilename();
    schedulePreview();
  });
  for (const input of Object.values(fields)) {
    if ([fields.city, fields.district, fields.mainRoad, fields.streetNumber, fields.address, fields.placeName, fields.seed].includes(input)) continue;
    input.addEventListener("input", schedulePreview);
    input.addEventListener("change", schedulePreview);
  }
  fields.density.addEventListener("input", () => {
    document.querySelector("#density-value").value = fields.density.value;
  });
  fields.regularity.addEventListener("input", () => {
    document.querySelector("#regularity-value").value = fields.regularity.value;
  });
  fields.subway.addEventListener("change", () => {
    subwayFields.hidden = !fields.subway.checked;
  });
  fields.preset.addEventListener("change", () => {
    if (fields.preset.value === "riverside") fields.river.checked = true;
  });
  filenameInput.addEventListener("input", () => {
    filenameCustomized = true;
  });
  form.addEventListener("submit", (event) => event.preventDefault());
  document.querySelector("#generate-one").addEventListener("click", () => generateCurrent());
  document.querySelector("#generate-nine").addEventListener("click", generateCandidates);
  document.querySelector("#random-seed").addEventListener("click", () => {
    fields.seed.value = createFreshSeed();
    updateSuggestedFilename();
    generateCurrent();
  });
  chooseFolderButton.addEventListener("click", chooseOutputFolder);
  saveButton.addEventListener("click", saveSvg);
  loadInput.addEventListener("change", () => loadSvgFile(loadInput.files && loadInput.files[0]));

  window.addEventListener("beforeunload", () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    clearCandidateUrls();
  });

  if (!("showDirectoryPicker" in window)) {
    chooseFolderButton.title = "当前浏览器不支持直接写入文件夹，仍可使用普通下载";
  }
  generateCurrent({ quiet: true });
})();
