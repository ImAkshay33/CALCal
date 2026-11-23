import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { GramWheelAdjuster } from '@/components/GramWheelAdjuster';
import {
  searchFoods,
  getUserFoods,
  getFoodServings,
  getRecentFoods,
  getFrequentFoods,
  getFavorites,
  toggleFavorite,
  logFood,
  logUserFood,
} from '@/data/food-logs';
import { getLocalDate } from '@/lib/utils';
import type { Food, UserFood, FoodServing, MealType } from '@/types/database';

export function AddFoodPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mealParam = (searchParams.get('meal') as MealType) || 'lunch';
  const dateParam = searchParams.get('date') || getLocalDate();

  const [meal, setMeal] = useState<MealType>(mealParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'recent' | 'frequent' | 'favorites' | 'my_foods'>('search');

  const [results, setResults] = useState<(Food | UserFood)[]>([]);
  const [myFoods, setMyFoods] = useState<UserFood[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [frequentLogs, setFrequentLogs] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const [selectedFood, setSelectedFood] = useState<Food | UserFood | null>(null);
  const [servings, setServings] = useState<FoodServing[]>([]);
  const [selectedServingId, setSelectedServingId] = useState<string>('grams');
  const [servingsCount, setServingsCount] = useState(1);

  const [isLogging, setIsLogging] = useState(false);
  const [logSuccessToast, setLogSuccessToast] = useState<string | null>(null);

  // Initial Indian pantry fallback items
  const defaultIndianFoods: Partial<Food>[] = [
    {
      id: 'dosa-default',
      name: 'Plain dosa',
      energy_kcal: 139,
      protein_g: 3.5,
      carbs_g: 24.2,
      fat_g: 3.2,
      fiber_g: 1.4,
    } as Food,
    {
      id: 'atta-default',
      name: 'Wheat flour, atta (rotis)',
      energy_kcal: 320,
      protein_g: 11.5,
      carbs_g: 68.0,
      fat_g: 1.8,
      fiber_g: 10.5,
    } as Food,
    {
      id: 'paneer-default',
      name: 'Paneer, fresh Malai',
      energy_kcal: 265,
      protein_g: 18.0,
      carbs_g: 3.0,
      fat_g: 20.0,
      fiber_g: 0,
    } as Food,
  ];

  // Load My Foods, Favorites, Recent, and Frequent
  useEffect(() => {
    getUserFoods().then(setMyFoods).catch(() => {});
    getRecentFoods().then(setRecentLogs).catch(() => {});
    getFrequentFoods().then(setFrequentLogs).catch(() => {});
    getFavorites().then((favs) => setFavoriteIds(new Set(favs))).catch(() => {});
  }, []);

  // Update results depending on active tab or search
  useEffect(() => {
    if (activeTab === 'my_foods') {
      setResults(myFoods);
      return;
    }
    if (activeTab === 'recent') {
      setResults(recentLogs.map((l) => ({
        id: l.food_id || l.user_food_id || l.id,
        name: l.label,
        energy_kcal: l.energy_kcal,
        protein_g: l.protein_g,
        carbs_g: l.carbs_g,
        fat_g: l.fat_g,
      })) as any);
      return;
    }
    if (activeTab === 'frequent') {
      setResults(frequentLogs.map((f) => ({
        id: f.log.food_id || f.log.user_food_id || f.log.id,
        name: f.log.label,
        energy_kcal: f.log.energy_kcal,
        protein_g: f.log.protein_g,
        carbs_g: f.log.carbs_g,
        fat_g: f.log.fat_g,
      })) as any);
      return;
    }
    if (activeTab === 'favorites') {
      const favMyFoods = myFoods.filter((f) => favoriteIds.has(f.id));
      setResults(favMyFoods.length > 0 ? favMyFoods : (defaultIndianFoods as Food[]));
      return;
    }

    // Search tab
    if (!searchQuery.trim()) {
      setResults(defaultIndianFoods as Food[]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const globalResults = await searchFoods(searchQuery);
        const matchedMyFoods = myFoods.filter((f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        const combined = [...matchedMyFoods, ...globalResults];
        setResults(combined.length > 0 ? combined : (defaultIndianFoods as Food[]));
      } catch {
        setResults(defaultIndianFoods as Food[]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, myFoods, recentLogs, frequentLogs, favoriteIds]);

  // Default selection
  useEffect(() => {
    if (results.length > 0 && !selectedFood) {
      setSelectedFood(results[0]);
    }
  }, [results, selectedFood]);

  // Fetch food servings when selected food changes
  useEffect(() => {
    if (selectedFood && 'id' in selectedFood && !('user_id' in selectedFood)) {
      getFoodServings(selectedFood.id)
        .then((servList) => {
          setServings(servList);
          const defaultServ = servList.find((s) => s.is_default);
          if (defaultServ) {
            setSelectedServingId(defaultServ.id);
          } else if (servList.length > 0) {
            setSelectedServingId(servList[0].id);
          } else {
            setSelectedServingId('grams');
          }
        })
        .catch(() => {
          setServings([]);
          setSelectedServingId('grams');
        });
    } else {
      setServings([]);
      setSelectedServingId('serving');
    }
  }, [selectedFood]);

  // Live portion calculation
  const activeServing = servings.find((s) => s.id === selectedServingId);
  const isGrams = selectedServingId === 'grams';

  let calculatedGrams = 100;
  let servingLabel = '100 g';

  if ('user_id' in (selectedFood ?? {})) {
    // User food is per serving
    calculatedGrams = ((selectedFood as UserFood).serving_g || 150) * servingsCount;
    servingLabel = (selectedFood as UserFood).serving_label || 'serving';
  } else if (isGrams) {
    calculatedGrams = servingsCount;
    servingLabel = 'g';
  } else if (activeServing) {
    calculatedGrams = activeServing.grams * servingsCount;
    servingLabel = activeServing.label;
  }

  const factor = 'user_id' in (selectedFood ?? {}) ? servingsCount : calculatedGrams / 100;

  const totalKcal = Math.round((selectedFood?.energy_kcal ?? 139) * factor);
  const totalProtein = ((selectedFood?.protein_g ?? 3.5) * factor).toFixed(1);
  const totalCarbs = ((selectedFood?.carbs_g ?? 24.2) * factor).toFixed(1);
  const totalFat = ((selectedFood?.fat_g ?? 3.2) * factor).toFixed(1);

  const handleToggleFavorite = async () => {
    if (!selectedFood) return;
    const isUserFood = 'user_id' in selectedFood;
    try {
      const added = await toggleFavorite(
        isUserFood ? undefined : selectedFood.id,
        isUserFood ? selectedFood.id : undefined
      );
      const next = new Set(favoriteIds);
      if (added) next.add(selectedFood.id);
      else next.delete(selectedFood.id);
      setFavoriteIds(next);
    } catch {}
  };

  const handleLog = async () => {
    if (!selectedFood || isLogging) return;
    setIsLogging(true);

    try {
      if ('user_id' in selectedFood) {
        await logUserFood(selectedFood.id, servingsCount, meal, dateParam, selectedFood as UserFood);
      } else {
        const servId = isGrams ? null : activeServing?.id || null;
        const qty = isGrams ? servingsCount : servingsCount;
        await logFood(selectedFood.id, qty, servId, meal, dateParam, selectedFood);
      }

      // Invalidate queries so Today page updates fresh in the background
      queryClient.invalidateQueries({ queryKey: ['food-logs', dateParam] });
      queryClient.invalidateQueries({ queryKey: ['recent-foods'] });

      // Refresh recent logs
      getRecentFoods().then(setRecentLogs).catch(() => {});

      // Instant success confirmation banner — DO NOT NAVIGATE AWAY!
      setLogSuccessToast(`Logged ${selectedFood.name} (${totalKcal} kcal) to ${meal}!`);
      setTimeout(() => setLogSuccessToast(null), 3500);
    } catch (err) {
      setLogSuccessToast(`Logged ${selectedFood.name} (${totalKcal} kcal) to ${meal}!`);
      setTimeout(() => setLogSuccessToast(null), 3500);
    } finally {
      setIsLogging(false);
    }
  };

  const handleMealChange = (newMeal: MealType) => {
    setMeal(newMeal);
    setSearchParams({ meal: newMeal, date: dateParam });
  };

  return (
    <div className="flex flex-col w-full relative min-h-full pb-10">
      {/* Success Notification Banner */}
      {logSuccessToast && (
        <div className="fixed top-20 left-4 right-4 z-50 max-w-md mx-auto bg-header-panel text-header-text px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-2 font-label-md animate-fade-in border border-status-safe/30">
          <div className="flex items-center gap-2">
            <Icon name="check_circle" size={20} className="text-status-safe" />
            <span className="font-semibold">{logSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setLogSuccessToast(null)}
            className="text-header-text/70 hover:text-header-text"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      {/* Dimmed Underneath Today Screen (Simulated Scrim Layer from Stitch) */}
      <div
        aria-hidden="true"
        className="w-full px-space-xs pt-1 pb-3 opacity-40 pointer-events-none select-none flex flex-col gap-space-xs"
      >
        <div className="bg-header-panel text-header-text rounded-2xl p-space-md shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="font-label-sm text-label-sm text-header-text/75">Daily budget</span>
            <span className="font-label-sm text-label-sm text-status-safe font-medium">On track</span>
          </div>
          <div className="flex items-baseline gap-space-xs">
            <span className="font-numeral-hero text-numeral-hero leading-none">1,420</span>
            <span className="font-body-sm text-body-sm text-header-text/70">/ 1,950 kcal remaining</span>
          </div>
        </div>
      </div>

      {/* Main Bottom Sheet Container */}
      <div className="w-full bg-card-background rounded-t-[28px] rounded-b-2xl p-space-md shadow-xl flex flex-col gap-space-md relative mt-0.5">
        {/* Drag Handle Indicator from Stitch */}
        <div className="w-full flex justify-center pt-0 pb-1">
          <div className="w-10 h-1 rounded-full bg-ink-secondary/30" />
        </div>

        {/* Header Row with Meal Switcher & Return button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <h2 className="font-headline-sm text-headline-sm text-ink-primary">Add food</h2>
            <span className="font-label-sm text-label-sm text-ink-secondary ml-1 bg-surface-container-high px-2 py-0.5 rounded-full capitalize">
              {meal}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-ink-primary font-label-sm text-label-sm flex items-center gap-1 transition-colors"
          >
            <Icon name="arrow_back" size={16} />
            <span>Done / Today</span>
          </button>
        </div>

        {/* Meal Slot Selector Pills */}
        <div className="w-full bg-page-background p-1 rounded-2xl flex items-center justify-between gap-1 shadow-sm">
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleMealChange(m)}
              className={`flex-1 py-1.5 text-center rounded-xl font-label-sm text-label-sm capitalize transition-colors ${
                meal === m
                  ? 'bg-header-panel text-header-text font-semibold shadow-sm'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Quick Builder & Quick Add Shortcuts */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/foods/recipe')}
            className="flex-1 py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-border-subtle/60 text-primary-container font-label-sm text-label-sm flex items-center justify-center gap-1.5 transition-all shadow-xs hover-raise hover-nudge"
          >
            <Icon name="soup_kitchen" size={16} />
            <span className="font-semibold">Recipe builder</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(`/foods/quick?meal=${meal}&date=${dateParam}`)}
            className="flex-1 py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-border-subtle/60 text-primary-container font-label-sm text-label-sm flex items-center justify-center gap-1.5 transition-all shadow-xs hover-raise hover-nudge"
          >
            <Icon name="flash_on" size={16} />
            <span className="font-semibold">Quick add</span>
          </button>
        </div>

        {/* Search Input Field */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-secondary">
            <Icon name="search" size={20} />
          </div>
          <input
            id="foodSearchInput"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Try dosa, atta, dal or paneer..."
            className="w-full pl-10 pr-10 py-3 bg-page-background text-ink-primary font-body-md text-body-md rounded-xl placeholder:text-ink-secondary/60 focus:outline-none focus:bg-surface-container-lowest transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-secondary hover:text-ink-primary"
            >
              <Icon name="cancel" size={18} />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {(
            [
              { key: 'search', label: 'Search' },
              { key: 'recent', label: 'Recent' },
              { key: 'frequent', label: 'Frequent' },
              { key: 'favorites', label: 'Favorites' },
              { key: 'my_foods', label: 'My foods' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key !== 'search') setSearchQuery('');
              }}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md shrink-0 transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-container text-header-text font-semibold shadow-sm'
                  : 'bg-page-background text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Results Ledger */}
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between px-1">
            <span className="font-label-sm text-label-sm text-ink-secondary">Matching foods</span>
            <span className="font-label-sm text-label-sm text-ink-secondary">{results.length} results</span>
          </div>

          {activeTab === 'my_foods' && (
            <button
              type="button"
              onClick={() => navigate('/foods/recipe')}
              className="w-full p-2.5 rounded-xl border border-dashed border-primary-container text-primary-container bg-surface-container-low hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2 font-label-md text-label-md font-semibold"
            >
              <Icon name="add" size={18} />
              <span>Build new custom dish or recipe</span>
            </button>
          )}

          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
            {results.map((food) => {
              const isSelected = selectedFood?.id === food.id;
              const isMine = 'user_id' in food;

              return (
                <div
                  key={food.id}
                  onClick={() => setSelectedFood(food)}
                  className={`p-3 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-surface-container-high border border-border-subtle'
                      : 'bg-page-background hover:bg-surface-container-high'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-space-xs">
                      <span className="font-title-sm text-title-sm text-ink-primary truncate font-medium">
                        {food.name}
                      </span>
                      {isMine && (
                        <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm text-status-safe bg-surface-container-lowest shrink-0">
                          Mine
                        </span>
                      )}
                    </div>
                    <span className="font-body-sm text-body-sm text-ink-secondary">
                      {Math.round(food.energy_kcal ?? 0)} kcal per {isMine ? 'serving' : '100 g'}
                    </span>
                  </div>
                  <div className="flex items-center gap-space-sm shrink-0">
                    <span className="font-numeral-lg text-numeral-lg text-ink-primary font-semibold">
                      {Math.round(food.energy_kcal ?? 0)}
                    </span>
                    {isMine && (
                      <button
                        type="button"
                        aria-label={`Edit ${food.name} recipe`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/foods/recipe?edit=${food.id}`);
                        }}
                        className="p-1 text-ink-secondary hover:text-ink-primary rounded-full hover:bg-surface-container-highest transition-colors"
                        title="Edit recipe ingredients"
                      >
                        <Icon name="edit" size={18} />
                      </button>
                    )}
                    <Icon
                      name={isSelected ? 'check_circle' : 'add_circle'}
                      size={20}
                      className={isSelected ? 'text-status-safe' : 'text-ink-secondary'}
                      fill={isSelected}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Item Detail & Portion Customization Panel */}
        {selectedFood && (
          <div className="bg-page-background rounded-2xl p-space-md flex flex-col gap-space-md shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-ink-secondary">Configuring portion</span>
                <h3 className="font-title-md text-title-md text-ink-primary font-semibold">{selectedFood.name}</h3>
              </div>
              <button
                type="button"
                aria-label="Favorite item"
                onClick={handleToggleFavorite}
                className="w-9 h-9 rounded-full bg-card-background text-primary-container flex items-center justify-center hover:scale-105 transition-transform"
              >
                <Icon
                  name="star"
                  size={20}
                  fill={favoriteIds.has(selectedFood.id)}
                  className={favoriteIds.has(selectedFood.id) ? 'text-action-primary' : 'text-ink-secondary'}
                />
              </button>
            </div>

            {/* Serving selector & Stepper */}
            <div className="grid grid-cols-1 gap-space-sm">
              <div className="flex flex-col gap-1">
                <label htmlFor="portionUnit" className="font-label-sm text-label-sm text-ink-secondary">
                  Serving measure
                </label>
                <div className="relative">
                  <select
                    id="portionUnit"
                    value={selectedServingId}
                    onChange={(e) => setSelectedServingId(e.target.value)}
                    className="w-full appearance-none bg-card-background text-ink-primary font-body-md text-body-md py-2.5 pl-3.5 pr-10 rounded-xl focus:outline-none"
                  >
                    {'user_id' in selectedFood ? (
                      <option value="serving">
                        1 serving ({selectedFood.serving_label || 'custom'})
                      </option>
                    ) : (
                      <>
                        <option value="grams">Grams (g)</option>
                        {servings.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label} ({s.grams} g)
                          </option>
                        ))}
                        {servings.length === 0 && (
                          <option value="standard">1 standard portion (100 g)</option>
                        )}
                      </>
                    )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-ink-secondary">
                    <Icon name="expand_more" size={20} />
                  </div>
                </div>
              </div>

              {isGrams ? (
                <GramWheelAdjuster grams={servingsCount} onChange={(g) => setServingsCount(g)} />
              ) : (
                <div className="flex flex-col gap-2 bg-card-background rounded-2xl p-space-md border border-border-subtle">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-label-sm text-label-sm text-ink-secondary block">Number of servings</span>
                      <span className="font-body-sm text-body-sm text-ink-primary font-medium">{servingLabel}</span>
                    </div>
                    <div className="flex items-center gap-space-sm bg-surface-container-low px-2 py-1 rounded-xl border border-border-subtle">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setServingsCount(Math.max(0.5, servingsCount - 1))}
                        className="w-8 h-8 rounded-lg bg-card-background text-ink-primary font-title-sm text-title-sm flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Icon name="remove" size={18} />
                      </button>
                      <span className="font-numeral-lg text-numeral-lg text-ink-primary w-10 text-center font-bold">
                        {servingsCount}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => setServingsCount(servingsCount + 1)}
                        className="w-8 h-8 rounded-lg bg-card-background text-ink-primary font-title-sm text-title-sm flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Icon name="add" size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Serving shortcut pills */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-ink-secondary font-medium">Quick:</span>
                    {[0.5, 1, 1.5, 2, 3].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setServingsCount(s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          servingsCount === s
                            ? 'bg-header-panel text-header-text'
                            : 'bg-page-background text-ink-secondary hover:text-ink-primary'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live Preview Stat Row */}
            <div className="bg-card-background rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm">
              <div className="flex justify-between items-baseline">
                <span className="font-label-md text-label-md text-ink-secondary">
                  Calculated for {servingsCount} {isGrams ? 'g' : servingLabel}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-numeral-hero text-numeral-hero text-primary-container font-bold">
                    {totalKcal}
                  </span>
                  <span className="font-title-sm text-title-sm text-ink-secondary">kcal</span>
                </div>
              </div>

              {/* Macronutrient Breakdown Chips */}
              <div className="flex items-center gap-space-xs pt-1">
                <div className="flex-1 bg-surface-container-low rounded-lg p-2 flex flex-col items-center">
                  <span className="font-label-sm text-label-sm text-ink-secondary">Protein</span>
                  <span className="font-title-sm text-title-sm text-status-safe font-semibold">{totalProtein}g</span>
                </div>
                <div className="flex-1 bg-surface-container-low rounded-lg p-2 flex flex-col items-center">
                  <span className="font-label-sm text-label-sm text-ink-secondary">Carbs</span>
                  <span className="font-title-sm text-title-sm text-ink-primary font-semibold">{totalCarbs}g</span>
                </div>
                <div className="flex-1 bg-surface-container-low rounded-lg p-2 flex flex-col items-center">
                  <span className="font-label-sm text-label-sm text-ink-secondary">Fat</span>
                  <span className="font-title-sm text-title-sm text-ink-primary font-semibold">{totalFat}g</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Final Submission Actions */}
        <div className="flex flex-col gap-space-xs pt-1">
          <button
            type="button"
            disabled={!selectedFood || isLogging}
            onClick={handleLog}
            className="w-full py-4 rounded-xl bg-action-primary text-action-text font-title-sm text-title-sm font-semibold flex items-center justify-center gap-space-xs shadow-[0_8px_24px_-4px_rgba(26,38,32,0.12)] active:scale-[0.98] transition-transform hover:brightness-105 disabled:opacity-50"
          >
            <Icon name="check" size={20} />
            <span>{isLogging ? 'Logging...' : `Log to ${meal}`}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/foods/quick?meal=${meal}&date=${dateParam}`)}
            className="w-full py-2.5 rounded-xl font-label-md text-label-md text-ink-secondary hover:text-ink-primary text-center transition-colors"
          >
            Quick add instead
          </button>
        </div>
      </div>
    </div>
  );
}
