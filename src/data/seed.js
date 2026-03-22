// ─── Users ────────────────────────────────────────────────────────────────────
// roles: "admin" (full access), "member" (standard), "viewer" (read-only)
export const USERS = [
  { id: 'u1', name: 'Josh',    email: 'josh@home.com',    role: 'admin',  avatar: '🧑‍💻', color: 'bg-sage-500' },
  { id: 'u2', name: 'Partner', email: 'partner@home.com', role: 'member', avatar: '🧑',   color: 'bg-clay-400' },
]

// ─── Lists (collections of tasks) ─────────────────────────────────────────────
export const LISTS = [
  { id: 'l1', name: 'Household',   icon: '🏠', color: 'sage' },
  { id: 'l2', name: 'Groceries',   icon: '🛒', color: 'clay' },
  { id: 'l3', name: 'Trip: Japan', icon: '✈️', color: 'sage' },
  { id: 'l4', name: 'Someday',     icon: '💭', color: 'clay' },
]

// ─── Tasks ─────────────────────────────────────────────────────────────────────
// priority: "high" | "medium" | "low"
// status:   "todo" | "in_progress" | "done"
export const TASKS = [
  { id: 't1',  listId: 'l1', title: 'Fix kitchen faucet',       assignedTo: 'u1', createdBy: 'u2', priority: 'high',   status: 'todo',        dueDate: '2026-03-25', notes: 'It drips overnight.' },
  { id: 't2',  listId: 'l1', title: 'Schedule HVAC service',    assignedTo: 'u2', createdBy: 'u1', priority: 'medium', status: 'todo',        dueDate: '2026-04-01', notes: '' },
  { id: 't3',  listId: 'l1', title: 'Deep clean bathroom',      assignedTo: 'u2', createdBy: 'u2', priority: 'low',    status: 'in_progress', dueDate: null,         notes: '' },
  { id: 't4',  listId: 'l2', title: 'Olive oil',                assignedTo: 'u1', createdBy: 'u1', priority: 'low',    status: 'todo',        dueDate: null,         notes: '' },
  { id: 't5',  listId: 'l2', title: 'Greek yogurt',             assignedTo: 'u1', createdBy: 'u1', priority: 'low',    status: 'todo',        dueDate: null,         notes: 'Full-fat' },
  { id: 't6',  listId: 'l2', title: 'Bread',                    assignedTo: 'u2', createdBy: 'u1', priority: 'low',    status: 'done',        dueDate: null,         notes: '' },
  { id: 't7',  listId: 'l3', title: 'Book Kyoto ryokan',        assignedTo: 'u1', createdBy: 'u1', priority: 'high',   status: 'todo',        dueDate: '2026-04-10', notes: 'Arashiyama area preferred' },
  { id: 't8',  listId: 'l3', title: 'Get JR Pass',              assignedTo: 'u2', createdBy: 'u1', priority: 'high',   status: 'in_progress', dueDate: '2026-04-05', notes: '' },
  { id: 't9',  listId: 'l3', title: 'Pack packing list',        assignedTo: 'u2', createdBy: 'u2', priority: 'medium', status: 'todo',        dueDate: null,         notes: '' },
  { id: 't10', listId: 'l4', title: 'Research FHIR integration', assignedTo: 'u1', createdBy: 'u1', priority: 'low',   status: 'todo',        dueDate: null,         notes: 'Look at fhirclient.js docs' },
]
