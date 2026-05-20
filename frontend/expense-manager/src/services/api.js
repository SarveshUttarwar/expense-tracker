const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function loginUser(username, password) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid username or password");
  return res.json();
}

export async function signupUser(username, password) {
  const res = await fetch(`${BASE_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to sign up");
  }
  return res.json();
}

export async function resetPassword(username, newPassword) {
  const res = await fetch(`${BASE_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: newPassword }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to reset password");
  }
  return res.json();
}

export async function getExpenses(userId) {
  const res = await fetch(`${BASE_URL}/expenses?user_id=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

export async function addExpense(expense) {
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(expense),
  });
  if (!res.ok) throw new Error("Failed to add expense");
  return res.json();
}

export async function getGoalsSummary(userId, month, year) {
  const res = await fetch(
    `${BASE_URL}/goals/summary?user_id=${userId}&month=${month}&year=${year}`
  );
  if (!res.ok) throw new Error("Failed to fetch goals summary");
  return res.json();
}

export async function saveGoal(goal) {
  const res = await fetch(`${BASE_URL}/goals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(goal),
  });
  if (!res.ok) throw new Error("Failed to save goal");
}

export async function createCategory(userId, name) {
  const res = await fetch(
    `${BASE_URL}/categories?user_id=${userId}&name=${encodeURIComponent(name)}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error("Failed to create category");
  return res.json();
}

export async function getCategories(userId) {
  const res = await fetch(`${BASE_URL}/categories?user_id=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function deleteCategory(categoryId, userId) {
  const res = await fetch(
    `${BASE_URL}/categories/${categoryId}?user_id=${userId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Failed to delete category");
}

export async function getCategoryAnalytics(userId, month, year) {
  const res = await fetch(
    `${BASE_URL}/analytics/categories?user_id=${userId}&month=${month}&year=${year}`
  );
  if (!res.ok) throw new Error("Failed to load analytics");
  return res.json();
}

export async function getDashboardAnalytics(userId, month, year) {
  const res = await fetch(
    `${BASE_URL}/analytics/dashboard?user_id=${userId}&month=${month}&year=${year}`
  );
  if (!res.ok) throw new Error("Failed to load dashboard data");
  return res.json();
}

export const deleteExpense = async (expense_id, userId) => {
  const res = await fetch(
    `${BASE_URL}/expenses/${expense_id}?user_id=${userId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Failed to delete expense");
};

// ===================== AI SERVICES =====================

export async function parseAIExpense(text) {
  const res = await fetch(`${BASE_URL}/ai/parse?text=${encodeURIComponent(text)}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("AI failed to parse text");
  return res.json();
}

export async function processReceipt(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/ai/ocr`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to process receipt");
  return res.json();
}

export async function searchExpenses(userId, query) {
  const res = await fetch(`${BASE_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, query }),
  });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

// ===================== EXPORT SERVICES =====================

export async function downloadReport(userId, format = "pdf") {
  const res = await fetch(`${BASE_URL}/expenses/export?user_id=${userId}&format=${format}`);
  if (!res.ok) throw new Error("Failed to download report");

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses.${format === 'excel' ? 'xlsx' : 'pdf'}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
