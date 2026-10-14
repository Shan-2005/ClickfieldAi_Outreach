/**
 * Outlook Web (Microsoft 365) Deep Link Utility
 * 
 * Directs all email dispatching to https://outlook.cloud.microsoft (user's signed-in Chrome webmail)
 * instead of OS mailto: desktop apps.
 */

export const OUTLOOK_WEB_BASE = 'https://outlook.cloud.microsoft/mail/deeplink/compose';

/**
 * Constructs a deep link to compose a message in Outlook Web.
 * Standard percent-encoding (spaces -> %20, newlines -> %0A) is used to ensure
 * Outlook Web populates the To, Subject, and Body fields accurately.
 * 
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} body - Email body content
 * @returns {string} The full Outlook Web compose deep link URL
 */
export function getOutlookWebComposeUrl(to = '', subject = '', body = '') {
  const params = [];
  if (to) {
    params.push(`to=${encodeURIComponent(to.trim())}`);
  }
  if (subject) {
    params.push(`subject=${encodeURIComponent(subject)}`);
  }
  if (body) {
    params.push(`body=${encodeURIComponent(body)}`);
  }
  
  return `${OUTLOOK_WEB_BASE}${params.length > 0 ? `?${params.join('&')}` : ''}`;
}

/**
 * Opens Outlook Web compose in a new Chrome browser tab.
 */
export function openInOutlookWeb(to = '', subject = '', body = '') {
  const url = getOutlookWebComposeUrl(to, subject, body);
  window.open(url, '_blank', 'noopener,noreferrer');
}
