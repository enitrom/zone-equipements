// Analytics tracking client helper
export interface AnalyticsEvent {
  path?: string;
  referrer?: string;
  searchQuery?: string;
  hadResults?: boolean;
  productId?: string;
  productName?: string;
  category?: string;
}

let sessionId = '';
function getSessionId(): string {
  if (!sessionId) {
    let existing = sessionStorage.getItem('ze_session_id');
    if (!existing) {
      existing = 'ses_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      sessionStorage.setItem('ze_session_id', existing);
    }
    sessionId = existing;
  }
  return sessionId;
}

export const analyticsTracker = {
  trackPageView(customPath?: string) {
    try {
      const path = customPath || window.location.pathname + window.location.search;
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path,
          referrer: document.referrer || '',
          sessionId: getSessionId()
        })
      }).catch(() => {});
    } catch {
      // Ignore network errors
    }
  },

  trackSearch(query: string, hadResults = true) {
    if (!query || query.trim().length < 2) return;
    try {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: window.location.pathname,
          searchQuery: query.trim(),
          hadResults,
          sessionId: getSessionId()
        })
      }).catch(() => {});
    } catch {
      // Ignore
    }
  },

  trackProductView(productId: string, productName: string, category?: string) {
    if (!productId || !productName) return;
    try {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: window.location.pathname,
          productId,
          productName,
          category,
          sessionId: getSessionId()
        })
      }).catch(() => {});
    } catch {
      // Ignore
    }
  },

  async getStats() {
    try {
      const resp = await fetch('/api/analytics/stats');
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.stats;
    } catch {
      return null;
    }
  }
};
