/**
 * Skip-navigation link for keyboard and screen-reader users.
 * Hidden until focused; first focusable element of every page.
 */
const SkipLink = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
  >
    Saltar al contenido principal
  </a>
);

export default SkipLink;
