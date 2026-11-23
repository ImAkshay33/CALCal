import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { createUserFood, updateUserFood, getUserFoodById, searchFoods } from '@/data/food-logs';
import { calculateRecipeNutrition, type RecipeIngredientItem } from '@/lib/recipe-calculator';

export function RecipeBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [dishName, setDishName] = useState('Home-style Palak Paneer');
  const [servings, setServings] = useState(4);
  const [portionEstimate, setPortionEstimate] = useState('1 bowl (200g)');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

  // Load existing recipe if editing
  useEffect(() => {
    if (!editId) return;
    setIsLoadingRecipe(true);
    getUserFoodById(editId)
      .then((food) => {
        if (food) {
          if (food.name) setDishName(food.name);
          if (food.serving_label) setPortionEstimate(food.serving_label);
          if (food.recipe && typeof food.recipe === 'object') {
            const r = food.recipe as any;
            if (r.pieces) setServings(r.pieces);
            if (Array.isArray(r.ingredients) && r.ingredients.length > 0) {
              setIngredients(r.ingredients);
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingRecipe(false));
  }, [editId]);

  // Modal for adding ingredient
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'search' | 'custom'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [modalGrams, setModalGrams] = useState(100);

  // Custom Ingredient Form State
  const [customName, setCustomName] = useState('');
  const [customGrams, setCustomGrams] = useState(100);
  const [customKcal, setCustomKcal] = useState(150);
  const [customProtein, setCustomProtein] = useState(6);
  const [customCarbs, setCustomCarbs] = useState(18);
  const [customFat, setCustomFat] = useState(5);
  const [customFiber, setCustomFiber] = useState(2);
  const [saveToMyFoods, setSaveToMyFoods] = useState(true);

  const handleAddCustomIngredient = async () => {
    if (!customName.trim()) return;
    const g = Math.max(1, customGrams);
    // Normalize macros per 100g for formula scaling
    const normalizedKcal = Math.round((customKcal / g) * 100);
    const normalizedP = Math.round(((customProtein / g) * 100) * 10) / 10;
    const normalizedC = Math.round(((customCarbs / g) * 100) * 10) / 10;
    const normalizedF = Math.round(((customFat / g) * 100) * 10) / 10;
    const normalizedFib = Math.round(((customFiber / g) * 100) * 10) / 10;

    const newIng: RecipeIngredientItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: customName.trim(),
      grams: g,
      energy_kcal: normalizedKcal,
      protein_g: normalizedP,
      carbs_g: normalizedC,
      fat_g: normalizedF,
      fiber_g: normalizedFib,
      micros: {},
    };

    setIngredients((prev) => [...prev, newIng]);

    // Save as individual user food if checked
    if (saveToMyFoods) {
      try {
        await createUserFood({
          name: customName.trim(),
          serving_label: `${g}g portion`,
          serving_g: g,
          energy_kcal: customKcal,
          protein_g: customProtein,
          carbs_g: customCarbs,
          fat_g: customFat,
          fiber_g: customFiber,
          micros: {},
        });
      } catch {}
    }

    setCustomName('');
    setShowAddModal(false);
  };

  const [ingredients, setIngredients] = useState<RecipeIngredientItem[]>([
    {
      id: 'paneer-1',
      name: 'Paneer, fresh Malai',
      grams: 200,
      energy_kcal: 265,
      protein_g: 18.0,
      carbs_g: 3.0,
      fat_g: 20.0,
      fiber_g: 0,
      micros: { calcium_mg: 480 },
    },
    {
      id: 'palak-1',
      name: 'Spinach / Palak, blanched',
      grams: 300,
      energy_kcal: 23,
      protein_g: 3.0,
      carbs_g: 3.7,
      fat_g: 0.3,
      fiber_g: 2.2,
      micros: { iron_mg: 2.8 },
    },
    {
      id: 'ghee-1',
      name: 'Desi cow ghee (tadka)',
      grams: 18,
      energy_kcal: 900,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 100,
      fiber_g: 0,
      micros: {},
    },
    {
      id: 'gravy-1',
      name: 'Onion-Tomato-Ginger gravy',
      grams: 250,
      energy_kcal: 150,
      protein_g: 3.2,
      carbs_g: 7.6,
      fat_g: 10.0,
      fiber_g: 1.8,
      micros: { vitamin_c_mg: 12 },
    },
  ]);

  // Recalculate using pure function
  const nutrition = calculateRecipeNutrition(ingredients, servings);

  const handleRemoveIngredient = (id: string) => {
    setIngredients(ingredients.filter((i) => i.id !== id));
  };

  const handleAddStaple = (name: string, grams: number, kcal: number, p: number, c: number, f: number) => {
    setIngredients([
      ...ingredients,
      {
        id: `staple_${Date.now()}_${Math.random()}`,
        name,
        grams,
        energy_kcal: kcal,
        protein_g: p,
        carbs_g: c,
        fat_g: f,
        micros: {},
      },
    ]);
  };

  const handleSearchModal = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    const res = await searchFoods(q);
    setSearchResults(res);
  };

  const handleSelectSearchIngredient = (food: any) => {
    setIngredients([
      ...ingredients,
      {
        id: `ing_${Date.now()}`,
        name: food.name,
        grams: modalGrams,
        energy_kcal: food.energy_kcal,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
        fiber_g: food.fiber_g || 0,
        micros: food.micros || {},
      },
    ]);
    setShowAddModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSaveRecipe = async () => {
    const payload = {
      name: dishName.trim() || 'Custom recipe dish',
      serving_label: portionEstimate || '1 serving',
      serving_g: Math.round(nutrition.perServing.serving_grams),
      energy_kcal: nutrition.perServing.energy_kcal,
      protein_g: nutrition.perServing.protein_g,
      carbs_g: nutrition.perServing.carbs_g,
      fat_g: nutrition.perServing.fat_g,
      fiber_g: nutrition.perServing.fiber_g,
      micros: nutrition.perServing.micros,
      recipe: {
        pieces: servings,
        yield_g: nutrition.cookedYieldGrams,
        ingredients: ingredients.map((i) => ({
          food_id: i.id,
          id: i.id,
          name: i.name,
          grams: i.grams,
          energy_kcal: i.energy_kcal,
          protein_g: i.protein_g,
          carbs_g: i.carbs_g,
          fat_g: i.fat_g,
          fiber_g: i.fiber_g,
          micros: i.micros,
        })),
      },
    };

    try {
      if (editId) {
        await updateUserFood(editId, payload);
      } else {
        await createUserFood(payload);
      }
    } catch {}

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      navigate('/foods');
    }, 1500);
  };

  return (
    <div className="flex flex-col w-full pb-14 space-y-space-md">
      {/* Top Navigation & Context Header */}
      <div className="flex flex-col gap-space-xs pt-space-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm -ml-1">
            <button
              type="button"
              aria-label="Go back"
              onClick={() => navigate('/foods')}
              className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-card-background active:scale-95 transition-all shadow-sm"
            >
              <Icon name="arrow_back" size={24} />
            </button>
            <h1 className="font-headline-md text-headline-md text-primary tracking-tight font-semibold">
              {editId ? 'Edit recipe' : 'Recipe builder'}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-label-sm text-label-sm px-3 py-1.5 rounded-full bg-card-background hover:bg-surface-container-high text-ink-primary font-medium transition-colors"
          >
            Done / Today
          </button>
        </div>
        <p className="font-body-sm text-body-sm text-ink-secondary ml-1">
          {isLoadingRecipe
            ? 'Loading recipe data...'
            : editId
            ? 'Adjust ingredients or servings to recalculate per-serving nutrition'
            : 'Calculate macros per serving for your homemade Indian meals'}
        </p>
      </div>

      {/* Real-time Per Serving Ledger Card */}
      <section className="bg-card-background rounded-2xl p-space-md shadow-sm">
        <div className="flex items-center justify-between pb-space-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-safe" />
            <span className="font-label-md text-label-md text-ink-primary font-semibold">Nutrients per serving</span>
          </div>
          <span className="bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-medium">
            1 of {servings} servings
          </span>
        </div>

        <div className="flex items-baseline justify-between mt-space-xs">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-display-hero-mobile text-display-hero-mobile text-primary tracking-tight font-bold">
                {nutrition.perServing.energy_kcal}
              </span>
              <span className="font-title-sm text-title-sm text-ink-secondary">kcal</span>
            </div>
            <p className="font-body-sm text-body-sm text-ink-secondary mt-0.5">Approx. {portionEstimate}</p>
          </div>
          <div className="text-right">
            <span className="font-label-sm text-label-sm text-ink-secondary">Total recipe pot</span>
            <p className="font-numeral-lg text-numeral-lg text-ink-primary leading-tight font-bold">
              {nutrition.totalPot.energy_kcal.toLocaleString()}{' '}
              <span className="font-body-sm text-body-sm text-ink-secondary font-normal">kcal</span>
            </p>
          </div>
        </div>

        {/* Macro Trio Blocks with Dynamic Energy Ratio & Magnitude Colors */}
        {(() => {
          const totalEnergy = Math.max(1, nutrition.perServing.energy_kcal);
          const pPct = Math.min(100, Math.round(((nutrition.perServing.protein_g * 4) / totalEnergy) * 100));
          const cPct = Math.min(100, Math.round(((nutrition.perServing.carbs_g * 4) / totalEnergy) * 100));
          const fPct = Math.min(100, Math.round(((nutrition.perServing.fat_g * 9) / totalEnergy) * 100));

          return (
            <div className="grid grid-cols-4 gap-2 mt-space-md pt-space-md bg-page-background/50 rounded-xl p-space-sm">
              <div className="flex flex-col items-center justify-center p-space-xs rounded-lg bg-card-background">
                <div className="flex items-center gap-1">
                  <span className="font-label-sm text-[11px] text-ink-secondary">Protein</span>
                  <span className="text-[10px] text-status-safe font-bold">{pPct}%</span>
                </div>
                <span className="font-headline-sm text-headline-sm text-primary mt-0.5 font-bold">
                  {nutrition.perServing.protein_g}g
                </span>
                <div className="w-full bg-border-subtle h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-status-safe h-full rounded-full transition-all duration-300" style={{ width: `${pPct}%` }} />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-space-xs rounded-lg bg-card-background">
                <div className="flex items-center gap-1">
                  <span className="font-label-sm text-[11px] text-ink-secondary">Carbs</span>
                  <span className={`text-[10px] font-bold ${cPct > 65 ? 'text-amber-500' : 'text-ink-secondary'}`}>{cPct}%</span>
                </div>
                <span className="font-headline-sm text-headline-sm text-primary mt-0.5 font-bold">
                  {nutrition.perServing.carbs_g}g
                </span>
                <div className="w-full bg-border-subtle h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${cPct > 65 ? 'bg-amber-500' : 'bg-primary-container'}`}
                    style={{ width: `${cPct}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-space-xs rounded-lg bg-card-background">
                <div className="flex items-center gap-1">
                  <span className="font-label-sm text-[11px] text-ink-secondary">Fat</span>
                  <span className={`text-[10px] font-bold ${fPct > 45 ? 'text-status-danger' : fPct > 35 ? 'text-amber-500' : 'text-status-safe'}`}>
                    {fPct}%
                  </span>
                </div>
                <span className="font-headline-sm text-headline-sm text-primary mt-0.5 font-bold">
                  {nutrition.perServing.fat_g}g
                </span>
                <div className="w-full bg-border-subtle h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      fPct > 45 ? 'bg-status-danger' : fPct > 35 ? 'bg-amber-500' : 'bg-status-safe'
                    }`}
                    style={{ width: `${fPct}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-space-xs rounded-lg bg-card-background">
                <div className="flex items-center gap-1">
                  <span className="font-label-sm text-[11px] text-ink-secondary">Fiber</span>
                </div>
                <span className="font-headline-sm text-headline-sm text-primary mt-0.5 font-bold">
                  {nutrition.perServing.fiber_g}g
                </span>
                <div className="w-full bg-border-subtle h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-[#86a490] h-full rounded-full transition-all duration-300" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Micronutrient Pills */}
        <div className="flex items-center gap-space-xs flex-wrap mt-space-md">
          <span className="font-label-sm text-label-sm text-ink-secondary flex items-center gap-1 mr-1">
            Measured micros:
          </span>
          {Object.entries(nutrition.perServing.micros).map(([k, val]) => (
            <span
              key={k}
              className="inline-flex items-center bg-page-background px-2.5 py-1 rounded-full text-ink-primary font-label-sm text-label-sm"
            >
              <Icon name="eco" size={14} className="text-status-safe mr-1" />
              {k.replace(/_/g, ' ')}: {val}
            </span>
          ))}
          {Object.keys(nutrition.perServing.micros).length === 0 && (
            <span className="text-xs text-ink-secondary">Calculated from ingredients</span>
          )}
        </div>
      </section>

      {/* Dish Specifications Form */}
      <section className="flex flex-col gap-space-md">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="recipe-title" className="font-label-md text-label-md text-ink-primary font-medium">
            Dish name
          </label>
          <div className="relative w-full">
            <input
              id="recipe-title"
              type="text"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder="e.g. Grandma's Dal Tadka, Matar Makhana..."
              className="w-full bg-card-background text-ink-primary font-body-md text-body-md rounded-xl px-space-md py-3 placeholder:text-ink-secondary/60 focus:outline-none focus:bg-surface-container-lowest transition-all"
            />
            <span className="text-ink-secondary/60 absolute right-3.5 top-3 pointer-events-none">
              <Icon name="edit" size={20} />
            </span>
          </div>
        </div>

        {/* Yield & Servings Controls */}
        <div className="grid grid-cols-2 gap-space-sm">
          <div className="bg-card-background rounded-xl p-space-md flex flex-col justify-between">
            <span className="font-label-sm text-label-sm text-ink-secondary">Total servings</span>
            <div className="flex items-center justify-between mt-2">
              <button
                type="button"
                aria-label="Decrease servings"
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="w-8 h-8 rounded-lg bg-page-background text-ink-primary flex items-center justify-center active:scale-95 transition-all"
              >
                <Icon name="remove" size={18} />
              </button>
              <span className="font-headline-sm text-headline-sm text-primary font-bold">{servings}</span>
              <button
                type="button"
                aria-label="Increase servings"
                onClick={() => setServings(Math.min(20, servings + 1))}
                className="w-8 h-8 rounded-lg bg-page-background text-ink-primary flex items-center justify-center active:scale-95 transition-all"
              >
                <Icon name="add" size={18} />
              </button>
            </div>
          </div>

          <div className="bg-card-background rounded-xl p-space-md flex flex-col justify-between">
            <label htmlFor="portion-size" className="font-label-sm text-label-sm text-ink-secondary">
              Portion estimate
            </label>
            <div className="mt-2">
              <input
                id="portion-size"
                type="text"
                value={portionEstimate}
                onChange={(e) => setPortionEstimate(e.target.value)}
                className="w-full bg-page-background text-ink-primary font-label-md text-label-md rounded-lg px-2 py-1 text-center focus:outline-none focus:bg-surface-container-lowest"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Ingredients List */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="font-title-sm text-title-sm text-ink-primary font-semibold">Ingredients list</h2>
            <span className="font-label-sm text-label-sm text-ink-secondary">
              ({ingredients.length} staples added)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="font-label-sm text-label-sm text-action-primary font-semibold flex items-center gap-1 hover:underline"
          >
            <Icon name="add_circle" size={16} />
            <span>Add ingredient</span>
          </button>
        </div>

        <div className="flex flex-col gap-space-sm mt-1">
          {ingredients.map((ing) => {
            const ingFactor = ing.grams / 100;
            const ingKcal = Math.round((ing.energy_kcal ?? 0) * ingFactor);
            const ingP = Math.round((ing.protein_g ?? 0) * ingFactor * 10) / 10;

            return (
              <div
                key={ing.id}
                className="bg-card-background rounded-xl p-space-md flex items-center justify-between transition-all"
              >
                <div className="flex items-start gap-space-sm min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-lg bg-page-background flex items-center justify-center shrink-0 text-primary-container">
                    <Icon name="grocery" size={20} />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="font-title-sm text-title-sm text-ink-primary font-medium truncate">
                      {ing.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-body-sm text-body-sm text-ink-secondary">{ing.grams} g</span>
                      <span className="w-1 h-1 rounded-full bg-ink-secondary/40" />
                      <span className="font-label-sm text-label-sm text-status-safe font-medium">
                        {ingP}g P
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-space-sm shrink-0">
                  <span className="font-numeral-lg text-numeral-lg text-ink-primary font-bold">
                    {ingKcal}
                    <span className="font-body-sm text-body-sm text-ink-secondary font-normal ml-0.5">kcal</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${ing.name}`}
                    onClick={() => handleRemoveIngredient(ing.id)}
                    className="text-ink-secondary/60 hover:text-status-danger p-1 rounded-md transition-colors"
                  >
                    <Icon name="close" size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Staples Suggestions */}
      <section className="flex flex-col gap-space-xs">
        <span className="font-label-sm text-label-sm text-ink-secondary">Quick add common Indian bases:</span>
        <div className="flex items-center gap-space-xs overflow-x-auto pb-1 scrollbar-none">
          {[
            { name: 'Cashew paste', grams: 30, kcal: 300, p: 6, c: 12, f: 24 },
            { name: 'Kasuri Methi', grams: 5, kcal: 240, p: 20, c: 40, f: 0 },
            { name: 'Garam Masala', grams: 5, kcal: 160, p: 0, c: 20, f: 0 },
            { name: 'Fresh Cream', grams: 40, kcal: 300, p: 2.5, c: 2.5, f: 30 },
          ].map((staple) => (
            <button
              key={staple.name}
              type="button"
              onClick={() =>
                handleAddStaple(staple.name, staple.grams, staple.kcal, staple.p, staple.c, staple.f)
              }
              className="shrink-0 bg-card-background hover:bg-surface-container-highest px-3 py-1.5 rounded-full font-label-sm text-label-sm text-ink-primary flex items-center gap-1.5 transition-colors"
            >
              <Icon name="add" size={14} className="text-status-safe" />
              <span>
                {staple.name} ({staple.grams}g)
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Modal for Searching & Adding Ingredient (Database or Custom) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-ink-primary/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-card-background w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-space-md flex flex-col gap-space-sm shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="font-title-sm text-title-sm text-ink-primary font-semibold">Add recipe ingredient</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-ink-secondary hover:text-ink-primary p-1"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 bg-page-background p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAddModalTab('search')}
                className={`flex-1 py-1.5 text-center rounded-lg font-label-sm text-xs font-semibold transition-all ${
                  addModalTab === 'search'
                    ? 'bg-header-panel text-header-text shadow-xs'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                Search database
              </button>
              <button
                type="button"
                onClick={() => setAddModalTab('custom')}
                className={`flex-1 py-1.5 text-center rounded-lg font-label-sm text-xs font-semibold transition-all ${
                  addModalTab === 'custom'
                    ? 'bg-header-panel text-header-text shadow-xs'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                + Custom ingredient
              </button>
            </div>

            {addModalTab === 'search' ? (
              <>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchModal(e.target.value)}
                      placeholder="Search food e.g. chana, dal, potato..."
                      className="w-full bg-page-background text-ink-primary text-sm rounded-xl px-3 py-2.5 outline-none"
                    />
                  </div>
                  <div className="w-24 flex items-center bg-page-background rounded-xl px-2 py-1">
                    <input
                      type="number"
                      value={modalGrams}
                      onChange={(e) => setModalGrams(Math.max(1, parseInt(e.target.value) || 100))}
                      className="w-12 bg-transparent text-sm text-center outline-none font-semibold"
                    />
                    <span className="text-xs text-ink-secondary">g</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-60 mt-1">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSearchIngredient(item)}
                      className="p-2.5 bg-page-background rounded-xl flex items-center justify-between hover:bg-surface-container-high cursor-pointer transition-colors row-hover"
                    >
                      <div>
                        <p className="font-title-sm text-sm text-ink-primary font-medium">{item.name}</p>
                        <p className="text-xs text-ink-secondary">{item.energy_kcal} kcal / 100g</p>
                      </div>
                      <Icon name="add_circle" size={20} className="text-action-primary" />
                    </div>
                  ))}
                  {searchQuery && searchResults.length === 0 && (
                    <p className="text-xs text-center text-ink-secondary py-4">No matching food found.</p>
                  )}
                </div>
              </>
            ) : (
              /* Custom Ingredient Creation Form */
              <div className="flex flex-col gap-3 py-1">
                <div>
                  <label className="text-xs text-ink-secondary font-medium block mb-1">Ingredient name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Grandma's spice blend, Homemade paneer, Chai masala..."
                    className="w-full bg-page-background text-ink-primary text-sm rounded-xl px-3 py-2 outline-none border border-border-subtle"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-ink-secondary font-medium block mb-1">Grams in recipe</label>
                    <div className="flex items-center bg-page-background rounded-xl px-3 py-1.5 border border-border-subtle">
                      <input
                        type="number"
                        min="1"
                        value={customGrams}
                        onChange={(e) => setCustomGrams(Math.max(1, parseInt(e.target.value) || 100))}
                        className="w-full bg-transparent text-sm font-semibold outline-none"
                      />
                      <span className="text-xs text-ink-secondary">g</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-ink-secondary font-medium block mb-1">Calories ({customGrams}g)</label>
                    <div className="flex items-center bg-page-background rounded-xl px-3 py-1.5 border border-border-subtle">
                      <input
                        type="number"
                        min="0"
                        value={customKcal}
                        onChange={(e) => setCustomKcal(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-transparent text-sm font-semibold outline-none"
                      />
                      <span className="text-xs text-ink-secondary">kcal</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-ink-secondary block">Macros for this {customGrams}g portion:</span>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div>
                      <span className="text-[10px] text-ink-secondary block">Protein</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={customProtein}
                        onChange={(e) => setCustomProtein(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full text-center bg-card-background border border-border-subtle rounded-lg text-xs font-bold py-1 outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-secondary block">Carbs</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={customCarbs}
                        onChange={(e) => setCustomCarbs(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full text-center bg-card-background border border-border-subtle rounded-lg text-xs font-bold py-1 outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-secondary block">Fat</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={customFat}
                        onChange={(e) => setCustomFat(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full text-center bg-card-background border border-border-subtle rounded-lg text-xs font-bold py-1 outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-secondary block">Fiber</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={customFiber}
                        onChange={(e) => setCustomFiber(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full text-center bg-card-background border border-border-subtle rounded-lg text-xs font-bold py-1 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-secondary select-none pt-1">
                  <input
                    type="checkbox"
                    checked={saveToMyFoods}
                    onChange={(e) => setSaveToMyFoods(e.target.checked)}
                    className="rounded accent-header-panel"
                  />
                  <span>Save to My Foods (accessible for other recipes)</span>
                </label>

                <button
                  type="button"
                  disabled={!customName.trim()}
                  onClick={handleAddCustomIngredient}
                  className="w-full py-2.5 rounded-xl bg-action-primary text-action-text font-label-md font-semibold hover:opacity-95 disabled:opacity-50 transition-all shadow-sm active:scale-98"
                >
                  Add custom ingredient to recipe
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sticky Save Recipe Button */}
      <div className="sticky bottom-4 z-40 w-full pt-2">
        <button
          type="button"
          onClick={handleSaveRecipe}
          className={`w-full py-4 rounded-xl font-title-sm text-title-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_-4px_rgba(26,38,32,0.18)] active:scale-[0.98] transition-all text-action-text ${
            isSaved ? 'bg-status-safe' : 'bg-action-primary hover:opacity-95'
          }`}
        >
          <Icon name={isSaved ? 'check' : 'bookmark_added'} size={22} />
          <span>{isSaved ? 'Saved to your food ledger!' : 'Save recipe to Foods'}</span>
        </button>
      </div>
    </div>
  );
}
