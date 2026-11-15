import { useEffect } from 'react';

export const SITE_NAME = 'African Development Group Columbia';

/** Sets the browser tab / search-result title for a page. */
export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} | ${SITE_NAME}` : `${SITE_NAME} (ADG)`;
  }, [pageTitle]);
}
