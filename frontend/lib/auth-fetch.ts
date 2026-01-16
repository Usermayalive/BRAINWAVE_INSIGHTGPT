/**
 * Authenticated fetch wrapper that automatically includes the auth token
 * in requests to the API.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Get the auth token from localStorage
 */
export function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

/**
 * Set auth token in both localStorage and cookie (for middleware)
 */
export function setAuthToken(token: string): void {
    if (typeof window === 'undefined') return;

    // Store in localStorage for client-side access
    localStorage.setItem('token', token);

    // Also set as cookie for middleware access
    document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;
}

/**
 * Clear auth token from both localStorage and cookie
 */
export function clearAuthToken(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Clear cookie
    document.cookie = 'auth_token=; path=/; max-age=0';
}

/**
 * Make an authenticated fetch request
 * Automatically includes the Authorization header if a token exists
 */
export async function authFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const token = getAuthToken();

    const headers: HeadersInit = {
        ...options.headers,
    };

    // Add authorization header if token exists
    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    // Add content-type for JSON if body is present and not FormData
    if (options.body && !(options.body instanceof FormData)) {
        (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // Handle 401 unauthorized - token might be expired
    if (response.status === 401) {
        clearAuthToken();
        // Optionally redirect to login
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }

    return response;
}

/**
 * Convenience method for authenticated API calls
 * Prepends the API_URL to the path
 */
export async function apiCall(
    path: string,
    options: RequestInit = {}
): Promise<Response> {
    const url = path.startsWith('http') ? path : `${API_URL}${path}`;
    return authFetch(url, options);
}

/**
 * Convenience wrapper for GET requests
 */
export async function apiGet(path: string): Promise<Response> {
    return apiCall(path, { method: 'GET' });
}

/**
 * Convenience wrapper for POST requests with JSON body
 */
export async function apiPost(path: string, data: unknown): Promise<Response> {
    return apiCall(path, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Convenience wrapper for POST requests with FormData (file uploads)
 */
export async function apiPostForm(path: string, formData: FormData): Promise<Response> {
    return apiCall(path, {
        method: 'POST',
        body: formData,
    });
}

/**
 * Convenience wrapper for PUT requests
 */
export async function apiPut(path: string, data: unknown): Promise<Response> {
    return apiCall(path, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * Convenience wrapper for DELETE requests
 */
export async function apiDelete(path: string): Promise<Response> {
    return apiCall(path, { method: 'DELETE' });
}
