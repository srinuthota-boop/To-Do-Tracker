const addBtn = document.getElementById('add-task-btn');
const taskInput = document.getElementById('task-input');
const pendingList = document.getElementById('pending-task-list');
const completedList = document.getElementById('completed-task-list');

const defaultTasks = [
  { id: 1, text: 'Prepare weekly project brief', completed: false },
  { id: 2, text: 'Review client feedback', completed: false },
  { id: 3, text: 'Finalize sprint goals', completed: true },
  { id: 4, text: 'Update team calendar', completed: true }
];

function getTasks() {
  const savedTasks = localStorage.getItem('dailyTasks');

  if (!savedTasks) {
    return defaultTasks;
  }

  try {
    return JSON.parse(savedTasks);
  } catch (error) {
    return defaultTasks;
  }
}

function saveTasks(tasks) {
  localStorage.setItem('dailyTasks', JSON.stringify(tasks));
}

function updateStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(function (task) {
    return task.completed;
  }).length;
  const pending = total - completed;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById('total-tasks-value').textContent = total;
  document.getElementById('completed-tasks-value').textContent = completed;
  document.getElementById('pending-tasks-value').textContent = pending;
  document.getElementById('completion-rate-value').textContent = percentage + '%';
  document.getElementById('progress-percent').textContent = percentage + '%';
  document.getElementById('task-progress').value = percentage;
  document.getElementById('pending-task-count').textContent = pending;
  document.getElementById('completed-task-count').textContent = completed;
}

function createTaskItem(task) {
  const item = document.createElement('li');
  item.className = 'task-item ' + (task.completed ? 'completed-item' : 'pending-item');

  item.innerHTML = `
    <label class="task-check">
      <input type="checkbox" ${task.completed ? 'checked' : ''} />
      <span>${task.text}</span>
    </label>
    <button type="button" class="delete-btn">Delete</button>
  `;

  const checkbox = item.querySelector('input');
  const labelText = item.querySelector('span');
  const deleteBtn = item.querySelector('.delete-btn');

  if (task.completed) {
    labelText.style.textDecoration = 'line-through';
    labelText.style.color = '#64748b';
  }

  checkbox.addEventListener('change', function () {
    const tasks = getTasks();
    const selectedTask = tasks.find(function (taskItem) {
      return taskItem.id === task.id;
    });

    if (selectedTask) {
      selectedTask.completed = this.checked;
      saveTasks(tasks);
      renderTasks();
    }
  });

  deleteBtn.addEventListener('click', function () {
    const tasks = getTasks().filter(function (taskItem) {
      return taskItem.id !== task.id;
    });

    saveTasks(tasks);
    renderTasks();
  });

  return item;
}

function renderTasks() {
  const tasks = getTasks();

  pendingList.innerHTML = '';
  completedList.innerHTML = '';

  tasks.forEach(function (task) {
    const taskItem = createTaskItem(task);

    if (task.completed) {
      completedList.appendChild(taskItem);
    } else {
      pendingList.appendChild(taskItem);
    }
  });

  updateStats(tasks);
}

addBtn.addEventListener('click', function (event) {
  event.preventDefault();

  const taskText = taskInput.value.trim();

  if (taskText === '') {
    alert('Please enter a task first.');
    return;
  }

  const tasks = getTasks();
  tasks.push({
    id: Date.now(),
    text: taskText,
    completed: false
  });

  saveTasks(tasks);
  taskInput.value = '';
  renderTasks();
});

renderTasks();
