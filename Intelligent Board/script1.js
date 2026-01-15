// ===============================
// SMART WORK PLANNER – CLEAN JS
// ===============================

// ======= GLOBAL STATE =======
let tasks = [];

// Workflow rules
const WORKFLOW = {
  BACKLOG: ["IN_PROGRESS"],
  IN_PROGRESS: ["REVIEW"],
  REVIEW: ["DONE"],
  DONE: []
};

// ======= STORAGE =======
function saveToStorage() {
  localStorage.setItem("smartTodoTasks", JSON.stringify(tasks));
}

function loadFromStorage() {
  const raw = localStorage.getItem("smartTodoTasks");
  tasks = raw ? JSON.parse(raw) : [];
}

// ======= DOM REFERENCES =======
const addForm = document.getElementById("addForm");
const taskInput = document.getElementById("taskInput");
const descInput = document.getElementById("descInput");
const prioritySelect = document.getElementById("prioritySelect");
const assigneeInput = document.getElementById("assigneeInput");

// ======= INIT =======
loadFromStorage();
renderBoard();

// ======= ADD TASK =======
function addTask(title, description, priority, assignee) {
  if (!title || !priority) {
    alert("Title and Priority are required");
    return;
  }

  tasks.push({
    id: Date.now(),
    title,
    description,
    priority,
    assignee,
    status: "BACKLOG",
    hasBeenInReview: false
  });

  saveToStorage();
  renderBoard();
}

// ======= MOVE TASK =======
function moveTask(id, nextStatus) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  // workflow validation
  if (!WORKFLOW[task.status].includes(nextStatus)) return;

  if (nextStatus === "REVIEW") {
    task.hasBeenInReview = true;
  }

  task.status = nextStatus;

  saveToStorage();
  renderBoard();
}

// ======= DELETE TASK =======
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveToStorage();
  renderBoard();
}

// ======= RENDER BOARD =======
function renderBoard() {
  document.querySelectorAll(".column").forEach(column => {
    const status = column.dataset.status;
    const list = column.querySelector(".column-list");

    list.innerHTML = "";

    const columnTasks = tasks.filter(t => t.status === status);

    if (columnTasks.length === 0) {
      list.innerHTML = `<li class="empty">No tasks</li>`;
      return;
    }

    columnTasks.forEach(task => {
      list.insertAdjacentHTML("beforeend", taskCard(task));
    });
  });
}

// ======= TASK CARD =======
function taskCard(task) {
  const nextStatus = WORKFLOW[task.status][0];

  return `
    <li class="task-card">
      <strong>${task.title}</strong>

      <small>
        Priority: ${task.priority} • ${task.assignee || "Unassigned"}
      </small>

      <button class="status-btn" disabled>
        ${task.status.replace("_", " ")}
      </button>

      <div class="actions">
        <button onclick="showDescription(${task.id})">
          Description
        </button>

        ${
          nextStatus
            ? `<button onclick="moveTask(${task.id}, '${nextStatus}')">
                 Move →
               </button>`
            : ""
        }

        <button onclick="deleteTask(${task.id})" style="background:#ef4444;color:white">
          Delete
        </button>
      </div>
    </li>
  `;
}

// ======= DESCRIPTION =======
function showDescription(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  alert(task.description || "No description added.");
}

// ======= FORM SUBMIT =======
addForm.addEventListener("submit", function (e) {
  e.preventDefault();

  addTask(
    taskInput.value.trim(),
    descInput.value.trim(),
    prioritySelect.value,
    assigneeInput.value.trim()
  );

  addForm.reset();
});
