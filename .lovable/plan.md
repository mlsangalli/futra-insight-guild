

# Corrigir Dados do Bracket — Copa do Mundo 2026 (Grupos Oficiais)

## Problema

Os dados seed atuais usam grupos fictícios (A: EUA/Holanda/Senegal/Costa Rica, etc.). O prompt do usuário fornece a composição oficial dos 12 grupos conforme sorteio da FIFA. Precisamos substituir completamente os dados de grupos e times, e corrigir a estrutura do R32 para refletir o chaveamento oficial.

## O que muda

### 1. Migração SQL — Limpar e re-inserir seed data

Uma nova migração que:
- Deleta todos os `bracket_entry_knockout_picks`, `bracket_entry_group_picks`, `bracket_entries` existentes (apenas 1 entry de teste)
- Deleta todos os `bracket_matches`, `tournament_group_teams`, `tournament_groups` do torneio `copa-2026`
- Re-insere os 12 grupos com as seleções oficiais:

```text
A: México, África do Sul, Coreia do Sul, República Tcheca
B: Canadá, Bósnia, Catar, Suíça
C: Brasil, Marrocos, Haiti, Escócia
D: Estados Unidos, Paraguai, Austrália, Turquia
E: Alemanha, Curaçao, Costa do Marfim, Equador
F: Holanda, Japão, Suécia, Tunísia
G: Bélgica, Egito, Irã, Nova Zelândia
H: Espanha, Cabo Verde, Arábia Saudita, Uruguai
I: França, Senegal, Iraque, Noruega
J: Argentina, Argélia, Áustria, Jordânia
K: Portugal, RD Congo, Uzbequistão, Colômbia
L: Inglaterra, Croácia, Gana, Panamá
```

- Re-insere os 16 matches de R32 com chaveamento correto baseado na estrutura oficial (1º de cada grupo vs 2º de outro ou 3º melhor colocado)
- Mantém R16, QF, SF, F com a mesma estrutura de dependência (`W_R32_N`)

### 2. Chaveamento R32 oficial

Baseado na estrutura FIFA 2026 com 48 times:
- 24 primeiros e segundos + 8 melhores terceiros = 32 classificados
- Os confrontos R32 seguem o mapeamento oficial de grupo cruzado

Os 16 jogos do R32 serão configurados com `home_source`/`away_source` corretos (ex: `1A` vs `2C`, `1B` vs `3rd_X`, etc.) conforme as regras oficiais da FIFA para o formato expandido.

### 3. Códigos ISO e bandeiras

Atualizar `team_code` e `flag_emoji` para todas as 48 seleções com dados corretos.

## Arquivos modificados

- **1 nova migração SQL**: limpa dados antigos e insere dados oficiais
- Nenhuma mudança de código frontend necessária — a estrutura das tabelas e a lógica do hook permanecem idênticas

## Notas

- A 1 entry existente será removida (dados de teste incompatíveis com novos grupos)
- O deadline do torneio será atualizado para `2026-06-10T12:00:00Z` (12h UTC do dia anterior ao início)
- Posições marcadas como "Intercontinental 2" (Iraque no Grupo I) serão incluídas normalmente; se necessário, pode-se adicionar um campo `verified` no futuro

