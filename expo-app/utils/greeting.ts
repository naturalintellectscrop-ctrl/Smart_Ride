// ============================================
// SMART RIDE MOBILE - GREETING UTILITY
// ============================================
// Dynamic greeting based on local time
// Uganda timezone support (Africa/Kampala)
// ============================================

/**
 * Get dynamic greeting based on time of day
 * Times are in 24-hour format:
 * - 5:00 - 11:59 → Good Morning
 * - 12:00 - 16:59 → Good Afternoon
 * - 17:00 - 21:59 → Good Evening
 * - 22:00 - 4:59 → Good Night
 */
export function getGreeting(timezone: string = 'Africa/Kampala'): string {
  try {
    // Get current time in the specified timezone
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    };
    
    const hourString = new Intl.DateTimeFormat('en-US', options).format(now);
    const hour = parseInt(hourString, 10);
    
    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon';
    } else if (hour >= 17 && hour < 22) {
      return 'Good Evening';
    } else {
      return 'Good Night';
    }
  } catch {
    // Fallback to local time if timezone fails
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon';
    } else if (hour >= 17 && hour < 22) {
      return 'Good Evening';
    } else {
      return 'Good Night';
    }
  }
}

/**
 * Get user display name with fallbacks
 * Priority: firstName > displayName > username > email prefix
 */
export function getUserDisplayName(user: {
  name?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username?: string;
  email?: string;
} | null): string {
  if (!user) {
    return 'Guest';
  }
  
  // Try firstName first
  if (user.firstName) {
    return user.firstName;
  }
  
  // Try name field (split to get first name)
  if (user.name) {
    const firstName = user.name.split(' ')[0];
    if (firstName) {
      return firstName;
    }
  }
  
  // Try displayName
  if (user.displayName) {
    return user.displayName.split(' ')[0];
  }
  
  // Try username
  if (user.username) {
    return user.username;
  }
  
  // Try email prefix
  if (user.email) {
    const emailPrefix = user.email.split('@')[0];
    if (emailPrefix) {
      // Capitalize first letter
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
  }
  
  return 'Guest';
}

/**
 * Format full greeting with name
 */
export function formatGreeting(
  user: {
    name?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    username?: string;
    email?: string;
  } | null,
  timezone: string = 'Africa/Kampala'
): string {
  const greeting = getGreeting(timezone);
  const name = getUserDisplayName(user);
  
  return `${greeting}, ${name}`;
}
