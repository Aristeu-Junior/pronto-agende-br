import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle,
  Clock,
  Compass,
  Fingerprint,
  FunnelSimple,
  GlobeHemisphereWest,
  Lightning,
  MagnifyingGlass,
  MapPin,
  Medal,
  Receipt,
  ShieldCheck,
  Sparkle,
  Star,
} from '@phosphor-icons/react';
import {
  BusinessConfig,
  MarketplaceCategory,
  MarketplaceVenue,
  PosTransaction,
  VerifiedReview,
} from '../types';
import { formatBRL } from '../utils/validators';
import { LightDismissDialog } from './LightDismissDialog';

interface MarketplaceDiscoveryModuleProps {
  business: BusinessConfig;
  venues: MarketplaceVenue[];
  reviews: VerifiedReview[];
  transactions: PosTransaction[];
  onAddVerifiedReview: (review: Omit<VerifiedReview, 'id' | 'verifiedAt'>) => void;
  onSelectVenueForBooking: (origin: 'GOOGLE_RESERVE' | 'MARKETPLACE_BOOST') => void;
}

const NEIGHBORHOODS = [
  'Todos os bairros',
  'Pinheiros',
  'Vila Madalena',
  'Itaim Bibi',
  'Jardins',
  'Moema',
];

const CATEGORIES: Array<{ id: MarketplaceCategory; label: string }> = [
  { id: 'TODAS', label: 'Todas as Categorias' },
  { id: 'BARBEARIA', label: 'Barbearias' },
  { id: 'SALAO_BELEZA', label: 'Salões de Beleza' },
  { id: 'CLINICA_ESTETICA', label: 'Clínicas de Estética' },
  { id: 'STUDIO_SOBRANCELHA', label: 'Sobrancelhas & Cílios' },
];

export const MarketplaceDiscoveryModule: React.FC<
  MarketplaceDiscoveryModuleProps
> = ({
  business,
  venues,
  reviews,
  transactions,
  onAddVerifiedReview,
  onSelectVenueForBooking,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] =
    useState<string>('Todos os bairros');
  const [selectedCategory, setSelectedCategory] =
    useState<MarketplaceCategory>('TODAS');
  const [onlyWalkInNow, setOnlyWalkInNow] = useState(false);
  const [onlyBestOfYear, setOnlyBestOfYear] = useState(false);
  const [activeVenueId, setActiveVenueId] = useState<string>(venues[0]?.id || '');

  // Estado do Modal de Avaliação Verificada Pós-PDV
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string>(
    transactions[0]?.id || ''
  );
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [commentInput, setCommentInput] = useState<string>('');
  const [reviewError, setReviewError] = useState<string>('');

  // Sincroniza os dados dinâmicos da unidade atual (Barbearia Dom Pedro) na vitrine
  const enrichedVenues = useMemo(() => {
    const domPedroReviews = reviews.filter(
      (r) => r.venueId === 'biz_dom_pedro_01'
    );
    const dynamicCount =
      business.reviewsCount + Math.max(0, domPedroReviews.length - 3);

    return venues
      .map((venue) => {
        if (!venue.isCurrentWorkspaceVenue) return venue;
        return {
          ...venue,
          name: business.name,
          neighborhood: business.neighborhood,
          address: business.address,
          isBoostSponsored: business.boostEnabled,
          googleReserveIntegrated: business.googleReserveEnabled,
          bestOfYearBadge: business.bestBadge,
          reviewsCount: dynamicCount,
        };
      })
      .sort((a, b) => {
        // Prioriza estabelecimentos com Boost ativo no topo da vitrine local
        if (a.isBoostSponsored && !b.isBoostSponsored) return -1;
        if (!a.isBoostSponsored && b.isBoostSponsored) return 1;
        return a.distanceKm - b.distanceKm;
      });
  }, [venues, business, reviews]);

  const filteredVenues = useMemo(() => {
    return enrichedVenues.filter((venue) => {
      if (
        selectedCategory !== 'TODAS' &&
        venue.category !== selectedCategory
      ) {
        return false;
      }
      if (
        selectedNeighborhood !== 'Todos os bairros' &&
        venue.neighborhood !== selectedNeighborhood
      ) {
        return false;
      }
      if (onlyWalkInNow && !venue.acceptsWalkInNow) {
        return false;
      }
      if (onlyBestOfYear && !venue.bestOfYearBadge) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = venue.name.toLowerCase().includes(q);
        const matchNeighborhood = venue.neighborhood.toLowerCase().includes(q);
        const matchService = venue.featuredServices.some((s) =>
          s.name.toLowerCase().includes(q)
        );
        return matchName || matchNeighborhood || matchService;
      }
      return true;
    });
  }, [
    enrichedVenues,
    selectedCategory,
    selectedNeighborhood,
    onlyWalkInNow,
    onlyBestOfYear,
    searchQuery,
  ]);

  const selectedVenue = useMemo(() => {
    return (
      filteredVenues.find((v) => v.id === activeVenueId) ||
      filteredVenues[0] ||
      enrichedVenues[0]
    );
  }, [filteredVenues, activeVenueId, enrichedVenues]);

  const venueReviews = useMemo(() => {
    if (!selectedVenue) return [];
    return reviews.filter((r) => r.venueId === selectedVenue.id);
  }, [reviews, selectedVenue]);

  // Transações elegíveis que ainda não possuem avaliação verificada
  const unreviewedTransactions = useMemo(() => {
    const usedReceipts = new Set(reviews.map((r) => r.posReceiptCode));
    return transactions.filter((tx) => !usedReceipts.has(tx.id));
  }, [transactions, reviews]);

  const handleOpenReviewDialog = () => {
    setReviewError('');
    setCommentInput('');
    setRatingInput(5);
    if (unreviewedTransactions.length > 0) {
      setSelectedTxId(unreviewedTransactions[0].id);
    } else if (transactions.length > 0) {
      setSelectedTxId(transactions[0].id);
    }
    setIsReviewModalOpen(true);
  };

  const handleSubmitVerifiedReview = (e: React.FormEvent) => {
    e.preventDefault();
    const tx = transactions.find((t) => t.id === selectedTxId);
    if (!tx) {
      setReviewError(
        'Selecione um comprovante de comanda fechada no PDV para autenticar a avaliação.'
      );
      return;
    }
    if (commentInput.trim().length < 12) {
      setReviewError(
        'Escreva um relato objetivo com pelo menos 12 caracteres sobre o atendimento.'
      );
      return;
    }

    onAddVerifiedReview({
      venueId: 'biz_dom_pedro_01',
      clientName: tx.clientName,
      serviceName: 'Atendimento Verificado via Comanda PDV',
      staffName: tx.staffName,
      rating: ratingInput,
      comment: commentInput.trim(),
      posReceiptCode: tx.id,
      originChannel: tx.originChannel,
    });

    setIsReviewModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Cabeçalho da Vitrine Geolocalizada */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#DEDAD0] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md border border-[#0F766E]/30 bg-[#E6F4F1] px-2.5 py-1 text-xs font-semibold text-[#0F766E] mb-2">
            <Compass size={15} weight="bold" />
            <span>
              Vitrine Pública Local · Descoberta Geolocalizada + Reserve with Google
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#141413]">
            Marketplace Local de Barbearias, Salões & Estética
          </h1>
          <p className="text-xs sm:text-sm text-[#4A4843] mt-1">
            Busca por bairro em São Paulo · Destaque patrocinado{' '}
            <strong className="text-[#141413]">
              Marketplace Boost (taxa 15% somente na 1ª visita)
            </strong>{' '}
            e avaliações 100% auditadas por comanda fechada no PDV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenReviewDialog}
            className="min-h-[42px] inline-flex items-center gap-2 rounded-lg border border-[#DEDAD0] bg-[#F6F5F0] px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#EFECE6]"
          >
            <Receipt size={16} weight="bold" className="text-[#0F766E]" />
            <span>Publicar Avaliação Pós-PDV</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectVenueForBooking('MARKETPLACE_BOOST')}
            className="min-h-[42px] inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D655E]"
          >
            <Sparkle size={16} weight="fill" />
            <span>Simular Captação Boost (1ª Visita)</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Geolocalizados & Categorias */}
      <div className="rounded-xl border border-[#DEDAD0] bg-[#F6F5F0] p-3.5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Busca por nome, serviço ou rua */}
          <div className="md:col-span-5 relative">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A776E]"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por barbearia, corte degradê, limpeza de pele..."
              className="w-full min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white pl-9 pr-3 text-xs text-[#141413] placeholder:text-[#7A776E] focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          {/* Seletor de Bairro */}
          <div className="md:col-span-3 relative">
            <MapPin
              size={16}
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0F766E]"
            />
            <select
              aria-label="Filtrar por bairro"
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              className="w-full min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white pl-9 pr-3 text-xs font-semibold text-[#141413] focus:border-[#0F766E] focus:outline-none"
            >
              {NEIGHBORHOODS.map((nb) => (
                <option key={nb} value={nb}>
                  {nb === 'Todos os bairros' ? 'Bairro: Todos (Raio 5 km)' : nb}
                </option>
              ))}
            </select>
          </div>

          {/* Toggles rápidos: Encaixe Walk-in Agora + Selo Melhores do Ano */}
          <div className="md:col-span-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyWalkInNow((v) => !v)}
              className={`min-h-[40px] flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${
                onlyWalkInNow
                  ? 'border-[#141413] bg-[#141413] text-white'
                  : 'border-[#DEDAD0] bg-white text-[#4A4843] hover:text-[#141413]'
              }`}
            >
              <Lightning size={14} weight="fill" />
              <span>Walk-in Agora</span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyBestOfYear((v) => !v)}
              className={`min-h-[40px] flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${
                onlyBestOfYear
                  ? 'border-[#B45309] bg-[#FEF3C7] text-[#B45309]'
                  : 'border-[#DEDAD0] bg-white text-[#4A4843] hover:text-[#141413]'
              }`}
            >
              <Medal size={15} weight="fill" />
              <span>Selo Top 2026</span>
            </button>
          </div>
        </div>

        {/* Pílulas de Categoria */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7A776E] pr-1">
            <FunnelSimple size={13} weight="bold" />
            <span>Especialidade:</span>
          </span>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[32px] whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold ${
                  active
                    ? 'bg-[#0F766E] text-white'
                    : 'bg-white border border-[#DEDAD0] text-[#4A4843] hover:text-[#141413]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Layout Assimétrico 12 Colunas: Lista de Estabelecimentos (7 col) + Inspetor de Vitrine & Avaliações Auditadas (5 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Resultados Geolocalizados */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between text-xs text-[#4A4843]">
            <span>
              Exibindo{' '}
              <strong className="num-tabular text-[#141413]">
                {filteredVenues.length}
              </strong>{' '}
              estabelecimentos verificados em São Paulo - SP
            </span>
            <span className="num-tabular text-[11px] text-[#7A776E]">
              Ordenado por: Destaque Boost & Proximidade (km)
            </span>
          </div>

          {filteredVenues.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#DEDAD0] bg-[#F6F5F0]/60 p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-[#141413]">
                Nenhum estabelecimento encontrado para os filtros selecionados.
              </p>
              <p className="text-xs text-[#4A4843]">
                Experimente limpar o filtro de bairro ou desativar o filtro de
                encaixe imediato.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedNeighborhood('Todos os bairros');
                  setSelectedCategory('TODAS');
                  setOnlyWalkInNow(false);
                  setOnlyBestOfYear(false);
                }}
                className="min-h-[38px] inline-flex items-center gap-1.5 rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white"
              >
                Restaurar Todos os Bairros
              </button>
            </div>
          ) : (
            filteredVenues.map((venue) => {
              const isSelected = selectedVenue?.id === venue.id;
              return (
                <article
                  key={venue.id}
                  onClick={() => setActiveVenueId(venue.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                    isSelected
                      ? 'border-[#0F766E] bg-[#F6F5F0]/70 ring-1 ring-[#0F766E]'
                      : 'border-[#DEDAD0] bg-white hover:bg-[#F6F5F0]/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1.5">
                      {/* Badges Superiores (Boost / Melhores do Ano / Google Reserve) */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {venue.isBoostSponsored && (
                          <span className="inline-flex items-center gap-1 rounded border border-[#0F766E]/30 bg-[#E6F4F1] px-2 py-0.5 text-[11px] font-semibold text-[#0F766E]">
                            <Sparkle size={12} weight="fill" />
                            <span>Destaque Boost · 1ª Visita</span>
                          </span>
                        )}

                        {venue.bestOfYearBadge && (
                          <span className="inline-flex items-center gap-1 rounded border border-[#B45309]/30 bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#B45309]">
                            <Medal size={12} weight="fill" />
                            <span>Top Avaliado 2026</span>
                          </span>
                        )}

                        {venue.googleReserveIntegrated && (
                          <span className="inline-flex items-center gap-1 rounded border border-[#DEDAD0] bg-[#F6F5F0] px-2 py-0.5 text-[11px] font-medium text-[#4A4843]">
                            <GlobeHemisphereWest size={12} weight="bold" />
                            <span>Google Reserve (0% taxa)</span>
                          </span>
                        )}

                        {venue.isCurrentWorkspaceVenue && (
                          <span className="inline-flex items-center rounded bg-[#141413] px-2 py-0.5 text-[10px] font-semibold text-white">
                            Sua Unidade Ativa
                          </span>
                        )}
                      </div>

                      <h2 className="text-base font-bold text-[#141413]">
                        {venue.name}
                      </h2>

                      <p className="text-xs text-[#4A4843] flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-[#141413]">
                          {venue.neighborhood}
                        </span>
                        <span>·</span>
                        <span>{venue.address}</span>
                        <span>·</span>
                        <span className="num-tabular font-semibold text-[#0F766E]">
                          a {venue.distanceKm.toFixed(1).replace('.', ',')} km
                        </span>
                      </p>
                    </div>

                    {/* Bloco de Nota Verificada & Preço Inicial */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-[#DEDAD0] pt-2.5 sm:pt-0">
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#DEDAD0] bg-white px-2.5 py-1">
                        <Star
                          size={14}
                          weight="fill"
                          className="text-[#B45309]"
                        />
                        <span className="num-tabular text-xs font-bold text-[#141413]">
                          {venue.rating.toFixed(1).replace('.', ',')}
                        </span>
                        <span className="num-tabular text-[11px] text-[#7A776E]">
                          ({venue.reviewsCount} verificadas)
                        </span>
                      </div>

                      <div className="text-right mt-1">
                        <span className="text-[11px] text-[#7A776E] block">
                          Serviços a partir de
                        </span>
                        <span className="num-tabular text-sm font-bold text-[#141413]">
                          {formatBRL(venue.startingPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Serviços em Destaque na Vitrine */}
                  <div className="mt-3 border-t border-[#DEDAD0] pt-3 space-y-2">
                    {venue.featuredServices.slice(0, 2).map((srv) => (
                      <div
                        key={srv.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="text-[#141413] font-medium">
                          {srv.name}{' '}
                          <span className="num-tabular text-[#7A776E]">
                            ({srv.durationMinutes} min)
                          </span>
                        </div>
                        <span className="num-tabular font-semibold text-[#141413]">
                          {formatBRL(srv.price)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Rodapé do Card: Horários Livres Hoje & Status Walk-in */}
                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#DEDAD0] pt-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[#4A4843] mr-1">
                        Hoje:
                      </span>
                      {venue.nextAvailableSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVenueForBooking(
                              venue.isBoostSponsored
                                ? 'MARKETPLACE_BOOST'
                                : 'GOOGLE_RESERVE'
                            );
                          }}
                          className="num-tabular rounded-md border border-[#DEDAD0] bg-[#F6F5F0] px-2.5 py-1 text-xs font-semibold text-[#141413] hover:border-[#0F766E] hover:bg-[#E6F4F1] hover:text-[#0F766E]"
                        >
                          {slot}
                        </button>
                      ))}
                    </div>

                    {venue.acceptsWalkInNow ? (
                      <span className="num-tabular inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F766E]">
                        <Clock size={13} weight="bold" />
                        <span>
                          Encaixe Walk-in livre (~{venue.walkInWaitMinutes} min)
                        </span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#7A776E]">
                        Somente hora marcada hoje
                      </span>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Coluna Direita (5 col): Inspetor de Reputação Auditada & Regras de Atribuição Boost */}
        {selectedVenue && (
          <aside className="lg:col-span-5 rounded-xl border border-[#DEDAD0] bg-[#F6F5F0] p-4 sm:p-5 space-y-5 lg:sticky lg:top-24">
            <div className="flex items-start justify-between gap-3 border-b border-[#DEDAD0] pb-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0F766E]">
                  Ficha Pública Auditada
                </span>
                <h3 className="text-lg font-bold text-[#141413] mt-0.5">
                  {selectedVenue.name}
                </h3>
                <p className="text-xs text-[#4A4843]">
                  {selectedVenue.categoryLabel} · {selectedVenue.neighborhood}
                </p>
              </div>

              <div className="rounded-lg border border-[#DEDAD0] bg-white px-3 py-1.5 text-right">
                <div className="inline-flex items-center gap-1 text-sm font-bold text-[#141413] num-tabular">
                  <Star size={15} weight="fill" className="text-[#B45309]" />
                  <span>
                    {selectedVenue.rating.toFixed(1).replace('.', ',')}
                  </span>
                </div>
                <span className="block text-[10px] text-[#7A776E] num-tabular">
                  {selectedVenue.reviewsCount} avaliações PDV
                </span>
              </div>
            </div>

            {/* Transparência de Atribuição */}
            <div className="rounded-lg border border-[#DEDAD0] bg-white p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-semibold text-[#141413]">
                <span className="inline-flex items-center gap-1.5">
                  <Fingerprint
                    size={16}
                    weight="bold"
                    className="text-[#0F766E]"
                  />
                  <span>Reserva Direta ou em Destaque</span>
                </span>
              </div>
              <p className="text-[#4A4843] leading-relaxed">
                O destaque patrocinado aplica taxa única de{' '}
                <strong className="num-tabular text-[#141413]">15%</strong>{' '}
                exclusivamente na 1ª visita de um novo cliente. A partir da 2ª
                visita ou via <strong>Google</strong>, a reserva é{' '}
                <strong className="num-tabular text-[#0F766E]">100% isenta</strong>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectVenueForBooking('GOOGLE_RESERVE')}
                  className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#DEDAD0] bg-[#F6F5F0] px-3 py-2 text-xs font-semibold text-[#141413] hover:bg-[#EFECE6]"
                >
                  <GlobeHemisphereWest size={15} weight="bold" />
                  <span>Reservar via Google (0%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectVenueForBooking('MARKETPLACE_BOOST')}
                  className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0D655E]"
                >
                  <span>Agendar via Boost (15%)</span>
                  <ArrowUpRight size={14} weight="bold" />
                </button>
              </div>
            </div>

            {/* Lista de Avaliações Verificadas Pós-PDV */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A4843] inline-flex items-center gap-1.5">
                  <ShieldCheck
                    size={15}
                    weight="fill"
                    className="text-[#0F766E]"
                  />
                  <span>Avaliações Verificadas por Comanda PDV</span>
                </h4>
                {selectedVenue.isCurrentWorkspaceVenue && (
                  <button
                    type="button"
                    onClick={handleOpenReviewDialog}
                    className="text-xs font-semibold text-[#0F766E] hover:underline"
                  >
                    + Nova avaliação
                  </button>
                )}
              </div>

              {venueReviews.length === 0 ? (
                <div className="rounded-lg border border-[#DEDAD0] bg-white p-4 text-xs text-[#4A4843]">
                  Este estabelecimento parceiro possui{' '}
                  <strong className="num-tabular text-[#141413]">
                    {selectedVenue.reviewsCount}
                  </strong>{' '}
                  avaliações verificadas. Selecione a{' '}
                  <strong>Barbearia & Estúdio Dom Pedro</strong> para inspecionar
                  os recibos do PDV desta sessão.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {venueReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="rounded-lg border border-[#DEDAD0] bg-white p-3.5 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-[#141413]">
                            {rev.clientName}
                          </div>
                          <div className="text-[11px] text-[#7A776E]">
                            {rev.serviceName} · Profissional:{' '}
                            <strong className="text-[#4A4843]">
                              {rev.staffName}
                            </strong>
                          </div>
                        </div>

                        <span className="num-tabular inline-flex items-center gap-1 rounded bg-[#FEF3C7] px-2 py-0.5 text-xs font-bold text-[#B45309]">
                          <Star size={12} weight="fill" />
                          <span>{rev.rating.toFixed(1).replace('.', ',')}</span>
                        </span>
                      </div>

                      <p className="text-xs text-[#141413] leading-relaxed">
                        “{rev.comment}”
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#DEDAD0] pt-2 text-[11px] text-[#7A776E]">
                        <span className="inline-flex items-center gap-1 font-medium text-[#0F766E]">
                          <CheckCircle size={13} weight="fill" />
                          <span>
                            Recibo PDV #{rev.posReceiptCode} ({rev.originChannel})
                          </span>
                        </span>
                        <span className="num-tabular">{rev.verifiedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Modal Nativo (<dialog closedby="any">) para Publicar Avaliação Verificada Pós-PDV */}
      <LightDismissDialog
        open={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Publicar Avaliação Verificada Pós-PDV"
        subtitle="Somente clientes com comanda efetivamente liquidada no PDV podem avaliar o estabelecimento (prevenção contra avaliações falsas)."
      >
        <form onSubmit={handleSubmitVerifiedReview} className="space-y-4">
          <div>
            <label
              htmlFor="pos-receipt-select"
              className="block text-xs font-semibold text-[#141413] mb-1.5"
            >
              Comanda Fechada no PDV (Prova de Atendimento)
            </label>
            <select
              id="pos-receipt-select"
              value={selectedTxId}
              onChange={(e) => setSelectedTxId(e.target.value)}
              className="w-full min-h-[42px] rounded-lg border border-[#DEDAD0] bg-white px-3 text-xs font-medium text-[#141413] num-tabular"
            >
              {transactions.map((tx) => (
                <option key={tx.id} value={tx.id}>
                  Recibo #{tx.id} · {tx.clientName} c/ {tx.staffName} (
                  {formatBRL(tx.totalAmount)} em {tx.closedAt})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#141413] mb-1.5">
              Nota do Atendimento (1 a 5 estrelas)
            </span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingInput(star)}
                  className={`min-h-[40px] flex-1 inline-flex items-center justify-center gap-1 rounded-lg border text-xs font-bold num-tabular ${
                    ratingInput >= star
                      ? 'border-[#B45309] bg-[#FEF3C7] text-[#B45309]'
                      : 'border-[#DEDAD0] bg-[#F6F5F0] text-[#7A776E]'
                  }`}
                >
                  <Star size={14} weight="fill" />
                  <span>{star}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="verified-review-comment"
              className="block text-xs font-semibold text-[#141413] mb-1.5"
            >
              Relato Verificado do Cliente
            </label>
            <textarea
              id="verified-review-comment"
              rows={3}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Descreva a pontualidade, higiene da bancada e resultado do corte ou procedimento..."
              className="w-full rounded-lg border border-[#DEDAD0] bg-white p-3 text-xs text-[#141413] focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          {reviewError && (
            <div className="rounded-lg border border-[#B91C1C]/30 bg-[#FEE2E2] p-3 text-xs font-medium text-[#B91C1C]">
              {reviewError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-[#DEDAD0] pt-3">
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(false)}
              className="min-h-[40px] rounded-lg border border-[#DEDAD0] bg-white px-4 py-2 text-xs font-semibold text-[#4A4843]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[40px] rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D655E]"
            >
              Autenticar Recibo & Publicar Avaliação
            </button>
          </div>
        </form>
      </LightDismissDialog>
    </div>
  );
};
