const STORAGE_KEY = 'taccuinoContabile.v1';

let state = {
    currentPageId: null,
    pages: []
};

let editorState = {
    mode: 'create',
    itemId: null,
    type: 'analisi'
};

function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function createDefaultPage(name) {
    return {
        id: uid('page'),
        title: name || 'Nuova pagina',
        items: []
    };
}

function defaultDataByType(type) {
    if (type === 'analisi') {
        return {
            eLato: 'E',
            eDescrizione: '+ Denaro',
            eVariazione: 'Vf+',
            eImporto: '',
            uLato: 'U',
            uDescrizione: '+ Debiti di finanziamento (v/banche)',
            uVariazione: 'Vf-',
            uImporto: '',
            sf: 'S.F.',
            se: 'S.E.'
        };
    }
    if (type === 'mastrino') {
        return {
            conto: '',
            dare: '',
            avere: '',
            saldo: '',
            stato: 'APERTO'
        };
    }
    if (type === 'mastro') {
        return {
            conto: '',
            totaleDare: '',
            totaleAvere: '',
            saldo: ''
        };
    }
    if (type === 'giornale') {
        return {
            data: new Date().toLocaleDateString('it-IT'),
            conto: '',
            analisi: 'VFA',
            dare: '',
            avere: '',
            descrizione: ''
        };
    }
    return {
        titolo: '',
        commenti: ''
    };
}

function typeLabel(type) {
    const map = {
        analisi: 'Analisi Variazioni',
        mastrino: 'Mastrino',
        mastro: 'Libro Mastro',
        giornale: 'Libro Giornale',
        note: 'Note/Commenti/Titolo'
    };
    return map[type] || type;
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.pages) || !parsed.pages.length) return false;
        state = parsed;
        if (!state.currentPageId || !state.pages.some((p) => p.id === state.currentPageId)) {
            state.currentPageId = state.pages[0].id;
        }
        return true;
    } catch (err) {
        console.warn('Impossibile leggere il taccuino salvato.', err);
        return false;
    }
}

function ensureInitialState() {
    if (!loadState()) {
        const firstPage = createDefaultPage('Pagina 1');
        state.pages = [firstPage];
        state.currentPageId = firstPage.id;
        saveState();
    }
}

function getCurrentPage() {
    return state.pages.find((p) => p.id === state.currentPageId) || state.pages[0];
}

function setCurrentPage(pageId) {
    if (!state.pages.some((p) => p.id === pageId)) return;
    state.currentPageId = pageId;
    saveState();
    renderAll();
}

function moveInArray(arr, from, to) {
    if (to < 0 || to >= arr.length) return;
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
}

function addPage() {
    const name = prompt('Titolo nuova pagina:', `Pagina ${state.pages.length + 1}`);
    if (name === null) return;
    const page = createDefaultPage((name || '').trim() || `Pagina ${state.pages.length + 1}`);
    state.pages.push(page);
    state.currentPageId = page.id;
    saveState();
    renderAll();
}

function renameCurrentPage() {
    const page = getCurrentPage();
    if (!page) return;
    const name = prompt('Nuovo titolo pagina:', page.title);
    if (name === null) return;
    page.title = (name || '').trim() || page.title;
    saveState();
    renderAll();
}

function deletePage(pageId) {
    if (state.pages.length === 1) {
        alert('Serve almeno una pagina nel taccuino.');
        return;
    }
    const ok = confirm('Confermi la cancellazione della pagina?');
    if (!ok) return;
    state.pages = state.pages.filter((p) => p.id !== pageId);
    if (!state.pages.some((p) => p.id === state.currentPageId)) {
        state.currentPageId = state.pages[0].id;
    }
    saveState();
    renderAll();
}

function movePage(pageId, dir) {
    const idx = state.pages.findIndex((p) => p.id === pageId);
    if (idx < 0) return;
    moveInArray(state.pages, idx, idx + dir);
    saveState();
    renderAll();
}

function renderPagesList() {
    const page = getCurrentPage();
    const box = document.getElementById('pagesList');

    box.innerHTML = state.pages.map((p) => `
        <div class="page-item ${p.id === page.id ? 'active' : ''}">
            <div class="page-title" data-action="select-page" data-id="${p.id}">${escapeHtml(p.title)}</div>
            <div class="muted">${p.items.length} oggetti</div>
            <div class="row-actions">
                <button class="btn btn-soft mini" data-action="page-up" data-id="${p.id}">Su</button>
                <button class="btn btn-soft mini" data-action="page-down" data-id="${p.id}">Giu</button>
                <button class="btn btn-danger mini" data-action="page-delete" data-id="${p.id}">Elimina</button>
            </div>
        </div>
    `).join('');
}

function renderMain() {
    const page = getCurrentPage();
    document.getElementById('currentPageTitle').textContent = page.title;
    const items = document.getElementById('items');

    if (!page.items.length) {
        items.innerHTML = '<div class="empty">Nessun oggetto ancora in pagina. Clicca New per iniziare.</div>';
        return;
    }

    items.innerHTML = page.items.map((item, idx) => `
        <article class="item">
            <div class="item-head">
                <div>
                    <span class="tag">${escapeHtml(typeLabel(item.type))}</span>
                </div>
                <div class="row-actions">
                    <button class="btn btn-soft mini" data-action="item-up" data-id="${item.id}">Su</button>
                    <button class="btn btn-soft mini" data-action="item-down" data-id="${item.id}">Giu</button>
                    <button class="btn btn-soft mini" data-action="item-edit" data-id="${item.id}">Modifica</button>
                    <button class="btn btn-danger mini" data-action="item-delete" data-id="${item.id}">Elimina</button>
                </div>
            </div>
            <div class="item-body">${renderItemBody(item, idx)}</div>
        </article>
    `).join('');
}

function renderItemBody(item) {
    const d = item.data || {};
    if (item.type === 'analisi') {
        return [
            `<div class="kv"><strong>${escapeHtml(d.eLato || 'E')}</strong>: ${escapeHtml(d.eDescrizione || '')} | ${escapeHtml(d.eVariazione || '')} | ${escapeHtml(d.eImporto || '-')}</div>`,
            `<div class="kv"><strong>${escapeHtml(d.uLato || 'U')}</strong>: ${escapeHtml(d.uDescrizione || '')} | ${escapeHtml(d.uVariazione || '')} | ${escapeHtml(d.uImporto || '-')}</div>`,
            `<div class="kv"><strong>${escapeHtml(d.sf || 'S.F.')}</strong> / <strong>${escapeHtml(d.se || 'S.E.')}</strong></div>`
        ].join('');
    }
    if (item.type === 'mastrino') {
        return [
            `<div class="kv"><strong>Conto</strong>: ${escapeHtml(d.conto || '-')}</div>`,
            `<div class="kv">Dare: ${escapeHtml(d.dare || '-')} | Avere: ${escapeHtml(d.avere || '-')}</div>`,
            `<div class="kv">Saldo: ${escapeHtml(d.saldo || '-')} | Stato: ${escapeHtml(d.stato || '-')}</div>`
        ].join('');
    }
    if (item.type === 'mastro') {
        return [
            `<div class="kv"><strong>Conto</strong>: ${escapeHtml(d.conto || '-')}</div>`,
            `<div class="kv">Totale Dare: ${escapeHtml(d.totaleDare || '-')}</div>`,
            `<div class="kv">Totale Avere: ${escapeHtml(d.totaleAvere || '-')}</div>`,
            `<div class="kv">Saldo: ${escapeHtml(d.saldo || '-')}</div>`
        ].join('');
    }
    if (item.type === 'giornale') {
        return [
            `<div class="kv"><strong>Data</strong>: ${escapeHtml(d.data || '-')}</div>`,
            `<div class="kv"><strong>Conto</strong>: ${escapeHtml(d.conto || '-')} | Analisi: ${escapeHtml(d.analisi || '-')}</div>`,
            `<div class="kv">Dare: ${escapeHtml(d.dare || '-')} | Avere: ${escapeHtml(d.avere || '-')}</div>`,
            `<div class="kv">${escapeHtml(d.descrizione || '')}</div>`
        ].join('');
    }
    return [
        `<div class="kv"><strong>${escapeHtml(d.titolo || 'Nota')}</strong></div>`,
        `<div class="kv">${escapeHtml(d.commenti || '')}</div>`
    ].join('');
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function openItemEditor(mode, type, itemId) {
    editorState = { mode, type, itemId: itemId || null };

    const page = getCurrentPage();
    const existing = itemId ? page.items.find((x) => x.id === itemId) : null;
    const data = existing ? existing.data : defaultDataByType(type);

    document.getElementById('modalTitle').textContent = mode === 'edit'
        ? `Modifica ${typeLabel(type)}`
        : `Nuovo ${typeLabel(type)}`;

    document.getElementById('modalForm').innerHTML = buildTypeForm(type, data);
    document.getElementById('overlay').classList.add('open');
}

function closeItemEditor() {
    document.getElementById('overlay').classList.remove('open');
}

function buildTypeForm(type, data) {
    if (type === 'analisi') {
        return `
            <div class="grid">
                <div><label>Lato sinistra</label><input name="eLato" value="${escapeHtml(data.eLato)}"></div>
                <div><label>Descrizione sinistra</label><input name="eDescrizione" value="${escapeHtml(data.eDescrizione)}"></div>
                <div><label>Variazione sinistra</label><input name="eVariazione" value="${escapeHtml(data.eVariazione)}"></div>
                <div><label>Importo sinistra</label><input name="eImporto" value="${escapeHtml(data.eImporto)}" placeholder="150.000EUR"></div>
                <div><label>Lato destra</label><input name="uLato" value="${escapeHtml(data.uLato)}"></div>
                <div><label>Descrizione destra</label><input name="uDescrizione" value="${escapeHtml(data.uDescrizione)}"></div>
                <div><label>Variazione destra</label><input name="uVariazione" value="${escapeHtml(data.uVariazione)}"></div>
                <div><label>Importo destra</label><input name="uImporto" value="${escapeHtml(data.uImporto)}" placeholder="150.000EUR"></div>
                <div><label>Etichetta finale 1</label><input name="sf" value="${escapeHtml(data.sf)}"></div>
                <div><label>Etichetta finale 2</label><input name="se" value="${escapeHtml(data.se)}"></div>
            </div>
        `;
    }

    if (type === 'mastrino') {
        return `
            <div class="grid">
                <div><label>Conto</label><input name="conto" value="${escapeHtml(data.conto)}"></div>
                <div><label>Dare</label><input name="dare" value="${escapeHtml(data.dare)}"></div>
                <div><label>Avere</label><input name="avere" value="${escapeHtml(data.avere)}"></div>
                <div><label>Saldo</label><input name="saldo" value="${escapeHtml(data.saldo)}"></div>
                <div><label>Stato</label>
                    <select name="stato">
                        <option value="APERTO" ${data.stato === 'APERTO' ? 'selected' : ''}>APERTO</option>
                        <option value="CHIUSO" ${data.stato === 'CHIUSO' ? 'selected' : ''}>CHIUSO</option>
                    </select>
                </div>
            </div>
        `;
    }

    if (type === 'mastro') {
        return `
            <div class="grid">
                <div><label>Conto</label><input name="conto" value="${escapeHtml(data.conto)}"></div>
                <div><label>Totale Dare</label><input name="totaleDare" value="${escapeHtml(data.totaleDare)}"></div>
                <div><label>Totale Avere</label><input name="totaleAvere" value="${escapeHtml(data.totaleAvere)}"></div>
                <div><label>Saldo</label><input name="saldo" value="${escapeHtml(data.saldo)}"></div>
            </div>
        `;
    }

    if (type === 'giornale') {
        return `
            <div class="grid">
                <div><label>Data</label><input name="data" value="${escapeHtml(data.data)}"></div>
                <div><label>Conto</label><input name="conto" value="${escapeHtml(data.conto)}"></div>
                <div><label>Analisi</label>
                    <select name="analisi">
                        <option value="VFA" ${data.analisi === 'VFA' ? 'selected' : ''}>VFA</option>
                        <option value="VFP" ${data.analisi === 'VFP' ? 'selected' : ''}>VFP</option>
                        <option value="VEN" ${data.analisi === 'VEN' ? 'selected' : ''}>VEN</option>
                        <option value="VEP" ${data.analisi === 'VEP' ? 'selected' : ''}>VEP</option>
                    </select>
                </div>
                <div><label>Dare</label><input name="dare" value="${escapeHtml(data.dare)}"></div>
                <div><label>Avere</label><input name="avere" value="${escapeHtml(data.avere)}"></div>
                <div style="grid-column: 1 / -1;"><label>Descrizione</label><textarea name="descrizione">${escapeHtml(data.descrizione)}</textarea></div>
            </div>
        `;
    }

    return `
        <div class="grid">
            <div><label>Titolo nota</label><input name="titolo" value="${escapeHtml(data.titolo)}"></div>
            <div style="grid-column: 1 / -1;"><label>Commenti</label><textarea name="commenti">${escapeHtml(data.commenti)}</textarea></div>
        </div>
    `;
}

function collectFormData(type) {
    const form = document.getElementById('modalForm');
    const out = {};
    form.querySelectorAll('input, select, textarea').forEach((field) => {
        out[field.name] = field.value;
    });

    if (type === 'mastrino') {
        const dare = Number(out.dare || 0);
        const avere = Number(out.avere || 0);
        if (!out.saldo && (Number.isFinite(dare) || Number.isFinite(avere))) {
            out.saldo = (dare - avere).toFixed(2);
        }
    }

    if (type === 'mastro') {
        const dare = Number(out.totaleDare || 0);
        const avere = Number(out.totaleAvere || 0);
        if (!out.saldo && (Number.isFinite(dare) || Number.isFinite(avere))) {
            out.saldo = (dare - avere).toFixed(2);
        }
    }

    return out;
}

function saveItemFromModal() {
    const page = getCurrentPage();
    const data = collectFormData(editorState.type);

    if (editorState.mode === 'create') {
        page.items.push({
            id: uid('item'),
            type: editorState.type,
            data
        });
    } else {
        const target = page.items.find((x) => x.id === editorState.itemId);
        if (!target) return;
        target.data = data;
    }

    saveState();
    closeItemEditor();
    renderAll();
}

function deleteItem(itemId) {
    const page = getCurrentPage();
    const ok = confirm('Eliminare questo oggetto?');
    if (!ok) return;
    page.items = page.items.filter((x) => x.id !== itemId);
    saveState();
    renderAll();
}

function moveItem(itemId, dir) {
    const page = getCurrentPage();
    const idx = page.items.findIndex((x) => x.id === itemId);
    if (idx < 0) return;
    moveInArray(page.items, idx, idx + dir);
    saveState();
    renderAll();
}

function onRootClick(e) {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    const action = button.getAttribute('data-action');
    const id = button.getAttribute('data-id');

    if (action === 'select-page') setCurrentPage(id);
    if (action === 'page-delete') deletePage(id);
    if (action === 'page-up') movePage(id, -1);
    if (action === 'page-down') movePage(id, 1);
    if (action === 'item-delete') deleteItem(id);
    if (action === 'item-up') moveItem(id, -1);
    if (action === 'item-down') moveItem(id, 1);
    if (action === 'item-edit') {
        const page = getCurrentPage();
        const item = page.items.find((x) => x.id === id);
        if (!item) return;
        openItemEditor('edit', item.type, item.id);
    }
}

function bindEvents() {
    document.body.addEventListener('click', onRootClick);

    document.getElementById('addPageBtn').addEventListener('click', addPage);
    document.getElementById('renamePageBtn').addEventListener('click', renameCurrentPage);
    document.getElementById('newItemBtn').addEventListener('click', () => {
        const type = document.getElementById('newObjectType').value;
        openItemEditor('create', type);
    });

    document.getElementById('saveItemBtn').addEventListener('click', saveItemFromModal);
    document.getElementById('cancelItemBtn').addEventListener('click', closeItemEditor);
    document.getElementById('closeModalBtn').addEventListener('click', closeItemEditor);

    document.getElementById('overlay').addEventListener('click', (e) => {
        if (e.target.id === 'overlay') closeItemEditor();
    });
}

function renderAll() {
    renderPagesList();
    renderMain();
}

function init() {
    ensureInitialState();
    bindEvents();
    renderAll();
}

document.addEventListener('DOMContentLoaded', init);
