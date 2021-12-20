import { Injectable } from "@nestjs/common"
import BinanceNode, { Binance, CandleChartResult } from 'binance-api-node'
import { timeStamp } from "console";
import Configs from "./configs";

export type TrendUpDown = 'up' | 'down'

interface HistoricalOrder {
    orderPrice: number
    orderVolume: number
    timeStamp: number
    targetBestBid: number
    hasFulfilled: boolean

    fulfilledPrice: number
    fulfilledTimeStamp: number

    feeBuy: number
    feeSell: number

    // For tracking and analysis
    tradeMargin?: number
    ageMins?: number
    fulfillmentTimeMins?: number

    profitLoss?: number
}

interface HistoricalRecord {
    eventTime: number
    bestBid: number
    bestBidQnt: number
    bestAsk: number
    bestAskQnt: number
    trend: TrendUpDown

    // If the simulation purchased an order
    simulatedPurchasePrice: number

    // target best bid. This is how much the price would need
    // to be to sell & make profit
    targetBestBid: number

    // Volume of currency needed to be bought from 
    // the order book to lift the price to the target best bid
    buyWallVolume: number


}

interface IVeruBehaviour {
    TREND_SAMPLE_FREQUENCY_SECONDS: number
    TREND_TO_BUY: TrendUpDown[]

    MINIMUM_PROFIT: number,

    // Size of order
    BET_SIZE_BTC: number

    // When to sell
    STOP_LOSS_PERCENTAGE: number,
    STOP_LOSS_AGE_MINS: number,

    // Typical spread of target order book
    ENV_TYPICAL_SPREAD: number,

    // Fee for a market taker order
    ENV_TAKER_FEE_PERCENT: number,
    ENV_INFO_LOG: boolean,
    ENV_SIMULATION_LENGTH_DAYS: number,
    ENV_SIMULATION_AGE_DAYS: number,

}

const VeruBehaviour: IVeruBehaviour = {
    TREND_SAMPLE_FREQUENCY_SECONDS: 5, // * 60,
    TREND_TO_BUY: ['down', 'down', 'up'],

    BET_SIZE_BTC: 0.003,

    // When to sell
    STOP_LOSS_PERCENTAGE: 0.05,
    STOP_LOSS_AGE_MINS: 60 * 3,

    // USD
    MINIMUM_PROFIT: 2.50,


    // Environment settings

    ENV_TYPICAL_SPREAD: 0.000001,
    ENV_TAKER_FEE_PERCENT: 0.0075,

    ENV_INFO_LOG: false,

    ENV_SIMULATION_AGE_DAYS: 1,
    ENV_SIMULATION_LENGTH_DAYS: 3,
}

@Injectable()
export default class BinanceService {

    private tickerStore: HistoricalRecord[] = []
    private recordStore: HistoricalRecord[] = []
    private ordersStore: HistoricalOrder[] = []

    private _binance: Binance
    private tickerCountSeconds = VeruBehaviour.TREND_SAMPLE_FREQUENCY_SECONDS

    async backTest() {

        // Fetch historical data:

        const startDate = new Date()
        startDate.setHours(2,6,4,0) // Don't have bot on a predicable 'on the hour'

        const lengthDays = VeruBehaviour.ENV_SIMULATION_LENGTH_DAYS

        let data: CandleChartResult[] = []

        let dayCounter = VeruBehaviour.ENV_SIMULATION_AGE_DAYS

        process.stdout.write(`\nLoading data`)

        let counter = 1
        while (counter <= lengthDays) {

            const seriesStart = startDate.getTime() - (dayCounter * 24 * 3600 * 1000)
            const seriesFinish = startDate.getTime() - ((dayCounter-1) * 24 * 3600 * 1000)
            
            // console.log(`[${dayCounter}] seriesStart:`, new Date(seriesStart))
            // console.log(`[${dayCounter}] seriesFinish:`, new Date(seriesFinish))
            // console.log(`--------`)

            const dayData = await this.binance.candles({
                symbol: 'BTCUSDT',
                interval: '1m',
                startTime: seriesStart,
                endTime: seriesFinish,
            })
    
            data.unshift(...dayData)

            dayCounter = dayCounter + 1
            counter = counter + 1

            process.stdout.write(`.`)
            // console.log(`[${dayCounter}] Adding ${dayData.length} to a total of ${data.length} data points`)
        }
        process.stdout.write(`done, populated ${data.length} records\n`)
        
        data.forEach((historicalDataPoint) => {
            const estimatedPrice = (parseFloat(historicalDataPoint.low) + parseFloat(historicalDataPoint.low)) / 2
            const record: HistoricalRecord = {
                eventTime: historicalDataPoint.openTime,
                bestBid: parseFloat(historicalDataPoint.low) - 5,
                bestBidQnt: 0,
                bestAsk: parseFloat(historicalDataPoint.low),
                bestAskQnt: 0,
                trend: this.calculateTrend(estimatedPrice),
                targetBestBid: this.calculateTargetBestBid(parseFloat(historicalDataPoint.high)),
                buyWallVolume: 0,
                simulatedPurchasePrice: parseFloat(historicalDataPoint.high),
            }
            this.processTicker(record)
        })

        const successfulOrders = this.ordersStore.filter((o) => o.profitLoss > 0)
        const completedOrders = this.ordersStore.filter((o) => o.hasFulfilled)
        const outstandingOrders = this.ordersStore.filter((o) => !o.hasFulfilled)

        const profitLoss = completedOrders.reduce((a, b) => {
            return {
                ... a,
                profitLoss: a.profitLoss + b.profitLoss
            }
        })

        console.log(`=== back testing complete ===`)
        console.log(``)
        console.log(`Success rate: \t\t ${successfulOrders.length / completedOrders.length * 100}`)
        console.log(``)
        console.log(`Orders made: \t\t ${this.ordersStore.length}`)
        console.log(`Orders completed: \t ${completedOrders.length}`)
        console.log(`Orders pending: \t ${outstandingOrders.length}`)
        console.log(`Orders success: \t ${successfulOrders.length}`)
        console.log(``)
        console.log(`Data points \t\t ${data.length}`)
        console.log(`Start date \t\t ${new Date(this.tickerStore[0].eventTime)}`)
        console.log(`End date \t\t ${new Date(this.tickerStore[this.tickerStore.length-1].eventTime)}`)
        console.log(``)
        console.log(`Profit made \t\t ${profitLoss.profitLoss.toPrecision(2)} $USD`)

        console.log(``)
        return
        console.log(`Orders:`)
        this.ordersStore.forEach((order) => {
            const niceDate = new Date(order.timeStamp).toISOString().replace(/T/, ' ').replace(/\..+/, '')
            const orderFees = order.feeBuy + order.feeSell
            console.log(`${niceDate}, ${order.orderPrice.toPrecision(7)}, ${order.fulfilledPrice.toPrecision(7)}, ${order.fulfillmentTimeMins.toPrecision(4)}mins, ${order.tradeMargin}, \t ${(order.profitLoss|| 0).toPrecision(4)}`)
        })
    }

    startWatching() {

        this.binance.ws.ticker('BTCUSDT', async ticker => {

            const record: HistoricalRecord = {
                eventTime: ticker.eventTime,
                bestBid: parseFloat(ticker.bestBid),
                bestBidQnt: parseFloat(ticker.bestBidQnt),
                bestAsk: parseFloat(ticker.bestAsk),
                bestAskQnt: parseFloat(ticker.bestAskQnt),
                trend: this.calculateTrend(parseFloat(ticker.bestAsk)),

                simulatedPurchasePrice: parseFloat(ticker.bestAsk),

                targetBestBid: this.calculateTargetBestBid(parseFloat(ticker.bestAsk)),
                buyWallVolume: 0,
            }

            this.processTicker(record)
        })
    }

    processTicker(record: HistoricalRecord) {
        // Get data on the order book
        // const orderBook = await this.binance.book({ symbol: 'BTCUSDT' })
        // let volumeFullfilledToWin: 
        // console.log(orderBook)

        this.tickerStore.push(record)

        this.simulateSellOrders(record.bestAsk, record.eventTime)

        if (this.shouldRecordTicker()) {
            this.recordStore.push(record)
            // console.log(record)
            this.processStep()
        }
    }

    shouldRecordTicker() {
        if (this.tickerCountSeconds >= VeruBehaviour.TREND_SAMPLE_FREQUENCY_SECONDS) {
            this.tickerCountSeconds = 1
            return true
        } else {
            this.tickerCountSeconds += 1
            return false
        }
    }

    private get binance() {
        if (!this._binance) {
            this._binance = BinanceNode({
                apiKey: Configs.BINANCE_API_KEY,
                apiSecret: Configs.BINANCE_API_SECRET,
                // getTime: xxx,
            })
        }
        return this._binance
    }

    calculateTrend(latestBestAsk: number): TrendUpDown {
        if (this.recordStore.length) {
            return latestBestAsk >= this.recordStore[this.recordStore.length - 1].bestAsk
                ? 'up'
                : 'down'
        }
        return 'down'
    }

    calculateTargetBestBid(currentBestAsk: number): number {

        const orderVolumeBTC = VeruBehaviour.BET_SIZE_BTC
        const orderVolumeUSD = currentBestAsk * orderVolumeBTC

        const feeBuyUSD = orderVolumeUSD * VeruBehaviour.ENV_TAKER_FEE_PERCENT
        const usdIncreaseNeeded = VeruBehaviour.MINIMUM_PROFIT + (feeBuyUSD * 2)

        const percentageIncreaseNeeded = (orderVolumeUSD + usdIncreaseNeeded) / orderVolumeUSD / 100

        const targetSellPrice = currentBestAsk + (currentBestAsk * percentageIncreaseNeeded)

        return targetSellPrice
    }

    placeOrder(
        timeStamp: number,
        orderPrice: number,
        orderVolume: number,
        targetBestBid: number,
    ) {
        const usdAmount = orderPrice * orderVolume
        const order: HistoricalOrder = {
            timeStamp,
            orderPrice,
            orderVolume,
            targetBestBid,
            hasFulfilled: false,
            fulfilledPrice: 0,
            fulfilledTimeStamp: 0,
            feeBuy: usdAmount * VeruBehaviour.ENV_TAKER_FEE_PERCENT,
            feeSell: 0,
        }

        this.ordersStore.push(order)

        VeruBehaviour.ENV_INFO_LOG && console.log('placed order', order)
    }

    simulateSellOrders(currentBestAsk: number, timeStamp: number) {

        let soldAndOrder = false
        this.ordersStore = this.ordersStore.map((order) => {

            if (!order.hasFulfilled) {

                const fulfillmentTimeMs = (timeStamp - order.timeStamp)
                const fulfillmentTimeMins = Math.floor((fulfillmentTimeMs/1000)/60)
                const percentageGain = (currentBestAsk - order.orderPrice) / order.orderPrice

                const margin = currentBestAsk - order.orderPrice
                const tradeMargin = Number((margin * order.orderVolume).toPrecision(2))

                let willSellOrder = currentBestAsk >= order.targetBestBid

                // currentBestAsk < order.orderPrice
                if (!willSellOrder) {
                    // If price hasn't been met and price is lower, check for stop loss
                    const hasMetMaxAge = fulfillmentTimeMins > VeruBehaviour.STOP_LOSS_AGE_MINS
                    const hasMetStopLoss = percentageGain < (-VeruBehaviour.STOP_LOSS_PERCENTAGE)

                    // console.log(`fulfillmentTimeMins: ${fulfillmentTimeMins}`, VeruBehaviour.STOP_LOSS_AGE_MINS)

                    if (hasMetMaxAge || hasMetStopLoss) {
                        //console.log('STOP LOSS MET', percentageGain, margin)
                        willSellOrder = true
                    }
                }

                if (!willSellOrder) {
                    return {
                        ...order,
                        fulfillmentTimeMins,
                    }
                }
                
                if (willSellOrder) {

                    

                    VeruBehaviour.ENV_INFO_LOG && console.log(`Order has been completed:`, {
                        'purchase price:': order.orderPrice,
                        'sold price:': currentBestAsk,
                        'percentage gain': percentageGain,
                        'gained btc': order.orderVolume * percentageGain,
                        'gained usd': currentBestAsk * (order.orderVolume * percentageGain),
                    })

                    soldAndOrder = true


                    const feeSell = (currentBestAsk * order.orderVolume) * VeruBehaviour.ENV_TAKER_FEE_PERCENT
                    
                    const profitLoss = tradeMargin - order.feeBuy - order.feeSell

                    return {
                        ...order,
                        hasFulfilled: true,
                        fulfilledPrice: currentBestAsk,
                        fulfilledTimeStamp: timeStamp,
                        tradeMargin,
                        fulfillmentTimeMins,
                        feeSell,
                        profitLoss,
                    }
                }
            }

            return {
                ...order,
            }
        })

    }

    processStep() {

        const requiredHistoryDepth = VeruBehaviour.TREND_TO_BUY.length

        if (this.recordStore.length < requiredHistoryDepth) {
            VeruBehaviour.ENV_INFO_LOG && console.warn(`Not enough historical records to decide. Need ${requiredHistoryDepth - this.recordStore.length} more`)
            return
        }

        // console.log(`Check if the trend matches ${this.recordStore.length} historical records`)

        let trendMatchPosition = VeruBehaviour.TREND_TO_BUY.length - 1
        let trendMet = true
        for (let index = this.recordStore.length - 1; index >= this.recordStore.length - requiredHistoryDepth; index--) {

            // console.log(`this.recordStore[${index}].trend: ${this.recordStore[index].trend}, VeruBehaviour.TREND_TO_BUY[${trendMatchPosition}]: ${VeruBehaviour.TREND_TO_BUY[trendMatchPosition]}`)
            if (this.recordStore[index].trend !== VeruBehaviour.TREND_TO_BUY[trendMatchPosition]) {
                trendMet = false
                break
            }

            trendMatchPosition--
        }

        if (!trendMet) {
            return
        }

        VeruBehaviour.ENV_INFO_LOG && console.log(`Ticker count [${this.tickerStore.length}] Price trend has been met! 🎉`)

        const latestUpRecord = this.recordStore[this.recordStore.length - 1]

        // Check that the price wasn't better between the up and last down

        const latestDownRecord = this.recordStore[this.recordStore.length - 2]

        let foundHigherPrice = false
        let searchPosition = -1
        while (true) {
            const tickerRecord = this.tickerStore[this.tickerStore.length + searchPosition]

            if (tickerRecord.eventTime < latestDownRecord.eventTime) {
                break
            }

            if (tickerRecord.bestAsk > latestUpRecord.bestAsk) {
                VeruBehaviour.ENV_INFO_LOG && console.log('Had a better record between this up and last down')
                //foundHigherPrice = true
                break
            }
            searchPosition = searchPosition - 1
        }

        if (foundHigherPrice) {
            return
        }

        this.placeOrder(
            latestUpRecord.eventTime,
            latestUpRecord.simulatedPurchasePrice,
            VeruBehaviour.BET_SIZE_BTC,
            latestUpRecord.targetBestBid,
        )
    }
}