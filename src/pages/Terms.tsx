import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';

export default function Terms() {
  return (
    <Layout>
      <SEO title="Termos de Uso" description="Termos de uso da plataforma FUTRA — mercados de previsão com créditos virtuais." />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-2xl font-display font-bold text-foreground mb-8">Termos de Uso</h1>
        <p className="text-xs text-muted-foreground mb-8">Última atualização: abril de 2025</p>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">1. Aceitação dos termos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ao acessar ou utilizar a plataforma FUTRA, você concorda com estes Termos de Uso. Se você não concordar, não utilize a plataforma.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">2. Natureza da plataforma</h2>
          <p className="text-muted-foreground leading-relaxed">
            A FUTRA é uma plataforma de entretenimento e reputação baseada em previsões. Todos os créditos utilizados são virtuais (Futra Credits) e <strong className="text-foreground">não possuem valor monetário real</strong>. A FUTRA não é uma casa de apostas e não envolve transações financeiras.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">3. Conta do usuário</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para utilizar a plataforma, você deve criar uma conta com informações verdadeiras. Você é responsável pela segurança da sua conta e por todas as atividades realizadas com ela.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">4. Conduta do usuário</h2>
          <p className="text-muted-foreground leading-relaxed">
            É proibido: criar contas falsas ou múltiplas, manipular mercados, publicar conteúdo ofensivo, assediar outros usuários ou utilizar bots ou scripts automatizados. A FUTRA reserva-se o direito de suspender ou encerrar contas que violem estas regras.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">5. Propriedade intelectual</h2>
          <p className="text-muted-foreground leading-relaxed">
            Todo o conteúdo da plataforma (design, marca, código) é propriedade da FUTRA. O conteúdo gerado por usuários (comentários, previsões) permanece do autor, mas a FUTRA tem licença para exibi-lo na plataforma.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">6. Resolução de mercados</h2>
          <p className="text-muted-foreground leading-relaxed">
            A FUTRA resolve os mercados com base em fontes públicas e verificáveis. Em caso de ambiguidade, a equipe tomará a decisão final. Essa decisão é definitiva e não sujeita a recurso.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">7. Alterações</h2>
          <p className="text-muted-foreground leading-relaxed">
            A FUTRA pode atualizar estes termos a qualquer momento. Alterações significativas serão comunicadas por e-mail ou notificação na plataforma. O uso continuado após alterações constitui aceitação dos novos termos.
          </p>
        </section>
      </div>
    </Layout>
  );
}
