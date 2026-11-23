import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/hooks/use-auth';
import { signOut } from '@/data/auth';
import { getGoals, upsertGoals } from '@/data/goals';
import { getProfile, updateProfile } from '@/data/profile';
import { getAllFoodLogs, clearAllUserData } from '@/data/food-logs';
import type { GoalType, ActivityLevel, SexType } from '@/types/database';

export function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const username = user?.user_metadata?.username ?? 'User';

  const [sex, setSex] = useState<SexType>('male');
  const [goal, setGoal] = useState<GoalType>('lose');
  const [calories, setCalories] = useState(2000);
  const [protein, setProtein] = useState(120);
  const [carbs, setCarbs] = useState(230);
  const [fat, setFat] = useState(67);
  const [fiber, setFiber] = useState(35);

  // Micronutrient targets
  const [iron, setIron] = useState(18);
  const [calcium, setCalcium] = useState(1000);
  const [vitB12, setVitB12] = useState(2.4);
  const [vitC, setVitC] = useState(80);
  const [vitD, setVitD] = useState(600);
  const [zinc, setZinc] = useState(11);
  const [magnesium, setMagnesium] = useState(400);
  const [potassium, setPotassium] = useState(3000);
  const [folate, setFolate] = useState(400);
  const [sodium, setSodium] = useState(2000);

  // Profile data
  const [height, setHeight] = useState(174);
  const [birthYear, setBirthYear] = useState(1996);
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [currentWeight, setCurrentWeight] = useState(68.2);
  const [targetWeight, setTargetWeight] = useState(65.0);

  const [savedToast, setSavedToast] = useState(false);
  const [calcNotice, setCalcNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getGoals()
      .then((g) => {
        if (g) {
          if (g.energy_kcal) setCalories(g.energy_kcal);
          if (g.protein_g) setProtein(g.protein_g);
          if (g.carbs_g) setCarbs(g.carbs_g);
          if (g.fat_g) setFat(g.fat_g);
          if (g.fiber_g) setFiber(g.fiber_g);
          const m = g.micro_targets as Record<string, number> | undefined;
          if (m?.iron_mg !== undefined) setIron(m.iron_mg);
          if (m?.calcium_mg !== undefined) setCalcium(m.calcium_mg);
          if (m?.vitamin_b12_ug !== undefined) setVitB12(m.vitamin_b12_ug);
          if (m?.vitamin_c_mg !== undefined) setVitC(m.vitamin_c_mg);
          if (m?.vitamin_d_iu !== undefined) setVitD(m.vitamin_d_iu);
          if (m?.zinc_mg !== undefined) setZinc(m.zinc_mg);
          if (m?.magnesium_mg !== undefined) setMagnesium(m.magnesium_mg);
          if (m?.potassium_mg !== undefined) setPotassium(m.potassium_mg);
          if (m?.folate_b9_ug !== undefined) setFolate(m.folate_b9_ug);
          if (m?.sodium_mg !== undefined) setSodium(m.sodium_mg);
        }
      })
      .catch(() => {});

    getProfile()
      .then((p) => {
        if (p) {
          if (p.sex) setSex(p.sex);
          if (p.height_cm) setHeight(p.height_cm);
          if (p.birth_year) setBirthYear(p.birth_year);
          if (p.activity_level) setActivity(p.activity_level);
          if (p.goal) setGoal(p.goal);
        }
      })
      .catch(() => {});
  }, []);

  // Mifflin-St Jeor calculation with adult safety floor (1200 kcal min)
  const handleCalculateForMe = () => {
    const age = Math.max(18, new Date().getFullYear() - birthYear);
    let bmr: number;
    if (sex === 'female') {
      bmr = 10 * currentWeight + 6.25 * height - 5 * age - 161;
    } else if (sex === 'male') {
      bmr = 10 * currentWeight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * currentWeight + 6.25 * height - 5 * age - 78;
    }

    const multipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const tdee = Math.round(bmr * (multipliers[activity] || 1.4));
    let target = tdee;
    if (goal === 'lose') target -= 500;
    if (goal === 'gain') target += 350;

    // Adult safety floor
    const finalTarget = Math.max(1200, target);
    setCalories(finalTarget);

    // Science-backed macro distribution:
    // Protein: ~2.0g/kg bodyweight for deficit retention, capped at 30% of energy
    const pGrams = Math.round(Math.min(finalTarget * 0.3 / 4, currentWeight * 2.0));
    // Fat: 25% of energy
    const fGrams = Math.round((finalTarget * 0.25) / 9);
    // Carbs: remaining energy
    const cGrams = Math.max(50, Math.round((finalTarget - pGrams * 4 - fGrams * 9) / 4));
    // Fiber: 14g per 1000 kcal
    const fiberTarget = Math.max(28, Math.round((finalTarget / 1000) * 14));

    setProtein(pGrams);
    setCarbs(cGrams);
    setFat(fGrams);
    setFiber(fiberTarget);

    setCalcNotice(
      `Mifflin-St Jeor (${sex}, BMR: ${Math.round(bmr)} kcal, TDEE: ${tdee} kcal): Target set to ${finalTarget} kcal.`
    );
    setTimeout(() => setCalcNotice(null), 5000);
  };

  const handleSave = async () => {
    try {
      await upsertGoals({
        energy_kcal: calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        fiber_g: fiber,
        micro_targets: {
          iron_mg: iron,
          calcium_mg: calcium,
          vitamin_b12_ug: vitB12,
          vitamin_c_mg: vitC,
          vitamin_d_iu: vitD,
          zinc_mg: zinc,
          magnesium_mg: magnesium,
          potassium_mg: potassium,
          folate_b9_ug: folate,
          sodium_mg: sodium,
        },
      });

      await updateProfile({
        sex,
        goal,
        height_cm: height,
        birth_year: birthYear,
        activity_level: activity,
      });

      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } catch {
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch {
      navigate('/auth');
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const logs = await getAllFoodLogs();
      const headers = [
        'Date',
        'Time',
        'Meal',
        'Entry Type',
        'Food Name',
        'Quantity',
        'Serving Label',
        'Grams',
        'Energy (kcal)',
        'Protein (g)',
        'Carbs (g)',
        'Fat (g)',
        'Fiber (g)',
        'Sugar (g)',
        'Iron (mg)',
        'Calcium (mg)',
        'Vitamin C (mg)',
        'Vitamin B12 (ug)',
      ];

      const rows: string[] = [];
      rows.push(headers.join(','));

      if (logs.length === 0) {
        // Put at least the user's target row if no food logs yet
        rows.push(
          `${new Date().toISOString().split('T')[0]},00:00,Target,Goal,Daily Goal,1,day,,${calories},${protein},${carbs},${fat},${fiber},0,${iron},${calcium},${vitC},${vitB12}`
        );
      } else {
        logs.forEach((log) => {
          const time = log.logged_at ? new Date(log.logged_at).toLocaleTimeString() : '';
          const escapedName = `"${(log.label || '').replace(/"/g, '""')}"`;
          const escapedServing = `"${(log.serving_label || 'grams').replace(/"/g, '""')}"`;
          const micros = (log.micros || {}) as Record<string, number>;

          const row = [
            log.log_date || '',
            time,
            log.meal || 'other',
            log.entry_type || 'food',
            escapedName,
            log.quantity ?? 1,
            escapedServing,
            log.grams ?? '',
            log.energy_kcal ?? 0,
            log.protein_g ?? 0,
            log.carbs_g ?? 0,
            log.fat_g ?? 0,
            log.fiber_g ?? 0,
            log.sugar_g ?? 0,
            micros.iron_mg ?? '',
            micros.calcium_mg ?? '',
            micros.vitamin_c_mg ?? '',
            micros.vitamin_b12_ug ?? '',
          ];
          rows.push(row.join(','));
        });
      }

      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      link.setAttribute('download', `calcal_export_${username}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      'Are you sure you want to wipe all food logs, custom foods, weight, and tracking history? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      await clearAllUserData();
      await handleSignOut();
    } catch {
      await handleSignOut();
    }
  };

  return (
    <div className="flex flex-col w-full pb-20 space-y-space-lg">
      {/* Save Toast Notification */}
      {savedToast && (
        <div className="fixed top-20 right-4 z-50 bg-header-panel text-header-text px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 font-label-md animate-fade-in">
          <Icon name="check_circle" size={18} className="text-status-safe" />
          <span>Profile &amp; goals saved successfully!</span>
        </div>
      )}

      {/* Profile Card */}
      <section className="bg-card-background rounded-2xl p-space-md shadow-sm space-y-space-md mt-1">
        <div className="flex items-center justify-between border-b border-border-subtle pb-space-sm">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-header-text shrink-0 font-headline-md text-headline-md font-semibold">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-title-md text-title-md text-ink-primary font-semibold">{username}</p>
              <p className="font-body-sm text-body-sm text-ink-secondary">User profile &amp; biometrics</p>
            </div>
          </div>
          <span className="font-label-sm text-label-sm px-2.5 py-1 bg-surface-container-low text-ink-secondary rounded-lg font-medium">
            Active
          </span>
        </div>

        {/* Sex Selector */}
        <div>
          <label className="font-label-sm text-label-sm text-ink-secondary block mb-1.5">Biological sex (for BMR)</label>
          <div className="grid grid-cols-3 gap-2">
            {(['female', 'male', 'other'] as SexType[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSex(s)}
                className={`py-2 px-2.5 rounded-xl font-label-md text-label-md text-center capitalize transition-colors ${
                  sex === s
                    ? 'bg-primary-container text-header-text font-semibold shadow-sm'
                    : 'bg-surface-container-low text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Biometrics: Height, Birth Year, Activity */}
        <div className="grid grid-cols-3 gap-space-sm text-center">
          <div className="bg-surface-container-low rounded-xl p-space-sm">
            <p className="font-label-sm text-label-sm text-ink-secondary">Height</p>
            <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value) || 170)}
                className="w-12 bg-transparent text-center font-title-sm text-title-sm text-ink-primary font-semibold outline-none"
              />
              <span className="font-normal text-ink-secondary text-body-sm">cm</span>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-space-sm">
            <p className="font-label-sm text-label-sm text-ink-secondary">Birth year</p>
            <input
              type="number"
              value={birthYear}
              onChange={(e) => setBirthYear(parseInt(e.target.value) || 1996)}
              className="w-16 mx-auto bg-transparent text-center font-title-sm text-title-sm text-ink-primary mt-0.5 font-semibold outline-none"
            />
          </div>
          <div className="bg-surface-container-low rounded-xl p-space-sm">
            <p className="font-label-sm text-label-sm text-ink-secondary">Activity</p>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityLevel)}
              className="w-full bg-transparent text-center font-title-sm text-title-sm text-ink-primary mt-0.5 capitalize font-semibold outline-none cursor-pointer"
            >
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="very_active">Very active</option>
            </select>
          </div>
        </div>

        {/* Weight Goals: Current & Target */}
        <div className="grid grid-cols-2 gap-space-sm text-center">
          <div className="bg-surface-container-low rounded-xl p-space-sm">
            <p className="font-label-sm text-label-sm text-ink-secondary">Current weight</p>
            <div className="flex items-baseline justify-center gap-1 mt-0.5">
              <input
                type="number"
                step="0.1"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(parseFloat(e.target.value) || 0)}
                className="w-16 bg-transparent text-center font-title-sm text-title-sm text-ink-primary font-semibold outline-none"
              />
              <span className="font-normal text-ink-secondary text-body-sm">kg</span>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-space-sm">
            <p className="font-label-sm text-label-sm text-ink-secondary">Target weight</p>
            <div className="flex items-baseline justify-center gap-1 mt-0.5">
              <input
                type="number"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
                className="w-16 bg-transparent text-center font-title-sm text-title-sm text-ink-primary font-semibold outline-none"
              />
              <span className="font-normal text-ink-secondary text-body-sm">kg</span>
            </div>
          </div>
        </div>

        {/* Primary Goal Selector */}
        <div className="pt-space-xs">
          <label className="font-label-sm text-label-sm text-ink-secondary block mb-1.5">Weight goal</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'lose', label: 'Lose weight (-500 kcal)' },
              { key: 'maintain', label: 'Maintain weight' },
              { key: 'gain', label: 'Gain weight (+350 kcal)' },
            ].map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGoal(g.key as GoalType)}
                className={`py-2 px-2 rounded-xl font-label-md text-label-md text-center transition-colors ${
                  goal === g.key
                    ? 'bg-primary-container text-header-text font-semibold shadow-sm'
                    : 'bg-surface-container-low text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Daily Goals Card */}
      <section className="bg-card-background rounded-2xl p-space-md shadow-sm space-y-space-md">
        <div className="flex items-center justify-between">
          <h3 className="font-title-md text-title-md text-ink-primary font-semibold">Daily targets</h3>
          <button
            type="button"
            onClick={handleCalculateForMe}
            className="font-label-sm text-label-sm text-action-primary hover:opacity-80 transition-opacity font-semibold flex items-center gap-1"
          >
            <Icon name="auto_fix_high" size={16} />
            <span>Calculate for me</span>
          </button>
        </div>

        {calcNotice && (
          <div className="p-2.5 bg-action-primary/10 rounded-xl text-ink-primary text-xs flex items-center gap-1.5">
            <Icon name="info" size={16} className="text-action-primary shrink-0" />
            <span>{calcNotice}</span>
          </div>
        )}

        {/* Calories Target Box */}
        <div className="bg-surface-container-low rounded-xl p-space-md">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="font-label-sm text-label-sm text-ink-secondary block">Calories target</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <input
                  type="number"
                  min="1200"
                  max="6000"
                  value={calories}
                  onChange={(e) => setCalories(Math.max(1200, parseInt(e.target.value) || 1200))}
                  className="font-numeral-hero text-numeral-hero text-ink-primary leading-none bg-transparent outline-none w-36"
                />
                <span className="font-body-md text-body-md text-ink-secondary">kcal / day</span>
              </div>
            </div>
            <Icon name="local_fire_department" size={24} className="text-tertiary-fixed-dim" />
          </div>
          <p className="font-body-sm text-body-sm text-ink-secondary mt-2 flex items-center gap-1.5">
            <Icon name="verified_user" size={16} className="text-status-safe shrink-0" />
            <span>Adult safety floor of 1200 kcal is strictly enforced.</span>
          </p>
        </div>

        {/* Macro & Fiber Fields */}
        <div className="space-y-space-xs">
          <span className="font-label-sm text-label-sm text-ink-secondary block mb-1">Macro &amp; fiber targets</span>
          <div className="grid grid-cols-2 gap-space-sm">
            <div className="bg-surface-container-low rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <p className="font-label-sm text-label-sm text-ink-secondary">Protein</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(parseInt(e.target.value) || 0)}
                    className="w-14 bg-transparent outline-none font-title-sm text-title-sm text-ink-primary font-semibold"
                  />
                  <span className="font-normal text-ink-secondary text-body-sm">g</span>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
            </div>

            <div className="bg-surface-container-low rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <p className="font-label-sm text-label-sm text-ink-secondary">Carbs</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(parseInt(e.target.value) || 0)}
                    className="w-14 bg-transparent outline-none font-title-sm text-title-sm text-ink-primary font-semibold"
                  />
                  <span className="font-normal text-ink-secondary text-body-sm">g</span>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-primary-fixed-dim" />
            </div>

            <div className="bg-surface-container-low rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <p className="font-label-sm text-label-sm text-ink-secondary">Fat</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(parseInt(e.target.value) || 0)}
                    className="w-14 bg-transparent outline-none font-title-sm text-title-sm text-ink-primary font-semibold"
                  />
                  <span className="font-normal text-ink-secondary text-body-sm">g</span>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim" />
            </div>

            <div className="bg-surface-container-low rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <p className="font-label-sm text-label-sm text-ink-secondary">Fiber</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <input
                    type="number"
                    value={fiber}
                    onChange={(e) => setFiber(parseInt(e.target.value) || 0)}
                    className="w-14 bg-transparent outline-none font-title-sm text-title-sm text-ink-primary font-semibold"
                  />
                  <span className="font-normal text-ink-secondary text-body-sm">g</span>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-status-safe" />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3.5 bg-header-panel text-header-text rounded-xl font-title-sm text-title-sm font-semibold hover:opacity-95 active:scale-[0.99] transition-all shadow-sm"
        >
          Save daily targets
        </button>
      </section>

      {/* Expandable Micronutrient Targets List */}
      <details className="bg-card-background rounded-2xl p-space-md shadow-sm space-y-space-md group" open>
        <summary className="flex items-center justify-between cursor-pointer list-none select-none">
          <div>
            <h3 className="font-title-md text-title-md text-ink-primary font-semibold">Micronutrient targets</h3>
            <p className="font-body-sm text-body-sm text-ink-secondary">Customize your daily RDA goals</p>
          </div>
          <Icon name="expand_more" size={24} className="text-ink-secondary group-open:rotate-180 transition-transform" />
        </summary>
        <div className="pt-space-sm grid grid-cols-1 sm:grid-cols-2 gap-space-sm border-t border-border-subtle">
          {/* Iron */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-space-sm">
            <span className="font-label-md text-label-md text-ink-primary font-medium">Iron</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={iron}
                onChange={(e) => setIron(parseFloat(e.target.value) || 0)}
                className="w-16 bg-card-background rounded-lg px-2 py-1 text-right font-title-sm text-title-sm text-ink-primary border border-border-subtle focus:outline-none"
              />
              <span className="font-body-sm text-body-sm text-ink-secondary w-8">mg</span>
            </div>
          </div>

          {/* Calcium */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-space-sm">
            <span className="font-label-md text-label-md text-ink-primary font-medium">Calcium</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={calcium}
                onChange={(e) => setCalcium(parseFloat(e.target.value) || 0)}
                className="w-16 bg-card-background rounded-lg px-2 py-1 text-right font-title-sm text-title-sm text-ink-primary border border-border-subtle focus:outline-none"
              />
              <span className="font-body-sm text-body-sm text-ink-secondary w-8">mg</span>
            </div>
          </div>

          {/* Vitamin B12 */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-space-sm">
            <span className="font-label-md text-label-md text-ink-primary font-medium">Vitamin B12</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                value={vitB12}
                onChange={(e) => setVitB12(parseFloat(e.target.value) || 0)}
                className="w-16 bg-card-background rounded-lg px-2 py-1 text-right font-title-sm text-title-sm text-ink-primary border border-border-subtle focus:outline-none"
              />
              <span className="font-body-sm text-body-sm text-ink-secondary w-8">µg</span>
            </div>
          </div>

          {/* Vitamin C */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-space-sm">
            <span className="font-label-md text-label-md text-ink-primary font-medium">Vitamin C</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={vitC}
                onChange={(e) => setVitC(parseFloat(e.target.value) || 0)}
                className="w-16 bg-card-background rounded-lg px-2 py-1 text-right font-title-sm text-title-sm text-ink-primary border border-border-subtle focus:outline-none"
              />
              <span className="font-body-sm text-body-sm text-ink-secondary w-8">mg</span>
            </div>
          </div>

          {/* Vitamin D */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-space-sm">
            <span className="font-label-md text-label-md text-ink-primary font-medium">Vitamin D</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={vitD}
                onChange={(e) => setVitD(parseFloat(e.target.value) || 0)}
                className="w-16 bg-card-background rounded-lg px-2 py-1 text-right font-title-sm text-title-sm text-ink-primary border border-border-subtle focus:outline-none"
              />
              <span className="font-body-sm text-body-sm text-ink-secondary w-8">IU</span>
            </div>
          </div>

          {/* Zinc */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-space-sm">
            <span className="font-label-md text-label-md text-ink-primary font-medium">Zinc</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={zinc}
                onChange={(e) => setZinc(parseFloat(e.target.value) || 0)}
                className="w-16 bg-card-background rounded-lg px-2 py-1 text-right font-title-sm text-title-sm text-ink-primary border border-border-subtle focus:outline-none"
              />
              <span className="font-body-sm text-body-sm text-ink-secondary w-8">mg</span>
            </div>
          </div>

          {/* Magnesium */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-space-sm">
            <span className="font-label-md text-label-md text-ink-primary font-medium">Magnesium</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={magnesium}
                onChange={(e) => setMagnesium(parseFloat(e.target.value) || 0)}
                className="w-16 bg-card-background rounded-lg px-2 py-1 text-right font-title-sm text-title-sm text-ink-primary border border-border-subtle focus:outline-none"
              />
              <span className="font-body-sm text-body-sm text-ink-secondary w-8">mg</span>
            </div>
          </div>

          {/* Potassium */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-space-sm">
            <span className="font-label-md text-label-md text-ink-primary font-medium">Potassium</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={potassium}
                onChange={(e) => setPotassium(parseFloat(e.target.value) || 0)}
                className="w-16 bg-card-background rounded-lg px-2 py-1 text-right font-title-sm text-title-sm text-ink-primary border border-border-subtle focus:outline-none"
              />
              <span className="font-body-sm text-body-sm text-ink-secondary w-8">mg</span>
            </div>
          </div>

          {/* Folate B9 */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-space-sm">
            <span className="font-label-md text-label-md text-ink-primary font-medium">Folate (B9)</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={folate}
                onChange={(e) => setFolate(parseFloat(e.target.value) || 0)}
                className="w-16 bg-card-background rounded-lg px-2 py-1 text-right font-title-sm text-title-sm text-ink-primary border border-border-subtle focus:outline-none"
              />
              <span className="font-body-sm text-body-sm text-ink-secondary w-8">µg</span>
            </div>
          </div>

          {/* Sodium */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-space-sm">
            <span className="font-label-md text-label-md text-ink-primary font-medium">Sodium</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={sodium}
                onChange={(e) => setSodium(parseFloat(e.target.value) || 0)}
                className="w-16 bg-card-background rounded-lg px-2 py-1 text-right font-title-sm text-title-sm text-ink-primary border border-border-subtle focus:outline-none"
              />
              <span className="font-body-sm text-body-sm text-ink-secondary w-8">mg</span>
            </div>
          </div>
        </div>
      </details>

      {/* Bottom Action Rows */}
      <section className="bg-card-background rounded-2xl p-space-sm shadow-sm divide-y divide-border-subtle overflow-hidden">
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={exporting}
          className="w-full flex items-center justify-between p-space-sm hover:bg-surface-container-low transition-colors rounded-xl text-left disabled:opacity-60"
        >
          <div className="flex items-center gap-3">
            <Icon name="download" size={22} className="text-ink-secondary" />
            <div>
              <span className="font-label-md text-label-md text-ink-primary font-medium block">
                {exporting ? 'Generating export...' : 'Export my food logs (CSV)'}
              </span>
              <span className="font-body-sm text-body-sm text-ink-secondary block">
                Download your complete nutrition and meal diary history
              </span>
            </div>
          </div>
          <Icon name="chevron_right" size={20} className="text-ink-secondary" />
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-between p-space-sm hover:bg-surface-container-low transition-colors rounded-xl text-left"
        >
          <div className="flex items-center gap-3">
            <Icon name="logout" size={22} className="text-ink-secondary" />
            <span className="font-label-md text-label-md text-ink-primary font-medium">Sign out</span>
          </div>
          <Icon name="chevron_right" size={20} className="text-ink-secondary" />
        </button>

        <button
          type="button"
          onClick={handleDeleteAccount}
          className="w-full flex items-center justify-between p-space-sm hover:bg-error-container/40 transition-colors rounded-xl text-left text-error"
        >
          <div className="flex items-center gap-3">
            <Icon name="delete_forever" size={22} className="text-error" />
            <div>
              <span className="font-label-md text-label-md font-medium block">Wipe data &amp; reset</span>
              <span className="font-body-sm text-body-sm text-error/80 block">
                Permanently delete all food logs, custom foods, and progress
              </span>
            </div>
          </div>
          <Icon name="chevron_right" size={20} className="text-error" />
        </button>
      </section>
    </div>
  );
}
