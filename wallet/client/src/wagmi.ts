import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// Fetch Project ID from environment variables
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID'

export const config = createConfig({
  // Defines which chains your app supports
  chains: [mainnet, sepolia],
  
  // New functional connector setup
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],

  // Replaces the old publicClient logic with high-performance transports
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
