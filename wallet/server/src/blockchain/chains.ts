// wallet/server/src/blockchain/chains.ts
export interface ChainConfig {
  id: number;
  name: string;
  symbol: string;
  rpc: string;
  alchemy?: string;
  moralis?: string | null;
  }

export const EVM_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', rpc: 'https://eth.llamarpc.com', alchemy: 'eth-mainnet' },
  { id: 56, name: 'BNB Smart Chain', symbol: 'BNB', rpc: 'https://binance.llamarpc.com' },
  { id: 137, name: 'Polygon', symbol: 'POL', rpc: 'https://polygon.llamarpc.com', alchemy: 'polygon-mainnet' },
  { id: 8453, name: 'Base', symbol: 'ETH', rpc: 'https://mainnet.base.org', alchemy: 'base-mainnet' },
  { id: 42161, name: 'Arbitrum One', symbol: 'ETH', rpc: 'https://arb1.arbitrum.io/rpc', alchemy: 'arb-mainnet' },
  { id: 10, name: 'Optimism', symbol: 'ETH', rpc: 'https://mainnet.optimism.io', alchemy: 'opt-mainnet' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', rpc: 'https://api.avax.network/ext/bc/C/rpc' },
  { id: 81457, name: 'Blast', symbol: 'ETH', rpc: 'https://rpc.blast.io' },
  { id: 59144, name: 'Linea', symbol: 'ETH', rpc: 'https://rpc.linea.build' },
  { id: 534352, name: 'Scroll', symbol: 'ETH', rpc: 'https://rpc.scroll.io' },
  { id: 100, name: 'Gnosis', symbol: 'xDAI', rpc: 'https://rpc.gnosischain.com' },
  { id: 250, name: 'Fantom', symbol: 'FTM', rpc: 'https://rpc.ftm.tools' },
  { id: 324, name: 'zkSync Era', symbol: 'ETH', rpc: 'https://mainnet.era.zksync.io' },
  { id: 1101, name: 'Polygon zkEVM', symbol: 'ETH', rpc: 'https://zkevm-rpc.com' },
  { id: 42220, name: 'Celo', symbol: 'CELO', rpc: 'https://forno.celo.org' },
  { id: 1284, name: 'Moonbeam', symbol: 'GLMR', rpc: 'https://rpc.api.moonbeam.network' },
  { id: 1285, name: 'Moonriver', symbol: 'MOVR', rpc: 'https://rpc.api.moonriver.moonbeam.network' },
  { id: 5000, name: 'Mantle', symbol: 'MNT', rpc: 'https://rpc.mantle.xyz' },
  { id: 204, name: 'opBNB', symbol: 'BNB', rpc: 'https://opbnb-mainnet-rpc.bnbchain.org' },
  { id: 146, name: 'Sonic', symbol: 'S', rpc: 'https://rpc.soniclabs.com' },
  { id: 1329, name: 'Sei', symbol: 'SEI', rpc: 'https://evm-rpc.sei.io' },
  { id: 25, name: 'Cronos', symbol: 'CRO', rpc: 'https://evm.cronos.org' },
  { id: 42170, name: 'Arbitrum Nova', symbol: 'ETH', rpc: 'https://nova.arbitrum.io/rpc' },
  { id: 1088, name: 'Metis', symbol: 'METIS', rpc: 'https://andromeda.metis.io' },
  { id: 2222, name: 'Kava', symbol: 'KAVA', rpc: 'https://evm.kava.io' },
  { id: 34443, name: 'Mode', symbol: 'ETH', rpc: 'https://mainnet.mode.network' },
  { id: 167000, name: 'Taiko', symbol: 'ETH', rpc: 'https://rpc.mainnet.taiko.xyz' },
  { id: 55, name: 'Zircuit', symbol: 'ETH', rpc: 'https://zircuit-mainnet.drpc.org' },
  { id: 7777777, name: 'Zora', symbol: 'ETH', rpc: 'https://rpc.zora.energy' },
  { id: 480, name: 'World Chain', symbol: 'ETH', rpc: 'https://worldchain-mainnet.g.alchemy.com' },
  { id: 660279, name: 'Xai', symbol: 'XAI', rpc: 'https://xai-chain.net' },
  { id: 4200, name: 'Merlin', symbol: 'BTC', rpc: 'https://rpc.merlinchain.io' },
  { id: 57073, name: 'BeraChain', symbol: 'BERA', rpc: 'https://rpc.berachain.com' },
  { id: 8888, name: 'Chiliz', symbol: 'CHZ', rpc: 'https://rpc.chiliz.com' },
  { id: 30, name: 'Rootstock', symbol: 'RBTC', rpc: 'https://public-node.rsk.co' },
  { id: 57, name: 'Syscoin', symbol: 'SYS', rpc: 'https://rpc.syscoin.org' },
  { id: 106, name: 'Velas', symbol: 'VLX', rpc: 'https://evmexplorer.velas.com' },
  { id: 40, name: 'Telos', symbol: 'TLOS', rpc: 'https://mainnet.telos.net' },
  { id: 122, name: 'Fuse', symbol: 'FUSE', rpc: 'https://rpc.fuse.io' },
  { id: 2000, name: 'Dogechain', symbol: 'DOGE', rpc: 'https://rpc.dogechain.dog' },
  { id: 82, name: 'Meter', symbol: 'MTRG', rpc: 'https://rpc.meter.io' },
  { id: 361, name: 'Theta', symbol: 'TFUEL', rpc: 'https://eth-rpc-api.thetatoken.org' },
  { id: 4689, name: 'IoTeX', symbol: 'IOTX', rpc: 'https://babel-api.mainnet.iotex.io' },
  { id: 199, name: 'BitTorrent', symbol: 'BTT', rpc: 'https://rpc.bittorrentchain.io' },
  { id: 1030, name: 'Conflux eSpace', symbol: 'CFX', rpc: 'https://evm.confluxrpc.com' },
  { id: 1116, name: 'Core', symbol: 'CORE', rpc: 'https://rpc.coredao.org' },
  { id: 2020, name: 'Ronin', symbol: 'RON', rpc: 'https://api.roninchain.com' },
  { id: 88, name: 'Viction', symbol: 'VIC', rpc: 'https://rpc.viction.xyz' },
  { id: 53935, name: 'DFK Chain', symbol: 'JEWEL', rpc: 'https://subnets.avax.network' },
  { id: 2001, name: 'Milkomeda C1', symbol: 'mADA', rpc: 'https://rpc-mainnet-cardano-evm.milkomeda.com' },
  { id: 311, name: 'Omax', symbol: 'OMAX', rpc: 'https://mainnet-rpc.omaxray.com' },
  { id: 1234, name: 'Step Network', symbol: 'FITFI', rpc: 'https://rpc.step.network' }
];
