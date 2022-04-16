class Transaction {
    constructor({
        dateTime = Date.now(),
        type= '-',
        sentQuantity = '',
        sentCurrency = '',
        sendingSource = '',
        receivedQuantity = '',
        receivedCurrency = '',
        receivingDestination = '',
        fee = '',
        feeCurrency = '',
        exchangeTransactionId = '',
        blockchainTransactionHash = ''
                }) {
        this['Date and Time'] = dateTime
        this['Transaction Type'] = type
        this['Sent Quantity'] = sentQuantity
        this['Sent Currency'] = sentCurrency
        this['Sending Source'] = sendingSource
        this['Received Quantity'] = receivedQuantity
        this['Received Currency'] = receivedCurrency
        this['Receiving Destination'] = receivingDestination
        this['Fee'] = fee
        this['Fee Currency'] = feeCurrency
        this['Exchange Transaction ID'] = exchangeTransactionId
        this['Blockchain Transaction Hash'] = blockchainTransactionHash
    }
}

module.exports = Transaction