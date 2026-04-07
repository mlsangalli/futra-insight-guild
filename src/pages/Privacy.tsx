import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';

export default function Privacy() {
  return (
    <Layout>
      <SEO title="Política de Privacidade" description="Política de privacidade da FUTRA — como coletamos, usamos e protegemos seus dados." />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-2xl font-display font-bold text-foreground mb-8">Política de Privacidade</h1>
        <p className="text-xs text-muted-foreground mb-8">Última atualização: abril de 2025</p>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">1. Dados coletados</h2>
          <p className="text-muted-foreground leading-relaxed">
            Coletamos os seguintes dados: nome de exibição, nome de usuário, endereço de e-mail, dados de uso da plataforma (previsões realizadas, mercados acessados) e informações técnicas (endereço IP, navegador, dispositivo).
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">2. Finalidade do uso</h2>
          <p className="text-muted-foreground leading-relaxed">
            Utilizamos seus dados para: operar e melhorar a plataforma, personalizar sua experiência, calcular rankings e estatísticas, enviar notificações relevantes e garantir a segurança da conta.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">3. Cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Cookies analíticos podem ser utilizados para entender padrões de uso e melhorar o serviço.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">4. Compartilhamento de dados</h2>
          <p className="text-muted-foreground leading-relaxed">
            Não vendemos seus dados pessoais. Podemos compartilhar dados com prestadores de serviço (hospedagem, e-mail) estritamente necessários para a operação da plataforma, sempre sob acordos de confidencialidade.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">5. Seus direitos (LGPD)</h2>
          <p className="text-muted-foreground leading-relaxed">
            Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a: acessar, corrigir, excluir ou portar seus dados pessoais; revogar consentimento; e solicitar informações sobre o tratamento dos seus dados.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">6. Segurança</h2>
          <p className="text-muted-foreground leading-relaxed">
            Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, perda ou destruição. Isso inclui criptografia, controle de acesso e monitoramento.
          </p>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">7. Contato do encarregado (DPO)</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato pelo e-mail{' '}
            <a href="mailto:team@futra.com.br" className="text-primary hover:underline">team@futra.com.br</a>.
          </p>
        </section>
      </div>
    </Layout>
  );
}
