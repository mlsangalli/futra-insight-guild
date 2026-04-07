import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';

export default function About() {
  return (
    <Layout>
      <SEO title="Sobre" description="Conheça a FUTRA — a plataforma social de previsões onde precisão constrói reputação." />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-2xl font-display font-bold text-foreground mb-8">Sobre a FUTRA</h1>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Nossa missão</h2>
          <p className="text-muted-foreground leading-relaxed">
            A FUTRA existe para tornar a incerteza legível. Acreditamos que a inteligência coletiva, quando bem organizada, é mais poderosa que qualquer previsão individual. Nossa plataforma transforma opiniões sobre o futuro em dados visuais e comparáveis.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Como funciona</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Criamos mercados de previsão sobre política, economia, cripto, futebol, cultura e tecnologia. Cada usuário recebe créditos virtuais (Futra Credits) para apostar nas opções que acredita. Quanto mais preciso você for, mais sua reputação cresce.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Não há dinheiro real envolvido — a FUTRA é uma plataforma de reputação e entretenimento intelectual.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Visão</h2>
          <p className="text-muted-foreground leading-relaxed">
            Queremos ser a principal referência em mercados de previsão no Brasil, oferecendo um espaço onde qualquer pessoa possa expressar suas expectativas sobre o futuro e ser reconhecida pela qualidade das suas previsões.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">Contato</h2>
          <p className="text-muted-foreground leading-relaxed">
            Quer falar com a gente? Envie um e-mail para{' '}
            <a href="mailto:team@futra.com.br" className="text-primary hover:underline">team@futra.com.br</a>.
          </p>
        </section>
      </div>
    </Layout>
  );
}
