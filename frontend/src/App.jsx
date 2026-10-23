import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckSquare,
  ChevronDown,
  CircleHelp,
  House,
  Menu,
  MessageCircle,
  Plus,
  Settings2,
  ShoppingBasket,
  Sparkles,
  X,
} from "lucide-react";

const navigation = [
  { id: "overview", label: "Overview", icon: House },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "shopping", label: "Shopping list", icon: ShoppingBasket },
  { id: "reminders", label: "Reminders", icon: Bell },
];

const comingSoonContent = {
  tasks: {
    eyebrow: "YOUR TO-DO LIST",
    title: "Tasks",
    description:
      "Your saved tasks will appear here once Lexa is connected to your household data.",
    icon: CheckSquare,
  },
  shopping: {
    eyebrow: "THE HOUSEHOLD LIST",
    title: "Shopping list",
    description:
      "Your saved shopping items will appear here once Lexa is connected to your household data.",
    icon: ShoppingBasket,
  },
  reminders: {
    eyebrow: "WHAT'S COMING UP",
    title: "Reminders",
    description:
      "Your saved reminders will appear here once Lexa is connected to your household data.",
    icon: Bell,
  },
  assistant: {
    eyebrow: "YOUR HOUSEHOLD ASSISTANT",
    title: "Ask Lexa",
    description:
      "The assistant needs a server-side API before it can answer or take actions. No requests are sent from this preview.",
    icon: MessageCircle,
  },
};

function Brand() {
  return (
    <a className="brand" href="#overview" aria-label="Lexa home">
      <img className="brand-logo" src="/logo2.png" alt="Lexa" />
    </a>
  );
}

function NavLink({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      className={`nav-link${active ? " is-active" : ""}`}
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      <span>{item.label}</span>
      {item.id === "tasks" && <span className="nav-dot" aria-hidden="true" />}
    </button>
  );
}

function Sidebar({ activeView, onNavigate, isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close navigation menu"
          onClick={onClose}
        />
      )}
      <aside className={`sidebar${isOpen ? " is-open" : ""}`}>
        <div className="sidebar-top">
          <Brand />
          <button
            className="icon-button sidebar-close"
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
          >
            <X size={18} />
          </button>
          <div className="workspace-switcher">
            <span className="workspace-avatar">H</span>
            <span className="workspace-copy">
              <span className="workspace-label">WORKSPACE</span>
              <span className="workspace-name">Home</span>
            </span>
            <ChevronDown size={15} aria-hidden="true" />
          </div>
        </div>

        <nav className="primary-nav" aria-label="Main navigation">
          <p className="nav-heading">YOUR SPACE</p>
          {navigation.map((item) => (
            <NavLink
              key={item.id}
              item={item}
              active={activeView === item.id}
              onClick={() => onNavigate(item.id)}
            />
          ))}
          <p className="nav-heading nav-heading-spaced">ASSISTANT</p>
          <NavLink
            item={{
              id: "assistant",
              label: "Ask Lexa",
              icon: MessageCircle,
            }}
            active={activeView === "assistant"}
            onClick={() => onNavigate("assistant")}
          />
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-link" type="button" disabled>
            <CircleHelp size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>Help center</span>
          </button>
          <button className="nav-link" type="button" disabled>
            <Settings2 size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>Settings</span>
          </button>
          <div className="profile-row">
            <span className="profile-avatar" aria-hidden="true">B</span>
            <span className="profile-copy">
              <span className="profile-name">Household</span>
              <span className="profile-caption">Personal space</span>
            </span>
            <button
              className="icon-button profile-menu"
              type="button"
              aria-label="More profile options"
              disabled
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function PageHeader({ title, eyebrow, onMenuOpen }) {
  return (
    <header className="page-header">
      <button
        type="button"
        className="icon-button mobile-menu"
        aria-label="Open navigation menu"
        onClick={onMenuOpen}
      >
        <Menu size={20} />
      </button>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="header-actions">
        <span className="connection-label">
          <span className="status-indicator" />
          API connection coming next
        </span>
        <button
          className="icon-button notification-button"
          type="button"
          aria-label="Notifications are not available yet"
          disabled
        >
          <Bell size={18} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}

function DataPlaceholder({ icon: Icon, title, description }) {
  return (
    <div className="data-placeholder">
      <span className="placeholder-icon">
        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <p className="placeholder-title">{title}</p>
      <p className="placeholder-description">{description}</p>
      <span className="placeholder-note">
        <span className="placeholder-note-dot" />
        Connects in the next stage
      </span>
    </div>
  );
}


function MetricCard({ icon: Icon, label, accent, value, loading }) {
  return (
    <article className="metric-card">
      <div className="metric-card-top">
        <span className={`metric-icon ${accent}`}>
          <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
        </span>
        <span className="metric-period">
          {loading ? "LOADING" : "LIVE DATA"}
        </span>
      </div>
      <p className="metric-value">{loading ? "…" : value}</p>
      <p className="metric-label">{label}</p>
    </article>
  );
}


function Overview({ tasks, shoppingItems, reminders, loading, onAskLexa }){
  return (
    <>
      <section className="welcome-card">
        <div className="welcome-copy">
          <div className="welcome-kicker">
            <Sparkles size={14} strokeWidth={1.8} aria-hidden="true" />
            A LITTLE MORE IN SYNC
          </div>
          <h2>Your household,<br className="welcome-break" /> coordinated.</h2>
          <p>
            A calmer way to keep up with everything happening at home.
          </p>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <span className="art-orbit art-orbit-one" />
          <span className="art-orbit art-orbit-two" />
          <span className="art-house">
            <House size={37} strokeWidth={1.2} />
          </span>
          <span className="art-check art-check-one"><Check size={13} /></span>
          <span className="art-check art-check-two"><Check size={13} /></span>
        </div>
        <span className="welcome-index">01 / HOME</span>
      </section>

      <section className="metrics-grid" aria-label="Household overview">
        
        <MetricCard
          icon={CheckSquare}
          label="Open tasks"
          accent="accent-lime"
          value={tasks.filter((task) => task.status !== "completed").length}
          loading={loading}
        />
        <MetricCard
          icon={ShoppingBasket}
          label="Shopping items"
          accent="accent-peach"
          value={shoppingItems.filter((item) => !item.purchased).length}
          loading={loading}
        />
        <MetricCard
          icon={Bell}
          label="Upcoming reminders"
          accent="accent-blue"
          value={reminders.filter((reminder) => !reminder.completed).length}
          loading={loading}
        />

      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">AT A GLANCE</p>
          <h2>Your day</h2>
        </div>
        <span className="date-chip">
          {new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          }).format(new Date())}
        </span>
      </div>

      <section className="dashboard-panels">
        <article className="panel panel-tasks">
          <div className="panel-heading">
            <div className="panel-title-group">
              <span className="panel-heading-icon task-heading-icon">
                <CheckSquare size={16} aria-hidden="true" />
              </span>
              <h3>Tasks</h3>
            </div>
            <button className="text-link" type="button" disabled>
              View all
            </button>
          </div>
          {loading ? (
            <p className="data-placeholder">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <DataPlaceholder
              icon={CheckSquare}
              title="All clear for now"
              description="Your household tasks will appear here when you add them."
            />
          ) : (
            <div className="live-list">
              {tasks.slice(0, 4).map((task) => (
                <div className="live-list-item" key={task._id}>
                  <span className="live-item-icon">
                    <CheckSquare size={16} aria-hidden="true" />
                  </span>

                  <div className="live-item-copy">
                    <p className="live-item-title">{task.title}</p>
                    <p className="live-item-meta">
                      {task.priority || "medium"} priority
                      {" · "}
                      {(task.status || "pending").replace("_", " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel panel-reminders">
          <div className="panel-heading">
            <div className="panel-title-group">
              <span className="panel-heading-icon reminder-heading-icon">
                <Bell size={16} aria-hidden="true" />
              </span>
              <h3>Coming up</h3>
            </div>
            <button className="text-link" type="button" disabled>
              View all
            </button>
          </div>
          {loading ? (
          <p className="data-placeholder">Loading reminders...</p>
        ) : reminders.filter(
            (reminder) =>
              !reminder.completed &&
              new Date(reminder.remindAt).getTime() >= Date.now()
          ).length === 0 ? (
          <DataPlaceholder
            icon={Bell}
            title="Nothing coming up"
            description="Your upcoming reminders will appear here."
          />
        ) : (
          <div className="live-list">
            {reminders
              .filter(
                (reminder) =>
                  !reminder.completed &&
                  new Date(reminder.remindAt).getTime() >= Date.now()
              )
              .sort(
                (a, b) =>
                  new Date(a.remindAt).getTime() -
                  new Date(b.remindAt).getTime()
              )
              .slice(0, 4)
              .map((reminder) => (
                <div className="live-list-item" key={reminder._id}>
                  <span className="live-item-icon reminder-item-icon">
                    <Bell size={16} aria-hidden="true" />
                  </span>

                  <div className="live-item-copy">
                    <p className="live-item-title">{reminder.title}</p>
                    <p className="live-item-meta">
                      {new Intl.DateTimeFormat(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(reminder.remindAt))}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
        </article>
      </section>

      <section className="assistant-banner">
        <span className="assistant-symbol" aria-hidden="true">
          <Sparkles size={19} strokeWidth={1.8} />
        </span>
        <div className="assistant-banner-copy">
          <p className="assistant-banner-title">A hand when you need one.</p>
          <p>Ask Lexa to help coordinate your home.</p>
        </div>
        <button
          className="assistant-banner-button"
          type="button"
          onClick={onAskLexa}
        >
          <Plus size={16} aria-hidden="true" />
          Ask Lexa
        </button>
      </section>
    </>
  );
}


function TasksView({ tasks, onTaskCreated, loading }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          status: "pending",
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Couldn't create the task."
        );
      }

      await onTaskCreated();
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueAt("");
      setSuccess("Task created successfully!");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel tasks-page">
      <div className="tasks-page-heading">
        <div>
          <p className="eyebrow">YOUR TO-DO LIST</p>
          <h2>Tasks</h2>
          <p className="standalone-description">
            Keep track of what needs to get done at home.
          </p>
        </div>
        <span className="tasks-count">
          {tasks.filter((task) => task.status !== "completed").length} open
        </span>
      </div>

      <form className="task-form" onSubmit={handleSubmit}>
        <h3>Add a task</h3>

        <label htmlFor="task-title">Task title</label>
        <input
          id="task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Buy groceries"
          maxLength={150}
          required
        />

        <label htmlFor="task-description">Description (optional)</label>
        <textarea
          id="task-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add a few details..."
          rows={2}
          maxLength={1000}
        />

        <div className="task-form-row">
          <div>
            <label htmlFor="task-priority">Priority</label>
            <select
              id="task-priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label htmlFor="task-due">Due date (optional)</label>
            <input
              id="task-due"
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </div>
        </div>

        {error && <p className="task-form-error" role="alert">{error}</p>}
        {success && <p className="task-form-success" role="status">{success}</p>}

        <button className="task-submit-button" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Add task"}
        </button>
      </form>

      <div className="tasks-list-heading">
        <h3>Saved tasks</h3>
        <span>{tasks.length} total</span>
      </div>

      {loading ? (
        <p className="data-placeholder">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="data-placeholder">No tasks yet. Add your first task above.</p>
      ) : (
        <div className="tasks-full-list">
          {tasks.map((task) => (
            <article className="tasks-full-list-item" key={task._id}>
              <div className="tasks-full-list-copy">
                <h4>{task.title}</h4>
                {task.description && <p>{task.description}</p>}
                <span className={`task-priority priority-${task.priority || "medium"}`}>
                  {task.priority || "medium"} priority
                </span>
              </div>

              <div className="task-status-area">
                <span className="task-status">
                  {(task.status || "pending").replace("_", " ")}
                </span>
                {task.dueAt && (
                  <span className="task-due-date">
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(task.dueAt))}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}


function ShoppingView({ shoppingItems, onShoppingChanged, loading }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleAdd(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const parsedQuantity = Number(quantity);

    if (!name.trim()) {
      setError("Please enter an item name.");
      return;
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setError("Quantity must be a whole number of at least 1.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          quantity: parsedQuantity,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Couldn't add the shopping item."
        );
      }

      await onShoppingChanged();
      setName("");
      setQuantity("1");
      setSuccess("Item added to your shopping list!");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePurchased(item) {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/shopping/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchased: !item.purchased }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Couldn't update this item."
        );
      }

      await onShoppingChanged();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  }

  const remaining = shoppingItems.filter((item) => !item.purchased).length;

  return (
    <section className="panel shopping-page">
      <div className="shopping-page-heading">
        <div>
          <p className="eyebrow">THE HOUSEHOLD LIST</p>
          <h2>Shopping list</h2>
          <p className="standalone-description">
            Keep track of the things your household needs.
          </p>
        </div>
        <span className="shopping-count">{remaining} remaining</span>
      </div>

      <form className="shopping-form" onSubmit={handleAdd}>
        <h3>Add an item</h3>

        <div className="shopping-form-row">
          <div className="shopping-name-field">
            <label htmlFor="shopping-name">Item name</label>
            <input
              id="shopping-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Milk"
              maxLength={100}
              required
            />
          </div>

          <div className="shopping-quantity-field">
            <label htmlFor="shopping-quantity">Quantity</label>
            <input
              id="shopping-quantity"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </div>
        </div>

        {error && <p className="shopping-error" role="alert">{error}</p>}
        {success && <p className="shopping-success" role="status">{success}</p>}

        <button className="shopping-submit-button" type="submit" disabled={saving}>
          {saving ? "Adding..." : "Add to list"}
        </button>
      </form>

      <div className="shopping-list-heading">
        <h3>Your items</h3>
        <span>{shoppingItems.length} total</span>
      </div>

      {loading ? (
        <p className="data-placeholder">Loading shopping list...</p>
      ) : shoppingItems.length === 0 ? (
        <p className="data-placeholder">
          Your list is empty. Add your first shopping item above.
        </p>
      ) : (
        <div className="shopping-items-list">
          {shoppingItems.map((item) => (
            <article
              className={`shopping-item ${item.purchased ? "is-purchased" : ""}`}
              key={item._id}
            >
              <label className="shopping-item-check">
                <input
                  type="checkbox"
                  checked={Boolean(item.purchased)}
                  onChange={() => togglePurchased(item)}
                  aria-label={`Mark ${item.name} as ${item.purchased ? "not purchased" : "purchased"}`}
                />
                <span className="shopping-custom-check" />
              </label>

              <div className="shopping-item-copy">
                <p className="shopping-item-name">{item.name}</p>
                <p className="shopping-item-quantity">
                  Quantity: {item.quantity}
                </p>
              </div>

              <span className="shopping-item-status">
                {item.purchased ? "Purchased" : "Needed"}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}


function RemindersView({ reminders, onRemindersChanged, loading }) {
  const [title, setTitle] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError("Please enter a reminder title.");
      return;
    }

    if (!remindAt || !Number.isFinite(new Date(remindAt).getTime())) {
      setError("Please select a valid reminder date and time.");
      return;
    }

    if (new Date(remindAt).getTime() <= Date.now()) {
      setError("Please choose a future date and time.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          remindAt: new Date(remindAt).toISOString(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Couldn't create the reminder."
        );
      }

      await onRemindersChanged();
      setTitle("");
      setRemindAt("");
      setSuccess("Reminder created successfully!");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCompleted(reminder) {
    setError("");
    setSuccess("");
    setUpdatingId(reminder._id);

    try {
      const response = await fetch(`/api/reminders/${reminder._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !reminder.completed }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Couldn't update the reminder."
        );
      }

      await onRemindersChanged();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setUpdatingId("");
    }
  }

  const sortedReminders = [...reminders].sort(
    (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
  );

  const pendingCount = reminders.filter(
    (reminder) => !reminder.completed
  ).length;

  return (
    <section className="panel reminders-page">
      <div className="reminders-page-heading">
        <div>
          <p className="eyebrow">WHAT'S COMING UP</p>
          <h2>Reminders</h2>
          <p className="standalone-description">
            Keep important moments and plans on your radar.
          </p>
        </div>
        <span className="reminders-count">{pendingCount} pending</span>
      </div>

      <form className="reminder-form" onSubmit={handleCreate}>
        <h3>Create a reminder</h3>

        <label htmlFor="reminder-title">What do you need to remember?</label>
        <input
          id="reminder-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Pay electricity bill"
          maxLength={150}
          required
        />

        <label htmlFor="reminder-datetime">Date and time</label>
        <input
          id="reminder-datetime"
          type="datetime-local"
          value={remindAt}
          min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
          onChange={(event) => setRemindAt(event.target.value)}
          required
        />

        {error && <p className="reminder-error" role="alert">{error}</p>}
        {success && <p className="reminder-success" role="status">{success}</p>}

        <button
          className="reminder-submit-button"
          type="submit"
          disabled={saving}
        >
          {saving ? "Saving..." : "Create reminder"}
        </button>
      </form>

      <div className="reminders-list-heading">
        <h3>All reminders</h3>
        <span>{reminders.length} total</span>
      </div>

      {loading ? (
        <p className="data-placeholder">Loading reminders...</p>
      ) : sortedReminders.length === 0 ? (
        <p className="data-placeholder">
          No reminders yet. Create your first reminder above.
        </p>
      ) : (
        <div className="reminders-list">
          {sortedReminders.map((reminder) => (
            <article
              className={`reminder-list-item ${reminder.completed ? "is-completed" : ""}`}
              key={reminder._id}
            >
              <label className="reminder-check">
                <input
                  type="checkbox"
                  checked={Boolean(reminder.completed)}
                  disabled={updatingId === reminder._id}
                  onChange={() => toggleCompleted(reminder)}
                  aria-label={`Mark ${reminder.title} as ${reminder.completed ? "incomplete" : "completed"}`}
                />
                <span className="reminder-custom-check" />
              </label>

              <div className="reminder-list-copy">
                <p className="reminder-list-title">{reminder.title}</p>
                <p className="reminder-list-date">
                  {new Intl.DateTimeFormat(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(reminder.remindAt))}
                </p>
              </div>

              <span className="reminder-list-status">
                {reminder.completed ? "Completed" : "Pending"}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}


function ComingSoonView({ view }) {
  const content = comingSoonContent[view];
  const Icon = content.icon;

  return (
    <section className="standalone-empty panel">
      <span className="standalone-icon">
        <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <p className="eyebrow">{content.eyebrow}</p>
      <h2>{content.title}</h2>
      <p className="standalone-description">{content.description}</p>
      <span className="placeholder-note">
        <span className="placeholder-note-dot" />
        Not connected yet
      </span>
    </section>
  );
}

function formatActionValue(field, value) {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (
    ["dueAt", "remindAt"].includes(field) &&
    typeof value === "string" &&
    !Number.isNaN(Date.parse(value))
  ) {
    return new Date(value).toLocaleString();
  }
  return String(value);
}

function AssistantView() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hey! I'm Lexa. Ask me about your tasks, shopping list, or reminders.",
    },
  ]);
  const [sending, setSending] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const actionInFlight = useRef(false);

  async function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();

    if (!text || sending || pendingAction) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", content: text },
    ]);
    setMessage("");
    setSending(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Lexa couldn't respond.");
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.reply || "I couldn't generate a response.",
        },
      ]);

      setPendingAction(data.pendingAction || null);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: `Sorry, something went wrong: ${error.message}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function confirmAction() {
    if (!pendingAction || actionInFlight.current) return;

    actionInFlight.current = true;
    setActionBusy(true);
    const actionId = pendingAction.id;

    try {
      const response = await fetch("/api/assistant/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId }),
      });

      const data = await response.json();
      setPendingAction(null);

      if (!response.ok) {
        throw new Error(data.error || "Action failed.");
      }

      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: data.reply || "Action completed." },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: `Action failed: ${error.message}` },
      ]);
    } finally {
      actionInFlight.current = false;
      setActionBusy(false);
    }
  }

  async function cancelAction() {
    if (!pendingAction || actionInFlight.current) return;

    actionInFlight.current = true;
    setActionBusy(true);

    try {
      const response = await fetch("/api/assistant/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: pendingAction.id }),
      });

      const data = await response.json();
      setPendingAction(null);

      if (!response.ok) {
        throw new Error(data.error || "Could not cancel the action.");
      }

      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: "Okay, I cancelled that action." },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: `Cancellation failed: ${error.message}` },
      ]);
    } finally {
      actionInFlight.current = false;
      setActionBusy(false);
    }
  }

  return (
    <section className="assistant-panel panel">
      <div className="assistant-heading">
        <div className="standalone-icon">
          <MessageCircle size={22} aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">YOUR HOUSEHOLD ASSISTANT</p>
          <h2>Ask Lexa</h2>
          <p className="assistant-subtitle">
            Powered by local AI and your household data
          </p>
        </div>
      </div>

      <div className="assistant-messages" aria-live="polite">
        {messages.map((item, index) => (
          <div
            key={index}
            className={`assistant-message assistant-message-${item.role}`}
          >
            <span className="assistant-message-label">
              {item.role === "user" ? "YOU" : "LEXA"}
            </span>
            <p>{item.content}</p>
          </div>
        ))}

        {sending && (
          <div className="assistant-typing" role="status">
            Lexa is thinking...
          </div>
        )}
      </div>
      {pendingAction && (
        <div className="assistant-confirmation">
          <p className="assistant-confirmation-title">
            <strong>
              {pendingAction.preview?.kind === "update"
                ? "Review this update"
                : "Review this new item"}
            </strong>
          </p>
          <p className="assistant-confirmation-item">
            {pendingAction.preview?.kind === "update" ? "Existing " : "New "}
            {pendingAction.preview?.entity || "item"}:{" "}
            <strong>{pendingAction.preview?.itemLabel || "Household item"}</strong>
          </p>

          <div className="assistant-confirmation-changes">
            {pendingAction.preview?.changes?.map((change) => (
              <p key={change.field}>
                <span>{change.label}</span>
                {pendingAction.preview.kind === "update" && (
                  <>
                    <span className="assistant-change-old">
                      {formatActionValue(change.field, change.from)}
                    </span>
                    <span aria-hidden="true">→</span>
                  </>
                )}
                <strong>{formatActionValue(change.field, change.to)}</strong>
              </p>
            ))}
          </div>

          <div className="assistant-confirmation-buttons">
            <button
              type="button"
              onClick={confirmAction}
              disabled={actionBusy}
            >
              {actionBusy ? "Processing..." : "Confirm"}
            </button>

            <button
              type="button"
              onClick={cancelAction}
              disabled={actionBusy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <form className="assistant-form" onSubmit={sendMessage}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask about tasks, shopping, reminders..."
          aria-label="Message Lexa"
          maxLength={2000}
          disabled={sending || Boolean(pendingAction)}
        />
        <button
          type="submit"
          disabled={sending || Boolean(pendingAction) || !message.trim()}
        >
          {sending ? "Thinking..." : "Send"}
        </button>
      </form>

      <p className="assistant-disclaimer">
        Lexa can currently answer questions about saved household data.
      </p>
    </section>
  );
}


export default function App() {
  const [activeView, setActiveView] = useState("overview");
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [reminders, setReminders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setApiError("");

      try {
        const [tasksResponse, shoppingResponse, remindersResponse] =
          await Promise.all([
            fetch("/api/tasks"),
            fetch("/api/shopping"),
            fetch("/api/reminders"),
          ]);

        if (
          !tasksResponse.ok ||
          !shoppingResponse.ok ||
          !remindersResponse.ok
        ) {
          throw new Error("One or more Lexa APIs could not load.");
        }

        const [tasksData, shoppingData, remindersData] =
          await Promise.all([
            tasksResponse.json(),
            shoppingResponse.json(),
            remindersResponse.json(),
          ]);

        setTasks(tasksData.tasks);
        setShoppingItems(shoppingData.items);
        setReminders(remindersData.reminders);
      } catch (error) {
        console.error("Dashboard loading failed:", error);
        setApiError(error.message || "Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const pageTitle =
    activeView === "overview"
      ? "Overview"
      : comingSoonContent[activeView]?.title || "Overview";


  
  async function refreshTasks() {
    const response = await fetch("/api/tasks");

    if (!response.ok) {
      throw new Error("Task was saved, but the task list couldn't refresh. Reload the page.");
    }

    const data = await response.json();
    setTasks(data.tasks);
  }

  
  async function refreshShopping() {
    const response = await fetch("/api/shopping");

    if (!response.ok) {
      throw new Error("Shopping list couldn't refresh. Reload the page.");
    }

    const data = await response.json();
    setShoppingItems(data.items);
  }

  
  async function refreshReminders() {
    const response = await fetch("/api/reminders");

    if (!response.ok) {
      throw new Error("Reminders couldn't refresh. Reload the page.");
    }

    const data = await response.json();
    setReminders(data.reminders);
  }




  function navigateTo(view) {
    setActiveView(view);
    setSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onNavigate={navigateTo}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main-content">
        <PageHeader
          title={pageTitle}
          eyebrow="LEXA / YOUR HOME"
          onMenuOpen={() => setSidebarOpen(true)}
        />
        <div className="content-area">
          {apiError ? (
            <section className="panel" role="alert">
              <h2>Couldn't load Lexa data</h2>
              <p>{apiError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </section>
          ) : activeView === "overview" ? (
            loading ? (
              <section className="panel">
                <p>Loading your household data...</p>
              </section>
            ) : (
              <Overview
                tasks={tasks}
                shoppingItems={shoppingItems}
                reminders={reminders}
                loading={loading}
                onAskLexa={() => navigateTo("assistant")}
              />
            )
          
            
            
            ) : activeView === "tasks" ? (
              <TasksView
                tasks={tasks}
                onTaskCreated={refreshTasks}
                loading={loading}
              />
            ) : activeView === "shopping" ? (
              <ShoppingView
                shoppingItems={shoppingItems}
                onShoppingChanged={refreshShopping}
                loading={loading}
              />
            ) : activeView === "reminders" ? (
              <RemindersView
                reminders={reminders}
                onRemindersChanged={refreshReminders}
                loading={loading}
              />
            ) : activeView === "assistant" ? (
              <AssistantView />
            ) : (
              <ComingSoonView view={activeView} />
            )}



        </div>
        <footer className="page-footer">
          <img src="/logo2.png" alt="Lexa" />
          <span>Your household, coordinated.</span>
        </footer>
      </main>
    </div>
  );
}
