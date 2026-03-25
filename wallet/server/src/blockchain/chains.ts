import 'dotenv/config';

export interface ChainConfig {
  id: number;
  name: string;
  symbol: string;
  rpc: string;
  relayUrl?: string;
  alchemy?: string;
  moralis?: string | null;
  explorer: string;
  isL2?: boolean;
  blockTimeSec: number;
  nativePriceId: string;
  supportsEIP1559: boolean;
}

const ALCHEMY_KEY: string = process.env.ALCHEMY_KEY || process.env.ALCHEMY_API_KEY || '';

const getDynamicRpc = (chainId: number, publicRpc: string, alchemyAlias?: string): string => {
  const envOverride = process.env[`RPC_${chainId}`];
  if (envOverride) return envOverride;
  if (ALCHEMY_KEY && alchemyAlias) {
    return `https://${alchemyAlias}.g.alchemy.com/v2/${ALCHEMY_KEY}`;
  }
  return publicRpc;
};

export const EVM_CHAINS: ChainConfig[] = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', rpc: getDynamicRpc(1, 'https://eth.drpc.org', 'eth-mainnet'), relayUrl: 'https://relay.flashbots.net', alchemy: 'eth-mainnet', explorer: 'https://etherscan.io', isL2: false, blockTimeSec: 12, nativePriceId: 'ethereum', supportsEIP1559: true },
  { id: 56, name: 'BNB Smart Chain', symbol: 'BNB', rpc: getDynamicRpc(56, 'https://binance.drpc.org'), explorer: 'https://bscscan.com', isL2: false, blockTimeSec: 3, nativePriceId: 'binancecoin', supportsEIP1559: false },
  { id: 137, name: 'Polygon', symbol: 'POL', rpc: getDynamicRpc(137, 'https://polygon-rpc.com', 'polygon-mainnet'), alchemy: 'polygon-mainnet', explorer: 'https://polygonscan.com', isL2: true, blockTimeSec: 2, nativePriceId: 'matic-network', supportsEIP1559: true },
  { id: 8453, name: 'Base', symbol: 'ETH', rpc: getDynamicRpc(8453, 'https://mainnet.base.org', 'base-mainnet'), alchemy: 'base-mainnet', explorer: 'https://basescan.org', isL2: true, blockTimeSec: 2, nativePriceId: 'ethereum', supportsEIP1559: true },
  { id: 42161, name: 'Arbitrum One', symbol: 'ETH', rpc: getDynamicRpc(42161, 'https://arb1.arbitrum.io', 'arb-mainnet'), alchemy: 'arb-mainnet', explorer: 'https://arbiscan.io', isL2: true, blockTimeSec: 0.3, nativePriceId: 'ethereum', supportsEIP1559: true },
  { id: 10, name: 'Optimism', symbol: 'ETH', rpc: getDynamicRpc(10, 'https://mainnet.optimism.io', 'opt-mainnet'), alchemy: 'opt-mainnet', explorer: 'https://optimistic.etherscan.io', isL2: true, blockTimeSec: 2, nativePriceId: 'ethereum', supportsEIP1559: true },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', rpc: getDynamicRpc(43114, 'https://api.avax.network'), explorer: 'https://snowtrace.io', isL2: false, blockTimeSec: 2, nativePriceId: 'avalanche-2', supportsEIP1559: true },
  { id: 81457, name: 'Blast', symbol: 'ETH', rpc: getDynamicRpc(81457, 'https://rpc.blast.io'), explorer: 'https://blastscan.io', isL2: true, blockTimeSec: 2, nativePriceId: 'ethereum', supportsEIP1559: true },
  { id: 59144, name: 'Linea', symbol: 'ETH', rpc: getDynamicRpc(59144, 'https://rpc.linea.build'), explorer: 'https://lineascan.build', isL2: true, blockTimeSec: 12, nativePriceId: 'ethereum', supportsEIP1559: true },
  { id: 534352, name: 'Scroll', symbol: 'ETH', rpc: getDynamicRpc(534352, 'https://rpc.scroll.io'), explorer: 'https://scrollscan.com', isL2: true, blockTimeSec: 3, nativePriceId: 'ethereum', supportsEIP1559: true },
  { id: 100, name: 'Gnosis', symbol: 'xDAI', rpc: getDynamicRpc(100, 'https://rpc.gnosischain.com'), explorer: 'https://gnosisscan.io', isL2: false, blockTimeSec: 5, nativePriceId: 'xdai', supportsEIP1559: true },
  { id: 250, name: 'Fantom', symbol: 'FTM', rpc: getDynamicRpc(250, 'https://rpc.ftm.tools'), explorer: 'https://ftmscan.com', isL2: false, blockTimeSec: 1, nativePriceId: 'fantom', supportsEIP1559: false },
  { id: 324, name: 'zkSync Era', symbol: 'ETH', rpc: getDynamicRpc(324, 'https://mainnet.era.zksync.io'), explorer: 'https://explorer.zksync.io', isL2: true, blockTimeSec: 1, nativePriceId: 'ethereum', supportsEIP1559: true },
  { id: 1101, name: 'Polygon zkEVM', symbol: 'ETH', rpc: getDynamicRpc(1101, 'https://zkevm-rpc.com'), explorer: 'https://zkevm.polygonscan.com', isL2: true, blockTimeSec: 2, nativePriceId: 'ethereum', supportsEIP1559: true },
  { id: 42220, name: 'Celo', symbol: 'CELO', rpc: getDynamicRpc(42220, 'https://forno.celo.org'), explorer: 'https://celoscan.io', blockTimeSec: 5, nativePriceId: 'celo', supportsEIP1559: true },
  { id: 1284, name: 'Moonbeam', symbol: 'GLMR', rpc: getDynamicRpc(1284, 'https://rpc.api.moonbeam.network'), explorer: 'https://moonscan.io', blockTimeSec: 12, nativePriceId: 'moonbeam', supportsEIP1559: true },
  { id: 1285, name: 'Moonriver', symbol: 'MOVR', rpc: getDynamicRpc(1285, 'https://rpc.api.moonriver.moonbeam.network'), explorer: 'https://moonriver.moonscan.io', blockTimeSec: 12, nativePriceId: 'moonriver', supportsEIP1559: true },
  { id: 5000, name: 'Mantle', symbol: 'MNT', rpc: getDynamicRpc(5000, 'https://rpc.mantle.xyz'), explorer: 'https://explorer.mantle.xyz', blockTimeSec: 2, nativePriceId: 'mantle', supportsEIP1559: false },
  { id: 204, name: 'opBNB', symbol: 'BNB', rpc: getDynamicRpc(204, 'https://opbnb-mainnet-rpc.bnbchain.org'), explorer: 'https://opbnbscan.com', blockTimeSec: 1, nativePriceId: 'binancecoin', supportsEIP1559: false },
  { id: 146, name: 'Sonic', symbol: 'S', rpc: getDynamicRpc(146, 'https://rpc.soniclabs.com'), explorer: 'https://sonicscan.org', blockTimeSec: 0.4, nativePriceId: 'fantom', supportsEIP1559: true },
  { id: 1329, name: 'Sei', symbol: 'SEI', rpc: getDynamicRpc(1329, 'https://evm-rpc.sei.io'), explorer: 'https://seitrace.com', blockTimeSec: 0.4, nativePriceId: 'sei-network', supportsEIP1559: false },
  { id: 25, name: 'Cronos', symbol: 'CRO', rpc: getDynamicRpc(25, 'https://evm.cronos.org'), explorer: 'https://cronoscan.com', blockTimeSec: 6, nativePriceId: 'crypto-com-chain', supportsEIP1559: true },
  { id: 42170, name: 'Arbitrum Nova', symbol: 'ETH', rpc: getDynamicRpc(42170, 'https://nova.arbitrum.io'), explorer: 'https://nova.arbiscan.io', blockTimeSec: 1, nativePriceId: 'ethereum', supportsEIP1559: true },
  { id: 1088, name: 'Metis', symbol: 'METIS', rpc: getDynamicRpc(1088, 'https://andromeda.metis.io'), explorer: 'https://andromeda-explorer.metis.io', blockTimeSec: 2, nativePriceId: 'metis-token', supportsEIP1559: false },
  { id: 2222, name: 'Kava', symbol: 'KAVA', rpc: getDynamicRpc(2222, 'https://evm.kava.io'), explorer: 'https://kavascan.com', blockTimeSec: 6, nativePriceId: 'kava', supportsEIP1559: false },
  { id: 34443, name: 'Mode', symbol: 'ETH', rpc: getDynamicRpc(34443, 'https://mainnet.mode.network'), explorer: 'https://modescan.io', blockTimeSec: 2, nativePriceId: 'ethereum', supportsEIP1559: true },
  { id: 167000, name: 'Taiko', symbol: 'ETH', rpc: getDynamicRpc(167000, 'https://rpc.mainnet.taiko.xyz'), explorer: 'https://taikoscan.io', blockTimeSec: 12, nativePriceId: 'ethereum', supportsEIP1559: true },
  { id: 55, name: 'Zircuit', symbol: 'ETH', rpc: getDynamicRpc(55, 'https://zircuit-mainnet.drpc.org'), explorer: 'https://explorer.zircuit.com', blockTimeSec: 2, nativePriceId: 'ethereum', supportsEIP1559: true },
  { id: 7777777, name: 'Zora', symbol: 'ETH', rpc: getDynamicRpc(7777777, 'https://rpc.zora.energy'), explorer: 'https://explorer.zora.energy', blockTimeSec: 2, nativePriceId: 'ethereum', supportsEIP1559: true },
  { id: 480, name: 'World Chain', symbol: 'ETH', rpc: getDynamicRpc(480, 'https://worldchain-mainnet.g.alchemy.com', 'worldchain-mainnet'), explorer: 'https://worldscan.org', isL2: true, blockTimeSec: 2, nativePriceId: 'ethereum', supportsEIP1559: true }
];

export const getChainById = (chainId: number): ChainConfig | undefined => {
  return EVM_CHAINS.find(c => c.id === chainId);
};

export const requireChain = (chainId: number): ChainConfig => {
  const chain = getChainById(chainId);
  if (!chain) throw new Error(`Unsupported chainId: ${chainId}`);
  return chain;
};

export const validateChainConfig = () => {
  const ids = EVM_CHAINS.map(c => c.id);
  if (new Set(ids).size !== ids.length) throw new Error("CRITICAL: Duplicate Chain IDs detected.");
  for (const chain of EVM_CHAINS) {
    if (!chain.explorer) throw new Error(`CRITICAL: Missing explorer for chain ${chain.name}`);
    if (!chain.rpc) throw new Error(`CRITICAL: Missing RPC for chain ${chain.name}`);
  }
};

validateChainConfig();
