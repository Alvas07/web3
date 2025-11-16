// DOM-элементы (будут инициализированы после загрузки DOM)
let canvas = null;
let ctx = null;
let xGroup = null;
let xInput = null;
let rGroup = null;
let form = null;
let historyTableBody = null;
let notificationsContainer = null;

let selectedR = null;
// Label and scale configuration
// LABEL_MIN..LABEL_MAX controls which numbers are drawn on axes
// SCALE_MIN..SCALE_MAX control the numeric range mapped to the canvas area (supports asymmetric ranges)
const LABEL_MIN = -5; // user requested to remove -6 label
const LABEL_MAX = 6;
const SCALE_MIN = -6; // keep full clickable area to the left up to -6
const SCALE_MAX = 6;
// How many rows should appear before we force immediate scrolling in history
const HISTORY_SCROLL_ROWS = 3;

// Хранилище точек для отрисовки
let drawnPoints = [];

// Safe notification wrapper: use showNotification if available, otherwise create a minimal fallback
function notify(message, type = 'error', timeout = 4000) {
  try {
    if (typeof window !== 'undefined' && typeof window.showNotification === 'function') {
      window.showNotification(message, type, timeout);
      return;
    }
  } catch (e) {
    // fall through to fallback
  }

  // Fallback: create container if needed and show a simple toast
  let nc = document.getElementById('notifications-container');
  if (!nc) {
    nc = document.createElement('div');
    nc.id = 'notifications-container';
    document.body.appendChild(nc);
  }
  const el = document.createElement('div');
  el.className = 'notification ' + type;
  el.textContent = message;
  nc.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, timeout);
}

// Expose legacy name to avoid ReferenceError from other scripts expecting showNotification
try {
  if (typeof window !== 'undefined') window.showNotification = notify;
} catch (e) {
  // ignore
}


// canvas setup
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

function scaleX(x) {
  const rect = canvas.getBoundingClientRect();
  const range = SCALE_MAX - SCALE_MIN;
  return rect.left /*unused*/ , rect.width * ((x - SCALE_MIN) / range);
}

function scaleY(y) {
  const rect = canvas.getBoundingClientRect();
  const range = SCALE_MAX - SCALE_MIN;
  // map math y (SCALE_MIN..SCALE_MAX) to pixels (bottom..top)
  return rect.height * (1 - ( (y - SCALE_MIN) / range ));
}

function inverseScaleX(pageX) {
  const rect = canvas.getBoundingClientRect();
  const px = pageX - rect.left;
  const range = SCALE_MAX - SCALE_MIN;
  return SCALE_MIN + (px / rect.width) * range;
}

function inverseScaleY(pageY) {
  const rect = canvas.getBoundingClientRect();
  const py = pageY - rect.top;
  const range = SCALE_MAX - SCALE_MIN;
  // invert mapping from pixels to math-y
  return SCALE_MIN + (1 - (py / rect.height)) * range;
}

function drawAxes() {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width, h = rect.height;

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.beginPath();
  // horizontal axis at math y = 0
  ctx.moveTo(0, scaleY(0));
  ctx.lineTo(w, scaleY(0));
  ctx.stroke();
  ctx.beginPath();
  // vertical axis at math x = 0
  ctx.moveTo(scaleX(0), 0);
  ctx.lineTo(scaleX(0), h);
  ctx.stroke();

  ctx.fillStyle = "#000";
  ctx.font = "12px Arial";
  for(let i = LABEL_MIN; i <= LABEL_MAX; i++){
    if(i === 0) continue;
    // draw X labels slightly below the horizontal axis
    ctx.fillText(i, scaleX(i), scaleY(0) - 5);
    // draw Y labels to the right of the vertical axis
    ctx.fillText(i, scaleX(0) + 5, scaleY(i));
  }
}

function drawArea() {
  // Получаем все выбранные R из чекбоксов
  const selectedRValues = getSelectedRValues();
  
  if (selectedRValues.length === 0) {
    // Если R не выбраны, но есть точки в истории, используем R из точек
    if (drawnPoints.length > 0) {
      const firstPointR = drawnPoints[0].point.r;
      drawAreaWithR(firstPointR);
    }
    return;
  }
  
  // Отрисовываем область для максимального R
  const maxR = Math.max(...selectedRValues);
  drawAreaWithR(maxR);
}

function getSelectedRValues() {
  if (!rGroup) return [];
  
  const checkboxes = rGroup.querySelectorAll('input[type="checkbox"]');
  const selected = [];
  
  checkboxes.forEach(cb => {
    if (cb.checked) {
      // Try common patterns: label as next sibling or label[for=checkboxId]
      let label = cb.nextElementSibling;
      if (!label || label.tagName !== 'LABEL') {
        // try to find a label by for attribute inside rGroup
        try {
          const id = cb.id || '';
          if (id) {
            label = rGroup.querySelector('label[for="' + id + '"]') || rGroup.querySelector('label[for$="' + id.split(':').pop() + '"]');
          }
        } catch (e) {
          label = null;
        }
      }
      if (label) {
        const rValue = parseFloat(label.textContent.trim());
        if (!isNaN(rValue)) {
          selected.push(rValue);
        }
      }
    }
  });
  
  return selected;
}

function drawAreaWithR(R) {
  if (!R || isNaN(R)) return;
  // Новый дизайн областей по ТЗ:
  // 1-й квадрант (x>0,y>0): треугольник с основанием R и высотой R/2
  // 2-й квадрант (x<0,y>0): квадрат со стороной R
  // 4-й квадрант (x>0,y<0): четверть круга радиусом R/2

  ctx.fillStyle = "rgba(0,128,255,0.3)";

  // 1-й квадрант: треугольник (0,0) -> (R,0) -> (0,R/2)
  ctx.beginPath();
  ctx.moveTo(scaleX(0), scaleY(0));
  ctx.lineTo(scaleX(R), scaleY(0));
  ctx.lineTo(scaleX(0), scaleY(R/2));
  ctx.closePath();
  ctx.fill();

  // 2-й квадрант: квадрат от x=-R до 0 и y=0 до R
  const x1 = scaleX(-R);
  const y1 = scaleY(R);
  const w = scaleX(0) - scaleX(-R);
  const h = scaleY(0) - scaleY(R);
  ctx.fillRect(x1, y1, w, h);

  // 4-й квадрант: четверть круга радиус R/2 (в 4-й четверти)
  // Build the arc in math-coordinates (x to the right, y up) to avoid confusion with canvas angle direction
  ctx.beginPath();
  ctx.moveTo(scaleX(0), scaleY(0));
  const steps = 36;
  const r = R / 2;
  // theta from 0 down to -pi/2 covers the 4th quadrant in math coordinates
  for (let i = 0; i <= steps; i++) {
    const t = 0 + (i / steps) * (-Math.PI / 2);
    const px = r * Math.cos(t);
    const py = r * Math.sin(t);
    ctx.lineTo(scaleX(px), scaleY(py));
  }
  ctx.closePath();
  ctx.fill();
}

// Отрисовка точек на графике
function drawPoints() {
  // Draw only points matching the currently selected maximum R (selectedR) if any.
  // If no selectedR (no checkbox selected), draw all points.
  if (selectedR == null) {
    drawnPoints.forEach(p => {
      const x = scaleX(p.point.x);
      const y = scaleY(p.point.y);

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = p.result ? '#2ecc71' : '#e74c3c';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    return;
  }

  // Otherwise draw only points whose r matches selectedR (with small tolerance)
  const tol = 1e-3;
  const pointsToDraw = drawnPoints.filter(p => Math.abs((+p.point.r) - (+selectedR)) <= tol);

  pointsToDraw.forEach(p => {
    const x = scaleX(p.point.x);
    const y = scaleY(p.point.y);

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = p.result ? '#2ecc71' : '#e74c3c';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

// Функции для инициализации обработчиков событий
function setupEventListeners() {
  // валидация X
  if (xInput) {
    xInput.addEventListener("input", () => {
      let val = xInput.value;
      val = val.replace(/[^0-9.,-]/g, "");
      if (val.includes("-")) val = "-" + val.replace(/-/g, "");
      val = val.replace(",", ".");
      const firstDot = val.indexOf(".");
      if (firstDot !== -1) val = val.slice(0, firstDot + 1) + val.slice(firstDot + 1).replace(/\./g, "");
      val = val.replace(/^(-?)0+(\d)/, "$1$2");
      xInput.value = val;
      const x = parseFloat(val);
      if (isNaN(x) || x < -3 || x > 5) xInput.classList.add("invalid");
      else xInput.classList.remove("invalid");
    });
  }

  // изменение R (чекбоксы)
  if (rGroup) {
    rGroup.addEventListener("change", (e) => {
      if (e.target.type === "checkbox") {
        updateSelectedR();
        drawCanvas();
      }
    });
    // Инициализируем при загрузке
    updateSelectedR();
  }


  // клик по графику
  if (canvas) {
    canvas.addEventListener("click", (event) => {
      // Проверяем, есть ли хотя бы одно выбранное R
      const selectedRValues = getSelectedRValues();
      
      if (selectedRValues.length === 0) {
        notify("Сначала выберите хотя бы одно значение R!", 'error');
        return;
      }

      // Берем максимальное выбранное R для отправки

  const rValue = Math.max(...selectedRValues);

      // Use inverse scale helpers so pixel->math conversion matches drawing
      const x = inverseScaleX(event.clientX);
      const y = inverseScaleY(event.clientY);

      // Validate clicked coordinates are within allowed range (-6..6)
      if (x < SCALE_MIN || x > SCALE_MAX || y < SCALE_MIN || y > SCALE_MAX) {
        notify('Координаты вне допустимого диапазона (-6..6)', 'error');
        return;
      }

      // Устанавливаем значения в скрытые поля и отправляем форму
      // JSF может добавлять префикс формы к ID, поэтому используем более гибкий поиск
      let graphXInput = document.getElementById('coordsForm:graphX') || 
                       form.querySelector('input[id*="graphX"]') ||
                       form.querySelector('input[name*="graphX"]');
      let graphYInput = document.getElementById('coordsForm:graphY') ||
                       form.querySelector('input[id*="graphY"]') ||
                       form.querySelector('input[name*="graphY"]');
      let graphRInput = document.getElementById('coordsForm:graphR') ||
                       form.querySelector('input[id*="graphR"]') ||
                       form.querySelector('input[name*="graphR"]');
      let graphSubmitBtn = document.getElementById('coordsForm:graphSubmit') ||
                          form.querySelector('button[id*="graphSubmit"]') ||
                          form.querySelector('input[type="submit"][id*="graphSubmit"]');

      if (graphXInput && graphYInput && graphRInput && graphSubmitBtn) {
        graphXInput.value = x.toFixed(3);
        graphYInput.value = y.toFixed(3);
        graphRInput.value = rValue;
        
        // Отправляем форму
        graphSubmitBtn.click();
      } else {
        console.error('Graph submit elements not found', {
          graphXInput: !!graphXInput,
          graphYInput: !!graphYInput,
          graphRInput: !!graphRInput,
          graphSubmitBtn: !!graphSubmitBtn
        });
        // Fallback: устанавливаем значения в обычные поля
        if (xInput) {
          xInput.value = x.toFixed(3);
        }
      }
    });
  }
}

// Обновление выбранного R из checkbox'ов
function updateSelectedR() {
  const selectedRValues = getSelectedRValues();
  
  if (selectedRValues.length > 0) {
    // Берем максимальное значение R для отрисовки области
    selectedR = Math.max(...selectedRValues);
    console.log('R changed to:', selectedR, 'from values:', selectedRValues);
  } else {
    selectedR = null;
  }
}

// перерисовка графика
function drawCanvas(){
  if (!canvas || !ctx) {
    console.warn('Canvas or context not available, skipping draw');
    return;
  }
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawAxes();
  drawArea();
  drawPoints();
}

// Инициализация точек из существующей таблицы
function initializePointsFromTable() {
  if (!historyTableBody) return;
  // Пересоздаём массив точек перед инициализацией
  drawnPoints = [];
  const rows = historyTableBody.querySelectorAll('tr.history-item');
  console.debug('initializePointsFromTable: found rows =', rows.length);
  rows.forEach((row, idx) => {
    if (row.cells.length < 6) return;

    const rawX = row.cells[2].textContent.trim();
    const rawY = row.cells[3].textContent.trim();
    const rawR = row.cells[4].textContent.trim();
    const x = parseFloat(rawX);
    const y = parseFloat(rawY);
    const r = parseFloat(rawR);
    const result = row.cells[1].textContent.includes('Попал');

    if (isNaN(x) || isNaN(y) || isNaN(r)) {
      console.warn('initializePointsFromTable: skipping invalid row', idx, { rawX, rawY, rawR });
      return;
    }

    console.debug('initializePointsFromTable: parsed point', { x, y, r, result });

    drawnPoints.push({
      point: { x, y, r },
      result: result
    });
  });

  // Перерисовываем график сразу после инициализации точек
  if (canvas && ctx) drawCanvas();
}

// Очистка точек на графике (при очистке таблицы)
function clearGraphPoints() {
  drawnPoints = [];
  drawCanvas();
}

// Проверка пустой таблицы
function checkEmptyTable() {
  if (!historyTableBody) return;
  
  const rows = historyTableBody.querySelectorAll('tr.history-item');
  const emptyRow = historyTableBody.querySelector('tr.history-empty');

  // Если нет строк с классом history-item
  if (rows.length === 0) {
    // Убедимся, что есть статичная пустая строка
    if (!emptyRow) {
      const row = document.createElement('tr');
      row.className = 'history-empty';
      row.innerHTML = '<td colspan="6" style="text-align: center; padding: 2rem;">История пуста</td>';
      historyTableBody.appendChild(row);
    }
  } else {
    // Если есть реальные записи, удаляем пустую строку
    if (emptyRow) emptyRow.remove();
  }
}

// Форматирование ISO timestamp в локальный человеко-читаемый формат
function formatTimestampIsoToLocale(iso) {
  if (!iso) return iso;
  // Обрежем до миллисекунд, т.к. JS Date поддерживает миллисекунды
  const m = iso.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?/);
  let base = iso;
  if (m) {
    base = m[1];
    if (m[2]) {
      const ms = (m[2] + '000').slice(0,3); // pad/trunc to 3 digits
      base = m[1] + '.' + ms;
    }
  }
  const d = new Date(base);
  if (isNaN(d.getTime())) return iso; // fallback
  return d.toLocaleString();
}

// Выполняем после обновления истории: форматируем время, реинициализируем точки, убираем пустую строку, скроллим
function onHistoryUpdated() {
  historyTableBody = document.querySelector('#history-table-body') || document.querySelector('#history-table tbody');
  const wrapper = document.getElementById('history-table-wrapper') || document.querySelector('.history-table-wrapper');

  if (!historyTableBody) return;

  // Форматируем все временные ячейки (первый столбец)
  const rows = historyTableBody.querySelectorAll('tr.history-item');
  rows.forEach(row => {
    if (row.cells.length >= 1) {
      const cell = row.cells[0];
      const raw = cell.textContent.trim();
      const nice = formatTimestampIsoToLocale(raw);
      if (nice !== raw) cell.textContent = nice;
    }
  });

  // Удаляем пустую строку, если есть реальные записи
  const emptyRow = historyTableBody.querySelector('tr.history-empty');
  if (rows.length > 0 && emptyRow) emptyRow.remove();

  // Переинициализируем точки и перерисуем график
  drawnPoints = [];
  initializePointsFromTable();
  checkEmptyTable();
  if (canvas && ctx) drawCanvas();

  // Прокручиваем историю вниз (если есть wrapper).
  // Если количество строк достигло порога HISTORY_SCROLL_ROWS — прокрутим сразу, иначе даём небольшую задержку
  if (wrapper) {
    try {
      if (rows.length >= HISTORY_SCROLL_ROWS) {
        wrapper.scrollTop = wrapper.scrollHeight;
      } else {
        setTimeout(() => {
          try { wrapper.scrollTop = wrapper.scrollHeight; } catch(e) { console.warn('scroll failed', e); }
        }, 50);
      }
    } catch (e) { console.warn('scroll failed', e); }
  }
}

// Наблюдатель за деревом, чтобы ловить замену history-table-body даже если узел полностью заменён
let historyMutationTimer = null;
const globalObserver = new MutationObserver((mutations) => {
  let changed = false;
  for (const m of mutations) {
    // если добавлен/удален узел, проверим, не коснулось ли это history таблицы
    if (m.addedNodes && m.addedNodes.length > 0) changed = true;
    if (m.removedNodes && m.removedNodes.length > 0) changed = true;
    if (m.type === 'attributes' && (m.target && (m.target.id === 'history-table-body' || m.target.id === 'history-table-wrapper'))) changed = true;
  }
  if (changed) {
    if (historyMutationTimer) clearTimeout(historyMutationTimer);
    historyMutationTimer = setTimeout(() => {
      try { onHistoryUpdated(); } catch(e) { console.error(e); }
    }, 80);
  }
});

// Запускаем глобальный observer на body
if (typeof document !== 'undefined') {
  globalObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
}


document.addEventListener("DOMContentLoaded", () => {
  // Инициализируем DOM элементы
  canvas = document.getElementById('graph');
  if (canvas) {
    ctx = canvas.getContext('2d');
  }
  form = document.getElementById('coordsForm') || document.querySelector('form[id*="coordsForm"]');
  xGroup = document.getElementById('xGroup') || (form ? form.querySelector('[id*="xGroup"]') : null);
  xInput = document.getElementById('xInput') || (form ? form.querySelector('input[id*="xInput"]') : null);
  rGroup = document.getElementById('rGroup') || (form ? form.querySelector('[id*="rGroup"]') : null);
  historyTableBody = document.querySelector('#history-table-body') || document.querySelector('#history-table tbody');
  notificationsContainer = document.getElementById('notifications-container');

  // Настраиваем обработчики событий
  setupEventListeners();

  // Обновляем выбранный R из checkbox'ов
  updateSelectedR();

  // Инициализируем точки из таблицы
  initializePointsFromTable();
  
  // Проверяем пустую таблицу
  checkEmptyTable();

  // Рисуем график только если есть canvas
  if (canvas && ctx) {
    drawCanvas();
  }

  // Ensure history shows header on initial load (scroll to top)
  try {
    const wrapperInit = document.getElementById('history-table-wrapper') || document.querySelector('.history-table-wrapper');
    if (wrapperInit) {
      // small timeout to allow browser layout to settle
      setTimeout(() => { wrapperInit.scrollTop = 0; }, 30);
    }
  } catch (e) { /* ignore */ }

  // Привязываем валидацию к кнопкам Y сразу после инициализации DOM
  attachYButtonsValidation();

  // Устанавливаем placeholder для X через JS (на случай если JSF не поддерживает)
  if (xInput && !xInput.getAttribute('placeholder')) {
    xInput.setAttribute('placeholder', '-3 ... 5');
  }

  // Обработка очистки таблицы - сброс точек на графике
  const clearButton = document.querySelector('button[value*="Очистить"], input[value*="Очистить"]');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      // После очистки таблицы сбрасываем точки на графике
      setTimeout(() => {
        clearGraphPoints();
        checkEmptyTable();
      }, 100);
    });
  }

  // Обновление точек после отправки формы (через MutationObserver)
  if (historyTableBody) {
    const observer = new MutationObserver((mutations) => {
      // Если добавлены новые строки — вызываем onHistoryUpdated для форматирования и прокрутки
      let shouldUpdate = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldUpdate = true;
          break;
        }
      }
      if (shouldUpdate) {
        // Debounce a bit to allow JSF to finish DOM insertion
        setTimeout(() => {
          try { onHistoryUpdated(); } catch(e) { console.error(e); }
        }, 10);
      }
    });

    observer.observe(historyTableBody, {
      childList: true,
      subtree: true
    });
  }

  // Обновление после AJAX запросов JSF
  if (typeof jsf !== 'undefined' && jsf.ajax) {
    jsf.ajax.addOnEvent((data) => {
      if (data.status === 'success') {
        // Попытка применить частичный ответ JSF вручную (на случай, если фреймворк не обновил DOM)
        // Это позволит гарантированно заменить панели, например `history-table-panel` и `jsf-errors-container`.
        try {
          const respXML = data.responseXML || (data.responseText ? (new DOMParser()).parseFromString(data.responseText, 'application/xml') : null);
          if (respXML) {
            applyJsfPartialResponse(respXML);
          }
        } catch (e) {
          console.warn('Failed to apply JSF partial response manually', e);
        }

        // Всегда обновляем выбранные R и перерисовываем график (таблица будет инициализирована MutationObserver-ом)
        setTimeout(() => {
          updateSelectedR();
          drawnPoints = [];
          initializePointsFromTable();
          checkEmptyTable();
          if (canvas && ctx) {
            drawCanvas();
          }
        }, 200);
      }
    });
  }


// Применить части ответа JSF (update элементы) вручную
function applyJsfPartialResponse(responseXML) {
  let updates = responseXML.getElementsByTagName('update');
  // Если пусто, попробуем искать по namespace
  if (!updates || updates.length === 0) {
    try {
      updates = responseXML.getElementsByTagNameNS('*', 'update');
    } catch (e) {
      updates = [];
    }
  }

  for (let i = 0; i < updates.length; i++) {
    const upd = updates[i];
    let id = upd.getAttribute('id');
    if (!id) continue;
    // Содержимое может быть CDATA или текст
    let content = '';
    for (let j = 0; j < upd.childNodes.length; j++) {
      const node = upd.childNodes[j];
      if (node.nodeType === Node.CDATA_SECTION_NODE || node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
        content += node.nodeType === Node.ELEMENT_NODE ? node.outerHTML : node.nodeValue;
      }
    }

    // Попробуем найти элемент по полному id, затем по короткому id (после ':').
    let target = document.getElementById(id) || document.querySelector('[id="' + id.replace(/"/g, '\\"') + '"]');
    if (!target && id.indexOf(':') !== -1) {
      const shortId = id.split(':').pop();
      target = document.getElementById(shortId) || document.querySelector('[id$="' + shortId.replace(/"/g, '\\"') + '"]');
    }

    if (target) {
      // Если сервер отправил контейнер-обёртку (например <span id="history-table-panel">...), то
      // вставим его целиком. Иначе заменим innerHTML.
      const trimmed = content.trim();
      // If the content itself contains a nested partial-response (starts with an XML prolog), try to extract it
      if (trimmed.startsWith('<?xml')) {
        try {
          const innerDoc = (new DOMParser()).parseFromString(trimmed, 'application/xml');
          // If innerDoc looks like a partial-response, apply it recursively
          if (innerDoc.getElementsByTagName('partial-response').length > 0) {
            applyJsfPartialResponse(innerDoc);
            continue;
          }
        } catch (e) {
          console.warn('Failed to parse nested partial-response', e);
        }
      }

      if (trimmed.startsWith('<') && trimmed.indexOf('id=') !== -1) {
        // Создаем временный контейнер и заменяем
        const wrapper = document.createElement('div');
        wrapper.innerHTML = content;
        // Найдем вложенный элемент с тем же id
        const nested = wrapper.querySelector('[id="' + target.id.replace(/"/g, '\\"') + '"]');
        if (nested) {
          try {
            target.replaceWith(nested);
          } catch (e) {
            // Если не получилось заменить (например, target не в том же дереве), просто обновим innerHTML
            target.innerHTML = nested.innerHTML;
          }
        } else {
          // Иначе просто заменяем содержимое
          target.innerHTML = content;
        }
      } else {
        target.innerHTML = content;
      }
    } else {
      console.debug('JSF partial update target not found in DOM:', id);
    }
  }

  // Проверяем наличие тега <error> в partial-response и показываем пользователю сообщение
  try {
    const errors = responseXML.getElementsByTagName('error');
    if (errors && errors.length > 0) {
      for (let i = 0; i < errors.length; i++) {
        const err = errors[i];
        const msgNode = err.getElementsByTagName('error-message')[0];
        const nameNode = err.getElementsByTagName('error-name')[0];
        const errMsg = msgNode ? (msgNode.textContent || msgNode.innerText) : null;
        const errName = nameNode ? (nameNode.textContent || nameNode.innerText) : null;
        const text = (errName ? errName + ': ' : '') + (errMsg || 'Unknown server error');
        notify('Server error: ' + text, 'error', 8000);
        console.error('JSF partial-response error:', text);
      }
    }
  } catch (e) {
    console.warn('Failed to parse partial-response <error> nodes', e);
  }

  // После применения обновлений возможно появились новые кнопки/элементы — обновим ссылки и привяжем валидацию
  // Повторно ищем основные элементы
  form = document.getElementById('coordsForm') || document.querySelector('form[id*="coordsForm"]');
  xGroup = document.getElementById('xGroup') || (form ? form.querySelector('[id*="xGroup"]') : null);
  xInput = document.getElementById('xInput') || (form ? form.querySelector('input[id*="xInput"]') : null);
  rGroup = document.getElementById('rGroup') || (form ? form.querySelector('[id*="rGroup"]') : null);
  historyTableBody = document.querySelector('#history-table-body') || document.querySelector('#history-table tbody');

  // Снова инициализируем observer/точки
  drawnPoints = [];
  initializePointsFromTable();
  checkEmptyTable();
  updateSelectedR();
  attachYButtonsValidation();
}

// Простая система уведомлений (toasts)
function showNotification(message, type = 'error', timeout = 4000) {
  if (!notificationsContainer) {
    notificationsContainer = document.getElementById('notifications-container');
    // If there's no container in the page, create one and append to body so toasts always work
    if (!notificationsContainer && typeof document !== 'undefined') {
      notificationsContainer = document.createElement('div');
      notificationsContainer.id = 'notifications-container';
      document.body.appendChild(notificationsContainer);
    }
    if (!notificationsContainer) return;
  }
  const el = document.createElement('div');
  el.className = 'notification ' + type;
  el.textContent = message;
  notificationsContainer.appendChild(el);
  // Анимированное появление
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, timeout);
}

// Валидация при нажатии на кнопки Y — блокируем отправку, если X некорректен или R не выбран
function attachYButtonsValidation() {
  const yButtonsContainer = document.querySelector('.y-buttons');
  if (!yButtonsContainer) return;
  const buttons = yButtonsContainer.querySelectorAll('button, input[type="submit"], input[type="button"]');
  buttons.forEach(btn => {
    // Avoid binding the same handler multiple times
    if (btn.dataset.validationBound === 'true') return;
    btn.dataset.validationBound = 'true';

    btn.addEventListener('click', (e) => {
      // Получаем значения
      const xVal = xInput ? xInput.value.trim() : '';
      const selectedRValues = getSelectedRValues();

      // Проверяем R
      if (!selectedRValues || selectedRValues.length === 0) {
        e.preventDefault();
        e.stopPropagation();
        notify('Сначала выберите хотя бы одно значение R', 'error');
        return false;
      }

      // Проверяем X
      if (!xVal) {
        e.preventDefault();
        e.stopPropagation();
        notify('Введите значение X перед отправкой', 'error');
        if (xInput) xInput.classList.add('invalid');
        return false;
      }
      const x = parseFloat(xVal.replace(',', '.'));
      if (isNaN(x) || x < -3 || x > 5) {
        e.preventDefault();
        e.stopPropagation();
        notify('Неверное значение X — допустимо от -3 до 5', 'error');
        if (xInput) xInput.classList.add('invalid');
        return false;
      }

      // Если всё ок — позволяем отправку
      return true;
    }, { capture: true });
  });
}

  // Также обновляем после загрузки страницы (на случай если форма была отправлена)
  window.addEventListener('load', () => {
    setTimeout(() => {
      drawnPoints = [];
      initializePointsFromTable();
      checkEmptyTable();
      updateSelectedR();
      if (canvas && ctx) {
        drawCanvas();
      }
      // Привязываем валидацию к кнопкам Y (и обновляем после возможного рендера)
      attachYButtonsValidation();
    }, 200);
  });
});

