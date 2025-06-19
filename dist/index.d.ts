export type { Actor, Context, Rule, MetaMatcher, Condition, Permit, AccessRequest, ConditionMatcher, } from "@/types";
export { matchCondition } from "@/conditions";
export { RuleEngine, AbstractRuleEngine, permit, matchesRule, } from "@/engine";
export { createAccessRequest, AccessRequestBuilder, type PermitBuilder, } from "@/request";
export { matchMeta, matchAttributeMeta, type RoleMeta, type RoleOperationMeta, type ResourceRoleOperationMeta, type AttributeMatcher, type ResourceRoleOperationAttributeMeta, } from "@/meta";
export * from "@/strategies";
