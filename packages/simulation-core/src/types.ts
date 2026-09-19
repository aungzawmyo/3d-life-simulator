export type SimSpeed = 0 | 1 | 5 | 20 | 100;

export type Gender = "female" | "male" | "nonbinary";

export type LifeStage =
  | "early_childhood"
  | "childhood"
  | "adolescence"
  | "young_adult"
  | "adulthood"
  | "midlife"
  | "elder";

export type ActivityType =
  | "idle"
  | "sleep"
  | "eat"
  | "cook"
  | "work"
  | "study"
  | "shop"
  | "socialize"
  | "recreation"
  | "exercise"
  | "commute"
  | "hospital"
  | "care";

export type LocationKind =
  | "home"
  | "workplace"
  | "shop"
  | "park"
  | "school"
  | "hospital"
  | "street";

export type JobTrack =
  | "unemployed"
  | "student"
  | "retired"
  | "retail"
  | "software"
  | "healthcare"
  | "education"
  | "hospitality"
  | "freelance";

export type RelationshipKind =
  | "stranger"
  | "acquaintance"
  | "colleague"
  | "friend"
  | "family"
  | "romantic"
  | "spouse";

export interface ClockState {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
  totalMinutes: number;
  speed: SimSpeed;
}

export interface Genetics {
  heightPotential: number;
  metabolism: number;
  agingRate: number;
  fertility: number;
  attractiveness: number;
  cardiovascularRisk: number;
  mentalHealthRisk: number;
}

export interface HiddenHealth {
  cardiovascular: number;
  nutrition: number;
  sleepDebt: number;
  injuryRisk: number;
  immune: number;
}

export interface Needs {
  hunger: number;
  sleep: number;
  energy: number;
  fitness: number;
  purpose: number;
  confidence: number;
  entertainment: number;
  satisfaction: number;
  belonging: number;
  reputation: number;
}

export interface Personality {
  openness: number;
  discipline: number;
  confidence: number;
  empathy: number;
  riskTolerance: number;
  sociability: number;
  emotionalStability: number;
}

export interface Aptitudes {
  intelligence: number;
  creativity: number;
  discipline: number;
  charisma: number;
  fitness: number;
}

export interface Skill {
  id: string;
  xp: number;
  competence: number;
  lastPracticedDay: number;
}

export interface Goal {
  id: string;
  text: string;
  kind: "health" | "career" | "family" | "wealth" | "education" | "social";
  progress: number;
}

export interface Education {
  level: "none" | "primary" | "secondary" | "bachelor" | "master";
  inSchool: boolean;
  schoolId?: string;
}

export interface CareerState {
  track: JobTrack;
  title: string;
  level: number;
  employerId?: string;
  performance: number;
  experience: number;
  reputation: number;
  salaryMonthly: number;
}

export interface Finances {
  cash: number;
  savings: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  rentMonthly: number;
  debt: number;
}

export interface Relationship {
  otherId: string;
  kind: RelationshipKind;
  familiarity: number;
  trust: number;
  attraction: number;
  respect: number;
  affection: number;
  conflict: number;
  dependency: number;
}

export interface Memory {
  id: string;
  type: string;
  text: string;
  participantIds: string[];
  timestamp: number;
  emotionalImpact: number;
  importance: number;
  decayRate: number;
}

export interface Activity {
  type: ActivityType;
  locationId: string;
  startedAt: number;
  durationMinutes: number;
  targetId?: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthYear: number;
  nationality: string;
  genetics: Genetics;
  appearance: {
    heightCm: number;
    weightKg: number;
    attractiveness: number;
  };
  hidden: HiddenHealth;
  physicalHealth: number;
  mentalWellbeing: number;
  stress: number;
  happiness: number;
  needs: Needs;
  personality: Personality;
  aptitudes: Aptitudes;
  skills: Record<string, Skill>;
  education: Education;
  career: CareerState;
  finances: Finances;
  relationships: Record<string, Relationship>;
  familyIds: string[];
  parentIds: string[];
  childIds: string[];
  memories: Memory[];
  goals: Goal[];
  ageYears: number;
  biologicalAge: number;
  lifeExpectancy: number;
  homeId: string;
  locationId: string;
  ownsHome: boolean;
  homeValue: number;
  generation: number;
  activity: Activity;
  alive: boolean;
  causeOfDeath?: string;
  isPlayer: boolean;
}

export interface Place {
  id: string;
  name: string;
  kind: LocationKind;
  capacity: number;
  occupantIds: string[];
  employerId?: string;
}

export interface Business {
  id: string;
  name: string;
  industry: JobTrack;
  placeId: string;
  revenue: number;
  payroll: number;
  employeeIds: string[];
  hiring: boolean;
}

export interface MacroEconomy {
  inflation: number;
  interestRate: number;
  unemployment: number;
  consumerDemand: number;
  recession: boolean;
}

export interface WorldEvent {
  id: string;
  definitionId: string;
  timestamp: number;
  personId?: string;
  text: string;
  effects: Record<string, number>;
}

export interface TimelineEntry {
  id: string;
  year: number;
  month: number;
  day: number;
  kind: string;
  personId?: string;
  text: string;
}

export interface WorldState {
  seed: number;
  country: { id: string; name: string; currency: string; currencySymbol: string };
  city: { id: string; name: string; district: string };
  clock: ClockState;
  people: Record<string, Person>;
  places: Record<string, Place>;
  businesses: Record<string, Business>;
  economy: MacroEconomy;
  events: WorldEvent[];
  timeline: TimelineEntry[];
  rngState: number;
  nextId: number;
  generation: number;
  pendingLegacy?: LegacyOffer;
}

export interface LegacyOffer {
  deceasedId: string;
  deceasedName: string;
  cause: string;
  heirIds: string[];
  summary: SimulationSummary;
}

export interface EventDefinition {
  id: string;
  text: (person: Person, world: WorldState) => string;
  weight: number;
  conditions: (person: Person, world: WorldState) => boolean;
  apply: (person: Person, world: WorldState, rng: import("./rng").Rng) => Record<string, number>;
}

export interface EngineOptions {
  seed?: number;
  population?: number;
  startYear?: number;
  startMonth?: number;
  startDay?: number;
  playerAge?: number;
}

export interface SimulationSummary {
  daysSimulated: number;
  living: number;
  dead: number;
  averageHappiness: number;
  averageHealth: number;
  unemployment: number;
  totalCash: number;
  marriages: number;
  births: number;
  homeowners: number;
  events: number;
}

export type LifeActionId =
  | "sleep"
  | "eat"
  | "work"
  | "study"
  | "exercise"
  | "socialize"
  | "clinic"
  | "apply_job"
  | "enroll"
  | "marry"
  | "have_child"
  | "buy_house"
  | "continue_heir";

export interface LifeAction {
  id: LifeActionId;
  label: string;
  detail: string;
  targetId?: string;
}
