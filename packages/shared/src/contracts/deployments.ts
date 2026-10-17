/**
 * GENERADO por scripts/sync-contracts.sh desde rwa-sc/sc/deployments/31337-20261010T162639Z.json — NO EDITAR.
 *
 * Fuente de verdad de direcciones (RF-W-09): no se escriben literales a mano en el código.
 */

export const DEPLOYMENT_METADATA = {
  artifact: '31337-20261010T162639Z.json',
  chainId: 31337,
  block: 524,
  timestamp: 1791649539,
} as const;

/** Direcciones de los contratos del despliegue canónico. */
export const CONTRACT_ADDRESSES = {
  ClaimTopicsRegistry: "0xafAC6756b04A92C5C4a68cE3882b99531995eBBA",
  ClaimTopicsRegistryCloneFactory: "0xD2D5e508C82EFc205cAFA4Ad969a4395Babce026",
  ComplianceAggregator: "0x2b639Cc84e1Ad3aA92D4Ee7d2755A6ABEf300D72",
  Identity: "0x47d480c84C1223D914D99872a2738bDE05F191e5",
  IdentityCloneFactory: "0x73C68f1f41e4890D06Ba3e71b9E9DfA555f1fb46",
  IdentityRegistry: "0xF5b81Fe0B6F378f9E6A3fb6A6cD1921FCeA11799",
  Token: "0x382F74873b3798BEca33Cf69623d0CF35dE0f369",
  TokenCloneFactory: "0x6533158b042775e2FdFeF3cA1a782EFDbB8EB9b1",
  TrustedIssuersRegistry: "0x67baFF31318638F497f4c4894Cd73918563942c8",
} as const;

/** Token de demostración desplegado por DeployFullStack (registries y compliance ya configurados). */
export const DEMO_TOKEN = {
  address: "0x382F74873b3798BEca33Cf69623d0CF35dE0f369",
  claimTopicsRegistry: "0xafAC6756b04A92C5C4a68cE3882b99531995eBBA",
  complianceAggregator: "0x2b639Cc84e1Ad3aA92D4Ee7d2755A6ABEf300D72",
  complianceModule: "0xB468647B04bF657C9ee2de65252037d781eABafD",
  complianceModuleCount: 1,
  decimals: 18,
  identityRegistry: "0xF5b81Fe0B6F378f9E6A3fb6A6cD1921FCeA11799",
  name: "RWA Demo Token",
  symbol: "RWAD",
  trustedIssuersRegistry: "0x67baFF31318638F497f4c4894Cd73918563942c8",
} as const;

export type ContractName = keyof typeof CONTRACT_ADDRESSES;

/** Dirección canónica de un contrato por nombre (falla en compilación si el nombre no existe). */
export function getContractAddress(name: ContractName): `0x${string}` {
  return CONTRACT_ADDRESSES[name] as `0x${string}`;
}
