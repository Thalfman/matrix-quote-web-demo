/**
 * Compatibility shim — BusinessInsights is now split into tool-specific wrappers:
 *   /compare/insights → ComparisonInsights  (real projects)
 *   /ml/insights      → MachineLearningInsights  (synthetic pool)
 *
 * This shim renders the Comparison variant (real projects) so any test or
 * direct import that still references this file gets the same data it always did.
 */
export { ComparisonInsights as BusinessInsights } from "@/pages/demo/compare/ComparisonInsights";
