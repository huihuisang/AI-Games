import { restorePresetState, savePreset, deletePreset } from './presets.mjs';

const STORAGE_KEY = 'double-color-machine.presets.v1';
const format = number => String(number).padStart(2, '0');

export function createPresetUI({ readStorage, writeStorage }) {
  let state = restorePresetState(readStorage(STORAGE_KEY));
  let editingId = null;
  let selectedRed = new Set();
  let selectedBlue = null;
  const select = document.querySelector('#preset-select');
  const manageButton = document.querySelector('#manage-presets');
  const dialog = document.querySelector('#presets-dialog');
  const manager = document.querySelector('#preset-manager');
  const editor = document.querySelector('#preset-editor');
  const nameInput = document.querySelector('#preset-name');
  const error = document.querySelector('#preset-error');
  const title = document.querySelector('#presets-title');

  function describe(preset) {
    const red = preset.red.length ? `红球 ${preset.red.map(format).join('、')}` : '红球随机';
    const blue = preset.blue === null ? '蓝球随机' : `蓝球 ${format(preset.blue)}`;
    return `${red} · ${blue}`;
  }

  function persist() {
    writeStorage(STORAGE_KEY, JSON.stringify(state));
    render();
  }

  function render() {
    select.replaceChildren(new Option('完全随机', 'random'));
    state.presets.forEach(preset => select.add(new Option(preset.name, preset.id)));
    select.value = state.selectedId;
    const selected = state.presets.find(preset => preset.id === state.selectedId);
    document.querySelector('#preset-summary').textContent = selected
      ? `${describe(selected)}，${selected.red.length === 6 && selected.blue !== null ? '全部号码已指定' : '其余随机'}`
      : '6 个红球和 1 个蓝球全部随机';
    const list = document.querySelector('#preset-list');
    list.replaceChildren();
    state.presets.forEach(preset => {
      const item = document.createElement('li');
      const content = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = preset.name;
      const description = document.createElement('p');
      description.textContent = describe(preset);
      content.append(name, description);
      const actions = document.createElement('div');
      actions.className = 'preset-item-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = '编辑';
      edit.setAttribute('aria-label', `编辑${preset.name}`);
      edit.addEventListener('click', () => openEditor(preset));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '删除';
      remove.setAttribute('aria-label', `删除${preset.name}`);
      remove.addEventListener('click', () => { state = deletePreset(state, preset.id); persist(); });
      actions.append(edit, remove);
      item.append(content, actions);
      list.append(item);
    });
    document.querySelector('#preset-list-empty').hidden = state.presets.length > 0;
    document.querySelector('#new-preset').disabled = state.presets.length >= 20;
    document.querySelector('#new-preset').textContent = state.presets.length >= 20 ? '已达 20 个，请先删除一个' : '新建预设';
  }

  function updateNumbers() {
    document.querySelectorAll('#red-number-grid button').forEach(button => {
      const number = Number(button.dataset.number);
      button.setAttribute('aria-pressed', String(selectedRed.has(number)));
      button.disabled = selectedRed.size === 6 && !selectedRed.has(number);
    });
    document.querySelectorAll('#blue-number-grid button').forEach(button => {
      button.setAttribute('aria-pressed', String(selectedBlue === Number(button.dataset.number)));
    });
    document.querySelector('#red-selection-count').textContent = `${selectedRed.size} / 6`;
    document.querySelector('#blue-selection-count').textContent = selectedBlue === null ? '随机' : format(selectedBlue);
  }

  function showManager() {
    manager.hidden = false;
    editor.hidden = true;
    title.textContent = '管理预设';
    render();
  }

  function openEditor(preset = null) {
    editingId = preset?.id ?? null;
    selectedRed = new Set(preset?.red ?? []);
    selectedBlue = preset?.blue ?? null;
    nameInput.value = preset?.name ?? '';
    error.textContent = '';
    manager.hidden = true;
    editor.hidden = false;
    title.textContent = preset ? '编辑预设' : '新建预设';
    updateNumbers();
    editor.querySelector('.preset-editor-content').scrollTop = 0;
    nameInput.focus({ preventScroll: true });
  }

  for (const [color, max] of [['red', 33], ['blue', 16]]) {
    const grid = document.querySelector(`#${color}-number-grid`);
    for (let number = 1; number <= max; number++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.number = number;
      button.textContent = format(number);
      button.setAttribute('aria-label', `${color === 'red' ? '红' : '蓝'}球 ${format(number)}`);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        if (color === 'red') {
          if (selectedRed.has(number)) selectedRed.delete(number);
          else if (selectedRed.size < 6) selectedRed.add(number);
        } else selectedBlue = selectedBlue === number ? null : number;
        error.textContent = '';
        updateNumbers();
      });
      grid.append(button);
    }
  }

  select.addEventListener('change', () => { state = { ...state, selectedId: select.value }; persist(); });
  manageButton.addEventListener('click', () => { showManager(); dialog.showModal(); });
  document.querySelector('#close-presets').addEventListener('click', () => dialog.close());
  document.querySelector('#new-preset').addEventListener('click', () => openEditor());
  document.querySelector('#cancel-preset').addEventListener('click', showManager);
  editor.addEventListener('submit', event => {
    event.preventDefault();
    try {
      state = savePreset(state, { id: editingId ?? crypto.randomUUID(), name: nameInput.value,
        red: [...selectedRed], blue: selectedBlue });
      persist();
      dialog.close();
    } catch (failure) {
      error.textContent = failure.message;
      error.scrollIntoView({ block: 'nearest' });
    }
  });
  render();
  return {
    getSelected() {
      const preset = state.presets.find(item => item.id === state.selectedId);
      return preset ? { ...preset, red: [...preset.red] } : null;
    },
    setLocked(locked) { select.disabled = locked; manageButton.disabled = locked; },
  };
}
