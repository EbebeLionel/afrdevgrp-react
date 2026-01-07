/**
 * Authorization Service
 * 
 * Manages email-based authorization for content creation.
 * Only users with authorized emails can upload events and reels.
 */

// List of authorized emails that can create content
const AUTHORIZED_EMAILS: string[] = [
  'adg.columbia@gmail.com',
  'em3820@columbia.edu',
  'fg2571@barnard.edu',
  'voa2107@columbia.edu',
  'makumbalionel@gmail.com',
  // Add more authorized emails below:
  // 'another.email@example.com',
  // 'admin@example.com',
];

/**
 * Check if an email is authorized to create content
 * @param email - The email address to check
 * @returns true if email is authorized, false otherwise
 */
export function isAuthorizedEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  
  // Convert to lowercase for case-insensitive comparison
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedAuthorizedEmails = AUTHORIZED_EMAILS.map(e => e.toLowerCase().trim());
  
  return normalizedAuthorizedEmails.includes(normalizedEmail);
}

/**
 * Get the list of authorized emails (for admin display purposes)
 * @returns Array of authorized email addresses
 */
export function getAuthorizedEmails(): string[] {
  return [...AUTHORIZED_EMAILS]; // Return a copy to prevent modification
}

/**
 * Check if a user has content creation permissions
 * @param userEmail - The user's email address
 * @returns Object with authorization status and message
 */
export function checkContentCreationPermission(userEmail: string | null | undefined): {
  authorized: boolean;
  message: string;
} {
  if (!userEmail) {
    return {
      authorized: false,
      message: 'Please sign in to create content.'
    };
  }
  
  if (isAuthorizedEmail(userEmail)) {
    return {
      authorized: true,
      message: 'You are authorized to create content.'
    };
  }
  
  return {
    authorized: false,
    message: 'You do not have authorization to create content. Please contact an administrator.'
  };
}

/**
 * Authorization error class for better error handling
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Throw error if user is not authorized
 * @param userEmail - The user's email to check
 * @throws AuthorizationError if user is not authorized
 */
export function requireAuthorization(userEmail: string | null | undefined): void {
  const { authorized, message } = checkContentCreationPermission(userEmail);
  
  if (!authorized) {
    throw new AuthorizationError(message);
  }
}