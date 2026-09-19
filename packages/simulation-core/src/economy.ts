import { clamp } from "./math";
import type { Business, MacroEconomy, Person, WorldState } from "./types";

export function createEconomy(): MacroEconomy {
  return {
    inflation: 0.021,
    interestRate: 0.025,
    unemployment: 0.06,
    consumerDemand: 0.72,
    recession: false,
  };
}

export function spend(person: Person, amount: number): boolean {
  if (person.finances.cash < amount) return false;
  person.finances.cash -= amount;
  person.finances.monthlyExpenses += amount;
  return true;
}

export function earn(person: Person, amount: number): void {
  person.finances.cash += amount;
  person.finances.monthlyIncome += amount;
}

export function applyMonthlyEconomy(world: WorldState): void {
  const { economy } = world;
  for (const person of Object.values(world.people)) {
    if (!person.alive) continue;
    if (person.career.salaryMonthly > 0) {
      const paid = person.career.salaryMonthly * (economy.recession ? 0.92 : 1);
      person.finances.cash += paid;
    }
    const rent = person.ageYears >= 18 ? person.finances.rentMonthly * (1 + economy.inflation / 12) : 0;
    person.finances.cash -= rent;
    if (person.finances.savings > 0) {
      person.finances.savings *= 1 + economy.interestRate / 12;
    }
    if (person.finances.debt > 0) {
      const payment = Math.min(person.finances.debt, person.finances.debt * 0.02 + 400);
      person.finances.cash -= payment;
      person.finances.debt = Math.max(0, person.finances.debt * (1 + 0.14 / 12) - payment);
    }
    if (person.finances.cash < 0) {
      person.stress = clamp(person.stress + 8);
      person.needs.confidence = clamp(person.needs.confidence - 4);
    } else if (person.finances.cash > 20000) {
      person.finances.savings += person.finances.cash - 18000;
      person.finances.cash = 18000;
    }
    person.finances.monthlyIncome = person.career.salaryMonthly;
    person.finances.monthlyExpenses = rent;
  }

  for (const business of Object.values(world.businesses)) {
    tickBusiness(business, world);
  }

  const labor = Object.values(world.people).filter((p) => p.alive && p.ageYears >= 18 && p.ageYears < 63);
  const jobless = labor.filter((p) => p.career.track === "unemployed").length;
  economy.unemployment = labor.length === 0 ? 0 : jobless / labor.length;
}

function tickBusiness(business: Business, world: WorldState): void {
  const demand = world.economy.consumerDemand * (world.economy.recession ? 0.7 : 1);
  business.revenue = business.employeeIds.length * 18000 * demand;
  business.payroll = business.employeeIds.reduce((sum, id) => {
    const employee = world.people[id];
    return sum + (employee?.career.salaryMonthly ?? 0);
  }, 0);
  business.hiring = business.revenue > business.payroll * 1.15 && !world.economy.recession;
}

export function startRecession(world: WorldState): void {
  world.economy.recession = true;
  world.economy.consumerDemand = clamp(world.economy.consumerDemand * 0.72, 0.2, 1);
  world.economy.unemployment += 0.04;
}

export function endRecession(world: WorldState): void {
  world.economy.recession = false;
  world.economy.consumerDemand = clamp(world.economy.consumerDemand + 0.18, 0.2, 1);
}
