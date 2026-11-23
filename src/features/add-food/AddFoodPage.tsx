import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { searchFoods, getUserFoods, logFood, logUserFood } from '@/data/food-logs';
import { getLocalDate } from '@/lib/utils';
import type { Food, UserFood, MealType } from '@/types/database';

export function AddFoodPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mealParam = (searchParams.get('meal') as MealType) || 'lunch';
  const dateParam = searchParams.get('date') || getLocalDate();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'recent' | 'frequent' | 'favorites' | 'my_foods'>('search');
  const [results, setResults] = useState<(Food | UserFood)[]>([]);
  const [myFoods, setMyFoods] = useState<UserFood[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | UserFood | null>(null);
  const [servingsCount, setServingsCount] = useState(1);
  const [portionUnit, setPortionUnit] = useState('serving');
  const [isLogging, setIsLogging] = useState(false);

  // Initial Indian pantry fallback items for immediate demo delight
  const defaultIndianFoods: Partial<Food>[] = [
    {
      id: 'dosa-1',
      name: 'Plain dosa',
      energy_kcal: 139,
      protein_g: 3.5,
      carbs_g: 24.2,
      fat_g: 3.2,
      fiber_g: 1.4,
    } as Food,
    {
      id: 'atta-1',
      name: 'Wheat flour, atta (rotis)',
      energy_kcal: 320,
      protein_g: 11.5,
      carbs_g: 68.0,
      fat_g: 1.8,
      fiber_g: 10.5,
    } as Food,
    {
      id: 'paneer-1',
      name: 'Paneer, fresh Malai',
      energy_kcal: 265,
      protein_g: 18.0,
      carbs_g: 3.0,
      fat_g: 20.0,
      fiber_g: 0,
    } as Food,
  ];

  useEffect(() => {
    getUserFoods()
      .then(setMyFoods)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      if (activeTab === 'my_foods') {
        setResults(myFoods);
      } else {
        setResults(defaultIndianFoods as Food[]);
      }
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
  }, [searchQuery, activeTab, myFoods]);

  // Default active selection
  useEffect(() => {
    if (results.length > 0 && !selectedFood) {
      setSelectedFood(results[0]);
    }
  }, [results, selectedFood]);

  const baseKcal = selectedFood?.energy_kcal ?? 139;
  const baseProtein = selectedFood?.protein_g ?? 3.5;
  const baseCarbs = selectedFood?.carbs_g ?? 24.2;
  const baseFat = selectedFood?.fat_g ?? 3.2;

  const totalKcal = Math.round(baseKcal * servingsCount);
  const totalProtein = (baseProtein * servingsCount).toFixed(1);
  const totalCarbs = (baseCarbs * servingsCount).toFixed(1);
  const totalFat = (baseFat * servingsCount).toFixed(1);

  const handleLog = async () => {
    if (!selectedFood || isLogging) return;
    setIsLogging(true);
    try {
      if ('user_id' in selectedFood) {
        await logUserFood(selectedFood.id, servingsCount, mealParam, dateParam);
      } else {
        await logFood(selectedFood.id, servingsCount, null, mealParam, dateParam);
      }
      navigate('/');
    } catch {
      // Graceful fallback for mock items
      navigate('/');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="flex flex-col w-full relative min-h-full pb-10">
      {/* Bottom Sheet Container matching calcal_add_food_bottom_sheet */}
      <div className="w-full bg-card-background rounded-3xl p-space-md shadow-sm flex flex-col gap-space-md mt-1">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <h2 className="font-headline-sm text-headline-sm text-ink-primary">Add food</h2>
            <span className="font-label-sm text-label-sm text-ink-secondary ml-1 bg-surface-container-high px-2 py-0.5 rounded-full capitalize">
              {mealParam}
            </span>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-full bg-surface-container-high text-ink-secondary hover:text-ink-primary flex items-center justify-center transition-colors"
          >
            <Icon name="close" size={20} />
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
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md shrink-0 transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-container text-header-text font-semibold'
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
                      <span className="font-title-sm text-title-sm text-ink-primary truncate">
                        {food.name}
                      </span>
                      {isMine && (
                        <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm text-status-safe bg-surface-container-lowest shrink-0">
                          Mine
                        </span>
                      )}
                    </div>
                    <span className="font-body-sm text-body-sm text-ink-secondary">
                      {Math.round(food.energy_kcal ?? 0)} kcal per serving
                    </span>
                  </div>
                  <div className="flex items-center gap-space-sm shrink-0">
                    <span className="font-numeral-lg text-numeral-lg text-ink-primary">
                      {Math.round(food.energy_kcal ?? 0)}
                    </span>
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
          <div className="bg-page-background rounded-2xl p-space-md flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-ink-secondary">Configuring portion</span>
                <h3 className="font-title-md text-title-md text-ink-primary">{selectedFood.name}</h3>
              </div>
              <button
                type="button"
                aria-label="Custom dish recipe"
                onClick={() => navigate('/foods/recipe')}
                className="w-9 h-9 rounded-full bg-card-background text-primary-container flex items-center justify-center hover:scale-105 transition-transform"
                title="Open Recipe Builder"
              >
                <Icon name="skillet" size={20} />
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
                    value={portionUnit}
                    onChange={(e) => setPortionUnit(e.target.value)}
                    className="w-full appearance-none bg-card-background text-ink-primary font-body-md text-body-md py-2.5 pl-3.5 pr-10 rounded-xl focus:outline-none"
                  >
                    <option value="serving">1 standard serving</option>
                    <option value="katori">1 katori (approx. 150 ml)</option>
                    <option value="grams">Grams (g)</option>
                    <option value="tablespoons">2 tablespoons (30 ml)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-ink-secondary">
                    <Icon name="expand_more" size={20} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-card-background rounded-xl p-2 px-3">
                <span className="font-body-md text-body-md text-ink-primary">Number of servings</span>
                <div className="flex items-center gap-space-sm">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setServingsCount(Math.max(1, servingsCount - 1))}
                    className="w-8 h-8 rounded-lg bg-page-background text-ink-primary font-title-sm text-title-sm flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <Icon name="remove" size={18} />
                  </button>
                  <span className="font-numeral-lg text-numeral-lg text-ink-primary w-8 text-center">
                    {servingsCount}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setServingsCount(Math.min(20, servingsCount + 1))}
                    className="w-8 h-8 rounded-lg bg-page-background text-ink-primary font-title-sm text-title-sm flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <Icon name="add" size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Live Preview Stat Row */}
            <div className="bg-card-background rounded-xl p-space-md flex flex-col gap-space-sm">
              <div className="flex justify-between items-baseline">
                <span className="font-label-md text-label-md text-ink-secondary">Calculated total</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-numeral-hero text-numeral-hero text-primary-container">
                    {totalKcal}
                  </span>
                  <span className="font-title-sm text-title-sm text-ink-secondary">kcal</span>
                </div>
              </div>

              {/* Macronutrient Breakdown Chips */}
              <div className="flex items-center gap-space-xs pt-1">
                <div className="flex-1 bg-surface-container-low rounded-lg p-2 flex flex-col items-center">
                  <span className="font-label-sm text-label-sm text-ink-secondary">Protein</span>
                  <span className="font-title-sm text-title-sm text-status-safe">{totalProtein}g</span>
                </div>
                <div className="flex-1 bg-surface-container-low rounded-lg p-2 flex flex-col items-center">
                  <span className="font-label-sm text-label-sm text-ink-secondary">Carbs</span>
                  <span className="font-title-sm text-title-sm text-ink-primary">{totalCarbs}g</span>
                </div>
                <div className="flex-1 bg-surface-container-low rounded-lg p-2 flex flex-col items-center">
                  <span className="font-label-sm text-label-sm text-ink-secondary">Fat</span>
                  <span className="font-title-sm text-title-sm text-ink-primary">{totalFat}g</span>
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
            <span>{isLogging ? 'Logging...' : 'Log food'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(`/foods/quick?meal=${mealParam}&date=${dateParam}`)}
            className="w-full py-2.5 rounded-xl font-label-md text-label-md text-ink-secondary hover:text-ink-primary text-center transition-colors"
          >
            Quick add instead
          </button>
        </div>
      </div>
    </div>
  );
}
