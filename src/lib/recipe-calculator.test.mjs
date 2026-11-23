import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRecipeNutrition } from './recipe-calculator.ts';

test('calculateRecipeNutrition returns zeroes when given empty ingredients', () => {
  const result = calculateRecipeNutrition([], 4);
  assert.equal(result.servings, 4);
  assert.equal(result.totalPot.energy_kcal, 0);
  assert.equal(result.perServing.energy_kcal, 0);
  assert.equal(result.perServing.protein_g, 0);
  assert.equal(result.perServing.carbs_g, 0);
  assert.equal(result.perServing.fat_g, 0);
});

test('calculateRecipeNutrition scales single ingredient accurately', () => {
  const ingredients = [
    {
      id: 'paneer',
      name: 'Paneer',
      grams: 200, // 200g
      energy_kcal: 265, // per 100g -> total 530
      protein_g: 18.0,  // per 100g -> total 36
      carbs_g: 3.0,     // per 100g -> total 6
      fat_g: 20.0,      // per 100g -> total 40
      micros: { calcium_mg: 480 }, // per 100g -> total 960
    },
  ];

  const result = calculateRecipeNutrition(ingredients, 2); // 2 servings

  assert.equal(result.totalPot.energy_kcal, 530);
  assert.equal(result.totalPot.protein_g, 36);
  assert.equal(result.totalPot.carbs_g, 6);
  assert.equal(result.totalPot.fat_g, 40);
  assert.equal(result.totalPot.micros.calcium_mg, 960);

  // Per serving (divided by 2)
  assert.equal(result.perServing.energy_kcal, 265);
  assert.equal(result.perServing.protein_g, 18);
  assert.equal(result.perServing.carbs_g, 3);
  assert.equal(result.perServing.fat_g, 20);
  assert.equal(result.perServing.micros.calcium_mg, 480);
});

test('calculateRecipeNutrition aggregates missing micros strictly without inventing 0', () => {
  const ingredients = [
    {
      id: 'spinach',
      name: 'Spinach',
      grams: 100,
      energy_kcal: 23,
      protein_g: 2.9,
      carbs_g: 3.6,
      fat_g: 0.4,
      micros: { iron_mg: 2.7, vitamin_c_mg: 28 }, // has iron & vit C
    },
    {
      id: 'ghee',
      name: 'Desi Ghee',
      grams: 50,
      energy_kcal: 900,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 100,
      micros: {}, // no iron, no vit C measured
    },
  ];

  const result = calculateRecipeNutrition(ingredients, 1);

  // Iron should ONLY be from spinach (2.7 mg), ghee should not clear or skew it
  assert.equal(result.totalPot.micros.iron_mg, 2.7);
  assert.equal(result.totalPot.micros.vitamin_c_mg, 28);
  // Missing micro like calcium should NOT exist as key
  assert.equal(result.totalPot.micros.calcium_mg, undefined);
});
