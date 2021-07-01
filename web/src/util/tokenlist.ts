import { TokenList, TokenInfo } from '@uniswap/token-lists';

const tokenListUrls = [
  'https://gateway.ipfs.io/ipns/tokens.uniswap.org',
  'https://www.gemini.com/uniswap/manifest.json',
];

// The default uniswap list has a bunch of tokens that don't even exist on uniswap v3 and thegraph price
// query then returns nothing. We therefore filter out coins that have data.
// Generated with code like this:
/*
      const tokenPriceMap = getTokenPrices(tokens.map((token) => token.address));
      const tokenPrices = await tokenPriceMap;
      console.log(tokens.filter(token => tokenPrices[token.address] === undefined || tokenPrices[token.address].derivedETH <= 0)
        .map(token => `'${token.address}', // ${token.symbol}\n`).reduce((str, item) => str + item, ""));
*/
const addressFilter = new Set(
  [
    '0xE41d2489571d322189246DaFA5ebDe1F4699F498', // ZRX
    '0xfF20817765cB7f73d4bde2e66e067E58D11095C2', // AMP
    '0x960b236A07cf122663c4303350609A66A7B288C0', // ANT
    '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
    '0xBA11D00c5f74255f56a5E366F4F77f5A186d7f55', // BAND
    '0x41e5560054824eA6B0732E656E3Ad64E20e94E45', // CVC
    '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd', // GUSD
    '0x85Eee30c52B0b379b046Fb0F85F4f3Dc3009aFEC', // KEEP
    '0xdd974D5C2e2928deA5F71b9825b8b646686BD200', // KNC
    '0xA4e8C3Ec456107eA67d3075bF9e3DF3A75823DB0', // LOOM
    '0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD', // LRC
    '0xec67005c4E498Ec7f55E092bd1d35cbC47C91892', // MLN
    '0x4fE83213D56308330EC302a8BD641f1d0113A4Cc', // NU
    '0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671', // NMR
    '0x45804880De22913dAFE09f4980848ECE6EcbAf78', // PAXG
    '0x408e41876cCCDC0F92210600ef50372656052a38', // REN
    '0x1985365e9f78359a9B6AD760e32412f4a445E862', // REP
    '0x221657776846890989a759BA2973e427DfF5C9bB', // REPv2
    '0x3845badAde8e6dFF049820680d1F14bD3903a5d0', // SAND
    '0x00c83aecc790e8a4453e5dd3b0b4b3680501a7a7', // SKL
    '0xB64ef51C888972c908CFacf59B47C1AfBC0Ab8aC', // STORJ
    '0x0AbdAce70D3790235af448C88547603b945604ea', // DNT
    '0x8dAEBADE922dF735c38C80C7eBD708Af50815fAa', // TBTC]);
  ].map((s) => s.toLowerCase())
);

export async function fetchTokens(): Promise<TokenInfo[]> {
  const results = [];
  for (const url of tokenListUrls) {
    results.push(fetch(url));
  }

  const tokens: TokenInfo[] = [];
  const addedTokens = new Set<string>();
  for (const result of results) {
    const response = await result;
    const tokenList: TokenList = await response.json();
    tokens.push(
      ...tokenList.tokens
        .filter(
          (token) =>
            token.chainId == 1 &&
            !addedTokens.has(token.address.toLowerCase()) &&
            !addressFilter.has(token.address.toLowerCase())
        )
        .map((token) => {
          addedTokens.add(token.address.toLowerCase());
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
  tokens.sort((a, b) => {
    const name1 = a.name;
    const name2 = b.name;
    if (name1 > name2) {
      return 1;
    }
    if (name1 < name2) {
      return -1;
    }
    return 0;
  });
  return tokens;
}
