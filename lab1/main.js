// получение элементов страницы
const canvas = document.getElementById('graph-canvas');
const ctx = canvas.getContext('2d');
const form = document.getElementById('coords-form');
const errorY = document.getElementById('error-y');
const tableBody = document.getElementById('results-table-body');

// хранение ТОЛЬКО ПОСЛЕДНЕЙ проверенной точки (null, пока форма не отправлена)
let currentPoint = null;

//попадание точки в область
function isPointInArea(x, y, r) {
    // 1-я четверть: прямоугольный треугольник (x + y <= R/2)
    if (x >= 0 && y >= 0 && (x + y <= r / 2)) {
        return true;
    }
    // 2-я четверть: прямоугольник (-R/2 <= x <= 0 и 0 <= y <= R)
    if (x <= 0 && x >= -r / 2 && y >= 0 && y <= r) {
        return true;
    }
    // 4-я четверть: четверть круга радиусом R/2 (x^2 + y^2 <= (R/2)^2)
    if (x >= 0 && y <= 0 && (x * x + y * y <= (r / 2) * (r / 2))) {
        return true;
    }
    // 3-я четверть: промах
    return false;
}

//LocalStorage для сохранения истории проверок в таблице
function loadHistory() {
    return JSON.parse(localStorage.getItem('lab1_points')) || [];
}

function savePointToStorage(point) {
    const list = loadHistory();
    list.push(point);
    localStorage.setItem('lab1_points', JSON.stringify(list));
}

//дата и время с учетом часового пояса устройства и русской локализации
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

//Результаты в таблице
function renderTable() {
    const points = loadHistory();
    tableBody.innerHTML = '';
    points.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.x}</td>
            <td>${item.y}</td>
            <td>${item.r}</td>
            <td class="${item.hit ? 'hit' : 'miss'}">${item.hit ? 'Да' : 'Нет'}</td>
            <td>${formatDateTime(item.time)}</td>
        `;
        // новые записи сверху
        tableBody.prepend(tr);
    });
}

//Canvas
function drawCanvas() {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 110; // в пикселях

    // очимтка холста
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#3182ce';

    // 2-я четверть: прямоугольник
    ctx.fillRect(cx - scale / 2, cy - scale, scale / 2, scale);

    // 1-я четверть: треугольник
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + scale / 2, cy);
    ctx.lineTo(cx, cy - scale / 2);
    ctx.closePath();
    ctx.fill();

    // 4-я четверть: сектор круга
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, scale / 2, 0, Math.PI / 2, false);
    ctx.fill();

    //оси координат
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;

    // ось X 
    ctx.beginPath();
    ctx.moveTo(10, cy);
    ctx.lineTo(w - 10, cy);
    ctx.lineTo(w - 20, cy - 4);
    ctx.moveTo(w - 10, cy);
    ctx.lineTo(w - 20, cy + 4);
    ctx.stroke();

    // ось Y 
    ctx.beginPath();
    ctx.moveTo(cx, h - 10);
    ctx.lineTo(cx, 10);
    ctx.lineTo(cx - 4, 20);
    ctx.moveTo(cx, 10);
    ctx.lineTo(cx + 4, 20);
    ctx.stroke();

    //подписи засечек и осей
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    drawTick(cx - scale, cy, "-R", true);
    drawTick(cx - scale / 2, cy, "-R/2", true);
    drawTick(cx + scale / 2, cy, "R/2", true);
    drawTick(cx + scale, cy, "R", true);

    drawTick(cx, cy - scale, "R", false);
    drawTick(cx, cy - scale / 2, "R/2", false);
    drawTick(cx, cy + scale / 2, "-R/2", false);
    drawTick(cx, cy + scale, "-R", false);

    ctx.fillText("x", w - 10, cy - 14);
    ctx.fillText("y", cx + 14, 10);

    // точка (если она была отправлена)
    if (currentPoint) {
        const px = cx + (currentPoint.x / currentPoint.r) * scale;
        const py = cy - (currentPoint.y / currentPoint.r) * scale;

        ctx.beginPath();
        ctx.arc(px, py, 5, 0, 2 * Math.PI);
        ctx.fillStyle = currentPoint.hit ? '#28a745' : '#dc3545';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// вспомогательная функция засечки
function drawTick(x, y, label, isAxisX) {
    ctx.beginPath();
    if (isAxisX) {
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x, y + 3);
        ctx.fillText(label, x, y + 16);
    } else {
        ctx.moveTo(x - 3, y);
        ctx.lineTo(x + 3, y);
        ctx.fillText(label, x + 20, y);
    }
    ctx.stroke();
}

//валидация введенных данных
function validateY(textValue) {
    if (textValue.trim() === '') {
        return 'Введите значение Y!';
    }
    const num = Number(textValue.replace(',', '.'));
    if (isNaN(num)) {
        return 'Координата Y должна быть числом (буквы недопустимы)!';
    }
    if (num <= -3 || num >= 3) {
        return 'Значение Y должно быть в интервале (-3 ... 3)!';
    }
    return null;
}

// получение значения radio
function getRadioValue(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? parseFloat(checked.value) : null;
}

//точки определяются на основе данных формы, факт попадания вычисляется в момент отправки
form.addEventListener('submit', function (event) {
    event.preventDefault();

    const x = getRadioValue('x-val');
    const r = getRadioValue('r-val');
    const yRaw = document.getElementById('y-input').value;

    const error = validateY(yRaw);
    if (error) {
        errorY.innerText = error;
        return;
    }

    errorY.innerText = '';
    const y = parseFloat(yRaw.replace(',', '.'));

    // блокировка некорректного радиуса
    if (r <= 0) {
        errorY.innerText = 'Радиус R должен быть положительным!';
        return;
    }

    // вычисление попадания
    const hit = isPointInArea(x, y, r);

    // точка для канвы
    currentPoint = {
        x: x,
        y: y,
        r: r,
        hit: hit
    };

    // запись для LocalStorage и таблицы
    const record = {
        x: x,
        y: y,
        r: r,
        hit: hit,
        time: Date.now()
    };

    savePointToStorage(record);
    renderTable(); // обновление истории в таблице
    drawCanvas();  // отображение отправленной точки на графике
});

// первичная загрузка страницы
window.addEventListener('load', function () {
    drawCanvas();  //чистый график
    renderTable(); // загрузка истории в таблицу из LocalStorage
});

//очистка для себя
const clearBtn = document.getElementById('clear-btn');

// "Очистить историю"
clearBtn.addEventListener('click', function () {
    // удаляем точки из LocalStorage браузера
    localStorage.removeItem('lab1_points');
    // сбрасываем текущую очку на Canvas
    currentPoint = null;
    // очищаем строчки в таблице результатов
    tableBody.innerHTML = '';
    // очищаем текстовое поле ввода Y
    document.getElementById('y-input').value = '';
    // очищаем текст ошибки под полем Y (если он был)
    errorY.innerText = '';
    // перерисовка Canvas 
    drawCanvas();
});