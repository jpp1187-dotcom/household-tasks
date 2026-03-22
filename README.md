# Homebase — Household Task Manager
### A Claude Code Tutorial Project

---

## What This Is
A simple household task + list manager built with **React + Tailwind + Vite**.
Two users (Josh = admin, Partner = member) can create lists, assign tasks, set priorities, and check things off.

---

## Quick Start

```bash
cd household-tasks
npm install
npm run dev
# → open http://localhost:5173
```

---

## Project Structure

```
src/
  data/
    seed.js           ← Sample users, lists, and tasks
  contexts/
    AuthContext.jsx   ← Who is logged in, what can they do?
    TaskContext.jsx   ← All task/list state and CRUD actions
  components/
    Sidebar.jsx       ← Navigation + user switcher
    TaskList.jsx      ← Main content: filtered task list
    TaskCard.jsx      ← Individual task row (expandable)
    AddTaskModal.jsx  ← Form to create a new task
    AddListModal.jsx  ← Form to create a new list
  App.jsx             ← Root layout
  main.jsx            ← Entry point
  index.css           ← Tailwind base styles
```

---

## Key Concepts (and how they map to FHIR work later)

| Concept here | What you'll reuse in FHIR/health work |
|---|---|
| `AuthContext` — roles (admin/member/viewer) | SMART on FHIR scopes (`patient/*.read`, `user/*.write`) |
| `TaskContext` — state + CRUD | FHIR resource state (Patient, Task, Observation) |
| `useTasks()`, `useAuth()` custom hooks | Reusable hooks for FHIR client (`useFHIR()`) |
| Props drilling vs. Context | Same decision in clinical apps |
| `seed.js` mock data | Mocking FHIR Bundles for local dev |

---

## Claude Code Exercises

Try these in Claude Code to level up:

### Beginner
1. **Add a new field** — add a `category` field to tasks (e.g., "urgent", "errands", "admin")
2. **Change the color palette** — swap sage green for a different color in `tailwind.config.js`
3. **Add a third user** — add a "viewer" role user to `seed.js` and test that they can't edit

### Intermediate
4. **Persist to localStorage** — replace the in-memory state in `TaskContext.jsx` with `localStorage` so tasks survive a page refresh
5. **Due date filtering** — add "Overdue" as a filter option in `TaskList.jsx`
6. **Task notes editing** — make the notes field in `TaskCard.jsx` editable inline

### Advanced
7. **Google Calendar integration** — add a "Add to Calendar" button that calls the Google Calendar API
8. **Backend API** — swap the in-memory context for `fetch()` calls to a REST API (e.g., Express or Supabase)
9. **FHIR Task resource** — map your task schema to a [FHIR Task resource](https://www.hl7.org/fhir/task.html) and export/import tasks as FHIR JSON

---

## Auth Roles (how it works)

| Role    | Add tasks | Delete tasks | Create lists | View |
|---------|-----------|--------------|--------------|------|
| admin   | ✅        | ✅           | ✅           | ✅  |
| member  | ✅        | ❌           | ❌           | ✅  |
| viewer  | ❌        | ❌           | ❌           | ✅  |

Role checks live in `AuthContext.jsx` via `canEdit()` and `isAdmin()`.
Components call these hooks — they don't manage auth logic themselves.
This is the same pattern you'll use with FHIR scopes.

---

## Next Steps
- [ ] Wire up real auth (Supabase Auth, Firebase, or SMART on FHIR)
- [ ] Add a backend (Supabase, PocketBase, or your own Node/Express API)
- [ ] Google Calendar API integration
- [ ] Mobile responsive layout
- [ ] FHIR Task resource export

---

## Stack
- [React 18](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS v3](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/) (icons)
