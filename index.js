require('dotenv').config();
const {Harmony}                 = require('@harmony-js/core');
const {BN}                      = require('@harmony-js/crypto');
const {HttpProvider, Messenger} = require('@harmony-js/network');
const {Account}                 = require('@harmony-js/account');
const {
          ChainID,
          ChainType,
          hexToNumber,
          fromWei,
          Units,
      }                         = require('@harmony-js/utils');
const artifact                  = require('./artifact.json');
const {BigNumber}               = require('bignumber.js');
const Discord                   = require('discord.js');
const Sequelize                 = require('sequelize');
const CryptoJS                  = require('crypto-js');
const moment                    = require('moment');
const bot                       = new Discord.Client();
const token                     = process.env.TOKEN;

/* DB Connection information */
const sequelize = new Sequelize('database', 'user', 'password', {
    host   : process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    storage: process.env.DB_STORAGE,
    logging: false,
});

/* Creating the model */
const wallets = sequelize.define('wallets', {
    user      : {
        type     : Sequelize.STRING,
        unique   : true,
        allowNull: false,
    },
    address   : {
        type     : Sequelize.STRING,
        unique   : true,
        allowNull: false,
    },
    privateKey: {
        type     : Sequelize.STRING,
        allowNull: false,
    },
});

const hmy = new Harmony(
    'https://api.s0.t.hmny.io/',
    {
        chainType: ChainType.Harmony,
        chainId  : ChainID.HmyMainnet,
    },
);

/* Bot login */
bot.login(token);

/* Bot ready */
bot.on('ready', () => {
    wallets.sync();
    console.info(`Logged in as ${bot.user.tag}!`);
});

/* Message event */
bot.on('message', message => {
    const prefix         = process.env.MESSAGE_PREFIX;
    const publicPrefix   = process.env.MESSAGE_PUBLIC_PREFIX;
    const currencySymbol = process.env.CURRENCY_SYMBOL;

    if (message.author.bot || !message.content.startsWith(prefix)) {
        return;
    }

    if (message.content === prefix + 'test') {
        //
    }

    /***************************************************************/
    /* Help command
    /***************************************************************/

    /**
     * @name Help
     *
     * @example !help
     * @description List all the commandos
     */
    if (message.content === prefix + 'help' || message.content === publicPrefix + 'help') {
        message.author.send(
            `**${currencySymbol} Bot commands**\n` +
            `Direct message commands` +
            '```\n' +
            `!deposit \n` +
            `Shows your account address \n\n` +
            `!balance \n` +
            `Shows your account ${currencySymbol} balance \n\n` +
            `!gasbalance \n` +
            `Shows your account ONE balance \n\n` +
            `!send 100 0x89y9238jhu283h9 \n` +
            `Send Nano to an external address. \n\n` +
            `!sendmax 0x89y9238jhu283h9 \n` +
            `Send all of your Nano to an external address. \n` +
            '```\n' +
            `Public commands` +
            '```\n' +
            `!ftip 100 @user1\n` +
            `Send a tip to mentioned users\n\n` +
            `!ftipsplit 100 @user1 @user2\n` +
            `Split a tip among mentioned users\n\n` +
            `!ftiprandom 100\n` +
            `Tip an active user at random. (past x minutes activity)\n\n` +
            `!frain 100\n` +
            `Distribute a tip amount amongst active users (past x minutes activity)\n\n` +
            `!ftipstats\n` +
            `Display your personal tipping stats\n\n` +
            '```'
        );
    }

    /***************************************************************/
    /* Public commands
    /***************************************************************/

    if (message.channel.type === 'text') {

        /**
         * @name Tip
         *
         * @example !ftip 100 @user1
         * @description Send a tip to mentioned users
         */
        if (message.content.startsWith(publicPrefix + 'tip ')) {
            if (message.mentions.users.size) {
                const receiver = message.mentions.users.first();
                const amount   = message.content.match(/tip\s(?<amount>[0-9]+)\s<@/).groups.amount;

                if (getBalance(message.author.id) >= amount) {
                    makeTransaction(getUserAddress(message.author.id), getUserAddress(receiver.id), amount);

                    reactSuccess();
                } else {
                    reactError(`Insufficient funds!`);
                }
            } else {
                reactError(`Please tag a valid user!`)
            }
        }

        /**
         * @name Tip split
         *
         * @example !ftipsplit 100 @user1 @user2
         * @description Split a tip among mentioned users
         */
        if (message.content.startsWith(publicPrefix + 'tipsplit ')) {
            if (message.mentions.users.size) {
                const receivers = message.mentions.users;
                let amount      = message.content.match(/tipsplit\s(?<amount>[0-9]+)\s<@/).groups.amount;

                if (getBalance(message.author.id) >= amount) {
                    amount = (amount / receivers.size);

                    receivers.forEach(function (receiver) {
                        makeTransaction(getUserAddress(message.author.id), getUserAddress(receiver.id), amount);
                    });

                    reactSuccess();
                } else {
                    reactError(`Insufficient funds!`);
                }
            } else {
                reactError(`Please tag a valid user!`)
            }
        }

        /**
         * @name Tip random
         *
         * @example !ftiprandom 100
         * @description Tip an active user at random. (past x minutes activity)
         */
        if (message.content.startsWith(publicPrefix + 'tiprandom ')) {
            const amount = message.content.match(/tiprandom\s(?<amount>[0-9]+)/).groups.amount;
            const time   = moment().subtract(15, 'minutes').valueOf();

            message.channel.fetchMessages({after: time}).then(function (lastMessages) {
                let receivers = [];
                lastMessages.forEach(function (lastMessage) {
                    let add = true;

                    if (lastMessage.author.id === message.author.id) {
                        add = false;
                    }

                    if (!userHasWallet(lastMessage.author.id)) {
                        add = false;
                    }

                    if (lastMessage.author.bot) {
                        add = false;
                    }

                    if (add) {
                        receivers.push(lastMessage.author);
                    }
                });

                const receiver = receivers[Math.floor(Math.random() * receivers.length)];
                makeTransaction(getUserAddress(message.author.id), getUserAddress(receiver.id), amount);

                receiver.send(`@${message.author.username} sent you ${amount} XYA. Spend it wisely`);
            });
        }

        /**
         * @name Rain
         *
         * @example !frain 100
         * @description Distribute a tip amount amongst active users (past x minutes activity)
         */
        if (message.content.startsWith(publicPrefix + 'rain')) {
            const time   = moment().subtract(15, 'minutes').valueOf();
            const amount = message.content.match(/rain\s(?<amount>[0-9]+)/).groups.amount;

            message.channel.fetchMessages({after: time}).then(function (lastMessages) {
                let receivers = [];
                lastMessages.forEach(function (lastMessage) {
                    let add = true;

                    if (lastMessage.author.id === message.author.id) {
                        add = false;
                    }

                    if (!userHasWallet(lastMessage.author.id)) {
                        add = false;
                    }

                    if (lastMessage.author.bot) {
                        add = false;
                    }

                    if (add) {
                        receivers.push(lastMessage.author);
                    }
                });

                receivers    = receivers.filter((v, i, a) => a.indexOf(v) === i);
                const amount = (amount / receivers.length);

                receivers.forEach(function (receiver) {
                    makeTransaction(getUserAddress(message.author.id), getUserAddress(receiver.id), amount);

                    receiver.send(`@${message.author.username} sent you ${amount} XYA. Spend it wisely`);
                });
            });
        }

        /**
         * @name Tip stats
         *
         * @example !ftipstats
         * @description Display your personal tipping stats
         */
        if (message.content === publicPrefix + 'tipstats') {
            message.channel.send('TODO');
        }

    }

    /***************************************************************/
    /* Private commands
    /***************************************************************/

    if (message.channel.type === 'dm') {

        /**
         * @name Deposit
         *
         * @example !deposit
         * @description Shows your account address
         */
        if (message.content === prefix + 'deposit') {
            getWallet(message.author.id).then(wallet => {
                message.author.send(`Your wallet address is \`${wallet.address}\` \n\n:warning: Please do not use this as your main wallet, only for tipping on Discord. Do not deposit large amounts of XYA to this wallet \n\n:information_source: In order to pay network fee you need to deposit a small amount of ONE too, 1 ONE should be enough`)
            });
        }

        /**
         * @name Balance
         *
         * @example !balance
         * @description Shows your account XYA balance
         */
        if (message.content === prefix + 'balance') {
            checkWallet(message.author.id).then(wallet => {
                if (wallet == null) {
                    message.author.send(`You do not have a XYA Bot wallet yet. \n\nPlease run the !deposit command to create a new wallet.`)
                } else {
                    getBalance(wallet).then(balance => {
                        message.author.send(`Your ${currencySymbol} balance is ${balance} XYA`)
                    });
                }
            });
        }

        /**
         * @name Gas balance
         *
         * @example !gasbalance
         * @description Shows your account ONE balance
         */
        if (message.content === prefix + 'gasbalance') {
            checkWallet(message.author.id).then(wallet => {
                if (wallet == null) {
                    message.author.send(`You do not have a XYA Bot wallet yet. \n\nPlease run the !deposit command to create a new wallet.`)
                } else {
                    getGasBalance(wallet).then(balance => {
                        message.author.send(`Your gas balance is ${balance} ONE`)
                    });
                }
            });
        }

        /**
         * @name Send
         *
         * @example !send 100 0x89y9238jhu283h9
         * @description Send XYA to an external address
         */
        if (message.content.startsWith(prefix + 'send ')) {
            // get amount and address from message
            // make transaction of amount to address
            checkWallet(message.author.id).then(wallet => {
                if (wallet == null) {
                    message.author.send(`You do not have a XYA Bot wallet yet. \n\nPlease run the !deposit command to create a new wallet.`)
                } else {
                    makeTransaction(wallet.address, '', 1, getPrivateKey(wallet))
                        .then(response => {
                            console.log(response); // REMOVE
                            if (response.success) {
                                reactSuccess(`Transaction successful! \n\nCheck out the transaction in the explorer here: ${response.message}`);
                            } else {
                                message.author.send(response.message);
                            }
                        });
                }
            });
        }

        /**
         * @name Send max
         *
         * @example !sendmax 0x89y9238jhu283h9
         * @description Send all of your XYA to an external address
         */
        if (message.content === prefix + 'sendmax') {
            // check if user has a wallet
            // if not ask them to run the deposit command
            // get address from message
            // make transaction of max amount to address
        }

    }

    /***************************************************************/

    /* Helper functions
    /***************************************************************/

    /**
     * Create wallet
     *
     * @param id
     */
    function createWallet(id)
    {
        const account         = new Account();
        const customMessenger = new Messenger(
            new HttpProvider('https://api.s0.t.hmny.io'),
            ChainType.Harmony,
            ChainID.HmyMainnet,
        );
        account.setMessenger(customMessenger);

        return wallets.create({
            user      : id,
            address   : account.address,
            privateKey: CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(account.privateKey), process.env.CYPHER_SECRET),
        });
    }

    /**
     * Get wallet
     *
     * @param id
     */
    async function getWallet(id)
    {
        return wallets.findOne({where: {user: id}}).then(wallet => {
            if (wallet == null) {
                wallet = createWallet(id)
            }

            return wallet;
        });
    }

    /**
     * Get user address
     *
     * @param id
     */
    async function getUserAddress(id)
    {
        return wallets.findOne({where: {user: id}}).then(wallet => {
            if (wallet == null) {
                wallet = createWallet(id)
            }

            return wallet.address;
        });
    }

    /**
     * Get private key
     *
     * @param wallet
     * @return {*}
     */
    function getPrivateKey(wallet)
    {
        return CryptoJS.AES.decrypt(wallet.privateKey, process.env.CYPHER_SECRET).toString(CryptoJS.enc.Utf8);
    }

    /**
     * Check wallet
     *
     * @param id
     */
    async function checkWallet(id)
    {
        return wallets.findOne({where: {user: id}});
    }

    /**
     * Check if user has wallet
     *
     * @param id
     */
    function userHasWallet(id)
    {
        return checkWallet(id) !== null;
    }

    /**
     * React success
     *
     * @param reply
     */
    function reactSuccess(reply = null)
    {
        message.react('✅');

        if (reply !== null) {
            message.reply(reply);
        }
    }

    /**
     * React error
     *
     * @param reply
     */
    function reactError(reply = null)
    {
        message.react('❌');

        if (reply !== null) {
            message.author.send(reply);
        }
    }

    /**
     * Get balance
     *
     * @return float
     */
    async function getBalance(wallet)
    {
        const contract   = hmy.contracts.createContract(artifact.abi, process.env.CONTRACT_ADDRESS);
        const weiBalance = await contract.methods.balanceOf(wallet.address).call();
        const Wei        = new BN(weiBalance);
        const balance    = fromWei(Wei, Units.one);

        return parseFloat(formatBalance(balance)).toFixed(4);
    }

    /**
     * Get gas balance
     *
     * @return float
     */
    async function getGasBalance(wallet)
    {
        return hmy.blockchain
            .getBalance({address: wallet.address})
            .then((response) => {
                return parseFloat(fromWei(hexToNumber(response.result), Units.one)).toFixed(4);
            });
    }

    /**
     * Format balance
     *
     * @param balance
     * @return {number|*}
     */
    function formatBalance(balance)
    {
        return new BigNumber(balance).isEqualTo(0)
            ? 0
            : new BigNumber(balance).toFormat(Math.min(18, 36));
    }

    /**
     * Make transaction
     *
     * @param from
     * @param to
     * @param amount
     * @param privateKey
     * @return void
     */
    async function makeTransaction(from, to, amount, privateKey)
    {
        let txHash, receipt, confirmation, error;
        const gasLimit = '250000'
        const decimals = parseInt(process.env.DECIMALS)
        const contract = hmy.contracts.createContract(artifact.abi, process.env.CONTRACT_ADDRESS);

        console.log(amount);
        console.log(new BN(new BigNumber(amount).multipliedBy(Math.pow(10, decimals)).toFixed(), 10));

        hmy.wallet.addByPrivateKey(privateKey);
        await contract.methods
            .transfer(
                hmy.crypto.getAddress(to).basicHex,
                new BN(new BigNumber(amount).multipliedBy(Math.pow(10, decimals)).toFixed(), 10))
            .send({from, gasLimit, gasPrice: new hmy.utils.Unit(1).asGwei().toWei()})
            .on("transactionHash", (_hash) => {
                txHash = _hash;
            })
            .on("receipt", (_receipt) => {
                receipt = _receipt;
            })
            .on("confirmation", (_confirmation) => {
                confirmation = _confirmation;
            })
            .on("error", (_error) => {
                error = _error;
            });

        if (error) {
            return {
                success: false,
                message: `Failed to send transaction`,
            };
        }
        if (confirmation !== 'CONFIRMED') {
            return {
                success: false,
                message: `Can not confirm transaction ${txHash}`,
            };
        }
        return {
            success: true,
            message: `${process.env.NETWORK_EXPLORER}/tx/${txHash}`,
        };
    }
});