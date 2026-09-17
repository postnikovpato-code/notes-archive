(function () {
  const ALL = 'all';
  const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

  const $ = (id) => document.getElementById(id);
  const filters = { month: $('f-month'), project: $('f-project'), type: $('f-type') };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (!h) return `${m} мин`;
    return m ? `${h} ч ${m} мин` : `${h} ч`;
  }

  function monthTitle(key) {
    const [y, m] = key.split('-');
    const name = MONTHS[Number(m) - 1];
    return `${name[0].toUpperCase()}${name.slice(1)} ${y}`;
  }

  const sum = (list) => list.reduce((acc, e) => acc + e.minutes, 0);
  const unique = (list) => [...new Set(list)];

  function fillSelect(select, allLabel, options, selected) {
    select.replaceChildren(
      new Option(allLabel, ALL),
      ...options.map(([value, label]) => new Option(label, value))
    );
    select.value = options.some(([value]) => value === selected) ? selected : ALL;
  }

  function setupFilters(entries) {
    const months = unique(entries.map((e) => e.date.slice(0, 7))).sort().reverse();
    const projects = unique(entries.map((e) => e.project)).sort();
    const types = unique(entries.map((e) => e.type)).sort();
    const currentMonth = new Date().toISOString().slice(0, 7);

    fillSelect(filters.month, 'Все месяцы', months.map((k) => [k, monthTitle(k)]), currentMonth);
    fillSelect(filters.project, 'Все проекты', projects.map((p) => [p, p]), ALL);
    fillSelect(filters.type, 'Все типы', types.map((t) => [t, t]), ALL);
  }

  function applyFilters(entries) {
    const { month, project, type } = filters;
    return entries.filter((e) =>
      (month.value === ALL || e.date.startsWith(month.value)) &&
      (project.value === ALL || e.project === project.value) &&
      (type.value === ALL || e.type === type.value)
    );
  }

  function renderSummary(list) {
    const month = filters.month.value;
    $('total-label').textContent = month === ALL ? 'Всего' : `За ${monthTitle(month).toLowerCase()}`;
    $('total-value').textContent = formatDuration(sum(list));
    $('total-note').textContent = `${list.length} ${plural(list.length, 'запись', 'записи', 'записей')}`;

    const byProject = unique(list.map((e) => e.project))
      .map((p) => [p, sum(list.filter((e) => e.project === p))])
      .sort((a, b) => b[1] - a[1]);
    const max = byProject.length ? byProject[0][1] : 0;

    $('bars').replaceChildren(...byProject.map(([project, minutes]) => {
      const item = el('li');
      const head = el('div', 'bar-head');
      head.append(el('span', 'bar-name', project), el('span', 'num', formatDuration(minutes)));
      const track = el('div', 'bar-track');
      const fill = el('div', 'bar-fill');
      fill.style.width = `${(minutes / max) * 100}%`;
      track.append(fill);
      item.append(head, track);
      return item;
    }));
  }

  function renderEntry(e) {
    const date = new Date(`${e.date}T00:00:00`);
    const row = el('article', 'entry');

    const day = el('div', 'entry-day num', String(date.getDate()));
    day.append(el('span', 'entry-weekday', WEEKDAYS[date.getDay()]));

    const body = el('div');
    const tags = el('div', 'entry-tags');
    tags.append(el('span', 'tag tag-project', e.project), el('span', 'tag', e.type));
    body.append(tags, el('p', 'entry-comment', e.comment));

    row.append(day, body, el('div', 'entry-time num', formatDuration(e.minutes)));
    return row;
  }

  function renderLog(list) {
    if (!list.length) {
      $('log').replaceChildren(el('div', 'empty', 'Записей по выбранным фильтрам нет'));
      return;
    }
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
    const months = unique(sorted.map((e) => e.date.slice(0, 7)));

    $('log').replaceChildren(...months.map((key) => {
      const items = sorted.filter((e) => e.date.startsWith(key));
      const section = el('section', 'month');
      const head = el('header', 'month-head');
      head.append(el('h2', '', monthTitle(key)), el('span', 'num', formatDuration(sum(items))));
      section.append(head, ...items.map(renderEntry));
      return section;
    }));
  }

  function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  async function init() {
    try {
      const res = await fetch('hours.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const entries = await res.json();
      const render = () => {
        const list = applyFilters(entries);
        renderSummary(list);
        renderLog(list);
      };
      setupFilters(entries);
      Object.values(filters).forEach((s) => s.addEventListener('change', render));
      render();
    } catch (err) {
      console.error('Не удалось загрузить hours.json', err);
      $('log').replaceChildren(el('div', 'error', 'Не удалось загрузить записи. Обновите страницу.'));
    }
  }

  init();
})();
