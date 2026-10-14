/**
 * Types for Issuer Information
 */

export interface IssuerInfo {
  _id?: string;
  address: string;  // Lowercase address
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
