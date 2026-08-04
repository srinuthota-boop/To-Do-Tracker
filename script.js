const form = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const searchInput = document.getElementById('search-input');
const filterSelect = document.getElementById('filter-select');
const trackerBody = document.getElementById('tracker-body');
const trackerTable = document.getElementById('tracker-table');
const storageKey = 'dailyProgressTrackerData';

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function formatDateLabel(dateKey) {
  const parts = dateKey.split('-');
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return String(date.getDate());
}

function getPreviousDateKey(dateKey) {
  const parts = dateKey.split('-');
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  date.setDate(date.getDate() - 1);
  return getDateKey(date);
}

function getMonthDates(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthDates = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    monthDates.push(getDateKey(new Date(year, month, day)));
  }

  return monthDates;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createDefaultData() {
  const monthDates = getMonthDates(new Date());
  const history = {};

  monthDates.forEach(function (date) {
    history[date] = false;
  });

  return {
    dates: monthDates,
    tasks: [
      { id: 1, name: 'Prepare weekly project brief', streak: 0, history: Object.assign({}, history) },
      { id: 2, name: 'Review client feedback', streak: 0, history: Object.assign({}, history) },
      { id: 3, name: 'Finalize sprint goals', streak: 1, history: Object.assign({}, history, { [monthDates[monthDates.length - 1]]: true }) },
      { id: 4, name: 'Update team calendar', streak: 1, history: Object.assign({}, history, { [monthDates[monthDates.length - 1]]: true }) }
    ]
  };
}

function migrateLegacyTasks() {
  const savedTasks = localStorage.getItem('dailyTasks');

  if (!savedTasks) {
    return null;
  }

  try {
    const parsed = JSON.parse(savedTasks);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const today = getDateKey(new Date());
    return {
      dates: [today],
      tasks: parsed.map(function (task, index) {
        return {
          id: task.id || Date.now() + index,
          name: task.text || 'Untitled task',
          history: { [today]: Boolean(task.completed) }
        };
      })
    };
  } catch (error) {
    return null;
  }
}

function getTaskStreak(task, dates) {
  if (!task || !task.history) {
    return 0;
  }

  const todayKey = getDateKey(new Date());
  let streak = 0;
  let currentDate = todayKey;

  while (dates.includes(currentDate) && task.history[currentDate] === true) {
    streak += 1;
    currentDate = getPreviousDateKey(currentDate);
  }

  return streak;
}

function normalizeData(data) {
  if (!data || !Array.isArray(data.tasks)) {
    return createDefaultData();
  }

  const monthDates = getMonthDates(new Date());
  const visibleDates = monthDates;

  data.dates = visibleDates;
  data.tasks = data.tasks.map(function (task, index) {
    if (!task || typeof task !== 'object') {
      return { id: Date.now() + index, name: 'Untitled task', streak: 0, history: {} };
    }

    const history = task.history && typeof task.history === 'object' ? task.history : {};

    visibleDates.forEach(function (date) {
      if (history[date] === undefined) {
        history[date] = false;
      }
    });

    return {
      id: task.id || Date.now() + index,
      name: task.name || task.text || 'Untitled task',
      streak: getTaskStreak(task, visibleDates),
      history: history
    };
  });

  return data;
}

function loadData() {
  const savedData = localStorage.getItem(storageKey);

  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      return normalizeData(parsed);
    } catch (error) {
      localStorage.removeItem(storageKey);
    }
  }

  const migratedData = migrateLegacyTasks();
  if (migratedData) {
    saveData(migratedData);
    return normalizeData(migratedData);
  }

  const defaultData = createDefaultData();
  saveData(defaultData);
  return defaultData;
}

function saveData(data) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function updateStats(data) {
  const todayKey = getDateKey(new Date());
  const totalTasks = data.tasks.length;
  let completedToday = 0;
  let completedAll = 0;
  let totalCells = 0;

  data.tasks.forEach(function (task) {
    if (task.history && task.history[todayKey]) {
      completedToday += 1;
    }

    Object.keys(task.history || {}).forEach(function (date) {
      totalCells += 1;
      if (task.history[date]) {
        completedAll += 1;
      }
    });
  });

  const pendingToday = totalTasks - completedToday;
  const todayPercent = totalTasks === 0 ? 0 : Math.round((completedToday / totalTasks) * 100);
  const overallPercent = totalCells === 0 ? 0 : Math.round((completedAll / totalCells) * 100);

  document.getElementById('total-tasks-value').textContent = totalTasks;
  document.getElementById('completed-tasks-value').textContent = completedToday;
  document.getElementById('pending-tasks-value').textContent = pendingToday;
  document.getElementById('today-progress-value').textContent = todayPercent + '%';
  document.getElementById('completion-rate-value').textContent = overallPercent + '%';
  document.getElementById('progress-percent').textContent = todayPercent + '%';
  document.getElementById('task-progress').value = todayPercent;
}

function renderTable() {
  const data = normalizeData(loadData());
  saveData(data);
  updateStats(data);

  const todayKey = getDateKey(new Date());
  const searchTerm = searchInput.value.trim().toLowerCase();
  const filterValue = filterSelect.value;
  const visibleTasks = data.tasks.filter(function (task) {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm);
    let matchesFilter = true;

    if (filterValue === 'pending') {
      matchesFilter = task.history && task.history[todayKey] !== true;
    } else if (filterValue === 'completed') {
      matchesFilter = task.history && task.history[todayKey] === true;
    } else if (filterValue === 'today') {
      matchesFilter = task.history && task.history[todayKey] === true;
    }

    return matchesSearch && matchesFilter;
  });

  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th class="task-name-col">Task Name</th>' + data.dates.map(function (date) {
    const isToday = date === todayKey;
    return '<th class="date-column-header' + (isToday ? ' today' : '') + '">' + formatDateLabel(date) + '</th>';
  }).join('');

  trackerTable.querySelector('thead').innerHTML = '';
  trackerTable.querySelector('thead').appendChild(headerRow);
  trackerBody.innerHTML = '';

  visibleTasks.forEach(function (task) {
    const row = document.createElement('tr');
    row.innerHTML = '<td class="task-name-cell"><div class="task-name-wrapper"><div><span class="task-name-text">' + escapeHtml(task.name) + '</span><span class="streak-badge">🔥 ' + task.streak + ' days</span></div><div class="task-actions"><button type="button" class="action-btn edit-btn" data-task-id="' + task.id + '" title="Edit task">✏️</button><button type="button" class="action-btn delete-btn" data-task-id="' + task.id + '" title="Delete task">🗑️</button></div></div></td>' + data.dates.map(function (date) {
      const checked = task.history && task.history[date] ? 'checked' : '';
      const isToday = date === todayKey;
      return '<td class="date-cell' + (isToday ? ' today-cell' : '') + '"><label class="checkbox-cell"><input type="checkbox" data-task-id="' + task.id + '" data-date="' + date + '" ' + checked + ' /></label></td>';
    }).join('');

    trackerBody.appendChild(row);
  });
}

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const taskName = taskInput.value.trim();

  if (taskName === '') {
    alert('Please enter a task first.');
    return;
  }

  const data = normalizeData(loadData());
  const today = getDateKey(new Date());
  const newTask = {
    id: Date.now(),
    name: taskName,
    streak: 0,
    history: {}
  };

  data.dates.forEach(function (date) {
    newTask.history[date] = false;
  });

  newTask.history[today] = false;
  data.tasks.push(newTask);

  saveData(data);
  taskInput.value = '';
  renderTable();
});

trackerBody.addEventListener('click', function (event) {
  const button = event.target.closest('button');

  if (!button) {
    return;
  }

  const taskId = Number(button.getAttribute('data-task-id'));
  const data = normalizeData(loadData());

  if (button.classList.contains('delete-btn')) {
    const confirmed = window.confirm('Delete this task?');

    if (!confirmed) {
      return;
    }

    data.tasks = data.tasks.filter(function (task) {
      return task.id !== taskId;
    });

    saveData(data);
    renderTable();
  }

  if (button.classList.contains('edit-btn')) {
    const task = data.tasks.find(function (item) {
      return item.id === taskId;
    });

    if (!task) {
      return;
    }

    const updatedName = window.prompt('Edit task name', task.name);

    if (updatedName !== null) {
      const trimmedName = updatedName.trim();

      if (trimmedName !== '') {
        task.name = trimmedName;
        saveData(data);
        renderTable();
      }
    }
  }
});

trackerBody.addEventListener('change', function (event) {
  const checkbox = event.target.closest('input[type="checkbox"]');

  if (!checkbox) {
    return;
  }

  const taskId = Number(checkbox.getAttribute('data-task-id'));
  const date = checkbox.getAttribute('data-date');
  const data = normalizeData(loadData());

  const task = data.tasks.find(function (item) {
    return item.id === taskId;
  });

  if (task) {
    if (!task.history) {
      task.history = {};
    }

    task.history[date] = checkbox.checked;
    task.streak = getTaskStreak(task, data.dates);
    saveData(data);
    renderTable();
  }
});

searchInput.addEventListener('input', renderTable);
filterSelect.addEventListener('change', renderTable);

renderTable();
