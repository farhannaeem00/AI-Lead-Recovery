
const API_BASE = "/api";
const TOKEN_KEY = "leadflow_token";

// Authentication token helpers
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  if (!token) {
    throw new Error("Cannot save an empty authentication token.");
  }

  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Shared API request helper
async function request(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.body && typeof options.body === "string"
      ? { "Content-Type": "application/json" }
      : {}),
    ...options.headers,
  };

  // Attach the JWT to protected API requests.
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const error = await response.json();
      message =
        typeof error.detail === "string"
          ? error.detail
          : JSON.stringify(error.detail ?? error);
    } catch {
      // Keep the default error message if the response isn't JSON.
    }

    // Remove an invalid or expired token.
    if (response.status === 401 && token) {
      clearToken();
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Register a new account
export function register(email, password) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// Log in and save the returned JWT
export async function login(email, password) {
  const form = new URLSearchParams({
    username: email,
    password,
  });

  const result = await request("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!result.access_token) {
    throw new Error("Login succeeded, but no access token was returned.");
  }

  saveToken(result.access_token);

  return result;
}

// Get the currently authenticated user
export function getCurrentUser() {
  return request("/auth/me");
}

// Retrieve leads with optional filters
export function getLeads(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();

  return request(`/leads${query ? `?${query}` : ""}`);
}

// Create a lead
export function createLead(lead) {
  return request("/leads", {
    method: "POST",
    body: JSON.stringify(lead),
  });
}

// Update a lead
export function updateLead(id, updates) {
  return request(`/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

// Delete a lead
export function deleteLead(id) {
  return request(`/leads/${id}`, {
    method: "DELETE",
  });
}

// Update a lead's follow-up schedule
export function updateFollowUp(id, updates) {
  return request(`/leads/${id}/follow-up`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

// Retrieve pending follow-ups
export function getFollowUps() {
  return request("/follow-ups");
}

// Generate an AI follow-up message
export function generateAIFollowUp(id) {
  return request(`/leads/${id}/ai/follow-up`, {
    method: "POST",
  });
}

// Generate AI insights for a lead
export function generateAIInsights(id) {
  return request(`/leads/${id}/ai/insights`, {
    method: "POST",
  });
}

// Retrieve the audit trail for a lead's follow-up actions.
export function getFollowUpHistory(id) {
  return request(`/leads/${id}/follow-up-history`);
}
