import { useEffect, useState } from "react"
import { useAccount, useConfig } from "wagmi"
import { getPublicClient } from "@wagmi/core"
import { getEventSelector } from "viem"

/*
 Wallet Intelligence Engine
 Detects dynamically:

 - Incoming transactions
 - ERC20 transfers
 - NFT transfers (ERC721 / ERC1155)
 - DeFi interactions (method signature detection)
 - Wallet risk scoring
 - Phishing contracts (MetaMask registry)
*/

/* ---------- EVENT SIGNATURE REGISTRY ---------- */

const EVENT_SIGNATURES = {
    ERC20_TRANSFER:
    "0xddf252ad00000000000000000000000000000000000000000000000000000000",

    ERC721_TRANSFER:
    "0xddf252ad00000000000000000000000000000000000000000000000000000000",

    ERC1155_TRANSFER_SINGLE:
    "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62",

    ERC1155_TRANSFER_BATCH:
    "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb"
                         }


/* ---------- DEFI METHOD SIGNATURE REGISTRY ---------- */

const DEFI_METHODS = {

  SWAP: [
    "0x38ed1739",
    "0x18cbafe5",
    "0x7ff36ab5"
  ],

  ADD_LIQUIDITY: [
    "0xe8e33700",
    "0xf305d719"
  ],

  REMOVE_LIQUIDITY: [
    "0xbaa2abde",
    "0x02751cec"
  ]

}

/* ---------- PHISHING REGISTRY SOURCE ---------- */

const PHISHING_REGISTRY_URL =
  "https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/main/src/config.json"

/* ---------- RISK ENGINE ---------- */

function calculateRiskScore(events: any[]) {

  let score = 0

  for (const e of events) {

    if (e.type === "phishing") score += 10
    if (e.type === "defi") score += 2
    if (e.type === "contract") score += 1
    if (e.type === "incoming") score -= 1

  }

  return score
}

/* ---------- COMPONENT ---------- */

export default function WalletTransactions() {

  const { address, chain } = useAccount()
  const config = useConfig()

  const [phishingList, setPhishingList] = useState<string[]>([])

  /* ---------- LOAD PHISHING LIST ---------- */

  useEffect(() => {

    async function loadRegistry() {

      try {

        const res = await fetch(PHISHING_REGISTRY_URL)
        const data = await res.json()

        if (data.blacklist) {

          setPhishingList(data.blacklist)

        }

      } catch {

        console.warn("Phishing registry unavailable")

      }

    }

    loadRegistry()

  }, [])

  /* ---------- MAIN BLOCK WATCHER ---------- */

  useEffect(() => {

    if (!address || !chain?.id) return

    const publicClient = getPublicClient(config, { chainId: chain.id })

    if (!publicClient) return

    console.log("Wallet Intelligence Engine active:", address)

    const unwatch = publicClient.watchBlocks({

      onBlock: async (block) => {

        try {

          const events: any[] = []

          const fullBlock = await publicClient.getBlock({
            blockHash: block.hash,
            includeTransactions: true
          })

          if (!fullBlock.transactions) return

          for (const tx of fullBlock.transactions) {

            const to = tx.to?.toLowerCase()
            const from = tx.from?.toLowerCase()

            /* ---------- INCOMING ---------- */

            if (to === address.toLowerCase()) {

              console.log("Incoming transaction", tx)

              events.push({ type: "incoming" })

            }

            /* ---------- OUTGOING ---------- */

            if (from === address.toLowerCase()) {

              console.log("Outgoing transaction", tx)

            }

            /* ---------- CONTRACT INTERACTION ---------- */

            if (tx.input && tx.input !== "0x") {

              console.log("Contract interaction", tx)

              events.push({ type: "contract" })

              const method = tx.input.slice(0, 10)

              for (const category of Object.values(DEFI_METHODS)) {

                if (category.includes(method)) {

                  console.log("DeFi interaction detected")

                  events.push({ type: "defi" })

                }

              }

            }

            /* ---------- PHISHING DETECTION ---------- */

            if (tx.to && phishingList.includes(tx.to)) {

              console.warn("⚠️ Phishing contract detected:", tx.to)

              events.push({ type: "phishing" })

            }

          }

          /* ---------- EVENT LOG SCANNER ---------- */

          const logs = await publicClient.getLogs({
            blockHash: block.hash
          })

          for (const log of logs) {

            if (!log.topics || log.topics.length === 0) continue

            const topic = log.topics[0]

            if (topic === EVENT_SIGNATURES.ERC20_TRANSFER) {

              console.log("ERC20 token transfer:", log.address)

            }

            if (topic === EVENT_SIGNATURES.ERC721_TRANSFER) {

              console.log("NFT transfer (ERC721):", log.address)

            }

            if (
              topic === EVENT_SIGNATURES.ERC1155_TRANSFER_SINGLE ||
              topic === EVENT_SIGNATURES.ERC1155_TRANSFER_BATCH
            ) {

              console.log("NFT transfer (ERC1155):", log.address)

            }

          }

          const riskScore = calculateRiskScore(events)

          console.log("Wallet Risk Score:", riskScore)

        } catch (err) {

          console.warn("Wallet intelligence error:", err)

        }

      }

    })

    return () => {

      if (unwatch) unwatch()

    }

  }, [address, chain?.id, config, phishingList])

  return null
}
