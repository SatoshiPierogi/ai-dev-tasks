/**
 * useAnalytics Hook
 * React hook for tracking user events and behaviors
 */

import { useCallback, useEffect, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export enum AnalyticsEventType {
  PAGE_VIEW = 'page_view',
  BUTTON_CLICK = 'button_click',
  FORM_SUBMIT = 'form_submit',
  FORM_ERROR = 'form_error',
  LINK_CLICK = 'link_click',
  TRANSACTION_CREATED = 'transaction_created',
  AGENT_CREATED = 'agent_created',
  AGENT_DELETED = 'agent_deleted',
  VERIFICATION_STARTED = 'verification_started',
  VERIFICATION_COMPLETED = 'verification_completed',
  ERROR = 'error',
  SEARCH = 'search',
  FILTER = 'filter',
  SORT = 'sort',
}

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// ANALYTICS HOOK
// ============================================================================

export function useAnalytics() {
  const sessionIdRef = useRef(generateSessionId());
  const pageStartTimeRef = useRef(Date.now());

  /**
   * Generate unique session ID
   */
  function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track an event
   */
  const trackEvent = useCallback((
    type: AnalyticsEventType,
    metadata?: Record<string, any>
  ) => {
    const event: AnalyticsEvent = {
      type,
      timestamp: Date.now(),
      metadata,
    };

    // Send to analytics backend
    sendAnalyticsEvent(event);

    // Log for debugging
    console.debug('[Analytics]', type, metadata);
  }, []);

  /**
   * Track page view
   */
  const trackPageView = useCallback((pageName: string) => {
    trackEvent(AnalyticsEventType.PAGE_VIEW, {
      pageName,
      sessionId: sessionIdRef.current,
    });
  }, [trackEvent]);

  /**
   * Track button click
   */
  const trackButtonClick = useCallback((buttonName: string, metadata?: Record<string, any>) => {
    trackEvent(AnalyticsEventType.BUTTON_CLICK, {
      buttonName,
      ...metadata,
    });
  }, [trackEvent]);

  /**
   * Track form submission
   */
  const trackFormSubmit = useCallback((
    formName: string,
    metadata?: Record<string, any>
  ) => {
    const duration = Date.now() - pageStartTimeRef.current;

    trackEvent(AnalyticsEventType.FORM_SUBMIT, {
      formName,
      duration,
      ...metadata,
    });
  }, [trackEvent]);

  /**
   * Track form errors
   */
  const trackFormError = useCallback((
    formName: string,
    errorMessage: string,
    metadata?: Record<string, any>
  ) => {
    trackEvent(AnalyticsEventType.FORM_ERROR, {
      formName,
      errorMessage,
      ...metadata,
    });
  }, [trackEvent]);

  /**
   * Track link click
   */
  const trackLinkClick = useCallback((linkName: string, href: string) => {
    trackEvent(AnalyticsEventType.LINK_CLICK, {
      linkName,
      href,
    });
  }, [trackEvent]);

  /**
   * Track transaction creation
   */
  const trackTransactionCreated = useCallback((
    agentId: string,
    metadata?: Record<string, any>
  ) => {
    trackEvent(AnalyticsEventType.TRANSACTION_CREATED, {
      agentId,
      ...metadata,
    });
  }, [trackEvent]);

  /**
   * Track agent creation
   */
  const trackAgentCreated = useCallback((agentName: string, metadata?: Record<string, any>) => {
    trackEvent(AnalyticsEventType.AGENT_CREATED, {
      agentName,
      ...metadata,
    });
  }, [trackEvent]);

  /**
   * Track agent deletion
   */
  const trackAgentDeleted = useCallback((agentId: string) => {
    trackEvent(AnalyticsEventType.AGENT_DELETED, {
      agentId,
    });
  }, [trackEvent]);

  /**
   * Track verification started
   */
  const trackVerificationStarted = useCallback((
    txHash: string,
    metadata?: Record<string, any>
  ) => {
    trackEvent(AnalyticsEventType.VERIFICATION_STARTED, {
      txHash,
      ...metadata,
    });
  }, [trackEvent]);

  /**
   * Track verification completed
   */
  const trackVerificationCompleted = useCallback(
    (txHash: string, duration: number, metadata?: Record<string, any>) => {
      trackEvent(AnalyticsEventType.VERIFICATION_COMPLETED, {
        txHash,
        duration,
        ...metadata,
      });
    },
    [trackEvent]
  );

  /**
   * Track errors
   */
  const trackError = useCallback((error: Error | string, context?: string) => {
    trackEvent(AnalyticsEventType.ERROR, {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      context,
    });
  }, [trackEvent]);

  /**
   * Track search
   */
  const trackSearch = useCallback((searchTerm: string, resultCount?: number) => {
    trackEvent(AnalyticsEventType.SEARCH, {
      searchTerm,
      resultCount,
    });
  }, [trackEvent]);

  /**
   * Track filter applied
   */
  const trackFilter = useCallback((filterName: string, filterValue: any) => {
    trackEvent(AnalyticsEventType.FILTER, {
      filterName,
      filterValue,
    });
  }, [trackEvent]);

  /**
   * Track sort applied
   */
  const trackSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    trackEvent(AnalyticsEventType.SORT, {
      sortBy,
      sortOrder,
    });
  }, [trackEvent]);

  /**
   * Track page leave time
   */
  const trackPageLeaveTime = useCallback(() => {
    const duration = Date.now() - pageStartTimeRef.current;
    trackEvent(AnalyticsEventType.PAGE_VIEW, {
      duration,
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackPageView,
    trackButtonClick,
    trackFormSubmit,
    trackFormError,
    trackLinkClick,
    trackTransactionCreated,
    trackAgentCreated,
    trackAgentDeleted,
    trackVerificationStarted,
    trackVerificationCompleted,
    trackError,
    trackSearch,
    trackFilter,
    trackSort,
    trackPageLeaveTime,
    sessionId: sessionIdRef.current,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Send analytics event to backend
 */
async function sendAnalyticsEvent(event: AnalyticsEvent) {
  try {
    const response = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error('Failed to track event:', response.statusText);
    }
  } catch (error) {
    // Silently fail - don't break app if analytics fails
    console.debug('Analytics error:', error);
  }
}

/**
 * Hook to automatically track page views
 */
export function usePageView(pageName: string) {
  const { trackPageView, trackPageLeaveTime } = useAnalytics();

  useEffect(() => {
    // Track page view on mount
    trackPageView(pageName);

    // Track page leave time on unmount
    return () => {
      trackPageLeaveTime();
    };
  }, [pageName, trackPageView, trackPageLeaveTime]);
}

/**
 * Hook to track user interactions with a component
 */
export function useComponentTracking(componentName: string) {
  const { trackEvent } = useAnalytics();

  const trackInteraction = useCallback(
    (action: string, metadata?: Record<string, any>) => {
      trackEvent(AnalyticsEventType.BUTTON_CLICK, {
        component: componentName,
        action,
        ...metadata,
      });
    },
    [componentName, trackEvent]
  );

  return { trackInteraction };
}

/**
 * Hook to track form interactions
 */
export function useFormTracking(formName: string) {
  const {
    trackFormSubmit,
    trackFormError,
    trackEvent,
  } = useAnalytics();

  const trackFieldChange = useCallback(
    (fieldName: string, value: any) => {
      trackEvent(AnalyticsEventType.BUTTON_CLICK, {
        formName,
        fieldName,
        action: 'field_changed',
      });
    },
    [formName, trackEvent]
  );

  return {
    trackFormSubmit: () => trackFormSubmit(formName),
    trackFormError: (error: string) => trackFormError(formName, error),
    trackFieldChange,
  };
}

/**
 * Hook to track performance metrics
 */
export function usePerformanceTracking() {
  useEffect(() => {
    // Wait for page to fully load
    window.addEventListener('load', () => {
      const perfData = window.performance.timing;
      const pageLoadTime =
        perfData.loadEventEnd - perfData.navigationStart;

      // Send performance metrics to analytics
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'performance_metrics',
          timestamp: Date.now(),
          metadata: {
            pageLoadTime,
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
            timeToFirstByte: perfData.responseStart - perfData.navigationStart,
          },
        }),
      }).catch(() => {
        // Silently fail
      });
    });
  }, []);
}
