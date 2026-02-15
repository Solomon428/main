/**
 * Client-side authentication utilities
 */

export async function logout(): Promise<{ success: boolean; error?: string }> {
  try {
    // Clear the auth cookie by setting it to expire
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
    
    // Also try to call logout API if it exists
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore API errors - cookie is already cleared client-side
    }
    
    // Redirect to login
    window.location.href = '/login';
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    // Force redirect even if clearing cookie failed
    window.location.href = '/login';
    return { success: false, error: 'Logout had issues, but redirecting...' };
  }
}

export function isAuthenticated(): boolean {
  // Check for auth-token cookie
  return document.cookie.includes('auth-token=');
}

export async function checkAuthStatus(): Promise<{
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}> {
  try {
    const response = await fetch('/api/debug/cookie', {
      credentials: 'include',
    });

    const data = await response.json();

    return {
      authenticated: data.verified,
      user: data.user,
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return { authenticated: false };
  }
}
