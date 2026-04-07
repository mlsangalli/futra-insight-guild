import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Contato FUTRA — ${name}`);
    const body = encodeURIComponent(`Nome: ${name}\nE-mail: ${email}\n\n${message}`);
    window.location.href = `mailto:team@futra.com.br?subject=${subject}&body=${body}`;
  };

  return (
    <Layout>
      <SEO title="Contato" description="Entre em contato com a equipe FUTRA. Envie dúvidas, sugestões ou feedback." />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-2xl font-display font-bold text-foreground mb-8">Contato</h1>

        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Envie um e-mail diretamente para</p>
            <a href="mailto:team@futra.com.br" className="text-lg font-semibold text-primary hover:underline">
              team@futra.com.br
            </a>
          </div>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Ou preencha o formulário</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" required />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div>
              <Label htmlFor="message">Mensagem</Label>
              <Textarea id="message" value={message} onChange={e => setMessage(e.target.value)} placeholder="Como podemos ajudar?" rows={5} required />
            </div>
            <Button type="submit" className="w-full">Enviar mensagem</Button>
          </form>
        </section>
      </div>
    </Layout>
  );
}
