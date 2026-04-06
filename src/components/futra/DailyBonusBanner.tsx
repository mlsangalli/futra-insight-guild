import { Coins, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDailyBonusEligibility, useClaimDailyBonus } from '@/hooks/useDailyBonus';
import { useAuth } from '@/contexts/AuthContext';

export function DailyBonusBanner() {
  const { user } = useAuth();
  const { isEligible, bonusAmount, streak } = useDailyBonusEligibility();
  const claimBonus = useClaimDailyBonus();

  if (!user || !isEligible) return null;

  return (
    <div className="rounded-xl gradient-primary p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
          <Coins className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-primary-foreground">
            Daily bonus: +{bonusAmount} credits
          </p>
          <p className="text-xs text-primary-foreground/70">
            {streak > 0 ? `${streak}-day streak bonus!` : 'Claim your daily reward'}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => claimBonus.mutate()}
        disabled={claimBonus.isPending}
      >
        {claimBonus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Claim'}
      </Button>
    </div>
  );
}
