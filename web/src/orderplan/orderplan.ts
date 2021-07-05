import { TokenData } from '@/util/tokens';
import { FixedNumber } from 'ethers';
import { fixedNum } from '@/util/numbers';

export enum OrderType {
  SWAP,
  DEPOSIT,
  REDEEM,
}

export interface PlannedOrder {
  fromToken: TokenData;
  toToken: TokenData;
  sendAmount: FixedNumber;
  ordertype: OrderType;
}

export interface OrderPlanCreator {
  createPlan(
    currentPortfolio: TokenData[],
    desiredDistribution: Record<string, number>
  ): PlannedOrder[];
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
      if (currentFraction - desiredFraction > DIFFERENCE_THRESHOLD) {
        const sellFraction = currentFraction - desiredFraction;
        valueSold += sellFraction * totalValue;
        let amount = fixedNum((sellFraction * totalValue) / token.value);
        if (desiredFraction < 1e-6) {
          amount = token.ownedAmount;
        }
        if (token.id != switchTokenData.id) {
          orders.push({
            fromToken: token,
            toToken: switchTokenData,
            sendAmount: amount,
            ordertype: OrderType.SWAP,
          });
        }
      } else if (currentFraction - desiredFraction < -DIFFERENCE_THRESHOLD) {
        const buyFraction = desiredFraction - currentFraction;
        valueBought += buyFraction * totalValue;
        if (token.id != switchTokenData.id) {
          buyOrders.push({
            fromToken: switchTokenData,
            toToken: token,
            sendAmount: fixedNum((buyFraction * totalValue) / switchTokenData.value),
            ordertype: OrderType.SWAP,
          });
        }
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
