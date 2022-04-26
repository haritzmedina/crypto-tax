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

    toTaxBit () {
        return this
    }

    toKoinly () {
        return {
            'Date': this['Date and Time'],
            'Sent Amount': this['Sent Quantity'],
            'Sent Currency': this['Sent Currency'],
            'Received Amount': this['Received Quantity'],
            'Received Currency': this['Received Currency'],
            'Fee Amount': this['Fee'],
            'Fee Currency': this['Fee Currency'],
            'Net Worth Amount': '', // TODO
            'Net Worth Currency': '', // TODO
            'Label' : this['Transaction Type'],
            'Description': this['Transaction Type'] + ' from ' + this['Sending Source'] + ' to ' + this['Receiving Destination'],
            'TxHash': this['Exchange Transaction ID']
        }
    }
}

module.exports = Transaction