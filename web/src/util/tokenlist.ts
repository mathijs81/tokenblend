
import { TokenList, TokenInfo } from '@uniswap/token-lists'

const tokenListUrls = ['https://gateway.ipfs.io/ipns/tokens.uniswap.org'];

export async function fetchTokens(): Promise<TokenInfo[]> {
    const results = [];
    for (const url of tokenListUrls) {
        results.push(fetch(url));
    }

    const tokens: TokenInfo[] = [];
    for (const result of results) {
        const response = await result;
        const tokenList: TokenList = await response.json();
        tokens.push(...tokenList.tokens.filter(token => token.chainId == 1).map(token => {
            if (token.logoURI && token.logoURI.includes("ipfs://")) {
                return {
                    ...token,
                    logoURI: token.logoURI.replace("ipfs://", "https://gateway.ipfs.io/ipfs/")
                }

            } else {
                return token;
            }
        }));
    }
    return tokens;
}