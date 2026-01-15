// ======= Global State =======

// Array that holds all task objects in memory
let tasks = [];

// Stores the currently selected filter tab
let currentFilter = 'all'; // possible values: 'all' | 'completed' | 'pending'

const WORKFLOW = {
  BACKLOG: ['IN_PROGRESS'],
  IN_PROGRESS: ['REVIEW'],
  REVIEW: ['DONE'],
  DONE: []
};


// Load persisted tasks and theme if available
(function initFromStorage() {

  // Try/catch prevents app crash if stored JSON is invalid
  try {
    // Read saved tasks from browser localStorage
    const raw = localStorage.getItem('smartTodoTasks');

    // Parse JSON and ensure it's an array before assigning
    tasks = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
  } catch {
    // Fallback to empty array if parsing fails
    tasks = [];
  }

  // Read saved theme preference
  const savedTheme = localStorage.getItem('smartTodoTheme');

  // If user previously selected light theme
  if (savedTheme === 'light') {
    // Apply light theme CSS class
    document.body.classList.add('light');

    // Update accessibility state of toggle button
    document.getElementById('themeToggle').setAttribute('aria-pressed', 'true');
  }
})(); // Immediately Invoked Function Expression (IIFE)

// ======= DOM References =======

// Form used to add new tasks
const addForm = document.getElementById('addForm');

// Text input where user types task title
const taskInput = document.getElementById('taskInput');
const assigneeInput = document.getElementById("assigneeInput");
const statusSelect = document.getElementById("statusSelect");
const descInput = document.getElementById('descInput');
const prioritySelect = document.getElementById('prioritySelect');
// Empty state shown when no tasks exist
const emptyState = document.getElementById('emptyState');
// State shown when filter returns no matching tasks
const noMatchState = document.getElementById('noMatchState');
// Priority select element

// ======= Utilities =======

// Generates a reasonably unique ID using timestamp + random number
const uid = () => Date.now() + Math.floor(Math.random() * 1000);

// Saves the current tasks array into localStorage
const saveToStorage = () =>
  localStorage.setItem('smartTodoTasks', JSON.stringify(tasks));
// ======= WORKFLOW VALIDATION =======

function canMove(task, nextStatus) {
  if (!WORKFLOW[task.status].includes(nextStatus)) {
    return { ok: false, reason: 'Invalid workflow transition' };
  }

  if (nextStatus === 'DONE' && !task.hasBeenInReview) {
    return { ok: false, reason: 'Task must be reviewed first' };
  }

  return { ok: true };
}

// Returns tasks based on selected filter
const getFilteredTasks = (filter) => {
  const today = new Date().toISOString().split("T")[0];

  switch (filter) {
    case "completed":
      return tasks.filter(t => t.completed);

    case "pending":
      return tasks.filter(t => t.dueDate < today && !t.completed);

    case "upcoming":
      return tasks.filter(t => t.dueDate >= today && !t.completed);

    default:
      return tasks;
  }
};
// determine group of a task
function getGroup(task) {
  if (!task.dueDate) return "Upcoming";
  const today = new Date().toISOString().split("T")[0];

  if (task.completed) return "Completed";
  if (task.dueDate < today) return "Overdue";
  if (task.dueDate === today) return "Today";
  return "Upcoming";
}


// Priority ordering helper (lower number = higher priority)
const priorityOrder = (p) => ({ 'High': 1, 'Medium': 2, 'Low': 3 }[p] || 2);

// Sort tasks: uncompleted first, then by priority (High→Medium→Low). Completed tasks are placed at the bottom.
function sortTasks() {
  const groupOrder = { Overdue:1, Today:2, Upcoming:3 };

  tasks.sort((a,b)=>{
    if(a.completed !== b.completed) return a.completed - b.completed;

    const ga = groupOrder[getGroup(a)];
    const gb = groupOrder[getGroup(b)];
    if(ga !== gb) return ga - gb;

    return priorityOrder(a.priority) - priorityOrder(b.priority);
  });
}

// ======= Core Functions =======

// Adds a new task to the list
function addTask(title, priority, assignee) {
  if (!title || !priority) {
    alert('Title and priority are required');
    return;
  }

  if (tasks.some(t => t.title.toLowerCase() === title.toLowerCase())) {
    alert('Duplicate task title');
    return;
  }

  tasks.push({
    id: Date.now(),
    title,
    description: descInput.value.trim(),
    priority,
    assignee,
    status: 'BACKLOG',
    reviewed: false
  });

  save();
  renderBoard();
}

function moveTask(id, nextStatus) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const check = canMove(task, nextStatus);
  if (!check.ok) return;

  task.status = nextStatus;

  if (nextStatus === 'REVIEW') {
    task.hasBeenInReview = true;
  }

  saveToStorage();
  renderBoard();
}


// Deletes a task by ID
function deleteTask(id) {
  // Find index of task with matching ID
  const idx = tasks.findIndex(t => t.id === id);

  // Only delete if task exists
  if (idx !== -1) {
    tasks.splice(idx, 1); // remove task from array
    saveToStorage();      // persist change
    renderTasks(currentFilter); // update UI
  }
}

// Toggles completed status of a task
function toggleComplete(id) {
  const idx = tasks.findIndex(t => t.id === id);

  if (idx !== -1) {
    // Flip boolean value
    tasks[idx].completed = !tasks[idx].completed;

    // Reorder so completed tasks move to bottom
    sortTasks();
    saveToStorage();
    renderTasks(currentFilter);
  }
}
// Renders tasks based on active filter
function renderTasks(filter = 'all') {
  currentFilter = filter;
function renderBoard() {
  // loop over every column in HTML
  document.querySelectorAll('.column').forEach(column => {
    const columnStatus = column.dataset.status; // BACKLOG, IN_PROGRESS...
    const list = column.querySelector('.column-list');
    // clear old tasks
    list.innerHTML = '';
    // get tasks that match this column's status
    const matchingTasks = tasks.filter(
      task => task.status === columnStatus
    );
    // if no tasks → show empty message
    if (matchingTasks.length === 0) {
      list.innerHTML = `<li class="empty">No tasks</li>`;
      return;
    }
    // insert tasks into correct box
    matchingTasks.forEach(task => {
      list.insertAdjacentHTML('beforeend', taskCard(task));
    });
  });
}
// ======= TASK CARD UI =======

function taskCard(t) {
  const next = WORKFLOW[t.status][0];
  const check = next ? canMove(t, next) : null;

  return `
    <li class="task-card">
      <strong>${t.title}</strong>

      <small>
        ${t.priority} • ${t.assignee || 'Unassigned'}
      </small>

      <!-- STATUS BUTTON -->
      <button class="status-btn" disabled>
        ${t.status.replace('_', ' ')}
      </button>

      <div class="actions">
        <button onclick="showDescription(${t.id})">
          Description
        </button>

        ${next ? `
          <button
            ${check.ok ? '' : 'disabled'}
            title="${check.ok ? 'Move forward' : check.reason}"
            onclick="moveTask(${t.id}, '${next}')">
            Move →
          </button>
        ` : ''}
      </div>
    </li>
  `;
}


function showDescription(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  alert(task.description ? task.description : 'No description added for this task.');
}
  // Ensure tasks are sorted before rendering
  sortTasks();

  // Highlight active filter tab
  document.querySelectorAll('.filter-tab').forEach(btn => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  // Get tasks that match current filter
  const visible = getFilteredTasks(filter);

  // Show empty state only when no tasks exist at all
  emptyState.hidden = tasks.length !== 0;

  // Show "no match" state when tasks exist but filter matches none
  noMatchState.hidden = tasks.length === 0 || visible.length !== 0;

  // Render task list
  if (visible.length === 0) {
    taskList.innerHTML = ''; // clear list
  } else {
    // Convert each task to HTML and insert into DOM
    taskList.innerHTML = visible.map(taskTemplate).join('');
  }

  // Refresh statistics
  updateStats();
}

// Generates HTML for a single task
function taskTemplate(t) {
  const emoji = (p) => p === 'High' ? '🔺' : (p === 'Low' ? '🔻' : '▫️');
  return `
    <li class="task-item" data-id="${t.id}">
      <input type="checkbox"
             class="checkbox"
             ${t.completed ? 'checked' : ''}
             aria-label="Mark complete" />
      <p class="task-title ${t.completed ? 'completed' : ''}">
       ${t.title}
      <span class="priority-badge">${emoji(t.priority)} ${t.priority}</span>
      <span class="due-date">📅 ${t.dueDate || "No date"}</span>
      <span class="group-badge">${getGroup(t)}</span></p>
      <div class="task-actions">
        <button class="delete-btn"
                aria-label="Delete task"
                title="Delete">🗑️</button>
      </div>
    </li>
  `;
}

// ======= Event Handling =======

// Handle new task form submission
addForm.addEventListener('submit',function (e) {
  e.preventDefault();

  addTask(
    taskInput.value.trim(),
    prioritySelect.value,
    assigneeInput.value.trim()
  );

  addForm.reset();
});


// Handle filter tab clicks
filterTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    renderTasks(btn.dataset.filter);
  });
});

// Event delegation for task list
taskList.addEventListener('click', (e) => {
  const li = e.target.closest('.task-item');
  if (!li) return;

  const id = Number(li.dataset.id);

  // Toggle completion checkbox
  if (e.target.matches('.checkbox')) {
    toggleComplete(id);
  }

  // Delete task
  if (e.target.matches('.delete-btn')) {
    deleteTask(id);
  }
});

// ======= Inline Editing =======

// Enables inline editing of a task title
function startInlineEdit(li) {
  const id = Number(li.dataset.id);
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return;

  const titleEl = li.querySelector('.task-title');
  const current = tasks[idx].title;

  // Create text input for editing
  const input = document.createElement('input');
  input.type = 'text';
  input.value = current;
  input.className = 'edit-input';

  // Replace title with input
  li.replaceChild(input, titleEl);
  input.focus();
  input.select();

  // Save changes
  const commit = () => {
    const newTitle = input.value.trim();
    // If empty, revert to previous
    if (!newTitle) {
      tasks[idx].title = current;
      renderTasks(currentFilter);
      return;
    }

    // Prevent duplicate names when editing (case-insensitive)
    if (tasks.some((tt, i) => i !== idx && tt.title.toLowerCase() === newTitle.toLowerCase())) {
      alert('Duplicate task names are not allowed.');
      input.focus();
      return;
    }

    tasks[idx].title = newTitle;
    sortTasks();
    saveToStorage();
    renderTasks(currentFilter);
  };

  // Save on blur
  input.addEventListener('blur', commit);

  // Keyboard shortcuts
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      input.blur(); // triggers save
    } else if (ev.key === 'Escape') {
      renderTasks(currentFilter); // cancel edit
    }
  });
}

// Double-click to start editing
taskList.addEventListener('dblclick', (e) => {
  const li = e.target.closest('.task-item');
  if (!li) return;

  if (e.target.matches('.task-title')) {
    startInlineEdit(li);
  }
});

// Keyboard accessibility: Enter to edit
taskList.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('.task-title')) {
    const li = e.target.closest('.task-item');
    startInlineEdit(li);
  }
});

// ======= Theme Toggle =======

// Theme toggle button reference
const themeToggle = document.getElementById('themeToggle');

// Toggle light/dark theme
themeToggle.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light');
  themeToggle.setAttribute('aria-pressed', String(isLight));
  localStorage.setItem('smartTodoTheme', isLight ? 'light' : 'dark');
});

// Initial render on page load
renderBoard();