require('dotenv').config();
const Discord = require('discord.js');
const bot     = new Discord.Client();
const token   = process.env.TOKEN;

/* Bot login */
bot.login(token);
bot.on('ready', () => {
    console.info(`Logged in as ${bot.user.tag}!`);
});

/* Message event */
bot.on('message', message => {
    const prefix         = '!';
    const publicPrefix   = '!f';
    const currencySymbol = 'XYA';

    /**
     * @name Help
     *
     * @example !help
     * @description List all the commandos
     */
    if (message.content === prefix + 'help' || message.content === publicPrefix + 'help') {
        message.author.send(
            '**XYA Bot commands**\n' +
            'Direct message commands' +
            '```' +
            '!deposit \n' +
            'Shows your account address \n\n' +
            '!balance \n' +
            'Shows your account XYA balance \n\n' +
            '!gasbalance \n' +
            'Shows your account ONE balance \n\n' +
            '!send 100 0x89y9238jhu283h9 \n' +
            'Send Nano to an external address. \n\n' +
            '!sendmax 0x89y9238jhu283h9 \n' +
            'Send all of your Nano to an external address. \n' +
            '```\n' +
            'Public commands' +
            '```' +
            '!ftip 100 @user1\n' +
            'Send a tip to mentioned users\n\n' +
            '!ftipsplit 100 @user1 @user2\n' +
            'Split a tip among mentioned users\n\n' +
            '!ftiprandom 100\n' +
            'Tip an active user at random. (past x minutes activity)\n\n' +
            '!frain 100\n' +
            'Distribute a tip amount amongst active users (past x minutes activity)\n\n' +
            '!ftipstats\n' +
            'Display your personal tipping stats\n\n' +
            '```'
        );
    }

    if (message.channel.type !== 'text' || message.author.bot || !message.content.startsWith(prefix)) {
        return;
    }

    /***************************************************************/
    /* Public commands
    /***************************************************************/

    /**
     * @name Tip
     *
     * @example !ftip 100 @user1
     * @description Send a tip to mentioned users
     */
    if (message.content.startsWith(publicPrefix + 'tip')) {
        if (message.mentions.users.size) {
            const taggedUser = message.mentions.users.first();
            const amount     = message.content.match(/tip\s(?<amount>[0-9]+)\s<@/).groups.amount;

            if (getUserBalance() >= amount) {
                makeTransaction('from', 'to'); // TODO: replace with user address

                message.react('✅');
            } else {
                message.react('❌');
                message.reply(`Insufficient funds!`);
            }
        } else {
            message.react('❌');
            message.reply('Please tag a valid user!');
        }
    }

    /**
     * @name Tip split
     *
     * @example !ftipsplit 100 @user1 @user2
     * @description Split a tip among mentioned users
     */
    if (message.content.startsWith(publicPrefix + 'tipsplit')) {
        if (message.mentions.users.size) {
            const taggedUsers = message.mentions.users;
            let amount        = message.content.match(/tip\s(?<amount>[0-9]+)\s<@/).groups.amount;

            if (getUserBalance() >= amount) {
                amount = amount / Object.keys(taggedUsers).length;
                taggedUsers.forEach(function (user) {
                    makeTransaction('from', 'to'); // TODO: replace with user address
                });

                message.react('✅');
            } else {
                message.react('❌');
                message.reply(`Insufficient funds!`);
            }
        } else {
            message.react('❌');
            message.reply('Please tag a valid user!');
        }
    }

    /**
     * @name Tip random
     *
     * @example !ftiprandom 100
     * @description Tip an active user at random. (past x minutes activity)
     */
    if (message.content.startsWith(publicPrefix + 'tiprandom')) {
        message.channel.send('TODO');
    }

    /**
     * @name Rain
     *
     * @example !frain 100
     * @description Distribute a tip amount amongst active users (past x minutes activity)
     */
    if (message.content.startsWith(publicPrefix + 'rain')) {
        message.channel.send('TODO');
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

    /***************************************************************/
    /* Private commands
    /***************************************************************/

    /**
     * @name Deposit
     *
     * @example !deposit
     * @description Shows your account address
     */
    if (message.content === prefix + 'deposit') {
        message.author.send('TODO');
    }

    /**
     * @name Balance
     *
     * @example !balance
     * @description Shows your account XYA balance
     */
    if (message.content === prefix + 'balance') {
        message.author.send('TODO');
    }

    /**
     * @name Gas balance
     *
     * @example !gasbalance
     * @description Shows your account ONE balance
     */
    if (message.content === prefix + 'gasbalance') {
        message.author.send('TODO');
    }

    /**
     * @name Send
     *
     * @example !send 100 0x89y9238jhu283h9
     * @description Send Nano to an external address
     */
    if (message.content === prefix + 'send') {
        message.author.send('TODO');
    }

    /**
     * @name Send max
     *
     * @example !sendmax 0x89y9238jhu283h9
     * @description Send all of your Nano to an external address
     */
    if (message.content === prefix + 'sendmax') {
        message.author.send('TODO');
    }
});


/**
 * Get user balance
 *
 * @return float
 */
function getUserBalance() {
    // TODO @tailchakra: get user balance
    return 1000.00;
}

/**
 * Make transaction
 *
 * @param from
 * @param to
 *
 * @return void
 */
function makeTransaction(from, to) {
    // TODO @tailchakra: make transaction
}
