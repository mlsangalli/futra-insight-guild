import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useComments, useCreateComment, Comment } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Loader2, Reply } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  marketId: string;
}

export function CommentSection({ marketId }: Props) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useComments(marketId);
  const createComment = useCreateComment();
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const topLevel = comments.filter((c: Comment) => !c.parent_id);
  const replies = comments.filter((c: Comment) => !!c.parent_id);

  const handleSubmit = () => {
    if (!body.trim()) return;
    createComment.mutate(
      { marketId, body: body.trim(), parentId: replyTo || undefined },
      { onSuccess: () => { setBody(''); setReplyTo(null); } }
    );
  };

  const getReplies = (parentId: string) => replies.filter((r: Comment) => r.parent_id === parentId);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" />
        Discussão ({comments.length})
      </h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando comentários...</p>
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum comentário ainda. Seja o primeiro a compartilhar sua análise.</p>
      ) : (
        <div className="space-y-4 mb-6">
          {topLevel.map((c: Comment) => (
            <div key={c.id}>
              <CommentItem comment={c} onReply={() => setReplyTo(c.id)} />
              {getReplies(c.id).map((r: Comment) => (
                <div key={r.id} className="ml-8 mt-2">
                  <CommentItem comment={r} isReply />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {user ? (
        <div className="space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Reply className="h-3 w-3" />
              <span>Respondendo ao comentário</span>
              <button onClick={() => setReplyTo(null)} className="text-primary hover:underline">Cancelar</button>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Adicione sua análise..."
              className="min-h-[60px] resize-none text-sm"
              maxLength={1000}
            />
            <Button
              size="icon"
              className="gradient-primary border-0 shrink-0 h-[60px] w-[60px]"
              onClick={handleSubmit}
              disabled={!body.trim() || createComment.isPending}
            >
              {createComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          <Link to="/login" className="text-primary hover:underline">Entre</Link> para participar da discussão
        </p>
      )}
    </div>
  );
}

function CommentItem({ comment, onReply, isReply }: { comment: Comment; onReply?: () => void; isReply?: boolean }) {
  const profile = comment.profiles;
  const name = profile?.display_name || profile?.username || 'Usuário';
  const username = profile?.username;

  return (
    <div className={cn('flex gap-3', isReply && 'border-l-2 border-border pl-3')}>
      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
        {name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs">
          {username ? (
            <Link to={`/profile/${username}`} className="font-medium text-foreground hover:text-primary">{name}</Link>
          ) : (
            <span className="font-medium text-foreground">{name}</span>
          )}
          <span className="text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}</span>
        </div>
        <p className="text-sm text-secondary-foreground mt-1">{comment.body}</p>
        {onReply && (
          <button onClick={onReply} className="text-xs text-muted-foreground hover:text-primary mt-1 flex items-center gap-1">
            <Reply className="h-3 w-3" /> Responder
          </button>
        )}
      </div>
    </div>
  );
}
