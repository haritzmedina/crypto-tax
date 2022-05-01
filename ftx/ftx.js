const Papa = require('papaparse')
const _ = require('lodash')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid');
const Transaction = require('../Transaction')

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

// Deposits
let depositsCSVText = fs.readFileSync("input/ftx-deposits.csv", "utf8")
let deposits = Papa.parse(depositsCSVText, {header: true})

let transactionsDeposits = deposits.data.map((deposit) => {
    if (deposit['Status'] === 'complete' || deposit['Status'] === 'confirmed') {
        return new Transaction({
            dateTime: deposit['Time'],
            type: 'Transfer In',
            receivedQuantity: parseFloat(deposit['Amount']),
            receivedCurrency: currencySolver(deposit['Coin']),
            receivingDestination: 'FTX',
            exchangeTransactionId: uuidv4()
        })
    }
})
transactionsDeposits = _.compact(transactionsDeposits)

fs.writeFileSync('output/ftx_deposit.csv', Papa.unparse(transactionsDeposits))

// Withdrawal
let withdrawalsCSVText = fs.readFileSync("input/ftx-withdrawals.csv", "utf8")
let withdrawals = Papa.parse(withdrawalsCSVText, {header: true})

let transactionsWithdrawals = withdrawals.data.map((withdrawal) => {
    return new Transaction({
        dateTime: withdrawal['Time'],
        type: 'Transfer Out',
        sentQuantity: parseFloat(withdrawal['Amount']),
        sentCurrency: currencySolver(withdrawal['Coin']),
        sendingSource: 'FTX',
        exchangeTransactionId: uuidv4(),
        fee: withdrawal['fee'], // TODO Fee is included
        feeCurrency: currencySolver(withdrawal['Coin']),
        blockchainTransactionHash: withdrawal['Transaction ID']
    })
})

fs.writeFileSync('output/ftx_withdrawal.csv', Papa.unparse(transactionsWithdrawals))

// Staking
let stakingsCSVText = fs.readFileSync("input/ftx-staking.csv", "utf8")
let stakings = Papa.parse(stakingsCSVText, {header: true})

let transactionsStakings = stakings.data.map((staking) => {
    return new Transaction({
        dateTime: staking['Time'],
        type: 'Income',
        receivedQuantity: parseFloat(staking['Reward']).toFixed(8),
        receivedCurrency: currencySolver(staking['Coin']),
        receivingDestination: 'FTX',
        exchangeTransactionId: uuidv4()
    })
})

fs.writeFileSync('output/ftx_staking.csv', Papa.unparse(transactionsStakings))

// Buy
/*
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
    return groupedElem.find(elem => elem['Operation'] === 'Buy')
})

// Get only buys using fiat
let fiatSales = sales.filter(saleGroup => {
    return saleGroup.find(elem => elem['Operation'] === 'Buy' && parseFloat(elem['Change']) > 0 && isFiat(elem['Coin']))
})

let transactionsSales = fiatSales.map((buyGroup) => {
    let buy = buyGroup.find(elem => elem['Operation'] === 'Buy' && parseFloat(elem['Change']) > 0)
    let sell = buyGroup.find(elem => elem['Operation'] === 'Transaction Related' || (elem['Operation'] === 'Buy' && parseFloat(elem['Change']) < 0))
    let fee = buyGroup.find(elem => elem['Operation'] === 'Fee')
    let feeDiscount = buyGroup.find(elem => elem['Operation'] === 'Commission Fee Shared With You' || elem['Operation'] === 'Referral Kickback')
    return tradesMapParse({buy, sell, fee, feeDiscount})
})

fs.writeFileSync('output/binance_sale.csv', Papa.unparse(transactionsSales))

// Trades
let trades = buys.filter(tradeGroup => {
    let buysInTrade = tradeGroup.filter(elem => elem['Operation'] === 'Buy' || elem['Operation'] === 'Transaction Related')
    return _.every(buysInTrade, elem => !isFiat(elem['Coin']))
})

fs.writeFileSync('output/test.json', JSON.stringify(buys, null, 2))

let transactionsTrades = trades.map((buyGroup) => {
    let buy = buyGroup.find(elem => elem['Operation'] === 'Buy' && parseFloat(elem['Change']) > 0)
    let sell = buyGroup.find(elem => elem['Operation'] === 'Transaction Related' || (elem['Operation'] === 'Buy' && parseFloat(elem['Change']) < 0))
    let fee = buyGroup.find(elem => elem['Operation'] === 'Fee')
    let feeDiscount = buyGroup.find(elem => elem['Operation'] === 'Commission Fee Shared With You' || elem['Operation'] === 'Referral Kickback')
    return tradesMapParse({buy, sell, fee, feeDiscount})
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
    return tradesMapParse({buy, sell})
})

transactionsTrades = transactionsTrades.concat(transactionsBNB)

fs.writeFileSync('output/binance_trade.csv', Papa.unparse(transactionsTrades))

// TODO Expenses

// A file for all transactions
let allTransactions = _.concat(transactionsTrades, transactionsSales, transactionsBuys, transactionsStakings, transactionsDeposits, transactionsWithdrawals)
fs.writeFileSync('output/binance_all_taxbit.csv', Papa.unparse(allTransactions))
fs.writeFileSync('output/binance_all_koinly.csv', Papa.unparse(allTransactions.map(trans => trans.toKoinly())))
*/