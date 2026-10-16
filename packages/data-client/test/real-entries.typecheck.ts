import type {
  AchievementDetail,
  CooldownDetail,
  CooldownListItem,
  RewardDetail,
  RouteDetail,
  RoutePathDetail,
  SkillDetail,
} from "../src/index.js";

export const skill = {
  id: "agility",
  name: "Agility",
  nameLocalizationKey: "skills.singulars.agility.name",
  iconBig: "assets/icons/skills/agility.png",
  type: "utility",
  typeIcon: "assets/icons/skill_types/utility.png",
  typeIconBig: "assets/icons/skill_types/utility_big.png",
  icon: "assets/icons/text/skill_icons/agility.png",
} satisfies SkillDetail;

export const achievement = {
  id: "a_bone_to_pick",
  name: "A Bone To Pick",
  desc: "Picking a fight with rocks is always a good choice.",
  difficulty: "normal",
  itemRewards: [{ type: "item", id: "ectoplasm", quality: null, tag: null, quantity: 100 }],
  cardFrontImage: "assets/achievements/card_fronts/bone_to_pick.png",
  cardBackImage: "assets/achievements/card_backs/yellow_normal.png",
  cardFrontBackgroundImage: "assets/achievements/card_front_backgrounds/yellow_front.png",
} satisfies AchievementDetail;

export const reward = {
  id: "reward_progress_erdwise_lvl_1",
  keywords: [],
  type: "factionReputation",
  rewardItems: [
    { type: "item", id: "chest_of_erdwise", quality: "common", tag: "none", quantity: 1 },
    { type: "item", id: "proper_cape", quality: "common", tag: "none", quantity: 1 },
    { type: "item", id: "creme_brulee", quality: "common", tag: null, quantity: 3 },
  ],
} satisfies RewardDetail;

export const route = {
  id: "barbantok-to-casbrant_fields",
  name: "Barbantok to Casbrant Fields",
  locations: ["barbantok", "casbrant_fields"],
  distance: 358,
  options: [],
  pathPoints: [
    [753, 793],
    [636, 838],
    [706, 837],
    [775, 791],
  ],
  paths: ["barbantok_to_casbrant_fields_exit", "casbrant_fields_exit", "casbrant_fields_to_casbrant_fields_exit"],
} satisfies RouteDetail;

export const routePath = {
  id: "barbantok_to_casbrant_fields_exit",
  name: "Barbantok to Casbrant Fields Exit",
  points: [
    [636, 838],
    [703, 841],
    [753, 793],
    [775, 791],
    [800, 808],
    [818, 808],
  ],
} satisfies RoutePathDetail;

export const cooldown = {
  id: "cooldown-downGoesTheTrees",
  seconds: null,
  minutes: null,
  hours: null,
  days: null,
  steps: 9999,
  actions: null,
  charges: 3,
  requirements: [
    {
      type: "activityType",
      name: null,
      opposite: false,
      requirement: { keywords: ["woodcutting_trees"], skill: null, activity: null },
    },
    { type: "itemEquipped", name: null, opposite: false, requirement: { item: "axe_of_destruction" } },
  ],
} satisfies CooldownDetail;

export const cooldownListItem = {
  id: "cooldown-downGoesTheTrees",
  seconds: null,
  minutes: null,
  hours: null,
  days: null,
  steps: 9999,
  actions: null,
  charges: 3,
} satisfies CooldownListItem;
