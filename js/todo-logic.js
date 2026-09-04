/**
 * todo-logic.js
 * Pure-logic functions for the TodoList widget, exported as an ES module
 * so they can be imported and tested in Node.js without a browser.
 *
 * The same logic is mirrored inside the TodoList IIFE in app.js for the
 * browser bundle (which cannot use import/export via a plain <script> tag).
 */

/**
 * Validates a task description.
 * @param {string} description
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateTask(description) {
  if (typeof description !== 'string' || description.trim().length === 0) {
    return { valid: false, error: 'Task description cannot be empty or whitespace.' };
  }
  if (description.length > 500) {
    return { valid: false, error: 'Task description must be 500 characters or fewer.' };
  }
  return { valid: true, error: null };
}

/**
 * Serializes an array of Task objects to a JSON string.
 * @param {Array<{id: string, description: string, completed: boolean, createdAt: number}>} tasks
 * @returns {string}
 */
export function serializeTasks(tasks) {
  return JSON.stringify(tasks);
}

/**
 * Deserializes a JSON string back to an array of Task objects.
 * Returns an empty array on parse failure or if the result is not an array.
 * @param {string} json
 * @returns {Array}
 */
export function deserializeTasks(json) {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}
