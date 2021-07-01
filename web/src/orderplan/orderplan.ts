import { TokenData } from '@/util/tokens';
import { FixedNumber } from 'ethers';

export interface PlannedOrder {
  fromToken: TokenData;
  toToken: TokenData;
  sendAmount: FixedNumber;
}

export interface OrderPlanCreator {
  createPlan(
    currentPortfolio: TokenData[],
    desiredDistribution: Record<string, number>
  ): PlannedOrder[];
}

function fixedNum(n: number) {
  // This is the best way I could find, passing in number directly seems to always gives "underflow" error.
  return FixedNumber.from(n.toString());
}

/**
 * Very simple order plan: reduced tokens are sold to give inbetweenCurrency (typically WETH),
 * increased tokens are bought using the in between currency.
 */
class SimpleOrderPlanCreator implements OrderPlanCreator {
  private inbetweenCurrency: string;

  constructor(inbetweenCurrency: string) {
    this.inbetweenCurrency = inbetweenCurrency;
  }

  createPlan(
    currentPortfolio: TokenData[],
    desiredDistribution: Record<string, number>
  ): PlannedOrder[] {
    const orders: PlannedOrder[] = [];

    // Find the inbetweenCurrency
    const switchTokenData = currentPortfolio.find(
      (token) => token.id == this.inbetweenCurrency || token.name == this.inbetweenCurrency
    );
    if (!switchTokenData) {
      throw 'currentPortfolio must contain inbetweenCurrency data';
    }

    // Generate orders for all differences > 0.2%
    const DIFFERENCE_THRESHOLD = 0.2 / 100;

    let totalValue = 0.0;
    currentPortfolio.forEach((token) => {
      totalValue += token.ownedAmount.toUnsafeFloat() * token.value;
    });

    let valueSold = 0.0;

    const buyOrders: PlannedOrder[] = [];
    let valueBought = 0.0;
    // Check what we can sell
    currentPortfolio.forEach((token) => {
      const currentFraction = (token.ownedAmount.toUnsafeFloat() * token.value) / totalValue;
      const desiredFraction = (desiredDistribution[token.id] ?? 0.0) / 100;
      if (
        currentFraction - desiredFraction > DIFFERENCE_THRESHOLD &&
        token.id != switchTokenData.id
      ) {
        const sellFraction = currentFraction - desiredFraction;
        valueSold += sellFraction * totalValue;
        orders.push({
          fromToken: token,
          toToken: switchTokenData,
          sendAmount: fixedNum((sellFraction * totalValue) / token.value),
        });
      } else if (
        currentFraction - desiredFraction < -DIFFERENCE_THRESHOLD &&
        token.id != switchTokenData.id
      ) {
        const buyFraction = desiredFraction - currentFraction;
        valueBought += buyFraction * totalValue;
        buyOrders.push({
          fromToken: switchTokenData,
          toToken: token,
          sendAmount: fixedNum((buyFraction * totalValue) / switchTokenData.value),
        });
      }
    });

    if (
      valueBought >=
      valueSold + switchTokenData.ownedAmount.toUnsafeFloat() * switchTokenData.value
    ) {
      // We're trying to buy more than that we're selling (could be that some sell orders
      // don't happen because of the threshold)
      // Adjust the buys down so we can execute them all
      const adjustMultiplier =
        ((valueSold + switchTokenData.ownedAmount.toUnsafeFloat() * switchTokenData.value) * 0.99) /
        valueBought;
      buyOrders.forEach((order) => {
        orders.push({
          ...order,
          sendAmount: order.sendAmount.mulUnsafe(fixedNum(adjustMultiplier)),
        });
      });
    } else {
      orders.push(...buyOrders);
    }

    return orders;
  }
}

export const defaultOrderPlanner: OrderPlanCreator = new SimpleOrderPlanCreator('Wrapped Ether');
