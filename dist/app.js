const STORAGE_KEY = "todo-list.tasks.v1";

const form = document.querySelector("#task-form");
const input = document.querySelector("#task-input");
const dateInput = document.querySelector("#task-date");
const dayPicker = document.querySelector("#day-picker");
const groups = document.querySelector("#task-groups");
const emptyState = document.querySelector("#empty-state");
const taskCount = document.querySelector("#task-count");
const todayCount = document.querySelector("#today-count");
const upcomingCount = document.querySelector("#upcoming-count");
const pageTitle = document.querySelector("#page-title");
const pageSubtitle = document.querySelector("#page-subtitle");
const navButtons = [...document.querySelectorAll("[data-view]")];
const sidebarAdd = document.querySelector("#sidebar-add");
const openTaskForm = document.querySelector("#open-task-form");
const cancelTask = document.querySelector("#cancel-task");
const taskError = document.querySelector("#task-error");

let activeView = "today";
let tasks = loadTasks();
let editorOpen = false;

function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function loadTasks() {
  const today = toDateKey();

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return [];

    return saved.map((task) => ({
      ...task,
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? task.dueDate : today,
    }));
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function pluralizeTasks(count) {
  const lastTwo = count % 100;
  const last = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return `${count} задач`;
  if (last === 1) return `${count} задача`;
  if (last >= 2 && last <= 4) return `${count} задачи`;
  return `${count} задач`;
}

function formatDayHeading(dateKey) {
  const today = toDateKey();
  const tomorrow = toDateKey(addDays(new Date(), 1));

  if (dateKey === today) return "Сегодня";
  if (dateKey === tomorrow) return "Завтра";

  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseDateKey(dateKey));
}

function renderWeekPicker() {
  const selectedDate = dateInput.value || toDateKey();
  const weekdayFormatter = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });
  const fullDateFormatter = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  dayPicker.replaceChildren();

  for (let index = 0; index <= 7; index += 1) {
    const date = addDays(new Date(), index);
    const dateKey = toDateKey(date);
    const button = document.createElement("button");
    const isSelected = dateKey === selectedDate;

    button.type = "button";
    button.className = `day-option${isSelected ? " selected" : ""}`;
    button.dataset.date = dateKey;
    button.setAttribute("aria-pressed", String(isSelected));
    button.setAttribute("aria-label", `${index === 0 ? "Сегодня, " : ""}${fullDateFormatter.format(date)}`);
    button.innerHTML = `
      <span class="day-label">${weekdayFormatter.format(date).replace(".", "")}</span>
      <span class="day-number">${date.getDate()}</span>`;

    dayPicker.append(button);
  }
}

function getVisibleTasks() {
  const today = toDateKey();
  const visible = activeView === "today"
    ? tasks.filter((task) => task.dueDate === today)
    : tasks.filter((task) => task.dueDate >= today);

  return visible.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function createTaskItem(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " completed" : ""}`;
  item.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.className = "task-checkbox";
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Отметить задачу «${task.text}» выполненной`);

  const content = document.createElement("div");
  content.className = "task-content";

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;

  const date = document.createElement("span");
  date.className = "task-date";
  date.textContent = formatDayHeading(task.dueDate);

  content.append(text, date);

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Удалить задачу «${task.text}»`);
  deleteButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
    </svg>`;

  item.append(checkbox, content, deleteButton);
  return item;
}

function render() {
  const visibleTasks = getVisibleTasks();
  groups.replaceChildren();

  const tasksByDate = Map.groupBy
    ? Map.groupBy(visibleTasks, (task) => task.dueDate)
    : visibleTasks.reduce((map, task) => {
        const current = map.get(task.dueDate) || [];
        current.push(task);
        map.set(task.dueDate, current);
        return map;
      }, new Map());

  tasksByDate.forEach((dayTasks, dateKey) => {
    const section = document.createElement("section");
    section.className = "day-group";

    if (activeView === "upcoming") {
      const heading = document.createElement("h2");
      heading.className = "day-heading";
      heading.textContent = formatDayHeading(dateKey);
      section.append(heading);
    }

    const list = document.createElement("ul");
    list.className = "task-list";
    list.setAttribute("aria-label", formatDayHeading(dateKey));
    dayTasks.forEach((task) => list.append(createTaskItem(task)));
    section.append(list);
    groups.append(section);
  });

  const today = toDateKey();
  const todayTasks = tasks.filter((task) => task.dueDate === today).length;
  const futureTasks = tasks.filter((task) => task.dueDate >= today).length;

  emptyState.hidden = visibleTasks.length > 0 || editorOpen;
  openTaskForm.hidden = editorOpen;
  taskCount.textContent = pluralizeTasks(visibleTasks.length);
  todayCount.textContent = todayTasks;
  upcomingCount.textContent = futureTasks;
  pageTitle.textContent = activeView === "today" ? "Сегодня" : "Предстоящие";
  pageSubtitle.textContent = activeView === "today"
    ? "Сосредоточьтесь на главном"
    : "Планы по дням";

  navButtons.forEach((button) => {
    const isActive = button.dataset.view === activeView;
    button.classList.toggle("active", isActive);
    if (isActive) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function setDefaultDate() {
  const today = toDateKey();
  dateInput.value = today;
  renderWeekPicker();
}

function openEditor() {
  clearTaskError();
  editorOpen = true;
  form.hidden = false;
  openTaskForm.hidden = true;
  emptyState.hidden = true;
  input.focus();
}

function closeEditor() {
  editorOpen = false;
  form.reset();
  setDefaultDate();
  form.hidden = true;
  clearTaskError();
  render();
}

function showTaskError() {
  taskError.hidden = false;
  input.setAttribute("aria-invalid", "true");
  input.focus();
}

function clearTaskError() {
  taskError.hidden = true;
  input.removeAttribute("aria-invalid");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    showTaskError();
    return;
  }
  if (!dateInput.value) return;

  const dueDate = dateInput.value;
  tasks.unshift({
    id: crypto.randomUUID(),
    text,
    dueDate,
    completed: false,
  });

  if (dueDate !== toDateKey()) activeView = "upcoming";
  saveTasks();
  closeEditor();
});

groups.addEventListener("change", (event) => {
  if (!event.target.matches(".task-checkbox")) return;

  const item = event.target.closest(".task-item");
  const task = tasks.find((entry) => entry.id === item.dataset.id);
  if (!task) return;

  task.completed = event.target.checked;
  saveTasks();
  render();
});

groups.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-button");
  if (!button) return;

  const item = button.closest(".task-item");
  tasks = tasks.filter((task) => task.id !== item.dataset.id);
  saveTasks();
  render();
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;
    if (editorOpen) closeEditor();
    else render();
  });
});

sidebarAdd.addEventListener("click", openEditor);
openTaskForm.addEventListener("click", openEditor);
cancelTask.addEventListener("click", closeEditor);
input.addEventListener("input", clearTaskError);

dayPicker.addEventListener("click", (event) => {
  const button = event.target.closest(".day-option");
  if (!button) return;

  dateInput.value = button.dataset.date;
  renderWeekPicker();
});

setDefaultDate();
saveTasks();
render();
