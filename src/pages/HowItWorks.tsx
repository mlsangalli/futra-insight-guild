import { Layout } from '@/components/layout/Layout';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Target, Coins, TrendingUp, Trophy, Shield, ArrowRight } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
          Como a FUTRA funciona
        </h1>
        <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
          Uma plataforma social de previsões onde precisão constrói reputação. Sem dinheiro real. Apenas inteligência, convicção e status.
        </p>

        <div className="space-y-8">
          {[
            { icon: Target, title: '1. Escolha um mercado', desc: 'Navegue por perguntas abertas sobre política, economia, cripto, futebol, cultura e tecnologia. Escolha uma que te interessa.' },
            { icon: Coins, title: '2. Faça sua aposta com créditos', desc: 'Escolha Sim/Não ou sua opção favorita. Depois, aloque Futra Credits para reforçar sua previsão. Mais créditos = mais convicção = maior recompensa potencial.' },
            { icon: TrendingUp, title: '3. Ganhe recompensas ao acertar', desc: 'Se sua previsão estiver correta, você ganha Futra Credits. Quanto menos popular for sua escolha correta, mais você ganha. Isso recompensa insight genuíno ao invés de seguir a manada.' },
            { icon: Trophy, title: '4. Construa seu Futra Score', desc: 'Cada previsão afeta seu Futra Score. Precisão consistente ao longo do tempo constrói sua reputação e desbloqueia níveis de influência mais altos.' },
          ].map((step, i) => (
            <div key={i} className="flex gap-5 items-start">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <step.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground text-lg">{step.title}</h3>
                <p className="text-muted-foreground mt-1">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <h2 className="font-display text-2xl font-bold text-foreground text-center mb-8">Níveis de influência</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { level: 'Baixa', desc: 'Contas novas. Recursos limitados.', color: 'border-muted' },
              { level: 'Média', desc: 'Previsores ativos com histórico crescente.', color: 'border-primary/30' },
              { level: 'Alta', desc: 'Top performers. Podem criar mercados.', color: 'border-emerald/30' },
              { level: 'Elite', desc: 'Top 1%. Privilégios máximos.', color: 'border-primary' },
            ].map(l => (
              <div key={l.level} className={`rounded-xl border ${l.color} bg-card p-4 text-center`}>
                <p className="font-display font-bold text-foreground">{l.level}</p>
                <p className="text-xs text-muted-foreground mt-1">{l.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 rounded-xl border border-border bg-card p-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Sistema de integridade
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>• Cada previsão custa créditos — sem trollagem gratuita</li>
            <li>• Contas novas começam com influência limitada</li>
            <li>• Desempenho ruim reduz a influência ao longo do tempo</li>
            <li>• Histórico público de previsões garante responsabilidade</li>
            <li>• Regras claras de resolução e fontes oficiais para cada mercado</li>
            <li>• Criação de mercados requer reputação mínima</li>
          </ul>
        </div>

        <div className="text-center mt-12">
          <Button size="lg" className="gradient-primary border-0" asChild>
            <Link to="/browse">Começar a prever <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
