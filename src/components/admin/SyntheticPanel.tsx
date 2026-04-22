/**
 * Admin panel for managing synthetic/simulation data per market.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSyntheticMarkets } from '@/hooks/useSyntheticMarket';
import { DEFAULT_CONFIG, CONFIG_PRESETS, generateSyntheticStats } from '@/lib/synthetic-engine';
import { setViewMode, type SyntheticViewMode } from '@/hooks/useSyntheticOverlay';
import { useViewMode } from '@/hooks/useViewMode';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { FlaskConical, RotateCw, Trash2, Settings, Eye, Zap } from '@/lib/icons';
import { PriceChart } from '@/components/futra/PriceChart';
import { cn } from '@/lib/utils';
import type { SyntheticConfig } from '@/lib/synthetic-engine';

export function SyntheticPanel() {
  const { toast } = useToast();
  const {
    syntheticData, enabledMap, enabledCount,
    upsert, remove, resetAll, isPending,
  } = useSyntheticMarkets();

  const [configOpen, setConfigOpen] = useState(false);
  const [configMarket, setConfigMarket] = useState<any>(null);
  const [configValues, setConfigValues] = useState<SyntheticConfig>(DEFAULT_CONFIG);
  const [configSeed, setConfigSeed] = useState(0);
  const viewMode = useViewMode();

  // Get all markets for listing
  const { data: allMarkets } = useQuery({
    queryKey: ['admin-markets-for-synth'],
    queryFn: async () => {
      const { data } = await supabase.from('markets').select('id, question, category, status, options').order('created_at', { ascending: false }).limit(100);
      return data || [];
    },
  });

  const handleToggle = async (marketId: string, enabled: boolean) => {
    try {
      await upsert({ market_id: marketId, enabled });
      toast({ title: enabled ? 'Simulação ativada' : 'Simulação desativada' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleOpenConfig = (market: any) => {
    const existing = syntheticData.find(s => s.market_id === market.id);
    setConfigMarket(market);
    setConfigValues(existing?.config || DEFAULT_CONFIG);
    setConfigSeed(existing?.seed || Math.floor(Math.random() * 2147483647));
    setConfigOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!configMarket) return;
    try {
      await upsert({
        market_id: configMarket.id,
        seed: configSeed,
        config: configValues,
        enabled: true,
      });
      toast({ title: 'Configuração salva' });
      setConfigOpen(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleResetSeed = () => {
    setConfigSeed(Math.floor(Math.random() * 2147483647));
  };

  const handleViewModeChange = (mode: SyntheticViewMode) => {
    setViewMode(mode);
    toast({ title: `Visualização: ${mode === 'real' ? 'Dados Reais' : mode === 'synthetic' ? 'Dados Sintéticos' : 'Comparação'}` });
    // O store reativo (useViewMode) propaga automaticamente — sem reload.
  };

  const handleResetAll = async () => {
    try {
      await resetAll();
      toast({ title: 'Dados sintéticos apagados' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleApplyPreset = (presetName: string) => {
    const preset = CONFIG_PRESETS[presetName];
    if (preset) {
      setConfigValues(prev => ({ ...prev, ...preset }));
    }
  };

  // Preview chart for config dialog
  const previewOptions = configMarket?.options
    ? (Array.isArray(configMarket.options) ? configMarket.options : []).map((o: any) => ({ id: o.id || '', label: o.label || '' }))
    : [{ id: 'yes', label: 'Sim' }, { id: 'no', label: 'Não' }];
  const preview = generateSyntheticStats(configSeed, configValues, previewOptions);

  const synthMap = new Map(syntheticData.map(s => [s.market_id, s]));

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-display font-semibold">Simulação de Dados</h2>
          {enabledCount > 0 && (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
              {enabledCount} ativo{enabledCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={viewMode} onValueChange={(v) => handleViewModeChange(v as SyntheticViewMode)}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <Eye className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="real">Dados Reais</SelectItem>
              <SelectItem value="synthetic">Dados Sintéticos</SelectItem>
              <SelectItem value="both">Comparação</SelectItem>
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={syntheticData.length === 0}>
                <Trash2 className="h-3 w-3 mr-1" /> Reset Completo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apagar todos os dados sintéticos?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso removerá todas as configurações de simulação. Os dados reais dos mercados não serão afetados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetAll}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Markets table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Simulação</TableHead>
              <TableHead className="max-w-[300px]">Mercado</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(allMarkets || []).map(m => {
              const synthRow = synthMap.get(m.id);
              const isEnabled = synthRow?.enabled ?? false;
              return (
                <TableRow key={m.id} className={cn(isEnabled && 'bg-yellow-500/5')}>
                  <TableCell>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggle(m.id, checked)}
                      disabled={isPending}
                    />
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <span className="text-sm truncate block" title={m.question}>{m.question}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{m.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.status === 'open' ? 'default' : 'secondary'} className="text-xs">{m.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {synthRow ? (
                      <span className="text-xs text-muted-foreground">
                        v:{synthRow.config.volatility} p:{synthRow.config.priority_level} {synthRow.config.mode === 'dynamic' ? '⚡' : '📌'}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEnabled && synthRow ? (
                      <div className="w-24 h-8">
                        <PriceChart
                          className="w-full h-full"
                          points={generateSyntheticStats(
                            synthRow.seed,
                            synthRow.config,
                            (Array.isArray(m.options) ? m.options : []).map((o: any) => ({ id: o.id || '', label: o.label || '' })),
                            20,
                          ).chartPoints}
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleOpenConfig(m)}
                        title="Configurar"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                      {synthRow && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => remove(m.id).then(() => toast({ title: 'Simulação removida' }))}
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-yellow-500" />
              Configurar Simulação
            </DialogTitle>
          </DialogHeader>
          {configMarket && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">{configMarket.question}</p>

              {/* Presets */}
              <div>
                <Label className="text-xs">Preset Rápido</Label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {Object.keys(CONFIG_PRESETS).map(key => (
                    <Button key={key} variant="outline" size="sm" className="text-xs h-7" onClick={() => handleApplyPreset(key)}>
                      {key}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Seed */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Seed</Label>
                  <Input
                    type="number"
                    value={configSeed}
                    onChange={e => setConfigSeed(Number(e.target.value))}
                    className="h-8 text-sm"
                  />
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8 mt-4" onClick={handleResetSeed} title="Nova seed">
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Initial Probability */}
              <div>
                <Label className="text-xs">Probabilidade Inicial: {configValues.initial_probability}%</Label>
                <Slider
                  value={[configValues.initial_probability]}
                  onValueChange={([v]) => setConfigValues(prev => ({ ...prev, initial_probability: v }))}
                  min={5} max={95} step={1}
                  className="mt-1"
                />
              </div>

              {/* Volatility */}
              <div>
                <Label className="text-xs">Volatilidade: {configValues.volatility.toFixed(2)}</Label>
                <Slider
                  value={[configValues.volatility * 100]}
                  onValueChange={([v]) => setConfigValues(prev => ({ ...prev, volatility: v / 100 }))}
                  min={5} max={90} step={5}
                  className="mt-1"
                />
              </div>

              {/* Volume Base */}
              <div>
                <Label className="text-xs">Volume Base: {configValues.volume_base}</Label>
                <Slider
                  value={[configValues.volume_base]}
                  onValueChange={([v]) => setConfigValues(prev => ({ ...prev, volume_base: v }))}
                  min={10} max={1000} step={10}
                  className="mt-1"
                />
              </div>

              {/* Growth Rate */}
              <div>
                <Label className="text-xs">Taxa de Crescimento: {configValues.growth_rate.toFixed(1)}x</Label>
                <Slider
                  value={[configValues.growth_rate * 10]}
                  onValueChange={([v]) => setConfigValues(prev => ({ ...prev, growth_rate: v / 10 }))}
                  min={1} max={30} step={1}
                  className="mt-1"
                />
              </div>

              {/* Priority */}
              <div>
                <Label className="text-xs">Prioridade: {configValues.priority_level}</Label>
                <Slider
                  value={[configValues.priority_level]}
                  onValueChange={([v]) => setConfigValues(prev => ({ ...prev, priority_level: v }))}
                  min={1} max={5} step={1}
                  className="mt-1"
                />
              </div>

              {/* Mode */}
              <div className="flex items-center gap-3">
                <Label className="text-xs">Modo:</Label>
                <Select
                  value={configValues.mode}
                  onValueChange={(v) => setConfigValues(prev => ({ ...prev, mode: v as 'static' | 'dynamic' }))}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">Estático 📌</SelectItem>
                    <SelectItem value="dynamic">Dinâmico ⚡</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              <div className="rounded-lg border border-border p-3 bg-muted/30">
                <p className="text-xs font-medium mb-2 text-muted-foreground">Preview</p>
                <div className="h-16 mb-2">
                  <PriceChart className="w-full h-full" points={preview.chartPoints} />
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>👥 {preview.totalParticipants}</span>
                  <span>💰 {preview.totalCredits.toLocaleString()}</span>
                  {preview.options.map(o => (
                    <span key={o.id}>{o.label}: {o.percentage}%</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveConfig} disabled={isPending}>
              <Zap className="h-3.5 w-3.5 mr-1" /> Salvar & Ativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
