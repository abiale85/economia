const STORAGE_KEY = 'taccuinoContabile.v1';

let state = {
    currentPageId: null,
    pages: []
};

let editorState = {
    mode: 'create',
    itemId: null,
    type: 'analisi',
    entryIndex: null
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
            titolo: 'Schema analisi',
            sf: 'S.F.',
            se: 'S.E.',
            entries: [defaultEntryByType('analisi')]
        };
    }
    if (type === 'mastrino') {
        return {
            conto: '',
            stato: 'APERTO',
            entries: [defaultEntryByType('mastrino')]
        };
    }
    if (type === 'mastro') {
        return {
            conto: '',
            entries: [defaultEntryByType('mastro')]
        };
    }
    if (type === 'giornale') {
        return {
            titolo: 'Registrazioni giornale',
            entries: [defaultEntryByType('giornale')]
        };
    }
    return {
        titolo: 'Note',
        entries: [defaultEntryByType('note')]
    };
}

function defaultEntryByType(type) {
    if (type === 'analisi') {
        return {
            eLato: 'E',
            eDescrizione: '+ Denaro',
            eVariazione: 'Vf+',
            eImporto: '',
            uLato: 'U',
            uDescrizione: '+ Debiti di finanziamento (v/banche)',
            uVariazione: 'Vf-',
            uImporto: ''
        };
    }
    if (type === 'mastrino') {
        return {
            data: new Date().toLocaleDateString('it-IT'),
            descrizione: '',
            dare: '',
            avere: ''
        };
    }
    if (type === 'mastro') {
        return {
            data: new Date().toLocaleDateString('it-IT'),
            descrizione: '',
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
        testo: ''
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
        state = normalizeState(parsed);
        if (!state.currentPageId || !state.pages.some((p) => p.id === state.currentPageId)) {
            state.currentPageId = state.pages[0].id;
        }
        return true;
    } catch (err) {
        console.warn('Impossibile leggere il taccuino salvato.', err);
        return false;
    }
}

function normalizeState(raw) {
    const normalized = {
        currentPageId: raw.currentPageId,
        pages: (raw.pages || []).map((p) => ({
            id: p.id || uid('page'),
            title: p.title || 'Pagina',
            items: (p.items || []).map(normalizeItem)
        }))
    };
    return normalized;
}

function normalizeItem(item) {
    const type = item.type;
    const data = item.data || {};
    const base = defaultDataByType(type);

    if (type === 'analisi') {
        const fallbackEntry = {
            eLato: data.eLato,
            eDescrizione: data.eDescrizione,
            eVariazione: data.eVariazione,
            eImporto: data.eImporto,
            uLato: data.uLato,
            uDescrizione: data.uDescrizione,
            uVariazione: data.uVariazione,
            uImporto: data.uImporto
        };
        const first = data.entries?.[0] || fallbackEntry;
        return {
            id: item.id || uid('item'),
            type,
            data: {
                titolo: data.titolo || base.titolo,
                sf: data.sf || base.sf,
                se: data.se || base.se,
                entries: (data.entries && data.entries.length ? data.entries : [first]).map((e) => ({
                    eLato: e.eLato || 'E',
                    eDescrizione: e.eDescrizione || '',
                    eVariazione: e.eVariazione || '',
                    eImporto: e.eImporto || '',
                    uLato: e.uLato || 'U',
                    uDescrizione: e.uDescrizione || '',
                    uVariazione: e.uVariazione || '',
                    uImporto: e.uImporto || ''
                }))
            }
        };
    }

    if (type === 'mastrino') {
        const legacy = { data: '', descrizione: '', dare: data.dare || '', avere: data.avere || '' };
        return {
            id: item.id || uid('item'),
            type,
            data: {
                conto: data.conto || '',
                stato: data.stato || 'APERTO',
                entries: (data.entries && data.entries.length ? data.entries : [legacy]).map((e) => ({
                    data: e.data || '',
                    descrizione: e.descrizione || '',
                    dare: e.dare || '',
                    avere: e.avere || ''
                }))
            }
        };
    }

    if (type === 'mastro') {
        const legacy = {
            data: '',
            descrizione: '',
            totaleDare: data.totaleDare || '',
            totaleAvere: data.totaleAvere || '',
            saldo: data.saldo || ''
        };
        return {
            id: item.id || uid('item'),
            type,
            data: {
                conto: data.conto || '',
                entries: (data.entries && data.entries.length ? data.entries : [legacy]).map((e) => ({
                    data: e.data || '',
                    descrizione: e.descrizione || '',
                    totaleDare: e.totaleDare || '',
                    totaleAvere: e.totaleAvere || '',
                    saldo: e.saldo || ''
                }))
            }
        };
    }

    if (type === 'giornale') {
        const legacy = {
            data: data.data || '',
            conto: data.conto || '',
            analisi: data.analisi || 'VFA',
            dare: data.dare || '',
            avere: data.avere || '',
            descrizione: data.descrizione || ''
        };
        return {
            id: item.id || uid('item'),
            type,
            data: {
                titolo: data.titolo || 'Registrazioni giornale',
                entries: (data.entries && data.entries.length ? data.entries : [legacy]).map((e) => ({
                    data: e.data || '',
                    conto: e.conto || '',
                    analisi: e.analisi || 'VFA',
                    dare: e.dare || '',
                    avere: e.avere || '',
                    descrizione: e.descrizione || ''
                }))
            }
        };
    }

    const noteLegacy = data.commenti ? [{ testo: data.commenti }] : [];
    return {
        id: item.id || uid('item'),
        type: 'note',
        data: {
            titolo: data.titolo || 'Note',
            entries: (data.entries && data.entries.length ? data.entries : noteLegacy).map((e) => ({ testo: e.testo || '' }))
        }
    };
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

    items.innerHTML = page.items.map((item) => `
        <article class="item">
            <div class="item-head">
                <div>
                    <span class="tag">${escapeHtml(typeLabel(item.type))}</span>
                </div>
                <div class="row-actions">
                    <button class="btn btn-soft mini" data-action="item-up" data-id="${item.id}">Su</button>
                    <button class="btn btn-soft mini" data-action="item-down" data-id="${item.id}">Giu</button>
                    <button class="btn btn-soft mini" data-action="item-add-entry" data-id="${item.id}">Aggiungi voce</button>
                    <button class="btn btn-soft mini" data-action="item-edit" data-id="${item.id}">Modifica</button>
                    <button class="btn btn-danger mini" data-action="item-delete" data-id="${item.id}">Elimina</button>
                </div>
            </div>
            <div class="item-body">${renderItemBody(item)}</div>
        </article>
    `).join('');
}

function renderItemBody(item) {
    const d = item.data || {};
    if (item.type === 'analisi') {
        const rows = (d.entries || []).map((r, idx) => `
            <div class="schema-box">
                <div class="schema-grid">
                    <div class="schema-col">
                        <div class="schema-letter">${escapeHtml(r.eLato || 'E')}</div>
                        <div>${escapeHtml(r.eDescrizione || '')}</div>
                        <div class="chip">${escapeHtml(r.eVariazione || '')}</div>
                        <div class="schema-money">${escapeHtml(r.eImporto || '-')}</div>
                    </div>
                    <div class="schema-arrow">↔</div>
                    <div class="schema-col">
                        <div class="schema-letter">${escapeHtml(r.uLato || 'U')}</div>
                        <div>${escapeHtml(r.uDescrizione || '')}</div>
                        <div class="chip">${escapeHtml(r.uVariazione || '')}</div>
                        <div class="schema-money">${escapeHtml(r.uImporto || '-')}</div>
                    </div>
                </div>
                <div class="schema-foot"><div>${escapeHtml(d.sf || 'S.F.')}</div><div>${escapeHtml(d.se || 'S.E.')}</div></div>
                ${renderEntryActions(item.id, idx)}
            </div>
        `).join('');
        return `<div><strong>${escapeHtml(d.titolo || 'Schema analisi')}</strong></div>${rows}`;
    }

    if (item.type === 'mastrino') {
        const entries = d.entries || [];
        const totD = entries.reduce((s, e) => s + Number(e.dare || 0), 0);
        const totA = entries.reduce((s, e) => s + Number(e.avere || 0), 0);
        const saldo = (totD - totA).toFixed(2);
        const dareLines = entries.map((e) => `${escapeHtml(e.data || '')} ${escapeHtml(e.descrizione || '')} ${escapeHtml(e.dare || '-')}`);
        const avereLines = entries.map((e) => `${escapeHtml(e.data || '')} ${escapeHtml(e.descrizione || '')} ${escapeHtml(e.avere || '-')}`);

        const entryBlocks = entries.map((e, idx) => `
            <tr>
                <td>${escapeHtml(e.data || '-')}</td>
                <td>${escapeHtml(e.descrizione || '-')}</td>
                <td>${escapeHtml(e.dare || '-')}</td>
                <td>${escapeHtml(e.avere || '-')}</td>
                <td>${renderEntryActions(item.id, idx, true)}</td>
            </tr>
        `).join('');

        return `
            <div class="t-accounts">
                <div class="t-account">
                    <div class="t-account-head">${escapeHtml(d.conto || 'Conto')}</div>
                    <div class="t-account-body">
                        <div class="t-col"><strong>Dare</strong><br>${dareLines.join('<br>') || '-'}</div>
                        <div class="t-col t-col-right"><strong>Avere</strong><br>${avereLines.join('<br>') || '-'}</div>
                    </div>
                    <div class="t-foot">Saldo: ${saldo} | Stato: ${escapeHtml(d.stato || 'APERTO')}</div>
                </div>
                <table class="ledger-table">
                    <thead><tr><th>Data</th><th>Descrizione</th><th>Dare</th><th>Avere</th><th>Azioni voce</th></tr></thead>
                    <tbody>${entryBlocks || '<tr><td colspan="5">Nessuna voce.</td></tr>'}</tbody>
                </table>
            </div>
        `;
    }

    if (item.type === 'mastro') {
        const rows = (d.entries || []).map((e, idx) => `
            <tr>
                <td>${escapeHtml(e.data || '-')}</td>
                <td>${escapeHtml(e.descrizione || '-')}</td>
                <td>${escapeHtml(e.totaleDare || '-')}</td>
                <td>${escapeHtml(e.totaleAvere || '-')}</td>
                <td>${escapeHtml(e.saldo || '-')}</td>
                <td>${renderEntryActions(item.id, idx, true)}</td>
            </tr>
        `).join('');
        return `
            <div class="kv"><strong>Conto:</strong> ${escapeHtml(d.conto || '-')}</div>
            <table class="ledger-table" style="margin-top:6px;">
                <thead><tr><th>Data</th><th>Descrizione</th><th>Totale Dare</th><th>Totale Avere</th><th>Saldo</th><th>Azioni voce</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="6">Nessuna voce.</td></tr>'}</tbody>
            </table>
        `;
    }

    if (item.type === 'giornale') {
        const rows = (d.entries || []).map((e, idx) => `
            <tr>
                <td>${escapeHtml(e.data || '-')}</td>
                <td>${escapeHtml(e.conto || '-')}</td>
                <td>${escapeHtml(e.analisi || '-')}</td>
                <td>${escapeHtml(e.dare || '-')}</td>
                <td>${escapeHtml(e.avere || '-')}</td>
                <td>${escapeHtml(e.descrizione || '-')}</td>
                <td>${renderEntryActions(item.id, idx, true)}</td>
            </tr>
        `).join('');
        return `
            <div class="kv"><strong>${escapeHtml(d.titolo || 'Libro Giornale')}</strong></div>
            <table class="ledger-table" style="margin-top:6px;">
                <thead><tr><th>Data</th><th>Conto</th><th>Analisi</th><th>Dare</th><th>Avere</th><th>Descrizione</th><th>Azioni voce</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="7">Nessuna voce.</td></tr>'}</tbody>
            </table>
        `;
    }

    const notes = (d.entries || []).map((e, idx) => `
        <div class="note-card">
            <div>${escapeHtml(e.testo || '-')}</div>
            ${renderEntryActions(item.id, idx)}
        </div>
    `).join('');
    return `<div class="kv"><strong>${escapeHtml(d.titolo || 'Note')}</strong></div>${notes || '<div class="kv">Nessuna nota.</div>'}`;
}

function renderEntryActions(itemId, entryIndex, compact) {
    const cls = compact ? 'mini' : 'mini';
    return `
        <div class="entry-actions">
            <button class="btn btn-soft ${cls}" data-action="entry-up" data-id="${itemId}" data-entry="${entryIndex}">Su</button>
            <button class="btn btn-soft ${cls}" data-action="entry-down" data-id="${itemId}" data-entry="${entryIndex}">Giu</button>
            <button class="btn btn-soft ${cls}" data-action="entry-edit" data-id="${itemId}" data-entry="${entryIndex}">Modifica</button>
            <button class="btn btn-danger ${cls}" data-action="entry-delete" data-id="${itemId}" data-entry="${entryIndex}">Elimina</button>
        </div>
    `;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function openItemEditor(mode, type, itemId, entryIndex) {
    editorState = { mode, type, itemId: itemId || null, entryIndex: Number.isInteger(entryIndex) ? entryIndex : null };

    const page = getCurrentPage();
    const existing = itemId ? page.items.find((x) => x.id === itemId) : null;
    const data = getFormSeed(mode, type, existing, editorState.entryIndex);

    let title = `Nuovo ${typeLabel(type)}`;
    if (mode === 'edit-item') title = `Modifica ${typeLabel(type)}`;
    if (mode === 'add-entry') title = `Aggiungi voce a ${typeLabel(type)}`;
    if (mode === 'edit-entry') title = `Modifica voce ${typeLabel(type)}`;
    document.getElementById('modalTitle').textContent = title;

    document.getElementById('modalForm').innerHTML = buildTypeForm(type, data, mode);
    document.getElementById('overlay').classList.add('open');
}

function getFormSeed(mode, type, item, entryIndex) {
    if (!item || mode === 'create') {
        return defaultDataByType(type);
    }

    if (mode === 'edit-item') {
        return item.data;
    }

    if (mode === 'add-entry') {
        return defaultEntryByType(type);
    }

    if (mode === 'edit-entry') {
        const entry = item.data?.entries?.[entryIndex];
        return entry ? { ...entry } : defaultEntryByType(type);
    }

    return defaultDataByType(type);
}

function closeItemEditor() {
    document.getElementById('overlay').classList.remove('open');
}

function buildTypeForm(type, data, mode) {
    const accountsDatalist = buildAccountsDatalist();
    const entryOnly = mode === 'add-entry' || mode === 'edit-entry';

    if (type === 'analisi' && !entryOnly) {
        return `
            <div class="grid">
                <div><label>Titolo schema</label><input name="titolo" value="${escapeHtml(data.titolo || '')}"></div>
                <div><label>Etichetta finale 1</label><input name="sf" value="${escapeHtml(data.sf)}"></div>
                <div><label>Etichetta finale 2</label><input name="se" value="${escapeHtml(data.se)}"></div>
            </div>
        `;
    }

    if (type === 'analisi' && entryOnly) {
        return `
            <div class="grid">
                <div><label>Lato sinistra</label><input name="eLato" value="${escapeHtml(data.eLato || 'E')}"></div>
                <div><label>Descrizione sinistra</label><input name="eDescrizione" value="${escapeHtml(data.eDescrizione || '')}"></div>
                <div><label>Variazione sinistra</label><input name="eVariazione" value="${escapeHtml(data.eVariazione || 'Vf+')}"></div>
                <div><label>Importo sinistra</label><input name="eImporto" value="${escapeHtml(data.eImporto || '')}" placeholder="150.000EUR"></div>
                <div><label>Lato destra</label><input name="uLato" value="${escapeHtml(data.uLato || 'U')}"></div>
                <div><label>Descrizione destra</label><input name="uDescrizione" value="${escapeHtml(data.uDescrizione || '')}"></div>
                <div><label>Variazione destra</label><input name="uVariazione" value="${escapeHtml(data.uVariazione || 'Vf-')}"></div>
                <div><label>Importo destra</label><input name="uImporto" value="${escapeHtml(data.uImporto || '')}" placeholder="150.000EUR"></div>
            </div>
        `;
    }

    if (type === 'mastrino' && !entryOnly) {
        return `
            <div class="grid">
                <div><label>Conto</label><input list="contoSuggestions" name="conto" value="${escapeHtml(data.conto)}" placeholder="Inizia a scrivere un conto"></div>
                <div><label>Stato</label>
                    <select name="stato">
                        <option value="APERTO" ${data.stato === 'APERTO' ? 'selected' : ''}>APERTO</option>
                        <option value="CHIUSO" ${data.stato === 'CHIUSO' ? 'selected' : ''}>CHIUSO</option>
                    </select>
                </div>
            </div>
            ${accountsDatalist}
        `;
    }

    if (type === 'mastrino' && entryOnly) {
        return `
            <div class="grid">
                <div><label>Data</label><input name="data" value="${escapeHtml(data.data || new Date().toLocaleDateString('it-IT'))}"></div>
                <div><label>Descrizione</label><input name="descrizione" value="${escapeHtml(data.descrizione || '')}"></div>
                <div><label>Dare</label><input name="dare" value="${escapeHtml(data.dare || '')}"></div>
                <div><label>Avere</label><input name="avere" value="${escapeHtml(data.avere || '')}"></div>
            </div>
        `;
    }

    if (type === 'mastro' && !entryOnly) {
        return `
            <div class="grid">
                <div><label>Conto</label><input list="contoSuggestions" name="conto" value="${escapeHtml(data.conto)}" placeholder="Inizia a scrivere un conto"></div>
            </div>
            ${accountsDatalist}
        `;
    }

    if (type === 'mastro' && entryOnly) {
        return `
            <div class="grid">
                <div><label>Data</label><input name="data" value="${escapeHtml(data.data || new Date().toLocaleDateString('it-IT'))}"></div>
                <div><label>Descrizione</label><input name="descrizione" value="${escapeHtml(data.descrizione || '')}"></div>
                <div><label>Totale Dare</label><input name="totaleDare" value="${escapeHtml(data.totaleDare || '')}"></div>
                <div><label>Totale Avere</label><input name="totaleAvere" value="${escapeHtml(data.totaleAvere || '')}"></div>
                <div><label>Saldo (lascia vuoto per calcolo)</label><input name="saldo" value="${escapeHtml(data.saldo || '')}"></div>
            </div>
        `;
    }

    if (type === 'giornale' && !entryOnly) {
        return `
            <div class="grid">
                <div><label>Titolo blocco</label><input name="titolo" value="${escapeHtml(data.titolo || '')}"></div>
            </div>
        `;
    }

    if (type === 'giornale' && entryOnly) {
        return `
            <div class="grid">
                <div><label>Data</label><input name="data" value="${escapeHtml(data.data || new Date().toLocaleDateString('it-IT'))}"></div>
                <div><label>Conto</label><input list="contoSuggestions" name="conto" value="${escapeHtml(data.conto || '')}" placeholder="Inizia a scrivere un conto"></div>
                <div><label>Analisi</label>
                    <select name="analisi">
                        <option value="VFA" ${(data.analisi || 'VFA') === 'VFA' ? 'selected' : ''}>VFA</option>
                        <option value="VFP" ${data.analisi === 'VFP' ? 'selected' : ''}>VFP</option>
                        <option value="VEN" ${data.analisi === 'VEN' ? 'selected' : ''}>VEN</option>
                        <option value="VEP" ${data.analisi === 'VEP' ? 'selected' : ''}>VEP</option>
                    </select>
                </div>
                <div><label>Dare</label><input name="dare" value="${escapeHtml(data.dare || '')}"></div>
                <div><label>Avere</label><input name="avere" value="${escapeHtml(data.avere || '')}"></div>
                <div style="grid-column: 1 / -1;"><label>Descrizione</label><textarea name="descrizione">${escapeHtml(data.descrizione || '')}</textarea></div>
            </div>
            ${accountsDatalist}
        `;
    }

    if (type === 'note' && !entryOnly) {
        return `
            <div class="grid">
                <div><label>Titolo nota</label><input name="titolo" value="${escapeHtml(data.titolo || '')}"></div>
            </div>
        `;
    }

    return `
        <div class="grid">
            <div style="grid-column: 1 / -1;"><label>Nuova nota/commento</label><textarea name="testo">${escapeHtml(data.testo || '')}</textarea></div>
        </div>
    `;
}

function buildAccountsDatalist() {
    const names = getKnownAccounts();
    if (!names.length) return '';
    return `<datalist id="contoSuggestions">${names.map((n) => `<option value="${escapeHtml(n)}"></option>`).join('')}</datalist>`;
}

function getKnownAccounts() {
    const accounts = new Set();
    state.pages.forEach((p) => {
        (p.items || []).forEach((item) => {
            if ((item.type === 'mastrino' || item.type === 'mastro') && item.data?.conto) {
                accounts.add(String(item.data.conto).trim());
            }
            if (item.type === 'giornale') {
                (item.data.entries || []).forEach((e) => {
                    if (e.conto) accounts.add(String(e.conto).trim());
                });
            }
        });
    });
    return [...accounts].filter(Boolean).sort((a, b) => a.localeCompare(b, 'it'));
}

function collectFormData(type) {
    const form = document.getElementById('modalForm');
    const out = {};
    form.querySelectorAll('input, select, textarea').forEach((field) => {
        out[field.name] = field.value;
    });

    return out;
}

function saveItemFromModal() {
    const page = getCurrentPage();
    const data = collectFormData(editorState.type);

    if (editorState.mode === 'create') {
        page.items.push({
            id: uid('item'),
            type: editorState.type,
            data: buildInitialData(editorState.type, data)
        });
    } else if (editorState.mode === 'edit-item') {
        const target = page.items.find((x) => x.id === editorState.itemId);
        if (!target) return;
        updateItemMeta(target, data);
    } else if (editorState.mode === 'add-entry') {
        const target = page.items.find((x) => x.id === editorState.itemId);
        if (!target) return;
        target.data.entries.push(buildEntryFromForm(target.type, data));
    } else if (editorState.mode === 'edit-entry') {
        const target = page.items.find((x) => x.id === editorState.itemId);
        if (!target) return;
        const idx = editorState.entryIndex;
        if (idx === null || !target.data.entries[idx]) return;
        target.data.entries[idx] = buildEntryFromForm(target.type, data);
    }

    recalcDerivedFields(page);
    saveState();
    closeItemEditor();
    renderAll();
}

function buildInitialData(type, raw) {
    const base = defaultDataByType(type);

    if (type === 'analisi') {
        return {
            titolo: raw.titolo || base.titolo,
            sf: raw.sf || base.sf,
            se: raw.se || base.se,
            entries: [defaultEntryByType('analisi')]
        };
    }
    if (type === 'mastrino') {
        return { conto: raw.conto || '', stato: raw.stato || 'APERTO', entries: [defaultEntryByType('mastrino')] };
    }
    if (type === 'mastro') {
        return { conto: raw.conto || '', entries: [defaultEntryByType('mastro')] };
    }
    if (type === 'giornale') {
        return { titolo: raw.titolo || base.titolo, entries: [defaultEntryByType('giornale')] };
    }
    return { titolo: raw.titolo || base.titolo, entries: [defaultEntryByType('note')] };
}

function updateItemMeta(item, raw) {
    if (item.type === 'analisi') {
        item.data.titolo = raw.titolo || item.data.titolo;
        item.data.sf = raw.sf || item.data.sf;
        item.data.se = raw.se || item.data.se;
    }
    if (item.type === 'mastrino') {
        item.data.conto = raw.conto || item.data.conto;
        item.data.stato = raw.stato || item.data.stato;
    }
    if (item.type === 'mastro') {
        item.data.conto = raw.conto || item.data.conto;
    }
    if (item.type === 'giornale') {
        item.data.titolo = raw.titolo || item.data.titolo;
    }
    if (item.type === 'note') {
        item.data.titolo = raw.titolo || item.data.titolo;
    }
}

function buildEntryFromForm(type, raw) {
    if (type === 'analisi') {
        return {
            eLato: raw.eLato || 'E',
            eDescrizione: raw.eDescrizione || '',
            eVariazione: raw.eVariazione || '',
            eImporto: raw.eImporto || '',
            uLato: raw.uLato || 'U',
            uDescrizione: raw.uDescrizione || '',
            uVariazione: raw.uVariazione || '',
            uImporto: raw.uImporto || ''
        };
    }
    if (type === 'mastrino') {
        return {
            data: raw.data || '',
            descrizione: raw.descrizione || '',
            dare: raw.dare || '',
            avere: raw.avere || ''
        };
    }
    if (type === 'mastro') {
        const dare = Number(raw.totaleDare || 0);
        const avere = Number(raw.totaleAvere || 0);
        return {
            data: raw.data || '',
            descrizione: raw.descrizione || '',
            totaleDare: raw.totaleDare || '',
            totaleAvere: raw.totaleAvere || '',
            saldo: raw.saldo || (dare - avere).toFixed(2)
        };
    }
    if (type === 'giornale') {
        return {
            data: raw.data || '',
            conto: raw.conto || '',
            analisi: raw.analisi || 'VFA',
            dare: raw.dare || '',
            avere: raw.avere || '',
            descrizione: raw.descrizione || ''
        };
    }
    return {
        testo: raw.testo || ''
    };
}

function recalcDerivedFields(page) {
    page.items.forEach((item) => {
        if (item.type !== 'mastrino') return;
        const entries = item.data.entries || [];
        const td = entries.reduce((s, e) => s + Number(e.dare || 0), 0);
        const ta = entries.reduce((s, e) => s + Number(e.avere || 0), 0);
        const saldo = td - ta;
        item.data.stato = Math.abs(saldo) < 0.0001 ? 'CHIUSO' : (item.data.stato || 'APERTO');
    });
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

function moveEntry(itemId, entryIndex, dir) {
    const page = getCurrentPage();
    const item = page.items.find((x) => x.id === itemId);
    if (!item || !item.data?.entries) return;
    moveInArray(item.data.entries, entryIndex, entryIndex + dir);
    saveState();
    renderAll();
}

function deleteEntry(itemId, entryIndex) {
    const page = getCurrentPage();
    const item = page.items.find((x) => x.id === itemId);
    if (!item || !item.data?.entries) return;
    const ok = confirm('Eliminare questa voce?');
    if (!ok) return;
    if (item.data.entries.length === 1) {
        alert('Serve almeno una voce per oggetto.');
        return;
    }
    item.data.entries.splice(entryIndex, 1);
    saveState();
    renderAll();
}

function onRootClick(e) {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    const action = button.getAttribute('data-action');
    const id = button.getAttribute('data-id');
    const entry = Number(button.getAttribute('data-entry'));

    if (action === 'select-page') setCurrentPage(id);
    if (action === 'page-delete') deletePage(id);
    if (action === 'page-up') movePage(id, -1);
    if (action === 'page-down') movePage(id, 1);
    if (action === 'item-delete') deleteItem(id);
    if (action === 'item-up') moveItem(id, -1);
    if (action === 'item-down') moveItem(id, 1);
    if (action === 'item-add-entry') {
        const page = getCurrentPage();
        const item = page.items.find((x) => x.id === id);
        if (!item) return;
        openItemEditor('add-entry', item.type, item.id);
    }
    if (action === 'item-edit') {
        const page = getCurrentPage();
        const item = page.items.find((x) => x.id === id);
        if (!item) return;
        openItemEditor('edit-item', item.type, item.id);
    }
    if (action === 'entry-up') moveEntry(id, entry, -1);
    if (action === 'entry-down') moveEntry(id, entry, 1);
    if (action === 'entry-delete') deleteEntry(id, entry);
    if (action === 'entry-edit') {
        const page = getCurrentPage();
        const item = page.items.find((x) => x.id === id);
        if (!item) return;
        openItemEditor('edit-entry', item.type, item.id, entry);
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
