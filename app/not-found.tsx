import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have been
        moved.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
