/**
 * Filled disc with the tick carved out of it — one path, the inner subpath is
 * wound the other way so the default nonzero fill rule knocks it through.
 */
export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M6.00006 1C8.76146 1.00003 11.0001 3.2386 11.0001 6C11 8.76137 8.76144 11 6.00006 11C3.23866 11 1.0001 8.76139 1.00006 6C1.00006 3.23858 3.23864 1 6.00006 1ZM8.12701 4.47266C7.97376 4.33343 7.737 4.34483 7.59772 4.49805L5.36237 6.95605L4.39069 5.98438C4.24424 5.83793 4.00588 5.83793 3.85944 5.98438C3.713 6.13082 3.71299 6.36918 3.85944 6.51562L5.10944 7.76562C5.18191 7.83807 5.2814 7.8774 5.38385 7.875C5.48635 7.87255 5.58343 7.82782 5.6524 7.75195L8.1524 5.00195C8.29161 4.84873 8.28017 4.61195 8.12701 4.47266Z"
        fill="#00B1B5"
      />
    </svg>
  );
}
