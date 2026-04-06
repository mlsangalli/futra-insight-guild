import { describe, it, expect } from 'vitest';
import { parseSupabaseError, ApiError } from '../api-error';

describe('parseSupabaseError', () => {
  it('retorna mensagem para erro de permissão RLS', () => {
    expect(parseSupabaseError({ code: '42501', message: 'permission denied' }))
      .toBe('Você não tem permissão para esta ação.');
  });

  it('retorna mensagem para violação de unique constraint', () => {
    expect(parseSupabaseError({ code: '23505', message: 'duplicate key' }))
      .toBe('Este registro já existe.');
  });

  it('retorna mensagem para foreign key inválida', () => {
    expect(parseSupabaseError({ code: '23503', message: 'fk violation' }))
      .toBe('Referência inválida — o item vinculado não existe.');
  });

  it('retorna mensagem para timeout', () => {
    expect(parseSupabaseError({ code: '57014', message: 'statement timeout' }))
      .toBe('A consulta demorou demais. Tente novamente.');
  });

  it('retorna mensagem genérica para erro desconhecido', () => {
    expect(parseSupabaseError(undefined))
      .toBe('Ocorreu um erro inesperado. Tente novamente.');
  });

  it('retorna a mensagem original se for string simples', () => {
    expect(parseSupabaseError('Erro customizado'))
      .toBe('Erro customizado');
  });

  it('retorna mensagem para rate limit', () => {
    expect(parseSupabaseError({ message: 'rate limit exceeded' }))
      .toBe('Muitas requisições. Aguarde alguns segundos.');
  });

  it('retorna mensagem do ApiError', () => {
    const err = new ApiError('Teste', '42501', 403);
    expect(parseSupabaseError(err)).toBe('Teste');
  });

  it('retorna message de objeto genérico sem code conhecido', () => {
    expect(parseSupabaseError({ message: 'algo estranho', code: '99999' }))
      .toBe('algo estranho');
  });
});
