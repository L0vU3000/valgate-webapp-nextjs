/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _helpers_auth from "../_helpers/auth.js";
import type * as actions_document from "../actions/document.js";
import type * as actions_documentsEncrypted from "../actions/documentsEncrypted.js";
import type * as actions_scanAuth from "../actions/scanAuth.js";
import type * as actions_uploads from "../actions/uploads.js";
import type * as admin_helpers from "../admin/helpers.js";
import type * as admin_index from "../admin/index.js";
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as agent_copilot from "../agent/copilot.js";
import type * as agent_messages from "../agent/messages.js";
import type * as agent_threads from "../agent/threads.js";
import type * as authTokenForScan from "../authTokenForScan.js";
import type * as copilot_agent from "../copilot/agent.js";
import type * as copilot_events from "../copilot/events.js";
import type * as copilot_messages from "../copilot/messages.js";
import type * as copilot_qa from "../copilot/qa.js";
import type * as copilot_rag from "../copilot/rag.js";
import type * as copilot_streams from "../copilot/streams.js";
import type * as copilot_threads from "../copilot/threads.js";
import type * as copilot_usage from "../copilot/usage.js";
import type * as crypto_actions from "../crypto/actions.js";
import type * as crypto_kms from "../crypto/kms.js";
import type * as crypto_search from "../crypto/search.js";
import type * as http from "../http.js";
import type * as lease_leaseDocument_crud from "../lease/leaseDocument_crud.js";
import type * as lease_leaseParty_crud from "../lease/leaseParty_crud.js";
import type * as lease_leasePayment_crud from "../lease/leasePayment_crud.js";
import type * as lease_lease_crud from "../lease/lease_crud.js";
import type * as lease_party_encrypted from "../lease/party_encrypted.js";
import type * as lease_party_mutations from "../lease/party_mutations.js";
import type * as lease_party_queries from "../lease/party_queries.js";
import type * as lib_numeric from "../lib/numeric.js";
import type * as lib_s3Keys from "../lib/s3Keys.js";
import type * as maintenance_backfillPropertyHealth from "../maintenance/backfillPropertyHealth.js";
import type * as memberships_encrypted from "../memberships/encrypted.js";
import type * as metrics from "../metrics.js";
import type * as mutations_aiTasks from "../mutations/aiTasks.js";
import type * as mutations_analytics from "../mutations/analytics.js";
import type * as mutations_documents from "../mutations/documents.js";
import type * as mutations_documentsEncrypted from "../mutations/documentsEncrypted.js";
import type * as mutations_i18n from "../mutations/i18n.js";
import type * as mutations_mapSettings from "../mutations/mapSettings.js";
import type * as mutations_membershipsEncrypted from "../mutations/membershipsEncrypted.js";
import type * as mutations_ownersEncrypted from "../mutations/ownersEncrypted.js";
import type * as mutations_properties from "../mutations/properties.js";
import type * as mutations_propertyOwner from "../mutations/propertyOwner.js";
import type * as mutations_publicUploads from "../mutations/publicUploads.js";
import type * as mutations_scans from "../mutations/scans.js";
import type * as mutations_transactionsEncrypted from "../mutations/transactionsEncrypted.js";
import type * as mutations_uploads from "../mutations/uploads.js";
import type * as myFunctions from "../myFunctions.js";
import type * as owners_encrypted from "../owners/encrypted.js";
import type * as property from "../property.js";
import type * as queries_activities from "../queries/activities.js";
import type * as queries_documents from "../queries/documents.js";
import type * as queries_documentsEncrypted from "../queries/documentsEncrypted.js";
import type * as queries_identity from "../queries/identity.js";
import type * as queries_membershipsEncrypted from "../queries/membershipsEncrypted.js";
import type * as queries_ownersEncrypted from "../queries/ownersEncrypted.js";
import type * as queries_properties from "../queries/properties.js";
import type * as queries_propertyOwner from "../queries/propertyOwner.js";
import type * as queries_scans from "../queries/scans.js";
import type * as queries_transactionsEncrypted from "../queries/transactionsEncrypted.js";
import type * as rls from "../rls.js";
import type * as scheduler_propertyDocuments from "../scheduler/propertyDocuments.js";
import type * as schema_copilot from "../schema/copilot.js";
import type * as schema_documents from "../schema/documents.js";
import type * as schema_identity from "../schema/identity.js";
import type * as schema_index from "../schema/index.js";
import type * as schema_lease from "../schema/lease.js";
import type * as schema_property from "../schema/property.js";
import type * as schema_scan from "../schema/scan.js";
import type * as security from "../security.js";
import type * as transactions_encrypted from "../transactions/encrypted.js";
import type * as trigger_documents from "../trigger/documents.js";
import type * as trigger_property from "../trigger/property.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_helpers/auth": typeof _helpers_auth;
  "actions/document": typeof actions_document;
  "actions/documentsEncrypted": typeof actions_documentsEncrypted;
  "actions/scanAuth": typeof actions_scanAuth;
  "actions/uploads": typeof actions_uploads;
  "admin/helpers": typeof admin_helpers;
  "admin/index": typeof admin_index;
  "admin/mutations": typeof admin_mutations;
  "admin/queries": typeof admin_queries;
  "agent/copilot": typeof agent_copilot;
  "agent/messages": typeof agent_messages;
  "agent/threads": typeof agent_threads;
  authTokenForScan: typeof authTokenForScan;
  "copilot/agent": typeof copilot_agent;
  "copilot/events": typeof copilot_events;
  "copilot/messages": typeof copilot_messages;
  "copilot/qa": typeof copilot_qa;
  "copilot/rag": typeof copilot_rag;
  "copilot/streams": typeof copilot_streams;
  "copilot/threads": typeof copilot_threads;
  "copilot/usage": typeof copilot_usage;
  "crypto/actions": typeof crypto_actions;
  "crypto/kms": typeof crypto_kms;
  "crypto/search": typeof crypto_search;
  http: typeof http;
  "lease/leaseDocument_crud": typeof lease_leaseDocument_crud;
  "lease/leaseParty_crud": typeof lease_leaseParty_crud;
  "lease/leasePayment_crud": typeof lease_leasePayment_crud;
  "lease/lease_crud": typeof lease_lease_crud;
  "lease/party_encrypted": typeof lease_party_encrypted;
  "lease/party_mutations": typeof lease_party_mutations;
  "lease/party_queries": typeof lease_party_queries;
  "lib/numeric": typeof lib_numeric;
  "lib/s3Keys": typeof lib_s3Keys;
  "maintenance/backfillPropertyHealth": typeof maintenance_backfillPropertyHealth;
  "memberships/encrypted": typeof memberships_encrypted;
  metrics: typeof metrics;
  "mutations/aiTasks": typeof mutations_aiTasks;
  "mutations/analytics": typeof mutations_analytics;
  "mutations/documents": typeof mutations_documents;
  "mutations/documentsEncrypted": typeof mutations_documentsEncrypted;
  "mutations/i18n": typeof mutations_i18n;
  "mutations/mapSettings": typeof mutations_mapSettings;
  "mutations/membershipsEncrypted": typeof mutations_membershipsEncrypted;
  "mutations/ownersEncrypted": typeof mutations_ownersEncrypted;
  "mutations/properties": typeof mutations_properties;
  "mutations/propertyOwner": typeof mutations_propertyOwner;
  "mutations/publicUploads": typeof mutations_publicUploads;
  "mutations/scans": typeof mutations_scans;
  "mutations/transactionsEncrypted": typeof mutations_transactionsEncrypted;
  "mutations/uploads": typeof mutations_uploads;
  myFunctions: typeof myFunctions;
  "owners/encrypted": typeof owners_encrypted;
  property: typeof property;
  "queries/activities": typeof queries_activities;
  "queries/documents": typeof queries_documents;
  "queries/documentsEncrypted": typeof queries_documentsEncrypted;
  "queries/identity": typeof queries_identity;
  "queries/membershipsEncrypted": typeof queries_membershipsEncrypted;
  "queries/ownersEncrypted": typeof queries_ownersEncrypted;
  "queries/properties": typeof queries_properties;
  "queries/propertyOwner": typeof queries_propertyOwner;
  "queries/scans": typeof queries_scans;
  "queries/transactionsEncrypted": typeof queries_transactionsEncrypted;
  rls: typeof rls;
  "scheduler/propertyDocuments": typeof scheduler_propertyDocuments;
  "schema/copilot": typeof schema_copilot;
  "schema/documents": typeof schema_documents;
  "schema/identity": typeof schema_identity;
  "schema/index": typeof schema_index;
  "schema/lease": typeof schema_lease;
  "schema/property": typeof schema_property;
  "schema/scan": typeof schema_scan;
  security: typeof security;
  "transactions/encrypted": typeof transactions_encrypted;
  "trigger/documents": typeof trigger_documents;
  "trigger/property": typeof trigger_property;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
