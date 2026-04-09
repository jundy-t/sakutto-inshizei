declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

function trackEvent(action: string, params?: Record<string, string | number>) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', action, params);
  }
}

export function trackStepView(step: number) {
  trackEvent('step_view', { step });
}

export function trackCtaClick(button: string) {
  trackEvent('cta_click', { button });
}

export function trackFeedbackSubmit(rating: number) {
  trackEvent('feedback_submit', { rating });
}
