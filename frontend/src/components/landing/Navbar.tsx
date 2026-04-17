import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";

const links = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Developers", href: "#developers" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-6 pt-4">
        <nav className="glass rounded-full flex items-center justify-between pl-3 pr-3 py-2.5 shadow-soft">
          <a href="#" className="flex items-center gap-2.5 pl-1">
            <img src={logo} alt="SB0 Pay" className="h-8 w-auto rounded-md" />
          </a>
          <ul className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="px-4 py-2 rounded-full hover:text-foreground hover:bg-secondary/60 transition-colors">{l.label}</a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:inline-flex px-4 py-2 rounded-full text-sm text-foreground hover:bg-secondary/60 transition-colors">Sign in</Link>
            <Link to="/auth" className="px-4 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow transition-colors">Get started</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
