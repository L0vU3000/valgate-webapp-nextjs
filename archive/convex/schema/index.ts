import { defineSchema } from "convex/server";
import * as identityModule from "./identity";
import * as propertiesModule from "./property";
import * as documentsModule from "./documents";
import * as copilotModule from "./copilot";
import * as leaseModule from "./lease";
import * as scanModule from "./scan";

// Export a composed schema map for reuse if needed
export const schemaTables = {
  // ==== new structure ===== 

  // identity domain (RLS primitives)
  orgs: identityModule.orgs,
  users: identityModule.users,
  org_members: identityModule.org_members,
  // properties domain (new)
  property: propertiesModule.property,
  property_location: propertiesModule.property_location,
  property_location_point: propertiesModule.property_location_point,
  property_location_boundary: propertiesModule.property_location_boundary,
  property_location_feature: propertiesModule.property_location_feature,
  property_location_polygon: propertiesModule.property_location_polygon,

  // generic documents domain (Folder ⇒ Document ⇒ File)
  document: documentsModule.document,
  document_folders: documentsModule.document_folders,
  document_folder_links: documentsModule.document_folder_links,
  document_files: documentsModule.document_files,

  property_image: propertiesModule.property_image,

  // normalized owners and ownership relations
  owner: propertiesModule.owner,
  property_owner_membership: propertiesModule.property_owner_membership,
  property_ownership_transaction: propertiesModule.property_ownership_transaction,
  property_finance: propertiesModule.property_finance,
  property_preferences: propertiesModule.property_preferences,


  // per-type details
  property_type_building: propertiesModule.property_type_building,
  property_type_house: propertiesModule.property_type_house,
  property_type_unit: propertiesModule.property_type_unit,
  property_type_land: propertiesModule.property_type_land,
  property_registry: propertiesModule.property_registry,
  // scan domain
  scan_sessions: scanModule.scan_sessions,
  scan_captures: scanModule.scan_captures,
  
  // lease domain
  party: leaseModule.party,
  lease: leaseModule.lease,
  lease_party: leaseModule.lease_party,
  lease_payment: leaseModule.lease_payment,
  lease_document: leaseModule.lease_document,

  // copilot (agent, chat, rag, usage)
  ...copilotModule,
};

export default defineSchema(schemaTables as any, { schemaValidation: true });
