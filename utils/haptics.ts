/**
 * Haptic / Vibration Utility using Navigator.vibrate API for mobile devices.
 * Provides tactile feedback for user interactions such as button clicks,
 * task completions, and status triggers.
 */

export const triggerHaptic = (pattern: number | number[] = 15): boolean => {
  if (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  ) {
    try {
      return navigator.vibrate(pattern);
    } catch {
      // Ignore vibration failures on non-supported environments
      return false;
    }
  }
  return false;
};

export const hapticFeedback = {
  // Light tap for standard button clicks & action triggers
  light: () => triggerHaptic(12),
  
  // Medium tap for primary actions like refresh or submit
  medium: () => triggerHaptic(25),
  
  // Heavy tap for important actions
  heavy: () => triggerHaptic([30, 20, 30]),
  
  // Success pattern for task completion or successful claims
  success: () => triggerHaptic([15, 30, 25]),
  
  // Warning pattern for restricted access or errors
  warning: () => triggerHaptic([30, 50, 30]),
};
