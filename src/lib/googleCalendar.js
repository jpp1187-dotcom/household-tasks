/**
 * googleCalendar.js — stubbed Google Calendar integration.
 * All functions log a message and no-op until Google OAuth is configured.
 * When ready: replace stubs with real gapi / OAuth2 calls.
 */

const LOG = '[GoogleCalendar] Not yet configured.'

export async function initGoogleAuth() {
  console.log(LOG)
  return null
}

export async function createEvent(task) {
  console.log(LOG, 'createEvent called for task:', task?.id)
  return null
}

export async function updateEvent(task) {
  console.log(LOG, 'updateEvent called for task:', task?.id)
  return null
}

export async function deleteEvent(taskId) {
  console.log(LOG, 'deleteEvent called for taskId:', taskId)
  return null
}

export async function syncAllTasks(tasks) {
  console.log(LOG, `syncAllTasks called for ${tasks?.length ?? 0} tasks`)
  return null
}
