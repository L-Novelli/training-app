export function Footer() {
  return (
    <footer className="border-t border-line bg-panel py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4">
        <a
          href="https://www.instagram.com/comandos.ar/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-cobalt"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" />
          </svg>
          @comandos.ar
        </a>
      </div>
    </footer>
  )
}
