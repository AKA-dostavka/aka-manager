if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    const user = tg.initDataUnsafe?.user;
    if (user && document.getElementById('user')) {
        document.getElementById('user').textContent = '👋 Здравствуйте, ' + (user.first_name || 'менеджер') + '!';
    }
}

let currentFilter = 'all';

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(function(s) {
        s.classList.remove('active');
    });
    const el = document.getElementById('screen-' + name);
    if (el) {
        el.classList.add('active');
        window.scrollTo(0, 0);
    }
    if (name === 'orders') renderOrders();
    if (name === 'couriers') renderCouriers();
    if (name === 'shops') renderShops();
    if (name === 'fines') renderFines();
    if (name === 'report') renderReport();
    updateMainStats();
}

function getOrders() {
    const raw = localStorage.getItem('managerOrders');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch (e) { return []; }
}

function getCouriers() {
    const raw = localStorage.getItem('managerCouriers');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch (e) { return []; }
}

function saveCouriers(list) {
    localStorage.setItem('managerCouriers', JSON.stringify(list));
}

function getShops() {
    const raw = localStorage.getItem('managerShops');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch (e) { return []; }
}

function getFines() {
    const raw = localStorage.getItem('managerFines');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch (e) { return []; }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateMainStats() {
    const orders = getOrders();
    const newCnt = orders.filter(function(o) { return o.status === 'Новый'; }).length;
    const activeCnt = orders.filter(function(o) {
        return o.status === 'Назначен курьеру' || o.status === 'Курьер забрал' || o.status === 'В пути';
    }).length;
    const doneCnt = orders.filter(function(o) { return o.status === 'Доставлен'; }).length;

    const sNew = document.getElementById('stat-new');
    const sActive = document.getElementById('stat-active');
    const sDone = document.getElementById('stat-done');
    if (sNew) sNew.textContent = newCnt;
    if (sActive) sActive.textContent = activeCnt;
    if (sDone) sDone.textContent = doneCnt;

    const badge = document.getElementById('orders-count');
    if (badge) badge.textContent = orders.length > 0 ? orders.length : '';

    const couriers = getCouriers();
    const cBadge = document.getElementById('couriers-count');
    if (cBadge) {
        const pending = couriers.filter(function(c) { return c.status === 'На проверке'; }).length;
        cBadge.textContent = pending > 0 ? pending : '';
    }
}

function setFilter(f) {
    currentFilter = f;
    document.querySelectorAll('.filter-btn').forEach(function(b) {
        b.classList.remove('active');
    });
    document.querySelector('.filter-btn[data-filter="' + f + '"]').classList.add('active');
    renderOrders();
}

function statusBadge(status) {
    if (status === 'Новый') return '<span class="badge-status new">🟡 Новый</span>';
    if (status === 'Назначен курьеру') return '<span class="badge-status accepted">🔵 Назначен</span>';
    if (status === 'Курьер забрал') return '<span class="badge-status accepted">🟠 Забрал</span>';
    if (status === 'В пути') return '<span class="badge-status accepted">🚗 В пути</span>';
    if (status === 'Доставлен') return '<span class="badge-status done">🟢 Доставлен</span>';
    if (status === 'Отменён') return '<span class="badge-status cancelled">🔴 Отменён</span>';
    return '<span class="badge-status new">' + escapeHtml(status) + '</span>';
}

function renderOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    const all = getOrders();
    let orders = all;
    if (currentFilter === 'new') {
        orders = all.filter(function(o) { return o.status === 'Новый'; });
    } else if (currentFilter === 'active') {
        orders = all.filter(function(o) {
            return o.status === 'Назначен курьеру' || o.status === 'Курьер забрал' || o.status === 'В пути';
        });
    } else if (currentFilter === 'done') {
        orders = all.filter(function(o) { return o.status === 'Доставлен'; });
    }

    if (orders.length === 0) {
        container.innerHTML = '<div class="stub"><div class="stub-icon">📦</div><div class="stub-text">Заказов нет</div><div class="stub-hint">Здесь будут заказы магазинов</div></div>';
        return;
    }

    let html = '';
    for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        const mark = o.urgent ? ' <span class="badge-urgent">🚀 СРОЧНО</span>' : '';
        let cls = 'order-card';
        if (o.urgent) cls += ' urgent';
        if (o.status === 'Доставлен') cls += ' done';
        if (o.status === 'Отменён') cls += ' cancelled';

        html += '<div class="' + cls + '">';
        html += '<div class="order-head">📦 Заказ №' + escapeHtml(String(o.id).slice(-4)) + mark + '</div>';
        if (o.shop) html += '<div class="order-row">🏪 ' + escapeHtml(o.shop) + '</div>';
        html += '<div class="order-row">📍 ' + escapeHtml(o.address) + '</div>';
        html += '<div class="order-row">📞 ' + escapeHtml(o.phone) + '</div>';
        html += '<div class="order-row">💰 <b>' + escapeHtml(o.amount) + ' смн</b></div>';
        if (o.courier) html += '<div class="order-row">🚚 ' + escapeHtml(o.courier) + '</div>';
        html += '<div class="order-foot"><span>' + escapeHtml(o.created || '') + '</span>' + statusBadge(o.status) + '</div>';

        if (o.status === 'Новый') {
            const freeCouriers = getCouriers().filter(function(c) { return c.status === 'Свободен'; });
            if (freeCouriers.length > 0) {
                html += '<div class="order-actions">';
                for (let k = 0; k < freeCouriers.length; k++) {
                    html += '<button class="btn-assign" onclick="assignCourier(' + o.id + ',' + freeCouriers[k].id + ')">👤 ' + escapeHtml(freeCouriers[k].name) + '</button>';
                }
                html += '</div>';
            }
        }
        html += '</div>';
    }
    container.innerHTML = html;
}

function assignCourier(orderId, courierId) {
    const orders = getOrders();
    const couriers = getCouriers();
    const courier = couriers.find(function(c) { return c.id === courierId; });
    if (!courier) return;

    for (let i = 0; i < orders.length; i++) {
        if (orders[i].id === orderId) {
            orders[i].status = 'Назначен курьеру';
            orders[i].courier = courier.name;
            orders[i].courierId = courierId;
            break;
        }
    }
    localStorage.setItem('managerOrders', JSON.stringify(orders));
    renderOrders();
    updateMainStats();
    alert('✅ Заказ назначен курьеру ' + courier.name);
}

function renderCouriers() {
    const container = document.getElementById('couriers-list');
    if (!container) return;

    const couriers = getCouriers();
    if (couriers.length === 0) {
        container.innerHTML = '<div class="stub"><div class="stub-icon">🚚</div><div class="stub-text">Курьеров нет</div><div class="stub-hint">Здесь будут курьеры, зарегистрированные в боте</div></div>';
        return;
    }

    let html = '';
    for (let i = 0; i < couriers.length; i++) {
        const c = couriers[i];
        html += '<div class="card">';
        html += '<div class="order-head">👤 ' + escapeHtml(c.name) + '</div>';
        html += '<div class="order-row">📞 ' + escapeHtml(c.phone || '—') + '</div>';
        html += '<div class="order-row">Статус: <b>' + escapeHtml(c.status) + '</b></div>';
        if (c.fine) html += '<div class="order-row">⚠️ Штраф: ' + c.fine + ' смн</div>';
        html += '<div class="card-actions">';
        if (c.status === 'На проверке') {
            html += '<button class="btn-approve" onclick="approveCourier(' + c.id + ')">✅ Подтвердить</button>';
            html += '<button class="btn-block" onclick="blockCourier(' + c.id + ')">❌ Отклонить</button>';
        } else if (c.status === 'Заблокирован') {
            html += '<button class="btn-approve" onclick="unblockCourier(' + c.id + ')">🔄 Разблокировать</button>';
        } else {
            html += '<button class="btn-fine" onclick="fineCourier(' + c.id + ')">⚠️ Оштрафовать</button>';
            html += '<button class="btn-block" onclick="blockCourier(' + c.id + ')">🚫 Заблокировать</button>';
        }
        html += '</div>';
        html += '</div>';
    }
    container.innerHTML = html;
}

function approveCourier(id) {
    const couriers = getCouriers();
    for (let i = 0; i < couriers.length; i++) {
        if (couriers[i].id === id) { couriers[i].status = 'Свободен'; break; }
    }
    saveCouriers(couriers);
    renderCouriers();
    updateMainStats();
}

function blockCourier(id) {
    if (!confirm('Заблокировать курьера?')) return;
    const couriers = getCouriers();
    for (let i = 0; i < couriers.length; i++) {
        if (couriers[i].id === id) { couriers[i].status = 'Заблокирован'; break; }
    }
    saveCouriers(couriers);
    renderCouriers();
    updateMainStats();
}

function unblockCourier(id) {
    const couriers = getCouriers();
    for (let i = 0; i < couriers.length; i++) {
        if (couriers[i].id === id) { couriers[i].status = 'Свободен'; break; }
    }
    saveCouriers(couriers);
    renderCouriers();
    updateMainStats();
}

function fineCourier(id) {
    const sum = prompt('Сумма штрафа (смн):', '1000');
    if (!sum || isNaN(parseInt(sum))) return;
    const reason = prompt('Причина штрафа:', 'Увёл магазин');
    if (!reason) return;

    const couriers = getCouriers();
    let courierName = '';
    for (let i = 0; i < couriers.length; i++) {
        if (couriers[i].id === id) {
            couriers[i].fine = (couriers[i].fine || 0) + parseInt(sum);
            courierName = couriers[i].name;
            break;
        }
    }
    saveCouriers(couriers);

    const fines = getFines();
    fines.unshift({
        id: Date.now(),
        courierId: id,
        courierName: courierName,
        amount: parseInt(sum),
        reason: reason,
        created: new Date().toLocaleString('ru-RU')
    });
    localStorage.setItem('managerFines', JSON.stringify(fines));

    renderCouriers();
    alert('✅ Штраф ' + sum + ' смн наложен на ' + courierName);
}

function renderShops() {
    const container = document.getElementById('shops-list');
    if (!container) return;
    const shops = getShops();
    if (shops.length === 0) {
        container.innerHTML = '<div class="stub"><div class="stub-icon">🏪</div><div class="stub-text">Магазинов нет</div><div class="stub-hint">Здесь будут магазины, зарегистрированные в боте</div></div>';
        return;
    }
    let html = '';
    for (let i = 0; i < shops.length; i++) {
        const s = shops[i];
        html += '<div class="card">';
        html += '<div class="order-head">🏪 ' + escapeHtml(s.name) + '</div>';
        html += '<div class="order-row">📞 ' + escapeHtml(s.phone || '—') + '</div>';
        html += '<div class="order-row">📍 ' + escapeHtml(s.address || '—') + '</div>';
        html += '</div>';
    }
    container.innerHTML = html;
}

function renderFines() {
    const container = document.getElementById('fines-list');
    if (!container) return;
    const fines = getFines();
    if (fines.length === 0) {
        container.innerHTML = '<div class="stub"><div class="stub-icon">⚠️</div><div class="stub-text">Штрафов нет</div><div class="stub-hint">Здесь будут штрафы курьеров</div></div>';
        return;
    }
    let html = '';
    for (let i = 0; i < fines.length; i++) {
        const f = fines[i];
        html += '<div class="card">';
        html += '<div class="order-head">⚠️ ' + escapeHtml(f.courierName) + '</div>';
        html += '<div class="order-row">💰 <b>' + f.amount + ' смн</b></div>';
        html += '<div class="order-row">📝 ' + escapeHtml(f.reason) + '</div>';
        html += '<div class="order-foot"><span>' + escapeHtml(f.created) + '</span></div>';
        html += '</div>';
    }
    container.innerHTML = html;
}

function renderReport() {
    const container = document.getElementById('report-content');
    if (!container) return;

    const orders = getOrders();
    const today = new Date().toLocaleDateString('ru-RU');

    let total = orders.length;
    let delivered = 0, cancelled = 0, active = 0;
    let cash = 0;

    for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        if (o.status === 'Доставлен') {
            delivered++;
            const r = parseInt(o.received || o.amount || 0);
            if (!isNaN(r)) cash += r;
        } else if (o.status === 'Отменён') {
            cancelled++;
        } else {
            active++;
        }
    }

    let html = '<h3>📊 Отчёт за сегодня</h3>';
    html += '<div class="report-row"><span>📅 Дата</span><b>' + today + '</b></div>';
    html += '<div class="report-row"><span>📥 Всего заказов</span><b>' + total + '</b></div>';
    html += '<div class="report-row"><span>✅ Доставлено</span><b>' + delivered + '</b></div>';
    html += '<div class="report-row"><span>🔄 В работе</span><b>' + active + '</b></div>';
    html += '<div class="report-row"><span>❌ Отменено</span><b>' + cancelled + '</b></div>';
    html += '<div class="report-row total"><span>💰 Собрано</span><b>' + cash + ' смн</b></div>';
    container.innerHTML = html;
}

function addDemoData() {
    if (getOrders().length === 0) {
        const demo = [
            { id: 1700000000001, shop: 'Магазин Айни', address: 'ул. Айни 5', phone: '900000000', amount: '150', status: 'Новый', urgent: false, created: new Date().toLocaleString('ru-RU') },
            { id: 1700000000002, shop: 'Chronos.tj', address: 'Караболо 10', phone: '911111111', amount: '200', status: 'Назначен курьеру', courier: 'Бахтиер', urgent: true, created: new Date().toLocaleString('ru-RU') },
            { id: 1700000000003, shop: 'Магазин Айни', address: 'Рудаки 25', phone: '922222222', amount: '300', status: 'Доставлен', courier: 'Оят', received: '300', urgent: false, created: new Date().toLocaleString('ru-RU') }
        ];
        localStorage.setItem('managerOrders', JSON.stringify(demo));
    }

    if (getCouriers().length === 0) {
        const demo = [
            { id: 1, name: 'Бахтиер', phone: '+992 900 11 11 11', status: 'Свободен' },
            { id: 2, name: 'Оят', phone: '+992 900 22 22 22', status: 'На проверке' },
            { id: 3, name: 'Дашкеджон', phone: '+992 900 33 33 33', status: 'Заблокирован' }
        ];
        localStorage.setItem('managerCouriers', JSON.stringify(demo));
    }

    if (getShops().length === 0) {
        const demo = [
            { id: 1, name: 'Магазин Айни', phone: '+992 900 11 11 11', address: 'ул. Рудаки 25' },
            { id: 2, name: 'Chronos.tj', phone: '+992 907 83 47 47', address: '102 мкр' }
        ];
        localStorage.setItem('managerShops', JSON.stringify(demo));
    }
}
addDemoData();

updateMainStats();
