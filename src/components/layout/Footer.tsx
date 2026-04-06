import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border bg-night-950 mt-20 hidden lg:block">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="font-display font-bold text-xl gradient-primary-text">FUTRA</Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Torne a incerteza legível. A plataforma social de previsões onde precisão constrói reputação.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3">Plataforma</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/browse" className="hover:text-foreground transition-colors">Explorar mercados</Link></li>
              <li><Link to="/leaderboard" className="hover:text-foreground transition-colors">Ranking</Link></li>
              <li><Link to="/how-it-works" className="hover:text-foreground transition-colors">Como funciona</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3">Categorias</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/category/politics" className="hover:text-foreground transition-colors">Política</Link></li>
              <li><Link to="/category/economy" className="hover:text-foreground transition-colors">Economia</Link></li>
              <li><Link to="/category/crypto" className="hover:text-foreground transition-colors">Cripto</Link></li>
              <li><Link to="/category/football" className="hover:text-foreground transition-colors">Futebol</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3">Empresa</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Sobre</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Termos</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contato</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© 2025 FUTRA. Todos os direitos reservados.</p>
          <p className="text-xs text-muted-foreground">Torne a incerteza legível.</p>
        </div>
      </div>
    </footer>
  );
}
