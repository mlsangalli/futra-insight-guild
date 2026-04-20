
-- Job de reconciliação: detecta drift entre profiles.futra_credits e SUM(credit_transactions)+1000
CREATE OR REPLACE FUNCTION public.detect_credit_drift()
RETURNS TABLE(
  user_id uuid,
  username text,
  profile_balance integer,
  expected_balance integer,
  drift integer,
  tx_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH tx_sum AS (
    SELECT ct.user_id, COALESCE(SUM(ct.amount), 0) AS net, COUNT(*) AS cnt
    FROM credit_transactions ct
    GROUP BY ct.user_id
  )
  SELECT 
    p.user_id,
    p.username,
    p.futra_credits,
    (1000 + COALESCE(t.net, 0))::integer,
    (p.futra_credits - (1000 + COALESCE(t.net, 0)))::integer,
    COALESCE(t.cnt, 0)
  FROM profiles p
  LEFT JOIN tx_sum t ON t.user_id = p.user_id
  WHERE p.futra_credits != (1000 + COALESCE(t.net, 0))
  ORDER BY ABS(p.futra_credits - (1000 + COALESCE(t.net, 0))) DESC;
$$;

REVOKE ALL ON FUNCTION public.detect_credit_drift() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_credit_drift() TO service_role;

-- Função de reconciliação que registra ajustes auditáveis
CREATE OR REPLACE FUNCTION public.reconcile_credit_drift()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_count integer := 0;
  v_total_drift integer := 0;
BEGIN
  -- Apenas service_role pode chamar
  IF COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Acesso negado: apenas service_role pode reconciliar créditos';
  END IF;

  FOR v_rec IN SELECT * FROM public.detect_credit_drift() LOOP
    -- Registra transação de ajuste (positiva ou negativa para zerar o drift)
    INSERT INTO public.credit_transactions (user_id, amount, type, description)
    VALUES (
      v_rec.user_id,
      -v_rec.drift,  -- ajuste inverso para anular o drift na soma de transações
      'reconciliation_adjustment',
      'Auto-reconciliação: drift de ' || v_rec.drift || ' FC detectado'
    );
    v_count := v_count + 1;
    v_total_drift := v_total_drift + v_rec.drift;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'users_reconciled', v_count,
    'total_drift_corrected', v_total_drift,
    'timestamp', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_credit_drift() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_credit_drift() TO service_role;
