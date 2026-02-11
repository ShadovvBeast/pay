/**
 * Extract a meaningful error message from API response
 */
export function extractErrorMessage(errorData: any, defaultMessage: string): string {
  // Try to get structured error message
  if (errorData?.error?.message) {
    return errorData.error.message;
  }
  
  // Try to get error details if available
  if (errorData?.error?.details) {
    return `${defaultMessage}: ${errorData.error.details}`;
  }
  
  // Fallback to default message
  return defaultMessage;
}

/**
 * Handle API response errors consistently
 */
export async function handleApiError(response: Response, defaultMessage: string): Promise<never> {
  const errorData = await response.json().catch(() => ({}));
  const message = extractErrorMessage(errorData, defaultMessage);
  throw new Error(message);
}
