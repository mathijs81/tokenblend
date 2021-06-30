import { TokenList, TokenInfo } from '@uniswap/token-lists';

const tokenListUrls = ['https://gateway.ipfs.io/ipns/tokens.uniswap.org'];

// The default uniswap list has a bunch of tokens that don't even exist on uniswap v3 and thegraph price
// query then returns nothing. We therefore filter coins that have data.
// Generated with code like this:
/*
      const tokenPriceMap = getTokenPrices(tokens.map((token) => token.address));
      const tokenPrices = await tokenPriceMap;
       console.log(Object.values(tokenPrices).filter(token => token !== undefined && token.derivedETH > 0).map(token => `'${token.id}', // ${token.symbol}\n`).reduce((str, item) => str + item, ""));
*/
const addressFilter = new Set([
  ']0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // AAVE
  '0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c', // BNT
  '0xc00e94cb662c3520282e6f5717214004a7f26888', // COMP
  '0xd533a949740bb3306d119cc777fa900ba034cd52', // CRV
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0x6810e776880c02933d47db1b9fc05908e5386b96', // GNO
  '0xc944e90c64b2c07662a292be6244bdf05cda44a7', // GRT
  '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
  '0x0f5d2fb29fb7d3cfee444a200298f468908cc942', // MANA
  '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', // MKR
  '0x4575f41308ec1483f3d399aa9a2826d74da13deb', // OXT
  '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f', // SNX
  '0x04fa0d235c4abf4bcf4787af4cf447de572ef828', // UMA
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e', // YFI
]);

export async function fetchTokens(): Promise<TokenInfo[]> {
  const results = [];
  for (const url of tokenListUrls) {
    results.push(fetch(url));
  }

  const tokens: TokenInfo[] = [];
  for (const result of results) {
    const response = await result;
    const tokenList: TokenList = await response.json();
    tokens.push(
      ...tokenList.tokens
        .filter((token) => token.chainId == 1 && addressFilter.has(token.address.toLowerCase()))
        .map((token) => {
          if (token.logoURI && token.logoURI.includes('ipfs://')) {
            return {
              ...token,
              logoURI: token.logoURI.replace('ipfs://', 'https://gateway.ipfs.io/ipfs/'),
            };
          } else {
            return token;
          }
        })
    );
  }
  return tokens;
}
