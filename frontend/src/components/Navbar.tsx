export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-10 py-5 border-b border-border-custom">
      <span className="text-lg font-extrabold tracking-tight text-text-main">
        Omni<span className="text-amber">Scribe</span>
      </span>
      <span className="font-mono text-xs text-muted border border-border-custom px-3 py-1 rounded-full">
        Build With Love
      </span>
    </nav>
  );
}
