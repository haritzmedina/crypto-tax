const Papa = require('papaparse')
const _ = require('lodash')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid');
const Transaction = require('../Transaction')

let ledgersCSVText = fs.readFileSync("input/ledgers-binance.csv", "utf8")
let ledgersData = Papa.parse(ledgersCSVText, {header: true})

let currencySolver = (currency) => {
    let currencies = {
        ZEUR: 'EUR',
        XXBT: 'BTC',
        XBT: 'BTC',
        XETH: 'ETH',
        ETH2: 'ETH',
        XXRP: 'XRP',
        XLTC: 'LTC',
        'DOT.S': 'DOT',
        'XBT.M': 'BTC',
        'KAVA.S': 'KAVA',
        'ATOM.S': 'ATOM',
        'ALGO.S': 'ALGO',
        'ADA.S': 'ADA',
        'SOL.S': 'SOL',
        'KSM.S': 'KSM'
    }
    if (currencies[currency]) {
        return currencies[currency]
    } else {
        return currency
    }
}

let isFiat = (currency) => {
    let fiatCurrencies = {
        'EUR': 'EUR',
        'USD': 'USD',
        'TRY': 'TRY'
    } // TODO To complete
    return !!fiatCurrencies[currencySolver(currency)];
}

// Group by date
let groupedData = _.values(_.groupBy(ledgersData.data, 'UTC_Time'))

// Deposits
let deposits = groupedData.filter(groupedElem => {
    return groupedElem.find(elem => elem['Operation'] === 'Deposit')
})
let transactionsDeposits = deposits.map((deposit) => {
    let depositElem = deposit.find(elem => elem['Operation'] === 'Deposit')
    return new Transaction({
        dateTime: new Date(depositElem['UTC_Time']+'+00:00').toISOString(),
        type: 'Transfer In',
        receivedQuantity: parseFloat(depositElem['Change']),
        receivedCurrency: currencySolver(depositElem['Coin']),
        receivingDestination: 'Binance',
        exchangeTransactionId: uuidv4()
    })
})

fs.writeFileSync('output/binance_deposit.csv', Papa.unparse(transactionsDeposits))

// Withdrawal
let withdrawals = groupedData.filter(groupedElem => {
    return groupedElem.find(elem => elem['Operation'] === 'Withdraw')
})
let transactionsWithdrawals = withdrawals.map((withdrawal) => {
    let withdrawElem = withdrawal.find(elem => elem['Operation'] === 'Withdraw')
    return new Transaction({
        dateTime: new Date(withdrawElem['UTC_Time']+'+00:00').toISOString(),
        type: 'Transfer Out',
        sentQuantity: parseFloat(withdrawElem['Change'])*-1,
        sentCurrency: currencySolver(withdrawElem['Coin']),
        sendingSource: 'Binance',
        exchangeTransactionId: uuidv4(),
        fee: 0, // TODO Fee is included
        feeCurrency: currencySolver(withdrawElem['Coin'])
    })
})

fs.writeFileSync('output/binance_withdrawal.csv', Papa.unparse(transactionsWithdrawals))

// Staking
let stakings = groupedData.filter(groupedElem => {
    return groupedElem.find(elem => elem['Operation'] === 'ETH 2.0 Staking Rewards' ||
        elem['Operation'] === 'POS savings interest' || elem['Operation'] === 'Savings Interest' ||
        elem['Operation'] === 'Liquid Swap rewards')
})
let transactionsStakings = stakings.map((staking) => {
    let stakingElem = staking.find(elem => elem['Operation'] === 'ETH 2.0 Staking Rewards' ||
        elem['Operation'] === 'POS savings interest' || elem['Operation'] === 'Savings Interest' ||
        elem['Operation'] === 'Liquid Swap rewards')
    return new Transaction({
        dateTime: new Date(stakingElem['UTC_Time']+'+00:00').toISOString(),
        type: 'Income',
        receivedQuantity: parseFloat(stakingElem['Change']).toFixed(8),
        receivedCurrency: currencySolver(stakingElem['Coin']),
        receivingDestination: 'Binance',
        exchangeTransactionId: uuidv4()
    })
})

fs.writeFileSync('output/binance_staking.csv', Papa.unparse(transactionsStakings))

//
let tradesMapParse = ({buy, sell, fee, feeDiscount, order = 'Buy'}) => {
    try {
        // Calc fee
        let feeQuantity = 0
        let feeCurrency = ''
        if (fee) {
            feeCurrency = fee['Coin']
            feeQuantity = parseFloat(fee['Change'])
            if (feeDiscount) {
                feeQuantity += parseFloat(feeDiscount['Change'])
            }
        }
        return new Transaction({
            dateTime: new Date(buy['UTC_Time']+'+00:00').toISOString(),
            type: order,
            sentQuantity: parseFloat(sell['Change']).toFixed(8)*-1,
            sentCurrency: currencySolver(sell['Coin']),
            sendingSource: 'Binance',
            receivedCurrency: currencySolver(buy['Coin']),
            receivedQuantity: buy['Change'],
            receivingDestination: 'Binance',
            fee: feeQuantity*-1,
            feeCurrency: currencySolver(feeCurrency),
            exchangeTransactionId: uuidv4()
        })
    } catch (e) {
        console.log(buy)
        console.log(sell)
        console.log(fee)
        console.log(feeDiscount)
    }
}

// Buy
let buys = groupedData.filter(groupedElem => {
    return groupedElem.find(elem => elem['Operation'] === 'Buy')
})

let doubleTrades = buys.filter(group => group.length > 4)
if (doubleTrades.length > 1) {
    console.warn('You have ' + doubleTrades.length + ' possible problematic trades done at the exact same time. Check them in file: double_trades.csv and change date to a one second more or less to solve the conflict.')
}

fs.writeFileSync('output/double_trades.csv', Papa.unparse(_.flatten(doubleTrades)))

// Get only buys using fiat
let fiatBuys = buys.filter(buyGroup => {
    return buyGroup.find(elem => (elem['Operation'] === 'Transaction Related' || (elem['Operation'] === 'Buy' && parseFloat(elem['Change']) < 0)) && isFiat(elem['Coin']))
})

let transactionsBuys = fiatBuys.map((buyGroup) => {
    let buy = buyGroup.find(elem => elem['Operation'] === 'Buy' && parseFloat(elem['Change']) > 0)
    let sell = buyGroup.find(elem => elem['Operation'] === 'Transaction Related' || (elem['Operation'] === 'Buy' && parseFloat(elem['Change']) < 0))
    let fee = buyGroup.find(elem => elem['Operation'] === 'Fee')
    let feeDiscount = buyGroup.find(elem => elem['Operation'] === 'Commission Fee Shared With You' || elem['Operation'] === 'Referral Kickback')
    return tradesMapParse({buy, sell, fee, feeDiscount})
})

fs.writeFileSync('output/binance_buy.csv', Papa.unparse(transactionsBuys))

// Sales
let sales = groupedData.filter(groupedElem => {
    return groupedElem.find(elem => elem['Operation'] === 'Sell')
})

// Get only sales using fiat
let fiatSales = sales.filter(saleGroup => {
    return saleGroup.find(elem => elem['Operation'] === 'Sell' && parseFloat(elem['Change']) > 0 && isFiat(elem['Coin']))
})

let transactionsSales = fiatSales.map((saleGroup) => {
    let buy = saleGroup.find(elem => elem['Operation'] === 'Sell' && parseFloat(elem['Change']) > 0)
    let sell = saleGroup.find(elem => elem['Operation'] === 'Sell' && parseFloat(elem['Change']) < 0)
    let fee = saleGroup.find(elem => elem['Operation'] === 'Fee')
    let feeDiscount = saleGroup.find(elem => elem['Operation'] === 'Commission Fee Shared With You' || elem['Operation'] === 'Referral Kickback')
    return tradesMapParse({buy, sell, fee, feeDiscount, order: 'Sale'})
})

fs.writeFileSync('output/binance_sale.csv', Papa.unparse(transactionsSales))

// Trades
let trades = buys.concat(sales).filter(tradeGroup => {
    let buysInTrade = tradeGroup.filter(elem => elem['Operation'] === 'Buy' || elem['Operation'] === 'Sell' || elem['Operation'] === 'Transaction Related')
    return _.every(buysInTrade, elem => !isFiat(elem['Coin']))
})

fs.writeFileSync('output/test.json', JSON.stringify(buys, null, 2))

let transactionsTrades = trades.map((buyGroup) => {
    let buy = buyGroup.find(elem => (elem['Operation'] === 'Buy' || elem['Operation'] === 'Sell') && parseFloat(elem['Change']) > 0)
    let sell = buyGroup.find(elem => elem['Operation'] === 'Transaction Related' || ((elem['Operation'] === 'Buy' || elem['Operation'] === 'Sell') && parseFloat(elem['Change']) < 0))
    let fee = buyGroup.find(elem => elem['Operation'] === 'Fee')
    let feeDiscount = buyGroup.find(elem => elem['Operation'] === 'Commission Fee Shared With You' || elem['Operation'] === 'Referral Kickback')
    return tradesMapParse({buy, sell, fee, feeDiscount, order: 'Trade'})
})

// BNB Small assets
let bnbTrades = groupedData.filter(groupedElem => {
    return groupedElem.find(elem => elem['Operation'] === 'Small assets exchange BNB')
})

let doubleTradesBnb = bnbTrades.filter(group => group.length > 2)
if (doubleTradesBnb.length > 1) {
    console.warn('You have ' + doubleTradesBnb.length + ' possible problematic trades done at the exact same time in BNB small assets. Check them in file: double_trades.csv and change date to a one second more or less to solve the conflict.')
}

fs.writeFileSync('output/double_trades.csv', Papa.unparse(_.flatten(doubleTradesBnb)))

let transactionsBNB = bnbTrades.map((buyGroup) => {
    let buy = buyGroup.find(elem => elem['Operation'] === 'Small assets exchange BNB' && parseFloat(elem['Change']) > 0)
    let sell = buyGroup.find(elem => elem['Operation'] === 'Small assets exchange BNB' && parseFloat(elem['Change']) < 0)
    return tradesMapParse({buy, sell, order: 'Trade'})
})

transactionsTrades = transactionsTrades.concat(transactionsBNB)

fs.writeFileSync('output/binance_trade.csv', Papa.unparse(transactionsTrades))

// TODO Expenses

// A file for all transactions
let allTransactions = _.concat(transactionsTrades, transactionsSales, transactionsBuys, transactionsStakings, transactionsDeposits, transactionsWithdrawals)
fs.writeFileSync('output/binance_all_taxbit.csv', Papa.unparse(allTransactions))
fs.writeFileSync('output/binance_all_koinly.csv', Papa.unparse(allTransactions.map(trans => trans.toKoinly())))

let usedTransactions = _.concat(deposits, withdrawals, stakings, _.flatten(buys), _.flatten(sales), _.flatten(trades))
let nonUsedTransactions = ledgersData.data.filter(elem => usedTransactions.includes(elem))

console.log(ledgersData.data.length)
console.log(nonUsedTransactions.length)
console.log(usedTransactions.length)

fs.writeFileSync('output/non_used_transactions.csv', Papa.unparse(nonUsedTransactions))
