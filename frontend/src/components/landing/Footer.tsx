import logo from "../../assets/logo.png";

export default function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="SB0 Pay" className="h-7 w-auto rounded-md" />
          <span className="text-muted-foreground text-sm ml-2">© {new Date().getFullYear()}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <a href="#product" className="hover:text-foreground transition-colors">Product</a>
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#developers" className="hover:text-foreground transition-colors">Developers</a>
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
        </nav>
      </div>
    </footer>
  );
}
