import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckSquare,
  ChevronDown,
  CircleHelp,
  Command,
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
      <span className="brand-mark" aria-hidden="true">
        <Command size={19} strokeWidth={2.4} />
      </span>
      <span className="brand-name">lexa</span>
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


function Overview({ tasks, shoppingItems, reminders, loading }){
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
          <p>
            Ask Lexa to help coordinate your home. The assistant API is not
            connected yet.
          </p>
        </div>
        <button className="assistant-banner-button" type="button" disabled>
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
              />
            )
          
            ) : activeView === "tasks" ? (
              <TasksView
                tasks={tasks}
                onTaskCreated={refreshTasks}
                loading={loading}
              />
            ) : (
              <ComingSoonView view={activeView} />
            )}

        </div>
        <footer className="page-footer">
          <span>LEXA</span>
          <span>Your household, coordinated.</span>
        </footer>
      </main>
    </div>
  );
}
