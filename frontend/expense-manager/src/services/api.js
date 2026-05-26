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

export async function getDashboardAnalytics(userId, month, year, startDate, endDate, categoryId) {
  let url = `${BASE_URL}/analytics/dashboard?user_id=${userId}`;
  if (month) url += `&month=${month}`;
  if (year) url += `&year=${year}`;
  if (startDate) url += `&start_date=${startDate}`;
  if (endDate) url += `&end_date=${endDate}`;
  if (categoryId) url += `&category_id=${categoryId}`;

  const res = await fetch(url);
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

export const deleteGoal = async (goal_id, userId) => {
  const res = await fetch(
    `${BASE_URL}/goals/${goal_id}?user_id=${userId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Failed to delete goal");
};

// ===================== AI SERVICES =====================

export async function parseAIExpense(text, userId) {
  let url = `${BASE_URL}/ai/parse?text=${encodeURIComponent(text)}`;
  if (userId) url += `&user_id=${userId}`;
  const res = await fetch(url, {
    method: "POST"
  });
  if (!res.ok) throw new Error("AI failed to parse text");
  return res.json();
}

export async function processReceipt(file, userId) {
  const formData = new FormData();
  formData.append("file", file);

  let url = `${BASE_URL}/ai/ocr`;
  if (userId) url += `?user_id=${userId}`;

  const res = await fetch(url, {
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
  const url = `${BASE_URL}/expenses/export?user_id=${userId}&format=${format}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to download report");
    }

    const blob = await res.blob();
    const dateStr = new Date().toISOString().split('T')[0];
    const ext = format === 'excel' ? 'xlsx' : 'pdf';
    const filename = `expenses_${dateStr}.${ext}`;

    // Use anchor-click approach for reliable cross-browser download
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
    }, 100);
  } catch (err) {
    console.error("Download error:", err);
    // Fallback: open in new tab for direct download
    window.open(url, "_blank");
  }
}

export async function getUserStats(userId) {
  const res = await fetch(`${BASE_URL}/users/stats?user_id=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch user statistics");
  return res.json();
}
