/**
 * GENERADO por scripts/sync-contracts.sh desde rwa-sc/sc/deployments/31337-20261023T185622Z.json — NO EDITAR.
 *
 * Fuente de verdad de direcciones (RF-W-09): no se escriben literales a mano en el código.
 */

export const DEPLOYMENT_METADATA = {
  artifact: '31337-20261023T185622Z.json',
  chainId: 31337,
  block: 549,
  timestamp: 1792207197,
} as const;

/** Direcciones de los contratos del despliegue canónico. */
export const CONTRACT_ADDRESSES = {
  ClaimTopicsRegistry: "0x6f25545058AE90D2A2168B1e62C37063013d290E",
  ClaimTopicsRegistryCloneFactory: "0x22b1c5C2C9251622f7eFb76E356104E5aF0e996A",
  ComplianceAggregator: "0x5A569Ad19272Afa97103fD4DbadF33B2FcbaA175",
  Identity: "0x9B2B010a6F61Ea07eB102DaDB2C07A10d09b881b",
  IdentityCloneFactory: "0xF45B1CdbA9AACE2e9bbE80bf376CE816bb7E73FB",
  IdentityRegistry: "0xA3f7BF5b0fa93176c260BBa57ceE85525De2BaF4",
  Token: "0x7d5dC0378b776A63D479869d22711df1b20672c9",
  TokenCloneFactory: "0xD855cE0C298537ad5b5b96060Cf90e663696bbf6",
  TrustedIssuersRegistry: "0x25A1DF485cFBb93117f12fc673D87D1cddEb845a",
} as const;

/** Token de demostración desplegado por DeployFullStack (registries y compliance ya configurados). */
export const DEMO_TOKEN = {
  address: "0x7d5dC0378b776A63D479869d22711df1b20672c9",
  authorizedDestination: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  claimTopicsRegistry: "0x6f25545058AE90D2A2168B1e62C37063013d290E",
  complianceAggregator: "0x5A569Ad19272Afa97103fD4DbadF33B2FcbaA175",
  complianceModule: "0x5c932424AcBfab036969b3B9D94bA9eCbae7565D",
  complianceModuleCount: 1,
  decimals: 18,
  identityRegistry: "0xA3f7BF5b0fa93176c260BBa57ceE85525De2BaF4",
  maxBurnPerTx: 1000000000000000000000000,
  maxForcedPerTx: 1000000000000000000000000,
  name: "RWA Demo Token",
  symbol: "RWAD",
  trustedIssuersRegistry: "0x25A1DF485cFBb93117f12fc673D87D1cddEb845a",
} as const;

export type ContractName = keyof typeof CONTRACT_ADDRESSES;

/** Dirección canónica de un contrato por nombre (falla en compilación si el nombre no existe). */
export function getContractAddress(name: ContractName): `0x${string}` {
  return CONTRACT_ADDRESSES[name] as `0x${string}`;
}
