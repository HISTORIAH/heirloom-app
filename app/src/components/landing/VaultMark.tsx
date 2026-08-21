// The Heirloom mark: two vault walls with the beat between them. Shared by the
// hero wordmark (where it stands in for the H) and the orbiting hero object.
const VaultMark = ({ className }: { className?: string }) => (
  <svg viewBox="16 14 88 92" fill="none" aria-hidden="true" className={className}>
    <rect x="16" y="14" width="21" height="92" rx="7" fill="currentColor" />
    <rect x="83" y="14" width="21" height="92" rx="7" fill="currentColor" />
    <path
      d="M37 60h9l7-17 14 34 7-17h9"
      fill="none"
      stroke="currentColor"
      strokeWidth={13}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default VaultMark;
