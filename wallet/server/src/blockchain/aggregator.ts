export interface AggregatedToken {
  type: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  logo: string | null;
  contract: string;
}

const COVALENT_BASE = 'https://api.covalenthq.com';
const MORALIS_BASE = 'https://deep-index.moralis.io';

export async function fetchFromCovalent(chainId: number, address: string): Promise<AggregatedToken[]> {
  try {
    const key = process.env.COVALENT_RPC_KEY;
    if (!key) return [];
    const res = await fetch(`${COVALENT_BASE}/${chainId}/address/${address}/balances_v2/?key=${key}`);
    const json = await res.json();
    return (json.data?.items || []).filter((t: any) => t.balance !== "0").map((t: any) => ({
      type: 'erc20',
      symbol: t.contract_ticker_symbol,
      name: t.contract_name,
      balance: t.balance,
      decimals: t.contract_decimals,
      logo: t.logo_url,
      contract: t.contract_address
    }));
  } catch { return []; }
}

export async function fetchFromMoralis(address: string, chain: string): Promise<AggregatedToken[]> {
  try {
    const key = process.env.MORALIS_RPC_KEY;
    if (!key) return [];
    const res = await fetch(`${MORALIS_BASE}/${address}/erc20?chain=${chain}`, {
      headers: { 'X-API-Key': key }
    });
    const json = await res.json();
    return (json || []).map((t: any) => ({
      type: 'erc20',
      symbol: t.symbol,
      name: t.name,
      balance: t.balance,
      decimals: t.decimals,
      logo: t.thumbnail,
      contract: t.token_address
    }));
  } catch { return []; }
}
