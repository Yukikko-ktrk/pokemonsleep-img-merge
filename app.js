const SAMPLE_FILES = [
  "20260623_134641000_iOS.png",
  "20260623_134652000_iOS.png",
  "20260623_134713000_iOS.png",
  "20260623_134732000_iOS.png",
  "20260623_134806000_iOS.png",
  "20260623_134816000_iOS.png",
  "20260623_134855000_iOS.png",
  "20260623_134907000_iOS.png",
];

const state = {
  rows: 2,
  cols: 4,
  images: [],
  showCoordinates: false,
  selectedSlotIndex: null,
};

const els = {
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  sampleButton: document.querySelector("#sampleButton"),
  statusText: document.querySelector("#statusText"),
  rowsInput: document.querySelector("#rowsInput"),
  colsInput: document.querySelector("#colsInput"),
  favoriteList: document.querySelector("#favoriteList"),
  imageList: document.querySelector("#imageList"),
  previewCanvas: document.querySelector("#previewCanvas"),
  previewInfo: document.querySelector("#previewInfo"),
  downloadButton: document.querySelector("#downloadButton"),
  coordinateToggle: document.querySelector("#coordinateToggle"),
  clearAllButton: document.querySelector("#clearAllButton"),
};

const favoriteKey = "pokemonsleep-img-merge-layouts";
const maxGridValue = 99;

init();

function init() {
  els.fileInput.addEventListener("change", () => {
    handleFiles(els.fileInput.files);
    els.fileInput.value = "";
  });

  els.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    els.dropZone.classList.add("is-dragging");
  });

  els.dropZone.addEventListener("dragleave", () => {
    els.dropZone.classList.remove("is-dragging");
  });

  els.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    els.dropZone.classList.remove("is-dragging");
    handleFiles(event.dataTransfer.files);
  });

  document.querySelectorAll("[data-step-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.stepTarget;
      const step = Number(button.dataset.step);
      setGridValue(target, state[target] + step);
    });
  });

  els.rowsInput.addEventListener("input", () => setGridValue("rows", els.rowsInput.value));
  els.colsInput.addEventListener("input", () => setGridValue("cols", els.colsInput.value));
  els.sampleButton.addEventListener("click", loadSamples);
  els.downloadButton.addEventListener("click", downloadMergedImage);
  els.clearAllButton.addEventListener("click", clearAllImages);
  els.coordinateToggle.addEventListener("click", toggleCoordinates);
  els.previewCanvas.addEventListener("click", selectSlotFromPreview);
  document.querySelectorAll("[data-collapse-toggle]").forEach((button) => {
    button.addEventListener("click", () => toggleSection(button));
  });

  renderFavorites();
  render();
}

async function handleFiles(fileList) {
  const files = [...fileList].filter((file) => file.type.startsWith("image/"));
  if (!files.length) {
    setStatus("画像ファイルが見つかりません。");
    return;
  }

  setStatus(`${files.length}枚を読み込み中です。`);
  const loaded = [];

  for (const file of files) {
    try {
      loaded.push(await loadImageFile(file));
    } catch {
      setStatus(`${file.name} を読み込めませんでした。`);
    }
  }

  addImagesToSlots(loaded);
  applyAutoGrid(getFilledImages().length);
  setStatus(`${getFilledImages().length}枚の画像を読み込みました。`);
  render();
}

async function loadSamples() {
  setStatus("サンプルを読み込み中です。");

  try {
    const sampleImages = [];
    for (const name of SAMPLE_FILES) {
      const response = await fetch(`./samples/${name}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${name}`);
      }
      const blob = await response.blob();
      const file = new File([blob], name, { type: blob.type || "image/png" });
      sampleImages.push(await loadImageFile(file));
    }
    clearImages();
    addImagesToSlots(sampleImages);
    applyAutoGrid(getFilledImages().length);
    setStatus("サンプル8枚を読み込みました。");
    render();
  } catch {
    setStatus("サンプル読込にはローカルサーバーが必要です。ファイル選択はそのまま使えます。");
  }
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        name: file.name,
        width: image.naturalWidth,
        height: image.naturalHeight,
        url,
        image,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    image.src = url;
  });
}

function setGridValue(key, value) {
  const parsed = Number.parseInt(value, 10);
  const safeValue = Number.isFinite(parsed) ? parsed : 1;
  state[key] = clamp(safeValue, 1, maxGridValue);
  syncInputs();
  renderPreview();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAutoGrid(imageCount) {
  const count = Math.max(1, imageCount);
  if (count <= 5) {
    return { rows: 1, cols: count };
  }
  if (count === 6) {
    return { rows: 2, cols: 3 };
  }
  if (count <= 8) {
    return { rows: 2, cols: 4 };
  }
  if (count <= 12) {
    return { rows: 3, cols: 4 };
  }

  let rows = 4;
  while (rows * (rows + 1) < count) {
    rows += 1;
  }
  return { rows, cols: rows + 1 };
}

function applyAutoGrid(imageCount) {
  if (imageCount <= 0) {
    return;
  }
  const grid = getAutoGrid(imageCount);
  state.rows = clamp(grid.rows, 1, maxGridValue);
  state.cols = clamp(grid.cols, 1, maxGridValue);
}
function syncInputs() {
  els.rowsInput.value = state.rows;
  els.colsInput.value = state.cols;
}

function getFilledImages() {
  return state.images.filter(Boolean);
}

function getSlotCount() {
  return Math.max(state.rows * state.cols, state.images.length);
}

function addImagesToSlots(images) {
  images.forEach((image) => {
    const emptyIndex = state.images.findIndex((item) => item === null);
    if (emptyIndex >= 0) {
      state.images[emptyIndex] = image;
    } else {
      state.images.push(image);
    }
  });
}

function render() {
  syncInputs();
  renderImageList();
  renderPreview();
  const hasImages = getFilledImages().length > 0;
  els.downloadButton.disabled = !hasImages;
  els.clearAllButton.disabled = !hasImages;
}

function renderImageList() {
  const filledImages = getFilledImages();
  els.imageList.innerHTML = "";
  els.imageList.classList.toggle("empty-list", filledImages.length === 0);

  if (!filledImages.length) {
    els.imageList.textContent = "画像がありません。";
    return;
  }

  for (let index = 0; index < getSlotCount(); index += 1) {
    const item = state.images[index] || null;
    const rowIndex = Math.floor(index / state.cols) + 1;
    const colIndex = (index % state.cols) + 1;
    const row = document.createElement("article");
    row.className = "image-item";
    row.dataset.slotIndex = String(index);
    row.classList.toggle("is-selected", state.selectedSlotIndex === index);

    const thumb = item ? document.createElement("img") : document.createElement("div");
    thumb.className = item ? "image-thumb" : "image-thumb empty-thumb";
    if (item) {
      thumb.src = item.url;
      thumb.alt = item.name;
    }

    const meta = document.createElement("div");
    meta.className = "image-meta";

    const name = document.createElement("div");
    name.className = "image-name";
    name.textContent = item ? `(${rowIndex}, ${colIndex}) ${item.name}` : `(${rowIndex}, ${colIndex}) 空き`;

    const size = document.createElement("div");
    size.className = "image-size";
    size.textContent = item ? `${item.width} x ${item.height}` : "白背景で出力";

    const moves = document.createElement("div");
    moves.className = "move-grid";
    if (item) {
      moves.append(
        moveButton("↑", index, -state.cols, index - state.cols >= 0),
        moveButton("↓", index, state.cols, index + state.cols < getSlotCount()),
        moveButton("←", index, -1, colIndex > 1),
        moveButton("→", index, 1, colIndex < state.cols && index + 1 < getSlotCount()),
        deleteButton(index),
      );
    }

    meta.append(name, size, moves);
    row.append(thumb, meta);
    els.imageList.append(row);
  }
}
function moveButton(label, index, offset, enabled) {
  const button = document.createElement("button");
  button.className = "icon-button";
  button.type = "button";
  button.textContent = label;
  button.disabled = !enabled;
  button.setAttribute("aria-label", `${index + 1}番目の画像を移動`);
  button.addEventListener("click", () => moveImage(index, index + offset));
  return button;
}

function deleteButton(index) {
  const button = document.createElement("button");
  button.className = "danger-button compact-danger-button";
  button.type = "button";
  button.textContent = "削除";
  button.setAttribute("aria-label", `${index + 1}番目の画像を削除`);
  button.addEventListener("click", () => deleteImage(index));
  return button;
}

function moveImage(from, to) {
  if (to < 0 || to >= getSlotCount() || from === to) {
    return;
  }
  while (state.images.length <= to) {
    state.images.push(null);
  }
  const item = state.images[from] || null;
  state.images[from] = state.images[to] || null;
  state.images[to] = item;
  render();
}

function deleteImage(index) {
  const item = state.images[index] || null;
  if (item) {
    URL.revokeObjectURL(item.url);
  }
  state.images[index] = null;
  setStatus(`${getFilledImages().length}枚の画像があります。`);
  render();
}
function renderPreview() {
  const canvas = els.previewCanvas;
  const context = canvas.getContext("2d");
  const metrics = getCanvasMetrics();

  if (!metrics) {
    canvas.width = 640;
    canvas.height = 360;
    canvas.classList.add("is-empty");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#64707d";
    context.font = "24px sans-serif";
    context.textAlign = "center";
    context.fillText("画像を追加してください", canvas.width / 2, canvas.height / 2);
    els.previewInfo.textContent = "-";
    return;
  }

  drawMergedCanvas(canvas, metrics, { showCoordinates: state.showCoordinates });
  canvas.classList.remove("is-empty");
  els.previewInfo.textContent = `${metrics.width} x ${metrics.height}px`;
}

function selectSlotFromPreview(event) {
  const metrics = getCanvasMetrics();
  if (!metrics) {
    return;
  }
  const rect = els.previewCanvas.getBoundingClientRect();
  const scaleX = metrics.width / rect.width;
  const scaleY = metrics.height / rect.height;
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top) * scaleY;
  const col = Math.floor(canvasX / metrics.cellWidth);
  const row = Math.floor(canvasY / metrics.cellHeight);
  if (col < 0 || col >= metrics.cols || row < 0 || row >= metrics.rows) {
    return;
  }
  const index = row * metrics.cols + col;
  if (index >= getSlotCount()) {
    return;
  }
  state.selectedSlotIndex = index;
  renderImageList();
  scrollSelectedImageIntoView();
  setStatus(`(${row + 1}, ${col + 1}) を選択しました。`);
}
function getCanvasMetrics() {
  const filledImages = getFilledImages();
  if (!filledImages.length) {
    return null;
  }

  const cellWidth = Math.max(...filledImages.map((item) => item.width));
  const cellHeight = Math.max(...filledImages.map((item) => item.height));
  const width = cellWidth * state.cols;
  const rowsNeeded = Math.max(state.rows, Math.ceil(getSlotCount() / state.cols));
  const height = cellHeight * rowsNeeded;

  return {
    cellWidth,
    cellHeight,
    width,
    height,
    rows: rowsNeeded,
    cols: state.cols,
  };
}
function drawMergedCanvas(canvas, metrics, options = {}) {
  canvas.width = metrics.width;
  canvas.height = metrics.height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, metrics.width, metrics.height);

  state.images.forEach((item, index) => {
    if (!item) {
      return;
    }
    const col = index % metrics.cols;
    const row = Math.floor(index / metrics.cols);
    const x = col * metrics.cellWidth + Math.floor((metrics.cellWidth - item.width) / 2);
    const y = row * metrics.cellHeight + Math.floor((metrics.cellHeight - item.height) / 2);
    context.drawImage(item.image, x, y, item.width, item.height);
    if (options.showCoordinates) {
      drawCoordinateLabel(context, col + 1, row + 1, col * metrics.cellWidth, row * metrics.cellHeight, metrics.cellWidth, metrics.cellHeight);
    }
  });
}

function scrollSelectedImageIntoView() {
  if (state.selectedSlotIndex === null) {
    return;
  }
  const target = els.imageList.querySelector(`[data-slot-index="${state.selectedSlotIndex}"]`);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function drawCoordinateLabel(context, col, row, x, y, width, height) {
  const label = `(${row}, ${col})`;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const fontSize = Math.max(28, Math.round(Math.min(width, height) * 0.08));
  context.save();
  context.font = `700 ${fontSize}px sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const textWidth = context.measureText(label).width;
  const paddingX = Math.round(fontSize * 0.55);
  const paddingY = Math.round(fontSize * 0.35);
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;
  context.fillStyle = "rgba(255, 255, 255, 0.82)";
  context.strokeStyle = "rgba(15, 93, 80, 0.9)";
  context.lineWidth = Math.max(3, Math.round(fontSize * 0.08));
  context.beginPath();
  context.roundRect(centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight, Math.round(fontSize * 0.35));
  context.fill();
  context.stroke();
  context.fillStyle = "#0f5d50";
  context.fillText(label, centerX, centerY);
  context.restore();
}

function toggleCoordinates() {
  state.showCoordinates = !state.showCoordinates;
  els.coordinateToggle.textContent = state.showCoordinates ? "座標表示: ON" : "座標表示: OFF";
  els.coordinateToggle.setAttribute("aria-pressed", String(state.showCoordinates));
  renderPreview();
}

function toggleSection(button) {
  const key = button.dataset.collapseToggle;
  const section = document.querySelector(`[data-collapsible="${key}"]`);
  if (!section) {
    return;
  }
  const collapsed = section.classList.toggle("is-collapsed");
  button.setAttribute("aria-expanded", String(!collapsed));
}
function downloadMergedImage() {
  const metrics = getCanvasMetrics();
  if (!metrics) {
    return;
  }

  const canvas = document.createElement("canvas");
  drawMergedCanvas(canvas, metrics);
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus("PNGを作成できませんでした。");
      return;
    }

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `pokemonsleep-img-merge-${formatTimestamp(new Date())}.png`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("PNGを保存しました。");
  }, "image/png");
}

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function renderFavorites() {
  const favorites = readFavorites();
  els.favoriteList.innerHTML = "";

  for (let index = 0; index < 3; index += 1) {
    const value = favorites[index];
    const row = document.createElement("div");
    row.className = "favorite-row";

    const label = document.createElement("div");
    label.className = "favorite-label";
    label.textContent = value ? `${index + 1}: ${value.rows} x ${value.cols}` : `${index + 1}: 未保存`;

    const save = document.createElement("button");
    save.className = "text-button";
    save.type = "button";
    save.textContent = "保存";
    save.addEventListener("click", () => saveFavorite(index));

    const load = document.createElement("button");
    load.className = "text-button";
    load.type = "button";
    load.textContent = "読込";
    load.disabled = !value;
    load.addEventListener("click", () => loadFavorite(index));

    const clear = document.createElement("button");
    clear.className = "danger-button";
    clear.type = "button";
    clear.textContent = "削除";
    clear.disabled = !value;
    clear.addEventListener("click", () => clearFavorite(index));

    row.append(label, save, load, clear);
    els.favoriteList.append(row);
  }
}

function readFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(favoriteKey));
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

function writeFavorites(favorites) {
  localStorage.setItem(favoriteKey, JSON.stringify(favorites.slice(0, 3)));
}

function saveFavorite(index) {
  const favorites = readFavorites();
  favorites[index] = { rows: state.rows, cols: state.cols };
  writeFavorites(favorites);
  renderFavorites();
  setStatus(`お気に入り${index + 1}に保存しました。`);
}

function loadFavorite(index) {
  const value = readFavorites()[index];
  if (!value) {
    return;
  }
  state.rows = clamp(Number(value.rows), 1, maxGridValue);
  state.cols = clamp(Number(value.cols), 1, maxGridValue);
  render();
  setStatus(`お気に入り${index + 1}を読み込みました。`);
}

function clearFavorite(index) {
  const favorites = readFavorites();
  favorites[index] = null;
  writeFavorites(favorites);
  renderFavorites();
  setStatus(`お気に入り${index + 1}を削除しました。`);
}

function clearAllImages() {
  clearImages();
  state.rows = 2;
  state.cols = 4;
  state.selectedSlotIndex = null;
  setStatus("すべての画像を削除しました。");
  render();
}
function clearImages() {
  getFilledImages().forEach((item) => URL.revokeObjectURL(item.url));
  state.images = [];
}

function setStatus(message) {
  els.statusText.textContent = message;
}


















