"use client";

/**
 * The word "makers" in the footer. Clicking it dispatches a window event that
 * the LyricBuilder listens for to open the moderator code prompt. Kept tiny and
 * standalone so the page footer can stay a server component.
 */
export function MakersButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("wyd:admin"))}
      className="cursor-pointer underline-offset-2 transition hover:text-caramel hover:underline focus:outline-hidden focus-visible:text-caramel"
    >
      makers
    </button>
  );
}
